import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getDb, query, queryOne, execute } from '@ledesign/db';
import { Project } from '@/types/user';
import { WaterNetworkDesign } from '@/types/disciplines';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface DbWaterNetworkDesign {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  nodes_json: string;
  pipes_json: string;
  pumps_json: string;
  tanks_json: string;
  demand_multiplier: number;
  headloss_formula: string;
  analysis_results_json: string | null;
  last_analysis_at: string | null;
  status: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function parseDesign(row: DbWaterNetworkDesign): WaterNetworkDesign {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || undefined,
    nodes: JSON.parse(row.nodes_json || '[]'),
    pipes: JSON.parse(row.pipes_json || '[]'),
    pumps: JSON.parse(row.pumps_json || '[]'),
    tanks: JSON.parse(row.tanks_json || '[]'),
    demandMultiplier: row.demand_multiplier,
    headlossFormula: row.headloss_formula as 'hazen-williams' | 'darcy-weisbach',
    analysisResults: row.analysis_results_json ? JSON.parse(row.analysis_results_json) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/projects/[id]/disciplines/water-network - Get water network designs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      // Verify project ownership
      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const designs = await query<DbWaterNetworkDesign>(
        getDb(),
        `SELECT * FROM water_network_designs
         WHERE project_id = ? AND is_active = 1
         ORDER BY created_at DESC`,
        [id]
      );

      return NextResponse.json({
        success: true,
        designs: designs.map(parseDesign),
      });
    } catch (error) {
      console.error('Error fetching water network designs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch water network designs' },
        { status: 500 }
      );
    }
  });
}

// POST /api/projects/[id]/disciplines/water-network - Create water network design
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const body = await request.json();

      // Verify project ownership
      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const designId = generateId();

      const {
        name,
        description,
        nodes = [],
        pipes = [],
        pumps = [],
        tanks = [],
        demandMultiplier = 1.0,
        headlossFormula = 'hazen-williams',
      } = body;

      if (!name) {
        return NextResponse.json(
          { error: 'Name is required' },
          { status: 400 }
        );
      }

      await execute(
        getDb(),
        `INSERT INTO water_network_designs (
          id, project_id, name, description,
          nodes_json, pipes_json, pumps_json, tanks_json,
          demand_multiplier, headloss_formula,
          status, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)`,
        [
          designId,
          id,
          name,
          description || null,
          JSON.stringify(nodes),
          JSON.stringify(pipes),
          JSON.stringify(pumps),
          JSON.stringify(tanks),
          demandMultiplier,
          headlossFormula,
          now,
          now,
        ]
      );

      // Update project timestamp
      await execute(
        getDb(),
        `UPDATE projects SET updated_at = ? WHERE id = ?`,
        [now, id]
      );

      const design: WaterNetworkDesign = {
        id: designId,
        projectId: id,
        name,
        description,
        nodes,
        pipes,
        pumps,
        tanks,
        demandMultiplier,
        headlossFormula,
        createdAt: now,
        updatedAt: now,
      };

      return NextResponse.json({
        success: true,
        design,
      });
    } catch (error) {
      console.error('Error creating water network design:', error);
      return NextResponse.json(
        { error: 'Failed to create water network design' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/projects/[id]/disciplines/water-network - Update water network design
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
        return NextResponse.json(
          { error: 'Design ID is required' },
          { status: 400 }
        );
      }

      // Verify project ownership
      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Verify design exists
      const existing = await queryOne<DbWaterNetworkDesign>(
        getDb(),
        `SELECT id FROM water_network_designs WHERE id = ? AND project_id = ?`,
        [designId, projectId]
      );

      if (!existing) {
        return NextResponse.json(
          { error: 'Design not found' },
          { status: 404 }
        );
      }

      const now = new Date().toISOString();
      const updateFields: string[] = ['updated_at = ?'];
      const updateValues: unknown[] = [now];

      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }
      if (updates.nodes !== undefined) {
        updateFields.push('nodes_json = ?');
        updateValues.push(JSON.stringify(updates.nodes));
      }
      if (updates.pipes !== undefined) {
        updateFields.push('pipes_json = ?');
        updateValues.push(JSON.stringify(updates.pipes));
      }
      if (updates.pumps !== undefined) {
        updateFields.push('pumps_json = ?');
        updateValues.push(JSON.stringify(updates.pumps));
      }
      if (updates.tanks !== undefined) {
        updateFields.push('tanks_json = ?');
        updateValues.push(JSON.stringify(updates.tanks));
      }
      if (updates.demandMultiplier !== undefined) {
        updateFields.push('demand_multiplier = ?');
        updateValues.push(updates.demandMultiplier);
      }
      if (updates.headlossFormula !== undefined) {
        updateFields.push('headloss_formula = ?');
        updateValues.push(updates.headlossFormula);
      }
      if (updates.analysisResults !== undefined) {
        updateFields.push('analysis_results_json = ?');
        updateValues.push(JSON.stringify(updates.analysisResults));
        updateFields.push('last_analysis_at = ?');
        updateValues.push(now);
      }

      updateValues.push(designId);

      await execute(
        getDb(),
        `UPDATE water_network_designs SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Update project timestamp
      await execute(
        getDb(),
        `UPDATE projects SET updated_at = ? WHERE id = ?`,
        [now, projectId]
      );

      // Fetch updated design
      const updated = await queryOne<DbWaterNetworkDesign>(
        getDb(),
        `SELECT * FROM water_network_designs WHERE id = ?`,
        [designId]
      );

      return NextResponse.json({
        success: true,
        design: updated ? parseDesign(updated) : null,
      });
    } catch (error) {
      console.error('Error updating water network design:', error);
      return NextResponse.json(
        { error: 'Failed to update water network design' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/projects/[id]/disciplines/water-network - Delete water network design
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
        return NextResponse.json(
          { error: 'Design ID is required' },
          { status: 400 }
        );
      }

      // Verify project ownership
      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Soft delete (set is_active = 0)
      await execute(
        getDb(),
        `UPDATE water_network_designs SET is_active = 0, updated_at = ? WHERE id = ? AND project_id = ?`,
        [new Date().toISOString(), designId, projectId]
      );

      return NextResponse.json({
        success: true,
        message: 'Water network design deleted',
      });
    } catch (error) {
      console.error('Error deleting water network design:', error);
      return NextResponse.json(
        { error: 'Failed to delete water network design' },
        { status: 500 }
      );
    }
  });
}
