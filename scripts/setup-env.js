#!/usr/bin/env node
/**
 * Setup environment variables from Google Cloud Storage
 * Fetches complete .env file and service account keys from gs://ledesign-config/
 *
 * Usage: node scripts/setup-env.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_BUCKET = 'gs://ledesign-config';
const ENVIRONMENT = process.env.LEDESIGN_ENV || 'development';

console.log('🔧 Setting up LeDesign environment...\n');

const envPath = path.join(__dirname, '..', '.env');
const serviceAccountPath = path.join(__dirname, '..', 'earthengine-sa-key.json');

// Check if .env already exists
if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists.');
    console.log('   Delete .env if you want to fetch latest from GCS.\n');
    process.exit(0);
}

console.log(`📦 Fetching configuration from Google Cloud Storage...`);
console.log(`   Bucket: ${CONFIG_BUCKET}`);
console.log(`   Environment: ${ENVIRONMENT}\n`);

try {
    // Check if gcloud is installed and authenticated
    console.log('🔐 Checking Google Cloud authentication...');
    const account = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { encoding: 'utf-8' }).trim();

    if (!account) {
        throw new Error('No active Google Cloud account found');
    }

    console.log(`   ✓ Authenticated as: ${account}`);

    // Fetch .env file from GCS
    console.log(`\n📥 Downloading environment variables...`);
    const envSource = `${CONFIG_BUCKET}/environments/${ENVIRONMENT}.env`;

    try {
        execSync(`gsutil cp ${envSource} ${envPath}`, { stdio: 'pipe' });
        console.log(`   ✓ Downloaded: ${ENVIRONMENT}.env`);
    } catch (error) {
        throw new Error(`Failed to download .env from ${envSource}\n   Make sure the file exists and you have access`);
    }

    // Fetch service account key from GCS
    console.log(`\n🔑 Downloading service account credentials...`);
    const serviceAccountSource = `${CONFIG_BUCKET}/service-accounts/earthengine-sa-key.json`;

    try {
        execSync(`gsutil cp ${serviceAccountSource} ${serviceAccountPath}`, { stdio: 'pipe' });
        console.log(`   ✓ Downloaded: earthengine-sa-key.json`);
    } catch (error) {
        console.log(`   ⚠️  Service account key not found (optional)`);
    }

    // Verify .env file
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n').filter(line => line && !line.startsWith('#'));
    const varCount = lines.length;

    console.log('\n✅ Environment setup complete!');
    console.log(`   - Configuration: ${ENVIRONMENT}`);
    console.log(`   - Variables loaded: ${varCount}`);
    console.log(`   - Location: .env\n`);

    console.log('🚀 Next steps:');
    console.log('   npm run download:refs  # Download reference materials');
    console.log('   npm run dev            # Start development server\n');

} catch (error) {
    console.error('\n❌ Error setting up environment:');
    console.error(`   ${error.message}\n`);
    console.error('Troubleshooting:');
    console.error('   1. Authenticate: gcloud auth login');
    console.error('   2. Set project: gcloud config set project ledesign');
    console.error('   3. Request access: Ask project owner for Storage Object Viewer role');
    console.error(`   4. Verify access: gsutil ls ${CONFIG_BUCKET}\n`);
    process.exit(1);
}
