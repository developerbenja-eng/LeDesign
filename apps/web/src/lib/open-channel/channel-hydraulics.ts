/**
 * Channel Hydraulics Module - Core Open Channel Flow Calculations
 *
 * Implements Manning's equation and related hydraulic computations for
 * open channel flow analysis. Supports both prismatic and irregular sections.
 *
 * Based on:
 * - HEC-RAS Hydraulic Reference Manual (USACE)
 * - Open Channel Hydraulics (Ven Te Chow)
 * - Manual de Carreteras Vol. 3 - MOP Chile
 */

import {
  PrismaticSection,
  IrregularCrossSection,
  calculatePrismaticArea,
  calculatePrismaticWettedPerimeter,
  calculatePrismaticTopWidth,
  calculatePrismaticHydraulicRadius,
  calculatePrismaticHydraulicDepth,
  calculateIrregularGeometry,
  getMinimumElevation,
  getMaximumElevation,
  CrossSectionGeometry,
  ZoneGeometry,
} from './channel-geometry';

// ============================================================================
// Types
// ============================================================================

export type FlowRegime = 'subcritical' | 'critical' | 'supercritical';

export type ChannelMaterial =
  // Lined channels
  | 'concrete_smooth'
  | 'concrete_rough'
  | 'concrete_unfinished'
  | 'shotcrete'
  | 'asphalt'
  | 'brick'
  | 'masonry_dressed'
  | 'masonry_rubble'
  | 'riprap'
  | 'gabions'
  // Earth channels
  | 'earth_clean'
  | 'earth_gravel'
  | 'earth_weedy'
  | 'earth_stony'
  | 'earth_cobbles'
  // Natural streams
  | 'natural_clean_straight'
  | 'natural_clean_winding'
  | 'natural_sluggish_weedy'
  | 'natural_sluggish_deep'
  | 'mountain_gravel_cobbles'
  | 'mountain_boulders'
  // Floodplains
  | 'floodplain_pasture_short'
  | 'floodplain_pasture_tall'
  | 'floodplain_cultivated'
  | 'floodplain_brush_scattered'
  | 'floodplain_brush_heavy'
  | 'floodplain_trees_light'
  | 'floodplain_trees_dense';

export interface PrismaticFlowResult {
  depth: number; // m
  flowRate: number; // m³/s
  velocity: number; // m/s
  area: number; // m²
  wettedPerimeter: number; // m
  hydraulicRadius: number; // m
  topWidth: number; // m
  hydraulicDepth: number; // m
  froudeNumber: number;
  flowRegime: FlowRegime;
  specificEnergy: number; // m
  criticalDepth: number; // m
  normalDepth?: number; // m (if slope provided)
  shearStress: number; // N/m² (Pa)
  conveyance: number; // m³/s
  warnings: string[];
}

export interface IrregularFlowResult {
  waterSurfaceElevation: number; // m
  depth: number; // m (from thalweg)
  flowRate: number; // m³/s
  averageVelocity: number; // m/s
  geometry: CrossSectionGeometry;
  froudeNumber: number;
  flowRegime: FlowRegime;
  specificEnergy: number; // m
  criticalWSEL: number; // m
  normalWSEL?: number; // m (if slope provided)
  averageShearStress: number; // N/m²
  warnings: string[];
}

// ============================================================================
// Constants - Manning's n Values
// ============================================================================

/**
 * Manning's roughness coefficients for open channels
 * Based on Chow (1959), HEC-RAS documentation, and Chilean standards
 */
export const MANNING_N_CHANNELS: Record<ChannelMaterial, { min: number; typical: number; max: number }> = {
  // Lined channels
  concrete_smooth: { min: 0.011, typical: 0.013, max: 0.015 },
  concrete_rough: { min: 0.015, typical: 0.017, max: 0.020 },
  concrete_unfinished: { min: 0.014, typical: 0.017, max: 0.020 },
  shotcrete: { min: 0.016, typical: 0.019, max: 0.023 },
  asphalt: { min: 0.013, typical: 0.016, max: 0.018 },
  brick: { min: 0.012, typical: 0.015, max: 0.018 },
  masonry_dressed: { min: 0.013, typical: 0.015, max: 0.017 },
  masonry_rubble: { min: 0.017, typical: 0.025, max: 0.030 },
  riprap: { min: 0.030, typical: 0.035, max: 0.045 },
  gabions: { min: 0.025, typical: 0.030, max: 0.035 },

  // Earth channels
  earth_clean: { min: 0.016, typical: 0.022, max: 0.025 },
  earth_gravel: { min: 0.022, typical: 0.027, max: 0.033 },
  earth_weedy: { min: 0.025, typical: 0.030, max: 0.035 },
  earth_stony: { min: 0.025, typical: 0.035, max: 0.045 },
  earth_cobbles: { min: 0.030, typical: 0.040, max: 0.050 },

  // Natural streams - main channel
  natural_clean_straight: { min: 0.025, typical: 0.030, max: 0.035 },
  natural_clean_winding: { min: 0.033, typical: 0.040, max: 0.045 },
  natural_sluggish_weedy: { min: 0.050, typical: 0.070, max: 0.080 },
  natural_sluggish_deep: { min: 0.040, typical: 0.050, max: 0.060 },
  mountain_gravel_cobbles: { min: 0.030, typical: 0.040, max: 0.050 },
  mountain_boulders: { min: 0.040, typical: 0.050, max: 0.070 },

  // Floodplains
  floodplain_pasture_short: { min: 0.025, typical: 0.030, max: 0.035 },
  floodplain_pasture_tall: { min: 0.030, typical: 0.035, max: 0.045 },
  floodplain_cultivated: { min: 0.020, typical: 0.035, max: 0.050 },
  floodplain_brush_scattered: { min: 0.035, typical: 0.050, max: 0.070 },
  floodplain_brush_heavy: { min: 0.070, typical: 0.100, max: 0.160 },
  floodplain_trees_light: { min: 0.080, typical: 0.110, max: 0.150 },
  floodplain_trees_dense: { min: 0.100, typical: 0.150, max: 0.200 },
};

/**
 * Maximum permissible velocity by channel lining (m/s)
 * For erosion control design
 */
export const PERMISSIBLE_VELOCITY: Record<string, number> = {
  fine_sand: 0.45,
  sandy_loam: 0.53,
  silt_loam: 0.61,
  alluvial_silt: 0.61,
  firm_loam: 0.76,
  volcanic_ash: 0.76,
  fine_gravel: 0.76,
  stiff_clay: 1.14,
  graded_gravel: 1.14,
  alluvial_clay: 1.14,
  gravel: 1.22,
  coarse_gravel: 1.52,
  cobbles_gravel: 1.52,
  shale: 1.83,
  hardpan: 1.83,
  concrete: 6.0,
  riprap_150mm: 3.0,
  riprap_300mm: 4.5,
  gabions: 4.5,
  grass_poor: 1.2,
  grass_good: 1.8,
  grass_excellent: 2.4,
};

/**
 * Permissible shear stress by channel lining (N/m² = Pa)
 * For tractive force erosion design
 */
export const PERMISSIBLE_SHEAR: Record<string, number> = {
  fine_sand: 1.3,
  sandy_loam: 1.9,
  silt_loam: 2.4,
  firm_loam: 3.6,
  fine_gravel: 3.6,
  stiff_clay: 12.5,
  alluvial_clay: 12.5,
  graded_gravel: 19.0,
  coarse_gravel: 33.0,
  cobbles: 71.0,
  shale: 33.0,
  concrete: 200.0,
  riprap_150mm: 100.0,
  riprap_300mm: 200.0,
  gabions: 150.0,
  grass_erosion_resistant: 180.0,
};

/**
 * Side slope recommendations (horizontal:vertical)
 * Chilean standards and USBR guidelines
 */
export const SIDE_SLOPES: Record<string, { min: number; max: number; recommended: number }> = {
  rock_solid: { min: 0, max: 0.25, recommended: 0 },
  rock_fissured: { min: 0.25, max: 0.5, recommended: 0.25 },
  stiff_clay_concrete_lined: { min: 0.5, max: 1.0, recommended: 0.5 },
  stiff_clay_earth: { min: 1.0, max: 1.5, recommended: 1.0 },
  firm_soil: { min: 1.0, max: 1.5, recommended: 1.5 },
  loose_sandy: { min: 2.0, max: 3.0, recommended: 2.0 },
  sandy_loam: { min: 1.5, max: 2.0, recommended: 1.5 },
  peat_muck: { min: 0.25, max: 0.5, recommended: 0.25 },
};

/**
 * Freeboard requirements by channel type (m)
 */
export const FREEBOARD_REQUIREMENTS: Record<string, { min: number; typical: number }> = {
  small_laterals: { min: 0.15, typical: 0.20 },
  farm_ditches: { min: 0.15, typical: 0.25 },
  small_canals: { min: 0.20, typical: 0.30 },
  medium_canals: { min: 0.30, typical: 0.45 },
  large_canals: { min: 0.45, typical: 0.60 },
  natural_streams: { min: 0.30, typical: 0.60 },
  flood_channels: { min: 0.60, typical: 0.90 },
};

/**
 * Contraction and expansion loss coefficients
 */
export const LOSS_COEFFICIENTS = {
  contraction: {
    gradual: 0.1,
    typical: 0.3,
    abrupt: 0.6,
    bridge: 0.3,
  },
  expansion: {
    gradual: 0.3,
    typical: 0.5,
    abrupt: 0.8,
    bridge: 0.5,
  },
};

// Physical constants
const GRAVITY = 9.81; // m/s²
const WATER_SPECIFIC_WEIGHT = 9810; // N/m³

// ============================================================================
// Core Hydraulic Functions - Prismatic Channels
// ============================================================================

/**
 * Calculate flow using Manning's equation for prismatic channel
 * Q = (1/n) × A × R^(2/3) × S^(1/2)
 */
export function calculateManningFlowPrismatic(
  section: PrismaticSection,
  depth: number,
  slope: number,
  manningsN: number
): number {
  const A = calculatePrismaticArea(section, depth);
  const R = calculatePrismaticHydraulicRadius(section, depth);

  if (A <= 0 || R <= 0 || slope <= 0) return 0;

  return (1 / manningsN) * A * Math.pow(R, 2 / 3) * Math.pow(slope, 0.5);
}

/**
 * Calculate velocity for prismatic channel
 */
export function calculateVelocityPrismatic(
  section: PrismaticSection,
  depth: number,
  slope: number,
  manningsN: number
): number {
  const R = calculatePrismaticHydraulicRadius(section, depth);
  if (R <= 0 || slope <= 0) return 0;

  return (1 / manningsN) * Math.pow(R, 2 / 3) * Math.pow(slope, 0.5);
}

/**
 * Calculate Froude number
 * Fr = V / √(g × D)  where D = hydraulic depth = A/T
 */
export function calculateFroudeNumber(velocity: number, hydraulicDepth: number): number {
  if (hydraulicDepth <= 0) return 0;
  return velocity / Math.sqrt(GRAVITY * hydraulicDepth);
}

/**
 * Classify flow regime based on Froude number
 */
export function classifyFlowRegime(froudeNumber: number): FlowRegime {
  if (froudeNumber < 0.95) return 'subcritical';
  if (froudeNumber > 1.05) return 'supercritical';
  return 'critical';
}

/**
 * Calculate specific energy
 * E = y + V²/(2g) = y + Q²/(2gA²)
 */
export function calculateSpecificEnergy(depth: number, velocity: number): number {
  return depth + (velocity * velocity) / (2 * GRAVITY);
}

/**
 * Calculate shear stress (boundary shear)
 * τ = γ × R × S  where γ = specific weight of water
 */
export function calculateShearStress(hydraulicRadius: number, slope: number): number {
  return WATER_SPECIFIC_WEIGHT * hydraulicRadius * slope;
}

/**
 * Calculate conveyance
 * K = (1/n) × A × R^(2/3)
 */
export function calculateConveyance(area: number, hydraulicRadius: number, manningsN: number): number {
  if (area <= 0 || hydraulicRadius <= 0 || manningsN <= 0) return 0;
  return (1 / manningsN) * area * Math.pow(hydraulicRadius, 2 / 3);
}

/**
 * Calculate critical depth for prismatic channel
 * At critical depth: Fr = 1, or Q²T/(gA³) = 1
 *
 * Uses bisection method for general sections
 */
export function calculateCriticalDepthPrismatic(
  section: PrismaticSection,
  flow: number,
  tolerance: number = 0.0001,
  maxIterations: number = 100
): number {
  if (flow <= 0) return 0;

  // For rectangular section, analytical solution
  if (section.shape === 'rectangular') {
    const q = flow / section.bottomWidth; // unit discharge
    return Math.pow(q * q / GRAVITY, 1 / 3);
  }

  // Bisection method for other shapes
  let yLow = 0.001;
  let yHigh = 20.0; // Assume max depth of 20m

  // Adjust upper bound
  while (calculatePrismaticArea(section, yHigh) < flow / 0.1) {
    yHigh *= 2;
    if (yHigh > 100) break;
  }

  for (let i = 0; i < maxIterations; i++) {
    const yMid = (yLow + yHigh) / 2;
    const A = calculatePrismaticArea(section, yMid);
    const T = calculatePrismaticTopWidth(section, yMid);

    if (A <= 0 || T <= 0) {
      yLow = yMid;
      continue;
    }

    // Critical flow condition: Q²T/(gA³) = 1
    const criterion = (flow * flow * T) / (GRAVITY * A * A * A);

    if (Math.abs(criterion - 1) < tolerance) {
      return yMid;
    }

    if (criterion > 1) {
      yLow = yMid; // Need more depth
    } else {
      yHigh = yMid; // Need less depth
    }
  }

  return (yLow + yHigh) / 2;
}

/**
 * Calculate normal depth for prismatic channel
 * Depth at which uniform flow occurs (depth where Q_manning = Q_design)
 *
 * Uses Newton-Raphson with bisection fallback
 */
export function calculateNormalDepthPrismatic(
  section: PrismaticSection,
  flow: number,
  slope: number,
  manningsN: number,
  tolerance: number = 0.0001,
  maxIterations: number = 100
): number {
  if (flow <= 0 || slope <= 0) return 0;

  // Initial guess based on critical depth
  let y = calculateCriticalDepthPrismatic(section, flow);
  if (y <= 0) y = 1.0;

  // Newton-Raphson iteration
  for (let i = 0; i < maxIterations; i++) {
    const Q_calc = calculateManningFlowPrismatic(section, y, slope, manningsN);
    const A = calculatePrismaticArea(section, y);
    const P = calculatePrismaticWettedPerimeter(section, y);
    const T = calculatePrismaticTopWidth(section, y);

    if (A <= 0 || P <= 0) {
      y *= 1.5;
      continue;
    }

    const error = (Q_calc - flow) / flow;
    if (Math.abs(error) < tolerance) {
      return y;
    }

    // Derivative of Manning equation with respect to y (approximate)
    const R = A / P;
    const dA_dy = T; // Approximate
    const dP_dy = 2; // Approximate for most sections
    const dR_dy = (T * P - A * dP_dy) / (P * P);

    const dQ_dy = (1 / manningsN) * Math.pow(slope, 0.5) *
      (dA_dy * Math.pow(R, 2/3) + A * (2/3) * Math.pow(R, -1/3) * dR_dy);

    if (Math.abs(dQ_dy) > 0.0001) {
      const dy = (flow - Q_calc) / dQ_dy;
      y += dy;
      y = Math.max(0.001, y); // Prevent negative depth
    } else {
      // Fallback: simple adjustment
      y *= Math.pow(flow / Q_calc, 0.4);
    }
  }

  // Bisection fallback if Newton didn't converge
  return calculateNormalDepthBisection(section, flow, slope, manningsN, tolerance, maxIterations);
}

/**
 * Normal depth calculation using bisection (fallback method)
 */
function calculateNormalDepthBisection(
  section: PrismaticSection,
  flow: number,
  slope: number,
  manningsN: number,
  tolerance: number,
  maxIterations: number
): number {
  let yLow = 0.001;
  let yHigh = 50.0;

  for (let i = 0; i < maxIterations; i++) {
    const yMid = (yLow + yHigh) / 2;
    const Q_calc = calculateManningFlowPrismatic(section, yMid, slope, manningsN);

    if (Math.abs(Q_calc - flow) / flow < tolerance) {
      return yMid;
    }

    if (Q_calc < flow) {
      yLow = yMid;
    } else {
      yHigh = yMid;
    }
  }

  return (yLow + yHigh) / 2;
}

/**
 * Calculate critical slope for prismatic channel
 * Slope at which normal depth equals critical depth
 */
export function calculateCriticalSlopePrismatic(
  section: PrismaticSection,
  flow: number,
  manningsN: number
): number {
  const yc = calculateCriticalDepthPrismatic(section, flow);
  const A = calculatePrismaticArea(section, yc);
  const R = calculatePrismaticHydraulicRadius(section, yc);

  if (A <= 0 || R <= 0) return 0;

  // From Manning: S = (Q × n / (A × R^(2/3)))²
  const K = A * Math.pow(R, 2 / 3);
  return Math.pow((flow * manningsN) / K, 2);
}

/**
 * Complete flow analysis for prismatic channel
 */
export function analyzePrismaticFlow(
  section: PrismaticSection,
  depth: number,
  slope: number,
  manningsN: number
): PrismaticFlowResult {
  const warnings: string[] = [];

  const A = calculatePrismaticArea(section, depth);
  const P = calculatePrismaticWettedPerimeter(section, depth);
  const R = calculatePrismaticHydraulicRadius(section, depth);
  const T = calculatePrismaticTopWidth(section, depth);
  const D = calculatePrismaticHydraulicDepth(section, depth);

  const Q = calculateManningFlowPrismatic(section, depth, slope, manningsN);
  const V = A > 0 ? Q / A : 0;

  const Fr = calculateFroudeNumber(V, D);
  const flowRegime = classifyFlowRegime(Fr);

  const E = calculateSpecificEnergy(depth, V);
  const tau = calculateShearStress(R, slope);
  const K = calculateConveyance(A, R, manningsN);

  const yc = calculateCriticalDepthPrismatic(section, Q);
  const yn = calculateNormalDepthPrismatic(section, Q, slope, manningsN);

  // Warnings
  if (V < 0.3) {
    warnings.push('Low velocity - potential sedimentation');
  }
  if (V > 6.0) {
    warnings.push('High velocity - potential erosion');
  }
  if (Fr > 0.86 && Fr < 1.13) {
    warnings.push('Near critical flow - unstable conditions');
  }

  return {
    depth,
    flowRate: Q,
    velocity: V,
    area: A,
    wettedPerimeter: P,
    hydraulicRadius: R,
    topWidth: T,
    hydraulicDepth: D,
    froudeNumber: Fr,
    flowRegime,
    specificEnergy: E,
    criticalDepth: yc,
    normalDepth: yn,
    shearStress: tau,
    conveyance: K,
    warnings,
  };
}

/**
 * Calculate flow for a given depth and slope
 */
export function calculateFlowAtDepth(
  section: PrismaticSection,
  depth: number,
  slope: number,
  manningsN: number
): number {
  return calculateManningFlowPrismatic(section, depth, slope, manningsN);
}

// ============================================================================
// Core Hydraulic Functions - Irregular Channels
// ============================================================================

/**
 * Calculate flow using composite conveyance for irregular section
 * Q = K × S^(1/2)  where K = K_LOB + K_CH + K_ROB
 */
export function calculateManningFlowIrregular(
  section: IrregularCrossSection,
  wsel: number,
  slope: number
): number {
  const geom = calculateIrregularGeometry(section, wsel);
  return geom.totalConveyance * Math.pow(slope, 0.5);
}

/**
 * Calculate critical water surface elevation for irregular section
 */
export function calculateCriticalWSEL(
  section: IrregularCrossSection,
  flow: number,
  tolerance: number = 0.001,
  maxIterations: number = 100
): number {
  const minElev = getMinimumElevation(section);
  const maxElev = getMaximumElevation(section);

  let wselLow = minElev + 0.001;
  let wselHigh = maxElev;

  // Bisection to find where Fr = 1
  for (let i = 0; i < maxIterations; i++) {
    const wselMid = (wselLow + wselHigh) / 2;
    const geom = calculateIrregularGeometry(section, wselMid);

    if (geom.totalArea <= 0 || geom.totalTopWidth <= 0) {
      wselLow = wselMid;
      continue;
    }

    const V = flow / geom.totalArea;
    const D = geom.totalArea / geom.totalTopWidth;
    const Fr = V / Math.sqrt(GRAVITY * D);

    if (Math.abs(Fr - 1) < tolerance) {
      return wselMid;
    }

    if (Fr > 1) {
      wselLow = wselMid; // Need more depth to reduce velocity
    } else {
      wselHigh = wselMid; // Need less depth to increase velocity
    }
  }

  return (wselLow + wselHigh) / 2;
}

/**
 * Calculate normal water surface elevation for irregular section
 */
export function calculateNormalWSEL(
  section: IrregularCrossSection,
  flow: number,
  slope: number,
  tolerance: number = 0.001,
  maxIterations: number = 100
): number {
  const minElev = getMinimumElevation(section);
  const maxElev = getMaximumElevation(section);

  let wselLow = minElev + 0.001;
  let wselHigh = maxElev;

  // Bisection
  for (let i = 0; i < maxIterations; i++) {
    const wselMid = (wselLow + wselHigh) / 2;
    const Q_calc = calculateManningFlowIrregular(section, wselMid, slope);

    if (Math.abs(Q_calc - flow) / flow < tolerance) {
      return wselMid;
    }

    if (Q_calc < flow) {
      wselLow = wselMid;
    } else {
      wselHigh = wselMid;
    }
  }

  return (wselLow + wselHigh) / 2;
}

/**
 * Calculate Froude number for irregular section
 */
export function calculateFroudeIrregular(
  section: IrregularCrossSection,
  wsel: number,
  flow: number
): number {
  const geom = calculateIrregularGeometry(section, wsel);

  if (geom.totalArea <= 0 || geom.totalTopWidth <= 0) return 0;

  const V = flow / geom.totalArea;
  const D = geom.totalArea / geom.totalTopWidth;

  // For compound channels, use composite Froude:
  // Fr = Q / (A × sqrt(g × A/T))
  // But adjusted for velocity distribution (alpha)
  return Math.sqrt(geom.alphaCoefficient) * V / Math.sqrt(GRAVITY * D);
}

/**
 * Complete flow analysis for irregular section
 */
export function analyzeIrregularFlow(
  section: IrregularCrossSection,
  wsel: number,
  flow: number,
  slope?: number
): IrregularFlowResult {
  const warnings: string[] = [];

  const geom = calculateIrregularGeometry(section, wsel);
  const minElev = getMinimumElevation(section);
  const depth = wsel - minElev;

  const V = geom.totalArea > 0 ? flow / geom.totalArea : 0;
  const D = geom.totalTopWidth > 0 ? geom.totalArea / geom.totalTopWidth : depth;

  const Fr = calculateFroudeIrregular(section, wsel, flow);
  const flowRegime = classifyFlowRegime(Fr);

  const E = depth + geom.alphaCoefficient * V * V / (2 * GRAVITY);
  const tau = calculateShearStress(geom.averageHydraulicRadius, slope ?? 0.001);

  const criticalWSEL = calculateCriticalWSEL(section, flow);

  let normalWSEL: number | undefined;
  if (slope && slope > 0) {
    normalWSEL = calculateNormalWSEL(section, flow, slope);
  }

  // Warnings
  if (V < 0.3) {
    warnings.push('Low velocity - potential sedimentation');
  }
  if (V > 4.0) {
    warnings.push('High velocity in natural channel - potential erosion');
  }
  if (Fr > 0.86 && Fr < 1.13) {
    warnings.push('Near critical flow - unstable conditions');
  }

  // Check overbank flow
  const lobPercent = geom.totalConveyance > 0
    ? (geom.zones.leftOverbank.conveyance / geom.totalConveyance) * 100
    : 0;
  const robPercent = geom.totalConveyance > 0
    ? (geom.zones.rightOverbank.conveyance / geom.totalConveyance) * 100
    : 0;

  if (lobPercent > 20 || robPercent > 20) {
    warnings.push(`Significant overbank flow: LOB=${lobPercent.toFixed(0)}%, ROB=${robPercent.toFixed(0)}%`);
  }

  return {
    waterSurfaceElevation: wsel,
    depth,
    flowRate: flow,
    averageVelocity: V,
    geometry: geom,
    froudeNumber: Fr,
    flowRegime,
    specificEnergy: E,
    criticalWSEL,
    normalWSEL,
    averageShearStress: tau,
    warnings,
  };
}

// ============================================================================
// Additional Calculations
// ============================================================================

/**
 * Calculate momentum function (specific force)
 * M = Q²/(gA) + ȳ×A
 * where ȳ is the depth to centroid of flow area
 */
export function calculateMomentum(area: number, flow: number, centroidDepth: number): number {
  if (area <= 0) return 0;
  return (flow * flow) / (GRAVITY * area) + centroidDepth * area;
}

/**
 * Calculate conjugate (sequent) depth for hydraulic jump
 * Uses momentum equation: M1 = M2
 *
 * For rectangular channel:
 * y2/y1 = 0.5 × (-1 + sqrt(1 + 8×Fr1²))
 */
export function calculateConjugateDepth(
  section: PrismaticSection,
  initialDepth: number,
  flow: number,
  tolerance: number = 0.0001,
  maxIterations: number = 100
): number {
  // For rectangular section, use analytical solution
  if (section.shape === 'rectangular') {
    const A1 = calculatePrismaticArea(section, initialDepth);
    const V1 = A1 > 0 ? flow / A1 : 0;
    const D1 = calculatePrismaticHydraulicDepth(section, initialDepth);
    const Fr1 = calculateFroudeNumber(V1, D1);

    return initialDepth * 0.5 * (-1 + Math.sqrt(1 + 8 * Fr1 * Fr1));
  }

  // For other shapes, use momentum balance with bisection
  const A1 = calculatePrismaticArea(section, initialDepth);
  const ybar1 = initialDepth / 2; // Approximate centroid for most shapes
  const M1 = calculateMomentum(A1, flow, ybar1);

  let y2Low = initialDepth * 1.1;
  let y2High = initialDepth * 10;

  for (let i = 0; i < maxIterations; i++) {
    const y2Mid = (y2Low + y2High) / 2;
    const A2 = calculatePrismaticArea(section, y2Mid);
    const ybar2 = y2Mid / 2;
    const M2 = calculateMomentum(A2, flow, ybar2);

    if (Math.abs(M2 - M1) / M1 < tolerance) {
      return y2Mid;
    }

    if (M2 < M1) {
      y2Low = y2Mid;
    } else {
      y2High = y2Mid;
    }
  }

  return (y2Low + y2High) / 2;
}

/**
 * Calculate energy loss in hydraulic jump
 * ΔE = E1 - E2
 */
export function calculateJumpEnergyLoss(
  section: PrismaticSection,
  y1: number,
  y2: number,
  flow: number
): number {
  const A1 = calculatePrismaticArea(section, y1);
  const A2 = calculatePrismaticArea(section, y2);
  const V1 = A1 > 0 ? flow / A1 : 0;
  const V2 = A2 > 0 ? flow / A2 : 0;

  const E1 = calculateSpecificEnergy(y1, V1);
  const E2 = calculateSpecificEnergy(y2, V2);

  return E1 - E2;
}

/**
 * Get Manning's n for a material type
 */
export function getManningsN(material: ChannelMaterial, condition: 'min' | 'typical' | 'max' = 'typical'): number {
  return MANNING_N_CHANNELS[material][condition];
}

/**
 * Format flow analysis result for display
 */
export function formatPrismaticResult(result: PrismaticFlowResult): string {
  const lines = [
    '═══ ANÁLISIS DE FLUJO EN CANAL ═══',
    '',
    '--- FLUJO ---',
    `Caudal: ${result.flowRate.toFixed(3)} m³/s`,
    `Velocidad: ${result.velocity.toFixed(2)} m/s`,
    `Profundidad: ${result.depth.toFixed(3)} m`,
    '',
    '--- GEOMETRÍA ---',
    `Área: ${result.area.toFixed(3)} m²`,
    `Perímetro Mojado: ${result.wettedPerimeter.toFixed(3)} m`,
    `Radio Hidráulico: ${result.hydraulicRadius.toFixed(4)} m`,
    `Ancho Superficial: ${result.topWidth.toFixed(3)} m`,
    '',
    '--- RÉGIMEN ---',
    `Número de Froude: ${result.froudeNumber.toFixed(3)}`,
    `Régimen: ${result.flowRegime}`,
    `Energía Específica: ${result.specificEnergy.toFixed(3)} m`,
    '',
    '--- PROFUNDIDADES ---',
    `Profundidad Crítica: ${result.criticalDepth.toFixed(3)} m`,
    result.normalDepth ? `Profundidad Normal: ${result.normalDepth.toFixed(3)} m` : '',
    '',
    '--- ESFUERZO CORTANTE ---',
    `τ = ${result.shearStress.toFixed(2)} N/m²`,
  ];

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  return lines.filter(l => l !== '').join('\n');
}

/**
 * Format irregular flow result for display
 */
export function formatIrregularResult(result: IrregularFlowResult): string {
  const { geometry } = result;

  const lines = [
    '═══ ANÁLISIS DE SECCIÓN IRREGULAR ═══',
    '',
    '--- FLUJO ---',
    `Caudal: ${result.flowRate.toFixed(3)} m³/s`,
    `Velocidad Media: ${result.averageVelocity.toFixed(2)} m/s`,
    `WSEL: ${result.waterSurfaceElevation.toFixed(3)} m`,
    `Profundidad: ${result.depth.toFixed(3)} m`,
    '',
    '--- GEOMETRÍA TOTAL ---',
    `Área: ${geometry.totalArea.toFixed(3)} m²`,
    `Perímetro Mojado: ${geometry.totalWettedPerimeter.toFixed(3)} m`,
    `Radio Hidráulico: ${geometry.averageHydraulicRadius.toFixed(4)} m`,
    `Ancho Superficial: ${geometry.totalTopWidth.toFixed(3)} m`,
    `Conductancia Total: ${geometry.totalConveyance.toFixed(3)} m³/s`,
    '',
    '--- POR ZONA ---',
    `  LOB: A=${geometry.zones.leftOverbank.area.toFixed(2)}m², K=${geometry.zones.leftOverbank.conveyance.toFixed(2)}`,
    `  CH:  A=${geometry.zones.mainChannel.area.toFixed(2)}m², K=${geometry.zones.mainChannel.conveyance.toFixed(2)}`,
    `  ROB: A=${geometry.zones.rightOverbank.area.toFixed(2)}m², K=${geometry.zones.rightOverbank.conveyance.toFixed(2)}`,
    '',
    '--- RÉGIMEN ---',
    `Número de Froude: ${result.froudeNumber.toFixed(3)}`,
    `Régimen: ${result.flowRegime}`,
    `α (energía): ${geometry.alphaCoefficient.toFixed(3)}`,
    `β (momento): ${geometry.betaCoefficient.toFixed(3)}`,
    '',
    '--- ELEVACIONES CRÍTICAS ---',
    `WSEL Crítico: ${result.criticalWSEL.toFixed(3)} m`,
    result.normalWSEL ? `WSEL Normal: ${result.normalWSEL.toFixed(3)} m` : '',
  ];

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  return lines.filter(l => l !== '').join('\n');
}
