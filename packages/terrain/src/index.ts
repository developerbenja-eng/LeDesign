// ============================================================
// TERRAIN ANALYSIS MODULE - UNIFIED EXPORTS
// ============================================================
// Complete terrain and surveying library
// DEM processing, earthwork volumes, surface modeling, DWG parsing
// ============================================================

// ============================================================
// GEOTIFF/DEM PROCESSING
// ============================================================
export * from './geotiff-terrain';

// ============================================================
// INFRASTRUCTURE GEOMETRY (Coordinate systems, transformations)
// ============================================================
// TODO: Re-enable after migrating type definitions
// export * from './infrastructure-geometry';

// ============================================================
// TERRAIN SERVICE (Surface management, earthwork calculations)
// ============================================================
export * from './terrain-service';

// ============================================================
// DWG PARSING (AutoCAD file import)
// ============================================================
export * from './dwg';

// ============================================================
// SURFACE AI (AI-powered surface modeling and analysis)
// ============================================================
// TODO: Fix type errors before re-enabling
// export * from './surface-ai';

// ============================================================
// CONFIGURATION (Environment variables and API keys)
// ============================================================
export { terrainConfig } from './config';

// ============================================================
// IDE CHILE (Chilean government geospatial data services)
// ============================================================
export * from './ide-chile-types';

// ============================================================
// TRIANGULATION (Delaunay triangulation for terrain meshes)
// ============================================================
// Export triangulation functions and classes
export {
  // Main triangulation functions
  triangulate,
  toTINSurface,
  findTriangleAt,
  // Note: getElevationAt from triangulation is not exported to avoid conflict with geotiff-terrain
  generateContours,
  getSlopeAt,
  getAspectAt,
  calculateSlopeStatistics,
  DEFAULT_TRIANGULATION_CONFIG,

  // TIN builder classes
  TINBuilder,
  createTINFromFile,
  createTINFromPoints,
  sampleDEMForAugmentation,

  // Point parsing
  parseCSV,
  parseXYZ,
  processPointFile,
  detectColumnMapping,
  detectDelimiter,
  detectHeader,
  detectFileType,
  removeDuplicates,
  removeOutliers,
  calculateStatistics,
  calculateBounds,

  // Triangulation-specific types (non-conflicting)
  type SurveyPoint,
  type SurveyDataset,
  type TriangulationResult,
  type Triangle,
  type Edge,
  type TriangulationStatistics,
  type TriangulationConfig,
  type DatasetStatistics,
  type BoundingBox,
  type CSVParseOptions,
  type ColumnMapping,
  type ParseResult,
  type ParseError,
  type ParseWarning,
  type LASParseOptions,
  type LASHeader,
  type PointSource,
  type LASClassification,
  type GeneratedSurface,
  type SurfaceGenerationConfig,
  type SurfaceQualityMetrics,
  type ProcessingProgress,
  type ProcessingStage,
  type InterpolationMethod,
  type ConstrainedTriangulationConfig,
  type ConstraintRegion,
  type ConstraintRegionType,
  type BreaklineType,
  type BreaklineSource,
  type AIAnalysisResult,
  type ProblemArea,
  // Note: Breakline, DetectedFeature, TerrainClass, IDWConfig, KrigingConfig, CrossValidationResult
  // are not exported here to avoid conflicts with surface-ai and interpolation modules
} from './triangulation';

// ============================================================
// INTERPOLATION (IDW, Kriging, quality metrics)
// ============================================================
export * from './interpolation';

// ============================================================
// GEO-SPATIAL UTILITIES (Coordinate transforms, spatial indexing, LOD, tiles)
// ============================================================
export * from './geo';

// ============================================================
// CAD TYPES (Shared type definitions)
// ============================================================
export * from './cad-types';

// ============================================================
// VOLUME CALCULATION (Cut/fill analysis, earthwork quantities)
// ============================================================
export * from './volume-calculation';

// ============================================================
// DEM SERVICE (Digital elevation model fetching and caching)
// ============================================================
export * from './dem-service';
