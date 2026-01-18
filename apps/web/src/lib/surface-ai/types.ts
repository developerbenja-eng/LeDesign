/**
 * Smart Surface Generation - AI Agent Types
 *
 * Types for terrain classification, method selection, and quality validation
 * using Google Gemini 3.0 Flash Preview.
 */

import type { InterpolationMethodType as BaseInterpolationMethodType, InterpolationMetrics } from '../interpolation/types';
import type { DatasetStatistics, BoundingBox } from '../triangulation/types';

// Extended method type that includes both triangulation and interpolation methods
export type InterpolationMethodType = BaseInterpolationMethodType | 'delaunay' | 'constrained_delaunay';

// ============================================================================
// Terrain Classification
// ============================================================================

export type TerrainClass = 'flat' | 'rolling' | 'hilly' | 'mountainous' | 'complex';

export interface TerrainCharacteristics {
  /** Overall terrain classification */
  classification: TerrainClass;
  /** Slope statistics in degrees */
  slopeStats: {
    mean: number;
    max: number;
    stdDev: number;
  };
  /** Roughness index (0-1) */
  roughness: number;
  /** Point distribution uniformity (0-1) */
  uniformity: number;
  /** Presence of linear features */
  hasLinearFeatures: boolean;
  /** Presence of flat areas (water bodies, roads) */
  hasFlatAreas: boolean;
}

export interface TerrainAnalysisInput {
  /** Dataset statistics */
  statistics: DatasetStatistics;
  /** Bounding box */
  bounds: BoundingBox;
  /** Point count */
  pointCount: number;
  /** Elevation histogram (10 bins) */
  elevationHistogram: number[];
  /** Slope histogram (10 bins) */
  slopeHistogram?: number[];
  /** Point density (points per hectare) */
  density: number;
  /** Sample elevations (up to 100 representative points) */
  sampleElevations?: Array<{ x: number; y: number; z: number }>;
}

export interface TerrainAnalysisResult {
  /** Terrain characteristics */
  characteristics: TerrainCharacteristics;
  /** AI confidence in classification (0-1) */
  confidence: number;
  /** Detailed reasoning from AI */
  reasoning: string;
  /** Detected anomalies */
  anomalies: string[];
}

// ============================================================================
// Method Selection
// ============================================================================

export interface MethodRecommendation {
  /** Recommended primary method */
  primaryMethod: InterpolationMethodType;
  /** Alternative methods to consider */
  alternativeMethods: InterpolationMethodType[];
  /** Confidence in recommendation (0-1) */
  confidence: number;
  /** Reasoning for the recommendation */
  reasoning: string;
  /** Suggested configuration parameters */
  suggestedConfig: Record<string, unknown>;
  /** Expected quality score (0-100) */
  expectedQuality: number;
}

export interface MethodSelectionInput {
  /** Terrain analysis result */
  terrainAnalysis: TerrainAnalysisResult;
  /** Available data sources */
  dataSources: {
    hasSurveyPoints: boolean;
    hasDEM: boolean;
    hasSatelliteImagery: boolean;
    hasIDEFeatures: boolean;
  };
  /** Quality requirements */
  qualityRequirements?: {
    targetRMSE?: number;
    minimumR2?: number;
    maxComputeTime?: number;
  };
  /** Available breaklines/constraints */
  hasBreaklines: boolean;
}

// ============================================================================
// Quality Validation
// ============================================================================

export interface QualityValidationInput {
  /** Interpolation metrics from cross-validation */
  metrics: InterpolationMetrics;
  /** Method used */
  method: InterpolationMethodType;
  /** Terrain analysis */
  terrainAnalysis: TerrainAnalysisResult;
  /** Error distribution (spatial) */
  errorDistribution?: Array<{
    x: number;
    y: number;
    error: number;
  }>;
  /** Comparison with other methods if available */
  methodComparison?: Array<{
    method: InterpolationMethodType;
    metrics: InterpolationMetrics;
  }>;
}

export interface QualityValidationResult {
  /** Overall quality score (0-100) */
  qualityScore: number;
  /** Quality rating */
  rating: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
  /** Pass/fail status */
  passed: boolean;
  /** Detailed assessment */
  assessment: string;
  /** Identified issues */
  issues: Array<{
    type: 'high_error' | 'bias' | 'artifact' | 'sparse_coverage' | 'outliers';
    severity: 'critical' | 'warning' | 'info';
    description: string;
    location?: { x: number; y: number };
  }>;
  /** Improvement suggestions */
  suggestions: string[];
  /** Recommended next steps */
  nextSteps: string[];
}

// ============================================================================
// Feature Detection
// ============================================================================

export type FeatureType =
  | 'road'
  | 'river'
  | 'stream'
  | 'lake'
  | 'building'
  | 'fence'
  | 'wall'
  | 'ridge'
  | 'valley'
  | 'breakline'
  | 'vegetation'
  | 'parking';

export interface DetectedFeature {
  /** Feature type */
  type: FeatureType;
  /** Feature geometry (simplified) */
  geometry: {
    type: 'LineString' | 'Polygon';
    coordinates: Array<[number, number]>;
  };
  /** Confidence in detection (0-1) */
  confidence: number;
  /** Source of detection */
  source: 'satellite' | 'dem' | 'ide_chile' | 'survey';
  /** Whether to use as breakline */
  useAsBreakline: boolean;
  /** Whether to use as flat constraint */
  useAsFlatConstraint: boolean;
}

export interface FeatureDetectionInput {
  /** Satellite imagery tile (base64) */
  imageryTile?: string;
  /** Image MIME type (e.g., 'image/png', 'image/jpeg') */
  imageMimeType?: string;
  /** DEM data for feature extraction */
  demData?: {
    grid: Float32Array;
    width: number;
    height: number;
    bounds: BoundingBox;
  };
  /** IDE Chile features in area */
  ideFeatures?: Array<{
    type: string;
    geometry: GeoJSON.Geometry;
    properties: Record<string, unknown>;
  }>;
  /** Survey point bounds */
  bounds: BoundingBox;
  /** Detection options */
  options?: SatelliteDetectionOptions;
}

export interface SatelliteDetectionOptions {
  /** Detect buildings and structures */
  detectBuildings?: boolean;
  /** Detect fences and walls */
  detectFences?: boolean;
  /** Detect roads (from imagery) */
  detectRoads?: boolean;
  /** Detect water bodies */
  detectWater?: boolean;
  /** Detect vegetation areas */
  detectVegetation?: boolean;
  /** Detect parking lots */
  detectParking?: boolean;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Simplify detected geometries */
  simplifyGeometry?: boolean;
}

export interface SatelliteFeatureDetectionResult extends FeatureDetectionResult {
  /** Raw AI response for debugging */
  rawResponse?: string;
  /** Image analysis summary */
  imageSummary?: string;
  /** Detected structures count */
  structureCounts: {
    buildings: number;
    fences: number;
    roads: number;
    water: number;
    vegetation: number;
    parking: number;
  };
  /** Processing metadata */
  metadata: {
    imageWidth?: number;
    imageHeight?: number;
    modelUsed: string;
    processingTimeMs: number;
    boundsAnalyzed: BoundingBox;
  };
}

export interface FeatureDetectionResult {
  /** Detected features */
  features: DetectedFeature[];
  /** Suggested breaklines */
  breaklines: Array<{
    points: Array<{ x: number; y: number }>;
    type: 'hard' | 'soft';
    source: string;
  }>;
  /** Suggested flat constraint regions */
  flatConstraints: Array<{
    polygon: Array<{ x: number; y: number }>;
    source: string;
  }>;
  /** Processing notes */
  notes: string[];
}

// ============================================================================
// Comprehensive AI Analysis
// ============================================================================

export interface AIAnalysisRequest {
  /** Input data for analysis */
  input: TerrainAnalysisInput;
  /** Optional feature detection input */
  featureInput?: FeatureDetectionInput;
  /** Analysis options */
  options?: {
    includeMethodComparison?: boolean;
    detectFeatures?: boolean;
    validateAgainstDEM?: boolean;
  };
}

export interface AIAnalysisResponse {
  /** Terrain analysis */
  terrain: TerrainAnalysisResult;
  /** Method recommendation */
  recommendation: MethodRecommendation;
  /** Detected features (if requested) */
  features?: FeatureDetectionResult;
  /** Overall confidence */
  overallConfidence: number;
  /** Processing time (ms) */
  processingTime: number;
  /** Model used */
  model: string;
}

// ============================================================================
// Gemini API Types
// ============================================================================

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }>;
}

export interface GeminiConfig {
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}
