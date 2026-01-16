import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import { createWall } from '@ledesign/structural/factories';
import {
  Wall,
  CreateWallInput,
  wallRowToWall,
  WallRow,
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

// GET /api/structural/projects/[id]/walls
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const storyId = url.searchParams.get('story_id');

    const db = getDb();
    const result = storyId
      ? await db.execute({
          sql: `SELECT * FROM walls WHERE project_id = ? AND story_id = ? ORDER BY name`,
          args: [projectId, storyId],
        })
      : await db.execute({
          sql: `SELECT * FROM walls WHERE project_id = ? ORDER BY name`,
          args: [projectId],
        });

    const walls = result.rows.map((row) => wallRowToWall(row as unknown as WallRow));
    return NextResponse.json({ walls });
  } catch (error) {
    console.error('Error fetching walls:', error);
    return NextResponse.json({ error: 'Failed to fetch walls' }, { status: 500 });
  }
}

// POST /api/structural/projects/[id]/walls
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const wall = createWall({ ...body, project_id: projectId });

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO walls (
        id, project_id, story_id, name, wall_type, material_type, material_id,
        corner_nodes, thickness, openings, pier_label, spandrel_label,
        mesh_size, is_meshed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        wall.id,
        wall.project_id,
        wall.story_id ?? null,
        wall.name ?? null,
        wall.wall_type,
        wall.material_type,
        wall.material_id ?? null,
        JSON.stringify(wall.corner_nodes),
        wall.thickness,
        JSON.stringify(wall.openings),
        wall.pier_label ?? null,
        wall.spandrel_label ?? null,
        wall.mesh_size ?? null,
        wall.is_meshed ? 1 : 0,
        wall.created_at,
        wall.updated_at ?? null,
      ],
    });

    return NextResponse.json({ wall }, { status: 201 });
  } catch (error) {
    console.error('Error creating wall:', error);
    return NextResponse.json({ error: 'Failed to create wall' }, { status: 500 });
  }
}

// PUT /api/structural/projects/[id]/walls - Batch create
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { walls: wallInputs } = body as { walls: CreateWallInput[] };

    if (!Array.isArray(wallInputs) || wallInputs.length === 0) {
      return NextResponse.json({ error: 'walls array required' }, { status: 400 });
    }

    const db = getDb();
    const walls: Wall[] = [];

    for (const input of wallInputs) {
      const wall = createWall({ ...input, project_id: projectId });

      await db.execute({
        sql: `INSERT INTO walls (
          id, project_id, story_id, name, wall_type, material_type, material_id,
          corner_nodes, thickness, openings, pier_label, spandrel_label,
          mesh_size, is_meshed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          wall.id,
          wall.project_id,
          wall.story_id ?? null,
          wall.name ?? null,
          wall.wall_type,
          wall.material_type,
          wall.material_id ?? null,
          JSON.stringify(wall.corner_nodes),
          wall.thickness,
          JSON.stringify(wall.openings),
          wall.pier_label ?? null,
          wall.spandrel_label ?? null,
          wall.mesh_size ?? null,
          wall.is_meshed ? 1 : 0,
          wall.created_at,
          wall.updated_at ?? null,
        ],
      });

      walls.push(wall);
    }

    return NextResponse.json({ walls, count: walls.length }, { status: 201 });
  } catch (error) {
    console.error('Error batch creating walls:', error);
    return NextResponse.json({ error: 'Failed to create walls' }, { status: 500 });
  }
}

// DELETE /api/structural/projects/[id]/walls?wall_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const wallId = url.searchParams.get('wall_id');
    if (!wallId) return NextResponse.json({ error: 'wall_id required' }, { status: 400 });

    const db = getDb();
    await db.execute({
      sql: `DELETE FROM walls WHERE id = ? AND project_id = ?`,
      args: [wallId, projectId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wall:', error);
    return NextResponse.json({ error: 'Failed to delete wall' }, { status: 500 });
  }
}
