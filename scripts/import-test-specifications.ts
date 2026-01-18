/**
 * Import test specifications from SERVIU documentation
 * Run with: npx tsx scripts/import-test-specifications.ts
 *
 * Data extracted from:
 * - Plan_de_ensayes.xls (test frequency calculations)
 * - Check_List_Inspeccion.pdf (test requirements)
 * - SERVIU technical standards
 */

import { createClient } from '@libsql/client';

interface TestSpecification {
  code: string;
  test_type: string;
  category: string;
  name_es: string;
  name_en: string | null;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  unit: string | null;
  frequency_type: string | null;      // 'per_area', 'per_length', 'per_volume', 'per_layer'
  frequency_value: number | null;     // e.g., 250 for "1 per 250 m2"
  frequency_unit: string | null;      // 'm2', 'm', 'm3'
  min_samples: number;
  test_method: string | null;
  lab_required: boolean;
  field_test: boolean;
  applies_to: string[];               // layers/elements this test applies to
  reference_standard: string | null;
}

// Test specifications based on SERVIU standards and Plan de Ensayes
const testSpecifications: TestSpecification[] = [
  // === SOIL DENSITY TESTS ===
  {
    code: 'TEST-DEN-001',
    test_type: 'density',
    category: 'soil',
    name_es: 'Densidad In-Situ - Sub-rasante',
    name_en: 'In-Situ Density - Subgrade',
    description: 'Control de compactación de la sub-rasante mediante cono de arena o densímetro nuclear',
    min_value: 95,
    max_value: null,
    unit: '%PM',
    frequency_type: 'per_area',
    frequency_value: 250,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1516 / NCh 1515',
    lab_required: false,
    field_test: true,
    applies_to: ['subrasante'],
    reference_standard: 'NCh 1516',
  },
  {
    code: 'TEST-DEN-002',
    test_type: 'density',
    category: 'soil',
    name_es: 'Densidad In-Situ - Mejoramiento',
    name_en: 'In-Situ Density - Improvement Layer',
    description: 'Control de compactación de la capa de mejoramiento',
    min_value: 95,
    max_value: null,
    unit: '%PM',
    frequency_type: 'per_area',
    frequency_value: 250,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1516 / NCh 1515',
    lab_required: false,
    field_test: true,
    applies_to: ['mejoramiento'],
    reference_standard: 'NCh 1516',
  },
  {
    code: 'TEST-DEN-003',
    test_type: 'density',
    category: 'soil',
    name_es: 'Densidad In-Situ - Sub-base',
    name_en: 'In-Situ Density - Sub-base',
    description: 'Control de compactación de la capa de sub-base',
    min_value: 95,
    max_value: null,
    unit: '%PM',
    frequency_type: 'per_area',
    frequency_value: 250,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1516 / NCh 1515',
    lab_required: false,
    field_test: true,
    applies_to: ['subbase'],
    reference_standard: 'NCh 1516',
  },
  {
    code: 'TEST-DEN-004',
    test_type: 'density',
    category: 'soil',
    name_es: 'Densidad In-Situ - Base',
    name_en: 'In-Situ Density - Base',
    description: 'Control de compactación de la capa de base',
    min_value: 95,
    max_value: null,
    unit: '%PM',
    frequency_type: 'per_area',
    frequency_value: 250,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1516 / NCh 1515',
    lab_required: false,
    field_test: true,
    applies_to: ['base'],
    reference_standard: 'NCh 1516',
  },
  {
    code: 'TEST-DEN-005',
    test_type: 'density',
    category: 'soil',
    name_es: 'Densidad In-Situ - Relleno Zanjas Colectores',
    name_en: 'In-Situ Density - Collector Trench Fill',
    description: 'Control de compactación de rellenos en zanjas de colectores de aguas lluvias',
    min_value: 95,
    max_value: null,
    unit: '%PM',
    frequency_type: 'per_length',
    frequency_value: 50,
    frequency_unit: 'm',
    min_samples: 1,
    test_method: 'NCh 1516 / NCh 1515',
    lab_required: false,
    field_test: true,
    applies_to: ['zanja_colector'],
    reference_standard: 'NCh 1516',
  },
  {
    code: 'TEST-DEN-006',
    test_type: 'density',
    category: 'soil',
    name_es: 'Densidad Relativa - Relleno Zanjas Infiltración',
    name_en: 'Relative Density - Infiltration Trench Fill',
    description: 'Control de compactación de rellenos granulares en zanjas de infiltración',
    min_value: 80,
    max_value: null,
    unit: '%DR',
    frequency_type: 'per_layer',
    frequency_value: 1,
    frequency_unit: 'capa/zanja',
    min_samples: 1,
    test_method: 'NCh 1515',
    lab_required: false,
    field_test: true,
    applies_to: ['zanja_infiltracion'],
    reference_standard: 'NCh 1515',
  },

  // === CBR TESTS ===
  {
    code: 'TEST-CBR-001',
    test_type: 'cbr',
    category: 'soil',
    name_es: 'CBR - Sub-rasante',
    name_en: 'CBR - Subgrade',
    description: 'California Bearing Ratio para verificar capacidad de soporte de sub-rasante',
    min_value: null,
    max_value: null,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1534',
    lab_required: true,
    field_test: false,
    applies_to: ['subrasante'],
    reference_standard: 'NCh 1534',
  },
  {
    code: 'TEST-CBR-002',
    test_type: 'cbr',
    category: 'soil',
    name_es: 'CBR - Mejoramiento',
    name_en: 'CBR - Improvement Layer',
    description: 'California Bearing Ratio para capa de mejoramiento',
    min_value: null,
    max_value: null,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1534',
    lab_required: true,
    field_test: false,
    applies_to: ['mejoramiento'],
    reference_standard: 'NCh 1534',
  },
  {
    code: 'TEST-CBR-003',
    test_type: 'cbr',
    category: 'soil',
    name_es: 'CBR - Sub-base',
    name_en: 'CBR - Sub-base',
    description: 'California Bearing Ratio para capa de sub-base',
    min_value: null,
    max_value: null,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1534',
    lab_required: true,
    field_test: false,
    applies_to: ['subbase'],
    reference_standard: 'NCh 1534',
  },
  {
    code: 'TEST-CBR-004',
    test_type: 'cbr',
    category: 'soil',
    name_es: 'CBR - Base',
    name_en: 'CBR - Base',
    description: 'California Bearing Ratio para capa de base',
    min_value: null,
    max_value: null,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1534',
    lab_required: true,
    field_test: false,
    applies_to: ['base'],
    reference_standard: 'NCh 1534',
  },

  // === ATTERBERG LIMITS ===
  {
    code: 'TEST-ATT-001',
    test_type: 'atterberg',
    category: 'soil',
    name_es: 'Límites de Atterberg - Sub-rasante',
    name_en: 'Atterberg Limits - Subgrade',
    description: 'Límite líquido, límite plástico e índice de plasticidad de sub-rasante (IP < 10%)',
    min_value: null,
    max_value: 10,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1517',
    lab_required: true,
    field_test: false,
    applies_to: ['subrasante'],
    reference_standard: 'NCh 1517',
  },
  {
    code: 'TEST-ATT-002',
    test_type: 'atterberg',
    category: 'soil',
    name_es: 'Límites de Atterberg - Mejoramiento',
    name_en: 'Atterberg Limits - Improvement',
    description: 'Límite líquido, límite plástico e índice de plasticidad de mejoramiento (IP < 10%)',
    min_value: null,
    max_value: 10,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1517',
    lab_required: true,
    field_test: false,
    applies_to: ['mejoramiento'],
    reference_standard: 'NCh 1517',
  },
  {
    code: 'TEST-ATT-003',
    test_type: 'atterberg',
    category: 'soil',
    name_es: 'Límites de Atterberg - Sub-base',
    name_en: 'Atterberg Limits - Sub-base',
    description: 'Límite líquido, límite plástico e índice de plasticidad de sub-base (IP < 8%)',
    min_value: null,
    max_value: 8,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1517',
    lab_required: true,
    field_test: false,
    applies_to: ['subbase'],
    reference_standard: 'NCh 1517',
  },
  {
    code: 'TEST-ATT-004',
    test_type: 'atterberg',
    category: 'soil',
    name_es: 'Límites de Atterberg - Base',
    name_en: 'Atterberg Limits - Base',
    description: 'Límite líquido, límite plástico e índice de plasticidad de base (IP < 6%)',
    min_value: null,
    max_value: 6,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1517',
    lab_required: true,
    field_test: false,
    applies_to: ['base'],
    reference_standard: 'NCh 1517',
  },

  // === CONCRETE TESTS ===
  {
    code: 'TEST-HRM-001',
    test_type: 'flexural_strength',
    category: 'concrete',
    name_es: 'Resistencia a Flexotracción - Hormigón Calzada HF 5.0',
    name_en: 'Flexural Strength - Pavement Concrete HF 5.0',
    description: 'Ensayo de flexotracción en probetas cúbicas de hormigón de calzada',
    min_value: 5.0,
    max_value: null,
    unit: 'MPa',
    frequency_type: 'per_volume',
    frequency_value: 50,
    frequency_unit: 'm3',
    min_samples: 3,
    test_method: 'NCh 170',
    lab_required: true,
    field_test: false,
    applies_to: ['calzada_hormigon'],
    reference_standard: 'NCh 170',
  },
  {
    code: 'TEST-HRM-002',
    test_type: 'compressive_strength',
    category: 'concrete',
    name_es: 'Resistencia a Compresión - Vereda',
    name_en: 'Compressive Strength - Sidewalk',
    description: 'Ensayo de compresión en probetas cúbicas de hormigón de vereda',
    min_value: 25,
    max_value: null,
    unit: 'MPa',
    frequency_type: 'per_volume',
    frequency_value: 50,
    frequency_unit: 'm3',
    min_samples: 3,
    test_method: 'NCh 1037',
    lab_required: true,
    field_test: false,
    applies_to: ['vereda'],
    reference_standard: 'NCh 1037',
  },
  {
    code: 'TEST-HRM-003',
    test_type: 'slump',
    category: 'concrete',
    name_es: 'Asentamiento de Cono (Slump)',
    name_en: 'Slump Test',
    description: 'Control de consistencia del hormigón fresco',
    min_value: null,
    max_value: null,
    unit: 'cm',
    frequency_type: 'per_volume',
    frequency_value: 25,
    frequency_unit: 'm3',
    min_samples: 1,
    test_method: 'NCh 1019',
    lab_required: false,
    field_test: true,
    applies_to: ['calzada_hormigon', 'vereda'],
    reference_standard: 'NCh 1019',
  },

  // === ASPHALT TESTS ===
  {
    code: 'TEST-ASF-001',
    test_type: 'marshall',
    category: 'asphalt',
    name_es: 'Diseño de Mezcla Marshall - Binder',
    name_en: 'Marshall Mix Design - Binder',
    description: 'Diseño de mezcla asfáltica para capa de binder con aprobación del ITO',
    min_value: null,
    max_value: null,
    unit: null,
    frequency_type: 'per_project',
    frequency_value: 1,
    frequency_unit: 'proyecto',
    min_samples: 1,
    test_method: 'LNV 14',
    lab_required: true,
    field_test: false,
    applies_to: ['binder'],
    reference_standard: 'Manual de Carreteras Vol.8',
  },
  {
    code: 'TEST-ASF-002',
    test_type: 'marshall',
    category: 'asphalt',
    name_es: 'Diseño de Mezcla Marshall - Carpeta',
    name_en: 'Marshall Mix Design - Wearing Course',
    description: 'Diseño de mezcla asfáltica para carpeta de rodadura con aprobación del ITO',
    min_value: null,
    max_value: null,
    unit: null,
    frequency_type: 'per_project',
    frequency_value: 1,
    frequency_unit: 'proyecto',
    min_samples: 1,
    test_method: 'LNV 14',
    lab_required: true,
    field_test: false,
    applies_to: ['carpeta'],
    reference_standard: 'Manual de Carreteras Vol.8',
  },
  {
    code: 'TEST-ASF-003',
    test_type: 'core',
    category: 'asphalt',
    name_es: 'Testigo de Asfalto - Binder',
    name_en: 'Asphalt Core - Binder',
    description: 'Extracción de testigo para verificar espesor y compactación de binder',
    min_value: 96,
    max_value: null,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'LNV 64',
    lab_required: true,
    field_test: false,
    applies_to: ['binder'],
    reference_standard: 'Manual de Carreteras Vol.8',
  },
  {
    code: 'TEST-ASF-004',
    test_type: 'core',
    category: 'asphalt',
    name_es: 'Testigo de Asfalto - Carpeta',
    name_en: 'Asphalt Core - Wearing Course',
    description: 'Extracción de testigo para verificar espesor y compactación de carpeta',
    min_value: 96,
    max_value: null,
    unit: '%',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'LNV 64',
    lab_required: true,
    field_test: false,
    applies_to: ['carpeta'],
    reference_standard: 'Manual de Carreteras Vol.8',
  },

  // === STORMWATER TESTS ===
  {
    code: 'TEST-ALL-001',
    test_type: 'infiltration',
    category: 'stormwater',
    name_es: 'Ensayo Porchet - Infiltración',
    name_en: 'Porchet Test - Infiltration',
    description: 'Ensayo de infiltración para zanjas de infiltración de aguas lluvias',
    min_value: null,
    max_value: null,
    unit: 'mm/h',
    frequency_type: 'per_element',
    frequency_value: 1,
    frequency_unit: 'zanja',
    min_samples: 1,
    test_method: 'Ensayo Porchet',
    lab_required: false,
    field_test: true,
    applies_to: ['zanja_infiltracion'],
    reference_standard: 'SERVIU',
  },
  {
    code: 'TEST-ALL-002',
    test_type: 'watertightness',
    category: 'stormwater',
    name_es: 'Prueba de Hermeticidad - Colectores',
    name_en: 'Watertightness Test - Collectors',
    description: 'Prueba hidrostática para verificar hermeticidad de colectores de aguas lluvias',
    min_value: null,
    max_value: null,
    unit: null,
    frequency_type: 'per_element',
    frequency_value: 1,
    frequency_unit: 'tramo',
    min_samples: 1,
    test_method: 'Prueba hidrostática',
    lab_required: false,
    field_test: true,
    applies_to: ['colector'],
    reference_standard: 'SERVIU',
  },
  {
    code: 'TEST-ALL-003',
    test_type: 'runoff',
    category: 'stormwater',
    name_es: 'Prueba de Escurrimiento Superficial',
    name_en: 'Surface Runoff Test',
    description: 'Prueba para detectar puntos bajos y verificar operatividad de sumideros y colectores',
    min_value: null,
    max_value: null,
    unit: null,
    frequency_type: 'per_project',
    frequency_value: 1,
    frequency_unit: 'proyecto',
    min_samples: 1,
    test_method: 'Prueba de inundación',
    lab_required: false,
    field_test: true,
    applies_to: ['sumidero', 'colector', 'zanja_infiltracion'],
    reference_standard: 'SERVIU',
  },

  // === CONCRETE CORE TESTS ===
  {
    code: 'TEST-TES-001',
    test_type: 'core',
    category: 'concrete',
    name_es: 'Testigo de Vereda',
    name_en: 'Sidewalk Core',
    description: 'Extracción de testigo de vereda para verificar espesor y resistencia',
    min_value: null,
    max_value: null,
    unit: 'cm',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1171',
    lab_required: true,
    field_test: false,
    applies_to: ['vereda'],
    reference_standard: 'NCh 1171',
  },
  {
    code: 'TEST-TES-002',
    test_type: 'core',
    category: 'concrete',
    name_es: 'Testigo de Calzada Hormigón',
    name_en: 'Concrete Pavement Core',
    description: 'Extracción de testigo de calzada de hormigón para verificar espesor',
    min_value: null,
    max_value: null,
    unit: 'cm',
    frequency_type: 'per_area',
    frequency_value: 500,
    frequency_unit: 'm2',
    min_samples: 1,
    test_method: 'NCh 1171',
    lab_required: true,
    field_test: false,
    applies_to: ['calzada_hormigon'],
    reference_standard: 'NCh 1171',
  },
];

async function importTestSpecs() {
  console.log('Importing test specifications...\n');

  const db = createClient({
    url: 'file:local.db',
  });

  // Ensure table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS test_specifications (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      test_type TEXT NOT NULL,
      category TEXT NOT NULL,
      name_es TEXT NOT NULL,
      name_en TEXT,
      description TEXT,
      min_value REAL,
      max_value REAL,
      unit TEXT,
      frequency_type TEXT,
      frequency_value REAL,
      frequency_unit TEXT,
      min_samples INTEGER DEFAULT 1,
      test_method TEXT,
      lab_required INTEGER DEFAULT 0,
      field_test INTEGER DEFAULT 0,
      applies_to_json TEXT,
      reference_standard TEXT,
      source_document TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_test_specs_code ON test_specifications(code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_test_specs_type ON test_specifications(test_type)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_test_specs_category ON test_specifications(category)`);

  let inserted = 0;
  let skipped = 0;

  for (const spec of testSpecifications) {
    try {
      // Check if exists
      const existing = await db.execute({
        sql: 'SELECT id FROM test_specifications WHERE code = ?',
        args: [spec.code],
      });

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      const id = `ts_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await db.execute({
        sql: `INSERT INTO test_specifications (
          id, code, test_type, category, name_es, name_en, description,
          min_value, max_value, unit, frequency_type, frequency_value, frequency_unit,
          min_samples, test_method, lab_required, field_test, applies_to_json,
          reference_standard, source_document, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          spec.code,
          spec.test_type,
          spec.category,
          spec.name_es,
          spec.name_en,
          spec.description,
          spec.min_value,
          spec.max_value,
          spec.unit,
          spec.frequency_type,
          spec.frequency_value,
          spec.frequency_unit,
          spec.min_samples,
          spec.test_method,
          spec.lab_required ? 1 : 0,
          spec.field_test ? 1 : 0,
          JSON.stringify(spec.applies_to),
          spec.reference_standard,
          'Plan_de_ensayes.xls / Check_List_Inspeccion.pdf',
          1,
        ],
      });

      inserted++;
    } catch (error) {
      console.error(`Error inserting ${spec.code}:`, error);
    }
  }

  // Print summary
  console.log('=' .repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total specifications: ${testSpecifications.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicates): ${skipped}`);

  // Count by category
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let labRequired = 0;
  let fieldTest = 0;

  for (const s of testSpecifications) {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    byType[s.test_type] = (byType[s.test_type] || 0) + 1;
    if (s.lab_required) labRequired++;
    if (s.field_test) fieldTest++;
  }

  console.log('\nBy Category:');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  console.log('\nBy Test Type:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log(`\nLab Required: ${labRequired}`);
  console.log(`Field Tests: ${fieldTest}`);

  console.log('\n✅ Import complete!');
}

importTestSpecs().catch(console.error);
