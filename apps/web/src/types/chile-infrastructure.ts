/**
 * Chilean Urban Infrastructure Type Definitions
 * Based on MINVU, MOP, DOH, and SISS standards
 */

// ============================================
// PAVEMENT DESIGN TYPES
// ============================================

export type PavementType = 'asphalt' | 'concrete' | 'paving_blocks' | 'permeable';

export interface PavementLayer {
  name: string;
  thickness: number; // meters
  material: string;
  cbrRequired?: number; // CBR percentage
  compactionRequired?: number; // % Proctor
}

export interface AsphaltPavement {
  type: 'asphalt';
  wearingCourse: PavementLayer;
  binderCourse?: PavementLayer;
  base: PavementLayer;
  subbase: PavementLayer;
  subgrade?: PavementLayer;
}

export interface ConcretePavement {
  type: 'concrete';
  slab: {
    thickness: number; // 0.15-0.25 m
    concreteGrade: 'G25' | 'G30' | 'G35';
    jointSpacing: number; // meters
    jointWidth: number; // meters
  };
  base: PavementLayer;
  subbase?: PavementLayer;
}

export interface PavingBlockPavement {
  type: 'paving_blocks';
  blocks: {
    class: 1 | 2 | 3 | 4 | 5; // NCh 3731
    thickness: number;
    pattern: 'herringbone' | 'stretcher' | 'basket';
  };
  beddingSand: { thickness: number }; // ~0.03-0.05 m
  base: PavementLayer;
}

// ============================================
// SEWER SYSTEM TYPES
// ============================================

export type PipeMaterial = 'pvc' | 'hdpe' | 'concrete' | 'steel' | 'ductile_iron';

export interface SewerPipe {
  id: string;
  material: PipeMaterial;
  diameter: number; // mm (110, 160, 200, 250, 315, 400, 500, etc.)
  length: number; // meters
  slope: number; // percentage (1-15%)
  invertElevationStart: number; // meters
  invertElevationEnd: number;
  flowDirection: 'downstream' | 'upstream';
}

export interface InspectionChamber {
  id: string;
  type: 'A' | 'B' | 'drop' | 'junction';
  position: { x: number; y: number; z: number };
  rimElevation: number; // cota de anillo
  invertElevation: number; // cota de radier
  depth: number; // meters
  internalDiameter: number; // 1.2m (Type A) or 1.3m (Type B)
  coneHeight: number; // 0.8m standard
  concreteGrade: 'H20' | 'H25';
  coverType: 'traffic' | 'sidewalk';
  inletPipes: string[]; // pipe IDs
  outletPipe: string; // pipe ID
}

export interface DomesticConnection {
  id: string;
  pipeSize: number; // 110mm typical
  material: 'pvc';
  length: number;
  slope: number; // 2-3%
  connectionPoint: string; // chamber or collector ID
}

// ============================================
// STORMWATER DRAINAGE TYPES
// ============================================

export type InletType = 'S1' | 'S2' | 'DOH' | 'SERVIU' | 'MOP' | 'combined';

export interface StormwaterInlet {
  id: string;
  type: InletType;
  position: { x: number; y: number; z: number };
  dimensions: {
    width: number; // 0.41m typical
    length: number; // 0.98m (S1) or 0.66m (S2)
    depth: number;
  };
  grateType: 'cast_iron' | 'galvanized_steel' | 'stainless_steel';
  catchmentArea: number; // m²
  designFlow: number; // L/s
  outletPipe: string; // pipe ID
}

export interface DrainageCollector {
  id: string;
  type: 'primary' | 'secondary';
  material: PipeMaterial;
  diameter: number; // min 300mm
  length: number;
  slope: number;
  manningN: number; // 0.013 plastic, 0.015 concrete
  invertElevationStart: number;
  invertElevationEnd: number;
  designReturnPeriod: number; // years (2-10 minor, 100 major)
}

export interface Gutter {
  id: string;
  type: 'curb_gutter' | 'valley_gutter' | 'V_channel';
  width: number; // 0.30m typical
  depth: number; // 0.15m typical
  slope: number; // longitudinal
  crossSlope: number; // transverse
  length: number;
}

// ============================================
// URBAN GEOMETRY TYPES
// ============================================

export type RoadClassification =
  | 'express'
  | 'trunk'
  | 'collector'
  | 'service'
  | 'local'
  | 'passage';

export interface RoadCrossSection {
  classification: RoadClassification;
  rightOfWay: number; // meters
  components: {
    sidewalkLeft: SidewalkSection;
    roadway: RoadwaySection;
    sidewalkRight: SidewalkSection;
    median?: MedianSection;
  };
}

export interface SidewalkSection {
  totalWidth: number; // meters
  vereda: {
    width: number; // min 1.50m
    surfaceType: 'concrete' | 'pavers' | 'asphalt';
    crossSlope: number; // 2% typical
  };
  platabanda?: {
    width: number;
    type: 'grass' | 'paved' | 'tree_grate';
  };
  furnitureZone?: {
    width: number;
    elements: ('lighting' | 'signage' | 'benches' | 'trash_bins' | 'bike_racks')[];
  };
}

export interface RoadwaySection {
  totalWidth: number;
  lanes: LaneSection[];
  parkingLeft?: ParkingSection;
  parkingRight?: ParkingSection;
  bikeLaneLeft?: BikeLaneSection;
  bikeLaneRight?: BikeLaneSection;
}

export interface LaneSection {
  width: number; // 3.0-3.5m typical
  direction: 'forward' | 'reverse';
  type: 'travel' | 'turn' | 'bus' | 'hov';
}

export interface ParkingSection {
  width: number; // 2.0-2.5m
  type: 'parallel' | 'angle_45' | 'angle_60' | 'perpendicular';
  length?: number; // for parallel
}

export interface BikeLaneSection {
  width: number; // 1.5m minimum
  segregationType: 'none' | 'visual' | 'physical';
  segregationWidth?: number; // 0.3-0.5m for visual
  direction: 'one_way' | 'two_way';
}

export interface MedianSection {
  width: number;
  type: 'raised' | 'painted' | 'barrier';
  landscaped: boolean;
}

// ============================================
// CURB AND GUTTER TYPES
// ============================================

export type CurbType = 'A' | 'zarpa' | 'mountable' | 'barrier';

export interface Curb {
  id: string;
  type: CurbType;
  dimensions: {
    width: number; // 0.10m typical
    height: number; // 0.25m typical
    length: number; // 0.5-1.0m segments
  };
  concreteGrade: string; // 300 kg/m³ cement minimum
  position: { x: number; y: number; z: number }[];
}

// ============================================
// MATERIAL SPECIFICATIONS
// ============================================

export interface MaterialSpec {
  name: string;
  code: string;
  chileanStandard?: string; // NCh number
  properties: Record<string, number | string>;
  color: number; // hex color for 3D rendering
  roughness: number; // 0-1 for PBR
  metalness: number; // 0-1 for PBR
}

export const CHILEAN_MATERIALS: Record<string, MaterialSpec> = {
  asphalt_wearing: {
    name: 'Carpeta Asfáltica',
    code: 'ASP-W',
    chileanStandard: 'NCh 2343',
    properties: {
      density: 2400, // kg/m³
      stability: 800, // kg minimum
    },
    color: 0x333333,
    roughness: 0.9,
    metalness: 0.0,
  },
  concrete_g25: {
    name: 'Hormigón G25',
    code: 'HOR-G25',
    chileanStandard: 'NCh 170',
    properties: {
      strength: 25, // MPa
      cementContent: 300, // kg/m³
    },
    color: 0xcccccc,
    roughness: 0.7,
    metalness: 0.0,
  },
  pvc_sewer: {
    name: 'PVC Sanitario',
    code: 'PVC-SAN',
    chileanStandard: 'NCh 2252',
    properties: {
      sdr: 41,
      pressure: 4, // bar
    },
    color: 0x964b00,
    roughness: 0.6,
    metalness: 0.1,
  },
  hdpe_pe100: {
    name: 'HDPE PE100',
    code: 'HDPE-100',
    properties: {
      sdr: 17,
      pressure: 10, // bar
      lifespan: 50, // years
    },
    color: 0x1a1a1a,
    roughness: 0.5,
    metalness: 0.1,
  },
  cast_iron_cover: {
    name: 'Fierro Fundido',
    code: 'FF-TAP',
    properties: {
      loadClass: 'D400', // 40 ton
      diameter: 600, // mm
    },
    color: 0x3d3d3d,
    roughness: 0.4,
    metalness: 0.8,
  },
  granular_base: {
    name: 'Base Granular',
    code: 'BASE-CBR60',
    chileanStandard: 'NCh 163',
    properties: {
      cbrMin: 60,
      compaction: 95, // % Proctor
      maxSize: 38.1, // mm
    },
    color: 0x8b7355,
    roughness: 0.95,
    metalness: 0.0,
  },
};

// ============================================
// DESIGN STANDARDS CONSTANTS
// ============================================

export const CHILEAN_DESIGN_STANDARDS = {
  pavement: {
    asphaltMinThickness: 0.04, // 4 cm
    asphaltMaxThickness: 0.15, // 15 cm
    concreteMinThickness: 0.15, // 15 cm
    baseMinThickness: 0.10, // 10 cm
    subbaseMinThickness: 0.15, // 15 cm
    compactionMax: 0.15, // 15 cm per lift
    minCBR: {
      subgrade: 10,
      subbase: 40,
      base: 60,
    },
  },
  sewer: {
    minDiameter: 100, // mm
    minSlope: 0.01, // 1%
    maxSlope: 0.15, // 15%
    minVelocity: 0.6, // m/s
    domesticSlope: 0.03, // 3%
  },
  drainage: {
    minCollectorDiameter: 300, // mm
    maxGutterWidth: 1.0, // m
    minorReturnPeriod: 10, // years
    majorReturnPeriod: 100, // years
  },
  urban: {
    minSidewalkWidth: 1.5, // m
    minLaneWidth: 3.0, // m
    busRouteMinWidth: 6.5, // m
    trafficCalmingMinWidth: 3.5, // m
    bikeLaneMinWidth: 1.5, // m
  },
  chambers: {
    typeADiameter: 1.2, // m
    typeBDiameter: 1.3, // m
    coneHeight: 0.8, // m
    maxSpacing: 120, // m
    minDepthForSlab: 2.5, // m
  },
} as const;

// ============================================
// PROJECT TYPES
// ============================================

export interface ChileanUrbanProject {
  id: string;
  name: string;
  location: {
    region: string;
    comuna: string;
    coordinates?: { lat: number; lng: number };
  };
  components: {
    pavements: (AsphaltPavement | ConcretePavement | PavingBlockPavement)[];
    sewerNetwork: {
      pipes: SewerPipe[];
      chambers: InspectionChamber[];
      connections: DomesticConnection[];
    };
    drainageNetwork: {
      inlets: StormwaterInlet[];
      collectors: DrainageCollector[];
      gutters: Gutter[];
    };
    roadSections: RoadCrossSection[];
    curbs: Curb[];
  };
  designStandards: {
    pavementManual: '2008' | '2020';
    drainageManual: 'DOH-2013';
    sewerRegulation: 'RIDAA-DS50';
  };
  metadata: {
    designer: string;
    reviewer: string;
    date: string;
    version: string;
  };
}
