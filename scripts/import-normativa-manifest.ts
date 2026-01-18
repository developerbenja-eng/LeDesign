/**
 * Import MINVU manifest.json into normativa_documents table
 * Run with: npx tsx scripts/import-normativa-manifest.ts
 */

import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

interface ManifestDocument {
  name: string;
  description: string;
  url: string;
  fileType: 'PDF' | 'Word' | 'Excel' | 'AutoCAD';
  category: string;
  subCategory: string;
}

// Map file types to database format
function normalizeFileType(fileType: string): string {
  const typeMap: Record<string, string> = {
    'PDF': 'pdf',
    'Word': 'docx',
    'Excel': 'xlsx',
    'AutoCAD': 'dwg',
  };
  return typeMap[fileType] || fileType.toLowerCase();
}

// Derive document_type from name and category
function deriveDocumentType(doc: ManifestDocument): string {
  const nameLower = doc.name.toLowerCase();
  const categoryLower = doc.category.toLowerCase();

  // Check for form types
  if (nameLower.includes('formulario') || nameLower.includes('ficha')) {
    return 'form';
  }
  if (nameLower.includes('checklist') || nameLower.includes('pauta de revisión') || nameLower.includes('pauta de recepción')) {
    return 'checklist';
  }
  if (nameLower.includes('manual')) {
    return 'manual';
  }
  if (nameLower.includes('plan estratégico')) {
    return 'strategic_plan';
  }
  if (nameLower.includes('presupuesto') || nameLower.includes('precios') || nameLower.includes('precio')) {
    return 'pricing';
  }
  if (nameLower.includes('planilla')) {
    return 'spreadsheet';
  }
  if (nameLower.includes('certificado') || nameLower.includes('certificación')) {
    return 'certificate';
  }
  if (nameLower.includes('detalle') || nameLower.includes('det_') || nameLower.includes('det.')) {
    return 'cad_detail';
  }
  if (nameLower.includes('formato') || nameLower.includes('plantilla')) {
    return 'template';
  }
  if (nameLower.includes('validación') || nameLower.includes('validacion')) {
    return 'validation';
  }
  if (nameLower.includes('ensayo') || nameLower.includes('ensayos')) {
    return 'test_spec';
  }
  if (nameLower.includes('criterio')) {
    return 'criteria';
  }
  if (categoryLower.includes('inspección') || categoryLower.includes('inspeccion')) {
    return 'inspection';
  }
  if (doc.fileType === 'AutoCAD') {
    return 'cad_drawing';
  }

  return 'document';
}

// Extract local file path from URL
function getLocalFilePath(url: string, fileType: string): string | null {
  try {
    const fileName = decodeURIComponent(url.split('/').pop() || '');
    if (!fileName) return null;

    const folderMap: Record<string, string> = {
      'PDF': 'PDF',
      'Word': 'Word',
      'Excel': 'Excel',
      'AutoCAD': 'AutoCAD',
    };

    const folder = folderMap[fileType] || fileType;
    return `minvu-docs/${folder}/${fileName}`;
  } catch {
    return null;
  }
}

// Generate unique ID
function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function importManifest() {
  console.log('Starting manifest import...\n');

  // Read manifest
  const manifestPath = path.join(process.cwd(), 'minvu-docs', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found at: ${manifestPath}`);
    process.exit(1);
  }

  const manifestData = fs.readFileSync(manifestPath, 'utf-8');
  const documents: ManifestDocument[] = JSON.parse(manifestData);

  console.log(`Found ${documents.length} documents in manifest\n`);

  // Connect to database
  const db = createClient({
    url: 'file:local.db',
  });

  // Track stats
  const stats = {
    inserted: 0,
    skipped: 0,
    errors: 0,
    byType: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
  };

  // First, check if table exists and create if needed
  await db.execute(`
    CREATE TABLE IF NOT EXISTS normativa_documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      document_type TEXT NOT NULL,
      category TEXT,
      subcategory TEXT,
      file_type TEXT NOT NULL,
      file_path TEXT,
      source_url TEXT,
      version TEXT,
      publication_date TEXT,
      data_extracted INTEGER DEFAULT 0,
      extraction_date TEXT,
      extracted_tables_json TEXT,
      manifest_name TEXT,
      manifest_category TEXT,
      manifest_subcategory TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_normativa_docs_type ON normativa_documents(document_type)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_normativa_docs_file_type ON normativa_documents(file_type)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_normativa_docs_category ON normativa_documents(category)`);

  // Process each document
  for (const doc of documents) {
    try {
      // Check if already exists (by source_url)
      const existing = await db.execute({
        sql: 'SELECT id FROM normativa_documents WHERE source_url = ?',
        args: [doc.url],
      });

      if (existing.rows.length > 0) {
        stats.skipped++;
        continue;
      }

      const id = generateId();
      const documentType = deriveDocumentType(doc);
      const fileType = normalizeFileType(doc.fileType);
      const filePath = getLocalFilePath(doc.url, doc.fileType);

      await db.execute({
        sql: `INSERT INTO normativa_documents (
          id, name, description, document_type, category, subcategory,
          file_type, file_path, source_url, manifest_name, manifest_category,
          manifest_subcategory, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          doc.name,
          doc.description,
          documentType,
          doc.category,
          doc.subCategory,
          fileType,
          filePath,
          doc.url,
          doc.name,
          doc.category,
          doc.subCategory,
          1,
        ],
      });

      stats.inserted++;
      stats.byType[documentType] = (stats.byType[documentType] || 0) + 1;
      stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;

    } catch (error) {
      stats.errors++;
      console.error(`Error importing "${doc.name}":`, error);
    }
  }

  // Print summary
  console.log('=' .repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total documents in manifest: ${documents.length}`);
  console.log(`Successfully inserted: ${stats.inserted}`);
  console.log(`Skipped (duplicates): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  console.log('\nBy Document Type:');
  Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  console.log('\nBy Category:');
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`  ${category.substring(0, 50)}: ${count}`);
    });

  console.log('\n✅ Import complete!');
}

importManifest().catch(console.error);
