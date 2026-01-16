// ============================================================
// NCh1537:2009 - Chilean Live Load Code
// Diseño Estructural - Cargas Permanentes y Cargas de Uso
// ============================================================
// Reference: NCh1537:2009 (replaces NCh1537.Of86)
// Sources:
// - https://www.studocu.com/cl/document/universidad-de-santiago-de-chile/fundamentos-de-diseno-estructural/nch1537-2009-sobrecarga-norma-chilena/14330587
// ============================================================

// ============================================================
// OCCUPANCY CATEGORIES FOR LIVE LOADS
// ============================================================

export type OccupancyType =
  // Residential
  | 'residential_private'
  | 'residential_common_areas'
  | 'residential_balconies'
  // Office
  | 'office_general'
  | 'office_corridors'
  | 'office_file_rooms'
  // Commercial
  | 'retail_ground_floor'
  | 'retail_upper_floors'
  | 'restaurant'
  // Assembly
  | 'assembly_fixed_seats'
  | 'assembly_movable_seats'
  | 'assembly_stage'
  | 'assembly_corridors'
  // Educational
  | 'classroom'
  | 'school_corridors'
  | 'library_reading'
  | 'library_stacks'
  // Healthcare
  | 'hospital_patient_rooms'
  | 'hospital_operating_rooms'
  | 'hospital_corridors'
  // Industrial
  | 'light_manufacturing'
  | 'heavy_manufacturing'
  | 'warehouse_light'
  | 'warehouse_heavy'
  // Parking
  | 'parking_passenger'
  | 'parking_light_trucks'
  | 'parking_heavy'
  // Special
  | 'roofs_accessible'
  | 'roofs_inaccessible'
  | 'sidewalks'
  | 'stairs'
  | 'mechanical_rooms';

export interface LiveLoadData {
  type: OccupancyType;
  qk: number;             // Uniformly distributed load (kN/m²)
  Qk?: number;            // Concentrated load (kN)
  description: string;
  descriptionEs: string;
  reducible: boolean;     // Can apply area reduction
  category: string;
}

/**
 * Live loads by occupancy type
 * NCh1537:2009 Tabla 3
 */
export const LIVE_LOADS: Record<OccupancyType, LiveLoadData> = {
  // Residential
  residential_private: {
    type: 'residential_private',
    qk: 2.0,
    Qk: 2.0,
    description: 'Private residential areas',
    descriptionEs: 'Áreas residenciales privadas (dormitorios, salas)',
    reducible: true,
    category: 'residential',
  },
  residential_common_areas: {
    type: 'residential_common_areas',
    qk: 3.0,
    Qk: 3.0,
    description: 'Residential common areas',
    descriptionEs: 'Áreas comunes residenciales (pasillos, vestíbulos)',
    reducible: true,
    category: 'residential',
  },
  residential_balconies: {
    type: 'residential_balconies',
    qk: 3.0,
    Qk: 2.0,
    description: 'Balconies and terraces',
    descriptionEs: 'Balcones y terrazas',
    reducible: false,
    category: 'residential',
  },

  // Office
  office_general: {
    type: 'office_general',
    qk: 2.5,
    Qk: 4.5,
    description: 'Office areas',
    descriptionEs: 'Oficinas (áreas generales)',
    reducible: true,
    category: 'office',
  },
  office_corridors: {
    type: 'office_corridors',
    qk: 4.0,
    Qk: 4.5,
    description: 'Office corridors and public areas',
    descriptionEs: 'Corredores de oficinas y áreas públicas',
    reducible: false,
    category: 'office',
  },
  office_file_rooms: {
    type: 'office_file_rooms',
    qk: 5.0,
    Qk: 10.0,
    description: 'File and storage rooms',
    descriptionEs: 'Salas de archivos y almacenamiento',
    reducible: false,
    category: 'office',
  },

  // Commercial
  retail_ground_floor: {
    type: 'retail_ground_floor',
    qk: 5.0,
    Qk: 4.5,
    description: 'Retail - ground floor',
    descriptionEs: 'Comercio - planta baja',
    reducible: true,
    category: 'commercial',
  },
  retail_upper_floors: {
    type: 'retail_upper_floors',
    qk: 4.0,
    Qk: 4.5,
    description: 'Retail - upper floors',
    descriptionEs: 'Comercio - pisos superiores',
    reducible: true,
    category: 'commercial',
  },
  restaurant: {
    type: 'restaurant',
    qk: 3.0,
    Qk: 4.0,
    description: 'Restaurants and dining areas',
    descriptionEs: 'Restaurantes y comedores',
    reducible: true,
    category: 'commercial',
  },

  // Assembly
  assembly_fixed_seats: {
    type: 'assembly_fixed_seats',
    qk: 4.0,
    Qk: 4.5,
    description: 'Assembly with fixed seats',
    descriptionEs: 'Asambleas con asientos fijos (teatros, cines)',
    reducible: false,
    category: 'assembly',
  },
  assembly_movable_seats: {
    type: 'assembly_movable_seats',
    qk: 5.0,
    Qk: 4.5,
    description: 'Assembly with movable seats',
    descriptionEs: 'Asambleas con asientos móviles',
    reducible: false,
    category: 'assembly',
  },
  assembly_stage: {
    type: 'assembly_stage',
    qk: 7.5,
    Qk: 4.5,
    description: 'Stage areas',
    descriptionEs: 'Escenarios',
    reducible: false,
    category: 'assembly',
  },
  assembly_corridors: {
    type: 'assembly_corridors',
    qk: 5.0,
    Qk: 4.5,
    description: 'Assembly corridors',
    descriptionEs: 'Corredores de salas de asamblea',
    reducible: false,
    category: 'assembly',
  },

  // Educational
  classroom: {
    type: 'classroom',
    qk: 2.5,
    Qk: 4.5,
    description: 'Classrooms',
    descriptionEs: 'Salas de clase',
    reducible: true,
    category: 'educational',
  },
  school_corridors: {
    type: 'school_corridors',
    qk: 4.0,
    Qk: 4.5,
    description: 'School corridors',
    descriptionEs: 'Corredores de escuelas',
    reducible: false,
    category: 'educational',
  },
  library_reading: {
    type: 'library_reading',
    qk: 3.0,
    Qk: 4.5,
    description: 'Library reading rooms',
    descriptionEs: 'Salas de lectura de bibliotecas',
    reducible: true,
    category: 'educational',
  },
  library_stacks: {
    type: 'library_stacks',
    qk: 7.5,
    Qk: 10.0,
    description: 'Library stack rooms',
    descriptionEs: 'Salas de estanterías de bibliotecas',
    reducible: false,
    category: 'educational',
  },

  // Healthcare
  hospital_patient_rooms: {
    type: 'hospital_patient_rooms',
    qk: 2.0,
    Qk: 4.5,
    description: 'Hospital patient rooms',
    descriptionEs: 'Habitaciones de pacientes',
    reducible: true,
    category: 'healthcare',
  },
  hospital_operating_rooms: {
    type: 'hospital_operating_rooms',
    qk: 3.0,
    Qk: 4.5,
    description: 'Operating rooms',
    descriptionEs: 'Salas de operaciones',
    reducible: false,
    category: 'healthcare',
  },
  hospital_corridors: {
    type: 'hospital_corridors',
    qk: 4.0,
    Qk: 4.5,
    description: 'Hospital corridors',
    descriptionEs: 'Corredores de hospitales',
    reducible: false,
    category: 'healthcare',
  },

  // Industrial
  light_manufacturing: {
    type: 'light_manufacturing',
    qk: 5.0,
    Qk: 9.0,
    description: 'Light manufacturing',
    descriptionEs: 'Manufactura liviana',
    reducible: true,
    category: 'industrial',
  },
  heavy_manufacturing: {
    type: 'heavy_manufacturing',
    qk: 10.0,
    Qk: 13.5,
    description: 'Heavy manufacturing',
    descriptionEs: 'Manufactura pesada',
    reducible: false,
    category: 'industrial',
  },
  warehouse_light: {
    type: 'warehouse_light',
    qk: 6.0,
    Qk: 9.0,
    description: 'Light storage warehouse',
    descriptionEs: 'Bodega de almacenamiento liviano',
    reducible: true,
    category: 'industrial',
  },
  warehouse_heavy: {
    type: 'warehouse_heavy',
    qk: 12.0,
    Qk: 13.5,
    description: 'Heavy storage warehouse',
    descriptionEs: 'Bodega de almacenamiento pesado',
    reducible: false,
    category: 'industrial',
  },

  // Parking
  parking_passenger: {
    type: 'parking_passenger',
    qk: 2.5,
    Qk: 9.0,
    description: 'Passenger vehicle parking',
    descriptionEs: 'Estacionamiento de vehículos livianos',
    reducible: true,
    category: 'parking',
  },
  parking_light_trucks: {
    type: 'parking_light_trucks',
    qk: 5.0,
    Qk: 13.5,
    description: 'Light truck parking',
    descriptionEs: 'Estacionamiento de camiones livianos',
    reducible: false,
    category: 'parking',
  },
  parking_heavy: {
    type: 'parking_heavy',
    qk: 12.0,
    description: 'Heavy vehicle parking',
    descriptionEs: 'Estacionamiento de vehículos pesados',
    reducible: false,
    category: 'parking',
  },

  // Special
  roofs_accessible: {
    type: 'roofs_accessible',
    qk: 2.0,
    description: 'Accessible roofs',
    descriptionEs: 'Techos accesibles',
    reducible: true,
    category: 'roofs',
  },
  roofs_inaccessible: {
    type: 'roofs_inaccessible',
    qk: 1.0,
    description: 'Inaccessible roofs (maintenance only)',
    descriptionEs: 'Techos no accesibles (solo mantenimiento)',
    reducible: true,
    category: 'roofs',
  },
  sidewalks: {
    type: 'sidewalks',
    qk: 12.5,
    description: 'Sidewalks and driveways',
    descriptionEs: 'Aceras y accesos vehiculares',
    reducible: false,
    category: 'exterior',
  },
  stairs: {
    type: 'stairs',
    qk: 4.0,
    Qk: 4.5,
    description: 'Stairs and landings',
    descriptionEs: 'Escaleras y descansos',
    reducible: false,
    category: 'circulation',
  },
  mechanical_rooms: {
    type: 'mechanical_rooms',
    qk: 5.0,
    description: 'Mechanical and electrical rooms',
    descriptionEs: 'Salas de máquinas y equipos eléctricos',
    reducible: false,
    category: 'service',
  },
};

// ============================================================
// DEAD LOADS - COMMON MATERIALS
// ============================================================

export interface MaterialWeight {
  name: string;
  nameEs: string;
  density: number;      // kN/m³
  surfaceLoad?: number; // kN/m² for sheet materials
  category: string;
}

/**
 * Common material weights
 * NCh1537:2009 Anexo A
 */
export const MATERIAL_WEIGHTS: Record<string, MaterialWeight> = {
  // Concrete
  reinforced_concrete: {
    name: 'Reinforced concrete',
    nameEs: 'Hormigón armado',
    density: 25.0,
    category: 'concrete',
  },
  plain_concrete: {
    name: 'Plain concrete',
    nameEs: 'Hormigón simple',
    density: 23.0,
    category: 'concrete',
  },
  lightweight_concrete: {
    name: 'Lightweight concrete',
    nameEs: 'Hormigón liviano',
    density: 18.0,
    category: 'concrete',
  },

  // Masonry
  solid_brick: {
    name: 'Solid clay brick',
    nameEs: 'Ladrillo macizo de arcilla',
    density: 18.0,
    category: 'masonry',
  },
  hollow_brick: {
    name: 'Hollow clay brick',
    nameEs: 'Ladrillo hueco de arcilla',
    density: 12.0,
    category: 'masonry',
  },
  concrete_block: {
    name: 'Concrete block',
    nameEs: 'Bloque de hormigón',
    density: 15.0,
    category: 'masonry',
  },
  concrete_block_grouted: {
    name: 'Grouted concrete block',
    nameEs: 'Bloque de hormigón relleno',
    density: 21.0,
    category: 'masonry',
  },

  // Steel
  steel: {
    name: 'Steel',
    nameEs: 'Acero',
    density: 78.5,
    category: 'metal',
  },
  aluminum: {
    name: 'Aluminum',
    nameEs: 'Aluminio',
    density: 27.0,
    category: 'metal',
  },

  // Wood
  softwood: {
    name: 'Softwood (pine, spruce)',
    nameEs: 'Madera blanda (pino, abeto)',
    density: 5.0,
    category: 'wood',
  },
  hardwood: {
    name: 'Hardwood',
    nameEs: 'Madera dura',
    density: 8.0,
    category: 'wood',
  },
  plywood: {
    name: 'Plywood',
    nameEs: 'Madera contrachapada',
    density: 6.0,
    category: 'wood',
  },

  // Soil/Fill
  compacted_soil: {
    name: 'Compacted soil',
    nameEs: 'Suelo compactado',
    density: 18.0,
    category: 'soil',
  },
  gravel: {
    name: 'Gravel',
    nameEs: 'Grava',
    density: 17.0,
    category: 'soil',
  },
  sand: {
    name: 'Sand',
    nameEs: 'Arena',
    density: 16.0,
    category: 'soil',
  },

  // Finishes
  ceramic_tile: {
    name: 'Ceramic tile on mortar',
    nameEs: 'Baldosa cerámica sobre mortero',
    surfaceLoad: 1.0,
    density: 20.0,
    category: 'finish',
  },
  terrazzo: {
    name: 'Terrazzo floor',
    nameEs: 'Piso de terrazo',
    surfaceLoad: 1.2,
    density: 24.0,
    category: 'finish',
  },
  gypsum_board: {
    name: 'Gypsum board (12mm)',
    nameEs: 'Placa de yeso (12mm)',
    surfaceLoad: 0.12,
    density: 10.0,
    category: 'finish',
  },
  plaster: {
    name: 'Plaster (25mm)',
    nameEs: 'Enlucido de yeso (25mm)',
    surfaceLoad: 0.5,
    density: 20.0,
    category: 'finish',
  },

  // Roofing
  asphalt_shingles: {
    name: 'Asphalt shingles',
    nameEs: 'Tejas asfálticas',
    surfaceLoad: 0.15,
    density: 12.0,
    category: 'roofing',
  },
  clay_tiles: {
    name: 'Clay roof tiles',
    nameEs: 'Tejas de arcilla',
    surfaceLoad: 0.60,
    density: 18.0,
    category: 'roofing',
  },
  metal_roofing: {
    name: 'Metal roofing (steel)',
    nameEs: 'Cubierta metálica (acero)',
    surfaceLoad: 0.10,
    density: 78.5,
    category: 'roofing',
  },
  green_roof_extensive: {
    name: 'Extensive green roof (saturated)',
    nameEs: 'Techo verde extensivo (saturado)',
    surfaceLoad: 1.5,
    density: 15.0,
    category: 'roofing',
  },
};

// ============================================================
// PARTITION LOADS
// ============================================================

export interface PartitionLoad {
  type: string;
  typeEs: string;
  load: number;         // kN/m² equivalent uniform load
  weight_per_m?: number; // kN/m for wall self-weight
  description: string;
}

/**
 * Partition loads - equivalent uniform loads
 * NCh1537:2009 Section 4.2
 */
export const PARTITION_LOADS: PartitionLoad[] = [
  {
    type: 'lightweight',
    typeEs: 'Tabiques livianos',
    load: 0.5,
    weight_per_m: 0.8,
    description: 'Gypsum board partitions, weight < 0.8 kN/m',
  },
  {
    type: 'medium',
    typeEs: 'Tabiques medianos',
    load: 1.0,
    weight_per_m: 1.5,
    description: 'Medium partitions, 0.8 < weight ≤ 1.5 kN/m',
  },
  {
    type: 'heavy',
    typeEs: 'Tabiques pesados',
    load: 1.5,
    weight_per_m: 3.0,
    description: 'Heavy partitions, 1.5 < weight ≤ 3.0 kN/m',
  },
];

// ============================================================
// LIVE LOAD REDUCTION
// ============================================================

export interface LiveLoadReductionParams {
  qk: number;                // Basic live load (kN/m²)
  tributaryArea: number;     // Tributary area (m²)
  numFloors?: number;        // Number of floors supported
  isRoof?: boolean;
}

export interface LiveLoadReductionResult {
  originalLoad: number;
  reducedLoad: number;
  reductionFactor: number;
  applicableReduction: boolean;
}

/**
 * Calculate live load reduction factor
 * NCh1537:2009 Section 4.8
 *
 * R = 0.25 + 4.6 / sqrt(KLL * AT)
 * R ≥ 0.5 for members supporting one floor
 * R ≥ 0.4 for members supporting two or more floors
 */
export function calculateLiveLoadReduction(
  params: LiveLoadReductionParams
): LiveLoadReductionResult {
  const { qk, tributaryArea, numFloors = 1, isRoof = false } = params;

  // Reduction not applicable for:
  // - Public areas and corridors
  // - Loads > 5.0 kN/m²
  // - One-way slabs
  // - Roofs (except for area > 18.6 m²)
  if (qk > 5.0) {
    return {
      originalLoad: qk,
      reducedLoad: qk,
      reductionFactor: 1.0,
      applicableReduction: false,
    };
  }

  // Live load element factor KLL
  // Interior columns: 4.0
  // Exterior columns without cantilever: 4.0
  // Edge columns with cantilever: 3.0
  // Corner columns with cantilever: 2.0
  // Edge beams without cantilever: 2.0
  // Interior beams: 2.0
  // All other: 1.0
  const KLL = 4.0; // Default for columns

  // Calculate reduction factor
  const AT = tributaryArea;
  const sqrtTerm = Math.sqrt(KLL * AT);

  if (sqrtTerm <= 0) {
    return {
      originalLoad: qk,
      reducedLoad: qk,
      reductionFactor: 1.0,
      applicableReduction: false,
    };
  }

  let R = 0.25 + 4.6 / sqrtTerm;

  // Minimum values
  if (numFloors >= 2) {
    R = Math.max(R, 0.4);
  } else {
    R = Math.max(R, 0.5);
  }

  // Maximum is 1.0
  R = Math.min(R, 1.0);

  const reducedLoad = qk * R;

  return {
    originalLoad: qk,
    reducedLoad,
    reductionFactor: R,
    applicableReduction: R < 1.0,
  };
}

// ============================================================
// ROOF LIVE LOADS
// ============================================================

export interface RoofLiveLoadParams {
  tributaryArea: number;     // m²
  slope: number;             // degrees
  isOccupied: boolean;
  hasSpecialUse?: boolean;   // Gardens, assembly, etc.
}

/**
 * Calculate roof live load
 * NCh1537:2009 Section 4.9
 */
export function calculateRoofLiveLoad(params: RoofLiveLoadParams): number {
  const { tributaryArea, slope, isOccupied, hasSpecialUse = false } = params;

  // Occupied roofs use occupancy live load
  if (isOccupied || hasSpecialUse) {
    return LIVE_LOADS.roofs_accessible.qk;
  }

  // Base roof live load
  let Lr = 1.0; // kN/m²

  // Reduction factor R1 for tributary area
  let R1: number;
  if (tributaryArea <= 18.58) {
    R1 = 1.0;
  } else if (tributaryArea <= 55.74) {
    R1 = 1.2 - 0.011 * tributaryArea;
  } else {
    R1 = 0.6;
  }

  // Reduction factor R2 for slope
  let R2: number;
  if (slope <= 4) {
    R2 = 1.0;
  } else if (slope <= 12) {
    R2 = 1.2 - 0.05 * slope;
  } else {
    R2 = 0.6;
  }

  Lr = Lr * R1 * R2;

  // Minimum 0.58 kN/m²
  return Math.max(Lr, 0.58);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get live load by occupancy type
 */
export function getLiveLoad(occupancy: OccupancyType): LiveLoadData {
  return LIVE_LOADS[occupancy];
}

/**
 * Get all occupancy types by category
 */
export function getOccupancyByCategory(category: string): OccupancyType[] {
  return (Object.entries(LIVE_LOADS) as [OccupancyType, LiveLoadData][])
    .filter(([, data]) => data.category === category)
    .map(([type]) => type);
}

/**
 * Calculate total dead load for a floor system
 */
export function calculateFloorDeadLoad(components: {
  slabThickness: number;      // m
  slabMaterial: 'reinforced_concrete' | 'lightweight_concrete';
  finishType?: string;
  partitionType?: 'lightweight' | 'medium' | 'heavy' | 'none';
  ceilingLoad?: number;       // kN/m²
  mepLoad?: number;           // kN/m² for mechanical/electrical/plumbing
}): number {
  let totalLoad = 0;

  // Slab self-weight
  const slabDensity = MATERIAL_WEIGHTS[components.slabMaterial].density;
  totalLoad += slabDensity * components.slabThickness;

  // Finish
  if (components.finishType && MATERIAL_WEIGHTS[components.finishType]) {
    totalLoad += MATERIAL_WEIGHTS[components.finishType].surfaceLoad || 0;
  }

  // Partitions
  if (components.partitionType && components.partitionType !== 'none') {
    const partition = PARTITION_LOADS.find(p => p.type === components.partitionType);
    if (partition) {
      totalLoad += partition.load;
    }
  }

  // Ceiling
  if (components.ceilingLoad) {
    totalLoad += components.ceilingLoad;
  }

  // MEP
  if (components.mepLoad) {
    totalLoad += components.mepLoad;
  }

  return totalLoad;
}

// ============================================================
// EXPORT TYPES
// ============================================================

export interface NCh1537LoadParameters {
  code: 'NCh1537';
  version: '2009';
  occupancyType: OccupancyType;
  liveLoad: number;           // qk (kN/m²)
  concentratedLoad?: number;  // Qk (kN)
  deadLoad: number;           // G (kN/m²)
  partitionLoad: number;      // (kN/m²)
  totalGravityLoad: number;   // D + L (kN/m²)
}

/**
 * Create NCh1537 load parameters summary
 */
export function createNCh1537Parameters(
  occupancyType: OccupancyType,
  deadLoad: number,
  partitionType: 'lightweight' | 'medium' | 'heavy' | 'none' = 'none'
): NCh1537LoadParameters {
  const liveLoadData = LIVE_LOADS[occupancyType];
  const partitionLoad = partitionType !== 'none'
    ? (PARTITION_LOADS.find(p => p.type === partitionType)?.load || 0)
    : 0;

  return {
    code: 'NCh1537',
    version: '2009',
    occupancyType,
    liveLoad: liveLoadData.qk,
    concentratedLoad: liveLoadData.Qk,
    deadLoad,
    partitionLoad,
    totalGravityLoad: deadLoad + partitionLoad + liveLoadData.qk,
  };
}
