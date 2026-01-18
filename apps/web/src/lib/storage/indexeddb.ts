// ============================================================
// INDEXEDDB WRAPPER
// Browser-side persistent storage for CAD data
// ============================================================

import { openDB, type IDBPDatabase } from 'idb';
import type { CADEntity } from '@/types/cad';

const DB_NAME = 'caeser-cad-db';
const DB_VERSION = 1;

interface CADDatabase {
  entities: {
    key: string;
    value: {
      id: string;
      projectId: string;
      type: string;
      layer: string;
      geometry: any;
      properties?: any;
      version: number;
      isDeleted: boolean;
      isDirty: boolean; // Changed but not synced
      createdAt: number;
      updatedAt: number;
    };
    indexes: { 'by-project': string; 'by-dirty': [string, number] };
  };
  layers: {
    key: string;
    value: {
      id: string;
      projectId: string;
      name: string;
      color: string;
      visible: boolean;
      locked: boolean;
      orderIndex: number;
      version: number;
      isDirty: boolean;
      createdAt: number;
      updatedAt: number;
    };
    indexes: { 'by-project': string };
  };
  projects: {
    key: string;
    value: {
      id: string;
      name: string;
      type: string;
      lastSyncedAt: number;
      lastSavedAt: number;
      currentVersion: number;
      metadata: any;
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      projectId: string;
      changeType: 'entity' | 'layer' | 'delete';
      entityId: string;
      timestamp: number;
      data: any;
    };
    indexes: { 'by-project': string; 'by-timestamp': number };
  };
}

let dbInstance: IDBPDatabase<CADDatabase> | null = null;

/**
 * Initialize and open IndexedDB
 */
export async function openCADDB(): Promise<IDBPDatabase<CADDatabase>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<CADDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Entities store
      if (!db.objectStoreNames.contains('entities')) {
        const entityStore = db.createObjectStore('entities', { keyPath: 'id' });
        entityStore.createIndex('by-project', 'projectId');
        entityStore.createIndex('by-dirty', ['projectId', 'isDirty']);
      }

      // Layers store
      if (!db.objectStoreNames.contains('layers')) {
        const layerStore = db.createObjectStore('layers', { keyPath: 'id' });
        layerStore.createIndex('by-project', 'projectId');
      }

      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        queueStore.createIndex('by-project', 'projectId');
        queueStore.createIndex('by-timestamp', 'timestamp');
      }
    },
  });

  return dbInstance;
}

// ============================================================
// ENTITY OPERATIONS
// ============================================================

/**
 * Save entity to IndexedDB
 */
export async function saveEntity(
  projectId: string,
  entity: Omit<CADEntity, 'isSelected'>
) {
  const db = await openCADDB();
  const now = Date.now();

  await db.put('entities', {
    id: entity.id,
    projectId,
    type: entity.type,
    layer: entity.layer,
    geometry: {
      start: entity.start,
      end: entity.end,
      points: entity.points,
      radius: entity.radius,
      text: entity.text,
    },
    properties: {
      color: entity.color,
      lineweight: entity.lineweight,
    },
    version: 1,
    isDeleted: false,
    isDirty: true,
    createdAt: now,
    updatedAt: now,
  });

  // Add to sync queue
  await addToSyncQueue(projectId, 'entity', entity.id, entity);
}

/**
 * Get all entities for a project
 */
export async function getProjectEntities(projectId: string) {
  const db = await openCADDB();
  const tx = db.transaction('entities', 'readonly');
  const index = tx.store.index('by-project');

  const entities = await index.getAll(projectId);
  await tx.done;

  return entities.filter((e) => !e.isDeleted);
}

/**
 * Get dirty entities (not synced)
 */
export async function getDirtyEntities(projectId: string) {
  const db = await openCADDB();
  const tx = db.transaction('entities', 'readonly');
  const index = tx.store.index('by-dirty');

  const entities = await index.getAll([projectId, 1]);
  await tx.done;

  return entities;
}

/**
 * Mark entities as synced
 */
export async function markEntitiesSynced(entityIds: string[]) {
  const db = await openCADDB();
  const tx = db.transaction('entities', 'readwrite');

  for (const id of entityIds) {
    const entity = await tx.store.get(id);
    if (entity) {
      entity.isDirty = false;
      await tx.store.put(entity);
    }
  }

  await tx.done;
}

/**
 * Delete entity (soft delete)
 */
export async function deleteEntity(projectId: string, entityId: string) {
  const db = await openCADDB();
  const entity = await db.get('entities', entityId);

  if (entity) {
    entity.isDeleted = true;
    entity.isDirty = true;
    entity.updatedAt = Date.now();
    await db.put('entities', entity);

    // Add to sync queue
    await addToSyncQueue(projectId, 'delete', entityId, { entityId });
  }
}

/**
 * Bulk save entities (more efficient)
 */
export async function bulkSaveEntities(
  projectId: string,
  entities: Array<Omit<CADEntity, 'isSelected'>>
) {
  const db = await openCADDB();
  const tx = db.transaction('entities', 'readwrite');
  const now = Date.now();

  for (const entity of entities) {
    await tx.store.put({
      id: entity.id,
      projectId,
      type: entity.type,
      layer: entity.layer,
      geometry: {
        start: entity.start,
        end: entity.end,
        points: entity.points,
        radius: entity.radius,
        text: entity.text,
      },
      properties: {
        color: entity.color,
        lineweight: entity.lineweight,
      },
      version: 1,
      isDeleted: false,
      isDirty: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await tx.done;
}

// ============================================================
// LAYER OPERATIONS
// ============================================================

/**
 * Save layer to IndexedDB
 */
export async function saveLayer(
  projectId: string,
  layer: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
    locked: boolean;
    orderIndex: number;
  }
) {
  const db = await openCADDB();
  const now = Date.now();

  await db.put('layers', {
    id: layer.id,
    projectId,
    name: layer.name,
    color: layer.color,
    visible: layer.visible,
    locked: layer.locked,
    orderIndex: layer.orderIndex,
    version: 1,
    isDirty: true,
    createdAt: now,
    updatedAt: now,
  });

  // Add to sync queue
  await addToSyncQueue(projectId, 'layer', layer.id, layer);
}

/**
 * Get all layers for a project
 */
export async function getProjectLayers(projectId: string) {
  const db = await openCADDB();
  const tx = db.transaction('layers', 'readonly');
  const index = tx.store.index('by-project');

  const layers = await index.getAll(projectId);
  await tx.done;

  return layers.sort((a, b) => a.orderIndex - b.orderIndex);
}

// ============================================================
// SYNC QUEUE OPERATIONS
// ============================================================

/**
 * Add change to sync queue
 */
async function addToSyncQueue(
  projectId: string,
  changeType: 'entity' | 'layer' | 'delete',
  entityId: string,
  data: any
) {
  const db = await openCADDB();

  await db.add('syncQueue', {
    id: `${projectId}-${entityId}-${Date.now()}`,
    projectId,
    changeType,
    entityId,
    timestamp: Date.now(),
    data,
  });
}

/**
 * Get all pending sync items
 */
export async function getSyncQueue(projectId: string) {
  const db = await openCADDB();
  const tx = db.transaction('syncQueue', 'readonly');
  const index = tx.store.index('by-project');

  const items = await index.getAll(projectId);
  await tx.done;

  return items.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Clear sync queue after successful sync
 */
export async function clearSyncQueue(projectId: string) {
  const db = await openCADDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const index = tx.store.index('by-project');

  const items = await index.getAllKeys(projectId);

  for (const key of items) {
    await tx.store.delete(key);
  }

  await tx.done;
}

// ============================================================
// PROJECT OPERATIONS
// ============================================================

/**
 * Update project sync metadata
 */
export async function updateProjectSync(
  projectId: string,
  lastSyncedAt: number
) {
  const db = await openCADDB();
  const project = await db.get('projects', projectId);

  if (project) {
    project.lastSyncedAt = lastSyncedAt;
    await db.put('projects', project);
  }
}

/**
 * Get project sync status
 */
export async function getProjectSyncStatus(projectId: string) {
  const db = await openCADDB();
  const project = await db.get('projects', projectId);

  if (!project) {
    return {
      lastSyncedAt: 0,
      pendingChanges: 0,
    };
  }

  const queue = await getSyncQueue(projectId);

  return {
    lastSyncedAt: project.lastSyncedAt,
    pendingChanges: queue.length,
  };
}

/**
 * Clear all data for a project (useful for testing)
 */
export async function clearProjectData(projectId: string) {
  const db = await openCADDB();

  // Clear entities
  const entityTx = db.transaction('entities', 'readwrite');
  const entityIndex = entityTx.store.index('by-project');
  const entityKeys = await entityIndex.getAllKeys(projectId);
  for (const key of entityKeys) {
    await entityTx.store.delete(key);
  }
  await entityTx.done;

  // Clear layers
  const layerTx = db.transaction('layers', 'readwrite');
  const layerIndex = layerTx.store.index('by-project');
  const layerKeys = await layerIndex.getAllKeys(projectId);
  for (const key of layerKeys) {
    await layerTx.store.delete(key);
  }
  await layerTx.done;

  // Clear sync queue
  await clearSyncQueue(projectId);
}
