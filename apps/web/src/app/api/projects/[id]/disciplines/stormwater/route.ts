import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getClient, query, queryOne, execute } from '@ledesign/db';
import { Project } from '@/types/user';
import { StormwaterDesign } from '@/types/disciplines';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface DbStormwaterDesign {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  catchments_json: string;
  outlets_json: string;
  conduits_json: string;
  storages_json: string;
  design_storm_json: string | null;
  analysis_method: string;
  analysis_results_json: string | null;
  last_analysis_at: string | null;
  status: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function parseDesign(row: DbStormwaterDesign): StormwaterDesign {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || undefined,
    catchments: JSON.parse(row.catchments_json || '[]'),
    outlets: JSON.parse(row.outlets_json || '[]'),
    conduits: JSON.parse(row.conduits_json || '[]'),
    storages: JSON.parse(row.storages_json || '[]'),
    designStorm: row.design_storm_json ? JSON.parse(row.design_storm_json) : {
      returnPeriod: 10,
      duration: 60,
    },
    analysisMethod: row.analysis_method as 'rational' | 'scs' | 'swmm',
    analysisResults: row.analysis_results_json ? JSON.parse(row.analysis_results_json) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/projects/[id]/disciplines/stormwater
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      const project = await queryOne<Project>(
        getClient(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const designs = await query<DbStormwaterDesign>(
        getClient(),
        `SELECT * FROM stormwater_designs WHERE project_id = ? AND is_active = 1 ORDER BY created_at DESC`,
        [id]
      );

      return NextResponse.json({
        success: true,
        designs: designs.map(parseDesign),
      });
    } catch (error) {
      console.error('Error fetching stormwater designs:', error);
      return NextResponse.json({ error: 'Failed to fetch stormwater designs' }, { status: 500 });
    }
  });
}

// POST /api/projects/[id]/disciplines/stormwater
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const project = await queryOne<Project>(
        getClient(),
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
        catchments = [],
        outlets = [],
        conduits = [],
        storages = [],
        designStorm,
        analysisMethod = 'rational',
      } = body;

      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      await execute(
        getClient(),
        `INSERT INTO stormwater_designs (
          id, project_id, name, description,
          catchments_json, outlets_json, conduits_json, storages_json,
          design_storm_json, analysis_method,
          status, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)`,
        [
          designId, id, name, description || null,
          JSON.stringify(catchments), JSON.stringify(outlets),
          JSON.stringify(conduits), JSON.stringify(storages),
          designStorm ? JSON.stringify(designStorm) : null, analysisMethod,
          now, now,
        ]
      );

      await execute(getClient(), `UPDATE projects SET updated_at = ? WHERE id = ?`, [now, id]);

      const design: StormwaterDesign = {
        id: designId,
        projectId: id,
        name,
        description,
        catchments,
        outlets,
        conduits,
        storages,
        designStorm: designStorm || { returnPeriod: 10, duration: 60 },
        analysisMethod,
        createdAt: now,
        updatedAt: now,
      };

      return NextResponse.json({ success: true, design });
    } catch (error) {
      console.error('Error creating stormwater design:', error);
      return NextResponse.json({ error: 'Failed to create stormwater design' }, { status: 500 });
    }
  });
}

// PUT /api/projects/[id]/disciplines/stormwater
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
        getClient(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const existing = await queryOne<DbStormwaterDesign>(
        getClient(),
        `SELECT id FROM stormwater_designs WHERE id = ? AND project_id = ?`,
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
      if (updates.catchments !== undefined) { updateFields.push('catchments_json = ?'); updateValues.push(JSON.stringify(updates.catchments)); }
      if (updates.outlets !== undefined) { updateFields.push('outlets_json = ?'); updateValues.push(JSON.stringify(updates.outlets)); }
      if (updates.conduits !== undefined) { updateFields.push('conduits_json = ?'); updateValues.push(JSON.stringify(updates.conduits)); }
      if (updates.storages !== undefined) { updateFields.push('storages_json = ?'); updateValues.push(JSON.stringify(updates.storages)); }
      if (updates.designStorm !== undefined) { updateFields.push('design_storm_json = ?'); updateValues.push(JSON.stringify(updates.designStorm)); }
      if (updates.analysisMethod !== undefined) { updateFields.push('analysis_method = ?'); updateValues.push(updates.analysisMethod); }
      if (updates.analysisResults !== undefined) {
        updateFields.push('analysis_results_json = ?');
        updateValues.push(JSON.stringify(updates.analysisResults));
        updateFields.push('last_analysis_at = ?');
        updateValues.push(now);
      }

      updateValues.push(designId);

      await execute(
        getClient(),
        `UPDATE stormwater_designs SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      await execute(getClient(), `UPDATE projects SET updated_at = ? WHERE id = ?`, [now, projectId]);

      const updated = await queryOne<DbStormwaterDesign>(
        getClient(),
        `SELECT * FROM stormwater_designs WHERE id = ?`,
        [designId]
      );

      return NextResponse.json({
        success: true,
        design: updated ? parseDesign(updated) : null,
      });
    } catch (error) {
      console.error('Error updating stormwater design:', error);
      return NextResponse.json({ error: 'Failed to update stormwater design' }, { status: 500 });
    }
  });
}

// DELETE /api/projects/[id]/disciplines/stormwater
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
        getClient(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      await execute(
        getClient(),
        `UPDATE stormwater_designs SET is_active = 0, updated_at = ? WHERE id = ? AND project_id = ?`,
        [new Date().toISOString(), designId, projectId]
      );

      return NextResponse.json({ success: true, message: 'Stormwater design deleted' });
    } catch (error) {
      console.error('Error deleting stormwater design:', error);
      return NextResponse.json({ error: 'Failed to delete stormwater design' }, { status: 500 });
    }
  });
}
