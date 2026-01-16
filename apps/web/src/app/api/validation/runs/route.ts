import { NextRequest, NextResponse } from 'next/server';
import { getDb, query, execute } from '@ledesign/db';
import { generateId } from '@/lib/utils';
import type { TestRun, CreateTestRunRequest } from '@/types/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/validation/runs
 *
 * List all test runs with optional filtering
 *
 * Query params:
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset (default: 0)
 * - branch: Filter by git branch
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const branch = searchParams.get('branch');

    const db = getDb();
    let sql = `SELECT * FROM test_runs`;
    const args: (string | number)[] = [];

    if (branch) {
      sql += ` WHERE branch = ?`;
      args.push(branch);
    }

    sql += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const runs = await query<TestRun>(db, sql, args);

    // Parse JSON metadata
    const parsedRuns = runs.map((run) => ({
      ...run,
      metadata: run.metadata ? JSON.parse(run.metadata as unknown as string) : null,
    }));

    return NextResponse.json({ success: true, runs: parsedRuns });
  } catch (error) {
    console.error('Error fetching test runs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch test runs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/validation/runs
 *
 * Create new test run with results
 *
 * Request body:
 * {
 *   "commit_sha": "abc123",
 *   "branch": "main",
 *   "trigger": "ci",
 *   "environment": "ci",
 *   "metadata": { ... },
 *   "results": [ ... ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateTestRunRequest = await request.json();
    const db = getDb();

    const runId = generateId();
    const now = new Date().toISOString();

    // Calculate aggregates
    const total = body.results.length;
    const passed = body.results.filter((r) => r.status === 'passed').length;
    const failed = body.results.filter((r) => r.status === 'failed').length;
    const skipped = body.results.filter((r) => r.status === 'skipped').length;
    const duration = body.results.reduce((sum, r) => sum + (r.duration_ms || 0), 0);

    // Insert test run
    await execute(
      db,
      `INSERT INTO test_runs (
        id, timestamp, commit_sha, branch, trigger, environment,
        total_tests, passed, failed, skipped, duration_ms, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        runId,
        now,
        body.commit_sha || null,
        body.branch || null,
        body.trigger || 'manual',
        body.environment || 'development',
        total,
        passed,
        failed,
        skipped,
        duration,
        body.metadata ? JSON.stringify(body.metadata) : null,
        now,
      ]
    );

    // Insert all test results
    for (const result of body.results) {
      const resultId = generateId();
      await execute(
        db,
        `INSERT INTO test_results (
          id, run_id, module, suite, test_name, status, duration_ms,
          error_message, error_stack, expected_value, actual_value,
          tolerance, formula, reference_standard, reference_example,
          input_parameters, file_path, line_number, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resultId,
          runId,
          result.module,
          result.suite,
          result.test_name,
          result.status,
          result.duration_ms || 0,
          result.error_message || null,
          result.error_stack || null,
          result.expected_value !== undefined ? JSON.stringify(result.expected_value) : null,
          result.actual_value !== undefined ? JSON.stringify(result.actual_value) : null,
          result.tolerance || null,
          result.formula || null,
          result.reference_standard || null,
          result.reference_example || null,
          result.input_parameters ? JSON.stringify(result.input_parameters) : null,
          result.file_path || null,
          result.line_number || null,
          now,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      run: { id: runId, total, passed, failed, skipped },
    });
  } catch (error) {
    console.error('Error creating test run:', error);
    return NextResponse.json(
      {
        error: 'Failed to create test run',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
