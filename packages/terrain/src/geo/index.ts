/**
 * Geo-Spatial Utilities Module
 * Coordinate transformations, spatial indexing, LOD, and tile caching
 */

// ============================================================
// GEO TRANSFORM (Coordinate transformation and georeferencing)
// ============================================================
export {
  degreesToRadians,
  radiansToDegrees,
  haversineDistance,
  calculateBearing,
  cadDistance,
  cadAngle,
  calculateGeoTransform,
  cadToGeo,
  geoToCAD,
  cadBoundsToGeoBounds,
  generateControlPointId,
} from './geo-transform';

// ============================================================
// SPATIAL INDEX (R-tree for viewport queries)
// ============================================================
export {
  SpatialIndex,
  createEntitySpatialIndex,
  queryViewport,
  type BoundingBox,
  type SpatialItem,
} from './spatial-index';

// ============================================================
// LOD SYSTEM (Level of detail rendering)
// ============================================================
export {
  douglasPeucker,
  getLODLevel,
  simplifyPolyline,
  getCircleSegments,
  generateCirclePoints,
  generateArcPoints,
  LODCache,
  shouldRenderAtZoom,
  DEFAULT_LOD_CONFIG,
  type LODConfig,
} from './lod-system';

// ============================================================
// TILE CACHE (Tile-based rendering and caching)
// ============================================================
export {
  latLngToTile,
  tileToLatLngBounds,
  getTileKey,
  getVisibleTiles,
  TileCache,
  TileRenderer,
  getOptimalTileZoom,
  type TileCoord,
  type TileBounds,
  type CachedTile,
} from './tile-cache';
