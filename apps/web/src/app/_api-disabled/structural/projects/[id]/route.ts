import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import {
  StructuralProject,
  projectRowToProject,
  StructuralProjectRow,
} from '@ledesign/structural';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/structural/projects/[id] - Get a single project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    const result = await db.execute({
      sql: `SELECT * FROM structural_projects WHERE id = ? AND created_by = ?`,
      args: [id, user.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectRowToProject(
      result.rows[0] as unknown as StructuralProjectRow
    );

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/structural/projects/[id] - Update a project
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: Partial<Omit<StructuralProject, 'id' | 'created_by' | 'created_at' | 'updated_at'>> = await request.json();
    const db = getDb();

    // Check project exists and belongs to user
    const existing = await db.execute({
      sql: `SELECT * FROM structural_projects WHERE id = ? AND created_by = ?`,
      args: [id, user.id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const currentProject = projectRowToProject(
      existing.rows[0] as unknown as StructuralProjectRow
    );

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    if (body.design_code !== undefined) {
      updates.push('design_code = ?');
      values.push(body.design_code);
    }
    if (body.seismic_code !== undefined) {
      updates.push('seismic_code = ?');
      values.push(body.seismic_code);
    }
    if (body.wind_code !== undefined) {
      updates.push('wind_code = ?');
      values.push(body.wind_code);
    }
    if (body.concrete_code !== undefined) {
      updates.push('concrete_code = ?');
      values.push(body.concrete_code);
    }
    if (body.length_unit !== undefined) {
      updates.push('length_unit = ?');
      values.push(body.length_unit);
    }
    if (body.force_unit !== undefined) {
      updates.push('force_unit = ?');
      values.push(body.force_unit);
    }
    if (body.moment_unit !== undefined) {
      updates.push('moment_unit = ?');
      values.push(body.moment_unit);
    }
    if (body.stress_unit !== undefined) {
      updates.push('stress_unit = ?');
      values.push(body.stress_unit);
    }
    if (body.temperature_unit !== undefined) {
      updates.push('temperature_unit = ?');
      values.push(body.temperature_unit);
    }
    if (body.settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify({ ...currentProject.settings, ...body.settings }));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.execute({
      sql: `UPDATE structural_projects SET ${updates.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Fetch updated project
    const updated = await db.execute({
      sql: `SELECT * FROM structural_projects WHERE id = ?`,
      args: [id],
    });

    const project = projectRowToProject(
      updated.rows[0] as unknown as StructuralProjectRow
    );

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/structural/projects/[id] - Delete a project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    // Check project exists and belongs to user
    const existing = await db.execute({
      sql: `SELECT id FROM structural_projects WHERE id = ? AND created_by = ?`,
      args: [id, user.id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete project (CASCADE will handle related records)
    await db.execute({
      sql: `DELETE FROM structural_projects WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
