/**
 * Triangulation Module - Delaunay Triangulation & TIN Generation
 *
 * Provides fast Delaunay triangulation for survey points, TIN (Triangulated Irregular Network)
 * surface generation, and point cloud processing capabilities.
 */

// Export all types
export * from './types';

// Export delaunay triangulation functions
export {
  triangulate,
  toTINSurface,
  findTriangleAt,
  getElevationAt,
  generateContours,
  getSlopeAt,
  getAspectAt,
  calculateSlopeStatistics,
  DEFAULT_TRIANGULATION_CONFIG,
} from './delaunay';

// Export TIN builder classes and factories
export {
  TINBuilder,
  createTINFromFile,
  createTINFromPoints,
  sampleDEMForAugmentation,
} from './tin-builder';

// Export point parsing functions
export {
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
} from './point-parser';
