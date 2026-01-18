/**
 * Horizontal Curve Calculations
 *
 * Implements circular curve geometry for road alignments including:
 * - Simple circular curves
 * - Compound curves
 * - Reverse curves
 * - Curve stakeout calculations
 *
 * References:
 * - AASHTO A Policy on Geometric Design (Green Book)
 * - MOP Manual de Carreteras Vol. 3
 *
 * @module road-geometry/horizontal-curves
 */

import { getLateralFriction, MINIMUM_RADIUS } from './design-tables';
import {
  ValidationError,
  ValidationWarning,
  EngineeringValidationError,
  validateNumber,
  validateRadius,
  validateAngle,
  validateDesignSpeed,
  validateSuperelevation,
} from '../validation';

// ============================================================================
// Local Validation Types
// ============================================================================

/** Result of validation with errors and warnings */
interface CurveValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** Safe division that returns default value instead of throwing */
function safeDivideWithDefault(
  numerator: number,
  denominator: number,
  defaultValue: number = 0
): number {
  if (denominator === 0 || !isFinite(denominator)) {
    return defaultValue;
  }
  return numerator / denominator;
}

// ============================================================================
// Types
// ============================================================================

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface SimpleCircularCurveInput {
  /** Radius of curve (m) */
  radius: number;
  /** Deflection angle (degrees) - absolute value */
  deflectionAngle: number;
  /** Station of PI (Point of Intersection) */
  piStation: number;
  /** Direction: 'left' or 'right' */
  direction: 'left' | 'right';
}

export interface SimpleCircularCurveResult {
  /** Input radius (m) */
  radius: number;
  /** Deflection/central angle (degrees) */
  delta: number;
  /** Tangent length (m) */
  tangent: number;
  /** Curve length (m) */
  length: number;
  /** External distance (m) */
  external: number;
  /** Middle ordinate (m) */
  middleOrdinate: number;
  /** Long chord length (m) */
  longChord: number;
  /** Degree of curve (arc definition, per 20m arc) */
  degreeOfCurve: number;
  /** Station of PC (Point of Curvature) */
  pcStation: number;
  /** Station of PT (Point of Tangency) */
  ptStation: number;
  /** Station of PI (Point of Intersection) */
  piStation: number;
  /** Direction of curve */
  direction: 'left' | 'right';
}

export interface CurveStation {
  /** Station along alignment */
  station: number;
  /** Deflection angle from PC to this point (degrees) */
  deflection: number;
  /** Chord length from PC to this point (m) */
  chord: number;
  /** Point coordinates (if computed) */
  coordinates?: Point2D;
}

export interface CompoundCurveInput {
  /** First curve radius (m) */
  radius1: number;
  /** First curve deflection angle (degrees) */
  delta1: number;
  /** Second curve radius (m) */
  radius2: number;
  /** Second curve deflection angle (degrees) */
  delta2: number;
  /** Station of first curve PC */
  pcStation: number;
  /** Direction: 'left' or 'right' */
  direction: 'left' | 'right';
}

export interface CompoundCurveResult {
  /** First simple curve */
  curve1: SimpleCircularCurveResult;
  /** Second simple curve */
  curve2: SimpleCircularCurveResult;
  /** Point of Compound Curvature (PCC) station */
  pccStation: number;
  /** Total curve length */
  totalLength: number;
  /** Combined deflection angle */
  totalDelta: number;
}

export interface ReverseCurveInput {
  /** First curve radius (m) */
  radius1: number;
  /** First curve deflection angle (degrees) */
  delta1: number;
  /** Second curve radius (m) */
  radius2: number;
  /** Second curve deflection angle (degrees) */
  delta2: number;
  /** Station of first curve PC */
  pcStation: number;
  /** Tangent length between curves (m) - 0 for point reversal */
  tangentBetween: number;
  /** First curve direction */
  direction1: 'left' | 'right';
}

export interface ReverseCurveResult {
  /** First simple curve */
  curve1: SimpleCircularCurveResult;
  /** Second simple curve */
  curve2: SimpleCircularCurveResult;
  /** Point of Reverse Curvature (PRC) station */
  prcStation: number;
  /** Tangent length between curves */
  tangentBetween: number;
  /** Total length including tangent */
  totalLength: number;
}

export interface MinRadiusInput {
  /** Design speed (km/h) */
  designSpeed: number;
  /** Maximum superelevation (%, typically 6, 8, or 10) */
  maxSuperelevation: number;
  /** Side friction factor (optional, uses table if not provided) */
  friction?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Standard arc length for degree of curve calculation (Chile uses 20m) */
export const STANDARD_ARC_LENGTH = 20;

/** Minimum curve length for design (based on travel time) */
export const MINIMUM_CURVE_LENGTH: Record<number, number> = {
  // Design speed: minimum curve length (m)
  30: 30,
  40: 40,
  50: 50,
  60: 60,
  70: 70,
  80: 80,
  90: 90,
  100: 100,
  110: 110,
  120: 120,
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate simple circular curve input parameters
 */
export function validateSimpleCircularCurveInput(
  input: SimpleCircularCurveInput
): CurveValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate radius
  const radiusError = validateRadius(input.radius, 'radius');
  if (radiusError) errors.push(radiusError);

  // Additional radius checks
  if (!radiusError && input.radius < 15) {
    errors.push({
      code: 'OUT_OF_RANGE',
      message: `Radius ${input.radius}m is too small for vehicular roads (minimum ~15m for lowest speeds)`,
      field: 'radius',
      value: input.radius,
    });
  } else if (!radiusError && input.radius < 50) {
    warnings.push({
      field: 'radius',
      message: `Radius ${input.radius}m is very tight - only suitable for low-speed roads (<40 km/h)`,
      recommendation: 'Consider using a larger radius for higher design speeds',
    });
  }

  // Validate deflection angle
  const angleError = validateAngle(input.deflectionAngle, 'deflectionAngle');
  if (angleError) errors.push(angleError);

  // Additional angle checks
  const absAngle = Math.abs(input.deflectionAngle);
  if (!angleError && absAngle < 0.5) {
    warnings.push({
      field: 'deflectionAngle',
      message: `Deflection angle ${absAngle}° is very small - consider using a tangent section instead`,
    });
  } else if (!angleError && absAngle > 120) {
    warnings.push({
      field: 'deflectionAngle',
      message: `Deflection angle ${absAngle}° is very large - consider using compound curves`,
    });
  }

  // Validate PI station
  const stationError = validateNumber(input.piStation, 'piStation', { required: true });
  if (stationError) {
    errors.push(stationError);
  } else if (input.piStation < 0) {
    warnings.push({
      field: 'piStation',
      message: `PI station ${input.piStation} is negative - verify this is intentional`,
    });
  }

  // Validate direction
  if (input.direction !== 'left' && input.direction !== 'right') {
    errors.push({
      code: 'INVALID_INPUT',
      message: `Direction must be 'left' or 'right', got: ${input.direction}`,
      field: 'direction',
      value: input.direction,
    });
  }

  return { errors, warnings };
}

/**
 * Validate minimum radius input parameters
 */
export function validateMinRadiusInput(input: MinRadiusInput): CurveValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate design speed
  const speedError = validateDesignSpeed(input.designSpeed, 'designSpeed');
  if (speedError) errors.push(speedError);

  // Validate superelevation
  const superError = validateSuperelevation(input.maxSuperelevation, 'maxSuperelevation');
  if (superError) errors.push(superError);

  // Validate optional friction
  if (input.friction !== undefined) {
    const frictionError = validateNumber(input.friction, 'friction', { positive: true });
    if (frictionError) {
      errors.push(frictionError);
    } else if (input.friction < 0.08 || input.friction > 0.20) {
      warnings.push({
        field: 'friction',
        message: `Friction factor ${input.friction} is outside typical range (0.08-0.20)`,
        recommendation: 'Use AASHTO table values unless site-specific testing justifies different values',
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate compound curve input parameters
 */
export function validateCompoundCurveInput(
  input: CompoundCurveInput
): CurveValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate both radii
  const radius1Error = validateRadius(input.radius1, 'radius1');
  if (radius1Error) errors.push(radius1Error);

  const radius2Error = validateRadius(input.radius2, 'radius2');
  if (radius2Error) errors.push(radius2Error);

  // Validate both angles
  const delta1Error = validateAngle(input.delta1, 'delta1');
  if (delta1Error) errors.push(delta1Error);

  const delta2Error = validateAngle(input.delta2, 'delta2');
  if (delta2Error) errors.push(delta2Error);

  // Check radius ratio (AASHTO recommends ratio ≤ 1.5:1)
  if (!radius1Error && !radius2Error && input.radius1 > 0 && input.radius2 > 0) {
    const ratio = Math.max(input.radius1, input.radius2) / Math.min(input.radius1, input.radius2);
    if (ratio > 2.0) {
      warnings.push({
        field: 'radius1',
        message: `Radius ratio ${ratio.toFixed(2)}:1 exceeds recommended 2:1 - may cause driver discomfort`,
        recommendation: 'Keep radius ratio below 2:1 for safe transitions',
      });
    } else if (ratio > 1.5) {
      warnings.push({
        field: 'radius1',
        message: `Radius ratio ${ratio.toFixed(2)}:1 exceeds AASHTO recommended 1.5:1 for compound curves`,
        recommendation: 'Consider using spiral transitions between curves',
      });
    }
  }

  // Validate direction
  if (input.direction !== 'left' && input.direction !== 'right') {
    errors.push({
      code: 'INVALID_INPUT',
      message: `Direction must be 'left' or 'right', got: ${input.direction}`,
      field: 'direction',
      value: input.direction,
    });
  }

  return { errors, warnings };
}

/**
 * Validate reverse curve input parameters
 */
export function validateReverseCurveInput(
  input: ReverseCurveInput
): CurveValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate both radii
  const radius1Error = validateRadius(input.radius1, 'radius1');
  if (radius1Error) errors.push(radius1Error);

  const radius2Error = validateRadius(input.radius2, 'radius2');
  if (radius2Error) errors.push(radius2Error);

  // Validate both angles
  const delta1Error = validateAngle(input.delta1, 'delta1');
  if (delta1Error) errors.push(delta1Error);

  const delta2Error = validateAngle(input.delta2, 'delta2');
  if (delta2Error) errors.push(delta2Error);

  // Validate tangent between curves
  const tangentError = validateNumber(input.tangentBetween, 'tangentBetween', { nonNegative: true });
  if (tangentError) {
    errors.push(tangentError);
  } else if (input.tangentBetween === 0) {
    warnings.push({
      field: 'tangentBetween',
      message: 'Zero tangent between reverse curves (point reversal) - verify superelevation transition is adequate',
      recommendation: 'A minimum tangent length allows for proper superelevation transition',
    });
  }

  // Validate direction
  if (input.direction1 !== 'left' && input.direction1 !== 'right') {
    errors.push({
      code: 'INVALID_INPUT',
      message: `Direction must be 'left' or 'right', got: ${input.direction1}`,
      field: 'direction1',
      value: input.direction1,
    });
  }

  return { errors, warnings };
}

// ============================================================================
// Simple Circular Curve Functions
// ============================================================================

/**
 * Calculate simple circular curve elements
 *
 * Formulas:
 * - T = R × tan(Δ/2)
 * - L = π × R × Δ / 180
 * - E = R × (sec(Δ/2) - 1)
 * - M = R × (1 - cos(Δ/2))
 * - C = 2 × R × sin(Δ/2)
 * - D = 180 × S / (π × R) where S = standard arc length
 *
 * @throws {EngineeringValidationError} When validation fails and throwOnError is true
 */
export function calculateSimpleCircularCurve(
  input: SimpleCircularCurveInput,
  options: { throwOnError?: boolean } = {}
): SimpleCircularCurveResult & { validation?: CurveValidationResult } {
  const { throwOnError = true } = options;

  // Validate inputs
  const validation = validateSimpleCircularCurveInput(input);

  if (validation.errors.length > 0 && throwOnError) {
    throw new EngineeringValidationError(validation.errors[0]);
  }

  const { radius, deflectionAngle, piStation, direction } = input;
  const R = radius;
  const delta = Math.abs(deflectionAngle);
  const deltaRad = (delta * Math.PI) / 180;

  // Calculate curve elements with safe division
  const tanHalfDelta = Math.tan(deltaRad / 2);
  const T = R * tanHalfDelta;
  const L = (Math.PI * R * delta) / 180;

  // External distance: E = R × (sec(Δ/2) - 1) = R × (1/cos(Δ/2) - 1)
  const cosHalfDelta = Math.cos(deltaRad / 2);
  const E = cosHalfDelta !== 0 ? R * (1 / cosHalfDelta - 1) : 0;

  const M = R * (1 - cosHalfDelta);
  const C = 2 * R * Math.sin(deltaRad / 2);

  // Degree of curve (arc definition, per 20m arc) with safe division
  const D = safeDivideWithDefault(180 * STANDARD_ARC_LENGTH, Math.PI * R, 0);

  // Calculate stations
  const pcStation = piStation - T;
  const ptStation = pcStation + L;

  const result: SimpleCircularCurveResult & { validation?: CurveValidationResult } = {
    radius: R,
    delta,
    tangent: Math.round(T * 1000) / 1000,
    length: Math.round(L * 1000) / 1000,
    external: Math.round(E * 1000) / 1000,
    middleOrdinate: Math.round(M * 1000) / 1000,
    longChord: Math.round(C * 1000) / 1000,
    degreeOfCurve: Math.round(D * 10000) / 10000,
    pcStation: Math.round(pcStation * 1000) / 1000,
    ptStation: Math.round(ptStation * 1000) / 1000,
    piStation,
    direction,
  };

  // Include validation results if there are warnings or if not throwing
  if (validation.warnings.length > 0 || !throwOnError) {
    result.validation = validation;
  }

  return result;
}

/**
 * Calculate minimum radius for given design parameters
 *
 * R = V² / (127 × (e + f))
 *
 * Where:
 * - V = design speed (km/h)
 * - e = superelevation (decimal)
 * - f = side friction factor
 *
 * @throws {EngineeringValidationError} When validation fails and throwOnError is true
 */
export function calculateMinimumRadius(
  input: MinRadiusInput,
  options: { throwOnError?: boolean } = {}
): number {
  const { throwOnError = true } = options;

  // Validate inputs
  const validation = validateMinRadiusInput(input);

  if (validation.errors.length > 0 && throwOnError) {
    throw new EngineeringValidationError(validation.errors[0]);
  }

  const { designSpeed, maxSuperelevation, friction } = input;

  const f = friction ?? getLateralFriction(designSpeed);
  const e = maxSuperelevation / 100; // Convert percentage to decimal
  const V = designSpeed;

  // Safe division to prevent division by zero
  const denominator = 127 * (e + f);
  const R = safeDivideWithDefault(V * V, denominator, Infinity);

  // Round up for safety
  return Math.ceil(R);
}

/**
 * Check if curve radius meets minimum requirements
 */
export function validateCurveRadius(
  radius: number,
  designSpeed: number,
  maxSuperelevation: number = 6
): { valid: boolean; minRadius: number; warnings: string[] } {
  const warnings: string[] = [];

  // Get minimum radius from table or calculate
  const speeds = Object.keys(MINIMUM_RADIUS).map(Number);
  let minRadius: number;

  if (speeds.includes(designSpeed)) {
    const row = MINIMUM_RADIUS[designSpeed];
    if (maxSuperelevation <= 6) minRadius = row.emax6;
    else if (maxSuperelevation <= 8) minRadius = row.emax8;
    else minRadius = row.emax10;
  } else {
    minRadius = calculateMinimumRadius({
      designSpeed,
      maxSuperelevation,
    });
  }

  if (radius < minRadius) {
    warnings.push(
      `Radius (${radius}m) is below minimum (${minRadius}m) for ${designSpeed} km/h with emax=${maxSuperelevation}%`
    );
  }

  return {
    valid: radius >= minRadius,
    minRadius,
    warnings,
  };
}

/**
 * Calculate minimum curve length based on travel time
 * Minimum 3 seconds of travel at design speed
 */
export function getMinimumCurveLength(designSpeed: number): number {
  // L_min = V × t / 3.6, where t = 3 seconds
  const L_min = (designSpeed * 3) / 3.6;
  return Math.ceil(L_min);
}

// ============================================================================
// Curve Stakeout Functions
// ============================================================================

/**
 * Generate stakeout data for curve at specified intervals
 *
 * Uses deflection angle method:
 * - Deflection = L × D / (2 × S)
 * - Chord = 2 × R × sin(deflection)
 *
 * Where L = arc length from PC, D = degree of curve, S = standard arc
 */
export function stakeoutCurve(
  curve: SimpleCircularCurveResult,
  interval: number = 10
): CurveStation[] {
  const stations: CurveStation[] = [];
  const { radius, length, pcStation, degreeOfCurve } = curve;

  // PC point
  stations.push({
    station: pcStation,
    deflection: 0,
    chord: 0,
  });

  // Generate intermediate stations
  let currentStation = Math.ceil(pcStation / interval) * interval;
  if (currentStation === pcStation) currentStation += interval;

  while (currentStation < pcStation + length) {
    const arcFromPC = currentStation - pcStation;

    // Deflection angle = arc × D / (2 × S)
    const deflection = (arcFromPC * degreeOfCurve) / (2 * STANDARD_ARC_LENGTH);

    // Chord from PC = 2 × R × sin(deflection)
    const deflectionRad = (deflection * Math.PI) / 180;
    const chord = 2 * radius * Math.sin(deflectionRad);

    stations.push({
      station: Math.round(currentStation * 1000) / 1000,
      deflection: Math.round(deflection * 10000) / 10000,
      chord: Math.round(chord * 1000) / 1000,
    });

    currentStation += interval;
  }

  // PT point
  const totalDeflection = curve.delta / 2;
  stations.push({
    station: curve.ptStation,
    deflection: Math.round(totalDeflection * 10000) / 10000,
    chord: curve.longChord,
  });

  return stations;
}

/**
 * Calculate coordinates along curve given PC coordinates and back tangent bearing
 */
export function calculateCurveCoordinates(
  curve: SimpleCircularCurveResult,
  pcCoordinates: Point2D,
  backTangentBearing: number, // degrees from north, clockwise
  interval: number = 10
): CurveStation[] {
  const stakeout = stakeoutCurve(curve, interval);

  // Convert bearing to radians (from north, clockwise)
  const bearingRad = (backTangentBearing * Math.PI) / 180;

  // Direction modifier
  const dirMod = curve.direction === 'right' ? 1 : -1;

  return stakeout.map((station) => {
    const deflectionRad = (station.deflection * Math.PI) / 180;

    // Calculate total angle from PC
    const angleFromNorth = bearingRad + dirMod * deflectionRad;

    // Calculate coordinates
    const x = pcCoordinates.x + station.chord * Math.sin(angleFromNorth);
    const y = pcCoordinates.y + station.chord * Math.cos(angleFromNorth);

    return {
      ...station,
      coordinates: {
        x: Math.round(x * 1000) / 1000,
        y: Math.round(y * 1000) / 1000,
      },
    };
  });
}

// ============================================================================
// Compound Curve Functions
// ============================================================================

/**
 * Calculate compound curve elements
 *
 * A compound curve consists of two simple curves with the same direction
 * but different radii, joined at a Point of Compound Curvature (PCC)
 *
 * @throws {EngineeringValidationError} When validation fails and throwOnError is true
 */
export function calculateCompoundCurve(
  input: CompoundCurveInput,
  options: { throwOnError?: boolean } = {}
): CompoundCurveResult & { validation?: CurveValidationResult } {
  const { throwOnError = true } = options;

  // Validate inputs
  const validation = validateCompoundCurveInput(input);

  if (validation.errors.length > 0 && throwOnError) {
    throw new EngineeringValidationError(validation.errors[0]);
  }

  const { radius1, delta1, radius2, delta2, pcStation, direction } = input;

  // Calculate first curve
  // For compound curve, we need to find PI from given data
  const deltaRad1 = (delta1 * Math.PI) / 180;
  const T1 = radius1 * Math.tan(deltaRad1 / 2);

  const curve1 = calculateSimpleCircularCurve(
    {
      radius: radius1,
      deflectionAngle: delta1,
      piStation: pcStation + T1,
      direction,
    },
    { throwOnError: false }
  );

  // PCC is at PT of first curve
  const pccStation = curve1.ptStation;

  // Calculate second curve
  const deltaRad2 = (delta2 * Math.PI) / 180;
  const T2 = radius2 * Math.tan(deltaRad2 / 2);

  const curve2 = calculateSimpleCircularCurve(
    {
      radius: radius2,
      deflectionAngle: delta2,
      piStation: pccStation + T2,
      direction,
    },
    { throwOnError: false }
  );

  // Adjust curve2 PC station to match PCC
  const adjustedCurve2: SimpleCircularCurveResult = {
    radius: curve2.radius,
    delta: curve2.delta,
    tangent: curve2.tangent,
    length: curve2.length,
    external: curve2.external,
    middleOrdinate: curve2.middleOrdinate,
    longChord: curve2.longChord,
    degreeOfCurve: curve2.degreeOfCurve,
    pcStation: pccStation,
    ptStation: pccStation + curve2.length,
    piStation: curve2.piStation,
    direction: curve2.direction,
  };

  // Create clean curve1 without validation
  const cleanCurve1: SimpleCircularCurveResult = {
    radius: curve1.radius,
    delta: curve1.delta,
    tangent: curve1.tangent,
    length: curve1.length,
    external: curve1.external,
    middleOrdinate: curve1.middleOrdinate,
    longChord: curve1.longChord,
    degreeOfCurve: curve1.degreeOfCurve,
    pcStation: curve1.pcStation,
    ptStation: curve1.ptStation,
    piStation: curve1.piStation,
    direction: curve1.direction,
  };

  const result: CompoundCurveResult & { validation?: CurveValidationResult } = {
    curve1: cleanCurve1,
    curve2: adjustedCurve2,
    pccStation,
    totalLength: curve1.length + curve2.length,
    totalDelta: delta1 + delta2,
  };

  // Include validation results if there are warnings or if not throwing
  if (validation.warnings.length > 0 || !throwOnError) {
    result.validation = validation;
  }

  return result;
}

// ============================================================================
// Reverse Curve Functions
// ============================================================================

/**
 * Calculate reverse curve elements
 *
 * A reverse curve consists of two simple curves with opposite directions,
 * possibly with a tangent section between them
 *
 * @throws {EngineeringValidationError} When validation fails and throwOnError is true
 */
export function calculateReverseCurve(
  input: ReverseCurveInput,
  options: { throwOnError?: boolean } = {}
): ReverseCurveResult & { validation?: CurveValidationResult } {
  const { throwOnError = true } = options;

  // Validate inputs
  const validation = validateReverseCurveInput(input);

  if (validation.errors.length > 0 && throwOnError) {
    throw new EngineeringValidationError(validation.errors[0]);
  }

  const { radius1, delta1, radius2, delta2, pcStation, tangentBetween, direction1 } =
    input;

  const direction2 = direction1 === 'left' ? 'right' : 'left';

  // Calculate first curve
  const deltaRad1 = (delta1 * Math.PI) / 180;
  const T1 = radius1 * Math.tan(deltaRad1 / 2);

  const curve1 = calculateSimpleCircularCurve(
    {
      radius: radius1,
      deflectionAngle: delta1,
      piStation: pcStation + T1,
      direction: direction1,
    },
    { throwOnError: false }
  );

  // PRC is at PT of first curve plus tangent between
  const prcStation = curve1.ptStation + tangentBetween;

  // Calculate second curve (starts at PRC)
  const deltaRad2 = (delta2 * Math.PI) / 180;
  const T2 = radius2 * Math.tan(deltaRad2 / 2);

  const curve2 = calculateSimpleCircularCurve(
    {
      radius: radius2,
      deflectionAngle: delta2,
      piStation: prcStation + T2,
      direction: direction2,
    },
    { throwOnError: false }
  );

  // Create clean curve results without validation
  const cleanCurve1: SimpleCircularCurveResult = {
    radius: curve1.radius,
    delta: curve1.delta,
    tangent: curve1.tangent,
    length: curve1.length,
    external: curve1.external,
    middleOrdinate: curve1.middleOrdinate,
    longChord: curve1.longChord,
    degreeOfCurve: curve1.degreeOfCurve,
    pcStation: curve1.pcStation,
    ptStation: curve1.ptStation,
    piStation: curve1.piStation,
    direction: curve1.direction,
  };

  const cleanCurve2: SimpleCircularCurveResult = {
    radius: curve2.radius,
    delta: curve2.delta,
    tangent: curve2.tangent,
    length: curve2.length,
    external: curve2.external,
    middleOrdinate: curve2.middleOrdinate,
    longChord: curve2.longChord,
    degreeOfCurve: curve2.degreeOfCurve,
    pcStation: curve2.pcStation,
    ptStation: curve2.ptStation,
    piStation: curve2.piStation,
    direction: curve2.direction,
  };

  const result: ReverseCurveResult & { validation?: CurveValidationResult } = {
    curve1: cleanCurve1,
    curve2: cleanCurve2,
    prcStation,
    tangentBetween,
    totalLength: curve1.length + tangentBetween + curve2.length,
  };

  // Include validation results if there are warnings or if not throwing
  if (validation.warnings.length > 0 || !throwOnError) {
    result.validation = validation;
  }

  return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert degree of curve to radius
 * D = 180 × S / (π × R) => R = 180 × S / (π × D)
 */
export function degreeOfCurveToRadius(
  degreeOfCurve: number,
  arcLength: number = STANDARD_ARC_LENGTH
): number {
  const R = (180 * arcLength) / (Math.PI * degreeOfCurve);
  return Math.round(R * 1000) / 1000;
}

/**
 * Convert radius to degree of curve
 */
export function radiusToDegreeOfCurve(
  radius: number,
  arcLength: number = STANDARD_ARC_LENGTH
): number {
  const D = (180 * arcLength) / (Math.PI * radius);
  return Math.round(D * 10000) / 10000;
}

/**
 * Calculate offset from tangent at given station on curve
 */
export function calculateTangentOffset(
  radius: number,
  arcLength: number
): number {
  // y = R - √(R² - x²) where x ≈ arc for small angles
  // Simplified: y ≈ x² / (2R) for small deflections
  const offset = (arcLength * arcLength) / (2 * radius);
  return Math.round(offset * 1000) / 1000;
}

/**
 * Calculate sight distance on horizontal curve
 *
 * For a given lateral clearance (m), calculate available sight distance
 * m = R × (1 - cos(Δ/2))
 * Δ = 2 × arccos(1 - m/R)
 * S = R × Δ × π / 180
 */
export function calculateSightDistanceOnCurve(
  radius: number,
  lateralClearance: number
): number {
  const R = radius;
  const m = lateralClearance;

  // Check if clearance is greater than R
  if (m >= R) {
    return Infinity; // Unlimited sight distance
  }

  const deltaRad = 2 * Math.acos(1 - m / R);
  const S = R * deltaRad;

  return Math.round(S * 1000) / 1000;
}

/**
 * Calculate required lateral clearance for given sight distance
 */
export function calculateRequiredClearance(
  radius: number,
  sightDistance: number
): number {
  const R = radius;
  const S = sightDistance;

  // S = R × Δ => Δ = S / R
  const deltaRad = S / R;

  // m = R × (1 - cos(Δ/2))
  const m = R * (1 - Math.cos(deltaRad / 2));

  return Math.round(m * 1000) / 1000;
}

/**
 * Check if curve design is adequate for design speed
 */
export function validateCurveDesign(
  curve: SimpleCircularCurveResult,
  designSpeed: number,
  maxSuperelevation: number = 6
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check minimum radius
  const radiusCheck = validateCurveRadius(
    curve.radius,
    designSpeed,
    maxSuperelevation
  );
  warnings.push(...radiusCheck.warnings);

  // Check minimum length
  const minLength = getMinimumCurveLength(designSpeed);
  if (curve.length < minLength) {
    warnings.push(
      `Curve length (${curve.length}m) is below minimum (${minLength}m) for ${designSpeed} km/h`
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
