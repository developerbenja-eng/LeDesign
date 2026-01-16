/**
 * Hydraulic Structures Module - Culverts, Weirs, and Bridges
 *
 * Implements analysis methods for common hydraulic structures in open channels.
 *
 * Culverts: FHWA HDS-5 methodology (inlet/outlet control)
 * Weirs: Standard equations (broad-crested, sharp-crested, ogee, V-notch)
 * Bridges: Energy and momentum methods with pier/abutment analysis
 *
 * Based on:
 * - FHWA HDS-5: Hydraulic Design of Highway Culverts
 * - HEC-RAS Hydraulic Reference Manual (USACE)
 * - USBR Water Measurement Manual
 * - Manual de Carreteras Vol. 3 - MOP Chile
 */

import {
  IrregularCrossSection,
  calculateIrregularGeometry,
  getMinimumElevation,
  getMaximumElevation,
} from './channel-geometry';

import {
  calculateFroudeNumber,
  classifyFlowRegime,
  FlowRegime,
} from './channel-hydraulics';

// ============================================================================
// Constants
// ============================================================================

const GRAVITY = 9.81;  // m/s²

// ============================================================================
// Types - Culverts
// ============================================================================

export type CulvertShape = 'circular' | 'box' | 'arch' | 'pipe_arch' | 'elliptical';
export type CulvertMaterial = 'concrete' | 'corrugated_metal' | 'plastic' | 'aluminum' | 'steel';
export type InletType = 'projecting' | 'mitered' | 'headwall' | 'headwall_wingwall' | 'beveled';
export type CulvertControlType = 'inlet' | 'outlet';
export type CulvertFlowType = 'free_surface' | 'full_flow' | 'pressure';

export interface CulvertGeometry {
  shape: CulvertShape;
  // Circular
  diameter?: number;  // m
  // Box/Arch
  span?: number;      // m (width)
  rise?: number;      // m (height)
  // Elliptical
  majorAxis?: number;
  minorAxis?: number;
}

export interface Culvert {
  id: string;
  geometry: CulvertGeometry;
  length: number;  // m

  // Inlet configuration
  inlet: InletType;
  edgeCondition: 'square' | 'beveled' | 'rounded';

  // Material
  material: CulvertMaterial;
  manningsN: number;

  // Elevations
  invertElevationUpstream: number;   // m
  invertElevationDownstream: number; // m

  // Multiple barrels
  numberOfBarrels: number;

  // Optional features
  hasBrokenBack?: boolean;
  bendsCount?: number;
  projectionLength?: number;  // m (for projecting inlet)
}

export interface CulvertResult {
  // Control and flow type
  controlType: CulvertControlType;
  flowType: CulvertFlowType;

  // Water levels
  headwater: number;       // HW elevation (m)
  headwaterDepth: number;  // HW depth above invert (m)
  tailwater: number;       // TW elevation (m)
  tailwaterDepth: number;  // TW depth (m)

  // Flow
  flow: number;            // Q (m³/s)
  velocity: number;        // V (m/s)
  velocityHead: number;    // V²/2g (m)

  // Capacity
  hwToD: number;           // HW/D ratio
  fullFlowCapacity: number; // Q at full flow (m³/s)
  percentCapacity: number;  // Q/Qfull (%)

  // Analysis details
  inletControlHW: number;
  outletControlHW: number;
  entranceLoss: number;
  frictionLoss: number;
  exitLoss: number;

  // Performance
  performanceRating: 'acceptable' | 'marginal' | 'inadequate';
  warnings: string[];
}

// ============================================================================
// Types - Weirs
// ============================================================================

export type WeirType = 'broad_crested' | 'sharp_crested' | 'ogee' | 'v_notch' | 'trapezoidal' | 'cipolletti';

export interface Weir {
  type: WeirType;
  crestElevation: number;  // m
  crestLength: number;     // m

  // Discharge coefficient (optional - uses default if not provided)
  coefficient?: number;

  // Shape-specific parameters
  // V-notch
  notchAngle?: number;     // degrees (90° typical)

  // Trapezoidal/Cipolletti
  sideSlope?: number;      // H:V (4:1 for Cipolletti)

  // Ogee
  designHead?: number;     // Design head for ogee (m)

  // Optional corrections
  contractionsCount?: number;  // Number of end contractions (0, 1, or 2)
  velocityApproach?: boolean;  // Apply approach velocity correction
}

export interface WeirResult {
  // Flow
  flow: number;            // Q (m³/s)

  // Head
  headOnWeir: number;      // H above crest (m)
  upstreamWSEL: number;    // Water surface elevation (m)
  downstreamWSEL?: number; // TW elevation if provided (m)

  // Corrections applied
  coefficientUsed: number;
  contractionCorrection: number;
  submergenceCorrection: number;
  velocityCorrection: number;

  // Submergence
  isSubmerged: boolean;
  submergenceRatio?: number;  // Hd/H

  warnings: string[];
}

// ============================================================================
// Types - Bridges
// ============================================================================

export type BridgeFlowType = 'low_flow' | 'pressure_flow' | 'weir_flow' | 'combined';
export type BridgeMethod = 'energy' | 'momentum' | 'WSPRO' | 'pressure_weir';
export type PierShape = 'circular' | 'square' | 'pointed' | 'round_nose' | 'lens';
export type AbutmentType = 'vertical' | 'sloping' | 'spill_through' | 'wingwall';

export interface BridgePier {
  station: number;       // Location (m)
  width: number;         // Pier width (m)
  length?: number;       // Pier length in flow direction (m)
  shape: PierShape;
  noseFactor?: number;   // Pier nose shape factor
  skewAngle?: number;    // Angle to flow (degrees)
}

export interface BridgeAbutment {
  station: number;       // Location (m)
  type: AbutmentType;
  slope?: number;        // For sloping type (H:V)
  wingwallAngle?: number; // For wingwall type (degrees)
  embankmentSlope?: number;
}

export interface BridgeDeck {
  lowChordElevation: number;   // Bottom of deck (m)
  highChordElevation: number;  // Top of deck (m)
  width: number;               // Deck width (m)
  railingHeight?: number;      // Height of railing (m)
  weirCoefficient?: number;    // For overtopping flow
}

export interface Bridge {
  id: string;
  name?: string;

  // Deck geometry
  deck: BridgeDeck;

  // Piers
  piers: BridgePier[];

  // Abutments
  leftAbutment: BridgeAbutment;
  rightAbutment: BridgeAbutment;

  // Cross-sections
  upstreamSection: IrregularCrossSection;
  bridgeSection: IrregularCrossSection;
  downstreamSection: IrregularCrossSection;

  // Analysis method
  method: BridgeMethod;

  // Coefficients
  contractionCoeff?: number;
  expansionCoeff?: number;
  pierLossCoeff?: number;
}

export interface BridgeResult {
  // Flow type
  flowType: BridgeFlowType;

  // Water levels
  upstreamWSEL: number;
  downstreamWSEL: number;
  bridgeWSEL: number;

  // Backwater
  backwaterRise: number;  // Afflux (m)

  // Energy/losses
  pierLoss: number;
  contractionLoss: number;
  expansionLoss: number;
  frictionLoss: number;
  totalLoss: number;

  // Flow distribution
  bridgeOpening: {
    area: number;
    velocity: number;
    flow: number;
  };

  overtopping?: {
    flow: number;
    depth: number;
    velocity: number;
  };

  // Performance
  froudeAtBridge: number;
  flowRegime: FlowRegime;
  percentBlocked: number;

  warnings: string[];
}

// ============================================================================
// Culvert Constants - FHWA HDS-5 Coefficients
// ============================================================================

/**
 * Inlet control coefficients (FHWA HDS-5)
 * K and M values for unsubmerged inlet control equation
 */
export const INLET_CONTROL_COEFFICIENTS: Record<CulvertShape, Record<InletType, { K: number; M: number }>> = {
  circular: {
    projecting: { K: 0.0340, M: 1.50 },
    mitered: { K: 0.0300, M: 1.00 },
    headwall: { K: 0.0098, M: 2.00 },
    headwall_wingwall: { K: 0.0078, M: 2.00 },
    beveled: { K: 0.0045, M: 2.00 },
  },
  box: {
    projecting: { K: 0.0340, M: 1.50 },
    mitered: { K: 0.0300, M: 1.00 },
    headwall: { K: 0.0083, M: 2.00 },
    headwall_wingwall: { K: 0.0083, M: 2.00 },
    beveled: { K: 0.0030, M: 2.00 },
  },
  arch: {
    projecting: { K: 0.0340, M: 1.50 },
    mitered: { K: 0.0300, M: 1.00 },
    headwall: { K: 0.0083, M: 2.00 },
    headwall_wingwall: { K: 0.0083, M: 2.00 },
    beveled: { K: 0.0030, M: 2.00 },
  },
  pipe_arch: {
    projecting: { K: 0.0340, M: 1.50 },
    mitered: { K: 0.0300, M: 1.00 },
    headwall: { K: 0.0083, M: 2.00 },
    headwall_wingwall: { K: 0.0083, M: 2.00 },
    beveled: { K: 0.0030, M: 2.00 },
  },
  elliptical: {
    projecting: { K: 0.0340, M: 1.50 },
    mitered: { K: 0.0300, M: 1.00 },
    headwall: { K: 0.0083, M: 2.00 },
    headwall_wingwall: { K: 0.0083, M: 2.00 },
    beveled: { K: 0.0030, M: 2.00 },
  },
};

/**
 * Entrance loss coefficients (Ke)
 */
export const ENTRANCE_LOSS_COEFFICIENTS: Record<InletType, Record<string, number>> = {
  projecting: { square: 0.9, beveled: 0.7, rounded: 0.5 },
  mitered: { square: 0.7, beveled: 0.5, rounded: 0.4 },
  headwall: { square: 0.5, beveled: 0.2, rounded: 0.2 },
  headwall_wingwall: { square: 0.4, beveled: 0.2, rounded: 0.2 },
  beveled: { square: 0.2, beveled: 0.2, rounded: 0.2 },
};

/**
 * Default Manning's n for culvert materials
 */
export const CULVERT_MANNING_N: Record<CulvertMaterial, number> = {
  concrete: 0.012,
  corrugated_metal: 0.024,
  plastic: 0.010,
  aluminum: 0.024,
  steel: 0.012,
};

// ============================================================================
// Weir Constants
// ============================================================================

/**
 * Standard weir discharge coefficients
 */
export const WEIR_COEFFICIENTS: Record<WeirType, { min: number; typical: number; max: number }> = {
  broad_crested: { min: 1.44, typical: 1.60, max: 1.80 },
  sharp_crested: { min: 1.77, typical: 1.84, max: 1.90 },
  ogee: { min: 1.80, typical: 2.00, max: 2.20 },
  v_notch: { min: 1.35, typical: 1.40, max: 1.45 },  // For 90° notch
  trapezoidal: { min: 1.77, typical: 1.84, max: 1.90 },
  cipolletti: { min: 1.84, typical: 1.86, max: 1.88 },
};

// ============================================================================
// Bridge Constants
// ============================================================================

/**
 * Pier drag coefficients by shape
 */
export const PIER_DRAG_COEFFICIENTS: Record<PierShape, number> = {
  circular: 1.2,
  square: 2.0,
  pointed: 0.7,
  round_nose: 0.9,
  lens: 0.5,
};

/**
 * Pier shape factors (Yarnell)
 */
export const PIER_SHAPE_FACTORS: Record<PierShape, number> = {
  circular: 0.6,
  square: 1.0,
  pointed: 0.6,
  round_nose: 0.9,
  lens: 0.5,
};

// ============================================================================
// Culvert Functions
// ============================================================================

/**
 * Calculate culvert cross-sectional area
 */
export function calculateCulvertArea(geom: CulvertGeometry): number {
  switch (geom.shape) {
    case 'circular':
      return Math.PI * Math.pow(geom.diameter ?? 0, 2) / 4;

    case 'box':
      return (geom.span ?? 0) * (geom.rise ?? 0);

    case 'arch':
      // Approximate: 0.8 × span × rise
      return 0.8 * (geom.span ?? 0) * (geom.rise ?? 0);

    case 'pipe_arch':
      // Approximate based on typical pipe arch geometry
      return 0.75 * (geom.span ?? 0) * (geom.rise ?? 0);

    case 'elliptical':
      return Math.PI * (geom.majorAxis ?? 0) * (geom.minorAxis ?? 0) / 4;

    default:
      return 0;
  }
}

/**
 * Get culvert rise (height)
 */
export function getCulvertRise(geom: CulvertGeometry): number {
  switch (geom.shape) {
    case 'circular':
      return geom.diameter ?? 0;
    case 'elliptical':
      return geom.minorAxis ?? 0;
    default:
      return geom.rise ?? 0;
  }
}

/**
 * Get culvert span (width)
 */
export function getCulvertSpan(geom: CulvertGeometry): number {
  switch (geom.shape) {
    case 'circular':
      return geom.diameter ?? 0;
    case 'elliptical':
      return geom.majorAxis ?? 0;
    default:
      return geom.span ?? 0;
  }
}

/**
 * Calculate wetted perimeter for full flow
 */
export function calculateCulvertWettedPerimeter(geom: CulvertGeometry): number {
  switch (geom.shape) {
    case 'circular':
      return Math.PI * (geom.diameter ?? 0);

    case 'box':
      return 2 * ((geom.span ?? 0) + (geom.rise ?? 0));

    case 'arch':
    case 'pipe_arch':
      // Approximate
      return Math.PI * ((geom.span ?? 0) + (geom.rise ?? 0)) / 2;

    case 'elliptical':
      // Ramanujan approximation
      const a = (geom.majorAxis ?? 0) / 2;
      const b = (geom.minorAxis ?? 0) / 2;
      return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));

    default:
      return 0;
  }
}

/**
 * Calculate inlet control headwater (FHWA HDS-5)
 *
 * Unsubmerged: HW/D = Hc/D + K × (Q/(A×D^0.5))^M + 0.7×S
 * Submerged: HW/D = c × (Q/(A×D^0.5))^2 + Y + 0.7×S
 */
export function calculateInletControlHeadwater(
  culvert: Culvert,
  flow: number
): number {
  const D = getCulvertRise(culvert.geometry);
  const A = calculateCulvertArea(culvert.geometry) * culvert.numberOfBarrels;
  const slope = (culvert.invertElevationUpstream - culvert.invertElevationDownstream) / culvert.length;

  if (D <= 0 || A <= 0) return 0;

  const Q_AD = flow / (A * Math.sqrt(D));

  // Get inlet coefficients
  const coeffs = INLET_CONTROL_COEFFICIENTS[culvert.geometry.shape]?.[culvert.inlet]
    ?? { K: 0.0098, M: 2.0 };

  // Unsubmerged equation (HW/D < 1.5 approximately)
  // HW/D = Hc/D + K × (Q/(A×D^0.5))^M
  const Hc_D = 0.5;  // Approximate critical depth ratio
  const HW_D_unsubmerged = Hc_D + coeffs.K * Math.pow(Q_AD, coeffs.M) + 0.7 * slope;

  // Submerged equation (HW/D > 1.5)
  // HW/D = c × (Q/(A×D^0.5))^2 + Y - 0.5×S
  const c = 0.0398;  // Typical submerged coefficient
  const Y = 0.67;    // Typical constant
  const HW_D_submerged = c * Math.pow(Q_AD, 2) + Y + 0.7 * slope;

  // Transition at HW/D = 1.5
  let HW_D: number;
  if (HW_D_unsubmerged <= 1.2) {
    HW_D = HW_D_unsubmerged;
  } else if (HW_D_unsubmerged >= 1.8) {
    HW_D = HW_D_submerged;
  } else {
    // Linear interpolation in transition zone
    const t = (HW_D_unsubmerged - 1.2) / 0.6;
    HW_D = HW_D_unsubmerged * (1 - t) + HW_D_submerged * t;
  }

  return culvert.invertElevationUpstream + HW_D * D;
}

/**
 * Calculate outlet control headwater (FHWA HDS-5)
 *
 * HW = TW + hL  where hL = Ke×V²/2g + f×L + V²/2g
 * or
 * HW = TW + (Ke + Kf + 1) × V²/2g
 */
export function calculateOutletControlHeadwater(
  culvert: Culvert,
  flow: number,
  tailwater: number
): number {
  const A = calculateCulvertArea(culvert.geometry) * culvert.numberOfBarrels;
  const P = calculateCulvertWettedPerimeter(culvert.geometry) * culvert.numberOfBarrels;
  const D = getCulvertRise(culvert.geometry);

  if (A <= 0 || P <= 0 || D <= 0) return tailwater;

  const V = flow / A;
  const R = A / P;

  // Entrance loss coefficient
  const Ke = ENTRANCE_LOSS_COEFFICIENTS[culvert.inlet]?.[culvert.edgeCondition] ?? 0.5;

  // Friction loss coefficient (Manning)
  // Kf = 2g × n² × L / R^(4/3)
  const n = culvert.manningsN;
  const Kf = (2 * GRAVITY * n * n * culvert.length) / Math.pow(R, 4 / 3);

  // Exit loss coefficient (assume full expansion)
  const Kx = 1.0;

  // Total loss
  const velocityHead = V * V / (2 * GRAVITY);
  const totalLoss = (Ke + Kf + Kx) * velocityHead;

  // Determine outlet control water level
  // Use the higher of: critical depth at outlet or tailwater
  const criticalDepth = D * 0.63;  // Approximate for most shapes
  const outletControl = culvert.invertElevationDownstream + criticalDepth;
  const controlLevel = Math.max(tailwater, outletControl);

  return controlLevel + totalLoss;
}

/**
 * Calculate full flow capacity of culvert
 */
export function calculateCulvertFullFlowCapacity(
  culvert: Culvert,
  headwater: number,
  tailwater: number
): number {
  const A = calculateCulvertArea(culvert.geometry) * culvert.numberOfBarrels;
  const P = calculateCulvertWettedPerimeter(culvert.geometry) * culvert.numberOfBarrels;
  const R = A / P;

  const n = culvert.manningsN;
  const slope = (culvert.invertElevationUpstream - culvert.invertElevationDownstream) / culvert.length;

  // Manning equation for full flow
  return (1 / n) * A * Math.pow(R, 2 / 3) * Math.pow(Math.abs(slope), 0.5);
}

/**
 * Analyze culvert for given flow and tailwater
 */
export function analyzeCulvert(
  culvert: Culvert,
  flow: number,
  tailwater: number
): CulvertResult {
  const warnings: string[] = [];

  const D = getCulvertRise(culvert.geometry);
  const A = calculateCulvertArea(culvert.geometry) * culvert.numberOfBarrels;

  // Calculate inlet and outlet control headwaters
  const inletControlHW = calculateInletControlHeadwater(culvert, flow);
  const outletControlHW = calculateOutletControlHeadwater(culvert, flow, tailwater);

  // Controlling headwater is the higher of the two
  const headwater = Math.max(inletControlHW, outletControlHW);
  const controlType: CulvertControlType = inletControlHW >= outletControlHW ? 'inlet' : 'outlet';

  // Headwater depth
  const headwaterDepth = headwater - culvert.invertElevationUpstream;
  const hwToD = headwaterDepth / D;

  // Tailwater depth
  const tailwaterDepth = tailwater - culvert.invertElevationDownstream;

  // Determine flow type
  let flowType: CulvertFlowType;
  if (hwToD < 1.0 && tailwaterDepth < D) {
    flowType = 'free_surface';
  } else if (hwToD >= 1.0 && tailwaterDepth >= D) {
    flowType = 'pressure';
  } else {
    flowType = 'full_flow';
  }

  // Velocity
  const velocity = A > 0 ? flow / A : 0;
  const velocityHead = velocity * velocity / (2 * GRAVITY);

  // Full flow capacity
  const fullFlowCapacity = calculateCulvertFullFlowCapacity(culvert, headwater, tailwater);
  const percentCapacity = fullFlowCapacity > 0 ? (flow / fullFlowCapacity) * 100 : 0;

  // Losses breakdown
  const Ke = ENTRANCE_LOSS_COEFFICIENTS[culvert.inlet]?.[culvert.edgeCondition] ?? 0.5;
  const entranceLoss = Ke * velocityHead;

  const P = calculateCulvertWettedPerimeter(culvert.geometry) * culvert.numberOfBarrels;
  const R = P > 0 ? A / P : 0;
  const frictionLoss = R > 0
    ? (2 * GRAVITY * culvert.manningsN * culvert.manningsN * culvert.length * velocityHead) / Math.pow(R, 4 / 3)
    : 0;

  const exitLoss = velocityHead;  // Full expansion

  // Performance rating
  let performanceRating: 'acceptable' | 'marginal' | 'inadequate';
  if (hwToD <= 1.2) {
    performanceRating = 'acceptable';
  } else if (hwToD <= 1.5) {
    performanceRating = 'marginal';
  } else {
    performanceRating = 'inadequate';
  }

  // Warnings
  if (hwToD > 1.5) {
    warnings.push(`High headwater: HW/D = ${hwToD.toFixed(2)} > 1.5`);
  }
  if (velocity > 6.0) {
    warnings.push(`High velocity: ${velocity.toFixed(2)} m/s - potential scour`);
  }
  if (controlType === 'inlet' && hwToD > 1.2) {
    warnings.push('Inlet control with submerged inlet - consider improving inlet');
  }
  if (flowType === 'pressure') {
    warnings.push('Pressure flow - verify structural adequacy');
  }

  return {
    controlType,
    flowType,
    headwater,
    headwaterDepth,
    tailwater,
    tailwaterDepth,
    flow,
    velocity,
    velocityHead,
    hwToD,
    fullFlowCapacity,
    percentCapacity,
    inletControlHW,
    outletControlHW,
    entranceLoss,
    frictionLoss,
    exitLoss,
    performanceRating,
    warnings,
  };
}

/**
 * Size culvert for given flow and allowable headwater
 */
export function sizeCulvert(
  flow: number,
  maxHeadwater: number,
  invertUpstream: number,
  invertDownstream: number,
  length: number,
  tailwater: number,
  shape: CulvertShape = 'circular',
  material: CulvertMaterial = 'concrete'
): { size: number; result: CulvertResult } {
  // Standard culvert sizes (m)
  const standardSizes = shape === 'circular'
    ? [0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1.0, 1.2, 1.5, 1.8, 2.0, 2.4, 3.0]
    : [0.3, 0.45, 0.6, 0.75, 0.9, 1.0, 1.2, 1.5, 1.8, 2.0, 2.4, 3.0];

  for (const size of standardSizes) {
    const culvert: Culvert = {
      id: 'sizing',
      geometry: shape === 'circular'
        ? { shape, diameter: size }
        : { shape, span: size * 1.5, rise: size },
      length,
      inlet: 'headwall',
      edgeCondition: 'square',
      material,
      manningsN: CULVERT_MANNING_N[material],
      invertElevationUpstream: invertUpstream,
      invertElevationDownstream: invertDownstream,
      numberOfBarrels: 1,
    };

    const result = analyzeCulvert(culvert, flow, tailwater);

    if (result.headwater <= maxHeadwater) {
      return { size, result };
    }
  }

  // If no single culvert works, try multiple barrels with largest size
  const maxSize = standardSizes[standardSizes.length - 1];
  for (let barrels = 2; barrels <= 4; barrels++) {
    const culvert: Culvert = {
      id: 'sizing',
      geometry: shape === 'circular'
        ? { shape, diameter: maxSize }
        : { shape, span: maxSize * 1.5, rise: maxSize },
      length,
      inlet: 'headwall',
      edgeCondition: 'square',
      material,
      manningsN: CULVERT_MANNING_N[material],
      invertElevationUpstream: invertUpstream,
      invertElevationDownstream: invertDownstream,
      numberOfBarrels: barrels,
    };

    const result = analyzeCulvert(culvert, flow, tailwater);

    if (result.headwater <= maxHeadwater) {
      return { size: maxSize, result };
    }
  }

  // Return largest size with warning
  const culvert: Culvert = {
    id: 'sizing',
    geometry: shape === 'circular'
      ? { shape, diameter: maxSize }
      : { shape, span: maxSize * 1.5, rise: maxSize },
    length,
    inlet: 'headwall',
    edgeCondition: 'square',
    material,
    manningsN: CULVERT_MANNING_N[material],
    invertElevationUpstream: invertUpstream,
    invertElevationDownstream: invertDownstream,
    numberOfBarrels: 4,
  };

  const result = analyzeCulvert(culvert, flow, tailwater);
  result.warnings.push('Could not meet headwater requirement with standard sizes');

  return { size: maxSize, result };
}

// ============================================================================
// Weir Functions
// ============================================================================

/**
 * Get default weir coefficient
 */
function getWeirCoefficient(weir: Weir): number {
  if (weir.coefficient !== undefined) {
    return weir.coefficient;
  }
  return WEIR_COEFFICIENTS[weir.type]?.typical ?? 1.84;
}

/**
 * Calculate weir flow using standard equations
 *
 * Rectangular: Q = C × L × H^1.5
 * V-notch: Q = C × tan(θ/2) × H^2.5
 * Trapezoidal: Q = C × (L + 0.4×H×z) × H^1.5
 */
export function calculateWeirFlow(
  weir: Weir,
  head: number,
  tailwater?: number
): WeirResult {
  const warnings: string[] = [];

  if (head <= 0) {
    return {
      flow: 0,
      headOnWeir: 0,
      upstreamWSEL: weir.crestElevation,
      coefficientUsed: 0,
      contractionCorrection: 1,
      submergenceCorrection: 1,
      velocityCorrection: 1,
      isSubmerged: false,
      warnings: [],
    };
  }

  const C = getWeirCoefficient(weir);
  let flow: number;
  let contractionCorrection = 1.0;
  let velocityCorrection = 1.0;

  switch (weir.type) {
    case 'v_notch': {
      // Q = C × tan(θ/2) × H^2.5
      const theta = (weir.notchAngle ?? 90) * Math.PI / 180;
      flow = C * Math.tan(theta / 2) * Math.pow(head, 2.5);
      break;
    }

    case 'trapezoidal':
    case 'cipolletti': {
      // Q = C × (L + k×H) × H^1.5
      // Cipolletti uses z = 0.25 (1H:4V) to eliminate end contractions
      const z = weir.type === 'cipolletti' ? 0.25 : (weir.sideSlope ?? 0.25);
      const effectiveLength = weir.crestLength + 2 * z * head;
      flow = C * effectiveLength * Math.pow(head, 1.5);
      break;
    }

    default: {
      // Rectangular weirs: Q = C × L × H^1.5
      let effectiveLength = weir.crestLength;

      // Apply end contraction correction (Francis formula)
      if (weir.contractionsCount !== undefined && weir.contractionsCount > 0) {
        contractionCorrection = 1 - 0.1 * weir.contractionsCount * head / weir.crestLength;
        effectiveLength *= contractionCorrection;
      }

      flow = C * effectiveLength * Math.pow(head, 1.5);
    }
  }

  // Check for submergence
  let submergenceCorrection = 1.0;
  let isSubmerged = false;
  let submergenceRatio: number | undefined;

  if (tailwater !== undefined && tailwater > weir.crestElevation) {
    const Hd = tailwater - weir.crestElevation;  // Downstream head
    submergenceRatio = Hd / head;

    if (submergenceRatio > 0.7) {
      isSubmerged = true;

      // Villemonte submergence correction
      // Qs/Q = (1 - (Hd/H)^n)^0.385  where n ≈ 1.5
      submergenceCorrection = Math.pow(1 - Math.pow(submergenceRatio, 1.5), 0.385);
      flow *= submergenceCorrection;

      warnings.push(`Submerged weir: Hd/H = ${submergenceRatio.toFixed(2)}`);
    }
  }

  // Apply velocity of approach correction if requested
  if (weir.velocityApproach) {
    // Simplified: increase head by 1.1% per 0.1 m/s approach velocity
    // More accurate methods would iterate on approach velocity
    velocityCorrection = 1.02;  // Typical adjustment
    flow *= velocityCorrection;
  }

  return {
    flow,
    headOnWeir: head,
    upstreamWSEL: weir.crestElevation + head,
    downstreamWSEL: tailwater,
    coefficientUsed: C,
    contractionCorrection,
    submergenceCorrection,
    velocityCorrection,
    isSubmerged,
    submergenceRatio,
    warnings,
  };
}

/**
 * Calculate required head for given flow over weir
 */
export function calculateWeirHead(
  weir: Weir,
  flow: number,
  tailwater?: number
): number {
  if (flow <= 0) return 0;

  const C = getWeirCoefficient(weir);

  // Initial estimate (without submergence)
  let head: number;

  switch (weir.type) {
    case 'v_notch': {
      const theta = (weir.notchAngle ?? 90) * Math.PI / 180;
      head = Math.pow(flow / (C * Math.tan(theta / 2)), 1 / 2.5);
      break;
    }

    default: {
      // Rectangular/trapezoidal
      head = Math.pow(flow / (C * weir.crestLength), 1 / 1.5);
    }
  }

  // Iterate if submerged
  if (tailwater !== undefined && tailwater > weir.crestElevation) {
    for (let i = 0; i < 20; i++) {
      const result = calculateWeirFlow(weir, head, tailwater);
      if (Math.abs(result.flow - flow) / flow < 0.001) break;

      // Adjust head
      head *= Math.pow(flow / result.flow, 1 / 1.5);
    }
  }

  return head;
}

// ============================================================================
// Bridge Functions
// ============================================================================

/**
 * Calculate bridge opening area (accounting for piers)
 */
export function calculateBridgeOpeningArea(
  bridge: Bridge,
  wsel: number
): number {
  const deck = bridge.deck;

  // Water level must be below low chord for opening flow
  if (wsel >= deck.lowChordElevation) {
    return 0;  // Pressure flow condition
  }

  // Get bridge section geometry
  const geom = calculateIrregularGeometry(bridge.bridgeSection, wsel);

  // Subtract pier areas
  let pierArea = 0;
  for (const pier of bridge.piers) {
    const pierDepth = Math.max(0, wsel - getMinimumElevation(bridge.bridgeSection));
    pierArea += pier.width * pierDepth;
  }

  return Math.max(0, geom.totalArea - pierArea);
}

/**
 * Calculate pier head loss using Yarnell equation
 *
 * ΔH = K × Fr² × (K + 5×Fr² - 0.6) × (w + 15×w⁴)
 * where w = ratio of pier width to channel width
 */
export function calculatePierLoss(
  piers: BridgePier[],
  velocity: number,
  channelWidth: number,
  depth: number
): number {
  if (piers.length === 0 || velocity <= 0 || channelWidth <= 0 || depth <= 0) {
    return 0;
  }

  // Total pier width
  const totalPierWidth = piers.reduce((sum, p) => sum + p.width, 0);
  const w = totalPierWidth / channelWidth;

  // Average pier shape factor
  const avgShapeFactor = piers.reduce((sum, p) =>
    sum + (PIER_SHAPE_FACTORS[p.shape] ?? 0.9), 0) / piers.length;

  // Froude number squared
  const Fr2 = velocity * velocity / (GRAVITY * depth);

  // Yarnell equation
  const K = avgShapeFactor;
  const term1 = K + 5 * Fr2 - 0.6;
  const term2 = w + 15 * Math.pow(w, 4);

  const deltaH = K * Fr2 * term1 * term2 * depth;

  return Math.max(0, deltaH);
}

/**
 * Calculate pressure flow through bridge opening
 *
 * Q = C × A × sqrt(2g × (HW - Z))
 * where Z is the centroid of the opening
 */
export function calculatePressureFlow(
  bridge: Bridge,
  headwater: number
): number {
  const deck = bridge.deck;

  // Opening dimensions
  const minElev = getMinimumElevation(bridge.bridgeSection);
  const openingHeight = deck.lowChordElevation - minElev;
  const openingCentroid = minElev + openingHeight / 2;

  // Approximate opening width (excluding piers)
  const geom = calculateIrregularGeometry(bridge.bridgeSection, deck.lowChordElevation);
  const totalPierWidth = bridge.piers.reduce((sum, p) => sum + p.width, 0);
  const netWidth = geom.totalTopWidth - totalPierWidth;

  // Net opening area
  const netArea = netWidth * openingHeight;

  // Orifice coefficient (typical 0.8)
  const C = 0.8;

  // Pressure head
  const pressureHead = headwater - openingCentroid;

  if (pressureHead <= 0) return 0;

  return C * netArea * Math.sqrt(2 * GRAVITY * pressureHead);
}

/**
 * Calculate weir flow over bridge deck
 */
export function calculateDeckOvertoppingFlow(
  bridge: Bridge,
  headwater: number
): { flow: number; depth: number; velocity: number } {
  const deck = bridge.deck;

  // Head above deck
  const head = headwater - deck.highChordElevation;

  if (head <= 0) {
    return { flow: 0, depth: 0, velocity: 0 };
  }

  // Deck acts as broad-crested weir
  const C = deck.weirCoefficient ?? 1.5;  // Typical for road deck

  // Flow per unit width
  const q = C * Math.pow(head, 1.5);
  const flow = q * deck.width;

  // Critical depth on deck
  const depth = (2 / 3) * head;
  const velocity = q / depth;

  return { flow, depth, velocity };
}

/**
 * Analyze bridge for given flow and downstream conditions
 */
export function analyzeBridge(
  bridge: Bridge,
  flow: number,
  downstreamWSEL: number
): BridgeResult {
  const warnings: string[] = [];
  const deck = bridge.deck;

  // Calculate geometry at downstream section
  const dsGeom = calculateIrregularGeometry(bridge.downstreamSection, downstreamWSEL);
  const dsVelocity = dsGeom.totalArea > 0 ? flow / dsGeom.totalArea : 0;
  const dsVelocityHead = dsVelocity * dsVelocity / (2 * GRAVITY);

  // Initial upstream WSEL estimate (energy equation)
  let upstreamWSEL = downstreamWSEL + dsVelocityHead * 0.5;  // Initial guess

  // Iterate to solve energy equation through bridge
  for (let iter = 0; iter < 50; iter++) {
    // Calculate bridge opening area
    const bridgeArea = calculateBridgeOpeningArea(bridge, upstreamWSEL);
    const bridgeVelocity = bridgeArea > 0 ? flow / bridgeArea : 0;
    const bridgeVelocityHead = bridgeVelocity * bridgeVelocity / (2 * GRAVITY);

    // Calculate losses
    const usGeom = calculateIrregularGeometry(bridge.upstreamSection, upstreamWSEL);

    // Contraction loss
    const Cc = bridge.contractionCoeff ?? 0.1;
    const contractionLoss = Cc * Math.abs(bridgeVelocityHead - dsVelocityHead);

    // Pier loss
    const channelWidth = dsGeom.totalTopWidth;
    const dsDepth = downstreamWSEL - getMinimumElevation(bridge.downstreamSection);
    const pierLoss = calculatePierLoss(bridge.piers, bridgeVelocity, channelWidth, dsDepth);

    // Friction loss (through bridge)
    const bridgeGeom = calculateIrregularGeometry(bridge.bridgeSection, upstreamWSEL);
    const bridgeLength = bridge.upstreamSection.reachLengths.mainChannel / 2 +
                         bridge.downstreamSection.reachLengths.mainChannel / 2;
    const avgK = (usGeom.totalConveyance + bridgeGeom.totalConveyance + dsGeom.totalConveyance) / 3;
    const Sf = avgK > 0 ? Math.pow(flow / avgK, 2) : 0;
    const frictionLoss = Sf * bridgeLength;

    // Expansion loss (downstream of bridge)
    const Ce = bridge.expansionCoeff ?? 0.5;
    const expansionLoss = Ce * Math.abs(dsVelocityHead - bridgeVelocityHead);

    // Total loss
    const totalLoss = contractionLoss + pierLoss + frictionLoss + expansionLoss;

    // Energy equation: US_WSEL + US_VH = DS_WSEL + DS_VH + losses
    const usVelocity = usGeom.totalArea > 0 ? flow / usGeom.totalArea : 0;
    const usVelocityHead = usVelocity * usVelocity / (2 * GRAVITY);

    const requiredUSWSEL = downstreamWSEL + dsVelocityHead + totalLoss - usVelocityHead;

    const error = Math.abs(upstreamWSEL - requiredUSWSEL);
    if (error < 0.001) break;

    upstreamWSEL = requiredUSWSEL;
  }

  // Determine flow type
  let flowType: BridgeFlowType = 'low_flow';
  let overtoppingFlow = { flow: 0, depth: 0, velocity: 0 };
  let bridgeFlow = flow;

  if (upstreamWSEL >= deck.lowChordElevation) {
    flowType = 'pressure_flow';
    warnings.push('Pressure flow through bridge opening');
  }

  if (upstreamWSEL >= deck.highChordElevation) {
    overtoppingFlow = calculateDeckOvertoppingFlow(bridge, upstreamWSEL);
    if (overtoppingFlow.flow > 0) {
      flowType = flowType === 'pressure_flow' ? 'combined' : 'weir_flow';
      bridgeFlow = flow - overtoppingFlow.flow;
      warnings.push(`Deck overtopping: ${overtoppingFlow.flow.toFixed(2)} m³/s`);
    }
  }

  // Final calculations
  const bridgeArea = calculateBridgeOpeningArea(bridge, upstreamWSEL);
  const bridgeVelocity = bridgeArea > 0 ? bridgeFlow / bridgeArea : 0;
  const bridgeVelocityHead = bridgeVelocity * bridgeVelocity / (2 * GRAVITY);
  const bridgeWSEL = upstreamWSEL - bridgeVelocityHead * 0.3;  // Approximate

  // Froude at bridge
  const bridgeDepth = bridgeWSEL - getMinimumElevation(bridge.bridgeSection);
  const bridgeFr = calculateFroudeNumber(bridgeVelocity, bridgeDepth);

  // Percent blocked by piers
  const totalPierWidth = bridge.piers.reduce((sum, p) => sum + p.width, 0);
  const bridgeGeom = calculateIrregularGeometry(bridge.bridgeSection, bridgeWSEL);
  const percentBlocked = bridgeGeom.totalTopWidth > 0
    ? (totalPierWidth / bridgeGeom.totalTopWidth) * 100
    : 0;

  // Backwater rise
  const backwaterRise = upstreamWSEL - downstreamWSEL;

  // Recalculate losses for output
  const dsDepth = downstreamWSEL - getMinimumElevation(bridge.downstreamSection);
  const pierLoss = calculatePierLoss(bridge.piers, bridgeVelocity, dsGeom.totalTopWidth, dsDepth);
  const Cc = bridge.contractionCoeff ?? 0.1;
  const contractionLoss = Cc * bridgeVelocityHead;
  const Ce = bridge.expansionCoeff ?? 0.5;
  const expansionLoss = Ce * dsVelocityHead;
  const avgK = (dsGeom.totalConveyance + bridgeGeom.totalConveyance) / 2;
  const Sf = avgK > 0 ? Math.pow(flow / avgK, 2) : 0;
  const frictionLoss = Sf * bridge.downstreamSection.reachLengths.mainChannel;
  const totalLoss = pierLoss + contractionLoss + expansionLoss + frictionLoss;

  // Warnings
  if (bridgeFr > 0.8) {
    warnings.push(`Near-critical flow at bridge: Fr = ${bridgeFr.toFixed(2)}`);
  }
  if (percentBlocked > 20) {
    warnings.push(`High pier blockage: ${percentBlocked.toFixed(1)}%`);
  }
  if (backwaterRise > 0.5) {
    warnings.push(`Significant backwater: ${(backwaterRise * 100).toFixed(1)} cm`);
  }

  return {
    flowType,
    upstreamWSEL,
    downstreamWSEL,
    bridgeWSEL,
    backwaterRise,
    pierLoss,
    contractionLoss,
    expansionLoss,
    frictionLoss,
    totalLoss,
    bridgeOpening: {
      area: bridgeArea,
      velocity: bridgeVelocity,
      flow: bridgeFlow,
    },
    overtopping: overtoppingFlow.flow > 0 ? overtoppingFlow : undefined,
    froudeAtBridge: bridgeFr,
    flowRegime: classifyFlowRegime(bridgeFr),
    percentBlocked,
    warnings,
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format culvert result for display
 */
export function formatCulvertResult(result: CulvertResult): string {
  const lines = [
    '═══ ANÁLISIS DE ALCANTARILLA ═══',
    '',
    `Control: ${result.controlType === 'inlet' ? 'Entrada' : 'Salida'}`,
    `Tipo de Flujo: ${result.flowType}`,
    '',
    '--- NIVELES ---',
    `Nivel Aguas Arriba: ${result.headwater.toFixed(3)} m`,
    `Profundidad HW: ${result.headwaterDepth.toFixed(3)} m`,
    `HW/D: ${result.hwToD.toFixed(2)}`,
    `Nivel Aguas Abajo: ${result.tailwater.toFixed(3)} m`,
    '',
    '--- FLUJO ---',
    `Caudal: ${result.flow.toFixed(3)} m³/s`,
    `Velocidad: ${result.velocity.toFixed(2)} m/s`,
    `Capacidad Tubo Lleno: ${result.fullFlowCapacity.toFixed(3)} m³/s`,
    `% Capacidad: ${result.percentCapacity.toFixed(1)}%`,
    '',
    '--- PÉRDIDAS ---',
    `Entrada: ${result.entranceLoss.toFixed(3)} m`,
    `Fricción: ${result.frictionLoss.toFixed(3)} m`,
    `Salida: ${result.exitLoss.toFixed(3)} m`,
    '',
    `Rendimiento: ${result.performanceRating}`,
  ];

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  return lines.join('\n');
}

/**
 * Format weir result for display
 */
export function formatWeirResult(result: WeirResult): string {
  const lines = [
    '═══ ANÁLISIS DE VERTEDERO ═══',
    '',
    `Caudal: ${result.flow.toFixed(3)} m³/s`,
    `Carga sobre vertedero: ${result.headOnWeir.toFixed(3)} m`,
    `WSEL Aguas Arriba: ${result.upstreamWSEL.toFixed(3)} m`,
    '',
    '--- COEFICIENTES ---',
    `Cd usado: ${result.coefficientUsed.toFixed(3)}`,
    `Corrección contracción: ${result.contractionCorrection.toFixed(3)}`,
    `Corrección sumersión: ${result.submergenceCorrection.toFixed(3)}`,
    '',
    `Sumergido: ${result.isSubmerged ? 'Sí' : 'No'}`,
  ];

  if (result.submergenceRatio !== undefined) {
    lines.push(`Relación Hd/H: ${result.submergenceRatio.toFixed(3)}`);
  }

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  return lines.join('\n');
}

/**
 * Format bridge result for display
 */
export function formatBridgeResult(result: BridgeResult): string {
  const lines = [
    '═══ ANÁLISIS DE PUENTE ═══',
    '',
    `Tipo de Flujo: ${result.flowType}`,
    '',
    '--- NIVELES ---',
    `WSEL Aguas Arriba: ${result.upstreamWSEL.toFixed(3)} m`,
    `WSEL en Puente: ${result.bridgeWSEL.toFixed(3)} m`,
    `WSEL Aguas Abajo: ${result.downstreamWSEL.toFixed(3)} m`,
    `Remanso: ${(result.backwaterRise * 100).toFixed(1)} cm`,
    '',
    '--- ABERTURA ---',
    `Área: ${result.bridgeOpening.area.toFixed(2)} m²`,
    `Velocidad: ${result.bridgeOpening.velocity.toFixed(2)} m/s`,
    `Caudal: ${result.bridgeOpening.flow.toFixed(3)} m³/s`,
    '',
    '--- PÉRDIDAS ---',
    `Pilas: ${result.pierLoss.toFixed(3)} m`,
    `Contracción: ${result.contractionLoss.toFixed(3)} m`,
    `Expansión: ${result.expansionLoss.toFixed(3)} m`,
    `Fricción: ${result.frictionLoss.toFixed(3)} m`,
    `Total: ${result.totalLoss.toFixed(3)} m`,
    '',
    '--- RÉGIMEN ---',
    `Froude en puente: ${result.froudeAtBridge.toFixed(3)}`,
    `Régimen: ${result.flowRegime}`,
    `% Bloqueo por pilas: ${result.percentBlocked.toFixed(1)}%`,
  ];

  if (result.overtopping) {
    lines.push(
      '',
      '--- SOBREPASO ---',
      `Caudal: ${result.overtopping.flow.toFixed(3)} m³/s`,
      `Profundidad: ${result.overtopping.depth.toFixed(3)} m`,
      `Velocidad: ${result.overtopping.velocity.toFixed(2)} m/s`
    );
  }

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  return lines.join('\n');
}
