# Hybrid Storage Architecture - Database + Object Storage

## Problem Statement

With 50GB+ expected per user, storing large data directly in SQLite TEXT columns is not feasible:
- SQLite/Turso has practical limits on row size and total database size
- Performance degrades with large JSON blobs
- Single shared database would grow to 50TB+ (1000 users × 50GB)
- Backup/restore becomes extremely slow

## Solution: Hybrid Storage

### Architecture Overview

```
┌─────────────────────────────────────────┐
│  SQLite/Turso Database (Shared)         │
│  - User accounts & authentication       │
│  - Project metadata                      │
│  - File references (GCS paths)           │
│  - Small configuration data              │
│  - Relationships between entities        │
│  Total size: ~100MB for 1000 users      │
└─────────────────────────────────────────┘
                  │
                  │ stores references to
                  ▼
┌─────────────────────────────────────────┐
│  Google Cloud Storage (Per-User Paths)  │
│  users/{userId}/                         │
│    ├── surveys/{surveyId}.las           │
│    ├── surfaces/{surfaceId}.obj         │
│    ├── networks/{networkId}.json        │
│    ├── cad/{designId}.dxf               │
│    └── dem/{projectId}/tiles/*.tif      │
│  Total size: 50GB × users = scalable    │
└─────────────────────────────────────────┘
                  │
                  │ (optional) cached in
                  ▼
┌─────────────────────────────────────────┐
│  IndexedDB (Browser - Client Side)      │
│  - Active working data                   │
│  - Offline support                       │
│  - Auto-sync with GCS                    │
│  Total size: ~1-2GB per browser         │
└─────────────────────────────────────────┘
```

---

## Database Schema Changes

### Before (Current - WRONG):

```sql
CREATE TABLE survey_datasets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  points_json TEXT NOT NULL DEFAULT '[]',  -- ❌ 100MB+ of points!
  ...
);

CREATE TABLE water_network_designs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  nodes_json TEXT NOT NULL DEFAULT '[]',   -- ❌ Large network data
  pipes_json TEXT NOT NULL DEFAULT '[]',
  pumps_json TEXT NOT NULL DEFAULT '[]',
  ...
);
```

### After (Hybrid - CORRECT):

```sql
CREATE TABLE survey_datasets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Metadata only
  point_count INTEGER NOT NULL DEFAULT 0,
  bounds_json TEXT,
  statistics_json TEXT,
  crs TEXT NOT NULL DEFAULT 'EPSG:32719',
  -- GCS reference instead of data
  gcs_path TEXT NOT NULL,  -- ✅ 'users/{userId}/surveys/{surveyId}.las'
  file_size_bytes INTEGER,
  file_format TEXT NOT NULL,  -- 'las', 'xyz', 'csv'
  status TEXT NOT NULL DEFAULT 'uploading',  -- 'uploading', 'ready', 'error'
  ...
);

CREATE TABLE generated_surfaces (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Metadata only
  method TEXT NOT NULL DEFAULT 'delaunay',
  config_json TEXT,  -- Small config (~1KB)
  metrics_json TEXT,  -- Statistics (~1KB)
  -- GCS reference
  gcs_path TEXT NOT NULL,  -- ✅ 'users/{userId}/surfaces/{surfaceId}.obj'
  file_size_bytes INTEGER,
  triangle_count INTEGER,
  vertex_count INTEGER,
  ...
);

CREATE TABLE water_network_designs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Metadata only
  node_count INTEGER DEFAULT 0,
  pipe_count INTEGER DEFAULT 0,
  demand_multiplier REAL NOT NULL DEFAULT 1.0,
  headloss_formula TEXT NOT NULL DEFAULT 'hazen-williams',
  -- GCS reference
  gcs_path TEXT NOT NULL,  -- ✅ 'users/{userId}/networks/{networkId}.json'
  file_size_bytes INTEGER,
  last_analysis_at TEXT,
  analysis_summary_json TEXT,  -- Small summary only (~10KB)
  ...
);
```

---

## File Storage Organization

### GCS Bucket Structure:

```
caeser-geo-data/
├── users/
│   ├── user_abc123/
│   │   ├── surveys/
│   │   │   ├── survey_xyz.las          (50-500MB)
│   │   │   ├── survey_abc.xyz          (20-200MB)
│   │   │   └── survey_def.csv          (10-100MB)
│   │   ├── surfaces/
│   │   │   ├── surface_123.obj         (10-100MB)
│   │   │   ├── surface_456.stl         (5-50MB)
│   │   │   └── surface_789.geojson     (1-10MB)
│   │   ├── networks/
│   │   │   ├── water_network_1.json    (1-20MB)
│   │   │   ├── sewer_design_2.json     (1-15MB)
│   │   │   └── stormwater_3.json       (1-10MB)
│   │   ├── cad/
│   │   │   ├── design_rev1.dxf         (5-100MB)
│   │   │   ├── design_rev2.dwg         (10-200MB)
│   │   │   └── structural_plan.dxf     (5-50MB)
│   │   └── dem/
│   │       └── project_xyz/
│   │           ├── tile_N33_W070.tif   (50-200MB)
│   │           └── tile_N33_W071.tif   (50-200MB)
│   └── user_def456/
│       └── ...
├── dem/
│   └── chile/
│       └── copernicus-30m/             (shared DEM cache)
└── templates/
    └── reports/                         (shared report templates)
```

---

## Implementation Plan

### Phase 1: Add GCS Support to Existing Tables

1. **Add migration** to add `gcs_path` column to existing tables
2. **Keep existing JSON columns** temporarily for backward compatibility
3. **Migrate data** from JSON columns to GCS files
4. **Update API endpoints** to use GCS paths instead of JSON

### Phase 2: File Upload/Download Service

Create `/apps/web/src/lib/storage/file-service.ts`:

```typescript
import { Storage } from '@google-cloud/storage';
import { getDb, execute, queryOne } from '@ledesign/db';

const storage = new Storage();
const BUCKET_NAME = 'caeser-geo-data';

export interface UploadOptions {
  userId: string;
  projectId: string;
  fileType: 'survey' | 'surface' | 'network' | 'cad' | 'dem';
  fileName: string;
  contentType: string;
}

/**
 * Generate GCS path for a user file
 */
export function generateGcsPath(options: UploadOptions): string {
  const { userId, fileType, fileName } = options;
  return `users/${userId}/${fileType}s/${fileName}`;
}

/**
 * Upload file to GCS and return path
 */
export async function uploadFile(
  buffer: Buffer,
  options: UploadOptions
): Promise<{ gcsPath: string; signedUrl: string }> {
  const gcsPath = generateGcsPath(options);
  const file = storage.bucket(BUCKET_NAME).file(gcsPath);

  await file.save(buffer, {
    contentType: options.contentType,
    metadata: {
      userId: options.userId,
      projectId: options.projectId,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Generate signed URL for immediate access (1 hour)
  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  });

  return { gcsPath, signedUrl };
}

/**
 * Get signed URL for existing file
 */
export async function getFileUrl(
  gcsPath: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const file = storage.bucket(BUCKET_NAME).file(gcsPath);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return signedUrl;
}

/**
 * Delete file from GCS
 */
export async function deleteFile(gcsPath: string): Promise<void> {
  await storage.bucket(BUCKET_NAME).file(gcsPath).delete();
}

/**
 * Get file metadata
 */
export async function getFileMetadata(gcsPath: string) {
  const [metadata] = await storage.bucket(BUCKET_NAME).file(gcsPath).getMetadata();
  return {
    size: parseInt(metadata.size),
    contentType: metadata.contentType,
    created: metadata.timeCreated,
    updated: metadata.updated,
  };
}
```

### Phase 3: Upload API Endpoint

Create `/apps/web/src/app/api/files/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { uploadFile } from '@/lib/storage/file-service';
import { generateId } from '@/lib/utils';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const fileType = formData.get('fileType') as 'survey' | 'surface' | 'network' | 'cad';

    if (!file || !projectId || !fileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileId = generateId();
    const fileName = `${fileId}_${file.name}`;

    // Upload to GCS
    const { gcsPath, signedUrl } = await uploadFile(buffer, {
      userId: req.user.userId,
      projectId,
      fileType,
      fileName,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      fileId,
      gcsPath,
      url: signedUrl,
      size: buffer.length,
    });
  });
}
```

### Phase 4: Download API Endpoint

Create `/apps/web/src/app/api/files/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getFileUrl } from '@/lib/storage/file-service';
import { queryOne, getDb } from '@ledesign/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req) => {
    const fileId = params.id;

    // Get file record from database (checks ownership via project_id)
    const file = await queryOne<{ gcs_path: string; project_id: string }>(
      getDb(),
      `SELECT gcs_path, project_id FROM survey_datasets WHERE id = ?`,
      [fileId]
    );

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify user owns this file's project
    const project = await queryOne<{ user_id: string }>(
      getDb(),
      `SELECT user_id FROM projects WHERE id = ?`,
      [file.project_id]
    );

    if (!project || project.user_id !== req.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await getFileUrl(file.gcs_path, 60);

    return NextResponse.json({
      success: true,
      url: signedUrl,
    });
  });
}
```

---

## Client-Side Integration (Optional: IndexedDB)

For offline-first support and better performance, cache working data in IndexedDB:

### `/apps/web/src/lib/storage/idb-cache.ts`:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface LeDesignDB extends DBSchema {
  networks: {
    key: string;
    value: {
      id: string;
      projectId: string;
      data: any;
      syncedAt: string;
      dirty: boolean;
    };
  };
  surfaces: {
    key: string;
    value: {
      id: string;
      projectId: string;
      data: any;
      syncedAt: string;
      dirty: boolean;
    };
  };
}

let db: IDBPDatabase<LeDesignDB> | null = null;

async function getDB() {
  if (!db) {
    db = await openDB<LeDesignDB>('ledesign', 1, {
      upgrade(db) {
        db.createObjectStore('networks', { keyPath: 'id' });
        db.createObjectStore('surfaces', { keyPath: 'id' });
      },
    });
  }
  return db;
}

export async function cacheNetwork(id: string, projectId: string, data: any) {
  const db = await getDB();
  await db.put('networks', {
    id,
    projectId,
    data,
    syncedAt: new Date().toISOString(),
    dirty: false,
  });
}

export async function getNetwork(id: string) {
  const db = await getDB();
  return db.get('networks', id);
}

export async function markNetworkDirty(id: string) {
  const db = await getDB();
  const network = await db.get('networks', id);
  if (network) {
    network.dirty = true;
    await db.put('networks', network);
  }
}
```

---

## Migration Strategy

### Step 1: Add GCS columns (non-breaking)

```sql
ALTER TABLE survey_datasets ADD COLUMN gcs_path TEXT;
ALTER TABLE survey_datasets ADD COLUMN file_size_bytes INTEGER;
ALTER TABLE generated_surfaces ADD COLUMN gcs_path TEXT;
ALTER TABLE generated_surfaces ADD COLUMN file_size_bytes INTEGER;
ALTER TABLE water_network_designs ADD COLUMN gcs_path TEXT;
ALTER TABLE water_network_designs ADD COLUMN file_size_bytes INTEGER;
```

### Step 2: Migrate existing data

```typescript
// Migration script to move JSON data to GCS
async function migrateToGCS() {
  const datasets = await query(db, 'SELECT * FROM survey_datasets WHERE gcs_path IS NULL');

  for (const dataset of datasets) {
    if (dataset.points_json && dataset.points_json !== '[]') {
      // Upload to GCS
      const buffer = Buffer.from(dataset.points_json);
      const { gcsPath } = await uploadFile(buffer, {
        userId: dataset.user_id,
        projectId: dataset.project_id,
        fileType: 'survey',
        fileName: `${dataset.id}.json`,
        contentType: 'application/json',
      });

      // Update database
      await execute(db,
        'UPDATE survey_datasets SET gcs_path = ?, file_size_bytes = ? WHERE id = ?',
        [gcsPath, buffer.length, dataset.id]
      );
    }
  }
}
```

### Step 3: Update application code

- Change upload flows to use new file service
- Update read operations to fetch from GCS via signed URLs
- Implement IndexedDB caching for active designs

### Step 4: Remove JSON columns (breaking)

Once all data is migrated and application is updated:

```sql
-- After confirming all data migrated
ALTER TABLE survey_datasets DROP COLUMN points_json;
ALTER TABLE generated_surfaces DROP COLUMN surface_json;
ALTER TABLE water_network_designs DROP COLUMN nodes_json;
ALTER TABLE water_network_designs DROP COLUMN pipes_json;
```

---

## Cost Estimation

### Google Cloud Storage Pricing (us-central1):

- **Storage**: $0.020/GB/month
- **Operations**: $0.004 per 10,000 operations (Class A)
- **Egress**: First 1GB free, then $0.12/GB

**For 1000 users × 50GB each:**
- Storage: 50,000 GB × $0.020 = **$1,000/month**
- Operations: ~$10-50/month (typical usage)
- **Total: ~$1,050/month** for 50TB of user data

**Compare to separate Turso databases:**
- 1000 databases × $29/month (Pro plan) = **$29,000/month**

---

## Benefits

✅ **Scalable** - GCS handles petabytes, no database size limits
✅ **Cost-effective** - $1k/month vs $29k/month for per-user DBs
✅ **Performant** - Direct file access via signed URLs
✅ **Standard pattern** - Used by Figma, Canva, AutoCAD Web
✅ **Simple backups** - GCS has built-in versioning & snapshots
✅ **Existing infrastructure** - Already using GCS for DEM tiles

---

## Security Considerations

1. **Signed URLs** - Time-limited access (1 hour default)
2. **User verification** - Check project ownership before generating URLs
3. **Path validation** - Ensure users can only access their own paths
4. **Audit logging** - Track all file access attempts
5. **Encryption** - GCS encrypts at rest by default

---

## Next Steps

1. Create migration to add `gcs_path` columns
2. Implement file upload/download service
3. Create API endpoints for file operations
4. Update frontend to use file upload instead of JSON POST
5. Migrate existing data from JSON columns to GCS
6. Remove JSON columns after migration complete
