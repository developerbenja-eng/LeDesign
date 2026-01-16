/**
 * Discipline-specific types for project designs
 * These types define the data structures for water network, sewer, stormwater, and channel designs
 */

// =============================================================================
// WATER NETWORK TYPES (NCh 691, NCh 2485)
// =============================================================================

export interface WaterNode {
  id: string;
  type: 'junction' | 'reservoir' | 'tank' | 'pump' | 'valve';
  name: string;
  lat: number;
  lng: number;
  elevation: number; // meters
  demand?: number; // L/s
  pressure?: number; // m.c.a.
  headPattern?: string;
  metadata?: Record<string, unknown>;
}

export interface WaterPipe {
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  length: number; // meters
  diameter: number; // mm
  material: 'PVC' | 'HDPE' | 'Ductile Iron' | 'Steel' | 'Concrete';
  roughness: number; // Hazen-Williams C
  minorLoss?: number;
  status: 'open' | 'closed' | 'cv'; // check valve
  metadata?: Record<string, unknown>;
}

export interface WaterPump {
  id: string;
  nodeId: string;
  name: string;
  power: number; // kW
  headCurve: [number, number][]; // [flow, head] pairs
  efficiencyCurve?: [number, number][]; // [flow, efficiency] pairs
  speed?: number; // rpm
  metadata?: Record<string, unknown>;
}

export interface WaterTank {
  id: string;
  nodeId: string;
  name: string;
  minLevel: number; // meters
  maxLevel: number; // meters
  initialLevel: number; // meters
  diameter: number; // meters
  volume?: number; // m³
  metadata?: Record<string, unknown>;
}

export interface WaterNetworkDesign {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  nodes: WaterNode[];
  pipes: WaterPipe[];
  pumps: WaterPump[];
  tanks: WaterTank[];
  demandMultiplier: number;
  headlossFormula: 'hazen-williams' | 'darcy-weisbach';
  analysisResults?: WaterNetworkAnalysisResult;
  createdAt: string;
  updatedAt: string;
}

export interface WaterNetworkAnalysisResult {
  timestamp: string;
  nodeResults: {
    nodeId: string;
    pressure: number;
    head: number;
    demand: number;
  }[];
  pipeResults: {
    pipeId: string;
    flow: number;
    velocity: number;
    headloss: number;
    status: string;
  }[];
  systemDemand: number;
  systemHeadloss: number;
}

// =============================================================================
// SEWER NETWORK TYPES (NCh 1105, SISS)
// =============================================================================

export interface SewerManhole {
  id: string;
  name: string;
  type: 'inspection' | 'drop' | 'junction' | 'terminal';
  lat: number;
  lng: number;
  groundElevation: number; // meters
  invertElevation: number; // meters
  depth: number; // meters
  diameter: number; // mm (typically 1200mm)
  material: 'concrete' | 'brick' | 'hdpe';
  connections: string[]; // pipe IDs
  metadata?: Record<string, unknown>;
}

export interface SewerPipe {
  id: string;
  name: string;
  upstreamManholeId: string;
  downstreamManholeId: string;
  length: number; // meters
  diameter: number; // mm
  material: 'PVC' | 'concrete' | 'HDPE' | 'clay';
  slope: number; // m/m
  roughness: number; // Manning's n
  upstreamInvert: number; // meters
  downstreamInvert: number; // meters
  designFlow?: number; // L/s
  fullFlowCapacity?: number; // L/s
  metadata?: Record<string, unknown>;
}

export interface SewerConnection {
  id: string;
  type: 'residential' | 'commercial' | 'industrial';
  manholeId: string;
  address?: string;
  population?: number;
  flowContribution: number; // L/s
  metadata?: Record<string, unknown>;
}

export interface SewerDesign {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  systemType: 'sanitary' | 'storm' | 'combined';
  manholes: SewerManhole[];
  pipes: SewerPipe[];
  connections: SewerConnection[];
  designCriteria: {
    minSlope: number;
    maxSlope: number;
    minVelocity: number; // m/s
    maxVelocity: number; // m/s
    minCover: number; // meters
    maxDepthRatio: number; // y/D
    peakFactor: number;
    infiltration: number; // L/s/km
  };
  analysisResults?: SewerAnalysisResult;
  createdAt: string;
  updatedAt: string;
}

export interface SewerAnalysisResult {
  timestamp: string;
  pipeResults: {
    pipeId: string;
    designFlow: number;
    fullFlowCapacity: number;
    depthRatio: number;
    velocity: number;
    status: 'ok' | 'undersized' | 'oversized' | 'velocity_low' | 'velocity_high';
  }[];
  totalFlow: number;
  totalLength: number;
}

// =============================================================================
// STORMWATER TYPES (Manual MINVU, Manual MOP)
// =============================================================================

export interface StormwaterCatchment {
  id: string;
  name: string;
  coordinates: [number, number][]; // polygon vertices
  area: number; // hectares
  imperviousPercent: number;
  runoffCoefficient: number;
  slope: number; // %
  timeOfConcentration: number; // minutes
  landUse: 'residential' | 'commercial' | 'industrial' | 'green' | 'mixed';
  soilType: 'A' | 'B' | 'C' | 'D'; // SCS soil groups
  outletId: string;
  metadata?: Record<string, unknown>;
}

export interface StormwaterOutlet {
  id: string;
  name: string;
  type: 'inlet' | 'outlet' | 'junction';
  lat: number;
  lng: number;
  elevation: number;
  capacity?: number; // L/s
  metadata?: Record<string, unknown>;
}

export interface StormwaterConduit {
  id: string;
  name: string;
  type: 'pipe' | 'channel' | 'culvert';
  upstreamId: string;
  downstreamId: string;
  length: number;
  shape: 'circular' | 'rectangular' | 'trapezoidal';
  dimensions: {
    diameter?: number; // mm for circular
    width?: number; // mm for rectangular
    height?: number; // mm for rectangular
    bottomWidth?: number; // m for trapezoidal
    sideSlope?: number; // H:V for trapezoidal
  };
  slope: number;
  roughness: number;
  material: string;
  metadata?: Record<string, unknown>;
}

export interface StormwaterStorage {
  id: string;
  name: string;
  type: 'detention' | 'retention' | 'infiltration';
  lat: number;
  lng: number;
  volume: number; // m³
  surfaceArea: number; // m²
  maxDepth: number; // m
  outletType: 'orifice' | 'weir' | 'pump' | 'infiltration';
  outletCapacity: number; // L/s
  storageTable?: [number, number][]; // [depth, volume] pairs
  metadata?: Record<string, unknown>;
}

export interface StormwaterDesign {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  catchments: StormwaterCatchment[];
  outlets: StormwaterOutlet[];
  conduits: StormwaterConduit[];
  storages: StormwaterStorage[];
  designStorm: {
    returnPeriod: number; // years
    duration: number; // minutes
    intensity?: number; // mm/hr
    idfCurve?: string; // reference to IDF curve
  };
  analysisMethod: 'rational' | 'scs' | 'swmm';
  analysisResults?: StormwaterAnalysisResult;
  createdAt: string;
  updatedAt: string;
}

export interface StormwaterAnalysisResult {
  timestamp: string;
  catchmentResults: {
    catchmentId: string;
    peakFlow: number; // L/s
    runoffVolume: number; // m³
    timeOfConcentration: number; // min
  }[];
  conduitResults: {
    conduitId: string;
    peakFlow: number;
    capacity: number;
    utilizationPercent: number;
    status: 'ok' | 'surcharge' | 'flooding';
  }[];
  storageResults: {
    storageId: string;
    maxVolume: number;
    maxDepth: number;
    overflowVolume: number;
  }[];
  totalPeakFlow: number;
  totalRunoffVolume: number;
}

// =============================================================================
// OPEN CHANNEL TYPES (Manual DOH)
// =============================================================================

export interface ChannelSection {
  id: string;
  name: string;
  chainage: number; // meters from start
  type: 'trapezoidal' | 'rectangular' | 'triangular' | 'circular' | 'natural';
  dimensions: {
    bottomWidth?: number; // m
    topWidth?: number; // m
    depth?: number; // m
    sideSlope?: number; // H:V
    diameter?: number; // m for circular
  };
  bedElevation: number; // m
  leftBankElevation: number; // m
  rightBankElevation: number; // m
  roughness: number; // Manning's n
  coordinates: [number, number]; // lat, lng
  metadata?: Record<string, unknown>;
}

export interface ChannelReach {
  id: string;
  name: string;
  upstreamSectionId: string;
  downstreamSectionId: string;
  length: number; // m
  slope: number; // m/m
  bankMaterial: 'concrete' | 'riprap' | 'gabion' | 'vegetated' | 'natural';
  liningType?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelStructure {
  id: string;
  name: string;
  type: 'weir' | 'culvert' | 'bridge' | 'drop' | 'gate' | 'check';
  chainage: number;
  lat: number;
  lng: number;
  parameters: Record<string, number | string>;
  metadata?: Record<string, unknown>;
}

export interface ChannelDesign {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  sections: ChannelSection[];
  reaches: ChannelReach[];
  structures: ChannelStructure[];
  designFlow: number; // m³/s
  designFreeboard: number; // m
  analysisResults?: ChannelAnalysisResult;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelAnalysisResult {
  timestamp: string;
  sectionResults: {
    sectionId: string;
    waterDepth: number;
    velocity: number;
    froudeNumber: number;
    flowRegime: 'subcritical' | 'critical' | 'supercritical';
    capacity: number;
    freeboard: number;
    status: 'ok' | 'overflow' | 'scour_risk' | 'deposition_risk';
  }[];
  profileData: {
    chainage: number;
    bedElevation: number;
    waterSurface: number;
    energyLine: number;
    criticalDepth: number;
  }[];
  totalLength: number;
  averageSlope: number;
}

// =============================================================================
// PROJECT DISCIPLINE SUMMARY
// =============================================================================

export interface ProjectDisciplines {
  projectId: string;
  waterNetwork?: WaterNetworkDesign;
  sewer?: SewerDesign;
  stormwater?: StormwaterDesign;
  channel?: ChannelDesign;
}

// API Types
export interface DisciplineCreateRequest<T> {
  projectId: string;
  name: string;
  description?: string;
  data: Partial<T>;
}

export interface DisciplineUpdateRequest<T> {
  id: string;
  data: Partial<T>;
}
