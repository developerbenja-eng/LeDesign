/**
 * Smart Surface Generation - Quality Metrics
 *
 * Cross-validation, error metrics, and method comparison for interpolation.
 */

import type { SurveyPoint } from '../triangulation/types';
import {
  InterpolationMetrics,
  CrossValidationConfig,
  CrossValidationResult,
  MethodComparisonResult,
  InterpolationMethodType,
  IDWConfig,
  KrigingConfig,
  DEFAULT_IDW_CONFIG,
  DEFAULT_KRIGING_CONFIG,
  GridConfig,
} from './types';
import { interpolateIDW, interpolateIDWGrid, optimizeIDWPower } from './idw';
import { interpolateKriging, autoKriging, calculateExperimentalVariogram, fitVariogram } from './kriging';

// ============================================================================
// Error Metrics Calculation
// ============================================================================

/**
 * Calculate interpolation error metrics from predictions
 */
export function calculateMetrics(
  predictions: Array<{ actual: number; predicted: number }>
): InterpolationMetrics {
  if (predictions.length === 0) {
    return {
      rmse: 0,
      mae: 0,
      maxError: 0,
      r2: 0,
      mbe: 0,
      validationPoints: 0,
    };
  }

  const n = predictions.length;
  let sumError = 0;
  let sumSquaredError = 0;
  let maxError = 0;

  for (const { actual, predicted } of predictions) {
    const error = predicted - actual;
    const absError = Math.abs(error);

    sumError += error;
    sumSquaredError += error * error;
    if (absError > maxError) maxError = absError;
  }

  const mbe = sumError / n;
  const mae = predictions.reduce((sum, p) => sum + Math.abs(p.predicted - p.actual), 0) / n;
  const rmse = Math.sqrt(sumSquaredError / n);

  // Calculate R² (coefficient of determination)
  const actualValues = predictions.map(p => p.actual);
  const meanActual = actualValues.reduce((a, b) => a + b, 0) / n;
  const ssTotal = actualValues.reduce((sum, a) => sum + (a - meanActual) ** 2, 0);
  const ssResidual = predictions.reduce(
    (sum, p) => sum + (p.actual - p.predicted) ** 2,
    0
  );
  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  return {
    rmse,
    mae,
    maxError,
    r2,
    mbe,
    validationPoints: n,
  };
}

// ============================================================================
// Cross-Validation
// ============================================================================

/**
 * Perform cross-validation for IDW interpolation
 */
export function crossValidateIDW(
  points: SurveyPoint[],
  config: CrossValidationConfig,
  idwConfig: Partial<IDWConfig> = {}
): CrossValidationResult {
  const cfg = { ...DEFAULT_IDW_CONFIG, ...idwConfig };

  switch (config.method) {
    case 'leave_one_out':
      return leaveOneOutCV(points, 'idw', cfg);
    case 'k_fold':
      return kFoldCV(points, 'idw', cfg, config.folds || 10);
    case 'random_split':
      return randomSplitCV(
        points,
        'idw',
        cfg,
        config.testFraction || 0.2,
        config.iterations || 10
      );
    default:
      return leaveOneOutCV(points, 'idw', cfg);
  }
}

/**
 * Perform cross-validation for Kriging interpolation
 */
export function crossValidateKriging(
  points: SurveyPoint[],
  config: CrossValidationConfig,
  krigingConfig: Partial<KrigingConfig> = {}
): CrossValidationResult {
  const cfg = { ...DEFAULT_KRIGING_CONFIG, ...krigingConfig };

  switch (config.method) {
    case 'leave_one_out':
      return leaveOneOutCV(points, 'kriging', cfg);
    case 'k_fold':
      return kFoldCV(points, 'kriging', cfg, config.folds || 10);
    case 'random_split':
      return randomSplitCV(
        points,
        'kriging',
        cfg,
        config.testFraction || 0.2,
        config.iterations || 10
      );
    default:
      return leaveOneOutCV(points, 'kriging', cfg);
  }
}

/**
 * Leave-one-out cross-validation
 */
function leaveOneOutCV(
  points: SurveyPoint[],
  method: 'idw' | 'kriging',
  config: IDWConfig | KrigingConfig
): CrossValidationResult {
  const predictions: CrossValidationResult['predictions'] = [];

  // Limit to reasonable number for performance
  const sampleSize = Math.min(points.length, 200);
  const indices = Array.from({ length: points.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, sampleSize);

  // Pre-calculate variogram for Kriging
  let variogramParams: import('./types').VariogramParams | undefined;
  if (method === 'kriging') {
    const experimental = calculateExperimentalVariogram(points);
    variogramParams = fitVariogram(experimental, 'spherical');
  }

  for (const testIdx of indices) {
    const testPoint = points[testIdx];
    const trainPoints = points.filter((_, i) => i !== testIdx);

    let predicted: number | null = null;

    if (method === 'idw') {
      predicted = interpolateIDW(
        testPoint.x,
        testPoint.y,
        trainPoints,
        config as IDWConfig
      );
    } else if (method === 'kriging' && variogramParams) {
      const result = interpolateKriging(
        testPoint.x,
        testPoint.y,
        trainPoints,
        variogramParams,
        config as KrigingConfig
      );
      predicted = result?.value ?? null;
    }

    if (predicted !== null) {
      predictions.push({
        id: testPoint.id,
        x: testPoint.x,
        y: testPoint.y,
        actual: testPoint.z,
        predicted,
        error: predicted - testPoint.z,
      });
    }
  }

  return {
    metrics: calculateMetrics(predictions),
    predictions,
  };
}

/**
 * K-fold cross-validation
 */
function kFoldCV(
  points: SurveyPoint[],
  method: 'idw' | 'kriging',
  config: IDWConfig | KrigingConfig,
  k: number
): CrossValidationResult {
  const predictions: CrossValidationResult['predictions'] = [];
  const foldMetrics: InterpolationMetrics[] = [];

  // Shuffle points
  const shuffled = [...points].sort(() => Math.random() - 0.5);
  const foldSize = Math.ceil(shuffled.length / k);

  for (let fold = 0; fold < k; fold++) {
    const testStart = fold * foldSize;
    const testEnd = Math.min((fold + 1) * foldSize, shuffled.length);

    const testPoints = shuffled.slice(testStart, testEnd);
    const trainPoints = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];

    if (trainPoints.length < 3) continue;

    // Pre-calculate variogram for this fold if using Kriging
    let variogramParams: import('./types').VariogramParams | undefined;
    if (method === 'kriging') {
      const experimental = calculateExperimentalVariogram(trainPoints);
      variogramParams = fitVariogram(experimental, 'spherical');
    }

    const foldPredictions: Array<{ actual: number; predicted: number }> = [];

    for (const testPoint of testPoints) {
      let predicted: number | null = null;

      if (method === 'idw') {
        predicted = interpolateIDW(
          testPoint.x,
          testPoint.y,
          trainPoints,
          config as IDWConfig
        );
      } else if (method === 'kriging' && variogramParams) {
        const result = interpolateKriging(
          testPoint.x,
          testPoint.y,
          trainPoints,
          variogramParams,
          config as KrigingConfig
        );
        predicted = result?.value ?? null;
      }

      if (predicted !== null) {
        predictions.push({
          id: testPoint.id,
          x: testPoint.x,
          y: testPoint.y,
          actual: testPoint.z,
          predicted,
          error: predicted - testPoint.z,
          fold,
        });
        foldPredictions.push({ actual: testPoint.z, predicted });
      }
    }

    if (foldPredictions.length > 0) {
      foldMetrics.push(calculateMetrics(foldPredictions));
    }
  }

  return {
    metrics: calculateMetrics(predictions),
    predictions,
    foldMetrics,
  };
}

/**
 * Random split cross-validation
 */
function randomSplitCV(
  points: SurveyPoint[],
  method: 'idw' | 'kriging',
  config: IDWConfig | KrigingConfig,
  testFraction: number,
  iterations: number
): CrossValidationResult {
  const allPredictions: CrossValidationResult['predictions'] = [];

  for (let iter = 0; iter < iterations; iter++) {
    // Random split
    const shuffled = [...points].sort(() => Math.random() - 0.5);
    const splitIdx = Math.floor(shuffled.length * (1 - testFraction));

    const trainPoints = shuffled.slice(0, splitIdx);
    const testPoints = shuffled.slice(splitIdx);

    if (trainPoints.length < 3) continue;

    // Pre-calculate variogram for Kriging
    let variogramParams: import('./types').VariogramParams | undefined;
    if (method === 'kriging') {
      const experimental = calculateExperimentalVariogram(trainPoints);
      variogramParams = fitVariogram(experimental, 'spherical');
    }

    for (const testPoint of testPoints) {
      let predicted: number | null = null;

      if (method === 'idw') {
        predicted = interpolateIDW(
          testPoint.x,
          testPoint.y,
          trainPoints,
          config as IDWConfig
        );
      } else if (method === 'kriging' && variogramParams) {
        const result = interpolateKriging(
          testPoint.x,
          testPoint.y,
          trainPoints,
          variogramParams,
          config as KrigingConfig
        );
        predicted = result?.value ?? null;
      }

      if (predicted !== null) {
        allPredictions.push({
          id: testPoint.id,
          x: testPoint.x,
          y: testPoint.y,
          actual: testPoint.z,
          predicted,
          error: predicted - testPoint.z,
        });
      }
    }
  }

  return {
    metrics: calculateMetrics(allPredictions),
    predictions: allPredictions,
  };
}

// ============================================================================
// Method Comparison
// ============================================================================

/**
 * Compare multiple interpolation methods and recommend the best one
 */
export function compareInterpolationMethods(
  points: SurveyPoint[],
  config: CrossValidationConfig = { method: 'k_fold', folds: 5 }
): MethodComparisonResult {
  const methods: MethodComparisonResult['methods'] = [];

  // Test IDW with optimized power
  const { optimalPower } = optimizeIDWPower(points);
  const idwConfig: IDWConfig = { ...DEFAULT_IDW_CONFIG, power: optimalPower };

  const idwStart = performance.now();
  const idwResult = crossValidateIDW(points, config, idwConfig);
  const idwTime = performance.now() - idwStart;

  methods.push({
    method: 'idw',
    config: idwConfig,
    metrics: idwResult.metrics,
    computeTime: idwTime,
  });

  // Test Kriging with auto-fit variogram
  const krigingStart = performance.now();
  const krigingResult = crossValidateKriging(points, config, { variogram: 'auto' });
  const krigingTime = performance.now() - krigingStart;

  methods.push({
    method: 'kriging',
    config: { ...DEFAULT_KRIGING_CONFIG, variogram: 'auto' },
    metrics: krigingResult.metrics,
    computeTime: krigingTime,
  });

  // Calculate scores (lower RMSE is better)
  const rmseValues = methods.map(m => m.metrics.rmse);
  const minRMSE = Math.min(...rmseValues);
  const maxRMSE = Math.max(...rmseValues);
  const rmseRange = maxRMSE - minRMSE || 1;

  // Score each method (0-100, higher is better)
  const scores = methods.map(m => {
    const rmseScore = 100 * (1 - (m.metrics.rmse - minRMSE) / rmseRange);
    const r2Score = m.metrics.r2 * 100;
    // Combined score: 60% RMSE, 40% R²
    return 0.6 * rmseScore + 0.4 * r2Score;
  });

  // Find best method
  let bestIdx = 0;
  let bestScore = scores[0];
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIdx = i;
    }
  }

  const bestMethod = methods[bestIdx].method as InterpolationMethodType;

  // Generate recommendation
  let recommendation = '';
  if (bestMethod === 'kriging') {
    recommendation =
      'Kriging provides the best results for this dataset. ' +
      'The spatial autocorrelation in the data allows Kriging to produce smoother, more accurate interpolation.';
  } else {
    recommendation =
      'IDW provides good results for this dataset. ' +
      'It is faster than Kriging and handles the point distribution well.';
  }

  if (idwResult.metrics.rmse < 0.5 && krigingResult.metrics.rmse < 0.5) {
    recommendation +=
      ' Both methods achieve excellent accuracy (RMSE < 0.5m), suggesting high-quality input data.';
  }

  return {
    methods,
    bestMethod,
    bestScore,
    recommendation,
  };
}

// ============================================================================
// Quality Score Calculation
// ============================================================================

/**
 * Calculate overall quality score (0-100)
 */
export function calculateQualityScore(metrics: InterpolationMetrics): number {
  // Normalize RMSE (assume 1m is acceptable, 0.1m is excellent)
  const rmseScore = Math.max(0, 100 - metrics.rmse * 100);

  // R² is already 0-1 (or negative for poor fits)
  const r2Score = Math.max(0, metrics.r2 * 100);

  // MAE score
  const maeScore = Math.max(0, 100 - metrics.mae * 100);

  // Combine scores
  const score = 0.4 * rmseScore + 0.3 * r2Score + 0.3 * maeScore;

  return Math.min(100, Math.max(0, score));
}

/**
 * Interpret quality score
 */
export function interpretQualityScore(score: number): {
  rating: 'excellent' | 'good' | 'acceptable' | 'poor';
  description: string;
} {
  if (score >= 90) {
    return {
      rating: 'excellent',
      description: 'Excellent interpolation quality. Surface is highly reliable.',
    };
  } else if (score >= 75) {
    return {
      rating: 'good',
      description: 'Good interpolation quality. Surface is suitable for most applications.',
    };
  } else if (score >= 50) {
    return {
      rating: 'acceptable',
      description: 'Acceptable quality. Consider adding more survey points in sparse areas.',
    };
  } else {
    return {
      rating: 'poor',
      description:
        'Poor interpolation quality. More survey data needed or data may contain errors.',
    };
  }
}

// ============================================================================
// Spatial Error Analysis
// ============================================================================

/**
 * Identify areas with high interpolation error
 */
export function identifyProblemAreas(
  predictions: CrossValidationResult['predictions'],
  errorThreshold: number = 0.5
): Array<{
  x: number;
  y: number;
  error: number;
  severity: 'high' | 'medium' | 'low';
}> {
  const problems: Array<{
    x: number;
    y: number;
    error: number;
    severity: 'high' | 'medium' | 'low';
  }> = [];

  for (const pred of predictions) {
    const absError = Math.abs(pred.error);
    if (absError >= errorThreshold) {
      problems.push({
        x: pred.x,
        y: pred.y,
        error: pred.error,
        severity:
          absError >= errorThreshold * 3
            ? 'high'
            : absError >= errorThreshold * 1.5
            ? 'medium'
            : 'low',
      });
    }
  }

  return problems;
}
