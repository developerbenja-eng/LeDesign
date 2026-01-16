/**
 * Smart Surface Generation - AI Agent
 *
 * Main orchestrator for AI-powered surface analysis and generation.
 * Combines terrain classification, method selection, and quality validation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AIAnalysisRequest,
  AIAnalysisResponse,
  TerrainAnalysisInput,
  TerrainAnalysisResult,
  MethodRecommendation,
  MethodSelectionInput,
  QualityValidationInput,
  QualityValidationResult,
  FeatureDetectionResult,
  DetectedFeature,
} from './types';
import type { SurveyPoint, BoundingBox, DatasetStatistics } from '../triangulation/types';
import type { InterpolationMetrics, InterpolationMethodType } from '../interpolation/types';
import {
  calculateTerrainCharacteristics,
  createElevationHistogram,
  analyzeTerrainWithAI,
} from './terrain-classifier';
import {
  selectMethodRuleBased,
  selectMethodWithAI,
  generateIDWConfig,
  generateKrigingConfig,
} from './method-selector';
import {
  validateQualityRuleBased,
  validateQualityWithAI,
  quickQualityCheck,
} from './quality-validator';
import {
  detectFeaturesFromSatellite,
  fetchSatelliteTile,
} from './satellite-feature-detector';
import type { SatelliteDetectionOptions, SatelliteFeatureDetectionResult } from './types';

// ============================================================================
// Main AI Agent Class
// ============================================================================

export class SurfaceAIAgent {
  private apiKey: string;
  private useAI: boolean;
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_AI_API_KEY || '';
    this.useAI = this.apiKey.length > 0;

    if (this.useAI) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  // --------------------------------------------------------------------------
  // Main Analysis Pipeline
  // --------------------------------------------------------------------------

  /**
   * Run complete AI analysis on survey data
   */
  async analyzeDataset(
    points: SurveyPoint[],
    statistics: DatasetStatistics,
    bounds: BoundingBox,
    options: {
      useAI?: boolean;
      detectFeatures?: boolean;
      hasDEM?: boolean;
      hasSatelliteImagery?: boolean;
      hasIDEFeatures?: boolean;
      hasBreaklines?: boolean;
    } = {}
  ): Promise<AIAnalysisResponse> {
    const startTime = performance.now();

    // Calculate point density
    const areaWidth = bounds.maxX - bounds.minX;
    const areaHeight = bounds.maxY - bounds.minY;
    const areaHectares = (areaWidth * areaHeight) / 10000;
    const density = points.length / Math.max(0.01, areaHectares);

    // Create terrain analysis input
    const terrainInput: TerrainAnalysisInput = {
      statistics,
      bounds,
      pointCount: points.length,
      elevationHistogram: createElevationHistogram(points),
      density,
      sampleElevations: this.samplePoints(points, 100),
    };

    // Run terrain analysis
    let terrainResult: TerrainAnalysisResult;

    if (this.useAI && options.useAI !== false) {
      terrainResult = await analyzeTerrainWithAI(terrainInput, this.apiKey);
    } else {
      // Use local analysis with calculated characteristics
      const characteristics = calculateTerrainCharacteristics(statistics, points, bounds);
      terrainResult = {
        characteristics,
        confidence: 0.7,
        reasoning: 'Local analysis based on point statistics',
        anomalies: [],
      };
    }

    // Run method selection
    const methodInput: MethodSelectionInput = {
      terrainAnalysis: terrainResult,
      dataSources: {
        hasSurveyPoints: true,
        hasDEM: options.hasDEM ?? false,
        hasSatelliteImagery: options.hasSatelliteImagery ?? false,
        hasIDEFeatures: options.hasIDEFeatures ?? false,
      },
      hasBreaklines: options.hasBreaklines ?? false,
    };

    let methodRecommendation: MethodRecommendation;

    if (this.useAI && options.useAI !== false) {
      methodRecommendation = await selectMethodWithAI(methodInput, this.apiKey);
    } else {
      methodRecommendation = selectMethodRuleBased(methodInput);
    }

    // Calculate overall confidence
    const overallConfidence = (terrainResult.confidence + methodRecommendation.confidence) / 2;

    const processingTime = performance.now() - startTime;

    return {
      terrain: terrainResult,
      recommendation: methodRecommendation,
      overallConfidence,
      processingTime,
      model: this.useAI ? 'gemini-2.0-flash' : 'rule-based',
    };
  }

  /**
   * Validate interpolation results
   */
  async validateResults(
    metrics: InterpolationMetrics,
    method: InterpolationMethodType,
    terrainAnalysis: TerrainAnalysisResult,
    errorDistribution?: Array<{ x: number; y: number; error: number }>,
    options: { useAI?: boolean } = {}
  ): Promise<QualityValidationResult> {
    const input: QualityValidationInput = {
      metrics,
      method,
      terrainAnalysis,
      errorDistribution,
    };

    if (this.useAI && options.useAI !== false) {
      return validateQualityWithAI(input, this.apiKey);
    } else {
      return validateQualityRuleBased(input);
    }
  }

  /**
   * Quick validation without AI
   */
  quickValidate(
    metrics: InterpolationMetrics
  ): { passed: boolean; score: number; summary: string } {
    return quickQualityCheck(metrics);
  }

  // --------------------------------------------------------------------------
  // Satellite Feature Detection
  // --------------------------------------------------------------------------

  /**
   * Detect buildings, fences, and other structures from satellite imagery
   */
  async detectFeaturesFromSatellite(
    bounds: BoundingBox,
    options: {
      imageData?: string;
      imageMimeType?: string;
      detectionOptions?: SatelliteDetectionOptions;
    } = {}
  ): Promise<SatelliteFeatureDetectionResult> {
    if (!this.useAI) {
      return {
        features: [],
        breaklines: [],
        flatConstraints: [],
        notes: ['AI not available - satellite feature detection requires Gemini API key'],
        structureCounts: {
          buildings: 0,
          fences: 0,
          roads: 0,
          water: 0,
          vegetation: 0,
          parking: 0,
        },
        metadata: {
          modelUsed: 'none',
          processingTimeMs: 0,
          boundsAnalyzed: bounds,
        },
      };
    }

    // If no image provided, try to fetch from Esri World Imagery
    let imageData = options.imageData;
    let mimeType = options.imageMimeType || 'image/png';

    if (!imageData) {
      const tile = await fetchSatelliteTile(bounds);
      if (tile) {
        imageData = tile.imageData;
        mimeType = tile.mimeType;
      } else {
        return {
          features: [],
          breaklines: [],
          flatConstraints: [],
          notes: ['Failed to fetch satellite imagery for the area'],
          structureCounts: {
            buildings: 0,
            fences: 0,
            roads: 0,
            water: 0,
            vegetation: 0,
            parking: 0,
          },
          metadata: {
            modelUsed: 'none',
            processingTimeMs: 0,
            boundsAnalyzed: bounds,
          },
        };
      }
    }

    return detectFeaturesFromSatellite(
      {
        imageryTile: imageData,
        imageMimeType: mimeType,
        bounds,
        options: options.detectionOptions,
      },
      this.apiKey
    );
  }

  // --------------------------------------------------------------------------
  // Feature Detection from IDE Chile
  // --------------------------------------------------------------------------

  /**
   * Detect features from IDE Chile data
   */
  detectFeaturesFromIDE(
    ideFeatures: Array<{
      type: string;
      geometry: GeoJSON.Geometry;
      properties: Record<string, unknown>;
    }>,
    bounds: BoundingBox
  ): FeatureDetectionResult {
    const features: DetectedFeature[] = [];
    const breaklines: FeatureDetectionResult['breaklines'] = [];
    const flatConstraints: FeatureDetectionResult['flatConstraints'] = [];
    const notes: string[] = [];

    for (const feature of ideFeatures) {
      const geometry = feature.geometry;
      const type = feature.type.toLowerCase();

      // Road features
      if (type.includes('road') || type.includes('vialidad') || type.includes('calle') || type.includes('camino')) {
        if (geometry.type === 'LineString') {
          const coords = geometry.coordinates as Array<[number, number]>;
          features.push({
            type: 'road',
            geometry: { type: 'LineString', coordinates: coords },
            confidence: 0.9,
            source: 'ide_chile',
            useAsBreakline: true,
            useAsFlatConstraint: false,
          });

          breaklines.push({
            points: coords.map(([x, y]) => ({ x, y })),
            type: 'soft',
            source: 'IDE Chile - Vialidad',
          });
        } else if (geometry.type === 'MultiLineString') {
          const multiCoords = geometry.coordinates as Array<Array<[number, number]>>;
          for (const coords of multiCoords) {
            features.push({
              type: 'road',
              geometry: { type: 'LineString', coordinates: coords },
              confidence: 0.9,
              source: 'ide_chile',
              useAsBreakline: true,
              useAsFlatConstraint: false,
            });

            breaklines.push({
              points: coords.map(([x, y]) => ({ x, y })),
              type: 'soft',
              source: 'IDE Chile - Vialidad',
            });
          }
        }
      }

      // Water features
      if (type.includes('river') || type.includes('rio') || type.includes('stream') || type.includes('estero') || type.includes('hidro')) {
        if (geometry.type === 'LineString') {
          const coords = geometry.coordinates as Array<[number, number]>;
          features.push({
            type: type.includes('rio') || type.includes('river') ? 'river' : 'stream',
            geometry: { type: 'LineString', coordinates: coords },
            confidence: 0.85,
            source: 'ide_chile',
            useAsBreakline: true,
            useAsFlatConstraint: false,
          });

          breaklines.push({
            points: coords.map(([x, y]) => ({ x, y })),
            type: 'hard',
            source: 'IDE Chile - Red Hidrográfica',
          });
        } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
          // Water body (lake)
          const rings = geometry.type === 'Polygon'
            ? [geometry.coordinates[0] as Array<[number, number]>]
            : (geometry.coordinates as Array<Array<Array<[number, number]>>>).map(poly => poly[0]);

          for (const ring of rings) {
            features.push({
              type: 'lake',
              geometry: { type: 'Polygon', coordinates: ring },
              confidence: 0.9,
              source: 'ide_chile',
              useAsBreakline: false,
              useAsFlatConstraint: true,
            });

            flatConstraints.push({
              polygon: ring.map(([x, y]) => ({ x, y })),
              source: 'IDE Chile - Cuerpo de agua',
            });
          }
        }
      }
    }

    if (features.length > 0) {
      notes.push(`Detected ${features.length} features from IDE Chile data`);
      notes.push(`${breaklines.length} breaklines and ${flatConstraints.length} flat constraints generated`);
    } else {
      notes.push('No relevant features found in IDE Chile data for this area');
    }

    return {
      features,
      breaklines,
      flatConstraints,
      notes,
    };
  }

  // --------------------------------------------------------------------------
  // Configuration Helpers
  // --------------------------------------------------------------------------

  /**
   * Get recommended IDW configuration
   */
  getIDWConfig(recommendation: MethodRecommendation) {
    return generateIDWConfig(recommendation);
  }

  /**
   * Get recommended Kriging configuration
   */
  getKrigingConfig(recommendation: MethodRecommendation) {
    return generateKrigingConfig(recommendation);
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  /**
   * Sample points for analysis
   */
  private samplePoints(
    points: SurveyPoint[],
    maxCount: number
  ): Array<{ x: number; y: number; z: number }> {
    if (points.length <= maxCount) {
      return points.map((p) => ({ x: p.x, y: p.y, z: p.z }));
    }

    const step = Math.floor(points.length / maxCount);
    const sampled: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i < points.length && sampled.length < maxCount; i += step) {
      sampled.push({ x: points[i].x, y: points[i].y, z: points[i].z });
    }

    return sampled;
  }

  /**
   * Check if AI is available
   */
  isAIAvailable(): boolean {
    return this.useAI;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new AI agent instance
 */
export function createSurfaceAIAgent(apiKey?: string): SurfaceAIAgent {
  return new SurfaceAIAgent(apiKey);
}

// ============================================================================
// Quick Analysis Functions
// ============================================================================

/**
 * Quick terrain analysis without full agent
 */
export function quickTerrainAnalysis(
  points: SurveyPoint[],
  statistics: DatasetStatistics,
  bounds: BoundingBox
): TerrainAnalysisResult {
  const characteristics = calculateTerrainCharacteristics(statistics, points, bounds);

  return {
    characteristics,
    confidence: 0.7,
    reasoning: 'Quick local analysis based on point statistics',
    anomalies: [],
  };
}

/**
 * Quick method recommendation without AI
 */
export function quickMethodRecommendation(
  terrainResult: TerrainAnalysisResult,
  hasBreaklines: boolean = false
): MethodRecommendation {
  return selectMethodRuleBased({
    terrainAnalysis: terrainResult,
    dataSources: {
      hasSurveyPoints: true,
      hasDEM: false,
      hasSatelliteImagery: false,
      hasIDEFeatures: false,
    },
    hasBreaklines,
  });
}
