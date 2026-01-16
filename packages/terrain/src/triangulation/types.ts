/**
 * Triangulation Type Definitions
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  minZ?: number;
  maxZ?: number;
}

export interface SurveyPoint extends Point3D {
  id?: string;
  code?: string;
  description?: string;
  quality?: number;
}

export interface DatasetStatistics {
  count: number;
  bounds: BoundingBox;
  mean: Point3D;
  stdDev: Point3D;
  min: Point3D;
  max: Point3D;
  // Individual elevation statistics
  zMin: number;
  zMax: number;
  zMean: number;
  zStdDev: number;
}
