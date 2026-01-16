import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getDb, query, queryOne } from '@ledesign/db';
import {
  calculateVolumes,
  createVolumeGrid,
  generateCutFillHeatMap,
  calculateCrossSections,
  calculateMassHaul,
  type Surface,
  type VolumeResult,
} from '@ledesign/terrain/volume-calculation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface CompareSurfacesRequest {
  existingSurfaceId: string;
  proposedSurfaceId: string;
  gridResolution?: number; // meters
  includeHeatMap?: boolean;
  includeCrossSections?: boolean;
  alignment?: Array<{ x: number; y: number }>; // for cross sections
  crossSectionInterval?: number; // meters
}

interface SurfaceRecord {
  id: string;
  name: string;
  surface_json: string;
  method: string;
  project_id: string;
}

interface Project {
  id: string;
}

/**
 * POST /api/projects/[id]/surfaces/compare
 *
 * Compare two surfaces and calculate cut/fill volumes
 *
 * Request body:
 * {
 *   "existingSurfaceId": "uuid",
 *   "proposedSurfaceId": "uuid",
 *   "gridResolution": 1.0,
 *   "includeHeatMap": true,
 *   "includeCrossSections": false,
 *   "alignment": [{ x, y }, ...],
 *   "crossSectionInterval": 20
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    const startTime = Date.now();

    try {
      const { id: projectId } = await params;
      const body: CompareSurfacesRequest = await request.json();

      const { existingSurfaceId, proposedSurfaceId, gridResolution = 1.0 } = body;

      if (!existingSurfaceId || !proposedSurfaceId) {
        return NextResponse.json(
          { error: 'Both existingSurfaceId and proposedSurfaceId are required' },
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
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const db = getDb();

      // Fetch both surfaces
      const surfaces = await query<SurfaceRecord>(
        db,
        `SELECT id, name, surface_json, method
         FROM generated_surfaces
         WHERE id IN (?, ?) AND project_id = ? AND status = 'ready'`,
        [existingSurfaceId, proposedSurfaceId, projectId]
      );

      if (surfaces.length !== 2) {
        return NextResponse.json(
          { error: 'One or both surfaces not found or not ready' },
          { status: 404 }
        );
      }

      // Parse surface data
      const existingSurfaceRecord = surfaces.find((s) => s.id === existingSurfaceId);
      const proposedSurfaceRecord = surfaces.find((s) => s.id === proposedSurfaceId);

      if (!existingSurfaceRecord || !proposedSurfaceRecord) {
        return NextResponse.json({ error: 'Surface data mismatch' }, { status: 500 });
      }

      const existingSurface: Surface = JSON.parse(existingSurfaceRecord.surface_json);
      const proposedSurface: Surface = JSON.parse(proposedSurfaceRecord.surface_json);

      console.log(
        `Comparing surfaces: ${existingSurfaceRecord.name} (${existingSurface.triangles.length} triangles) vs ${proposedSurfaceRecord.name} (${proposedSurface.triangles.length} triangles)`
      );

      // Calculate volumes
      console.log(`Using grid resolution: ${gridResolution}m`);
      const volumeResult: VolumeResult = calculateVolumes(
        existingSurface,
        proposedSurface,
        gridResolution
      );

      console.log(
        `Volumes - Cut: ${volumeResult.cutVolume.toFixed(2)} m³, Fill: ${volumeResult.fillVolume.toFixed(2)} m³, Net: ${volumeResult.netVolume.toFixed(2)} m³`
      );

      // Optional: Heat map
      let heatMap = null;
      if (body.includeHeatMap) {
        const grid = createVolumeGrid(existingSurface, proposedSurface, gridResolution);
        heatMap = generateCutFillHeatMap(grid, false);
        console.log(`Generated heat map with ${heatMap.points.length} points`);
      }

      // Optional: Cross sections
      let crossSections = null;
      let massHaul = null;
      if (body.includeCrossSections && body.alignment && body.alignment.length >= 2) {
        const interval = body.crossSectionInterval || 20;
        crossSections = calculateCrossSections(
          existingSurface,
          proposedSurface,
          body.alignment,
          interval
        );

        // Calculate mass haul if cross sections generated
        massHaul = calculateMassHaul(crossSections, 100); // 100m free haul

        console.log(`Generated ${crossSections.length} cross sections`);
      }

      const computeTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        comparison: {
          existingSurface: {
            id: existingSurfaceRecord.id,
            name: existingSurfaceRecord.name,
            type: existingSurfaceRecord.method,
          },
          proposedSurface: {
            id: proposedSurfaceRecord.id,
            name: proposedSurfaceRecord.name,
            type: proposedSurfaceRecord.method,
          },
          volumes: {
            cut: volumeResult.cutVolume,
            fill: volumeResult.fillVolume,
            net: volumeResult.netVolume,
            cutArea: volumeResult.cutArea,
            fillArea: volumeResult.fillArea,
            noChangeArea: volumeResult.noChangeArea,
            totalArea: volumeResult.area,
            avgCutDepth: volumeResult.avgCutDepth,
            avgFillDepth: volumeResult.avgFillDepth,
            maxCutDepth: volumeResult.maxCutDepth,
            maxFillDepth: volumeResult.maxFillDepth,
          },
          grid: {
            resolution: volumeResult.gridResolution,
            points: volumeResult.gridPoints,
          },
          heatMap,
          crossSections,
          massHaul,
        },
        computeTimeMs: computeTime,
      });
    } catch (error) {
      console.error('Error comparing surfaces:', error);
      return NextResponse.json(
        {
          error: 'Failed to compare surfaces',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/projects/[id]/surfaces/compare
 *
 * List all surfaces available for comparison
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id: projectId } = await params;

      // Verify project ownership
      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const db = getDb();

      // Get all surfaces for project
      const surfaces = await query<{
        id: string;
        name: string;
        method: string;
        created_at: string;
      }>(
        db,
        `SELECT id, name, method, created_at
         FROM generated_surfaces
         WHERE project_id = ? AND status = 'ready'
         ORDER BY created_at DESC`,
        [projectId]
      );

      return NextResponse.json({
        success: true,
        surfaces,
        count: surfaces.length,
      });
    } catch (error) {
      console.error('Error listing surfaces:', error);
      return NextResponse.json(
        {
          error: 'Failed to list surfaces',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
