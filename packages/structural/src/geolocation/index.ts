// ============================================================
// GEOLOCATION MODULE INDEX
// ============================================================
// Automatic zone determination and map integration for
// Chilean structural engineering projects
// ============================================================

// Zone determination from coordinates
export * from './chilean-zones';

// External data source interfaces
export * from './external-data-sources';

// Map integration utilities
export * from './map-integration';

// ============================================================
// CONVENIENCE RE-EXPORTS
// ============================================================

export {
  // Core functions
  determineSeismicZone,
  determineWindZone,
  determineAllZones,
  estimateSoilType,
  getRegionFromCoordinates,
  isWithinChile,
  normalizeCoordinates,
} from './chilean-zones';

export {
  // Mock service for development
  MockExternalDataService,
} from './external-data-sources';

export {
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
} from './map-integration';

// ============================================================
// TYPE RE-EXPORTS
// ============================================================

export type {
  // Coordinate types
  GeoCoordinates,
  ProjectLocation,
  ChileanRegion,
  RegionData,
  // Zone result types
  SeismicZoneResult,
  WindZoneResult,
  SoilDataResult,
  AllZonesResult,
  SoilType,
} from './chilean-zones';

export type {
  // Data provider types
  GeologicalDataProvider,
  DataProviderConfig,
  // Geological data types
  SernageominGeologyData,
  SeismicHazardData,
  TsunamiHazardData,
  ClimateData,
  SoilStudyRecord,
  NearbyStudiesResult,
  ExternalLocationData,
  // Service interface
  ExternalDataService,
  // Database types
  SoilStudyDatabaseRecord,
  GeologicalMapDatabaseRecord,
} from './external-data-sources';

export type {
  // Map types
  MapProvider,
  MapConfig,
  LocationPickerMode,
  LocationPickerState,
  LocationSelectionResult,
  LocationPickerProps,
  LocationPickerCallbacks,
  // Layer types
  MapLayer,
  SeismicZoneLayer,
  WindZoneLayer,
  SoilStudyLayer,
  // Event types
  MapClickEvent,
  MapFeature,
  MapMoveEvent,
  // Geocoding types
  GeocodingResult,
  ReverseGeocodingResult,
  ElevationResult,
  // Drawing types
  DrawingFeature,
  BuildingFootprint,
} from './map-integration';
