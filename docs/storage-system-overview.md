# Storage System Overview - LeDesign Platform

## Architecture Summary

LeDesign uses a **hybrid storage architecture** to handle both small metadata and large file data efficiently:

```
┌─────────────────────────────┐
│  SQLite/Turso (Shared DB)   │
│  - User accounts            │
│  - Project metadata         │
│  - File references          │
│  Size: ~100MB for all users │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  Google Cloud Storage       │
│  - Survey files (.las, .xyz)│
│  - Surfaces (.obj, .stl)    │
│  - Network designs (.json)  │
│  - CAD files (.dxf, .dwg)   │
│  Size: 50GB per user        │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  IndexedDB (Browser)        │
│  - Active working data      │
│  - Offline support          │
│  Size: 1-2GB per browser    │
└─────────────────────────────┘
```

---

## Database Organization

### Single Shared Database

**One Turso database for all users** with row-level security via SQL:

```sql
-- Users only see their own projects
SELECT * FROM projects WHERE user_id = ?

-- All API routes enforce ownership checks
```

**Benefits:**
- ✅ Cost-effective: ~$25/month vs $29k/month for per-user DBs
- ✅ Simple to manage: One database to backup/monitor
- ✅ Standard SaaS pattern: Used by Notion, Figma, Linear

**Security:**
- All queries filtered by `user_id`
- Middleware enforces authentication
- No cross-user data leakage

---

## File Storage (GCS)

### Path Structure

```
caeser-geo-data/
├── users/{userId}/
│   ├── surveys/{surveyId}.las       (50-500MB each)
│   ├── surfaces/{surfaceId}.obj     (10-100MB each)
│   ├── networks/{networkId}.json    (1-20MB each)
│   ├── cad/{designId}.dxf           (5-100MB each)
│   └── dem/{projectId}/tiles/*.tif  (50-200MB each)
├── dem/chile/copernicus-30m/         (shared DEM cache)
└── templates/reports/                 (shared templates)
```

### Database Schema Updates

**Before (WRONG - JSON in database):**
```sql
CREATE TABLE water_network_designs (
  ...
  nodes_json TEXT,  -- ❌ 20MB+ of data in SQLite!
  pipes_json TEXT,  -- ❌ Can't scale to 50GB per user
  ...
);
```

**After (CORRECT - Reference to GCS):**
```sql
CREATE TABLE water_network_designs (
  ...
  gcs_path TEXT,           -- ✅ 'users/{userId}/networks/{id}.json'
  file_size_bytes INTEGER, -- ✅ Track storage usage
  node_count INTEGER,      -- ✅ Metadata for UI
  pipe_count INTEGER,      -- ✅ Summary stats
  ...
);
```

---

## Implementation Files

### Backend Services

| File | Purpose |
|------|---------|
| [`packages/db/src/migrations/add-gcs-storage.ts`](../packages/db/src/migrations/add-gcs-storage.ts) | Migration to add `gcs_path` columns |
| [`apps/web/src/lib/storage/file-service.ts`](../apps/web/src/lib/storage/file-service.ts) | GCS upload/download service |
| [`apps/web/src/app/api/files/upload/route.ts`](../apps/web/src/app/api/files/upload/route.ts) | File upload API |
| [`apps/web/src/app/api/files/[id]/route.ts`](../apps/web/src/app/api/files/[id]/route.ts) | File download/delete API |

### Frontend Services

| File | Purpose |
|------|---------|
| [`apps/web/src/lib/storage/idb-cache.ts`](../apps/web/src/lib/storage/idb-cache.ts) | IndexedDB client-side cache |

---

## Usage Examples

### Upload a Survey File

```typescript
// Frontend
const formData = new FormData();
formData.append('file', surveyFile); // File object
formData.append('projectId', projectId);
formData.append('fileType', 'survey');
formData.append('recordType', 'survey_datasets');
formData.append('metadata', JSON.stringify({
  name: 'Site Survey Jan 2024',
  pointCount: 1500000,
  crs: 'EPSG:32719',
  bounds: { ... }
}));

const response = await fetch('/api/files/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result.url); // Signed URL valid for 1 hour
```

### Download a Network Design

```typescript
// Get signed URL (valid for 1 hour)
const response = await fetch(
  `/api/files/${networkId}?type=water_network_designs&expires=60`
);
const { url } = await response.json();

// Download file
const fileResponse = await fetch(url);
const networkData = await fileResponse.json();

// Cache in IndexedDB for offline access
await cacheNetwork(networkId, projectId, 'My Network', networkData);
```

### Use Cached Data Offline

```typescript
import { getNetwork, markNetworkDirty } from '@/lib/storage/idb-cache';

// Try to load from cache first
let networkData = await getNetwork(networkId);

if (!networkData) {
  // Fetch from server if not cached
  const response = await fetch(`/api/files/${networkId}?type=water_network_designs`);
  const { url } = await response.json();
  const fileResponse = await fetch(url);
  networkData = await fileResponse.json();

  // Cache for next time
  await cacheNetwork(networkId, projectId, 'My Network', networkData);
}

// User makes changes
networkData.nodes.push(newNode);
await markNetworkDirty(networkId); // Flag for sync
```

---

## Cost Analysis

### GCS Storage Pricing (us-central1)

| Item | Cost |
|------|------|
| Storage | $0.020/GB/month |
| Operations | $0.004 per 10,000 requests |
| Egress | $0.12/GB after first 1GB |

**For 1000 users × 50GB each:**
- Storage: 50,000 GB × $0.020 = **$1,000/month**
- Operations: ~$50/month (typical usage)
- **Total: ~$1,050/month** for 50TB

**Compare to alternatives:**
- Per-user Turso DBs: 1000 × $29 = $29,000/month ❌
- AWS S3 Standard: Similar to GCS ✅
- Dedicated PostgreSQL: Can't handle 50TB per user ❌

---

## Migration Strategy

### Phase 1: Add GCS Support (Non-breaking)

Run migration:
```bash
cd packages/db
npm run migrate
```

This adds `gcs_path`, `file_size_bytes`, and count columns to:
- `survey_datasets`
- `generated_surfaces`
- `water_network_designs`
- `sewer_designs`
- `stormwater_designs`
- `channel_designs`

**Existing JSON columns remain** for backward compatibility.

### Phase 2: Update Application Code

1. Change upload flows to use `/api/files/upload`
2. Update read operations to fetch from `/api/files/[id]`
3. Implement IndexedDB caching for active designs

### Phase 3: Migrate Existing Data

For projects with existing JSON data:

```typescript
// Migration script (run once)
const designs = await query(db,
  'SELECT * FROM water_network_designs WHERE gcs_path IS NULL'
);

for (const design of designs) {
  if (design.nodes_json && design.nodes_json !== '[]') {
    const data = {
      nodes: JSON.parse(design.nodes_json),
      pipes: JSON.parse(design.pipes_json),
      pumps: JSON.parse(design.pumps_json),
      tanks: JSON.parse(design.tanks_json),
    };

    const buffer = Buffer.from(JSON.stringify(data));
    const { gcsPath } = await uploadFile(buffer, {
      userId: design.user_id,
      projectId: design.project_id,
      fileType: 'network',
      fileName: `${design.id}.json`,
      contentType: 'application/json',
    });

    await execute(db,
      'UPDATE water_network_designs SET gcs_path = ?, file_size_bytes = ? WHERE id = ?',
      [gcsPath, buffer.length, design.id]
    );
  }
}
```

### Phase 4: Remove JSON Columns (Breaking)

After confirming all data is migrated:

```sql
ALTER TABLE survey_datasets DROP COLUMN points_json;
ALTER TABLE water_network_designs DROP COLUMN nodes_json;
ALTER TABLE water_network_designs DROP COLUMN pipes_json;
ALTER TABLE water_network_designs DROP COLUMN pumps_json;
ALTER TABLE water_network_designs DROP COLUMN tanks_json;
-- Repeat for other tables
```

---

## Security

### Access Control

1. **Authentication**: JWT tokens via middleware
2. **Project ownership**: Check `user_id` before generating URLs
3. **Signed URLs**: Time-limited (1 hour default)
4. **Path validation**: Ensure users only access their own GCS paths

### Example Security Check

```typescript
// In download API
const file = await queryOne(db,
  'SELECT gcs_path, project_id FROM survey_datasets WHERE id = ?',
  [fileId]
);

const project = await queryOne(db,
  'SELECT user_id FROM projects WHERE id = ?',
  [file.project_id]
);

if (project.user_id !== req.user.userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

---

## Next Steps

1. ✅ Run migration: `npm run migrate` (adds GCS columns)
2. ✅ Deploy file upload/download API endpoints
3. ⏳ Update frontend components to use new upload flow
4. ⏳ Test with actual survey/network files
5. ⏳ Implement background sync for IndexedDB dirty data
6. ⏳ Migrate existing JSON data to GCS
7. ⏳ Remove old JSON columns after migration complete

---

## Monitoring & Maintenance

### Check GCS Usage

```bash
# View bucket size
gsutil du -sh gs://caeser-geo-data/users/

# List files for a user
gsutil ls gs://caeser-geo-data/users/{userId}/

# Check recent uploads
gsutil ls -l gs://caeser-geo-data/users/{userId}/networks/
```

### Check Cache Statistics

```typescript
import { getCacheStats } from '@/lib/storage/idb-cache';

const stats = await getCacheStats();
console.log(`
  Networks: ${stats.networks}
  Surfaces: ${stats.surfaces}
  Files: ${stats.files}
  Total: ${stats.totalSizeMB} MB
`);
```

---

## Troubleshooting

### "Failed to upload file"

- Check `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Verify GCS bucket `caeser-geo-data` exists
- Ensure service account has Storage Object Creator role

### "File not found in GCS"

- Check `gcs_path` in database is correct
- Verify file exists: `gsutil ls gs://caeser-geo-data/{gcs_path}`
- Regenerate signed URL if expired

### "IndexedDB quota exceeded"

- Browser storage limits: ~1-2GB typical
- Clear old caches: `clearProjectCache(oldProjectId)`
- Use GCS as source of truth, IDB as cache only
