/**
 * Smart Surface Generation - Interpolation Types
 *
 * Types for IDW, Kriging, and other interpolation methods.
 */

import type { SurveyPoint, BoundingBox } from '../triangulation/types';

// ============================================================================
// Common Types
// ============================================================================

export type InterpolationMethodType = 'idw' | 'kriging' | 'natural_neighbor' | 'spline';

export interface InterpolationPoint {
  x: number;
  y: number;
  z: number;
  weight?: number;  // For weighted interpolation
}

export interface GridConfig {
  bounds: BoundingBox;
  resolution: number;     // Cell size in meters
  noDataValue?: number;   // Value for cells outside data range
}

export interface InterpolationResult {
  grid: Float32Array;     // Row-major elevation grid
  width: number;          // Grid columns
  height: number;         // Grid rows
  bounds: BoundingBox;
  resolution: number;
  statistics: GridStatistics;
  computeTime: number;
}

export interface GridStatistics {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  validCells: number;
  invalidCells: number;
}

// ============================================================================
// IDW Types
// ============================================================================

export interface IDWConfig {
  power: number;          // Distance exponent (typically 1-3, default 2)
  searchRadius: number;   // Maximum search distance in meters
  minNeighbors: number;   // Minimum neighbors required (default 3)
  maxNeighbors: number;   // Maximum neighbors to use (default 12)
  smoothing?: number;     // Smoothing factor to prevent singularities
}

export const DEFAULT_IDW_CONFIG: IDWConfig = {
  power: 2,
  searchRadius: 500,
  minNeighbors: 3,
  maxNeighbors: 12,
  smoothing: 0,
};

// ============================================================================
// Kriging Types
// ============================================================================

export type VariogramModel = 'spherical' | 'exponential' | 'gaussian' | 'linear';

export interface VariogramParams {
  model: VariogramModel;
  nugget: number;         // y-intercept (measurement error + micro-scale variation)
  sill: number;           // Plateau value (total variance)
  range: number;          // Distance at which correlation becomes negligible
}

export interface KrigingConfig {
  variogram: VariogramParams | 'auto';  // 'auto' fits variogram from data
  searchRadius: number;
  minNeighbors: number;
  maxNeighbors: number;
  anisotropy?: {
    ratio: number;        // Major/minor axis ratio
    angle: number;        // Angle of major axis (degrees from east)
  };
}

export const DEFAULT_KRIGING_CONFIG: KrigingConfig = {
  variogram: 'auto',
  searchRadius: 500,
  minNeighbors: 5,
  maxNeighbors: 15,
};

export interface ExperimentalVariogram {
  lagDistances: number[];
  semivariances: number[];
  pairCounts: number[];
  fittedParams?: VariogramParams;
}

// ============================================================================
// Natural Neighbor Types
// ============================================================================

export interface NaturalNeighborConfig {
  voronoiCells?: boolean;   // Return Voronoi cells for visualization
}

// ============================================================================
// Quality Metrics Types
// ============================================================================

export interface InterpolationMetrics {
  rmse: number;           // Root Mean Square Error
  mae: number;            // Mean Absolute Error
  maxError: number;       // Maximum absolute error
  r2: number;             // Coefficient of determination
  mbe: number;            // Mean Bias Error (+ = overestimate)
  validationPoints: number;
}

export interface CrossValidationConfig {
  method: 'leave_one_out' | 'k_fold' | 'random_split';
  folds?: number;         // For k_fold
  testFraction?: number;  // For random_split (0-1)
  iterations?: number;    // For random_split (repeated validation)
}

export interface CrossValidationResult {
  metrics: InterpolationMetrics;
  predictions: Array<{
    id: string;
    x: number;
    y: number;
    actual: number;
    predicted: number;
    error: number;
    fold?: number;
  }>;
  foldMetrics?: InterpolationMetrics[];  // Per-fold metrics for k_fold
}

// ============================================================================
// Comparison Types
// ============================================================================

export interface MethodComparisonResult {
  methods: Array<{
    method: InterpolationMethodType;
    config: IDWConfig | KrigingConfig | NaturalNeighborConfig;
    metrics: InterpolationMetrics;
    computeTime: number;
  }>;
  bestMethod: InterpolationMethodType;
  bestScore: number;      // Combined score (0-100)
  recommendation: string;
}
