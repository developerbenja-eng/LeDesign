/**
 * Vertical Curve Design
 *
 * Calculates parabolic vertical curves for road alignments including:
 * - Crest curves (convex - ascending to descending)
 * - Sag curves (concave - descending to ascending)
 * - K-value based design
 * - Sight distance considerations
 *
 * References:
 * - AASHTO A Policy on Geometric Design (Green Book)
 * - MOP Manual de Carreteras Vol. 3
 *
 * @module road-geometry/vertical-curves
 */

import { K_VALUES_CREST, K_VALUES_SAG, STOPPING_SIGHT_DISTANCE } from '../design-tables';

// ============================================================================
// Types
// ============================================================================

export type VerticalCurveType = 'crest' | 'sag';

export interface VerticalCurveInput {
  /** Grade entering the curve (%, positive = uphill) */
  g1: number;
  /** Grade exiting the curve (%, positive = uphill) */
  g2: number;
  /** Station of PVI (Point of Vertical Intersection) */
  pviStation: number;
  /** Elevation at PVI (m) */
  pviElevation: number;
  /** Design speed (km/h) - used to determine minimum K */
  designSpeed: number;
  /** Optional: specific curve length (m). If not provided, uses minimum based on K */
  length?: number;
}

export interface VerticalCurveResult {
  /** Type of curve: crest or sag */
  type: VerticalCurveType;
  /** Curve length (m) */
  length: number;
  /** K-value used (L/A) */
  kValue: number;
  /** Algebraic difference in grades (%) */
  A: number;
  /** Grade entering (%) */
  g1: number;
  /** Grade exiting (%) */
  g2: number;
  /** Station of PVC (Point of Vertical Curvature) */
  pvcStation: number;
  /** Station of PVT (Point of Vertical Tangency) */
  pvtStation: number;
  /** Station of PVI */
  pviStation: number;
  /** Elevation at PVC (m) */
  pvcElevation: number;
  /** Elevation at PVT (m) */
  pvtElevation: number;
  /** Elevation at PVI (m) */
  pviElevation: number;
  /** High or low point station (if within curve) */
  turningPointStation?: number;
  /** High or low point elevation (if within curve) */
  turningPointElevation?: number;
  /** External distance (vertical offset from PVI to curve) */
  E: number;
  /** Rate of change of grade (% per station) */
  r: number;
  /** Minimum K-value for design speed */
  minKValue: number;
  /** Whether design meets minimum K */
  meetsMinimumK: boolean;
}

export interface ProfilePoint {
  /** Station along alignment */
  station: number;
  /** Elevation (m) */
  elevation: number;
  /** Grade at this point (%) */
  grade: number;
  /** Description */
  description?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum vertical curve length based on design speed
 * L_min = 0.6 × V (m), where V in km/h
 */
export function getAbsoluteMinimumLength(designSpeed: number): number {
  return Math.max(30, 0.6 * designSpeed);
}

/**
 * Drainage consideration: minimum grade on curve
 * For flat curves at low points, ensure drainage
 */
export const MINIMUM_GRADE_FOR_DRAINAGE = 0.3; // %

/**
 * Comfort criteria for sag curves (centripetal acceleration)
 * a = V² / (12.96 × R) where R = L / A
 * Limit: a ≤ 0.3 m/s²
 */
export const MAX_CENTRIPETAL_ACCELERATION = 0.3; // m/s²

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Design vertical curve based on grades and design speed
 */
export function designVerticalCurve(input: VerticalCurveInput): VerticalCurveResult {
  const { g1, g2, pviStation, pviElevation, designSpeed, length: specifiedLength } = input;

  // Calculate algebraic difference
  const A = Math.abs(g2 - g1);

  // Determine curve type
  const type: VerticalCurveType = g1 > g2 ? 'crest' : 'sag';

  // Get minimum K-value
  const minK = getMinimumKValue(designSpeed, type);

  // Calculate minimum length
  const minLength = A * minK;
  const absoluteMin = getAbsoluteMinimumLength(designSpeed);

  // Determine curve length
  let L = specifiedLength ?? Math.max(minLength, absoluteMin);

  // Ensure length is at least absolute minimum
  L = Math.max(L, absoluteMin);

  // Round to nearest 10m for constructability
  L = Math.ceil(L / 10) * 10;

  // Calculate actual K-value
  const K = L / A;

  // Calculate stations
  const pvcStation = pviStation - L / 2;
  const pvtStation = pviStation + L / 2;

  // Calculate elevations
  const pvcElevation = pviElevation - (g1 / 100) * (L / 2);
  const pvtElevation = pviElevation + (g2 / 100) * (L / 2);

  // Rate of change of grade
  const r = (g2 - g1) / L;

  // External distance (vertical offset at PVI)
  const E = (A / 100) * (L / 8);

  // Calculate turning point (high/low point)
  const turningPoint = calculateTurningPoint(g1, g2, L, pvcStation, pvcElevation);

  return {
    type,
    length: L,
    kValue: Math.round(K * 100) / 100,
    A,
    g1,
    g2,
    pvcStation: Math.round(pvcStation * 1000) / 1000,
    pvtStation: Math.round(pvtStation * 1000) / 1000,
    pviStation,
    pvcElevation: Math.round(pvcElevation * 1000) / 1000,
    pvtElevation: Math.round(pvtElevation * 1000) / 1000,
    pviElevation,
    turningPointStation: turningPoint?.station,
    turningPointElevation: turningPoint?.elevation,
    E: Math.round(E * 1000) / 1000,
    r: Math.round(r * 10000) / 10000,
    minKValue: minK,
    meetsMinimumK: K >= minK,
  };
}

/**
 * Get minimum K-value for design speed and curve type
 */
export function getMinimumKValue(
  designSpeed: number,
  type: VerticalCurveType
): number {
  const table = type === 'crest' ? K_VALUES_CREST : K_VALUES_SAG;
  const speeds = Object.keys(table).map(Number).sort((a, b) => a - b);

  // Interpolate if between table values
  for (let i = 0; i < speeds.length - 1; i++) {
    if (designSpeed >= speeds[i] && designSpeed <= speeds[i + 1]) {
      const ratio = (designSpeed - speeds[i]) / (speeds[i + 1] - speeds[i]);
      return table[speeds[i]] + ratio * (table[speeds[i + 1]] - table[speeds[i]]);
    }
  }

  // Edge cases
  if (designSpeed <= speeds[0]) return table[speeds[0]];
  return table[speeds[speeds.length - 1]];
}

/**
 * Calculate minimum curve length for given A and design speed
 */
export function calculateMinimumLength(
  A: number,
  designSpeed: number,
  type: VerticalCurveType
): number {
  const K = getMinimumKValue(designSpeed, type);
  const L_K = A * K;
  const L_abs = getAbsoluteMinimumLength(designSpeed);

  return Math.max(L_K, L_abs);
}

/**
 * Calculate turning point (high/low point) on vertical curve
 */
function calculateTurningPoint(
  g1: number,
  g2: number,
  L: number,
  pvcStation: number,
  pvcElevation: number
): { station: number; elevation: number } | undefined {
  // For turning point to exist within curve, grades must have opposite signs
  if (g1 * g2 >= 0) {
    // Same sign - no turning point within curve
    return undefined;
  }

  // Distance from PVC to turning point
  // x = -g1 × L / (g2 - g1)
  const x = (-g1 * L) / (g2 - g1);

  // Check if within curve
  if (x <= 0 || x >= L) {
    return undefined;
  }

  const station = pvcStation + x;

  // Elevation at turning point
  // y = y_PVC + (g1/100) × x + ((g2-g1)/(200×L)) × x²
  const r = (g2 - g1) / (200 * L);
  const elevation = pvcElevation + (g1 / 100) * x + r * x * x;

  return {
    station: Math.round(station * 1000) / 1000,
    elevation: Math.round(elevation * 1000) / 1000,
  };
}

// ============================================================================
// Elevation Calculation Functions
// ============================================================================

/**
 * Calculate elevation at any station along vertical curve
 *
 * y = y_PVC + g1 × x + ((g2 - g1) / (2L)) × x²
 *
 * Where x = station - pvcStation
 */
export function calculateElevationOnCurve(
  curve: VerticalCurveResult,
  station: number
): number {
  const { pvcStation, pvtStation, pvcElevation, g1, g2, length } = curve;

  // Check if station is within curve
  if (station < pvcStation) {
    // Before curve - on back tangent
    const dx = pvcStation - station;
    return pvcElevation - (g1 / 100) * dx;
  }

  if (station > pvtStation) {
    // After curve - on forward tangent
    const dx = station - pvtStation;
    return curve.pvtElevation + (g2 / 100) * dx;
  }

  // On curve
  const x = station - pvcStation;
  const r = (g2 - g1) / (200 * length);
  const elevation = pvcElevation + (g1 / 100) * x + r * x * x;

  return Math.round(elevation * 1000) / 1000;
}

/**
 * Calculate grade at any station along vertical curve
 */
export function calculateGradeOnCurve(
  curve: VerticalCurveResult,
  station: number
): number {
  const { pvcStation, pvtStation, g1, g2, length } = curve;

  // Before curve
  if (station < pvcStation) return g1;

  // After curve
  if (station > pvtStation) return g2;

  // On curve: g = g1 + r × x where r = (g2 - g1) / L
  const x = station - pvcStation;
  const r = (g2 - g1) / length;
  const grade = g1 + r * x;

  return Math.round(grade * 100) / 100;
}

/**
 * Generate profile points along vertical curve at specified interval
 */
export function generateCurveProfile(
  curve: VerticalCurveResult,
  interval: number = 10,
  extensionBefore: number = 50,
  extensionAfter: number = 50
): ProfilePoint[] {
  const points: ProfilePoint[] = [];

  const startStation = curve.pvcStation - extensionBefore;
  const endStation = curve.pvtStation + extensionAfter;

  let currentStation = Math.floor(startStation / interval) * interval;

  while (currentStation <= endStation) {
    const elevation = calculateElevationOnCurve(curve, currentStation);
    const grade = calculateGradeOnCurve(curve, currentStation);

    let description: string | undefined;
    if (Math.abs(currentStation - curve.pvcStation) < 0.01) {
      description = 'PVC';
    } else if (Math.abs(currentStation - curve.pvtStation) < 0.01) {
      description = 'PVT';
    } else if (Math.abs(currentStation - curve.pviStation) < 0.01) {
      description = 'PVI';
    } else if (
      curve.turningPointStation &&
      Math.abs(currentStation - curve.turningPointStation) < interval / 2
    ) {
      description = curve.type === 'crest' ? 'High Point' : 'Low Point';
    }

    points.push({
      station: Math.round(currentStation * 1000) / 1000,
      elevation,
      grade,
      description,
    });

    currentStation += interval;
  }

  // Add key points if not at interval
  const keyStations = [
    { station: curve.pvcStation, desc: 'PVC' },
    { station: curve.pviStation, desc: 'PVI' },
    { station: curve.pvtStation, desc: 'PVT' },
  ];

  if (curve.turningPointStation) {
    keyStations.push({
      station: curve.turningPointStation,
      desc: curve.type === 'crest' ? 'High Point' : 'Low Point',
    });
  }

  for (const key of keyStations) {
    // Check if already included
    const exists = points.some((p) => Math.abs(p.station - key.station) < 0.01);
    if (!exists) {
      points.push({
        station: key.station,
        elevation: calculateElevationOnCurve(curve, key.station),
        grade: calculateGradeOnCurve(curve, key.station),
        description: key.desc,
      });
    }
  }

  // Sort by station
  points.sort((a, b) => a.station - b.station);

  return points;
}

// ============================================================================
// Sight Distance Functions
// ============================================================================

/**
 * Calculate available sight distance on crest curve
 *
 * When S < L: S = √(200 × L × (√h1 + √h2)² / A)
 * When S > L: S = L/2 + 200 × (√h1 + √h2)² / A
 *
 * Where h1 = eye height (1.08m), h2 = object height (0.60m for stopping)
 */
export function calculateSightDistanceOnCrest(
  curve: VerticalCurveResult,
  eyeHeight: number = 1.08,
  objectHeight: number = 0.6
): number {
  if (curve.type !== 'crest') {
    return Infinity; // Sag curves don't restrict sight distance the same way
  }

  const L = curve.length;
  const A = curve.A;
  const h1 = eyeHeight;
  const h2 = objectHeight;

  // Calculate using S < L formula first
  const sqrtSum = Math.sqrt(h1) + Math.sqrt(h2);
  const S_short = Math.sqrt((200 * L * sqrtSum * sqrtSum) / A);

  // Check if S < L (our assumption was correct)
  if (S_short < L) {
    return Math.round(S_short * 10) / 10;
  }

  // S > L case
  const S_long = L / 2 + (200 * sqrtSum * sqrtSum) / A;
  return Math.round(S_long * 10) / 10;
}

/**
 * Calculate minimum curve length for required sight distance on crest
 */
export function calculateMinLengthForSightDistance(
  A: number,
  sightDistance: number,
  eyeHeight: number = 1.08,
  objectHeight: number = 0.6
): number {
  const S = sightDistance;
  const h1 = eyeHeight;
  const h2 = objectHeight;
  const sqrtSum = Math.sqrt(h1) + Math.sqrt(h2);

  // Assume S > L first
  const L_long = 2 * S - (200 * sqrtSum * sqrtSum) / A;

  if (L_long > 0 && S > L_long) {
    return Math.ceil(L_long);
  }

  // S < L case
  const L_short = (A * S * S) / (200 * sqrtSum * sqrtSum);
  return Math.ceil(L_short);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate vertical curve design
 */
export function validateVerticalCurve(
  curve: VerticalCurveResult,
  designSpeed: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check minimum K-value
  if (!curve.meetsMinimumK) {
    warnings.push(
      `K-value (${curve.kValue}) is below minimum (${curve.minKValue}) for ${designSpeed} km/h`
    );
  }

  // Check absolute minimum length
  const absMin = getAbsoluteMinimumLength(designSpeed);
  if (curve.length < absMin) {
    warnings.push(
      `Curve length (${curve.length}m) is below absolute minimum (${absMin}m)`
    );
  }

  // Check sight distance on crest curves
  if (curve.type === 'crest') {
    const ssd = STOPPING_SIGHT_DISTANCE[designSpeed] || 100;
    const available = calculateSightDistanceOnCrest(curve);
    if (available < ssd) {
      warnings.push(
        `Available sight distance (${available}m) is below stopping sight distance (${ssd}m)`
      );
    }
  }

  // Check drainage at low points (sag curves)
  if (curve.type === 'sag' && curve.turningPointStation) {
    // Ensure adequate grade near low point for drainage
    const gradeAtLow = calculateGradeOnCurve(curve, curve.turningPointStation);
    if (Math.abs(gradeAtLow) < MINIMUM_GRADE_FOR_DRAINAGE) {
      warnings.push(
        `Grade near low point (${gradeAtLow}%) may cause drainage issues. ` +
          `Consider minimum ${MINIMUM_GRADE_FOR_DRAINAGE}%`
      );
    }
  }

  // Check comfort on sag curves (headlight criteria implicit in K-values)
  if (curve.type === 'sag') {
    // Approximate radius: R = L / (A/100)
    const R_approx = curve.length / (curve.A / 100);
    const V_ms = designSpeed / 3.6;
    const a = (V_ms * V_ms) / R_approx;

    if (a > MAX_CENTRIPETAL_ACCELERATION) {
      warnings.push(
        `Centripetal acceleration (${a.toFixed(2)} m/s²) exceeds comfort limit ` +
          `(${MAX_CENTRIPETAL_ACCELERATION} m/s²)`
      );
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Check if grades are within acceptable limits
 */
export function validateGrades(
  g1: number,
  g2: number,
  maxGrade: number = 12
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (Math.abs(g1) > maxGrade) {
    warnings.push(`Entering grade (${g1}%) exceeds maximum (${maxGrade}%)`);
  }

  if (Math.abs(g2) > maxGrade) {
    warnings.push(`Exiting grade (${g2}%) exceeds maximum (${maxGrade}%)`);
  }

  const A = Math.abs(g2 - g1);
  if (A > 2 * maxGrade) {
    warnings.push(
      `Algebraic difference (${A}%) is unusually large. Consider intermediate grade breaks.`
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate required K-value for passing sight distance
 * (Used for crest curves on two-lane highways)
 */
export function getPassingKValue(designSpeed: number): number {
  // Passing K-values are much larger than stopping K-values
  // Approximate: K_passing ≈ 4 × K_stopping
  const K_stopping = getMinimumKValue(designSpeed, 'crest');
  return K_stopping * 4;
}

/**
 * Calculate equal tangent curve (standard parabolic)
 * This is the default - tangents on each side are equal
 */
export function isEqualTangentCurve(curve: VerticalCurveResult): boolean {
  const halfLength = curve.length / 2;
  const distToPVI = Math.abs(curve.pviStation - curve.pvcStation);
  return Math.abs(distToPVI - halfLength) < 0.1;
}

/**
 * Design unsymmetrical vertical curve
 * When different lengths are needed on each side of PVI
 */
export function designUnsymmetricalCurve(
  g1: number,
  g2: number,
  pviStation: number,
  pviElevation: number,
  L1: number, // Length before PVI
  L2: number // Length after PVI
): VerticalCurveResult & { L1: number; L2: number } {
  const A = Math.abs(g2 - g1);
  const L = L1 + L2;
  const type: VerticalCurveType = g1 > g2 ? 'crest' : 'sag';

  // Stations
  const pvcStation = pviStation - L1;
  const pvtStation = pviStation + L2;

  // Elevations
  const pvcElevation = pviElevation - (g1 / 100) * L1;
  const pvtElevation = pviElevation + (g2 / 100) * L2;

  // For unsymmetrical, use equivalent L for K calculation
  const L_equiv = (2 * L1 * L2) / (L1 + L2);
  const K = L_equiv / A;

  // External distance (different formula for unsymmetrical)
  const E = ((g1 - g2) / 100) * L1 * L2 / (2 * L);

  const minK = getMinimumKValue(60, type); // Use 60 km/h as default

  return {
    type,
    length: L,
    L1,
    L2,
    kValue: Math.round(K * 100) / 100,
    A,
    g1,
    g2,
    pvcStation,
    pvtStation,
    pviStation,
    pvcElevation: Math.round(pvcElevation * 1000) / 1000,
    pvtElevation: Math.round(pvtElevation * 1000) / 1000,
    pviElevation,
    E: Math.round(Math.abs(E) * 1000) / 1000,
    r: Math.round(((g2 - g1) / L) * 10000) / 10000,
    minKValue: minK,
    meetsMinimumK: K >= minK,
  };
}
