// ============================================================
// DATABASE MIGRATION UTILITIES
// ============================================================
// Initialize and manage database schema for LeDesign platform

import { getDb } from './client';

/**
 * Run all migrations to set up the database schema
 */
export async function runMigrations() {
  const db = getDb();

  console.log('Running database migrations...');

  // Create core tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      location_lat REAL,
      location_lng REAL,
      location_address TEXT,
      module_structural INTEGER NOT NULL DEFAULT 0,
      module_hydraulic INTEGER NOT NULL DEFAULT 0,
      module_pavement INTEGER NOT NULL DEFAULT 0,
      module_road INTEGER NOT NULL DEFAULT 0,
      module_terrain INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create structural module tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS structural_nodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      story_id TEXT,
      name TEXT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      support_type TEXT NOT NULL DEFAULT 'free',
      restraints TEXT NOT NULL,
      spring_stiffness TEXT,
      prescribed_displacements TEXT,
      mass TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS structural_materials (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      material_type TEXT NOT NULL,
      grade TEXT,
      elastic_modulus REAL NOT NULL,
      shear_modulus REAL,
      poissons_ratio REAL NOT NULL,
      yield_strength REAL,
      ultimate_strength REAL,
      density REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create hydraulic module tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS hydraulic_pipes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      diameter REAL NOT NULL,
      length REAL NOT NULL,
      roughness REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create pavement module tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pavement_sections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      pavement_type TEXT NOT NULL,
      design_method TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create road module tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS road_alignments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      alignment_type TEXT NOT NULL,
      design_speed REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create terrain module tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS terrain_surfaces (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      source_file TEXT,
      min_elevation REAL,
      max_elevation REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database migrations completed successfully');
}

/**
 * Reset database (drop all tables)
 * ⚠️ WARNING: This will delete all data!
 */
export async function resetDatabase() {
  const db = getDb();

  console.warn('⚠️  Resetting database - all data will be lost!');

  const tables = [
    'terrain_surfaces',
    'road_alignments',
    'pavement_sections',
    'hydraulic_pipes',
    'structural_materials',
    'structural_nodes',
    'projects',
    'users',
  ];

  for (const table of tables) {
    await db.execute(`DROP TABLE IF EXISTS ${table}`);
  }

  console.log('✅ Database reset completed');
}

/**
 * Check if database is initialized
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  const db = getDb();

  try {
    const result = await db.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='users'
    `);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}
