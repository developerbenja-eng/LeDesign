/**
 * Sight Distance Calculations
 *
 * Calculates various sight distances for road design:
 * - Stopping Sight Distance (SSD)
 * - Passing Sight Distance (PSD)
 * - Decision Sight Distance (DSD)
 * - Intersection Sight Distance (ISD)
 *
 * References:
 * - AASHTO A Policy on Geometric Design (Green Book)
 * - MOP Manual de Carreteras Vol. 3
 *
 * @module road-geometry/sight-distance
 */

import { BRAKING_FRICTION, STOPPING_SIGHT_DISTANCE, PASSING_SIGHT_DISTANCE } from '../design-tables';

// ============================================================================
// Types
// ============================================================================

export interface StoppingSightDistanceInput {
  /** Design speed (km/h) */
  designSpeed: number;
  /** Grade (%, positive = uphill, negative = downhill) */
  grade?: number;
  /** Perception-reaction time (seconds), default 2.5 */
  reactionTime?: number;
  /** Deceleration rate (m/s²), optional - uses AASHTO if not provided */
  deceleration?: number;
}

export interface StoppingSightDistanceResult {
  /** Total stopping sight distance (m) */
  totalDistance: number;
  /** Brake reaction distance (m) */
  reactionDistance: number;
  /** Braking distance (m) */
  brakingDistance: number;
  /** Design speed used (km/h) */
  designSpeed: number;
  /** Grade used (%) */
  grade: number;
  /** Reaction time used (s) */
  reactionTime: number;
  /** Deceleration used (m/s²) */
  deceleration: number;
  /** Friction coefficient used */
  frictionCoefficient: number;
}

export interface PassingSightDistanceInput {
  /** Design speed (km/h) */
  designSpeed: number;
  /** Speed of passed vehicle (km/h), default = design speed - 15 */
  passedVehicleSpeed?: number;
  /** Passing vehicle speed differential (km/h), default = 15 */
  speedDifferential?: number;
}

export interface PassingSightDistanceResult {
  /** Total passing sight distance (m) */
  totalDistance: number;
  /** Initial maneuver distance - d1 (m) */
  d1: number;
  /** Passing maneuver distance - d2 (m) */
  d2: number;
  /** Clearance distance - d3 (m) */
  d3: number;
  /** Opposing vehicle distance - d4 (m) */
  d4: number;
  /** Design speed used (km/h) */
  designSpeed: number;
}

export type DecisionAvoidanceType =
  | 'A' // Rural stop
  | 'B' // Urban stop
  | 'C' // Rural speed/path change
  | 'D' // Urban speed/path change
  | 'E'; // Speed/path change with complex conditions

export interface DecisionSightDistanceInput {
  /** Design speed (km/h) */
  designSpeed: number;
  /** Avoidance maneuver type */
  avoidanceType: DecisionAvoidanceType;
}

export interface DecisionSightDistanceResult {
  /** Decision sight distance (m) */
  distance: number;
  /** Design speed (km/h) */
  designSpeed: number;
  /** Avoidance type */
  avoidanceType: DecisionAvoidanceType;
  /** Pre-maneuver time (s) */
  preManeuverTime: number;
  /** Pre-maneuver distance (m) */
  preManeuverDistance: number;
  /** Maneuver distance (m) */
  maneuverDistance: number;
}

export interface IntersectionSightDistanceInput {
  /** Design speed of major road (km/h) */
  majorRoadSpeed: number;
  /** Type of control */
  controlType: 'yield' | 'stop' | 'no_control';
  /** Number of lanes to cross */
  lanesToCross: number;
  /** Design vehicle length (m) */
  vehicleLength?: number;
}

export interface IntersectionSightDistanceResult {
  /** Required sight distance on major road (m) */
  sightDistance: number;
  /** Time gap required (s) */
  timeGap: number;
  /** Sight triangle leg on minor road (m) */
  minorRoadLeg: number;
  /** Sight triangle leg on major road (m) */
  majorRoadLeg: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Standard perception-reaction time (AASHTO) */
export const STANDARD_REACTION_TIME = 2.5; // seconds

/** Standard deceleration rate for stopping (m/s²) */
export const STANDARD_DECELERATION = 3.4; // m/s²

/** Driver eye height (m) */
export const EYE_HEIGHT = {
  passenger: 1.08,
  truck: 2.33,
};

/** Object heights for sight distance (m) */
export const OBJECT_HEIGHT = {
  stopping: 0.60, // Stopping sight distance
  passing: 1.08, // Passing (another vehicle)
  taillight: 0.45, // Headlight to taillight
};

/**
 * Pre-maneuver time for decision sight distance by avoidance type (seconds)
 * AASHTO Table 3-3
 */
export const DECISION_SIGHT_DISTANCE_TIME: Record<DecisionAvoidanceType, Record<number, number>> = {
  A: { 50: 3.0, 60: 3.0, 70: 3.5, 80: 4.0, 90: 4.0, 100: 4.0, 110: 4.5, 120: 4.5 },
  B: { 50: 9.1, 60: 9.1, 70: 9.1, 80: 9.1, 90: 9.1, 100: 9.1, 110: 9.1, 120: 9.1 },
  C: { 50: 10.2, 60: 10.7, 70: 11.2, 80: 11.7, 90: 12.2, 100: 12.7, 110: 13.2, 120: 13.7 },
  D: { 50: 12.1, 60: 12.4, 70: 12.7, 80: 13.0, 90: 13.3, 100: 13.6, 110: 13.9, 120: 14.2 },
  E: { 50: 14.0, 60: 14.5, 70: 15.0, 80: 15.5, 90: 16.0, 100: 16.5, 110: 17.0, 120: 17.5 },
};

/**
 * Time gap for intersection sight distance (seconds)
 * Based on lanes crossed and vehicle type
 */
export const INTERSECTION_TIME_GAP: Record<number, number> = {
  2: 7.5, // 2 lanes
  3: 8.0, // 3 lanes
  4: 8.5, // 4 lanes
  5: 9.0, // 5 lanes
  6: 9.5, // 6 lanes
};

// ============================================================================
// Stopping Sight Distance Functions
// ============================================================================

/**
 * Calculate stopping sight distance
 *
 * SSD = d_reaction + d_braking
 * d_reaction = V × t / 3.6
 * d_braking = V² / (254 × (f ± G))
 *
 * Where:
 * - V = design speed (km/h)
 * - t = reaction time (s)
 * - f = friction coefficient
 * - G = grade (decimal, positive = uphill)
 */
export function calculateStoppingSightDistance(
  input: StoppingSightDistanceInput
): StoppingSightDistanceResult {
  const {
    designSpeed,
    grade = 0,
    reactionTime = STANDARD_REACTION_TIME,
    deceleration,
  } = input;

  const V = designSpeed;
  const G = grade / 100; // Convert percentage to decimal
  const t = reactionTime;

  // Get friction coefficient from table or calculate from deceleration
  let f: number;
  let a: number;
  if (deceleration !== undefined) {
    a = deceleration;
    f = a / 9.81; // Convert m/s² to friction coefficient
  } else {
    // Get from AASHTO table
    const speeds = Object.keys(BRAKING_FRICTION).map(Number);
    f = BRAKING_FRICTION[speeds[speeds.length - 1]];
    for (const s of speeds) {
      if (s >= designSpeed) {
        f = BRAKING_FRICTION[s];
        break;
      }
    }
    a = f * 9.81;
  }

  // Reaction distance
  const d_reaction = (V * t) / 3.6;

  // Braking distance (adjusted for grade)
  // For downhill (negative grade), friction is reduced
  // For uphill (positive grade), friction is enhanced
  const d_braking = (V * V) / (254 * (f + G));

  // Total SSD
  const totalDistance = d_reaction + d_braking;

  return {
    totalDistance: Math.round(totalDistance * 10) / 10,
    reactionDistance: Math.round(d_reaction * 10) / 10,
    brakingDistance: Math.round(d_braking * 10) / 10,
    designSpeed: V,
    grade,
    reactionTime: t,
    deceleration: Math.round(a * 100) / 100,
    frictionCoefficient: f,
  };
}

/**
 * Get stopping sight distance from AASHTO table
 * (for level terrain)
 */
export function getStoppingSightDistance(designSpeed: number): number {
  const speeds = Object.keys(STOPPING_SIGHT_DISTANCE).map(Number);

  // Interpolate if between values
  for (let i = 0; i < speeds.length - 1; i++) {
    if (designSpeed >= speeds[i] && designSpeed <= speeds[i + 1]) {
      const ratio = (designSpeed - speeds[i]) / (speeds[i + 1] - speeds[i]);
      return Math.round(
        STOPPING_SIGHT_DISTANCE[speeds[i]] +
          ratio * (STOPPING_SIGHT_DISTANCE[speeds[i + 1]] - STOPPING_SIGHT_DISTANCE[speeds[i]])
      );
    }
  }

  // Edge cases
  if (designSpeed <= speeds[0]) return STOPPING_SIGHT_DISTANCE[speeds[0]];
  return STOPPING_SIGHT_DISTANCE[speeds[speeds.length - 1]];
}

// ============================================================================
// Passing Sight Distance Functions
// ============================================================================

/**
 * Calculate passing sight distance for two-lane highways
 *
 * PSD = d1 + d2 + d3 + d4
 *
 * Where:
 * - d1 = initial maneuver distance
 * - d2 = passing maneuver distance (time in left lane)
 * - d3 = clearance distance
 * - d4 = opposing vehicle distance during d2
 */
export function calculatePassingSightDistance(
  input: PassingSightDistanceInput
): PassingSightDistanceResult {
  const { designSpeed, passedVehicleSpeed, speedDifferential = 15 } = input;

  const V = designSpeed;
  const V_passed = passedVehicleSpeed ?? (V - speedDifferential);
  const m = speedDifferential; // Speed differential (km/h)

  // d1 = Initial maneuver (perception-reaction + acceleration)
  // t1 = 3.6 + 0.0104 × V (approximation)
  const t1 = 3.6 + 0.0104 * V;
  const a = 2.25 + 0.0066 * V; // Acceleration (km/h/s)
  const d1 = (t1 / 3.6) * (V_passed + (a * t1) / 2);

  // d2 = Passing vehicle in opposing lane
  // t2 = time in opposing lane = 9.3 + 0.032 × V (approximation)
  const t2 = 9.3 + 0.032 * V;
  const d2 = (V / 3.6) * t2;

  // d3 = Clearance distance (safety margin)
  // Typically 30-75m depending on speed
  const d3 = 30 + 0.35 * V;

  // d4 = Opposing vehicle travel during d2
  // Opposing vehicle travels at approximately the same speed
  const d4 = (2 / 3) * d2;

  const totalDistance = d1 + d2 + d3 + d4;

  return {
    totalDistance: Math.round(totalDistance),
    d1: Math.round(d1),
    d2: Math.round(d2),
    d3: Math.round(d3),
    d4: Math.round(d4),
    designSpeed: V,
  };
}

/**
 * Get passing sight distance from AASHTO table
 */
export function getPassingSightDistance(designSpeed: number): number {
  const speeds = Object.keys(PASSING_SIGHT_DISTANCE).map(Number);

  // Interpolate if between values
  for (let i = 0; i < speeds.length - 1; i++) {
    if (designSpeed >= speeds[i] && designSpeed <= speeds[i + 1]) {
      const ratio = (designSpeed - speeds[i]) / (speeds[i + 1] - speeds[i]);
      return Math.round(
        PASSING_SIGHT_DISTANCE[speeds[i]] +
          ratio * (PASSING_SIGHT_DISTANCE[speeds[i + 1]] - PASSING_SIGHT_DISTANCE[speeds[i]])
      );
    }
  }

  // Edge cases
  if (designSpeed <= speeds[0]) return PASSING_SIGHT_DISTANCE[speeds[0]];
  return PASSING_SIGHT_DISTANCE[speeds[speeds.length - 1]];
}

// ============================================================================
// Decision Sight Distance Functions
// ============================================================================

/**
 * Calculate decision sight distance
 *
 * Used at complex locations where drivers need additional time for:
 * - Unexpected hazards
 * - Complex interchanges
 * - Lane changes
 * - Path decisions
 */
export function calculateDecisionSightDistance(
  input: DecisionSightDistanceInput
): DecisionSightDistanceResult {
  const { designSpeed, avoidanceType } = input;
  const V = designSpeed;

  // Get pre-maneuver time
  const speedTable = DECISION_SIGHT_DISTANCE_TIME[avoidanceType];
  const speeds = Object.keys(speedTable).map(Number).sort((a, b) => a - b);

  let preManeuverTime: number;
  if (designSpeed <= speeds[0]) {
    preManeuverTime = speedTable[speeds[0]];
  } else if (designSpeed >= speeds[speeds.length - 1]) {
    preManeuverTime = speedTable[speeds[speeds.length - 1]];
  } else {
    // Interpolate
    for (let i = 0; i < speeds.length - 1; i++) {
      if (designSpeed >= speeds[i] && designSpeed <= speeds[i + 1]) {
        const ratio = (designSpeed - speeds[i]) / (speeds[i + 1] - speeds[i]);
        preManeuverTime =
          speedTable[speeds[i]] + ratio * (speedTable[speeds[i + 1]] - speedTable[speeds[i]]);
        break;
      }
    }
    preManeuverTime = speedTable[speeds[0]]; // Fallback
  }

  // Calculate distances
  const preManeuverDistance = (V / 3.6) * preManeuverTime;

  // Maneuver distance depends on type
  let maneuverDistance: number;
  if (avoidanceType === 'A' || avoidanceType === 'B') {
    // Stop maneuvers include braking
    const ssd = calculateStoppingSightDistance({ designSpeed });
    maneuverDistance = ssd.brakingDistance;
  } else {
    // Path change maneuvers (lateral movement)
    // Approximate: 3-4 seconds of travel
    maneuverDistance = (V / 3.6) * 3.5;
  }

  const totalDistance = preManeuverDistance + maneuverDistance;

  return {
    distance: Math.round(totalDistance),
    designSpeed: V,
    avoidanceType,
    preManeuverTime: Math.round(preManeuverTime * 10) / 10,
    preManeuverDistance: Math.round(preManeuverDistance),
    maneuverDistance: Math.round(maneuverDistance),
  };
}

// ============================================================================
// Intersection Sight Distance Functions
// ============================================================================

/**
 * Calculate intersection sight distance
 *
 * Based on time required for minor road vehicle to:
 * - Cross the intersection (at stop-controlled approaches)
 * - Enter the major road stream (at yield approaches)
 */
export function calculateIntersectionSightDistance(
  input: IntersectionSightDistanceInput
): IntersectionSightDistanceResult {
  const {
    majorRoadSpeed,
    controlType,
    lanesToCross,
    vehicleLength = 5.8, // Passenger car length
  } = input;

  const V = majorRoadSpeed;
  const n = lanesToCross;
  const L = vehicleLength;

  // Time gap required
  let t_gap: number;
  if (controlType === 'no_control') {
    // No control - full stopping sight distance applies
    const ssd = getStoppingSightDistance(majorRoadSpeed);
    return {
      sightDistance: ssd,
      timeGap: (ssd * 3.6) / majorRoadSpeed,
      minorRoadLeg: ssd / 2, // Approximate
      majorRoadLeg: ssd,
    };
  }

  // Get base time gap
  const baseGap = INTERSECTION_TIME_GAP[Math.min(n, 6)] || 7.5;

  // Adjust for control type
  if (controlType === 'yield') {
    t_gap = baseGap - 1.0; // Yield has shorter gap (already moving)
  } else {
    t_gap = baseGap; // Stop control
  }

  // Adjust for grade if needed (add 0.5s per 2% upgrade)
  // Not implemented here but can be added

  // Calculate sight distance on major road
  // d = V × t / 3.6
  const sightDistance = (V * t_gap) / 3.6;

  // Sight triangle on minor road
  // Typically: minor leg ≥ 5m + clear zone
  const minorRoadLeg = Math.max(5, L + 3);

  return {
    sightDistance: Math.round(sightDistance),
    timeGap: Math.round(t_gap * 10) / 10,
    minorRoadLeg: Math.round(minorRoadLeg),
    majorRoadLeg: Math.round(sightDistance),
  };
}

/**
 * Calculate sight triangle for intersection
 */
export function calculateSightTriangle(
  majorRoadSpeed: number,
  minorRoadSpeed: number,
  controlType: 'yield' | 'stop' | 'no_control'
): {
  majorRoadLeg: number;
  minorRoadLeg: number;
  area: number;
} {
  const majorISD = calculateIntersectionSightDistance({
    majorRoadSpeed,
    controlType,
    lanesToCross: 2,
  });

  // Minor road sight distance
  // For vehicles on minor road approaching intersection
  let minorRoadLeg: number;
  if (controlType === 'no_control') {
    minorRoadLeg = getStoppingSightDistance(minorRoadSpeed);
  } else if (controlType === 'yield') {
    minorRoadLeg = getStoppingSightDistance(minorRoadSpeed) * 0.75;
  } else {
    // Stop: minimum approach distance
    minorRoadLeg = Math.max(15, minorRoadSpeed * 0.5);
  }

  // Sight triangle area
  const area = (majorISD.majorRoadLeg * minorRoadLeg) / 2;

  return {
    majorRoadLeg: majorISD.majorRoadLeg,
    minorRoadLeg: Math.round(minorRoadLeg),
    area: Math.round(area),
  };
}

// ============================================================================
// Sight Distance on Curves
// ============================================================================

/**
 * Calculate available sight distance on horizontal curve
 *
 * Given lateral clearance (m) from centerline to obstruction
 * m = R × (1 - cos(s / (2R)))
 * s = 2R × arccos(1 - m/R)
 */
export function calculateSightDistanceOnHorizontalCurve(
  radius: number,
  lateralClearance: number
): number {
  const R = radius;
  const m = lateralClearance;

  // Sight distance limited by horizontal clearance
  if (m >= R) return Infinity;

  const s = 2 * R * Math.acos(1 - m / R);
  return Math.round(s * 10) / 10;
}

/**
 * Calculate required lateral clearance for sight distance
 */
export function calculateRequiredClearance(
  radius: number,
  sightDistance: number
): number {
  const R = radius;
  const s = sightDistance;

  // m = R × (1 - cos(s / (2R)))
  const m = R * (1 - Math.cos(s / (2 * R)));
  return Math.round(m * 100) / 100;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate sight distance availability
 */
export function validateSightDistance(
  availableDistance: number,
  requiredType: 'stopping' | 'passing' | 'decision',
  designSpeed: number,
  avoidanceType?: DecisionAvoidanceType
): { adequate: boolean; deficit: number; warnings: string[] } {
  const warnings: string[] = [];
  let requiredDistance: number;

  switch (requiredType) {
    case 'stopping':
      requiredDistance = getStoppingSightDistance(designSpeed);
      break;
    case 'passing':
      requiredDistance = getPassingSightDistance(designSpeed);
      break;
    case 'decision':
      requiredDistance = calculateDecisionSightDistance({
        designSpeed,
        avoidanceType: avoidanceType || 'C',
      }).distance;
      break;
    default:
      requiredDistance = getStoppingSightDistance(designSpeed);
  }

  const deficit = requiredDistance - availableDistance;
  const adequate = deficit <= 0;

  if (!adequate) {
    warnings.push(
      `Available ${requiredType} sight distance (${availableDistance}m) ` +
        `is ${deficit}m less than required (${requiredDistance}m) for ${designSpeed} km/h`
    );
  }

  return {
    adequate,
    deficit: Math.max(0, deficit),
    warnings,
  };
}

/**
 * Check sight distance at specific location
 */
export function checkSightDistanceRequirements(
  availableDistance: number,
  designSpeed: number,
  location: 'normal' | 'intersection' | 'decision_point'
): {
  stoppingOk: boolean;
  passingOk: boolean;
  decisionOk: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  const stoppingSSD = getStoppingSightDistance(designSpeed);
  const stoppingOk = availableDistance >= stoppingSSD;

  if (!stoppingOk) {
    recommendations.push(
      `Reduce speed to ${findMaxSafeSpeed(availableDistance, 'stopping')} km/h ` +
        `or increase sight distance by ${stoppingSSD - availableDistance}m`
    );
  }

  let passingOk = true;
  if (location !== 'intersection') {
    const passingSSD = getPassingSightDistance(designSpeed);
    passingOk = availableDistance >= passingSSD;

    if (!passingOk && availableDistance >= stoppingSSD) {
      recommendations.push(
        'Passing zone should not be marked at this location'
      );
    }
  }

  let decisionOk = true;
  if (location === 'decision_point') {
    const decisionDSD = calculateDecisionSightDistance({
      designSpeed,
      avoidanceType: 'C',
    }).distance;
    decisionOk = availableDistance >= decisionDSD;

    if (!decisionOk) {
      recommendations.push(
        'Additional warning signs recommended for complex decision point'
      );
    }
  }

  return { stoppingOk, passingOk, decisionOk, recommendations };
}

/**
 * Find maximum safe speed for available sight distance
 */
function findMaxSafeSpeed(
  availableDistance: number,
  sightDistanceType: 'stopping' | 'passing'
): number {
  const speeds = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

  for (let i = speeds.length - 1; i >= 0; i--) {
    const required =
      sightDistanceType === 'stopping'
        ? getStoppingSightDistance(speeds[i])
        : getPassingSightDistance(speeds[i]);

    if (availableDistance >= required) {
      return speeds[i];
    }
  }

  return 20; // Minimum
}
