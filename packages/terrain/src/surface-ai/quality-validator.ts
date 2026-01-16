/**
 * Smart Surface Generation - Quality Validator
 *
 * Validates interpolation results and provides quality assessment
 * using rule-based analysis and AI enhancement.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  QualityValidationInput,
  QualityValidationResult,
  TerrainAnalysisResult,
} from './types';
import type { InterpolationMetrics, InterpolationMethodType } from '../interpolation/types';

// ============================================================================
// Quality Thresholds
// ============================================================================

interface QualityThresholds {
  rmse: { excellent: number; good: number; acceptable: number; poor: number };
  r2: { excellent: number; good: number; acceptable: number; poor: number };
  mae: { excellent: number; good: number; acceptable: number; poor: number };
  maxError: { excellent: number; good: number; acceptable: number; poor: number };
  bias: { acceptable: number };
}

const DEFAULT_THRESHOLDS: QualityThresholds = {
  rmse: { excellent: 0.1, good: 0.3, acceptable: 0.5, poor: 1.0 },
  r2: { excellent: 0.98, good: 0.95, acceptable: 0.90, poor: 0.80 },
  mae: { excellent: 0.08, good: 0.2, acceptable: 0.4, poor: 0.8 },
  maxError: { excellent: 0.3, good: 0.8, acceptable: 1.5, poor: 3.0 },
  bias: { acceptable: 0.1 },
};

// ============================================================================
// Rule-Based Quality Validation
// ============================================================================

/**
 * Validate surface quality using rule-based analysis
 */
export function validateQualityRuleBased(
  input: QualityValidationInput,
  thresholds: QualityThresholds = DEFAULT_THRESHOLDS
): QualityValidationResult {
  const { metrics, method, terrainAnalysis, errorDistribution } = input;

  // Calculate component scores
  const rmseScore = calculateMetricScore(metrics.rmse, thresholds.rmse, true);
  const r2Score = calculateMetricScore(metrics.r2, thresholds.r2, false);
  const maeScore = calculateMetricScore(metrics.mae, thresholds.mae, true);
  const maxErrorScore = calculateMetricScore(metrics.maxError!!, thresholds.maxError, true);

  // Weighted composite score
  const qualityScore = Math.round(
    rmseScore * 0.35 + r2Score * 0.30 + maeScore * 0.20 + maxErrorScore * 0.15
  );

  // Determine rating
  const rating = getQualityRating(qualityScore);
  const passed = qualityScore >= 50 && metrics.r2 >= 0.8;

  // Detect issues
  const issues = detectQualityIssues(metrics, terrainAnalysis, errorDistribution, thresholds);

  // Generate suggestions
  const suggestions = generateSuggestions(issues, method, terrainAnalysis);

  // Generate next steps
  const nextSteps = generateNextSteps(issues, passed, method);

  // Build assessment text
  const assessment = buildAssessmentText(metrics, method, qualityScore, rating, issues);

  return {
    qualityScore,
    rating,
    passed,
    assessment,
    issues,
    suggestions,
    nextSteps,
  };
}

/**
 * Calculate score for a single metric
 */
function calculateMetricScore(
  value: number,
  thresholds: { excellent: number; good: number; acceptable: number; poor: number },
  lowerIsBetter: boolean
): number {
  if (lowerIsBetter) {
    if (value <= thresholds.excellent) return 100;
    if (value <= thresholds.good) return 85;
    if (value <= thresholds.acceptable) return 70;
    if (value <= thresholds.poor) return 50;
    return 25;
  } else {
    if (value >= thresholds.excellent) return 100;
    if (value >= thresholds.good) return 85;
    if (value >= thresholds.acceptable) return 70;
    if (value >= thresholds.poor) return 50;
    return 25;
  }
}

/**
 * Get quality rating from score
 */
function getQualityRating(
  score: number
): 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'acceptable';
  if (score >= 40) return 'poor';
  return 'unacceptable';
}

/**
 * Detect quality issues from metrics and error distribution
 */
function detectQualityIssues(
  metrics: InterpolationMetrics,
  terrainAnalysis: TerrainAnalysisResult,
  errorDistribution: QualityValidationInput['errorDistribution'],
  thresholds: QualityThresholds
): QualityValidationResult['issues'] {
  const issues: QualityValidationResult['issues'] = [];

  // Check RMSE
  if (metrics.rmse > thresholds.rmse.poor) {
    issues.push({
      type: 'high_error',
      severity: 'critical',
      description: `RMSE (${metrics.rmse.toFixed(3)}m) exceeds acceptable threshold of ${thresholds.rmse.poor}m`,
    });
  } else if (metrics.rmse > thresholds.rmse.acceptable) {
    issues.push({
      type: 'high_error',
      severity: 'warning',
      description: `RMSE (${metrics.rmse.toFixed(3)}m) is above good threshold of ${thresholds.rmse.acceptable}m`,
    });
  }

  // Check bias
  if (Math.abs(metrics.mbe!) > thresholds.bias.acceptable) {
    const direction = metrics.mbe! > 0 ? 'overestimating' : 'underestimating';
    issues.push({
      type: 'bias',
      severity: metrics.mbe! > thresholds.bias.acceptable * 2 ? 'critical' : 'warning',
      description: `Systematic bias detected: ${direction} elevations by ${Math.abs(metrics.mbe!).toFixed(3)}m on average`,
    });
  }

  // Check R²
  if (metrics.r2 < thresholds.r2.poor) {
    issues.push({
      type: 'high_error',
      severity: 'critical',
      description: `R² (${metrics.r2.toFixed(3)}) indicates poor model fit`,
    });
  } else if (metrics.r2 < thresholds.r2.acceptable) {
    issues.push({
      type: 'high_error',
      severity: 'warning',
      description: `R² (${metrics.r2.toFixed(3)}) indicates moderate model fit`,
    });
  }

  // Check max error
  if (metrics.maxError! > thresholds.maxError.poor) {
    issues.push({
      type: 'outliers',
      severity: 'warning',
      description: `Maximum error (${metrics.maxError!.toFixed(3)}m) suggests outliers or problem areas`,
    });
  }

  // Check error distribution for spatial patterns
  if (errorDistribution && errorDistribution.length > 10) {
    const spatialIssues = detectSpatialPatterns(errorDistribution);
    issues.push(...spatialIssues);
  }

  // Check terrain-specific issues
  if (terrainAnalysis.anomalies.length > 0) {
    for (const anomaly of terrainAnalysis.anomalies) {
      issues.push({
        type: 'artifact',
        severity: 'info',
        description: `Data anomaly: ${anomaly}`,
      });
    }
  }

  // Check validation point coverage
  if (metrics.validationPoints! < 10) {
    issues.push({
      type: 'sparse_coverage',
      severity: 'warning',
      description: `Low validation point count (${metrics.validationPoints!}) may not be representative`,
    });
  }

  return issues;
}

/**
 * Detect spatial patterns in error distribution
 */
function detectSpatialPatterns(
  errorDistribution: Array<{ x: number; y: number; error: number }>
): QualityValidationResult['issues'] {
  const issues: QualityValidationResult['issues'] = [];

  // Find clusters of high errors
  const highErrors = errorDistribution.filter((e) => Math.abs(e.error) > 0.5);

  if (highErrors.length > errorDistribution.length * 0.2) {
    // Find centroid of high error cluster
    const centroid = {
      x: highErrors.reduce((sum, e) => sum + e.x, 0) / highErrors.length,
      y: highErrors.reduce((sum, e) => sum + e.y, 0) / highErrors.length,
    };

    issues.push({
      type: 'artifact',
      severity: 'warning',
      description: `Cluster of high errors detected in the dataset`,
      location: centroid,
    });
  }

  // Check for edge effects
  const bounds = {
    minX: Math.min(...errorDistribution.map((e) => e.x)),
    maxX: Math.max(...errorDistribution.map((e) => e.x)),
    minY: Math.min(...errorDistribution.map((e) => e.y)),
    maxY: Math.max(...errorDistribution.map((e) => e.y)),
  };

  const edgeThreshold = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.1;

  const edgeErrors = errorDistribution.filter(
    (e) =>
      e.x - bounds.minX < edgeThreshold ||
      bounds.maxX - e.x < edgeThreshold ||
      e.y - bounds.minY < edgeThreshold ||
      bounds.maxY - e.y < edgeThreshold
  );

  const interiorErrors = errorDistribution.filter(
    (e) =>
      e.x - bounds.minX >= edgeThreshold &&
      bounds.maxX - e.x >= edgeThreshold &&
      e.y - bounds.minY >= edgeThreshold &&
      bounds.maxY - e.y >= edgeThreshold
  );

  if (edgeErrors.length > 0 && interiorErrors.length > 0) {
    const edgeMAE = edgeErrors.reduce((sum, e) => sum + Math.abs(e.error), 0) / edgeErrors.length;
    const interiorMAE =
      interiorErrors.reduce((sum, e) => sum + Math.abs(e.error), 0) / interiorErrors.length;

    if (edgeMAE > interiorMAE * 1.5) {
      issues.push({
        type: 'artifact',
        severity: 'info',
        description: `Edge effects detected: errors ${((edgeMAE / interiorMAE - 1) * 100).toFixed(0)}% higher near boundaries`,
      });
    }
  }

  return issues;
}

/**
 * Generate improvement suggestions based on issues
 */
function generateSuggestions(
  issues: QualityValidationResult['issues'],
  method: InterpolationMethodType,
  terrainAnalysis: TerrainAnalysisResult
): string[] {
  const suggestions: string[] = [];

  // High error suggestions
  const highErrorIssues = issues.filter((i) => i.type === 'high_error');
  if (highErrorIssues.length > 0) {
    if (method === 'idw') {
      suggestions.push('Try increasing IDW power parameter for sharper weighting');
      suggestions.push('Consider using Kriging which may better capture spatial correlation');
    } else if (method === 'kriging') {
      suggestions.push('Try different variogram models (spherical, exponential, gaussian)');
      suggestions.push('Adjust search radius to capture more local variation');
    }
    suggestions.push('Add more survey points in areas with high prediction errors');
  }

  // Bias suggestions
  const biasIssues = issues.filter((i) => i.type === 'bias');
  if (biasIssues.length > 0) {
    suggestions.push('Check for systematic errors in survey data');
    suggestions.push('Verify coordinate system and datum consistency');
    if (method === 'kriging') {
      suggestions.push('Consider adjusting variogram nugget parameter');
    }
  }

  // Artifact suggestions
  const artifactIssues = issues.filter((i) => i.type === 'artifact');
  if (artifactIssues.length > 0) {
    suggestions.push('Review survey data for outliers or measurement errors');
    if (!terrainAnalysis.characteristics.hasLinearFeatures) {
      suggestions.push('Consider adding breaklines for better feature representation');
    }
  }

  // Sparse coverage suggestions
  const sparseIssues = issues.filter((i) => i.type === 'sparse_coverage');
  if (sparseIssues.length > 0) {
    suggestions.push('Increase survey point density in sparse areas');
    suggestions.push('Use DEM data to fill gaps between survey points');
  }

  // Terrain-specific suggestions
  if (terrainAnalysis.characteristics.classification === 'complex' && method === 'idw') {
    suggestions.push('Complex terrain may benefit from Kriging with adaptive variogram');
  }

  if (suggestions.length === 0) {
    suggestions.push('Surface quality meets acceptable standards');
    suggestions.push('Consider exporting for review in GIS software');
  }

  return suggestions;
}

/**
 * Generate recommended next steps
 */
function generateNextSteps(
  issues: QualityValidationResult['issues'],
  passed: boolean,
  method: InterpolationMethodType
): string[] {
  const steps: string[] = [];

  if (!passed) {
    steps.push('Review and address identified quality issues before proceeding');

    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      steps.push('Critical issues require additional survey data or parameter adjustments');
    }

    if (method === 'idw') {
      steps.push('Try Kriging interpolation as an alternative');
    } else {
      steps.push('Try IDW interpolation with optimized power parameter');
    }
  } else {
    steps.push('Surface is ready for use in design workflows');
    steps.push('Export to LandXML for integration with CAD software');

    const warningIssues = issues.filter((i) => i.severity === 'warning');
    if (warningIssues.length > 0) {
      steps.push('Consider addressing warning issues for improved accuracy');
    }
  }

  return steps;
}

/**
 * Build assessment text
 */
function buildAssessmentText(
  metrics: InterpolationMetrics,
  method: InterpolationMethodType,
  qualityScore: number,
  rating: string,
  issues: QualityValidationResult['issues']
): string {
  const methodName = method === 'idw' ? 'Inverse Distance Weighting' : 'Ordinary Kriging';

  let text = `${methodName} interpolation achieved a quality score of ${qualityScore}/100 (${rating}). `;
  text += `RMSE: ${metrics.rmse.toFixed(3)}m, MAE: ${metrics.mae.toFixed(3)}m, R²: ${metrics.r2.toFixed(3)}. `;

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  if (criticalCount > 0) {
    text += `${criticalCount} critical issue(s) require attention. `;
  }
  if (warningCount > 0) {
    text += `${warningCount} warning(s) noted. `;
  }
  if (criticalCount === 0 && warningCount === 0) {
    text += `No significant issues detected. `;
  }

  return text.trim();
}

// ============================================================================
// AI-Enhanced Quality Validation
// ============================================================================

/**
 * Validate quality using Gemini AI for enhanced assessment
 */
export async function validateQualityWithAI(
  input: QualityValidationInput,
  apiKey: string
): Promise<QualityValidationResult> {
  // Get rule-based validation first
  const ruleBasedResult = validateQualityRuleBased(input);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = buildQualityValidationPrompt(input, ruleBasedResult);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return parseQualityValidationResponse(response, ruleBasedResult);
  } catch (error) {
    console.error('AI quality validation failed:', error);
    return ruleBasedResult;
  }
}

/**
 * Build prompt for AI quality validation
 */
function buildQualityValidationPrompt(
  input: QualityValidationInput,
  ruleBasedResult: QualityValidationResult
): string {
  const { metrics, method, terrainAnalysis, methodComparison } = input;

  let comparisonText = '';
  if (methodComparison && methodComparison.length > 0) {
    comparisonText = '\nMETHOD COMPARISON:\n';
    for (const comp of methodComparison) {
      comparisonText += `- ${comp.method}: RMSE=${comp.metrics.rmse.toFixed(3)}, R²=${comp.metrics.r2.toFixed(3)}\n`;
    }
  }

  return `Analyze the following surface interpolation results and provide quality assessment.

INTERPOLATION METHOD: ${method === 'idw' ? 'Inverse Distance Weighting' : 'Ordinary Kriging'}

QUALITY METRICS:
- RMSE: ${metrics.rmse.toFixed(4)}m
- MAE: ${metrics.mae.toFixed(4)}m
- Max Error: ${metrics.maxError!.toFixed(4)}m
- R²: ${metrics.r2.toFixed(4)}
- Mean Bias Error: ${metrics.mbe!.toFixed(4)}m
- Validation Points: ${metrics.validationPoints!}

TERRAIN CONTEXT:
- Classification: ${terrainAnalysis.characteristics.classification}
- Mean slope: ${terrainAnalysis.characteristics.slopeStats.mean.toFixed(1)}°
- Roughness: ${terrainAnalysis.characteristics.roughness.toFixed(2)}
${comparisonText}
RULE-BASED ASSESSMENT:
- Quality Score: ${ruleBasedResult.qualityScore}/100
- Rating: ${ruleBasedResult.rating}
- Issues Found: ${ruleBasedResult.issues.length}

Please provide your expert assessment:
1. QUALITY_SCORE: 0-100 (your adjusted score)
2. RATING: excellent, good, acceptable, poor, or unacceptable
3. PASSED: true or false
4. ASSESSMENT: 2-3 sentence overall assessment
5. KEY_ISSUE: Most important issue to address (or "none")
6. TOP_SUGGESTION: Most important improvement suggestion

Format:
QUALITY_SCORE: [value]
RATING: [value]
PASSED: [value]
ASSESSMENT: [text]
KEY_ISSUE: [text]
TOP_SUGGESTION: [text]`;
}

/**
 * Parse AI response for quality validation
 */
function parseQualityValidationResponse(
  response: string,
  fallback: QualityValidationResult
): QualityValidationResult {
  const lines = response.split('\n');
  const values: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      values[match[1].toUpperCase()] = match[2].trim();
    }
  }

  const qualityScore = parseInt(values['QUALITY_SCORE'] || String(fallback.qualityScore), 10);
  const rating = (values['RATING']?.toLowerCase() || fallback.rating) as QualityValidationResult['rating'];
  const passed = values['PASSED']?.toLowerCase() === 'true';
  const assessment = values['ASSESSMENT'] || fallback.assessment;
  const keyIssue = values['KEY_ISSUE'];
  const topSuggestion = values['TOP_SUGGESTION'];

  // Merge with rule-based results
  const mergedIssues = [...fallback.issues];

  // Add AI-identified key issue if not "none"
  if (keyIssue && keyIssue.toLowerCase() !== 'none' && !mergedIssues.some((i) => i.description.includes(keyIssue.substring(0, 20)))) {
    mergedIssues.unshift({
      type: 'high_error',
      severity: 'warning',
      description: keyIssue,
    });
  }

  // Add AI suggestion to front
  const mergedSuggestions = [...fallback.suggestions];
  if (topSuggestion && !mergedSuggestions.includes(topSuggestion)) {
    mergedSuggestions.unshift(topSuggestion);
  }

  return {
    qualityScore: Math.min(100, Math.max(0, qualityScore)),
    rating,
    passed,
    assessment,
    issues: mergedIssues,
    suggestions: mergedSuggestions,
    nextSteps: fallback.nextSteps,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick quality check (no AI)
 */
export function quickQualityCheck(metrics: InterpolationMetrics): {
  passed: boolean;
  score: number;
  summary: string;
} {
  const rmseScore = calculateMetricScore(metrics.rmse, DEFAULT_THRESHOLDS.rmse, true);
  const r2Score = calculateMetricScore(metrics.r2, DEFAULT_THRESHOLDS.r2, false);
  const score = Math.round(rmseScore * 0.6 + r2Score * 0.4);

  const passed = score >= 60 && metrics.r2 >= 0.85;

  const summary = passed
    ? `Quality acceptable (score: ${score}/100, RMSE: ${metrics.rmse.toFixed(3)}m, R²: ${metrics.r2.toFixed(3)})`
    : `Quality below threshold (score: ${score}/100, RMSE: ${metrics.rmse.toFixed(3)}m, R²: ${metrics.r2.toFixed(3)})`;

  return { passed, score, summary };
}

/**
 * Get quality color for UI display
 */
export function getQualityColor(
  rating: QualityValidationResult['rating']
): string {
  switch (rating) {
    case 'excellent':
      return '#22c55e'; // green-500
    case 'good':
      return '#84cc16'; // lime-500
    case 'acceptable':
      return '#eab308'; // yellow-500
    case 'poor':
      return '#f97316'; // orange-500
    case 'unacceptable':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}
