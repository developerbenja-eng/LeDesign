/**
 * Smart Surface Generation - Delaunay Triangulation
 *
 * Generates TIN (Triangulated Irregular Network) surfaces from survey points
 * using the delaunator library for fast Delaunay triangulation.
 */

import Delaunator from 'delaunator';
import type { TINSurface, Point3D } from '../cad-types';
import {
  SurveyPoint,
  TriangulationResult,
  Triangle,
  Edge,
  TriangulationStatistics,
  TriangulationConfig,
  BoundingBox,
} from './types';
import { calculateBounds } from './point-parser';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_TRIANGULATION_CONFIG: TriangulationConfig = {
  removeOutliers: true,
  outlierThreshold: 3.0,
  removeDuplicates: true,
  duplicateTolerance: 0.001,
  maxEdgeLength: undefined,
  minTriangleArea: undefined,
};

// ============================================================================
// Main Triangulation Function
// ============================================================================

/**
 * Perform Delaunay triangulation on survey points
 */
export function triangulate(
  points: SurveyPoint[],
  config: Partial<TriangulationConfig> = {}
): TriangulationResult {
  const startTime = performance.now();
  const fullConfig = { ...DEFAULT_TRIANGULATION_CONFIG, ...config };

  if (points.length < 3) {
    throw new Error('At least 3 points are required for triangulation');
  }

  // Prepare coordinate array for Delaunator (flat array of [x, y, x, y, ...])
  const coords = new Float64Array(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    coords[i * 2] = points[i].x;
    coords[i * 2 + 1] = points[i].y;
  }

  // Perform triangulation
  const delaunay = new Delaunator(coords);

  // Extract triangles
  const triangles: Triangle[] = [];
  const numTriangles = delaunay.triangles.length / 3;

  for (let t = 0; t < numTriangles; t++) {
    const i0 = delaunay.triangles[t * 3];
    const i1 = delaunay.triangles[t * 3 + 1];
    const i2 = delaunay.triangles[t * 3 + 2];

    const p0 = points[i0];
    const p1 = points[i1];
    const p2 = points[i2];

    // Calculate triangle properties
    const triangle = createTriangle([i0, i1, i2], p0, p1, p2);

    // Apply filters
    if (fullConfig.maxEdgeLength !== undefined) {
      const maxEdge = Math.max(
        distance2D(p0, p1),
        distance2D(p1, p2),
        distance2D(p2, p0)
      );
      if (maxEdge > fullConfig.maxEdgeLength) continue;
    }

    if (fullConfig.minTriangleArea !== undefined) {
      if (triangle.area < fullConfig.minTriangleArea) continue;
    }

    triangles.push(triangle);
  }

  // Extract edges
  const edges = extractEdges(delaunay, points);

  // Get convex hull indices
  const hullIndices = Array.from(delaunay.hull) as number[];

  const computeTime = performance.now() - startTime;

  // Calculate statistics
  const statistics = calculateTriangulationStatistics(triangles, edges, hullIndices, computeTime);

  return {
    triangles,
    points,
    edges,
    hullIndices,
    statistics,
  };
}

// ============================================================================
// Triangle Creation & Calculations
// ============================================================================

/**
 * Create a Triangle object with calculated properties
 */
function createTriangle(
  indices: [number, number, number],
  p0: SurveyPoint,
  p1: SurveyPoint,
  p2: SurveyPoint
): Triangle {
  // Calculate area using cross product
  const ax = p1.x - p0.x;
  const ay = p1.y - p0.y;
  const bx = p2.x - p0.x;
  const by = p2.y - p0.y;
  const area = Math.abs(ax * by - ay * bx) / 2;

  // Calculate centroid
  const centroid = {
    x: (p0.x + p1.x + p2.x) / 3,
    y: (p0.y + p1.y + p2.y) / 3,
    z: (p0.z + p1.z + p2.z) / 3,
  };

  // Calculate normal vector
  const v1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
  const v2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
  const normal = normalize({
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  });

  // Ensure normal points upward
  if (normal.z < 0) {
    normal.x = -normal.x;
    normal.y = -normal.y;
    normal.z = -normal.z;
  }

  // Calculate slope (angle from horizontal)
  const slope = Math.acos(Math.abs(normal.z)) * (180 / Math.PI);

  // Calculate aspect (direction of steepest descent)
  let aspect = Math.atan2(normal.y, normal.x) * (180 / Math.PI);
  aspect = (450 - aspect) % 360; // Convert to degrees from north

  return {
    indices,
    area,
    centroid,
    normal,
    slope,
    aspect,
  };
}

/**
 * Extract unique edges from triangulation
 */
function extractEdges(delaunay: Delaunator<Float64Array>, points: SurveyPoint[]): Edge[] {
  const edgeMap = new Map<string, Edge>();
  const hullSet = new Set(delaunay.hull) as Set<number>;

  const numTriangles = delaunay.triangles.length / 3;

  for (let t = 0; t < numTriangles; t++) {
    const i0 = delaunay.triangles[t * 3];
    const i1 = delaunay.triangles[t * 3 + 1];
    const i2 = delaunay.triangles[t * 3 + 2];

    addEdge(edgeMap, i0, i1, points, hullSet);
    addEdge(edgeMap, i1, i2, points, hullSet);
    addEdge(edgeMap, i2, i0, points, hullSet);
  }

  return Array.from(edgeMap.values());
}

function addEdge(
  edgeMap: Map<string, Edge>,
  i0: number,
  i1: number,
  points: SurveyPoint[],
  hullSet: Set<number>
): void {
  const key = i0 < i1 ? `${i0}_${i1}` : `${i1}_${i0}`;

  if (!edgeMap.has(key)) {
    const p0 = points[i0];
    const p1 = points[i1];
    const length = distance3D(p0, p1);
    const isHull = hullSet.has(i0) && hullSet.has(i1);

    edgeMap.set(key, {
      indices: i0 < i1 ? [i0, i1] : [i1, i0],
      length,
      isHull,
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function distance2D(p0: SurveyPoint, p1: SurveyPoint): number {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function distance3D(p0: SurveyPoint, p1: SurveyPoint): number {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dz = p1.z - p0.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// ============================================================================
// Statistics
// ============================================================================

function calculateTriangulationStatistics(
  triangles: Triangle[],
  edges: Edge[],
  hullIndices: number[],
  computeTime: number
): TriangulationStatistics {
  if (triangles.length === 0) {
    return {
      triangleCount: 0,
      edgeCount: 0,
      hullEdgeCount: hullIndices.length,
      minTriangleArea: 0,
      maxTriangleArea: 0,
      avgTriangleArea: 0,
      totalArea: 0,
      computeTime,
    };
  }

  const areas = triangles.map(t => t.area);
  const totalArea = areas.reduce((a, b) => a + b, 0);
  const hullEdgeCount = edges.filter(e => e.isHull).length;

  return {
    triangleCount: triangles.length,
    edgeCount: edges.length,
    hullEdgeCount,
    minTriangleArea: Math.min(...areas),
    maxTriangleArea: Math.max(...areas),
    avgTriangleArea: totalArea / triangles.length,
    totalArea,
    computeTime,
  };
}

// ============================================================================
// Convert to TINSurface (for 3D viewer)
// ============================================================================

/**
 * Convert triangulation result to TINSurface format for visualization
 */
export function toTINSurface(
  result: TriangulationResult,
  name: string,
  id?: string
): TINSurface {
  // Build points map
  const pointsMap = new Map<string, Point3D>();
  for (let i = 0; i < result.points.length; i++) {
    const p = result.points[i];
    pointsMap.set(String(i), { x: p.x, y: p.y, z: p.z });
  }

  // Build faces array (0-indexed)
  const faces: [number, number, number][] = result.triangles.map(t => t.indices);

  // Calculate bounds
  const bounds = calculateBounds(result.points);

  return {
    id: id || `surface_${Date.now()}`,
    name,
    points: pointsMap,
    faces,
    bounds: {
      min: { x: bounds.minX, y: bounds.minY, z: bounds.minZ },
      max: { x: bounds.maxX, y: bounds.maxY, z: bounds.maxZ },
    },
  };
}

// ============================================================================
// Point-in-Triangle Query
// ============================================================================

/**
 * Find which triangle contains a given XY point
 */
export function findTriangleAt(
  result: TriangulationResult,
  x: number,
  y: number
): { triangle: Triangle; barycentricCoords: [number, number, number] } | null {
  for (const triangle of result.triangles) {
    const [i0, i1, i2] = triangle.indices;
    const p0 = result.points[i0];
    const p1 = result.points[i1];
    const p2 = result.points[i2];

    const bary = barycentricCoords(x, y, p0, p1, p2);

    if (bary[0] >= 0 && bary[1] >= 0 && bary[2] >= 0) {
      return { triangle, barycentricCoords: bary };
    }
  }

  return null;
}

/**
 * Get elevation at a point by interpolating within the containing triangle
 */
export function getElevationAt(
  result: TriangulationResult,
  x: number,
  y: number
): number | null {
  const found = findTriangleAt(result, x, y);
  if (!found) return null;

  const { triangle, barycentricCoords: bary } = found;
  const [i0, i1, i2] = triangle.indices;
  const p0 = result.points[i0];
  const p1 = result.points[i1];
  const p2 = result.points[i2];

  // Interpolate elevation using barycentric coordinates
  return bary[0] * p0.z + bary[1] * p1.z + bary[2] * p2.z;
}

/**
 * Calculate barycentric coordinates
 */
function barycentricCoords(
  x: number,
  y: number,
  p0: SurveyPoint,
  p1: SurveyPoint,
  p2: SurveyPoint
): [number, number, number] {
  const v0x = p2.x - p0.x;
  const v0y = p2.y - p0.y;
  const v1x = p1.x - p0.x;
  const v1y = p1.y - p0.y;
  const v2x = x - p0.x;
  const v2y = y - p0.y;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return [1 - u - v, v, u];
}

// ============================================================================
// Contour Generation
// ============================================================================

/**
 * Generate contour lines from triangulation at specified intervals
 */
export function generateContours(
  result: TriangulationResult,
  interval: number = 1.0,
  minElevation?: number,
  maxElevation?: number
): Map<number, Array<Array<{ x: number; y: number }>>> {
  const bounds = calculateBounds(result.points);
  const zMin = minElevation ?? Math.floor(bounds.minZ / interval) * interval;
  const zMax = maxElevation ?? Math.ceil(bounds.maxZ / interval) * interval;

  const contours = new Map<number, Array<Array<{ x: number; y: number }>>>();

  for (let z = zMin; z <= zMax; z += interval) {
    const segments: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];

    // Find contour intersections in each triangle
    for (const triangle of result.triangles) {
      const [i0, i1, i2] = triangle.indices;
      const p0 = result.points[i0];
      const p1 = result.points[i1];
      const p2 = result.points[i2];

      const intersections: Array<{ x: number; y: number }> = [];

      // Check each edge for intersection
      const checkEdge = (pa: SurveyPoint, pb: SurveyPoint) => {
        if ((pa.z <= z && pb.z > z) || (pa.z > z && pb.z <= z)) {
          const t = (z - pa.z) / (pb.z - pa.z);
          intersections.push({
            x: pa.x + t * (pb.x - pa.x),
            y: pa.y + t * (pb.y - pa.y),
          });
        }
      };

      checkEdge(p0, p1);
      checkEdge(p1, p2);
      checkEdge(p2, p0);

      if (intersections.length === 2) {
        segments.push([intersections[0], intersections[1]]);
      }
    }

    // Connect segments into polylines (simplified - just store segments)
    if (segments.length > 0) {
      const polylines = connectSegments(segments);
      contours.set(z, polylines);
    }
  }

  return contours;
}

/**
 * Connect line segments into continuous polylines
 */
function connectSegments(
  segments: Array<[{ x: number; y: number }, { x: number; y: number }]>
): Array<Array<{ x: number; y: number }>> {
  if (segments.length === 0) return [];

  const tolerance = 0.001;
  const used = new Set<number>();
  const polylines: Array<Array<{ x: number; y: number }>> = [];

  const pointsEqual = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;

  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue;

    const polyline = [...segments[i]];
    used.add(i);

    // Try to extend the polyline
    let extended = true;
    while (extended) {
      extended = false;
      for (let j = 0; j < segments.length; j++) {
        if (used.has(j)) continue;

        const seg = segments[j];
        const first = polyline[0];
        const last = polyline[polyline.length - 1];

        if (pointsEqual(last, seg[0])) {
          polyline.push(seg[1]);
          used.add(j);
          extended = true;
        } else if (pointsEqual(last, seg[1])) {
          polyline.push(seg[0]);
          used.add(j);
          extended = true;
        } else if (pointsEqual(first, seg[1])) {
          polyline.unshift(seg[0]);
          used.add(j);
          extended = true;
        } else if (pointsEqual(first, seg[0])) {
          polyline.unshift(seg[1]);
          used.add(j);
          extended = true;
        }
      }
    }

    polylines.push(polyline);
  }

  return polylines;
}

// ============================================================================
// Slope/Aspect Analysis
// ============================================================================

/**
 * Get slope at a point
 */
export function getSlopeAt(result: TriangulationResult, x: number, y: number): number | null {
  const found = findTriangleAt(result, x, y);
  return found ? found.triangle.slope ?? null : null;
}

/**
 * Get aspect at a point
 */
export function getAspectAt(result: TriangulationResult, x: number, y: number): number | null {
  const found = findTriangleAt(result, x, y);
  return found ? found.triangle.aspect ?? null : null;
}

/**
 * Calculate slope statistics for the entire surface
 */
export function calculateSlopeStatistics(result: TriangulationResult): {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  histogram: Array<{ range: string; count: number; percent: number }>;
} {
  const slopes = result.triangles
    .filter(t => t.slope !== undefined)
    .map(t => t.slope!);

  if (slopes.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      stdDev: 0,
      histogram: [],
    };
  }

  const min = Math.min(...slopes);
  const max = Math.max(...slopes);
  const mean = slopes.reduce((a, b) => a + b, 0) / slopes.length;
  const variance = slopes.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / slopes.length;
  const stdDev = Math.sqrt(variance);

  // Create histogram with slope classes
  const classes = [
    { range: '0-5°', min: 0, max: 5 },
    { range: '5-15°', min: 5, max: 15 },
    { range: '15-30°', min: 15, max: 30 },
    { range: '30-45°', min: 30, max: 45 },
    { range: '>45°', min: 45, max: 90 },
  ];

  const histogram = classes.map(c => {
    const count = slopes.filter(s => s >= c.min && s < c.max).length;
    return {
      range: c.range,
      count,
      percent: (count / slopes.length) * 100,
    };
  });

  return { min, max, mean, stdDev, histogram };
}
