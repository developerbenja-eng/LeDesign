// ============================================================
// NCh431:2010 - Chilean Snow Load Code
// Diseño Estructural - Cargas de Nieve
// ============================================================
// Reference: NCh431:2010 (based on ASCE 7 Chapter 7)
// Note: NCh431:2025 update in consultation phase
// Sources:
// - https://www.ingenieros.cl/bebuilder-59102-59102/
// - https://www.studocu.com/cl/document/universidad-de-santiago-de-chile/fundamentos-de-diseno-estructural/nch0431-2010-nieve-norma-chilena/14330597
// ============================================================

// ============================================================
// GROUND SNOW LOAD (Carga Básica de Nieve)
// ============================================================

/**
 * Calculate ground snow load pg based on altitude and longitude
 * NCh431:2010 Section 5
 *
 * @param altitude - Altitude above sea level (m)
 * @param longitude - Geographic longitude (negative for Chile)
 * @returns Ground snow load pg (kN/m²)
 */
export function calculateGroundSnowLoad(
  altitude: number,
  longitude: number
): number {
  // Longitude zones for Chile (all west, negative values)
  const absLon = Math.abs(longitude);

  // Ground snow load formula varies by zone
  // These are approximations based on NCh431 tables

  if (absLon < 70) {
    // Northern interior (lower snow loads)
    if (altitude < 2000) return 0;
    if (altitude < 3000) return 0.25 + (altitude - 2000) * 0.001;
    return 1.25 + (altitude - 3000) * 0.002;
  } else if (absLon < 72) {
    // Central zone
    if (altitude < 1500) return 0;
    if (altitude < 2500) return 0.25 + (altitude - 1500) * 0.0015;
    return 1.75 + (altitude - 2500) * 0.002;
  } else {
    // Southern zone (higher snow loads)
    if (altitude < 500) return 0.25;
    if (altitude < 1500) return 0.25 + (altitude - 500) * 0.002;
    return 2.25 + (altitude - 1500) * 0.003;
  }
}

/**
 * Check if location is in "normal" snow zone
 * (areas where it snows annually or pg > 0.25 kN/m²)
 */
export function isNormalSnowZone(pg: number): boolean {
  return pg > 0.25;
}

// ============================================================
// EXPOSURE FACTOR (Ce)
// ============================================================

export type SnowExposureCategory = 'fully_exposed' | 'partially_exposed' | 'sheltered';
export type TerrainCategory = 'B' | 'C' | 'D';

export interface SnowExposureData {
  category: SnowExposureCategory;
  Ce_warm: number;      // Ce for terrain B (urban)
  Ce_cold: number;      // Ce for terrain C/D (open)
  description: string;
}

/**
 * Exposure factor Ce
 * NCh431:2010 Tabla 4
 */
export const SNOW_EXPOSURE_FACTORS: Record<SnowExposureCategory, SnowExposureData> = {
  fully_exposed: {
    category: 'fully_exposed',
    Ce_warm: 0.9,
    Ce_cold: 0.8,
    description: 'Fully exposed - No shelter from wind',
  },
  partially_exposed: {
    category: 'partially_exposed',
    Ce_warm: 1.0,
    Ce_cold: 1.0,
    description: 'Partially exposed - Some nearby obstructions',
  },
  sheltered: {
    category: 'sheltered',
    Ce_warm: 1.2,
    Ce_cold: 1.2,
    description: 'Sheltered - Dense obstructions within 10h',
  },
};

/**
 * Get exposure factor Ce based on terrain and exposure
 */
export function getExposureFactor(
  exposure: SnowExposureCategory,
  terrain: TerrainCategory
): number {
  const data = SNOW_EXPOSURE_FACTORS[exposure];
  return terrain === 'B' ? data.Ce_warm : data.Ce_cold;
}

// ============================================================
// THERMAL FACTOR (Ct)
// ============================================================

export type ThermalCondition =
  | 'heated'              // Heated structure
  | 'unheated_enclosed'   // Unheated but enclosed
  | 'open'                // Open-air structure
  | 'freezer'             // Freezer or cold storage
  | 'greenhouse';         // Greenhouse (heated)

export interface ThermalFactorData {
  condition: ThermalCondition;
  Ct: number;
  description: string;
}

/**
 * Thermal factor Ct
 * NCh431:2010 Tabla 2
 */
export const THERMAL_FACTORS: Record<ThermalCondition, ThermalFactorData> = {
  heated: {
    condition: 'heated',
    Ct: 1.0,
    description: 'Heated structures (continuous heating)',
  },
  unheated_enclosed: {
    condition: 'unheated_enclosed',
    Ct: 1.1,
    description: 'Unheated structures (enclosed)',
  },
  open: {
    condition: 'open',
    Ct: 1.2,
    description: 'Open-air structures',
  },
  freezer: {
    condition: 'freezer',
    Ct: 1.3,
    description: 'Freezers and refrigerated structures',
  },
  greenhouse: {
    condition: 'greenhouse',
    Ct: 0.85,
    description: 'Continuously heated greenhouses',
  },
};

// ============================================================
// IMPORTANCE FACTOR (Is)
// ============================================================

export type SnowRiskCategory = 'I' | 'II' | 'III' | 'IV';

export interface SnowImportanceData {
  category: SnowRiskCategory;
  Is: number;
  description: string;
  examples: string[];
}

/**
 * Snow importance factor Is
 * NCh431:2010 Tabla 3
 */
export const SNOW_IMPORTANCE_FACTORS: Record<SnowRiskCategory, SnowImportanceData> = {
  I: {
    category: 'I',
    Is: 0.8,
    description: 'Low hazard to human life',
    examples: ['Agricultural facilities', 'Minor storage'],
  },
  II: {
    category: 'II',
    Is: 1.0,
    description: 'Standard occupancy',
    examples: ['Residential', 'Commercial', 'Industrial'],
  },
  III: {
    category: 'III',
    Is: 1.1,
    description: 'High occupancy or assembly',
    examples: ['Schools', 'Churches', 'Theaters'],
  },
  IV: {
    category: 'IV',
    Is: 1.2,
    description: 'Essential facilities',
    examples: ['Hospitals', 'Fire stations', 'Emergency response'],
  },
};

// ============================================================
// SLOPE FACTOR (Cs)
// ============================================================

export type RoofSurface = 'slippery' | 'non_slippery' | 'obstructed';

export interface SlopeFactorParams {
  slope: number;              // Roof slope in degrees
  surface: RoofSurface;
  Ct: number;                 // Thermal factor
  isUnobstructed: boolean;    // No obstructions to sliding
}

/**
 * Calculate slope factor Cs
 * NCh431:2010 Figura 1 / ASCE 7 Figure 7.4-1
 */
export function calculateSlopeFactor(params: SlopeFactorParams): number {
  const { slope, surface, Ct, isUnobstructed } = params;

  // For obstructed roofs or non-slippery surfaces, use warm roof curve
  if (!isUnobstructed || surface === 'obstructed') {
    // Warm roof curve
    if (slope <= 5) return 1.0;
    if (slope >= 70) return 0;
    return 1.0 - (slope - 5) / 65;
  }

  // For slippery surfaces with Ct < 1.0
  if (surface === 'slippery' && Ct < 1.0) {
    // Cold roof, slippery
    if (slope <= 15) return 1.0;
    if (slope >= 70) return 0;
    return 1.0 - (slope - 15) / 55;
  }

  // Cold roof, non-slippery
  if (Ct >= 1.0) {
    if (slope <= 37.5) return 1.0;
    if (slope >= 70) return 0;
    return 1.0 - (slope - 37.5) / 32.5;
  }

  // Default warm roof
  if (slope <= 5) return 1.0;
  if (slope >= 70) return 0;
  return 1.0 - (slope - 5) / 65;
}

// ============================================================
// FLAT ROOF SNOW LOAD
// ============================================================

export interface SnowLoadParams {
  altitude: number;
  longitude: number;
  exposure: SnowExposureCategory;
  terrain: TerrainCategory;
  thermalCondition: ThermalCondition;
  riskCategory: SnowRiskCategory;
  roofSlope?: number;
  roofSurface?: RoofSurface;
  isUnobstructed?: boolean;
}

export interface FlatRoofSnowLoadResult {
  pg: number;       // Ground snow load (kN/m²)
  Ce: number;       // Exposure factor
  Ct: number;       // Thermal factor
  Is: number;       // Importance factor
  pf: number;       // Flat roof snow load (kN/m²)
}

/**
 * Calculate flat roof snow load pf
 * pf = 0.7 * Ce * Ct * Is * pg
 * NCh431:2010 Equation 5.1
 */
export function calculateFlatRoofSnowLoad(
  params: SnowLoadParams
): FlatRoofSnowLoadResult {
  const pg = calculateGroundSnowLoad(params.altitude, params.longitude);
  const Ce = getExposureFactor(params.exposure, params.terrain);
  const Ct = THERMAL_FACTORS[params.thermalCondition].Ct;
  const Is = SNOW_IMPORTANCE_FACTORS[params.riskCategory].Is;

  // Flat roof snow load
  const pf = 0.7 * Ce * Ct * Is * pg;

  return { pg, Ce, Ct, Is, pf };
}

// ============================================================
// SLOPED ROOF SNOW LOAD
// ============================================================

export interface SlopedRoofSnowLoadResult extends FlatRoofSnowLoadResult {
  Cs: number;       // Slope factor
  ps: number;       // Sloped roof snow load (kN/m²)
}

/**
 * Calculate sloped roof snow load ps
 * ps = Cs * pf
 * NCh431:2010 Section 6
 */
export function calculateSlopedRoofSnowLoad(
  params: SnowLoadParams
): SlopedRoofSnowLoadResult {
  const flatResult = calculateFlatRoofSnowLoad(params);

  const Cs = calculateSlopeFactor({
    slope: params.roofSlope || 0,
    surface: params.roofSurface || 'non_slippery',
    Ct: flatResult.Ct,
    isUnobstructed: params.isUnobstructed ?? false,
  });

  const ps = Cs * flatResult.pf;

  return { ...flatResult, Cs, ps };
}

// ============================================================
// UNBALANCED SNOW LOADS
// ============================================================

export interface UnbalancedSnowLoadResult {
  ps_balanced: number;      // Balanced load (kN/m²)
  ps_unbalanced_low: number;  // Low side unbalanced (kN/m²)
  ps_unbalanced_high: number; // High side unbalanced (kN/m²)
  hdrift: number;           // Drift height (m)
}

/**
 * Calculate unbalanced snow loads for gable/hip roofs
 * NCh431:2010 Section 7
 */
export function calculateUnbalancedSnowLoad(
  params: SnowLoadParams,
  roofWidth: number   // Width of roof slope (m)
): UnbalancedSnowLoadResult {
  const slopedResult = calculateSlopedRoofSnowLoad(params);
  const slope = params.roofSlope || 0;

  // For slopes < 2.4° (approx 4% or 1:24), no unbalanced load
  if (slope < 2.4 || slope > 70) {
    return {
      ps_balanced: slopedResult.ps,
      ps_unbalanced_low: slopedResult.ps,
      ps_unbalanced_high: slopedResult.ps,
      hdrift: 0,
    };
  }

  // Unbalanced load factor
  // Low side: 0.3 * ps
  // High side: ps + drift surcharge

  const ps = slopedResult.ps;
  const pg = slopedResult.pg;

  // Drift height approximation
  const gamma = 0.43 * Math.pow(pg, 0.5) + 2.2; // Snow density (kN/m³)
  const hb = ps / gamma; // Balanced snow depth
  const lu = roofWidth; // Upwind fetch

  // Drift surcharge
  const hdrift = Math.min(
    1.2 * Math.pow(lu, 0.35) * Math.pow(pg + 0.25, 0.35) - 0.13,
    hb
  );

  const pdrift = hdrift * gamma;

  return {
    ps_balanced: ps,
    ps_unbalanced_low: 0.3 * ps,
    ps_unbalanced_high: ps + pdrift,
    hdrift,
  };
}

// ============================================================
// RAIN-ON-SNOW SURCHARGE
// ============================================================

/**
 * Calculate rain-on-snow surcharge
 * Applies to roofs with slope < 2.4° in areas with pg < 1.0 kN/m²
 * NCh431:2010 Section 5.2
 */
export function calculateRainOnSnowSurcharge(
  pg: number,
  roofSlope: number
): number {
  // Rain-on-snow only applies for:
  // - Ground snow load < 1.0 kN/m²
  // - Roof slope < 2.4° (approximately flat)
  if (pg >= 1.0 || roofSlope >= 2.4) {
    return 0;
  }

  // Surcharge = 0.24 kN/m²
  return 0.24;
}

// ============================================================
// MINIMUM SNOW LOAD
// ============================================================

/**
 * Get minimum snow load for low-slope roofs
 * NCh431:2010 Section 5.3
 */
export function getMinimumSnowLoad(
  pg: number,
  Is: number,
  roofSlope: number
): number {
  // For low-slope roofs (slope ≤ 15°)
  if (roofSlope > 15) {
    return 0;
  }

  // pm = Is * pg for pg ≤ 0.96 kN/m²
  // pm = Is * 0.96 for pg > 0.96 kN/m²
  return Is * Math.min(pg, 0.96);
}

// ============================================================
// COMPLETE SNOW LOAD ANALYSIS
// ============================================================

export interface SnowLoadAnalysisResult {
  groundSnowLoad: number;           // pg (kN/m²)
  flatRoofLoad: number;             // pf (kN/m²)
  slopedRoofLoad: number;           // ps (kN/m²)
  minimumLoad: number;              // pm (kN/m²)
  rainOnSnowSurcharge: number;      // (kN/m²)
  designLoad: number;               // Maximum design load (kN/m²)
  factors: {
    Ce: number;
    Ct: number;
    Is: number;
    Cs: number;
  };
  isNormalSnowZone: boolean;
  requiresDriftAnalysis: boolean;
}

/**
 * Perform complete snow load analysis
 */
export function analyzeSnowLoads(
  params: SnowLoadParams
): SnowLoadAnalysisResult {
  const slopedResult = calculateSlopedRoofSnowLoad(params);
  const rainOnSnow = calculateRainOnSnowSurcharge(
    slopedResult.pg,
    params.roofSlope || 0
  );
  const minimum = getMinimumSnowLoad(
    slopedResult.pg,
    slopedResult.Is,
    params.roofSlope || 0
  );

  // Design load is maximum of sloped load and minimum load
  const designLoad = Math.max(
    slopedResult.ps + rainOnSnow,
    minimum
  );

  // Drift analysis required for buildings with:
  // - Roof steps/levels
  // - Parapet walls
  // - Adjacent taller structures
  const requiresDriftAnalysis = slopedResult.pg > 0.25 && (params.roofSlope || 0) < 70;

  return {
    groundSnowLoad: slopedResult.pg,
    flatRoofLoad: slopedResult.pf,
    slopedRoofLoad: slopedResult.ps,
    minimumLoad: minimum,
    rainOnSnowSurcharge: rainOnSnow,
    designLoad,
    factors: {
      Ce: slopedResult.Ce,
      Ct: slopedResult.Ct,
      Is: slopedResult.Is,
      Cs: slopedResult.Cs,
    },
    isNormalSnowZone: isNormalSnowZone(slopedResult.pg),
    requiresDriftAnalysis,
  };
}

// ============================================================
// EXPORT TYPES
// ============================================================

export interface NCh431SnowParameters {
  code: 'NCh431';
  version: '2010';
  altitude: number;
  longitude: number;
  groundSnowLoad: number;     // pg (kN/m²)
  exposure: SnowExposureCategory;
  terrain: TerrainCategory;
  thermalCondition: ThermalCondition;
  riskCategory: SnowRiskCategory;
  exposureFactor: number;     // Ce
  thermalFactor: number;      // Ct
  importanceFactor: number;   // Is
}

/**
 * Create complete NCh431 snow parameters object
 */
export function createNCh431SnowParameters(
  altitude: number,
  longitude: number,
  exposure: SnowExposureCategory,
  terrain: TerrainCategory,
  thermalCondition: ThermalCondition,
  riskCategory: SnowRiskCategory
): NCh431SnowParameters {
  const pg = calculateGroundSnowLoad(altitude, longitude);
  const Ce = getExposureFactor(exposure, terrain);
  const Ct = THERMAL_FACTORS[thermalCondition].Ct;
  const Is = SNOW_IMPORTANCE_FACTORS[riskCategory].Is;

  return {
    code: 'NCh431',
    version: '2010',
    altitude,
    longitude,
    groundSnowLoad: pg,
    exposure,
    terrain,
    thermalCondition,
    riskCategory,
    exposureFactor: Ce,
    thermalFactor: Ct,
    importanceFactor: Is,
  };
}
