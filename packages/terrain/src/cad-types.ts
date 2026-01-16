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
