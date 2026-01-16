/**
 * Traffic Calming Design Module
 *
 * Implements traffic calming device design according to:
 * - MUTCD (Manual on Uniform Traffic Control Devices)
 * - NACTO Urban Street Design Guide
 * - ITE Traffic Calming: State of the Practice
 * - Chilean REDEVU recommendations
 *
 * Supports: speed humps, speed tables, raised crosswalks, chicanes,
 * chokers, mini-roundabouts, and other traffic calming measures.
 */

import type { Point2D } from '../horizontal';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type TrafficCalmingType =
  | 'speed_hump'
  | 'speed_table'
  | 'speed_cushion'
  | 'raised_crosswalk'
  | 'raised_intersection'
  | 'chicane'
  | 'choker'
  | 'neckdown'
  | 'mini_roundabout'
  | 'gateway'
  | 'textured_pavement'
  | 'median_island';

export type HumpProfile = 'parabolic' | 'circular' | 'sinusoidal' | 'flat_top';

export interface TrafficCalmingInput {
  type: TrafficCalmingType;
  roadWidth: number;          // meters
  designSpeed: number;        // km/h - current or target speed
  targetSpeed: number;        // km/h - desired operating speed after calming

  // Location context
  aadt?: number;              // vehicles/day
  existingSpeed85?: number;   // 85th percentile speed km/h
  nearSchool?: boolean;
  nearHospital?: boolean;
  transitRoute?: boolean;
  emergencyRoute?: boolean;

  // Device-specific parameters
  deviceLength?: number;      // meters - for tables, raised crosswalks
  deviceWidth?: number;       // meters - for humps, cushions
  deviceHeight?: number;      // meters - typically 75-100mm

  // Chicane/choker parameters
  lateralShift?: number;      // meters - offset for chicanes

  // Mini-roundabout parameters
  inscribedDiameter?: number; // meters

  // Spacing
  spacingUpstream?: number;   // meters - distance to previous device
  spacingDownstream?: number; // meters - distance to next device
}

export interface SpeedHumpResult {
  profile: HumpProfile;
  height: number;             // meters
  length: number;             // meters
  rampLength: number;         // meters - approach ramp
  flatTopLength: number;      // meters - for speed tables
  crossSection: Point2D[];    // longitudinal profile
  estimatedSpeed: number;     // km/h - speed over device

  // Construction
  material: 'asphalt' | 'concrete' | 'rubber' | 'thermoplastic';
  taperRatio: number;         // typically 1:10 to 1:25
}

export interface ChicaneResult {
  lateralShift: number;       // meters
  approachLength: number;     // meters
  transitionLength: number;   // meters
  totalLength: number;        // meters
  estimatedSpeed: number;     // km/h

  // Layout
  shiftDirection: 'alternating' | 'same_side';
  curbing: boolean;
  planterRequired: boolean;

  // Sight distance
  sightDistanceProvided: number; // meters
  sightDistanceRequired: number; // meters
}

export interface ChokerResult {
  narrowedWidth: number;      // meters
  extensionLength: number;    // meters
  taperLength: number;        // meters
  estimatedSpeed: number;     // km/h

  // Type
  symmetrical: boolean;
  curbing: boolean;

  // Pedestrian features
  pedestrianRefuge: boolean;
  refugeWidth: number;        // meters
}

export interface MiniRoundaboutResult {
  inscribedDiameter: number;  // meters
  centralIslandDiameter: number; // meters
  circulatingWidth: number;   // meters
  approachWidth: number;      // meters

  // Geometry
  deflection: number;         // degrees - path deflection
  entryRadius: number;        // meters
  exitRadius: number;         // meters

  // Central island
  islandType: 'traversable' | 'raised' | 'landscaped';
  islandHeight: number;       // meters

  // Performance
  capacity: number;           // veh/hr
  estimatedSpeed: number;     // km/h
}

export interface MedianIslandResult {
  length: number;             // meters
  width: number;              // meters
  noseOffset: number;         // meters - from curb

  // Pedestrian features
  pedestrianRefuge: boolean;
  refugeWidth: number;        // meters
  cutThroughWidth: number;    // meters

  // Landscaping
  landscaped: boolean;
  minimumPlantingArea: number; // m²
}

export interface TrafficCalmingResult {
  type: TrafficCalmingType;
  input: TrafficCalmingInput;

  // Speed reduction
  estimatedSpeedReduction: number; // km/h
  estimatedOperatingSpeed: number; // km/h

  // Specific results
  speedHump?: SpeedHumpResult;
  chicane?: ChicaneResult;
  choker?: ChokerResult;
  miniRoundabout?: MiniRoundaboutResult;
  medianIsland?: MedianIslandResult;

  // Spacing recommendations
  recommendedSpacing: {
    minimum: number;          // meters
    optimal: number;          // meters
    maximum: number;          // meters
  };

  // Impacts
  impacts: {
    emergencyResponse: 'none' | 'minimal' | 'moderate' | 'significant';
    transitOperations: 'none' | 'minimal' | 'moderate' | 'significant';
    noiseIncrease: boolean;
    drainageImpact: boolean;
    maintenanceLevel: 'low' | 'medium' | 'high';
  };

  // Suitability
  suitability: {
    suitable: boolean;
    score: number;            // 0-100
    concerns: string[];
    recommendations: string[];
  };

  // Cost estimate
  estimatedCost: {
    low: number;              // USD
    high: number;             // USD
    currency: string;
  };

  // Signing and marking
  requiredSigns: string[];
  requiredMarkings: string[];
  warningDistance: number;    // meters
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Speed hump specifications by type
 */
export const SPEED_HUMP_SPECS = {
  speed_hump_12ft: {
    length: 3.66,             // 12 ft
    height: 0.075,            // 75mm (3 in)
    profile: 'parabolic' as HumpProfile,
    expectedSpeed: 25,        // km/h
  },
  speed_hump_14ft: {
    length: 4.27,             // 14 ft
    height: 0.075,
    profile: 'parabolic' as HumpProfile,
    expectedSpeed: 30,
  },
  speed_hump_22ft: {
    length: 6.71,             // 22 ft (speed table)
    height: 0.075,
    profile: 'flat_top' as HumpProfile,
    expectedSpeed: 35,
  },
  speed_cushion: {
    length: 3.66,
    height: 0.065,            // 65mm
    profile: 'parabolic' as HumpProfile,
    expectedSpeed: 30,
    cushionWidth: 1.83,       // 6 ft wide sections
    gapWidth: 0.30,           // gaps for emergency vehicles
  },
};

/**
 * Target speed to device spacing relationship
 */
export const SPEED_TO_SPACING: Record<number, { minimum: number; optimal: number; maximum: number }> = {
  20: { minimum: 60, optimal: 80, maximum: 100 },
  25: { minimum: 75, optimal: 100, maximum: 130 },
  30: { minimum: 90, optimal: 120, maximum: 160 },
  35: { minimum: 110, optimal: 150, maximum: 200 },
  40: { minimum: 130, optimal: 180, maximum: 240 },
};

/**
 * Mini-roundabout design parameters by inscribed diameter
 */
export const MINI_ROUNDABOUT_PARAMS = {
  small: {
    inscribedDiameter: 13,    // meters
    centralIslandDiameter: 4,
    circulatingWidth: 4.5,
    capacity: 15000,          // veh/day
    deflection: 30,           // degrees minimum
  },
  medium: {
    inscribedDiameter: 18,
    centralIslandDiameter: 6,
    circulatingWidth: 5,
    capacity: 20000,
    deflection: 45,
  },
  large: {
    inscribedDiameter: 25,
    centralIslandDiameter: 10,
    circulatingWidth: 5.5,
    capacity: 25000,
    deflection: 60,
  },
};

/**
 * Cost estimates by device type (USD, 2024)
 */
export const DEVICE_COSTS: Record<TrafficCalmingType, { low: number; high: number }> = {
  speed_hump: { low: 1500, high: 3500 },
  speed_table: { low: 3000, high: 8000 },
  speed_cushion: { low: 2000, high: 5000 },
  raised_crosswalk: { low: 4000, high: 12000 },
  raised_intersection: { low: 50000, high: 150000 },
  chicane: { low: 5000, high: 20000 },
  choker: { low: 3000, high: 15000 },
  neckdown: { low: 8000, high: 25000 },
  mini_roundabout: { low: 20000, high: 75000 },
  gateway: { low: 10000, high: 40000 },
  textured_pavement: { low: 2000, high: 8000 },
  median_island: { low: 5000, high: 25000 },
};

// ============================================================================
// Speed Hump/Table Design Functions
// ============================================================================

/**
 * Calculate speed hump longitudinal profile
 */
export function calculateSpeedHumpProfile(
  height: number,
  length: number,
  profile: HumpProfile = 'parabolic'
): Point2D[] {
  const points: Point2D[] = [];
  const numPoints = 21; // resolution

  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * length;
    let y: number;

    switch (profile) {
      case 'parabolic':
        // y = 4h * (x/L) * (1 - x/L)
        y = 4 * height * (x / length) * (1 - x / length);
        break;

      case 'circular':
        // Circular arc
        const radius = (length * length) / (8 * height) + height / 2;
        const centerY = -radius + height;
        const xFromCenter = x - length / 2;
        y = centerY + Math.sqrt(radius * radius - xFromCenter * xFromCenter);
        break;

      case 'sinusoidal':
        // y = h/2 * (1 - cos(2πx/L))
        y = (height / 2) * (1 - Math.cos(2 * Math.PI * x / length));
        break;

      case 'flat_top':
        // Speed table profile with ramps
        const rampLength = length * 0.25;
        const flatLength = length * 0.5;

        if (x < rampLength) {
          // Approach ramp
          y = height * (x / rampLength);
        } else if (x < rampLength + flatLength) {
          // Flat top
          y = height;
        } else {
          // Exit ramp
          y = height * (1 - (x - rampLength - flatLength) / rampLength);
        }
        break;

      default:
        y = 0;
    }

    points.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
  }

  return points;
}

/**
 * Design speed hump or table
 */
export function designSpeedHump(
  input: TrafficCalmingInput
): SpeedHumpResult {
  const height = input.deviceHeight || 0.075; // default 75mm
  const targetSpeed = input.targetSpeed;

  // Determine length based on target speed
  let length: number;
  let profile: HumpProfile;
  let flatTopLength = 0;

  if (input.type === 'speed_table' || input.type === 'raised_crosswalk') {
    // Speed tables have flat tops
    profile = 'flat_top';
    length = input.deviceLength || 6.7; // 22 ft default
    flatTopLength = length * 0.5;
  } else if (input.type === 'speed_cushion') {
    profile = 'parabolic';
    length = input.deviceLength || 3.66;
  } else {
    // Standard speed hump
    profile = 'parabolic';

    if (targetSpeed <= 25) {
      length = 3.66; // 12 ft
    } else if (targetSpeed <= 30) {
      length = 4.27; // 14 ft
    } else {
      length = 5.5; // longer hump for higher speeds
    }
  }

  // Calculate ramp length (typically 25% of total for parabolic)
  const rampLength = profile === 'flat_top' ? length * 0.25 : length / 2;

  // Calculate taper ratio
  const taperRatio = rampLength / height;

  // Estimate speed over device (empirical formula)
  // Based on hump length and height
  const estimatedSpeed = 15 + (length / height) * 0.5;

  // Generate cross-section
  const crossSection = calculateSpeedHumpProfile(height, length, profile);

  // Determine material based on context
  let material: 'asphalt' | 'concrete' | 'rubber' | 'thermoplastic' = 'asphalt';
  if (input.transitRoute) {
    material = 'concrete'; // More durable for bus routes
  } else if (input.type === 'speed_cushion') {
    material = 'rubber'; // Often prefabricated
  }

  return {
    profile,
    height,
    length,
    rampLength,
    flatTopLength,
    crossSection,
    estimatedSpeed: Math.round(estimatedSpeed),
    material,
    taperRatio: Math.round(taperRatio * 10) / 10,
  };
}

// ============================================================================
// Chicane Design Functions
// ============================================================================

/**
 * Design chicane (horizontal deflection)
 */
export function designChicane(input: TrafficCalmingInput): ChicaneResult {
  const roadWidth = input.roadWidth;
  const targetSpeed = input.targetSpeed;

  // Calculate lateral shift needed for speed reduction
  // Empirical: greater shift = lower speed
  let lateralShift = input.lateralShift || roadWidth * 0.4;

  // Adjust shift based on target speed
  if (targetSpeed <= 25) {
    lateralShift = Math.max(lateralShift, roadWidth * 0.5);
  } else if (targetSpeed <= 30) {
    lateralShift = Math.max(lateralShift, roadWidth * 0.4);
  } else {
    lateralShift = Math.max(lateralShift, roadWidth * 0.3);
  }

  // Calculate transition geometry
  // Using S-curve geometry for smooth transition
  const designSpeed_mps = targetSpeed / 3.6;
  const lateralAccel = 0.1 * 9.81; // 0.1g lateral acceleration

  // Transition length from dynamics
  const transitionLength = (designSpeed_mps * designSpeed_mps * lateralShift) /
                          (2 * lateralAccel * lateralShift / 2);

  // Minimum transition for comfort (typically 30-50m depending on speed)
  const minTransition = targetSpeed * 1.2; // rough rule

  const actualTransition = Math.max(transitionLength, minTransition);

  // Approach length (where driver perceives narrowing)
  const approachLength = actualTransition * 0.5;

  // Total length of chicane element
  const totalLength = 2 * actualTransition + approachLength;

  // Estimate operating speed through chicane
  // Based on lateral shift and transition length
  const estimatedSpeed = Math.min(
    targetSpeed,
    Math.sqrt(lateralAccel * 2 * actualTransition / lateralShift) * 3.6
  );

  // Sight distance requirements
  const sightDistanceRequired = calculateStoppingSightDistanceSimple(targetSpeed);
  const sightDistanceProvided = totalLength * 0.8; // approximate

  // Determine if planters needed (for landscaping/visibility)
  const planterRequired = lateralShift > roadWidth * 0.35;

  return {
    lateralShift: Math.round(lateralShift * 100) / 100,
    approachLength: Math.round(approachLength * 10) / 10,
    transitionLength: Math.round(actualTransition * 10) / 10,
    totalLength: Math.round(totalLength * 10) / 10,
    estimatedSpeed: Math.round(estimatedSpeed),
    shiftDirection: 'alternating',
    curbing: true,
    planterRequired,
    sightDistanceProvided: Math.round(sightDistanceProvided),
    sightDistanceRequired: Math.round(sightDistanceRequired),
  };
}

// ============================================================================
// Choker/Neckdown Design Functions
// ============================================================================

/**
 * Design choker or neckdown
 */
export function designChoker(input: TrafficCalmingInput): ChokerResult {
  const roadWidth = input.roadWidth;
  const targetSpeed = input.targetSpeed;

  // Minimum narrowed width (must accommodate design vehicle)
  const minNarrowedWidth = 3.0; // single lane minimum

  // Calculate narrowed width based on target speed
  // Narrower = slower
  let narrowedWidth: number;

  if (targetSpeed <= 20) {
    narrowedWidth = 3.0;
  } else if (targetSpeed <= 25) {
    narrowedWidth = 3.3;
  } else if (targetSpeed <= 30) {
    narrowedWidth = 3.6;
  } else {
    narrowedWidth = 4.0;
  }

  // Extension into roadway from each side
  const extensionEachSide = (roadWidth - narrowedWidth) / 2;
  const extensionLength = input.deviceLength || extensionEachSide * 2.5;

  // Taper length (typically 1:5 to 1:10 taper)
  const taperRatio = targetSpeed <= 25 ? 5 : 8;
  const taperLength = extensionEachSide * taperRatio;

  // Estimate speed reduction
  const speedReduction = (roadWidth - narrowedWidth) * 3; // roughly 3 km/h per meter narrowed
  const estimatedSpeed = Math.max(15, input.existingSpeed85 || input.designSpeed - speedReduction);

  // Pedestrian refuge if wide enough
  const pedestrianRefuge = extensionEachSide >= 2.0;
  const refugeWidth = pedestrianRefuge ? Math.min(extensionEachSide, 2.5) : 0;

  // Determine if symmetrical (both sides) or one-sided
  const symmetrical = extensionEachSide > 1.5;

  return {
    narrowedWidth: Math.round(narrowedWidth * 100) / 100,
    extensionLength: Math.round(extensionLength * 10) / 10,
    taperLength: Math.round(taperLength * 10) / 10,
    estimatedSpeed: Math.round(estimatedSpeed),
    symmetrical,
    curbing: true,
    pedestrianRefuge,
    refugeWidth: Math.round(refugeWidth * 100) / 100,
  };
}

// ============================================================================
// Mini-Roundabout Design Functions
// ============================================================================

/**
 * Design mini-roundabout
 */
export function designMiniRoundabout(input: TrafficCalmingInput): MiniRoundaboutResult {
  const roadWidth = input.roadWidth;

  // Determine size based on input or road width
  let inscribedDiameter = input.inscribedDiameter;

  if (!inscribedDiameter) {
    // Size based on road width and AADT
    const aadt = input.aadt || 5000;

    if (roadWidth <= 6 || aadt <= 10000) {
      inscribedDiameter = MINI_ROUNDABOUT_PARAMS.small.inscribedDiameter;
    } else if (roadWidth <= 9 || aadt <= 20000) {
      inscribedDiameter = MINI_ROUNDABOUT_PARAMS.medium.inscribedDiameter;
    } else {
      inscribedDiameter = MINI_ROUNDABOUT_PARAMS.large.inscribedDiameter;
    }
  }

  // Central island diameter (typically 25-40% of inscribed)
  const centralIslandDiameter = inscribedDiameter * 0.3;

  // Circulating width
  const circulatingWidth = (inscribedDiameter - centralIslandDiameter) / 2;

  // Approach width (typically matches lane width)
  const approachWidth = Math.min(roadWidth / 2, 4.0);

  // Entry/exit radii (larger radius = higher speed)
  const entryRadius = inscribedDiameter * 0.3;
  const exitRadius = inscribedDiameter * 0.4;

  // Path deflection (degrees)
  // Higher deflection = lower speed
  const deflection = Math.atan2(inscribedDiameter / 2, inscribedDiameter / 2) * 180 / Math.PI * 2;

  // Central island type based on size
  let islandType: 'traversable' | 'raised' | 'landscaped';
  let islandHeight: number;

  if (inscribedDiameter <= 15) {
    islandType = 'traversable'; // Dome for trucks
    islandHeight = 0.1; // 100mm max
  } else if (inscribedDiameter <= 20) {
    islandType = 'raised';
    islandHeight = 0.15;
  } else {
    islandType = 'landscaped';
    islandHeight = 0.15;
  }

  // Capacity estimate (simplified)
  const capacity = Math.round(800 + (inscribedDiameter - 13) * 100);

  // Estimate operating speed
  const estimatedSpeed = Math.round(20 + (inscribedDiameter - 13) * 0.5);

  return {
    inscribedDiameter: Math.round(inscribedDiameter * 10) / 10,
    centralIslandDiameter: Math.round(centralIslandDiameter * 10) / 10,
    circulatingWidth: Math.round(circulatingWidth * 10) / 10,
    approachWidth: Math.round(approachWidth * 10) / 10,
    deflection: Math.round(deflection),
    entryRadius: Math.round(entryRadius * 10) / 10,
    exitRadius: Math.round(exitRadius * 10) / 10,
    islandType,
    islandHeight,
    capacity,
    estimatedSpeed,
  };
}

// ============================================================================
// Median Island Design Functions
// ============================================================================

/**
 * Design median island (refuge or narrowing)
 */
export function designMedianIsland(input: TrafficCalmingInput): MedianIslandResult {
  const roadWidth = input.roadWidth;

  // Island width (typically 1.5-3.0m)
  const width = Math.min(Math.max(roadWidth * 0.15, 1.5), 3.0);

  // Island length (minimum 6m for pedestrian refuge)
  const minLength = input.nearSchool ? 10 : 6;
  const length = input.deviceLength || minLength;

  // Nose offset from curb (approach taper)
  const noseOffset = width * 3; // 1:3 taper

  // Pedestrian refuge features
  const pedestrianRefuge = width >= 1.8;
  const refugeWidth = pedestrianRefuge ? Math.max(width - 0.3, 1.5) : 0;
  const cutThroughWidth = pedestrianRefuge ? Math.max(width - 0.6, 1.2) : 0;

  // Landscaping
  const landscaped = width >= 2.0;
  const minimumPlantingArea = landscaped ? (length - 2) * (width - 0.6) : 0;

  return {
    length: Math.round(length * 10) / 10,
    width: Math.round(width * 100) / 100,
    noseOffset: Math.round(noseOffset * 10) / 10,
    pedestrianRefuge,
    refugeWidth: Math.round(refugeWidth * 100) / 100,
    cutThroughWidth: Math.round(cutThroughWidth * 100) / 100,
    landscaped,
    minimumPlantingArea: Math.round(minimumPlantingArea * 10) / 10,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple stopping sight distance calculation
 */
function calculateStoppingSightDistanceSimple(speed: number): number {
  const V = speed; // km/h
  const t = 2.5;   // reaction time (s)
  const a = 3.4;   // deceleration (m/s²)

  const V_mps = V / 3.6;
  const d_reaction = V_mps * t;
  const d_braking = (V_mps * V_mps) / (2 * a);

  return d_reaction + d_braking;
}

/**
 * Get recommended spacing for devices
 */
export function getRecommendedSpacing(targetSpeed: number): { minimum: number; optimal: number; maximum: number } {
  // Find closest target speed in table
  const speeds = Object.keys(SPEED_TO_SPACING).map(Number).sort((a, b) => a - b);

  let closest = speeds[0];
  for (const speed of speeds) {
    if (Math.abs(speed - targetSpeed) < Math.abs(closest - targetSpeed)) {
      closest = speed;
    }
  }

  return SPEED_TO_SPACING[closest];
}

/**
 * Assess impacts of traffic calming device
 */
export function assessImpacts(input: TrafficCalmingInput): TrafficCalmingResult['impacts'] {
  const type = input.type;

  let emergencyResponse: 'none' | 'minimal' | 'moderate' | 'significant' = 'minimal';
  let transitOperations: 'none' | 'minimal' | 'moderate' | 'significant' = 'none';
  let noiseIncrease = false;
  let drainageImpact = false;
  let maintenanceLevel: 'low' | 'medium' | 'high' = 'low';

  switch (type) {
    case 'speed_hump':
      emergencyResponse = input.emergencyRoute ? 'significant' : 'moderate';
      transitOperations = input.transitRoute ? 'moderate' : 'minimal';
      noiseIncrease = true; // Vehicle braking/accelerating
      drainageImpact = true;
      maintenanceLevel = 'medium';
      break;

    case 'speed_table':
    case 'raised_crosswalk':
      emergencyResponse = input.emergencyRoute ? 'moderate' : 'minimal';
      transitOperations = input.transitRoute ? 'moderate' : 'minimal';
      noiseIncrease = true;
      drainageImpact = true;
      maintenanceLevel = 'medium';
      break;

    case 'speed_cushion':
      emergencyResponse = 'minimal'; // Emergency vehicles straddle
      transitOperations = 'minimal'; // Buses straddle
      noiseIncrease = true;
      drainageImpact = false;
      maintenanceLevel = 'low';
      break;

    case 'chicane':
      emergencyResponse = 'moderate';
      transitOperations = input.transitRoute ? 'significant' : 'minimal';
      noiseIncrease = false;
      drainageImpact = true;
      maintenanceLevel = 'medium';
      break;

    case 'choker':
    case 'neckdown':
      emergencyResponse = 'minimal';
      transitOperations = input.transitRoute ? 'moderate' : 'minimal';
      noiseIncrease = false;
      drainageImpact = true;
      maintenanceLevel = 'medium';
      break;

    case 'mini_roundabout':
      emergencyResponse = 'minimal';
      transitOperations = input.transitRoute ? 'moderate' : 'minimal';
      noiseIncrease = false;
      drainageImpact = true;
      maintenanceLevel = 'high';
      break;

    case 'median_island':
      emergencyResponse = 'none';
      transitOperations = 'none';
      noiseIncrease = false;
      drainageImpact = true;
      maintenanceLevel = landscapedIslandMaintenance(input);
      break;

    case 'gateway':
      emergencyResponse = 'none';
      transitOperations = 'none';
      noiseIncrease = false;
      drainageImpact = false;
      maintenanceLevel = 'low';
      break;

    case 'textured_pavement':
      emergencyResponse = 'none';
      transitOperations = 'none';
      noiseIncrease = true;
      drainageImpact = false;
      maintenanceLevel = 'medium';
      break;
  }

  return {
    emergencyResponse,
    transitOperations,
    noiseIncrease,
    drainageImpact,
    maintenanceLevel,
  };
}

function landscapedIslandMaintenance(input: TrafficCalmingInput): 'low' | 'medium' | 'high' {
  const width = (input.deviceWidth || 2.0);
  return width >= 2.0 ? 'high' : 'low'; // Landscaped requires more maintenance
}

/**
 * Assess suitability of traffic calming measure
 */
export function assessSuitability(input: TrafficCalmingInput): TrafficCalmingResult['suitability'] {
  const concerns: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  const type = input.type;

  // Check emergency route concerns
  if (input.emergencyRoute) {
    if (type === 'speed_hump' || type === 'chicane') {
      concerns.push('May delay emergency response vehicles');
      score -= 20;
      recommendations.push('Consider speed cushions or raised crosswalks as alternatives');
    }
  }

  // Check transit route concerns
  if (input.transitRoute) {
    if (type === 'speed_hump') {
      concerns.push('Speed humps cause discomfort for transit passengers');
      score -= 15;
      recommendations.push('Use speed tables or speed cushions for transit routes');
    }
    if (type === 'chicane' && input.roadWidth < 8) {
      concerns.push('Chicanes may obstruct bus turning movements');
      score -= 20;
    }
  }

  // Check road width requirements
  if (type === 'mini_roundabout' && input.roadWidth < 6) {
    concerns.push('Insufficient road width for mini-roundabout');
    score -= 30;
    recommendations.push('Consider choker or speed table instead');
  }

  if (type === 'chicane' && input.roadWidth < 5.5) {
    concerns.push('Insufficient road width for chicane');
    score -= 30;
  }

  // Check school zone appropriateness
  if (input.nearSchool) {
    if (type === 'speed_table' || type === 'raised_crosswalk') {
      score += 10; // Bonus for pedestrian-friendly options
    }
    recommendations.push('Combine with school zone signing and markings');
  }

  // Check hospital zone
  if (input.nearHospital) {
    if (type === 'speed_hump') {
      concerns.push('Speed humps may affect patient transport comfort');
      score -= 15;
      recommendations.push('Use speed tables or speed cushions near hospitals');
    }
  }

  // Check AADT constraints
  if (input.aadt) {
    if (input.aadt > 10000 && type === 'speed_hump') {
      concerns.push('High traffic volume may cause excessive noise from braking');
      recommendations.push('Consider geometric measures for high-volume streets');
    }
    if (input.aadt > 25000 && type === 'mini_roundabout') {
      concerns.push('Traffic volume may exceed mini-roundabout capacity');
      score -= 20;
    }
  }

  // Check speed differential
  const speedReduction = (input.existingSpeed85 || input.designSpeed) - input.targetSpeed;
  if (speedReduction > 25 && ['speed_hump', 'speed_table'].includes(type)) {
    concerns.push('Large speed reduction may require multiple devices');
    recommendations.push('Consider using devices in series for gradual speed reduction');
  }

  return {
    suitable: score >= 60,
    score: Math.max(0, Math.min(100, score)),
    concerns,
    recommendations,
  };
}

/**
 * Get required signs for traffic calming device
 */
export function getRequiredSigns(type: TrafficCalmingType): string[] {
  const signs: string[] = [];

  switch (type) {
    case 'speed_hump':
    case 'speed_table':
    case 'speed_cushion':
      signs.push('W17-1 (Speed Hump Symbol)');
      signs.push('W13-1P (ADVISORY SPEED plaque)');
      break;

    case 'raised_crosswalk':
      signs.push('W17-1 (Speed Hump Symbol)');
      signs.push('W11-2 (Pedestrian Warning)');
      signs.push('R1-5 (YIELD HERE TO PEDESTRIANS)');
      break;

    case 'chicane':
    case 'choker':
    case 'neckdown':
      signs.push('W8-1 (Road Narrows)');
      signs.push('W1-4 (Curve Warning) if applicable');
      break;

    case 'mini_roundabout':
      signs.push('R6-5P (Roundabout Circulation)');
      signs.push('W16-12P (ROUNDABOUT AHEAD)');
      signs.push('R1-2 (YIELD at entry)');
      break;

    case 'median_island':
      signs.push('W12-1 (KEEP RIGHT)');
      signs.push('Object Markers on island nose');
      break;

    case 'gateway':
      signs.push('Speed Limit sign');
      signs.push('Community identification sign');
      break;
  }

  return signs;
}

/**
 * Get required markings for traffic calming device
 */
export function getRequiredMarkings(type: TrafficCalmingType): string[] {
  const markings: string[] = [];

  switch (type) {
    case 'speed_hump':
    case 'speed_table':
    case 'speed_cushion':
      markings.push('Triangle speed hump markings');
      markings.push('Advance pavement marking "HUMP"');
      break;

    case 'raised_crosswalk':
      markings.push('Crosswalk striping (continental pattern)');
      markings.push('Triangle speed hump markings on approaches');
      markings.push('Stop/yield lines');
      break;

    case 'chicane':
    case 'choker':
      markings.push('Edge lines along narrowing');
      markings.push('Center line through device');
      markings.push('Curb face reflectorization');
      break;

    case 'mini_roundabout':
      markings.push('Yield lines at each entry');
      markings.push('Lane arrows');
      markings.push('Central island marking');
      markings.push('Crosswalk striping');
      break;

    case 'median_island':
      markings.push('Yellow curb on island nose');
      markings.push('Diagonal crosshatch on island');
      break;

    case 'textured_pavement':
      markings.push('Textured surface treatment');
      markings.push('Contrasting color');
      break;
  }

  return markings;
}

// ============================================================================
// Main Design Function
// ============================================================================

/**
 * Design traffic calming device
 */
export function designTrafficCalming(input: TrafficCalmingInput): TrafficCalmingResult {
  const type = input.type;

  // Design specific device type
  let speedHump: SpeedHumpResult | undefined;
  let chicane: ChicaneResult | undefined;
  let choker: ChokerResult | undefined;
  let miniRoundabout: MiniRoundaboutResult | undefined;
  let medianIsland: MedianIslandResult | undefined;

  let estimatedOperatingSpeed: number;

  switch (type) {
    case 'speed_hump':
    case 'speed_table':
    case 'speed_cushion':
    case 'raised_crosswalk':
      speedHump = designSpeedHump(input);
      estimatedOperatingSpeed = speedHump.estimatedSpeed;
      break;

    case 'chicane':
      chicane = designChicane(input);
      estimatedOperatingSpeed = chicane.estimatedSpeed;
      break;

    case 'choker':
    case 'neckdown':
      choker = designChoker(input);
      estimatedOperatingSpeed = choker.estimatedSpeed;
      break;

    case 'mini_roundabout':
      miniRoundabout = designMiniRoundabout(input);
      estimatedOperatingSpeed = miniRoundabout.estimatedSpeed;
      break;

    case 'median_island':
      medianIsland = designMedianIsland(input);
      estimatedOperatingSpeed = input.targetSpeed; // Minimal speed effect
      break;

    case 'gateway':
    case 'textured_pavement':
      // These are primarily psychological measures
      estimatedOperatingSpeed = input.existingSpeed85
        ? input.existingSpeed85 * 0.9
        : input.designSpeed * 0.9;
      break;

    case 'raised_intersection':
      speedHump = designSpeedHump({
        ...input,
        type: 'speed_table',
        deviceLength: input.deviceLength || 15, // Larger for intersection
      });
      estimatedOperatingSpeed = speedHump.estimatedSpeed - 5; // More reduction
      break;

    default:
      estimatedOperatingSpeed = input.targetSpeed;
  }

  // Calculate speed reduction
  const existingSpeed = input.existingSpeed85 || input.designSpeed;
  const estimatedSpeedReduction = existingSpeed - estimatedOperatingSpeed;

  // Get spacing recommendations
  const recommendedSpacing = getRecommendedSpacing(input.targetSpeed);

  // Assess impacts
  const impacts = assessImpacts(input);

  // Assess suitability
  const suitability = assessSuitability(input);

  // Get cost estimates
  const estimatedCost = {
    ...DEVICE_COSTS[type],
    currency: 'USD',
  };

  // Get required signs and markings
  const requiredSigns = getRequiredSigns(type);
  const requiredMarkings = getRequiredMarkings(type);

  // Warning distance (advance signing)
  const warningDistance = Math.max(50, calculateStoppingSightDistanceSimple(existingSpeed));

  return {
    type,
    input,
    estimatedSpeedReduction: Math.round(estimatedSpeedReduction * 10) / 10,
    estimatedOperatingSpeed: Math.round(estimatedOperatingSpeed),
    speedHump,
    chicane,
    choker,
    miniRoundabout,
    medianIsland,
    recommendedSpacing,
    impacts,
    suitability,
    estimatedCost,
    requiredSigns,
    requiredMarkings,
    warningDistance: Math.round(warningDistance),
  };
}

// ============================================================================
// Validation and Analysis Functions
// ============================================================================

/**
 * Validate traffic calming device spacing
 */
export function validateDeviceSpacing(
  devices: Array<{ station: number; type: TrafficCalmingType }>,
  targetSpeed: number
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const spacing = getRecommendedSpacing(targetSpeed);

  // Sort by station
  const sorted = [...devices].sort((a, b) => a.station - b.station);

  for (let i = 1; i < sorted.length; i++) {
    const dist = sorted[i].station - sorted[i - 1].station;

    if (dist < spacing.minimum) {
      issues.push(
        `Devices at ${sorted[i - 1].station}m and ${sorted[i].station}m ` +
        `are too close (${dist}m < ${spacing.minimum}m minimum)`
      );
    }

    if (dist > spacing.maximum) {
      issues.push(
        `Gap between devices at ${sorted[i - 1].station}m and ${sorted[i].station}m ` +
        `may allow speed recovery (${dist}m > ${spacing.maximum}m maximum)`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Recommend traffic calming measures based on context
 */
export function recommendTrafficCalming(
  roadWidth: number,
  targetSpeed: number,
  context: {
    aadt?: number;
    transitRoute?: boolean;
    emergencyRoute?: boolean;
    nearSchool?: boolean;
    nearHospital?: boolean;
    residentialArea?: boolean;
  }
): Array<{ type: TrafficCalmingType; suitability: number; reason: string }> {
  const recommendations: Array<{ type: TrafficCalmingType; suitability: number; reason: string }> = [];

  // Speed tables - good general option
  if (roadWidth >= 5) {
    let suitability = 80;
    if (context.nearSchool) suitability += 10;
    if (context.transitRoute) suitability -= 10;
    if (context.nearHospital) suitability -= 10;

    recommendations.push({
      type: 'speed_table',
      suitability,
      reason: 'Effective speed reduction with moderate comfort impact',
    });
  }

  // Speed cushions - good for emergency/transit routes
  if (roadWidth >= 5 && (context.emergencyRoute || context.transitRoute)) {
    recommendations.push({
      type: 'speed_cushion',
      suitability: 85,
      reason: 'Allows emergency vehicles and buses to straddle cushions',
    });
  }

  // Chicanes - good for residential areas
  if (roadWidth >= 6 && context.residentialArea && !context.transitRoute) {
    recommendations.push({
      type: 'chicane',
      suitability: 75,
      reason: 'Effective horizontal deflection with landscaping opportunity',
    });
  }

  // Raised crosswalks - good near schools
  if (context.nearSchool) {
    recommendations.push({
      type: 'raised_crosswalk',
      suitability: 90,
      reason: 'Enhances pedestrian safety and visibility at crossings',
    });
  }

  // Chokers - good for pedestrian areas
  if (roadWidth >= 7) {
    recommendations.push({
      type: 'choker',
      suitability: 70,
      reason: 'Creates pedestrian refuge and visual narrowing',
    });
  }

  // Mini-roundabouts - good for intersections
  if (roadWidth >= 6) {
    let suitability = 75;
    if (context.aadt && context.aadt > 20000) suitability -= 20;
    if (context.transitRoute) suitability -= 10;

    recommendations.push({
      type: 'mini_roundabout',
      suitability,
      reason: 'Reduces conflicts at intersections with moderate capacity',
    });
  }

  // Sort by suitability
  return recommendations.sort((a, b) => b.suitability - a.suitability);
}

/**
 * Calculate expected speed profile along corridor with multiple devices
 */
export function calculateSpeedProfile(
  devices: Array<{ station: number; type: TrafficCalmingType; operatingSpeed: number }>,
  corridorLength: number,
  freeFlowSpeed: number,
  accelerationRate: number = 1.0  // m/s² typical urban acceleration
): Array<{ station: number; speed: number }> {
  const profile: Array<{ station: number; speed: number }> = [];

  // Sort devices by station
  const sorted = [...devices].sort((a, b) => a.station - b.station);

  // Add start point
  profile.push({ station: 0, speed: freeFlowSpeed });

  // Acceleration distance to free flow speed from device
  const accelDistanceFromDevice = (freeFlowSpeed: number, deviceSpeed: number) => {
    const v1 = deviceSpeed / 3.6; // m/s
    const v2 = freeFlowSpeed / 3.6;
    return (v2 * v2 - v1 * v1) / (2 * accelerationRate);
  };

  // Deceleration distance before device
  const decelDistanceToDevice = (approachSpeed: number, deviceSpeed: number) => {
    const v1 = approachSpeed / 3.6;
    const v2 = deviceSpeed / 3.6;
    return (v1 * v1 - v2 * v2) / (2 * 3.0); // 3.0 m/s² comfortable decel
  };

  for (let i = 0; i < sorted.length; i++) {
    const device = sorted[i];

    // Get approach speed (limited by previous device recovery)
    let approachSpeed = freeFlowSpeed;
    if (i > 0) {
      const prevDevice = sorted[i - 1];
      const distFromPrev = device.station - prevDevice.station;
      const maxRecoverySpeed = prevDevice.operatingSpeed / 3.6 +
        Math.sqrt(2 * accelerationRate * distFromPrev);
      approachSpeed = Math.min(freeFlowSpeed, maxRecoverySpeed * 3.6);
    }

    // Deceleration zone
    const decelDist = decelDistanceToDevice(approachSpeed, device.operatingSpeed);
    profile.push({
      station: device.station - decelDist,
      speed: Math.round(approachSpeed)
    });

    // At device
    profile.push({
      station: device.station,
      speed: device.operatingSpeed
    });

    // Acceleration zone (if space before next device)
    const accelDist = accelDistanceFromDevice(freeFlowSpeed, device.operatingSpeed);
    profile.push({
      station: device.station + accelDist,
      speed: Math.round(freeFlowSpeed)
    });
  }

  // Add end point
  profile.push({ station: corridorLength, speed: freeFlowSpeed });

  // Remove duplicates and sort
  return profile
    .filter((p, i, arr) => i === 0 || p.station !== arr[i - 1].station)
    .sort((a, b) => a.station - b.station);
}
