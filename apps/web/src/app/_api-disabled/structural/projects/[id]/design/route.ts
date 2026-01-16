import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import {
  runAISCDesignChecks,
  runACIWallDesignChecks,
  runACISlabDesignChecks,
  runTMSWallDesignChecks,
} from '@ledesign/structural/design';
import {
  DesignResult,
  designResultRowToDesignResult,
  DesignResultRow,
} from '@ledesign/structural';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function verifyProjectOwnership(projectId: string, userId: string) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id FROM structural_projects WHERE id = ? AND created_by = ?`,
    args: [projectId, userId],
  });
  return result.rows.length > 0;
}

// GET /api/structural/projects/[id]/design - Get design results
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const analysisRunId = url.searchParams.get('analysis_run_id');
    const elementId = url.searchParams.get('element_id');
    const passedOnly = url.searchParams.get('passed_only') === 'true';
    const failedOnly = url.searchParams.get('failed_only') === 'true';

    const db = getDb();
    let sql = `SELECT dr.* FROM design_results dr
               JOIN analysis_runs ar ON dr.analysis_run_id = ar.id
               WHERE ar.project_id = ?`;
    const args: (string | number)[] = [projectId];

    if (analysisRunId) {
      sql += ` AND dr.analysis_run_id = ?`;
      args.push(analysisRunId);
    }

    if (elementId) {
      sql += ` AND dr.element_id = ?`;
      args.push(elementId);
    }

    if (passedOnly) {
      sql += ` AND dr.passed = 1`;
    } else if (failedOnly) {
      sql += ` AND dr.passed = 0`;
    }

    sql += ` ORDER BY dr.dc_ratio DESC`;

    const result = await db.execute({ sql, args });

    const designResults = result.rows.map((row) =>
      designResultRowToDesignResult(row as unknown as DesignResultRow)
    );

    // Calculate summary statistics
    const total = designResults.length;
    const passed = designResults.filter(r => r.status === 'pass').length;
    const failed = designResults.filter(r => r.status === 'fail').length;
    const warnings = designResults.filter(r => r.status === 'warning').length;
    const maxDCRatio = Math.max(...designResults.map(r => r.demand_capacity_ratio), 0);
    const avgDCRatio = total > 0 ? designResults.reduce((sum, r) => sum + r.demand_capacity_ratio, 0) / total : 0;

    return NextResponse.json({
      designResults,
      summary: {
        total,
        passed,
        failed,
        warnings,
        passRate: total > 0 ? (passed / total * 100).toFixed(1) + '%' : 'N/A',
        maxDCRatio: maxDCRatio.toFixed(3),
        avgDCRatio: avgDCRatio.toFixed(3),
      },
    });
  } catch (error) {
    console.error('Error fetching design results:', error);
    return NextResponse.json({ error: 'Failed to fetch design results' }, { status: 500 });
  }
}

// POST /api/structural/projects/[id]/design - Run design checks
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { analysis_run_id, design_code } = body as {
      analysis_run_id: string;
      design_code?: string;
    };

    if (!analysis_run_id) {
      return NextResponse.json({ error: 'analysis_run_id is required' }, { status: 400 });
    }

    const db = getDb();

    // Verify analysis run exists and is completed
    const runResult = await db.execute({
      sql: `SELECT * FROM analysis_runs WHERE id = ? AND project_id = ?`,
      args: [analysis_run_id, projectId],
    });

    if (runResult.rows.length === 0) {
      return NextResponse.json({ error: 'Analysis run not found' }, { status: 404 });
    }

    const analysisRun = runResult.rows[0] as any;
    if (analysisRun.status !== 'completed') {
      return NextResponse.json(
        { error: 'Analysis must be completed before running design checks' },
        { status: 400 }
      );
    }

    // Clear any existing design results for this run
    await db.execute({
      sql: `DELETE FROM design_results WHERE run_id = ?`,
      args: [analysis_run_id],
    });

    // Run design checks based on code (or auto-detect)
    let designResults: DesignResult[] = [];

    const code = design_code || 'auto';  // Default to auto-detect

    // Run AISC for steel frame elements
    if (code === 'auto' || code.includes('AISC')) {
      const aiscResults = await runAISCDesignChecks(projectId, analysis_run_id);
      designResults = [...designResults, ...aiscResults];
    }

    // Run ACI for concrete walls and slabs
    if (code === 'auto' || code.includes('ACI')) {
      const aciWallResults = await runACIWallDesignChecks(projectId, analysis_run_id);
      const aciSlabResults = await runACISlabDesignChecks(projectId, analysis_run_id);
      designResults = [...designResults, ...aciWallResults, ...aciSlabResults];
    }

    // Run TMS for masonry walls
    if (code === 'auto' || code.includes('TMS')) {
      const tmsResults = await runTMSWallDesignChecks(projectId, analysis_run_id);
      designResults = [...designResults, ...tmsResults];
    }

    if (designResults.length === 0) {
      return NextResponse.json(
        { error: 'No elements found to design or unsupported material types' },
        { status: 400 }
      );
    }

    // Calculate summary
    const total = designResults.length;
    const passed = designResults.filter(r => r.status === 'pass').length;
    const failed = designResults.filter(r => r.status === 'fail').length;
    const warnings = designResults.filter(r => r.status === 'warning').length;

    return NextResponse.json({
      message: 'Design checks completed',
      designResults,
      summary: {
        total,
        passed,
        failed,
        warnings,
        passRate: total > 0 ? (passed / total * 100).toFixed(1) + '%' : 'N/A',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error running design checks:', error);
    return NextResponse.json({ error: 'Failed to run design checks' }, { status: 500 });
  }
}

// DELETE /api/structural/projects/[id]/design?analysis_run_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const analysisRunId = url.searchParams.get('analysis_run_id');

    if (!analysisRunId) {
      return NextResponse.json({ error: 'analysis_run_id is required' }, { status: 400 });
    }

    const db = getDb();
    await db.execute({
      sql: `DELETE FROM design_results WHERE run_id = ?`,
      args: [analysisRunId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting design results:', error);
    return NextResponse.json({ error: 'Failed to delete design results' }, { status: 500 });
  }
}
