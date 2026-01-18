import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/turso';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createBeam } from '@/lib/structural/factories';
import {
  Beam,
  CreateBeamInput,
  UpdateBeamInput,
  beamRowToBeam,
  BeamRow,
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

// GET /api/structural/projects/[id]/beams
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

    const url = new URL(request.url);
    const storyId = url.searchParams.get('story_id');

    const db = getDb();
    let result;

    if (storyId) {
      result = await db.execute({
        sql: `SELECT * FROM beams WHERE project_id = ? AND story_id = ? ORDER BY name`,
        args: [projectId, storyId],
      });
    } else {
      result = await db.execute({
        sql: `SELECT * FROM beams WHERE project_id = ? ORDER BY name`,
        args: [projectId],
      });
    }

    const beams = result.rows.map((row) =>
      beamRowToBeam(row as unknown as BeamRow)
    );

    return NextResponse.json({ beams });
  } catch (error) {
    console.error('Error fetching beams:', error);
    return NextResponse.json({ error: 'Failed to fetch beams' }, { status: 500 });
  }
}

// POST /api/structural/projects/[id]/beams
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
    const input: CreateBeamInput = { ...body, project_id: projectId };
    const beam = createBeam(input);

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO beams (
        id, project_id, story_id, name, node_i_id, node_j_id,
        section_id, material_id, rotation_angle,
        releases_i, releases_j, offset_i, offset_j,
        rigid_zone_i, rigid_zone_j,
        unbraced_length_major, unbraced_length_minor, unbraced_length_ltb,
        cb, camber, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        beam.id, beam.project_id, beam.story_id ?? null, beam.name ?? null,
        beam.node_i_id, beam.node_j_id, beam.section_id ?? null, beam.material_id ?? null,
        beam.rotation_angle ?? 0,
        beam.releases_i ? JSON.stringify(beam.releases_i) : null,
        beam.releases_j ? JSON.stringify(beam.releases_j) : null,
        beam.offset_i ? JSON.stringify(beam.offset_i) : null,
        beam.offset_j ? JSON.stringify(beam.offset_j) : null,
        beam.rigid_zone_i ?? null, beam.rigid_zone_j ?? null,
        beam.unbraced_length_major ?? null, beam.unbraced_length_minor ?? null,
        beam.unbraced_length_ltb ?? null,
        beam.cb ?? null, beam.camber ?? null, beam.created_at, beam.updated_at ?? null,
      ],
    });

    return NextResponse.json({ beam }, { status: 201 });
  } catch (error) {
    console.error('Error creating beam:', error);
    return NextResponse.json({ error: 'Failed to create beam' }, { status: 500 });
  }
}

// PUT /api/structural/projects/[id]/beams - Batch create
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { beams: beamInputs } = body as { beams: CreateBeamInput[] };

    if (!Array.isArray(beamInputs) || beamInputs.length === 0) {
      return NextResponse.json({ error: 'beams array required' }, { status: 400 });
    }

    const db = getDb();
    const beams: Beam[] = [];

    for (const input of beamInputs) {
      const beam = createBeam({ ...input, project_id: projectId });

      await db.execute({
        sql: `INSERT INTO beams (
          id, project_id, story_id, name, node_i_id, node_j_id,
          section_id, material_id, rotation_angle,
          releases_i, releases_j, offset_i, offset_j,
          rigid_zone_i, rigid_zone_j,
          unbraced_length_major, unbraced_length_minor, unbraced_length_ltb,
          cb, camber, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          beam.id, beam.project_id, beam.story_id ?? null, beam.name ?? null,
          beam.node_i_id, beam.node_j_id, beam.section_id ?? null, beam.material_id ?? null,
          beam.rotation_angle ?? 0,
          beam.releases_i ? JSON.stringify(beam.releases_i) : null,
          beam.releases_j ? JSON.stringify(beam.releases_j) : null,
          beam.offset_i ? JSON.stringify(beam.offset_i) : null,
          beam.offset_j ? JSON.stringify(beam.offset_j) : null,
          beam.rigid_zone_i ?? null, beam.rigid_zone_j ?? null,
          beam.unbraced_length_major ?? null, beam.unbraced_length_minor ?? null,
          beam.unbraced_length_ltb ?? null,
          beam.cb ?? null, beam.camber ?? null, beam.created_at, beam.updated_at ?? null,
        ],
      });

      beams.push(beam);
    }

    return NextResponse.json({ beams, count: beams.length }, { status: 201 });
  } catch (error) {
    console.error('Error batch creating beams:', error);
    return NextResponse.json({ error: 'Failed to create beams' }, { status: 500 });
  }
}

// DELETE /api/structural/projects/[id]/beams?beam_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!(await verifyProjectOwnership(projectId, req.user.userId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const beamId = url.searchParams.get('beam_id');

    if (!beamId) {
      return NextResponse.json({ error: 'beam_id required' }, { status: 400 });
    }

    const db = getDb();
    await db.execute({
      sql: `DELETE FROM beams WHERE id = ? AND project_id = ?`,
      args: [beamId, projectId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting beam:', error);
    return NextResponse.json({ error: 'Failed to delete beam' }, { status: 500 });
  }
}
