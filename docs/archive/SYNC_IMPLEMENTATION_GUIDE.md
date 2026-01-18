# Sync Implementation Guide

Complete guide to implement auto-sync between Browser (IndexedDB) and Turso database.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER LAYER                        │
│                                                          │
│  User draws → CAD Store → IndexedDB → SyncManager      │
│                  (Zustand)   (instant)   (30s timer)    │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP POST
┌─────────────────────────────────────────────────────────┐
│                     API LAYER                           │
│                                                          │
│             /api/sync/push (Next.js Route)              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  DATABASE LAYER                         │
│                                                          │
│                  Turso (LibSQL/SQLite)                  │
│                  - Edge replicated                      │
│                  - ACID transactions                     │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Setup Turso Database

### 1.1 Initialize Schema

```bash
# Run schema in Turso
turso db shell caeser-civil-cad < apps/web/src/lib/db/schema.sql

# Verify tables were created
turso db shell caeser-civil-cad
> .tables

# Should see:
# cad_entities  layers  projects  project_versions
# sync_log  files  calculations  users
```

### 1.2 Create Test Project

```bash
turso db shell caeser-civil-cad

# Insert test project
INSERT INTO projects (
  id, user_id, name, type, created_at, updated_at, current_version
) VALUES (
  'test-project-1',
  'test-user-1',
  'Test Civil Project',
  'civil',
  1737024000000,
  1737024000000,
  1
);

# Verify
SELECT * FROM projects;
```

---

## Step 2: Integrate SyncManager into CAD Store

### 2.1 Update CAD Store

Edit `apps/web/src/stores/cad-store.ts`:

```typescript
import { getSyncManager, type SyncManager } from '@/lib/sync/sync-manager';
import { saveEntity, deleteEntity } from '@/lib/storage/indexeddb';

interface CADState {
  // ... existing properties ...

  // Sync manager
  syncManager: SyncManager | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTime: number | null;
  pendingChanges: number;

  // Actions
  initializeSync: (projectId: string, userId: string) => void;
  stopSync: () => void;
}

export const useCADStore = create<CADState>((set, get) => ({
  // ... existing state ...

  syncManager: null,
  syncStatus: 'idle',
  lastSyncTime: null,
  pendingChanges: 0,

  // Initialize sync manager
  initializeSync: (projectId: string, userId: string) => {
    const manager = getSyncManager({
      projectId,
      userId,
      autoSyncInterval: 30000, // 30 seconds

      onSyncStart: () => {
        set({ syncStatus: 'syncing' });
      },

      onSyncComplete: (result) => {
        set({
          syncStatus: 'idle',
          lastSyncTime: result.timestamp,
          pendingChanges: 0,
        });
        console.log('Sync completed:', result);
      },

      onSyncError: (error) => {
        set({ syncStatus: 'error' });
        console.error('Sync error:', error);
      },
    });

    manager.start();
    set({ syncManager: manager });
  },

  // Stop sync manager
  stopSync: () => {
    const { syncManager } = get();
    if (syncManager) {
      syncManager.stop();
      set({ syncManager: null, syncStatus: 'idle' });
    }
  },

  // Override addEntity to save to IndexedDB
  addEntity: (entity: CADEntity) => {
    set((state) => {
      const newEntities = [...state.entities, entity];

      // Save to IndexedDB (async, doesn't block UI)
      saveEntity(state.projectId || 'default', entity).catch(console.error);

      return { entities: newEntities };
    });
  },

  // Override deleteEntity to mark in IndexedDB
  deleteEntity: (id: string) => {
    set((state) => {
      const newEntities = state.entities.filter((e) => e.id !== id);

      // Mark as deleted in IndexedDB
      deleteEntity(state.projectId || 'default', id).catch(console.error);

      return { entities: newEntities };
    });
  },
}));
```

### 2.2 Initialize Sync in Editor

Edit `apps/web/src/components/editor/CivilEditorLayout.tsx`:

```typescript
import { useCADStore } from '@/stores/cad-store';
import { useEffect } from 'react';

export function CivilEditorLayout({ projectId, projectName }: Props) {
  const initializeSync = useCADStore((state) => state.initializeSync);
  const stopSync = useCADStore((state) => state.stopSync);
  const syncStatus = useCADStore((state) => state.syncStatus);
  const lastSyncTime = useCADStore((state) => state.lastSyncTime);

  // Initialize sync on mount
  useEffect(() => {
    // TODO: Get actual user ID from auth
    const userId = 'test-user-1';

    initializeSync(projectId, userId);

    // Cleanup on unmount
    return () => {
      stopSync();
    };
  }, [projectId, initializeSync, stopSync]);

  // ... rest of component ...

  return (
    <div>
      {/* ... existing UI ... */}

      {/* Sync Status Indicator */}
      <div className="fixed bottom-4 right-4 bg-slate-900 rounded px-3 py-2 border border-slate-700">
        <div className="flex items-center gap-2 text-xs">
          {syncStatus === 'syncing' && (
            <>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-400">Syncing...</span>
            </>
          )}
          {syncStatus === 'idle' && (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-green-400">Synced</span>
            </>
          )}
          {syncStatus === 'error' && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-red-400">Sync error</span>
            </>
          )}
          {lastSyncTime && (
            <span className="text-slate-500">
              {new Date(lastSyncTime).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Step 3: Install Required Packages

```bash
cd apps/web

# IndexedDB wrapper
npm install idb

# ID generation
npm install nanoid

# Turso client (should already be installed)
npm install @libsql/client
```

---

## Step 4: Test the Sync System

### 4.1 Start Development Server

```bash
npm run dev
```

### 4.2 Open Browser Console

Navigate to the Civil Editor and watch console logs:

```
SyncManager started for project test-project-1 (interval: 30000ms)
No changes to sync
```

### 4.3 Draw Something

1. Select Line tool
2. Draw a line on canvas
3. Watch console:

```
Entity saved to IndexedDB: ent_abc123
Syncing 1 changes...
Sync completed successfully: {
  entitiesChanged: 1,
  layersChanged: 0,
  timestamp: 1737024000000
}
```

### 4.4 Verify in Turso

```bash
turso db shell caeser-civil-cad

SELECT COUNT(*) FROM cad_entities WHERE project_id = 'test-project-1';
# Should show 1

SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 1;
# Should show completed sync
```

---

## Step 5: Test Auto-Sync

1. Draw multiple entities (lines, circles, etc.)
2. Wait 30 seconds
3. Check console for automatic sync
4. Verify in Turso:

```sql
SELECT COUNT(*) FROM cad_entities WHERE project_id = 'test-project-1';
SELECT * FROM sync_log WHERE project_id = 'test-project-1' ORDER BY started_at DESC;
```

---

## Troubleshooting

### Issue: "No changes to sync"

**Cause**: IndexedDB not being populated

**Fix**: Check that `saveEntity()` is called in `addEntity` action

### Issue: "Sync failed: 500"

**Cause**: Turso connection error

**Fix**: Verify `.env` has correct `TURSO_DB_TOKEN`

```bash
# Test connection
node -e "const { getDb } = require('./apps/web/src/lib/db/turso.ts'); getDb();"
```

### Issue: Entities not appearing after refresh

**Cause**: Not loading from IndexedDB on mount

**Solution**: Add load from IndexedDB in `useEffect`:

```typescript
useEffect(() => {
  const loadEntities = async () => {
    const entities = await getProjectEntities(projectId);
    // Update store with loaded entities
  };

  loadEntities();
}, [projectId]);
```

---

## Next Steps

### 1. Load from IndexedDB on Page Load

Currently, entities are only in memory. On page refresh, load from IndexedDB:

```typescript
// In CivilEditorLayout or App component
useEffect(() => {
  async function loadProject() {
    const entities = await getProjectEntities(projectId);
    const layers = await getProjectLayers(projectId);

    // Update CAD store
    useCADStore.setState({ entities, layers });
  }

  loadProject();
}, [projectId]);
```

### 2. Add Manual Save (Version Snapshots)

Implement "Save" button that creates version snapshots:

```typescript
const handleSave = async () => {
  const entities = useCADStore.getState().entities;
  const layers = useCADStore.getState().layers;

  await fetch('/api/projects/save', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      entities,
      layers,
      description: 'User saved version',
    }),
  });
};
```

### 3. Add Offline Support

SyncManager already queues changes. Just add offline detection:

```typescript
window.addEventListener('offline', () => {
  console.log('Offline - changes will sync when reconnected');
});

window.addEventListener('online', () => {
  console.log('Back online - syncing...');
  syncManager.sync();
});
```

### 4. Add GCS for Large Files

For terrain data, point clouds, etc.:

```typescript
// Upload to GCS
const uploadTerrain = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  const { fileId, gcsPath } = await response.json();

  // Save reference in Turso
  await fetch('/api/projects/terrain', {
    method: 'PATCH',
    body: JSON.stringify({ projectId, terrainFileId: fileId }),
  });
};
```

---

## Performance Monitoring

### Check Sync Performance

```sql
-- Average sync time
SELECT
  AVG(completed_at - started_at) as avg_sync_ms,
  COUNT(*) as total_syncs
FROM sync_log
WHERE status = 'completed';

-- Failed syncs
SELECT * FROM sync_log WHERE status = 'failed' ORDER BY started_at DESC;

-- Largest syncs
SELECT * FROM sync_log ORDER BY changes_count DESC LIMIT 10;
```

### IndexedDB Size

```javascript
// In browser console
navigator.storage.estimate().then(estimate => {
  console.log(`Using ${estimate.usage} bytes of ${estimate.quota} bytes`);
  console.log(`That's ${(estimate.usage / estimate.quota * 100).toFixed(2)}%`);
});
```

---

## Summary

✅ **Implemented:**
- IndexedDB for instant browser storage
- SyncManager with 30s auto-sync
- API routes for pushing changes to Turso
- Turso database with proper schema
- Integration hooks for CAD store

✅ **Benefits:**
- Zero latency drawing (IndexedDB is instant)
- Never lose work (auto-sync every 30s)
- Offline capable (queues changes)
- Version control ready (snapshot system)

✅ **Ready for Production:**
- Add authentication (replace test-user-1)
- Add proper error UI
- Implement load from IndexedDB on mount
- Add GCS for large files
- Deploy to Vercel with Turso edge replication
