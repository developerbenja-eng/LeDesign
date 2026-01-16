/**
 * Smart Surface Generation - Type Definitions
 *
 * Core types for survey point processing, triangulation, and surface generation.
 */

// ============================================================================
// Survey Point Types
// ============================================================================

export interface SurveyPoint {
  id: string;
  x: number;        // Easting (meters)
  y: number;        // Northing (meters)
  z: number;        // Elevation (meters)
  code?: string;    // Feature code (e.g., 'BRK' for breakline, 'GND' for ground)
  description?: string;
  source: PointSource;
  classification?: LASClassification;
  intensity?: number;     // LAS intensity value
  rgb?: [number, number, number];  // RGB color from LAS
}

export type PointSource =
  | 'survey_csv'      // Traditional survey CSV/XYZ
  | 'survey_las'      // LAS/LAZ point cloud
  | 'dem_sample'      // Sampled from DEM raster
  | 'ide_feature'     // Extracted from IDE Chile feature
  | 'manual';         // Manually entered

// LAS classification codes (ASPRS)
export type LASClassification =
  | 0   // Never classified
  | 1   // Unassigned
  | 2   // Ground
  | 3   // Low vegetation
  | 4   // Medium vegetation
  | 5   // High vegetation
  | 6   // Building
  | 7   // Low point (noise)
  | 8   // Reserved
  | 9   // Water
  | 10  // Rail
  | 11  // Road surface
  | 12  // Reserved
  | 13  // Wire - Guard
  | 14  // Wire - Conductor
  | 15  // Transmission tower
  | 16  // Wire-structure connector
  | 17  // Bridge deck
  | 18; // High noise

// ============================================================================
// Survey Dataset Types
// ============================================================================

export interface SurveyDataset {
  id: string;
  projectId: string;
  name: string;
  sourceFile?: string;
  points: SurveyPoint[];
  bounds: BoundingBox;
  crs: string;                    // Coordinate reference system (e.g., 'EPSG:32719')
  statistics: DatasetStatistics;
  createdAt: string;
  updatedAt: string;
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface DatasetStatistics {
  pointCount: number;
  groundPointCount?: number;      // For LAS data
  densityPerHectare: number;
  elevationMean: number;
  elevationStdDev: number;
  elevationMin: number;
  elevationMax: number;
  areaHectares: number;
  outlierCount: number;
  duplicateCount: number;
}

// ============================================================================
// CSV/XYZ Parsing Types
// ============================================================================

export interface CSVParseOptions {
  delimiter?: ',' | ';' | '\t' | ' ';
  hasHeader?: boolean;
  skipRows?: number;
  columnMapping?: ColumnMapping;
  coordinateSystem?: string;
  elevationUnit?: 'meters' | 'feet';
}

export interface ColumnMapping {
  id?: number | string;
  x?: number | string;
  y?: number | string;
  z?: number | string;
  code?: number | string;
  description?: number | string;
}

export interface ParseResult {
  success: boolean;
  points: SurveyPoint[];
  errors: ParseError[];
  warnings: ParseWarning[];
  statistics: {
    totalRows: number;
    validPoints: number;
    skippedRows: number;
    parseTime: number;
  };
}

export interface ParseError {
  row: number;
  column?: string;
  message: string;
  value?: string;
}

export interface ParseWarning {
  row?: number;
  type: 'duplicate' | 'outlier' | 'invalid_code' | 'missing_value';
  message: string;
}

// ============================================================================
// LAS/LAZ Parsing Types
// ============================================================================

export interface LASParseOptions {
  classificationFilter?: LASClassification[];  // Only load specific classifications
  decimationFactor?: number;                   // Skip every N points (for large files)
  maxPoints?: number;                          // Maximum points to load
  loadRGB?: boolean;
  loadIntensity?: boolean;
  coordinateSystem?: string;
}

export interface LASHeader {
  fileSignature: string;
  versionMajor: number;
  versionMinor: number;
  pointCount: number;
  pointFormat: number;
  bounds: BoundingBox;
  scale: [number, number, number];
  offset: [number, number, number];
}

// ============================================================================
// Triangulation Types
// ============================================================================

export interface TriangulationResult {
  triangles: Triangle[];
  points: SurveyPoint[];
  edges: Edge[];
  hullIndices: number[];
  statistics: TriangulationStatistics;
}

export interface Triangle {
  indices: [number, number, number];  // Indices into points array
  area: number;
  centroid: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
  slope?: number;        // Degrees from horizontal
  aspect?: number;       // Degrees from north
}

export interface Edge {
  indices: [number, number];
  length: number;
  isHull: boolean;
  isBreakline?: boolean;
}

export interface TriangulationStatistics {
  triangleCount: number;
  edgeCount: number;
  hullEdgeCount: number;
  minTriangleArea: number;
  maxTriangleArea: number;
  avgTriangleArea: number;
  totalArea: number;
  computeTime: number;
}

export interface TriangulationConfig {
  removeOutliers: boolean;
  outlierThreshold: number;       // Standard deviations
  removeDuplicates: boolean;
  duplicateTolerance: number;     // Distance in meters
  maxEdgeLength?: number;         // Remove triangles with edges longer than this
  minTriangleArea?: number;       // Remove tiny triangles
}

// ============================================================================
// Breakline/Constraint Types
// ============================================================================

export interface Breakline {
  id: string;
  name: string;
  type: BreaklineType;
  points: Array<{ x: number; y: number; z?: number }>;
  source: BreaklineSource;
  enforceElevation: boolean;      // If true, use breakline Z values
}

export type BreaklineType =
  | 'hard'          // Sharp elevation break (ridges, channels)
  | 'soft'          // Continuous surface (roads, paths)
  | 'boundary';     // Outer boundary constraint

export type BreaklineSource =
  | 'manual'        // User-drawn
  | 'ide_road'      // From IDE Chile road network
  | 'ide_water'     // From IDE Chile hydrography
  | 'detected'      // AI-detected from imagery
  | 'imported';     // From CAD/GIS file

export interface ConstraintRegion {
  id: string;
  name: string;
  type: ConstraintRegionType;
  boundary: Array<{ x: number; y: number }>;
  elevation?: number;           // For flat regions
  source: BreaklineSource;
}

export type ConstraintRegionType =
  | 'flat'          // Water body, building pad
  | 'exclusion'     // No triangulation zone
  | 'boundary';     // Outer limit

// ============================================================================
// Constrained Delaunay Types
// ============================================================================

export interface ConstrainedTriangulationConfig extends TriangulationConfig {
  breaklines: Breakline[];
  constraintRegions: ConstraintRegion[];
  enforceBreaklines: boolean;
  refineMesh: boolean;
  maxRefinementIterations?: number;
}

// ============================================================================
// Surface Generation Types
// ============================================================================

export interface GeneratedSurface {
  id: string;
  projectId: string;
  datasetId: string;
  name: string;
  method: InterpolationMethod;
  config: SurfaceGenerationConfig;
  triangulation: TriangulationResult;
  metrics: SurfaceQualityMetrics;
  aiAnalysis?: AIAnalysisResult;
  createdAt: string;
}

export type InterpolationMethod =
  | 'delaunay'              // Basic Delaunay triangulation
  | 'constrained_delaunay'  // With breaklines
  | 'idw'                   // Inverse Distance Weighting
  | 'kriging'               // Ordinary Kriging
  | 'natural_neighbor';     // Natural neighbor interpolation

export interface SurfaceGenerationConfig {
  method: InterpolationMethod;
  triangulationConfig: TriangulationConfig;
  constrainedConfig?: ConstrainedTriangulationConfig;
  idwConfig?: IDWConfig;
  krigingConfig?: KrigingConfig;
  fuseDEM?: boolean;              // Merge with DEM data
  demWeight?: number;             // Weight for DEM values (0-1)
  autoFetchIDEFeatures?: boolean; // Automatically fetch breaklines from IDE Chile
}

export interface IDWConfig {
  power: number;            // Distance exponent (usually 2)
  searchRadius: number;     // Maximum search distance
  minPoints: number;        // Minimum neighbors required
  maxPoints: number;        // Maximum neighbors to use
  gridResolution: number;   // Output grid cell size in meters
}

export interface KrigingConfig {
  variogramModel: 'spherical' | 'exponential' | 'gaussian' | 'linear';
  nugget: number;
  sill: number;
  range: number;
  autoFitVariogram: boolean;
  gridResolution: number;
}

// ============================================================================
// Quality Metrics Types
// ============================================================================

export interface SurfaceQualityMetrics {
  rmse: number;             // Root Mean Square Error (cross-validation)
  mae: number;              // Mean Absolute Error
  maxError: number;         // Maximum error
  r2: number;               // Coefficient of determination
  crossValidationResults: CrossValidationResult[];
  coveragePercent: number;  // Percentage of area with good interpolation
  artifactScore: number;    // 0-100, lower is better
}

export interface CrossValidationResult {
  pointId: string;
  actual: number;
  predicted: number;
  error: number;
  percentError: number;
}

// ============================================================================
// AI Analysis Types
// ============================================================================

export interface AIAnalysisResult {
  terrainClassification: TerrainClass;
  recommendedMethod: InterpolationMethod;
  confidence: number;           // 0-100
  qualityScore: number;         // 0-100
  suggestions: string[];
  detectedFeatures: DetectedFeature[];
  problemAreas: ProblemArea[];
  reasoning: string;
  modelUsed: string;
  analysisTime: number;
}

export type TerrainClass =
  | 'flat'          // σ < 2m
  | 'rolling'       // 2m ≤ σ < 10m
  | 'mountainous'   // σ ≥ 10m
  | 'mixed';        // Variable terrain

export interface DetectedFeature {
  type: 'road' | 'water' | 'building' | 'vegetation' | 'ridge' | 'valley';
  confidence: number;
  geometry: Array<{ x: number; y: number }>;
  suggestedBreaklineType?: BreaklineType;
}

export interface ProblemArea {
  type: 'sparse_data' | 'outlier_cluster' | 'artifact' | 'steep_gradient' | 'flat_spot';
  location: { x: number; y: number };
  radius: number;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

// ============================================================================
// Event/Progress Types
// ============================================================================

export interface ProcessingProgress {
  stage: ProcessingStage;
  percent: number;
  message: string;
  currentStep?: string;
}

export type ProcessingStage =
  | 'parsing'
  | 'validating'
  | 'fetching_dem'
  | 'fetching_ide'
  | 'analyzing'
  | 'triangulating'
  | 'interpolating'
  | 'validating_quality'
  | 'complete'
  | 'error';
