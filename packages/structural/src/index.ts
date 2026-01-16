// ============================================================
// STRUCTURAL ENGINEERING MODULE - UNIFIED EXPORTS
// ============================================================
// Complete structural engineering library for Chilean codes
// ============================================================

// ============================================================
// CHILEAN CODES (Re-exported from @ledesign/chilean-codes)
// NCh433, NCh432, NCh431, NCh1537, NCh3171
// ============================================================
export * from '@ledesign/chilean-codes';

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
// FACTORIES (Element creation helpers)
// ============================================================
export * from './factories';

// ============================================================
// INTEGRATION (Unified Chilean codes integration)
// ============================================================
export * from './chilean-codes-integration';
