import { NextRequest, NextResponse } from 'next/server';
import { getDb, query, queryOne } from '@ledesign/db';
import type { TestRun, TestResult, TestVerification, ModuleSummary } from '@/types/validation';

export const dynamic = 'force-dynamic';

interface DbTestResult {
  id: string;
  run_id: string;
  module: string;
  suite: string;
  test_name: string;
  status: string;
  duration_ms: number;
  error_message: string | null;
  error_stack: string | null;
  expected_value: string | null;
  actual_value: string | null;
  tolerance: string | null;
  formula: string | null;
  reference_standard: string | null;
  reference_example: string | null;
  input_parameters: string | null;
  file_path: string | null;
  line_number: number | null;
  created_at: string;
}

/**
 * GET /api/validation/runs/[id]
 *
 * Get details for a specific test run including all results and verifications
 *
 * Query params:
 * - module: Filter by module name
 * - status: Filter by status (passed/failed/skipped/all)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');
    const status = searchParams.get('status');

    const db = getDb();

    // Get run details
    const run = await queryOne<TestRun>(db, `SELECT * FROM test_runs WHERE id = ?`, [id]);

    if (!run) {
      return NextResponse.json({ error: 'Test run not found' }, { status: 404 });
    }

    // Build results query with filters
    let sql = `SELECT * FROM test_results WHERE run_id = ?`;
    const args: (string | number)[] = [id];

    if (module) {
      sql += ` AND module = ?`;
      args.push(module);
    }

    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      args.push(status);
    }

    sql += ` ORDER BY module, suite, test_name`;

    const results = await query<DbTestResult>(db, sql, args);

    // Get verifications for all results
    const resultIds = results.map((r) => r.id);
    let verifications: TestVerification[] = [];

    if (resultIds.length > 0) {
      const placeholders = resultIds.map(() => '?').join(',');
      verifications = await query<TestVerification>(
        db,
        `SELECT * FROM test_verifications WHERE test_result_id IN (${placeholders}) ORDER BY verification_date DESC`,
        resultIds
      );
    }

    // Attach verifications to results and parse JSON fields
    const resultsWithVerifications: TestResult[] = results.map((result) => {
      const resultVerifications = verifications.filter((v) => v.test_result_id === result.id);
      return {
        ...result,
        status: result.status as 'passed' | 'failed' | 'skipped',
        expected_value: result.expected_value ? JSON.parse(result.expected_value) : null,
        actual_value: result.actual_value ? JSON.parse(result.actual_value) : null,
        input_parameters: result.input_parameters ? JSON.parse(result.input_parameters) : null,
        verifications: resultVerifications,
        verification_count: resultVerifications.length,
        latest_verification: resultVerifications[0] || null,
      };
    });

    // Calculate module summaries
    const moduleSummaries = calculateModuleSummaries(resultsWithVerifications);

    return NextResponse.json({
      success: true,
      run: {
        ...run,
        metadata: run.metadata ? JSON.parse(run.metadata as unknown as string) : null,
      },
      results: resultsWithVerifications,
      modules: moduleSummaries,
    });
  } catch (error) {
    console.error('Error fetching test run:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch test run',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function calculateModuleSummaries(results: TestResult[]): ModuleSummary[] {
  const modules = new Map<string, ModuleSummary>();

  for (const result of results) {
    if (!modules.has(result.module)) {
      modules.set(result.module, {
        module: result.module,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        verified: 0,
        pass_rate: 0,
      });
    }

    const summary = modules.get(result.module)!;
    summary.total++;
    if (result.status === 'passed') summary.passed++;
    if (result.status === 'failed') summary.failed++;
    if (result.status === 'skipped') summary.skipped++;
    if (result.verification_count && result.verification_count > 0) summary.verified++;
  }

  // Calculate pass rates
  modules.forEach((summary) => {
    summary.pass_rate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
  });

  return Array.from(modules.values()).sort((a, b) => a.module.localeCompare(b.module));
}
