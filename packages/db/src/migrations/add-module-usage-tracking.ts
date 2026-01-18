// ============================================================
// MODULE USAGE TRACKING MIGRATION
// ============================================================
// Adds module_*_last_used timestamp columns to projects table
// for tracking when modules are actively used (for reporting)

import { Client } from '@libsql/client';

export async function addModuleUsageTracking(db: Client) {
  console.log('Adding module usage tracking columns...');

  // Add module usage tracking columns to projects table
  const columns = [
    'module_structural_last_used',
    'module_hydraulic_last_used',
    'module_pavement_last_used',
    'module_road_last_used',
    'module_terrain_last_used',
  ];

  for (const column of columns) {
    try {
      await db.execute(`
        ALTER TABLE projects
        ADD COLUMN ${column} TEXT
      `);
      console.log(`✓ Added column: ${column}`);
    } catch (error: any) {
      // Column might already exist - check error message
      if (error.message?.includes('duplicate column name')) {
        console.log(`  Column ${column} already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  console.log('✅ Module usage tracking columns added successfully');
}
