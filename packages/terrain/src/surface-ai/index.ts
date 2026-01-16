/**
 * Smart Surface Generation - AI Module
 *
 * Exports for terrain classification, method selection, quality validation,
 * IDE Chile feature extraction, and the main AI agent.
 */

// Types
export * from './types';

// Terrain Classifier
export {
  calculateTerrainCharacteristics,
  createElevationHistogram,
  analyzeTerrainWithAI,
  classifyTerrain,
  estimateSlopeStatistics,
  calculateRoughness,
  calculateUniformity,
  calculateAverageSpacing,
} from './terrain-classifier';

// Method Selector
export {
  selectMethodRuleBased,
  selectMethodWithAI,
  generateIDWConfig,
  generateKrigingConfig,
  compareMethodPerformance,
} from './method-selector';

// Quality Validator
export {
  validateQualityRuleBased,
  validateQualityWithAI,
  quickQualityCheck,
  getQualityColor,
} from './quality-validator';

// IDE Chile Feature Extractor
export {
  extractIDEFeatures,
  simplifyBreaklines,
  toFeatureDetectionResult,
  type Breakline,
  type FlatConstraint,
  type IDEExtractionResult,
  type IDEExtractionOptions,
} from './ide-feature-extractor';

// Satellite Feature Detector
export {
  detectFeaturesFromSatellite,
  fetchSatelliteTile,
  captureSatelliteFromCanvas,
  buildDetectionPrompt,
  mapFeatureType,
} from './satellite-feature-detector';

// Main Agent
export {
  SurfaceAIAgent,
  createSurfaceAIAgent,
  quickTerrainAnalysis,
  quickMethodRecommendation,
} from './agent';
