/**
 * Migration: Update projects table schema
 *
 * Adds geographic location fields to projects table
 */

import { getDb } from '@ledesign/db';

async function migrateProjectSchema() {
  console.log('🔧 Migrating projects table schema...\n');

  const db = getDb();

  try {
    // Add new columns if they don't exist
    const columnsToAdd = [
      { name: 'bounds_south', type: 'REAL' },
      { name: 'bounds_north', type: 'REAL' },
      { name: 'bounds_west', type: 'REAL' },
      { name: 'bounds_east', type: 'REAL' },
      { name: 'center_lat', type: 'REAL' },
      { name: 'center_lon', type: 'REAL' },
      { name: 'region', type: 'TEXT' },
      { name: 'comuna', type: 'TEXT' },
      { name: 'project_type', type: 'TEXT' },
      { name: 'status', type: 'TEXT', default: "'draft'" },
    ];

    for (const column of columnsToAdd) {
      try {
        const defaultClause = column.default ? ` DEFAULT ${column.default}` : '';
        await db.execute(
          `ALTER TABLE projects ADD COLUMN ${column.name} ${column.type}${defaultClause}`
        );
        console.log(`✓ Added column: ${column.name}`);
      } catch (error: any) {
        if (error.message?.includes('duplicate column name')) {
          console.log(`⊙ Column already exists: ${column.name}`);
        } else {
          throw error;
        }
      }
    }

    // Migrate old location_lat/location_lng to center_lat/center_lon
    try {
      await db.execute(`
        UPDATE projects
        SET center_lat = location_lat, center_lon = location_lng
        WHERE location_lat IS NOT NULL AND center_lat IS NULL
      `);
      console.log('✓ Migrated location_lat/lng to center_lat/lon');
    } catch (error) {
      console.log('⊙ Could not migrate old location fields (may not exist)');
    }

    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateProjectSchema()
  .then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error:', error);
    process.exit(1);
  });
