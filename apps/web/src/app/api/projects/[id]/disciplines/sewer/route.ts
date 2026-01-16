import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getDb, query, queryOne, execute } from '@ledesign/db';
import { Project } from '@/types/user';
import { SewerDesign } from '@/types/disciplines';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface DbSewerDesign {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  system_type: string;
  manholes_json: string;
  pipes_json: string;
  connections_json: string;
  design_criteria_json: string | null;
  analysis_results_json: string | null;
  last_analysis_at: string | null;
  status: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function parseDesign(row: DbSewerDesign): SewerDesign {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || undefined,
    systemType: row.system_type as 'sanitary' | 'storm' | 'combined',
    manholes: JSON.parse(row.manholes_json || '[]'),
    pipes: JSON.parse(row.pipes_json || '[]'),
    connections: JSON.parse(row.connections_json || '[]'),
    designCriteria: row.design_criteria_json ? JSON.parse(row.design_criteria_json) : {
      minSlope: 0.005,
      maxSlope: 0.15,
      minVelocity: 0.6,
      maxVelocity: 5.0,
      minCover: 1.0,
      maxDepthRatio: 0.75,
      peakFactor: 2.5,
      infiltration: 0.15,
    },
    analysisResults: row.analysis_results_json ? JSON.parse(row.analysis_results_json) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/projects/[id]/disciplines/sewer
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

      const designs = await query<DbSewerDesign>(
        getDb(),
        `SELECT * FROM sewer_designs WHERE project_id = ? AND is_active = 1 ORDER BY created_at DESC`,
        [id]
      );

      return NextResponse.json({
        success: true,
        designs: designs.map(parseDesign),
      });
    } catch (error) {
      console.error('Error fetching sewer designs:', error);
      return NextResponse.json({ error: 'Failed to fetch sewer designs' }, { status: 500 });
    }
  });
}

// POST /api/projects/[id]/disciplines/sewer
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
        systemType = 'sanitary',
        manholes = [],
        pipes = [],
        connections = [],
        designCriteria,
      } = body;

      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      await execute(
        getDb(),
        `INSERT INTO sewer_designs (
          id, project_id, name, description, system_type,
          manholes_json, pipes_json, connections_json, design_criteria_json,
          status, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)`,
        [
          designId, id, name, description || null, systemType,
          JSON.stringify(manholes), JSON.stringify(pipes), JSON.stringify(connections),
          designCriteria ? JSON.stringify(designCriteria) : null,
          now, now,
        ]
      );

      await execute(getDb(), `UPDATE projects SET updated_at = ? WHERE id = ?`, [now, id]);

      const design: SewerDesign = {
        id: designId,
        projectId: id,
        name,
        description,
        systemType,
        manholes,
        pipes,
        connections,
        designCriteria: designCriteria || {
          minSlope: 0.005,
          maxSlope: 0.15,
          minVelocity: 0.6,
          maxVelocity: 5.0,
          minCover: 1.0,
          maxDepthRatio: 0.75,
          peakFactor: 2.5,
          infiltration: 0.15,
        },
        createdAt: now,
        updatedAt: now,
      };

      return NextResponse.json({ success: true, design });
    } catch (error) {
      console.error('Error creating sewer design:', error);
      return NextResponse.json({ error: 'Failed to create sewer design' }, { status: 500 });
    }
  });
}

// PUT /api/projects/[id]/disciplines/sewer
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

      const existing = await queryOne<DbSewerDesign>(
        getDb(),
        `SELECT id FROM sewer_designs WHERE id = ? AND project_id = ?`,
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
      if (updates.systemType !== undefined) { updateFields.push('system_type = ?'); updateValues.push(updates.systemType); }
      if (updates.manholes !== undefined) { updateFields.push('manholes_json = ?'); updateValues.push(JSON.stringify(updates.manholes)); }
      if (updates.pipes !== undefined) { updateFields.push('pipes_json = ?'); updateValues.push(JSON.stringify(updates.pipes)); }
      if (updates.connections !== undefined) { updateFields.push('connections_json = ?'); updateValues.push(JSON.stringify(updates.connections)); }
      if (updates.designCriteria !== undefined) { updateFields.push('design_criteria_json = ?'); updateValues.push(JSON.stringify(updates.designCriteria)); }
      if (updates.analysisResults !== undefined) {
        updateFields.push('analysis_results_json = ?');
        updateValues.push(JSON.stringify(updates.analysisResults));
        updateFields.push('last_analysis_at = ?');
        updateValues.push(now);
      }

      updateValues.push(designId);

      await execute(
        getDb(),
        `UPDATE sewer_designs SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      await execute(getDb(), `UPDATE projects SET updated_at = ? WHERE id = ?`, [now, projectId]);

      const updated = await queryOne<DbSewerDesign>(
        getDb(),
        `SELECT * FROM sewer_designs WHERE id = ?`,
        [designId]
      );

      return NextResponse.json({
        success: true,
        design: updated ? parseDesign(updated) : null,
      });
    } catch (error) {
      console.error('Error updating sewer design:', error);
      return NextResponse.json({ error: 'Failed to update sewer design' }, { status: 500 });
    }
  });
}

// DELETE /api/projects/[id]/disciplines/sewer
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
        `UPDATE sewer_designs SET is_active = 0, updated_at = ? WHERE id = ? AND project_id = ?`,
        [new Date().toISOString(), designId, projectId]
      );

      return NextResponse.json({ success: true, message: 'Sewer design deleted' });
    } catch (error) {
      console.error('Error deleting sewer design:', error);
      return NextResponse.json({ error: 'Failed to delete sewer design' }, { status: 500 });
    }
  });
}
