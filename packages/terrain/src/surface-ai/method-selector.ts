/**
 * Smart Surface Generation - Method Selector
 *
 * Uses terrain analysis and data characteristics to recommend
 * the optimal interpolation method.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  MethodRecommendation,
  MethodSelectionInput,
  TerrainAnalysisResult,
} from './types';
import type { InterpolationMethodType, IDWConfig, KrigingConfig } from '../interpolation/types';

// ============================================================================
// Rule-Based Method Selection
// ============================================================================

/**
 * Select interpolation method using rule-based logic
 */
export function selectMethodRuleBased(
  input: MethodSelectionInput
): MethodRecommendation {
  const { terrainAnalysis, dataSources, hasBreaklines } = input;
  const { characteristics } = terrainAnalysis;

  // Start with default recommendation
  let primaryMethod: InterpolationMethodType = 'idw';
  let alternativeMethods: InterpolationMethodType[] = ['kriging'];
  let confidence = 0.7;
  let reasoning = '';
  let suggestedConfig: Record<string, unknown> = {};
  let expectedQuality = 70;

  // Decision tree based on terrain and data characteristics

  // If we have breaklines, constrained triangulation is preferred
  if (hasBreaklines || characteristics.hasLinearFeatures) {
    // Note: We don't have natural_neighbor implemented yet, use kriging
    primaryMethod = 'kriging';
    alternativeMethods = ['idw'];
    reasoning = 'Linear features detected - Kriging with breakline constraints recommended for best results.';
    confidence = 0.85;
    expectedQuality = 85;
    suggestedConfig = {
      variogram: 'auto',
      searchRadius: 500,
      minNeighbors: 5,
      maxNeighbors: 15,
    };
  }
  // Flat terrain with good point density
  else if (characteristics.classification === 'flat') {
    primaryMethod = 'idw';
    alternativeMethods = ['kriging'];
    reasoning = 'Flat terrain with uniform characteristics - IDW provides fast, accurate results.';
    confidence = 0.9;
    expectedQuality = 90;
    suggestedConfig = {
      power: 2,
      searchRadius: 300,
      minNeighbors: 3,
      maxNeighbors: 12,
    };
  }
  // Rolling terrain - Kriging often performs better
  else if (characteristics.classification === 'rolling') {
    primaryMethod = 'kriging';
    alternativeMethods = ['idw'];
    reasoning = 'Rolling terrain benefits from Kriging spatial correlation modeling.';
    confidence = 0.8;
    expectedQuality = 82;
    suggestedConfig = {
      variogram: 'auto',
      searchRadius: 400,
      minNeighbors: 5,
      maxNeighbors: 15,
    };
  }
  // Hilly terrain
  else if (characteristics.classification === 'hilly') {
    primaryMethod = 'kriging';
    alternativeMethods = ['idw'];
    reasoning = 'Hilly terrain with significant elevation variation - Kriging provides smoother interpolation.';
    confidence = 0.75;
    expectedQuality = 78;
    suggestedConfig = {
      variogram: 'auto',
      searchRadius: 500,
      minNeighbors: 6,
      maxNeighbors: 20,
    };
  }
  // Mountainous terrain
  else if (characteristics.classification === 'mountainous') {
    primaryMethod = 'kriging';
    alternativeMethods = ['idw'];
    reasoning = 'Mountainous terrain requires careful interpolation - Kriging with larger search radius.';
    confidence = 0.7;
    expectedQuality = 70;
    suggestedConfig = {
      variogram: 'auto',
      searchRadius: 600,
      minNeighbors: 8,
      maxNeighbors: 25,
    };
  }
  // Complex terrain
  else if (characteristics.classification === 'complex') {
    primaryMethod = 'kriging';
    alternativeMethods = ['idw'];
    reasoning = 'Complex terrain with high variability - Kriging with adaptive variogram fitting.';
    confidence = 0.65;
    expectedQuality = 65;
    suggestedConfig = {
      variogram: 'auto',
      searchRadius: 500,
      minNeighbors: 8,
      maxNeighbors: 20,
    };
  }

  // Adjust for data quality
  if (terrainAnalysis.confidence < 0.5) {
    confidence *= 0.8;
    expectedQuality *= 0.9;
    reasoning += ' Data quality may affect results.';
  }

  // Adjust for DEM availability (can improve sparse areas)
  if (dataSources.hasDEM) {
    expectedQuality = Math.min(100, expectedQuality + 5);
    reasoning += ' DEM data available for gap-filling.';
  }

  // Adjust for satellite imagery (feature detection possible)
  if (dataSources.hasSatelliteImagery) {
    confidence = Math.min(1, confidence + 0.05);
  }

  return {
    primaryMethod,
    alternativeMethods,
    confidence,
    reasoning,
    suggestedConfig,
    expectedQuality,
  };
}

// ============================================================================
// AI-Enhanced Method Selection
// ============================================================================

/**
 * Select interpolation method using Gemini AI
 */
export async function selectMethodWithAI(
  input: MethodSelectionInput,
  apiKey: string
): Promise<MethodRecommendation> {
  // First get rule-based recommendation as baseline
  const ruleBasedResult = selectMethodRuleBased(input);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = buildMethodSelectionPrompt(input, ruleBasedResult);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return parseMethodSelectionResponse(response, ruleBasedResult);
  } catch (error) {
    console.error('AI method selection failed:', error);
    return ruleBasedResult;
  }
}

/**
 * Build prompt for AI method selection
 */
function buildMethodSelectionPrompt(
  input: MethodSelectionInput,
  ruleBasedResult: MethodRecommendation
): string {
  const { terrainAnalysis, dataSources, qualityRequirements, hasBreaklines } = input;
  const { characteristics } = terrainAnalysis;

  return `You are a geospatial interpolation expert. Based on the following terrain and data characteristics, recommend the best interpolation method.

TERRAIN CHARACTERISTICS:
- Classification: ${characteristics.classification}
- Mean slope: ${characteristics.slopeStats.mean.toFixed(1)}°
- Max slope: ${characteristics.slopeStats.max.toFixed(1)}°
- Roughness: ${characteristics.roughness.toFixed(2)}
- Point uniformity: ${characteristics.uniformity.toFixed(2)}
- Has linear features: ${characteristics.hasLinearFeatures}
- Has flat areas: ${characteristics.hasFlatAreas}

DATA SOURCES AVAILABLE:
- Survey points: ${dataSources.hasSurveyPoints}
- DEM data: ${dataSources.hasDEM}
- Satellite imagery: ${dataSources.hasSatelliteImagery}
- IDE Chile features: ${dataSources.hasIDEFeatures}
- Breaklines available: ${hasBreaklines}

QUALITY REQUIREMENTS:
- Target RMSE: ${qualityRequirements?.targetRMSE || 'not specified'}
- Minimum R²: ${qualityRequirements?.minimumR2 || 'not specified'}
- Max compute time: ${qualityRequirements?.maxComputeTime || 'not specified'}

RULE-BASED RECOMMENDATION:
- Method: ${ruleBasedResult.primaryMethod}
- Confidence: ${ruleBasedResult.confidence}
- Expected quality: ${ruleBasedResult.expectedQuality}

AVAILABLE METHODS:
1. idw - Inverse Distance Weighting: Fast, deterministic, good for uniform data
2. kriging - Ordinary Kriging: Statistical, handles spatial correlation, smoother results

Please provide:
1. PRIMARY_METHOD: idw or kriging
2. ALTERNATIVE_METHOD: the other method
3. CONFIDENCE: 0-1 confidence in your recommendation
4. REASONING: 1-2 sentences explaining your choice
5. EXPECTED_QUALITY: 0-100 expected quality score
6. IDW_POWER: recommended power if IDW (1-4)
7. SEARCH_RADIUS: recommended search radius in meters (100-1000)
8. MIN_NEIGHBORS: minimum neighbors (3-10)
9. MAX_NEIGHBORS: maximum neighbors (10-30)

Format:
PRIMARY_METHOD: [value]
ALTERNATIVE_METHOD: [value]
CONFIDENCE: [value]
REASONING: [text]
EXPECTED_QUALITY: [value]
IDW_POWER: [value]
SEARCH_RADIUS: [value]
MIN_NEIGHBORS: [value]
MAX_NEIGHBORS: [value]`;
}

/**
 * Parse AI response for method selection
 */
function parseMethodSelectionResponse(
  response: string,
  fallback: MethodRecommendation
): MethodRecommendation {
  const lines = response.split('\n');
  const values: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      values[match[1].toUpperCase()] = match[2].trim();
    }
  }

  const primaryMethod = (values['PRIMARY_METHOD']?.toLowerCase() || fallback.primaryMethod) as InterpolationMethodType;
  const alternativeMethod = (values['ALTERNATIVE_METHOD']?.toLowerCase() || 'idw') as InterpolationMethodType;
  const confidence = parseFloat(values['CONFIDENCE'] || String(fallback.confidence));
  const reasoning = values['REASONING'] || fallback.reasoning;
  const expectedQuality = parseFloat(values['EXPECTED_QUALITY'] || String(fallback.expectedQuality));

  // Parse config values
  const idwPower = parseFloat(values['IDW_POWER'] || '2');
  const searchRadius = parseFloat(values['SEARCH_RADIUS'] || '500');
  const minNeighbors = parseInt(values['MIN_NEIGHBORS'] || '5', 10);
  const maxNeighbors = parseInt(values['MAX_NEIGHBORS'] || '15', 10);

  const suggestedConfig: Record<string, unknown> = primaryMethod === 'idw'
    ? {
        power: Math.min(4, Math.max(1, idwPower)),
        searchRadius: Math.min(1000, Math.max(100, searchRadius)),
        minNeighbors: Math.min(10, Math.max(3, minNeighbors)),
        maxNeighbors: Math.min(30, Math.max(10, maxNeighbors)),
      }
    : {
        variogram: 'auto',
        searchRadius: Math.min(1000, Math.max(100, searchRadius)),
        minNeighbors: Math.min(10, Math.max(3, minNeighbors)),
        maxNeighbors: Math.min(30, Math.max(10, maxNeighbors)),
      };

  return {
    primaryMethod,
    alternativeMethods: [alternativeMethod],
    confidence: Math.min(1, Math.max(0, confidence)),
    reasoning,
    suggestedConfig,
    expectedQuality: Math.min(100, Math.max(0, expectedQuality)),
  };
}

// ============================================================================
// Configuration Generators
// ============================================================================

/**
 * Generate IDW configuration from recommendation
 */
export function generateIDWConfig(recommendation: MethodRecommendation): IDWConfig {
  const config = recommendation.suggestedConfig;

  return {
    power: typeof config.power === 'number' ? config.power : 2,
    searchRadius: typeof config.searchRadius === 'number' ? config.searchRadius : 500,
    minNeighbors: typeof config.minNeighbors === 'number' ? config.minNeighbors : 3,
    maxNeighbors: typeof config.maxNeighbors === 'number' ? config.maxNeighbors : 12,
    smoothing: 0,
  };
}

/**
 * Generate Kriging configuration from recommendation
 */
export function generateKrigingConfig(recommendation: MethodRecommendation): KrigingConfig {
  const config = recommendation.suggestedConfig;

  return {
    variogram: 'auto',
    searchRadius: typeof config.searchRadius === 'number' ? config.searchRadius : 500,
    minNeighbors: typeof config.minNeighbors === 'number' ? config.minNeighbors : 5,
    maxNeighbors: typeof config.maxNeighbors === 'number' ? config.maxNeighbors : 15,
  };
}

// ============================================================================
// Comparison Helper
// ============================================================================

/**
 * Compare methods and return recommendation with comparison data
 */
export function compareMethodPerformance(
  idwMetrics: { rmse: number; mae: number; r2: number; computeTime: number },
  krigingMetrics: { rmse: number; mae: number; r2: number; computeTime: number }
): {
  winner: InterpolationMethodType;
  comparison: string;
  scores: { idw: number; kriging: number };
} {
  // Calculate composite scores (lower RMSE is better, higher R² is better)
  const idwScore = (1 - idwMetrics.rmse / 10) * 50 + idwMetrics.r2 * 50;
  const krigingScore = (1 - krigingMetrics.rmse / 10) * 50 + krigingMetrics.r2 * 50;

  const winner: InterpolationMethodType = idwScore >= krigingScore ? 'idw' : 'kriging';

  const comparison = `IDW: RMSE=${idwMetrics.rmse.toFixed(3)}m, R²=${idwMetrics.r2.toFixed(3)}, Time=${idwMetrics.computeTime.toFixed(0)}ms | ` +
    `Kriging: RMSE=${krigingMetrics.rmse.toFixed(3)}m, R²=${krigingMetrics.r2.toFixed(3)}, Time=${krigingMetrics.computeTime.toFixed(0)}ms`;

  return {
    winner,
    comparison,
    scores: {
      idw: Math.max(0, Math.min(100, idwScore)),
      kriging: Math.max(0, Math.min(100, krigingScore)),
    },
  };
}
