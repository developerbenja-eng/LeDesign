/**
 * Migration: Add structural_projects table
 *
 * Creates the structural_projects table that was missing from the schema
 */

import { getDb } from '@ledesign/db';

async function addStructuralProjectsTable() {
  console.log('🔧 Adding structural_projects table...\n');

  const db = getDb();

  try {
    // Check if table already exists
    const checkResult = await db.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='structural_projects'
    `);

    if (checkResult.rows.length > 0) {
      console.log('⊙ Table structural_projects already exists');
      return;
    }

    // Create structural_projects table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS structural_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT,
        design_code TEXT DEFAULT 'AISC 360-22',
        seismic_code TEXT DEFAULT 'ASCE 7-22',
        wind_code TEXT DEFAULT 'ASCE 7-22',
        concrete_code TEXT DEFAULT 'ACI 318-19',
        length_unit TEXT DEFAULT 'ft',
        force_unit TEXT DEFAULT 'kip',
        moment_unit TEXT DEFAULT 'kip-ft',
        stress_unit TEXT DEFAULT 'ksi',
        temperature_unit TEXT DEFAULT 'F',
        settings TEXT DEFAULT '{}'
      )
    `);

    console.log('✓ Created structural_projects table');
    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

addStructuralProjectsTable()
  .then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error:', error);
    process.exit(1);
  });
