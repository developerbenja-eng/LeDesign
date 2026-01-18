// ============================================================
// NCh433.Of96 Mod 2012 + DS61 - Chilean Seismic Design Code
// Diseño Sísmico de Edificios
// ============================================================
// Reference: NCh433.Of1996 Modificada 2009 + Decreto Supremo 61 (2011)
// Latest update: NCh2369:2025 for industrial structures
// Sources:
// - https://www.minvu.gob.cl/wp-content/uploads/2019/05/DECRETO-61-2011-DISEN%CC%83O-SISMICO-DE-EDIFICIOS.pdf
// - https://ingenieria-civil.github.io/chile/normas/00-NCh-433-Of-1996-Mod-2009-DS-61-2011-refundido.pdf
// ============================================================

// ============================================================
// SEISMIC ZONES (Zonas Sísmicas)
// ============================================================

export type ChileanSeismicZone = 1 | 2 | 3;

export interface SeismicZoneData {
  zone: ChileanSeismicZone;
  A0: number;  // Peak ground acceleration in g
  description: string;
}

/**
 * Chilean seismic zones with peak ground acceleration (A0)
 * Tabla 4.1 - NCh433
 */
export const CHILEAN_SEISMIC_ZONES: Record<ChileanSeismicZone, SeismicZoneData> = {
  1: { zone: 1, A0: 0.20, description: 'Zona 1 - Menor riesgo sísmico' },
  2: { zone: 2, A0: 0.30, description: 'Zona 2 - Riesgo sísmico intermedio' },
  3: { zone: 3, A0: 0.40, description: 'Zona 3 - Mayor riesgo sísmico' },
};

// ============================================================
// SOIL CLASSIFICATION (Clasificación de Suelos - DS61)
// ============================================================

export type ChileanSoilType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface SoilTypeData {
  type: ChileanSoilType;
  S: number;      // Site amplification factor
  T0: number;     // Characteristic period (seconds)
  Tp: number;     // T' - plateau period (seconds)
  n: number;      // Spectral exponent
  p: number;      // Factor for R* calculation
  Vs30_min?: number;  // Minimum Vs30 (m/s)
  Vs30_max?: number;  // Maximum Vs30 (m/s)
  description: string;
  requiresSpecialStudy: boolean;
}

/**
 * Soil type parameters according to DS61 - Tabla 6.3
 * Parámetros que dependen del tipo de suelo
 */
export const CHILEAN_SOIL_TYPES: Record<ChileanSoilType, SoilTypeData> = {
  A: {
    type: 'A',
    S: 0.90,
    T0: 0.15,
    Tp: 0.20,
    n: 1.00,
    p: 2.0,
    Vs30_min: 900,
    description: 'Roca, suelo cementado - Vs30 ≥ 900 m/s',
    requiresSpecialStudy: false,
  },
  B: {
    type: 'B',
    S: 1.00,
    T0: 0.30,
    Tp: 0.35,
    n: 1.33,
    p: 1.5,
    Vs30_min: 500,
    Vs30_max: 900,
    description: 'Roca blanda o suelo muy denso - 500 ≤ Vs30 < 900 m/s',
    requiresSpecialStudy: false,
  },
  C: {
    type: 'C',
    S: 1.05,
    T0: 0.40,
    Tp: 0.45,
    n: 1.40,
    p: 1.6,
    Vs30_min: 350,
    Vs30_max: 500,
    description: 'Suelo denso o firme - 350 ≤ Vs30 < 500 m/s',
    requiresSpecialStudy: false,
  },
  D: {
    type: 'D',
    S: 1.20,
    T0: 0.75,
    Tp: 0.85,
    n: 1.80,
    p: 1.0,
    Vs30_min: 180,
    Vs30_max: 350,
    description: 'Suelo medianamente denso - 180 ≤ Vs30 < 350 m/s',
    requiresSpecialStudy: false,
  },
  E: {
    type: 'E',
    S: 1.30,
    T0: 1.20,
    Tp: 1.35,
    n: 1.80,
    p: 1.0,
    Vs30_max: 180,
    description: 'Suelo de compacidad/consistencia media - Vs30 < 180 m/s',
    requiresSpecialStudy: true, // Requires elastic displacement spectrum study
  },
  F: {
    type: 'F',
    S: 0, // Requires special study
    T0: 0,
    Tp: 0,
    n: 0,
    p: 0,
    description: 'Suelos especiales - Requiere estudio específico',
    requiresSpecialStudy: true,
  },
};

// ============================================================
// OCCUPANCY CATEGORIES & IMPORTANCE FACTORS
// ============================================================

export type OccupancyCategory = 'I' | 'II' | 'III' | 'IV';

export interface OccupancyCategoryData {
  category: OccupancyCategory;
  I: number;  // Importance factor
  description: string;
  examples: string[];
}

/**
 * Occupancy categories and importance factors
 * Tabla 4.3 - NCh433
 */
export const OCCUPANCY_CATEGORIES: Record<OccupancyCategory, OccupancyCategoryData> = {
  I: {
    category: 'I',
    I: 0.8,
    description: 'Edificios de baja importancia',
    examples: ['Bodegas agrícolas', 'Estructuras temporales', 'Edificios aislados de bajo riesgo'],
  },
  II: {
    category: 'II',
    I: 1.0,
    description: 'Edificios de uso normal',
    examples: ['Viviendas', 'Oficinas', 'Comercio', 'Hoteles', 'Industrias no esenciales'],
  },
  III: {
    category: 'III',
    I: 1.2,
    description: 'Edificios de uso público o con alta ocupación',
    examples: ['Colegios', 'Universidades', 'Cines', 'Teatros', 'Estadios', 'Centros comerciales grandes'],
  },
  IV: {
    category: 'IV',
    I: 1.2,
    description: 'Instalaciones esenciales y de servicio público',
    examples: ['Hospitales', 'Estaciones de bomberos', 'Centrales de comunicaciones', 'Torres de control'],
  },
};

// ============================================================
// STRUCTURAL SYSTEMS & R FACTORS (Tabla 5.1)
// ============================================================

export type StructuralSystemType =
  // Steel frames (Marcos de acero)
  | 'steel_omf'   // Ordinary Moment Frame
  | 'steel_imf'   // Intermediate Moment Frame
  | 'steel_smf'   // Special Moment Frame
  | 'steel_stmf'  // Special Truss Moment Frame
  | 'steel_ocbf'  // Ordinary Concentrically Braced Frame
  | 'steel_scbf'  // Special Concentrically Braced Frame
  | 'steel_ebf'   // Eccentrically Braced Frame
  // Concrete frames (Marcos de hormigón armado)
  | 'concrete_frame'
  | 'concrete_wall'
  | 'concrete_dual'
  // Masonry (Albañilería)
  | 'confined_masonry'
  | 'reinforced_masonry_solid'
  | 'reinforced_masonry_hollow'
  // Wood (Madera)
  | 'wood_wall';

export interface StructuralSystemData {
  type: StructuralSystemType;
  R: number;        // Response modification factor for static analysis
  R0: number;       // Response modification factor for modal spectral analysis
  material: 'steel' | 'concrete' | 'masonry' | 'wood';
  description: string;
  descriptionEs: string;
}

/**
 * Structural systems with R and R0 factors
 * Tabla 5.1 - NCh433.Of96 Mod 2009
 */
export const STRUCTURAL_SYSTEMS: Record<StructuralSystemType, StructuralSystemData> = {
  // Steel frames
  steel_omf: {
    type: 'steel_omf',
    R: 4,
    R0: 5,
    material: 'steel',
    description: 'Steel Ordinary Moment Frame (OMF)',
    descriptionEs: 'Marco de acero corriente (OMF)',
  },
  steel_imf: {
    type: 'steel_imf',
    R: 5,
    R0: 6,
    material: 'steel',
    description: 'Steel Intermediate Moment Frame (IMF)',
    descriptionEs: 'Marco de acero intermedio (IMF)',
  },
  steel_smf: {
    type: 'steel_smf',
    R: 7,
    R0: 11,
    material: 'steel',
    description: 'Steel Special Moment Frame (SMF)',
    descriptionEs: 'Marco de acero especial (SMF)',
  },
  steel_stmf: {
    type: 'steel_stmf',
    R: 6,
    R0: 10,
    material: 'steel',
    description: 'Steel Special Truss Moment Frame (STMF)',
    descriptionEs: 'Marco de vigas enrejadas especial (STMF)',
  },
  steel_ocbf: {
    type: 'steel_ocbf',
    R: 3,
    R0: 5,
    material: 'steel',
    description: 'Steel Ordinary Concentrically Braced Frame (OCBF)',
    descriptionEs: 'Marco arriostrado concéntrico corriente (OCBF)',
  },
  steel_scbf: {
    type: 'steel_scbf',
    R: 5.5,
    R0: 8,
    material: 'steel',
    description: 'Steel Special Concentrically Braced Frame (SCBF)',
    descriptionEs: 'Marco arriostrado concéntrico especial (SCBF)',
  },
  steel_ebf: {
    type: 'steel_ebf',
    R: 6,
    R0: 10,
    material: 'steel',
    description: 'Steel Eccentrically Braced Frame (EBF)',
    descriptionEs: 'Marco arriostrado excéntrico (EBF)',
  },
  // Concrete
  concrete_frame: {
    type: 'concrete_frame',
    R: 7,
    R0: 11,
    material: 'concrete',
    description: 'Reinforced Concrete Frame',
    descriptionEs: 'Pórtico de hormigón armado',
  },
  concrete_wall: {
    type: 'concrete_wall',
    R: 7,
    R0: 11,
    material: 'concrete',
    description: 'Reinforced Concrete Shear Wall',
    descriptionEs: 'Muro de hormigón armado',
  },
  concrete_dual: {
    type: 'concrete_dual',
    R: 7,
    R0: 11,
    material: 'concrete',
    description: 'Reinforced Concrete Dual System (Frame + Wall)',
    descriptionEs: 'Sistema dual de hormigón armado (Pórtico + Muro)',
  },
  // Masonry
  confined_masonry: {
    type: 'confined_masonry',
    R: 4,
    R0: 4,
    material: 'masonry',
    description: 'Confined Masonry Wall',
    descriptionEs: 'Muro de albañilería confinada',
  },
  reinforced_masonry_solid: {
    type: 'reinforced_masonry_solid',
    R: 4,
    R0: 4,
    material: 'masonry',
    description: 'Reinforced Masonry Wall (solid blocks)',
    descriptionEs: 'Muro de albañilería armada (bloques llenos)',
  },
  reinforced_masonry_hollow: {
    type: 'reinforced_masonry_hollow',
    R: 3,
    R0: 3,
    material: 'masonry',
    description: 'Reinforced Masonry Wall (hollow blocks)',
    descriptionEs: 'Muro de albañilería armada (bloques huecos)',
  },
  // Wood
  wood_wall: {
    type: 'wood_wall',
    R: 5.5,
    R0: 7,
    material: 'wood',
    description: 'Wood Frame Wall',
    descriptionEs: 'Muro de madera',
  },
};

// ============================================================
// SPECTRAL ACCELERATION CALCULATION
// ============================================================

export interface NCh433Parameters {
  zone: ChileanSeismicZone;
  soilType: ChileanSoilType;
  occupancyCategory: OccupancyCategory;
  structuralSystem: StructuralSystemType;
  Tstar?: number;  // T* - characteristic period of the structure
}

export interface SpectralAccelerationResult {
  period: number;
  Sa_elastic: number;     // Elastic spectral acceleration (g)
  Sa_design: number;      // Design spectral acceleration (g)
  alpha: number;          // Spectral shape factor
  Rstar: number;          // Effective R factor at this period
}

/**
 * Calculate the spectral shape factor α(T)
 * According to NCh433.Of96 Mod 2009 + DS61
 */
export function calculateAlpha(T: number, soil: SoilTypeData): number {
  const { T0, Tp, n } = soil;

  if (T <= Tp) {
    // Plateau region: α = 1 + 4.5 * (T/T0)^n for T ≤ T'
    // Simplified: constant plateau value
    return 2.75; // Maximum amplification
  } else {
    // Descending branch: α = 2.75 * (T'/T)^n
    return 2.75 * Math.pow(Tp / T, n);
  }
}

/**
 * Calculate R* (effective response modification factor)
 * R* depends on the period and R0
 * NCh433 Eq. 6.3.5
 */
export function calculateRstar(
  T: number,
  T0: number,
  R0: number,
  p: number
): number {
  if (T <= T0) {
    // R* increases from 1 to R0 in the range 0 to T0
    return 1 + (R0 - 1) * Math.pow(T / T0, p);
  } else {
    // R* = R0 for T > T0
    return R0;
  }
}

/**
 * Calculate elastic spectral acceleration Sa(T)
 * Sa = I · S · A0 · α(T)
 */
export function calculateElasticSa(
  T: number,
  params: NCh433Parameters
): number {
  const zone = CHILEAN_SEISMIC_ZONES[params.zone];
  const soil = CHILEAN_SOIL_TYPES[params.soilType];
  const occupancy = OCCUPANCY_CATEGORIES[params.occupancyCategory];

  if (soil.requiresSpecialStudy && params.soilType === 'F') {
    throw new Error('Soil type F requires a site-specific study');
  }

  const I = occupancy.I;
  const S = soil.S;
  const A0 = zone.A0;
  const alpha = calculateAlpha(T, soil);

  return I * S * A0 * alpha;
}

/**
 * Calculate design spectral acceleration
 * Sa_design = Sa_elastic / R*
 */
export function calculateDesignSa(
  T: number,
  params: NCh433Parameters
): SpectralAccelerationResult {
  const soil = CHILEAN_SOIL_TYPES[params.soilType];
  const system = STRUCTURAL_SYSTEMS[params.structuralSystem];

  const Sa_elastic = calculateElasticSa(T, params);
  const alpha = calculateAlpha(T, soil);
  const Rstar = calculateRstar(T, soil.T0, system.R0, soil.p);
  const Sa_design = Sa_elastic / Rstar;

  return {
    period: T,
    Sa_elastic,
    Sa_design,
    alpha,
    Rstar,
  };
}

/**
 * Generate design spectrum points
 */
export function generateDesignSpectrum(
  params: NCh433Parameters,
  options: {
    Tmin?: number;
    Tmax?: number;
    numPoints?: number;
  } = {}
): SpectralAccelerationResult[] {
  const { Tmin = 0.01, Tmax = 4.0, numPoints = 100 } = options;
  const results: SpectralAccelerationResult[] = [];

  const logTmin = Math.log10(Tmin);
  const logTmax = Math.log10(Tmax);

  for (let i = 0; i < numPoints; i++) {
    const logT = logTmin + (i / (numPoints - 1)) * (logTmax - logTmin);
    const T = Math.pow(10, logT);
    results.push(calculateDesignSa(T, params));
  }

  return results;
}

// ============================================================
// BASE SHEAR CALCULATION
// ============================================================

export interface BaseShearResult {
  C: number;          // Seismic coefficient
  Q0: number;         // Base shear (kN)
  Q0_min: number;     // Minimum base shear (kN)
  Q0_max: number;     // Maximum base shear (kN)
  Q0_design: number;  // Design base shear (kN)
}

/**
 * Calculate base shear according to NCh433
 * Q0 = C · I · P
 * Where C = S · A0 · α(T*) / (g · R*)
 */
export function calculateBaseShear(
  params: NCh433Parameters,
  buildingWeight: number,  // Total seismic weight P (kN)
  Tstar: number           // Fundamental period T* (s)
): BaseShearResult {
  const zone = CHILEAN_SEISMIC_ZONES[params.zone];
  const soil = CHILEAN_SOIL_TYPES[params.soilType];
  const occupancy = OCCUPANCY_CATEGORIES[params.occupancyCategory];
  const system = STRUCTURAL_SYSTEMS[params.structuralSystem];

  const g = 9.81; // m/s²
  const I = occupancy.I;
  const S = soil.S;
  const A0 = zone.A0;
  const alpha = calculateAlpha(Tstar, soil);
  const Rstar = calculateRstar(Tstar, soil.T0, system.R0, soil.p);

  // Seismic coefficient
  const C = (S * A0 * alpha) / Rstar;

  // Base shear
  const Q0 = C * I * buildingWeight;

  // Minimum base shear: Q0_min = I · S · A0 · P / (6g) per NCh433
  const Q0_min = (I * S * A0 * buildingWeight) / 6;

  // Maximum base shear (for very rigid structures)
  const C_max = (S * A0 * 2.75) / 1.0; // Using R* = 1 and max alpha
  const Q0_max = C_max * I * buildingWeight;

  // Design base shear
  const Q0_design = Math.max(Q0, Q0_min);

  return {
    C,
    Q0,
    Q0_min,
    Q0_max,
    Q0_design,
  };
}

// ============================================================
// DRIFT LIMITS (Límites de Deriva)
// ============================================================

export interface DriftLimit {
  category: OccupancyCategory;
  limit: number;  // Maximum drift ratio (δ/H)
  description: string;
}

/**
 * Drift limits according to NCh433
 * Tabla 5.9
 */
export const DRIFT_LIMITS: Record<OccupancyCategory, DriftLimit> = {
  I: { category: 'I', limit: 0.002, description: 'δ/H ≤ 0.002 (0.2%)' },
  II: { category: 'II', limit: 0.002, description: 'δ/H ≤ 0.002 (0.2%)' },
  III: { category: 'III', limit: 0.0015, description: 'δ/H ≤ 0.0015 (0.15%)' },
  IV: { category: 'IV', limit: 0.0015, description: 'δ/H ≤ 0.0015 (0.15%)' },
};

/**
 * Calculate amplified drift for checking
 * δ_design = Cd · δ_elastic / I
 * Where Cd = R* for NCh433
 */
export function calculateDesignDrift(
  elasticDrift: number,
  params: NCh433Parameters,
  T: number
): number {
  const soil = CHILEAN_SOIL_TYPES[params.soilType];
  const system = STRUCTURAL_SYSTEMS[params.structuralSystem];
  const occupancy = OCCUPANCY_CATEGORIES[params.occupancyCategory];

  const Rstar = calculateRstar(T, soil.T0, system.R0, soil.p);
  const I = occupancy.I;

  // Cd is taken as R* in Chilean code
  const Cd = Rstar;

  return (Cd * elasticDrift) / I;
}

// ============================================================
// LOAD COMBINATIONS (Combinaciones de Carga)
// ============================================================

export interface ChileanLoadCombination {
  name: string;
  factors: {
    D?: number;   // Dead load
    L?: number;   // Live load
    Lr?: number;  // Roof live load
    S?: number;   // Snow load
    E?: number;   // Seismic
    W?: number;   // Wind
  };
  type: 'strength' | 'service' | 'seismic';
}

/**
 * Chilean load combinations per NCh3171 and practice
 */
export const CHILEAN_LOAD_COMBINATIONS: ChileanLoadCombination[] = [
  // Strength combinations
  { name: '1.4D', factors: { D: 1.4 }, type: 'strength' },
  { name: '1.2D + 1.6L', factors: { D: 1.2, L: 1.6 }, type: 'strength' },
  { name: '1.2D + 1.6L + 0.5Lr', factors: { D: 1.2, L: 1.6, Lr: 0.5 }, type: 'strength' },
  { name: '1.2D + 1.6L + 0.5S', factors: { D: 1.2, L: 1.6, S: 0.5 }, type: 'strength' },
  { name: '1.2D + 1.6Lr + L', factors: { D: 1.2, Lr: 1.6, L: 1.0 }, type: 'strength' },
  { name: '1.2D + 1.6S + L', factors: { D: 1.2, S: 1.6, L: 1.0 }, type: 'strength' },

  // Wind combinations
  { name: '1.2D + W + L', factors: { D: 1.2, W: 1.0, L: 1.0 }, type: 'strength' },
  { name: '0.9D + W', factors: { D: 0.9, W: 1.0 }, type: 'strength' },

  // Seismic combinations (E includes overstrength where required)
  { name: '1.2D + E + L', factors: { D: 1.2, E: 1.0, L: 1.0 }, type: 'seismic' },
  { name: '1.2D + E + 0.5L', factors: { D: 1.2, E: 1.0, L: 0.5 }, type: 'seismic' },
  { name: '0.9D + E', factors: { D: 0.9, E: 1.0 }, type: 'seismic' },
  { name: '0.9D - E', factors: { D: 0.9, E: -1.0 }, type: 'seismic' },

  // Service combinations
  { name: 'D + L', factors: { D: 1.0, L: 1.0 }, type: 'service' },
  { name: 'D + 0.5L + 0.7E', factors: { D: 1.0, L: 0.5, E: 0.7 }, type: 'service' },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Classify soil based on Vs30
 */
export function classifySoilByVs30(Vs30: number): ChileanSoilType {
  if (Vs30 >= 900) return 'A';
  if (Vs30 >= 500) return 'B';
  if (Vs30 >= 350) return 'C';
  if (Vs30 >= 180) return 'D';
  return 'E';
}

/**
 * Get zone from coordinates (simplified - would need GIS data for accuracy)
 * This is a simplified approximation based on Chilean geography
 */
export function estimateZoneFromLatitude(latitude: number): ChileanSeismicZone {
  // Zone 3: Coastal and northern regions (-18° to -32° approximately)
  // Zone 2: Central regions (-32° to -43° approximately)
  // Zone 1: Southern regions (-43° and south)

  const absLat = Math.abs(latitude);

  if (absLat <= 32) return 3;
  if (absLat <= 43) return 2;
  return 1;
}

/**
 * Format spectral data for export
 */
export function formatSpectrumForExport(
  spectrum: SpectralAccelerationResult[],
  format: 'csv' | 'json' = 'json'
): string {
  if (format === 'csv') {
    const header = 'Period (s),Sa Elastic (g),Sa Design (g),Alpha,R*';
    const rows = spectrum.map(s =>
      `${s.period.toFixed(4)},${s.Sa_elastic.toFixed(6)},${s.Sa_design.toFixed(6)},${s.alpha.toFixed(4)},${s.Rstar.toFixed(4)}`
    );
    return [header, ...rows].join('\n');
  }

  return JSON.stringify(spectrum, null, 2);
}

// ============================================================
// EXPORT TYPES FOR INTEGRATION
// ============================================================

export interface NCh433SeismicParameters {
  code: 'NCh433';
  zone: ChileanSeismicZone;
  soilType: ChileanSoilType;
  occupancyCategory: OccupancyCategory;
  structuralSystem: StructuralSystemType;

  // Computed values
  A0: number;
  S: number;
  T0: number;
  Tp: number;
  n: number;
  I: number;
  R0: number;
  R: number;
}

/**
 * Create complete NCh433 parameters object
 */
export function createNCh433Parameters(
  zone: ChileanSeismicZone,
  soilType: ChileanSoilType,
  occupancyCategory: OccupancyCategory,
  structuralSystem: StructuralSystemType
): NCh433SeismicParameters {
  const zoneData = CHILEAN_SEISMIC_ZONES[zone];
  const soilData = CHILEAN_SOIL_TYPES[soilType];
  const occupancyData = OCCUPANCY_CATEGORIES[occupancyCategory];
  const systemData = STRUCTURAL_SYSTEMS[structuralSystem];

  return {
    code: 'NCh433',
    zone,
    soilType,
    occupancyCategory,
    structuralSystem,
    A0: zoneData.A0,
    S: soilData.S,
    T0: soilData.T0,
    Tp: soilData.Tp,
    n: soilData.n,
    I: occupancyData.I,
    R0: systemData.R0,
    R: systemData.R,
  };
}
