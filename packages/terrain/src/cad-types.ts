/**
 * CAD Type Definitions
 * Shared types for CAD entities used in DWG parsing
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface CADLayer {
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

export interface BaseCADEntity {
  id: string;
  layer: string;
  color?: string;
  lineType?: string;
  lineWeight?: number;
}

export interface PointEntity extends BaseCADEntity {
  type: 'POINT';
  position: Point3D;
}

export interface LineEntity extends BaseCADEntity {
  type: 'LINE';
  start: Point3D;
  end: Point3D;
}

export interface PolylineEntity extends BaseCADEntity {
  type: 'POLYLINE' | 'LWPOLYLINE';
  vertices: Point3D[];
  closed: boolean;
}

export interface CircleEntity extends BaseCADEntity {
  type: 'CIRCLE';
  center: Point3D;
  radius: number;
}

export interface ArcEntity extends BaseCADEntity {
  type: 'ARC';
  center: Point3D;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface TextEntity extends BaseCADEntity {
  type: 'TEXT' | 'MTEXT';
  position: Point3D;
  text: string;
  height: number;
  rotation?: number;
}

export type DimensionType = 'LINEAR' | 'ALIGNED' | 'ANGULAR' | 'RADIAL' | 'DIAMETRIC';

export interface DimensionEntity extends BaseCADEntity {
  type: 'DIMENSION';
  dimensionType: DimensionType;
  defPoint1: Point3D;
  defPoint2: Point3D;
  textPosition: Point3D;
  measurement: number;
}

export type AnyCADEntity =
  | PointEntity
  | LineEntity
  | PolylineEntity
  | CircleEntity
  | ArcEntity
  | TextEntity
  | DimensionEntity;

/**
 * TIN Surface representation
 */
export interface TINSurface {
  id: string;
  name: string;
  points: Map<string, Point3D>;
  faces: [number, number, number][]; // Triangle indices
  bounds: {
    min: Point3D;
    max: Point3D;
  };
}

/**
 * Geographic Coordinate (Latitude/Longitude)
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Geographic Control Point
 * Links CAD coordinates to geographic coordinates
 */
export interface GeoControlPoint {
  id: string;
  cadPoint: Point2D;
  geoPoint: LatLng;
  name?: string;
}

/**
 * Geographic Transformation Parameters
 * Defines transformation between CAD and geographic coordinate systems
 */
export interface GeoTransform {
  controlPoints: GeoControlPoint[];
  scale: number;
  rotation: number;
  origin: LatLng;
  cadOrigin: Point2D;
  isValid: boolean;
}
