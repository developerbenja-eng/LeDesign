/**
 * Smart Surface Generation - Triangulation Module
 *
 * Provides Delaunay triangulation and TIN surface generation from survey points.
 */

// Types
export * from './types';

// Point parsing
export {
  parseCSV,
  parseXYZ,
  processPointFile,
  removeDuplicates,
  removeOutliers,
  calculateStatistics,
  calculateBounds,
  detectColumnMapping,
  detectDelimiter,
  detectFileType,
  type SurveyFileType,
} from './point-parser';

// Delaunay triangulation
export {
  triangulate,
  toTINSurface,
  findTriangleAt,
  getElevationAt,
  getSlopeAt,
  getAspectAt,
  generateContours,
  calculateSlopeStatistics,
  DEFAULT_TRIANGULATION_CONFIG,
} from './delaunay';

// TIN Builder
export {
  TINBuilder,
  createTINFromFile,
  createTINFromPoints,
  sampleDEMForAugmentation,
} from './tin-builder';
