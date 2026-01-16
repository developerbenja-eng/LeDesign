/**
 * Foundation Design Module
 *
 * Implements foundation design per:
 * - ACI 318-19 (Concrete foundations)
 * - ASCE 7-22 (Load combinations)
 * - Various geotechnical methods (Terzaghi, Meyerhof, Vesic)
 */

import {
  DesignResult,
  DesignMessage,
  DesignStatus,
} from './types';
import { generateDesignResultId } from '../factories';

// ============================================================
// RESISTANCE FACTORS
// ============================================================

const PHI_BEARING = 0.55;          // Bearing capacity (geotechnical)
const PHI_SLIDING = 0.80;          // Sliding resistance
const PHI_OVERTURNING = 0.67;      // Overturning (eccentricity)
const PHI_FLEXURE = 0.90;          // Concrete flexure
const PHI_SHEAR = 0.75;            // Concrete shear

// ============================================================
// SOIL PROPERTIES
// ============================================================

export interface SoilProperties {
  type: 'cohesive' | 'granular' | 'rock';
  gamma: number;          // Unit weight (kN/m³)
  gamma_sat?: number;     // Saturated unit weight (kN/m³)
  phi: number;            // Friction angle (degrees)
  c: number;              // Cohesion (kPa)
  qu?: number;            // Unconfined compressive strength (kPa)
  N_SPT?: number;         // SPT blow count
  qall?: number;          // Allowable bearing pressure (kPa)
}

// Typical soil properties
export const SOIL_TYPES: Record<string, SoilProperties> = {
  'soft_clay': {
    type: 'cohesive',
    gamma: 17,
    phi: 0,
    c: 25,
    qu: 50,
    qall: 75,
  },
  'medium_clay': {
    type: 'cohesive',
    gamma: 18,
    phi: 0,
    c: 50,
    qu: 100,
    qall: 150,
  },
  'stiff_clay': {
    type: 'cohesive',
    gamma: 19,
    phi: 0,
    c: 100,
    qu: 200,
    qall: 300,
  },
  'loose_sand': {
    type: 'granular',
    gamma: 16,
    phi: 28,
    c: 0,
    N_SPT: 10,
    qall: 100,
  },
  'medium_sand': {
    type: 'granular',
    gamma: 18,
    phi: 32,
    c: 0,
    N_SPT: 20,
    qall: 200,
  },
  'dense_sand': {
    type: 'granular',
    gamma: 20,
    phi: 38,
    c: 0,
    N_SPT: 40,
    qall: 400,
  },
  'gravel': {
    type: 'granular',
    gamma: 21,
    phi: 40,
    c: 0,
    N_SPT: 50,
    qall: 500,
  },
  'rock': {
    type: 'rock',
    gamma: 25,
    phi: 45,
    c: 500,
    qall: 2000,
  },
};

// ============================================================
// BEARING CAPACITY FACTORS (Terzaghi)
// ============================================================

/**
 * Calculate Terzaghi bearing capacity factors
 */
export function calculateTerzaghiFactors(phi: number): { Nc: number; Nq: number; Ngamma: number } {
  const phiRad = phi * Math.PI / 180;

  // Nq factor
  const Nq = Math.exp(Math.PI * Math.tan(phiRad)) * Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2);

  // Nc factor
  const Nc = phi === 0 ? 5.7 : (Nq - 1) / Math.tan(phiRad);

  // Ngamma factor (various approximations exist)
  const Ngamma = 2 * (Nq + 1) * Math.tan(phiRad);

  return { Nc, Nq, Ngamma };
}

/**
 * Calculate Meyerhof bearing capacity factors
 */
export function calculateMeyerhofFactors(phi: number): { Nc: number; Nq: number; Ngamma: number } {
  const phiRad = phi * Math.PI / 180;

  const Nq = Math.exp(Math.PI * Math.tan(phiRad)) * Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2);
  const Nc = phi === 0 ? 5.14 : (Nq - 1) / Math.tan(phiRad);
  const Ngamma = (Nq - 1) * Math.tan(1.4 * phiRad);

  return { Nc, Nq, Ngamma };
}

// ============================================================
// SHALLOW FOUNDATION DESIGN
// ============================================================

export interface SpreadFootingInput {
  // Geometry
  B: number;              // Width (m)
  L: number;              // Length (m)
  D: number;              // Embedment depth (m)
  t: number;              // Footing thickness (m)

  // Soil
  soil: SoilProperties;

  // Water table
  Dw?: number;            // Depth to water table (m)

  // Loads (at footing top)
  P: number;              // Vertical load (kN)
  Mx: number;             // Moment about x-axis (kN·m)
  My: number;             // Moment about y-axis (kN·m)
  Hx: number;             // Horizontal load in x (kN)
  Hy: number;             // Horizontal load in y (kN)

  // Concrete
  fc: number;             // Concrete strength (MPa)
  fy: number;             // Rebar yield strength (MPa)
  cover: number;          // Clear cover (mm)
}

export interface BearingCapacityResult {
  qu: number;             // Ultimate bearing capacity (kPa)
  qall: number;           // Allowable bearing capacity (kPa)
  qmax: number;           // Maximum applied pressure (kPa)
  qmin: number;           // Minimum applied pressure (kPa)
  dcRatio: number;
  passed: boolean;
  method: string;
}

/**
 * Calculate bearing capacity using Terzaghi's equation
 */
export function calculateBearingCapacityTerzaghi(
  B: number,              // Width (m)
  L: number,              // Length (m)
  D: number,              // Embedment depth (m)
  soil: SoilProperties,
  Dw?: number             // Water table depth (m)
): BearingCapacityResult {
  const { Nc, Nq, Ngamma } = calculateTerzaghiFactors(soil.phi);

  // Effective unit weight (consider water table)
  let gamma_eff = soil.gamma;
  if (Dw !== undefined && Dw < D + B) {
    const gamma_w = 9.81; // kN/m³
    if (Dw <= D) {
      gamma_eff = (soil.gamma_sat || soil.gamma + 2) - gamma_w;
    } else {
      // Partial submergence
      gamma_eff = soil.gamma - gamma_w * (D + B - Dw) / B;
    }
  }

  // Shape factors (for rectangular footing)
  const sc = 1 + 0.3 * (B / L);
  const sq = 1;
  const sgamma = 1 - 0.4 * (B / L);

  // Ultimate bearing capacity
  const qu = soil.c * Nc * sc + soil.gamma * D * Nq * sq + 0.5 * gamma_eff * B * Ngamma * sgamma;

  // Allowable with factor of safety
  const FS = 3.0;
  const qall = qu / FS;

  return {
    qu,
    qall,
    qmax: 0, // To be calculated with loads
    qmin: 0,
    dcRatio: 0,
    passed: true,
    method: 'Terzaghi',
  };
}

/**
 * Calculate footing pressure distribution with eccentricity
 */
export function calculateFootingPressure(
  P: number,              // Vertical load (kN)
  Mx: number,             // Moment about x-axis (kN·m)
  My: number,             // Moment about y-axis (kN·m)
  B: number,              // Width (m)
  L: number,              // Length (m)
  t: number,              // Thickness (m)
  gamma_c: number = 24    // Concrete unit weight (kN/m³)
): { qmax: number; qmin: number; ex: number; ey: number; isFullContact: boolean } {
  // Self weight of footing
  const W = B * L * t * gamma_c;
  const P_total = P + W;

  // Eccentricity
  const ex = My / P_total;
  const ey = Mx / P_total;

  // Section moduli
  const Sx = L * B * B / 6;
  const Sy = B * L * L / 6;

  // Check if full contact (kern rule)
  const isFullContact = (Math.abs(ex) <= B / 6) && (Math.abs(ey) <= L / 6);

  // Pressure distribution
  const q_avg = P_total / (B * L);
  const qmax = q_avg * (1 + 6 * Math.abs(ex) / B + 6 * Math.abs(ey) / L);
  const qmin = q_avg * (1 - 6 * Math.abs(ex) / B - 6 * Math.abs(ey) / L);

  return {
    qmax,
    qmin: Math.max(qmin, 0), // No tension
    ex,
    ey,
    isFullContact,
  };
}

/**
 * Check sliding resistance
 */
export function checkSlidingResistance(
  P: number,              // Vertical load (kN)
  Hx: number,             // Horizontal load x (kN)
  Hy: number,             // Horizontal load y (kN)
  B: number,              // Width (m)
  L: number,              // Length (m)
  soil: SoilProperties,
  Pp?: number             // Passive resistance (kN)
): { H_total: number; resistance: number; dcRatio: number; passed: boolean } {
  const H_total = Math.sqrt(Hx * Hx + Hy * Hy);

  // Sliding resistance
  const phiRad = soil.phi * Math.PI / 180;
  const mu = Math.tan(phiRad * 2 / 3); // Reduced friction coefficient

  // Base adhesion (for cohesive soils)
  const ca = 0.5 * soil.c;

  // Total resistance
  const resistance = P * mu + ca * B * L + (Pp || 0);

  const dcRatio = H_total / (PHI_SLIDING * resistance);

  return {
    H_total,
    resistance,
    dcRatio,
    passed: dcRatio <= 1.0,
  };
}

/**
 * Check overturning stability
 */
export function checkOverturning(
  P: number,              // Vertical load (kN)
  Mx: number,             // Overturning moment x (kN·m)
  My: number,             // Overturning moment y (kN·m)
  B: number,              // Width (m)
  L: number               // Length (m)
): { M_overturning: number; M_resisting: number; dcRatio: number; passed: boolean } {
  const M_overturning = Math.sqrt(Mx * Mx + My * My);
  const M_resisting = P * Math.min(B, L) / 2;

  const dcRatio = M_overturning / (PHI_OVERTURNING * M_resisting);

  return {
    M_overturning,
    M_resisting,
    dcRatio,
    passed: dcRatio <= 1.0,
  };
}

// ============================================================
// STRUCTURAL DESIGN (ACI 318)
// ============================================================

/**
 * Calculate flexural reinforcement for footing
 */
export function calculateFootingFlexure(
  qnet: number,           // Net soil pressure (kPa)
  B: number,              // Width (m)
  L: number,              // Length (m)
  d: number,              // Effective depth (mm)
  fc: number,             // Concrete strength (MPa)
  fy: number,             // Steel yield strength (MPa)
  columnWidth: number     // Column width (m)
): { Mu: number; As_req: number; As_min: number; bar_size: string; spacing: number } {
  // Cantilever length
  const lc = (B - columnWidth) / 2;

  // Factored moment per meter width
  const wu = qnet * 1.0; // kPa = kN/m² per m width
  const Mu = wu * lc * lc / 2; // kN·m per m

  // Required reinforcement
  const Mn = Mu / PHI_FLEXURE;
  const Rn = Mn * 1e6 / (1000 * d * d); // MPa

  // Reinforcement ratio
  const rho = 0.85 * fc / fy * (1 - Math.sqrt(1 - 2 * Rn / (0.85 * fc)));
  const As_req = rho * 1000 * d; // mm²/m

  // Minimum reinforcement (ACI 318 7.6.1)
  const As_min = 0.0018 * 1000 * (d + 75); // mm²/m (assuming 75mm cover to centroid)

  // Select bars
  const As_use = Math.max(As_req, As_min);
  let bar_size = '#5';
  let bar_area = 199; // mm²

  if (As_use > 1500) {
    bar_size = '#8';
    bar_area = 509;
  } else if (As_use > 1000) {
    bar_size = '#7';
    bar_area = 387;
  } else if (As_use > 600) {
    bar_size = '#6';
    bar_area = 284;
  }

  const spacing = Math.floor(1000 * bar_area / As_use);

  return {
    Mu,
    As_req,
    As_min,
    bar_size,
    spacing: Math.min(spacing, 300), // Max 300mm spacing
  };
}

/**
 * Check one-way shear (beam shear)
 */
export function checkOneWayShear(
  qnet: number,           // Net soil pressure (kPa)
  B: number,              // Width (m)
  d: number,              // Effective depth (mm)
  fc: number,             // Concrete strength (MPa)
  columnWidth: number     // Column width (m)
): { Vu: number; phi_Vc: number; dcRatio: number; passed: boolean } {
  // Critical section at d from column face
  const lc = (B - columnWidth) / 2 - d / 1000;

  // Factored shear per meter
  const Vu = qnet * Math.max(lc, 0) * 1.0; // kN/m

  // Concrete shear capacity
  const Vc = 0.17 * Math.sqrt(fc) * 1000 * d / 1000; // kN/m
  const phi_Vc = PHI_SHEAR * Vc;

  const dcRatio = Vu / phi_Vc;

  return {
    Vu,
    phi_Vc,
    dcRatio,
    passed: dcRatio <= 1.0,
  };
}

/**
 * Check two-way shear (punching shear)
 */
export function checkTwoWayShear(
  P: number,              // Column load (kN)
  qnet: number,           // Net soil pressure (kPa)
  B: number,              // Footing width (m)
  L: number,              // Footing length (m)
  d: number,              // Effective depth (mm)
  fc: number,             // Concrete strength (MPa)
  cx: number,             // Column width x (m)
  cy: number              // Column width y (m)
): { Vu: number; phi_Vc: number; dcRatio: number; bo: number; passed: boolean } {
  // Critical perimeter at d/2 from column
  const bo = 2 * (cx + d / 1000) + 2 * (cy + d / 1000); // m

  // Area inside critical section
  const Ac = (cx + d / 1000) * (cy + d / 1000);

  // Factored shear
  const Vu = P - qnet * Ac; // kN

  // Column aspect ratio
  const beta_c = Math.max(cx, cy) / Math.min(cx, cy);

  // Concrete shear capacity (ACI 318 22.6.5.2)
  const vc1 = 0.33 * Math.sqrt(fc);                           // MPa
  const vc2 = 0.17 * (1 + 2 / beta_c) * Math.sqrt(fc);       // MPa
  const vc3 = 0.083 * (2 + 40 * d / (bo * 1000)) * Math.sqrt(fc); // MPa

  const vc = Math.min(vc1, vc2, vc3);
  const Vc = vc * bo * 1000 * d / 1000; // kN
  const phi_Vc = PHI_SHEAR * Vc;

  const dcRatio = Vu / phi_Vc;

  return {
    Vu,
    phi_Vc,
    dcRatio,
    bo: bo * 1000, // mm
    passed: dcRatio <= 1.0,
  };
}

// ============================================================
// PILE FOUNDATION DESIGN
// ============================================================

export interface PileProperties {
  type: 'driven' | 'bored' | 'micropile';
  shape: 'circular' | 'square' | 'H';
  diameter: number;       // Diameter or width (mm)
  length: number;         // Embedded length (m)
  material: 'concrete' | 'steel' | 'timber';
  fc?: number;            // Concrete strength (MPa)
  fy?: number;            // Steel yield strength (MPa)
}

export interface PileCapacityResult {
  Qp: number;             // End bearing capacity (kN)
  Qs: number;             // Skin friction capacity (kN)
  Qu: number;             // Ultimate capacity (kN)
  Qall: number;           // Allowable capacity (kN)
  method: string;
}

/**
 * Calculate pile capacity using alpha method (for cohesive soils)
 */
export function calculatePileCapacityAlpha(
  pile: PileProperties,
  soil: SoilProperties,
  layers?: Array<{ depth: number; cu: number }> // Undrained shear strength profile
): PileCapacityResult {
  const D = pile.diameter / 1000; // m
  const L = pile.length;

  // Cross-sectional area
  const Ap = pile.shape === 'circular'
    ? Math.PI * D * D / 4
    : D * D;

  // Perimeter
  const p = pile.shape === 'circular'
    ? Math.PI * D
    : 4 * D;

  // Average undrained shear strength
  const cu = soil.c || (soil.qu ? soil.qu / 2 : 50);

  // Alpha factor (Terzaghi & Peck)
  const alpha = cu <= 50 ? 1.0 : Math.max(0.5, 1.0 - (cu - 50) / 200);

  // Skin friction
  const Qs = alpha * cu * p * L;

  // End bearing
  const Nc = 9; // For deep foundations
  const Qp = cu * Nc * Ap;

  const Qu = Qs + Qp;
  const FS = pile.type === 'driven' ? 2.5 : 3.0;
  const Qall = Qu / FS;

  return {
    Qp,
    Qs,
    Qu,
    Qall,
    method: 'Alpha Method',
  };
}

/**
 * Calculate pile capacity using beta method (for granular soils)
 */
export function calculatePileCapacityBeta(
  pile: PileProperties,
  soil: SoilProperties
): PileCapacityResult {
  const D = pile.diameter / 1000; // m
  const L = pile.length;

  const Ap = pile.shape === 'circular'
    ? Math.PI * D * D / 4
    : D * D;

  const p = pile.shape === 'circular'
    ? Math.PI * D
    : 4 * D;

  const phiRad = soil.phi * Math.PI / 180;

  // Beta factor
  const K = 1 - Math.sin(phiRad); // Ko for NC soils
  const delta = 0.75 * soil.phi; // Interface friction
  const deltaRad = delta * Math.PI / 180;
  const beta = K * Math.tan(deltaRad);

  // Average effective stress
  const sigma_avg = soil.gamma * L / 2;

  // Skin friction
  const Qs = beta * sigma_avg * p * L;

  // End bearing
  const Nq = Math.exp(Math.PI * Math.tan(phiRad)) * Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2);
  const sigma_tip = soil.gamma * L;
  const Qp = sigma_tip * Nq * Ap;

  const Qu = Qs + Qp;
  const FS = 2.5;
  const Qall = Qu / FS;

  return {
    Qp,
    Qs,
    Qu,
    Qall,
    method: 'Beta Method',
  };
}

/**
 * Calculate pile group capacity
 */
export function calculatePileGroupCapacity(
  singlePileCapacity: number,
  numPiles: number,
  spacing: number,        // Pile spacing (m)
  diameter: number        // Pile diameter (mm)
): { groupCapacity: number; efficiency: number } {
  const D = diameter / 1000;
  const s_D = spacing / D;

  // Group efficiency (Converse-Labarre formula)
  // For square arrangement
  const n = Math.sqrt(numPiles);
  const theta = Math.atan(D / spacing) * 180 / Math.PI;

  const efficiency = 1 - theta * ((n - 1) * n + (n - 1) * n) / (90 * n * n);

  const groupCapacity = singlePileCapacity * numPiles * efficiency;

  return {
    groupCapacity,
    efficiency: Math.min(efficiency, 1.0),
  };
}

// ============================================================
// COMPLETE FOUNDATION CHECK
// ============================================================

export interface FoundationDesignResult {
  dcRatio: number;
  governingCheck: string;
  status: DesignStatus;
  bearing: BearingCapacityResult;
  sliding: ReturnType<typeof checkSlidingResistance>;
  overturning: ReturnType<typeof checkOverturning>;
  oneWayShear: ReturnType<typeof checkOneWayShear>;
  twoWayShear: ReturnType<typeof checkTwoWayShear>;
  flexure: ReturnType<typeof calculateFootingFlexure>;
  messages: DesignMessage[];
}

/**
 * Perform complete spread footing design check
 */
export function checkSpreadFooting(input: SpreadFootingInput): FoundationDesignResult {
  const messages: DesignMessage[] = [];

  // Calculate bearing capacity
  const bearing = calculateBearingCapacityTerzaghi(
    input.B,
    input.L,
    input.D,
    input.soil,
    input.Dw
  );

  // Calculate pressure distribution
  const pressure = calculateFootingPressure(
    input.P,
    input.Mx,
    input.My,
    input.B,
    input.L,
    input.t
  );

  bearing.qmax = pressure.qmax;
  bearing.qmin = pressure.qmin;
  bearing.dcRatio = pressure.qmax / bearing.qall;
  bearing.passed = bearing.dcRatio <= 1.0;

  if (!pressure.isFullContact) {
    messages.push({
      type: 'warning',
      code: 'FOUND-ECCENTRIC',
      message: `Eccentricity outside kern - partial contact (ex=${pressure.ex.toFixed(3)}m, ey=${pressure.ey.toFixed(3)}m)`,
    });
  }

  // Check sliding
  const sliding = checkSlidingResistance(
    input.P,
    input.Hx,
    input.Hy,
    input.B,
    input.L,
    input.soil
  );

  // Check overturning
  const overturning = checkOverturning(
    input.P,
    input.Mx,
    input.My,
    input.B,
    input.L
  );

  // Structural checks
  const d = (input.t * 1000) - input.cover - 10; // Effective depth (mm)
  const qnet = pressure.qmax - input.soil.gamma * input.D;

  // One-way shear
  const oneWayShear = checkOneWayShear(
    qnet,
    input.B,
    d,
    input.fc,
    0.4 // Assume 400mm column
  );

  // Two-way shear
  const twoWayShear = checkTwoWayShear(
    input.P,
    qnet,
    input.B,
    input.L,
    d,
    input.fc,
    0.4,
    0.4
  );

  // Flexure
  const flexure = calculateFootingFlexure(
    qnet,
    input.B,
    input.L,
    d,
    input.fc,
    input.fy,
    0.4
  );

  // Find governing
  const checks = [
    { name: 'Bearing', value: bearing.dcRatio },
    { name: 'Sliding', value: sliding.dcRatio },
    { name: 'Overturning', value: overturning.dcRatio },
    { name: 'One-Way Shear', value: oneWayShear.dcRatio },
    { name: 'Two-Way Shear', value: twoWayShear.dcRatio },
  ];

  const governing = checks.reduce((a, b) => a.value > b.value ? a : b);
  const maxDC = governing.value;

  // Add failure messages
  if (!bearing.passed) {
    messages.push({
      type: 'error',
      code: 'FOUND-BEARING',
      message: `Bearing capacity exceeded (q=${pressure.qmax.toFixed(1)} kPa > qall=${bearing.qall.toFixed(1)} kPa)`,
    });
  }
  if (!sliding.passed) {
    messages.push({
      type: 'error',
      code: 'FOUND-SLIDING',
      message: `Sliding resistance exceeded (H=${sliding.H_total.toFixed(1)} kN > R=${(PHI_SLIDING * sliding.resistance).toFixed(1)} kN)`,
    });
  }
  if (!oneWayShear.passed) {
    messages.push({
      type: 'error',
      code: 'ACI-22.5',
      message: `One-way shear capacity exceeded`,
    });
  }
  if (!twoWayShear.passed) {
    messages.push({
      type: 'error',
      code: 'ACI-22.6',
      message: `Punching shear capacity exceeded`,
    });
  }

  // Determine status
  let status: DesignStatus;
  if (maxDC > 1.0) {
    status = 'fail';
  } else if (maxDC > 0.9 || !pressure.isFullContact) {
    status = 'warning';
  } else {
    status = 'pass';
  }

  return {
    dcRatio: maxDC,
    governingCheck: governing.name,
    status,
    bearing,
    sliding,
    overturning,
    oneWayShear,
    twoWayShear,
    flexure,
    messages,
  };
}

/**
 * Create design result for database storage
 */
export function createFoundationDesignResult(
  elementId: string,
  analysisRunId: string,
  result: FoundationDesignResult
): DesignResult {
  return {
    id: generateDesignResultId(),
    run_id: analysisRunId,
    member_id: elementId,
    member_type: 'beam', // Foundations can be associated with any supported element
    design_code: 'ACI 318-19 / Terzaghi',
    demand_capacity_ratio: result.dcRatio,
    controlling_check: result.governingCheck,
    status: result.status,
    checks: {
      bearing: {
        qu: result.bearing.qu.toFixed(1),
        qall: result.bearing.qall.toFixed(1),
        qmax: result.bearing.qmax.toFixed(1),
        qmin: result.bearing.qmin.toFixed(1),
        dcRatio: result.bearing.dcRatio.toFixed(3),
        method: result.bearing.method,
      },
      sliding: {
        H_total: result.sliding.H_total.toFixed(1),
        resistance: result.sliding.resistance.toFixed(1),
        dcRatio: result.sliding.dcRatio.toFixed(3),
      },
      overturning: {
        M_overturning: result.overturning.M_overturning.toFixed(1),
        M_resisting: result.overturning.M_resisting.toFixed(1),
        dcRatio: result.overturning.dcRatio.toFixed(3),
      },
      oneWayShear: {
        Vu: result.oneWayShear.Vu.toFixed(1),
        phi_Vc: result.oneWayShear.phi_Vc.toFixed(1),
        dcRatio: result.oneWayShear.dcRatio.toFixed(3),
      },
      twoWayShear: {
        Vu: result.twoWayShear.Vu.toFixed(1),
        phi_Vc: result.twoWayShear.phi_Vc.toFixed(1),
        bo: result.twoWayShear.bo.toFixed(0),
        dcRatio: result.twoWayShear.dcRatio.toFixed(3),
      },
      flexure: {
        Mu: result.flexure.Mu.toFixed(2),
        As_req: result.flexure.As_req.toFixed(0),
        As_min: result.flexure.As_min.toFixed(0),
        bar_size: result.flexure.bar_size,
        spacing: result.flexure.spacing,
      },
    },
    messages: result.messages,
    created_at: new Date().toISOString(),
  };
}
