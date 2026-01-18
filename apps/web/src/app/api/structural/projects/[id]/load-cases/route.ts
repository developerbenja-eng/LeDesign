import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/turso';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createLoadCase } from '@/lib/structural/factories';
import {
  LoadCase,
  CreateLoadCaseInput,
  loadCaseRowToLoadCase,
  LoadCaseRow,
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

// GET /api/structural/projects/[id]/load-cases
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const loadType = url.searchParams.get('load_type');

    const db = getDb();
    let result;

    if (loadType) {
      result = await db.execute({
        sql: `SELECT * FROM load_cases WHERE project_id = ? AND load_type = ? ORDER BY name`,
        args: [projectId, loadType],
      });
    } else {
      result = await db.execute({
        sql: `SELECT * FROM load_cases WHERE project_id = ? ORDER BY load_type, name`,
        args: [projectId],
      });
    }

    const loadCases = result.rows.map((row) =>
      loadCaseRowToLoadCase(row as unknown as LoadCaseRow)
    );

    return NextResponse.json({ loadCases });
  } catch (error) {
    console.error('Error fetching load cases:', error);
    return NextResponse.json({ error: 'Failed to fetch load cases' }, { status: 500 });
  }
}

// POST /api/structural/projects/[id]/load-cases
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const loadCase = createLoadCase({ ...body, project_id: projectId });

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO load_cases (
        id, project_id, name, load_type, self_weight_multiplier,
        direction, eccentricity, spectrum_id, scale_factor,
        time_history_id, modal_combination, directional_combination,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        loadCase.id, loadCase.project_id, loadCase.name ?? null, loadCase.load_type,
        loadCase.self_weight_multiplier ?? null, loadCase.direction ?? null,
        loadCase.eccentricity ?? null, loadCase.spectrum_id ?? null,
        loadCase.scale_factor ?? null, loadCase.time_history_id ?? null,
        loadCase.modal_combination ?? null, loadCase.directional_combination ?? null,
        loadCase.created_at, loadCase.updated_at ?? null,
      ],
    });

    return NextResponse.json({ loadCase }, { status: 201 });
  } catch (error) {
    console.error('Error creating load case:', error);
    return NextResponse.json({ error: 'Failed to create load case' }, { status: 500 });
  }
}

// PUT /api/structural/projects/[id]/load-cases - Create default load cases
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const db = getDb();

    // Check if load cases already exist
    const existing = await db.execute({
      sql: `SELECT COUNT(*) as count FROM load_cases WHERE project_id = ?`,
      args: [projectId],
    });

    if ((existing.rows[0] as any).count > 0) {
      return NextResponse.json({
        message: 'Load cases already exist for this project',
        created: false
      });
    }

    // Create default load cases
    const defaultLoadCases = [
      createLoadCase({ project_id: projectId, name: 'Dead', load_type: 'dead', self_weight_multiplier: 1.0 }),
      createLoadCase({ project_id: projectId, name: 'Live', load_type: 'live' }),
      createLoadCase({ project_id: projectId, name: 'Live Roof', load_type: 'live_roof' }),
      createLoadCase({ project_id: projectId, name: 'Wind +X', load_type: 'wind', direction: 'X' }),
      createLoadCase({ project_id: projectId, name: 'Wind -X', load_type: 'wind', direction: '-X' }),
      createLoadCase({ project_id: projectId, name: 'Wind +Y', load_type: 'wind', direction: 'Y' }),
      createLoadCase({ project_id: projectId, name: 'Wind -Y', load_type: 'wind', direction: '-Y' }),
      createLoadCase({ project_id: projectId, name: 'Seismic X', load_type: 'seismic', direction: 'X' }),
      createLoadCase({ project_id: projectId, name: 'Seismic Y', load_type: 'seismic', direction: 'Y' }),
    ];

    for (const loadCase of defaultLoadCases) {
      await db.execute({
        sql: `INSERT INTO load_cases (
          id, project_id, name, load_type, self_weight_multiplier,
          direction, eccentricity, spectrum_id, scale_factor,
          time_history_id, modal_combination, directional_combination,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          loadCase.id, loadCase.project_id, loadCase.name ?? null, loadCase.load_type,
          loadCase.self_weight_multiplier ?? null, loadCase.direction ?? null,
          loadCase.eccentricity ?? null, loadCase.spectrum_id ?? null,
          loadCase.scale_factor ?? null, loadCase.time_history_id ?? null,
          loadCase.modal_combination ?? null, loadCase.directional_combination ?? null,
          loadCase.created_at, loadCase.updated_at ?? null,
        ],
      });
    }

    return NextResponse.json({
      message: 'Default load cases created',
      created: true,
      loadCases: defaultLoadCases
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating default load cases:', error);
    return NextResponse.json({ error: 'Failed to create load cases' }, { status: 500 });
  }
}

// DELETE /api/structural/projects/[id]/load-cases?load_case_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const loadCaseId = url.searchParams.get('load_case_id');
    if (!loadCaseId) return NextResponse.json({ error: 'load_case_id required' }, { status: 400 });

    const db = getDb();
    await db.execute({
      sql: `DELETE FROM load_cases WHERE id = ? AND project_id = ?`,
      args: [loadCaseId, projectId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting load case:', error);
    return NextResponse.json({ error: 'Failed to delete load case' }, { status: 500 });
  }
}
