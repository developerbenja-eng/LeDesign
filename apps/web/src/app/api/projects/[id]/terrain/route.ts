import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getDb, execute, query, queryOne } from '@ledesign/db';
import { generateId } from '@/lib/utils';
import {
  getTilesForBounds,
  getTile,
  type BoundingBox,
} from '@ledesign/terrain/dem-service';
import { parseGeoTIFF, getElevationAt, type DEMData } from '@ledesign/terrain/geotiff-terrain';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Project {
  id: string;
  name: string;
  bounds_south: number | null;
  bounds_north: number | null;
  bounds_west: number | null;
  bounds_east: number | null;
  center_lat: number | null;
  center_lon: number | null;
}

interface TerrainRecord {
  id: string;
  name: string;
  source: string;
  dem_path: string | null;
  resolution: number;
  created_at: string;
}

/**
 * GET /api/projects/[id]/terrain
 *
 * Fetches DEM terrain data for a project based on its bounds
 * If bounds are not set, uses a default 1km radius around center point
 *
 * Query params:
 * - fetch: 'true' to fetch fresh data, otherwise returns cached if available
 * - source: 'copernicus' (default) or 'opentopography'
 * - buffer: extra buffer in degrees (default: 0.01 = ~1km)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id: projectId } = await params;
      const searchParams = request.nextUrl.searchParams;
      const forceFetch = searchParams.get('fetch') === 'true';
      const buffer = parseFloat(searchParams.get('buffer') || '0.01');

      const db = getDb();

      // Verify project ownership
      const project = await queryOne<Project>(
        db,
        `SELECT id, name, bounds_south, bounds_north, bounds_west, bounds_east, center_lat, center_lon
         FROM projects WHERE id = ? AND user_id = ?`,
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Determine bounds
      let bounds: BoundingBox;

      if (
        project.bounds_south !== null &&
        project.bounds_north !== null &&
        project.bounds_west !== null &&
        project.bounds_east !== null
      ) {
        // Use project bounds with buffer
        bounds = {
          south: project.bounds_south - buffer,
          north: project.bounds_north + buffer,
          west: project.bounds_west - buffer,
          east: project.bounds_east + buffer,
        };
      } else if (project.center_lat !== null && project.center_lon !== null) {
        // Create bounds around center point (default ~11km radius)
        const radius = buffer * 10; // Default 0.1 degree
        bounds = {
          south: project.center_lat - radius,
          north: project.center_lat + radius,
          west: project.center_lon - radius,
          east: project.center_lon + radius,
        };
      } else {
        return NextResponse.json(
          { error: 'Project has no location data (bounds or center)' },
          { status: 400 }
        );
      }

      // Check for cached terrain data
      if (!forceFetch) {
        const cached = await query<TerrainRecord>(
          db,
          `SELECT id, name, source, dem_path, resolution, created_at
           FROM project_topography
           WHERE project_id = ?
           ORDER BY created_at DESC
           LIMIT 1`,
          [projectId]
        );

        if (cached.length > 0) {
          return NextResponse.json({
            success: true,
            cached: true,
            terrain: cached[0],
            bounds,
          });
        }
      }

      // Fetch DEM tiles
      const tiles = getTilesForBounds(bounds);

      if (tiles.length === 0) {
        return NextResponse.json(
          { error: 'No DEM tiles found for project bounds' },
          { status: 404 }
        );
      }

      // Fetch first tile (Santiago area typically needs 1-2 tiles)
      // TODO: Merge multiple tiles into single DEM
      const firstTile = tiles[0];
      const tileBuffer = await getTile(firstTile.lat, firstTile.lon);

      // Parse GeoTIFF
      const demData = await parseGeoTIFF(tileBuffer);

      // Sample elevation at project center for verification
      let centerElevation: number | null = null;
      if (project.center_lat !== null && project.center_lon !== null) {
        centerElevation = getElevationAt(demData, project.center_lon, project.center_lat);
      }

      // Save to database
      const terrainId = generateId();
      const now = new Date().toISOString();

      await execute(
        db,
        `INSERT INTO project_topography (
          id, project_id, name, source, dem_path,
          bounds_south, bounds_north, bounds_west, bounds_east,
          resolution, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          terrainId,
          projectId,
          `DEM - ${project.name}`,
          'copernicus-30m',
          null, // Not storing actual DEM file yet
          demData.bounds.south,
          demData.bounds.north,
          demData.bounds.west,
          demData.bounds.east,
          30, // Copernicus 30m resolution
          now,
        ]
      );

      return NextResponse.json({
        success: true,
        cached: false,
        terrain: {
          id: terrainId,
          projectId,
          source: 'copernicus-30m',
          resolution: 30,
          bounds: demData.bounds,
          width: demData.width,
          height: demData.height,
          tiles: tiles.map((t) => ({
            lat: t.lat,
            lon: t.lon,
            url: `/api/dem?lat=${t.lat}&lon=${t.lon}`,
          })),
          centerElevation,
          stats: {
            min: demData.minElevation,
            max: demData.maxElevation,
            range: demData.maxElevation - demData.minElevation,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching project terrain:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch project terrain',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/projects/[id]/terrain
 *
 * Upload custom terrain data or link to external DEM
 *
 * Body:
 * {
 *   "name": "Custom Survey",
 *   "source": "survey" | "custom",
 *   "demPath": "gs://bucket/path/to/file.tif",
 *   "bounds": { south, north, west, east },
 *   "resolution": 1.0
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id: projectId } = await params;
      const body = await request.json();
      const { name, source, demPath, bounds, resolution } = body;

      if (!name || !source || !bounds || !resolution) {
        return NextResponse.json(
          { error: 'Missing required fields: name, source, bounds, resolution' },
          { status: 400 }
        );
      }

      const db = getDb();

      // Verify project ownership
      const project = await queryOne<Project>(
        db,
        'SELECT id FROM projects WHERE id = ? AND user_id = ?',
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Insert terrain record
      const terrainId = generateId();
      const now = new Date().toISOString();

      await execute(
        db,
        `INSERT INTO project_topography (
          id, project_id, name, source, dem_path,
          bounds_south, bounds_north, bounds_west, bounds_east,
          resolution, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          terrainId,
          projectId,
          name,
          source,
          demPath || null,
          bounds.south,
          bounds.north,
          bounds.west,
          bounds.east,
          resolution,
          now,
        ]
      );

      return NextResponse.json({
        success: true,
        terrain: {
          id: terrainId,
          projectId,
          name,
          source,
          demPath,
          bounds,
          resolution,
          createdAt: now,
        },
      });
    } catch (error) {
      console.error('Error creating terrain record:', error);
      return NextResponse.json(
        {
          error: 'Failed to create terrain record',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/projects/[id]/terrain
 *
 * Query params:
 * - terrainId: ID of terrain record to delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id: projectId } = await params;
      const terrainId = request.nextUrl.searchParams.get('terrainId');

      if (!terrainId) {
        return NextResponse.json({ error: 'Missing terrainId parameter' }, { status: 400 });
      }

      const db = getDb();

      // Verify project ownership before deletion
      const project = await queryOne<Project>(
        db,
        'SELECT id FROM projects WHERE id = ? AND user_id = ?',
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      await execute(db, 'DELETE FROM project_topography WHERE id = ? AND project_id = ?', [
        terrainId,
        projectId,
      ]);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting terrain:', error);
      return NextResponse.json(
        {
          error: 'Failed to delete terrain',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
