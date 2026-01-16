// ============================================================
// CHILEAN LOAD CODES INDEX
// ============================================================

// Wind loads (NCh432:2025)
export * from './nch432-wind';

// Snow loads (NCh431:2010)
export * from './nch431-snow';

// Live loads (NCh1537:2009)
export * from './nch1537-live';

// Re-export key types
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
} from './nch432-wind';

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
} from './nch431-snow';

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
} from './nch1537-live';
