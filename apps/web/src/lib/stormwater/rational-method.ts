/**
 * Rational Method Calculator
 *
 * Q = C × i × A / 360
 *
 * Where:
 *   Q = Peak discharge (m³/s)
 *   C = Runoff coefficient (dimensionless, 0-1)
 *   i = Rainfall intensity (mm/hr)
 *   A = Contributing area (hectares)
 *
 * For Q in L/s: Q = C × i × A × 2.78
 *
 * Based on Chilean standards (MINVU, MOP)
 * Valid for catchments < 200 hectares
 */

import { calculateIntensity, findNearestStation, type StationCoefficients, type ReturnPeriod } from '../hydrology';
import { RUNOFF_COEFFICIENTS, type RunoffCoefficientEntry } from './regional-data';

// ============================================
// TYPES
// ============================================

export interface CatchmentArea {
  id: string;
  name?: string;
  area: number; // hectares
  surfaces: SurfaceArea[];
  slope?: number; // %
  flowLength?: number; // m (longest flow path)
}

export interface SurfaceArea {
  type: string; // references RUNOFF_COEFFICIENTS id
  area: number; // hectares
  customC?: number; // optional override
}

export interface RationalMethodInput {
  catchment: CatchmentArea;
  returnPeriod: ReturnPeriod;
  stormDuration?: number; // minutes, if not provided uses time of concentration
  latitude: number;
  longitude: number;
  stationCode?: string;
}

export interface RationalMethodResult {
  // Input summary
  catchmentArea: number; // ha
  weightedC: number;
  intensity: number; // mm/hr
  returnPeriod: number;
  duration: number; // minutes
  station: string;

  // Results
  peakDischarge: number; // m³/s
  peakDischargeLps: number; // L/s
  runoffVolume: number; // m³ (for the storm duration)

  // Time of concentration
  timeOfConcentration: number; // minutes

  // Surface breakdown
  surfaceBreakdown: Array<{
    type: string;
    area: number;
    coefficient: number;
    contribution: number; // L/s
  }>;

  // Validation
  warnings: string[];
  isValid: boolean;
}

// ============================================
// TIME OF CONCENTRATION
// ============================================

/**
 * Calculate time of concentration using various methods
 * Returns the average of applicable methods
 */
export function calculateTimeOfConcentration(
  area: number, // hectares
  flowLength: number, // meters
  slope: number, // percent
  isUrban: boolean = true
): { tc: number; methods: { name: string; value: number }[] } {
  const methods: { name: string; value: number }[] = [];

  // 1. Kirpich Formula (common for natural watersheds)
  // tc = 0.0195 × L^0.77 × S^(-0.385)
  // tc in minutes, L in meters, S in m/m
  const slopeFraction = slope / 100;
  if (flowLength > 0 && slopeFraction > 0) {
    const kirpich = 0.0195 * Math.pow(flowLength, 0.77) * Math.pow(slopeFraction, -0.385);
    methods.push({ name: 'Kirpich', value: Math.max(5, kirpich) });
  }

  // 2. California Culverts Practice (for small urban areas)
  // tc = 0.871 × (L³/H)^0.385
  // L in km, H in m (elevation difference)
  const elevationDiff = (slope / 100) * flowLength;
  if (flowLength > 0 && elevationDiff > 0) {
    const calCulvert = 0.871 * Math.pow(Math.pow(flowLength / 1000, 3) / elevationDiff, 0.385) * 60;
    methods.push({ name: 'California', value: Math.max(5, calCulvert) });
  }

  // 3. FAA Formula (for urban areas)
  // tc = 1.8 × (1.1 - C) × L^0.5 / S^0.333
  // C = runoff coefficient (assume 0.7 for urban)
  const cUrban = isUrban ? 0.7 : 0.4;
  if (flowLength > 0 && slope > 0) {
    const faa = 1.8 * (1.1 - cUrban) * Math.pow(flowLength / 1000, 0.5) / Math.pow(slope, 0.333) * 60;
    methods.push({ name: 'FAA', value: Math.max(5, faa) });
  }

  // 4. Simple area-based estimate (fallback)
  // tc ≈ 5 + 0.5 × √(A)  where A in hectares
  const simpleEstimate = 5 + 0.5 * Math.sqrt(area * 10000);
  methods.push({ name: 'Area-based', value: Math.max(5, simpleEstimate) });

  // Calculate average (excluding outliers)
  const values = methods.map(m => m.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return { tc: Math.round(avg), methods };
}

/**
 * Simplified tc for urban areas based on area size
 * Uses MINVU typical durations
 */
export function getTypicalDuration(areaHectares: number): number {
  if (areaHectares < 5) return 15;
  if (areaHectares < 50) return 30;
  if (areaHectares < 500) return 60;
  if (areaHectares < 2000) return 360;
  return 720;
}

// ============================================
// WEIGHTED RUNOFF COEFFICIENT
// ============================================

/**
 * Calculate area-weighted runoff coefficient
 */
export function calculateWeightedC(surfaces: SurfaceArea[]): {
  weightedC: number;
  breakdown: Array<{ type: string; area: number; c: number }>;
} {
  let totalArea = 0;
  let weightedSum = 0;
  const breakdown: Array<{ type: string; area: number; c: number }> = [];

  for (const surface of surfaces) {
    let c: number;

    if (surface.customC !== undefined) {
      c = surface.customC;
    } else {
      const coeffData = RUNOFF_COEFFICIENTS.find(rc => rc.id === surface.type);
      c = coeffData?.cTypical ?? 0.5;
    }

    totalArea += surface.area;
    weightedSum += c * surface.area;
    breakdown.push({
      type: surface.type,
      area: surface.area,
      c,
    });
  }

  const weightedC = totalArea > 0 ? weightedSum / totalArea : 0.5;

  return { weightedC, breakdown };
}

// ============================================
// RATIONAL METHOD CALCULATION
// ============================================

/**
 * Main rational method calculation
 */
export function calculateRationalMethod(input: RationalMethodInput): RationalMethodResult {
  const warnings: string[] = [];
  const { catchment, returnPeriod, latitude, longitude } = input;

  // Validate catchment size
  if (catchment.area > 200) {
    warnings.push('Catchment exceeds 200 ha - Rational Method may not be accurate');
  }
  if (catchment.area < 0.01) {
    warnings.push('Catchment area very small - check units (should be hectares)');
  }

  // Calculate total area from surfaces if not matching
  const surfaceTotal = catchment.surfaces.reduce((sum, s) => sum + s.area, 0);
  const effectiveArea = surfaceTotal > 0 ? surfaceTotal : catchment.area;

  if (Math.abs(effectiveArea - catchment.area) > 0.01 * catchment.area) {
    warnings.push(`Surface areas (${surfaceTotal.toFixed(2)} ha) don't match catchment area (${catchment.area.toFixed(2)} ha)`);
  }

  // Calculate weighted runoff coefficient
  const { weightedC, breakdown } = calculateWeightedC(catchment.surfaces);

  if (weightedC < 0.1) {
    warnings.push('Very low runoff coefficient - verify surface types');
  }
  if (weightedC > 0.95) {
    warnings.push('Very high runoff coefficient - mostly impervious surfaces');
  }

  // Calculate time of concentration
  let timeOfConc: number;
  if (catchment.flowLength && catchment.slope) {
    const tcResult = calculateTimeOfConcentration(
      effectiveArea,
      catchment.flowLength,
      catchment.slope,
      weightedC > 0.5
    );
    timeOfConc = tcResult.tc;
  } else {
    timeOfConc = getTypicalDuration(effectiveArea);
    warnings.push('Using typical duration - provide flowLength and slope for better accuracy');
  }

  // Use provided duration or calculated tc
  const duration = input.stormDuration ?? timeOfConc;

  // Get station and calculate intensity
  const station = findNearestStation(latitude, longitude);
  const intensity = calculateIntensity(station, returnPeriod, duration);

  // RATIONAL METHOD FORMULA
  // Q (m³/s) = C × i × A / 360
  // Q (L/s) = C × i × A × 2.78

  const peakDischargeLps = weightedC * intensity * effectiveArea * 2.78;
  const peakDischarge = peakDischargeLps / 1000;

  // Calculate runoff volume for storm duration
  // V = Q × t (simplified)
  // More accurate: V = C × i × A × t / 60 (mm to m, hr to min)
  const runoffVolume = (weightedC * intensity * effectiveArea * 10000 * duration) / (60 * 1000);

  // Calculate contribution from each surface
  const surfaceBreakdown = breakdown.map(s => ({
    type: s.type,
    area: s.area,
    coefficient: s.c,
    contribution: s.c * intensity * s.area * 2.78,
  }));

  return {
    catchmentArea: effectiveArea,
    weightedC,
    intensity,
    returnPeriod,
    duration,
    station: station.name,
    peakDischarge,
    peakDischargeLps,
    runoffVolume,
    timeOfConcentration: timeOfConc,
    surfaceBreakdown,
    warnings,
    isValid: warnings.length === 0 || !warnings.some(w => w.includes('exceeds')),
  };
}

// ============================================
// MODIFIED RATIONAL METHOD
// ============================================

export interface ModifiedRationalInput extends RationalMethodInput {
  stormDurations: number[]; // array of durations to calculate
}

export interface ModifiedRationalResult {
  peakResult: RationalMethodResult;
  hydrograph: Array<{
    time: number;
    discharge: number;
  }>;
  criticalDuration: number;
  maxDischarge: number;
}

/**
 * Modified Rational Method - generates a hydrograph
 * Uses trapezoidal approximation
 */
export function calculateModifiedRational(input: ModifiedRationalInput): ModifiedRationalResult {
  const results: RationalMethodResult[] = [];

  // Calculate for each duration
  for (const duration of input.stormDurations) {
    const result = calculateRationalMethod({
      ...input,
      stormDuration: duration,
    });
    results.push(result);
  }

  // Find critical duration (maximum discharge)
  let maxDischarge = 0;
  let peakResult = results[0];

  for (const result of results) {
    if (result.peakDischargeLps > maxDischarge) {
      maxDischarge = result.peakDischargeLps;
      peakResult = result;
    }
  }

  // Generate simplified hydrograph
  const criticalDuration = peakResult.duration;
  const tc = peakResult.timeOfConcentration;
  const totalTime = criticalDuration + tc;

  const hydrograph: Array<{ time: number; discharge: number }> = [];
  const timeStep = Math.max(1, Math.round(totalTime / 20));

  for (let t = 0; t <= totalTime; t += timeStep) {
    let discharge: number;

    if (t <= tc) {
      // Rising limb
      discharge = (t / tc) * maxDischarge;
    } else if (t <= criticalDuration) {
      // Peak plateau
      discharge = maxDischarge;
    } else {
      // Falling limb
      const tFall = t - criticalDuration;
      discharge = maxDischarge * (1 - tFall / tc);
    }

    hydrograph.push({
      time: t,
      discharge: Math.max(0, discharge),
    });
  }

  return {
    peakResult,
    hydrograph,
    criticalDuration,
    maxDischarge,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a simple catchment from area and land use type
 */
export function createSimpleCatchment(
  area: number,
  landUseType: string,
  name?: string
): CatchmentArea {
  return {
    id: `catchment_${Date.now()}`,
    name,
    area,
    surfaces: [{ type: landUseType, area }],
  };
}

/**
 * Create a mixed-use catchment
 */
export function createMixedCatchment(
  surfaces: Array<{ type: string; area: number }>,
  name?: string,
  slope?: number,
  flowLength?: number
): CatchmentArea {
  const totalArea = surfaces.reduce((sum, s) => sum + s.area, 0);

  return {
    id: `catchment_${Date.now()}`,
    name,
    area: totalArea,
    surfaces,
    slope,
    flowLength,
  };
}

/**
 * Format discharge for display
 */
export function formatDischarge(dischargeLps: number): string {
  if (dischargeLps < 1000) {
    return `${dischargeLps.toFixed(1)} L/s`;
  }
  return `${(dischargeLps / 1000).toFixed(3)} m³/s`;
}

/**
 * Get recommended pipe diameter for a given discharge
 * Using Manning's equation assumptions (n=0.013, S=1%, full flow)
 */
export function getRecommendedPipeDiameter(dischargeLps: number): {
  diameter: number;
  velocityCheck: boolean;
  velocity: number;
} {
  // Q = (1/n) × A × R^(2/3) × S^(1/2)
  // For circular pipe flowing full: A = πD²/4, R = D/4
  // Q = (1/n) × (πD²/4) × (D/4)^(2/3) × S^(1/2)

  const n = 0.013; // Manning's n for concrete
  const S = 0.01; // 1% slope

  // Solve for D iteratively
  const Q = dischargeLps / 1000; // m³/s
  let D = 0.1; // start with 100mm

  for (let i = 0; i < 50; i++) {
    const A = Math.PI * D * D / 4;
    const R = D / 4;
    const Qcalc = (1 / n) * A * Math.pow(R, 2/3) * Math.pow(S, 0.5);

    if (Qcalc >= Q) break;
    D += 0.05;
  }

  // Round to standard sizes
  const standardSizes = [0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.60, 0.80, 1.0, 1.2, 1.5, 2.0];
  const diameter = standardSizes.find(s => s >= D) || D;

  // Calculate velocity
  const A = Math.PI * diameter * diameter / 4;
  const velocity = Q / A;

  return {
    diameter: diameter * 1000, // mm
    velocity,
    velocityCheck: velocity >= 0.6 && velocity <= 4.0,
  };
}
