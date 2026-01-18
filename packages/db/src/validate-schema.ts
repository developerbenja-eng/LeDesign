// ============================================================
// SCHEMA VALIDATION UTILITY
// ============================================================
// Validates that Drizzle schema matches actual database migrations
// Run: npm run validate-schema

import * as schema from './schema';

/**
 * Extract column definitions from Drizzle schema
 */
function extractSchemaColumns(table: any): Set<string> {
  const columns = new Set<string>();

  // Drizzle stores column info in a specific way
  // This is a simplified check - you may need to adjust based on Drizzle internals
  for (const [key, value] of Object.entries(table)) {
    if (typeof value === 'object' && value !== null) {
      columns.add(key);
    }
  }

  return columns;
}

/**
 * Expected columns based on migrate.ts
 * IMPORTANT: Keep this in sync with migrate.ts manually!
 */
const EXPECTED_SCHEMAS = {
  users: new Set([
    'id',
    'email',
    'name',
    'password_hash',
    'avatar_url',
    'role',
    'email_verified',
    'google_id',
    'company',
    'last_login',
    'created_at',
    'updated_at',
  ]),
  projects: new Set([
    'id',
    'user_id',
    'name',
    'description',
    'bounds_south',
    'bounds_north',
    'bounds_west',
    'bounds_east',
    'center_lat',
    'center_lon',
    'region',
    'comuna',
    'project_type',
    'status',
    'module_structural',
    'module_hydraulic',
    'module_pavement',
    'module_road',
    'module_terrain',
    'module_structural_last_used',
    'module_hydraulic_last_used',
    'module_pavement_last_used',
    'module_road_last_used',
    'module_terrain_last_used',
    'created_at',
    'updated_at',
  ]),
};

/**
 * Validate schema consistency
 */
export function validateSchema(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check users table
  const userColumns = Object.keys(schema.users);
  const expectedUsers = EXPECTED_SCHEMAS.users;

  const missingUsers = [...expectedUsers].filter(col => !userColumns.includes(col));
  const extraUsers = userColumns.filter(col => !expectedUsers.has(col));

  if (missingUsers.length > 0) {
    errors.push(`Users table missing columns: ${missingUsers.join(', ')}`);
  }
  if (extraUsers.length > 0) {
    errors.push(`Users table has extra columns: ${extraUsers.join(', ')}`);
  }

  // Check projects table
  const projectColumns = Object.keys(schema.projects);
  const expectedProjects = EXPECTED_SCHEMAS.projects;

  const missingProjects = [...expectedProjects].filter(col => !projectColumns.includes(col));
  const extraProjects = projectColumns.filter(col => !expectedProjects.has(col));

  if (missingProjects.length > 0) {
    errors.push(`Projects table missing columns: ${missingProjects.join(', ')}`);
  }
  if (extraProjects.length > 0) {
    errors.push(`Projects table has extra columns: ${extraProjects.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Run validation if executed directly
if (require.main === module) {
  console.log('🔍 Validating database schema consistency...\n');

  const result = validateSchema();

  if (result.valid) {
    console.log('✅ Schema validation passed!');
    console.log('   Drizzle schema.ts matches expected database structure.\n');
    process.exit(0);
  } else {
    console.error('❌ Schema validation failed!\n');
    result.errors.forEach(error => {
      console.error(`   • ${error}`);
    });
    console.error('\n💡 Fix: Update schema.ts to match migrate.ts\n');
    process.exit(1);
  }
}
