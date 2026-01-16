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
export * from './surface-ai';

// ============================================================
// CONFIGURATION (Environment variables and API keys)
// ============================================================
export { terrainConfig } from './config';
