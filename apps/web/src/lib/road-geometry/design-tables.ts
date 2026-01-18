/**
 * Road Design Tables and Standards
 *
 * Design parameters by road classification following:
 * - REDEVU (Recomendaciones para Diseño de Espacios Viales Urbanos)
 * - MOP Manual de Carreteras Vol. 3 (Chile)
 * - AASHTO Green Book
 *
 * @module road-geometry/design-tables
 */

// ============================================================================
// Types
// ============================================================================

export type RoadClassificationType =
  | 'express'
  | 'trunk'
  | 'collector'
  | 'service'
  | 'local'
  | 'passage';

export type RoadEnvironment = 'urban' | 'rural' | 'mountainous';

export interface DesignSpeedRange {
  min: number;
  max: number;
  typical: number;
}

export interface GeometricLimits {
  minRadius: number; // m
  maxGrade: number; // %
  minSSD: number; // Stopping sight distance (m)
  minLaneWidth: number; // m
}

// ============================================================================
// Design Speed Tables (REDEVU/MOP)
// ============================================================================

/**
 * Design speed ranges by road classification for urban areas
 * Based on REDEVU recommendations
 */
export const DESIGN_SPEED_URBAN: Record<RoadClassificationType, DesignSpeedRange> = {
  express: { min: 80, max: 100, typical: 90 },
  trunk: { min: 50, max: 80, typical: 60 },
  collector: { min: 40, max: 60, typical: 50 },
  service: { min: 30, max: 50, typical: 40 },
  local: { min: 30, max: 40, typical: 30 },
  passage: { min: 20, max: 30, typical: 20 },
};

/**
 * Design speed ranges by road classification for rural areas
 * Based on MOP Manual de Carreteras
 */
export const DESIGN_SPEED_RURAL: Record<RoadClassificationType, DesignSpeedRange> = {
  express: { min: 100, max: 120, typical: 110 },
  trunk: { min: 80, max: 100, typical: 90 },
  collector: { min: 60, max: 80, typical: 70 },
  service: { min: 50, max: 70, typical: 60 },
  local: { min: 40, max: 60, typical: 50 },
  passage: { min: 30, max: 40, typical: 30 },
};

// ============================================================================
// Minimum Radius Tables
// ============================================================================

/**
 * Minimum radius by design speed and maximum superelevation
 * R = V² / (127 × (e + f))
 * Pre-calculated for common design speeds
 */
export const MINIMUM_RADIUS: Record<
  number,
  { emax6: number; emax8: number; emax10: number }
> = {
  20: { emax6: 15, emax8: 14, emax10: 13 },
  30: { emax6: 30, emax8: 28, emax10: 25 },
  40: { emax6: 55, emax8: 50, emax10: 45 },
  50: { emax6: 90, emax8: 80, emax10: 70 },
  60: { emax6: 135, emax8: 120, emax10: 105 },
  70: { emax6: 190, emax8: 170, emax10: 150 },
  80: { emax6: 250, emax8: 230, emax10: 210 },
  90: { emax6: 335, emax8: 305, emax10: 275 },
  100: { emax6: 435, emax8: 395, emax10: 350 },
  110: { emax6: 560, emax8: 500, emax10: 440 },
  120: { emax6: 700, emax8: 625, emax10: 550 },
};

/**
 * Get minimum radius for given design speed and max superelevation
 */
export function getMinimumRadius(
  designSpeed: number,
  maxSuperelevation: number = 6
): number {
  // Find nearest speed in table
  const speeds = Object.keys(MINIMUM_RADIUS).map(Number).sort((a, b) => a - b);
  let speed = speeds[0];

  for (const s of speeds) {
    if (s <= designSpeed) speed = s;
    else break;
  }

  const row = MINIMUM_RADIUS[speed];
  if (maxSuperelevation <= 6) return row.emax6;
  if (maxSuperelevation <= 8) return row.emax8;
  return row.emax10;
}

// ============================================================================
// Maximum Grade Tables
// ============================================================================

/**
 * Maximum grade by design speed (%)
 * Based on AASHTO and MOP recommendations
 */
export const MAXIMUM_GRADE: Record<number, number> = {
  20: 15,
  30: 12,
  40: 10,
  50: 8,
  60: 7,
  70: 6,
  80: 5,
  90: 4.5,
  100: 4,
  110: 3.5,
  120: 3,
};

/**
 * Maximum grade for urban streets by classification
 * More restrictive than rural highways
 */
export const MAXIMUM_GRADE_URBAN: Record<RoadClassificationType, number> = {
  express: 4,
  trunk: 6,
  collector: 8,
  service: 10,
  local: 12,
  passage: 15,
};

/**
 * Get maximum grade for design speed
 */
export function getMaximumGrade(designSpeed: number): number {
  const speeds = Object.keys(MAXIMUM_GRADE).map(Number).sort((a, b) => a - b);

  // Find nearest speed
  let speed = speeds[speeds.length - 1];
  for (const s of speeds) {
    if (s >= designSpeed) {
      speed = s;
      break;
    }
  }

  return MAXIMUM_GRADE[speed];
}

// ============================================================================
// Friction Coefficients
// ============================================================================

/**
 * Side friction factor (f) by design speed
 * AASHTO values for wet pavement
 */
export const LATERAL_FRICTION: Record<number, number> = {
  20: 0.18,
  30: 0.17,
  40: 0.16,
  50: 0.15,
  60: 0.14,
  70: 0.13,
  80: 0.12,
  90: 0.11,
  100: 0.10,
  110: 0.09,
  120: 0.08,
};

/**
 * Longitudinal friction factor for braking
 * AASHTO values for wet pavement
 */
export const BRAKING_FRICTION: Record<number, number> = {
  20: 0.40,
  30: 0.35,
  40: 0.32,
  50: 0.30,
  60: 0.29,
  70: 0.28,
  80: 0.28,
  90: 0.28,
  100: 0.28,
  110: 0.28,
  120: 0.28,
};

/**
 * Get lateral friction factor for design speed
 */
export function getLateralFriction(designSpeed: number): number {
  const speeds = Object.keys(LATERAL_FRICTION).map(Number).sort((a, b) => a - b);

  // Interpolate if between table values
  for (let i = 0; i < speeds.length - 1; i++) {
    if (designSpeed >= speeds[i] && designSpeed <= speeds[i + 1]) {
      const ratio = (designSpeed - speeds[i]) / (speeds[i + 1] - speeds[i]);
      return (
        LATERAL_FRICTION[speeds[i]] +
        ratio * (LATERAL_FRICTION[speeds[i + 1]] - LATERAL_FRICTION[speeds[i]])
      );
    }
  }

  // Edge cases
  if (designSpeed <= speeds[0]) return LATERAL_FRICTION[speeds[0]];
  return LATERAL_FRICTION[speeds[speeds.length - 1]];
}

// ============================================================================
// Stopping Sight Distance
// ============================================================================

/**
 * Minimum stopping sight distance by design speed (m)
 * AASHTO values for level terrain
 */
export const STOPPING_SIGHT_DISTANCE: Record<number, number> = {
  20: 20,
  30: 35,
  40: 50,
  50: 65,
  60: 85,
  70: 105,
  80: 130,
  90: 160,
  100: 185,
  110: 220,
  120: 250,
};

/**
 * Passing sight distance by design speed (m)
 * For two-lane highways
 */
export const PASSING_SIGHT_DISTANCE: Record<number, number> = {
  30: 120,
  40: 140,
  50: 160,
  60: 180,
  70: 210,
  80: 245,
  90: 280,
  100: 320,
  110: 355,
  120: 395,
};

// ============================================================================
// K-Values for Vertical Curves
// ============================================================================

/**
 * K-values for crest vertical curves (based on stopping sight distance)
 * K = L / A, where L = curve length, A = algebraic difference in grades
 */
export const K_VALUES_CREST: Record<number, number> = {
  20: 1,
  30: 2,
  40: 4,
  50: 7,
  60: 11,
  70: 17,
  80: 26,
  90: 39,
  100: 52,
  110: 74,
  120: 95,
};

/**
 * K-values for sag vertical curves (based on headlight distance)
 */
export const K_VALUES_SAG: Record<number, number> = {
  20: 3,
  30: 6,
  40: 9,
  50: 13,
  60: 18,
  70: 23,
  80: 30,
  90: 38,
  100: 45,
  110: 55,
  120: 63,
};

/**
 * Get K-value for design speed and curve type
 */
export function getKValue(
  designSpeed: number,
  curveType: 'crest' | 'sag'
): number {
  const table = curveType === 'crest' ? K_VALUES_CREST : K_VALUES_SAG;
  const speeds = Object.keys(table).map(Number).sort((a, b) => a - b);

  // Interpolate
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

// ============================================================================
// Lane and Shoulder Widths
// ============================================================================

/**
 * Minimum lane width by road classification (m)
 * Based on REDEVU
 */
export const MINIMUM_LANE_WIDTH: Record<RoadClassificationType, number> = {
  express: 3.5,
  trunk: 3.5,
  collector: 3.25,
  service: 3.0,
  local: 3.0,
  passage: 2.75,
};

/**
 * Recommended lane width by road classification (m)
 */
export const RECOMMENDED_LANE_WIDTH: Record<RoadClassificationType, number> = {
  express: 3.65,
  trunk: 3.5,
  collector: 3.5,
  service: 3.25,
  local: 3.0,
  passage: 3.0,
};

/**
 * Minimum shoulder width for rural highways (m)
 */
export const MINIMUM_SHOULDER_WIDTH: Record<number, { paved: number; total: number }> = {
  // Design speed: { paved, total }
  40: { paved: 0.5, total: 1.0 },
  50: { paved: 0.5, total: 1.2 },
  60: { paved: 1.0, total: 1.5 },
  70: { paved: 1.2, total: 2.0 },
  80: { paved: 1.5, total: 2.5 },
  90: { paved: 2.0, total: 3.0 },
  100: { paved: 2.5, total: 3.0 },
  110: { paved: 3.0, total: 3.5 },
  120: { paved: 3.0, total: 3.5 },
};

// ============================================================================
// Urban Right-of-Way Standards
// ============================================================================

/**
 * Typical right-of-way width by classification (m)
 * Based on REDEVU
 */
export const RIGHT_OF_WAY_WIDTH: Record<RoadClassificationType, { min: number; typical: number }> = {
  express: { min: 40, typical: 50 },
  trunk: { min: 25, typical: 30 },
  collector: { min: 18, typical: 22 },
  service: { min: 14, typical: 18 },
  local: { min: 11, typical: 14 },
  passage: { min: 8, typical: 10 },
};

/**
 * Minimum sidewalk width by classification (m)
 */
export const MINIMUM_SIDEWALK_WIDTH: Record<RoadClassificationType, number> = {
  express: 2.5,
  trunk: 2.5,
  collector: 2.0,
  service: 1.8,
  local: 1.5,
  passage: 1.2,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get geometric design limits for road classification
 */
export function getGeometricLimits(
  classification: RoadClassificationType,
  environment: RoadEnvironment = 'urban'
): GeometricLimits {
  const speedTable = environment === 'urban' ? DESIGN_SPEED_URBAN : DESIGN_SPEED_RURAL;
  const designSpeed = speedTable[classification].typical;

  return {
    minRadius: getMinimumRadius(designSpeed, 6),
    maxGrade: environment === 'urban'
      ? MAXIMUM_GRADE_URBAN[classification]
      : getMaximumGrade(designSpeed),
    minSSD: STOPPING_SIGHT_DISTANCE[designSpeed] || 50,
    minLaneWidth: MINIMUM_LANE_WIDTH[classification],
  };
}

/**
 * Calculate minimum radius for given parameters
 * R = V² / (127 × (e + f))
 */
export function calculateMinimumRadius(
  designSpeed: number,
  superelevation: number,
  friction?: number
): number {
  const f = friction ?? getLateralFriction(designSpeed);
  const e = superelevation / 100; // Convert percentage to decimal
  const V = designSpeed;

  const R = (V * V) / (127 * (e + f));
  return Math.round(R);
}

/**
 * Calculate required superelevation for given radius
 * e = V² / (127 × R) - f
 */
export function calculateRequiredSuperelevation(
  designSpeed: number,
  radius: number,
  friction?: number
): number {
  const f = friction ?? getLateralFriction(designSpeed);
  const V = designSpeed;

  const e = (V * V) / (127 * radius) - f;
  return Math.round(e * 1000) / 10; // Return as percentage, one decimal
}

/**
 * Validate road design parameters
 */
export function validateDesignParameters(
  classification: RoadClassificationType,
  designSpeed: number,
  environment: RoadEnvironment = 'urban'
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const speedTable = environment === 'urban' ? DESIGN_SPEED_URBAN : DESIGN_SPEED_RURAL;
  const speedRange = speedTable[classification];

  if (designSpeed < speedRange.min) {
    warnings.push(
      `Design speed (${designSpeed} km/h) is below minimum (${speedRange.min} km/h) for ${classification} roads`
    );
  }

  if (designSpeed > speedRange.max) {
    warnings.push(
      `Design speed (${designSpeed} km/h) exceeds maximum (${speedRange.max} km/h) for ${classification} roads`
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
