/**
 * Transition Curve (Spiral/Clothoid) Design
 *
 * Implements transition curves for gradual introduction of curvature:
 * - Clothoid (Euler spiral) calculations
 * - Minimum spiral length
 * - Spiral-curve-spiral (SCS) layouts
 *
 * The clothoid has the property that curvature increases linearly with length:
 * R × L = A² (constant)
 *
 * References:
 * - AASHTO A Policy on Geometric Design (Green Book)
 * - MOP Manual de Carreteras Vol. 3
 *
 * @module road-geometry/transition-curves
 */

import { MAXIMUM_RELATIVE_GRADIENT } from './superelevation';
import { getLateralFriction } from './design-tables';

// ============================================================================
// Types
// ============================================================================

export interface Point2D {
  x: number;
  y: number;
}

export interface TransitionCurveInput {
  /** Design speed (km/h) */
  designSpeed: number;
  /** Radius of circular curve (m) */
  radius: number;
  /** Road/lane width for superelevation transition (m) */
  roadWidth: number;
  /** Maximum superelevation (%) */
  maxSuperelevation?: number;
  /** Spiral length (m) - if not provided, minimum is calculated */
  spiralLength?: number;
}

export interface TransitionCurveResult {
  /** Spiral parameter A (m) - R × Ls = A² */
  A: number;
  /** Spiral length (m) */
  spiralLength: number;
  /** Minimum spiral length (m) */
  minimumLength: number;
  /** Total spiral deflection angle (degrees) */
  spiralAngle: number;
  /** Tangent distance from TS to SC (m) */
  X: number;
  /** Offset from tangent at SC (m) */
  Y: number;
  /** Long tangent (m) */
  longTangent: number;
  /** Short tangent (m) */
  shortTangent: number;
  /** Shift of circular curve (p) (m) */
  p: number;
  /** Throw (k) - tangent distance to shifted PC (m) */
  k: number;
  /** Total tangent for spiral-curve-spiral (m) */
  Ts: number;
  /** Rate of change of centripetal acceleration (m/s³) */
  C: number;
  /** Meets minimum length requirements */
  meetsMinimum: boolean;
}

export interface SpiralStation {
  /** Station along spiral from TS */
  station: number;
  /** Local x coordinate (along tangent) */
  x: number;
  /** Local y coordinate (offset from tangent) */
  y: number;
  /** Deflection angle at this point (degrees) */
  deflection: number;
  /** Instantaneous radius at this point (m) */
  radius: number;
  /** Chord length from TS (m) */
  chord: number;
  /** Spiral angle at this point (degrees) */
  spiralAngle: number;
}

export interface SpiralCurveSpiralInput {
  /** Design speed (km/h) */
  designSpeed: number;
  /** Circular curve radius (m) */
  radius: number;
  /** Central angle of circular portion (degrees) */
  circularAngle: number;
  /** Entry spiral length (m) */
  spiralLengthEntry: number;
  /** Exit spiral length (m) - if different from entry */
  spiralLengthExit?: number;
  /** Station of TS (Tangent to Spiral) */
  tsStation: number;
}

export interface SpiralCurveSpiralResult {
  /** Entry spiral parameters */
  entrySpiral: TransitionCurveResult;
  /** Exit spiral parameters */
  exitSpiral: TransitionCurveResult;
  /** Circular curve length (m) */
  circularLength: number;
  /** Total curve length (m) */
  totalLength: number;
  /** Total deflection angle (degrees) */
  totalAngle: number;
  /** Key stations */
  stations: {
    TS: number; // Tangent to Spiral (entry)
    SC: number; // Spiral to Curve
    CS: number; // Curve to Spiral
    ST: number; // Spiral to Tangent (exit)
  };
  /** Total tangent distance (m) */
  totalTangent: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum rate of change of centripetal acceleration (m/s³)
 * AASHTO recommends C = 0.3 to 1.0, commonly 0.6
 */
export const MAX_RATE_OF_CHANGE_ACCELERATION = {
  comfort: 0.3, // Highest comfort
  normal: 0.6, // Normal design
  minimum: 1.0, // Minimum acceptable
};

/**
 * Minimum spiral angle (radians)
 * For effective transition, spiral angle should be at least 3°
 */
export const MINIMUM_SPIRAL_ANGLE = 3; // degrees

/**
 * Maximum spiral angle (radians)
 * Spiral angle should not exceed 1/3 of total curve
 */
export const MAXIMUM_SPIRAL_ANGLE_RATIO = 1 / 3;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Design transition curve (spiral/clothoid)
 */
export function designTransitionCurve(
  input: TransitionCurveInput
): TransitionCurveResult {
  const {
    designSpeed,
    radius,
    roadWidth,
    maxSuperelevation = 6,
    spiralLength: specifiedLength,
  } = input;

  const V = designSpeed;
  const R = radius;
  const w = roadWidth;

  // Calculate minimum spiral length (largest of three criteria)
  const minLengths = calculateMinimumSpiralLengths(V, R, w, maxSuperelevation);
  const minimumLength = Math.max(
    minLengths.byComfort,
    minLengths.bySuperelevation,
    minLengths.byAppearance
  );

  // Use specified length or minimum
  const Ls = specifiedLength ?? Math.ceil(minimumLength / 5) * 5; // Round up to 5m

  // Spiral parameter A
  const A = Math.sqrt(R * Ls);

  // Spiral angle (radians and degrees)
  const thetaS_rad = Ls / (2 * R);
  const thetaS_deg = (thetaS_rad * 180) / Math.PI;

  // Calculate spiral coordinates at SC (end of spiral)
  const coords = calculateSpiralCoordinates(Ls, R);
  const X = coords.x;
  const Y = coords.y;

  // Long tangent and short tangent
  const longTangent = X - Y / Math.tan(thetaS_rad);
  const shortTangent = Y / Math.sin(thetaS_rad);

  // Shift (p) - perpendicular offset of circular curve
  const p = Y - R * (1 - Math.cos(thetaS_rad));

  // Throw (k) - distance from TS along tangent to shifted PC
  const k = X - R * Math.sin(thetaS_rad);

  // Rate of change of centripetal acceleration
  const V_ms = V / 3.6;
  const C = (V_ms * V_ms * V_ms) / (R * Ls);

  return {
    A: Math.round(A * 100) / 100,
    spiralLength: Ls,
    minimumLength: Math.round(minimumLength * 10) / 10,
    spiralAngle: Math.round(thetaS_deg * 10000) / 10000,
    X: Math.round(X * 1000) / 1000,
    Y: Math.round(Y * 1000) / 1000,
    longTangent: Math.round(longTangent * 1000) / 1000,
    shortTangent: Math.round(shortTangent * 1000) / 1000,
    p: Math.round(p * 1000) / 1000,
    k: Math.round(k * 1000) / 1000,
    Ts: 0, // Calculated separately for full curve
    C: Math.round(C * 1000) / 1000,
    meetsMinimum: Ls >= minimumLength,
  };
}

/**
 * Calculate minimum spiral lengths by different criteria
 */
export function calculateMinimumSpiralLengths(
  designSpeed: number,
  radius: number,
  roadWidth: number,
  maxSuperelevation: number
): {
  byComfort: number;
  bySuperelevation: number;
  byAppearance: number;
  recommended: number;
} {
  const V = designSpeed;
  const R = radius;
  const w = roadWidth;

  // 1. By comfort (rate of change of acceleration)
  // Ls_min = 0.0214 × V³ / (R × C)
  // Using C = 0.6 (normal design)
  const C = MAX_RATE_OF_CHANGE_ACCELERATION.normal;
  const V_ms = V / 3.6;
  const byComfort = (V_ms * V_ms * V_ms) / (R * C);

  // 2. By superelevation runoff
  // Ls_min = (w × e) / Δ
  // where Δ = relative gradient (from table)
  const speeds = Object.keys(MAXIMUM_RELATIVE_GRADIENT).map(Number);
  let relativeGradient = MAXIMUM_RELATIVE_GRADIENT[speeds[speeds.length - 1]] / 100;
  for (const s of speeds) {
    if (s >= designSpeed) {
      relativeGradient = MAXIMUM_RELATIVE_GRADIENT[s] / 100;
      break;
    }
  }
  const e = maxSuperelevation / 100;
  const bySuperelevation = (w * e) / relativeGradient;

  // 3. By appearance (minimum spiral angle of 3°)
  // Ls = 2 × R × θ where θ = 3° = 0.0524 rad
  const minAngleRad = (MINIMUM_SPIRAL_ANGLE * Math.PI) / 180;
  const byAppearance = 2 * R * minAngleRad;

  // Recommended: max of all three
  const recommended = Math.max(byComfort, bySuperelevation, byAppearance);

  return {
    byComfort: Math.round(byComfort * 10) / 10,
    bySuperelevation: Math.round(bySuperelevation * 10) / 10,
    byAppearance: Math.round(byAppearance * 10) / 10,
    recommended: Math.round(recommended * 10) / 10,
  };
}

// ============================================================================
// Spiral Geometry Functions
// ============================================================================

/**
 * Calculate spiral coordinates using Fresnel integrals approximation
 *
 * For clothoid with R × L = A²:
 * x = L - L⁵/(40×A⁴) + L⁹/(3456×A⁸) - ...
 * y = L³/(6×A²) - L⁷/(336×A⁶) + L¹¹/(42240×A¹⁰) - ...
 */
export function calculateSpiralCoordinates(
  length: number,
  radius: number
): Point2D {
  const L = length;
  const A = Math.sqrt(radius * length);

  // Series expansion for x (cosine Fresnel)
  const L2 = L * L;
  const L3 = L2 * L;
  const L5 = L3 * L2;
  const L7 = L5 * L2;
  const L9 = L7 * L2;

  const A2 = A * A;
  const A4 = A2 * A2;
  const A6 = A4 * A2;
  const A8 = A6 * A2;

  const x = L - L5 / (40 * A4) + L9 / (3456 * A8);

  // Series expansion for y (sine Fresnel)
  const y = L3 / (6 * A2) - L7 / (336 * A6);

  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
  };
}

/**
 * Calculate coordinates at any point along spiral
 */
export function calculateSpiralPointCoordinates(
  distanceFromTS: number,
  totalLength: number,
  radius: number
): Point2D {
  const l = distanceFromTS;
  const Ls = totalLength;
  const R = radius;
  const A = Math.sqrt(R * Ls);

  // Parametric calculation for point at distance l
  const l2 = l * l;
  const l3 = l2 * l;
  const l5 = l3 * l2;
  const l7 = l5 * l2;

  const A2 = A * A;
  const A4 = A2 * A2;
  const A6 = A4 * A2;

  const x = l - l5 / (40 * A4);
  const y = l3 / (6 * A2) - l7 / (336 * A6);

  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
  };
}

/**
 * Generate stakeout points along spiral
 */
export function stakeoutSpiral(
  spiral: TransitionCurveResult,
  interval: number = 10
): SpiralStation[] {
  const stations: SpiralStation[] = [];
  const Ls = spiral.spiralLength;
  const R = Ls / (2 * spiral.spiralAngle * Math.PI / 180); // Back-calculate R

  // TS point
  stations.push({
    station: 0,
    x: 0,
    y: 0,
    deflection: 0,
    radius: Infinity,
    chord: 0,
    spiralAngle: 0,
  });

  // Intermediate points
  let l = interval;
  while (l < Ls) {
    const point = calculateSpiralPointAtDistance(l, Ls, R);
    stations.push(point);
    l += interval;
  }

  // SC point
  const scPoint = calculateSpiralPointAtDistance(Ls, Ls, R);
  stations.push(scPoint);

  return stations;
}

/**
 * Calculate spiral point data at given distance
 */
function calculateSpiralPointAtDistance(
  l: number,
  Ls: number,
  R: number
): SpiralStation {
  const coords = calculateSpiralPointCoordinates(l, Ls, R);

  // Spiral angle at this point
  const theta = l / (2 * R * Ls / Ls); // Simplified: θ = L / (2R) for full spiral
  const spiralAngle = (l * l) / (2 * R * Ls) * 180 / Math.PI;

  // Deflection from tangent
  const deflection = spiralAngle / 3;

  // Chord from TS
  const chord = Math.sqrt(coords.x * coords.x + coords.y * coords.y);

  // Instantaneous radius
  const instantRadius = (R * Ls) / l;

  return {
    station: Math.round(l * 1000) / 1000,
    x: coords.x,
    y: coords.y,
    deflection: Math.round(deflection * 10000) / 10000,
    radius: l > 0 ? Math.round(instantRadius * 10) / 10 : Infinity,
    chord: Math.round(chord * 1000) / 1000,
    spiralAngle: Math.round(spiralAngle * 10000) / 10000,
  };
}

// ============================================================================
// Spiral-Curve-Spiral (SCS) Functions
// ============================================================================

/**
 * Design complete spiral-curve-spiral alignment
 */
export function designSpiralCurveSpiral(
  input: SpiralCurveSpiralInput
): SpiralCurveSpiralResult {
  const {
    designSpeed,
    radius,
    circularAngle,
    spiralLengthEntry,
    spiralLengthExit = spiralLengthEntry,
    tsStation,
  } = input;

  const R = radius;
  const deltaC = circularAngle;

  // Design entry spiral
  const entrySpiral = designTransitionCurve({
    designSpeed,
    radius,
    roadWidth: 7.0, // Default lane width
    spiralLength: spiralLengthEntry,
  });

  // Design exit spiral
  const exitSpiral = designTransitionCurve({
    designSpeed,
    radius,
    roadWidth: 7.0,
    spiralLength: spiralLengthExit,
  });

  // Spiral angles
  const thetaS1 = entrySpiral.spiralAngle;
  const thetaS2 = exitSpiral.spiralAngle;

  // Circular arc angle (reduced by spiral angles)
  const deltaCircular = deltaC - thetaS1 - thetaS2;
  const circularLength = (Math.PI * R * deltaCircular) / 180;

  // Total length
  const totalLength = spiralLengthEntry + circularLength + spiralLengthExit;

  // Total tangent
  // Ts = (R + p) × tan(Δ/2) + k
  const deltaTotal = deltaC * Math.PI / 180;
  const p = entrySpiral.p; // Assuming symmetric
  const k = entrySpiral.k;
  const totalTangent = (R + p) * Math.tan(deltaTotal / 2) + k;

  // Key stations
  const stations = {
    TS: tsStation,
    SC: tsStation + spiralLengthEntry,
    CS: tsStation + spiralLengthEntry + circularLength,
    ST: tsStation + totalLength,
  };

  // Update Ts in spirals
  entrySpiral.Ts = totalTangent;
  exitSpiral.Ts = totalTangent;

  return {
    entrySpiral,
    exitSpiral,
    circularLength: Math.round(circularLength * 1000) / 1000,
    totalLength: Math.round(totalLength * 1000) / 1000,
    totalAngle: deltaC,
    stations: {
      TS: Math.round(stations.TS * 1000) / 1000,
      SC: Math.round(stations.SC * 1000) / 1000,
      CS: Math.round(stations.CS * 1000) / 1000,
      ST: Math.round(stations.ST * 1000) / 1000,
    },
    totalTangent: Math.round(totalTangent * 1000) / 1000,
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if transition curve is needed for given conditions
 */
export function isTransitionRequired(
  designSpeed: number,
  radius: number,
  roadType: 'highway' | 'urban_arterial' | 'urban_local' = 'highway'
): { required: boolean; recommended: boolean; reason: string } {
  const V = designSpeed;
  const R = radius;

  // Calculate rate of change of acceleration without spiral
  // Assume 1 second to enter curve
  const V_ms = V / 3.6;
  const a = (V_ms * V_ms) / R; // Centripetal acceleration
  const C = a / 1.0; // Rate of change (assuming 1s transition)

  // Check against comfort limit
  const comfortLimit = MAX_RATE_OF_CHANGE_ACCELERATION.comfort;
  const normalLimit = MAX_RATE_OF_CHANGE_ACCELERATION.normal;

  // Minimum radius where spiral is not needed
  // For urban local streets, spirals often omitted
  const minRadiusNoSpiral: Record<string, number> = {
    highway: 400,
    urban_arterial: 200,
    urban_local: 100,
  };

  if (R >= minRadiusNoSpiral[roadType] && C < comfortLimit) {
    return {
      required: false,
      recommended: false,
      reason: `Radius (${R}m) is large enough that spiral is not needed`,
    };
  }

  if (R >= minRadiusNoSpiral[roadType] / 2 && C < normalLimit) {
    return {
      required: false,
      recommended: true,
      reason: `Spiral recommended for driver comfort at R=${R}m, V=${V}km/h`,
    };
  }

  return {
    required: true,
    recommended: true,
    reason: `Spiral required for safe operation at R=${R}m, V=${V}km/h (C=${C.toFixed(2)} m/s³)`,
  };
}

/**
 * Validate transition curve design
 */
export function validateTransitionCurve(
  spiral: TransitionCurveResult,
  circularAngle: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check minimum length
  if (!spiral.meetsMinimum) {
    warnings.push(
      `Spiral length (${spiral.spiralLength}m) is below minimum (${spiral.minimumLength}m)`
    );
  }

  // Check spiral angle ratio
  const spiralAngleRatio = spiral.spiralAngle / circularAngle;
  if (spiralAngleRatio > MAXIMUM_SPIRAL_ANGLE_RATIO) {
    warnings.push(
      `Spiral angle (${spiral.spiralAngle.toFixed(1)}°) exceeds 1/3 of total curve angle`
    );
  }

  // Check minimum spiral angle
  if (spiral.spiralAngle < MINIMUM_SPIRAL_ANGLE) {
    warnings.push(
      `Spiral angle (${spiral.spiralAngle.toFixed(1)}°) is below minimum (${MINIMUM_SPIRAL_ANGLE}°)`
    );
  }

  // Check rate of change of acceleration
  if (spiral.C > MAX_RATE_OF_CHANGE_ACCELERATION.minimum) {
    warnings.push(
      `Rate of change of acceleration (${spiral.C.toFixed(2)} m/s³) exceeds maximum (1.0 m/s³)`
    );
  } else if (spiral.C > MAX_RATE_OF_CHANGE_ACCELERATION.normal) {
    warnings.push(
      `Rate of change of acceleration (${spiral.C.toFixed(2)} m/s³) is above normal design value (0.6 m/s³)`
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
 * Calculate spiral deflection at any point
 * Deflection = θ/3 where θ = spiral angle at that point
 */
export function calculateSpiralDeflection(
  distanceFromTS: number,
  totalLength: number,
  radius: number
): number {
  const l = distanceFromTS;
  const Ls = totalLength;
  const R = radius;

  // Spiral angle at point l
  const theta = (l * l) / (2 * R * Ls);
  const thetaDeg = (theta * 180) / Math.PI;

  // Deflection = θ/3
  return Math.round((thetaDeg / 3) * 10000) / 10000;
}

/**
 * Convert coordinates from spiral local to global
 */
export function transformSpiralToGlobal(
  localX: number,
  localY: number,
  tsX: number,
  tsY: number,
  tangentBearing: number, // degrees from north
  direction: 'left' | 'right'
): Point2D {
  const bearingRad = (tangentBearing * Math.PI) / 180;
  const dirMod = direction === 'right' ? 1 : -1;

  // Rotate local coordinates to global alignment
  const globalX = tsX + localX * Math.sin(bearingRad) + dirMod * localY * Math.cos(bearingRad);
  const globalY = tsY + localX * Math.cos(bearingRad) - dirMod * localY * Math.sin(bearingRad);

  return {
    x: Math.round(globalX * 1000) / 1000,
    y: Math.round(globalY * 1000) / 1000,
  };
}

/**
 * Check if curve needs transition based on superelevation
 */
export function needsTransitionForSuperelevation(
  superelevation: number,
  roadWidth: number,
  maxRelativeGradient: number = 0.5
): boolean {
  // If superelevation is 2% or less (normal crown), no transition needed
  if (superelevation <= 2) return false;

  // Calculate runoff distance with max gradient
  const e = superelevation / 100;
  const runoff = (roadWidth * e) / (maxRelativeGradient / 100);

  // If runoff is significant (>20m), transition is beneficial
  return runoff > 20;
}
