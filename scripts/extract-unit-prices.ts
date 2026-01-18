/**
 * Extract unit prices from SERVIU budget spreadsheet
 * Run with: npx tsx scripts/extract-unit-prices.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@libsql/client';

const excelDir = path.join(process.cwd(), 'minvu-docs', 'Excel');

interface ExtractedPrice {
  code: string;
  description: string;
  unit: string;
  price_uf: number | null;
}

function extractPricesFromServiu(): ExtractedPrice[] {
  const filePath = path.join(excelDir, 'PRESUPUESTO_SERVIU.xls');
  console.log(`\nReading: ${path.basename(filePath)}`);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['PRECIOS'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

  console.log(`Total rows: ${data.length}`);

  // Find header row (should have ITEM, DESIGNACIÓN, UNIDAD, P.U.)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    const rowText = row.join(' ').toLowerCase();
    if (rowText.includes('item') && rowText.includes('designación') && rowText.includes('unidad')) {
      headerRowIdx = i;
      console.log(`Found header at row ${i + 1}: ${row.slice(0, 10).join(' | ')}`);
      break;
    }
  }

  if (headerRowIdx === -1) {
    console.log('Could not find header row, scanning all rows...');
    // Print first 30 rows to understand structure
    for (let i = 0; i < Math.min(30, data.length); i++) {
      const row = data[i].filter(c => c !== '');
      if (row.length > 0) {
        console.log(`[${i + 1}] ${row.slice(0, 6).join(' | ')}`);
      }
    }
    return [];
  }

  const prices: ExtractedPrice[] = [];
  let currentCategory = '';

  // Process rows after header
  for (let i = headerRowIdx + 2; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue;
    }

    // Get cell values
    const itemCol = row[0];
    const descCol = row[2] || row[1]; // DESIGNACIÓN can be in col 2 or 3
    const unitCol = row[5]; // UNIDAD
    const priceCol = row[7]; // P.U. (U.F)

    // Check if this is a category header (no item number, just text)
    if (typeof descCol === 'string' && descCol.trim() !== '' && !itemCol) {
      const text = descCol.trim().toUpperCase();
      // Category headers are typically short all-caps lines
      if (text.length < 50 && text.length > 3) {
        currentCategory = text;
        console.log(`\nCategory: ${currentCategory}`);
        continue;
      }
    }

    // Check if this is a price row (has item number or description with unit and price)
    if (typeof descCol === 'string' && descCol.trim() !== '' && unitCol) {
      const description = descCol.trim();
      const unit = String(unitCol).trim();
      const priceUf = typeof priceCol === 'number' ? priceCol : null;

      // Generate code from item number or description
      let code = '';
      if (itemCol && !isNaN(Number(itemCol))) {
        code = `SRV-${String(itemCol).padStart(3, '0')}`;
      } else if (itemCol && typeof itemCol === 'string') {
        code = `SRV-${itemCol.trim().replace(/\s+/g, '-').toUpperCase()}`;
      } else {
        // Generate from description
        const words = description.split(' ').slice(0, 3).join('-').toUpperCase();
        code = `SRV-${words.substring(0, 20)}`;
      }

      if (description.length > 5 && unit) {
        prices.push({
          code,
          description: currentCategory ? `[${currentCategory}] ${description}` : description,
          unit,
          price_uf: priceUf,
        });
      }
    }
  }

  return prices;
}

// Also check the PDF for complementary prices
function exploreFormPresupuesto(): void {
  const filePath = path.join(excelDir, 'Form.Pres.OficialEstimativo_tipo.xlsx');
  console.log(`\n\nExploring: ${path.basename(filePath)}`);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['PRES'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

  console.log('\nRows with data:');
  let inDataSection = false;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowFiltered = row.filter(c => c !== '' && c !== null && c !== undefined);

    if (rowFiltered.length === 0) continue;

    // Check for header row
    const rowText = row.join(' ');
    if (rowText.includes('ITEM') && rowText.includes('DESIGNACIÓN')) {
      inDataSection = true;
      console.log(`\nHeader found at row ${i + 1}`);
      console.log('Columns:', row.slice(0, 6).map((c, idx) => `${idx}:${c}`).join(' | '));
      continue;
    }

    if (inDataSection && rowFiltered.length >= 2) {
      // Print first 50 data rows
      if (i < 160) {
        console.log(`[${i + 1}] ${row.slice(0, 6).join(' | ')}`);
      }
    }
  }
}

async function saveToDatabase(prices: ExtractedPrice[]) {
  console.log(`\n\nSaving ${prices.length} prices to database...`);

  const db = createClient({
    url: 'file:local.db',
  });

  // Ensure table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS unit_prices (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      description_es TEXT NOT NULL,
      description_en TEXT,
      unit TEXT NOT NULL,
      price_uf REAL,
      price_clp INTEGER,
      price_date TEXT,
      source TEXT,
      source_document TEXT,
      ordinance_number TEXT,
      valid_from TEXT,
      valid_until TEXT,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      tags_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_unit_prices_code ON unit_prices(code)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_unit_prices_category ON unit_prices(category)`);

  let inserted = 0;
  let skipped = 0;

  for (const price of prices) {
    try {
      // Check if exists
      const existing = await db.execute({
        sql: 'SELECT id FROM unit_prices WHERE code = ?',
        args: [price.code],
      });

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Determine category from description prefix like [CATEGORY]
      let category = 'general';
      let description = price.description;
      const categoryMatch = price.description.match(/^\[([^\]]+)\]\s*/);
      if (categoryMatch) {
        category = categoryMatch[1].toLowerCase().replace(/\s+/g, '_');
        description = price.description.replace(/^\[[^\]]+\]\s*/, '');
      }

      const id = `price_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await db.execute({
        sql: `INSERT INTO unit_prices (
          id, code, category, description_es, unit, price_uf, source, source_document, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          price.code,
          category,
          description,
          price.unit,
          price.price_uf,
          'SERVIU Metropolitano',
          'PRESUPUESTO_SERVIU.xls',
          1,
        ],
      });

      inserted++;
    } catch (error) {
      console.error(`Error inserting ${price.code}:`, error);
    }
  }

  console.log(`\nInserted: ${inserted}`);
  console.log(`Skipped (duplicates): ${skipped}`);
}

async function main() {
  console.log('Extracting Unit Prices from SERVIU spreadsheets...\n');

  // Extract prices from PRESUPUESTO_SERVIU.xls
  const prices = extractPricesFromServiu();

  console.log(`\n\nExtracted ${prices.length} unit prices:`);
  prices.slice(0, 20).forEach(p => {
    console.log(`  ${p.code}: ${p.description.substring(0, 50)}... [${p.unit}] = ${p.price_uf ?? 'N/A'} UF`);
  });

  // Explore the form template too
  exploreFormPresupuesto();

  // Save to database
  if (prices.length > 0) {
    await saveToDatabase(prices);
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
