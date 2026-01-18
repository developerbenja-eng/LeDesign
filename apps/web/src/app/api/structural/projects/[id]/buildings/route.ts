import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/turso';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createBuilding } from '@/lib/structural/factories';
import {
  Building,
  CreateBuildingInput,
  UpdateBuildingInput,
  buildingRowToBuilding,
  BuildingRow,
} from '@/types/structural';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id FROM structural_projects WHERE id = ? AND created_by = ?`,
    args: [projectId, userId],
  });
  return result.rows.length > 0;
}

// GET /api/structural/projects/[id]/buildings - List all buildings in project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT * FROM buildings WHERE project_id = ? ORDER BY name`,
      args: [projectId],
    });

    const buildings = result.rows.map((row) =>
      buildingRowToBuilding(row as unknown as BuildingRow)
    );

    return NextResponse.json({ buildings });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buildings' },
      { status: 500 }
    );
  }
}

// POST /api/structural/projects/[id]/buildings - Create a new building
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const input: CreateBuildingInput = {
      ...body,
      project_id: projectId,
    };

    const building = createBuilding(input);

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO buildings (
        id, project_id, name, description, created_at, updated_at,
        base_elevation, grid_angle, seismic_params, wind_params
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        building.id,
        building.project_id,
        building.name ?? null,
        building.description ?? null,
        building.created_at,
        building.updated_at ?? null,
        building.base_elevation ?? 0,
        building.grid_angle ?? 0,
        building.seismic_params ? JSON.stringify(building.seismic_params) : null,
        building.wind_params ? JSON.stringify(building.wind_params) : null,
      ],
    });

    return NextResponse.json({ building }, { status: 201 });
  } catch (error) {
    console.error('Error creating building:', error);
    return NextResponse.json(
      { error: 'Failed to create building' },
      { status: 500 }
    );
  }
}
