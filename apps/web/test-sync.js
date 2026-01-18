// Quick test script to verify sync system setup
// Run: node test-sync.js

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./local.db');

console.log('🔍 Testing Sync System Setup\n');

// Check if sync tables exist
db.all(
  `SELECT name FROM sqlite_master WHERE type='table'
   AND name IN ('cad_entities', 'layers', 'project_versions', 'sync_log')`,
  (err, rows) => {
    if (err) {
      console.error('❌ Error checking tables:', err);
      return;
    }

    console.log('✅ Sync tables found:');
    rows.forEach(row => console.log(`   - ${row.name}`));
    console.log();

    // Check existing projects
    db.all('SELECT id, name FROM projects LIMIT 5', (err, projects) => {
      if (err) {
        console.error('❌ Error fetching projects:', err);
        return;
      }

      console.log(`✅ Found ${projects.length} test projects:`);
      projects.forEach(p => console.log(`   - ${p.id}: ${p.name}`));
      console.log();

      // Check if any entities exist
      db.get('SELECT COUNT(*) as count FROM cad_entities', (err, result) => {
        if (err) {
          console.error('❌ Error counting entities:', err);
          return;
        }

        console.log(`📊 CAD entities in database: ${result.count}`);

        // Check sync logs
        db.get('SELECT COUNT(*) as count FROM sync_log', (err, result) => {
          if (err) {
            console.error('❌ Error counting sync logs:', err);
            return;
          }

          console.log(`📊 Sync logs: ${result.count}`);
          console.log();

          console.log('🎯 Next Steps:');
          console.log('1. Navigate to: http://localhost:4000/projects/1768553197289-04pqbzeku');
          console.log('2. Open browser console');
          console.log('3. Look for: "Initializing sync for project..."');
          console.log('4. Draw an entity and watch for sync logs');
          console.log('5. Run this script again to see entities in database');

          db.close();
        });
      });
    });
  }
);
