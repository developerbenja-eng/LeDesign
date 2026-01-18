/**
 * Superelevation (Peralte) Design
 *
 * Calculates superelevation rates and transition distributions for
 * horizontal curves following AASHTO and Chilean standards.
 *
 * References:
 * - AASHTO A Policy on Geometric Design (Green Book)
 * - MOP Manual de Carreteras Vol. 3
 * - REDEVU
 *
 * @module road-geometry/superelevation
 */

import { getLateralFriction, RoadClassificationType } from './design-tables';

// ============================================================================
// Types
// ============================================================================

export interface SuperelevationInput {
  /** Design speed (km/h) */
  designSpeed: number;
  /** Curve radius (m) */
  radius: number;
  /** Maximum superelevation (%, typically 6, 8, or 10) */
  maxSuperelevation: number;
  /** Normal crown slope (%, typically 2) */
  normalCrown: number;
  /** Road type for distribution method */
  roadType?: RoadClassificationType;
  /** Number of lanes in one direction */
  lanesOneDirection: number;
  /** Lane width (m) */
  laneWidth: number;
}

export interface SuperelevationResult {
  /** Required superelevation rate (%) */
  superelevation: number;
  /** Side friction factor used */
  frictionUsed: number;
  /** Whether maximum superelevation is controlling */
  maxSuperelevationControlling: boolean;
  /** Minimum transition length (m) */
  minTransitionLength: number;
  /** Recommended transition length (m) */
  recommendedTransitionLength: number;
  /** Relative gradient used for transition */
  relativeGradient: number;
  /** Runoff length (m) */
  runoffLength: number;
  /** Tangent runout length (m) */
  tangentRunout: number;
  /** Total transition length (m) */
  totalTransitionLength: number;
}

export interface SuperelevationStation {
  /** Station along alignment */
  station: number;
  /** Distance from transition start */
  distanceFromStart: number;
  /** Left edge elevation relative to centerline */
  leftEdge: number;
  /** Right edge elevation relative to centerline */
  rightEdge: number;
  /** Superelevation at this station (%) */
  superelevation: number;
  /** Description of this point */
  description?: string;
}

export type SuperelevationDistribution = 'linear' | 'AASHTO_Method_5' | 'parabolic';

export interface TransitionLayoutInput {
  /** Superelevation result */
  superelevation: SuperelevationResult;
  /** PC station */
  pcStation: number;
  /** PT station */
  ptStation: number;
  /** Half roadway width (m) */
  halfWidth: number;
  /** Normal crown slope (%) */
  normalCrown: number;
  /** Distribution method */
  distribution?: SuperelevationDistribution;
  /** Station interval for output */
  interval?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum relative gradient for superelevation runoff (%)
 * Based on design speed (AASHTO Table 3-15)
 */
export const MAXIMUM_RELATIVE_GRADIENT: Record<number, number> = {
  20: 0.80,
  30: 0.75,
  40: 0.70,
  50: 0.65,
  60: 0.60,
  70: 0.55,
  80: 0.50,
  90: 0.47,
  100: 0.45,
  110: 0.43,
  120: 0.40,
};

/**
 * Maximum superelevation by environment
 */
export const MAXIMUM_SUPERELEVATION = {
  urban_low_speed: 4, // Urban low-speed, frequent stops
  urban_normal: 6, // Normal urban
  suburban: 8, // Suburban/transitional
  rural: 10, // Rural highways
  icy_conditions: 8, // Areas with snow/ice
};

/**
 * Minimum radius for no superelevation (maintain crown only)
 * Approximate values for emax = 6%
 */
export const MIN_RADIUS_NO_SUPERELEVATION: Record<number, number> = {
  30: 700,
  40: 1000,
  50: 1400,
  60: 2000,
  70: 2800,
  80: 3600,
  90: 4500,
  100: 5500,
  110: 6600,
  120: 8000,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate required superelevation for given curve and speed
 *
 * e = V² / (127 × R) - f
 *
 * Bounded by 0 and emax
 */
export function calculateSuperelevation(
  input: SuperelevationInput
): SuperelevationResult {
  const {
    designSpeed,
    radius,
    maxSuperelevation,
    normalCrown,
    lanesOneDirection,
    laneWidth,
  } = input;

  const V = designSpeed;
  const R = radius;
  const emax = maxSuperelevation;

  // Get friction factor
  const f = getLateralFriction(designSpeed);

  // Calculate required superelevation
  // e = V² / (127 × R) - f
  let e = (V * V) / (127 * R) - f;

  // Convert to percentage
  e = e * 100;

  // Check if superelevation is needed
  let maxSuperelevationControlling = false;
  if (e < normalCrown) {
    // Crown is adequate, use adverse crown removal
    e = normalCrown;
  } else if (e > emax) {
    // Use maximum superelevation
    e = emax;
    maxSuperelevationControlling = true;
  }

  // Round to nearest 0.5%
  e = Math.round(e * 2) / 2;

  // Calculate transition lengths
  const halfWidth = lanesOneDirection * laneWidth;
  const transitions = calculateTransitionLengths(
    designSpeed,
    e,
    normalCrown,
    halfWidth
  );

  return {
    superelevation: e,
    frictionUsed: f,
    maxSuperelevationControlling,
    ...transitions,
  };
}

/**
 * Calculate superelevation transition lengths
 */
export function calculateTransitionLengths(
  designSpeed: number,
  superelevation: number,
  normalCrown: number,
  halfWidth: number
): {
  minTransitionLength: number;
  recommendedTransitionLength: number;
  relativeGradient: number;
  runoffLength: number;
  tangentRunout: number;
  totalTransitionLength: number;
} {
  // Get maximum relative gradient
  const speeds = Object.keys(MAXIMUM_RELATIVE_GRADIENT).map(Number);
  let relativeGradient = MAXIMUM_RELATIVE_GRADIENT[speeds[speeds.length - 1]];

  for (const s of speeds) {
    if (s >= designSpeed) {
      relativeGradient = MAXIMUM_RELATIVE_GRADIENT[s];
      break;
    }
  }

  // Calculate runoff length (superelevation from 0 to full e)
  // Lr = (w × n × ed) / Δ
  // where w = lane width, n = lanes, ed = superelevation, Δ = relative gradient
  const ed = superelevation / 100; // Convert to decimal
  const Lr = (halfWidth * ed) / (relativeGradient / 100);

  // Calculate tangent runout (crown to flat)
  // Lt = eNC × Lr / ed
  const eNC = normalCrown / 100;
  const Lt = (eNC * Lr) / ed;

  // Total transition length
  const totalLength = Lr + Lt;

  // Recommended length (1.5x minimum for comfort)
  const recommendedLength = totalLength * 1.5;

  return {
    minTransitionLength: Math.round(totalLength * 10) / 10,
    recommendedTransitionLength: Math.round(recommendedLength * 10) / 10,
    relativeGradient,
    runoffLength: Math.round(Lr * 10) / 10,
    tangentRunout: Math.round(Lt * 10) / 10,
    totalTransitionLength: Math.round(totalLength * 10) / 10,
  };
}

/**
 * Calculate superelevation using AASHTO Method 5 (most common)
 *
 * This distributes superelevation proportionally based on radius
 */
export function calculateSuperelevationMethod5(
  designSpeed: number,
  radius: number,
  maxSuperelevation: number
): number {
  const V = designSpeed;
  const R = radius;
  const emax = maxSuperelevation / 100;
  const f = getLateralFriction(designSpeed);

  // Calculate minimum radius for emax
  const Rmin = (V * V) / (127 * (emax + f));

  // If R >= 5 × Rmin, use minimum superelevation
  if (R >= 5 * Rmin) {
    return 2.0; // Minimum 2%
  }

  // Calculate e using Method 5 formula
  // e/emax = (Rmin/R)^0.5 for R > Rmin
  // e = emax for R <= Rmin
  let e: number;
  if (R <= Rmin) {
    e = emax;
  } else {
    e = emax * Math.sqrt(Rmin / R);
  }

  // Convert to percentage and round
  e = e * 100;
  e = Math.round(e * 2) / 2;

  // Ensure minimum 2%
  return Math.max(2, e);
}

// ============================================================================
// Transition Layout Functions
// ============================================================================

/**
 * Generate superelevation distribution along transition
 */
export function distributeSuperelevation(
  input: TransitionLayoutInput
): SuperelevationStation[] {
  const {
    superelevation,
    pcStation,
    ptStation,
    halfWidth,
    normalCrown,
    distribution = 'linear',
    interval = 10,
  } = input;

  const { runoffLength, tangentRunout, superelevation: e } = superelevation;
  const eNC = normalCrown;
  const totalTransition = runoffLength + tangentRunout;

  // Calculate key stations
  const stations: SuperelevationStation[] = [];

  // Start of transition (before PC)
  const transitionStart = pcStation - totalTransition;

  // Point where crown is removed
  const crownRemoved = pcStation - runoffLength;

  // Generate stations
  let currentStation = Math.floor(transitionStart / interval) * interval;

  while (currentStation <= ptStation + totalTransition) {
    let superelev = 0;
    let leftEdge = 0;
    let rightEdge = 0;
    let description: string | undefined;

    if (currentStation < transitionStart) {
      // Before transition - normal crown
      superelev = -eNC; // Negative = crowned
      leftEdge = -halfWidth * (eNC / 100);
      rightEdge = -halfWidth * (eNC / 100);
      description = 'Normal crown';
    } else if (currentStation < crownRemoved) {
      // Tangent runout - removing crown on one side
      const distFromStart = currentStation - transitionStart;
      const ratio = distFromStart / tangentRunout;

      // Linear interpolation of crown removal
      const outsideEdge = -halfWidth * (eNC / 100) * (1 - ratio);
      const insideEdge = -halfWidth * (eNC / 100);

      superelev = eNC * ratio - eNC;
      leftEdge = outsideEdge;
      rightEdge = insideEdge;
      description = 'Tangent runout';
    } else if (currentStation < pcStation) {
      // Runoff before PC - building superelevation
      const distFromCrownRemoved = currentStation - crownRemoved;
      const ratio = distFromCrownRemoved / runoffLength;

      superelev = calculateDistributedSuperelevation(ratio, e, distribution);

      leftEdge = halfWidth * (superelev / 100);
      rightEdge = -halfWidth * (superelev / 100);
      description = 'Superelevation runoff';
    } else if (currentStation <= ptStation) {
      // Full superelevation through curve
      superelev = e;
      leftEdge = halfWidth * (e / 100);
      rightEdge = -halfWidth * (e / 100);
      description = 'Full superelevation';
    } else if (currentStation < ptStation + runoffLength) {
      // Runoff after PT - removing superelevation
      const distFromPT = currentStation - ptStation;
      const ratio = 1 - distFromPT / runoffLength;

      superelev = calculateDistributedSuperelevation(ratio, e, distribution);

      leftEdge = halfWidth * (superelev / 100);
      rightEdge = -halfWidth * (superelev / 100);
      description = 'Superelevation runoff';
    } else if (currentStation < ptStation + totalTransition) {
      // Tangent runout - restoring crown
      const distFromRunoffEnd = currentStation - (ptStation + runoffLength);
      const ratio = 1 - distFromRunoffEnd / tangentRunout;

      const outsideEdge = -halfWidth * (eNC / 100) * ratio;
      const insideEdge = -halfWidth * (eNC / 100);

      superelev = -eNC * ratio;
      leftEdge = outsideEdge;
      rightEdge = insideEdge;
      description = 'Tangent runout';
    } else {
      // After transition - normal crown
      superelev = -eNC;
      leftEdge = -halfWidth * (eNC / 100);
      rightEdge = -halfWidth * (eNC / 100);
      description = 'Normal crown';
    }

    stations.push({
      station: Math.round(currentStation * 1000) / 1000,
      distanceFromStart: Math.round((currentStation - transitionStart) * 1000) / 1000,
      leftEdge: Math.round(leftEdge * 1000) / 1000,
      rightEdge: Math.round(rightEdge * 1000) / 1000,
      superelevation: Math.round(superelev * 100) / 100,
      description,
    });

    currentStation += interval;
  }

  return stations;
}

/**
 * Calculate superelevation at given ratio based on distribution method
 */
function calculateDistributedSuperelevation(
  ratio: number, // 0 to 1
  fullSuperelevation: number,
  distribution: SuperelevationDistribution
): number {
  switch (distribution) {
    case 'linear':
      return fullSuperelevation * ratio;

    case 'parabolic':
      // Parabolic: smoother entry/exit
      if (ratio < 0.5) {
        return fullSuperelevation * 2 * ratio * ratio;
      } else {
        return fullSuperelevation * (1 - 2 * (1 - ratio) * (1 - ratio));
      }

    case 'AASHTO_Method_5':
      // Sinusoidal for smoothest transition
      return fullSuperelevation * (1 - Math.cos(ratio * Math.PI)) / 2;

    default:
      return fullSuperelevation * ratio;
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if superelevation design meets standards
 */
export function validateSuperelevation(
  superelevation: number,
  radius: number,
  designSpeed: number,
  maxSuperelevation: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check if superelevation exceeds maximum
  if (superelevation > maxSuperelevation) {
    warnings.push(
      `Superelevation (${superelevation}%) exceeds maximum (${maxSuperelevation}%)`
    );
  }

  // Check minimum superelevation
  if (superelevation < 2 && superelevation > 0) {
    warnings.push(
      `Superelevation (${superelevation}%) is below minimum recommended (2%)`
    );
  }

  // Check if superelevation is adequate for speed
  const f = getLateralFriction(designSpeed);
  const e = superelevation / 100;
  const R = radius;
  const V = designSpeed;

  const requiredSum = (V * V) / (127 * R);
  if (e + f < requiredSum * 0.95) {
    warnings.push(
      `Superelevation may be inadequate: e + f = ${((e + f) * 100).toFixed(1)}% ` +
        `but ${(requiredSum * 100).toFixed(1)}% required for V=${V} km/h, R=${R}m`
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Get recommended maximum superelevation for road type and environment
 */
export function getRecommendedMaxSuperelevation(
  roadType: RoadClassificationType,
  environment: 'urban' | 'suburban' | 'rural' = 'urban'
): number {
  // Urban streets generally use lower superelevation
  if (environment === 'urban') {
    switch (roadType) {
      case 'express':
        return 6;
      case 'trunk':
        return 6;
      case 'collector':
        return 4;
      case 'service':
        return 4;
      case 'local':
        return 4;
      case 'passage':
        return 4;
      default:
        return 6;
    }
  }

  // Suburban
  if (environment === 'suburban') {
    switch (roadType) {
      case 'express':
        return 8;
      case 'trunk':
        return 8;
      case 'collector':
        return 6;
      case 'service':
        return 6;
      case 'local':
        return 4;
      case 'passage':
        return 4;
      default:
        return 6;
    }
  }

  // Rural - can use higher superelevation
  switch (roadType) {
    case 'express':
      return 10;
    case 'trunk':
      return 10;
    case 'collector':
      return 8;
    case 'service':
      return 8;
    case 'local':
      return 6;
    case 'passage':
      return 6;
    default:
      return 8;
  }
}

/**
 * Calculate axis of rotation location
 * Determines where the pavement rotates for superelevation
 */
export type AxisOfRotation = 'centerline' | 'inside_edge' | 'outside_edge';

export function calculateRotationPoint(
  axisOfRotation: AxisOfRotation,
  halfWidth: number,
  superelevation: number,
  direction: 'left' | 'right'
): { leftEdge: number; rightEdge: number; centerline: number } {
  const e = superelevation / 100;
  const w = halfWidth;

  switch (axisOfRotation) {
    case 'centerline':
      // Rotate about centerline - both edges move
      if (direction === 'right') {
        return {
          leftEdge: w * e,
          rightEdge: -w * e,
          centerline: 0,
        };
      } else {
        return {
          leftEdge: -w * e,
          rightEdge: w * e,
          centerline: 0,
        };
      }

    case 'inside_edge':
      // Rotate about inside edge - only outside edge rises
      if (direction === 'right') {
        return {
          leftEdge: 2 * w * e,
          rightEdge: 0,
          centerline: w * e,
        };
      } else {
        return {
          leftEdge: 0,
          rightEdge: 2 * w * e,
          centerline: w * e,
        };
      }

    case 'outside_edge':
      // Rotate about outside edge - keeps drainage
      if (direction === 'right') {
        return {
          leftEdge: 0,
          rightEdge: -2 * w * e,
          centerline: -w * e,
        };
      } else {
        return {
          leftEdge: -2 * w * e,
          rightEdge: 0,
          centerline: -w * e,
        };
      }

    default:
      return { leftEdge: 0, rightEdge: 0, centerline: 0 };
  }
}
