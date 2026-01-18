/**
 * Level of Detail (LOD) System
 * Reduces geometry complexity based on zoom level for better performance
 */

import type { LatLng } from '@/types/cad';

export interface LODConfig {
  // Zoom level thresholds
  levels: {
    zoom: number;        // Zoom level threshold
    tolerance: number;   // Simplification tolerance in degrees
    minPoints: number;   // Minimum points to keep after simplification
  }[];
  // Skip simplification for entities with fewer points
  minPointsToSimplify: number;
}

// Default LOD configuration
export const DEFAULT_LOD_CONFIG: LODConfig = {
  levels: [
    { zoom: 18, tolerance: 0.00001, minPoints: 2 },   // High detail
    { zoom: 16, tolerance: 0.00005, minPoints: 2 },   // Medium-high detail
    { zoom: 14, tolerance: 0.0001, minPoints: 2 },    // Medium detail
    { zoom: 12, tolerance: 0.0005, minPoints: 2 },    // Low detail
    { zoom: 10, tolerance: 0.001, minPoints: 2 },     // Very low detail
    { zoom: 0, tolerance: 0.005, minPoints: 2 },      // Minimal detail
  ],
  minPointsToSimplify: 3,
};

/**
 * Douglas-Peucker line simplification algorithm
 * Reduces the number of points while preserving shape
 */
export function douglasPeucker(
  points: LatLng[],
  tolerance: number
): LatLng[] {
  if (points.length <= 2) return points;

  // Find the point with maximum distance from the line between first and last
  const first = points[0];
  const last = points[points.length - 1];

  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);

    // Combine results (remove duplicate middle point)
    return [...left.slice(0, -1), ...right];
  }

  // If all points are within tolerance, keep only endpoints
  return [first, last];
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: LatLng,
  lineStart: LatLng,
  lineEnd: LatLng
): number {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;

  // Line length squared
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Line start and end are the same point
    const ddx = point.lng - lineStart.lng;
    const ddy = point.lat - lineStart.lat;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }

  // Project point onto line
  const t = Math.max(0, Math.min(1, (
    (point.lng - lineStart.lng) * dx +
    (point.lat - lineStart.lat) * dy
  ) / lenSq));

  // Find closest point on line
  const closestLng = lineStart.lng + t * dx;
  const closestLat = lineStart.lat + t * dy;

  // Distance to closest point
  const ddx = point.lng - closestLng;
  const ddy = point.lat - closestLat;

  return Math.sqrt(ddx * ddx + ddy * ddy);
}

/**
 * Get the appropriate LOD level for a zoom level
 */
export function getLODLevel(
  zoom: number,
  config: LODConfig = DEFAULT_LOD_CONFIG
): { tolerance: number; minPoints: number } {
  for (const level of config.levels) {
    if (zoom >= level.zoom) {
      return { tolerance: level.tolerance, minPoints: level.minPoints };
    }
  }
  // Return lowest detail level
  const lastLevel = config.levels[config.levels.length - 1];
  return { tolerance: lastLevel.tolerance, minPoints: lastLevel.minPoints };
}

/**
 * Simplify polyline based on zoom level
 */
export function simplifyPolyline(
  points: LatLng[],
  zoom: number,
  config: LODConfig = DEFAULT_LOD_CONFIG
): LatLng[] {
  if (points.length < config.minPointsToSimplify) {
    return points;
  }

  const { tolerance, minPoints } = getLODLevel(zoom, config);
  const simplified = douglasPeucker(points, tolerance);

  // Ensure we have at least minPoints
  if (simplified.length < minPoints && points.length >= minPoints) {
    return evenlySpacedPoints(points, minPoints);
  }

  return simplified;
}

/**
 * Get evenly spaced points along a polyline
 */
function evenlySpacedPoints(points: LatLng[], count: number): LatLng[] {
  if (points.length <= count) return points;

  const result: LatLng[] = [points[0]];
  const step = (points.length - 1) / (count - 1);

  for (let i = 1; i < count - 1; i++) {
    const index = Math.round(i * step);
    result.push(points[index]);
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Simplify circle to polygon based on zoom level
 * Higher zoom = more segments
 */
export function getCircleSegments(zoom: number): number {
  if (zoom >= 18) return 64;
  if (zoom >= 16) return 48;
  if (zoom >= 14) return 32;
  if (zoom >= 12) return 24;
  if (zoom >= 10) return 16;
  return 12;
}

/**
 * Generate circle points at appropriate LOD
 */
export function generateCirclePoints(
  center: LatLng,
  radiusMeters: number,
  zoom: number
): LatLng[] {
  const segments = getCircleSegments(zoom);
  const points: LatLng[] = [];

  // Convert radius to approximate lat/lng offset
  const latOffset = radiusMeters / 111320;
  const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    points.push({
      lat: center.lat + latOffset * Math.sin(angle),
      lng: center.lng + lngOffset * Math.cos(angle),
    });
  }

  return points;
}

/**
 * Generate arc points at appropriate LOD
 */
export function generateArcPoints(
  center: LatLng,
  radiusMeters: number,
  startAngle: number,
  endAngle: number,
  zoom: number
): LatLng[] {
  // Calculate arc span (handle wrap-around)
  let span = endAngle - startAngle;
  if (span < 0) span += 2 * Math.PI;

  // Calculate number of segments based on arc span and zoom
  const fullCircleSegments = getCircleSegments(zoom);
  const arcSegments = Math.max(4, Math.ceil(fullCircleSegments * (span / (2 * Math.PI))));

  const points: LatLng[] = [];

  // Convert radius to approximate lat/lng offset
  const latOffset = radiusMeters / 111320;
  const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));

  for (let i = 0; i <= arcSegments; i++) {
    const angle = startAngle + (span * i) / arcSegments;
    points.push({
      lat: center.lat + latOffset * Math.sin(angle),
      lng: center.lng + lngOffset * Math.cos(angle),
    });
  }

  return points;
}

/**
 * LOD cache for pre-computed simplified geometries
 */
export class LODCache<T> {
  private cache: Map<string, Map<number, T>> = new Map();

  /**
   * Get cached LOD version or compute and cache it
   */
  getOrCompute(
    entityId: string,
    zoomLevel: number,
    compute: () => T
  ): T {
    // Bucket zoom to discrete levels for caching
    const bucketedZoom = this.bucketZoom(zoomLevel);

    let entityCache = this.cache.get(entityId);
    if (!entityCache) {
      entityCache = new Map();
      this.cache.set(entityId, entityCache);
    }

    let cached = entityCache.get(bucketedZoom);
    if (!cached) {
      cached = compute();
      entityCache.set(bucketedZoom, cached);
    }

    return cached;
  }

  /**
   * Bucket zoom levels to reduce cache entries
   */
  private bucketZoom(zoom: number): number {
    if (zoom >= 18) return 18;
    if (zoom >= 16) return 16;
    if (zoom >= 14) return 14;
    if (zoom >= 12) return 12;
    if (zoom >= 10) return 10;
    return 8;
  }

  /**
   * Clear cache for an entity
   */
  invalidate(entityId: string): void {
    this.cache.delete(entityId);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    let count = 0;
    for (const entityCache of this.cache.values()) {
      count += entityCache.size;
    }
    return count;
  }
}

/**
 * Entity visibility based on size and zoom
 * Skip rendering very small entities at low zoom
 */
export function shouldRenderAtZoom(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  zoom: number
): boolean {
  // Calculate entity size in degrees
  const latSize = bounds.maxLat - bounds.minLat;
  const lngSize = bounds.maxLng - bounds.minLng;
  const size = Math.max(latSize, lngSize);

  // Minimum visible size based on zoom (roughly 2 pixels)
  // At zoom 0, 1 degree = 256 pixels (whole world in 256px tile)
  // At zoom N, 1 degree = 256 * 2^N pixels
  const pixelsPerDegree = 256 * Math.pow(2, zoom);
  const entityPixels = size * pixelsPerDegree;

  // Don't render if entity is smaller than 2 pixels
  return entityPixels >= 2;
}
