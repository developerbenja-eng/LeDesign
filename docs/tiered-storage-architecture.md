# Tiered Storage Architecture - LeDesign Platform

## Overview

Three-tier storage system optimizing for speed, cost, and scale:

1. **Shared Turso DB** - Authentication & cross-user data
2. **Per-user Turso DBs** - Fast access to active work
3. **Google Cloud Storage** - Archive for large/old files

---

## Tier 1: Shared Database (Auth Hub)

**Purpose:** Single source of truth for authentication and cross-user data

**What it stores:**
```sql
-- User accounts & authentication
users (id, email, password_hash, role, subscription_tier, ...)

-- User metadata
user_profiles (user_id, company, preferences, ...)

-- Project registry (metadata only)
project_registry (
  project_id,
  user_id,
  name,
  description,
  status,
  database_location TEXT,  -- 'turso' or 'gcs'
  turso_db_name TEXT,      -- 'user_abc123' if in Turso
  gcs_archived_at TEXT,    -- When moved to cold storage
  created_at,
  updated_at
)

-- Subscriptions & billing
subscriptions (user_id, plan, modules_enabled, ...)

-- Usage tracking for analytics
usage_logs (user_id, action, timestamp, ...)
```

**Turso Configuration:**
```env
# Central auth database
TURSO_AUTH_DB_URL=libsql://ledesign-auth.turso.io
TURSO_AUTH_DB_TOKEN=...
```

**Cost:** $29/month (Scaler plan with unlimited DBs)

---

## Tier 2: Per-User Databases (Hot Storage)

**Purpose:** Fast access to user's active project data

**What it stores:**
- Active projects (last 30 days)
- Survey datasets (<100MB each, total <5GB)
- Network designs in active development
- Analysis results
- Temporary computation data

**Database naming:** `user_{userId}`

**Schema (same structure for each user DB):**
```sql
-- Projects (full data, not just metadata)
projects (id, name, description, bounds, status, ...)

-- Survey datasets
survey_datasets (
  id,
  project_id,
  name,
  points_json TEXT,           -- OK for small surveys (<100MB)
  gcs_path TEXT,              -- Reference if archived to GCS
  storage_tier TEXT,          -- 'hot' or 'cold'
  file_size_bytes INTEGER,
  ...
)

-- Generated surfaces
generated_surfaces (
  id,
  project_id,
  surface_json TEXT,          -- OK for small meshes
  gcs_path TEXT,
  storage_tier TEXT,
  ...
)

-- Network designs
water_network_designs (
  id,
  project_id,
  nodes_json TEXT,            -- Keep in DB if active
  pipes_json TEXT,
  gcs_path TEXT,              -- Reference if archived
  storage_tier TEXT,
  last_modified_at TEXT,      -- Track activity
  ...
)

-- Analysis results cache
analysis_cache (
  id,
  design_id,
  design_type TEXT,
  results_json TEXT,
  computed_at TEXT,
  expires_at TEXT
)
```

**Storage Thresholds:**

| Data Type | Keep in Turso if... | Move to GCS if... |
|-----------|---------------------|-------------------|
| Survey datasets | <100MB | >100MB |
| Surfaces | <50MB | >50MB |
| Network designs | Active (modified in last 7 days) | Inactive (>7 days) |
| Analysis results | Recent (last 24 hours) | Older or >10MB |
| **Total per user DB** | **<5GB** | **>5GB** |

**Auto-archival Logic:**
```typescript
// Run daily
async function archiveOldData(userId: string) {
  const userDb = getUserDb(userId);

  // Archive large surveys
  const largeSurveys = await query(userDb,
    `SELECT * FROM survey_datasets
     WHERE storage_tier = 'hot'
     AND file_size_bytes > 100000000`  // >100MB
  );

  for (const survey of largeSurveys) {
    await archiveToGcs(userId, 'survey', survey);
  }

  // Archive inactive networks
  const inactiveNetworks = await query(userDb,
    `SELECT * FROM water_network_designs
     WHERE storage_tier = 'hot'
     AND last_modified_at < datetime('now', '-7 days')`
  );

  for (const network of inactiveNetworks) {
    await archiveToGcs(userId, 'network', network);
  }
}
```

---

## Tier 3: Google Cloud Storage (Cold Storage)

**Purpose:** Long-term archive for large/inactive data

**What it stores:**
- Large survey files (>100MB)
- Archived projects
- Inactive network designs
- Old analysis results
- Historical data

**Path structure:**
```
caeser-geo-data/
└── users/{userId}/
    ├── surveys/
    │   ├── {surveyId}.las           (archived when >100MB)
    │   └── {surveyId}_metadata.json (points_json from Turso)
    ├── networks/
    │   └── {networkId}.json         (archived when inactive)
    ├── surfaces/
    │   └── {surfaceId}.obj
    └── projects/
        └── {projectId}/
            └── complete_export.zip  (full project archive)
```

**When data moves to GCS:**
1. Upload file to GCS
2. Update Turso record:
   ```sql
   UPDATE survey_datasets SET
     storage_tier = 'cold',
     gcs_path = 'users/{userId}/surveys/{id}.las',
     points_json = NULL  -- Clear large JSON
   WHERE id = ?
   ```
3. Keep metadata in Turso for fast queries

---

## Implementation

### 1. Database Management Service

```typescript
// lib/db/database-manager.ts
import { createClient, Client } from '@libsql/client';

// Cache for per-user database connections
const userDbCache = new Map<string, Client>();

/**
 * Get the shared authentication database
 */
export function getAuthDb(): Client {
  const url = process.env.TURSO_AUTH_DB_URL;
  const authToken = process.env.TURSO_AUTH_DB_TOKEN;
  return createClient({ url, authToken });
}

/**
 * Get or create a per-user database
 */
export async function getUserDb(userId: string): Promise<Client> {
  // Check cache first
  if (userDbCache.has(userId)) {
    return userDbCache.get(userId)!;
  }

  const dbName = `user_${userId}`;

  // Check if database exists in registry
  const authDb = getAuthDb();
  const project = await queryOne(authDb,
    'SELECT turso_db_name FROM project_registry WHERE user_id = ? LIMIT 1',
    [userId]
  );

  let url: string;
  let authToken: string;

  if (!project?.turso_db_name) {
    // Create new user database
    const created = await createUserDatabase(userId);
    url = created.url;
    authToken = created.token;
  } else {
    // Use existing database
    url = `libsql://${dbName}.turso.io`;
    authToken = process.env.TURSO_USER_DB_TOKEN!;
  }

  const client = createClient({ url, authToken });
  userDbCache.set(userId, client);

  return client;
}

/**
 * Create a new Turso database for a user
 */
async function createUserDatabase(userId: string): Promise<{
  url: string;
  token: string;
}> {
  const dbName = `user_${userId}`;

  // Use Turso Platform API to create database
  const response = await fetch('https://api.turso.tech/v1/databases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TURSO_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: dbName,
      group: 'default',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create user database: ${response.statusText}`);
  }

  const data = await response.json();

  // Create auth token for this database
  const tokenResponse = await fetch(
    `https://api.turso.tech/v1/databases/${dbName}/auth/tokens`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TURSO_API_TOKEN}`,
      },
    }
  );

  const tokenData = await tokenResponse.json();

  // Run migrations on new database
  const client = createClient({
    url: data.url,
    authToken: tokenData.token,
  });
  await runUserDbMigrations(client);

  // Register in auth database
  const authDb = getAuthDb();
  await execute(authDb,
    `UPDATE project_registry SET
     turso_db_name = ?,
     database_location = 'turso'
     WHERE user_id = ?`,
    [dbName, userId]
  );

  return {
    url: data.url,
    token: tokenData.token,
  };
}

/**
 * Run schema migrations on user database
 */
async function runUserDbMigrations(db: Client) {
  // Create user-specific tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS survey_datasets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      points_json TEXT,
      gcs_path TEXT,
      storage_tier TEXT NOT NULL DEFAULT 'hot',
      file_size_bytes INTEGER,
      point_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS water_network_designs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      nodes_json TEXT,
      pipes_json TEXT,
      pumps_json TEXT,
      tanks_json TEXT,
      gcs_path TEXT,
      storage_tier TEXT NOT NULL DEFAULT 'hot',
      last_modified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add indexes for common queries
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_surveys_tier
    ON survey_datasets(storage_tier)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_networks_modified
    ON water_network_designs(last_modified_at)
  `);
}
```

### 2. Archival Service

```typescript
// lib/storage/archival-service.ts
import { getUserDb } from '@/lib/db/database-manager';
import { uploadFile } from '@/lib/storage/file-service';
import { query, execute } from '@ledesign/db';

interface ArchiveOptions {
  userId: string;
  dataType: 'survey' | 'network' | 'surface';
  record: any;
}

/**
 * Archive data from Turso to GCS
 */
export async function archiveToGcs(
  userId: string,
  dataType: string,
  record: any
): Promise<void> {
  console.log(`Archiving ${dataType} ${record.id} for user ${userId}`);

  // Prepare data for upload
  let dataToArchive: any;
  let fileName: string;
  let tableName: string;

  switch (dataType) {
    case 'survey':
      dataToArchive = JSON.parse(record.points_json);
      fileName = `${record.id}.json`;
      tableName = 'survey_datasets';
      break;
    case 'network':
      dataToArchive = {
        nodes: JSON.parse(record.nodes_json),
        pipes: JSON.parse(record.pipes_json),
        pumps: JSON.parse(record.pumps_json || '[]'),
        tanks: JSON.parse(record.tanks_json || '[]'),
      };
      fileName = `${record.id}.json`;
      tableName = 'water_network_designs';
      break;
    case 'surface':
      dataToArchive = JSON.parse(record.surface_json);
      fileName = `${record.id}.json`;
      tableName = 'generated_surfaces';
      break;
    default:
      throw new Error(`Unknown data type: ${dataType}`);
  }

  // Upload to GCS
  const buffer = Buffer.from(JSON.stringify(dataToArchive));
  const { gcsPath } = await uploadFile(buffer, {
    userId,
    projectId: record.project_id,
    fileType: dataType as any,
    fileName,
    contentType: 'application/json',
  });

  // Update Turso record (clear large JSON, keep metadata)
  const userDb = await getUserDb(userId);

  switch (dataType) {
    case 'survey':
      await execute(userDb,
        `UPDATE survey_datasets SET
         storage_tier = 'cold',
         gcs_path = ?,
         points_json = NULL
         WHERE id = ?`,
        [gcsPath, record.id]
      );
      break;
    case 'network':
      await execute(userDb,
        `UPDATE water_network_designs SET
         storage_tier = 'cold',
         gcs_path = ?,
         nodes_json = NULL,
         pipes_json = NULL,
         pumps_json = NULL,
         tanks_json = NULL
         WHERE id = ?`,
        [gcsPath, record.id]
      );
      break;
  }

  console.log(`✓ Archived to ${gcsPath}`);
}

/**
 * Restore archived data from GCS to Turso (when user accesses it)
 */
export async function restoreFromGcs(
  userId: string,
  dataType: string,
  recordId: string
): Promise<any> {
  const userDb = await getUserDb(userId);

  // Get GCS path
  const tableName = dataType === 'survey' ? 'survey_datasets' : 'water_network_designs';
  const record = await queryOne(userDb,
    `SELECT gcs_path FROM ${tableName} WHERE id = ?`,
    [recordId]
  );

  if (!record?.gcs_path) {
    throw new Error(`No GCS path found for ${dataType} ${recordId}`);
  }

  // Download from GCS
  const signedUrl = await getFileUrl(record.gcs_path, 60);
  const response = await fetch(signedUrl);
  const data = await response.json();

  // Restore to Turso
  switch (dataType) {
    case 'survey':
      await execute(userDb,
        `UPDATE survey_datasets SET
         storage_tier = 'hot',
         points_json = ?
         WHERE id = ?`,
        [JSON.stringify(data), recordId]
      );
      break;
    case 'network':
      await execute(userDb,
        `UPDATE water_network_designs SET
         storage_tier = 'hot',
         nodes_json = ?,
         pipes_json = ?,
         pumps_json = ?,
         tanks_json = ?
         WHERE id = ?`,
        [
          JSON.stringify(data.nodes),
          JSON.stringify(data.pipes),
          JSON.stringify(data.pumps || []),
          JSON.stringify(data.tanks || []),
          recordId,
        ]
      );
      break;
  }

  console.log(`✓ Restored ${dataType} ${recordId} from cold storage`);
  return data;
}

/**
 * Auto-archive old data (run daily via cron)
 */
export async function runArchivalJob(userId: string): Promise<void> {
  const userDb = await getUserDb(userId);

  // Archive large surveys (>100MB)
  const largeSurveys = await query(userDb,
    `SELECT * FROM survey_datasets
     WHERE storage_tier = 'hot'
     AND file_size_bytes > 100000000`
  );

  for (const survey of largeSurveys) {
    await archiveToGcs(userId, 'survey', survey);
  }

  // Archive inactive networks (>7 days since modification)
  const inactiveNetworks = await query(userDb,
    `SELECT * FROM water_network_designs
     WHERE storage_tier = 'hot'
     AND datetime(last_modified_at) < datetime('now', '-7 days')`
  );

  for (const network of inactiveNetworks) {
    await archiveToGcs(userId, 'network', network);
  }

  console.log(`✓ Archival job complete for user ${userId}`);
}
```

### 3. API Middleware Updates

```typescript
// lib/auth/middleware.ts - Updated
import { getAuthDb, getUserDb } from '@/lib/db/database-manager';

export interface AuthenticatedRequest extends NextRequest {
  user: AuthTokenPayload;
  authDb: Client;     // Shared auth database
  userDb: Client;     // User's personal database
}

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // ... existing auth token verification ...

  // Get databases
  const authDb = getAuthDb();
  const userDb = await getUserDb(payload.userId);

  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = payload;
  authenticatedRequest.authDb = authDb;
  authenticatedRequest.userDb = userDb;

  return handler(authenticatedRequest);
}
```

---

## Migration Path

### Phase 1: Set up shared auth database
```bash
# Current database becomes the auth database
# Add project_registry table
```

### Phase 2: Create first per-user database
```typescript
// When user creates first project
const userDb = await getUserDb(userId);
await runUserDbMigrations(userDb);
```

### Phase 3: Migrate existing data
```typescript
// Move project data from shared DB to user DBs
// Keep auth data in shared DB
```

### Phase 4: Implement archival
```typescript
// Set up daily cron job
// Archive old/large data to GCS
```

---

## Cost Analysis (Updated)

### Turso Costs
- **Shared auth DB**: $29/month (Scaler plan)
- **Per-user DBs**: $0 (unlimited on Scaler plan)
- **Total Turso**: **$29/month**

### GCS Costs (for archived data)
- **Storage**: $0.020/GB/month
- If average user has 10GB in GCS: 1000 users × 10GB × $0.020 = **$200/month**
- **Total GCS**: **$200-1,000/month** depending on archival rate

### Total System Cost
- **$229-1,029/month** for 1000 users
- Most data stays in fast Turso DBs
- Only cold/large data in GCS

---

## Benefits

✅ **Fast queries** - Active data in per-user DB with proper indexes
✅ **Cost-effective** - Only archive large/old data to GCS
✅ **Scalable** - Unlimited user DBs on one Turso plan
✅ **Simple** - No complex sharding logic
✅ **Isolated** - Each user's data physically separated
✅ **Compliant** - Easy to export/delete user's entire database

---

## Example Usage

```typescript
// In API route
export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    // Query user's active projects (fast - from user DB)
    const projects = await query(req.userDb,
      'SELECT * FROM projects WHERE status = ?',
      ['active']
    );

    // Query user info (from shared auth DB)
    const user = await queryOne(req.authDb,
      'SELECT * FROM users WHERE id = ?',
      [req.user.userId]
    );

    return NextResponse.json({ projects, user });
  });
}

// Load network (automatically restore from GCS if needed)
async function loadNetwork(userId: string, networkId: string) {
  const userDb = await getUserDb(userId);
  const network = await queryOne(userDb,
    'SELECT * FROM water_network_designs WHERE id = ?',
    [networkId]
  );

  // If archived to GCS, restore it
  if (network.storage_tier === 'cold') {
    const data = await restoreFromGcs(userId, 'network', networkId);
    return data;
  }

  // Already in hot storage
  return {
    nodes: JSON.parse(network.nodes_json),
    pipes: JSON.parse(network.pipes_json),
  };
}
```
