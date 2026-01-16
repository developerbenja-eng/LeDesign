#!/usr/bin/env node
/**
 * Setup environment variables from Google Cloud
 * Run this script when you clone the repo in Claude Code web
 *
 * Usage: node scripts/setup-env.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up LeDesign environment...\n');

const envPath = path.join(__dirname, '..', '.env');

// Check if .env already exists
if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists. Skipping...');
    console.log('   Delete .env if you want to regenerate it.\n');
    process.exit(0);
}

console.log('📝 Creating .env file...');

try {
    // Retrieve API key from Google Cloud
    console.log('🔑 Retrieving Google Gemini API key from Google Cloud...');

    const apiKey = execSync(
        'gcloud services api-keys get-key-string projects/949566702282/locations/global/keys/2721dcc2-f040-4c07-ac19-4212ed055854 --format="value(keyString)"',
        { encoding: 'utf-8' }
    ).trim();

    if (!apiKey) {
        throw new Error('Failed to retrieve API key');
    }

    // Get project ID
    const projectId = execSync(
        'gcloud config get-value project',
        { encoding: 'utf-8' }
    ).trim();

    // Create .env file
    const envContent = `# Google Gemini API Configuration
GOOGLE_GEMINI_API_KEY=${apiKey}

# Google Cloud Project
GCP_PROJECT_ID=${projectId}

# Development
NODE_ENV=development
`;

    fs.writeFileSync(envPath, envContent);

    console.log('✅ .env file created successfully!');
    console.log(`   - Google Gemini API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);
    console.log(`   - GCP Project: ${projectId}\n`);
    console.log('🚀 Environment setup complete! Run: npm install && npm run dev\n');

} catch (error) {
    console.error('❌ Error setting up environment:');
    console.error(`   ${error.message}\n`);
    console.error('Make sure you\'re authenticated with Google Cloud:');
    console.error('   gcloud auth login\n');
    process.exit(1);
}
