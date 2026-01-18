/**
 * Import approved products from SERVIU validation documents
 * Run with: npx tsx scripts/import-approved-products.ts
 *
 * Data extracted from validation PDF files (Validación Ord. N°...)
 * These are stormwater infiltration products approved by SERVIU Metropolitano
 */

import { createClient } from '@libsql/client';

interface ApprovedProduct {
  code: string;
  category: string;
  subcategory: string;
  product_name: string;
  manufacturer: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  approval_entity: string;
  ordinance_number: string;
  approval_date: string;
  valid_until: string | null;
  technical_specs_json: Record<string, any>;
  source_document: string;
}

// Approved products extracted from SERVIU validation documents
const approvedProducts: ApprovedProduct[] = [
  {
    code: 'PROD-001',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'CUBO DREN ULTRA',
    manufacturer: 'MARIATHON LTDA. - TECKNOGREEN S.A.',
    brand: 'TECKNOGREEN',
    model: 'CUBO DREN ULTRA',
    description: 'Celda drenante rectangular de polipropileno reciclado para sistemas de drenaje mediante zanja de infiltración, como alternativa a zanjas tradicionales de bolones',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '232',
    approval_date: '2019-01-10',
    valid_until: null,
    technical_specs_json: {
      material: 'Polipropileno reciclado',
      compression_resistance_min: 26,
      compression_resistance_unit: 'T/m2',
      min_interior_pallets: 3,
      application: 'Zanja de infiltración'
    },
    source_document: '1_ValidacionOrd_N°_232_10_01_2019_Tecknogreen.pdf',
  },
  {
    code: 'PROD-002',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'STORMTECH SC-310',
    manufacturer: 'STORMTECH',
    brand: 'STORMTECH',
    model: 'SC-310',
    description: 'Cámara de infiltración modular para aguas lluvias',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '1028',
    approval_date: '2021-04-12',
    valid_until: null,
    technical_specs_json: {
      type: 'Modular infiltration chamber',
      application: 'Stormwater infiltration'
    },
    source_document: '3_ValidacionOrd_N°1028_12_04_2021_Stormtech_SC_310_SC_740_MC3500.pdf',
  },
  {
    code: 'PROD-003',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'STORMTECH SC-740',
    manufacturer: 'STORMTECH',
    brand: 'STORMTECH',
    model: 'SC-740',
    description: 'Cámara de infiltración modular de mayor capacidad',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '1028',
    approval_date: '2021-04-12',
    valid_until: null,
    technical_specs_json: {
      type: 'Modular infiltration chamber',
      application: 'Stormwater infiltration'
    },
    source_document: '3_ValidacionOrd_N°1028_12_04_2021_Stormtech_SC_310_SC_740_MC3500.pdf',
  },
  {
    code: 'PROD-004',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'STORMTECH MC-3500',
    manufacturer: 'STORMTECH',
    brand: 'STORMTECH',
    model: 'MC-3500',
    description: 'Cámara modular de alta capacidad para infiltración',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '1028',
    approval_date: '2021-04-12',
    valid_until: null,
    technical_specs_json: {
      type: 'High capacity modular chamber',
      application: 'Stormwater infiltration'
    },
    source_document: '3_ValidacionOrd_N°1028_12_04_2021_Stormtech_SC_310_SC_740_MC3500.pdf',
  },
  {
    code: 'PROD-005',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'MEGADREN 27',
    manufacturer: 'MEGADREN',
    brand: 'MEGADREN',
    model: 'MEGADREN 27',
    description: 'Celda de drenaje modular para infiltración de aguas lluvias',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '6285',
    approval_date: '2023-12-13',
    valid_until: null,
    technical_specs_json: {
      type: 'Drainage cell',
      application: 'Stormwater infiltration'
    },
    source_document: '5_ValidacionOrd_N°6285_13_12_2023_Megadren_27_32_40.pdf',
  },
  {
    code: 'PROD-006',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'MEGADREN 32',
    manufacturer: 'MEGADREN',
    brand: 'MEGADREN',
    model: 'MEGADREN 32',
    description: 'Celda de drenaje modular para infiltración de aguas lluvias',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '6285',
    approval_date: '2023-12-13',
    valid_until: null,
    technical_specs_json: {
      type: 'Drainage cell',
      application: 'Stormwater infiltration'
    },
    source_document: '5_ValidacionOrd_N°6285_13_12_2023_Megadren_27_32_40.pdf',
  },
  {
    code: 'PROD-007',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'MEGADREN 40',
    manufacturer: 'MEGADREN',
    brand: 'MEGADREN',
    model: 'MEGADREN 40',
    description: 'Celda de drenaje modular para infiltración de aguas lluvias',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '6285',
    approval_date: '2023-12-13',
    valid_until: null,
    technical_specs_json: {
      type: 'Drainage cell',
      application: 'Stormwater infiltration'
    },
    source_document: '5_ValidacionOrd_N°6285_13_12_2023_Megadren_27_32_40.pdf',
  },
  {
    code: 'PROD-008',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'CUBODREN ULTRA',
    manufacturer: 'SANTA BEATRIZ',
    brand: 'CUBODREN',
    model: 'ULTRA',
    description: 'Celda de drenaje modular tipo cubo para infiltración',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '909',
    approval_date: '2024-02-21',
    valid_until: null,
    technical_specs_json: {
      type: 'Cube drainage cell',
      application: 'Stormwater infiltration'
    },
    source_document: '6_ValidacionOrd_N°909_21_02_2024_Cubodren_Ultra_Santa_Beatriz.pdf',
  },
  {
    code: 'PROD-009',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'GEOCUBO + MEGADREN',
    manufacturer: 'GEOCUBO / MEGADREN',
    brand: 'GEOCUBO',
    model: 'GEOCUBO + MEGADREN 27/32/40',
    description: 'Sistema combinado de geocubo con celdas Megadren para infiltración',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '2107',
    approval_date: '2024-05-14',
    valid_until: null,
    technical_specs_json: {
      type: 'Combined system',
      components: ['GEOCUBO', 'MEGADREN 27', 'MEGADREN 32', 'MEGADREN 40'],
      application: 'Stormwater infiltration'
    },
    source_document: '7_Validacion_Ord_N°2107_14_05_2024_Geocubo_Megadren_27_32_40.pdf',
  },
  {
    code: 'PROD-010',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'BIOPLASTIC',
    manufacturer: 'BIOPLASTIC',
    brand: 'BIOPLASTIC',
    model: null,
    description: 'Sistema de celdas plásticas para infiltración de aguas lluvias',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '4439',
    approval_date: '2024-10-25',
    valid_until: null,
    technical_specs_json: {
      type: 'Plastic cell system',
      application: 'Stormwater infiltration'
    },
    source_document: '8_Validacion_Ord_N°4439_25_10_2024_Bioplastic.pdf',
  },
  {
    code: 'PROD-011',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'STORMTECH SC-800',
    manufacturer: 'STORMTECH',
    brand: 'STORMTECH',
    model: 'SC-800',
    description: 'Cámara de infiltración modular serie 800',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '2679',
    approval_date: '2025-06-18',
    valid_until: null,
    technical_specs_json: {
      type: 'Modular infiltration chamber',
      series: '800',
      application: 'Stormwater infiltration'
    },
    source_document: '9_Validacion_Ord_N°2679_18_06_2025_Stormtech_SC_800.pdf',
  },
  {
    code: 'PROD-012',
    category: 'stormwater',
    subcategory: 'inlets',
    product_name: 'SUMIDERO NYLOPLAST',
    manufacturer: 'NYLOPLAST',
    brand: 'NYLOPLAST',
    model: null,
    description: 'Sumidero prefabricado de plástico para captación de aguas lluvias',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '2735',
    approval_date: '2025-06-23',
    valid_until: null,
    technical_specs_json: {
      type: 'Plastic storm inlet',
      application: 'Stormwater collection'
    },
    source_document: '10_Validacion_Ord_N°2735_23_06_2025_Sumidero_Nyloplast.pdf',
  },
  {
    code: 'PROD-013',
    category: 'stormwater',
    subcategory: 'infiltration_cells',
    product_name: 'TITAN DREN',
    manufacturer: 'TITAN',
    brand: 'TITAN',
    model: 'TITAN DREN',
    description: 'Sistema modular de drenaje para infiltración de aguas lluvias',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '4590',
    approval_date: '2025-10-10',
    valid_until: null,
    technical_specs_json: {
      type: 'Modular drainage system',
      application: 'Stormwater infiltration'
    },
    source_document: '15_Validacion_Ord_Nº4590_10.10.25_Titan_Dren.pdf',
  },
  {
    code: 'PROD-014',
    category: 'concrete',
    subcategory: 'fiber_reinforcement',
    product_name: 'MICROFIBRA v13 MO',
    manufacturer: 'MO',
    brand: null,
    model: 'v13 MO',
    description: 'Microfibra de polipropileno para refuerzo de hormigón',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '3801',
    approval_date: '2025-08-22',
    valid_until: null,
    technical_specs_json: {
      type: 'Polypropylene microfiber',
      application: 'Concrete reinforcement'
    },
    source_document: '12_Validacion_Ord.N°3801_22.08.2025_Microfibra_v13_MO.pdf',
  },
  {
    code: 'PROD-015',
    category: 'concrete',
    subcategory: 'fiber_reinforcement',
    product_name: 'MICROFIBRA v12 AM',
    manufacturer: 'AM',
    brand: null,
    model: 'v12 AM',
    description: 'Microfibra de polipropileno para refuerzo de hormigón',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '3829',
    approval_date: '2025-08-25',
    valid_until: null,
    technical_specs_json: {
      type: 'Polypropylene microfiber',
      application: 'Concrete reinforcement'
    },
    source_document: '13_Validacion_Ord.N°3829_25.08.2025_Microfibra_v12_AM.pdf',
  },
  {
    code: 'PROD-016',
    category: 'pavement',
    subcategory: 'repair_methodology',
    product_name: 'METODOLOGÍA CRACKING',
    manufacturer: 'N/A',
    brand: null,
    model: null,
    description: 'Metodología de reparación de pavimentos mediante técnica de cracking',
    approval_entity: 'SERVIU Metropolitano',
    ordinance_number: '3412',
    approval_date: '2025-07-28',
    valid_until: null,
    technical_specs_json: {
      type: 'Repair methodology',
      technique: 'Cracking',
      application: 'Pavement repair'
    },
    source_document: 'Validacion_Ord_N3412_28_07_2025_Metodologia_Cracking.pdf',
  },
];

async function importApprovedProducts() {
  console.log('Importing approved products...\n');

  const db = createClient({
    url: 'file:local.db',
  });

  // Ensure table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS approved_products (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      product_name TEXT NOT NULL,
      manufacturer TEXT,
      brand TEXT,
      model TEXT,
      description TEXT,
      approval_entity TEXT NOT NULL,
      ordinance_number TEXT,
      approval_date TEXT,
      valid_until TEXT,
      technical_specs_json TEXT,
      certifications_json TEXT,
      source_document TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_approved_products_code ON approved_products(code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_approved_products_category ON approved_products(category)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_approved_products_manufacturer ON approved_products(manufacturer)`);

  let inserted = 0;
  let skipped = 0;

  for (const product of approvedProducts) {
    try {
      // Check if exists
      const existing = await db.execute({
        sql: 'SELECT id FROM approved_products WHERE code = ?',
        args: [product.code],
      });

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      const id = `ap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await db.execute({
        sql: `INSERT INTO approved_products (
          id, code, category, subcategory, product_name, manufacturer, brand, model,
          description, approval_entity, ordinance_number, approval_date, valid_until,
          technical_specs_json, source_document, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          product.code,
          product.category,
          product.subcategory,
          product.product_name,
          product.manufacturer,
          product.brand,
          product.model,
          product.description,
          product.approval_entity,
          product.ordinance_number,
          product.approval_date,
          product.valid_until,
          JSON.stringify(product.technical_specs_json),
          product.source_document,
          1,
        ],
      });

      inserted++;
    } catch (error) {
      console.error(`Error inserting ${product.code}:`, error);
    }
  }

  // Print summary
  console.log('=' .repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total products: ${approvedProducts.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicates): ${skipped}`);

  // Count by category
  const byCategory: Record<string, number> = {};
  const bySubcategory: Record<string, number> = {};
  const byManufacturer: Record<string, number> = {};

  for (const p of approvedProducts) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    bySubcategory[p.subcategory] = (bySubcategory[p.subcategory] || 0) + 1;
    if (p.manufacturer) {
      // Extract first company name
      const mfr = p.manufacturer.split('/')[0].split('-')[0].trim();
      byManufacturer[mfr] = (byManufacturer[mfr] || 0) + 1;
    }
  }

  console.log('\nBy Category:');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  console.log('\nBy Subcategory:');
  Object.entries(bySubcategory).sort((a, b) => b[1] - a[1]).forEach(([sub, count]) => {
    console.log(`  ${sub}: ${count}`);
  });

  console.log('\nBy Manufacturer:');
  Object.entries(byManufacturer).sort((a, b) => b[1] - a[1]).forEach(([mfr, count]) => {
    console.log(`  ${mfr}: ${count}`);
  });

  console.log('\n✅ Import complete!');
}

importApprovedProducts().catch(console.error);
