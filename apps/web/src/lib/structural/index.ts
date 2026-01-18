// ============================================================
// STRUCTURAL ENGINEERING MODULE - UNIFIED EXPORTS
// ============================================================
// Complete structural engineering library for Chilean codes
// ============================================================

// ============================================================
// CHILEAN CODES (Primary export - includes loads, geotechnical)
// NCh432, NCh431, NCh1537, NCh3171, DS61
// ============================================================
export * from './chilean-codes';

// ============================================================
// GEOLOCATION (Automatic zone determination from coordinates)
// ============================================================
export {
  // Zone determination functions
  determineSeismicZone,
  determineWindZone,
  determineAllZones,
  estimateSoilType,
  getRegionFromCoordinates,
  isWithinChile,
  normalizeCoordinates,
  // Map utilities
  calculateDistance,
  calculateBearing,
  bearingToDirection,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateCentroid,
  // Color schemes
  SEISMIC_ZONE_COLORS,
  WIND_ZONE_COLORS,
  SOIL_TYPE_COLORS,
  // Default config
  DEFAULT_CHILE_MAP_CONFIG,
  // Mock service
  MockExternalDataService,
  // Region data
  CHILEAN_REGIONS,
} from './geolocation';

// Re-export geolocation types
export type {
  GeoCoordinates,
  ProjectLocation,
  ChileanRegion,
  RegionData,
  SeismicZoneResult,
  WindZoneResult,
  SoilDataResult,
  AllZonesResult,
  // Map types
  MapProvider,
  MapConfig,
  LocationPickerMode,
  LocationPickerState,
  LocationSelectionResult,
  LocationPickerProps,
  LocationPickerCallbacks,
  MapLayer,
  SeismicZoneLayer,
  WindZoneLayer,
  SoilStudyLayer,
  MapClickEvent,
  MapFeature,
  MapMoveEvent,
  GeocodingResult,
  ReverseGeocodingResult,
  ElevationResult,
  DrawingFeature,
  BuildingFootprint,
  // External data types
  GeologicalDataProvider,
  DataProviderConfig,
  SernageominGeologyData,
  SeismicHazardData,
  TsunamiHazardData,
  ClimateData,
  SoilStudyRecord,
  NearbyStudiesResult,
  ExternalLocationData,
  ExternalDataService,
} from './geolocation';

// ============================================================
// ANALYSIS (Static, Modal analysis engines)
// ============================================================
export * from './analysis';

// ============================================================
// DESIGN (AISC steel design, code checks)
// ============================================================
export * from './design';

// ============================================================
// SEISMIC (NCh433 seismic design)
// ============================================================
// Note: Using explicit exports to avoid DRIFT_LIMITS conflict
// (already exported from chilean-codes/nch3171-combinations)
export {
  // Zone data
  CHILEAN_SEISMIC_ZONES,
  CHILEAN_SOIL_TYPES,
  OCCUPANCY_CATEGORIES as SEISMIC_OCCUPANCY_CATEGORIES,
  STRUCTURAL_SYSTEMS,
  // Calculation functions
  calculateAlpha,
  calculateRstar,
  calculateElasticSa,
  calculateDesignSa,
  generateDesignSpectrum,
  calculateBaseShear,
  calculateDesignDrift,
  classifySoilByVs30,
  estimateZoneFromLatitude,
  formatSpectrumForExport,
  createNCh433Parameters,
  // Load combinations
  CHILEAN_LOAD_COMBINATIONS,
  // NCh433 Spectrum generation
  NCh433_ZONES,
  NCh433_SOIL_TYPES,
  NCh433_OCCUPANCY,
  NCh433_STRUCTURAL_SYSTEMS,
  generateNCh433DesignSpectrum,
  getRecommendedModes,
  calculateApproximatePeriod,
  getNCh433Description,
  // NCh433 Seismic load generation
  calculateSeismicMass,
  calculateTotalSeismicWeight,
  calculateSeismicBaseShear,
  calculateVerticalDistributionExponent,
  distributeSeismicForces,
  calculateAccidentalTorsion,
  generateNCh433SeismicLoads,
  createSeismicLoadCases,
} from './seismic';

// Re-export seismic types
export type {
  ChileanSeismicZone,
  ChileanSoilType,
  OccupancyCategory as SeismicOccupancyCategory,
  StructuralSystemType,
  NCh433Parameters,
  NCh433SeismicParameters,
  SpectralAccelerationResult,
  BaseShearResult,
  // NCh433 load generation types
  SeismicMassInput,
  FloorLevel,
  SeismicLoadDistribution,
  NCh433SeismicLoadInput,
  SeismicLoadResult,
  SeismicLoadCaseData,
} from './seismic';

// ============================================================
// FACTORIES (Element creation helpers)
// ============================================================
export * from './factories';
