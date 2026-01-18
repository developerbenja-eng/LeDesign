import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/turso';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createAnalysisRun } from '@/lib/structural/factories';
import {
  AnalysisRun,
  AnalysisType,
  analysisRunRowToAnalysisRun,
  AnalysisRunRow,
} from '@/types/structural';

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

// GET /api/structural/projects/[id]/analysis - List all analysis runs
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const analysisType = url.searchParams.get('analysis_type');
    const status = url.searchParams.get('status');

    const db = getDb();
    let sql = `SELECT * FROM analysis_runs WHERE project_id = ?`;
    const args: (string | number)[] = [projectId];

    if (analysisType) {
      sql += ` AND analysis_type = ?`;
      args.push(analysisType);
    }

    if (status) {
      sql += ` AND status = ?`;
      args.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await db.execute({ sql, args });

    const analysisRuns = result.rows.map((row) =>
      analysisRunRowToAnalysisRun(row as unknown as AnalysisRunRow)
    );

    return NextResponse.json({ analysisRuns });
  } catch (error) {
    console.error('Error fetching analysis runs:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis runs' }, { status: 500 });
  }
}

// POST /api/structural/projects/[id]/analysis - Start a new analysis run
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { analysis_type, combination_ids, settings } = body as {
      analysis_type: AnalysisType;
      combination_ids?: string[];
      settings?: Record<string, any>;
    };

    if (!analysis_type) {
      return NextResponse.json({ error: 'analysis_type is required' }, { status: 400 });
    }

    // Validate model has required elements
    const db = getDb();
    const nodeCount = await db.execute({
      sql: `SELECT COUNT(*) as count FROM nodes WHERE project_id = ?`,
      args: [projectId],
    });

    if ((nodeCount.rows[0] as any).count === 0) {
      return NextResponse.json({ error: 'Model has no nodes' }, { status: 400 });
    }

    // Create analysis run record
    const analysisRun = createAnalysisRun({
      project_id: projectId,
      analysis_type,
      combination_ids: combination_ids || [],
      settings: settings || {},
    });

    await db.execute({
      sql: `INSERT INTO analysis_runs (
        id, project_id, analysis_type, status, combination_ids, settings,
        started_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        analysisRun.id, analysisRun.project_id, analysisRun.analysis_type,
        analysisRun.status, JSON.stringify(analysisRun.combination_ids),
        JSON.stringify(analysisRun.settings), analysisRun.started_at ?? null,
        analysisRun.created_at,
      ],
    });

    // In a real implementation, this would queue the analysis job
    // For now, we'll run it synchronously or mark as pending
    // The actual analysis will be handled by the analysis engine

    return NextResponse.json({ analysisRun }, { status: 201 });
  } catch (error) {
    console.error('Error creating analysis run:', error);
    return NextResponse.json({ error: 'Failed to create analysis run' }, { status: 500 });
  }
}

// DELETE /api/structural/projects/[id]/analysis?run_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const runId = url.searchParams.get('run_id');
    if (!runId) return NextResponse.json({ error: 'run_id required' }, { status: 400 });

    const db = getDb();

    // Delete all related results first
    await db.execute({
      sql: `DELETE FROM node_results WHERE analysis_run_id = ?`,
      args: [runId],
    });
    await db.execute({
      sql: `DELETE FROM member_results WHERE analysis_run_id = ?`,
      args: [runId],
    });
    await db.execute({
      sql: `DELETE FROM member_envelopes WHERE analysis_run_id = ?`,
      args: [runId],
    });
    await db.execute({
      sql: `DELETE FROM modal_results WHERE analysis_run_id = ?`,
      args: [runId],
    });
    await db.execute({
      sql: `DELETE FROM mode_shapes WHERE analysis_run_id = ?`,
      args: [runId],
    });
    await db.execute({
      sql: `DELETE FROM story_drift_results WHERE analysis_run_id = ?`,
      args: [runId],
    });

    // Delete the run itself
    await db.execute({
      sql: `DELETE FROM analysis_runs WHERE id = ? AND project_id = ?`,
      args: [runId, projectId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting analysis run:', error);
    return NextResponse.json({ error: 'Failed to delete analysis run' }, { status: 500 });
  }
}
