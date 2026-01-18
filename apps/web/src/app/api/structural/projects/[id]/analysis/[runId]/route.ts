import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/turso';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import {
  analysisRunRowToAnalysisRun,
  AnalysisRunRow,
  nodeResultRowToNodeResult,
  NodeResultRow,
  memberResultRowToMemberResult,
  MemberResultRow,
  modalResultRowToModalResult,
  ModalResultRow,
} from '@/types/structural';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string; runId: string }>;
}

async function verifyAnalysisRunOwnership(
  projectId: string,
  runId: string,
  userId: string
) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT ar.id FROM analysis_runs ar
          JOIN structural_projects p ON ar.project_id = p.id
          WHERE ar.id = ? AND ar.project_id = ? AND p.created_by = ?`,
    args: [runId, projectId, userId],
  });
  return result.rows.length > 0;
}

// GET /api/structural/projects/[id]/analysis/[runId] - Get analysis run with results
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId, runId } = await params;

    if (!(await verifyAnalysisRunOwnership(projectId, runId, req.user.userId))) {
      return NextResponse.json({ error: 'Analysis run not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const includeResults = url.searchParams.get('include_results') !== 'false';
    const combinationId = url.searchParams.get('combination_id');
    const resultType = url.searchParams.get('result_type'); // nodes, members, modal

    const db = getDb();

    // Get analysis run
    const runResult = await db.execute({
      sql: `SELECT * FROM analysis_runs WHERE id = ?`,
      args: [runId],
    });

    if (runResult.rows.length === 0) {
      return NextResponse.json({ error: 'Analysis run not found' }, { status: 404 });
    }

    const analysisRun = analysisRunRowToAnalysisRun(
      runResult.rows[0] as unknown as AnalysisRunRow
    );

    const response: any = { analysisRun };

    if (includeResults) {
      // Get node results
      if (!resultType || resultType === 'nodes') {
        let nodeResultsSql = `SELECT * FROM node_results WHERE run_id = ?`;
        const nodeArgs: string[] = [runId];

        if (combinationId) {
          nodeResultsSql += ` AND combination_id = ?`;
          nodeArgs.push(combinationId);
        }

        const nodeResults = await db.execute({ sql: nodeResultsSql, args: nodeArgs });
        response.nodeResults = nodeResults.rows.map((row) =>
          nodeResultRowToNodeResult(row as unknown as NodeResultRow)
        );
      }

      // Get member results
      if (!resultType || resultType === 'members') {
        let memberResultsSql = `SELECT * FROM member_results WHERE run_id = ?`;
        const memberArgs: string[] = [runId];

        if (combinationId) {
          memberResultsSql += ` AND combination_id = ?`;
          memberArgs.push(combinationId);
        }

        const memberResults = await db.execute({ sql: memberResultsSql, args: memberArgs });
        response.memberResults = memberResults.rows.map((row) =>
          memberResultRowToMemberResult(row as unknown as MemberResultRow)
        );
      }

      // Get modal results (only for modal/dynamic analysis)
      if ((!resultType || resultType === 'modal') &&
          ['modal', 'response_spectrum', 'time_history'].includes(analysisRun.analysis_type)) {
        const modalResults = await db.execute({
          sql: `SELECT * FROM modal_results WHERE run_id = ? ORDER BY mode_number`,
          args: [runId],
        });
        response.modalResults = modalResults.rows.map((row) =>
          modalResultRowToModalResult(row as unknown as ModalResultRow)
        );
      }

      // Get story drift results
      if (!resultType || resultType === 'drifts') {
        let driftSql = `SELECT * FROM story_drift_results WHERE run_id = ?`;
        const driftArgs: string[] = [runId];

        if (combinationId) {
          driftSql += ` AND combination_id = ?`;
          driftArgs.push(combinationId);
        }

        driftSql += ` ORDER BY story_id`;

        const driftResults = await db.execute({ sql: driftSql, args: driftArgs });
        response.storyDriftResults = driftResults.rows;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching analysis run:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis run' }, { status: 500 });
  }
}

// PATCH /api/structural/projects/[id]/analysis/[runId] - Update analysis run status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId, runId } = await params;

    if (!(await verifyAnalysisRunOwnership(projectId, runId, req.user.userId))) {
      return NextResponse.json({ error: 'Analysis run not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, error_message, completed_at } = body;

    const db = getDb();
    const updates: string[] = [];
    const args: (string | null)[] = [];

    if (status) {
      updates.push('status = ?');
      args.push(status);
    }

    if (error_message !== undefined) {
      updates.push('error_message = ?');
      args.push(error_message);
    }

    if (completed_at) {
      updates.push('completed_at = ?');
      args.push(completed_at);
    }

    updates.push('updated_at = ?');
    args.push(new Date().toISOString());
    args.push(runId);

    await db.execute({
      sql: `UPDATE analysis_runs SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    // Fetch updated run
    const result = await db.execute({
      sql: `SELECT * FROM analysis_runs WHERE id = ?`,
      args: [runId],
    });

    const analysisRun = analysisRunRowToAnalysisRun(
      result.rows[0] as unknown as AnalysisRunRow
    );

    return NextResponse.json({ analysisRun });
  } catch (error) {
    console.error('Error updating analysis run:', error);
    return NextResponse.json({ error: 'Failed to update analysis run' }, { status: 500 });
  }
}
