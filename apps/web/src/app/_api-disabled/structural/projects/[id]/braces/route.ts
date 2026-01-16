import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import { createBrace } from '@ledesign/structural/factories';
import {
  Brace,
  CreateBraceInput,
  braceRowToBrace,
  BraceRow,
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

// GET /api/structural/projects/[id]/braces
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
          sql: `SELECT * FROM braces WHERE project_id = ? AND story_id = ? ORDER BY name`,
          args: [projectId, storyId],
        })
      : await db.execute({
          sql: `SELECT * FROM braces WHERE project_id = ? ORDER BY name`,
          args: [projectId],
        });

    const braces = result.rows.map((row) => braceRowToBrace(row as unknown as BraceRow));
    return NextResponse.json({ braces });
  } catch (error) {
    console.error('Error fetching braces:', error);
    return NextResponse.json({ error: 'Failed to fetch braces' }, { status: 500 });
  }
}

// POST /api/structural/projects/[id]/braces
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const brace = createBrace({ ...body, project_id: projectId });

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO braces (
        id, project_id, story_id, name, node_i_id, node_j_id,
        section_id, material_id, rotation_angle, brace_type,
        releases_i, releases_j, offset_i, offset_j,
        k, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        brace.id, brace.project_id, brace.story_id ?? null, brace.name ?? null,
        brace.node_i_id, brace.node_j_id, brace.section_id ?? null, brace.material_id ?? null,
        brace.rotation_angle ?? 0, brace.brace_type ?? 'diagonal',
        brace.releases_i ? JSON.stringify(brace.releases_i) : null,
        brace.releases_j ? JSON.stringify(brace.releases_j) : null,
        brace.offset_i ? JSON.stringify(brace.offset_i) : null,
        brace.offset_j ? JSON.stringify(brace.offset_j) : null,
        brace.k ?? 1.0, brace.created_at, brace.updated_at ?? null,
      ],
    });

    return NextResponse.json({ brace }, { status: 201 });
  } catch (error) {
    console.error('Error creating brace:', error);
    return NextResponse.json({ error: 'Failed to create brace' }, { status: 500 });
  }
}

// PUT /api/structural/projects/[id]/braces - Batch create
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { braces: braceInputs } = body as { braces: CreateBraceInput[] };

    if (!Array.isArray(braceInputs) || braceInputs.length === 0) {
      return NextResponse.json({ error: 'braces array required' }, { status: 400 });
    }

    const db = getDb();
    const braces: Brace[] = [];

    for (const input of braceInputs) {
      const brace = createBrace({ ...input, project_id: projectId });

      await db.execute({
        sql: `INSERT INTO braces (
          id, project_id, story_id, name, node_i_id, node_j_id,
          section_id, material_id, rotation_angle, brace_type,
          releases_i, releases_j, offset_i, offset_j,
          k, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          brace.id, brace.project_id, brace.story_id ?? null, brace.name ?? null,
          brace.node_i_id, brace.node_j_id, brace.section_id ?? null, brace.material_id ?? null,
          brace.rotation_angle ?? 0, brace.brace_type ?? 'diagonal',
          brace.releases_i ? JSON.stringify(brace.releases_i) : null,
          brace.releases_j ? JSON.stringify(brace.releases_j) : null,
          brace.offset_i ? JSON.stringify(brace.offset_i) : null,
          brace.offset_j ? JSON.stringify(brace.offset_j) : null,
          brace.k ?? 1.0, brace.created_at, brace.updated_at ?? null,
        ],
      });

      braces.push(brace);
    }

    return NextResponse.json({ braces, count: braces.length }, { status: 201 });
  } catch (error) {
    console.error('Error batch creating braces:', error);
    return NextResponse.json({ error: 'Failed to create braces' }, { status: 500 });
  }
}

// DELETE /api/structural/projects/[id]/braces?brace_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const braceId = url.searchParams.get('brace_id');
    if (!braceId) return NextResponse.json({ error: 'brace_id required' }, { status: 400 });

    const db = getDb();
    await db.execute({
      sql: `DELETE FROM braces WHERE id = ? AND project_id = ?`,
      args: [braceId, projectId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brace:', error);
    return NextResponse.json({ error: 'Failed to delete brace' }, { status: 500 });
  }
}
