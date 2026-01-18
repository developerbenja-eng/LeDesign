/**
 * Smart Surface Generation - Inverse Distance Weighting (IDW)
 *
 * IDW interpolation for generating continuous surfaces from scattered points.
 * Simple, fast, and effective for moderately dense point distributions.
 */

import type { SurveyPoint, BoundingBox } from '../triangulation/types';
import {
  IDWConfig,
  DEFAULT_IDW_CONFIG,
  GridConfig,
  InterpolationResult,
  GridStatistics,
} from './types';

// ============================================================================
// Spatial Index for Neighbor Search
// ============================================================================

interface SpatialCell {
  points: SurveyPoint[];
}

class SpatialGrid {
  private cells: Map<string, SpatialCell> = new Map();
  private cellSize: number;
  private bounds: BoundingBox;

  constructor(points: SurveyPoint[], cellSize: number) {
    this.cellSize = cellSize;

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    this.bounds = { minX, maxX, minY, maxY, minZ, maxZ };

    // Insert points into grid
    for (const point of points) {
      const key = this.getCellKey(point.x, point.y);
      if (!this.cells.has(key)) {
        this.cells.set(key, { points: [] });
      }
      this.cells.get(key)!.points.push(point);
    }
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX}_${cellY}`;
  }

  /**
   * Find neighbors within radius, sorted by distance
   */
  findNeighbors(
    x: number,
    y: number,
    radius: number,
    maxCount: number
  ): Array<{ point: SurveyPoint; distance: number }> {
    const neighbors: Array<{ point: SurveyPoint; distance: number }> = [];

    // Determine cell range to search
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellY = Math.floor(y / this.cellSize);

    const radiusSquared = radius * radius;

    // Search neighboring cells
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const key = `${centerCellX + dx}_${centerCellY + dy}`;
        const cell = this.cells.get(key);
        if (!cell) continue;

        for (const point of cell.points) {
          const distX = point.x - x;
          const distY = point.y - y;
          const distSquared = distX * distX + distY * distY;

          if (distSquared <= radiusSquared) {
            neighbors.push({
              point,
              distance: Math.sqrt(distSquared),
            });
          }
        }
      }
    }

    // Sort by distance and limit count
    neighbors.sort((a, b) => a.distance - b.distance);
    return neighbors.slice(0, maxCount);
  }

  getBounds(): BoundingBox {
    return this.bounds;
  }
}

// ============================================================================
// IDW Interpolation
// ============================================================================

/**
 * Interpolate elevation at a single point using IDW
 */
export function interpolateIDW(
  x: number,
  y: number,
  points: SurveyPoint[],
  config: Partial<IDWConfig> = {}
): number | null {
  const cfg = { ...DEFAULT_IDW_CONFIG, ...config };

  // Find neighbors
  const neighbors: Array<{ point: SurveyPoint; distance: number }> = [];

  for (const point of points) {
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= cfg.searchRadius) {
      neighbors.push({ point, distance });
    }
  }

  // Sort by distance
  neighbors.sort((a, b) => a.distance - b.distance);

  // Check minimum neighbors
  if (neighbors.length < cfg.minNeighbors) {
    return null;
  }

  // Limit to max neighbors
  const useNeighbors = neighbors.slice(0, cfg.maxNeighbors);

  // Calculate weighted average
  let weightSum = 0;
  let valueSum = 0;

  for (const { point, distance } of useNeighbors) {
    // Handle exact match (point at interpolation location)
    if (distance < 0.0001) {
      return point.z;
    }

    const weight = 1 / Math.pow(distance + (cfg.smoothing || 0), cfg.power);
    weightSum += weight;
    valueSum += weight * point.z;
  }

  return valueSum / weightSum;
}

/**
 * Generate interpolated grid using IDW
 */
export function interpolateIDWGrid(
  points: SurveyPoint[],
  gridConfig: GridConfig,
  idwConfig: Partial<IDWConfig> = {}
): InterpolationResult {
  const startTime = performance.now();
  const cfg = { ...DEFAULT_IDW_CONFIG, ...idwConfig };

  // Build spatial index
  const spatialGrid = new SpatialGrid(points, cfg.searchRadius / 4);

  // Calculate grid dimensions
  const width = Math.ceil((gridConfig.bounds.maxX - gridConfig.bounds.minX) / gridConfig.resolution);
  const height = Math.ceil((gridConfig.bounds.maxY - gridConfig.bounds.minY) / gridConfig.resolution);

  const grid = new Float32Array(width * height);
  const noData = gridConfig.noDataValue ?? -9999;

  // Statistics tracking
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSquared = 0;
  let validCells = 0;
  let invalidCells = 0;

  // Interpolate each grid cell
  for (let row = 0; row < height; row++) {
    const y = gridConfig.bounds.maxY - row * gridConfig.resolution - gridConfig.resolution / 2;

    for (let col = 0; col < width; col++) {
      const x = gridConfig.bounds.minX + col * gridConfig.resolution + gridConfig.resolution / 2;
      const index = row * width + col;

      // Find neighbors using spatial index
      const neighbors = spatialGrid.findNeighbors(
        x,
        y,
        cfg.searchRadius,
        cfg.maxNeighbors
      );

      if (neighbors.length < cfg.minNeighbors) {
        grid[index] = noData;
        invalidCells++;
        continue;
      }

      // Calculate IDW value
      let weightSum = 0;
      let valueSum = 0;

      for (const { point, distance } of neighbors) {
        if (distance < 0.0001) {
          weightSum = 1;
          valueSum = point.z;
          break;
        }

        const weight = 1 / Math.pow(distance + (cfg.smoothing || 0), cfg.power);
        weightSum += weight;
        valueSum += weight * point.z;
      }

      const z = valueSum / weightSum;
      grid[index] = z;

      // Update statistics
      if (z < min) min = z;
      if (z > max) max = z;
      sum += z;
      sumSquared += z * z;
      validCells++;
    }
  }

  const computeTime = performance.now() - startTime;

  // Calculate final statistics
  const mean = validCells > 0 ? sum / validCells : 0;
  const variance = validCells > 0 ? sumSquared / validCells - mean * mean : 0;
  const stdDev = Math.sqrt(Math.max(0, variance));

  const statistics: GridStatistics = {
    min: validCells > 0 ? min : 0,
    max: validCells > 0 ? max : 0,
    mean,
    stdDev,
    validCells,
    invalidCells,
  };

  return {
    grid,
    width,
    height,
    bounds: gridConfig.bounds,
    resolution: gridConfig.resolution,
    statistics,
    computeTime,
  };
}

/**
 * Adaptive IDW - adjusts power based on local point density
 */
export function interpolateAdaptiveIDW(
  x: number,
  y: number,
  points: SurveyPoint[],
  config: Partial<IDWConfig> = {}
): number | null {
  const cfg = { ...DEFAULT_IDW_CONFIG, ...config };

  // Find neighbors
  const neighbors: Array<{ point: SurveyPoint; distance: number }> = [];

  for (const point of points) {
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= cfg.searchRadius) {
      neighbors.push({ point, distance });
    }
  }

  if (neighbors.length < cfg.minNeighbors) {
    return null;
  }

  neighbors.sort((a, b) => a.distance - b.distance);
  const useNeighbors = neighbors.slice(0, cfg.maxNeighbors);

  // Adapt power based on local density
  // Higher density = higher power (sharper weighting)
  // Lower density = lower power (smoother interpolation)
  const avgDistance =
    useNeighbors.reduce((sum, n) => sum + n.distance, 0) / useNeighbors.length;
  const adaptivePower = Math.max(1, Math.min(4, cfg.power * (cfg.searchRadius / avgDistance) * 0.3));

  // Calculate weighted average with adaptive power
  let weightSum = 0;
  let valueSum = 0;

  for (const { point, distance } of useNeighbors) {
    if (distance < 0.0001) {
      return point.z;
    }

    const weight = 1 / Math.pow(distance + (cfg.smoothing || 0), adaptivePower);
    weightSum += weight;
    valueSum += weight * point.z;
  }

  return valueSum / weightSum;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find optimal IDW power using cross-validation
 */
export function optimizeIDWPower(
  points: SurveyPoint[],
  powersToTest: number[] = [1, 1.5, 2, 2.5, 3],
  config: Partial<Omit<IDWConfig, 'power'>> = {}
): { optimalPower: number; errors: Map<number, number> } {
  const errors = new Map<number, number>();

  for (const power of powersToTest) {
    // Leave-one-out cross-validation
    let totalError = 0;
    let count = 0;

    for (let i = 0; i < Math.min(points.length, 100); i++) {
      // Use subset for speed
      const testPoint = points[i];
      const trainPoints = [...points.slice(0, i), ...points.slice(i + 1)];

      const predicted = interpolateIDW(testPoint.x, testPoint.y, trainPoints, {
        ...config,
        power,
      });

      if (predicted !== null) {
        totalError += Math.pow(predicted - testPoint.z, 2);
        count++;
      }
    }

    const rmse = count > 0 ? Math.sqrt(totalError / count) : Infinity;
    errors.set(power, rmse);
  }

  // Find power with minimum error
  let optimalPower = powersToTest[0];
  let minError = errors.get(optimalPower) || Infinity;

  for (const [power, error] of errors) {
    if (error < minError) {
      minError = error;
      optimalPower = power;
    }
  }

  return { optimalPower, errors };
}
