#!/usr/bin/env npx tsx
/**
 * Upload Test Results to Validation Dashboard
 *
 * Reads the latest test results from .validation-results/vitest-results.json
 * and uploads them to the validation API.
 *
 * Usage:
 *   npx tsx scripts/upload-test-results.ts
 *
 * Environment variables:
 *   VALIDATION_API_URL - Base URL for the API (default: http://localhost:3000)
 *   CI_COMMIT_SHA      - Git commit SHA (optional, auto-detected)
 *   CI_BRANCH          - Git branch name (optional, auto-detected)
 *   CI_ENVIRONMENT     - Environment name (default: development)
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

// Vitest JSON output types
interface VitestAssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: 'passed' | 'failed' | 'pending';
  title: string;
  duration: number;
  failureMessages: string[];
}

interface VitestTestResult {
  name: string;
  assertionResults: VitestAssertionResult[];
}

interface VitestReport {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  startTime: number;
  testResults: VitestTestResult[];
}

interface TestResultInput {
  module: string;
  suite: string;
  test_name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error_message?: string;
  file_path?: string;
}

// Configuration
const API_URL = process.env.VALIDATION_API_URL || 'http://localhost:3000';
const RESULTS_PATH = join(process.cwd(), '.validation-results/vitest-results.json');

// Extract module name from file path
function extractModule(filePath: string): string {
  const match = filePath.match(/validation\/(.+)\.test\.ts$/);
  if (match) {
    return match[1]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return 'Unknown';
}

// Get git info
function getGitInfo(): { commitSha?: string; branch?: string } {
  try {
    const commitSha = process.env.CI_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

    const branch = process.env.CI_BRANCH ||
      process.env.GITHUB_REF_NAME ||
      execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

    return { commitSha, branch };
  } catch {
    console.warn('Could not get git info');
    return {};
  }
}

// Determine trigger type
function getTrigger(): 'ci' | 'manual' | 'scheduled' {
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    return process.env.SCHEDULE ? 'scheduled' : 'ci';
  }
  return 'manual';
}

// Convert Vitest report to our format
function convertVitestReport(vitestReport: VitestReport): TestResultInput[] {
  const results: TestResultInput[] = [];

  for (const testResult of vitestReport.testResults) {
    const module = extractModule(testResult.name);

    for (const assertion of testResult.assertionResults) {
      const suite = assertion.ancestorTitles.join(' > ');
      const status: 'passed' | 'failed' | 'skipped' =
        assertion.status === 'passed' ? 'passed' :
        assertion.status === 'failed' ? 'failed' : 'skipped';

      results.push({
        module,
        suite,
        test_name: assertion.title,
        status,
        duration_ms: Math.round(assertion.duration),
        file_path: testResult.name,
        ...(assertion.failureMessages.length > 0 && {
          error_message: assertion.failureMessages.join('\n'),
        }),
      });
    }
  }

  return results;
}

async function uploadResults() {
  // Check if results file exists
  if (!existsSync(RESULTS_PATH)) {
    console.error(`❌ Results file not found: ${RESULTS_PATH}`);
    console.error('   Run tests first: npm run test:run');
    process.exit(1);
  }

  // Read and parse Vitest results
  const content = readFileSync(RESULTS_PATH, 'utf-8');
  const vitestReport: VitestReport = JSON.parse(content);

  // Convert to our format
  const results = convertVitestReport(vitestReport);
  const duration_ms = Date.now() - vitestReport.startTime;

  console.log('📊 Test Results Summary:');
  console.log(`   Total: ${vitestReport.numTotalTests}`);
  console.log(`   Passed: ${vitestReport.numPassedTests}`);
  console.log(`   Failed: ${vitestReport.numFailedTests}`);
  console.log(`   Skipped: ${vitestReport.numPendingTests}`);
  console.log(`   Duration: ${(duration_ms / 1000).toFixed(2)}s`);

  // Get git info
  const { commitSha, branch } = getGitInfo();
  const trigger = getTrigger();
  const environment = process.env.CI_ENVIRONMENT || 'development';

  // Prepare payload
  const payload = {
    timestamp: new Date().toISOString(),
    commit_sha: commitSha,
    branch,
    trigger,
    environment,
    total_tests: vitestReport.numTotalTests,
    passed: vitestReport.numPassedTests,
    failed: vitestReport.numFailedTests,
    skipped: vitestReport.numPendingTests,
    duration_ms,
    results,
  };

  console.log('\n🚀 Uploading to validation dashboard...');
  console.log(`   API: ${API_URL}/api/validation/runs`);
  console.log(`   Commit: ${commitSha || 'N/A'}`);
  console.log(`   Branch: ${branch || 'N/A'}`);
  console.log(`   Trigger: ${trigger}`);
  console.log(`   Environment: ${environment}`);

  try {
    const response = await fetch(`${API_URL}/api/validation/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API returned ${response.status}: ${error}`);
    }

    const result = await response.json();

    console.log('\n✅ Upload successful!');
    console.log(`   Run ID: ${result.run.id}`);
    console.log(`   Results uploaded: ${result.results_count}`);
    console.log(`\n   View at: ${API_URL}/validation?run=${result.run.id}`);
  } catch (error) {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  }
}

uploadResults();
