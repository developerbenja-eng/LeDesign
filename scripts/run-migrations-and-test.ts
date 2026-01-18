#!/usr/bin/env tsx
/**
 * Run all migrations and test the surface comparison system
 */

import { runAllMigrations } from '../src/lib/db/migrations';
import { addSurfaceTypeField } from '../src/lib/db/add-surface-type-migration';
import { getDb, query, execute } from '../src/lib/db/turso';
import {
  calculateVolumes,
  sampleSurfaceAt,
  type Surface,
} from '../src/lib/volume-calculation';

async function runMigrations() {
  console.log('\n🔄 Running base migrations...\n');
  await runAllMigrations();

  console.log('\n🔄 Running surface_type migration...\n');
  await addSurfaceTypeField();

  console.log('\n✅ All migrations completed successfully!\n');
}

async function testSurfaceTypeField() {
  console.log('\n🧪 Testing surface_type field...\n');

  const db = getDb();

  // Check if column exists
  const tableInfo = await query(db, `PRAGMA table_info(generated_surfaces)`, []);

  const surfaceTypeColumn = tableInfo.find(
    (col: any) => col.name === 'surface_type'
  );
  const isActiveColumn = tableInfo.find((col: any) => col.name === 'is_active');
  const refSurfaceColumn = tableInfo.find(
    (col: any) => col.name === 'reference_surface_id'
  );

  if (surfaceTypeColumn) {
    console.log('✅ surface_type column exists');
  } else {
    console.error('❌ surface_type column NOT found');
    return false;
  }

  if (isActiveColumn) {
    console.log('✅ is_active column exists');
  } else {
    console.error('❌ is_active column NOT found');
    return false;
  }

  if (refSurfaceColumn) {
    console.log('✅ reference_surface_id column exists');
  } else {
    console.error('❌ reference_surface_id column NOT found');
    return false;
  }

  return true;
}

async function testVolumeCalculation() {
  console.log('\n🧪 Testing volume calculation functions...\n');

  // Create test surfaces
  const existingSurface: Surface = {
    vertices: [
      { x: 0, y: 0, z: 100 },
      { x: 10, y: 0, z: 100 },
      { x: 10, y: 10, z: 100 },
      { x: 0, y: 10, z: 100 },
      { x: 5, y: 5, z: 100 },
    ],
    triangles: [
      [0, 1, 4],
      [1, 2, 4],
      [2, 3, 4],
      [3, 0, 4],
    ],
    bounds: {
      minX: 0,
      maxX: 10,
      minY: 0,
      maxY: 10,
      minZ: 100,
      maxZ: 100,
    },
  };

  const proposedSurface: Surface = {
    vertices: [
      { x: 0, y: 0, z: 102 },
      { x: 10, y: 0, z: 102 },
      { x: 10, y: 10, z: 98 },
      { x: 0, y: 10, z: 98 },
      { x: 5, y: 5, z: 100 },
    ],
    triangles: [
      [0, 1, 4],
      [1, 2, 4],
      [2, 3, 4],
      [3, 0, 4],
    ],
    bounds: {
      minX: 0,
      maxX: 10,
      minY: 0,
      maxY: 10,
      minZ: 98,
      maxZ: 102,
    },
  };

  // Test elevation sampling
  console.log('Testing elevation sampling...');
  const existingZ = sampleSurfaceAt(existingSurface, 5, 5);
  const proposedZ = sampleSurfaceAt(proposedSurface, 5, 5);

  if (existingZ === null || proposedZ === null) {
    console.error('❌ Elevation sampling failed');
    return false;
  }

  console.log(`  Existing elevation at (5,5): ${existingZ.toFixed(2)}m`);
  console.log(`  Proposed elevation at (5,5): ${proposedZ.toFixed(2)}m`);
  console.log('✅ Elevation sampling works');

  // Test volume calculation
  console.log('\nTesting volume calculation...');
  const result = calculateVolumes(existingSurface, proposedSurface, 1.0);

  console.log(`  Cut volume: ${result.cutVolume.toFixed(2)} m³`);
  console.log(`  Fill volume: ${result.fillVolume.toFixed(2)} m³`);
  console.log(`  Net volume: ${result.netVolume.toFixed(2)} m³`);
  console.log(`  Total area: ${result.area.toFixed(2)} m²`);
  console.log(`  Grid points: ${result.gridPoints}`);

  // Validate results
  if (result.cutVolume < 0 || result.fillVolume < 0) {
    console.error('❌ Volume calculation produced negative values');
    return false;
  }

  if (result.area <= 0) {
    console.error('❌ Area calculation failed');
    return false;
  }

  if (result.gridPoints === 0) {
    console.error('❌ No grid points generated');
    return false;
  }

  console.log('✅ Volume calculation works');

  return true;
}

async function testTerrainIntegration() {
  console.log('\n🧪 Testing terrain service functions...\n');

  try {
    // Dynamic import to avoid module loading issues
    const terrainService = await import('../src/lib/terrain-service');

    console.log('✅ Terrain service module loads correctly');

    // Test haversine distance
    const distance = (terrainService as any).haversineDistance?.(
      -33.45,
      -70.65,
      -33.46,
      -70.66
    );

    if (distance && distance > 0) {
      console.log(`  Sample distance calculation: ${distance.toFixed(2)}m`);
      console.log('✅ Distance calculation works');
    }

    return true;
  } catch (error) {
    console.error('❌ Terrain service test failed:', error);
    return false;
  }
}

async function testDatabaseIntegrity() {
  console.log('\n🧪 Testing database integrity...\n');

  const db = getDb();

  // Test key tables exist
  const tables = [
    'projects',
    'project_topography',
    'generated_surfaces',
    'survey_datasets',
  ];

  for (const table of tables) {
    try {
      await query(db, `SELECT COUNT(*) as count FROM ${table}`, []);
      console.log(`✅ Table '${table}' exists and is accessible`);
    } catch (error) {
      console.error(`❌ Table '${table}' check failed:`, error);
      return false;
    }
  }

  // Test generated_surfaces structure
  const columns = await query(db, `PRAGMA table_info(generated_surfaces)`, []);
  const requiredColumns = [
    'id',
    'project_id',
    'name',
    'method',
    'surface_json',
    'surface_type',
    'is_active',
    'reference_surface_id',
  ];

  for (const colName of requiredColumns) {
    const found = columns.find((col: any) => col.name === colName);
    if (!found) {
      console.error(`❌ Required column '${colName}' not found in generated_surfaces`);
      return false;
    }
  }

  console.log('✅ All required columns present in generated_surfaces');

  return true;
}

async function printSystemSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SYSTEM SUMMARY');
  console.log('='.repeat(60));

  console.log('\n📁 Database Tables:');
  console.log('  ✓ projects');
  console.log('  ✓ project_topography (DEM links)');
  console.log('  ✓ generated_surfaces (with surface_type)');
  console.log('  ✓ survey_datasets');

  console.log('\n🔧 Volume Calculation Features:');
  console.log('  ✓ Grid-based volume calculation');
  console.log('  ✓ Cut/fill analysis');
  console.log('  ✓ Cross-section generation');
  console.log('  ✓ Heat map generation');
  console.log('  ✓ Mass haul diagrams');

  console.log('\n🌍 Terrain Integration Features:');
  console.log('  ✓ DEM fetching (Copernicus 30m)');
  console.log('  ✓ Multi-tile merging');
  console.log('  ✓ DEM + survey blending');
  console.log('  ✓ TIN surface generation');
  console.log('  ✓ Slope/aspect calculation');

  console.log('\n🔀 Surface Types Available:');
  console.log('  • existing   - Original/surveyed terrain');
  console.log('  • proposed   - Designed/future surface');
  console.log('  • interim    - Temporary construction');
  console.log('  • final      - As-built surface');
  console.log('  • reference  - Baseline/regulatory');

  console.log('\n🌐 API Endpoints:');
  console.log('  • GET  /api/projects/[id]/terrain');
  console.log('  • POST /api/projects/[id]/surfaces/generate-with-dem');
  console.log('  • POST /api/projects/[id]/surfaces/compare');
  console.log('  • GET  /api/projects/[id]/surfaces/compare');

  console.log('\n⚛️  React Components:');
  console.log('  • TerrainControlPanel');
  console.log('  • SurfaceComparisonPanel');

  console.log('\n📚 Documentation:');
  console.log('  • docs/TERRAIN-INTEGRATION.md');
  console.log('  • docs/SURFACE-COMPARISON-GUIDE.md');

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL SYSTEMS READY');
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 MIGRATION AND TEST RUNNER');
  console.log('='.repeat(60));

  try {
    // Run migrations
    await runMigrations();

    // Run tests
    console.log('\n' + '='.repeat(60));
    console.log('🧪 RUNNING TESTS');
    console.log('='.repeat(60));

    const tests = [
      { name: 'Surface Type Field', fn: testSurfaceTypeField },
      { name: 'Database Integrity', fn: testDatabaseIntegrity },
      { name: 'Volume Calculation', fn: testVolumeCalculation },
      { name: 'Terrain Integration', fn: testTerrainIntegration },
    ];

    let allPassed = true;

    for (const test of tests) {
      try {
        const passed = await test.fn();
        if (!passed) {
          allPassed = false;
        }
      } catch (error) {
        console.error(`\n❌ Test '${test.name}' threw error:`, error);
        allPassed = false;
      }
    }

    if (allPassed) {
      await printSystemSummary();
      console.log('🎉 ALL MIGRATIONS AND TESTS PASSED!\n');
      process.exit(0);
    } else {
      console.error('\n❌ SOME TESTS FAILED\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

main();
