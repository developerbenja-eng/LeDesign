/**
 * Pedestrian Ramp Design (Rebajes Peatonales)
 *
 * Designs accessible curb ramps for pedestrian crossings following
 * Chilean OGUC accessibility standards and international best practices.
 *
 * Key Requirements (OGUC Chile):
 * - Maximum running slope: 8.33% (1:12)
 * - Maximum cross slope: 2%
 * - Minimum ramp width: 1.20m (1.50m preferred)
 * - Minimum landing: 1.50m x 1.50m
 * - Detectable warning surface: 0.60m deep
 * - Contrast color for detectable warnings
 *
 * References:
 * - OGUC Art. 4.1.7 (Accessibility)
 * - REDEVU Manual
 * - ADA Standards
 *
 * @module urban-road/pedestrian-ramps
 */

// ============================================================================
// Types
// ============================================================================

export type RampType =
  | 'perpendicular'      // Standard perpendicular to curb
  | 'parallel'           // Parallel to curb (constrained areas)
  | 'combined'           // Both directions at corner
  | 'depressed_corner'   // Entire corner lowered
  | 'blended'            // Gradual transition without defined ramp
  | 'midblock';          // Midblock crossing

export type RampLocation =
  | 'corner_aligned'     // Aligned with crosswalk at corner
  | 'corner_diagonal'    // Diagonal at corner (pointing into intersection)
  | 'midblock'           // Mid-block crossing
  | 'median'             // Median refuge
  | 'island';            // Pedestrian island

export interface DetectableWarningSpec {
  /** Depth of warning surface (m), standard 0.60m */
  depth: number;
  /** Width matches ramp width */
  width: number;
  /** Type of detectable warning */
  type: 'truncated_domes' | 'tactile_strips' | 'textured_surface';
  /** Color contrast requirement */
  color: 'yellow' | 'red' | 'contrasting';
}

export interface PedestrianRampInput {
  /** Ramp type */
  type: RampType;
  /** Location context */
  location: RampLocation;
  /** Height difference to overcome (curb height) (m) */
  curbHeight: number;
  /** Available width for ramp (m) */
  availableWidth: number;
  /** Available depth for ramp and landing (m) */
  availableDepth: number;
  /** Maximum running slope allowed (%) - default 8.33% */
  maxSlope?: number;
  /** Cross slope (%) - default 2% */
  crossSlope?: number;
  /** Include flared sides */
  flaredSides?: boolean;
  /** Flare slope if applicable (%) */
  flareSlope?: number;
  /** Include detectable warning surface */
  detectableWarning?: boolean;
  /** Grade of adjacent sidewalk (%) */
  sidewalkGrade?: number;
}

export interface PedestrianRampResult {
  /** Ramp type designed */
  type: RampType;
  /** Running slope (%) */
  runningSlope: number;
  /** Cross slope (%) */
  crossSlope: number;
  /** Ramp width at bottom (m) */
  bottomWidth: number;
  /** Ramp width at top (m) */
  topWidth: number;
  /** Ramp run length (m) */
  runLength: number;
  /** Total ramp depth including landing (m) */
  totalDepth: number;
  /** Landing dimensions (m) */
  landing: {
    width: number;
    depth: number;
  };
  /** Flare specifications if applicable */
  flares?: {
    leftSlope: number;
    rightSlope: number;
    leftWidth: number;
    rightWidth: number;
  };
  /** Detectable warning specification */
  detectableWarning: DetectableWarningSpec;
  /** Accessibility compliance check */
  compliance: AccessibilityCompliance;
  /** Material specifications */
  materials: RampMaterials;
}

export interface AccessibilityCompliance {
  /** Overall compliance status */
  compliant: boolean;
  /** OGUC compliance */
  ogucCompliant: boolean;
  /** Specific violations if any */
  violations: string[];
  /** Warnings (non-critical) */
  warnings: string[];
  /** Recommendations for improvement */
  recommendations: string[];
}

export interface RampMaterials {
  /** Ramp surface material */
  rampSurface: 'concrete' | 'pavers' | 'asphalt';
  /** Detectable warning material */
  detectableWarning: 'cast_iron' | 'concrete' | 'polymer' | 'ceramic';
  /** Finish for slip resistance */
  finish: 'broom' | 'exposed_aggregate' | 'textured';
  /** Color specification */
  color?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** OGUC Accessibility Standards */
export const OGUC_ACCESSIBILITY = {
  /** Maximum running slope (1:12 = 8.33%) */
  maxRunningSlope: 8.33,
  /** Maximum cross slope */
  maxCrossSlope: 2.0,
  /** Minimum ramp width */
  minWidth: 1.2,
  /** Preferred ramp width */
  preferredWidth: 1.5,
  /** Minimum landing size */
  minLandingSize: 1.5,
  /** Detectable warning depth */
  detectableWarningDepth: 0.6,
  /** Maximum flare slope when walkway adjacent */
  maxFlareSlope: 10.0,
  /** Minimum contrast for detectable warnings */
  minContrast: 70, // percent
};

/** ADA Standards (for reference) */
export const ADA_STANDARDS = {
  maxRunningSlope: 8.33,
  maxCrossSlope: 2.0,
  minWidth: 1.22, // 48 inches
  minLandingDepth: 1.22, // 48 inches
  detectableWarningDepth: 0.61, // 24 inches
  maxFlareSlope: 10.0,
};

/** Standard curb heights (m) */
export const STANDARD_CURB_HEIGHTS = {
  barrier: 0.15,
  mountable: 0.10,
  rolled: 0.08,
  high: 0.18,
};

/** Recommended detectable warning colors by country */
export const DETECTABLE_WARNING_COLORS = {
  chile: 'yellow',
  usa: 'yellow',
  uk: 'red',
  australia: 'yellow',
  japan: 'yellow',
};

// ============================================================================
// Core Design Functions
// ============================================================================

/**
 * Design pedestrian ramp based on input parameters
 */
export function designPedestrianRamp(input: PedestrianRampInput): PedestrianRampResult {
  const {
    type,
    location,
    curbHeight,
    availableWidth,
    availableDepth,
    maxSlope = OGUC_ACCESSIBILITY.maxRunningSlope,
    crossSlope = OGUC_ACCESSIBILITY.maxCrossSlope,
    flaredSides = true,
    flareSlope = 10.0,
    detectableWarning = true,
    sidewalkGrade = 0,
  } = input;

  // Calculate minimum run length for slope
  // slope = rise / run => run = rise / (slope/100)
  const minRunLength = curbHeight / (maxSlope / 100);

  // Determine actual run length based on available depth
  // Must leave room for landing and detectable warning
  const landingDepth = Math.max(OGUC_ACCESSIBILITY.minLandingSize, 1.5);
  const detectableDepth = detectableWarning ? OGUC_ACCESSIBILITY.detectableWarningDepth : 0;
  const availableRun = availableDepth - landingDepth - detectableDepth;

  // Check if we have enough space
  let runLength = Math.max(minRunLength, availableRun);
  let actualSlope: number;

  if (availableRun >= minRunLength) {
    // We have enough space, use the gentler slope
    runLength = availableRun;
    actualSlope = (curbHeight / runLength) * 100;
  } else {
    // Space constrained, use minimum run at maximum slope
    runLength = minRunLength;
    actualSlope = maxSlope;
  }

  // Calculate widths
  const bottomWidth = Math.max(availableWidth, OGUC_ACCESSIBILITY.minWidth);
  const topWidth = bottomWidth; // Standard perpendicular ramp has constant width

  // Landing dimensions
  const landing = {
    width: bottomWidth,
    depth: landingDepth,
  };

  // Flare calculations
  let flares: PedestrianRampResult['flares'];
  if (flaredSides && type !== 'depressed_corner') {
    const flareWidth = curbHeight / (flareSlope / 100);
    flares = {
      leftSlope: flareSlope,
      rightSlope: flareSlope,
      leftWidth: Math.min(flareWidth, 0.6),
      rightWidth: Math.min(flareWidth, 0.6),
    };
  }

  // Detectable warning
  const detectableWarningSpec: DetectableWarningSpec = {
    depth: OGUC_ACCESSIBILITY.detectableWarningDepth,
    width: bottomWidth,
    type: 'truncated_domes',
    color: 'yellow',
  };

  // Check compliance
  const compliance = checkAccessibilityCompliance({
    runningSlope: actualSlope,
    crossSlope,
    width: bottomWidth,
    landingSize: landing.depth,
    flareSlope: flares?.leftSlope,
    hasDetectableWarning: detectableWarning,
    detectableWarningDepth: detectableDepth,
  });

  // Materials
  const materials: RampMaterials = {
    rampSurface: 'concrete',
    detectableWarning: 'cast_iron',
    finish: 'broom',
    color: 'gray',
  };

  return {
    type,
    runningSlope: Math.round(actualSlope * 100) / 100,
    crossSlope,
    bottomWidth: Math.round(bottomWidth * 100) / 100,
    topWidth: Math.round(topWidth * 100) / 100,
    runLength: Math.round(runLength * 100) / 100,
    totalDepth: Math.round((runLength + landingDepth + detectableDepth) * 100) / 100,
    landing,
    flares,
    detectableWarning: detectableWarningSpec,
    compliance,
    materials,
  };
}

/**
 * Check accessibility compliance
 */
export function checkAccessibilityCompliance(params: {
  runningSlope: number;
  crossSlope: number;
  width: number;
  landingSize: number;
  flareSlope?: number;
  hasDetectableWarning: boolean;
  detectableWarningDepth: number;
}): AccessibilityCompliance {
  const violations: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Running slope check
  if (params.runningSlope > OGUC_ACCESSIBILITY.maxRunningSlope) {
    violations.push(
      `Running slope (${params.runningSlope.toFixed(1)}%) exceeds maximum (${OGUC_ACCESSIBILITY.maxRunningSlope}%)`
    );
  } else if (params.runningSlope > 8.0) {
    warnings.push(
      `Running slope (${params.runningSlope.toFixed(1)}%) is at upper limit. Consider gentler slope if possible.`
    );
  }

  // Cross slope check
  if (params.crossSlope > OGUC_ACCESSIBILITY.maxCrossSlope) {
    violations.push(
      `Cross slope (${params.crossSlope}%) exceeds maximum (${OGUC_ACCESSIBILITY.maxCrossSlope}%)`
    );
  }

  // Width check
  if (params.width < OGUC_ACCESSIBILITY.minWidth) {
    violations.push(
      `Ramp width (${params.width}m) is below minimum (${OGUC_ACCESSIBILITY.minWidth}m)`
    );
  } else if (params.width < OGUC_ACCESSIBILITY.preferredWidth) {
    recommendations.push(
      `Consider increasing width to ${OGUC_ACCESSIBILITY.preferredWidth}m for improved accessibility`
    );
  }

  // Landing check
  if (params.landingSize < OGUC_ACCESSIBILITY.minLandingSize) {
    violations.push(
      `Landing size (${params.landingSize}m) is below minimum (${OGUC_ACCESSIBILITY.minLandingSize}m)`
    );
  }

  // Flare slope check
  if (params.flareSlope && params.flareSlope > OGUC_ACCESSIBILITY.maxFlareSlope) {
    violations.push(
      `Flare slope (${params.flareSlope}%) exceeds maximum (${OGUC_ACCESSIBILITY.maxFlareSlope}%)`
    );
  }

  // Detectable warning check
  if (!params.hasDetectableWarning) {
    violations.push('Detectable warning surface is required');
  } else if (params.detectableWarningDepth < OGUC_ACCESSIBILITY.detectableWarningDepth) {
    violations.push(
      `Detectable warning depth (${params.detectableWarningDepth}m) is below minimum (${OGUC_ACCESSIBILITY.detectableWarningDepth}m)`
    );
  }

  const ogucCompliant = violations.length === 0;
  const compliant = ogucCompliant;

  return {
    compliant,
    ogucCompliant,
    violations,
    warnings,
    recommendations,
  };
}

// ============================================================================
// Special Ramp Types
// ============================================================================

/**
 * Design corner ramp with two-direction access
 */
export function designCornerRamp(
  curbHeight: number,
  availableWidth: number,
  crosswalkAngle: number = 90 // degrees between crosswalks
): {
  primaryRamp: PedestrianRampResult;
  secondaryRamp: PedestrianRampResult;
  sharedLanding: { width: number; depth: number };
} {
  // For corners, we typically have two options:
  // 1. Two separate ramps aligned with each crosswalk
  // 2. One diagonal ramp (not recommended but sometimes necessary)

  // Design primary ramp
  const primaryRamp = designPedestrianRamp({
    type: 'perpendicular',
    location: 'corner_aligned',
    curbHeight,
    availableWidth,
    availableDepth: 3.0, // Typical available depth at corner
    flaredSides: true,
  });

  // Design secondary ramp (similar but for perpendicular direction)
  const secondaryRamp = designPedestrianRamp({
    type: 'perpendicular',
    location: 'corner_aligned',
    curbHeight,
    availableWidth,
    availableDepth: 3.0,
    flaredSides: true,
  });

  // Shared landing at corner
  const sharedLanding = {
    width: Math.max(primaryRamp.landing.width, secondaryRamp.landing.width),
    depth: OGUC_ACCESSIBILITY.minLandingSize,
  };

  return { primaryRamp, secondaryRamp, sharedLanding };
}

/**
 * Design depressed corner (entire corner at street level)
 */
export function designDepressedCorner(
  cornerRadius: number,
  curbHeight: number,
  transitionLength: number = 1.5
): {
  cornerDepression: {
    radius: number;
    depth: number;
    transitionSlope: number;
    area: number;
  };
  detectableWarnings: {
    position: 'arc' | 'straight';
    length: number;
    depth: number;
  };
  compliance: AccessibilityCompliance;
} {
  // Calculate transition slope
  const transitionSlope = (curbHeight / transitionLength) * 100;

  // Arc length of depressed area
  const arcAngle = Math.PI / 2; // 90 degree corner
  const arcLength = cornerRadius * arcAngle;

  // Area of depressed corner (quarter circle approximation)
  const area = (Math.PI * cornerRadius * cornerRadius) / 4;

  // Detectable warning follows the curb line
  const detectableWarnings = {
    position: 'arc' as const,
    length: arcLength,
    depth: OGUC_ACCESSIBILITY.detectableWarningDepth,
  };

  // Compliance check
  const compliance = checkAccessibilityCompliance({
    runningSlope: transitionSlope,
    crossSlope: 2.0, // Assumed
    width: cornerRadius * 2, // Effective width
    landingSize: cornerRadius, // The depressed area serves as landing
    hasDetectableWarning: true,
    detectableWarningDepth: OGUC_ACCESSIBILITY.detectableWarningDepth,
  });

  return {
    cornerDepression: {
      radius: cornerRadius,
      depth: curbHeight,
      transitionSlope: Math.round(transitionSlope * 100) / 100,
      area: Math.round(area * 100) / 100,
    },
    detectableWarnings,
    compliance,
  };
}

/**
 * Design parallel ramp (for constrained sidewalks)
 */
export function designParallelRamp(
  curbHeight: number,
  sidewalkWidth: number,
  rampWidth: number = OGUC_ACCESSIBILITY.minWidth
): PedestrianRampResult {
  // Parallel ramps run along the curb rather than perpendicular
  // Used when sidewalk is too narrow for perpendicular ramp

  // Calculate run length based on available sidewalk width
  const availableRun = sidewalkWidth - 0.3; // Leave some edge clearance

  // Calculate slope
  const runningSlope = (curbHeight / availableRun) * 100;

  return designPedestrianRamp({
    type: 'parallel',
    location: 'corner_aligned',
    curbHeight,
    availableWidth: rampWidth,
    availableDepth: availableRun + OGUC_ACCESSIBILITY.minLandingSize + OGUC_ACCESSIBILITY.detectableWarningDepth,
    flaredSides: false, // Parallel ramps typically don't have flares
  });
}

// ============================================================================
// Median Refuge Ramps
// ============================================================================

/**
 * Design ramps for median refuge island
 */
export function designMedianRefugeRamps(
  medianWidth: number,
  curbHeight: number,
  crossingWidth: number
): {
  entryRamp: PedestrianRampResult;
  exitRamp: PedestrianRampResult;
  refugeArea: { width: number; length: number };
  cutThrough: boolean;
} {
  // Determine if we can do a cut-through (flush) or need ramps
  // Cut-through preferred if median is wide enough
  const cutThrough = medianWidth >= 2.0;

  if (cutThrough) {
    // Flush cut-through design
    return {
      entryRamp: designPedestrianRamp({
        type: 'blended',
        location: 'median',
        curbHeight: 0, // Flush
        availableWidth: crossingWidth,
        availableDepth: medianWidth,
      }),
      exitRamp: designPedestrianRamp({
        type: 'blended',
        location: 'median',
        curbHeight: 0,
        availableWidth: crossingWidth,
        availableDepth: medianWidth,
      }),
      refugeArea: {
        width: crossingWidth,
        length: medianWidth,
      },
      cutThrough: true,
    };
  }

  // Ramped design for narrow medians
  return {
    entryRamp: designPedestrianRamp({
      type: 'perpendicular',
      location: 'median',
      curbHeight,
      availableWidth: crossingWidth,
      availableDepth: medianWidth / 2,
    }),
    exitRamp: designPedestrianRamp({
      type: 'perpendicular',
      location: 'median',
      curbHeight,
      availableWidth: crossingWidth,
      availableDepth: medianWidth / 2,
    }),
    refugeArea: {
      width: crossingWidth,
      length: medianWidth - 0.6, // Less detectable warning areas
    },
    cutThrough: false,
  };
}

// ============================================================================
// Validation and Utilities
// ============================================================================

/**
 * Validate ramp design against OGUC standards
 */
export function validateRampDesign(
  ramp: PedestrianRampResult
): AccessibilityCompliance {
  return ramp.compliance;
}

/**
 * Calculate minimum depth needed for compliant ramp
 */
export function calculateMinimumDepth(
  curbHeight: number,
  includeDetectableWarning: boolean = true
): number {
  // Run length for max slope
  const runLength = curbHeight / (OGUC_ACCESSIBILITY.maxRunningSlope / 100);

  // Landing
  const landingDepth = OGUC_ACCESSIBILITY.minLandingSize;

  // Detectable warning
  const detectableDepth = includeDetectableWarning
    ? OGUC_ACCESSIBILITY.detectableWarningDepth
    : 0;

  return Math.round((runLength + landingDepth + detectableDepth) * 100) / 100;
}

/**
 * Calculate minimum width for wheelchair turning
 */
export function getMinimumTurningWidth(turnType: '90' | '180'): number {
  // 90° turn: 1.5m minimum
  // 180° turn: 1.5m x 1.5m minimum
  return 1.5;
}

/**
 * Get detectable warning specification by location type
 */
export function getDetectableWarningSpec(
  location: RampLocation,
  width: number
): DetectableWarningSpec {
  const baseSpec: DetectableWarningSpec = {
    depth: OGUC_ACCESSIBILITY.detectableWarningDepth,
    width,
    type: 'truncated_domes',
    color: 'yellow',
  };

  // Adjust based on location
  switch (location) {
    case 'median':
    case 'island':
      // Full width of refuge
      return { ...baseSpec };
    case 'midblock':
      // May need different marking
      return { ...baseSpec, color: 'yellow' };
    default:
      return baseSpec;
  }
}

/**
 * Check if ramp location has adequate sight lines
 */
export function checkRampSightlines(
  distanceToIntersection: number,
  vehicleSpeed: number
): { adequate: boolean; recommendation: string } {
  // Driver reaction distance approximation
  const reactionDistance = vehicleSpeed * 0.7; // Simplified

  const adequate = distanceToIntersection >= reactionDistance;

  return {
    adequate,
    recommendation: adequate
      ? 'Sight lines are adequate'
      : `Recommend warning signage or traffic calming. Minimum ${reactionDistance.toFixed(0)}m needed.`,
  };
}
