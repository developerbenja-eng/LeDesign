/**
 * Unified Infrastructure Entity Types
 *
 * Bridges CAD entities with Chilean infrastructure elements
 * Each infrastructure entity extends a base CAD entity for rendering
 * while adding domain-specific properties for hydraulic calculations
 */

import type { CADEntity, Point3D, Point2D, PolylineEntity, CircleEntity, PointEntity, AnyCADEntity } from './cad';
import type { PipeMaterial } from './chile-infrastructure';

// ============================================================================
// Base Infrastructure Entity
// ============================================================================

export type InfrastructureCategory = 'water' | 'sewer' | 'stormwater' | 'road' | 'electrical' | 'gas';
export type InfrastructureSystem =
  | 'water_distribution'
  | 'sanitary_sewer'
  | 'storm_drainage'
  | 'combined_sewer'
  | 'road_pavement'
  | 'sidewalk';

export interface BaseInfrastructureEntity extends CADEntity {
  // Infrastructure classification
  infrastructureType: string;
  category: InfrastructureCategory;
  system: InfrastructureSystem;

  // Metadata
  name?: string;
  description?: string;
  designStandard?: string; // NCh reference

  // MINVU Standard Detail Reference
  // Links this infrastructure element to a standard detail drawing
  // Used for automatic detail sheet generation
  standardDetailCode?: string; // e.g., 'SUM-S1', 'CAM-TIPO-A', 'ZAN-TUB'

  // Network connectivity (for pipes, channels, etc.)
  connectionIds?: string[]; // IDs of connected elements
  upstreamId?: string;
  downstreamId?: string;

  // Design state
  designStatus: 'draft' | 'preliminary' | 'final' | 'as_built';
  calculationResults?: Record<string, number>;
  warnings?: string[];
  errors?: string[];
}

// ============================================================================
// WATER DISTRIBUTION NETWORK ENTITIES
// ============================================================================

// --- Water Pipe Entity ---
export type WaterPipeMaterialType = 'hdpe' | 'pvc' | 'ductile_iron' | 'steel' | 'copper' | 'galvanized';

export interface WaterPipeEntity extends BaseInfrastructureEntity {
  type: 'polyline';
  infrastructureType: 'water_pipe';
  category: 'water';
  system: 'water_distribution';

  // Geometry (from PolylineEntity)
  vertices: Point3D[];
  closed: false;

  // Hydraulic properties
  material: WaterPipeMaterialType;
  diameter: number; // mm
  wallThickness: number; // mm
  nominalPressure: number; // bar (PN)
  length: number; // m (calculated from vertices)

  // Hazen-Williams / Darcy-Weisbach
  hazenWilliamsC: number;
  roughnessCoeff: number; // mm for Darcy-Weisbach

  // Installation
  burialDepth: number; // m (cover depth)
  bedding: 'sand' | 'gravel' | 'compacted_soil';

  // Results (populated after simulation)
  flow?: number; // L/s
  velocity?: number; // m/s
  headLoss?: number; // m
  pressureStart?: number; // m.c.a.
  pressureEnd?: number; // m.c.a.
}

// --- Water Junction Entity (Node) ---
export type JunctionType = 'tee' | 'cross' | 'elbow' | 'reducer' | 'end_cap' | 'connection';

export interface WaterJunctionEntity extends BaseInfrastructureEntity {
  type: 'point';
  infrastructureType: 'water_junction';
  category: 'water';
  system: 'water_distribution';

  // Geometry (from PointEntity)
  position: Point3D;

  // Node properties
  junctionType: JunctionType;
  elevation: number; // m
  baseDemand: number; // L/s
  demandPattern?: string;
  emitterCoeff?: number; // for leakage modeling

  // Connected elements
  connectedPipeIds: string[];

  // Results
  head?: number; // m
  pressure?: number; // m.c.a.
  actualDemand?: number; // L/s
}

// --- Water Valve Entity ---
export type WaterValveType = 'gate' | 'butterfly' | 'check' | 'pressure_reducing' | 'pressure_sustaining' | 'flow_control' | 'air_release';

export interface WaterValveEntity extends BaseInfrastructureEntity {
  type: 'circle';
  infrastructureType: 'water_valve';
  category: 'water';
  system: 'water_distribution';

  // Geometry (symbol as circle)
  center: Point3D;
  radius: number; // display size

  // Valve properties
  valveType: WaterValveType;
  diameter: number; // mm
  status: 'open' | 'closed' | 'throttled';
  setting?: number; // PRV pressure, FCV flow, etc.
  minorLossCoeff: number; // K value

  // Connected pipe IDs
  inletPipeId: string;
  outletPipeId: string;

  // Results
  headLoss?: number; // m
  flow?: number; // L/s
}

// --- Water Tank Entity ---
export interface WaterTankEntity extends BaseInfrastructureEntity {
  type: 'circle';
  infrastructureType: 'water_tank';
  category: 'water';
  system: 'water_distribution';

  // Geometry (plan view as circle)
  center: Point3D;
  radius: number; // m (actual tank radius)

  // Tank properties
  tankType: 'cylindrical' | 'rectangular' | 'elevated';
  baseElevation: number; // m
  minLevel: number; // m
  maxLevel: number; // m
  initialLevel: number; // m
  diameter: number; // m (or side length)
  volume: number; // m³

  // Material
  material: 'concrete' | 'steel' | 'fiberglass' | 'hdpe';

  // Connected pipes
  inletPipeIds: string[];
  outletPipeIds: string[];

  // Results
  currentLevel?: number; // m
  currentVolume?: number; // m³
}

// --- Water Pump Entity ---
export type PumpCurveType = 'power' | 'three_point' | 'custom';

export interface WaterPumpEntity extends BaseInfrastructureEntity {
  type: 'circle';
  infrastructureType: 'water_pump';
  category: 'water';
  system: 'water_distribution';

  // Geometry (symbol)
  center: Point3D;
  radius: number; // display size

  // Pump properties
  pumpType: PumpCurveType;
  status: 'on' | 'off' | 'variable';

  // Curve parameters (H = A - B*Q^C for power type)
  curveCoeffA?: number;
  curveCoeffB?: number;
  curveCoeffC?: number;

  // Or 3-point curve
  shutoffHead?: number; // m (Q=0)
  designHead?: number; // m
  designFlow?: number; // L/s
  maxFlow?: number; // L/s (H=0)

  // Speed control
  speedRatio: number; // 0-1 for variable speed
  efficiency?: number; // %
  power?: number; // kW

  // Connected pipes
  suctionPipeId: string;
  dischargePipeId: string;

  // Results
  operatingHead?: number; // m
  operatingFlow?: number; // L/s
  operatingPower?: number; // kW
}

// --- Hydrant Entity ---
export interface HydrantEntity extends BaseInfrastructureEntity {
  type: 'point';
  infrastructureType: 'hydrant';
  category: 'water';
  system: 'water_distribution';

  // Geometry
  position: Point3D;

  // Hydrant properties
  hydrantType: 'pillar' | 'underground';
  nominalDiameter: number; // mm (typically 100)
  outlets: number; // typically 2-3
  outletDiameters: number[]; // mm
  requiredFlow: number; // L/s (fire flow requirement)
  requiredPressure: number; // m.c.a. (typically 10-15)

  // Connection
  connectedPipeId: string;
  valveId?: string;

  // Results
  availableFlow?: number; // L/s
  availablePressure?: number; // m.c.a.
  fireFlowAdequacy?: boolean;
}

// ============================================================================
// SEWER NETWORK ENTITIES
// ============================================================================

// --- Sewer Pipe Entity ---
export interface SewerPipeEntity extends BaseInfrastructureEntity {
  type: 'polyline';
  infrastructureType: 'sewer_pipe';
  category: 'sewer';
  system: 'sanitary_sewer';

  // Geometry
  vertices: Point3D[];
  closed: false;

  // Pipe properties
  material: PipeMaterial;
  diameter: number; // mm
  length: number; // m
  slope: number; // m/m
  manningN: number;

  // Elevations
  invertStart: number; // m
  invertEnd: number; // m

  // Connected elements
  upstreamManholeId: string;
  downstreamManholeId: string;

  // Design parameters
  fillRatio: number; // 0-1 (y/D)
  designFlow: number; // L/s

  // Results
  fullFlowCapacity?: number; // L/s
  actualFlow?: number; // L/s
  velocity?: number; // m/s
  depthOfFlow?: number; // m
  froudeNumber?: number;
}

// --- Manhole Entity ---
export type ManholeType = 'A' | 'B' | 'drop' | 'junction' | 'terminal';

export interface ManholeEntity extends BaseInfrastructureEntity {
  type: 'circle';
  infrastructureType: 'manhole';
  category: 'sewer';
  system: 'sanitary_sewer';

  // Geometry
  center: Point3D;
  radius: number; // m (internal radius, typically 0.6)

  // Manhole properties
  manholeType: ManholeType;
  rimElevation: number; // m (top of cover)
  invertElevation: number; // m (bottom)
  depth: number; // m
  internalDiameter: number; // m (1.2 or 1.3)
  coneHeight: number; // m (typically 0.8)

  // Construction
  wallMaterial: 'concrete' | 'brick' | 'hdpe';
  concreteGrade?: 'H20' | 'H25' | 'H30';
  coverType: 'traffic' | 'sidewalk';
  coverClass: 'D400' | 'C250' | 'B125';

  // Connections
  inletPipeIds: string[];
  outletPipeId: string;

  // Results
  headLoss?: number; // m
}

// --- House Connection Entity ---
export interface HouseConnectionEntity extends BaseInfrastructureEntity {
  type: 'polyline';
  infrastructureType: 'house_connection';
  category: 'sewer';
  system: 'sanitary_sewer';

  // Geometry
  vertices: Point3D[];
  closed: false;

  // Connection properties
  diameter: number; // mm (typically 110)
  material: 'pvc';
  length: number; // m
  slope: number; // m/m (typically 0.02-0.03)

  // Connected elements
  propertyId?: string;
  connectionPointId: string; // manhole or pipe ID
  connectionType: 'at_manhole' | 'saddle';

  // Flow
  designFlow: number; // L/s (typically 2-3)
}

// ============================================================================
// STORMWATER DRAINAGE ENTITIES
// ============================================================================

// --- Storm Collector Entity ---
export interface StormCollectorEntity extends BaseInfrastructureEntity {
  type: 'polyline';
  infrastructureType: 'storm_collector';
  category: 'stormwater';
  system: 'storm_drainage';

  // Geometry
  vertices: Point3D[];
  closed: false;

  // Pipe properties
  material: PipeMaterial;
  shape: 'circular' | 'rectangular' | 'egg';
  diameter: number; // mm (for circular)
  width?: number; // mm (for rectangular)
  height?: number; // mm (for rectangular)
  length: number; // m
  slope: number; // m/m
  manningN: number;

  // Elevations
  invertStart: number; // m
  invertEnd: number; // m

  // Design
  returnPeriod: number; // years (2, 5, 10, 25, 50, 100)
  catchmentArea: number; // ha
  runoffCoeff: number; // C (0-1)
  timeOfConcentration: number; // min
  designIntensity: number; // mm/hr
  designFlow: number; // L/s or m³/s

  // Results
  capacity?: number; // L/s
  actualFlow?: number; // L/s
  velocity?: number; // m/s
  fillRatio?: number;
}

// --- Storm Inlet Entity ---
export type StormInletType = 'S1' | 'S2' | 'combined' | 'DOH' | 'grate' | 'curb_opening';

export interface StormInletEntity extends BaseInfrastructureEntity {
  type: 'point';
  infrastructureType: 'storm_inlet';
  category: 'stormwater';
  system: 'storm_drainage';

  // Geometry
  position: Point3D;

  // Inlet properties
  inletType: StormInletType;
  dimensions: {
    length: number; // m
    width: number; // m
    depth: number; // m
  };
  grateType: 'cast_iron' | 'galvanized_steel' | 'stainless_steel';
  grateOpeningRatio: number; // % open area

  // Hydraulic
  catchmentArea: number; // m²
  captureEfficiency: number; // % (0-100)
  designFlow: number; // L/s
  bypassFlow: number; // L/s

  // Connection
  outletPipeId: string;
  sumpDepth: number; // m

  // Results
  inflow?: number; // L/s
  capturedFlow?: number; // L/s
}

// --- Gutter Entity ---
export type GutterType = 'curb_gutter' | 'valley_gutter' | 'V_channel' | 'trapezoidal';

export interface GutterEntity extends BaseInfrastructureEntity {
  type: 'polyline';
  infrastructureType: 'gutter';
  category: 'stormwater';
  system: 'storm_drainage';

  // Geometry
  vertices: Point3D[];
  closed: false;

  // Gutter properties
  gutterType: GutterType;
  width: number; // m
  depth: number; // m
  length: number; // m
  longitudinalSlope: number; // m/m
  crossSlope: number; // m/m
  manningN: number;

  // Design
  spreadWidth: number; // m (water spread on pavement)
  maxAllowedSpread: number; // m

  // Results
  capacity?: number; // L/s
  flow?: number; // L/s
  spreadActual?: number; // m
}

// ============================================================================
// ROAD & PAVEMENT ENTITIES
// ============================================================================

// --- Road Segment Entity ---
export type RoadClassificationType = 'express' | 'trunk' | 'collector' | 'service' | 'local' | 'passage';

export interface RoadSegmentEntity extends BaseInfrastructureEntity {
  type: 'polyline';
  infrastructureType: 'road_segment';
  category: 'road';
  system: 'road_pavement';

  // Geometry (centerline)
  vertices: Point3D[];
  closed: false;

  // Road properties
  classification: RoadClassificationType;
  name: string;
  rightOfWayWidth: number; // m
  pavementWidth: number; // m
  numberOfLanes: number;
  laneWidth: number; // m

  // Design speed & geometry
  designSpeed: number; // km/h
  superelevation?: number; // %

  // Cross section reference
  crossSectionId?: string;
}

// --- Curb Entity ---
export type CurbTypeClassification = 'A' | 'zarpa' | 'mountable' | 'barrier';

export interface CurbEntity extends BaseInfrastructureEntity {
  type: 'polyline';
  infrastructureType: 'curb';
  category: 'road';
  system: 'road_pavement';

  // Geometry
  vertices: Point3D[];
  closed: false;

  // Curb properties
  curbType: CurbTypeClassification;
  width: number; // m (face width)
  height: number; // m (reveal height)

  // Construction
  concreteGrade: string;
  segmentLength: number; // m (expansion joint spacing)
}

// ============================================================================
// UTILITY TYPE HELPERS
// ============================================================================

// Union of all infrastructure entity types
export type WaterNetworkEntity =
  | WaterPipeEntity
  | WaterJunctionEntity
  | WaterValveEntity
  | WaterTankEntity
  | WaterPumpEntity
  | HydrantEntity;

export type SewerNetworkEntity =
  | SewerPipeEntity
  | ManholeEntity
  | HouseConnectionEntity;

export type StormwaterNetworkEntity =
  | StormCollectorEntity
  | StormInletEntity
  | GutterEntity;

export type RoadNetworkEntity =
  | RoadSegmentEntity
  | CurbEntity;

export type AnyInfrastructureEntity =
  | WaterNetworkEntity
  | SewerNetworkEntity
  | StormwaterNetworkEntity
  | RoadNetworkEntity;

// Type guard functions
export function isInfrastructureEntity(entity: AnyCADEntity): entity is AnyInfrastructureEntity {
  return 'infrastructureType' in entity;
}

export function isWaterEntity(entity: AnyCADEntity): entity is WaterNetworkEntity {
  return isInfrastructureEntity(entity) && entity.category === 'water';
}

export function isSewerEntity(entity: AnyCADEntity): entity is SewerNetworkEntity {
  return isInfrastructureEntity(entity) && entity.category === 'sewer';
}

export function isStormwaterEntity(entity: AnyCADEntity): entity is StormwaterNetworkEntity {
  return isInfrastructureEntity(entity) && entity.category === 'stormwater';
}

export function isRoadEntity(entity: AnyCADEntity): entity is RoadNetworkEntity {
  return isInfrastructureEntity(entity) && entity.category === 'road';
}

// Helper to check if entity is a network node (can have connections)
export function isNetworkNode(entity: AnyInfrastructureEntity): boolean {
  return ['water_junction', 'water_tank', 'water_pump', 'water_valve', 'hydrant', 'manhole', 'storm_inlet'].includes(entity.infrastructureType);
}

// Helper to check if entity is a network link (connects nodes)
export function isNetworkLink(entity: AnyInfrastructureEntity): boolean {
  return ['water_pipe', 'sewer_pipe', 'house_connection', 'storm_collector', 'gutter'].includes(entity.infrastructureType);
}

// ============================================================================
// ENTITY CREATION HELPERS
// ============================================================================

let entityCounter = 0;

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++entityCounter}`;
}

// --- Water Pipe Creation ---
export function createWaterPipe(
  vertices: Point3D[],
  properties: Partial<Omit<WaterPipeEntity, 'type' | 'infrastructureType' | 'category' | 'system' | 'vertices' | 'closed'>> = {}
): WaterPipeEntity {
  const length = calculatePolylineLength(vertices);

  return {
    id: generateId('wp'),
    type: 'polyline',
    infrastructureType: 'water_pipe',
    category: 'water',
    system: 'water_distribution',
    layer: properties.layer || 'WATER-PIPE',
    color: properties.color || '#0088ff',
    visible: true,
    selected: false,
    designStatus: 'draft',
    vertices,
    closed: false,
    material: properties.material || 'hdpe',
    diameter: properties.diameter || 110,
    wallThickness: properties.wallThickness || 6.6,
    nominalPressure: properties.nominalPressure || 10,
    length,
    hazenWilliamsC: properties.hazenWilliamsC || 150,
    roughnessCoeff: properties.roughnessCoeff || 0.0015,
    burialDepth: properties.burialDepth || 1.0,
    bedding: properties.bedding || 'sand',
    ...properties,
  };
}

// --- Water Junction Creation ---
export function createWaterJunction(
  position: Point3D,
  properties: Partial<Omit<WaterJunctionEntity, 'type' | 'infrastructureType' | 'category' | 'system' | 'position'>> = {}
): WaterJunctionEntity {
  return {
    id: generateId('wj'),
    type: 'point',
    infrastructureType: 'water_junction',
    category: 'water',
    system: 'water_distribution',
    layer: properties.layer || 'WATER-NODE',
    color: properties.color || '#00aaff',
    visible: true,
    selected: false,
    designStatus: 'draft',
    position,
    junctionType: properties.junctionType || 'tee',
    elevation: position.z,
    baseDemand: properties.baseDemand || 0,
    connectedPipeIds: properties.connectedPipeIds || [],
    ...properties,
  };
}

// --- Sewer Pipe Creation ---
export function createSewerPipe(
  vertices: Point3D[],
  properties: Partial<Omit<SewerPipeEntity, 'type' | 'infrastructureType' | 'category' | 'system' | 'vertices' | 'closed'>> = {}
): SewerPipeEntity {
  const length = calculatePolylineLength(vertices);
  const invertStart = vertices[0]?.z || 0;
  const invertEnd = vertices[vertices.length - 1]?.z || 0;
  const slope = length > 0 ? Math.abs(invertStart - invertEnd) / length : 0;

  return {
    id: generateId('sp'),
    type: 'polyline',
    infrastructureType: 'sewer_pipe',
    category: 'sewer',
    system: 'sanitary_sewer',
    layer: properties.layer || 'SEWER-PIPE',
    color: properties.color || '#8B4513',
    visible: true,
    selected: false,
    designStatus: 'draft',
    vertices,
    closed: false,
    material: properties.material || 'pvc',
    diameter: properties.diameter || 200,
    length,
    slope: properties.slope ?? slope,
    manningN: properties.manningN || 0.013,
    invertStart: properties.invertStart ?? invertStart,
    invertEnd: properties.invertEnd ?? invertEnd,
    upstreamManholeId: properties.upstreamManholeId || '',
    downstreamManholeId: properties.downstreamManholeId || '',
    fillRatio: properties.fillRatio || 0.75,
    designFlow: properties.designFlow || 0,
    ...properties,
  };
}

// --- Manhole Creation ---
export function createManhole(
  center: Point3D,
  properties: Partial<Omit<ManholeEntity, 'type' | 'infrastructureType' | 'category' | 'system' | 'center'>> = {}
): ManholeEntity {
  const rimElevation = properties.rimElevation ?? center.z;
  const invertElevation = properties.invertElevation ?? (center.z - 2.0);
  const manholeType = properties.manholeType || 'A';

  // Map manhole type to standard detail code
  const detailCodeMap: Record<ManholeType, string> = {
    'A': 'CAM-TIPO-A',
    'B': 'CAM-TIPO-B',
    'drop': 'CAM-ESP-A',
    'junction': 'CAM-TIPO-A',
    'terminal': 'CAM-TIPO-A',
  };

  return {
    id: generateId('mh'),
    type: 'circle',
    infrastructureType: 'manhole',
    category: 'sewer',
    system: 'sanitary_sewer',
    layer: properties.layer || 'SEWER-MANHOLE',
    color: properties.color || '#654321',
    visible: true,
    selected: false,
    designStatus: 'draft',
    center,
    radius: properties.radius || 0.6,
    manholeType,
    standardDetailCode: properties.standardDetailCode || detailCodeMap[manholeType],
    rimElevation,
    invertElevation,
    depth: rimElevation - invertElevation,
    internalDiameter: properties.internalDiameter || 1.2,
    coneHeight: properties.coneHeight || 0.8,
    wallMaterial: properties.wallMaterial || 'concrete',
    concreteGrade: properties.concreteGrade || 'H25',
    coverType: properties.coverType || 'traffic',
    coverClass: properties.coverClass || 'D400',
    inletPipeIds: properties.inletPipeIds || [],
    outletPipeId: properties.outletPipeId || '',
    ...properties,
  };
}

// --- Storm Inlet Creation ---
export function createStormInlet(
  position: Point3D,
  properties: Partial<Omit<StormInletEntity, 'type' | 'infrastructureType' | 'category' | 'system' | 'position'>> = {}
): StormInletEntity {
  // Map inlet type to standard detail code
  const inletType = properties.inletType || 'S1';
  const detailCodeMap: Record<StormInletType, string> = {
    'S1': 'SUM-S1',
    'S2': 'SUM-S2',
    'combined': 'SUM-SERVIU',
    'DOH': 'SUM-TIPO-G',
    'grate': 'SUM-S1',
    'curb_opening': 'SUM-S2',
  };

  return {
    id: generateId('si'),
    type: 'point',
    infrastructureType: 'storm_inlet',
    category: 'stormwater',
    system: 'storm_drainage',
    layer: properties.layer || 'STORM-INLET',
    color: properties.color || '#4169E1',
    visible: true,
    selected: false,
    designStatus: 'draft',
    position,
    inletType,
    standardDetailCode: properties.standardDetailCode || detailCodeMap[inletType],
    dimensions: properties.dimensions || { length: 0.98, width: 0.41, depth: 0.5 },
    grateType: properties.grateType || 'cast_iron',
    grateOpeningRatio: properties.grateOpeningRatio || 40,
    catchmentArea: properties.catchmentArea || 0,
    captureEfficiency: properties.captureEfficiency || 80,
    designFlow: properties.designFlow || 0,
    bypassFlow: properties.bypassFlow || 0,
    outletPipeId: properties.outletPipeId || '',
    sumpDepth: properties.sumpDepth || 0.3,
    ...properties,
  };
}

// --- Storm Collector Creation ---
export function createStormCollector(
  vertices: Point3D[],
  properties: Partial<Omit<StormCollectorEntity, 'type' | 'infrastructureType' | 'category' | 'system' | 'vertices' | 'closed'>> = {}
): StormCollectorEntity {
  const length = calculatePolylineLength(vertices);
  const invertStart = vertices[0]?.z || 0;
  const invertEnd = vertices[vertices.length - 1]?.z || 0;
  const slope = length > 0 ? Math.abs(invertStart - invertEnd) / length : 0;

  return {
    id: generateId('sc'),
    type: 'polyline',
    infrastructureType: 'storm_collector',
    category: 'stormwater',
    system: 'storm_drainage',
    layer: properties.layer || 'STORM-COLLECTOR',
    color: properties.color || '#1E90FF',
    visible: true,
    selected: false,
    designStatus: 'draft',
    vertices,
    closed: false,
    material: properties.material || 'concrete',
    shape: properties.shape || 'circular',
    diameter: properties.diameter || 400,
    length,
    slope: properties.slope ?? slope,
    manningN: properties.manningN || 0.013,
    invertStart: properties.invertStart ?? invertStart,
    invertEnd: properties.invertEnd ?? invertEnd,
    returnPeriod: properties.returnPeriod || 10,
    catchmentArea: properties.catchmentArea || 0,
    runoffCoeff: properties.runoffCoeff || 0.8,
    timeOfConcentration: properties.timeOfConcentration || 10,
    designIntensity: properties.designIntensity || 0,
    designFlow: properties.designFlow || 0,
    ...properties,
  };
}

// ============================================================================
// GEOMETRY HELPERS
// ============================================================================

function calculatePolylineLength(vertices: Point3D[]): number {
  let length = 0;
  for (let i = 1; i < vertices.length; i++) {
    const dx = vertices[i].x - vertices[i - 1].x;
    const dy = vertices[i].y - vertices[i - 1].y;
    const dz = vertices[i].z - vertices[i - 1].z;
    length += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return length;
}

export function getEntityBounds(entity: AnyInfrastructureEntity): { min: Point3D; max: Point3D } {
  if ('vertices' in entity) {
    const xs = entity.vertices.map(v => v.x);
    const ys = entity.vertices.map(v => v.y);
    const zs = entity.vertices.map(v => v.z);
    return {
      min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
      max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) },
    };
  } else if ('center' in entity) {
    const r = entity.radius;
    return {
      min: { x: entity.center.x - r, y: entity.center.y - r, z: entity.center.z },
      max: { x: entity.center.x + r, y: entity.center.y + r, z: entity.center.z },
    };
  } else if ('position' in entity) {
    return {
      min: { ...entity.position },
      max: { ...entity.position },
    };
  }
  return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
}

// ============================================================================
// LAYER DEFINITIONS FOR INFRASTRUCTURE
// ============================================================================

export const INFRASTRUCTURE_LAYERS = {
  // Water Distribution
  'WATER-PIPE': { name: 'WATER-PIPE', color: '#0088ff', visible: true, locked: false },
  'WATER-NODE': { name: 'WATER-NODE', color: '#00aaff', visible: true, locked: false },
  'WATER-VALVE': { name: 'WATER-VALVE', color: '#0066cc', visible: true, locked: false },
  'WATER-TANK': { name: 'WATER-TANK', color: '#003366', visible: true, locked: false },
  'WATER-PUMP': { name: 'WATER-PUMP', color: '#0044aa', visible: true, locked: false },
  'WATER-HYDRANT': { name: 'WATER-HYDRANT', color: '#ff0000', visible: true, locked: false },

  // Sanitary Sewer
  'SEWER-PIPE': { name: 'SEWER-PIPE', color: '#8B4513', visible: true, locked: false },
  'SEWER-MANHOLE': { name: 'SEWER-MANHOLE', color: '#654321', visible: true, locked: false },
  'SEWER-CONNECTION': { name: 'SEWER-CONNECTION', color: '#A0522D', visible: true, locked: false },

  // Stormwater
  'STORM-COLLECTOR': { name: 'STORM-COLLECTOR', color: '#1E90FF', visible: true, locked: false },
  'STORM-INLET': { name: 'STORM-INLET', color: '#4169E1', visible: true, locked: false },
  'STORM-GUTTER': { name: 'STORM-GUTTER', color: '#6495ED', visible: true, locked: false },

  // Roads
  'ROAD-CENTERLINE': { name: 'ROAD-CENTERLINE', color: '#808080', visible: true, locked: false },
  'ROAD-CURB': { name: 'ROAD-CURB', color: '#A9A9A9', visible: true, locked: false },
} as const;
