// ============================================================
// SYNC MANAGER
// Handles auto-sync between IndexedDB and Turso
// ============================================================

import {
  getSyncQueue,
  clearSyncQueue,
  updateProjectSync,
  getProjectSyncStatus,
  markEntitiesSynced,
} from '@/lib/storage/indexeddb';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncManagerOptions {
  projectId: string;
  userId: string;
  autoSyncInterval?: number; // milliseconds (default: 30000 = 30s)
  onSyncStart?: () => void;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
}

export interface SyncResult {
  success: boolean;
  entitiesChanged: number;
  layersChanged: number;
  deletesProcessed: number;
  timestamp: number;
  error?: string;
}

/**
 * SyncManager - Orchestrates auto-sync between browser and server
 */
export class SyncManager {
  private projectId: string;
  private userId: string;
  private interval: number;
  private timerId: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private status: SyncStatus = 'idle';

  private onSyncStart?: () => void;
  private onSyncComplete?: (result: SyncResult) => void;
  private onSyncError?: (error: Error) => void;

  constructor(options: SyncManagerOptions) {
    this.projectId = options.projectId;
    this.userId = options.userId;
    this.interval = options.autoSyncInterval || 30000; // 30 seconds default

    this.onSyncStart = options.onSyncStart;
    this.onSyncComplete = options.onSyncComplete;
    this.onSyncError = options.onSyncError;
  }

  /**
   * Start auto-sync timer
   */
  start() {
    if (this.timerId) {
      console.warn('SyncManager already started');
      return;
    }

    console.log(`SyncManager started for project ${this.projectId} (interval: ${this.interval}ms)`);

    // Sync immediately on start
    this.sync();

    // Then sync periodically
    this.timerId = setInterval(() => {
      this.sync();
    }, this.interval);
  }

  /**
   * Stop auto-sync timer
   */
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log(`SyncManager stopped for project ${this.projectId}`);
    }
  }

  /**
   * Manual sync trigger
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return {
        success: false,
        entitiesChanged: 0,
        layersChanged: 0,
        deletesProcessed: 0,
        timestamp: Date.now(),
        error: 'Sync already in progress',
      };
    }

    this.isSyncing = true;
    this.status = 'syncing';
    this.onSyncStart?.();

    try {
      // Get pending changes from IndexedDB
      const queue = await getSyncQueue(this.projectId);

      if (queue.length === 0) {
        console.log('No changes to sync');
        this.isSyncing = false;
        this.status = 'idle';

        const result: SyncResult = {
          success: true,
          entitiesChanged: 0,
          layersChanged: 0,
          deletesProcessed: 0,
          timestamp: Date.now(),
        };

        this.onSyncComplete?.(result);
        return result;
      }

      console.log(`Syncing ${queue.length} changes...`);

      // Group changes by type
      const entities = queue.filter((item) => item.changeType === 'entity');
      const layers = queue.filter((item) => item.changeType === 'layer');
      const deletes = queue.filter((item) => item.changeType === 'delete');

      // Send to API
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: this.projectId,
          userId: this.userId,
          entities: entities.map((item) => item.data),
          layers: layers.map((item) => item.data),
          deletes: deletes.map((item) => item.data),
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Clear sync queue on success
      await clearSyncQueue(this.projectId);

      // Mark entities as synced
      const entityIds = entities.map((item) => item.entityId);
      if (entityIds.length > 0) {
        await markEntitiesSynced(entityIds);
      }

      // Update last sync timestamp
      await updateProjectSync(this.projectId, Date.now());

      const syncResult: SyncResult = {
        success: true,
        entitiesChanged: entities.length,
        layersChanged: layers.length,
        deletesProcessed: deletes.length,
        timestamp: Date.now(),
      };

      console.log('Sync completed successfully:', syncResult);

      this.status = 'idle';
      this.isSyncing = false;
      this.onSyncComplete?.(syncResult);

      return syncResult;
    } catch (error) {
      console.error('Sync error:', error);

      this.status = 'error';
      this.isSyncing = false;

      const err = error instanceof Error ? error : new Error(String(error));
      this.onSyncError?.(err);

      return {
        success: false,
        entitiesChanged: 0,
        layersChanged: 0,
        deletesProcessed: 0,
        timestamp: Date.now(),
        error: err.message,
      };
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Check if currently syncing
   */
  isSyncingNow(): boolean {
    return this.isSyncing;
  }

  /**
   * Get pending changes count
   */
  async getPendingCount(): Promise<number> {
    const status = await getProjectSyncStatus(this.projectId);
    return status.pendingChanges;
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<number> {
    const status = await getProjectSyncStatus(this.projectId);
    return status.lastSyncedAt;
  }
}

// ============================================================
// SINGLETON INSTANCE MANAGER
// ============================================================

const syncManagers = new Map<string, SyncManager>();

/**
 * Get or create SyncManager for a project
 */
export function getSyncManager(options: SyncManagerOptions): SyncManager {
  const { projectId } = options;

  if (syncManagers.has(projectId)) {
    return syncManagers.get(projectId)!;
  }

  const manager = new SyncManager(options);
  syncManagers.set(projectId, manager);

  return manager;
}

/**
 * Remove SyncManager for a project
 */
export function removeSyncManager(projectId: string) {
  const manager = syncManagers.get(projectId);

  if (manager) {
    manager.stop();
    syncManagers.delete(projectId);
  }
}

/**
 * Stop all SyncManagers (useful for cleanup)
 */
export function stopAllSyncManagers() {
  for (const manager of syncManagers.values()) {
    manager.stop();
  }
  syncManagers.clear();
}
