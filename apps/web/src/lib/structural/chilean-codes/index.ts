// ============================================================
// CHILEAN STRUCTURAL CODES - UNIFIED EXPORTS
// ============================================================
// Complete implementation of Chilean structural design codes
// ============================================================

// Main integration module
export * from './chilean-codes-integration';

// Geolocation bridge functions
export {
  createLocationFromCoordinates,
  analyzeChileanBuildingFromCoordinates,
  getZoneSummaryFromCoordinates,
} from './chilean-codes-integration';

// Load combinations (NCh3171:2017)
export * from './nch3171-combinations';

// Re-export from load modules
export {
  // NCh432:2025 Wind
  calculateVelocityPressure,
  calculateDesignPressures,
  estimateWindZoneFromLatitude,
  getWindLoadSummary,
  CHILEAN_WIND_ZONES,
  EXPOSURE_CATEGORIES,
  WIND_RISK_CATEGORIES,
  ENCLOSURE_CLASSIFICATIONS,
} from '../loads/nch432-wind';

export {
  // NCh431:2010 Snow
  calculateGroundSnowLoad,
  calculateFlatRoofSnowLoad,
  calculateSlopedRoofSnowLoad,
  analyzeSnowLoads,
  SNOW_EXPOSURE_FACTORS,
  THERMAL_FACTORS,
  SNOW_IMPORTANCE_FACTORS,
} from '../loads/nch431-snow';

export {
  // NCh1537:2009 Live
  LIVE_LOADS,
  MATERIAL_WEIGHTS,
  PARTITION_LOADS,
  calculateLiveLoadReduction,
  calculateRoofLiveLoad,
  calculateFloorDeadLoad,
  getLiveLoad,
  getOccupancyByCategory,
  createNCh1537Parameters,
} from '../loads/nch1537-live';

// Re-export from geotechnical
export {
  // DS61 Field Study Requirements
  determineFieldStudyRequirements,
  checkDS61Compliance,
  generateRequirementsSummary,
  OCCUPANCY_CATEGORIES,
  SOIL_CLASSIFICATION_REQUIREMENTS,
  VS30_MEASUREMENT_METHODS,
  SPECIAL_SOIL_CONDITIONS,
} from '../geotechnical/ds61-requirements';

// ============================================================
// TYPE RE-EXPORTS
// ============================================================

export type {
  // Wind types
  ChileanWindZone,
  ExposureCategory,
  WindRiskCategory,
  TopographicFeature,
  EnclosureClass,
  WindLoadParams,
  VelocityPressureResult,
  DesignWindPressure,
  NCh432WindParameters,
} from '../loads/nch432-wind';

export type {
  // Snow types
  SnowExposureCategory,
  TerrainCategory,
  ThermalCondition,
  SnowRiskCategory,
  RoofSurface,
  SnowLoadParams,
  FlatRoofSnowLoadResult,
  SlopedRoofSnowLoadResult,
  SnowLoadAnalysisResult,
  NCh431SnowParameters,
} from '../loads/nch431-snow';

export type {
  // Live load types
  OccupancyType,
  LiveLoadData,
  MaterialWeight,
  PartitionLoad,
  LiveLoadReductionParams,
  LiveLoadReductionResult,
  RoofLiveLoadParams,
  NCh1537LoadParameters,
} from '../loads/nch1537-live';

export type {
  // Combination types
  LoadSymbol,
  LoadDescription,
  LoadFactorSet,
  LoadCombination,
  DeflectionLimit,
  DriftLimit,
  LoadValues,
  CombinationResult,
  NCh3171Parameters,
} from './nch3171-combinations';

export type {
  // Geotechnical types
  OccupancyCategory,
  OccupancyCategoryData,
  SoilType,
  SoilClassificationRequirements,
  MeasurementMethod,
  FieldStudyMethod,
  BuildingCriteria,
  FieldStudyRequirements,
  SpecialSoilCondition,
  Vs30MeasurementData,
  GeotechnicalData,
  ComplianceResult,
  FieldStudyReportData,
} from '../geotechnical/ds61-requirements';

export type {
  // Integration types
  ChileanBuildingLocation,
  ChileanBuildingGeometry,
  ChileanBuildingClassification,
  ChileanBuildingParams,
  ChileanLoadAnalysis,
  LoadSummaryReport,
} from './chilean-codes-integration';

// Re-export geolocation types for convenience
export type {
  GeoCoordinates,
  AllZonesResult,
  SeismicZoneResult,
  WindZoneResult,
  SoilDataResult,
  ChileanRegion,
} from '../geolocation/chilean-zones';
