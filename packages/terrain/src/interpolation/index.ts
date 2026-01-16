/**
 * Smart Surface Generation - Interpolation Module
 *
 * Comprehensive interpolation library for terrain analysis.
 * Includes IDW, Kriging, and quality metrics with cross-validation.
 */

// Types (excluding InterpolationMethodType which is re-exported by surface-ai)
export type {
  IDWConfig,
  KrigingConfig,
  VariogramParams,
  VariogramModel,
  ExperimentalVariogram,
  GridConfig,
  InterpolationResult,
  GridStatistics,
  InterpolationMetrics,
  CrossValidationConfig,
  CrossValidationResult,
  MethodComparisonResult,
} from './types';
export {
  DEFAULT_IDW_CONFIG,
  DEFAULT_KRIGING_CONFIG,
} from './types';

// IDW Interpolation
export {
  interpolateIDW,
  interpolateIDWGrid,
  interpolateAdaptiveIDW,
  optimizeIDWPower,
} from './idw';

// Kriging Interpolation
export {
  variogramValue,
  calculateExperimentalVariogram,
  fitVariogram,
  interpolateKriging,
  interpolateKrigingGrid,
  autoKriging,
} from './kriging';

// Quality Metrics and Cross-Validation
export {
  calculateMetrics,
  crossValidateIDW,
  crossValidateKriging,
  compareInterpolationMethods,
  calculateQualityScore,
  interpretQualityScore,
  identifyProblemAreas,
} from './metrics';
