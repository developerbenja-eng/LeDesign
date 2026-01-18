#!/usr/bin/env npx ts-node

/**
 * MINVU Normativas Document Scraper
 *
 * Downloads all documentation from the SERVIU Metropolitano Pavimentación website:
 * https://pavimentacion.metropolitana.minvu.cl/Normativas2.asp
 *
 * Usage:
 *   npx ts-node scripts/minvu-scraper.ts
 *   npx ts-node scripts/minvu-scraper.ts --list-only  # Just list files without downloading
 *   npx ts-node scripts/minvu-scraper.ts --output ./my-folder  # Custom output directory
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { fileURLToPath } from 'url';

const BASE_URL = 'https://pavimentacion.metropolitana.minvu.cl';
const PAGE_URL = `${BASE_URL}/Normativas2.asp`;
const DEFAULT_OUTPUT_DIR = './minvu-docs';

interface DocumentInfo {
  name: string;
  description: string;
  url: string;
  fileType: string;
  category: string;
  subCategory?: string;
}

/**
 * Fetch HTML content from URL
 */
async function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Download file from URL
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);

    protocol.get(url, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(outputPath);
          return downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
        }
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`Failed to download: ${res.statusCode}`));
        return;
      }

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
  });
}

/**
 * Parse document links from HTML
 */
function parseDocuments(html: string): DocumentInfo[] {
  const documents: DocumentInfo[] = [];

  // Extract window.open() URLs with document paths
  const windowOpenRegex = /window\.open\(['"]([^'"]+)['"]/g;
  const matches = html.matchAll(windowOpenRegex);

  // Track current section context
  let currentCategory = 'General';
  let currentSubCategory = '';

  // Split HTML by table rows to get context
  const rows = html.split(/<tr[^>]*>/gi);

  for (const row of rows) {
    // Check for category headers
    const h5Match = row.match(/<h5[^>]*>([^<]+)<\/h5>/i);
    const h6Match = row.match(/<h6[^>]*>([^<]+)<\/h6>/i);
    const h3Match = row.match(/<h3[^>]*>([^<]+)<\/h3>/i);

    if (h3Match) {
      currentCategory = h3Match[1].trim().replace(/<[^>]+>/g, '');
    }
    if (h5Match) {
      currentSubCategory = h5Match[1].trim().replace(/<[^>]+>/g, '');
    }
    if (h6Match) {
      currentSubCategory = h6Match[1].trim().replace(/<[^>]+>/g, '');
    }

    // Find document links in this row
    const docMatches = row.matchAll(/window\.open\(['"]([^'"]+)['"]/g);

    for (const docMatch of docMatches) {
      const docPath = docMatch[1];

      // Skip non-document URLs
      if (!docPath.startsWith('doc/') && !docPath.includes('.')) {
        continue;
      }

      // Extract description from the row
      const smallMatches = row.matchAll(/<small[^>]*>([^<]+)<\/small>/gi);
      let description = '';
      for (const smallMatch of smallMatches) {
        const text = smallMatch[1].trim();
        if (text && !text.includes('window.open')) {
          description = description ? `${description} - ${text}` : text;
        }
      }

      // Determine file type
      const ext = path.extname(docPath).toLowerCase();
      let fileType = 'unknown';
      if (ext === '.pdf') fileType = 'PDF';
      else if (ext === '.doc' || ext === '.docx') fileType = 'Word';
      else if (ext === '.xls' || ext === '.xlsx' || ext === '.xlsm') fileType = 'Excel';
      else if (ext === '.dwg') fileType = 'AutoCAD';
      else if (ext === '.zip') fileType = 'ZIP';

      // Build full URL
      const fullUrl = docPath.startsWith('http')
        ? docPath
        : `${BASE_URL}/${docPath}`;

      // Extract filename for name
      const fileName = path.basename(docPath);
      const name = description || decodeURIComponent(fileName).replace(/\+/g, ' ');

      documents.push({
        name: name.substring(0, 100),
        description,
        url: fullUrl,
        fileType,
        category: currentCategory,
        subCategory: currentSubCategory,
      });
    }
  }

  // Remove duplicates by URL
  const seen = new Set<string>();
  return documents.filter(doc => {
    if (seen.has(doc.url)) return false;
    seen.add(doc.url);
    return true;
  });
}

/**
 * Sanitize filename for filesystem
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200);
}

/**
 * Main scraper function
 */
async function scrapeMinvuDocuments(options: {
  outputDir?: string;
  listOnly?: boolean;
} = {}): Promise<DocumentInfo[]> {
  const { outputDir = DEFAULT_OUTPUT_DIR, listOnly = false } = options;

  console.log('Fetching MINVU Normativas page...');
  const html = await fetchPage(PAGE_URL);

  console.log('Parsing document links...');
  const documents = parseDocuments(html);

  console.log(`Found ${documents.length} documents\n`);

  // Group by category for display
  const byCategory = new Map<string, DocumentInfo[]>();
  for (const doc of documents) {
    const key = doc.subCategory ? `${doc.category} > ${doc.subCategory}` : doc.category;
    if (!byCategory.has(key)) {
      byCategory.set(key, []);
    }
    byCategory.get(key)!.push(doc);
  }

  // Display documents
  for (const [category, docs] of byCategory) {
    console.log(`\n📁 ${category}`);
    console.log('─'.repeat(60));
    for (const doc of docs) {
      const icon = {
        'PDF': '📕',
        'Word': '📘',
        'Excel': '📗',
        'AutoCAD': '📐',
        'ZIP': '📦',
      }[doc.fileType] || '📄';
      console.log(`  ${icon} [${doc.fileType}] ${doc.name}`);
    }
  }

  if (listOnly) {
    console.log('\n✅ List complete. Use without --list-only to download.');
    return documents;
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create subdirectories by file type
  const typeDirs = ['PDF', 'Word', 'Excel', 'AutoCAD', 'Other'];
  for (const dir of typeDirs) {
    const typePath = path.join(outputDir, dir);
    if (!fs.existsSync(typePath)) {
      fs.mkdirSync(typePath, { recursive: true });
    }
  }

  // Download documents
  console.log('\n\nDownloading documents...\n');

  let downloaded = 0;
  let failed = 0;

  for (const doc of documents) {
    const typeDir = ['PDF', 'Word', 'Excel', 'AutoCAD'].includes(doc.fileType)
      ? doc.fileType
      : 'Other';

    const ext = path.extname(doc.url) || `.${doc.fileType.toLowerCase()}`;
    const fileName = sanitizeFilename(path.basename(doc.url));
    const outputPath = path.join(outputDir, typeDir, fileName);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭️  Skipping (exists): ${fileName}`);
      downloaded++;
      continue;
    }

    try {
      process.stdout.write(`  ⬇️  Downloading: ${fileName.substring(0, 50)}...`);
      await downloadFile(doc.url, outputPath);
      console.log(' ✅');
      downloaded++;
    } catch (error) {
      console.log(` ❌ ${(error as Error).message}`);
      failed++;
    }

    // Small delay to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Output directory: ${path.resolve(outputDir)}`);

  // Save manifest
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(documents, null, 2));
  console.log(`📋 Manifest saved to: ${manifestPath}`);

  return documents;
}

/**
 * Export documents as JSON for use in the app
 */
async function exportDocumentIndex(outputPath: string): Promise<void> {
  console.log('Fetching MINVU Normativas page...');
  const html = await fetchPage(PAGE_URL);

  console.log('Parsing document links...');
  const documents = parseDocuments(html);

  fs.writeFileSync(outputPath, JSON.stringify(documents, null, 2));
  console.log(`\n✅ Exported ${documents.length} documents to ${outputPath}`);
}

// CLI - ESM compatible main check
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);
  const listOnly = args.includes('--list-only');
  const exportIndex = args.includes('--export-index');

  let outputDir = DEFAULT_OUTPUT_DIR;
  const outputIdx = args.indexOf('--output');
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    outputDir = args[outputIdx + 1];
  }

  if (exportIndex) {
    const exportPath = args[args.indexOf('--export-index') + 1] || './minvu-documents.json';
    exportDocumentIndex(exportPath).catch(console.error);
  } else {
    scrapeMinvuDocuments({ outputDir, listOnly }).catch(console.error);
  }
}

export { scrapeMinvuDocuments, parseDocuments, exportDocumentIndex };
export type { DocumentInfo };
