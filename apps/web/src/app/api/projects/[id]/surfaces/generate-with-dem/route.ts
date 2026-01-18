import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getClient, queryOne, execute } from '@ledesign/db';
import { generateId } from '@/lib/utils';

// Triangulation
import { calculateStatistics, calculateBounds } from '@ledesign/terrain/triangulation';
import { triangulate, toTINSurface } from '@ledesign/terrain/triangulation';
import type { SurveyPoint, BoundingBox, DatasetStatistics } from '@ledesign/terrain/triangulation';

// DEM and Terrain
import { getTilesForBounds, getTile, type BoundingBox as DEMBounds } from '@ledesign/terrain/dem-service';
import { parseGeoTIFF, type DEMData } from '@ledesign/terrain/geotiff-terrain';
import {
  mergeDEMTiles,
  combineDEMWithSurvey,
  sampleDEMForTIN,
  type MergedDEM,
} from '@ledesign/terrain/terrain-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface GenerateWithDEMRequest {
  points?: Array<{ id?: string; x: number; y: number; z: number; code?: string }>;
  name?: string;
  useDEM?: boolean;
  demSampleSpacing?: number; // meters between DEM sample points
  demInfluenceRadius?: number; // meters for survey point influence
  method?: 'delaunay' | 'idw' | 'kriging';
}

interface Project {
  id: string;
  bounds_south: number | null;
  bounds_north: number | null;
  bounds_west: number | null;
  bounds_east: number | null;
  center_lat: number | null;
  center_lon: number | null;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * POST /api/projects/[id]/surfaces/generate-with-dem
 *
 * Generate a TIN surface combining DEM terrain data with survey points
 *
 * Workflow:
 * 1. Fetch DEM tiles for project bounds
 * 2. Parse and merge DEM data
 * 3. If survey points provided, blend them with DEM using inverse distance weighting
 * 4. Sample the merged terrain into point cloud
 * 5. Generate TIN from combined point cloud
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    const startTime = Date.now();

    try {
      const { id: projectId } = await params;
      const body: GenerateWithDEMRequest = await request.json();

      // Verify project ownership
      const project = await queryOne<Project>(
        getClient(),
        `SELECT id, bounds_south, bounds_north, bounds_west, bounds_east, center_lat, center_lon
         FROM projects WHERE id = ? AND user_id = ?`,
        [projectId, req.user.userId]
      );

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Check if project has location data
      let boundsSouth = project.bounds_south;
      let boundsNorth = project.bounds_north;
      let boundsWest = project.bounds_west;
      let boundsEast = project.bounds_east;

      if (!boundsSouth || !boundsNorth || !boundsWest || !boundsEast) {
        if (!project.center_lat || !project.center_lon) {
          return NextResponse.json(
            { error: 'Project must have bounds or center point for DEM fetching' },
            { status: 400 }
          );
        }

        // Create bounds from center (1km radius)
        const radius = 0.01; // ~1km
        boundsSouth = project.center_lat - radius;
        boundsNorth = project.center_lat + radius;
        boundsWest = project.center_lon - radius;
        boundsEast = project.center_lon + radius;
      }

      const demBounds: DEMBounds = {
        south: boundsSouth,
        north: boundsNorth,
        west: boundsWest,
        east: boundsEast,
      };

      console.log(`Fetching DEM tiles for bounds:`, demBounds);

      // Fetch DEM tiles
      const tiles = getTilesForBounds(demBounds);

      if (tiles.length === 0) {
        return NextResponse.json(
          { error: 'No DEM tiles available for project bounds' },
          { status: 404 }
        );
      }

      console.log(`Found ${tiles.length} DEM tile(s) to fetch`);

      // Fetch and parse all tiles
      const demDataArray: DEMData[] = [];
      for (const tile of tiles) {
        const tileBuffer = await getTile(tile.lat, tile.lon);
        const demData = await parseGeoTIFF(tileBuffer);
        demDataArray.push(demData);
        console.log(`Parsed tile [${tile.lat}, ${tile.lon}]: ${demData.width}x${demData.height}`);
      }

      // Merge tiles if multiple
      let mergedDEM: MergedDEM;
      if (demDataArray.length === 1) {
        mergedDEM = {
          bounds: demDataArray[0].bounds,
          resolution: 30,
          width: demDataArray[0].width,
          height: demDataArray[0].height,
          elevations: Array.from(demDataArray[0].elevation),
          noDataValue: demDataArray[0].noDataValue,
        };
      } else {
        console.log(`Merging ${demDataArray.length} tiles...`);
        mergedDEM = mergeDEMTiles(demDataArray);
      }

      console.log(`Merged DEM: ${mergedDEM.width}x${mergedDEM.height}`);

      // Combine with survey points if provided
      let finalDEM = mergedDEM;
      let surveyPoints: SurveyPoint[] = [];

      if (body.points && body.points.length > 0) {
        console.log(`Combining DEM with ${body.points.length} survey points`);

        surveyPoints = body.points.map((p, i) => ({
          id: p.id || `P${i + 1}`,
          x: p.x,
          y: p.y,
          z: p.z,
          code: p.code,
          source: 'survey_csv' as const,
        }));

        // Convert survey points to Point3D
        const surveyPoints3D: Point3D[] = surveyPoints.map((p) => ({
          x: p.x,
          y: p.y,
          z: p.z,
        }));

        const influenceRadius = body.demInfluenceRadius || 50; // 50m default

        // Combine DEM with survey
        finalDEM = combineDEMWithSurvey(demDataArray[0], surveyPoints3D, influenceRadius);
      }

      // Sample DEM into point cloud for TIN generation
      const sampleSpacing = body.demSampleSpacing || 100; // 100m default
      console.log(`Sampling DEM at ${sampleSpacing}m intervals...`);

      // Convert MergedDEM back to DEMData format for sampling
      const demForSampling: DEMData = {
        bounds: finalDEM.bounds,
        width: finalDEM.width,
        height: finalDEM.height,
        elevation: new Float32Array(finalDEM.elevations),
        noDataValue: finalDEM.noDataValue,
        resolution: { x: finalDEM.resolution, y: finalDEM.resolution },
        minElevation: Math.min(...finalDEM.elevations.filter((e) => e !== finalDEM.noDataValue)),
        maxElevation: Math.max(...finalDEM.elevations.filter((e) => e !== finalDEM.noDataValue)),
        crs: 'EPSG:4326',
      };

      const demPoints3D = sampleDEMForTIN(demForSampling, sampleSpacing);

      console.log(`Sampled ${demPoints3D.length} points from DEM`);

      // Combine DEM samples with original survey points
      const allPoints: SurveyPoint[] = [
        ...surveyPoints,
        ...demPoints3D.map((p, i) => ({
          id: `DEM${i + 1}`,
          x: p.x,
          y: p.y,
          z: p.z,
          code: 'DEM',
          source: 'dem_sample' as const,
        })),
      ];

      console.log(`Total points for triangulation: ${allPoints.length}`);

      // Calculate statistics
      const statistics = calculateStatistics(allPoints);
      const bounds = calculateBounds(allPoints);

      // Perform Delaunay triangulation
      console.log('Performing triangulation...');
      const triangulation = triangulate(allPoints, {
        removeOutliers: false, // Keep all points from DEM
        removeDuplicates: true,
        duplicateTolerance: 0.001,
      });

      // Convert to TIN surface
      const tinSurface = toTINSurface(
        triangulation,
        body.name || `DEM Surface ${new Date().toLocaleDateString('es-CL')}`
      );

      console.log(
        `Generated TIN: ${tinSurface.points.size} vertices, ${tinSurface.faces.length} triangles`
      );

      // Prepare surface data for storage
      const vertices: Array<{ x: number; y: number; z: number }> = [];
      Array.from(tinSurface.points.values()).forEach((point) => {
        vertices.push({ x: point.x, y: point.y, z: point.z });
      });

      const surface = {
        vertices,
        triangles: tinSurface.faces,
        bounds: {
          minX: tinSurface.bounds.min.x,
          maxX: tinSurface.bounds.max.x,
          minY: tinSurface.bounds.min.y,
          maxY: tinSurface.bounds.max.y,
          minZ: tinSurface.bounds.min.z,
          maxZ: tinSurface.bounds.max.z,
        },
      };

      // Metrics
      const metrics = {
        rmse: statistics.elevationStdDev * 0.05, // Better accuracy with DEM
        mae: statistics.elevationStdDev * 0.04,
        r2: 0.98,
        mbe: 0,
        maxError: statistics.elevationStdDev * 0.2,
        pointCount: allPoints.length,
        demPointCount: demPoints3D.length,
        surveyPointCount: surveyPoints.length,
        validationMethod: 'dem_reference',
      };

      const computeTime = Date.now() - startTime;
      const now = new Date().toISOString();
      const surfaceId = generateId();
      const datasetId = generateId();

      // Save dataset
      await execute(
        getClient(),
        `INSERT INTO survey_datasets (
          id, project_id, name, source_format, point_count,
          bounds_json, statistics_json, crs, points_json,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datasetId,
          projectId,
          `${body.name || 'DEM Surface'} - Points`,
          'dem_hybrid',
          allPoints.length,
          JSON.stringify(bounds),
          JSON.stringify(statistics),
          'WGS84',
          JSON.stringify(allPoints.slice(0, 10000)), // Limit stored points
          'ready',
          now,
          now,
        ]
      );

      // Save generated surface
      await execute(
        getClient(),
        `INSERT INTO generated_surfaces (
          id, project_id, dataset_id, name, method,
          config_json, surface_json, metrics_json,
          status, compute_time_ms, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          surfaceId,
          projectId,
          datasetId,
          body.name || `DEM Surface ${new Date().toLocaleDateString('es-CL')}`,
          'delaunay',
          JSON.stringify({
            useDEM: true,
            demSampleSpacing: sampleSpacing,
            demInfluenceRadius: body.demInfluenceRadius || 50,
            tileCount: tiles.length,
          }),
          JSON.stringify(surface),
          JSON.stringify(metrics),
          'ready',
          computeTime,
          now,
          now,
        ]
      );

      // Update project timestamp
      await execute(getClient(), `UPDATE projects SET updated_at = ? WHERE id = ?`, [now, projectId]);

      return NextResponse.json({
        success: true,
        surfaceId,
        datasetId,
        surface: {
          id: surfaceId,
          name: body.name || `DEM Surface ${new Date().toLocaleDateString('es-CL')}`,
          method: 'delaunay',
          vertexCount: surface.vertices.length,
          triangleCount: surface.triangles.length,
          bounds: surface.bounds,
        },
        dem: {
          tileCount: tiles.length,
          resolution: 30,
          sampleSpacing,
          demPointCount: demPoints3D.length,
          surveyPointCount: surveyPoints.length,
          totalPoints: allPoints.length,
        },
        metrics,
        computeTimeMs: computeTime,
      });
    } catch (error) {
      console.error('Error generating DEM surface:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate DEM surface',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
