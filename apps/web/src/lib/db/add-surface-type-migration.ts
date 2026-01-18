/**
 * Migration: Add surface_type field to generated_surfaces table
 *
 * Run this migration to add surface type classification:
 * - existing: Original/natural terrain
 * - proposed: Designed/future surface
 * - interim: Temporary construction surface
 * - final: As-built surface
 */

import { getDb, execute } from './turso';

export async function addSurfaceTypeField() {
  const db = getDb();

  try {
    console.log('Adding surface_type field to generated_surfaces...');

    // Check if columns already exist
    const tableInfo = await db.execute('PRAGMA table_info(generated_surfaces)');
    const columns = tableInfo.rows.map((row: any) => row.name);

    // Add surface_type column if it doesn't exist
    if (!columns.includes('surface_type')) {
      await execute(
        db,
        `ALTER TABLE generated_surfaces ADD COLUMN surface_type TEXT DEFAULT 'proposed'`
      );
      console.log('✓ Added surface_type column');
    } else {
      console.log('ℹ️ surface_type column already exists');
    }

    // Add index for surface_type
    await execute(
      db,
      `CREATE INDEX IF NOT EXISTS idx_generated_surfaces_surface_type ON generated_surfaces(surface_type)`
    );

    console.log('✓ Created/verified index on surface_type');

    // Add is_active column if it doesn't exist
    if (!columns.includes('is_active')) {
      await execute(
        db,
        `ALTER TABLE generated_surfaces ADD COLUMN is_active INTEGER DEFAULT 1`
      );
      console.log('✓ Added is_active column');
    } else {
      console.log('ℹ️ is_active column already exists');
    }

    // Add reference_surface_id column if it doesn't exist
    if (!columns.includes('reference_surface_id')) {
      await execute(
        db,
        `ALTER TABLE generated_surfaces ADD COLUMN reference_surface_id TEXT`
      );
      console.log('✓ Added reference_surface_id column');
    } else {
      console.log('ℹ️ reference_surface_id column already exists');
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Available surface types:');
    console.log('  - existing:  Original/natural terrain (surveyed)');
    console.log('  - proposed:  Designed/future surface');
    console.log('  - interim:   Temporary construction surface');
    console.log('  - final:     As-built surface');
    console.log('  - reference: Reference/baseline surface');

    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// If running directly
if (require.main === module) {
  addSurfaceTypeField()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}
