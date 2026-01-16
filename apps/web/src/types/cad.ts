// Core CAD geometry types

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

// Geographic coordinates
export interface LatLng {
  lat: number;
  lng: number;
}

// Georeferencing control point - links CAD coords to real-world coords
export interface GeoControlPoint {
  id: string;
  cadPoint: Point2D;      // Original CAD coordinates
  geoPoint: LatLng;       // Real-world lat/lon
}

// Georeferencing transformation parameters
export interface GeoTransform {
  controlPoints: GeoControlPoint[];
  scale: number;          // meters per CAD unit
  rotation: number;       // radians
  origin: LatLng;         // Geographic origin (first control point)
  cadOrigin: Point2D;     // CAD origin (first control point)
  isValid: boolean;
}

// View modes for the CAD canvas
export type ViewMode = 'design' | 'reference' | 'analysis';

// Map background styles
export type MapStyle = 'satellite' | 'streets' | 'terrain' | 'dark' | 'none';

// TIN Surface representation
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

// CAD Drawing entities
export type CADEntityType =
  | 'point'
  | 'line'
  | 'polyline'
  | 'circle'
  | 'arc'
  | 'text'
  | 'surface'
  | 'dimension';

export interface CADEntity {
  id: string;
  type: CADEntityType;
  layer: string;
  color?: string;
  visible: boolean;
  selected: boolean;
}

export interface PointEntity extends CADEntity {
  type: 'point';
  position: Point3D;
}

export interface LineEntity extends CADEntity {
  type: 'line';
  start: Point3D;
  end: Point3D;
}

export interface PolylineEntity extends CADEntity {
  type: 'polyline';
  vertices: Point3D[];
  closed: boolean;
}

export interface CircleEntity extends CADEntity {
  type: 'circle';
  center: Point3D;
  radius: number;
}

export interface ArcEntity extends CADEntity {
  type: 'arc';
  center: Point3D;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface TextEntity extends CADEntity {
  type: 'text';
  position: Point3D;
  text: string;
  height: number;
  rotation: number;
}

export interface SurfaceEntity extends CADEntity {
  type: 'surface';
  surface: TINSurface;
}

// Dimension types matching AutoCAD dimension types
export type DimensionType = 'linear' | 'aligned' | 'angular' | 'radial' | 'diameter' | 'ordinate';

export interface DimensionEntity extends CADEntity {
  type: 'dimension';
  dimensionType: DimensionType;
  // Definition points (varies by dimension type)
  defPoint1: Point3D;           // First point being measured
  defPoint2: Point3D;           // Second point being measured
  dimLinePoint: Point3D;        // Point on dimension line
  textPosition: Point3D;        // Text midpoint
  text: string;                 // Dimension text (may include overrides)
  measurement: number;          // Actual measured value
  // Optional styling
  textHeight?: number;
  arrowSize?: number;
  extensionLineOffset?: number;
}

// Basic CAD entity union (geometric primitives)
export type BasicCADEntity =
  | PointEntity
  | LineEntity
  | PolylineEntity
  | CircleEntity
  | ArcEntity
  | TextEntity
  | SurfaceEntity
  | DimensionEntity;

// AnyCADEntity now includes both basic and infrastructure entities
// Infrastructure entities are typed in infrastructure-entities.ts but share
// the same base structure (type: 'point' | 'line' | 'polyline' | 'circle' etc.)
export type AnyCADEntity =
  | PointEntity
  | LineEntity
  | PolylineEntity
  | CircleEntity
  | ArcEntity
  | TextEntity
  | SurfaceEntity
  | DimensionEntity;

// Layer management
export interface CADLayer {
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

// Drawing state
export interface CADDrawingState {
  entities: Map<string, AnyCADEntity>;
  layers: Map<string, CADLayer>;
  activeLayer: string;
  selectedIds: Set<string>;
  viewState: ViewState;
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  is3D: boolean;
}

// Tool modes
export type DrawingTool =
  | 'select'
  | 'pan'
  | 'zoom'
  | 'point'
  | 'line'
  | 'polyline'
  | 'circle'
  | 'arc'
  | 'text'
  | 'measure'
  // Infrastructure tools
  | 'water_pipe'
  | 'water_junction'
  | 'water_valve'
  | 'water_tank'
  | 'water_pump'
  | 'hydrant'
  | 'sewer_pipe'
  | 'manhole'
  | 'house_connection'
  | 'storm_collector'
  | 'storm_inlet'
  | 'gutter'
  | 'road_segment'
  | 'curb'
  // Standard detail placement
  | 'standard_detail';

// Standard detail for placement
export interface StandardDetailPlacement {
  id: string;
  code: string;
  name: string;
  entities: AnyCADEntity[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

// LandXML parsing result
export interface LandXMLParseResult {
  surfaces: TINSurface[];
  alignments?: Alignment[];
  parcels?: Parcel[];
}

export interface Alignment {
  id: string;
  name: string;
  stations: AlignmentStation[];
}

export interface AlignmentStation {
  station: number;
  position: Point3D;
}

export interface Parcel {
  id: string;
  name: string;
  boundary: Point2D[];
  area?: number;
}

// AI Command types
export interface AICommand {
  action: string;
  parameters: Record<string, unknown>;
  naturalLanguage: string;
}

export interface AIResponse {
  success: boolean;
  message: string;
  entities?: AnyCADEntity[];
  command?: AICommand;
}
