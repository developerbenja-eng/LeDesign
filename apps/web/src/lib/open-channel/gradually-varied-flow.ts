/**
 * Gradually Varied Flow (GVF) Module - Water Surface Profile Calculations
 *
 * Implements both Standard Step and Direct Step methods for computing
 * water surface profiles in open channels. Supports HEC-RAS style analysis.
 *
 * Profile Classifications:
 * - M (Mild slope): M1, M2, M3
 * - S (Steep slope): S1, S2, S3
 * - C (Critical slope): C1, C3
 * - H (Horizontal slope): H2, H3
 * - A (Adverse slope): A2, A3
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
  calculatePrismaticTopWidth,
  calculatePrismaticHydraulicRadius,
  calculateIrregularGeometry,
  getMinimumElevation,
  getMaximumElevation,
  CrossSectionGeometry,
} from './channel-geometry';

import {
  FlowRegime,
  calculateManningFlowPrismatic,
  calculateCriticalDepthPrismatic,
  calculateNormalDepthPrismatic,
  calculateManningFlowIrregular,
  calculateCriticalWSEL,
  calculateNormalWSEL,
  calculateFroudeNumber,
  calculateConveyance,
  classifyFlowRegime,
  LOSS_COEFFICIENTS,
} from './channel-hydraulics';

// ============================================================================
// Types
// ============================================================================

export type SlopeClassification = 'mild' | 'steep' | 'critical' | 'horizontal' | 'adverse';

export type ProfileType =
  | 'M1' | 'M2' | 'M3'  // Mild slope profiles
  | 'S1' | 'S2' | 'S3'  // Steep slope profiles
  | 'C1' | 'C3'          // Critical slope profiles (C2 is uniform flow line)
  | 'H2' | 'H3'          // Horizontal slope profiles
  | 'A2' | 'A3';         // Adverse slope profiles

export type ComputationDirection = 'upstream' | 'downstream';

export type FrictionSlopeMethod = 'average' | 'geometric' | 'harmonic';

export interface BoundaryCondition {
  type: 'known_wsel' | 'normal_depth' | 'critical_depth' | 'rating_curve' | 'gate';
  value?: number;  // Water surface elevation or depth
  ratingCurve?: { flow: number; wsel: number }[];
  gateOpening?: number;
  gateCoefficient?: number;
}

/**
 * Point along water surface profile
 */
export interface ProfilePoint {
  // Location
  station: number;  // Distance along reach (river station)

  // Water levels
  waterSurfaceElevation: number;  // WSEL (m)
  energyGradeElevation: number;   // EGL (m)
  channelBottomElevation: number; // Invert (m)

  // Depths
  flowDepth: number;        // y (m)
  criticalDepth: number;    // yc (m)
  normalDepth?: number;     // yn (m) - only if slope > 0

  // Hydraulics
  flow: number;              // Q (m³/s)
  totalArea: number;         // A (m²)
  averageVelocity: number;   // V (m/s)
  velocityHead: number;      // V²/2g (m)
  froudeNumber: number;      // Fr
  flowRegime: FlowRegime;

  // Energy terms
  specificEnergy: number;    // E (m)
  frictionSlope: number;     // Sf
  energySlope: number;       // Se (including losses)

  // Losses to next section
  frictionLoss: number;      // hf (m)
  contractionLoss: number;   // hc (m)
  expansionLoss: number;     // he (m)
  totalHeadLoss: number;     // hL (m)

  // Profile classification
  profileType?: ProfileType;

  // Zone-specific data (for irregular sections)
  zones?: {
    leftOverbank: { area: number; conveyance: number; velocity: number; percentFlow: number };
    mainChannel: { area: number; conveyance: number; velocity: number; percentFlow: number };
    rightOverbank: { area: number; conveyance: number; velocity: number; percentFlow: number };
  };

  // Computation info
  iterations?: number;
  warnings: string[];
}

/**
 * Complete water surface profile result
 */
export interface WaterSurfaceProfile {
  profilePoints: ProfilePoint[];
  profileName?: string;

  // Overall classification
  slopeClassification: SlopeClassification;
  flowRegime: FlowRegime;
  profileType?: ProfileType;

  // Computation info
  computationDirection: ComputationDirection;
  boundaryCondition: BoundaryCondition;
  totalReachLength: number;
  averageSlope: number;

  // Control points
  controlSection?: number;  // Station of flow control
  hasHydraulicJump: boolean;
  jumpLocation?: number;

  // Convergence
  converged: boolean;
  totalIterations: number;
  maxBalanceError: number;

  warnings: string[];
}

/**
 * Direct Step result for prismatic channels
 */
export interface DirectStepResult {
  depths: number[];
  distances: number[];
  velocities: number[];
  froudeNumbers: number[];
  specificEnergies: number[];
  profileTypes: ProfileType[];
  totalLength: number;
  converged: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const GRAVITY = 9.81;  // m/s²

const DEFAULT_TOLERANCES = {
  wsel: 0.001,           // Water surface elevation tolerance (m)
  energy: 0.001,         // Energy balance tolerance (m)
  depth: 0.0001,         // Depth tolerance (m)
};

const MAX_ITERATIONS = {
  standardStep: 50,      // Per section
  profile: 100,          // Full profile
  bisection: 100,
};

// ============================================================================
// Slope and Profile Classification Functions
// ============================================================================

/**
 * Classify channel slope based on normal and critical depth
 */
export function classifyChannelSlope(
  normalDepth: number,
  criticalDepth: number,
  slope: number
): SlopeClassification {
  if (slope < 0) return 'adverse';
  if (slope === 0 || !isFinite(normalDepth)) return 'horizontal';

  const ratio = normalDepth / criticalDepth;

  if (Math.abs(ratio - 1) < 0.02) return 'critical';
  if (ratio > 1) return 'mild';
  return 'steep';
}

/**
 * Determine specific profile type based on slope classification and depth relationships
 */
export function classifyProfileType(
  slopeClass: SlopeClassification,
  depth: number,
  normalDepth: number,
  criticalDepth: number
): ProfileType | undefined {
  const yn = normalDepth;
  const yc = criticalDepth;

  switch (slopeClass) {
    case 'mild':
      if (depth > yn) return 'M1';
      if (depth < yn && depth > yc) return 'M2';
      if (depth < yc) return 'M3';
      break;

    case 'steep':
      if (depth > yc) return 'S1';
      if (depth < yc && depth > yn) return 'S2';
      if (depth < yn) return 'S3';
      break;

    case 'critical':
      if (depth > yc) return 'C1';
      if (depth < yc) return 'C3';
      break;

    case 'horizontal':
      if (depth > yc) return 'H2';
      if (depth < yc) return 'H3';
      break;

    case 'adverse':
      if (depth > yc) return 'A2';
      if (depth < yc) return 'A3';
      break;
  }

  return undefined;
}

/**
 * Determine computation direction based on flow regime and profile type
 *
 * Subcritical flow: Compute upstream from control
 * Supercritical flow: Compute downstream from control
 */
export function determineComputationDirection(flowRegime: FlowRegime): ComputationDirection {
  return flowRegime === 'supercritical' ? 'downstream' : 'upstream';
}

/**
 * Get profile characteristics (whether depth increases or decreases)
 */
export function getProfileCharacteristics(profileType: ProfileType): {
  depthTrend: 'increasing' | 'decreasing';
  approachesNormal: boolean;
  approachesCritical: boolean;
} {
  const profiles: Record<ProfileType, { depthTrend: 'increasing' | 'decreasing'; approachesNormal: boolean; approachesCritical: boolean }> = {
    'M1': { depthTrend: 'decreasing', approachesNormal: true, approachesCritical: false },
    'M2': { depthTrend: 'decreasing', approachesNormal: false, approachesCritical: true },
    'M3': { depthTrend: 'increasing', approachesNormal: false, approachesCritical: true },
    'S1': { depthTrend: 'decreasing', approachesNormal: false, approachesCritical: true },
    'S2': { depthTrend: 'increasing', approachesNormal: false, approachesCritical: true },
    'S3': { depthTrend: 'increasing', approachesNormal: true, approachesCritical: false },
    'C1': { depthTrend: 'decreasing', approachesNormal: false, approachesCritical: true },
    'C3': { depthTrend: 'increasing', approachesNormal: false, approachesCritical: true },
    'H2': { depthTrend: 'decreasing', approachesNormal: false, approachesCritical: true },
    'H3': { depthTrend: 'increasing', approachesNormal: false, approachesCritical: true },
    'A2': { depthTrend: 'decreasing', approachesNormal: false, approachesCritical: true },
    'A3': { depthTrend: 'increasing', approachesNormal: false, approachesCritical: true },
  };

  return profiles[profileType];
}

// ============================================================================
// Friction Slope Calculations
// ============================================================================

/**
 * Calculate friction slope from conveyance
 * Sf = (Q/K)²
 */
export function calculateFrictionSlope(flow: number, conveyance: number): number {
  if (conveyance <= 0) return 0;
  return Math.pow(flow / conveyance, 2);
}

/**
 * Calculate friction slope for prismatic channel at given depth
 */
export function calculateFrictionSlopePrismatic(
  section: PrismaticSection,
  depth: number,
  flow: number,
  manningsN: number
): number {
  const A = calculatePrismaticArea(section, depth);
  const R = calculatePrismaticHydraulicRadius(section, depth);

  if (A <= 0 || R <= 0) return 0;

  const K = calculateConveyance(A, R, manningsN);
  return calculateFrictionSlope(flow, K);
}

/**
 * Calculate friction slope for irregular section
 */
export function calculateFrictionSlopeIrregular(
  section: IrregularCrossSection,
  wsel: number,
  flow: number
): number {
  const geom = calculateIrregularGeometry(section, wsel);
  return calculateFrictionSlope(flow, geom.totalConveyance);
}

/**
 * Calculate average friction slope between two sections
 */
export function calculateAverageFrictionSlope(
  Sf1: number,
  Sf2: number,
  method: FrictionSlopeMethod = 'average'
): number {
  switch (method) {
    case 'average':
      return (Sf1 + Sf2) / 2;

    case 'geometric':
      return Math.sqrt(Sf1 * Sf2);

    case 'harmonic':
      if (Sf1 + Sf2 === 0) return 0;
      return (2 * Sf1 * Sf2) / (Sf1 + Sf2);

    default:
      return (Sf1 + Sf2) / 2;
  }
}

// ============================================================================
// Standard Step Method - Irregular Sections
// ============================================================================

/**
 * Compute water surface profile using Standard Step Method
 *
 * Energy equation between sections:
 * WSEL2 + α2V2²/2g = WSEL1 + α1V1²/2g + hL
 *
 * Where hL = hf + he (friction + eddy losses)
 */
export function computeStandardStep(
  sections: IrregularCrossSection[],
  flow: number,
  boundary: BoundaryCondition,
  direction?: ComputationDirection,
  options: {
    frictionMethod?: FrictionSlopeMethod;
    tolerance?: number;
    maxIterations?: number;
  } = {}
): WaterSurfaceProfile {
  const warnings: string[] = [];
  const frictionMethod = options.frictionMethod ?? 'average';
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCES.wsel;
  const maxIterations = options.maxIterations ?? MAX_ITERATIONS.standardStep;

  // Sort sections by river station
  const sortedSections = [...sections].sort((a, b) => a.riverStation - b.riverStation);

  if (sortedSections.length < 2) {
    return {
      profilePoints: [],
      slopeClassification: 'mild',
      flowRegime: 'subcritical',
      computationDirection: direction ?? 'upstream',
      boundaryCondition: boundary,
      totalReachLength: 0,
      averageSlope: 0,
      hasHydraulicJump: false,
      converged: false,
      totalIterations: 0,
      maxBalanceError: 0,
      warnings: ['Need at least 2 cross-sections'],
    };
  }

  // Calculate average slope for classification
  const firstSection = sortedSections[0];
  const lastSection = sortedSections[sortedSections.length - 1];
  const totalLength = lastSection.riverStation - firstSection.riverStation;
  const elevDiff = getMinimumElevation(firstSection) - getMinimumElevation(lastSection);
  const avgSlope = totalLength > 0 ? elevDiff / totalLength : 0;

  // Determine critical and normal WSELs at first section
  const criticalWSEL = calculateCriticalWSEL(firstSection, flow);
  const criticalDepth = criticalWSEL - getMinimumElevation(firstSection);
  let normalDepth = Infinity;

  if (avgSlope > 0) {
    const normalWSEL = calculateNormalWSEL(firstSection, flow, avgSlope);
    normalDepth = normalWSEL - getMinimumElevation(firstSection);
  }

  // Classify slope
  const slopeClass = classifyChannelSlope(normalDepth, criticalDepth, avgSlope);

  // Determine starting WSEL from boundary condition
  let startWSEL: number;
  switch (boundary.type) {
    case 'known_wsel':
      startWSEL = boundary.value ?? getMinimumElevation(lastSection) + criticalDepth;
      break;
    case 'normal_depth':
      startWSEL = calculateNormalWSEL(lastSection, flow, avgSlope);
      break;
    case 'critical_depth':
      startWSEL = calculateCriticalWSEL(lastSection, flow);
      break;
    case 'rating_curve':
      startWSEL = interpolateRatingCurve(boundary.ratingCurve ?? [], flow);
      break;
    default:
      startWSEL = calculateCriticalWSEL(lastSection, flow);
  }

  // Determine flow regime from boundary
  const geomStart = calculateIrregularGeometry(lastSection, startWSEL);
  const vStart = geomStart.totalArea > 0 ? flow / geomStart.totalArea : 0;
  const dStart = geomStart.totalTopWidth > 0 ? geomStart.totalArea / geomStart.totalTopWidth : 0;
  const frStart = calculateFroudeNumber(vStart, dStart);
  const flowRegime = classifyFlowRegime(frStart);

  // Set computation direction
  const computeDirection = direction ?? determineComputationDirection(flowRegime);

  // Order sections for computation
  const orderedSections = computeDirection === 'upstream'
    ? [...sortedSections].reverse()  // Start from downstream
    : sortedSections;                 // Start from upstream

  // Initialize results
  const profilePoints: ProfilePoint[] = [];
  let currentWSEL = startWSEL;
  let totalIterations = 0;
  let maxBalanceError = 0;
  let converged = true;
  let hasHydraulicJump = false;
  let jumpLocation: number | undefined;

  // Compute water surface at each section
  for (let i = 0; i < orderedSections.length; i++) {
    const section = orderedSections[i];
    let wsel = currentWSEL;

    if (i > 0) {
      // Solve energy equation for WSEL at this section
      const prevSection = orderedSections[i - 1];
      const prevPoint = profilePoints[profilePoints.length - 1];

      const result = solveEnergyEquation(
        prevSection,
        section,
        prevPoint.waterSurfaceElevation,
        flow,
        computeDirection,
        {
          frictionMethod,
          tolerance,
          maxIterations,
        }
      );

      wsel = result.wsel;
      totalIterations += result.iterations;
      maxBalanceError = Math.max(maxBalanceError, result.error);

      if (!result.converged) {
        converged = false;
        warnings.push(`Section ${section.id}: Did not converge (error=${result.error.toFixed(4)}m)`);
      }

      // Check for supercritical to subcritical transition (hydraulic jump)
      const prevFr = prevPoint.froudeNumber;
      const geom = calculateIrregularGeometry(section, wsel);
      const V = geom.totalArea > 0 ? flow / geom.totalArea : 0;
      const D = geom.totalTopWidth > 0 ? geom.totalArea / geom.totalTopWidth : 0;
      const currentFr = calculateFroudeNumber(V, D);

      if (prevFr > 1 && currentFr < 1) {
        hasHydraulicJump = true;
        jumpLocation = (prevSection.riverStation + section.riverStation) / 2;
        warnings.push(`Hydraulic jump detected near station ${jumpLocation.toFixed(1)}`);
      }
    }

    // Calculate point properties
    const point = calculateProfilePoint(section, wsel, flow, avgSlope);
    profilePoints.push(point);

    currentWSEL = wsel;
  }

  // Calculate losses between points
  for (let i = 0; i < profilePoints.length - 1; i++) {
    const pt1 = profilePoints[i];
    const pt2 = profilePoints[i + 1];
    const xs1 = orderedSections[i];
    const xs2 = orderedSections[i + 1];

    const losses = calculateTransitionLosses(
      xs1, xs2, pt1, pt2, flow, frictionMethod
    );

    pt1.frictionLoss = losses.frictionLoss;
    pt1.contractionLoss = losses.contractionLoss;
    pt1.expansionLoss = losses.expansionLoss;
    pt1.totalHeadLoss = losses.totalLoss;
  }

  // Reverse points if computed upstream (to maintain downstream order)
  if (computeDirection === 'upstream') {
    profilePoints.reverse();
  }

  // Classify profile type
  const middlePoint = profilePoints[Math.floor(profilePoints.length / 2)];
  const profileType = classifyProfileType(
    slopeClass,
    middlePoint.flowDepth,
    normalDepth,
    criticalDepth
  );

  return {
    profilePoints,
    slopeClassification: slopeClass,
    flowRegime,
    profileType,
    computationDirection: computeDirection,
    boundaryCondition: boundary,
    totalReachLength: totalLength,
    averageSlope: avgSlope,
    hasHydraulicJump,
    jumpLocation,
    converged,
    totalIterations,
    maxBalanceError,
    warnings,
  };
}

/**
 * Solve energy equation between two cross-sections
 *
 * WS2 + α2V2²/2g = WS1 + α1V1²/2g + hf + hc + he
 */
function solveEnergyEquation(
  section1: IrregularCrossSection,
  section2: IrregularCrossSection,
  wsel1: number,
  flow: number,
  direction: ComputationDirection,
  options: {
    frictionMethod: FrictionSlopeMethod;
    tolerance: number;
    maxIterations: number;
  }
): { wsel: number; error: number; converged: boolean; iterations: number } {
  // Calculate energy at section 1
  const geom1 = calculateIrregularGeometry(section1, wsel1);
  const V1 = geom1.totalArea > 0 ? flow / geom1.totalArea : 0;
  const alpha1 = geom1.alphaCoefficient;
  const Sf1 = calculateFrictionSlope(flow, geom1.totalConveyance);

  // Reach length (using average of zone lengths)
  const reachLength = direction === 'upstream'
    ? (section1.reachLengths.mainChannel +
       section1.reachLengths.leftOverbank +
       section1.reachLengths.rightOverbank) / 3
    : (section2.reachLengths.mainChannel +
       section2.reachLengths.leftOverbank +
       section2.reachLengths.rightOverbank) / 3;

  // Initial guess for wsel2
  const minElev2 = getMinimumElevation(section2);
  const minElev1 = getMinimumElevation(section1);
  const bedSlope = (minElev1 - minElev2) / reachLength;

  let wsel2 = wsel1 + bedSlope * reachLength;  // Rough estimate
  wsel2 = Math.max(wsel2, minElev2 + 0.01);    // Ensure minimum depth

  let error = Infinity;
  let iterations = 0;

  // Newton-Raphson iteration
  for (let i = 0; i < options.maxIterations; i++) {
    iterations++;

    const geom2 = calculateIrregularGeometry(section2, wsel2);

    if (geom2.totalArea <= 0) {
      wsel2 = minElev2 + 0.1;
      continue;
    }

    const V2 = flow / geom2.totalArea;
    const alpha2 = geom2.alphaCoefficient;
    const Sf2 = calculateFrictionSlope(flow, geom2.totalConveyance);

    // Average friction slope
    const SfAvg = calculateAverageFrictionSlope(Sf1, Sf2, options.frictionMethod);

    // Friction loss
    const hf = SfAvg * reachLength;

    // Contraction/expansion loss
    const vh1 = alpha1 * V1 * V1 / (2 * GRAVITY);
    const vh2 = alpha2 * V2 * V2 / (2 * GRAVITY);
    const dVh = vh2 - vh1;

    let hce = 0;
    if (dVh < 0) {
      // Expansion (velocity decreasing)
      const Ce = section2.expansionCoeff ?? LOSS_COEFFICIENTS.expansion.typical;
      hce = Ce * Math.abs(dVh);
    } else {
      // Contraction (velocity increasing)
      const Cc = section2.contractionCoeff ?? LOSS_COEFFICIENTS.contraction.typical;
      hce = Cc * dVh;
    }

    // Energy balance
    const E1 = wsel1 + vh1;
    const E2 = wsel2 + vh2;
    const expectedE2 = direction === 'upstream'
      ? E1 + hf + hce  // Going upstream, energy increases
      : E1 - hf - hce; // Going downstream, energy decreases

    error = Math.abs(E2 - expectedE2);

    if (error < options.tolerance) {
      return { wsel: wsel2, error, converged: true, iterations };
    }

    // Update wsel2
    const dE_dWS = 1 - alpha2 * V2 * (-flow / (geom2.totalArea * geom2.totalArea)) *
                  (geom2.totalTopWidth / GRAVITY);

    if (Math.abs(dE_dWS) > 0.001) {
      const correction = (expectedE2 - E2) / dE_dWS;
      wsel2 += correction;
      wsel2 = Math.max(wsel2, minElev2 + 0.001);
    } else {
      // Simple adjustment
      wsel2 += (expectedE2 - E2) * 0.5;
      wsel2 = Math.max(wsel2, minElev2 + 0.001);
    }

    // Prevent extreme values
    const maxElev2 = getMaximumElevation(section2);
    wsel2 = Math.min(wsel2, maxElev2 - 0.01);
  }

  // Bisection fallback
  return solveEnergyBisection(section1, section2, wsel1, flow, direction, options);
}

/**
 * Bisection fallback for energy equation
 */
function solveEnergyBisection(
  section1: IrregularCrossSection,
  section2: IrregularCrossSection,
  wsel1: number,
  flow: number,
  direction: ComputationDirection,
  options: { frictionMethod: FrictionSlopeMethod; tolerance: number; maxIterations: number }
): { wsel: number; error: number; converged: boolean; iterations: number } {
  const minElev2 = getMinimumElevation(section2);
  const maxElev2 = getMaximumElevation(section2);

  let wselLow = minElev2 + 0.001;
  let wselHigh = maxElev2 - 0.001;
  let iterations = 0;

  const reachLength = (section2.reachLengths.mainChannel +
                       section2.reachLengths.leftOverbank +
                       section2.reachLengths.rightOverbank) / 3;

  const geom1 = calculateIrregularGeometry(section1, wsel1);
  const V1 = geom1.totalArea > 0 ? flow / geom1.totalArea : 0;
  const alpha1 = geom1.alphaCoefficient;
  const Sf1 = calculateFrictionSlope(flow, geom1.totalConveyance);
  const vh1 = alpha1 * V1 * V1 / (2 * GRAVITY);
  const E1 = wsel1 + vh1;

  let bestWsel = (wselLow + wselHigh) / 2;
  let bestError = Infinity;

  for (let i = 0; i < options.maxIterations; i++) {
    iterations++;
    const wselMid = (wselLow + wselHigh) / 2;

    const geom2 = calculateIrregularGeometry(section2, wselMid);
    if (geom2.totalArea <= 0) {
      wselLow = wselMid;
      continue;
    }

    const V2 = flow / geom2.totalArea;
    const alpha2 = geom2.alphaCoefficient;
    const Sf2 = calculateFrictionSlope(flow, geom2.totalConveyance);
    const vh2 = alpha2 * V2 * V2 / (2 * GRAVITY);
    const E2 = wselMid + vh2;

    const SfAvg = calculateAverageFrictionSlope(Sf1, Sf2, options.frictionMethod);
    const hf = SfAvg * reachLength;

    const dVh = vh2 - vh1;
    const Ce = section2.expansionCoeff ?? LOSS_COEFFICIENTS.expansion.typical;
    const Cc = section2.contractionCoeff ?? LOSS_COEFFICIENTS.contraction.typical;
    const hce = dVh < 0 ? Ce * Math.abs(dVh) : Cc * dVh;

    const expectedE2 = direction === 'upstream' ? E1 + hf + hce : E1 - hf - hce;
    const error = Math.abs(E2 - expectedE2);

    if (error < bestError) {
      bestError = error;
      bestWsel = wselMid;
    }

    if (error < options.tolerance) {
      return { wsel: wselMid, error, converged: true, iterations };
    }

    if (E2 < expectedE2) {
      wselLow = wselMid;
    } else {
      wselHigh = wselMid;
    }
  }

  return { wsel: bestWsel, error: bestError, converged: false, iterations };
}

/**
 * Calculate transition losses between two sections
 */
function calculateTransitionLosses(
  xs1: IrregularCrossSection,
  xs2: IrregularCrossSection,
  pt1: ProfilePoint,
  pt2: ProfilePoint,
  flow: number,
  frictionMethod: FrictionSlopeMethod
): { frictionLoss: number; contractionLoss: number; expansionLoss: number; totalLoss: number } {
  // Reach length
  const reachLength = (xs1.reachLengths.mainChannel +
                       xs1.reachLengths.leftOverbank +
                       xs1.reachLengths.rightOverbank) / 3;

  // Friction loss
  const SfAvg = calculateAverageFrictionSlope(pt1.frictionSlope, pt2.frictionSlope, frictionMethod);
  const frictionLoss = SfAvg * reachLength;

  // Velocity head difference
  const dVh = pt2.velocityHead - pt1.velocityHead;

  // Contraction/expansion loss
  let contractionLoss = 0;
  let expansionLoss = 0;

  if (dVh < 0) {
    // Expansion
    const Ce = xs2.expansionCoeff ?? LOSS_COEFFICIENTS.expansion.typical;
    expansionLoss = Ce * Math.abs(dVh);
  } else {
    // Contraction
    const Cc = xs2.contractionCoeff ?? LOSS_COEFFICIENTS.contraction.typical;
    contractionLoss = Cc * dVh;
  }

  const totalLoss = frictionLoss + contractionLoss + expansionLoss;

  return { frictionLoss, contractionLoss, expansionLoss, totalLoss };
}

/**
 * Calculate profile point properties
 */
function calculateProfilePoint(
  section: IrregularCrossSection,
  wsel: number,
  flow: number,
  slope: number
): ProfilePoint {
  const warnings: string[] = [];
  const minElev = getMinimumElevation(section);
  const geom = calculateIrregularGeometry(section, wsel);

  const depth = wsel - minElev;
  const V = geom.totalArea > 0 ? flow / geom.totalArea : 0;
  const D = geom.totalTopWidth > 0 ? geom.totalArea / geom.totalTopWidth : depth;
  const Fr = calculateFroudeNumber(V, D);
  const flowRegime = classifyFlowRegime(Fr);

  const alpha = geom.alphaCoefficient;
  const velocityHead = alpha * V * V / (2 * GRAVITY);
  const energyGrade = wsel + velocityHead;
  const specificEnergy = depth + velocityHead;

  const Sf = calculateFrictionSlope(flow, geom.totalConveyance);

  // Calculate critical and normal depths
  const criticalWSEL = calculateCriticalWSEL(section, flow);
  const criticalDepth = criticalWSEL - minElev;

  let normalDepth: number | undefined;
  if (slope > 0) {
    const normalWSEL = calculateNormalWSEL(section, flow, slope);
    normalDepth = normalWSEL - minElev;
  }

  // Zone data
  const totalK = geom.totalConveyance;
  const zones = {
    leftOverbank: {
      area: geom.zones.leftOverbank.area,
      conveyance: geom.zones.leftOverbank.conveyance,
      velocity: geom.zones.leftOverbank.area > 0
        ? (geom.zones.leftOverbank.conveyance / totalK) * flow / geom.zones.leftOverbank.area
        : 0,
      percentFlow: totalK > 0 ? (geom.zones.leftOverbank.conveyance / totalK) * 100 : 0,
    },
    mainChannel: {
      area: geom.zones.mainChannel.area,
      conveyance: geom.zones.mainChannel.conveyance,
      velocity: geom.zones.mainChannel.area > 0
        ? (geom.zones.mainChannel.conveyance / totalK) * flow / geom.zones.mainChannel.area
        : 0,
      percentFlow: totalK > 0 ? (geom.zones.mainChannel.conveyance / totalK) * 100 : 0,
    },
    rightOverbank: {
      area: geom.zones.rightOverbank.area,
      conveyance: geom.zones.rightOverbank.conveyance,
      velocity: geom.zones.rightOverbank.area > 0
        ? (geom.zones.rightOverbank.conveyance / totalK) * flow / geom.zones.rightOverbank.area
        : 0,
      percentFlow: totalK > 0 ? (geom.zones.rightOverbank.conveyance / totalK) * 100 : 0,
    },
  };

  // Warnings
  if (V < 0.3) {
    warnings.push('Low velocity - sedimentation risk');
  }
  if (V > 4.0) {
    warnings.push('High velocity - erosion risk');
  }
  if (Fr > 0.86 && Fr < 1.13) {
    warnings.push('Near critical flow - unstable');
  }

  return {
    station: section.riverStation,
    waterSurfaceElevation: wsel,
    energyGradeElevation: energyGrade,
    channelBottomElevation: minElev,
    flowDepth: depth,
    criticalDepth,
    normalDepth,
    flow,
    totalArea: geom.totalArea,
    averageVelocity: V,
    velocityHead,
    froudeNumber: Fr,
    flowRegime,
    specificEnergy,
    frictionSlope: Sf,
    energySlope: Sf,  // Will be updated with losses
    frictionLoss: 0,
    contractionLoss: 0,
    expansionLoss: 0,
    totalHeadLoss: 0,
    zones,
    warnings,
  };
}

/**
 * Interpolate rating curve to get WSEL for given flow
 */
function interpolateRatingCurve(
  curve: { flow: number; wsel: number }[],
  flow: number
): number {
  if (curve.length === 0) return 0;
  if (curve.length === 1) return curve[0].wsel;

  const sorted = [...curve].sort((a, b) => a.flow - b.flow);

  if (flow <= sorted[0].flow) return sorted[0].wsel;
  if (flow >= sorted[sorted.length - 1].flow) return sorted[sorted.length - 1].wsel;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (flow >= sorted[i].flow && flow <= sorted[i + 1].flow) {
      const t = (flow - sorted[i].flow) / (sorted[i + 1].flow - sorted[i].flow);
      return sorted[i].wsel + t * (sorted[i + 1].wsel - sorted[i].wsel);
    }
  }

  return sorted[0].wsel;
}

// ============================================================================
// Direct Step Method - Prismatic Channels
// ============================================================================

/**
 * Compute water surface profile using Direct Step Method
 *
 * For prismatic channels with uniform cross-section.
 * Directly calculates distance Δx for a given depth change Δy.
 *
 * Δx = (E2 - E1) / (S0 - Sf_avg)
 */
export function computeDirectStep(
  section: PrismaticSection,
  startDepth: number,
  endDepth: number,
  flow: number,
  slope: number,
  manningsN: number,
  options: {
    numSteps?: number;
    frictionMethod?: FrictionSlopeMethod;
  } = {}
): DirectStepResult {
  const numSteps = options.numSteps ?? 50;
  const frictionMethod = options.frictionMethod ?? 'average';

  // Calculate critical and normal depths
  const yc = calculateCriticalDepthPrismatic(section, flow);
  const yn = slope > 0 ? calculateNormalDepthPrismatic(section, flow, slope, manningsN) : Infinity;

  // Classify slope
  const slopeClass = classifyChannelSlope(yn, yc, slope);

  // Determine if depths are valid for profile computation
  const depths: number[] = [];
  const distances: number[] = [];
  const velocities: number[] = [];
  const froudeNumbers: number[] = [];
  const specificEnergies: number[] = [];
  const profileTypes: ProfileType[] = [];

  // Create depth array (linear spacing between start and end)
  const dY = (endDepth - startDepth) / numSteps;

  let cumulativeDistance = 0;
  let prevDepth = startDepth;

  for (let i = 0; i <= numSteps; i++) {
    const y = startDepth + i * dY;

    // Calculate properties at this depth
    const A = calculatePrismaticArea(section, y);
    const T = calculatePrismaticTopWidth(section, y);
    const R = calculatePrismaticHydraulicRadius(section, y);

    if (A <= 0 || R <= 0) continue;

    const V = flow / A;
    const D = A / T;
    const Fr = calculateFroudeNumber(V, D);
    const E = y + V * V / (2 * GRAVITY);

    // Calculate Sf at this depth
    const K = calculateConveyance(A, R, manningsN);
    const Sf = calculateFrictionSlope(flow, K);

    // Classify profile type
    const profileType = classifyProfileType(slopeClass, y, yn, yc);

    if (i > 0 && profileType) {
      // Calculate distance step using direct step formula
      const prevA = calculatePrismaticArea(section, prevDepth);
      const prevT = calculatePrismaticTopWidth(section, prevDepth);
      const prevR = calculatePrismaticHydraulicRadius(section, prevDepth);
      const prevV = prevA > 0 ? flow / prevA : 0;
      const prevE = prevDepth + prevV * prevV / (2 * GRAVITY);
      const prevK = calculateConveyance(prevA, prevR, manningsN);
      const prevSf = calculateFrictionSlope(flow, prevK);

      const SfAvg = calculateAverageFrictionSlope(prevSf, Sf, frictionMethod);

      // Δx = (E2 - E1) / (S0 - Sf_avg)
      const denominator = slope - SfAvg;

      if (Math.abs(denominator) > 1e-10) {
        const dx = (E - prevE) / denominator;

        // Only add valid steps (positive distance in flow direction)
        if (isFinite(dx) && Math.abs(dx) < 10000) {
          cumulativeDistance += Math.abs(dx);
        }
      }
    }

    depths.push(y);
    distances.push(cumulativeDistance);
    velocities.push(V);
    froudeNumbers.push(Fr);
    specificEnergies.push(E);
    if (profileType) profileTypes.push(profileType);

    prevDepth = y;
  }

  return {
    depths,
    distances,
    velocities,
    froudeNumbers,
    specificEnergies,
    profileTypes,
    totalLength: cumulativeDistance,
    converged: true,
  };
}

/**
 * Calculate GVF profile for prismatic channel with automatic direction
 */
export function computePrismaticProfile(
  section: PrismaticSection,
  flow: number,
  slope: number,
  manningsN: number,
  boundary: BoundaryCondition,
  reachLength: number,
  options: {
    numSections?: number;
    tolerance?: number;
  } = {}
): WaterSurfaceProfile {
  const numSections = options.numSections ?? 20;
  const warnings: string[] = [];

  // Calculate critical and normal depths
  const yc = calculateCriticalDepthPrismatic(section, flow);
  const yn = slope > 0 ? calculateNormalDepthPrismatic(section, flow, slope, manningsN) : Infinity;

  // Classify slope
  const slopeClass = classifyChannelSlope(yn, yc, slope);

  // Determine starting depth from boundary condition
  let startDepth: number;
  switch (boundary.type) {
    case 'known_wsel':
      startDepth = boundary.value ?? yn;
      break;
    case 'normal_depth':
      startDepth = yn;
      break;
    case 'critical_depth':
      startDepth = yc;
      break;
    default:
      startDepth = yn;
  }

  // Determine flow regime
  const A = calculatePrismaticArea(section, startDepth);
  const T = calculatePrismaticTopWidth(section, startDepth);
  const V = A > 0 ? flow / A : 0;
  const D = T > 0 ? A / T : startDepth;
  const Fr = calculateFroudeNumber(V, D);
  const flowRegime = classifyFlowRegime(Fr);

  // Determine computation direction
  const direction = determineComputationDirection(flowRegime);

  // Determine end depth (approaches normal or critical)
  const profileType = classifyProfileType(slopeClass, startDepth, yn, yc);
  const characteristics = profileType ? getProfileCharacteristics(profileType) : null;

  let endDepth: number;
  if (characteristics?.approachesNormal && isFinite(yn)) {
    endDepth = yn * (startDepth > yn ? 1.01 : 0.99);
  } else if (characteristics?.approachesCritical) {
    endDepth = yc * (startDepth > yc ? 1.05 : 0.95);
  } else {
    endDepth = startDepth * (characteristics?.depthTrend === 'increasing' ? 2.0 : 0.5);
  }

  // Compute profile using direct step
  const directResult = computeDirectStep(
    section,
    startDepth,
    endDepth,
    flow,
    slope,
    manningsN,
    { numSteps: numSections }
  );

  // Convert to profile points
  const profilePoints: ProfilePoint[] = directResult.depths.map((depth, i) => {
    const A = calculatePrismaticArea(section, depth);
    const T = calculatePrismaticTopWidth(section, depth);
    const R = calculatePrismaticHydraulicRadius(section, depth);
    const V = A > 0 ? flow / A : 0;
    const D = T > 0 ? A / T : depth;
    const Fr = calculateFroudeNumber(V, D);

    const vh = V * V / (2 * GRAVITY);
    const K = calculateConveyance(A, R, manningsN);
    const Sf = calculateFrictionSlope(flow, K);

    return {
      station: directResult.distances[i],
      waterSurfaceElevation: depth, // Using depth as WSEL for prismatic
      energyGradeElevation: depth + vh,
      channelBottomElevation: 0,
      flowDepth: depth,
      criticalDepth: yc,
      normalDepth: yn,
      flow,
      totalArea: A,
      averageVelocity: V,
      velocityHead: vh,
      froudeNumber: Fr,
      flowRegime: classifyFlowRegime(Fr),
      specificEnergy: directResult.specificEnergies[i],
      frictionSlope: Sf,
      energySlope: Sf,
      frictionLoss: 0,
      contractionLoss: 0,
      expansionLoss: 0,
      totalHeadLoss: 0,
      profileType: directResult.profileTypes[i],
      warnings: [],
    };
  });

  return {
    profilePoints,
    slopeClassification: slopeClass,
    flowRegime,
    profileType,
    computationDirection: direction,
    boundaryCondition: boundary,
    totalReachLength: directResult.totalLength,
    averageSlope: slope,
    hasHydraulicJump: false,
    converged: directResult.converged,
    totalIterations: 0,
    maxBalanceError: 0,
    warnings,
  };
}

// ============================================================================
// Mixed Flow Regime
// ============================================================================

/**
 * Find control section where flow transitions from subcritical to supercritical
 */
export function findControlSection(
  sections: IrregularCrossSection[],
  flow: number,
  slope: number
): { station: number; type: 'critical' | 'normal'; wsel: number } | null {
  for (const section of sections) {
    const criticalWSEL = calculateCriticalWSEL(section, flow);
    const normalWSEL = slope > 0 ? calculateNormalWSEL(section, flow, slope) : Infinity;

    const criticalDepth = criticalWSEL - getMinimumElevation(section);
    const normalDepth = normalWSEL - getMinimumElevation(section);

    // Control exists where normal depth equals critical depth
    if (Math.abs(normalDepth - criticalDepth) / criticalDepth < 0.05) {
      return {
        station: section.riverStation,
        type: 'critical',
        wsel: criticalWSEL,
      };
    }
  }

  return null;
}

/**
 * Compute mixed flow profile with hydraulic jump
 */
export function computeMixedFlowProfile(
  sections: IrregularCrossSection[],
  flow: number,
  upstreamBoundary: BoundaryCondition,
  downstreamBoundary: BoundaryCondition,
  options: {
    frictionMethod?: FrictionSlopeMethod;
    tolerance?: number;
  } = {}
): WaterSurfaceProfile {
  // Compute subcritical profile from downstream
  const subcriticalProfile = computeStandardStep(
    sections,
    flow,
    downstreamBoundary,
    'upstream',
    options
  );

  // Compute supercritical profile from upstream
  const supercriticalProfile = computeStandardStep(
    sections,
    flow,
    upstreamBoundary,
    'downstream',
    options
  );

  // Find intersection point (hydraulic jump location)
  let jumpLocation: number | undefined;
  let jumpUpstreamDepth: number | undefined;
  let jumpDownstreamDepth: number | undefined;

  const subPoints = subcriticalProfile.profilePoints;
  const superPoints = supercriticalProfile.profilePoints;

  for (let i = 0; i < subPoints.length; i++) {
    const subPt = subPoints[i];

    // Find corresponding point in supercritical profile
    const superPt = superPoints.find(p =>
      Math.abs(p.station - subPt.station) < 0.1
    );

    if (superPt) {
      // Check if supercritical depth is less (jump would occur here)
      if (superPt.flowDepth < subPt.flowDepth && superPt.froudeNumber > 1) {
        jumpLocation = subPt.station;
        jumpUpstreamDepth = superPt.flowDepth;
        jumpDownstreamDepth = subPt.flowDepth;
        break;
      }
    }
  }

  // Merge profiles at jump location
  const mergedPoints: ProfilePoint[] = [];

  if (jumpLocation !== undefined) {
    // Add supercritical points upstream of jump
    for (const pt of superPoints) {
      if (pt.station <= jumpLocation) {
        mergedPoints.push(pt);
      }
    }

    // Add subcritical points downstream of jump
    for (const pt of subPoints) {
      if (pt.station > jumpLocation) {
        mergedPoints.push(pt);
      }
    }
  } else {
    // No jump - use subcritical or supercritical based on predominant regime
    const avgFr = subPoints.reduce((sum, p) => sum + p.froudeNumber, 0) / subPoints.length;
    if (avgFr > 1) {
      mergedPoints.push(...superPoints);
    } else {
      mergedPoints.push(...subPoints);
    }
  }

  // Sort by station
  mergedPoints.sort((a, b) => a.station - b.station);

  return {
    ...subcriticalProfile,
    profilePoints: mergedPoints,
    hasHydraulicJump: jumpLocation !== undefined,
    jumpLocation,
    warnings: [
      ...subcriticalProfile.warnings,
      ...supercriticalProfile.warnings,
      jumpLocation ? `Hydraulic jump at station ${jumpLocation.toFixed(1)}` : '',
    ].filter(w => w !== ''),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate rating curve for a cross-section
 */
export function generateRatingCurve(
  section: IrregularCrossSection,
  slope: number,
  minFlow: number,
  maxFlow: number,
  numPoints: number = 20
): { flow: number; wsel: number; velocity: number }[] {
  const curve: { flow: number; wsel: number; velocity: number }[] = [];

  const flowStep = (maxFlow - minFlow) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const flow = minFlow + i * flowStep;
    const wsel = calculateNormalWSEL(section, flow, slope);
    const geom = calculateIrregularGeometry(section, wsel);
    const velocity = geom.totalArea > 0 ? flow / geom.totalArea : 0;

    curve.push({ flow, wsel, velocity });
  }

  return curve;
}

/**
 * Format profile result for display
 */
export function formatProfileResult(profile: WaterSurfaceProfile): string {
  const lines = [
    '═══ PERFIL DE SUPERFICIE DE AGUA ═══',
    '',
    `Clasificación de Pendiente: ${profile.slopeClassification}`,
    `Tipo de Perfil: ${profile.profileType ?? 'N/A'}`,
    `Régimen de Flujo: ${profile.flowRegime}`,
    `Dirección de Cálculo: ${profile.computationDirection}`,
    '',
    `Longitud Total: ${profile.totalReachLength.toFixed(2)} m`,
    `Pendiente Promedio: ${(profile.averageSlope * 100).toFixed(4)}%`,
    '',
    `Convergió: ${profile.converged ? 'Sí' : 'No'}`,
    `Iteraciones: ${profile.totalIterations}`,
    `Error Máximo: ${profile.maxBalanceError.toFixed(4)} m`,
    '',
    '--- PUNTOS DEL PERFIL ---',
    'Est.\tWSEL\tProf.\tVel.\tFr',
  ];

  for (const pt of profile.profilePoints) {
    lines.push(
      `${pt.station.toFixed(1)}\t${pt.waterSurfaceElevation.toFixed(3)}\t` +
      `${pt.flowDepth.toFixed(3)}\t${pt.averageVelocity.toFixed(2)}\t${pt.froudeNumber.toFixed(3)}`
    );
  }

  if (profile.hasHydraulicJump && profile.jumpLocation) {
    lines.push('', `⚠ Salto Hidráulico en estación: ${profile.jumpLocation.toFixed(1)} m`);
  }

  if (profile.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    profile.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  return lines.join('\n');
}
