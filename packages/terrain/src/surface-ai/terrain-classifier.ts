/**
 * Smart Surface Generation - Terrain Classifier
 *
 * Uses Google Gemini 3.0 Flash Preview to classify terrain
 * based on point statistics and distribution.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  TerrainClass,
  TerrainCharacteristics,
  TerrainAnalysisInput,
  TerrainAnalysisResult,
} from './types';
import type { DatasetStatistics, BoundingBox } from '../triangulation/types';
import type { SurveyPoint } from '../triangulation/types';

// ============================================================================
// Local Analysis (No AI Required)
// ============================================================================

/**
 * Calculate terrain characteristics from point data without AI
 */
export function calculateTerrainCharacteristics(
  statistics: DatasetStatistics,
  points: SurveyPoint[],
  bounds: BoundingBox
): TerrainCharacteristics {
  // Calculate point density
  const areaWidth = bounds.maxX - bounds.minX;
  const areaHeight = bounds.maxY - bounds.minY;
  const areaHectares = (areaWidth * areaHeight) / 10000;
  const density = points.length / areaHectares;

  // Calculate elevation range and variance
  const elevationRange = statistics.elevationMax - statistics.elevationMin;
  const normalizedStdDev = statistics.elevationStdDev / elevationRange || 0;

  // Estimate slope from local variations
  const slopeStats = estimateSlopeStatistics(points);

  // Calculate roughness (based on local elevation variance)
  const roughness = calculateRoughness(points);

  // Calculate uniformity (how evenly distributed are points)
  const uniformity = calculateUniformity(points, bounds);

  // Classify terrain based on characteristics
  const classification = classifyTerrain(
    elevationRange,
    slopeStats.mean,
    roughness
  );

  // Detect linear features (simplified)
  const hasLinearFeatures = detectLinearFeatures(points);

  // Detect flat areas
  const hasFlatAreas = slopeStats.mean < 2 || normalizedStdDev < 0.1;

  return {
    classification,
    slopeStats,
    roughness,
    uniformity,
    hasLinearFeatures,
    hasFlatAreas,
  };
}

/**
 * Estimate slope statistics from point distribution
 */
function estimateSlopeStatistics(
  points: SurveyPoint[]
): { mean: number; max: number; stdDev: number } {
  if (points.length < 3) {
    return { mean: 0, max: 0, stdDev: 0 };
  }

  const slopes: number[] = [];

  // Sample point pairs to estimate slopes
  const sampleSize = Math.min(points.length, 500);
  const step = Math.max(1, Math.floor(points.length / sampleSize));

  for (let i = 0; i < points.length; i += step) {
    const p1 = points[i];

    // Find nearest neighbor
    let minDist = Infinity;
    let nearest: SurveyPoint | null = null;

    for (let j = 0; j < points.length; j += step) {
      if (i === j) continue;
      const p2 = points[j];
      const dist = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
      if (dist > 0.1 && dist < minDist) {
        minDist = dist;
        nearest = p2;
      }
    }

    if (nearest && minDist > 0) {
      const dz = Math.abs(nearest.z - p1.z);
      const slope = Math.atan(dz / minDist) * (180 / Math.PI);
      slopes.push(slope);
    }
  }

  if (slopes.length === 0) {
    return { mean: 0, max: 0, stdDev: 0 };
  }

  const mean = slopes.reduce((a, b) => a + b, 0) / slopes.length;
  const max = Math.max(...slopes);
  const variance =
    slopes.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / slopes.length;
  const stdDev = Math.sqrt(variance);

  return { mean, max, stdDev };
}

/**
 * Calculate terrain roughness index
 */
function calculateRoughness(points: SurveyPoint[]): number {
  if (points.length < 10) return 0;

  // Calculate local variance for each point
  const localVariances: number[] = [];
  const neighborRadius = calculateAverageSpacing(points) * 3;

  const sampleSize = Math.min(points.length, 200);
  const step = Math.max(1, Math.floor(points.length / sampleSize));

  for (let i = 0; i < points.length; i += step) {
    const p = points[i];
    const neighbors = points.filter((other) => {
      const dist = Math.sqrt(
        Math.pow(other.x - p.x, 2) + Math.pow(other.y - p.y, 2)
      );
      return dist > 0 && dist < neighborRadius;
    });

    if (neighbors.length >= 3) {
      const zValues = neighbors.map((n) => n.z);
      const mean = zValues.reduce((a, b) => a + b, 0) / zValues.length;
      const variance =
        zValues.reduce((sum, z) => sum + Math.pow(z - mean, 2), 0) /
        zValues.length;
      localVariances.push(Math.sqrt(variance));
    }
  }

  if (localVariances.length === 0) return 0;

  const avgVariance =
    localVariances.reduce((a, b) => a + b, 0) / localVariances.length;

  // Normalize to 0-1 range (assuming 10m is very rough)
  return Math.min(1, avgVariance / 10);
}

/**
 * Calculate point distribution uniformity
 */
function calculateUniformity(
  points: SurveyPoint[],
  bounds: BoundingBox
): number {
  if (points.length < 10) return 1;

  // Divide area into grid cells and count points per cell
  const gridSize = 10;
  const cellWidth = (bounds.maxX - bounds.minX) / gridSize;
  const cellHeight = (bounds.maxY - bounds.minY) / gridSize;
  const cellCounts = new Array(gridSize * gridSize).fill(0);

  for (const p of points) {
    const cellX = Math.min(
      gridSize - 1,
      Math.floor((p.x - bounds.minX) / cellWidth)
    );
    const cellY = Math.min(
      gridSize - 1,
      Math.floor((p.y - bounds.minY) / cellHeight)
    );
    cellCounts[cellY * gridSize + cellX]++;
  }

  // Calculate coefficient of variation
  const mean = points.length / (gridSize * gridSize);
  const variance =
    cellCounts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) /
    cellCounts.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  // Convert to uniformity (0 = random, 1 = perfectly uniform)
  return Math.max(0, 1 - cv / 2);
}

/**
 * Calculate average spacing between points
 */
function calculateAverageSpacing(points: SurveyPoint[]): number {
  if (points.length < 2) return 100;

  let totalDist = 0;
  let count = 0;

  const sampleSize = Math.min(points.length, 100);
  const step = Math.max(1, Math.floor(points.length / sampleSize));

  for (let i = 0; i < points.length; i += step) {
    const p1 = points[i];
    let minDist = Infinity;

    for (let j = 0; j < points.length; j += step) {
      if (i === j) continue;
      const p2 = points[j];
      const dist = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
      if (dist < minDist) minDist = dist;
    }

    if (minDist < Infinity) {
      totalDist += minDist;
      count++;
    }
  }

  return count > 0 ? totalDist / count : 100;
}

/**
 * Classify terrain based on characteristics
 */
function classifyTerrain(
  elevationRange: number,
  meanSlope: number,
  roughness: number
): TerrainClass {
  // Flat: minimal elevation change, low slopes
  if (elevationRange < 5 && meanSlope < 2) {
    return 'flat';
  }

  // Rolling: moderate elevation change, gentle slopes
  if (elevationRange < 20 && meanSlope < 8) {
    return 'rolling';
  }

  // Hilly: significant elevation change, moderate slopes
  if (elevationRange < 100 && meanSlope < 15) {
    return 'hilly';
  }

  // Complex: high roughness regardless of other factors
  if (roughness > 0.6) {
    return 'complex';
  }

  // Mountainous: large elevation changes, steep slopes
  return 'mountainous';
}

/**
 * Detect presence of linear features (roads, streams)
 */
function detectLinearFeatures(points: SurveyPoint[]): boolean {
  // Simplified detection based on point alignment
  // In production, would use more sophisticated methods
  if (points.length < 20) return false;

  // Check if there are sequences of points with similar elevations
  // along a linear path (simplified heuristic)
  const sortedByX = [...points].sort((a, b) => a.x - b.x);

  let linearCount = 0;
  for (let i = 2; i < sortedByX.length; i++) {
    const p1 = sortedByX[i - 2];
    const p2 = sortedByX[i - 1];
    const p3 = sortedByX[i];

    // Check if three points are roughly collinear
    const area = Math.abs(
      p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)
    );
    const maxDist = Math.max(
      Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)),
      Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2))
    );

    if (area / maxDist < 5 && Math.abs(p1.z - p2.z) < 0.5 && Math.abs(p2.z - p3.z) < 0.5) {
      linearCount++;
    }
  }

  return linearCount > points.length * 0.05;
}

/**
 * Create elevation histogram
 */
export function createElevationHistogram(
  points: SurveyPoint[],
  bins: number = 10
): number[] {
  if (points.length === 0) return new Array(bins).fill(0);

  const elevations = points.map((p) => p.z);
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const range = max - min || 1;
  const binSize = range / bins;

  const histogram = new Array(bins).fill(0);
  for (const z of elevations) {
    const binIndex = Math.min(bins - 1, Math.floor((z - min) / binSize));
    histogram[binIndex]++;
  }

  return histogram;
}

// ============================================================================
// AI-Enhanced Analysis
// ============================================================================

/**
 * Analyze terrain using Gemini AI for enhanced classification
 */
export async function analyzeTerrainWithAI(
  input: TerrainAnalysisInput,
  apiKey: string
): Promise<TerrainAnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // First, calculate local characteristics
  const localCharacteristics = calculateLocalCharacteristics(input);

  // Prepare prompt for AI analysis
  const prompt = buildTerrainAnalysisPrompt(input, localCharacteristics);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return parseTerrainAnalysisResponse(response, localCharacteristics);
  } catch (error) {
    console.error('AI terrain analysis failed:', error);

    // Fall back to local analysis
    return {
      characteristics: localCharacteristics,
      confidence: 0.6,
      reasoning: 'Local analysis (AI unavailable)',
      anomalies: [],
    };
  }
}

/**
 * Calculate characteristics from input statistics
 */
function calculateLocalCharacteristics(
  input: TerrainAnalysisInput
): TerrainCharacteristics {
  const { statistics, bounds, pointCount, density } = input;

  const elevationRange = statistics.elevationMax - statistics.elevationMin;
  const normalizedStdDev = elevationRange > 0
    ? statistics.elevationStdDev / elevationRange
    : 0;

  // Estimate slope from elevation histogram
  const slopeEstimate = estimateSlopeFromHistogram(input.elevationHistogram, elevationRange);

  // Calculate roughness from histogram variance
  const roughness = normalizedStdDev * 2; // Simplified estimate

  // Calculate uniformity from density
  const expectedDensity = 50; // points per hectare
  const uniformity = Math.min(1, Math.max(0, 1 - Math.abs(density - expectedDensity) / expectedDensity));

  const classification = classifyTerrain(elevationRange, slopeEstimate, roughness);

  return {
    classification,
    slopeStats: {
      mean: slopeEstimate,
      max: slopeEstimate * 2,
      stdDev: slopeEstimate * 0.5,
    },
    roughness: Math.min(1, roughness),
    uniformity,
    hasLinearFeatures: false, // Will be determined by AI
    hasFlatAreas: slopeEstimate < 2 || normalizedStdDev < 0.1,
  };
}

/**
 * Estimate mean slope from elevation histogram
 */
function estimateSlopeFromHistogram(
  histogram: number[],
  elevationRange: number
): number {
  // Calculate histogram variance as proxy for slope
  const total = histogram.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  const binSize = elevationRange / histogram.length;
  let weightedSum = 0;
  let weightedSquaredSum = 0;

  for (let i = 0; i < histogram.length; i++) {
    const binCenter = (i + 0.5) * binSize;
    const weight = histogram[i] / total;
    weightedSum += binCenter * weight;
    weightedSquaredSum += binCenter * binCenter * weight;
  }

  const variance = weightedSquaredSum - weightedSum * weightedSum;
  const stdDev = Math.sqrt(Math.max(0, variance));

  // Convert to approximate slope angle
  return Math.min(45, stdDev * 0.5);
}

/**
 * Build prompt for AI terrain analysis
 */
function buildTerrainAnalysisPrompt(
  input: TerrainAnalysisInput,
  localCharacteristics: TerrainCharacteristics
): string {
  return `Analyze the following terrain survey data and provide a classification.

SURVEY STATISTICS:
- Point count: ${input.pointCount}
- Area: ${((input.bounds.maxX - input.bounds.minX) * (input.bounds.maxY - input.bounds.minY) / 10000).toFixed(2)} hectares
- Point density: ${input.density.toFixed(1)} points/hectare
- Elevation range: ${input.statistics.elevationMin.toFixed(2)}m to ${input.statistics.elevationMax.toFixed(2)}m
- Elevation mean: ${input.statistics.elevationMean.toFixed(2)}m
- Elevation std dev: ${input.statistics.elevationStdDev.toFixed(2)}m

LOCAL ANALYSIS:
- Preliminary classification: ${localCharacteristics.classification}
- Estimated mean slope: ${localCharacteristics.slopeStats.mean.toFixed(1)}°
- Roughness index: ${localCharacteristics.roughness.toFixed(2)}
- Point uniformity: ${localCharacteristics.uniformity.toFixed(2)}

ELEVATION HISTOGRAM (10 bins, low to high):
${input.elevationHistogram.join(', ')}

Please provide:
1. TERRAIN_CLASS: One of [flat, rolling, hilly, mountainous, complex]
2. CONFIDENCE: A number between 0 and 1
3. REASONING: Brief explanation (1-2 sentences)
4. ANOMALIES: Any detected anomalies or data quality issues (comma-separated, or "none")
5. HAS_LINEAR_FEATURES: true or false
6. HAS_FLAT_AREAS: true or false

Format your response as:
TERRAIN_CLASS: [value]
CONFIDENCE: [value]
REASONING: [text]
ANOMALIES: [text]
HAS_LINEAR_FEATURES: [value]
HAS_FLAT_AREAS: [value]`;
}

/**
 * Parse AI response into structured result
 */
function parseTerrainAnalysisResponse(
  response: string,
  fallbackCharacteristics: TerrainCharacteristics
): TerrainAnalysisResult {
  const lines = response.split('\n');
  const values: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      values[match[1].toUpperCase()] = match[2].trim();
    }
  }

  const classification = (values['TERRAIN_CLASS']?.toLowerCase() || fallbackCharacteristics.classification) as TerrainClass;
  const confidence = parseFloat(values['CONFIDENCE'] || '0.7');
  const reasoning = values['REASONING'] || 'Classification based on elevation statistics';
  const anomaliesStr = values['ANOMALIES'] || 'none';
  const anomalies = anomaliesStr.toLowerCase() === 'none'
    ? []
    : anomaliesStr.split(',').map(s => s.trim());
  const hasLinearFeatures = values['HAS_LINEAR_FEATURES']?.toLowerCase() === 'true';
  const hasFlatAreas = values['HAS_FLAT_AREAS']?.toLowerCase() === 'true';

  return {
    characteristics: {
      ...fallbackCharacteristics,
      classification,
      hasLinearFeatures,
      hasFlatAreas,
    },
    confidence: Math.min(1, Math.max(0, confidence)),
    reasoning,
    anomalies,
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  classifyTerrain,
  estimateSlopeStatistics,
  calculateRoughness,
  calculateUniformity,
  calculateAverageSpacing,
};
