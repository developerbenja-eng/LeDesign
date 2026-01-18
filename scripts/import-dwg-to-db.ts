/**
 * Import DWG manifest into database
 * Run with: npx tsx scripts/import-dwg-to-db.ts
 *
 * Prerequisites:
 * 1. Run process-all-dwg.ts first to generate manifest
 * 2. Optionally edit temp/dwg-manifest.json to correct categories
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient, Client } from '@libsql/client';

const MANIFEST_PATH = path.join(process.cwd(), 'temp', 'dwg-manifest.json');
const SVG_DIR = path.join(process.cwd(), 'temp', 'svg');
const GEOMETRY_DIR = path.join(process.cwd(), 'temp', 'geometry');

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Initialize local database
function getDb(): Client {
  return createClient({
    url: 'file:local.db',
  });
}

interface ManifestFile {
  filename: string;
  category: string;
  subcategory: string;
  code: string;
  name_es: string;
  name_en?: string;
  description?: string;
  _fileSize: number;
  _dwgVersion: string;
  _entityCount: number;
  _entityTypes: Record<string, number>;
  _layers: string[];
  _bounds: { minX: number; minY: number; maxX: number; maxY: number };
  _svgPath: string;
  _geometryPath: string;
  _parseStatus: string;
  _skippedTypes: Record<string, number>;
}

interface Manifest {
  generatedAt: string;
  totalFiles: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  files: ManifestFile[];
}

// Map categories to destination tables
function getDestinationTable(category: string): 'standard_details' | 'drawing_templates' | 'cad_symbols' {
  switch (category) {
    case 'templates':
      return 'drawing_templates';
    case 'symbols':
      return 'cad_symbols';
    default:
      // stormwater, pipes, curbs, pavement, traffic, reference → standard_details
      return 'standard_details';
  }
}

// Insert into standard_details table
async function insertStandardDetail(db: Client, file: ManifestFile, svgContent: string, geometryJson: string) {
  const id = generateId();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO standard_details (
      id, category, subcategory, code, name_es, name_en, description,
      source_file, geometry_json, bounds_json, layers_json, thumbnail_svg,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      file.category,
      file.subcategory,
      file.code,
      file.name_es,
      file.name_en || null,
      file.description || null,
      file.filename,
      geometryJson,
      JSON.stringify(file._bounds),
      JSON.stringify(file._layers),
      svgContent,
      now,
      now,
    ],
  });

  return id;
}

// Insert or update drawing_templates table
async function insertDrawingTemplate(db: Client, file: ManifestFile, svgContent: string, geometryJson: string) {
  const now = new Date().toISOString();

  // Determine template type from subcategory
  const templateType = file.subcategory === 'formularios' ? 'form' : 'plan_sheet';

  // Check if exists by source_file
  const exists = await db.execute({
    sql: 'SELECT id FROM drawing_templates WHERE source_file = ?',
    args: [file.filename],
  });

  if (exists.rows.length > 0) {
    await db.execute({
      sql: `UPDATE drawing_templates SET
        name = ?, description = ?, template_type = ?, content_json = ?,
        thumbnail_svg = ? WHERE source_file = ?`,
      args: [file.name_es, file.description || null, templateType, geometryJson, svgContent, file.filename],
    });
    return exists.rows[0].id as string;
  }

  const id = generateId();
  await db.execute({
    sql: `INSERT INTO drawing_templates (
      id, name, description, template_type, source_file, content_json,
      paper_size, thumbnail_svg, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, file.name_es, file.description || null, templateType, file.filename, geometryJson, 'A1', svgContent, now],
  });

  return id;
}

// Insert or update cad_symbols table
async function insertCADSymbol(db: Client, file: ManifestFile, svgContent: string, geometryJson: string) {
  const now = new Date().toISOString();

  // Check if this is a text block (Notas.dwg)
  const isTextBlock = file.subcategory === 'notas';

  // Check if exists by source_file
  const exists = await db.execute({
    sql: 'SELECT id FROM cad_symbols WHERE source_file = ?',
    args: [file.filename],
  });

  if (exists.rows.length > 0) {
    await db.execute({
      sql: `UPDATE cad_symbols SET
        category = ?, name = ?, geometry_json = ?, bounds_json = ?,
        is_text_block = ?, thumbnail_svg = ? WHERE source_file = ?`,
      args: [file.subcategory, file.name_es, geometryJson, JSON.stringify(file._bounds), isTextBlock ? 1 : 0, svgContent, file.filename],
    });
    return exists.rows[0].id as string;
  }

  const id = generateId();
  await db.execute({
    sql: `INSERT INTO cad_symbols (
      id, category, name, source_file, geometry_json, bounds_json,
      is_text_block, thumbnail_svg, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, file.subcategory, file.name_es, file.filename, geometryJson, JSON.stringify(file._bounds), isTextBlock ? 1 : 0, svgContent, now],
  });

  return id;
}

// Setup infrastructure-to-detail defaults
async function setupInfrastructureDefaults(db: Client) {
  console.log('\nSetting up infrastructure-to-detail defaults...');

  // Clear existing defaults first to prevent duplicates
  await db.execute('DELETE FROM infrastructure_detail_defaults');

  const defaults = [
    // Storm inlets → Sumideros
    { infrastructure_type: 'storm_inlet', detail_code: 'SUM-1', is_default: true },
    { infrastructure_type: 'storm_inlet', detail_code: 'SUM-2', is_default: false },
    { infrastructure_type: 'storm_inlet', detail_code: 'SUM-3', is_default: false },
    { infrastructure_type: 'storm_inlet', detail_code: 'SUM-4', is_default: false },
    { infrastructure_type: 'storm_inlet', detail_code: 'SUM-G', is_default: false },
    { infrastructure_type: 'storm_inlet', detail_code: 'SUM-SERVIU', is_default: false },

    // Manholes → Cámaras
    { infrastructure_type: 'manhole', detail_code: 'CAM-TIPO-A', is_default: true },
    { infrastructure_type: 'manhole', detail_code: 'CAM-TIPO-B', is_default: false },
    { infrastructure_type: 'manhole', detail_code: 'CAM-DEC', is_default: false },

    // Sewer pipe → Zanja
    { infrastructure_type: 'sewer_pipe', detail_code: 'ZAN', is_default: true },
    { infrastructure_type: 'sewer_pipe', detail_code: 'ZAN-COL', is_default: false },
    { infrastructure_type: 'sewer_pipe', detail_code: 'ZAN-EXC', is_default: false },

    // Curb → Soleras
    { infrastructure_type: 'curb', detail_code: 'SOL-TIPO', is_default: true },
    { infrastructure_type: 'curb', detail_code: 'SOL-ZARPA', is_default: false },
    { infrastructure_type: 'curb', detail_code: 'SOL-SITIO', is_default: false },

    // Sidewalks/Ramps
    { infrastructure_type: 'sidewalk', detail_code: 'ACE-REF', is_default: true },
    { infrastructure_type: 'sidewalk', detail_code: 'VER', is_default: false },
    { infrastructure_type: 'sidewalk', detail_code: 'VER-REB', is_default: false },
  ];

  for (const def of defaults) {
    // Check if the detail exists
    const exists = await db.execute({
      sql: 'SELECT id FROM standard_details WHERE code = ?',
      args: [def.detail_code],
    });

    if (exists.rows.length === 0) {
      console.log(`  ⚠ Detail ${def.detail_code} not found, skipping default`);
      continue;
    }

    await db.execute({
      sql: `INSERT OR REPLACE INTO infrastructure_detail_defaults (
        id, infrastructure_type, detail_code, is_default
      ) VALUES (?, ?, ?, ?)`,
      args: [generateId(), def.infrastructure_type, def.detail_code, def.is_default ? 1 : 0],
    });
  }

  console.log('  ✓ Infrastructure defaults configured');
}

async function main() {
  console.log('Importing DWG manifest into database...\n');

  // Check manifest exists
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Manifest not found! Run process-all-dwg.ts first.');
    process.exit(1);
  }

  // Read manifest
  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  console.log(`Found ${manifest.totalFiles} files in manifest\n`);

  // Initialize database
  const db = getDb();

  // Ensure tables exist (run migrations)
  console.log('Ensuring tables exist...');

  // Create tables if they don't exist (simplified version of migrations)
  await db.execute(`CREATE TABLE IF NOT EXISTS standard_details (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    subcategory TEXT,
    code TEXT UNIQUE NOT NULL,
    name_es TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    source_file TEXT NOT NULL,
    source_url TEXT,
    geometry_json TEXT NOT NULL,
    bounds_json TEXT,
    insertion_point_json TEXT,
    layers_json TEXT,
    tags_json TEXT,
    thumbnail_svg TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS drawing_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT NOT NULL,
    source_file TEXT NOT NULL,
    source_url TEXT,
    content_json TEXT NOT NULL,
    paper_size TEXT,
    scale TEXT,
    title_block_fields_json TEXT,
    thumbnail_svg TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS cad_symbols (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    source_file TEXT NOT NULL,
    geometry_json TEXT NOT NULL,
    bounds_json TEXT,
    insertion_point_json TEXT,
    is_text_block INTEGER DEFAULT 0,
    text_content TEXT,
    thumbnail_svg TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS infrastructure_detail_defaults (
    id TEXT PRIMARY KEY,
    infrastructure_type TEXT NOT NULL,
    detail_code TEXT NOT NULL,
    is_default INTEGER DEFAULT 1,
    conditions_json TEXT
  )`);

  // Create indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_standard_details_category ON standard_details(category)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_standard_details_code ON standard_details(code)`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_standard_details_code_unique ON standard_details(code)`);

  console.log('  ✓ Tables ready\n');

  // Track stats
  const stats = {
    standard_details: 0,
    drawing_templates: 0,
    cad_symbols: 0,
    skipped: 0,
    errors: 0,
  };

  // Process each file
  for (const file of manifest.files) {
    const basename = path.basename(file.filename, path.extname(file.filename));
    const svgPath = path.join(SVG_DIR, `${basename}.svg`);
    const geometryPath = path.join(GEOMETRY_DIR, `${basename}.json`);

    // Check files exist
    if (!fs.existsSync(svgPath) || !fs.existsSync(geometryPath)) {
      console.log(`⚠ Missing files for ${file.filename}, skipping`);
      stats.skipped++;
      continue;
    }

    // Read SVG and geometry
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    const geometryJson = fs.readFileSync(geometryPath, 'utf-8');

    // Determine destination table
    const table = getDestinationTable(file.category);

    try {
      // Check if already exists (by code for standard_details)
      if (table === 'standard_details') {
        const exists = await db.execute({
          sql: 'SELECT id FROM standard_details WHERE code = ?',
          args: [file.code],
        });
        if (exists.rows.length > 0) {
          console.log(`  ⟳ ${file.code} already exists, updating...`);
          await db.execute({
            sql: `UPDATE standard_details SET
              category = ?, subcategory = ?, name_es = ?, name_en = ?,
              geometry_json = ?, bounds_json = ?, layers_json = ?,
              thumbnail_svg = ?, updated_at = ?
              WHERE code = ?`,
            args: [
              file.category,
              file.subcategory,
              file.name_es,
              file.name_en || null,
              geometryJson,
              JSON.stringify(file._bounds),
              JSON.stringify(file._layers),
              svgContent,
              new Date().toISOString(),
              file.code,
            ],
          });
          stats.standard_details++;
          continue;
        }
      }

      // Insert based on table type
      switch (table) {
        case 'standard_details':
          await insertStandardDetail(db, file, svgContent, geometryJson);
          stats.standard_details++;
          console.log(`  ✓ ${file.code} → standard_details (${file.category}/${file.subcategory})`);
          break;

        case 'drawing_templates':
          await insertDrawingTemplate(db, file, svgContent, geometryJson);
          stats.drawing_templates++;
          console.log(`  ✓ ${file.name_es} → drawing_templates`);
          break;

        case 'cad_symbols':
          await insertCADSymbol(db, file, svgContent, geometryJson);
          stats.cad_symbols++;
          console.log(`  ✓ ${file.name_es} → cad_symbols`);
          break;
      }
    } catch (error: any) {
      console.error(`  ✗ Error importing ${file.filename}: ${error.message}`);
      stats.errors++;
    }
  }

  // Setup infrastructure defaults
  await setupInfrastructureDefaults(db);

  // Print summary
  console.log('\n============================================================');
  console.log('IMPORT COMPLETE');
  console.log('============================================================\n');
  console.log(`Standard Details: ${stats.standard_details}`);
  console.log(`Drawing Templates: ${stats.drawing_templates}`);
  console.log(`CAD Symbols: ${stats.cad_symbols}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  // Verify counts
  const detailCount = await db.execute('SELECT COUNT(*) as count FROM standard_details');
  const templateCount = await db.execute('SELECT COUNT(*) as count FROM drawing_templates');
  const symbolCount = await db.execute('SELECT COUNT(*) as count FROM cad_symbols');

  console.log('\nDatabase totals:');
  console.log(`  standard_details: ${detailCount.rows[0]?.count || 0}`);
  console.log(`  drawing_templates: ${templateCount.rows[0]?.count || 0}`);
  console.log(`  cad_symbols: ${symbolCount.rows[0]?.count || 0}`);
}

main().catch(console.error);
