/**
 * Channel Design Module - Open Channel Design Tools
 *
 * Implements design methods for engineered open channels including:
 * - Best hydraulic section design
 * - Freeboard requirements
 * - Lining selection based on velocity/shear
 * - Erosion stability analysis
 * - Side slope recommendations
 * - Transition design
 *
 * Based on:
 * - USBR Design of Small Canal Structures
 * - HEC-RAS Hydraulic Reference Manual
 * - Manual de Carreteras Vol. 3 - MOP Chile
 * - ASCE Manual of Practice No. 77
 */

import {
  PrismaticSection,
  PrismaticShape,
  TrapezoidalSection,
  RectangularSection,
  TriangularSection,
  createTrapezoidalSection,
  createRectangularSection,
  createTriangularSection,
  calculatePrismaticArea,
  calculatePrismaticWettedPerimeter,
  calculatePrismaticTopWidth,
  calculatePrismaticHydraulicRadius,
} from './channel-geometry';

import {
  FlowRegime,
  ChannelMaterial,
  calculateManningFlowPrismatic,
  calculateNormalDepthPrismatic,
  calculateCriticalDepthPrismatic,
  calculateFroudeNumber,
  calculateShearStress,
  MANNING_N_CHANNELS,
  PERMISSIBLE_VELOCITY,
  PERMISSIBLE_SHEAR,
  SIDE_SLOPES,
  FREEBOARD_REQUIREMENTS,
} from './channel-hydraulics';

// ============================================================================
// Types
// ============================================================================

export type ChannelType = 'irrigation' | 'drainage' | 'flood_control' | 'natural' | 'urban';
export type SoilType = 'rock' | 'stiff_clay' | 'firm_soil' | 'loose_sandy' | 'sandy_loam' | 'peat';
export type LiningType = 'unlined' | 'concrete' | 'shotcrete' | 'riprap' | 'gabions' | 'grass' | 'geomembrane';

export interface ChannelDesignInput {
  designFlow: number;           // Q (m³/s)
  channelSlope: number;         // S (m/m)
  manningsN: number;            // n
  channelType: ChannelType;
  soilType: SoilType;
  lined: boolean;
  liningType?: LiningType;
}

export interface BestSectionResult {
  shape: PrismaticShape;
  section: PrismaticSection;
  depth: number;                // y (m)
  bottomWidth: number;          // b (m)
  sideSlope: number;            // z (H:V)
  topWidth: number;             // T (m)
  area: number;                 // A (m²)
  wettedPerimeter: number;      // P (m)
  hydraulicRadius: number;      // R (m)
  velocity: number;             // V (m/s)
  froudeNumber: number;
  flowRegime: FlowRegime;
  efficiency: number;           // R/y ratio (1 = best)
}

export interface FreeboardResult {
  requiredFreeboard: number;    // m
  minimumFreeboard: number;     // m
  velocityComponent: number;    // m
  waveComponent: number;        // m
  safetyFactor: number;
  totalChannelDepth: number;    // m (flow depth + freeboard)
}

export interface LiningRecommendation {
  recommended: LiningType;
  alternatives: LiningType[];
  maxAllowableVelocity: number;
  maxAllowableShear: number;
  designVelocity: number;
  designShear: number;
  safetyFactorVelocity: number;
  safetyFactorShear: number;
  adequate: boolean;
  warnings: string[];
}

export interface ErosionAnalysis {
  stable: boolean;
  velocitySafe: boolean;
  shearSafe: boolean;
  actualVelocity: number;
  permissibleVelocity: number;
  velocityRatio: number;
  actualShear: number;
  permissibleShear: number;
  shearRatio: number;
  recommendations: string[];
}

export interface ChannelDesignResult {
  section: PrismaticSection;
  depth: number;
  bottomWidth: number;
  sideSlope: number;
  topWidth: number;
  area: number;
  velocity: number;
  froudeNumber: number;
  flowRegime: FlowRegime;
  freeboard: FreeboardResult;
  lining: LiningRecommendation;
  erosion: ErosionAnalysis;
  isAdequate: boolean;
  warnings: string[];
}

export interface TransitionDesign {
  type: 'inlet' | 'outlet' | 'expansion' | 'contraction';
  length: number;               // m
  upstreamWidth: number;        // m
  downstreamWidth: number;      // m
  angle: number;                // degrees
  headLoss: number;             // m
  recommendations: string[];
}

// ============================================================================
// Constants
// ============================================================================

const GRAVITY = 9.81;

/**
 * Optimal side slopes for best hydraulic sections by shape
 */
export const OPTIMAL_SIDE_SLOPES: Record<string, number> = {
  trapezoidal: 0.577,      // 1/√3 ≈ 0.577 (60° sides) - gives z = 0.577
  triangular: 1.0,         // 45° sides
  rectangular: 0,          // Vertical sides
};

/**
 * Freeboard adjustment factors by channel type
 */
export const FREEBOARD_FACTORS: Record<ChannelType, number> = {
  irrigation: 1.0,
  drainage: 1.1,
  flood_control: 1.3,
  natural: 1.2,
  urban: 1.2,
};

/**
 * Minimum freeboard by flow rate (USBR guidelines)
 */
export const MINIMUM_FREEBOARD_BY_FLOW: { maxFlow: number; freeboard: number }[] = [
  { maxFlow: 0.5, freeboard: 0.15 },
  { maxFlow: 1.5, freeboard: 0.20 },
  { maxFlow: 3.0, freeboard: 0.25 },
  { maxFlow: 10.0, freeboard: 0.30 },
  { maxFlow: 30.0, freeboard: 0.40 },
  { maxFlow: 100.0, freeboard: 0.50 },
  { maxFlow: Infinity, freeboard: 0.60 },
];

// ============================================================================
// Best Hydraulic Section Functions
// ============================================================================

/**
 * Design best hydraulic section for given flow and constraints
 *
 * The "best" hydraulic section has maximum hydraulic radius for given area,
 * meaning minimum wetted perimeter and thus minimum excavation/lining.
 *
 * For trapezoidal: b = 2y(√(1+z²) - z), optimal z = 1/√3
 * For rectangular: b = 2y
 * For triangular: optimal z = 1 (45° sides)
 */
export function designBestHydraulicSection(
  flow: number,
  slope: number,
  manningsN: number,
  shape: PrismaticShape = 'trapezoidal',
  constrainedSideSlope?: number
): BestSectionResult {
  let section: PrismaticSection;
  let depth: number;
  let bottomWidth: number;
  let sideSlope: number;

  switch (shape) {
    case 'rectangular': {
      // Best rectangular: b = 2y, R = y/2
      // From Manning: Q = (1/n) × b × y × (y/2)^(2/3) × S^0.5
      // Substituting b = 2y: Q = (1/n) × 2y² × (y/2)^(2/3) × S^0.5
      // Solving for y: y = [(Q × n) / (2 × (1/2)^(2/3) × S^0.5)]^(3/8)

      const coeff = 2 * Math.pow(0.5, 2 / 3);
      depth = Math.pow((flow * manningsN) / (coeff * Math.pow(slope, 0.5)), 3 / 8);
      bottomWidth = 2 * depth;
      sideSlope = 0;

      section = createRectangularSection(bottomWidth);
      break;
    }

    case 'triangular': {
      // Best triangular: z = 1 (45° sides)
      // A = z × y², P = 2y√(1+z²), R = zy / (2√(1+z²))
      // For z = 1: A = y², P = 2y√2, R = y/(2√2)

      sideSlope = constrainedSideSlope ?? 1.0;
      const sqrt1pz2 = Math.sqrt(1 + sideSlope * sideSlope);

      // From Manning with triangular section
      // Q = (1/n) × z×y² × (zy/(2√(1+z²)))^(2/3) × S^0.5
      const coeff = sideSlope * Math.pow(sideSlope / (2 * sqrt1pz2), 2 / 3);
      depth = Math.pow((flow * manningsN) / (coeff * Math.pow(slope, 0.5)), 3 / 8);
      bottomWidth = 0;

      section = createTriangularSection(sideSlope);
      break;
    }

    case 'trapezoidal':
    default: {
      // Best trapezoidal: b = 2y(√(1+z²) - z)
      // Optimal z = 1/√3 ≈ 0.577 (half hexagon, 60° sides)

      sideSlope = constrainedSideSlope ?? OPTIMAL_SIDE_SLOPES.trapezoidal;
      const sqrt1pz2 = Math.sqrt(1 + sideSlope * sideSlope);

      // Best section relationship
      const bOverY = 2 * (sqrt1pz2 - sideSlope);

      // Iteratively solve for depth using Manning equation
      depth = estimateDepthForBestSection(flow, slope, manningsN, sideSlope, bOverY);
      bottomWidth = bOverY * depth;

      section = createTrapezoidalSection(bottomWidth, sideSlope);
      break;
    }
  }

  // Calculate final properties
  const A = calculatePrismaticArea(section, depth);
  const P = calculatePrismaticWettedPerimeter(section, depth);
  const R = calculatePrismaticHydraulicRadius(section, depth);
  const T = calculatePrismaticTopWidth(section, depth);
  const V = A > 0 ? flow / A : 0;
  const D = T > 0 ? A / T : depth;
  const Fr = calculateFroudeNumber(V, D);

  // Efficiency: R/y ratio (best section has R = y/2 for rectangular)
  const efficiency = depth > 0 ? (2 * R) / depth : 0;

  const flowRegime: FlowRegime = Fr < 0.95 ? 'subcritical' : Fr > 1.05 ? 'supercritical' : 'critical';

  return {
    shape,
    section,
    depth,
    bottomWidth,
    sideSlope,
    topWidth: T,
    area: A,
    wettedPerimeter: P,
    hydraulicRadius: R,
    velocity: V,
    froudeNumber: Fr,
    flowRegime,
    efficiency,
  };
}

/**
 * Estimate depth for best hydraulic trapezoidal section
 */
function estimateDepthForBestSection(
  flow: number,
  slope: number,
  manningsN: number,
  z: number,
  bOverY: number
): number {
  // Initial estimate
  let y = 1.0;

  for (let i = 0; i < 50; i++) {
    const b = bOverY * y;
    const A = (b + z * y) * y;
    const P = b + 2 * y * Math.sqrt(1 + z * z);
    const R = A / P;

    const Q_calc = (1 / manningsN) * A * Math.pow(R, 2 / 3) * Math.pow(slope, 0.5);

    if (Math.abs(Q_calc - flow) / flow < 0.0001) {
      return y;
    }

    // Adjust depth
    y *= Math.pow(flow / Q_calc, 0.4);
  }

  return y;
}

/**
 * Compare different channel shapes for given flow
 */
export function compareChannelShapes(
  flow: number,
  slope: number,
  manningsN: number
): BestSectionResult[] {
  const shapes: PrismaticShape[] = ['trapezoidal', 'rectangular', 'triangular'];

  return shapes.map(shape => designBestHydraulicSection(flow, slope, manningsN, shape));
}

// ============================================================================
// Freeboard Functions
// ============================================================================

/**
 * Calculate required freeboard for channel
 *
 * Freeboard accounts for:
 * - Wave action
 * - Water surface fluctuations
 * - Settlement
 * - Superelevation in curves
 * - Safety factor
 */
export function calculateFreeboard(
  depth: number,
  velocity: number,
  channelType: ChannelType,
  flow?: number,
  curveRadius?: number
): FreeboardResult {
  // Base freeboard from USBR guidelines
  let minimumFreeboard = 0.30;  // Default
  if (flow !== undefined) {
    for (const entry of MINIMUM_FREEBOARD_BY_FLOW) {
      if (flow <= entry.maxFlow) {
        minimumFreeboard = entry.freeboard;
        break;
      }
    }
  }

  // Velocity component (wave action)
  // fb_v = V² / (2g) × factor
  const velocityComponent = (velocity * velocity) / (2 * GRAVITY) * 0.5;

  // Wave component (empirical, based on depth)
  // Wave height ≈ 0.05 × √(depth) for typical channels
  const waveComponent = 0.05 * Math.sqrt(depth);

  // Superelevation in curves
  let superelevation = 0;
  if (curveRadius !== undefined && curveRadius > 0) {
    // Δy = V² × T / (g × R)  (simplified)
    superelevation = (velocity * velocity) / (GRAVITY * curveRadius);
  }

  // Channel type factor
  const typeFactor = FREEBOARD_FACTORS[channelType] ?? 1.0;

  // Total required freeboard
  const requiredFreeboard = Math.max(
    minimumFreeboard,
    (velocityComponent + waveComponent + superelevation) * typeFactor
  );

  // Safety factor
  const safetyFactor = requiredFreeboard / minimumFreeboard;

  return {
    requiredFreeboard,
    minimumFreeboard,
    velocityComponent,
    waveComponent,
    safetyFactor,
    totalChannelDepth: depth + requiredFreeboard,
  };
}

/**
 * Get freeboard requirements from standard tables
 */
export function getFreeboardRequirement(
  channelType: string
): { min: number; typical: number } {
  const key = channelType.toLowerCase().replace(/\s+/g, '_');
  return FREEBOARD_REQUIREMENTS[key] ?? { min: 0.30, typical: 0.45 };
}

// ============================================================================
// Lining Selection Functions
// ============================================================================

/**
 * Recommend channel lining based on velocity and shear stress
 */
export function recommendLining(
  velocity: number,
  shearStress: number,
  soilType: SoilType,
  channelType: ChannelType
): LiningRecommendation {
  const warnings: string[] = [];

  // Get permissible values for unlined channel in this soil
  const soilPermissibleVelocity = getSoilPermissibleVelocity(soilType);
  const soilPermissibleShear = getSoilPermissibleShear(soilType);

  // Check if unlined is adequate
  if (velocity <= soilPermissibleVelocity && shearStress <= soilPermissibleShear) {
    return {
      recommended: 'unlined',
      alternatives: ['grass', 'riprap'],
      maxAllowableVelocity: soilPermissibleVelocity,
      maxAllowableShear: soilPermissibleShear,
      designVelocity: velocity,
      designShear: shearStress,
      safetyFactorVelocity: soilPermissibleVelocity / velocity,
      safetyFactorShear: soilPermissibleShear / shearStress,
      adequate: true,
      warnings: [],
    };
  }

  // Determine required lining
  const linings: { type: LiningType; maxV: number; maxTau: number }[] = [
    { type: 'grass', maxV: PERMISSIBLE_VELOCITY.grass_good ?? 1.8, maxTau: 100 },
    { type: 'riprap', maxV: PERMISSIBLE_VELOCITY.riprap_150mm ?? 3.0, maxTau: PERMISSIBLE_SHEAR.riprap_150mm ?? 100 },
    { type: 'gabions', maxV: PERMISSIBLE_VELOCITY.gabions ?? 4.5, maxTau: PERMISSIBLE_SHEAR.gabions ?? 150 },
    { type: 'shotcrete', maxV: 4.5, maxTau: 150 },
    { type: 'concrete', maxV: PERMISSIBLE_VELOCITY.concrete ?? 6.0, maxTau: PERMISSIBLE_SHEAR.concrete ?? 200 },
    { type: 'geomembrane', maxV: 3.0, maxTau: 100 },
  ];

  // Find adequate lining
  let recommended: LiningType = 'concrete';
  let maxAllowableVelocity = 6.0;
  let maxAllowableShear = 200.0;
  const alternatives: LiningType[] = [];

  for (const lining of linings) {
    if (velocity <= lining.maxV && shearStress <= lining.maxTau) {
      if (alternatives.length === 0) {
        recommended = lining.type;
        maxAllowableVelocity = lining.maxV;
        maxAllowableShear = lining.maxTau;
      }
      alternatives.push(lining.type);
    }
  }

  const adequate = velocity <= maxAllowableVelocity && shearStress <= maxAllowableShear;

  if (!adequate) {
    warnings.push('No standard lining adequate - consider special measures');
    warnings.push(`Design velocity: ${velocity.toFixed(2)} m/s, Design shear: ${shearStress.toFixed(1)} Pa`);
  }

  // Channel type specific recommendations
  if (channelType === 'irrigation' && recommended === 'riprap') {
    warnings.push('Consider concrete lining for irrigation channels to reduce seepage');
  }
  if (channelType === 'flood_control' && recommended === 'grass') {
    warnings.push('Verify grass establishment before design flow event');
  }

  return {
    recommended,
    alternatives: alternatives.slice(0, 3),
    maxAllowableVelocity,
    maxAllowableShear,
    designVelocity: velocity,
    designShear: shearStress,
    safetyFactorVelocity: maxAllowableVelocity / velocity,
    safetyFactorShear: maxAllowableShear / shearStress,
    adequate,
    warnings,
  };
}

/**
 * Get permissible velocity for soil type
 */
function getSoilPermissibleVelocity(soilType: SoilType): number {
  const soilVelocities: Record<SoilType, number> = {
    rock: 4.0,
    stiff_clay: 1.14,
    firm_soil: 0.76,
    loose_sandy: 0.45,
    sandy_loam: 0.53,
    peat: 0.30,
  };
  return soilVelocities[soilType] ?? 0.6;
}

/**
 * Get permissible shear stress for soil type
 */
function getSoilPermissibleShear(soilType: SoilType): number {
  const soilShear: Record<SoilType, number> = {
    rock: 100.0,
    stiff_clay: 12.5,
    firm_soil: 3.6,
    loose_sandy: 1.3,
    sandy_loam: 1.9,
    peat: 1.0,
  };
  return soilShear[soilType] ?? 2.0;
}

// ============================================================================
// Erosion Stability Functions
// ============================================================================

/**
 * Analyze channel erosion stability
 */
export function analyzeErosionStability(
  velocity: number,
  hydraulicRadius: number,
  slope: number,
  liningType: LiningType,
  soilType: SoilType
): ErosionAnalysis {
  const recommendations: string[] = [];

  // Calculate actual shear stress
  const actualShear = calculateShearStress(hydraulicRadius, slope);

  // Get permissible values
  let permissibleVelocity: number;
  let permissibleShear: number;

  if (liningType === 'unlined') {
    permissibleVelocity = getSoilPermissibleVelocity(soilType);
    permissibleShear = getSoilPermissibleShear(soilType);
  } else {
    permissibleVelocity = getLiningPermissibleVelocity(liningType);
    permissibleShear = getLiningPermissibleShear(liningType);
  }

  const velocityRatio = velocity / permissibleVelocity;
  const shearRatio = actualShear / permissibleShear;

  const velocitySafe = velocityRatio <= 1.0;
  const shearSafe = shearRatio <= 1.0;
  const stable = velocitySafe && shearSafe;

  // Generate recommendations
  if (!velocitySafe) {
    recommendations.push(`Reduce velocity from ${velocity.toFixed(2)} to ${permissibleVelocity.toFixed(2)} m/s`);
    recommendations.push('Consider: reducing slope, widening channel, or upgrading lining');
  }

  if (!shearSafe) {
    recommendations.push(`Reduce shear from ${actualShear.toFixed(1)} to ${permissibleShear.toFixed(1)} Pa`);
    recommendations.push('Consider: reducing slope, increasing hydraulic radius, or upgrading lining');
  }

  if (stable && velocityRatio > 0.8) {
    recommendations.push('Operating near velocity limit - consider safety factor');
  }

  if (stable && shearRatio > 0.8) {
    recommendations.push('Operating near shear limit - consider safety factor');
  }

  return {
    stable,
    velocitySafe,
    shearSafe,
    actualVelocity: velocity,
    permissibleVelocity,
    velocityRatio,
    actualShear,
    permissibleShear,
    shearRatio,
    recommendations,
  };
}

/**
 * Get permissible velocity for lining type
 */
function getLiningPermissibleVelocity(liningType: LiningType): number {
  const velocities: Record<LiningType, number> = {
    unlined: 0.6,
    grass: 1.8,
    riprap: 3.0,
    gabions: 4.5,
    shotcrete: 4.5,
    concrete: 6.0,
    geomembrane: 3.0,
  };
  return velocities[liningType] ?? 1.0;
}

/**
 * Get permissible shear for lining type
 */
function getLiningPermissibleShear(liningType: LiningType): number {
  const shears: Record<LiningType, number> = {
    unlined: 2.0,
    grass: 100.0,
    riprap: 100.0,
    gabions: 150.0,
    shotcrete: 150.0,
    concrete: 200.0,
    geomembrane: 50.0,
  };
  return shears[liningType] ?? 10.0;
}

// ============================================================================
// Side Slope Functions
// ============================================================================

/**
 * Get recommended side slopes for soil type
 */
export function getRecommendedSideSlopes(
  soilType: SoilType,
  lined: boolean
): { min: number; max: number; recommended: number } {
  // Side slopes as horizontal:vertical (z)
  const slopesByType: Record<SoilType, { unlined: number; lined: number }> = {
    rock: { unlined: 0.25, lined: 0 },
    stiff_clay: { unlined: 1.5, lined: 0.5 },
    firm_soil: { unlined: 1.5, lined: 1.0 },
    loose_sandy: { unlined: 2.5, lined: 1.5 },
    sandy_loam: { unlined: 2.0, lined: 1.0 },
    peat: { unlined: 0.5, lined: 0.25 },
  };

  const slopes = slopesByType[soilType] ?? { unlined: 1.5, lined: 1.0 };
  const recommended = lined ? slopes.lined : slopes.unlined;

  return {
    min: recommended * 0.75,
    max: recommended * 1.5,
    recommended,
  };
}

/**
 * Check if side slope is stable
 */
export function checkSideSlope(
  sideSlope: number,
  soilType: SoilType,
  depth: number,
  lined: boolean
): { stable: boolean; angleOfRepose: number; actualAngle: number; warning?: string } {
  // Angle of repose for different soils (degrees)
  const repose: Record<SoilType, number> = {
    rock: 75,
    stiff_clay: 60,
    firm_soil: 45,
    loose_sandy: 30,
    sandy_loam: 35,
    peat: 20,
  };

  const angleOfRepose = repose[soilType] ?? 40;
  const actualAngle = Math.atan(1 / sideSlope) * (180 / Math.PI);

  const stable = actualAngle <= angleOfRepose;
  let warning: string | undefined;

  if (!stable) {
    warning = `Side slope angle ${actualAngle.toFixed(1)}° exceeds angle of repose ${angleOfRepose}°`;
  } else if (actualAngle > angleOfRepose * 0.9) {
    warning = 'Side slope near stability limit - consider flattening';
  }

  return { stable, angleOfRepose, actualAngle, warning };
}

// ============================================================================
// Channel Sizing Functions
// ============================================================================

/**
 * Size a channel for given design parameters
 */
export function sizeChannel(
  input: ChannelDesignInput,
  shape: PrismaticShape = 'trapezoidal'
): ChannelDesignResult {
  const warnings: string[] = [];

  // Get recommended side slope
  const slopeRec = getRecommendedSideSlopes(input.soilType, input.lined);
  const z = shape === 'rectangular' ? 0 : shape === 'triangular' ? 1.0 : slopeRec.recommended;

  // Design best section
  const bestSection = designBestHydraulicSection(
    input.designFlow,
    input.channelSlope,
    input.manningsN,
    shape,
    z
  );

  // Calculate shear stress
  const shearStress = calculateShearStress(bestSection.hydraulicRadius, input.channelSlope);

  // Calculate freeboard
  const freeboard = calculateFreeboard(
    bestSection.depth,
    bestSection.velocity,
    input.channelType,
    input.designFlow
  );

  // Recommend lining
  const lining = recommendLining(
    bestSection.velocity,
    shearStress,
    input.soilType,
    input.channelType
  );

  // Check erosion stability
  const erosion = analyzeErosionStability(
    bestSection.velocity,
    bestSection.hydraulicRadius,
    input.channelSlope,
    input.liningType ?? lining.recommended,
    input.soilType
  );

  // Check side slope stability
  if (z > 0) {
    const slopeCheck = checkSideSlope(z, input.soilType, bestSection.depth, input.lined);
    if (slopeCheck.warning) {
      warnings.push(slopeCheck.warning);
    }
  }

  // Overall adequacy
  const isAdequate = erosion.stable && lining.adequate;

  if (!isAdequate) {
    warnings.push('Channel design may not be adequate - review recommendations');
  }

  // Check Froude number
  if (bestSection.flowRegime === 'critical') {
    warnings.push('Flow is near critical - unstable conditions expected');
  }

  return {
    section: bestSection.section,
    depth: bestSection.depth,
    bottomWidth: bestSection.bottomWidth,
    sideSlope: bestSection.sideSlope,
    topWidth: bestSection.topWidth,
    area: bestSection.area,
    velocity: bestSection.velocity,
    froudeNumber: bestSection.froudeNumber,
    flowRegime: bestSection.flowRegime,
    freeboard,
    lining,
    erosion,
    isAdequate,
    warnings,
  };
}

// ============================================================================
// Transition Design Functions
// ============================================================================

/**
 * Design channel transition (inlet, outlet, expansion, contraction)
 */
export function designTransition(
  upstreamWidth: number,
  downstreamWidth: number,
  velocity: number,
  transitionType: 'inlet' | 'outlet' | 'expansion' | 'contraction'
): TransitionDesign {
  const recommendations: string[] = [];

  // Determine if expansion or contraction
  const isExpansion = downstreamWidth > upstreamWidth;
  const type = isExpansion ? 'expansion' : 'contraction';

  // Calculate width ratio
  const widthRatio = isExpansion
    ? downstreamWidth / upstreamWidth
    : upstreamWidth / downstreamWidth;

  // Recommended transition angles (degrees from centerline)
  // Contractions can be steeper than expansions
  let maxAngle: number;
  if (isExpansion) {
    maxAngle = 12.5;  // Gradual expansion, max 1:4.5
  } else {
    maxAngle = 25;    // Contraction can be steeper, up to 1:2
  }

  // Calculate transition length for recommended angle
  const widthChange = Math.abs(downstreamWidth - upstreamWidth);
  const angle = Math.min(maxAngle, Math.atan(widthChange / (widthChange * 3)) * (180 / Math.PI));
  const length = widthChange / (2 * Math.tan(angle * Math.PI / 180));

  // Calculate head loss
  // Expansion: hL = Ke × (V1² - V2²) / 2g
  // Contraction: hL = Kc × (V2² - V1²) / 2g
  let headLoss: number;
  if (isExpansion) {
    // Expansion loss coefficient depends on angle
    const Ke = angle <= 10 ? 0.3 : angle <= 20 ? 0.5 : 0.8;
    const V1 = velocity;
    const V2 = V1 * upstreamWidth / downstreamWidth;
    headLoss = Ke * (V1 * V1 - V2 * V2) / (2 * GRAVITY);
  } else {
    // Contraction loss coefficient
    const Kc = angle <= 15 ? 0.1 : angle <= 30 ? 0.2 : 0.3;
    const V1 = velocity;
    const V2 = V1 * upstreamWidth / downstreamWidth;
    headLoss = Kc * (V2 * V2 - V1 * V1) / (2 * GRAVITY);
  }

  // Recommendations
  if (isExpansion && angle > 10) {
    recommendations.push('Consider more gradual expansion to reduce losses');
  }

  if (widthRatio > 2.0) {
    recommendations.push('Large width change - consider multiple transitions');
  }

  if (transitionType === 'inlet') {
    recommendations.push('Provide smooth entrance with rounded edges');
    recommendations.push('Consider headwall and wingwalls for stability');
  }

  if (transitionType === 'outlet') {
    recommendations.push('Provide energy dissipation if needed');
    recommendations.push('Consider riprap apron for scour protection');
  }

  return {
    type: transitionType,
    length,
    upstreamWidth,
    downstreamWidth,
    angle,
    headLoss: Math.abs(headLoss),
    recommendations,
  };
}

/**
 * Calculate superelevation for channel curve
 *
 * Δy = V² × T / (g × R)
 * where R is curve radius, T is top width
 */
export function calculateSuperelevation(
  velocity: number,
  topWidth: number,
  curveRadius: number
): { superelevation: number; bankHeight: number } {
  if (curveRadius <= 0) {
    return { superelevation: 0, bankHeight: 0 };
  }

  const superelevation = (velocity * velocity * topWidth) / (GRAVITY * curveRadius);

  // Bank height increase on outer curve
  const bankHeight = superelevation / 2;

  return { superelevation, bankHeight };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format channel design result for display
 */
export function formatChannelDesign(result: ChannelDesignResult): string {
  const lines = [
    '═══ DISEÑO DE CANAL ═══',
    '',
    '--- GEOMETRÍA ---',
    `Profundidad de flujo: ${result.depth.toFixed(3)} m`,
    `Ancho de fondo: ${result.bottomWidth.toFixed(3)} m`,
    `Talud (z): ${result.sideSlope.toFixed(2)} H:V`,
    `Ancho superficial: ${result.topWidth.toFixed(3)} m`,
    `Área de flujo: ${result.area.toFixed(3)} m²`,
    '',
    '--- HIDRÁULICA ---',
    `Velocidad: ${result.velocity.toFixed(2)} m/s`,
    `Número de Froude: ${result.froudeNumber.toFixed(3)}`,
    `Régimen: ${result.flowRegime}`,
    '',
    '--- BORDE LIBRE ---',
    `Requerido: ${result.freeboard.requiredFreeboard.toFixed(2)} m`,
    `Mínimo: ${result.freeboard.minimumFreeboard.toFixed(2)} m`,
    `Profundidad total: ${result.freeboard.totalChannelDepth.toFixed(2)} m`,
    '',
    '--- REVESTIMIENTO ---',
    `Recomendado: ${result.lining.recommended}`,
    `Alternativas: ${result.lining.alternatives.join(', ')}`,
    `V diseño / V permisible: ${result.lining.designVelocity.toFixed(2)} / ${result.lining.maxAllowableVelocity.toFixed(2)} m/s`,
    `τ diseño / τ permisible: ${result.lining.designShear.toFixed(1)} / ${result.lining.maxAllowableShear.toFixed(1)} Pa`,
    '',
    '--- ESTABILIDAD ---',
    `Estable: ${result.erosion.stable ? 'Sí' : 'No'}`,
    `Ratio Velocidad: ${(result.erosion.velocityRatio * 100).toFixed(0)}%`,
    `Ratio Corte: ${(result.erosion.shearRatio * 100).toFixed(0)}%`,
    '',
    `Diseño Adecuado: ${result.isAdequate ? 'SÍ' : 'NO'}`,
  ];

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  if (result.erosion.recommendations.length > 0) {
    lines.push('', '--- RECOMENDACIONES ---');
    result.erosion.recommendations.forEach(r => lines.push(`• ${r}`));
  }

  return lines.join('\n');
}

/**
 * Format best section comparison for display
 */
export function formatSectionComparison(results: BestSectionResult[]): string {
  const lines = [
    '═══ COMPARACIÓN DE SECCIONES ═══',
    '',
    'Forma\t\tProf.\tAncho\tÁrea\tP\tR\tV\tFr\tEfic.',
    '─'.repeat(80),
  ];

  for (const r of results) {
    lines.push(
      `${r.shape.padEnd(12)}\t` +
      `${r.depth.toFixed(2)}\t` +
      `${r.bottomWidth.toFixed(2)}\t` +
      `${r.area.toFixed(2)}\t` +
      `${r.wettedPerimeter.toFixed(2)}\t` +
      `${r.hydraulicRadius.toFixed(3)}\t` +
      `${r.velocity.toFixed(2)}\t` +
      `${r.froudeNumber.toFixed(2)}\t` +
      `${(r.efficiency * 100).toFixed(0)}%`
    );
  }

  return lines.join('\n');
}
