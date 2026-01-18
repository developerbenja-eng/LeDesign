import { createClient, Client } from '@libsql/client';

// Lazy initialization - clients are created on first access
let _db: Client | null = null;

// Main CAD POC Database
// Supports both local SQLite (development) and remote Turso (production)
export function getDb(): Client {
  if (!_db) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_DB_TOKEN;

    // For local development, use file-based SQLite
    if (!url || url === 'file:local.db') {
      console.log('Using local SQLite database: ./local.db');
      _db = createClient({
        url: 'file:local.db',
      });
    } else {
      // For production, use remote Turso
      if (!authToken) {
        throw new Error('Missing TURSO_DB_TOKEN for remote database');
      }
      _db = createClient({ url, authToken });
    }
  }
  return _db;
}

// Type-safe query helper
export async function query<T>(
  db: Client,
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<T[]> {
  const result = await db.execute({ sql, args });
  return result.rows as T[];
}

// Single row query helper
export async function queryOne<T>(
  db: Client,
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<T | null> {
  const rows = await query<T>(db, sql, args);
  return rows[0] || null;
}

// Execute mutation (insert, update, delete)
export async function execute(
  db: Client,
  sql: string,
  args: (string | number | null | boolean)[] = []
) {
  return await db.execute({ sql, args });
}

// ============================================================
// TRANSACTION HELPERS
// ============================================================

/**
 * Execute multiple statements in a transaction
 */
export async function executeTransaction(
  db: Client,
  statements: Array<{ sql: string; args?: any[] }>
) {
  await db.execute('BEGIN TRANSACTION');

  try {
    const results = [];
    for (const statement of statements) {
      const result = await db.execute({
        sql: statement.sql,
        args: statement.args || [],
      });
      results.push(result);
    }

    await db.execute('COMMIT');
    return results;
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

/**
 * Execute a batch of statements (more efficient)
 */
export async function executeBatch(
  db: Client,
  statements: Array<{ sql: string; args?: any[] }>
) {
  return await db.batch(statements);
}

// ============================================================
// ENTITY OPERATIONS
// ============================================================

/**
 * Upsert CAD entity
 */
export async function upsertEntity(
  db: Client,
  entity: {
    id: string;
    projectId: string;
    type: string;
    layer: string;
    geometry: any;
    properties?: any;
    version: number;
  }
) {
  const now = Date.now();
  return await execute(
    db,
    `INSERT INTO cad_entities (
      id, project_id, type, layer, geometry, properties, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      layer = excluded.layer,
      geometry = excluded.geometry,
      properties = excluded.properties,
      version = excluded.version,
      updated_at = excluded.updated_at`,
    [
      entity.id,
      entity.projectId,
      entity.type,
      entity.layer,
      JSON.stringify(entity.geometry),
      entity.properties ? JSON.stringify(entity.properties) : null,
      entity.version,
      now,
      now,
    ]
  );
}

/**
 * Get all entities for a project
 */
export async function getProjectEntities(
  db: Client,
  projectId: string,
  version?: number
) {
  const sql = version
    ? 'SELECT * FROM cad_entities WHERE project_id = ? AND version <= ? AND is_deleted = FALSE'
    : 'SELECT * FROM cad_entities WHERE project_id = ? AND is_deleted = FALSE';

  const args = version ? [projectId, version] : [projectId];
  const rows = await query<any>(db, sql, args);

  return rows.map((row) => ({
    ...row,
    geometry: JSON.parse(row.geometry as string),
    properties: row.properties ? JSON.parse(row.properties as string) : null,
  }));
}

/**
 * Delete entities (soft delete)
 */
export async function deleteEntities(
  db: Client,
  projectId: string,
  entityIds: string[]
) {
  const now = Date.now();
  const placeholders = entityIds.map(() => '?').join(',');

  return await execute(
    db,
    `UPDATE cad_entities
     SET is_deleted = TRUE, updated_at = ?
     WHERE project_id = ? AND id IN (${placeholders})`,
    [now, projectId, ...entityIds]
  );
}

// ============================================================
// LAYER OPERATIONS
// ============================================================

/**
 * Upsert layer
 */
export async function upsertLayer(
  db: Client,
  layer: {
    id: string;
    projectId: string;
    name: string;
    color: string;
    visible: boolean;
    locked: boolean;
    orderIndex: number;
    version: number;
  }
) {
  const now = Date.now();
  return await execute(
    db,
    `INSERT INTO layers (
      id, project_id, name, color, visible, locked, order_index, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      color = excluded.color,
      visible = excluded.visible,
      locked = excluded.locked,
      order_index = excluded.order_index,
      version = excluded.version,
      updated_at = excluded.updated_at`,
    [
      layer.id,
      layer.projectId,
      layer.name,
      layer.color,
      layer.visible ? 1 : 0,
      layer.locked ? 1 : 0,
      layer.orderIndex,
      layer.version,
      now,
      now,
    ]
  );
}

/**
 * Get all layers for a project
 */
export async function getProjectLayers(db: Client, projectId: string) {
  const rows = await query<any>(
    db,
    'SELECT * FROM layers WHERE project_id = ? ORDER BY order_index ASC',
    [projectId]
  );

  return rows.map((row) => ({
    ...row,
    visible: Boolean(row.visible),
    locked: Boolean(row.locked),
  }));
}

// ============================================================
// PROJECT OPERATIONS
// ============================================================

/**
 * Update project sync timestamp
 */
export async function updateProjectSyncTime(db: Client, projectId: string) {
  const now = Date.now();
  return await execute(
    db,
    'UPDATE projects SET last_synced_at = ?, updated_at = ? WHERE id = ?',
    [now, now, projectId]
  );
}

/**
 * Create project version snapshot
 */
export async function createProjectSnapshot(
  db: Client,
  snapshot: {
    id: string;
    projectId: string;
    versionNumber: number;
    entitiesSnapshot: string;
    layersSnapshot: string;
    metadata: any;
    createdBy: string;
    description?: string;
  }
) {
  const now = Date.now();
  return await execute(
    db,
    `INSERT INTO project_versions (
      id, project_id, version_number, entities_snapshot, layers_snapshot,
      metadata, created_by, created_at, description, size_bytes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snapshot.id,
      snapshot.projectId,
      snapshot.versionNumber,
      snapshot.entitiesSnapshot,
      snapshot.layersSnapshot,
      JSON.stringify(snapshot.metadata),
      snapshot.createdBy,
      now,
      snapshot.description || null,
      snapshot.entitiesSnapshot.length + snapshot.layersSnapshot.length,
    ]
  );
}

/**
 * Get project versions
 */
export async function getProjectVersions(
  db: Client,
  projectId: string,
  limit: number = 10
) {
  const rows = await query<any>(
    db,
    `SELECT id, project_id, version_number, metadata, created_by, created_at, description, size_bytes
     FROM project_versions
     WHERE project_id = ?
     ORDER BY version_number DESC
     LIMIT ?`,
    [projectId, limit]
  );

  return rows.map((row) => ({
    ...row,
    metadata: JSON.parse(row.metadata as string),
  }));
}

// ============================================================
// SYNC LOGGING
// ============================================================

/**
 * Log sync operation
 */
export async function logSync(
  db: Client,
  log: {
    id: string;
    projectId: string;
    userId: string;
    syncType: 'auto' | 'manual';
    changesCount: number;
    entitiesChanged: number;
    layersChanged: number;
    status: 'pending' | 'completed' | 'failed';
    errorMessage?: string;
  }
) {
  const now = Date.now();
  return await execute(
    db,
    `INSERT INTO sync_log (
      id, project_id, user_id, sync_type, changes_count, entities_changed,
      layers_changed, status, error_message, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log.id,
      log.projectId,
      log.userId,
      log.syncType,
      log.changesCount,
      log.entitiesChanged,
      log.layersChanged,
      log.status,
      log.errorMessage || null,
      now,
      log.status === 'completed' ? now : null,
    ]
  );
}
