/**
 * IndexedDB Cache - Client-side storage for large working data
 * Provides offline support and reduces network requests
 *
 * Store hierarchy:
 * - networks: Water/sewer network designs
 * - surfaces: Generated terrain surfaces
 * - surveys: Survey point clouds (if small enough)
 * - files: Generic file cache with metadata
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface LeDesignDB extends DBSchema {
  networks: {
    key: string; // Network ID
    value: {
      id: string;
      projectId: string;
      name: string;
      data: any; // Network JSON data
      fileSize: number;
      syncedAt: string;
      dirty: boolean; // Has local changes not synced to server
      version: number;
    };
    indexes: { 'by-project': string };
  };
  surfaces: {
    key: string; // Surface ID
    value: {
      id: string;
      projectId: string;
      name: string;
      data: any; // Surface mesh data
      fileSize: number;
      syncedAt: string;
      dirty: boolean;
      version: number;
    };
    indexes: { 'by-project': string };
  };
  surveys: {
    key: string; // Survey ID
    value: {
      id: string;
      projectId: string;
      name: string;
      data: any; // Survey points (if small enough)
      fileSize: number;
      syncedAt: string;
      version: number;
    };
    indexes: { 'by-project': string };
  };
  files: {
    key: string; // File ID
    value: {
      id: string;
      projectId: string;
      type: 'network' | 'surface' | 'survey' | 'cad';
      name: string;
      blob: Blob; // Actual file data
      size: number;
      contentType: string;
      cachedAt: string;
    };
    indexes: { 'by-project': string; 'by-type': string };
  };
}

const DB_NAME = 'ledesign';
const DB_VERSION = 1;

let db: IDBPDatabase<LeDesignDB> | null = null;

/**
 * Initialize and get IndexedDB instance
 */
async function getDB(): Promise<IDBPDatabase<LeDesignDB>> {
  if (!db) {
    db = await openDB<LeDesignDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Networks store
        const networks = db.createObjectStore('networks', { keyPath: 'id' });
        networks.createIndex('by-project', 'projectId');

        // Surfaces store
        const surfaces = db.createObjectStore('surfaces', { keyPath: 'id' });
        surfaces.createIndex('by-project', 'projectId');

        // Surveys store
        const surveys = db.createObjectStore('surveys', { keyPath: 'id' });
        surveys.createIndex('by-project', 'projectId');

        // Files store
        const files = db.createObjectStore('files', { keyPath: 'id' });
        files.createIndex('by-project', 'projectId');
        files.createIndex('by-type', 'type');
      },
    });
  }
  return db;
}

// ============================================================
// NETWORK OPERATIONS
// ============================================================

export async function cacheNetwork(
  id: string,
  projectId: string,
  name: string,
  data: any
): Promise<void> {
  const db = await getDB();
  const dataStr = JSON.stringify(data);
  await db.put('networks', {
    id,
    projectId,
    name,
    data,
    fileSize: dataStr.length,
    syncedAt: new Date().toISOString(),
    dirty: false,
    version: 1,
  });
}

export async function getNetwork(id: string): Promise<any | null> {
  const db = await getDB();
  const record = await db.get('networks', id);
  return record?.data || null;
}

export async function markNetworkDirty(id: string): Promise<void> {
  const db = await getDB();
  const network = await db.get('networks', id);
  if (network) {
    network.dirty = true;
    network.version += 1;
    await db.put('networks', network);
  }
}

export async function getDirtyNetworks(): Promise<string[]> {
  const db = await getDB();
  const networks = await db.getAll('networks');
  return networks.filter((n) => n.dirty).map((n) => n.id);
}

export async function clearNetworkCache(projectId?: string): Promise<void> {
  const db = await getDB();
  if (projectId) {
    const networks = await db.getAllFromIndex('networks', 'by-project', projectId);
    for (const network of networks) {
      await db.delete('networks', network.id);
    }
  } else {
    await db.clear('networks');
  }
}

// ============================================================
// SURFACE OPERATIONS
// ============================================================

export async function cacheSurface(
  id: string,
  projectId: string,
  name: string,
  data: any
): Promise<void> {
  const db = await getDB();
  const dataStr = JSON.stringify(data);
  await db.put('surfaces', {
    id,
    projectId,
    name,
    data,
    fileSize: dataStr.length,
    syncedAt: new Date().toISOString(),
    dirty: false,
    version: 1,
  });
}

export async function getSurface(id: string): Promise<any | null> {
  const db = await getDB();
  const record = await db.get('surfaces', id);
  return record?.data || null;
}

export async function clearSurfaceCache(projectId?: string): Promise<void> {
  const db = await getDB();
  if (projectId) {
    const surfaces = await db.getAllFromIndex('surfaces', 'by-project', projectId);
    for (const surface of surfaces) {
      await db.delete('surfaces', surface.id);
    }
  } else {
    await db.clear('surfaces');
  }
}

// ============================================================
// SURVEY OPERATIONS
// ============================================================

export async function cacheSurvey(
  id: string,
  projectId: string,
  name: string,
  data: any
): Promise<void> {
  const db = await getDB();
  const dataStr = JSON.stringify(data);
  await db.put('surveys', {
    id,
    projectId,
    name,
    data,
    fileSize: dataStr.length,
    syncedAt: new Date().toISOString(),
    version: 1,
  });
}

export async function getSurvey(id: string): Promise<any | null> {
  const db = await getDB();
  const record = await db.get('surveys', id);
  return record?.data || null;
}

export async function clearSurveyCache(projectId?: string): Promise<void> {
  const db = await getDB();
  if (projectId) {
    const surveys = await db.getAllFromIndex('surveys', 'by-project', projectId);
    for (const survey of surveys) {
      await db.delete('surveys', survey.id);
    }
  } else {
    await db.clear('surveys');
  }
}

// ============================================================
// FILE OPERATIONS (Generic Blob Storage)
// ============================================================

export async function cacheFile(
  id: string,
  projectId: string,
  type: 'network' | 'surface' | 'survey' | 'cad',
  name: string,
  blob: Blob
): Promise<void> {
  const db = await getDB();
  await db.put('files', {
    id,
    projectId,
    type,
    name,
    blob,
    size: blob.size,
    contentType: blob.type,
    cachedAt: new Date().toISOString(),
  });
}

export async function getFile(id: string): Promise<Blob | null> {
  const db = await getDB();
  const record = await db.get('files', id);
  return record?.blob || null;
}

export async function listCachedFiles(projectId?: string): Promise<any[]> {
  const db = await getDB();
  if (projectId) {
    const files = await db.getAllFromIndex('files', 'by-project', projectId);
    return files.map((f) => ({
      id: f.id,
      projectId: f.projectId,
      type: f.type,
      name: f.name,
      size: f.size,
      contentType: f.contentType,
      cachedAt: f.cachedAt,
    }));
  } else {
    const files = await db.getAll('files');
    return files.map((f) => ({
      id: f.id,
      projectId: f.projectId,
      type: f.type,
      name: f.name,
      size: f.size,
      contentType: f.contentType,
      cachedAt: f.cachedAt,
    }));
  }
}

export async function clearFileCache(projectId?: string): Promise<void> {
  const db = await getDB();
  if (projectId) {
    const files = await db.getAllFromIndex('files', 'by-project', projectId);
    for (const file of files) {
      await db.delete('files', file.id);
    }
  } else {
    await db.clear('files');
  }
}

// ============================================================
// CACHE MANAGEMENT
// ============================================================

/**
 * Get total cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  const db = await getDB();
  let total = 0;

  const networks = await db.getAll('networks');
  total += networks.reduce((sum, n) => sum + n.fileSize, 0);

  const surfaces = await db.getAll('surfaces');
  total += surfaces.reduce((sum, s) => sum + s.fileSize, 0);

  const surveys = await db.getAll('surveys');
  total += surveys.reduce((sum, s) => sum + s.fileSize, 0);

  const files = await db.getAll('files');
  total += files.reduce((sum, f) => sum + f.size, 0);

  return total;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  networks: number;
  surfaces: number;
  surveys: number;
  files: number;
  totalSize: number;
  totalSizeMB: string;
}> {
  const db = await getDB();

  const networks = await db.getAll('networks');
  const surfaces = await db.getAll('surfaces');
  const surveys = await db.getAll('surveys');
  const files = await db.getAll('files');

  const totalSize = await getCacheSize();

  return {
    networks: networks.length,
    surfaces: surfaces.length,
    surveys: surveys.length,
    files: files.length,
    totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
  };
}

/**
 * Clear all caches for a project
 */
export async function clearProjectCache(projectId: string): Promise<void> {
  await Promise.all([
    clearNetworkCache(projectId),
    clearSurfaceCache(projectId),
    clearSurveyCache(projectId),
    clearFileCache(projectId),
  ]);
}

/**
 * Clear entire cache
 */
export async function clearAllCaches(): Promise<void> {
  await Promise.all([
    clearNetworkCache(),
    clearSurfaceCache(),
    clearSurveyCache(),
    clearFileCache(),
  ]);
}
