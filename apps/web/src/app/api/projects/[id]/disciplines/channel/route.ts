import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getDb, query, queryOne, execute } from '@ledesign/db';
import { Project } from '@/types/user';
import { ChannelDesign } from '@/types/disciplines';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface DbChannelDesign {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  sections_json: string;
  reaches_json: string;
  structures_json: string;
  design_flow: number | null;
  design_freeboard: number;
  analysis_results_json: string | null;
  last_analysis_at: string | null;
  status: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function parseDesign(row: DbChannelDesign): ChannelDesign {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || undefined,
    sections: JSON.parse(row.sections_json || '[]'),
    reaches: JSON.parse(row.reaches_json || '[]'),
    structures: JSON.parse(row.structures_json || '[]'),
    designFlow: row.design_flow || 0,
    designFreeboard: row.design_freeboard,
    analysisResults: row.analysis_results_json ? JSON.parse(row.analysis_results_json) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/projects/[id]/disciplines/channel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const designs = await query<DbChannelDesign>(
        getDb(),
        `SELECT * FROM channel_designs WHERE project_id = ? AND is_active = 1 ORDER BY created_at DESC`,
        [id]
      );

      return NextResponse.json({
        success: true,
        designs: designs.map(parseDesign),
      });
    } catch (error) {
      console.error('Error fetching channel designs:', error);
      return NextResponse.json({ error: 'Failed to fetch channel designs' }, { status: 500 });
    }
  });
}

// POST /api/projects/[id]/disciplines/channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const now = new Date().toISOString();
      const designId = generateId();

      const {
        name,
        description,
        sections = [],
        reaches = [],
        structures = [],
        designFlow = 0,
        designFreeboard = 0.3,
      } = body;

      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      await execute(
        getDb(),
        `INSERT INTO channel_designs (
          id, project_id, name, description,
          sections_json, reaches_json, structures_json,
          design_flow, design_freeboard,
          status, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)`,
        [
          designId, id, name, description || null,
          JSON.stringify(sections), JSON.stringify(reaches), JSON.stringify(structures),
          designFlow, designFreeboard,
          now, now,
        ]
      );

      await execute(getDb(), `UPDATE projects SET updated_at = ? WHERE id = ?`, [now, id]);

      const design: ChannelDesign = {
        id: designId,
        projectId: id,
        name,
        description,
        sections,
        reaches,
        structures,
        designFlow,
        designFreeboard,
        createdAt: now,
        updatedAt: now,
      };

      return NextResponse.json({ success: true, design });
    } catch (error) {
      console.error('Error creating channel design:', error);
      return NextResponse.json({ error: 'Failed to create channel design' }, { status: 500 });
    }
  });
}

// PUT /api/projects/[id]/disciplines/channel
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id: projectId } = await params;
      const body = await request.json();
      const { id: designId, ...updates } = body;

      if (!designId) {
        return NextResponse.json({ error: 'Design ID is required' }, { status: 400 });
      }

      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const existing = await queryOne<DbChannelDesign>(
        getDb(),
        `SELECT id FROM channel_designs WHERE id = ? AND project_id = ?`,
        [designId, projectId]
      );

      if (!existing) {
        return NextResponse.json({ error: 'Design not found' }, { status: 404 });
      }

      const now = new Date().toISOString();
      const updateFields: string[] = ['updated_at = ?'];
      const updateValues: unknown[] = [now];

      if (updates.name !== undefined) { updateFields.push('name = ?'); updateValues.push(updates.name); }
      if (updates.description !== undefined) { updateFields.push('description = ?'); updateValues.push(updates.description); }
      if (updates.sections !== undefined) { updateFields.push('sections_json = ?'); updateValues.push(JSON.stringify(updates.sections)); }
      if (updates.reaches !== undefined) { updateFields.push('reaches_json = ?'); updateValues.push(JSON.stringify(updates.reaches)); }
      if (updates.structures !== undefined) { updateFields.push('structures_json = ?'); updateValues.push(JSON.stringify(updates.structures)); }
      if (updates.designFlow !== undefined) { updateFields.push('design_flow = ?'); updateValues.push(updates.designFlow); }
      if (updates.designFreeboard !== undefined) { updateFields.push('design_freeboard = ?'); updateValues.push(updates.designFreeboard); }
      if (updates.analysisResults !== undefined) {
        updateFields.push('analysis_results_json = ?');
        updateValues.push(JSON.stringify(updates.analysisResults));
        updateFields.push('last_analysis_at = ?');
        updateValues.push(now);
      }

      updateValues.push(designId);

      await execute(
        getDb(),
        `UPDATE channel_designs SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      await execute(getDb(), `UPDATE projects SET updated_at = ? WHERE id = ?`, [now, projectId]);

      const updated = await queryOne<DbChannelDesign>(
        getDb(),
        `SELECT * FROM channel_designs WHERE id = ?`,
        [designId]
      );

      return NextResponse.json({
        success: true,
        design: updated ? parseDesign(updated) : null,
      });
    } catch (error) {
      console.error('Error updating channel design:', error);
      return NextResponse.json({ error: 'Failed to update channel design' }, { status: 500 });
    }
  });
}

// DELETE /api/projects/[id]/disciplines/channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id: projectId } = await params;
      const { searchParams } = new URL(request.url);
      const designId = searchParams.get('designId');

      if (!designId) {
        return NextResponse.json({ error: 'Design ID is required' }, { status: 400 });
      }

      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      await execute(
        getDb(),
        `UPDATE channel_designs SET is_active = 0, updated_at = ? WHERE id = ? AND project_id = ?`,
        [new Date().toISOString(), designId, projectId]
      );

      return NextResponse.json({ success: true, message: 'Channel design deleted' });
    } catch (error) {
      console.error('Error deleting channel design:', error);
      return NextResponse.json({ error: 'Failed to delete channel design' }, { status: 500 });
    }
  });
}
