#!/usr/bin/env node
import { createClient } from '@libsql/client';

// Create database client
const db = createClient({
  url: 'file:local.db',
});

console.log('Running structural migrations...');

try {
  // Import and run structural migrations
  const { runStructuralMigrations } = await import('./apps/web/src/lib/db/structural-migrations.ts');

  await runStructuralMigrations();

  console.log('✅ Structural migrations completed successfully!');

  // Verify tables were created
  const tables = await db.execute(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND (
      name LIKE '%structural%' OR
      name IN ('beams', 'columns', 'braces', 'nodes', 'walls', 'slabs', 'buildings', 'stories')
    )
    ORDER BY name
  `);

  console.log('\n📊 Created tables:');
  tables.rows.forEach(row => console.log(`  - ${row.name}`));

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
