import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/turso';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import {
  runStaticAnalysis,
  runModalAnalysis,
  runResponseSpectrumAnalysis,
  DEFAULT_RESPONSE_SPECTRUM_SETTINGS,
} from '@/lib/structural/analysis';
import {
  analysisRunRowToAnalysisRun,
  AnalysisRunRow,
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

// POST /api/structural/projects/[id]/analysis/[runId]/run - Execute the analysis
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId, runId } = await params;

    if (!(await verifyAnalysisRunOwnership(projectId, runId, req.user.userId))) {
      return NextResponse.json({ error: 'Analysis run not found' }, { status: 404 });
    }

    const db = getDb();

    // Get the analysis run
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

    // Check if already running or completed
    if (analysisRun.status === 'running') {
      return NextResponse.json({ error: 'Analysis is already running' }, { status: 400 });
    }

    if (analysisRun.status === 'completed') {
      return NextResponse.json({ error: 'Analysis already completed' }, { status: 400 });
    }

    // Run the appropriate analysis type
    try {
      switch (analysisRun.analysis_type) {
        case 'static_linear':
        case 'static_nonlinear':
          await runStaticAnalysis(projectId, runId, analysisRun.combination_ids);
          break;

        case 'modal':
          await runModalAnalysis(projectId, runId, {
            numModes: analysisRun.settings.num_modes,
          });
          break;

        case 'response_spectrum':
          // Response spectrum analysis combines modal + spectrum
          // First run modal analysis
          await runModalAnalysis(projectId, runId, {
            numModes: analysisRun.settings.num_modes || 12,
          });

          // Then apply response spectrum
          // Settings should include spectrum_id, direction, modal_combination, etc.
          const spectrumSettings = {
            ...DEFAULT_RESPONSE_SPECTRUM_SETTINGS,
            ...analysisRun.settings,
          };

          // For each load combination, run response spectrum analysis
          for (const combinationId of analysisRun.combination_ids) {
            if (spectrumSettings.spectrum_id) {
              await runResponseSpectrumAnalysis({
                projectId,
                runId,
                modalRunId: runId, // Use same run (modal results just computed)
                spectrumId: spectrumSettings.spectrum_id,
                direction: spectrumSettings.direction || 'X',
                modalCombination: spectrumSettings.modal_combination || 'CQC',
                directionalCombination: spectrumSettings.directional_combination,
                damping: spectrumSettings.damping || 0.05,
                combinationId,
              });
            }
          }
          break;

        case 'time_history_linear':
        case 'time_history_nonlinear':
          // Time history requires modal analysis first
          await runModalAnalysis(projectId, runId, {
            numModes: analysisRun.settings.num_modes,
          });
          // TODO: Add time history integration
          break;

        case 'buckling':
          // Buckling analysis - not yet implemented
          return NextResponse.json(
            { error: 'Buckling analysis not yet implemented' },
            { status: 400 }
          );

        default:
          return NextResponse.json(
            { error: `Unknown analysis type: ${analysisRun.analysis_type}` },
            { status: 400 }
          );
      }

      // Fetch updated run
      const updatedResult = await db.execute({
        sql: `SELECT * FROM analysis_runs WHERE id = ?`,
        args: [runId],
      });

      const updatedRun = analysisRunRowToAnalysisRun(
        updatedResult.rows[0] as unknown as AnalysisRunRow
      );

      return NextResponse.json({
        message: 'Analysis completed',
        analysisRun: updatedRun,
      });
    } catch (analysisError) {
      // Fetch the run again to get the error message
      const errorResult = await db.execute({
        sql: `SELECT * FROM analysis_runs WHERE id = ?`,
        args: [runId],
      });

      const errorRun = analysisRunRowToAnalysisRun(
        errorResult.rows[0] as unknown as AnalysisRunRow
      );

      return NextResponse.json({
        error: 'Analysis failed',
        details: errorRun.error_message,
        analysisRun: errorRun,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error running analysis:', error);
    return NextResponse.json({ error: 'Failed to run analysis' }, { status: 500 });
  }
}
