#!/usr/bin/env node

/**
 * LeDesign Onboarding Script
 *
 * Runs all setup steps in sequence:
 * 1. Install dependencies
 * 2. Setup environment (API keys from Google Cloud)
 * 3. Download reference materials from GCS
 * 4. Verify configuration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execStep(command, description) {
  log(`\n${description}`, colors.cyan);
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    log(`✓ ${description} - Complete`, colors.green);
    return true;
  } catch (error) {
    log(`✗ ${description} - Failed`, colors.red);
    return false;
  }
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✓' : '✗';
  const color = exists ? colors.green : colors.yellow;
  log(`  ${status} ${description}`, color);
  return exists;
}

async function main() {
  log('\n╔════════════════════════════════════════╗', colors.bright);
  log('║   LeDesign Onboarding Script          ║', colors.bright);
  log('╚════════════════════════════════════════╝\n', colors.bright);

  log('This script will:', colors.cyan);
  log('  1. Install dependencies (npm install)');
  log('  2. Setup environment variables (API keys)');
  log('  3. Download reference materials from GCS');
  log('  4. Verify configuration\n');

  // Step 1: Install dependencies
  const step1 = execStep('npm install', '📦 Step 1/3: Installing dependencies');
  if (!step1) {
    log('\n❌ Failed to install dependencies. Please check the error above.', colors.red);
    process.exit(1);
  }

  // Step 2: Setup environment
  log('\n🔑 Step 2/3: Setting up environment', colors.cyan);
  log('  This requires Google Cloud CLI (gcloud) to be installed and authenticated.', colors.yellow);
  log('  If you don\'t have access, you can skip this step and get the .env file from a team member.\n', colors.yellow);

  const step2 = execStep('npm run setup', '  Running npm run setup');
  if (!step2) {
    log('\n⚠️  Environment setup failed. This is normal if you don\'t have Google Cloud access.', colors.yellow);
    log('  Ask a team member for the .env file and place it in the root directory.\n', colors.yellow);
  }

  // Step 3: Download reference materials
  const step3 = execStep('npm run download:refs', '📥 Step 3/3: Downloading reference materials (166 MB)');
  if (!step3) {
    log('\n❌ Failed to download reference materials. Please check your internet connection.', colors.red);
    process.exit(1);
  }

  // Step 4: Verification
  log('\n🔍 Verification', colors.cyan);
  log('  Checking configuration...', colors.blue);

  const checks = {
    nodeModules: checkFile('node_modules', 'Dependencies installed'),
    env: checkFile('.env', 'Environment file (.env)'),
    hecRas1: checkFile('docs/reference-software/hec-ras/HEC-RAS_2D_Users_Manual_v6.6.pdf', 'HEC-RAS manuals downloaded'),
  };

  const allChecks = Object.values(checks).every(Boolean);

  log(''); // Empty line

  if (allChecks) {
    log('╔════════════════════════════════════════╗', colors.green);
    log('║   ✓ Onboarding Complete!              ║', colors.green);
    log('╚════════════════════════════════════════╝', colors.green);
    log('\nYou\'re ready to start development:', colors.green);
    log('  npm run dev\n', colors.bright);
  } else {
    log('╔════════════════════════════════════════╗', colors.yellow);
    log('║   ⚠ Onboarding Partially Complete     ║', colors.yellow);
    log('╚════════════════════════════════════════╝', colors.yellow);

    if (!checks.env) {
      log('\nMissing .env file:', colors.yellow);
      log('  Ask a team member for the .env file or run:');
      log('  npm run setup', colors.bright);
      log('  (requires Google Cloud CLI access)\n');
    }

    log('You can still start development with limited features:', colors.yellow);
    log('  npm run dev\n', colors.bright);
  }

  log('For more information, see:', colors.cyan);
  log('  README.md - Quick start guide');
  log('  CLAUDE.md - Development instructions');
  log('  docs/reference-software/README.md - Reference materials info\n');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
