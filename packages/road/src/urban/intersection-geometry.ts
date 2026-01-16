/**
 * Intersection Geometry Design
 *
 * Designs intersection geometry including:
 * - Corner radii for turning movements
 * - Sight triangles
 * - Turning paths for design vehicles
 * - Channelization
 *
 * References:
 * - AASHTO A Policy on Geometric Design
 * - REDEVU Manual
 * - NACTO Urban Street Design Guide
 *
 * @module urban-road/intersection-geometry
 */

import type { Point2D } from '../horizontal';

// ============================================================================
// Types
// ============================================================================

export type IntersectionType =
  | 'right_angle'         // Standard 90° intersection
  | 'skewed'              // Non-perpendicular intersection
  | 't_intersection'      // T or 3-way intersection
  | 'y_intersection'      // Y intersection
  | 'offset'              // Offset T intersections
  | 'roundabout';         // Circular intersection

export type DesignVehicle =
  | 'P'           // Passenger car
  | 'SU'          // Single-unit truck
  | 'BUS'         // City bus
  | 'WB-15'       // Semitrailer (15m)
  | 'WB-19'       // Semitrailer (19m)
  | 'FIRE';       // Fire truck

export interface DesignVehicleSpec {
  /** Vehicle type */
  type: DesignVehicle;
  /** Overall length (m) */
  length: number;
  /** Overall width (m) */
  width: number;
  /** Wheelbase (m) */
  wheelbase: number;
  /** Front overhang (m) */
  frontOverhang: number;
  /** Rear overhang (m) */
  rearOverhang: number;
  /** Minimum turning radius (m) - centerline */
  minTurningRadius: number;
  /** Minimum inside radius (m) */
  minInsideRadius: number;
}

export interface IntersectionInput {
  /** Intersection type */
  type: IntersectionType;
  /** Design vehicle for turning movements */
  designVehicle: DesignVehicle;
  /** Intersection angle (degrees), 90 for right angle */
  angle: number;
  /** Major road width (m) */
  majorRoadWidth: number;
  /** Minor road width (m) */
  minorRoadWidth: number;
  /** Major road speed (km/h) */
  majorSpeed: number;
  /** Minor road speed (km/h) */
  minorSpeed: number;
  /** Control type */
  controlType: 'signalized' | 'stop' | 'yield' | 'uncontrolled';
  /** Include pedestrian facilities */
  pedestrianFacilities: boolean;
  /** Include bicycle facilities */
  bicycleFacilities: boolean;
}

export interface IntersectionResult {
  /** Intersection type */
  type: IntersectionType;
  /** Corner radii (m) */
  cornerRadii: {
    northEast: number;
    southEast: number;
    southWest: number;
    northWest: number;
  };
  /** Effective turning radius considering lanes (m) */
  effectiveTurningRadius: number;
  /** Sight triangles */
  sightTriangles: SightTriangle[];
  /** Crosswalk locations */
  crosswalkLocations: CrosswalkLocation[];
  /** Pedestrian refuge islands if applicable */
  refugeIslands: RefugeIsland[];
  /** Channelization elements */
  channelization: ChannelizationElement[];
  /** Design vehicle turning path envelope */
  turningEnvelope: TurningEnvelope;
  /** Compliance check */
  compliance: IntersectionCompliance;
}

export interface SightTriangle {
  /** Direction (e.g., 'northbound approach') */
  direction: string;
  /** Leg along major road (m) */
  majorLeg: number;
  /** Leg along minor road (m) */
  minorLeg: number;
  /** Clear zone required */
  clearZoneRequired: boolean;
  /** Obstructions to remove */
  obstructions?: string[];
}

export interface CrosswalkLocation {
  /** Approach direction */
  approach: 'north' | 'south' | 'east' | 'west';
  /** Offset from curb face (m) */
  offsetFromCurb: number;
  /** Crosswalk width (m) */
  width: number;
  /** Length (crossing distance) (m) */
  length: number;
  /** Includes median refuge */
  hasRefuge: boolean;
}

export interface RefugeIsland {
  /** Position in intersection */
  position: string;
  /** Width (m) */
  width: number;
  /** Length (m) */
  length: number;
  /** Nose radius (m) */
  noseRadius: number;
  /** Cut-through or ramped */
  pedestrianAccess: 'cut_through' | 'ramped';
}

export interface ChannelizationElement {
  /** Element type */
  type: 'island' | 'median' | 'channelizing_line' | 'raised_pavement';
  /** Position description */
  position: string;
  /** Dimensions */
  dimensions: { length: number; width: number };
  /** Purpose */
  purpose: string;
}

export interface TurningEnvelope {
  /** Design vehicle used */
  designVehicle: DesignVehicle;
  /** Turn direction */
  turnDirection: 'left' | 'right';
  /** Inner edge path points */
  innerEdge: Point2D[];
  /** Outer edge path points */
  outerEdge: Point2D[];
  /** Swept width (m) */
  sweptWidth: number;
  /** Offtracking (m) */
  offtracking: number;
}

export interface IntersectionCompliance {
  /** Overall compliance */
  compliant: boolean;
  /** Corner radii adequate */
  cornerRadiiAdequate: boolean;
  /** Sight distance adequate */
  sightDistanceAdequate: boolean;
  /** Pedestrian facilities adequate */
  pedestrianAdequate: boolean;
  /** Violations */
  violations: string[];
  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// Constants - Design Vehicle Specifications
// ============================================================================

/** Design vehicle specifications (AASHTO) */
export const DESIGN_VEHICLES: Record<DesignVehicle, DesignVehicleSpec> = {
  P: {
    type: 'P',
    length: 5.8,
    width: 2.1,
    wheelbase: 3.4,
    frontOverhang: 0.9,
    rearOverhang: 1.5,
    minTurningRadius: 7.3,
    minInsideRadius: 4.4,
  },
  SU: {
    type: 'SU',
    length: 9.1,
    width: 2.6,
    wheelbase: 6.1,
    frontOverhang: 1.2,
    rearOverhang: 1.8,
    minTurningRadius: 12.8,
    minInsideRadius: 8.5,
  },
  BUS: {
    type: 'BUS',
    length: 12.2,
    width: 2.6,
    wheelbase: 7.6,
    frontOverhang: 2.1,
    rearOverhang: 2.5,
    minTurningRadius: 12.8,
    minInsideRadius: 7.5,
  },
  'WB-15': {
    type: 'WB-15',
    length: 16.7,
    width: 2.6,
    wheelbase: 12.2,
    frontOverhang: 1.2,
    rearOverhang: 0.6,
    minTurningRadius: 13.7,
    minInsideRadius: 5.9,
  },
  'WB-19': {
    type: 'WB-19',
    length: 21.0,
    width: 2.6,
    wheelbase: 15.2,
    frontOverhang: 1.2,
    rearOverhang: 0.9,
    minTurningRadius: 13.7,
    minInsideRadius: 2.8,
  },
  FIRE: {
    type: 'FIRE',
    length: 10.7,
    width: 2.6,
    wheelbase: 6.1,
    frontOverhang: 1.5,
    rearOverhang: 3.1,
    minTurningRadius: 12.2,
    minInsideRadius: 7.9,
  },
};

/** Minimum corner radii by design vehicle for 90° turn (m) */
export const MINIMUM_CORNER_RADII: Record<DesignVehicle, number> = {
  P: 4.5,
  SU: 9.0,
  BUS: 12.0,
  'WB-15': 12.0,
  'WB-19': 15.0,
  FIRE: 12.0,
};

/** Standard corner radii by street classification (m) */
export const STANDARD_CORNER_RADII = {
  local_to_local: 4.5,
  local_to_collector: 6.0,
  collector_to_collector: 7.5,
  collector_to_arterial: 9.0,
  arterial_to_arterial: 12.0,
};

// ============================================================================
// Core Design Functions
// ============================================================================

/**
 * Design intersection geometry
 */
export function designIntersection(input: IntersectionInput): IntersectionResult {
  const {
    type,
    designVehicle,
    angle,
    majorRoadWidth,
    minorRoadWidth,
    majorSpeed,
    minorSpeed,
    controlType,
    pedestrianFacilities,
    bicycleFacilities,
  } = input;

  // Get design vehicle specifications
  const vehicleSpec = DESIGN_VEHICLES[designVehicle];

  // Calculate corner radii
  const baseRadius = calculateCornerRadius(designVehicle, angle);
  const cornerRadii = {
    northEast: baseRadius,
    southEast: baseRadius,
    southWest: baseRadius,
    northWest: baseRadius,
  };

  // Effective turning radius (accounts for lane widths)
  const effectiveTurningRadius = calculateEffectiveTurningRadius(
    baseRadius,
    majorRoadWidth,
    minorRoadWidth
  );

  // Calculate sight triangles
  const sightTriangles = calculateSightTriangles(
    majorSpeed,
    minorSpeed,
    controlType
  );

  // Design crosswalk locations
  const crosswalkLocations = pedestrianFacilities
    ? designCrosswalkLocations(majorRoadWidth, minorRoadWidth, baseRadius)
    : [];

  // Determine if refuge islands are needed
  const refugeIslands = calculateRefugeIslands(
    majorRoadWidth,
    minorRoadWidth,
    pedestrianFacilities
  );

  // Channelization elements
  const channelization = designChannelization(
    type,
    majorRoadWidth,
    minorRoadWidth,
    designVehicle
  );

  // Calculate turning envelope
  const turningEnvelope = calculateTurningEnvelope(vehicleSpec, angle, baseRadius);

  // Compliance check
  const compliance = checkIntersectionCompliance({
    cornerRadii,
    sightTriangles,
    crosswalkLocations,
    designVehicle,
    pedestrianFacilities,
  });

  return {
    type,
    cornerRadii,
    effectiveTurningRadius,
    sightTriangles,
    crosswalkLocations,
    refugeIslands,
    channelization,
    turningEnvelope,
    compliance,
  };
}

/**
 * Calculate corner radius for design vehicle and turn angle
 */
export function calculateCornerRadius(
  designVehicle: DesignVehicle,
  turnAngle: number
): number {
  const baseRadius = MINIMUM_CORNER_RADII[designVehicle];

  // Adjust for skewed intersections
  if (turnAngle < 75) {
    // Acute angle - needs larger radius
    const factor = 90 / turnAngle;
    return Math.round(baseRadius * factor * 10) / 10;
  } else if (turnAngle > 105) {
    // Obtuse angle - can use smaller radius
    const factor = turnAngle / 90;
    return Math.round(baseRadius / factor * 10) / 10;
  }

  return baseRadius;
}

/**
 * Calculate effective turning radius considering lane widths
 */
function calculateEffectiveTurningRadius(
  cornerRadius: number,
  majorRoadWidth: number,
  minorRoadWidth: number
): number {
  // Effective radius is the actual path, considering lane positioning
  // Simplified: corner radius + half approach lane width
  const approachLaneWidth = Math.min(majorRoadWidth, minorRoadWidth) / 2;
  return cornerRadius + approachLaneWidth * 0.75;
}

// ============================================================================
// Sight Triangle Functions
// ============================================================================

/**
 * Calculate sight triangles for intersection
 */
export function calculateSightTriangles(
  majorSpeed: number,
  minorSpeed: number,
  controlType: 'signalized' | 'stop' | 'yield' | 'uncontrolled'
): SightTriangle[] {
  const triangles: SightTriangle[] = [];

  // Calculate sight distance based on speed
  const majorSightDist = calculateIntersectionSightDistance(majorSpeed, controlType);
  const minorSightDist = calculateIntersectionSightDistance(minorSpeed, controlType);

  // Four quadrants for typical intersection
  const directions = ['northbound', 'eastbound', 'southbound', 'westbound'];

  for (const direction of directions) {
    // Determine if on major or minor road
    const isOnMajor = direction === 'northbound' || direction === 'southbound';

    triangles.push({
      direction: `${direction} approach`,
      majorLeg: majorSightDist,
      minorLeg: minorSightDist,
      clearZoneRequired: controlType !== 'signalized',
    });
  }

  return triangles;
}

/**
 * Calculate intersection sight distance
 */
function calculateIntersectionSightDistance(
  speed: number,
  controlType: string
): number {
  // Time gap based on control type
  let timeGap: number;
  switch (controlType) {
    case 'signalized':
      timeGap = 0; // Signal controls gaps
      break;
    case 'stop':
      timeGap = 7.5; // seconds
      break;
    case 'yield':
      timeGap = 6.5; // seconds
      break;
    default:
      timeGap = 8.0; // seconds
  }

  // ISD = V × t / 3.6
  return Math.round((speed * timeGap) / 3.6);
}

// ============================================================================
// Crosswalk and Refuge Functions
// ============================================================================

/**
 * Design crosswalk locations
 */
function designCrosswalkLocations(
  majorRoadWidth: number,
  minorRoadWidth: number,
  cornerRadius: number
): CrosswalkLocation[] {
  const locations: CrosswalkLocation[] = [];

  // Standard offset from curb
  const offsetFromCurb = 1.5; // m from curb return

  // North crosswalk
  locations.push({
    approach: 'north',
    offsetFromCurb,
    width: 3.0, // Standard width
    length: majorRoadWidth,
    hasRefuge: majorRoadWidth > 12,
  });

  // South crosswalk
  locations.push({
    approach: 'south',
    offsetFromCurb,
    width: 3.0,
    length: majorRoadWidth,
    hasRefuge: majorRoadWidth > 12,
  });

  // East crosswalk
  locations.push({
    approach: 'east',
    offsetFromCurb,
    width: 3.0,
    length: minorRoadWidth,
    hasRefuge: minorRoadWidth > 12,
  });

  // West crosswalk
  locations.push({
    approach: 'west',
    offsetFromCurb,
    width: 3.0,
    length: minorRoadWidth,
    hasRefuge: minorRoadWidth > 12,
  });

  return locations;
}

/**
 * Calculate refuge islands
 */
function calculateRefugeIslands(
  majorRoadWidth: number,
  minorRoadWidth: number,
  pedestrianFacilities: boolean
): RefugeIsland[] {
  const islands: RefugeIsland[] = [];

  if (!pedestrianFacilities) return islands;

  // Refuge in major road if wide enough
  if (majorRoadWidth > 12) {
    islands.push({
      position: 'major road median',
      width: Math.min(2.5, majorRoadWidth / 6),
      length: 6.0,
      noseRadius: 0.6,
      pedestrianAccess: 'cut_through',
    });
  }

  // Refuge in minor road if wide enough
  if (minorRoadWidth > 12) {
    islands.push({
      position: 'minor road median',
      width: Math.min(2.0, minorRoadWidth / 6),
      length: 5.0,
      noseRadius: 0.6,
      pedestrianAccess: 'cut_through',
    });
  }

  return islands;
}

// ============================================================================
// Channelization Functions
// ============================================================================

/**
 * Design channelization elements
 */
function designChannelization(
  type: IntersectionType,
  majorRoadWidth: number,
  minorRoadWidth: number,
  designVehicle: DesignVehicle
): ChannelizationElement[] {
  const elements: ChannelizationElement[] = [];

  // Right-turn channelization for large vehicles
  if (designVehicle !== 'P' && majorRoadWidth > 10) {
    elements.push({
      type: 'island',
      position: 'northeast corner',
      dimensions: { length: 6.0, width: 3.0 },
      purpose: 'Right-turn channelization',
    });

    elements.push({
      type: 'island',
      position: 'southwest corner',
      dimensions: { length: 6.0, width: 3.0 },
      purpose: 'Right-turn channelization',
    });
  }

  // Median islands for divided roads
  if (majorRoadWidth > 20) {
    elements.push({
      type: 'median',
      position: 'major road approach north',
      dimensions: { length: 15.0, width: 3.0 },
      purpose: 'Traffic separation and pedestrian refuge',
    });

    elements.push({
      type: 'median',
      position: 'major road approach south',
      dimensions: { length: 15.0, width: 3.0 },
      purpose: 'Traffic separation and pedestrian refuge',
    });
  }

  return elements;
}

// ============================================================================
// Turning Path Functions
// ============================================================================

/**
 * Calculate turning envelope for design vehicle
 */
export function calculateTurningEnvelope(
  vehicleSpec: DesignVehicleSpec,
  turnAngle: number,
  cornerRadius: number
): TurningEnvelope {
  const { width, minTurningRadius, minInsideRadius } = vehicleSpec;

  // Generate simplified turning path points
  const angleRad = (turnAngle * Math.PI) / 180;
  const numPoints = Math.ceil(turnAngle / 5); // Point every 5 degrees

  const innerEdge: Point2D[] = [];
  const outerEdge: Point2D[] = [];

  const centerX = cornerRadius;
  const centerY = cornerRadius;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * angleRad - Math.PI / 2;

    // Inner edge follows minimum inside radius
    innerEdge.push({
      x: Math.round((centerX + minInsideRadius * Math.cos(angle)) * 100) / 100,
      y: Math.round((centerY + minInsideRadius * Math.sin(angle)) * 100) / 100,
    });

    // Outer edge follows minimum turning radius
    outerEdge.push({
      x: Math.round((centerX + minTurningRadius * Math.cos(angle)) * 100) / 100,
      y: Math.round((centerY + minTurningRadius * Math.sin(angle)) * 100) / 100,
    });
  }

  const sweptWidth = minTurningRadius - minInsideRadius;
  const offtracking = sweptWidth - width;

  return {
    designVehicle: vehicleSpec.type,
    turnDirection: 'right',
    innerEdge,
    outerEdge,
    sweptWidth: Math.round(sweptWidth * 100) / 100,
    offtracking: Math.round(offtracking * 100) / 100,
  };
}

/**
 * Check if turning movement is possible
 */
export function checkTurningClearance(
  vehicleType: DesignVehicle,
  cornerRadius: number,
  obstructionDistance: number
): { adequate: boolean; clearance: number; required: number } {
  const vehicleSpec = DESIGN_VEHICLES[vehicleType];
  const requiredClearance = vehicleSpec.minInsideRadius;
  const actualClearance = obstructionDistance;

  return {
    adequate: actualClearance >= requiredClearance,
    clearance: actualClearance,
    required: requiredClearance,
  };
}

// ============================================================================
// Compliance Check
// ============================================================================

/**
 * Check intersection compliance
 */
function checkIntersectionCompliance(params: {
  cornerRadii: { northEast: number; southEast: number; southWest: number; northWest: number };
  sightTriangles: SightTriangle[];
  crosswalkLocations: CrosswalkLocation[];
  designVehicle: DesignVehicle;
  pedestrianFacilities: boolean;
}): IntersectionCompliance {
  const violations: string[] = [];
  const recommendations: string[] = [];

  const minRequired = MINIMUM_CORNER_RADII[params.designVehicle];

  // Check corner radii
  let cornerRadiiAdequate = true;
  for (const [corner, radius] of Object.entries(params.cornerRadii)) {
    if (radius < minRequired) {
      violations.push(
        `${corner} corner radius (${radius}m) is below minimum (${minRequired}m) for ${params.designVehicle}`
      );
      cornerRadiiAdequate = false;
    }
  }

  // Check sight triangles
  const sightDistanceAdequate = params.sightTriangles.every((t) => !t.clearZoneRequired);

  // Check pedestrian facilities
  let pedestrianAdequate = true;
  if (params.pedestrianFacilities) {
    if (params.crosswalkLocations.length < 4) {
      recommendations.push('Consider adding crosswalks on all approaches');
    }

    for (const crosswalk of params.crosswalkLocations) {
      if (crosswalk.length > 12 && !crosswalk.hasRefuge) {
        recommendations.push(
          `Consider adding pedestrian refuge on ${crosswalk.approach} approach (crossing > 12m)`
        );
      }
    }
  }

  return {
    compliant: cornerRadiiAdequate && sightDistanceAdequate && pedestrianAdequate,
    cornerRadiiAdequate,
    sightDistanceAdequate,
    pedestrianAdequate,
    violations,
    recommendations,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get recommended corner radius for street types
 */
export function getRecommendedCornerRadius(
  majorStreetType: 'local' | 'collector' | 'arterial',
  minorStreetType: 'local' | 'collector' | 'arterial'
): number {
  const key = `${majorStreetType}_to_${minorStreetType}` as keyof typeof STANDARD_CORNER_RADII;
  const reverseKey = `${minorStreetType}_to_${majorStreetType}` as keyof typeof STANDARD_CORNER_RADII;

  return STANDARD_CORNER_RADII[key] || STANDARD_CORNER_RADII[reverseKey] || 6.0;
}

/**
 * Calculate curb return length for given radius and angle
 */
export function calculateCurbReturnLength(radius: number, angle: number): number {
  const angleRad = (angle * Math.PI) / 180;
  return radius * angleRad;
}

/**
 * Get design vehicle for given land use
 */
export function getDesignVehicleForLandUse(
  landUse: 'residential' | 'commercial' | 'industrial' | 'school' | 'hospital'
): DesignVehicle {
  switch (landUse) {
    case 'residential':
      return 'P';
    case 'commercial':
      return 'SU';
    case 'industrial':
      return 'WB-15';
    case 'school':
      return 'BUS';
    case 'hospital':
      return 'FIRE';
    default:
      return 'SU';
  }
}
