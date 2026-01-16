/**
 * Smart Surface Generation - Kriging Interpolation
 *
 * Ordinary Kriging with automatic variogram fitting.
 * Provides optimal linear unbiased estimates with uncertainty quantification.
 */

import { Matrix, inverse, solve } from 'ml-matrix';
import type { SurveyPoint, BoundingBox } from '../triangulation/types';
import {
  KrigingConfig,
  DEFAULT_KRIGING_CONFIG,
  VariogramParams,
  VariogramModel,
  ExperimentalVariogram,
  GridConfig,
  InterpolationResult,
  GridStatistics,
} from './types';

// ============================================================================
// Variogram Models
// ============================================================================

/**
 * Calculate semivariance for a given distance using specified model
 */
export function variogramValue(
  distance: number,
  params: VariogramParams
): number {
  const { model, nugget, sill, range } = params;
  const partialSill = sill - nugget;

  if (distance === 0) return 0;

  switch (model) {
    case 'spherical':
      if (distance >= range) {
        return sill;
      }
      const h = distance / range;
      return nugget + partialSill * (1.5 * h - 0.5 * h * h * h);

    case 'exponential':
      return nugget + partialSill * (1 - Math.exp(-3 * distance / range));

    case 'gaussian':
      return nugget + partialSill * (1 - Math.exp(-3 * (distance / range) ** 2));

    case 'linear':
      if (distance >= range) {
        return sill;
      }
      return nugget + partialSill * (distance / range);

    default:
      return nugget + partialSill * (1 - Math.exp(-3 * distance / range));
  }
}

// ============================================================================
// Experimental Variogram
// ============================================================================

/**
 * Calculate experimental (empirical) variogram from point data
 */
export function calculateExperimentalVariogram(
  points: SurveyPoint[],
  numLags: number = 15,
  lagTolerance: number = 0.5 // Fraction of lag distance
): ExperimentalVariogram {
  // Calculate maximum distance
  let maxDist = 0;
  for (let i = 0; i < Math.min(points.length, 100); i++) {
    for (let j = i + 1; j < Math.min(points.length, 100); j++) {
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) maxDist = dist;
    }
  }

  // Use half the max distance as the range for variogram
  const maxLagDist = maxDist / 2;
  const lagSize = maxLagDist / numLags;

  const lagDistances: number[] = [];
  const semivariances: number[] = [];
  const pairCounts: number[] = [];

  // Calculate semivariance for each lag
  for (let lag = 1; lag <= numLags; lag++) {
    const lagDist = lag * lagSize;
    const tolerance = lagSize * lagTolerance;

    let sumSquaredDiff = 0;
    let count = 0;

    // Sample pairs for efficiency
    const sampleSize = Math.min(points.length, 500);
    const indices = Array.from({ length: points.length }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, sampleSize);

    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        const p1 = points[indices[i]];
        const p2 = points[indices[j]];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (Math.abs(dist - lagDist) <= tolerance) {
          sumSquaredDiff += (p2.z - p1.z) ** 2;
          count++;
        }
      }
    }

    if (count > 0) {
      lagDistances.push(lagDist);
      semivariances.push(sumSquaredDiff / (2 * count));
      pairCounts.push(count);
    }
  }

  return { lagDistances, semivariances, pairCounts };
}

/**
 * Fit variogram model to experimental data
 */
export function fitVariogram(
  experimental: ExperimentalVariogram,
  model: VariogramModel = 'spherical'
): VariogramParams {
  const { lagDistances, semivariances, pairCounts } = experimental;

  if (lagDistances.length < 3) {
    // Not enough data, return reasonable defaults
    return {
      model,
      nugget: 0,
      sill: semivariances.length > 0 ? Math.max(...semivariances) : 1,
      range: lagDistances.length > 0 ? lagDistances[lagDistances.length - 1] : 100,
    };
  }

  // Initial estimates
  const maxSemivariance = Math.max(...semivariances);
  const weightedMean =
    semivariances.reduce((sum, s, i) => sum + s * pairCounts[i], 0) /
    pairCounts.reduce((sum, c) => sum + c, 0);

  // Estimate nugget from first lag (extrapolate to zero)
  let nuggetEstimate = Math.max(0, semivariances[0] - (semivariances[1] - semivariances[0]));

  // Estimate sill from plateau
  const sillEstimate = maxSemivariance;

  // Estimate range (distance where semivariance reaches ~95% of sill)
  let rangeEstimate = lagDistances[lagDistances.length - 1];
  for (let i = 0; i < semivariances.length; i++) {
    if (semivariances[i] >= 0.95 * sillEstimate) {
      rangeEstimate = lagDistances[i];
      break;
    }
  }

  // Simple optimization: grid search
  const bestParams = optimizeVariogramParams(
    experimental,
    model,
    nuggetEstimate,
    sillEstimate,
    rangeEstimate
  );

  return bestParams;
}

/**
 * Grid search optimization for variogram parameters
 */
function optimizeVariogramParams(
  experimental: ExperimentalVariogram,
  model: VariogramModel,
  nuggetInit: number,
  sillInit: number,
  rangeInit: number
): VariogramParams {
  const { lagDistances, semivariances, pairCounts } = experimental;

  let bestError = Infinity;
  let bestParams: VariogramParams = {
    model,
    nugget: nuggetInit,
    sill: sillInit,
    range: rangeInit,
  };

  // Search around initial estimates
  const nuggetRange = [0, nuggetInit * 0.5, nuggetInit, nuggetInit * 1.5];
  const sillMultipliers = [0.8, 0.9, 1.0, 1.1, 1.2];
  const rangeMultipliers = [0.7, 0.85, 1.0, 1.15, 1.3];

  for (const nugget of nuggetRange) {
    for (const sillMult of sillMultipliers) {
      const sill = Math.max(nugget + 0.1, sillInit * sillMult);

      for (const rangeMult of rangeMultipliers) {
        const range = rangeInit * rangeMult;

        const params: VariogramParams = { model, nugget, sill, range };

        // Calculate weighted sum of squared errors
        let error = 0;
        let totalWeight = 0;

        for (let i = 0; i < lagDistances.length; i++) {
          const predicted = variogramValue(lagDistances[i], params);
          const weight = pairCounts[i];
          error += weight * (predicted - semivariances[i]) ** 2;
          totalWeight += weight;
        }

        error /= totalWeight;

        if (error < bestError) {
          bestError = error;
          bestParams = params;
        }
      }
    }
  }

  return bestParams;
}

// ============================================================================
// Ordinary Kriging
// ============================================================================

/**
 * Interpolate a single point using Ordinary Kriging
 */
export function interpolateKriging(
  x: number,
  y: number,
  points: SurveyPoint[],
  variogramParams: VariogramParams,
  config: Partial<Omit<KrigingConfig, 'variogram'>> = {}
): { value: number; variance: number } | null {
  const cfg = { ...DEFAULT_KRIGING_CONFIG, ...config };

  // Find neighbors within search radius
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

  // Sort by distance and limit to maxNeighbors
  neighbors.sort((a, b) => a.distance - b.distance);
  const useNeighbors = neighbors.slice(0, cfg.maxNeighbors);
  const n = useNeighbors.length;

  // Check for exact match
  if (useNeighbors[0].distance < 0.0001) {
    return { value: useNeighbors[0].point.z, variance: 0 };
  }

  // Build kriging system (n+1 x n+1 for Ordinary Kriging with Lagrange multiplier)
  const K = new Matrix(n + 1, n + 1);
  const k = new Matrix(n + 1, 1);

  // Fill covariance matrix
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const pi = useNeighbors[i].point;
      const pj = useNeighbors[j].point;
      const dist = Math.sqrt((pi.x - pj.x) ** 2 + (pi.y - pj.y) ** 2);
      K.set(i, j, variogramValue(dist, variogramParams));
    }
    // Lagrange multiplier row/column
    K.set(i, n, 1);
    K.set(n, i, 1);
  }
  K.set(n, n, 0);

  // Fill covariance vector to unknown point
  for (let i = 0; i < n; i++) {
    k.set(i, 0, variogramValue(useNeighbors[i].distance, variogramParams));
  }
  k.set(n, 0, 1);

  // Solve kriging system
  try {
    const weights = solve(K, k);

    // Calculate interpolated value
    let value = 0;
    for (let i = 0; i < n; i++) {
      value += weights.get(i, 0) * useNeighbors[i].point.z;
    }

    // Calculate kriging variance
    let variance = variogramParams.sill;
    for (let i = 0; i < n; i++) {
      variance -= weights.get(i, 0) * k.get(i, 0);
    }
    variance -= weights.get(n, 0); // Subtract Lagrange multiplier contribution

    return { value, variance: Math.max(0, variance) };
  } catch {
    // Matrix inversion failed (singular), fall back to nearest neighbor
    return { value: useNeighbors[0].point.z, variance: variogramParams.sill };
  }
}

/**
 * Generate interpolated grid using Kriging
 */
export function interpolateKrigingGrid(
  points: SurveyPoint[],
  gridConfig: GridConfig,
  krigingConfig: Partial<KrigingConfig> = {}
): InterpolationResult & { varianceGrid?: Float32Array } {
  const startTime = performance.now();
  const cfg = { ...DEFAULT_KRIGING_CONFIG, ...krigingConfig };

  // Fit variogram if set to 'auto'
  let variogramParams: VariogramParams;
  if (cfg.variogram === 'auto') {
    const experimental = calculateExperimentalVariogram(points);
    variogramParams = fitVariogram(experimental, 'spherical');
  } else {
    variogramParams = cfg.variogram;
  }

  // Calculate grid dimensions
  const width = Math.ceil(
    (gridConfig.bounds.maxX - gridConfig.bounds.minX) / gridConfig.resolution
  );
  const height = Math.ceil(
    (gridConfig.bounds.maxY - gridConfig.bounds.minY) / gridConfig.resolution
  );

  const grid = new Float32Array(width * height);
  const varianceGrid = new Float32Array(width * height);
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
    const y =
      gridConfig.bounds.maxY - row * gridConfig.resolution - gridConfig.resolution / 2;

    for (let col = 0; col < width; col++) {
      const x =
        gridConfig.bounds.minX + col * gridConfig.resolution + gridConfig.resolution / 2;
      const index = row * width + col;

      const result = interpolateKriging(x, y, points, variogramParams, cfg);

      if (result === null) {
        grid[index] = noData;
        varianceGrid[index] = noData;
        invalidCells++;
        continue;
      }

      grid[index] = result.value;
      varianceGrid[index] = result.variance;

      // Update statistics
      if (result.value < min) min = result.value;
      if (result.value > max) max = result.value;
      sum += result.value;
      sumSquared += result.value * result.value;
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
    varianceGrid,
  };
}

// ============================================================================
// Auto-fit Kriging
// ============================================================================

/**
 * Automatically fit variogram and perform Kriging
 */
export function autoKriging(
  points: SurveyPoint[],
  gridConfig: GridConfig,
  config: Partial<Omit<KrigingConfig, 'variogram'>> = {}
): {
  result: InterpolationResult;
  variogramParams: VariogramParams;
  experimentalVariogram: ExperimentalVariogram;
} {
  // Calculate experimental variogram
  const experimentalVariogram = calculateExperimentalVariogram(points);

  // Try different models and find best fit
  const models: VariogramModel[] = ['spherical', 'exponential', 'gaussian'];
  let bestParams: VariogramParams | null = null;
  let bestError = Infinity;

  for (const model of models) {
    const params = fitVariogram(experimentalVariogram, model);

    // Calculate fit error
    let error = 0;
    for (let i = 0; i < experimentalVariogram.lagDistances.length; i++) {
      const predicted = variogramValue(experimentalVariogram.lagDistances[i], params);
      error += (predicted - experimentalVariogram.semivariances[i]) ** 2;
    }

    if (error < bestError) {
      bestError = error;
      bestParams = params;
    }
  }

  const variogramParams = bestParams || {
    model: 'spherical' as VariogramModel,
    nugget: 0,
    sill: 1,
    range: 100,
  };

  // Perform kriging
  const result = interpolateKrigingGrid(points, gridConfig, {
    ...config,
    variogram: variogramParams,
  });

  return {
    result,
    variogramParams,
    experimentalVariogram,
  };
}
