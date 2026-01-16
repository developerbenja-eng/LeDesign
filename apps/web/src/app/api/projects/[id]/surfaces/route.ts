import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getDb, query, queryOne, execute } from '@ledesign/db';
import { Project } from '@/types/user';
import { generateId } from '@/lib/utils';
import type { InterpolationMethodType, InterpolationMetrics } from '@ledesign/terrain';
import type { DatasetStatistics, BoundingBox } from '@ledesign/terrain';

export const dynamic = 'force-dynamic';

// ============================================================================
// Database Types
// ============================================================================

interface DbSurveyDataset {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  source_filename: string | null;
  source_format: string | null;
  point_count: number;
  bounds_json: string | null;
  statistics_json: string | null;
  crs: string;
  points_json: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DbGeneratedSurface {
  id: string;
  project_id: string;
  dataset_id: string | null;
  name: string;
  description: string | null;
  method: string;
  config_json: string | null;
  surface_json: string | null;
  metrics_json: string | null;
  breakline_sources: string | null;
  status: string;
  error_message: string | null;
  compute_time_ms: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface SurveyDataset {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  sourceFilename?: string;
  sourceFormat?: string;
  pointCount: number;
  bounds?: BoundingBox;
  statistics?: DatasetStatistics;
  crs: string;
  points: Array<{ id: string; x: number; y: number; z: number; code?: string }>;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedSurface {
  id: string;
  projectId: string;
  datasetId?: string;
  name: string;
  description?: string;
  method: InterpolationMethodType;
  config?: Record<string, unknown>;
  surface?: {
    vertices: Array<{ x: number; y: number; z: number }>;
    triangles: number[][];
    bounds: BoundingBox;
  };
  metrics?: InterpolationMetrics;
  breaklineSources?: string[];
  status: 'generating' | 'ready' | 'error' | 'archived';
  errorMessage?: string;
  computeTimeMs?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Parsers
// ============================================================================

function parseDataset(row: DbSurveyDataset): SurveyDataset {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || undefined,
    sourceFilename: row.source_filename || undefined,
    sourceFormat: row.source_format || undefined,
    pointCount: row.point_count,
    bounds: row.bounds_json ? JSON.parse(row.bounds_json) : undefined,
    statistics: row.statistics_json ? JSON.parse(row.statistics_json) : undefined,
    crs: row.crs,
    points: JSON.parse(row.points_json || '[]'),
    status: row.status as SurveyDataset['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseSurface(row: DbGeneratedSurface): GeneratedSurface {
  return {
    id: row.id,
    projectId: row.project_id,
    datasetId: row.dataset_id || undefined,
    name: row.name,
    description: row.description || undefined,
    method: row.method as InterpolationMethodType,
    config: row.config_json ? JSON.parse(row.config_json) : undefined,
    surface: row.surface_json ? JSON.parse(row.surface_json) : undefined,
    metrics: row.metrics_json ? JSON.parse(row.metrics_json) : undefined,
    breaklineSources: row.breakline_sources ? row.breakline_sources.split(',') : undefined,
    status: row.status as GeneratedSurface['status'],
    errorMessage: row.error_message || undefined,
    computeTimeMs: row.compute_time_ms || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// GET - List surfaces and datasets for a project
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const type = searchParams.get('type'); // 'datasets', 'surfaces', or both (default)

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

      const result: {
        datasets?: SurveyDataset[];
        surfaces?: GeneratedSurface[];
      } = {};

      // Fetch datasets
      if (!type || type === 'datasets' || type === 'all') {
        const datasets = await query<DbSurveyDataset>(
          getDb(),
          `SELECT * FROM survey_datasets
           WHERE project_id = ?
           ORDER BY created_at DESC`,
          [id]
        );
        result.datasets = datasets.map(parseDataset);
      }

      // Fetch surfaces
      if (!type || type === 'surfaces' || type === 'all') {
        const surfaces = await query<DbGeneratedSurface>(
          getDb(),
          `SELECT * FROM generated_surfaces
           WHERE project_id = ?
           ORDER BY created_at DESC`,
          [id]
        );
        result.surfaces = surfaces.map(parseSurface);
      }

      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error fetching surfaces:', error);
      return NextResponse.json(
        { error: 'Failed to fetch surfaces' },
        { status: 500 }
      );
    }
  });
}

// ============================================================================
// POST - Create new dataset or surface
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { action } = body;

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

      // Action: Create dataset
      if (action === 'create_dataset') {
        const datasetId = generateId();
        const dataset: SurveyDataset = {
          id: datasetId,
          projectId: id,
          name: body.name || `Dataset ${new Date().toLocaleDateString('es-CL')}`,
          description: body.description,
          sourceFilename: body.sourceFilename,
          sourceFormat: body.sourceFormat,
          pointCount: body.points?.length || 0,
          bounds: body.bounds,
          statistics: body.statistics,
          crs: body.crs || 'EPSG:32719',
          points: body.points || [],
          status: 'ready',
          createdAt: now,
          updatedAt: now,
        };

        await execute(
          getDb(),
          `INSERT INTO survey_datasets (
            id, project_id, name, description, source_filename, source_format,
            point_count, bounds_json, statistics_json, crs, points_json,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dataset.id,
            id,
            dataset.name,
            dataset.description || null,
            dataset.sourceFilename || null,
            dataset.sourceFormat || null,
            dataset.pointCount,
            dataset.bounds ? JSON.stringify(dataset.bounds) : null,
            dataset.statistics ? JSON.stringify(dataset.statistics) : null,
            dataset.crs,
            JSON.stringify(dataset.points),
            dataset.status,
            now,
            now,
          ]
        );

        return NextResponse.json({
          success: true,
          dataset,
        });
      }

      // Action: Create surface
      if (action === 'create_surface') {
        const surfaceId = generateId();
        const surface: GeneratedSurface = {
          id: surfaceId,
          projectId: id,
          datasetId: body.datasetId,
          name: body.name || `Surface ${new Date().toLocaleDateString('es-CL')}`,
          description: body.description,
          method: body.method || 'delaunay',
          config: body.config,
          surface: body.surface,
          metrics: body.metrics,
          breaklineSources: body.breaklineSources,
          status: body.status || 'generating',
          errorMessage: body.errorMessage,
          computeTimeMs: body.computeTimeMs,
          createdAt: now,
          updatedAt: now,
        };

        await execute(
          getDb(),
          `INSERT INTO generated_surfaces (
            id, project_id, dataset_id, name, description, method,
            config_json, surface_json, metrics_json,
            breakline_sources, status, error_message, compute_time_ms,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            surface.id,
            id,
            surface.datasetId || null,
            surface.name,
            surface.description || null,
            surface.method,
            surface.config ? JSON.stringify(surface.config) : null,
            surface.surface ? JSON.stringify(surface.surface) : null,
            surface.metrics ? JSON.stringify(surface.metrics) : null,
            surface.breaklineSources?.join(',') || null,
            surface.status,
            surface.errorMessage || null,
            surface.computeTimeMs || null,
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

        return NextResponse.json({
          success: true,
          surface,
        });
      }

      return NextResponse.json(
        { error: 'Invalid action. Use "create_dataset" or "create_surface"' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Error creating surface/dataset:', error);
      return NextResponse.json(
        { error: 'Failed to create surface/dataset' },
        { status: 500 }
      );
    }
  });
}

// ============================================================================
// PUT - Update surface or dataset
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id: projectId } = await params;
      const body = await request.json();
      const { action, id: entityId, ...updates } = body;

      if (!entityId) {
        return NextResponse.json(
          { error: 'Entity ID is required' },
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

      const now = new Date().toISOString();

      // Update dataset
      if (action === 'update_dataset') {
        const existing = await queryOne<DbSurveyDataset>(
          getDb(),
          `SELECT id FROM survey_datasets WHERE id = ? AND project_id = ?`,
          [entityId, projectId]
        );

        if (!existing) {
          return NextResponse.json(
            { error: 'Dataset not found' },
            { status: 404 }
          );
        }

        const updateFields: string[] = ['updated_at = ?'];
        const updateValues: (string | number | null)[] = [now];

        if (updates.name !== undefined) {
          updateFields.push('name = ?');
          updateValues.push(updates.name);
        }
        if (updates.description !== undefined) {
          updateFields.push('description = ?');
          updateValues.push(updates.description);
        }
        if (updates.status !== undefined) {
          updateFields.push('status = ?');
          updateValues.push(updates.status);
        }
        if (updates.points !== undefined) {
          updateFields.push('points_json = ?');
          updateValues.push(JSON.stringify(updates.points));
          updateFields.push('point_count = ?');
          updateValues.push(updates.points.length);
        }
        if (updates.bounds !== undefined) {
          updateFields.push('bounds_json = ?');
          updateValues.push(JSON.stringify(updates.bounds));
        }
        if (updates.statistics !== undefined) {
          updateFields.push('statistics_json = ?');
          updateValues.push(JSON.stringify(updates.statistics));
        }

        updateValues.push(entityId);

        await execute(
          getDb(),
          `UPDATE survey_datasets SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );

        const updated = await queryOne<DbSurveyDataset>(
          getDb(),
          `SELECT * FROM survey_datasets WHERE id = ?`,
          [entityId]
        );

        return NextResponse.json({
          success: true,
          dataset: updated ? parseDataset(updated) : null,
        });
      }

      // Update surface
      if (action === 'update_surface') {
        const existing = await queryOne<DbGeneratedSurface>(
          getDb(),
          `SELECT id FROM generated_surfaces WHERE id = ? AND project_id = ?`,
          [entityId, projectId]
        );

        if (!existing) {
          return NextResponse.json(
            { error: 'Surface not found' },
            { status: 404 }
          );
        }

        const updateFields: string[] = ['updated_at = ?'];
        const updateValues: (string | number | null)[] = [now];

        if (updates.name !== undefined) {
          updateFields.push('name = ?');
          updateValues.push(updates.name);
        }
        if (updates.description !== undefined) {
          updateFields.push('description = ?');
          updateValues.push(updates.description);
        }
        if (updates.status !== undefined) {
          updateFields.push('status = ?');
          updateValues.push(updates.status);
        }
        if (updates.errorMessage !== undefined) {
          updateFields.push('error_message = ?');
          updateValues.push(updates.errorMessage);
        }
        if (updates.surface !== undefined) {
          updateFields.push('surface_json = ?');
          updateValues.push(JSON.stringify(updates.surface));
        }
        if (updates.metrics !== undefined) {
          updateFields.push('metrics_json = ?');
          updateValues.push(JSON.stringify(updates.metrics));
        }
        if (updates.computeTimeMs !== undefined) {
          updateFields.push('compute_time_ms = ?');
          updateValues.push(updates.computeTimeMs);
        }

        updateValues.push(entityId);

        await execute(
          getDb(),
          `UPDATE generated_surfaces SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );

        // Update project timestamp
        await execute(
          getDb(),
          `UPDATE projects SET updated_at = ? WHERE id = ?`,
          [now, projectId]
        );

        const updated = await queryOne<DbGeneratedSurface>(
          getDb(),
          `SELECT * FROM generated_surfaces WHERE id = ?`,
          [entityId]
        );

        return NextResponse.json({
          success: true,
          surface: updated ? parseSurface(updated) : null,
        });
      }

      return NextResponse.json(
        { error: 'Invalid action. Use "update_dataset" or "update_surface"' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Error updating surface/dataset:', error);
      return NextResponse.json(
        { error: 'Failed to update surface/dataset' },
        { status: 500 }
      );
    }
  });
}

// ============================================================================
// DELETE - Delete surface or dataset
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id: projectId } = await params;
      const { searchParams } = new URL(request.url);
      const entityId = searchParams.get('id');
      const entityType = searchParams.get('type'); // 'dataset' or 'surface'

      if (!entityId || !entityType) {
        return NextResponse.json(
          { error: 'Entity ID and type are required' },
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

      if (entityType === 'dataset') {
        // Check if any surfaces depend on this dataset
        const dependentSurfaces = await query<{ id: string }>(
          getDb(),
          `SELECT id FROM generated_surfaces WHERE dataset_id = ?`,
          [entityId]
        );

        if (dependentSurfaces.length > 0) {
          return NextResponse.json(
            {
              error: 'Cannot delete dataset with dependent surfaces',
              dependentSurfaces: dependentSurfaces.map(s => s.id),
            },
            { status: 400 }
          );
        }

        await execute(
          getDb(),
          `DELETE FROM survey_datasets WHERE id = ? AND project_id = ?`,
          [entityId, projectId]
        );

        return NextResponse.json({
          success: true,
          message: 'Dataset deleted',
        });
      }

      if (entityType === 'surface') {
        await execute(
          getDb(),
          `DELETE FROM generated_surfaces WHERE id = ? AND project_id = ?`,
          [entityId, projectId]
        );

        return NextResponse.json({
          success: true,
          message: 'Surface deleted',
        });
      }

      return NextResponse.json(
        { error: 'Invalid type. Use "dataset" or "surface"' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Error deleting surface/dataset:', error);
      return NextResponse.json(
        { error: 'Failed to delete surface/dataset' },
        { status: 500 }
      );
    }
  });
}
