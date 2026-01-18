// ============================================================
// TIERED STORAGE MIGRATION
// ============================================================
// Adds tables to support tiered storage architecture:
// - Shared auth DB for users & project registry
// - Per-user DBs tracked in user_databases table
// - Storage tier tracking for archival to GCS

import { Client } from '@libsql/client';

export async function addTieredStorage(db: Client) {
  console.log('Adding tiered storage architecture tables...');

  // User databases registry
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_databases (
        user_id TEXT PRIMARY KEY,
        turso_db_name TEXT NOT NULL,
        turso_db_url TEXT NOT NULL,
        turso_db_token TEXT NOT NULL,
        database_size_bytes INTEGER DEFAULT 0,
        last_size_check TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created user_databases table');
  } catch (error: any) {
    if (!error.message?.includes('already exists')) {
      throw error;
    }
    console.log('  user_databases table already exists');
  }

  // Project registry (metadata in shared DB)
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS project_registry (
        project_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        database_location TEXT NOT NULL DEFAULT 'turso',
        turso_db_name TEXT,
        gcs_archived_at TEXT,
        storage_size_bytes INTEGER DEFAULT 0,
        last_accessed_at TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created project_registry table');
  } catch (error: any) {
    if (!error.message?.includes('already exists')) {
      throw error;
    }
    console.log('  project_registry table already exists');
  }

  // Archival jobs tracking
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS archival_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        items_processed INTEGER DEFAULT 0,
        items_total INTEGER DEFAULT 0,
        bytes_archived INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created archival_jobs table');
  } catch (error: any) {
    if (!error.message?.includes('already exists')) {
      throw error;
    }
    console.log('  archival_jobs table already exists');
  }

  // Storage statistics
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS storage_stats (
        user_id TEXT PRIMARY KEY,
        turso_storage_bytes INTEGER DEFAULT 0,
        gcs_storage_bytes INTEGER DEFAULT 0,
        total_storage_bytes INTEGER DEFAULT 0,
        projects_count INTEGER DEFAULT 0,
        surveys_hot_count INTEGER DEFAULT 0,
        surveys_cold_count INTEGER DEFAULT 0,
        networks_hot_count INTEGER DEFAULT 0,
        networks_cold_count INTEGER DEFAULT 0,
        last_calculated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created storage_stats table');
  } catch (error: any) {
    if (!error.message?.includes('already exists')) {
      throw error;
    }
    console.log('  storage_stats table already exists');
  }

  // Create indexes
  try {
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_project_registry_user
      ON project_registry(user_id)
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_project_registry_location
      ON project_registry(database_location)
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_archival_jobs_user
      ON archival_jobs(user_id)
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_archival_jobs_status
      ON archival_jobs(status)
    `);
    console.log('✓ Created indexes');
  } catch (error: any) {
    console.log('  Indexes already exist or error:', error.message);
  }

  console.log('✅ Tiered storage tables added successfully');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Login to Turso CLI: turso auth login');
  console.log('   2. Create first user database on signup/first project');
  console.log('   3. Set up archival cron job');
  console.log('   4. Configure storage thresholds in environment');
}
