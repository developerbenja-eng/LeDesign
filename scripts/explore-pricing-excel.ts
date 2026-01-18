/**
 * Explore pricing Excel files to understand their structure
 * Run with: npx tsx scripts/explore-pricing-excel.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const excelDir = path.join(process.cwd(), 'minvu-docs', 'Excel');

// Files likely to contain pricing data
const pricingFiles = [
  'Form.Pres.OficialEstimativo_tipo.xlsx',
  'PRESUPUESTO_SERVIU.xls',
  'PPP_Presupuesto-SEREMI.xls',
];

function exploreWorkbook(filePath: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`FILE: ${path.basename(filePath)}`);
  console.log('='.repeat(70));

  if (!fs.existsSync(filePath)) {
    console.log('  ❌ File not found');
    return;
  }

  try {
    const workbook = XLSX.readFile(filePath);

    console.log(`\nSheets: ${workbook.SheetNames.join(', ')}`);

    for (const sheetName of workbook.SheetNames) {
      console.log(`\n--- Sheet: "${sheetName}" ---`);
      const sheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      console.log(`Range: ${sheet['!ref']} (${range.e.r + 1} rows x ${range.e.c + 1} cols)`);

      // Get first 15 rows as JSON to understand structure
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      console.log('\nFirst 15 rows:');

      data.slice(0, 15).forEach((row: any, i: number) => {
        const rowStr = row.map((cell: any) => {
          if (cell === null || cell === undefined || cell === '') return '';
          const str = String(cell).trim();
          return str.length > 30 ? str.substring(0, 27) + '...' : str;
        }).join(' | ');
        console.log(`  [${i + 1}] ${rowStr}`);
      });

      // Look for pricing patterns
      console.log('\n  Looking for pricing columns...');
      const headerRow = data[0] as any[];
      if (headerRow) {
        headerRow.forEach((cell, col) => {
          const cellStr = String(cell).toLowerCase();
          if (cellStr.includes('precio') || cellStr.includes('valor') ||
              cellStr.includes('costo') || cellStr.includes('unitario') ||
              cellStr.includes('uf') || cellStr.includes('clp') ||
              cellStr.includes('monto') || cellStr.includes('item')) {
            console.log(`    Column ${col} (${XLSX.utils.encode_col(col)}): "${cell}"`);
          }
        });
      }
    }
  } catch (error) {
    console.log(`  ❌ Error reading file: ${error}`);
  }
}

console.log('Exploring pricing Excel files...\n');

for (const file of pricingFiles) {
  exploreWorkbook(path.join(excelDir, file));
}

// Also check Plan_de_ensayes.xls for test specifications
console.log('\n\nAlso checking Plan_de_ensayes.xls for test specs...');
exploreWorkbook(path.join(excelDir, 'Plan_de_ensayes.xls'));
