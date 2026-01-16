/**
 * Interpolation Type Definitions
 */

export type InterpolationMethodType = 'idw' | 'kriging' | 'natural_neighbor' | 'triangulation' | 'delaunay' | 'constrained_delaunay';

export interface InterpolationMetrics {
  rmse: number;       // Root Mean Square Error
  mae: number;        // Mean Absolute Error
  r2: number;         // R-squared coefficient
  computeTime: number; // Milliseconds
  maxError?: number;  // Maximum absolute error
  mbe?: number;       // Mean Bias Error
  validationPoints?: number; // Number of validation points used
}

export interface IDWConfig {
  power: number;
  searchRadius: number;
  minNeighbors: number;
  maxNeighbors: number;
  smoothing?: number;
}

export interface KrigingConfig {
  variogram: 'spherical' | 'exponential' | 'gaussian' | 'auto';
  searchRadius: number;
  minNeighbors: number;
  maxNeighbors: number;
}
