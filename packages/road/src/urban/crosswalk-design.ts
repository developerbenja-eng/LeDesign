/**
 * Crosswalk Design (Pasos de Peatones)
 *
 * Designs pedestrian crossings including:
 * - Marked crosswalks
 * - Crossing time calculations
 * - Signal timing
 * - Accessibility features
 *
 * References:
 * - REDEVU Manual
 * - MUTCD (Manual on Uniform Traffic Control Devices)
 * - OGUC Accessibility Standards
 *
 * @module urban-road/crosswalk-design
 */

// ============================================================================
// Types
// ============================================================================

export type CrosswalkType =
  | 'standard'           // Basic parallel lines
  | 'continental'        // Zebra stripes (perpendicular bars)
  | 'ladder'             // Parallel lines with cross bars
  | 'diagonal'           // Diagonal pattern
  | 'textured'           // Textured/colored surface
  | 'raised';            // Speed table crosswalk

export type CrosswalkLocationType =
  | 'signalized_intersection'
  | 'unsignalized_intersection'
  | 'midblock_signalized'
  | 'midblock_unsignalized'
  | 'school_zone'
  | 'transit_stop';

export interface CrosswalkInput {
  /** Crosswalk type */
  type: CrosswalkType;
  /** Location context */
  location: CrosswalkLocationType;
  /** Crossing distance (road width) (m) */
  crossingDistance: number;
  /** Number of lanes to cross */
  lanesToCross: number;
  /** Speed limit on road (km/h) */
  speedLimit: number;
  /** Peak hour pedestrian volume (ped/hr) */
  pedestrianVolume?: number;
  /** Peak hour vehicle volume (veh/hr) */
  vehicleVolume?: number;
  /** Design walk speed (m/s), default 1.2 */
  walkSpeed?: number;
  /** Include median refuge */
  includeRefuge?: boolean;
  /** Median width if refuge included (m) */
  medianWidth?: number;
  /** School zone */
  schoolZone?: boolean;
  /** Accessible design required */
  accessible?: boolean;
}

export interface CrosswalkResult {
  /** Crosswalk type */
  type: CrosswalkType;
  /** Crosswalk width (m) */
  width: number;
  /** Crossing distance (m) */
  crossingDistance: number;
  /** Marking specifications */
  markings: CrosswalkMarkings;
  /** Crossing time (seconds) */
  crossingTime: number;
  /** Signal timing if applicable */
  signalTiming?: SignalTiming;
  /** Refuge island if included */
  refugeIsland?: RefugeIslandSpec;
  /** Accessibility features */
  accessibility: AccessibilityFeatures;
  /** Warning devices */
  warningDevices: WarningDevice[];
  /** Lighting requirements */
  lighting: LightingRequirements;
  /** Compliance check */
  compliance: CrosswalkCompliance;
}

export interface CrosswalkMarkings {
  /** Pattern type */
  pattern: CrosswalkType;
  /** Width of crossing (m) */
  width: number;
  /** Bar width for continental/ladder (m) */
  barWidth?: number;
  /** Bar spacing (m) */
  barSpacing?: number;
  /** Line width for standard (m) */
  lineWidth?: number;
  /** Color */
  color: 'white' | 'yellow';
  /** Material */
  material: 'paint' | 'thermoplastic' | 'preformed' | 'inlay';
  /** Retroreflectivity requirement */
  retroreflective: boolean;
}

export interface SignalTiming {
  /** Minimum walk interval (seconds) */
  walkInterval: number;
  /** Pedestrian clearance interval (seconds) */
  clearanceInterval: number;
  /** Total pedestrian phase (seconds) */
  totalPhase: number;
  /** Lead pedestrian interval (seconds) */
  lpi?: number;
  /** Countdown timer required */
  countdownTimer: boolean;
  /** Accessible pedestrian signal */
  accessibleSignal: boolean;
}

export interface RefugeIslandSpec {
  /** Width (m) */
  width: number;
  /** Length (m) */
  length: number;
  /** Nose radius (m) */
  noseRadius: number;
  /** Cut-through or ramped */
  accessType: 'cut_through' | 'ramped';
  /** Detectable warning surfaces */
  detectableWarnings: boolean;
  /** Tactile guidance */
  tactileGuidance: boolean;
  /** Bollards or other protection */
  protection: string[];
}

export interface AccessibilityFeatures {
  /** Curb ramps at both ends */
  curbRamps: boolean;
  /** Detectable warning surfaces */
  detectableWarnings: boolean;
  /** Tactile guidance strips */
  tactileGuidance: boolean;
  /** Accessible pedestrian signals */
  accessibleSignals: boolean;
  /** Maximum cross slope (%) */
  maxCrossSlope: number;
  /** Maximum running slope (%) */
  maxRunningSlope: number;
  /** Contrast ratio with surrounding surface */
  contrastRequired: boolean;
}

export interface WarningDevice {
  /** Device type */
  type: 'sign' | 'beacon' | 'in_pavement_lights' | 'overhead_sign' | 'curb_extension';
  /** Location */
  location: string;
  /** Description */
  description: string;
  /** Required or recommended */
  requirement: 'required' | 'recommended';
}

export interface LightingRequirements {
  /** Minimum illumination (lux) */
  minIllumination: number;
  /** Uniformity ratio */
  uniformityRatio: number;
  /** Light pole locations */
  poleLocations: string[];
  /** Pedestrian-scale lighting */
  pedestrianScale: boolean;
}

export interface CrosswalkCompliance {
  /** Overall compliance */
  compliant: boolean;
  /** Width adequate */
  widthAdequate: boolean;
  /** Visibility adequate */
  visibilityAdequate: boolean;
  /** Accessibility compliant */
  accessibilityCompliant: boolean;
  /** Violations */
  violations: string[];
  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Standard crosswalk widths (m) */
export const CROSSWALK_WIDTHS = {
  minimum: 2.4,          // Absolute minimum
  standard: 3.0,         // Standard residential
  commercial: 3.6,       // Commercial areas
  school_zone: 4.5,      // School zones
  high_volume: 6.0,      // High pedestrian volume
};

/** Standard walk speeds (m/s) */
export const WALK_SPEEDS = {
  standard: 1.2,         // MUTCD standard
  elderly: 0.9,          // Elderly/disabled
  school: 1.0,           // School zones
  fast: 1.5,             // Young adults
};

/** Continental marking dimensions (m) */
export const CONTINENTAL_MARKING = {
  barWidth: 0.45,        // Width of each bar
  barSpacing: 0.45,      // Space between bars (can vary)
  minBars: 6,            // Minimum number of bars
};

/** Standard line marking dimensions (m) */
export const STANDARD_MARKING = {
  lineWidth: 0.15,       // Width of each line
  crosswalkWidth: 3.0,   // Distance between lines
};

/** Minimum refuge island dimensions (m) */
export const MINIMUM_REFUGE = {
  width: 1.8,            // ADA minimum
  length: 6.0,           // Length along crossing
  preferredWidth: 2.5,   // Preferred width
};

// ============================================================================
// Core Design Functions
// ============================================================================

/**
 * Design crosswalk based on input parameters
 */
export function designCrosswalk(input: CrosswalkInput): CrosswalkResult {
  const {
    type,
    location,
    crossingDistance,
    lanesToCross,
    speedLimit,
    pedestrianVolume = 100,
    vehicleVolume = 500,
    walkSpeed = WALK_SPEEDS.standard,
    includeRefuge = false,
    medianWidth = 2.5,
    schoolZone = false,
    accessible = true,
  } = input;

  // Determine crosswalk width
  const width = determineCrosswalkWidth(location, pedestrianVolume, schoolZone);

  // Calculate crossing time
  const crossingTime = calculateCrossingTime(crossingDistance, walkSpeed, includeRefuge);

  // Design markings
  const markings = designMarkings(type, width, crossingDistance);

  // Signal timing if applicable
  const signalTiming = calculateSignalTiming(
    location,
    crossingTime,
    lanesToCross,
    accessible
  );

  // Refuge island if included
  const refugeIsland = includeRefuge
    ? designRefugeIsland(medianWidth, width)
    : undefined;

  // Accessibility features
  const accessibility = designAccessibility(accessible, type);

  // Warning devices
  const warningDevices = determineWarningDevices(location, speedLimit, vehicleVolume, schoolZone);

  // Lighting requirements
  const lighting = determineLighting(location, crossingDistance);

  // Compliance check
  const compliance = checkCrosswalkCompliance({
    width,
    type,
    accessible,
    markings,
    accessibility,
    location,
  });

  return {
    type,
    width,
    crossingDistance,
    markings,
    crossingTime: Math.round(crossingTime * 10) / 10,
    signalTiming,
    refugeIsland,
    accessibility,
    warningDevices,
    lighting,
    compliance,
  };
}

/**
 * Determine crosswalk width based on context
 */
function determineCrosswalkWidth(
  location: CrosswalkLocationType,
  pedestrianVolume: number,
  schoolZone: boolean
): number {
  // Base width
  let width = CROSSWALK_WIDTHS.standard;

  // Adjust for school zone
  if (schoolZone) {
    width = Math.max(width, CROSSWALK_WIDTHS.school_zone);
  }

  // Adjust for pedestrian volume
  if (pedestrianVolume > 1000) {
    width = Math.max(width, CROSSWALK_WIDTHS.high_volume);
  } else if (pedestrianVolume > 500) {
    width = Math.max(width, CROSSWALK_WIDTHS.commercial);
  }

  // Location adjustments
  if (location === 'transit_stop') {
    width = Math.max(width, CROSSWALK_WIDTHS.commercial);
  }

  return width;
}

/**
 * Calculate crossing time
 */
export function calculateCrossingTime(
  crossingDistance: number,
  walkSpeed: number = WALK_SPEEDS.standard,
  hasRefuge: boolean = false
): number {
  if (hasRefuge) {
    // With refuge, calculate time for each segment
    // Assume crossing is split in half
    const halfDistance = crossingDistance / 2;
    return halfDistance / walkSpeed;
  }

  return crossingDistance / walkSpeed;
}

/**
 * Design crosswalk markings
 */
function designMarkings(
  type: CrosswalkType,
  width: number,
  crossingDistance: number
): CrosswalkMarkings {
  const baseMarkings: CrosswalkMarkings = {
    pattern: type,
    width,
    color: 'white',
    material: 'thermoplastic',
    retroreflective: true,
  };

  switch (type) {
    case 'continental':
      return {
        ...baseMarkings,
        barWidth: CONTINENTAL_MARKING.barWidth,
        barSpacing: CONTINENTAL_MARKING.barSpacing,
      };

    case 'ladder':
      return {
        ...baseMarkings,
        barWidth: 0.30,
        barSpacing: 0.30,
        lineWidth: 0.15,
      };

    case 'standard':
      return {
        ...baseMarkings,
        lineWidth: STANDARD_MARKING.lineWidth,
      };

    case 'raised':
      return {
        ...baseMarkings,
        barWidth: CONTINENTAL_MARKING.barWidth,
        barSpacing: CONTINENTAL_MARKING.barSpacing,
        material: 'preformed', // Raised surface
      };

    default:
      return baseMarkings;
  }
}

/**
 * Calculate signal timing
 */
function calculateSignalTiming(
  location: CrosswalkLocationType,
  crossingTime: number,
  lanesToCross: number,
  accessible: boolean
): SignalTiming | undefined {
  // Only applicable for signalized locations
  if (!location.includes('signalized')) {
    return undefined;
  }

  // Walk interval: minimum 7 seconds
  const walkInterval = Math.max(7, Math.ceil(crossingTime * 0.5));

  // Clearance interval: based on crossing time
  // Flashing don't walk = time to cross from beginning of crosswalk
  const clearanceInterval = Math.ceil(crossingTime);

  // Total phase
  const totalPhase = walkInterval + clearanceInterval;

  // Lead pedestrian interval (3-7 seconds)
  const lpi = accessible ? 7 : undefined;

  return {
    walkInterval,
    clearanceInterval,
    totalPhase,
    lpi,
    countdownTimer: true,
    accessibleSignal: accessible,
  };
}

/**
 * Design refuge island
 */
function designRefugeIsland(medianWidth: number, crosswalkWidth: number): RefugeIslandSpec {
  return {
    width: Math.max(MINIMUM_REFUGE.width, medianWidth * 0.8),
    length: crosswalkWidth + 2.0, // Extend beyond crosswalk
    noseRadius: 0.6,
    accessType: medianWidth >= 2.0 ? 'cut_through' : 'ramped',
    detectableWarnings: true,
    tactileGuidance: true,
    protection: medianWidth >= 3.0 ? ['bollards'] : [],
  };
}

/**
 * Design accessibility features
 */
function designAccessibility(required: boolean, type: CrosswalkType): AccessibilityFeatures {
  return {
    curbRamps: true,
    detectableWarnings: true,
    tactileGuidance: type === 'raised' || required,
    accessibleSignals: required,
    maxCrossSlope: 2.0,
    maxRunningSlope: 5.0,
    contrastRequired: true,
  };
}

/**
 * Determine warning devices
 */
function determineWarningDevices(
  location: CrosswalkLocationType,
  speedLimit: number,
  vehicleVolume: number,
  schoolZone: boolean
): WarningDevice[] {
  const devices: WarningDevice[] = [];

  // Basic crosswalk signs always required
  devices.push({
    type: 'sign',
    location: 'advance warning both directions',
    description: 'W11-2 Pedestrian Crossing warning sign',
    requirement: 'required',
  });

  // School zone specific
  if (schoolZone) {
    devices.push({
      type: 'sign',
      location: 'school zone entry',
      description: 'S1-1 School Zone sign with reduced speed',
      requirement: 'required',
    });
  }

  // High speed or volume locations
  if (speedLimit >= 60 || vehicleVolume > 1000) {
    devices.push({
      type: 'beacon',
      location: 'at crosswalk',
      description: 'Rectangular Rapid Flashing Beacon (RRFB)',
      requirement: 'recommended',
    });
  }

  // Unsignalized midblock
  if (location === 'midblock_unsignalized') {
    devices.push({
      type: 'curb_extension',
      location: 'both sides',
      description: 'Curb extensions to reduce crossing distance and improve visibility',
      requirement: 'recommended',
    });

    if (speedLimit >= 50) {
      devices.push({
        type: 'in_pavement_lights',
        location: 'at crosswalk edges',
        description: 'In-pavement warning lights',
        requirement: 'recommended',
      });
    }
  }

  return devices;
}

/**
 * Determine lighting requirements
 */
function determineLighting(
  location: CrosswalkLocationType,
  crossingDistance: number
): LightingRequirements {
  // Base illumination requirements
  let minIllumination = 20; // lux

  // Increase for complex locations
  if (location.includes('midblock')) {
    minIllumination = 30;
  }

  // Pole locations
  const poleLocations: string[] = [];

  if (crossingDistance <= 12) {
    poleLocations.push('one side of crossing');
  } else {
    poleLocations.push('both sides of crossing');
  }

  return {
    minIllumination,
    uniformityRatio: 4.0, // Average to minimum
    poleLocations,
    pedestrianScale: true,
  };
}

// ============================================================================
// Compliance Check
// ============================================================================

/**
 * Check crosswalk compliance
 */
function checkCrosswalkCompliance(params: {
  width: number;
  type: CrosswalkType;
  accessible: boolean;
  markings: CrosswalkMarkings;
  accessibility: AccessibilityFeatures;
  location: CrosswalkLocationType;
}): CrosswalkCompliance {
  const violations: string[] = [];
  const recommendations: string[] = [];

  // Width check
  const widthAdequate = params.width >= CROSSWALK_WIDTHS.minimum;
  if (!widthAdequate) {
    violations.push(
      `Crosswalk width (${params.width}m) is below minimum (${CROSSWALK_WIDTHS.minimum}m)`
    );
  }

  // Visibility check (continental preferred for visibility)
  const visibilityAdequate =
    params.type === 'continental' || params.type === 'ladder' || params.type === 'raised';
  if (!visibilityAdequate) {
    recommendations.push('Consider continental or ladder markings for improved visibility');
  }

  // Accessibility check
  let accessibilityCompliant = true;
  if (params.accessible) {
    if (!params.accessibility.curbRamps) {
      violations.push('Curb ramps required at both ends');
      accessibilityCompliant = false;
    }
    if (!params.accessibility.detectableWarnings) {
      violations.push('Detectable warning surfaces required');
      accessibilityCompliant = false;
    }
    if (params.accessibility.maxCrossSlope > 2.0) {
      violations.push('Cross slope exceeds maximum 2%');
      accessibilityCompliant = false;
    }
  }

  // Location-specific recommendations
  if (params.location === 'school_zone' && params.width < CROSSWALK_WIDTHS.school_zone) {
    recommendations.push(
      `Consider wider crosswalk (${CROSSWALK_WIDTHS.school_zone}m) for school zone`
    );
  }

  return {
    compliant: widthAdequate && accessibilityCompliant,
    widthAdequate,
    visibilityAdequate,
    accessibilityCompliant,
    violations,
    recommendations,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate pedestrian level of service
 */
export function calculatePedestrianLOS(
  crosswalkWidth: number,
  pedestrianVolume: number,
  signalCycleLength: number = 90
): { los: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; density: number } {
  // Calculate peak 15-min flow
  const peakFlow = pedestrianVolume * 0.25; // Assume peak 15 min = 25% of hour

  // Calculate effective width (deduct for edge effects)
  const effectiveWidth = crosswalkWidth - 0.3;

  // Flow per unit width
  const flowPerWidth = peakFlow / effectiveWidth;

  // LOS based on flow rate (ped/min/m)
  let los: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  if (flowPerWidth <= 16) los = 'A';
  else if (flowPerWidth <= 23) los = 'B';
  else if (flowPerWidth <= 33) los = 'C';
  else if (flowPerWidth <= 49) los = 'D';
  else if (flowPerWidth <= 75) los = 'E';
  else los = 'F';

  // Approximate density
  const density = flowPerWidth / 75; // Simplified

  return { los, density: Math.round(density * 100) / 100 };
}

/**
 * Recommend crosswalk type based on context
 */
export function recommendCrosswalkType(
  location: CrosswalkLocationType,
  speedLimit: number,
  pedestrianVolume: number
): CrosswalkType {
  // Raised crosswalk for low-speed, high-ped areas
  if (speedLimit <= 30 && pedestrianVolume > 500) {
    return 'raised';
  }

  // Continental for most applications (best visibility)
  if (speedLimit >= 40 || location.includes('unsignalized')) {
    return 'continental';
  }

  // School zones always continental or ladder
  if (location === 'school_zone') {
    return 'continental';
  }

  // Default to continental for general visibility
  return 'continental';
}

/**
 * Calculate number of pedestrians that can cross per cycle
 */
export function calculateCrossingCapacity(
  crosswalkWidth: number,
  walkInterval: number,
  clearanceInterval: number
): number {
  // Effective crossing time
  const effectiveTime = walkInterval + clearanceInterval * 0.5;

  // Capacity = width × time × 1.3 ped/s/m (approximate)
  const effectiveWidth = crosswalkWidth - 0.3;
  const capacity = effectiveWidth * effectiveTime * 1.3;

  return Math.floor(capacity);
}
