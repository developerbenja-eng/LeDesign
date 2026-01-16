/**
 * Hydraulic Jump Module - Complete Analysis and Design
 *
 * Implements comprehensive hydraulic jump calculations including:
 * - Sequent (conjugate) depth computation
 * - Jump classification by Froude number
 * - Energy dissipation and efficiency
 * - Jump length and location
 * - Stilling basin design (USBR types)
 *
 * Based on:
 * - USBR Engineering Monograph No. 25 (Peterka)
 * - Open Channel Hydraulics (Ven Te Chow)
 * - Hydraulic Structures (Novak et al.)
 * - Manual de Carreteras Vol. 3 - MOP Chile
 */

import {
  PrismaticSection,
  calculatePrismaticArea,
  calculatePrismaticHydraulicDepth,
  calculatePrismaticTopWidth,
} from './channel-geometry';

import {
  calculateFroudeNumber,
  calculateSpecificEnergy,
} from './channel-hydraulics';

// ============================================================================
// Types
// ============================================================================

export type JumpType =
  | 'undular'      // Fr1 = 1.0-1.7: Undulating surface, low energy loss
  | 'weak'         // Fr1 = 1.7-2.5: Weak jump, smooth rise
  | 'oscillating'  // Fr1 = 2.5-4.5: Unstable, oscillating jet
  | 'steady'       // Fr1 = 4.5-9.0: Well-balanced, steady jump
  | 'strong'       // Fr1 > 9.0: Rough, high energy dissipation
  | 'no_jump';     // Fr1 < 1.0: Subcritical flow, no jump possible

export interface HydraulicJumpResult {
  // Input conditions
  upstreamDepth: number;        // y1 (m)
  upstreamVelocity: number;     // V1 (m/s)
  upstreamFroude: number;       // Fr1
  discharge: number;            // Q (m³/s)

  // Jump characteristics
  sequentDepth: number;         // y2 (m)
  downstreamVelocity: number;   // V2 (m/s)
  downstreamFroude: number;     // Fr2
  depthRatio: number;           // y2/y1
  jumpType: JumpType;

  // Energy analysis
  upstreamEnergy: number;       // E1 (m)
  downstreamEnergy: number;     // E2 (m)
  energyLoss: number;           // ΔE (m)
  energyLossPercent: number;    // ΔE/E1 × 100 (%)
  efficiency: number;           // E2/E1 × 100 (%)
  relativeLoss: number;         // ΔE/E1 (dimensionless)

  // Jump geometry
  jumpLength: number;           // Lj (m)
  rollerLength: number;         // Lr (m)
  jumpHeight: number;           // y2 - y1 (m)

  // Hydraulic characteristics
  specificForceUpstream: number;   // M1 (m³)
  specificForceDownstream: number; // M2 (m³)
  powerDissipated: number;         // P (kW)

  // Design recommendations
  recommendedBasinType: string;
  recommendations: string[];
  warnings: string[];
}

export interface StillingBasinDesign {
  basinType: 'USBR_I' | 'USBR_II' | 'USBR_III' | 'USBR_IV' | 'SAF';
  basinLength: number;          // LB (m)
  basinWidth: number;           // B (m)
  basinDepth: number;           // Below tailwater (m)
  apronElevation: number;       // Invert elevation (m)
  endSillHeight: number;        // h3 (m)
  endSillType: 'dentated' | 'solid' | 'none';
  chuteBLocks: {
    required: boolean;
    height: number;             // h1 (m)
    width: number;              // w1 (m)
    spacing: number;            // s1 (m)
    count: number;
  };
  baffleBlocks: {
    required: boolean;
    height: number;             // h2 (m)
    width: number;              // w2 (m)
    spacing: number;            // s2 (m)
    distanceFromChute: number;  // d (m)
    count: number;
  };
  tailwaterDepth: number;       // TW (m)
  tailwaterElevation: number;
  freeboard: number;            // (m)
  wallHeight: number;           // (m)
  recommendations: string[];
}

export interface JumpLocationResult {
  location: 'in_channel' | 'at_structure' | 'drowned' | 'swept_downstream';
  distanceFromControl: number;  // (m)
  jumpStartStation: number;     // (m)
  jumpEndStation: number;       // (m)
  tailwaterRequired: number;    // (m)
  tailwaterAvailable: number;   // (m)
  tailwaterDeficiency: number;  // (m)
  isStable: boolean;
  recommendations: string[];
}

// ============================================================================
// Constants
// ============================================================================

const GRAVITY = 9.81; // m/s²
const WATER_DENSITY = 1000; // kg/m³

// ============================================================================
// Core Jump Calculations
// ============================================================================

/**
 * Classify hydraulic jump type based on upstream Froude number
 * Based on USBR classifications
 */
export function classifyJumpType(froudeNumber: number): JumpType {
  if (froudeNumber < 1.0) return 'no_jump';
  if (froudeNumber < 1.7) return 'undular';
  if (froudeNumber < 2.5) return 'weak';
  if (froudeNumber < 4.5) return 'oscillating';
  if (froudeNumber < 9.0) return 'steady';
  return 'strong';
}

/**
 * Calculate sequent (conjugate) depth for rectangular channel
 * Uses Belanger equation: y2/y1 = 0.5 × (-1 + √(1 + 8Fr1²))
 */
export function calculateSequentDepthRectangular(
  upstreamDepth: number,
  froudeNumber: number
): number {
  if (froudeNumber <= 1.0) {
    // No jump for subcritical flow
    return upstreamDepth;
  }

  const ratio = 0.5 * (-1 + Math.sqrt(1 + 8 * froudeNumber * froudeNumber));
  return upstreamDepth * ratio;
}

/**
 * Calculate sequent depth for trapezoidal channel
 * Uses iterative momentum balance
 */
export function calculateSequentDepthTrapezoidal(
  upstreamDepth: number,
  bottomWidth: number,
  sideSlope: number,
  discharge: number,
  tolerance: number = 0.0001,
  maxIterations: number = 100
): number {
  // Calculate upstream conditions
  const A1 = upstreamDepth * (bottomWidth + sideSlope * upstreamDepth);
  const T1 = bottomWidth + 2 * sideSlope * upstreamDepth;
  const D1 = A1 / T1;
  const V1 = discharge / A1;
  const Fr1 = V1 / Math.sqrt(GRAVITY * D1);

  if (Fr1 <= 1.0) return upstreamDepth;

  // Momentum function: M = Q²/(gA) + ȳ×A
  // For trapezoidal: ȳ = (3b + 2zy)y / (6(b + zy))
  const calculateMomentum = (y: number): number => {
    const A = y * (bottomWidth + sideSlope * y);
    const ybar = y * (3 * bottomWidth + 2 * sideSlope * y) / (6 * (bottomWidth + sideSlope * y));
    return (discharge * discharge) / (GRAVITY * A) + ybar * A;
  };

  const M1 = calculateMomentum(upstreamDepth);

  // Bisection to find y2 where M2 = M1
  let y2Low = upstreamDepth * 1.1;
  let y2High = upstreamDepth * 15;

  for (let i = 0; i < maxIterations; i++) {
    const y2Mid = (y2Low + y2High) / 2;
    const M2 = calculateMomentum(y2Mid);

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
 * Calculate sequent depth for circular channel (partially full)
 * Uses iterative momentum balance
 */
export function calculateSequentDepthCircular(
  upstreamDepth: number,
  diameter: number,
  discharge: number,
  tolerance: number = 0.0001,
  maxIterations: number = 100
): number {
  const R = diameter / 2;

  // Circular section geometry
  const getCircularArea = (y: number): number => {
    if (y <= 0) return 0;
    if (y >= diameter) return Math.PI * R * R;
    const theta = 2 * Math.acos(1 - y / R);
    return R * R * (theta - Math.sin(theta)) / 2;
  };

  const getCircularTopWidth = (y: number): number => {
    if (y <= 0 || y >= diameter) return 0;
    return 2 * Math.sqrt(y * (diameter - y));
  };

  const A1 = getCircularArea(upstreamDepth);
  const T1 = getCircularTopWidth(upstreamDepth);
  if (A1 <= 0 || T1 <= 0) return upstreamDepth;

  const D1 = A1 / T1;
  const V1 = discharge / A1;
  const Fr1 = V1 / Math.sqrt(GRAVITY * D1);

  if (Fr1 <= 1.0) return upstreamDepth;

  // Momentum balance using bisection
  const calculateMomentum = (y: number): number => {
    const A = getCircularArea(y);
    if (A <= 0) return 0;
    // Approximate centroid depth for circular section
    const ybar = y * 0.4; // Approximation
    return (discharge * discharge) / (GRAVITY * A) + ybar * A;
  };

  const M1 = calculateMomentum(upstreamDepth);

  let y2Low = upstreamDepth * 1.1;
  let y2High = Math.min(upstreamDepth * 10, diameter * 0.95);

  for (let i = 0; i < maxIterations; i++) {
    const y2Mid = (y2Low + y2High) / 2;
    const M2 = calculateMomentum(y2Mid);

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
 * Calculate sequent depth for general prismatic section
 */
export function calculateSequentDepth(
  section: PrismaticSection,
  upstreamDepth: number,
  discharge: number,
  tolerance: number = 0.0001,
  maxIterations: number = 100
): number {
  // Use specialized formula for rectangular
  if (section.shape === 'rectangular') {
    const A1 = calculatePrismaticArea(section, upstreamDepth);
    const D1 = calculatePrismaticHydraulicDepth(section, upstreamDepth);
    const V1 = discharge / A1;
    const Fr1 = calculateFroudeNumber(V1, D1);
    return calculateSequentDepthRectangular(upstreamDepth, Fr1);
  }

  // Use specialized formula for trapezoidal
  if (section.shape === 'trapezoidal' && section.sideSlope !== undefined) {
    return calculateSequentDepthTrapezoidal(
      upstreamDepth,
      section.bottomWidth,
      section.sideSlope,
      discharge,
      tolerance,
      maxIterations
    );
  }

  // Use specialized formula for circular
  if (section.shape === 'circular' && section.diameter !== undefined) {
    return calculateSequentDepthCircular(
      upstreamDepth,
      section.diameter,
      discharge,
      tolerance,
      maxIterations
    );
  }

  // General iterative solution using momentum balance
  const calculateMomentum = (y: number): number => {
    const A = calculatePrismaticArea(section, y);
    if (A <= 0) return 0;
    const ybar = y / 2; // Approximate centroid
    return (discharge * discharge) / (GRAVITY * A) + ybar * A;
  };

  const M1 = calculateMomentum(upstreamDepth);

  let y2Low = upstreamDepth * 1.1;
  let y2High = upstreamDepth * 15;

  for (let i = 0; i < maxIterations; i++) {
    const y2Mid = (y2Low + y2High) / 2;
    const M2 = calculateMomentum(y2Mid);

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
 * Calculate jump length using empirical formulas
 * Based on USBR and other research
 */
export function calculateJumpLength(
  upstreamDepth: number,
  sequentDepth: number,
  froudeNumber: number
): number {
  // Peterka (USBR): Lj = 6.9 × (y2 - y1) for Fr1 = 4.5-9.0
  // Varies by jump type

  const deltaY = sequentDepth - upstreamDepth;

  if (froudeNumber < 1.7) {
    // Undular jump: Lj ≈ 4 × y2
    return 4 * sequentDepth;
  } else if (froudeNumber < 2.5) {
    // Weak jump: Lj ≈ 5 × (y2 - y1)
    return 5 * deltaY;
  } else if (froudeNumber < 4.5) {
    // Oscillating jump: Lj ≈ 6 × (y2 - y1)
    return 6 * deltaY;
  } else if (froudeNumber < 9.0) {
    // Steady jump: Lj ≈ 6.1 × (y2 - y1) (Peterka)
    return 6.1 * deltaY;
  } else {
    // Strong jump: Lj ≈ 6.9 × (y2 - y1)
    return 6.9 * deltaY;
  }
}

/**
 * Calculate roller length (surface roller zone)
 * Lr ≈ 4.5 to 5.5 × y2
 */
export function calculateRollerLength(sequentDepth: number, froudeNumber: number): number {
  // Empirical relationship from Hager (1992)
  if (froudeNumber < 2) {
    return 4 * sequentDepth;
  } else if (froudeNumber < 5) {
    return 4.5 * sequentDepth;
  } else {
    return 5 * sequentDepth;
  }
}

/**
 * Calculate energy loss in hydraulic jump
 * ΔE = (y2 - y1)³ / (4 × y1 × y2) for rectangular channel
 */
export function calculateEnergyLoss(
  upstreamDepth: number,
  sequentDepth: number,
  upstreamVelocity: number,
  downstreamVelocity: number
): number {
  const E1 = upstreamDepth + (upstreamVelocity * upstreamVelocity) / (2 * GRAVITY);
  const E2 = sequentDepth + (downstreamVelocity * downstreamVelocity) / (2 * GRAVITY);
  return E1 - E2;
}

/**
 * Calculate energy loss using rectangular formula
 * ΔE = (y2 - y1)³ / (4 × y1 × y2)
 */
export function calculateEnergyLossRectangular(
  upstreamDepth: number,
  sequentDepth: number
): number {
  const deltaY = sequentDepth - upstreamDepth;
  return (deltaY * deltaY * deltaY) / (4 * upstreamDepth * sequentDepth);
}

/**
 * Calculate power dissipated in jump
 * P = γ × Q × ΔE (watts)
 */
export function calculatePowerDissipated(
  discharge: number,
  energyLoss: number
): number {
  // P = ρ × g × Q × ΔE (W)
  // Return in kW
  return (WATER_DENSITY * GRAVITY * discharge * energyLoss) / 1000;
}

// ============================================================================
// Complete Jump Analysis
// ============================================================================

/**
 * Complete hydraulic jump analysis
 */
export function analyzeHydraulicJump(
  section: PrismaticSection,
  upstreamDepth: number,
  discharge: number
): HydraulicJumpResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Upstream conditions
  const A1 = calculatePrismaticArea(section, upstreamDepth);
  const T1 = calculatePrismaticTopWidth(section, upstreamDepth);
  const D1 = A1 / T1;
  const V1 = discharge / A1;
  const Fr1 = calculateFroudeNumber(V1, D1);
  const E1 = calculateSpecificEnergy(upstreamDepth, V1);

  // Classify jump
  const jumpType = classifyJumpType(Fr1);

  if (jumpType === 'no_jump') {
    return {
      upstreamDepth,
      upstreamVelocity: V1,
      upstreamFroude: Fr1,
      discharge,
      sequentDepth: upstreamDepth,
      downstreamVelocity: V1,
      downstreamFroude: Fr1,
      depthRatio: 1,
      jumpType: 'no_jump',
      upstreamEnergy: E1,
      downstreamEnergy: E1,
      energyLoss: 0,
      energyLossPercent: 0,
      efficiency: 100,
      relativeLoss: 0,
      jumpLength: 0,
      rollerLength: 0,
      jumpHeight: 0,
      specificForceUpstream: 0,
      specificForceDownstream: 0,
      powerDissipated: 0,
      recommendedBasinType: 'None required',
      recommendations: ['Flow is subcritical - no hydraulic jump will form'],
      warnings: ['Cannot form hydraulic jump with subcritical upstream flow'],
    };
  }

  // Calculate sequent depth
  const y2 = calculateSequentDepth(section, upstreamDepth, discharge);

  // Downstream conditions
  const A2 = calculatePrismaticArea(section, y2);
  const T2 = calculatePrismaticTopWidth(section, y2);
  const D2 = A2 / T2;
  const V2 = discharge / A2;
  const Fr2 = calculateFroudeNumber(V2, D2);
  const E2 = calculateSpecificEnergy(y2, V2);

  // Energy analysis
  const deltaE = E1 - E2;
  const energyLossPercent = (deltaE / E1) * 100;
  const efficiency = (E2 / E1) * 100;

  // Jump geometry
  const jumpLength = calculateJumpLength(upstreamDepth, y2, Fr1);
  const rollerLength = calculateRollerLength(y2, Fr1);

  // Specific force (momentum function)
  const ybar1 = upstreamDepth / 2;
  const ybar2 = y2 / 2;
  const M1 = (discharge * discharge) / (GRAVITY * A1) + ybar1 * A1;
  const M2 = (discharge * discharge) / (GRAVITY * A2) + ybar2 * A2;

  // Power dissipated
  const power = calculatePowerDissipated(discharge, deltaE);

  // Recommendations based on jump type
  let recommendedBasinType = 'Standard apron';

  switch (jumpType) {
    case 'undular':
      recommendations.push('Undular jump - minimal energy dissipation');
      recommendations.push('Consider if energy dissipation is actually needed');
      recommendedBasinType = 'None or simple apron';
      break;
    case 'weak':
      recommendations.push('Weak jump - modest energy dissipation');
      recommendations.push('Simple apron or SAF basin may be sufficient');
      recommendedBasinType = 'SAF or simple apron';
      break;
    case 'oscillating':
      recommendations.push('Oscillating jump - unstable conditions');
      recommendations.push('Avoid this range if possible (Fr = 2.5-4.5)');
      recommendations.push('USBR Type IV basin recommended for wave suppression');
      recommendedBasinType = 'USBR Type IV';
      warnings.push('Oscillating jump can cause wave action and bank erosion');
      break;
    case 'steady':
      recommendations.push('Steady jump - optimal energy dissipation');
      recommendations.push('USBR Type II or III basin recommended');
      recommendedBasinType = Fr1 < 7 ? 'USBR Type III' : 'USBR Type II';
      break;
    case 'strong':
      recommendations.push('Strong jump - high energy dissipation');
      recommendations.push('USBR Type II basin with chute blocks required');
      recommendedBasinType = 'USBR Type II';
      warnings.push('High turbulence - ensure adequate basin depth');
      break;
  }

  // Additional warnings
  if (Fr1 > 12) {
    warnings.push('Very high Froude number - significant air entrainment expected');
  }
  if (energyLossPercent > 70) {
    warnings.push('High energy dissipation - verify structural adequacy');
  }
  if (V2 > 3) {
    warnings.push('Downstream velocity still high - may need additional protection');
  }

  return {
    upstreamDepth,
    upstreamVelocity: V1,
    upstreamFroude: Fr1,
    discharge,
    sequentDepth: y2,
    downstreamVelocity: V2,
    downstreamFroude: Fr2,
    depthRatio: y2 / upstreamDepth,
    jumpType,
    upstreamEnergy: E1,
    downstreamEnergy: E2,
    energyLoss: deltaE,
    energyLossPercent,
    efficiency,
    relativeLoss: deltaE / E1,
    jumpLength,
    rollerLength,
    jumpHeight: y2 - upstreamDepth,
    specificForceUpstream: M1,
    specificForceDownstream: M2,
    powerDissipated: power,
    recommendedBasinType,
    recommendations,
    warnings,
  };
}

/**
 * Quick hydraulic jump calculation for rectangular channel
 */
export function quickJumpAnalysis(
  width: number,
  upstreamDepth: number,
  discharge: number
): {
  sequentDepth: number;
  energyLoss: number;
  jumpLength: number;
  jumpType: JumpType;
  froudeUpstream: number;
} {
  const q = discharge / width; // Unit discharge
  const V1 = q / upstreamDepth;
  const Fr1 = V1 / Math.sqrt(GRAVITY * upstreamDepth);

  const y2 = calculateSequentDepthRectangular(upstreamDepth, Fr1);
  const deltaE = calculateEnergyLossRectangular(upstreamDepth, y2);
  const Lj = calculateJumpLength(upstreamDepth, y2, Fr1);
  const jumpType = classifyJumpType(Fr1);

  return {
    sequentDepth: y2,
    energyLoss: deltaE,
    jumpLength: Lj,
    jumpType,
    froudeUpstream: Fr1,
  };
}

// ============================================================================
// Stilling Basin Design
// ============================================================================

/**
 * Design USBR stilling basin
 * Based on USBR Engineering Monograph No. 25
 */
export function designStillingBasin(
  section: PrismaticSection,
  upstreamDepth: number,
  discharge: number,
  tailwaterElevation: number,
  chuteInvertElevation: number
): StillingBasinDesign {
  const recommendations: string[] = [];

  // Analyze the jump
  const jump = analyzeHydraulicJump(section, upstreamDepth, discharge);
  const Fr1 = jump.upstreamFroude;
  const y2 = jump.sequentDepth;
  const V1 = jump.upstreamVelocity;

  // Get channel width
  const width = section.shape === 'rectangular'
    ? section.bottomWidth
    : calculatePrismaticTopWidth(section, upstreamDepth);

  // Required tailwater depth
  const TWRequired = y2;
  const TWAvailable = tailwaterElevation - chuteInvertElevation;

  // Determine basin type based on Froude number and conditions
  let basinType: StillingBasinDesign['basinType'];
  let basinDepthFactor: number;
  let endSillHeightFactor: number;
  let chuteBlockHeightFactor: number;
  let baffleHeightFactor: number;
  let basinLengthFactor: number;

  if (Fr1 < 2.5) {
    // Low Froude - use SAF basin (Saint Anthony Falls)
    basinType = 'SAF';
    basinDepthFactor = 1.0;
    basinLengthFactor = 4.5;
    endSillHeightFactor = 0.07;
    chuteBlockHeightFactor = 0.8;
    baffleHeightFactor = 0;
    recommendations.push('SAF basin suitable for low Froude numbers');
  } else if (Fr1 >= 2.5 && Fr1 < 4.5) {
    // Oscillating range - USBR Type IV
    basinType = 'USBR_IV';
    basinDepthFactor = 1.1;
    basinLengthFactor = 6.0;
    endSillHeightFactor = 0.0;
    chuteBlockHeightFactor = 2.0;
    baffleHeightFactor = 0;
    recommendations.push('USBR Type IV for wave suppression in oscillating range');
  } else if (Fr1 >= 4.5 && Fr1 < 9.0) {
    // Well-defined jump - USBR Type III
    basinType = 'USBR_III';
    basinDepthFactor = 1.0;
    basinLengthFactor = 2.8;
    endSillHeightFactor = 0.2;
    chuteBlockHeightFactor = 1.0;
    baffleHeightFactor = 0.8;
    recommendations.push('USBR Type III with baffle blocks for velocity < 15 m/s');
  } else {
    // High Froude - USBR Type II
    basinType = 'USBR_II';
    basinDepthFactor = 1.05;
    basinLengthFactor = 4.3;
    endSillHeightFactor = 0.2;
    chuteBlockHeightFactor = 1.0;
    baffleHeightFactor = 0;
    recommendations.push('USBR Type II for high velocity and high Froude numbers');
  }

  // Calculate basin dimensions
  const basinDepth = TWRequired * basinDepthFactor - TWAvailable;
  const apronElevation = chuteInvertElevation - Math.max(0, basinDepth);
  const basinLength = basinLengthFactor * y2;

  // Chute blocks
  const h1 = chuteBlockHeightFactor * upstreamDepth;
  const w1 = 0.75 * h1;
  const s1 = w1;
  const chuteBlockCount = Math.floor(width / (w1 + s1));

  // Baffle blocks (only for Type III)
  const h2 = baffleHeightFactor * upstreamDepth;
  const w2 = 0.75 * h2;
  const s2 = 0.5 * w2;
  const baffleDistance = 0.8 * y2; // Distance from chute blocks
  const baffleBlockCount = basinType === 'USBR_III' ? Math.floor(width / (w2 + s2)) : 0;

  // End sill
  const h3 = endSillHeightFactor * y2;
  const endSillType: StillingBasinDesign['endSillType'] =
    basinType === 'USBR_II' ? 'dentated' :
    basinType === 'USBR_III' ? 'solid' :
    h3 > 0 ? 'solid' : 'none';

  // Freeboard and wall height
  const freeboard = 0.3 + 0.02 * V1 * V1 / (2 * GRAVITY); // Velocity head + margin
  const wallHeight = y2 + freeboard;

  // Tailwater analysis
  if (TWAvailable < TWRequired * 0.85) {
    recommendations.push('Tailwater deficient - lower apron elevation required');
  } else if (TWAvailable > TWRequired * 1.15) {
    recommendations.push('Excess tailwater - jump may be submerged');
  }

  // Velocity check for baffle blocks
  if (basinType === 'USBR_III' && V1 > 15) {
    recommendations.push('Warning: V > 15 m/s - consider USBR Type II instead');
  }

  return {
    basinType,
    basinLength,
    basinWidth: width,
    basinDepth: Math.max(0, basinDepth),
    apronElevation,
    endSillHeight: h3,
    endSillType,
    chuteBLocks: {
      required: chuteBlockHeightFactor > 0,
      height: h1,
      width: w1,
      spacing: s1,
      count: chuteBlockCount,
    },
    baffleBlocks: {
      required: baffleHeightFactor > 0,
      height: h2,
      width: w2,
      spacing: s2,
      distanceFromChute: baffleDistance,
      count: baffleBlockCount,
    },
    tailwaterDepth: TWRequired,
    tailwaterElevation: apronElevation + TWRequired,
    freeboard,
    wallHeight,
    recommendations,
  };
}

// ============================================================================
// Jump Location Analysis
// ============================================================================

/**
 * Analyze jump location based on tailwater conditions
 */
export function analyzeJumpLocation(
  section: PrismaticSection,
  upstreamDepth: number,
  discharge: number,
  channelSlope: number,
  tailwaterDepth: number,
  distanceToTailwater: number
): JumpLocationResult {
  const recommendations: string[] = [];

  // Calculate sequent depth required
  const jump = analyzeHydraulicJump(section, upstreamDepth, discharge);
  const y2Required = jump.sequentDepth;

  // Compare with available tailwater
  const TWDeficiency = y2Required - tailwaterDepth;
  const isStable = Math.abs(TWDeficiency) < 0.05 * y2Required;

  let location: JumpLocationResult['location'];
  let jumpStartStation = 0;
  let jumpEndStation = jump.jumpLength;

  if (tailwaterDepth < y2Required * 0.85) {
    // Insufficient tailwater - jump moves downstream
    location = 'swept_downstream';
    recommendations.push('Tailwater insufficient - jump will be swept downstream');
    recommendations.push('Consider adding stilling basin or lowering apron');
    jumpStartStation = distanceToTailwater;
    jumpEndStation = jumpStartStation + jump.jumpLength;
  } else if (tailwaterDepth > y2Required * 1.15) {
    // Excess tailwater - jump drowns or moves upstream
    location = 'drowned';
    recommendations.push('Excess tailwater - submerged/drowned jump condition');
    recommendations.push('Less energy dissipation than free jump');
    jumpStartStation = 0;
    jumpEndStation = jump.jumpLength * 0.7; // Shortened due to submergence
  } else {
    // Adequate tailwater - jump forms at structure
    location = 'at_structure';
    recommendations.push('Tailwater adequate - stable jump at structure');
    jumpStartStation = 0;
    jumpEndStation = jump.jumpLength;
  }

  // Check if jump fits within available distance
  if (location !== 'drowned' && jumpEndStation > distanceToTailwater) {
    location = 'in_channel';
    recommendations.push('Jump extends into downstream channel');
    recommendations.push('Provide adequate channel protection');
  }

  return {
    location,
    distanceFromControl: jumpStartStation,
    jumpStartStation,
    jumpEndStation,
    tailwaterRequired: y2Required,
    tailwaterAvailable: tailwaterDepth,
    tailwaterDeficiency: Math.max(0, TWDeficiency),
    isStable,
    recommendations,
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format hydraulic jump result for display
 */
export function formatJumpResult(result: HydraulicJumpResult): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '         ANÁLISIS DE SALTO HIDRÁULICO',
    '═══════════════════════════════════════════════════════',
    '',
    '--- CONDICIONES AGUAS ARRIBA ---',
    `  Profundidad y₁: ${result.upstreamDepth.toFixed(3)} m`,
    `  Velocidad V₁: ${result.upstreamVelocity.toFixed(2)} m/s`,
    `  Froude Fr₁: ${result.upstreamFroude.toFixed(2)}`,
    `  Energía E₁: ${result.upstreamEnergy.toFixed(3)} m`,
    '',
    '--- CLASIFICACIÓN DEL SALTO ---',
    `  Tipo: ${getJumpTypeDescription(result.jumpType)}`,
    '',
    '--- CONDICIONES AGUAS ABAJO ---',
    `  Profundidad Secuente y₂: ${result.sequentDepth.toFixed(3)} m`,
    `  Velocidad V₂: ${result.downstreamVelocity.toFixed(2)} m/s`,
    `  Froude Fr₂: ${result.downstreamFroude.toFixed(2)}`,
    `  Energía E₂: ${result.downstreamEnergy.toFixed(3)} m`,
    `  Relación y₂/y₁: ${result.depthRatio.toFixed(2)}`,
    '',
    '--- DISIPACIÓN DE ENERGÍA ---',
    `  Pérdida ΔE: ${result.energyLoss.toFixed(3)} m`,
    `  Pérdida relativa: ${result.energyLossPercent.toFixed(1)}%`,
    `  Eficiencia: ${result.efficiency.toFixed(1)}%`,
    `  Potencia disipada: ${result.powerDissipated.toFixed(1)} kW`,
    '',
    '--- GEOMETRÍA DEL SALTO ---',
    `  Longitud Lj: ${result.jumpLength.toFixed(2)} m`,
    `  Longitud del rodillo Lr: ${result.rollerLength.toFixed(2)} m`,
    `  Altura del salto: ${result.jumpHeight.toFixed(3)} m`,
    '',
    '--- RECOMENDACIONES ---',
    `  Cuenco recomendado: ${result.recommendedBasinType}`,
  ];

  if (result.recommendations.length > 0) {
    result.recommendations.forEach(r => lines.push(`  • ${r}`));
  }

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`  ⚠ ${w}`));
  }

  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Get jump type description in Spanish
 */
function getJumpTypeDescription(type: JumpType): string {
  switch (type) {
    case 'undular':
      return 'ONDULATORIO (Fr = 1.0-1.7) - Superficie ondulante, baja pérdida';
    case 'weak':
      return 'DÉBIL (Fr = 1.7-2.5) - Salto suave, transición gradual';
    case 'oscillating':
      return 'OSCILANTE (Fr = 2.5-4.5) - Inestable, jet oscilante';
    case 'steady':
      return 'ESTABLE (Fr = 4.5-9.0) - Bien definido, óptima disipación';
    case 'strong':
      return 'FUERTE (Fr > 9.0) - Turbulento, alta disipación';
    case 'no_jump':
      return 'SIN SALTO (Fr < 1.0) - Flujo subcrítico';
  }
}

/**
 * Format stilling basin design for display
 */
export function formatBasinDesign(basin: StillingBasinDesign): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '         DISEÑO DE CUENCO DISIPADOR',
    '═══════════════════════════════════════════════════════',
    '',
    `--- TIPO: ${basin.basinType} ---`,
    '',
    '--- DIMENSIONES PRINCIPALES ---',
    `  Longitud: ${basin.basinLength.toFixed(2)} m`,
    `  Ancho: ${basin.basinWidth.toFixed(2)} m`,
    `  Profundidad bajo aguas abajo: ${basin.basinDepth.toFixed(2)} m`,
    `  Elevación de solera: ${basin.apronElevation.toFixed(3)} m`,
    '',
    '--- NIVELES DE AGUA ---',
    `  Profundidad aguas abajo requerida: ${basin.tailwaterDepth.toFixed(3)} m`,
    `  Elevación aguas abajo: ${basin.tailwaterElevation.toFixed(3)} m`,
    `  Borde libre: ${basin.freeboard.toFixed(2)} m`,
    `  Altura de muros: ${basin.wallHeight.toFixed(2)} m`,
  ];

  if (basin.chuteBLocks.required) {
    lines.push(
      '',
      '--- BLOQUES DE CAÍDA ---',
      `  Altura h₁: ${basin.chuteBLocks.height.toFixed(3)} m`,
      `  Ancho w₁: ${basin.chuteBLocks.width.toFixed(3)} m`,
      `  Espaciamiento: ${basin.chuteBLocks.spacing.toFixed(3)} m`,
      `  Cantidad: ${basin.chuteBLocks.count}`
    );
  }

  if (basin.baffleBlocks.required) {
    lines.push(
      '',
      '--- BLOQUES DEFLECTORES ---',
      `  Altura h₂: ${basin.baffleBlocks.height.toFixed(3)} m`,
      `  Ancho w₂: ${basin.baffleBlocks.width.toFixed(3)} m`,
      `  Espaciamiento: ${basin.baffleBlocks.spacing.toFixed(3)} m`,
      `  Distancia desde bloques de caída: ${basin.baffleBlocks.distanceFromChute.toFixed(2)} m`,
      `  Cantidad: ${basin.baffleBlocks.count}`
    );
  }

  if (basin.endSillType !== 'none') {
    lines.push(
      '',
      '--- UMBRAL DE SALIDA ---',
      `  Tipo: ${basin.endSillType === 'dentated' ? 'Dentado' : 'Sólido'}`,
      `  Altura h₃: ${basin.endSillHeight.toFixed(3)} m`
    );
  }

  if (basin.recommendations.length > 0) {
    lines.push('', '--- RECOMENDACIONES ---');
    basin.recommendations.forEach(r => lines.push(`  • ${r}`));
  }

  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}
