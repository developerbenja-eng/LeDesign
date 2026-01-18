/**
 * Seed Infrastructure Detail Defaults
 *
 * Maps infrastructure entity types to their default MINVU standard details.
 * This enables automatic detail sheet generation when users place infrastructure.
 *
 * Usage: npx tsx scripts/seed-detail-defaults.ts
 */

import { getDb, execute } from '../src/lib/db/turso';
import { createInfrastructureDetailDefaultsTable } from '../src/lib/db/migrations';

interface DetailMapping {
  infrastructureType: string;
  detailCode: string;
  isDefault: boolean;
  conditions?: Record<string, unknown>;
}

/**
 * Infrastructure type to standard detail mappings
 *
 * Based on:
 * - MINVU standard details from AutoCAD files
 * - Chilean infrastructure standards (NCh)
 * - SERVIU specifications
 */
const DETAIL_MAPPINGS: DetailMapping[] = [
  // ========================================
  // STORMWATER DRAINAGE
  // ========================================

  // Storm Inlets (Sumideros) - codes: SUM-1, SUM-2, SUM-3, SUM-4, SUM-G, SUM-SERVIU
  { infrastructureType: 'storm_inlet', detailCode: 'SUM-1', isDefault: true },
  { infrastructureType: 'storm_inlet', detailCode: 'SUM-2', isDefault: false },
  { infrastructureType: 'storm_inlet', detailCode: 'SUM-3', isDefault: false },
  { infrastructureType: 'storm_inlet', detailCode: 'SUM-4', isDefault: false },
  { infrastructureType: 'storm_inlet', detailCode: 'SUM-G', isDefault: false, conditions: { largeGrate: true } },
  { infrastructureType: 'storm_inlet', detailCode: 'SUM-SERVIU', isDefault: false },

  // Storm Manholes/Chambers (Cámaras Aguas Lluvias) - codes: CAM-TIPO-A, CAM-TIPO-B
  { infrastructureType: 'storm_manhole', detailCode: 'CAM-TIPO-A', isDefault: true },
  { infrastructureType: 'storm_manhole', detailCode: 'CAM-TIPO-B', isDefault: false, conditions: { depth: { min: 2 } } },

  // Settling Chambers (Cámaras Decantadoras) - codes: CAM-DEC
  { infrastructureType: 'settling_chamber', detailCode: 'CAM-DEC', isDefault: true },

  // Storm Collectors (Colectores) - codes: ZAN, ZAN-COL, ATR-CAL
  { infrastructureType: 'storm_collector', detailCode: 'ZAN', isDefault: true },
  { infrastructureType: 'storm_collector', detailCode: 'ZAN-COL', isDefault: false },
  { infrastructureType: 'storm_collector', detailCode: 'ATR-CAL', isDefault: false, conditions: { crossesRoad: true } },

  // Manhole Covers - codes: TAPA
  { infrastructureType: 'manhole_cover', detailCode: 'TAPA', isDefault: true },

  // ========================================
  // SANITARY SEWER
  // ========================================

  // Sewer Manholes - codes: CAM-TIPO-A, CAM-TIPO-B
  { infrastructureType: 'manhole', detailCode: 'CAM-TIPO-A', isDefault: true },
  { infrastructureType: 'manhole', detailCode: 'CAM-TIPO-B', isDefault: false, conditions: { depth: { min: 2 } } },

  // Sewer Pipes - codes: ZAN, ZAN-COL, ZAN-EXC
  { infrastructureType: 'sewer_pipe', detailCode: 'ZAN', isDefault: true },
  { infrastructureType: 'sewer_pipe', detailCode: 'ZAN-COL', isDefault: false },
  { infrastructureType: 'sewer_pipe', detailCode: 'ZAN-EXC', isDefault: false, conditions: { depth: { min: 1.5 } } },

  // House Connections - codes: ZAN-COL
  { infrastructureType: 'house_connection', detailCode: 'ZAN-COL', isDefault: true },

  // ========================================
  // WATER DISTRIBUTION
  // ========================================

  // Water Pipes - codes: ZAN, ATR-CAL
  { infrastructureType: 'water_pipe', detailCode: 'ZAN', isDefault: true },
  { infrastructureType: 'water_pipe', detailCode: 'ATR-CAL', isDefault: false, conditions: { crossesRoad: true } },

  // ========================================
  // CURBS & SIDEWALKS
  // ========================================

  // Curbs (Soleras) - codes: SOL-ZARPA, SOL-SITIO, SOL-TIPO
  { infrastructureType: 'curb', detailCode: 'SOL-ZARPA', isDefault: true },
  { infrastructureType: 'curb', detailCode: 'SOL-SITIO', isDefault: false },
  { infrastructureType: 'curb', detailCode: 'SOL-TIPO', isDefault: false },

  // Sidewalks (Veredas/Aceras) - codes: ACE-REF, VER, VER-REB
  { infrastructureType: 'sidewalk', detailCode: 'ACE-REF', isDefault: true },
  { infrastructureType: 'sidewalk', detailCode: 'VER', isDefault: false },
  { infrastructureType: 'sidewalk', detailCode: 'VER-REB', isDefault: false, conditions: { hasRamp: true } },

  // Rest Areas - codes: EST-DESC
  { infrastructureType: 'rest_area', detailCode: 'EST-DESC', isDefault: true },

  // ========================================
  // PAVEMENT
  // ========================================

  // Pavement Repairs - codes: BACH-SUPE, BACH-PROF, FRES-REC
  { infrastructureType: 'pavement_repair', detailCode: 'BACH-SUPE', isDefault: true },
  { infrastructureType: 'pavement_repair', detailCode: 'BACH-PROF', isDefault: false, conditions: { isDeep: true } },
  { infrastructureType: 'pavement_repair', detailCode: 'FRES-REC', isDefault: false, conditions: { needsMilling: true } },

  // Concrete Slabs - codes: REP-LOSAS
  { infrastructureType: 'concrete_slab', detailCode: 'REP-LOSAS', isDefault: true },

  // Under-pipe slabs - codes: LOSA-PRO-ASF, LOSA-PRO-HOR, LOSA-EXI-ASF, LOSA-EXI-HOR
  { infrastructureType: 'pipe_slab', detailCode: 'LOSA-PRO-ASF', isDefault: true, conditions: { pavement: 'asphalt', pipe: 'new' } },
  { infrastructureType: 'pipe_slab', detailCode: 'LOSA-PRO-HOR', isDefault: false, conditions: { pavement: 'concrete', pipe: 'new' } },
  { infrastructureType: 'pipe_slab', detailCode: 'LOSA-EXI-ASF', isDefault: false, conditions: { pavement: 'asphalt', pipe: 'existing' } },
  { infrastructureType: 'pipe_slab', detailCode: 'LOSA-EXI-HOR', isDefault: false, conditions: { pavement: 'concrete', pipe: 'existing' } },

  // Reinforcement blocks - codes: DADO-PRO, DADO-EXI
  { infrastructureType: 'reinforcement_block', detailCode: 'DADO-PRO', isDefault: true },
  { infrastructureType: 'reinforcement_block', detailCode: 'DADO-EXI', isDefault: false, conditions: { pipe: 'existing' } },

  // ========================================
  // TRAFFIC ELEMENTS
  // ========================================

  // Turn bollards - codes: BOL-NUE, BOL-EXI
  { infrastructureType: 'turn_bollard', detailCode: 'BOL-NUE', isDefault: true },
  { infrastructureType: 'turn_bollard', detailCode: 'BOL-EXI', isDefault: false, conditions: { isExisting: true } },

  // Bike lane crossings - codes: SEN-CICLO
  { infrastructureType: 'bike_crossing', detailCode: 'SEN-CICLO', isDefault: true },

  // Corner reinforcement - codes: REF-ESQ
  { infrastructureType: 'corner_reinforcement', detailCode: 'REF-ESQ', isDefault: true },

  // ========================================
  // GUTTERS
  // ========================================

  { infrastructureType: 'gutter', detailCode: 'SOL-ZARPA', isDefault: true },
];

function generateId(): string {
  return `idd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

async function seedDetailDefaults() {
  console.log('Seeding infrastructure detail defaults...\n');

  // Ensure table exists
  await createInfrastructureDetailDefaultsTable();

  const db = getDb();

  // First, clear existing defaults
  console.log('Clearing existing defaults...');
  await execute(db, 'DELETE FROM infrastructure_detail_defaults', []);

  // Get existing standard detail codes
  const existingDetails = await execute(db, 'SELECT code FROM standard_details', []);
  const validCodes = new Set(
    (existingDetails.rows || []).map((row: { code: string }) => row.code)
  );

  console.log(`Found ${validCodes.size} standard details in database.\n`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const mapping of DETAIL_MAPPINGS) {
    // Check if the detail code exists in the database
    if (!validCodes.has(mapping.detailCode)) {
      console.log(`  Skipped: ${mapping.infrastructureType} -> ${mapping.detailCode} (detail not found)`);
      skippedCount++;
      continue;
    }

    try {
      await execute(
        db,
        `INSERT INTO infrastructure_detail_defaults (id, infrastructure_type, detail_code, is_default, conditions_json)
         VALUES (?, ?, ?, ?, ?)`,
        [
          generateId(),
          mapping.infrastructureType,
          mapping.detailCode,
          mapping.isDefault ? 1 : 0,
          mapping.conditions ? JSON.stringify(mapping.conditions) : null,
        ]
      );

      console.log(`  Inserted: ${mapping.infrastructureType} -> ${mapping.detailCode}${mapping.isDefault ? ' (default)' : ''}`);
      insertedCount++;
    } catch (error) {
      console.error(`  Error inserting ${mapping.infrastructureType} -> ${mapping.detailCode}:`, error);
    }
  }

  console.log('\n========================================');
  console.log('Seed Summary:');
  console.log(`  Inserted: ${insertedCount}`);
  console.log(`  Skipped: ${skippedCount} (details not in database)`);
  console.log('========================================\n');

  // Show summary by infrastructure type
  console.log('Default details by infrastructure type:');
  const defaults = await execute(
    db,
    `SELECT idd.infrastructure_type, idd.detail_code, sd.name_es
     FROM infrastructure_detail_defaults idd
     JOIN standard_details sd ON idd.detail_code = sd.code
     WHERE idd.is_default = 1
     ORDER BY idd.infrastructure_type`,
    []
  );

  for (const row of defaults.rows || []) {
    const r = row as { infrastructure_type: string; detail_code: string; name_es: string };
    console.log(`  ${r.infrastructure_type}: ${r.detail_code} (${r.name_es})`);
  }
}

// Run the seed
seedDetailDefaults().catch(console.error);
