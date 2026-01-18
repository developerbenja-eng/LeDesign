/**
 * Database Manager - Tiered Storage Architecture
 * Manages shared auth database and per-user databases
 */

import 'server-only';
import { createClient, Client } from '@libsql/client';
import { queryOne, query, execute } from '@ledesign/db';

// Cache for per-user database connections
const userDbCache = new Map<string, Client>();

/**
 * Get the shared authentication database
 * This database stores:
 * - User accounts & authentication
 * - Project registry (metadata)
 * - Subscriptions & billing
 * - Cross-user analytics
 */
export function getAuthDb(): Client {
  const url = process.env.TURSO_AUTH_DB_URL || process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_AUTH_DB_TOKEN || process.env.TURSO_DB_TOKEN;

  if (!url || !authToken) {
    throw new Error('Missing Turso auth database configuration');
  }

  return createClient({ url, authToken });
}

/**
 * Get or create a per-user database
 * This database stores:
 * - User's active projects (full data)
 * - Survey datasets (<100MB each)
 * - Network designs
 * - Analysis results
 */
export async function getUserDb(userId: string): Promise<Client> {
  // Check cache first
  if (userDbCache.has(userId)) {
    return userDbCache.get(userId)!;
  }

  const dbName = `user_${userId}`;

  // Check if database exists in registry
  const authDb = getAuthDb();
  const dbInfo = await queryOne<{ turso_db_url: string; turso_db_token: string }>(
    authDb,
    `SELECT turso_db_url, turso_db_token FROM user_databases WHERE user_id = ?`,
    [userId]
  );

  let client: Client;

  if (dbInfo?.turso_db_url && dbInfo.turso_db_token) {
    // Use existing database
    client = createClient({
      url: dbInfo.turso_db_url,
      authToken: dbInfo.turso_db_token,
    });
  } else {
    // Create new user database
    client = await createUserDatabase(userId);
  }

  userDbCache.set(userId, client);
  return client;
}

/**
 * Create a new Turso database for a user using CLI
 * Uses turso CLI commands since we're on local machine
 */
async function createUserDatabase(userId: string): Promise<Client> {
  const dbName = `user-${userId}`;

  console.log(`Creating new database for user ${userId}...`);

  // Create database using Turso CLI
  const { execSync } = require('child_process');

  try {
    // Create database
    execSync(`turso db create ${dbName}`, { stdio: 'inherit' });

    // Get database URL
    const url = execSync(`turso db show ${dbName} --url`)
      .toString()
      .trim();

    // Create auth token
    const token = execSync(`turso db tokens create ${dbName}`)
      .toString()
      .trim();

    // Create client
    const client = createClient({ url, authToken: token });

    // Run migrations on new database
    await runUserDbMigrations(client);

    // Register in auth database
    const authDb = getAuthDb();
    const now = new Date().toISOString();

    await execute(
      authDb,
      `INSERT INTO user_databases (
        user_id, turso_db_name, turso_db_url, turso_db_token,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, dbName, url, token, now, now]
    );

    console.log(`✓ Created database ${dbName} for user ${userId}`);

    return client;
  } catch (error) {
    console.error(`Failed to create database for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Run schema migrations on user database
 */
async function runUserDbMigrations(db: Client): Promise<void> {
  console.log('Running user database migrations...');

  // Projects table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      bounds_south REAL,
      bounds_north REAL,
      bounds_west REAL,
      bounds_east REAL,
      center_lat REAL,
      center_lon REAL,
      region TEXT,
      comuna TEXT,
      project_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      module_structural INTEGER NOT NULL DEFAULT 0,
      module_hydraulic INTEGER NOT NULL DEFAULT 0,
      module_pavement INTEGER NOT NULL DEFAULT 0,
      module_road INTEGER NOT NULL DEFAULT 0,
      module_terrain INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Survey datasets table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS survey_datasets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      source_filename TEXT,
      source_format TEXT,
      point_count INTEGER NOT NULL DEFAULT 0,
      bounds_json TEXT,
      statistics_json TEXT,
      crs TEXT NOT NULL DEFAULT 'EPSG:32719',
      points_json TEXT,
      gcs_path TEXT,
      storage_tier TEXT NOT NULL DEFAULT 'hot',
      file_size_bytes INTEGER,
      status TEXT NOT NULL DEFAULT 'ready',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Generated surfaces table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS generated_surfaces (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      dataset_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      method TEXT NOT NULL DEFAULT 'delaunay',
      config_json TEXT,
      surface_json TEXT,
      metrics_json TEXT,
      gcs_path TEXT,
      storage_tier TEXT NOT NULL DEFAULT 'hot',
      file_size_bytes INTEGER,
      triangle_count INTEGER,
      vertex_count INTEGER,
      status TEXT NOT NULL DEFAULT 'ready',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Water network designs table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS water_network_designs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      nodes_json TEXT,
      pipes_json TEXT,
      pumps_json TEXT,
      tanks_json TEXT,
      gcs_path TEXT,
      storage_tier TEXT NOT NULL DEFAULT 'hot',
      file_size_bytes INTEGER,
      node_count INTEGER DEFAULT 0,
      pipe_count INTEGER DEFAULT 0,
      demand_multiplier REAL NOT NULL DEFAULT 1.0,
      headloss_formula TEXT NOT NULL DEFAULT 'hazen-williams',
      analysis_results_json TEXT,
      last_analysis_at TEXT,
      last_modified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'draft',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Sewer designs table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sewer_designs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      system_type TEXT NOT NULL DEFAULT 'sanitary',
      manholes_json TEXT,
      pipes_json TEXT,
      connections_json TEXT,
      gcs_path TEXT,
      storage_tier TEXT NOT NULL DEFAULT 'hot',
      file_size_bytes INTEGER,
      manhole_count INTEGER DEFAULT 0,
      pipe_count INTEGER DEFAULT 0,
      design_criteria_json TEXT,
      analysis_results_json TEXT,
      last_analysis_at TEXT,
      last_modified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'draft',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_surveys_tier ON survey_datasets(storage_tier)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_surveys_size ON survey_datasets(file_size_bytes)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_networks_modified ON water_network_designs(last_modified_at)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_networks_tier ON water_network_designs(storage_tier)
  `);

  console.log('✓ User database migrations complete');
}

/**
 * Get database size in bytes
 */
export async function getUserDbSize(userId: string): Promise<number> {
  const dbName = `user-${userId}`;

  try {
    const { execSync } = require('child_process');
    const output = execSync(`turso db show ${dbName} --json`).toString();
    const info = JSON.parse(output);
    return info.size_bytes || 0;
  } catch (error) {
    console.error(`Failed to get database size for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Clear user database cache (force reconnection)
 */
export function clearUserDbCache(userId?: string): void {
  if (userId) {
    userDbCache.delete(userId);
  } else {
    userDbCache.clear();
  }
}

/**
 * Check if user database exists
 */
export async function userDbExists(userId: string): Promise<boolean> {
  const authDb = getAuthDb();
  const dbInfo = await queryOne(
    authDb,
    'SELECT user_id FROM user_databases WHERE user_id = ?',
    [userId]
  );
  return !!dbInfo;
}
