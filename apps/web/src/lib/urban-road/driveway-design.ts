/**
 * Driveway Design (Accesos Vehiculares)
 *
 * Designs vehicular access points (driveways) for different land uses
 * including residential, commercial, and industrial applications.
 *
 * Key considerations:
 * - Width requirements by use type
 * - Spacing from intersections and other driveways
 * - Turning radius for design vehicles
 * - Pedestrian crossing maintenance
 * - Sight distance requirements
 *
 * References:
 * - REDEVU Manual
 * - OGUC Ordenanza General
 * - Municipal regulations
 *
 * @module urban-road/driveway-design
 */

// ============================================================================
// Types
// ============================================================================

export type DrivewayType =
  | 'residential_single'    // Single-family residential
  | 'residential_multi'     // Multi-family residential
  | 'commercial_light'      // Small commercial (retail, office)
  | 'commercial_heavy'      // Large commercial (shopping center)
  | 'industrial_light'      // Light industrial
  | 'industrial_heavy'      // Heavy industrial (truck traffic)
  | 'parking_lot'           // Parking lot access
  | 'service';              // Service/emergency access

export type DrivewayConfiguration =
  | 'single'      // One driveway
  | 'double'      // Two-way driveway
  | 'divided';    // Divided entry/exit

export interface DrivewayInput {
  /** Type of driveway */
  type: DrivewayType;
  /** Configuration */
  configuration: DrivewayConfiguration;
  /** Design vehicle */
  designVehicle: 'passenger' | 'su_truck' | 'wb_truck' | 'fire_truck';
  /** Daily vehicle trips (estimated) */
  dailyTrips?: number;
  /** Sidewalk width at location (m) */
  sidewalkWidth: number;
  /** Curb height (m) */
  curbHeight?: number;
  /** Street classification */
  streetClassification?: 'express' | 'trunk' | 'collector' | 'service' | 'local' | 'passage';
  /** Speed limit on street (km/h) */
  streetSpeed?: number;
  /** Distance to nearest intersection (m) */
  distanceToIntersection?: number;
  /** Distance to nearest driveway (m) */
  distanceToNearestDriveway?: number;
}

export interface DrivewayResult {
  /** Driveway type */
  type: DrivewayType;
  /** Total width at property line (m) */
  widthAtPropertyLine: number;
  /** Total width at curb line (m) */
  widthAtCurb: number;
  /** Throat width (narrowest point) (m) */
  throatWidth: number;
  /** Flare radius left side (m) */
  flareRadiusLeft: number;
  /** Flare radius right side (m) */
  flareRadiusRight: number;
  /** Driveway apron depth (m) */
  apronDepth: number;
  /** Maximum grade on apron (%) */
  maxGrade: number;
  /** Pedestrian crossing treatment */
  pedestrianTreatment: PedestrianCrossingTreatment;
  /** Sight distance requirements (m) */
  sightDistance: {
    leftLooking: number;
    rightLooking: number;
  };
  /** Spacing requirements */
  spacing: DrivewaySpacing;
  /** Materials specification */
  materials: DrivewayMaterials;
  /** Compliance check */
  compliance: DrivewayCompliance;
}

export interface PedestrianCrossingTreatment {
  /** Treatment type */
  type: 'continuous_sidewalk' | 'depressed' | 'ramped';
  /** Sidewalk continues at grade */
  sidewalkAtGrade: boolean;
  /** Detectable warning required */
  detectableWarning: boolean;
  /** Tactile guidance required */
  tactileGuidance: boolean;
  /** Maximum cross slope at crossing (%) */
  maxCrossSlope: number;
}

export interface DrivewaySpacing {
  /** Minimum distance to intersection (m) */
  minToIntersection: number;
  /** Minimum distance to other driveways (m) */
  minToDriveway: number;
  /** Actual distance to intersection (m) */
  actualToIntersection?: number;
  /** Actual distance to nearest driveway (m) */
  actualToDriveway?: number;
  /** Spacing compliant */
  compliant: boolean;
  /** Violations if any */
  violations: string[];
}

export interface DrivewayMaterials {
  /** Apron material */
  apron: 'concrete' | 'asphalt' | 'pavers';
  /** Sidewalk crossing material */
  crossing: 'concrete' | 'pavers' | 'match_sidewalk';
  /** Curb transition type */
  curbTransition: 'depressed' | 'cut' | 'rolled';
  /** Surface finish */
  finish: 'broom' | 'exposed_aggregate' | 'stamped';
}

export interface DrivewayCompliance {
  /** Overall compliance */
  compliant: boolean;
  /** Width compliance */
  widthCompliant: boolean;
  /** Spacing compliance */
  spacingCompliant: boolean;
  /** Grade compliance */
  gradeCompliant: boolean;
  /** Violations */
  violations: string[];
  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum driveway widths by type (m) */
export const DRIVEWAY_WIDTHS: Record<DrivewayType, { min: number; max: number; typical: number }> = {
  residential_single: { min: 2.5, max: 5.0, typical: 3.0 },
  residential_multi: { min: 3.0, max: 6.0, typical: 4.5 },
  commercial_light: { min: 3.5, max: 7.0, typical: 5.0 },
  commercial_heavy: { min: 6.0, max: 10.0, typical: 7.5 },
  industrial_light: { min: 5.0, max: 9.0, typical: 6.0 },
  industrial_heavy: { min: 7.0, max: 12.0, typical: 9.0 },
  parking_lot: { min: 5.0, max: 9.0, typical: 6.5 },
  service: { min: 3.5, max: 6.0, typical: 4.5 },
};

/** Minimum flare radii by design vehicle (m) */
export const FLARE_RADII: Record<string, number> = {
  passenger: 3.0,
  su_truck: 7.5,
  wb_truck: 12.0,
  fire_truck: 9.0,
};

/** Minimum spacing from intersections by street classification (m) */
export const MIN_INTERSECTION_SPACING: Record<string, number> = {
  express: 150,
  trunk: 100,
  collector: 50,
  service: 30,
  local: 15,
  passage: 10,
};

/** Minimum spacing between driveways (m) */
export const MIN_DRIVEWAY_SPACING: Record<DrivewayType, number> = {
  residential_single: 3.0,
  residential_multi: 6.0,
  commercial_light: 15.0,
  commercial_heavy: 30.0,
  industrial_light: 20.0,
  industrial_heavy: 40.0,
  parking_lot: 15.0,
  service: 10.0,
};

/** Maximum driveway grades (%) */
export const MAX_DRIVEWAY_GRADES: Record<DrivewayType, number> = {
  residential_single: 15,
  residential_multi: 12,
  commercial_light: 10,
  commercial_heavy: 8,
  industrial_light: 8,
  industrial_heavy: 6,
  parking_lot: 8,
  service: 10,
};

/** Sight distance requirements by speed (m) */
export const SIGHT_DISTANCE_BY_SPEED: Record<number, number> = {
  30: 45,
  40: 65,
  50: 85,
  60: 110,
  70: 140,
  80: 175,
};

// ============================================================================
// Core Design Functions
// ============================================================================

/**
 * Design driveway based on input parameters
 */
export function designDriveway(input: DrivewayInput): DrivewayResult {
  const {
    type,
    configuration,
    designVehicle,
    dailyTrips = 0,
    sidewalkWidth,
    curbHeight = 0.15,
    streetClassification = 'local',
    streetSpeed = 50,
    distanceToIntersection,
    distanceToNearestDriveway,
  } = input;

  // Get width parameters
  const widthSpec = DRIVEWAY_WIDTHS[type];
  const baseWidth = widthSpec.typical;

  // Adjust width based on configuration
  let widthAtPropertyLine: number;
  let widthAtCurb: number;
  let throatWidth: number;

  switch (configuration) {
    case 'single':
      widthAtPropertyLine = baseWidth;
      widthAtCurb = baseWidth + 0.5; // Slight flare at curb
      throatWidth = baseWidth;
      break;
    case 'double':
      widthAtPropertyLine = baseWidth * 1.5;
      widthAtCurb = baseWidth * 1.5 + 1.0;
      throatWidth = baseWidth * 1.5;
      break;
    case 'divided':
      widthAtPropertyLine = baseWidth * 2 + 1.5; // Include median
      widthAtCurb = baseWidth * 2 + 2.0;
      throatWidth = baseWidth;
      break;
  }

  // Flare radii
  const flareRadius = FLARE_RADII[designVehicle];

  // Apron depth (typically equals sidewalk width plus transitions)
  const apronDepth = sidewalkWidth + 1.5;

  // Maximum grade
  const maxGrade = MAX_DRIVEWAY_GRADES[type];

  // Pedestrian treatment
  const pedestrianTreatment = determinePedestrianTreatment(type, sidewalkWidth, dailyTrips);

  // Sight distance
  const sightDistance = calculateSightDistance(streetSpeed);

  // Spacing check
  const spacing = checkSpacing(
    type,
    streetClassification,
    distanceToIntersection,
    distanceToNearestDriveway
  );

  // Materials
  const materials = recommendMaterials(type, sidewalkWidth);

  // Compliance check
  const compliance = checkCompliance({
    type,
    widthAtCurb,
    widthSpec,
    maxGrade,
    spacing,
  });

  return {
    type,
    widthAtPropertyLine: Math.round(widthAtPropertyLine * 100) / 100,
    widthAtCurb: Math.round(widthAtCurb * 100) / 100,
    throatWidth: Math.round(throatWidth * 100) / 100,
    flareRadiusLeft: flareRadius,
    flareRadiusRight: flareRadius,
    apronDepth: Math.round(apronDepth * 100) / 100,
    maxGrade,
    pedestrianTreatment,
    sightDistance,
    spacing,
    materials,
    compliance,
  };
}

/**
 * Determine pedestrian crossing treatment
 */
function determinePedestrianTreatment(
  type: DrivewayType,
  sidewalkWidth: number,
  dailyTrips: number
): PedestrianCrossingTreatment {
  // High-traffic driveways should maintain sidewalk at grade
  const highTraffic = dailyTrips > 100 || type.includes('commercial') || type.includes('industrial');

  if (highTraffic && sidewalkWidth >= 1.5) {
    return {
      type: 'continuous_sidewalk',
      sidewalkAtGrade: true,
      detectableWarning: true,
      tactileGuidance: true,
      maxCrossSlope: 2.0,
    };
  }

  // Standard depressed crossing for lower traffic
  return {
    type: 'depressed',
    sidewalkAtGrade: false,
    detectableWarning: type.includes('commercial') || type.includes('industrial'),
    tactileGuidance: false,
    maxCrossSlope: 5.0,
  };
}

/**
 * Calculate sight distance requirements
 */
function calculateSightDistance(streetSpeed: number): { leftLooking: number; rightLooking: number } {
  // Get base sight distance from table
  const speeds = Object.keys(SIGHT_DISTANCE_BY_SPEED).map(Number).sort((a, b) => a - b);
  let baseSightDistance = SIGHT_DISTANCE_BY_SPEED[speeds[speeds.length - 1]];

  for (const speed of speeds) {
    if (speed >= streetSpeed) {
      baseSightDistance = SIGHT_DISTANCE_BY_SPEED[speed];
      break;
    }
  }

  // Both directions typically have same requirement
  // Could be adjusted for one-way streets
  return {
    leftLooking: baseSightDistance,
    rightLooking: baseSightDistance,
  };
}

/**
 * Check driveway spacing requirements
 */
function checkSpacing(
  type: DrivewayType,
  streetClassification: string,
  distanceToIntersection?: number,
  distanceToNearestDriveway?: number
): DrivewaySpacing {
  const minToIntersection = MIN_INTERSECTION_SPACING[streetClassification] || 30;
  const minToDriveway = MIN_DRIVEWAY_SPACING[type];
  const violations: string[] = [];

  let compliant = true;

  if (distanceToIntersection !== undefined && distanceToIntersection < minToIntersection) {
    violations.push(
      `Distance to intersection (${distanceToIntersection}m) is less than minimum (${minToIntersection}m)`
    );
    compliant = false;
  }

  if (distanceToNearestDriveway !== undefined && distanceToNearestDriveway < minToDriveway) {
    violations.push(
      `Distance to nearest driveway (${distanceToNearestDriveway}m) is less than minimum (${minToDriveway}m)`
    );
    compliant = false;
  }

  return {
    minToIntersection,
    minToDriveway,
    actualToIntersection: distanceToIntersection,
    actualToDriveway: distanceToNearestDriveway,
    compliant,
    violations,
  };
}

/**
 * Recommend materials based on driveway type
 */
function recommendMaterials(type: DrivewayType, sidewalkWidth: number): DrivewayMaterials {
  // Heavy-duty applications need concrete
  if (type.includes('industrial') || type === 'commercial_heavy') {
    return {
      apron: 'concrete',
      crossing: 'concrete',
      curbTransition: 'depressed',
      finish: 'broom',
    };
  }

  // Commercial applications - concrete preferred
  if (type.includes('commercial') || type === 'parking_lot') {
    return {
      apron: 'concrete',
      crossing: 'match_sidewalk',
      curbTransition: 'depressed',
      finish: 'broom',
    };
  }

  // Residential can use various materials
  return {
    apron: 'concrete',
    crossing: 'match_sidewalk',
    curbTransition: 'rolled',
    finish: 'broom',
  };
}

/**
 * Check overall compliance
 */
function checkCompliance(params: {
  type: DrivewayType;
  widthAtCurb: number;
  widthSpec: { min: number; max: number };
  maxGrade: number;
  spacing: DrivewaySpacing;
}): DrivewayCompliance {
  const violations: string[] = [];
  const recommendations: string[] = [];

  // Width check
  const widthCompliant =
    params.widthAtCurb >= params.widthSpec.min &&
    params.widthAtCurb <= params.widthSpec.max;

  if (!widthCompliant) {
    if (params.widthAtCurb < params.widthSpec.min) {
      violations.push(
        `Width (${params.widthAtCurb}m) is below minimum (${params.widthSpec.min}m)`
      );
    } else {
      violations.push(
        `Width (${params.widthAtCurb}m) exceeds maximum (${params.widthSpec.max}m)`
      );
    }
  }

  // Spacing compliance
  const spacingCompliant = params.spacing.compliant;
  violations.push(...params.spacing.violations);

  // Grade compliance (assumed compliant for design output)
  const gradeCompliant = true;

  // Add recommendations
  if (!spacingCompliant) {
    recommendations.push('Consider shared driveway or alternative access point');
  }

  return {
    compliant: widthCompliant && spacingCompliant && gradeCompliant,
    widthCompliant,
    spacingCompliant,
    gradeCompliant,
    violations,
    recommendations,
  };
}

// ============================================================================
// Additional Functions
// ============================================================================

/**
 * Check if driveway can be added at proposed location
 */
export function checkDrivewayLocation(
  proposedStation: number,
  existingDriveways: { station: number; type: DrivewayType }[],
  nearestIntersectionStation: number,
  proposedType: DrivewayType,
  streetClassification: string
): { allowed: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  // Check intersection spacing
  const minToIntersection = MIN_INTERSECTION_SPACING[streetClassification] || 30;
  const distToIntersection = Math.abs(proposedStation - nearestIntersectionStation);

  if (distToIntersection < minToIntersection) {
    conflicts.push(
      `Too close to intersection: ${distToIntersection.toFixed(1)}m < ${minToIntersection}m minimum`
    );
  }

  // Check spacing to existing driveways
  const minToDriveway = MIN_DRIVEWAY_SPACING[proposedType];

  for (const existing of existingDriveways) {
    const dist = Math.abs(proposedStation - existing.station);
    const effectiveMin = Math.max(minToDriveway, MIN_DRIVEWAY_SPACING[existing.type]);

    if (dist < effectiveMin) {
      conflicts.push(
        `Too close to existing ${existing.type} driveway: ${dist.toFixed(1)}m < ${effectiveMin}m minimum`
      );
    }
  }

  return {
    allowed: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Calculate queue storage for turn lanes at driveway
 */
export function calculateQueueStorage(
  peakHourVolume: number,
  signalCycleLength: number = 90
): { vehicles: number; length: number } {
  // Simplified queue calculation
  // Queue = arrival rate × red time / 2
  const arrivalRate = peakHourVolume / 3600; // vehicles per second
  const redTime = signalCycleLength * 0.5; // Assumed 50% red

  const queueVehicles = Math.ceil((arrivalRate * redTime) / 2);
  const queueLength = queueVehicles * 7.5; // 7.5m per vehicle

  return {
    vehicles: queueVehicles,
    length: Math.round(queueLength),
  };
}

/**
 * Design channelized driveway for high-volume access
 */
export function designChannelizedDriveway(
  type: DrivewayType,
  designVehicle: 'su_truck' | 'wb_truck',
  entryLanes: number,
  exitLanes: number
): {
  totalWidth: number;
  entryWidth: number;
  exitWidth: number;
  medianWidth: number;
  entryRadius: number;
  exitRadius: number;
  throatLength: number;
} {
  const laneWidth = 3.5;
  const medianWidth = 1.5;
  const radius = FLARE_RADII[designVehicle];

  const entryWidth = entryLanes * laneWidth;
  const exitWidth = exitLanes * laneWidth;
  const totalWidth = entryWidth + medianWidth + exitWidth;

  // Throat length based on queue storage needs
  const throatLength = Math.max(15, 7.5 * 2); // Minimum 2 vehicles

  return {
    totalWidth: Math.round(totalWidth * 100) / 100,
    entryWidth: Math.round(entryWidth * 100) / 100,
    exitWidth: Math.round(exitWidth * 100) / 100,
    medianWidth,
    entryRadius: radius * 1.2, // Slightly larger for channelized
    exitRadius: radius,
    throatLength,
  };
}

/**
 * Get driveway design standards summary
 */
export function getDrivewayStandards(type: DrivewayType): {
  width: { min: number; max: number; typical: number };
  minSpacing: number;
  maxGrade: number;
  typicalRadius: number;
} {
  return {
    width: DRIVEWAY_WIDTHS[type],
    minSpacing: MIN_DRIVEWAY_SPACING[type],
    maxGrade: MAX_DRIVEWAY_GRADES[type],
    typicalRadius: FLARE_RADII.passenger,
  };
}
