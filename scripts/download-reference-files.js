#!/usr/bin/env node

/**
 * Download reference materials from Google Cloud Storage
 * These large files are not stored in git to keep the repository lightweight
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GCS_BASE = 'https://storage.googleapis.com/ledesign-reference-materials';

const files = [
  {
    name: 'HEC-RAS_2D_Users_Manual_v6.6.pdf',
    path: 'docs/reference-software/hec-ras',
    url: 'hec-ras/HEC-RAS_2D_Users_Manual_v6.6.pdf'
  },
  {
    name: 'HEC-RAS_Users_Manual_v6.4.1.pdf',
    path: 'docs/reference-software/hec-ras',
    url: 'hec-ras/HEC-RAS_Users_Manual_v6.4.1.pdf'
  },
  {
    name: 'HEC-RAS_Applications_Guide_v5.0.pdf',
    path: 'docs/reference-software/hec-ras',
    url: 'hec-ras/HEC-RAS_Applications_Guide_v5.0.pdf'
  },
  {
    name: 'HEC-RAS_Hydraulic_Reference_Manual_v6.5.pdf',
    path: 'docs/reference-software/hec-ras',
    url: 'hec-ras/HEC-RAS_Hydraulic_Reference_Manual_v6.5.pdf'
  }
];

async function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const totalBytes = parseInt(response.headers['content-length'], 10);
        let downloadedBytes = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r  Progress: ${percent}%`);
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          process.stdout.write('\r  Progress: 100.0%\n');
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('📚 Downloading reference materials from GCS...\n');

  for (const file of files) {
    const dirPath = path.join(process.cwd(), file.path);
    const filePath = path.join(dirPath, file.name);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${file.name} (already exists)`);
      continue;
    }

    console.log(`📥 Downloading ${file.name}...`);

    try {
      const url = `${GCS_BASE}/${file.url}`;
      await downloadFile(url, filePath);
      console.log(`✓ ${file.name}\n`);
    } catch (error) {
      console.error(`❌ Failed to download ${file.name}: ${error.message}`);
      process.exit(1);
    }
  }

  console.log('✅ Reference materials downloaded successfully!\n');
  console.log('Total size: ~166 MB');
  console.log('Location: docs/reference-software/hec-ras/');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
