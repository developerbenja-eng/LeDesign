/**
 * Sediment Transport Module
 *
 * Comprehensive sediment transport analysis for open channels including:
 * - Incipient motion and critical shear stress (Shields criterion)
 * - Bed load transport (Meyer-Peter-Müller, Einstein-Brown)
 * - Suspended load transport (Rouse, Einstein)
 * - Total load estimation
 * - Scour and deposition analysis
 * - Channel stability assessment
 *
 * Based on:
 * - ASCE Manual of Practice No. 110
 * - Vanoni (2006) "Sedimentation Engineering"
 * - García (2008) "Sedimentation Engineering: Processes, Measurements, Modeling"
 * - Manual de Carreteras Vol. 3 - MOP Chile (Bridge Scour)
 */

import { calculatePrismaticArea, calculatePrismaticHydraulicRadius, PrismaticSection } from './channel-geometry';
import { calculateVelocityPrismatic, calculateShearStress } from './channel-hydraulics';

// ============================================================================
// Types
// ============================================================================

export type SedimentShape = 'spherical' | 'natural' | 'angular' | 'crushed';
export type TransportMode = 'no_motion' | 'incipient' | 'bedload' | 'suspended' | 'washload';

export interface SedimentProperties {
  d50: number;              // Median diameter (m)
  d90?: number;             // 90th percentile diameter (m)
  d16?: number;             // 16th percentile diameter (m)
  specificGravity?: number; // Gs (default 2.65 for quartz)
  shape?: SedimentShape;
  porosity?: number;        // n (default 0.4)
}

export interface FlowConditions {
  depth: number;            // Flow depth (m)
  velocity: number;         // Average velocity (m/s)
  slope: number;            // Energy slope (m/m)
  width: number;            // Channel width (m)
  hydraulicRadius?: number; // Rh (m)
  temperature?: number;     // Water temperature (°C, default 20)
}

export interface ShieldsResult {
  shearVelocity: number;            // u* (m/s)
  boundaryShearStress: number;      // τ0 (N/m²)
  criticalShearStress: number;      // τc (N/m²)
  shieldsParameter: number;         // θ (dimensionless)
  criticalShieldsParameter: number; // θc (dimensionless)
  particleReynolds: number;         // Re* (dimensionless)
  transportMode: TransportMode;
  mobilityRatio: number;            // τ0/τc
  recommendations: string[];
}

export interface BedLoadResult {
  method: string;
  transportRate: number;      // qb (m³/s/m) volumetric per unit width
  massRate: number;           // (kg/s/m) mass per unit width
  totalTransport: number;     // Qb (m³/s) total volumetric
  totalMassRate: number;      // (kg/s) total mass
  dimensionlessRate: number;  // φ or qb* (dimensionless)
  excessShear: number;        // (τ0 - τc) / τc
  recommendations: string[];
}

export interface SuspendedLoadResult {
  referenceConcentration: number;  // Ca at reference level
  depthAveragedConc: number;       // C̄ (ppm or kg/m³)
  transportRate: number;           // qs (m³/s/m)
  totalTransport: number;          // Qs (m³/s)
  massRate: number;                // (kg/s)
  rouseNumber: number;             // Z = ws/(κu*)
  suspensionMode: string;          // Description of suspension behavior
  recommendations: string[];
}

export interface TotalLoadResult {
  bedLoad: BedLoadResult;
  suspendedLoad: SuspendedLoadResult;
  totalTransportRate: number;     // qt (m³/s/m)
  totalVolumetric: number;        // Qt (m³/s)
  totalMassRate: number;          // (kg/s)
  bedLoadFraction: number;        // Qb/Qt
  suspendedFraction: number;      // Qs/Qt
  annualLoad?: number;            // (tonnes/year)
  recommendations: string[];
}

export interface ScourResult {
  scourDepth: number;           // ds (m)
  equilibriumScour: number;     // Maximum scour at equilibrium (m)
  contractionScour: number;     // Scour due to contraction (m)
  localScour: number;           // Local scour around obstruction (m)
  totalScour: number;           // Total scour depth (m)
  timeToEquilibrium: number;    // Estimated time (hours)
  scourVelocity: number;        // Critical velocity for scour (m/s)
  recommendations: string[];
}

export interface ChannelStabilityResult {
  isStable: boolean;
  stabilityRatio: number;       // Actual shear / Permissible shear
  regime: 'degrading' | 'stable' | 'aggrading';
  permissibleVelocity: number;  // Vp (m/s)
  permissibleShear: number;     // τp (N/m²)
  actualShear: number;          // τ0 (N/m²)
  competentVelocity: number;    // Velocity to move d50 (m/s)
  recommendations: string[];
}

// ============================================================================
// Constants
// ============================================================================

const GRAVITY = 9.81;  // m/s²
const WATER_DENSITY = 1000;  // kg/m³
const VON_KARMAN = 0.41;  // κ

/**
 * Kinematic viscosity of water at various temperatures (m²/s)
 */
const KINEMATIC_VISCOSITY: Record<number, number> = {
  0: 1.787e-6,
  5: 1.519e-6,
  10: 1.307e-6,
  15: 1.139e-6,
  20: 1.004e-6,
  25: 0.893e-6,
  30: 0.801e-6,
};

/**
 * Shape factors for settling velocity
 */
const SHAPE_FACTORS: Record<SedimentShape, number> = {
  spherical: 1.0,
  natural: 0.7,
  angular: 0.55,
  crushed: 0.45,
};

/**
 * Permissible velocities for different bed materials (m/s)
 * Reference: Fortier & Scobey (1926), ASCE
 */
export const PERMISSIBLE_VELOCITIES: Record<string, { clear: number; sediment: number }> = {
  'fine_sand': { clear: 0.45, sediment: 0.75 },
  'sandy_loam': { clear: 0.53, sediment: 0.75 },
  'silt_loam': { clear: 0.61, sediment: 0.90 },
  'alluvial_silt': { clear: 0.61, sediment: 1.05 },
  'firm_loam': { clear: 0.75, sediment: 1.05 },
  'stiff_clay': { clear: 1.15, sediment: 1.50 },
  'fine_gravel': { clear: 0.75, sediment: 1.50 },
  'coarse_gravel': { clear: 1.20, sediment: 1.80 },
  'cobbles': { clear: 1.50, sediment: 1.70 },
  'shale': { clear: 1.80, sediment: 1.80 },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get kinematic viscosity at given temperature
 */
export function getKinematicViscosity(temperature: number): number {
  if (temperature in KINEMATIC_VISCOSITY) {
    return KINEMATIC_VISCOSITY[temperature];
  }
  // Linear interpolation
  const temps = Object.keys(KINEMATIC_VISCOSITY).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < temps.length - 1; i++) {
    if (temperature >= temps[i] && temperature <= temps[i + 1]) {
      const t1 = temps[i];
      const t2 = temps[i + 1];
      const v1 = KINEMATIC_VISCOSITY[t1];
      const v2 = KINEMATIC_VISCOSITY[t2];
      return v1 + (v2 - v1) * (temperature - t1) / (t2 - t1);
    }
  }
  return KINEMATIC_VISCOSITY[20];
}

/**
 * Calculate settling velocity using Stokes/intermediate/Newton regimes
 */
export function calculateSettlingVelocity(
  diameter: number,
  specificGravity: number = 2.65,
  temperature: number = 20,
  shape: SedimentShape = 'natural'
): number {
  const nu = getKinematicViscosity(temperature);
  const s = specificGravity;
  const d = diameter;
  const SF = SHAPE_FACTORS[shape];

  // Dimensionless diameter
  const dStar = d * Math.pow((s - 1) * GRAVITY / (nu * nu), 1 / 3);

  let ws: number;

  if (dStar <= 1) {
    // Stokes regime (very fine sediment)
    ws = ((s - 1) * GRAVITY * d * d) / (18 * nu);
  } else if (dStar <= 100) {
    // Intermediate regime (Dietrich, 1982)
    const R = Math.exp(-2.891 + 0.95 * Math.log(dStar) - 0.056 * Math.pow(Math.log(dStar), 2));
    ws = R * Math.pow((s - 1) * GRAVITY * nu, 1 / 3);
  } else {
    // Newton regime (coarse sediment)
    ws = 1.1 * Math.sqrt((s - 1) * GRAVITY * d);
  }

  return ws * SF;
}

/**
 * Calculate dimensionless diameter d*
 */
export function calculateDimensionlessDiameter(
  diameter: number,
  specificGravity: number = 2.65,
  temperature: number = 20
): number {
  const nu = getKinematicViscosity(temperature);
  return diameter * Math.pow((specificGravity - 1) * GRAVITY / (nu * nu), 1 / 3);
}

// ============================================================================
// Incipient Motion (Shields)
// ============================================================================

/**
 * Calculate critical Shields parameter using Brownlie (1981) fit
 */
export function calculateCriticalShields(particleReynolds: number): number {
  if (particleReynolds < 0.2) {
    // Viscous regime
    return 0.22 / particleReynolds + 0.06 * Math.pow(10, -7.7 / particleReynolds);
  } else if (particleReynolds < 5) {
    // Transition regime
    return 0.22 * Math.pow(particleReynolds, -0.6) + 0.06 * Math.pow(10, -7.7 / particleReynolds);
  } else if (particleReynolds < 70) {
    // Turbulent smooth regime
    return 0.06 * Math.pow(10, -0.27 * particleReynolds) + 0.03;
  } else {
    // Turbulent rough regime
    return 0.047;  // Constant value for large Re*
  }
}

/**
 * Analyze incipient motion using Shields criterion
 */
export function analyzeShields(
  sediment: SedimentProperties,
  flow: FlowConditions
): ShieldsResult {
  const recommendations: string[] = [];
  const s = sediment.specificGravity || 2.65;
  const d50 = sediment.d50;
  const temp = flow.temperature || 20;
  const nu = getKinematicViscosity(temp);

  // Calculate shear velocity and stress
  const Rh = flow.hydraulicRadius || flow.depth;
  const tau0 = WATER_DENSITY * GRAVITY * Rh * flow.slope;
  const uStar = Math.sqrt(tau0 / WATER_DENSITY);

  // Particle Reynolds number
  const ReStar = uStar * d50 / nu;

  // Critical Shields parameter
  const thetaC = calculateCriticalShields(ReStar);

  // Actual Shields parameter
  const theta = tau0 / (WATER_DENSITY * (s - 1) * GRAVITY * d50);

  // Critical shear stress
  const tauC = thetaC * WATER_DENSITY * (s - 1) * GRAVITY * d50;

  // Mobility ratio
  const mobility = tau0 / tauC;

  // Determine transport mode
  let transportMode: TransportMode;
  if (mobility < 0.5) {
    transportMode = 'no_motion';
    recommendations.push('Sediment is stable - no transport expected');
  } else if (mobility < 1.0) {
    transportMode = 'incipient';
    recommendations.push('Near incipient motion - sporadic particle movement');
  } else if (mobility < 3.0) {
    transportMode = 'bedload';
    recommendations.push('Active bed load transport');
  } else {
    transportMode = 'suspended';
    recommendations.push('Significant suspended load expected');
  }

  // Additional recommendations
  if (theta > 0.2) {
    recommendations.push('High mobility - consider bed armoring');
  }
  if (ReStar < 5) {
    recommendations.push('Viscous regime - cohesive effects may be important');
  }

  return {
    shearVelocity: uStar,
    boundaryShearStress: tau0,
    criticalShearStress: tauC,
    shieldsParameter: theta,
    criticalShieldsParameter: thetaC,
    particleReynolds: ReStar,
    transportMode,
    mobilityRatio: mobility,
    recommendations,
  };
}

// ============================================================================
// Bed Load Transport
// ============================================================================

/**
 * Meyer-Peter and Müller (1948) bed load formula
 * Classic formula for gravel-bed rivers
 */
export function calculateBedLoadMPM(
  sediment: SedimentProperties,
  flow: FlowConditions
): BedLoadResult {
  const recommendations: string[] = [];
  const s = sediment.specificGravity || 2.65;
  const d50 = sediment.d50;
  const d90 = sediment.d90 || d50 * 1.5;

  // Effective shear stress (grain shear)
  const Rh = flow.hydraulicRadius || flow.depth;
  const tau0 = WATER_DENSITY * GRAVITY * Rh * flow.slope;

  // Grain roughness correction (Strickler-Manning)
  const ks = d90;  // Roughness height
  const ksPrime = d50;
  const nGrain = Math.pow(ksPrime, 1 / 6) / 26;

  // Effective grain shear
  const tauPrime = tau0 * Math.pow(ksPrime / ks, 1.5);

  // Critical shear stress (Shields)
  const tauC = 0.047 * WATER_DENSITY * (s - 1) * GRAVITY * d50;

  if (tauPrime <= tauC) {
    recommendations.push('Shear stress below critical - no bed load transport');
    return {
      method: 'Meyer-Peter-Müller (1948)',
      transportRate: 0,
      massRate: 0,
      totalTransport: 0,
      totalMassRate: 0,
      dimensionlessRate: 0,
      excessShear: 0,
      recommendations,
    };
  }

  // MPM formula: φ = 8 × (θ′ - θc)^1.5
  const thetaPrime = tauPrime / (WATER_DENSITY * (s - 1) * GRAVITY * d50);
  const thetaC = 0.047;
  const phi = 8 * Math.pow(thetaPrime - thetaC, 1.5);

  // Convert to dimensional rate
  const qbStar = phi * Math.sqrt((s - 1) * GRAVITY) * Math.pow(d50, 1.5);
  const qb = qbStar;  // m³/s/m
  const mbRate = qb * s * WATER_DENSITY;  // kg/s/m

  // Total transport
  const Qb = qb * flow.width;
  const Mb = mbRate * flow.width;

  recommendations.push('MPM formula best for gravel-bed rivers (d > 5mm)');
  if (d50 < 0.002) {
    recommendations.push('Warning: MPM may overestimate for fine sand');
  }

  return {
    method: 'Meyer-Peter-Müller (1948)',
    transportRate: qb,
    massRate: mbRate,
    totalTransport: Qb,
    totalMassRate: Mb,
    dimensionlessRate: phi,
    excessShear: (tauPrime - tauC) / tauC,
    recommendations,
  };
}

/**
 * Einstein-Brown bed load formula
 * Suitable for sand-bed channels
 */
export function calculateBedLoadEinsteinBrown(
  sediment: SedimentProperties,
  flow: FlowConditions
): BedLoadResult {
  const recommendations: string[] = [];
  const s = sediment.specificGravity || 2.65;
  const d50 = sediment.d50;
  const temp = flow.temperature || 20;
  const nu = getKinematicViscosity(temp);

  // Shear stress
  const Rh = flow.hydraulicRadius || flow.depth;
  const tau0 = WATER_DENSITY * GRAVITY * Rh * flow.slope;

  // Shields parameter
  const theta = tau0 / (WATER_DENSITY * (s - 1) * GRAVITY * d50);

  // Einstein-Brown intensity function
  let phi: number;
  if (theta < 0.03) {
    phi = 0;
  } else if (theta < 0.1) {
    phi = 2.15 * Math.exp(-0.391 / theta);
  } else {
    phi = 40 * Math.pow(theta, 3);
  }

  // Dimensional rate
  const qb = phi * Math.sqrt((s - 1) * GRAVITY) * Math.pow(d50, 1.5);
  const mbRate = qb * s * WATER_DENSITY;

  // Total transport
  const Qb = qb * flow.width;
  const Mb = mbRate * flow.width;

  recommendations.push('Einstein-Brown suitable for sand-bed channels');
  if (d50 > 0.01) {
    recommendations.push('Consider MPM formula for coarse sediment');
  }

  return {
    method: 'Einstein-Brown',
    transportRate: qb,
    massRate: mbRate,
    totalTransport: Qb,
    totalMassRate: Mb,
    dimensionlessRate: phi,
    excessShear: theta > 0.047 ? (theta - 0.047) / 0.047 : 0,
    recommendations,
  };
}

// ============================================================================
// Suspended Load Transport
// ============================================================================

/**
 * Calculate Rouse number for suspension classification
 */
export function calculateRouseNumber(
  settlingVelocity: number,
  shearVelocity: number
): number {
  return settlingVelocity / (VON_KARMAN * shearVelocity);
}

/**
 * Classify suspension mode based on Rouse number
 */
export function classifySuspension(rouseNumber: number): string {
  if (rouseNumber > 7.5) return 'Bed load only - no suspension';
  if (rouseNumber > 2.5) return 'Incipient suspension - 50% bed load';
  if (rouseNumber > 1.2) return 'Suspended load dominates';
  if (rouseNumber > 0.8) return 'Full suspension - 100% suspended';
  return 'Washload - permanently in suspension';
}

/**
 * Calculate suspended load transport
 */
export function calculateSuspendedLoad(
  sediment: SedimentProperties,
  flow: FlowConditions
): SuspendedLoadResult {
  const recommendations: string[] = [];
  const s = sediment.specificGravity || 2.65;
  const d50 = sediment.d50;
  const temp = flow.temperature || 20;

  // Settling velocity
  const ws = calculateSettlingVelocity(d50, s, temp, sediment.shape);

  // Shear velocity
  const Rh = flow.hydraulicRadius || flow.depth;
  const tau0 = WATER_DENSITY * GRAVITY * Rh * flow.slope;
  const uStar = Math.sqrt(tau0 / WATER_DENSITY);

  // Rouse number
  const Z = calculateRouseNumber(ws, uStar);
  const suspensionMode = classifySuspension(Z);

  // Reference level (typically 0.05h or 2d50)
  const a = Math.max(2 * d50, 0.05 * flow.depth);

  // Reference concentration (Smith & McLean, 1977)
  const theta = tau0 / (WATER_DENSITY * (s - 1) * GRAVITY * d50);
  const thetaC = 0.047;
  const gammaS = 2.4e-3;  // Resuspension coefficient

  let Ca: number;
  if (theta <= thetaC) {
    Ca = 0;
  } else {
    const S0 = gammaS * (theta - thetaC) / (1 + gammaS * (theta - thetaC));
    Ca = S0 * 0.65;  // Near-bed volumetric concentration
  }

  // Depth-averaged concentration (Rouse profile integration)
  let Cbar: number;
  if (Z > 5) {
    Cbar = 0;  // No suspension
  } else if (Z < 0.5) {
    Cbar = Ca;  // Uniform (washload)
  } else {
    // Simplified Rouse integration
    const aRel = a / flow.depth;
    const I1 = Math.pow(1 - aRel, Z) / (1 - aRel);  // Simplified
    Cbar = Ca * I1 / (1 - a / flow.depth);
  }

  // Transport rate
  const qs = Cbar * flow.velocity * flow.depth;  // m³/s/m
  const Qs = qs * flow.width;  // m³/s
  const Ms = Qs * s * WATER_DENSITY;  // kg/s

  recommendations.push(`Rouse number Z = ${Z.toFixed(2)}: ${suspensionMode}`);
  if (Z > 2.5) {
    recommendations.push('Limited suspension - bed load dominant');
  }
  if (Z < 0.8) {
    recommendations.push('Washload present - fine particles always suspended');
  }

  return {
    referenceConcentration: Ca,
    depthAveragedConc: Cbar,
    transportRate: qs,
    totalTransport: Qs,
    massRate: Ms,
    rouseNumber: Z,
    suspensionMode,
    recommendations,
  };
}

// ============================================================================
// Total Load
// ============================================================================

/**
 * Calculate total sediment load (bed load + suspended load)
 */
export function calculateTotalLoad(
  sediment: SedimentProperties,
  flow: FlowConditions,
  duration?: number  // Optional duration for annual estimate (hours)
): TotalLoadResult {
  const recommendations: string[] = [];

  // Calculate bed load (use MPM for coarse, Einstein-Brown for fine)
  const bedLoad = sediment.d50 > 0.002
    ? calculateBedLoadMPM(sediment, flow)
    : calculateBedLoadEinsteinBrown(sediment, flow);

  // Calculate suspended load
  const suspendedLoad = calculateSuspendedLoad(sediment, flow);

  // Total transport
  const qt = bedLoad.transportRate + suspendedLoad.transportRate;
  const Qt = bedLoad.totalTransport + suspendedLoad.totalTransport;
  const Mt = bedLoad.totalMassRate + suspendedLoad.massRate;

  // Fractions
  const bedLoadFraction = Qt > 0 ? bedLoad.totalTransport / Qt : 0;
  const suspendedFraction = Qt > 0 ? suspendedLoad.totalTransport / Qt : 0;

  // Annual load estimate
  let annualLoad: number | undefined;
  if (duration) {
    annualLoad = (Mt * duration * 3600) / 1000;  // tonnes
  }

  // Recommendations
  if (bedLoadFraction > 0.7) {
    recommendations.push('Bed load dominant - consider bed armoring');
  }
  if (suspendedFraction > 0.7) {
    recommendations.push('Suspended load dominant - consider settling basin');
  }
  if (Qt > 0) {
    recommendations.push(`Total transport: ${(Mt * 3600 / 1000).toFixed(2)} tonnes/hour`);
  }

  return {
    bedLoad,
    suspendedLoad,
    totalTransportRate: qt,
    totalVolumetric: Qt,
    totalMassRate: Mt,
    bedLoadFraction,
    suspendedFraction,
    annualLoad,
    recommendations,
  };
}

// ============================================================================
// Scour Analysis
// ============================================================================

/**
 * Calculate bridge pier scour using HEC-18 methodology
 * Reference: FHWA HEC-18 (2012)
 */
export function calculatePierScour(
  pierWidth: number,        // b (m)
  pierLength: number,       // L (m)
  pierAngle: number,        // θ (degrees) flow angle
  flow: FlowConditions,
  sediment: SedimentProperties
): ScourResult {
  const recommendations: string[] = [];

  const y = flow.depth;
  const V = flow.velocity;
  const d50 = sediment.d50;
  const d95 = sediment.d90 ? sediment.d90 * 1.2 : d50 * 2;

  // Correction factors
  // K1: Pier shape (assume round nose = 1.0)
  const K1 = 1.0;

  // K2: Flow angle correction
  const L_b = pierLength / pierWidth;
  const thetaRad = pierAngle * Math.PI / 180;
  const K2 = Math.pow(Math.cos(thetaRad) + L_b * Math.sin(thetaRad), 0.65);

  // K3: Bed condition (live-bed = 1.1, clear-water = 1.0)
  const Vc = calculateCriticalVelocity(d50, y);
  const K3 = V > Vc ? 1.1 : 1.0;

  // K4: Armoring (for d95 > 2mm)
  let K4 = 1.0;
  if (d95 > 0.002) {
    const VR = V / Vc;
    if (VR > 1) {
      K4 = 0.4 * Math.pow(VR, 0.15);
    }
  }

  // CSU equation for pier scour
  const Fr = V / Math.sqrt(GRAVITY * y);
  const ys = 2.0 * K1 * K2 * K3 * K4 * pierWidth * Math.pow(y / pierWidth, 0.35) * Math.pow(Fr, 0.43);

  // Equilibrium scour (maximum)
  const ysMax = Math.min(ys * 1.3, 2.4 * pierWidth);

  // Time to equilibrium (simplified estimate)
  const te = 24 * (ysMax / (V * 0.001));  // hours

  recommendations.push(`Pier scour depth: ${ys.toFixed(2)} m`);
  if (K3 > 1) {
    recommendations.push('Live-bed conditions - active sediment transport');
  } else {
    recommendations.push('Clear-water conditions - scour limited by transport');
  }
  if (K4 < 1) {
    recommendations.push('Armoring reduces scour');
  }

  return {
    scourDepth: ys,
    equilibriumScour: ysMax,
    contractionScour: 0,  // Calculated separately
    localScour: ys,
    totalScour: ys,
    timeToEquilibrium: te,
    scourVelocity: Vc,
    recommendations,
  };
}

/**
 * Calculate contraction scour
 * Reference: HEC-18, Laursen equations
 */
export function calculateContractionScour(
  upstreamWidth: number,    // B1 (m)
  contractedWidth: number,  // B2 (m)
  flow: FlowConditions,
  sediment: SedimentProperties
): ScourResult {
  const recommendations: string[] = [];

  const y1 = flow.depth;
  const V1 = flow.velocity;
  const Q = V1 * y1 * upstreamWidth;
  const d50 = sediment.d50;

  // Critical velocity for sediment
  const Vc = calculateCriticalVelocity(d50, y1);

  // Determine live-bed or clear-water
  const isLiveBed = V1 > Vc;

  let ys: number;

  if (isLiveBed) {
    // Laursen live-bed equation
    const y2 = y1 * Math.pow(contractedWidth / upstreamWidth, -6/7) *
               Math.pow(Q / (V1 * y1 * upstreamWidth), 6/7);
    ys = y2 - y1;
    recommendations.push('Live-bed contraction scour');
  } else {
    // Laursen clear-water equation
    const y2 = Math.pow(Q / (contractedWidth * Math.sqrt(GRAVITY) * Math.pow(d50, 1/3)), 6/7);
    ys = y2 - y1;
    recommendations.push('Clear-water contraction scour');
  }

  // Limit scour depth
  ys = Math.max(0, ys);

  recommendations.push(`Contraction ratio: ${(upstreamWidth / contractedWidth).toFixed(2)}`);
  if (ys > y1) {
    recommendations.push('Warning: Large contraction scour - consider widening');
  }

  return {
    scourDepth: ys,
    equilibriumScour: ys * 1.2,
    contractionScour: ys,
    localScour: 0,
    totalScour: ys,
    timeToEquilibrium: 48,  // Typical
    scourVelocity: Vc,
    recommendations,
  };
}

/**
 * Calculate critical velocity for sediment entrainment
 * Neill (1968) equation
 */
export function calculateCriticalVelocity(d50: number, depth: number): number {
  // Vc = Ky^(1/6) × d^(1/3)
  const K = 6.19;  // SI units
  return K * Math.pow(depth, 1 / 6) * Math.pow(d50, 1 / 3);
}

// ============================================================================
// Channel Stability
// ============================================================================

/**
 * Assess channel stability using tractive force method
 */
export function assessChannelStability(
  section: PrismaticSection,
  flow: FlowConditions,
  sediment: SedimentProperties,
  bedMaterial?: string
): ChannelStabilityResult {
  const recommendations: string[] = [];

  // Calculate actual shear stress
  const Rh = flow.hydraulicRadius || flow.depth;
  const tau0 = WATER_DENSITY * GRAVITY * Rh * flow.slope;

  // Permissible shear (from Shields or tables)
  const s = sediment.specificGravity || 2.65;
  const d50 = sediment.d50;

  // Shields-based critical shear
  const tauC = 0.047 * WATER_DENSITY * (s - 1) * GRAVITY * d50;

  // Table-based permissible values
  let tauP = tauC;
  let Vp = 1.0;

  if (bedMaterial && bedMaterial in PERMISSIBLE_VELOCITIES) {
    const perm = PERMISSIBLE_VELOCITIES[bedMaterial];
    Vp = perm.clear;
  } else {
    // Estimate from d50
    Vp = 0.5 * Math.sqrt(d50 * 1000);  // Rough estimate
  }

  // Competent velocity (to just move d50)
  const Vc = calculateCriticalVelocity(d50, flow.depth);

  // Stability ratio
  const stabilityRatio = tau0 / tauP;

  // Determine regime
  let regime: 'degrading' | 'stable' | 'aggrading';
  let isStable: boolean;

  if (stabilityRatio > 1.3) {
    regime = 'degrading';
    isStable = false;
    recommendations.push('Channel is eroding - armoring or lining needed');
  } else if (stabilityRatio < 0.7) {
    regime = 'aggrading';
    isStable = false;
    recommendations.push('Channel may aggrade - check sediment supply');
  } else {
    regime = 'stable';
    isStable = true;
    recommendations.push('Channel is stable under current conditions');
  }

  // Additional recommendations
  if (flow.velocity > Vp) {
    recommendations.push(`Velocity ${flow.velocity.toFixed(2)} m/s exceeds permissible ${Vp.toFixed(2)} m/s`);
  }
  if (flow.velocity > Vc) {
    recommendations.push('Velocity exceeds critical - active bed transport');
  }

  return {
    isStable,
    stabilityRatio,
    regime,
    permissibleVelocity: Vp,
    permissibleShear: tauP,
    actualShear: tau0,
    competentVelocity: Vc,
    recommendations,
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format Shields analysis result
 */
export function formatShieldsResult(result: ShieldsResult): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '         ANÁLISIS DE SHIELDS - MOVIMIENTO INCIPIENTE',
    '═══════════════════════════════════════════════════════',
    '',
    '--- ESFUERZOS ---',
    `  Velocidad de corte u*: ${result.shearVelocity.toFixed(4)} m/s`,
    `  Esfuerzo de corte τ₀: ${result.boundaryShearStress.toFixed(2)} N/m²`,
    `  Esfuerzo crítico τc: ${result.criticalShearStress.toFixed(2)} N/m²`,
    '',
    '--- PARÁMETROS ADIMENSIONALES ---',
    `  Shields θ: ${result.shieldsParameter.toFixed(4)}`,
    `  Shields crítico θc: ${result.criticalShieldsParameter.toFixed(4)}`,
    `  Reynolds de partícula Re*: ${result.particleReynolds.toFixed(1)}`,
    `  Relación de movilidad τ₀/τc: ${result.mobilityRatio.toFixed(2)}`,
    '',
    `--- MODO DE TRANSPORTE: ${result.transportMode.toUpperCase()} ---`,
  ];

  if (result.recommendations.length > 0) {
    lines.push('', '--- RECOMENDACIONES ---');
    result.recommendations.forEach(r => lines.push(`  • ${r}`));
  }

  lines.push('═══════════════════════════════════════════════════════');
  return lines.join('\n');
}

/**
 * Format total load result
 */
export function formatTotalLoadResult(result: TotalLoadResult): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '         ANÁLISIS DE TRANSPORTE DE SEDIMENTOS',
    '═══════════════════════════════════════════════════════',
    '',
    '--- CARGA DE FONDO ---',
    `  Método: ${result.bedLoad.method}`,
    `  Tasa volumétrica: ${(result.bedLoad.transportRate * 1e6).toFixed(2)} cm³/s/m`,
    `  Tasa másica: ${result.bedLoad.massRate.toFixed(4)} kg/s/m`,
    `  Transporte total: ${result.bedLoad.totalMassRate.toFixed(2)} kg/s`,
    '',
    '--- CARGA EN SUSPENSIÓN ---',
    `  Número de Rouse: ${result.suspendedLoad.rouseNumber.toFixed(2)}`,
    `  Modo: ${result.suspendedLoad.suspensionMode}`,
    `  Concentración media: ${(result.suspendedLoad.depthAveragedConc * 1e6).toFixed(1)} ppm`,
    `  Transporte total: ${result.suspendedLoad.massRate.toFixed(2)} kg/s`,
    '',
    '--- CARGA TOTAL ---',
    `  Transporte total: ${result.totalMassRate.toFixed(2)} kg/s`,
    `  Fracción de fondo: ${(result.bedLoadFraction * 100).toFixed(1)}%`,
    `  Fracción suspendida: ${(result.suspendedFraction * 100).toFixed(1)}%`,
  ];

  if (result.annualLoad !== undefined) {
    lines.push(`  Carga anual estimada: ${result.annualLoad.toFixed(0)} toneladas`);
  }

  if (result.recommendations.length > 0) {
    lines.push('', '--- RECOMENDACIONES ---');
    result.recommendations.forEach(r => lines.push(`  • ${r}`));
  }

  lines.push('═══════════════════════════════════════════════════════');
  return lines.join('\n');
}

/**
 * Format scour result
 */
export function formatScourResult(result: ScourResult): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '         ANÁLISIS DE SOCAVACIÓN',
    '═══════════════════════════════════════════════════════',
    '',
    '--- PROFUNDIDADES DE SOCAVACIÓN ---',
    `  Socavación local: ${result.localScour.toFixed(2)} m`,
    `  Socavación por contracción: ${result.contractionScour.toFixed(2)} m`,
    `  Socavación total: ${result.totalScour.toFixed(2)} m`,
    `  Socavación de equilibrio: ${result.equilibriumScour.toFixed(2)} m`,
    '',
    '--- PARÁMETROS ---',
    `  Velocidad crítica: ${result.scourVelocity.toFixed(2)} m/s`,
    `  Tiempo a equilibrio: ${result.timeToEquilibrium.toFixed(0)} horas`,
  ];

  if (result.recommendations.length > 0) {
    lines.push('', '--- RECOMENDACIONES ---');
    result.recommendations.forEach(r => lines.push(`  • ${r}`));
  }

  lines.push('═══════════════════════════════════════════════════════');
  return lines.join('\n');
}
