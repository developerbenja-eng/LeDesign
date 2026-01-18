# Tiered Storage System - Setup Guide

## Architecture Overview

LeDesign now uses a **3-tier storage architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Shared Turso Auth DB                               │
│ - User accounts & authentication                            │
│ - User database registry                                    │
│ - Project metadata registry                                 │
│ - Archival job tracking                                     │
│ Cost: $29/month (unlimited databases)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 2: Per-User Turso DBs (Hot Storage)                   │
│ - Active project data (<7 days old)                         │
│ - Small/medium files (<100MB)                               │
│ - Fast access for working data                              │
│ - Auto-archives when > 5GB or inactive                      │
│ Cost: Included in $29/month (unlimited DBs)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 3: Google Cloud Storage (Cold Storage)                │
│ - Large survey files (>100MB)                               │
│ - Inactive networks (>7 days)                               │
│ - Archived historical data                                  │
│ - Unlimited capacity                                        │
│ Cost: ~$0.020/GB/month ($1,000/month for 50TB)             │
└─────────────────────────────────────────────────────────────┘
```

**Total Cost**: ~$229/month for 50TB storage across 1000 users

---

## Setup Instructions

### 1. Turso CLI Setup

First, log in to Turso:

```bash
turso auth login
```

This will open a browser window for authentication.

Verify login:

```bash
turso auth whoami
```

### 2. Environment Variables

Update your `.env` file with the following variables:

```bash
# Shared Auth Database (existing)
TURSO_AUTH_DB_URL=libsql://your-auth-db.turso.io
TURSO_AUTH_DB_TOKEN=your-auth-db-token

# Legacy fallback (can be same as auth DB)
TURSO_DB_URL=libsql://your-auth-db.turso.io
TURSO_DB_TOKEN=your-auth-db-token

# Google Cloud Storage (existing)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GCS_BUCKET_NAME=caeser-geo-data

# Cron Job Secret (for production)
CRON_SECRET=your-random-secret-here
```

**Generate CRON_SECRET:**

```bash
openssl rand -base64 32
```

### 3. Run Migrations

Run the database migrations to add tiered storage tables:

```bash
cd /Users/benjaledesma/Benja/LeDesign
npm run migrate
```

This will add the following tables to your **shared auth database**:

- `user_databases` - Registry of per-user Turso databases
- `project_registry` - Project metadata and storage locations
- `archival_jobs` - Job tracking for auto-archival
- `storage_stats` - Per-user storage statistics

### 4. Test User Database Creation

Create a test user database:

```bash
# Using curl (replace with your auth token)
curl -X POST http://localhost:4000/api/user/database \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Or use the frontend to create a new project, which will automatically trigger database creation.

Check the database was created:

```bash
turso db list
```

You should see a database named `user-{userId}`.

### 5. Test Archival

Manually trigger archival for a user:

```typescript
// In a Node.js script or API endpoint
import { runArchivalJob } from '@/lib/storage/archival-service';

const result = await runArchivalJob('user_id_here');
console.log(result);
```

Or trigger the cron job manually:

```bash
curl -X POST http://localhost:4000/api/cron/archival \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 6. Verify GCS Integration

Check that files are being uploaded to GCS:

```bash
gsutil ls gs://caeser-geo-data/users/
```

---

## API Endpoints

### User Database Management

#### GET /api/user/database

Get user database status and storage statistics.

**Response:**

```json
{
  "exists": true,
  "database": {
    "name": "user-abc123",
    "url": "libsql://user-abc123.turso.io",
    "sizeBytes": 15728640,
    "sizeMB": "15.00",
    "createdAt": "2024-01-16T12:00:00Z",
    "updatedAt": "2024-01-16T14:30:00Z"
  },
  "storage": {
    "tursoBytes": 10485760,
    "tursoMB": "10.00",
    "gcsBytes": 104857600,
    "gcsMB": "100.00",
    "totalBytes": 115343360,
    "totalMB": "110.00",
    "hotSurveys": 3,
    "coldSurveys": 5,
    "hotNetworks": 2,
    "coldNetworks": 8
  }
}
```

#### POST /api/user/database

Initialize user database (called automatically on first project creation).

**Response:**

```json
{
  "success": true,
  "message": "User database created successfully",
  "database": {
    "name": "user-abc123",
    "url": "libsql://user-abc123.turso.io"
  }
}
```

### Archival Cron Job

#### POST /api/cron/archival

Run archival job for all users (called by Vercel Cron daily at 2 AM).

**Headers:**

```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**

```json
{
  "success": true,
  "results": {
    "totalUsers": 1000,
    "successfulUsers": 998,
    "failedUsers": 2,
    "totalItemsArchived": 1500,
    "totalBytesArchived": 524288000,
    "errors": ["User xyz: Failed to upload file"],
    "startedAt": "2024-01-16T02:00:00Z",
    "completedAt": "2024-01-16T02:15:00Z"
  }
}
```

#### GET /api/cron/archival

Get archival job status and statistics.

**Response:**

```json
{
  "last24Hours": {
    "totalJobs": 1000,
    "successful": 998,
    "failed": 2,
    "running": 0,
    "totalItemsArchived": 1500,
    "totalBytesArchived": 524288000
  },
  "allTime": {
    "totalJobs": 30000,
    "successful": 29800,
    "failed": 200
  },
  "recentJobs": [...]
}
```

---

## Archival Thresholds

The system automatically archives data based on these thresholds:

| Type | Threshold | Action |
|------|-----------|--------|
| Survey files | > 100 MB | Archive to GCS immediately |
| Surface files | > 50 MB | Archive to GCS immediately |
| Network designs | Inactive > 7 days | Archive to GCS |
| User database | > 5 GB total | Archive oldest projects |

These can be adjusted in [archival-service.ts:13-18](../apps/web/src/lib/storage/archival-service.ts#L13-L18):

```typescript
const THRESHOLDS = {
  SURVEY_SIZE_BYTES: 100 * 1024 * 1024,     // 100MB
  SURFACE_SIZE_BYTES: 50 * 1024 * 1024,     // 50MB
  NETWORK_INACTIVE_DAYS: 7,                  // 7 days
  USER_DB_MAX_BYTES: 5 * 1024 * 1024 * 1024, // 5GB
};
```

---

## Usage in Application Code

### Accessing Databases in API Routes

All authenticated API routes now have access to both databases:

```typescript
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    // Access shared auth database
    const user = await queryOne(
      req.authDb,
      'SELECT * FROM users WHERE id = ?',
      [req.user.userId]
    );

    // Access user's personal database
    const projects = await query(
      req.userDb,
      'SELECT * FROM projects WHERE user_id = ?',
      [req.user.userId]
    );

    return NextResponse.json({ user, projects });
  });
}
```

### Manual Database Access

If you need to access databases outside of API routes:

```typescript
import { getAuthDb, getUserDb } from '@/lib/db/database-manager';

// Get shared auth database
const authDb = getAuthDb();

// Get user's database (creates if doesn't exist)
const userDb = await getUserDb(userId);
```

### Archiving Data Manually

```typescript
import {
  archiveSurvey,
  archiveNetwork,
  restoreSurvey,
  restoreNetwork,
} from '@/lib/storage/archival-service';

// Archive a survey to GCS
await archiveSurvey(userId, surveyId);

// Restore a survey from GCS
const surveyData = await restoreSurvey(userId, surveyId);

// Archive a network design
await archiveNetwork(userId, networkId);

// Restore a network design
const networkData = await restoreNetwork(userId, networkId);
```

---

## Monitoring

### Check User Database Sizes

```bash
# List all user databases
turso db list

# Check specific database size
turso db show user-{userId}
```

### Check GCS Storage

```bash
# List all users
gsutil ls gs://caeser-geo-data/users/

# Check specific user storage
gsutil du -sh gs://caeser-geo-data/users/{userId}/

# List archived files
gsutil ls -l gs://caeser-geo-data/users/{userId}/surveys/
gsutil ls -l gs://caeser-geo-data/users/{userId}/networks/
```

### Monitor Archival Jobs

Access the monitoring endpoint:

```bash
curl http://localhost:4000/api/cron/archival
```

Or check the database directly:

```sql
-- Recent archival jobs
SELECT * FROM archival_jobs
ORDER BY started_at DESC
LIMIT 50;

-- Failed jobs
SELECT * FROM archival_jobs
WHERE status = 'failed'
ORDER BY started_at DESC;

-- Storage statistics
SELECT * FROM storage_stats
ORDER BY total_storage_bytes DESC;
```

---

## Troubleshooting

### "You are not logged in, please login with turso auth login"

Run:

```bash
turso auth login
```

### "Failed to create user database"

1. Check Turso CLI is installed: `which turso`
2. Check you're logged in: `turso auth whoami`
3. Check you have permission to create databases
4. Check database name doesn't already exist: `turso db list`

### "Failed to upload file to GCS"

1. Check `GOOGLE_APPLICATION_CREDENTIALS` is set
2. Check service account has Storage Object Creator role
3. Check bucket exists: `gsutil ls gs://caeser-geo-data/`
4. Check GCS credentials: `gcloud auth list`

### "File not found in GCS"

1. Check `gcs_path` column in database is correct
2. Verify file exists: `gsutil ls gs://caeser-geo-data/{gcs_path}`
3. Regenerate signed URL if expired

### Database growing too large

1. Check archival job is running: `curl /api/cron/archival`
2. Manually trigger archival: `POST /api/cron/archival`
3. Lower thresholds in `archival-service.ts`
4. Check for failed archival jobs in database

---

## Deployment Checklist

- [ ] Set up Turso CLI and log in
- [ ] Update environment variables in Vercel
- [ ] Run migrations: `npm run migrate`
- [ ] Set CRON_SECRET in environment
- [ ] Deploy to Vercel
- [ ] Verify cron job is scheduled in Vercel dashboard
- [ ] Test user database creation
- [ ] Test file upload/download
- [ ] Test archival job manually
- [ ] Monitor archival job status
- [ ] Set up alerts for failed jobs

---

## Cost Breakdown

For 1000 users with 50 GB each:

| Component | Cost |
|-----------|------|
| Turso Scaler Plan | $29/month (unlimited DBs) |
| GCS Storage (50 TB) | $1,000/month |
| GCS Operations | ~$50/month |
| **Total** | **~$1,079/month** |

**Cost per user**: ~$1.08/month

Compare to alternatives:
- All data in Turso: Not feasible (500 MB limit per DB)
- All data in GCS: $1,050/month but slower access
- Per-user PostgreSQL: $10,000+/month
- AWS RDS: $5,000+/month

---

## Next Steps

1. Test the system with real user data
2. Monitor archival job performance
3. Adjust thresholds based on usage patterns
4. Set up alerting for failed jobs
5. Document migration path for existing data
6. Create admin dashboard for storage monitoring

---

## Files Changed

### Created Files

- [apps/web/src/lib/db/database-manager.ts](../apps/web/src/lib/db/database-manager.ts) - Database manager
- [packages/db/src/migrations/add-tiered-storage.ts](../packages/db/src/migrations/add-tiered-storage.ts) - Migration
- [apps/web/src/lib/storage/archival-service.ts](../apps/web/src/lib/storage/archival-service.ts) - Archival service
- [apps/web/src/app/api/user/database/route.ts](../apps/web/src/app/api/user/database/route.ts) - User DB API
- [apps/web/src/app/api/cron/archival/route.ts](../apps/web/src/app/api/cron/archival/route.ts) - Cron job

### Modified Files

- [apps/web/src/lib/auth/middleware.ts](../apps/web/src/lib/auth/middleware.ts) - Added dual DB support
- [packages/db/src/migrate.ts](../packages/db/src/migrate.ts) - Added migration
- [vercel.json](../vercel.json) - Added cron configuration

---

For questions or issues, check:
- [Turso Documentation](https://docs.turso.tech/)
- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Vercel Cron Documentation](https://vercel.com/docs/cron-jobs)
