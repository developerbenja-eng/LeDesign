import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import { createSlab } from '@ledesign/structural/factories';
import {
  Slab,
  CreateSlabInput,
  slabRowToSlab,
  SlabRow,
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

// GET /api/structural/projects/[id]/slabs
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
          sql: `SELECT * FROM slabs WHERE project_id = ? AND story_id = ? ORDER BY name`,
          args: [projectId, storyId],
        })
      : await db.execute({
          sql: `SELECT * FROM slabs WHERE project_id = ? ORDER BY name`,
          args: [projectId],
        });

    const slabs = result.rows.map((row) => slabRowToSlab(row as unknown as SlabRow));
    return NextResponse.json({ slabs });
  } catch (error) {
    console.error('Error fetching slabs:', error);
    return NextResponse.json({ error: 'Failed to fetch slabs' }, { status: 500 });
  }
}

// POST /api/structural/projects/[id]/slabs
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const slab = createSlab({ ...body, project_id: projectId });

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO slabs (
        id, project_id, story_id, name, slab_type, material_type, material_id,
        boundary_nodes, thickness, openings, span_direction,
        mesh_size, is_meshed, is_diaphragm, diaphragm_type,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        slab.id,
        slab.project_id,
        slab.story_id ?? null,
        slab.name ?? null,
        slab.slab_type,
        slab.material_type,
        slab.material_id ?? null,
        JSON.stringify(slab.boundary_nodes),
        slab.thickness,
        JSON.stringify(slab.openings),
        slab.span_direction,
        slab.mesh_size ?? null,
        slab.is_meshed ? 1 : 0,
        slab.is_diaphragm ? 1 : 0,
        slab.diaphragm_type,
        slab.created_at,
        slab.updated_at ?? null,
      ],
    });

    return NextResponse.json({ slab }, { status: 201 });
  } catch (error) {
    console.error('Error creating slab:', error);
    return NextResponse.json({ error: 'Failed to create slab' }, { status: 500 });
  }
}

// PUT /api/structural/projects/[id]/slabs - Batch create
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { slabs: slabInputs } = body as { slabs: CreateSlabInput[] };

    if (!Array.isArray(slabInputs) || slabInputs.length === 0) {
      return NextResponse.json({ error: 'slabs array required' }, { status: 400 });
    }

    const db = getDb();
    const slabs: Slab[] = [];

    for (const input of slabInputs) {
      const slab = createSlab({ ...input, project_id: projectId });

      await db.execute({
        sql: `INSERT INTO slabs (
          id, project_id, story_id, name, slab_type, material_type, material_id,
          boundary_nodes, thickness, openings, span_direction,
          mesh_size, is_meshed, is_diaphragm, diaphragm_type,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          slab.id,
          slab.project_id,
          slab.story_id ?? null,
          slab.name ?? null,
          slab.slab_type,
          slab.material_type,
          slab.material_id ?? null,
          JSON.stringify(slab.boundary_nodes),
          slab.thickness,
          JSON.stringify(slab.openings),
          slab.span_direction,
          slab.mesh_size ?? null,
          slab.is_meshed ? 1 : 0,
          slab.is_diaphragm ? 1 : 0,
          slab.diaphragm_type,
          slab.created_at,
          slab.updated_at ?? null,
        ],
      });

      slabs.push(slab);
    }

    return NextResponse.json({ slabs, count: slabs.length }, { status: 201 });
  } catch (error) {
    console.error('Error batch creating slabs:', error);
    return NextResponse.json({ error: 'Failed to create slabs' }, { status: 500 });
  }
}

// DELETE /api/structural/projects/[id]/slabs?slab_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const slabId = url.searchParams.get('slab_id');
    if (!slabId) return NextResponse.json({ error: 'slab_id required' }, { status: 400 });

    const db = getDb();
    await db.execute({
      sql: `DELETE FROM slabs WHERE id = ? AND project_id = ?`,
      args: [slabId, projectId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting slab:', error);
    return NextResponse.json({ error: 'Failed to delete slab' }, { status: 500 });
  }
}
