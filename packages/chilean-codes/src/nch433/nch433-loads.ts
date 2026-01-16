// ============================================================
// NCh433 SEISMIC LOAD AUTO-GENERATION
// Automatic generation of equivalent static seismic loads per NCh433
// ============================================================

import { generateNCh433DesignSpectrum, calculateApproximatePeriod } from './nch433-spectrum';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface SeismicMassInput {
  dead_load: number; // Dead load at level
  live_load: number; // Live load at level
  live_load_factor?: number; // Percentage of live load to include (default: 0.25)
}

export interface FloorLevel {
  story_id: string;
  elevation: number; // Height above base
  seismic_mass: number; // Total seismic mass at level (kN-s²/m or equivalent)
}

export interface SeismicLoadDistribution {
  story_id: string;
  elevation: number;
  force_x: number; // Lateral force in X direction
  force_y: number; // Lateral force in Y direction
  torque_accidental: number; // Accidental torsion moment
}

export interface NCh433SeismicLoadInput {
  // Code parameters
  zone: 1 | 2 | 3;
  soilType: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  occupancy: 'I' | 'II' | 'III' | 'IV';
  structuralSystem: string;
  R0?: number; // Response modification factor (if not using standard system)

  // Building geometry
  height: number; // Total building height (m)
  floors: FloorLevel[]; // Floor data with elevations and seismic masses

  // Optional parameters
  approximate_period?: number; // If known, otherwise will calculate
  accidental_eccentricity_factor?: number; // Default: 0.05 (5%)
}

export interface SeismicLoadResult {
  // Design parameters
  design_spectrum_Sa: number; // Spectral acceleration at T1
  fundamental_period: number; // T1
  base_shear: number; // Total base shear (kN)

  // Load distribution
  floor_loads: SeismicLoadDistribution[];

  // Code parameters used
  A0: number;
  S: number;
  I: number;
  R0: number;
  T0: number;
  Tp: number;
  n: number;
}

// ============================================================
// SEISMIC MASS CALCULATION
// ============================================================

/**
 * Calculate seismic mass at a floor level per NCh433
 * Seismic mass = Dead load + percentage of live load
 * Default: 25% of live load (NCh433 5.6.2)
 */
export function calculateSeismicMass(input: SeismicMassInput): number {
  const liveLoadFactor = input.live_load_factor ?? 0.25;
  return input.dead_load + liveLoadFactor * input.live_load;
}

// ============================================================
// BASE SHEAR CALCULATION
// ============================================================

/**
 * Calculate total seismic weight for base shear calculation
 * W = Σ(seismic masses at all levels)
 */
export function calculateTotalSeismicWeight(floors: FloorLevel[]): number {
  return floors.reduce((sum, floor) => sum + floor.seismic_mass, 0);
}

/**
 * Calculate design base shear per NCh433
 * V = (I * Sa / R0) * W
 * Where:
 * - I = importance factor
 * - Sa = spectral acceleration at T1
 * - R0 = response modification factor
 * - W = total seismic weight
 */
export function calculateSeismicBaseShear(
  Sa: number,
  I: number,
  R0: number,
  W: number
): number {
  return (I * Sa / R0) * W;
}

// ============================================================
// VERTICAL DISTRIBUTION OF SEISMIC FORCES
// ============================================================

/**
 * Calculate vertical distribution factor k per NCh433
 * k = 1.0 for T ≤ 0.5s
 * k = 0.75 + 0.5*T for 0.5s < T ≤ 2.5s
 * k = 2.0 for T > 2.5s
 */
export function calculateVerticalDistributionExponent(T: number): number {
  if (T <= 0.5) return 1.0;
  if (T <= 2.5) return 0.75 + 0.5 * T;
  return 2.0;
}

/**
 * Distribute base shear vertically to floor levels per NCh433 5.6.3
 * Fx = V * (Wx * Hx^k) / Σ(Wi * Hi^k)
 * Where:
 * - Fx = lateral force at level x
 * - V = base shear
 * - Wx = seismic weight at level x
 * - Hx = height of level x above base
 * - k = distribution exponent (function of period)
 */
export function distributeSeismicForces(
  baseShear: number,
  floors: FloorLevel[],
  k: number
): number[] {
  // Calculate denominator: Σ(Wi * Hi^k)
  const sumWeightHeight = floors.reduce(
    (sum, floor) => sum + floor.seismic_mass * Math.pow(floor.elevation, k),
    0
  );

  // Calculate force at each level
  return floors.map(floor => {
    return baseShear * (floor.seismic_mass * Math.pow(floor.elevation, k)) / sumWeightHeight;
  });
}

// ============================================================
// ACCIDENTAL TORSION
// ============================================================

/**
 * Calculate accidental torsion per NCh433 5.9.3
 * Ma = ± eacc * Fx
 * Where:
 * - eacc = accidental eccentricity = 0.05 * B (5% of building dimension perpendicular to load)
 * - Fx = lateral force at level x
 *
 * For simplified analysis, we use a factor approach where torque is applied at each level
 */
export function calculateAccidentalTorsion(
  force: number,
  buildingDimension: number,
  eccentricityFactor: number = 0.05
): number {
  return eccentricityFactor * buildingDimension * force;
}

// ============================================================
// MAIN SEISMIC LOAD GENERATION
// ============================================================

/**
 * Generate equivalent static seismic loads per NCh433
 * Returns lateral forces and torsional moments at each floor level
 */
export function generateNCh433SeismicLoads(
  input: NCh433SeismicLoadInput
): SeismicLoadResult {
  // Step 1: Generate design spectrum
  const spectrumResult = generateNCh433DesignSpectrum({
    zone: input.zone,
    soilType: input.soilType,
    occupancy: input.occupancy,
    structuralSystem: input.structuralSystem as any,
    R0: input.R0,
  });

  const { params } = spectrumResult;

  // Extract NCh433 parameters
  const A0 = params.nch433_A0 || 0;
  const S = params.nch433_S || 0;
  const I = params.nch433_I || 1;
  const R0 = params.nch433_R0 || 1;
  const T0 = params.nch433_T0 || 0;
  const Tp = params.nch433_Tp || 0;
  const n = params.nch433_n || 1;

  // Step 2: Calculate or use provided fundamental period
  const T1 = input.approximate_period ?? calculateApproximatePeriod({
    height: input.height,
    structuralSystem: input.structuralSystem as any,
  });

  // Step 3: Get spectral acceleration at T1
  // Find Sa from spectrum at period T1
  const spectrum = spectrumResult.points;
  let Sa: number;

  // Linear interpolation
  const idx = spectrum.findIndex(p => p.period >= T1);
  if (idx === -1) {
    // T1 is beyond spectrum range, use last point
    Sa = spectrum[spectrum.length - 1].acceleration;
  } else if (idx === 0) {
    // T1 is before spectrum range, use first point
    Sa = spectrum[0].acceleration;
  } else {
    // Interpolate
    const p1 = spectrum[idx - 1];
    const p2 = spectrum[idx];
    const ratio = (T1 - p1.period) / (p2.period - p1.period);
    Sa = p1.acceleration + ratio * (p2.acceleration - p1.acceleration);
  }

  // Step 4: Calculate total seismic weight
  const W = calculateTotalSeismicWeight(input.floors);

  // Step 5: Calculate base shear
  const V = calculateSeismicBaseShear(Sa, I, R0, W);

  // Step 6: Calculate vertical distribution exponent
  const k = calculateVerticalDistributionExponent(T1);

  // Step 7: Distribute forces vertically
  const forces = distributeSeismicForces(V, input.floors, k);

  // Step 8: Calculate accidental eccentricity factor (typically 5% of building dimension)
  const eccentricityFactor = input.accidental_eccentricity_factor ?? 0.05;

  // Step 9: Create floor load distribution
  // Note: We assume a square building for now; in practice, this would use actual dimensions
  const estimatedBuildingDimension = Math.sqrt(W / input.floors.length); // Rough estimate

  const floorLoads: SeismicLoadDistribution[] = input.floors.map((floor, i) => ({
    story_id: floor.story_id,
    elevation: floor.elevation,
    force_x: forces[i],
    force_y: forces[i], // Same magnitude in Y direction (applied separately)
    torque_accidental: calculateAccidentalTorsion(
      forces[i],
      estimatedBuildingDimension,
      eccentricityFactor
    ),
  }));

  return {
    design_spectrum_Sa: Sa,
    fundamental_period: T1,
    base_shear: V,
    floor_loads: floorLoads,
    A0,
    S,
    I,
    R0,
    T0,
    Tp,
    n,
  };
}

/**
 * Helper function to create seismic load cases from generated loads
 * Returns load case data that can be inserted into database
 */
export interface SeismicLoadCaseData {
  name: string;
  description: string;
  load_type: 'seismic';
  direction: 'X' | 'Y';
  floor_loads: {
    story_id: string;
    force: number;
    torque?: number;
  }[];
}

export function createSeismicLoadCases(
  result: SeismicLoadResult,
  includeAccidentalTorsion: boolean = true
): SeismicLoadCaseData[] {
  const loadCases: SeismicLoadCaseData[] = [];

  // Seismic X direction
  loadCases.push({
    name: 'EQ_X',
    description: `NCh433 Seismic Load in X direction (Zone ${result.A0/0.2}, T1=${result.fundamental_period.toFixed(3)}s, V=${result.base_shear.toFixed(1)}kN)`,
    load_type: 'seismic',
    direction: 'X',
    floor_loads: result.floor_loads.map(fl => ({
      story_id: fl.story_id,
      force: fl.force_x,
      torque: includeAccidentalTorsion ? fl.torque_accidental : undefined,
    })),
  });

  // Seismic Y direction
  loadCases.push({
    name: 'EQ_Y',
    description: `NCh433 Seismic Load in Y direction (Zone ${result.A0/0.2}, T1=${result.fundamental_period.toFixed(3)}s, V=${result.base_shear.toFixed(1)}kN)`,
    load_type: 'seismic',
    direction: 'Y',
    floor_loads: result.floor_loads.map(fl => ({
      story_id: fl.story_id,
      force: fl.force_y,
      torque: includeAccidentalTorsion ? fl.torque_accidental : undefined,
    })),
  });

  return loadCases;
}
