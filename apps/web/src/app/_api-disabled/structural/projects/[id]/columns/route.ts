import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import { createColumn } from '@ledesign/structural/factories';
import {
  Column,
  CreateColumnInput,
  columnRowToColumn,
  ColumnRow,
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

// GET /api/structural/projects/[id]/columns
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
          sql: `SELECT * FROM columns WHERE project_id = ? AND story_id = ? ORDER BY name`,
          args: [projectId, storyId],
        })
      : await db.execute({
          sql: `SELECT * FROM columns WHERE project_id = ? ORDER BY name`,
          args: [projectId],
        });

    const columns = result.rows.map((row) => columnRowToColumn(row as unknown as ColumnRow));
    return NextResponse.json({ columns });
  } catch (error) {
    console.error('Error fetching columns:', error);
    return NextResponse.json({ error: 'Failed to fetch columns' }, { status: 500 });
  }
}

// POST /api/structural/projects/[id]/columns
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const column = createColumn({ ...body, project_id: projectId });

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO columns (
        id, project_id, story_id, name, node_i_id, node_j_id,
        section_id, material_id, rotation_angle,
        releases_i, releases_j, offset_i, offset_j,
        k_major, k_minor, unbraced_length_major, unbraced_length_minor,
        splice_location, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        column.id, column.project_id, column.story_id ?? null, column.name ?? null,
        column.node_i_id, column.node_j_id, column.section_id ?? null, column.material_id ?? null,
        column.rotation_angle ?? 0,
        column.releases_i ? JSON.stringify(column.releases_i) : null,
        column.releases_j ? JSON.stringify(column.releases_j) : null,
        column.offset_i ? JSON.stringify(column.offset_i) : null,
        column.offset_j ? JSON.stringify(column.offset_j) : null,
        column.k_major ?? 1.0, column.k_minor ?? 1.0,
        column.unbraced_length_major ?? null, column.unbraced_length_minor ?? null,
        column.splice_location ?? null, column.created_at, column.updated_at ?? null,
      ],
    });

    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    console.error('Error creating column:', error);
    return NextResponse.json({ error: 'Failed to create column' }, { status: 500 });
  }
}

// PUT /api/structural/projects/[id]/columns - Batch create
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { columns: columnInputs } = body as { columns: CreateColumnInput[] };

    if (!Array.isArray(columnInputs) || columnInputs.length === 0) {
      return NextResponse.json({ error: 'columns array required' }, { status: 400 });
    }

    const db = getDb();
    const columns: Column[] = [];

    for (const input of columnInputs) {
      const column = createColumn({ ...input, project_id: projectId });

      await db.execute({
        sql: `INSERT INTO columns (
          id, project_id, story_id, name, node_i_id, node_j_id,
          section_id, material_id, rotation_angle,
          releases_i, releases_j, offset_i, offset_j,
          k_major, k_minor, unbraced_length_major, unbraced_length_minor,
          splice_location, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          column.id, column.project_id, column.story_id ?? null, column.name ?? null,
          column.node_i_id, column.node_j_id, column.section_id ?? null, column.material_id ?? null,
          column.rotation_angle ?? 0,
          column.releases_i ? JSON.stringify(column.releases_i) : null,
          column.releases_j ? JSON.stringify(column.releases_j) : null,
          column.offset_i ? JSON.stringify(column.offset_i) : null,
          column.offset_j ? JSON.stringify(column.offset_j) : null,
          column.k_major ?? 1.0, column.k_minor ?? 1.0,
          column.unbraced_length_major ?? null, column.unbraced_length_minor ?? null,
          column.splice_location ?? null, column.created_at, column.updated_at ?? null,
        ],
      });

      columns.push(column);
    }

    return NextResponse.json({ columns, count: columns.length }, { status: 201 });
  } catch (error) {
    console.error('Error batch creating columns:', error);
    return NextResponse.json({ error: 'Failed to create columns' }, { status: 500 });
  }
}

// DELETE /api/structural/projects/[id]/columns?column_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const columnId = url.searchParams.get('column_id');
    if (!columnId) return NextResponse.json({ error: 'column_id required' }, { status: 400 });

    const db = getDb();
    await db.execute({
      sql: `DELETE FROM columns WHERE id = ? AND project_id = ?`,
      args: [columnId, projectId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting column:', error);
    return NextResponse.json({ error: 'Failed to delete column' }, { status: 500 });
  }
}
