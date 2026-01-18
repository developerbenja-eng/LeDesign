/**
 * ACI 318 Concrete Design Checks
 *
 * Implements ACI 318-19 (Building Code Requirements for Structural Concrete)
 * - Chapter 9: Beams
 * - Chapter 10: Columns
 * - Chapter 11: Walls
 * - Chapter 21: One-way slabs
 * - Chapter 22: Flexure and axial strength
 * - Chapter 25: Development and splices
 */

import { getClient } from '@ledesign/db';
import {
  Beam,
  Column,
  Section,
  Material,
  MemberResult,
  DesignResult,
  DesignChecks,
  DesignMessage,
  DesignStatus,
  RebarConfiguration,
  RebarBar,
  TransverseBars,
  beamRowToBeam,
  BeamRow,
  columnRowToColumn,
  ColumnRow,
  materialRowToMaterial,
  MaterialRow,
  sectionRowToSection,
  SectionRow,
  memberResultRowToMemberResult,
  MemberResultRow,
} from '../types';
import { generateDesignResultId } from '../factories';

// ============================================================
// ACI 318-19 STRENGTH REDUCTION FACTORS (Table 21.2.1)
// ============================================================

const PHI_FLEXURE = 0.90;           // Tension-controlled sections
const PHI_SHEAR = 0.75;             // Shear and torsion
const PHI_COMPRESSION_TIED = 0.65;  // Compression-controlled (tied columns)
const PHI_COMPRESSION_SPIRAL = 0.75; // Compression-controlled (spiral)
const PHI_BEARING = 0.65;           // Bearing on concrete

// Transition zone for phi factor (ACI 318-19 21.2.2)
const EPSILON_TY = 0.002;  // Yield strain for Grade 60 rebar
const EPSILON_T_LIMIT = 0.005; // Tension-controlled limit

// ============================================================
// MATERIAL CONSTANTS
// ============================================================

const ES = 200000; // Steel modulus of elasticity (MPa)
const EPSILON_CU = 0.003; // Ultimate concrete strain

// ============================================================
// REBAR DATABASE (ACI standard sizes)
// ============================================================

export const REBAR_DATABASE: Record<string, { diameter: number; area: number }> = {
  '#3':  { diameter: 9.5,  area: 71 },
  '#4':  { diameter: 12.7, area: 129 },
  '#5':  { diameter: 15.9, area: 199 },
  '#6':  { diameter: 19.1, area: 284 },
  '#7':  { diameter: 22.2, area: 387 },
  '#8':  { diameter: 25.4, area: 509 },
  '#9':  { diameter: 28.7, area: 645 },
  '#10': { diameter: 32.3, area: 819 },
  '#11': { diameter: 35.8, area: 1006 },
  '#14': { diameter: 43.0, area: 1452 },
  '#18': { diameter: 57.3, area: 2581 },
};

// ============================================================
// INTERFACES
// ============================================================

interface ConcreteElementInfo {
  id: string;
  type: 'beam' | 'column' | 'wall' | 'slab';
  section: Section;
  material: Material;
  rebar?: RebarConfiguration;
  length: number;
  // Geometry
  b: number;       // Width
  h: number;       // Total depth
  d: number;       // Effective depth
  d_prime: number; // Compression steel depth
  // Steel areas
  As: number;      // Tension steel area
  As_prime: number; // Compression steel area
  Av: number;      // Shear reinforcement area per spacing
  s: number;       // Stirrup spacing
}

interface ConcreteDesignForces {
  Mu: number;      // Factored moment
  Vu: number;      // Factored shear
  Nu: number;      // Factored axial (positive = compression)
  Tu: number;      // Factored torsion
}

interface FlexuralCapacity {
  Mn: number;      // Nominal moment capacity
  phi_Mn: number;  // Design moment capacity
  phi: number;     // Strength reduction factor
  c: number;       // Neutral axis depth
  a: number;       // Compression block depth
  epsilon_t: number; // Tension steel strain
  fs: number;      // Tension steel stress
  controlMode: 'tension' | 'transition' | 'compression';
}

interface ShearCapacity {
  Vc: number;      // Concrete shear contribution
  Vs: number;      // Steel shear contribution
  Vn: number;      // Nominal shear capacity
  phi_Vn: number;  // Design shear capacity
  Vs_max: number;  // Maximum Vs allowed
}

interface ColumnCapacity {
  Pn: number;      // Nominal axial capacity
  Mn: number;      // Nominal moment capacity
  phi_Pn: number;  // Design axial capacity
  phi_Mn: number;  // Design moment capacity
  e: number;       // Eccentricity
  interactionRatio: number;
}

// ============================================================
// MATERIAL PROPERTY CALCULATIONS
// ============================================================

/**
 * Calculate modulus of rupture (ACI 318-19 19.2.3.1)
 */
export function calculateModulusOfRupture(fc: number, lambda: number = 1.0): number {
  return 0.62 * lambda * Math.sqrt(fc);
}

/**
 * Calculate concrete modulus of elasticity (ACI 318-19 19.2.2.1)
 * fc in MPa, wc in kg/m³
 */
export function calculateConcreteModulus(fc: number, wc: number = 2400): number {
  if (wc >= 1440 && wc <= 2560) {
    return Math.pow(wc, 1.5) * 0.043 * Math.sqrt(fc);
  }
  // Normal weight concrete
  return 4700 * Math.sqrt(fc);
}

/**
 * Calculate beta1 factor (ACI 318-19 22.2.2.4.3)
 */
export function calculateBeta1(fc: number): number {
  if (fc <= 28) {
    return 0.85;
  } else if (fc >= 55) {
    return 0.65;
  } else {
    return 0.85 - 0.05 * (fc - 28) / 7;
  }
}

/**
 * Calculate strength reduction factor phi (ACI 318-19 21.2.2)
 */
export function calculatePhi(
  epsilon_t: number,
  memberType: 'beam' | 'column' | 'wall' | 'slab' = 'beam',
  confinement: 'tied' | 'spiral' = 'tied'
): number {
  const phi_compression = confinement === 'spiral' ? PHI_COMPRESSION_SPIRAL : PHI_COMPRESSION_TIED;

  if (epsilon_t >= EPSILON_T_LIMIT) {
    // Tension-controlled
    return PHI_FLEXURE;
  } else if (epsilon_t <= EPSILON_TY) {
    // Compression-controlled
    return phi_compression;
  } else {
    // Transition zone
    return phi_compression + (PHI_FLEXURE - phi_compression) *
      (epsilon_t - EPSILON_TY) / (EPSILON_T_LIMIT - EPSILON_TY);
  }
}

// ============================================================
// FLEXURAL DESIGN (ACI 318-19 Chapter 22)
// ============================================================

/**
 * Calculate flexural capacity for singly reinforced section
 */
export function calculateFlexuralCapacitySingly(
  b: number,       // Width (mm)
  d: number,       // Effective depth (mm)
  As: number,      // Tension steel area (mm²)
  fc: number,      // Concrete strength (MPa)
  fy: number       // Steel yield strength (MPa)
): FlexuralCapacity {
  const beta1 = calculateBeta1(fc);

  // Assume tension steel yields
  const a = (As * fy) / (0.85 * fc * b);
  const c = a / beta1;

  // Check tension steel strain
  const epsilon_t = EPSILON_CU * (d - c) / c;
  const fs = Math.min(ES * epsilon_t, fy);

  // Recalculate if steel doesn't yield
  let finalA = a;
  let finalC = c;
  let finalFs = fs;
  let finalEpsilonT = epsilon_t;

  if (epsilon_t < EPSILON_TY) {
    // Steel doesn't yield - iterate for solution
    // Use quadratic formula for c
    const A_coef = 0.85 * fc * beta1 * b;
    const B_coef = -EPSILON_CU * ES * As;
    const C_coef = -EPSILON_CU * ES * As * d;

    finalC = (-B_coef + Math.sqrt(B_coef * B_coef - 4 * A_coef * C_coef)) / (2 * A_coef);
    finalA = beta1 * finalC;
    finalEpsilonT = EPSILON_CU * (d - finalC) / finalC;
    finalFs = ES * finalEpsilonT;
  }

  // Calculate moment capacity
  const Mn = As * finalFs * (d - finalA / 2) / 1e6; // Convert to kN·m

  // Determine control mode and phi
  let controlMode: 'tension' | 'transition' | 'compression';
  if (finalEpsilonT >= EPSILON_T_LIMIT) {
    controlMode = 'tension';
  } else if (finalEpsilonT <= EPSILON_TY) {
    controlMode = 'compression';
  } else {
    controlMode = 'transition';
  }

  const phi = calculatePhi(finalEpsilonT);

  return {
    Mn,
    phi_Mn: phi * Mn,
    phi,
    c: finalC,
    a: finalA,
    epsilon_t: finalEpsilonT,
    fs: finalFs,
    controlMode,
  };
}

/**
 * Calculate flexural capacity for doubly reinforced section
 */
export function calculateFlexuralCapacityDoubly(
  b: number,        // Width (mm)
  d: number,        // Effective depth (mm)
  d_prime: number,  // Compression steel depth (mm)
  As: number,       // Tension steel area (mm²)
  As_prime: number, // Compression steel area (mm²)
  fc: number,       // Concrete strength (MPa)
  fy: number        // Steel yield strength (MPa)
): FlexuralCapacity {
  const beta1 = calculateBeta1(fc);

  // Initial estimate assuming both steels yield
  const a = (As * fy - As_prime * fy) / (0.85 * fc * b);
  const c = a / beta1;

  // Check compression steel strain
  const epsilon_s_prime = EPSILON_CU * (c - d_prime) / c;
  const fs_prime = Math.min(Math.abs(epsilon_s_prime) * ES, fy);

  // Check tension steel strain
  const epsilon_t = EPSILON_CU * (d - c) / c;
  const fs = Math.min(epsilon_t * ES, fy);

  // Recalculate with actual stresses
  const finalA = (As * fs - As_prime * fs_prime) / (0.85 * fc * b);
  const finalC = finalA / beta1;
  const finalEpsilonT = EPSILON_CU * (d - finalC) / finalC;

  // Calculate moment capacity
  const Mn_concrete = 0.85 * fc * b * finalA * (d - finalA / 2) / 1e6;
  const Mn_steel = As_prime * fs_prime * (d - d_prime) / 1e6;
  const Mn = Mn_concrete + Mn_steel;

  // Determine control mode
  let controlMode: 'tension' | 'transition' | 'compression';
  if (finalEpsilonT >= EPSILON_T_LIMIT) {
    controlMode = 'tension';
  } else if (finalEpsilonT <= EPSILON_TY) {
    controlMode = 'compression';
  } else {
    controlMode = 'transition';
  }

  const phi = calculatePhi(finalEpsilonT);

  return {
    Mn,
    phi_Mn: phi * Mn,
    phi,
    c: finalC,
    a: finalA,
    epsilon_t: finalEpsilonT,
    fs,
    controlMode,
  };
}

// ============================================================
// SHEAR DESIGN (ACI 318-19 Chapter 22.5)
// ============================================================

/**
 * Calculate concrete shear contribution Vc (ACI 318-19 22.5.5)
 */
export function calculateVc(
  fc: number,      // Concrete strength (MPa)
  b: number,       // Width (mm)
  d: number,       // Effective depth (mm)
  Nu: number = 0,  // Axial force (kN, positive = compression)
  Ag: number = 0,  // Gross area (mm²)
  lambda: number = 1.0
): number {
  // Basic Vc (ACI 318-19 Table 22.5.5.1)
  const Vc_basic = 0.17 * lambda * Math.sqrt(fc) * b * d / 1000; // kN

  // Modification for axial load
  if (Nu !== 0 && Ag > 0) {
    if (Nu > 0) {
      // Compression
      const factor = 1 + Nu * 1000 / (14 * Ag);
      return Math.min(Vc_basic * factor, 0.29 * lambda * Math.sqrt(fc) * b * d / 1000);
    } else {
      // Tension
      const factor = Math.max(0, 1 + Nu * 1000 / (3.5 * Ag));
      return Vc_basic * factor;
    }
  }

  return Vc_basic;
}

/**
 * Calculate steel shear contribution Vs (ACI 318-19 22.5.10)
 */
export function calculateVs(
  Av: number,   // Shear reinforcement area (mm²)
  fy: number,   // Steel yield strength (MPa)
  d: number,    // Effective depth (mm)
  s: number     // Stirrup spacing (mm)
): number {
  return Av * fy * d / (s * 1000); // kN
}

/**
 * Calculate maximum Vs (ACI 318-19 22.5.1.2)
 */
export function calculateVsMax(fc: number, b: number, d: number): number {
  return 0.66 * Math.sqrt(fc) * b * d / 1000; // kN
}

/**
 * Calculate complete shear capacity
 */
export function calculateShearCapacity(
  fc: number,
  fy: number,
  b: number,
  d: number,
  Av: number,
  s: number,
  Nu: number = 0,
  Ag: number = 0,
  lambda: number = 1.0
): ShearCapacity {
  const Vc = calculateVc(fc, b, d, Nu, Ag, lambda);
  const Vs = s > 0 ? calculateVs(Av, fy, d, s) : 0;
  const Vs_max = calculateVsMax(fc, b, d);

  // Check Vs limit
  const Vs_used = Math.min(Vs, Vs_max);
  const Vn = Vc + Vs_used;

  return {
    Vc,
    Vs: Vs_used,
    Vn,
    phi_Vn: PHI_SHEAR * Vn,
    Vs_max,
  };
}

// ============================================================
// COLUMN DESIGN (ACI 318-19 Chapter 22.4)
// ============================================================

/**
 * Calculate column axial capacity (short column, no slenderness)
 */
export function calculateColumnAxialCapacity(
  fc: number,        // Concrete strength (MPa)
  fy: number,        // Steel yield strength (MPa)
  Ag: number,        // Gross area (mm²)
  Ast: number,       // Total steel area (mm²)
  confinement: 'tied' | 'spiral' = 'tied'
): { Pn_max: number; phi_Pn_max: number } {
  const alpha = confinement === 'spiral' ? 0.85 : 0.80;
  const phi = confinement === 'spiral' ? PHI_COMPRESSION_SPIRAL : PHI_COMPRESSION_TIED;

  // ACI 318-19 22.4.2.1
  const Pn_max = alpha * (0.85 * fc * (Ag - Ast) + fy * Ast) / 1000; // kN

  return {
    Pn_max,
    phi_Pn_max: phi * Pn_max,
  };
}

/**
 * Calculate column interaction point for given neutral axis depth
 */
export function calculateColumnInteractionPoint(
  b: number,        // Width (mm)
  h: number,        // Depth (mm)
  d: number,        // Effective depth (mm)
  d_prime: number,  // Compression steel depth (mm)
  As: number,       // Tension steel area (mm²)
  As_prime: number, // Compression steel area (mm²)
  fc: number,       // Concrete strength (MPa)
  fy: number,       // Steel yield strength (MPa)
  c: number         // Neutral axis depth (mm)
): { Pn: number; Mn: number; phi: number } {
  const beta1 = calculateBeta1(fc);
  const a = Math.min(beta1 * c, h);

  // Steel strains
  const epsilon_s = EPSILON_CU * (d - c) / c;
  const epsilon_s_prime = EPSILON_CU * (c - d_prime) / c;

  // Steel stresses (limited by fy)
  const fs = Math.min(Math.abs(epsilon_s) * ES, fy) * Math.sign(epsilon_s);
  const fs_prime = Math.min(Math.abs(epsilon_s_prime) * ES, fy) * Math.sign(epsilon_s_prime);

  // Forces
  const Cc = 0.85 * fc * a * b / 1000; // kN
  const Cs = As_prime * fs_prime / 1000; // kN
  const Ts = As * fs / 1000; // kN

  const Pn = Cc + Cs - Ts;

  // Moments about centroid
  const Mn = (Cc * (h / 2 - a / 2) + Cs * (h / 2 - d_prime) + Ts * (d - h / 2)) / 1000; // kN·m

  // Phi based on tension steel strain
  const phi = calculatePhi(Math.abs(epsilon_s), 'column', 'tied');

  return { Pn, Mn, phi };
}

/**
 * Generate column interaction diagram points
 */
export function generateInteractionDiagram(
  b: number,
  h: number,
  d: number,
  d_prime: number,
  As: number,
  As_prime: number,
  fc: number,
  fy: number,
  numPoints: number = 20
): Array<{ Pn: number; Mn: number; phi_Pn: number; phi_Mn: number }> {
  const points: Array<{ Pn: number; Mn: number; phi_Pn: number; phi_Mn: number }> = [];

  // Pure compression point
  const Ag = b * h;
  const Ast = As + As_prime;
  const { Pn_max } = calculateColumnAxialCapacity(fc, fy, Ag, Ast, 'tied');
  points.push({
    Pn: Pn_max,
    Mn: 0,
    phi_Pn: PHI_COMPRESSION_TIED * Pn_max,
    phi_Mn: 0,
  });

  // Vary neutral axis from very large to very small
  const c_values = [];
  for (let i = 0; i < numPoints; i++) {
    const c = h * 3 * (1 - i / numPoints) + 0.1; // Range from 3h to near zero
    c_values.push(c);
  }

  for (const c of c_values) {
    const { Pn, Mn, phi } = calculateColumnInteractionPoint(
      b, h, d, d_prime, As, As_prime, fc, fy, c
    );
    if (Pn > -Ast * fy / 1000) { // Don't go below pure tension
      points.push({
        Pn,
        Mn,
        phi_Pn: phi * Pn,
        phi_Mn: phi * Mn,
      });
    }
  }

  // Pure tension point
  const Pn_tension = -Ast * fy / 1000;
  points.push({
    Pn: Pn_tension,
    Mn: 0,
    phi_Pn: PHI_FLEXURE * Pn_tension,
    phi_Mn: 0,
  });

  return points.sort((a, b) => b.Pn - a.Pn);
}

// ============================================================
// DEVELOPMENT LENGTH (ACI 318-19 Chapter 25)
// ============================================================

/**
 * Calculate development length for tension bars (ACI 318-19 25.4.2)
 */
export function calculateDevelopmentLengthTension(
  db: number,       // Bar diameter (mm)
  fy: number,       // Steel yield strength (MPa)
  fc: number,       // Concrete strength (MPa)
  cover: number,    // Clear cover (mm)
  spacing: number,  // Clear spacing between bars (mm)
  isTopBar: boolean = false,
  isEpoxyCoated: boolean = false,
  isLightweight: boolean = false
): { ld: number; ld_min: number } {
  const lambda = isLightweight ? 0.75 : 1.0;

  // Modification factors (ACI 318-19 25.4.2.4)
  const psi_t = isTopBar ? 1.3 : 1.0;           // Casting position
  const psi_e = isEpoxyCoated ? 1.5 : 1.0;      // Coating
  const psi_s = db <= 19 ? 0.8 : 1.0;           // Bar size

  // Confinement term
  const cb = Math.min(cover + db / 2, spacing / 2);
  const Ktr = 0; // Simplified - no transverse reinforcement contribution

  const confinementTerm = Math.min((cb + Ktr) / db, 2.5);

  // Development length (ACI 318-19 25.4.2.3)
  const ld = (fy * psi_t * psi_e * psi_s) / (1.1 * lambda * Math.sqrt(fc) * confinementTerm) * db;

  // Minimum (ACI 318-19 25.4.2.1)
  const ld_min = Math.max(300, ld);

  return { ld, ld_min };
}

/**
 * Calculate development length for compression bars (ACI 318-19 25.4.9)
 */
export function calculateDevelopmentLengthCompression(
  db: number,       // Bar diameter (mm)
  fy: number,       // Steel yield strength (MPa)
  fc: number        // Concrete strength (MPa)
): { ldc: number; ldc_min: number } {
  const ldc = Math.max(
    0.24 * fy / Math.sqrt(fc) * db,
    0.043 * fy * db
  );

  const ldc_min = Math.max(200, ldc);

  return { ldc, ldc_min };
}

// ============================================================
// MINIMUM REINFORCEMENT (ACI 318-19)
// ============================================================

/**
 * Calculate minimum flexural reinforcement (ACI 318-19 9.6.1.2)
 */
export function calculateMinFlexuralReinforcement(
  fc: number,
  fy: number,
  b: number,
  d: number
): number {
  const As_min_1 = 0.25 * Math.sqrt(fc) / fy * b * d;
  const As_min_2 = 1.4 / fy * b * d;
  return Math.max(As_min_1, As_min_2);
}

/**
 * Calculate maximum reinforcement ratio
 */
export function calculateMaxReinforcementRatio(fc: number, fy: number): number {
  const beta1 = calculateBeta1(fc);
  // For tension-controlled section (epsilon_t >= 0.005)
  const rho_max = 0.85 * beta1 * (fc / fy) * (EPSILON_CU / (EPSILON_CU + 0.005));
  return rho_max;
}

/**
 * Calculate minimum shear reinforcement (ACI 318-19 9.6.3.3)
 */
export function calculateMinShearReinforcement(
  fc: number,
  fy: number,
  b: number,
  s: number
): number {
  const Av_min_1 = 0.062 * Math.sqrt(fc) * b * s / fy;
  const Av_min_2 = 0.35 * b * s / fy;
  return Math.max(Av_min_1, Av_min_2);
}

/**
 * Calculate maximum stirrup spacing (ACI 318-19 9.7.6.2.2)
 */
export function calculateMaxStirrupSpacing(d: number, Vs: number, Vs_limit: number): number {
  if (Vs <= Vs_limit / 2) {
    return Math.min(d / 2, 600);
  } else {
    return Math.min(d / 4, 300);
  }
}

// ============================================================
// DESIGN CHECK RUNNER
// ============================================================

interface ConcreteDesignCheckResult {
  dcRatio: number;
  governingCheck: string;
  flexure: {
    Mu: number;
    phi_Mn: number;
    dcRatio: number;
    controlMode: string;
    passed: boolean;
  };
  shear: {
    Vu: number;
    phi_Vn: number;
    Vc: number;
    Vs: number;
    dcRatio: number;
    passed: boolean;
  };
  details: Record<string, unknown>;
  passed: boolean;
  messages: DesignMessage[];
}

/**
 * Run ACI 318 design checks for concrete elements
 */
export async function runACIDesignChecks(
  projectId: string,
  analysisRunId: string
): Promise<DesignResult[]> {
  const db = getClient();
  const results: DesignResult[] = [];

  // Get beams with concrete material
  const beamRows = await db.execute({
    sql: `
      SELECT b.*, m.material_type, m.yield_strength, m.properties,
             s.section_type, s.dimensions
      FROM beams b
      JOIN materials m ON b.material_id = m.id
      JOIN sections s ON b.section_id = s.id
      WHERE b.project_id = ? AND m.material_type = 'concrete'
    `,
    args: [projectId],
  });

  // Get member results for this analysis run
  const memberResultsRows = await db.execute({
    sql: `
      SELECT * FROM member_results
      WHERE analysis_run_id = ?
    `,
    args: [analysisRunId],
  });

  const memberResultsMap = new Map<string, MemberResult>();
  for (const row of memberResultsRows.rows) {
    const result = memberResultRowToMemberResult(row as unknown as MemberResultRow);
    memberResultsMap.set(result.member_id, result);
  }

  // Process each beam
  for (const row of beamRows.rows) {
    const beam = beamRowToBeam(row as unknown as BeamRow);
    const memberResult = memberResultsMap.get(beam.id);

    if (!memberResult) continue;

    // Extract section dimensions
    const dimensions = (row as any).dimensions as any;
    const properties = JSON.parse((row as any).properties || '{}');

    const fc = properties.fc || 28; // Default 28 MPa
    const fy = (row as any).yield_strength || 420; // Default Grade 60

    // Assume rectangular section
    const b = dimensions?.b || 300; // mm
    const h = dimensions?.h || 500; // mm
    const cover = 40; // mm
    const d = h - cover - 10; // Effective depth (assuming #8 bars)

    // Get forces from analysis
    const Mu = Math.abs(memberResult.moment_major || 0);
    const Vu = Math.abs(memberResult.shear_major || 0);

    // Assume reinforcement (would come from rebar configuration)
    const As = 1500; // mm² (example: 3-#8)
    const Av = 142;  // mm² (2 legs #4)
    const s = 200;   // mm spacing

    // Calculate capacities
    const flexure = calculateFlexuralCapacitySingly(b, d, As, fc, fy);
    const shear = calculateShearCapacity(fc, fy, b, d, Av, s);

    // Calculate D/C ratios
    const flexureDC = Mu / flexure.phi_Mn;
    const shearDC = Vu / shear.phi_Vn;
    const maxDC = Math.max(flexureDC, shearDC);

    const messages: DesignMessage[] = [];

    // Check minimum reinforcement
    const As_min = calculateMinFlexuralReinforcement(fc, fy, b, d);
    if (As < As_min) {
      messages.push({
        type: 'warning',
        code: 'ACI-9.6.1.2',
        message: `Tension reinforcement (${As.toFixed(0)} mm²) is less than minimum required (${As_min.toFixed(0)} mm²)`,
      });
    }

    // Check if shear reinforcement is required
    if (Vu > 0.5 * PHI_SHEAR * shear.Vc) {
      const Av_min = calculateMinShearReinforcement(fc, fy, b, s);
      if (Av < Av_min) {
        messages.push({
          type: 'warning',
          code: 'ACI-9.6.3.3',
          message: `Shear reinforcement (${Av.toFixed(0)} mm²) is less than minimum required (${Av_min.toFixed(0)} mm²)`,
        });
      }
    }

    // Determine status
    let status: DesignStatus;
    if (maxDC > 1.0) {
      status = 'fail';
      messages.push({
        type: 'error',
        code: 'ACI-CAPACITY',
        message: `Demand exceeds capacity (D/C = ${maxDC.toFixed(2)})`,
      });
    } else if (maxDC > 0.9) {
      status = 'warning';
    } else {
      status = 'pass';
    }

    const controllingCheck = flexureDC >= shearDC ? 'Flexure' : 'Shear';
    const capacity = flexureDC >= shearDC ? flexure.phi_Mn : shear.phi_Vn;
    const demand = flexureDC >= shearDC ? Mu : Vu;

    const designResult: DesignResult = {
      id: generateDesignResultId(),
      project_id: projectId,
      run_id: analysisRunId,
      combination_id: 'combo_id_placeholder', // TODO: Extract from member_results
      member_id: beam.id,
      member_type: 'beam',
      design_code: 'ACI 318-19',
      demand_capacity_ratio: maxDC,
      governing_check: controllingCheck,
      controlling_check: controllingCheck,
      capacity: capacity,
      demand: demand,
      status,
      checks: {
        flexure: {
          Mu: Mu.toFixed(2),
          phi_Mn: flexure.phi_Mn.toFixed(2),
          dcRatio: flexureDC.toFixed(3),
          controlMode: flexure.controlMode,
          a: flexure.a.toFixed(1),
          c: flexure.c.toFixed(1),
          epsilon_t: flexure.epsilon_t.toFixed(4),
          phi: flexure.phi.toFixed(2),
        },
        shear: {
          Vu: Vu.toFixed(2),
          phi_Vn: shear.phi_Vn.toFixed(2),
          Vc: shear.Vc.toFixed(2),
          Vs: shear.Vs.toFixed(2),
          dcRatio: shearDC.toFixed(3),
        },
      },
      messages,
      created_at: new Date().toISOString(),
    };

    results.push(designResult);

    // Store in database
    await db.execute({
      sql: `
        INSERT INTO design_results (id, run_id, member_id, member_type, design_code, demand_capacity_ratio, controlling_check, status, checks, messages, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        designResult.id,
        designResult.run_id,
        designResult.member_id,
        designResult.member_type,
        designResult.design_code,
        designResult.demand_capacity_ratio,
        designResult.controlling_check ?? null,
        designResult.status,
        JSON.stringify(designResult.checks),
        JSON.stringify(designResult.messages),
        new Date().toISOString(),
      ],
    });
  }

  return results;
}

// ============================================================
// ACI 318-19 CHAPTER 11: WALL DESIGN
// ============================================================

interface WallForces {
  axial: number;      // Axial compression (N)
  moment: number;     // Bending moment (N·mm)
  shear: number;      // Shear force (N)
}

interface WallDesignInput {
  id: string;
  thickness: number;   // tw (mm)
  height: number;      // hw (mm)
  length: number;      // lw (mm)
  fc: number;          // Concrete strength (MPa)
  fy: number;          // Rebar yield strength (MPa)
  forces: WallForces;
  horizontalRebar?: {
    As: number;        // Total area horizontal reinf (mm²)
    spacing: number;   // Spacing (mm)
  };
  verticalRebar?: {
    As: number;        // Total area vertical reinf (mm²)
    spacing: number;   // Spacing (mm)
  };
}

interface WallDesignResult {
  inPlaneShear: {
    Vu: number;
    phi_Vn: number;
    Acv: number;
    alpha_c: number;
    rho_t: number;
    dcRatio: number;
    passed: boolean;
  };
  axialCompression: {
    Pu: number;
    phi_Pn: number;
    dcRatio: number;
    passed: boolean;
  };
  maxDCRatio: number;
  governingCheck: string;
  passed: boolean;
  messages: DesignMessage[];
}

/**
 * Calculate in-plane shear capacity of concrete wall (ACI 318-19 11.5.4)
 * Vn = Acv(α_c√f'c + ρ_t·f_y)
 */
function calculateWallInPlaneShear(
  fc: number,
  fy: number,
  tw: number,
  lw: number,
  hw: number,
  Ash: number,  // Horizontal reinforcement area
  sh: number    // Spacing of horizontal reinforcement
): { phi_Vn: number; Acv: number; alpha_c: number; rho_t: number } {
  // Gross area of concrete section bounded by web thickness and length (mm²)
  const Acv = tw * lw;

  // Coefficient α_c depends on hw/lw ratio (ACI 318-19 11.5.4.3)
  const hw_lw = hw / lw;
  let alpha_c: number;
  if (hw_lw <= 1.5) {
    alpha_c = 0.25;
  } else if (hw_lw >= 2.0) {
    alpha_c = 0.17;
  } else {
    // Linear interpolation between 1.5 and 2.0
    alpha_c = 0.25 - (0.08 * (hw_lw - 1.5) / 0.5);
  }

  // Ratio of horizontal shear reinforcement area to gross concrete area (ACI 318-19 11.5.4.2)
  const rho_t = Ash / (sh * tw);

  // Nominal shear strength (N)
  const Vn = Acv * (alpha_c * Math.sqrt(fc) + rho_t * fy);

  // Apply strength reduction factor
  const phi_Vn = PHI_SHEAR * Vn;

  return { phi_Vn, Acv, alpha_c, rho_t };
}

/**
 * Calculate axial compression capacity of wall (ACI 318-19 11.5.2)
 */
function calculateWallAxialCapacity(
  fc: number,
  Ag: number,     // Gross area (mm²)
  Ast: number     // Total vertical reinforcement area (mm²)
): { phi_Pn: number } {
  // Simplified: For walls with vertical reinforcement, Pn = 0.55·f'c·Ag + fy·Ast
  // Using tied column reduction factor
  const Pn = 0.55 * fc * Ag + 420 * Ast;  // Assuming fy = 420 MPa for vertical bars

  const phi_Pn = PHI_COMPRESSION_TIED * Pn;

  return { phi_Pn };
}

/**
 * Main concrete wall design check function
 */
function checkConcreteWall(input: WallDesignInput): WallDesignResult {
  const messages: DesignMessage[] = [];

  // Extract parameters
  const { thickness: tw, height: hw, length: lw, fc, fy, forces } = input;
  const { axial: Pu, moment: Mu, shear: Vu } = forces;

  // Gross area
  const Ag = tw * lw;

  // Horizontal reinforcement (for shear)
  const Ash = input.horizontalRebar?.As || 0;
  const sh = input.horizontalRebar?.spacing || 300;  // Default 300mm spacing

  // Vertical reinforcement (for axial)
  const Ast = input.verticalRebar?.As || 0;

  // Check minimum reinforcement (ACI 318-19 11.6)
  const rho_min = 0.0012;  // Minimum reinforcement ratio for walls
  const As_min = rho_min * Ag;

  if (Ast < As_min) {
    messages.push({
      type: 'warning',
      code: 'ACI-11.6',
      message: `Vertical reinforcement (${Ast.toFixed(0)} mm²) below minimum (${As_min.toFixed(0)} mm²)`,
    });
  }

  // 1. In-plane shear check (ACI 318-19 11.5.4)
  const shear = calculateWallInPlaneShear(fc, fy, tw, lw, hw, Ash, sh);
  const shearDC = Vu / shear.phi_Vn;
  const shearPassed = shearDC <= 1.0;

  if (!shearPassed) {
    messages.push({
      type: 'error',
      code: 'ACI-11.5.4',
      message: `Wall shear D/C = ${shearDC.toFixed(3)} > 1.0 FAIL`,
    });
  }

  // 2. Axial compression check
  const axial = calculateWallAxialCapacity(fc, Ag, Ast);
  const axialDC = Pu / axial.phi_Pn;
  const axialPassed = axialDC <= 1.0;

  if (!axialPassed) {
    messages.push({
      type: 'error',
      code: 'ACI-11.5',
      message: `Wall axial D/C = ${axialDC.toFixed(3)} > 1.0 FAIL`,
    });
  }

  // Determine governing check
  const maxDC = Math.max(shearDC, axialDC);
  const governingCheck = maxDC === shearDC ? 'In-Plane Shear' : 'Axial Compression';
  const passed = shearPassed && axialPassed;

  return {
    inPlaneShear: {
      Vu,
      phi_Vn: shear.phi_Vn,
      Acv: shear.Acv,
      alpha_c: shear.alpha_c,
      rho_t: shear.rho_t,
      dcRatio: shearDC,
      passed: shearPassed,
    },
    axialCompression: {
      Pu,
      phi_Pn: axial.phi_Pn,
      dcRatio: axialDC,
      passed: axialPassed,
    },
    maxDCRatio: maxDC,
    governingCheck,
    passed,
    messages,
  };
}

/**
 * Aggregate shell element forces for a parent wall
 */
function aggregateShellForces(shellResults: any[]): WallForces {
  let totalAxial = 0;
  let totalShear = 0;
  let totalMoment = 0;

  for (const shell of shellResults) {
    // f11 = membrane force in local 1 direction (typically vertical for walls)
    // f12 = in-plane shear force
    // m11 = bending moment
    totalAxial += Math.abs(shell.f11 || 0);
    totalShear += Math.abs(shell.f12 || 0);
    totalMoment += Math.abs(shell.m11 || 0);
  }

  return {
    axial: totalAxial,
    moment: totalMoment,
    shear: totalShear,
  };
}

/**
 * Run ACI 318 design checks for concrete walls
 */
export async function runACIWallDesignChecks(
  projectId: string,
  analysisRunId: string
): Promise<DesignResult[]> {
  const db = getClient();
  const results: DesignResult[] = [];

  // Get walls with concrete material
  const wallRows = await db.execute({
    sql: `
      SELECT w.*, m.material_type, m.properties
      FROM walls w
      JOIN materials m ON w.material_id = m.id
      WHERE w.project_id = ? AND m.material_type = 'concrete'
    `,
    args: [projectId],
  });

  if (wallRows.rows.length === 0) {
    return results;
  }

  // Get shell results for this analysis run
  const shellResultsRows = await db.execute({
    sql: `
      SELECT sr.*, se.parent_id, se.parent_type
      FROM shell_results sr
      JOIN shell_elements se ON sr.element_id = se.id
      WHERE sr.run_id = ? AND se.parent_type = 'wall'
    `,
    args: [analysisRunId],
  });

  // Group shell results by parent wall ID
  const wallForcesMap = new Map<string, any[]>();
  for (const row of shellResultsRows.rows) {
    const parentId = (row as any).parent_id;
    if (!wallForcesMap.has(parentId)) {
      wallForcesMap.set(parentId, []);
    }
    wallForcesMap.get(parentId)!.push(row);
  }

  // Design each wall
  for (const row of wallRows.rows) {
    const wallId = (row as any).id;
    const shellResults = wallForcesMap.get(wallId) || [];

    if (shellResults.length === 0) {
      // No analysis results for this wall
      continue;
    }

    // Aggregate forces
    const forces = aggregateShellForces(shellResults);

    // Get material properties
    const properties = JSON.parse((row as any).properties || '{}');
    const fc = properties.fc || 28;  // Default 28 MPa

    // Get wall geometry
    const thickness = (row as any).thickness || 200;  // mm
    const cornerNodes = JSON.parse((row as any).corner_nodes || '[]');

    // Estimate wall dimensions (simplified - would need node coordinates)
    const length = 3000;  // mm - placeholder
    const height = 3000;  // mm - placeholder

    // Assume minimum reinforcement (would come from rebar configuration)
    const Ash = 142;  // mm² (2 legs #4 @ 300mm)
    const Ast = 1000; // mm² (vertical reinforcement)

    // Run design check
    const wallResult = checkConcreteWall({
      id: wallId,
      thickness,
      height,
      length,
      fc,
      fy: 420,  // Grade 60 rebar
      forces,
      horizontalRebar: { As: Ash, spacing: 300 },
      verticalRebar: { As: Ast, spacing: 400 },
    });

    // Determine status
    let status: DesignStatus;
    if (wallResult.passed) {
      status = 'pass';
    } else if (wallResult.maxDCRatio <= 1.1) {
      status = 'warning';
    } else {
      status = 'fail';
    }

    // Determine capacity and demand based on governing check
    const isShearGoverning = wallResult.governingCheck === 'In-Plane Shear';
    const capacity = isShearGoverning
      ? wallResult.inPlaneShear.phi_Vn
      : wallResult.axialCompression.phi_Pn;
    const demand = isShearGoverning
      ? wallResult.inPlaneShear.Vu
      : wallResult.axialCompression.Pu;

    // Create DesignResult
    const designResult: DesignResult = {
      id: generateDesignResultId(),
      project_id: projectId,
      run_id: analysisRunId,
      combination_id: 'combo_id_placeholder', // TODO: Extract from shell_results
      member_id: wallId,
      member_type: 'wall',
      design_code: 'ACI 318-19',
      demand_capacity_ratio: wallResult.maxDCRatio,
      governing_check: wallResult.governingCheck,
      controlling_check: wallResult.governingCheck,
      capacity: capacity,
      demand: demand,
      status,
      checks: {
        shear_major_capacity: wallResult.inPlaneShear.phi_Vn,
        shear_major_demand: wallResult.inPlaneShear.Vu,
        shear_major_ratio: wallResult.inPlaneShear.dcRatio,
        compression_capacity: wallResult.axialCompression.phi_Pn,
        compression_demand: wallResult.axialCompression.Pu,
        compression_ratio: wallResult.axialCompression.dcRatio,
      },
      messages: wallResult.messages,
      created_at: new Date().toISOString(),
    };

    results.push(designResult);

    // Store in database
    await db.execute({
      sql: `
        INSERT INTO design_results (id, run_id, member_id, member_type, design_code, demand_capacity_ratio, controlling_check, status, checks, messages, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        designResult.id,
        designResult.run_id,
        designResult.member_id,
        designResult.member_type,
        designResult.design_code,
        designResult.demand_capacity_ratio,
        designResult.controlling_check ?? null,
        designResult.status,
        JSON.stringify(designResult.checks),
        JSON.stringify(designResult.messages),
        new Date().toISOString(),
      ],
    });
  }

  return results;
}

// ============================================================
// ACI 318-19 CHAPTER 7 & 8: SLAB DESIGN
// ============================================================

interface SlabForces {
  moment_pos: number;  // Positive moment (N·mm)
  moment_neg: number;  // Negative moment (N·mm)
  shear: number;       // Shear force (N)
}

interface SlabDesignInput {
  id: string;
  slabType: 'one-way' | 'two-way' | 'flat_plate';
  thickness: number;   // h (mm)
  width: number;       // b (mm) - strip width for one-way
  fc: number;          // Concrete strength (MPa)
  fy: number;          // Rebar yield strength (MPa)
  forces: SlabForces;
  mainRebar?: {
    As: number;        // Main reinforcement area (mm²)
    spacing: number;   // Spacing (mm)
  };
  // For two-way punching shear
  columnDimensions?: {
    c1: number;        // Column dimension 1 (mm)
    c2: number;        // Column dimension 2 (mm)
  };
}

interface SlabDesignResult {
  flexure: {
    positive: {
      Mu: number;
      phi_Mn: number;
      dcRatio: number;
      passed: boolean;
    };
    negative: {
      Mu: number;
      phi_Mn: number;
      dcRatio: number;
      passed: boolean;
    };
  };
  shear: {
    Vu: number;
    phi_Vn: number;
    dcRatio: number;
    shearType: 'one-way' | 'two-way-punching';
    passed: boolean;
  };
  maxDCRatio: number;
  governingCheck: string;
  passed: boolean;
  messages: DesignMessage[];
}

/**
 * Calculate one-way slab shear capacity (ACI 318-19 7.5)
 * Typically no shear reinforcement: Vc = 0.17·√f'c·b·d
 */
function calculateOneWaySlabShear(
  fc: number,
  b: number,
  d: number
): { phi_Vn: number } {
  const lambda = 1.0;
  const Vc = 0.17 * lambda * Math.sqrt(fc) * b * d;
  const phi_Vn = PHI_SHEAR * Vc;
  return { phi_Vn };
}

/**
 * Calculate two-way punching shear capacity (ACI 318-19 8.4.4)
 */
function calculateTwoWayPunchingShear(
  fc: number,
  d: number,
  c1: number,
  c2: number
): { phi_Vn: number; bo: number } {
  const bo = 2 * (c1 + d) + 2 * (c2 + d);
  const lambda = 1.0;
  const beta_c = c1 / c2;
  const Vn1 = 0.33 * lambda * Math.sqrt(fc) * bo * d;
  const Vn2 = (0.17 + 0.33 / beta_c) * lambda * Math.sqrt(fc) * bo * d;
  const Vn3 = (0.17 + 0.083 * 40) * lambda * Math.sqrt(fc) * bo * d;
  const Vn = Math.min(Vn1, Vn2, Vn3);
  const phi_Vn = PHI_SHEAR * Vn;
  return { phi_Vn, bo };
}

/**
 * Main concrete slab design check function
 */
function checkConcreteSlab(input: SlabDesignInput): SlabDesignResult {
  const messages: DesignMessage[] = [];
  const { slabType, thickness: h, width: b, fc, fy, forces } = input;
  const { moment_pos: Mu_pos, moment_neg: Mu_neg, shear: Vu } = forces;

  const cover = 20;
  const d = h - cover - 10;
  const As = input.mainRebar?.As || 0;
  const rho_min = 0.0018;
  const As_min = rho_min * b * h;

  if (As < As_min) {
    messages.push({
      type: 'warning',
      code: 'ACI-7.6',
      message: `Slab reinforcement (${As.toFixed(0)} mm²) below minimum (${As_min.toFixed(0)} mm²)`,
    });
  }

  const flexure_pos = calculateFlexuralCapacitySingly(b, d, As, fc, fy);
  const flexure_neg = calculateFlexuralCapacitySingly(b, d, As, fc, fy);
  const flexureDC_pos = Mu_pos / flexure_pos.phi_Mn;
  const flexureDC_neg = Mu_neg / flexure_neg.phi_Mn;
  const flexurePassed_pos = flexureDC_pos <= 1.0;
  const flexurePassed_neg = flexureDC_neg <= 1.0;

  let shear: { phi_Vn: number; bo?: number };
  let shearType: 'one-way' | 'two-way-punching';

  if (slabType === 'one-way') {
    shear = calculateOneWaySlabShear(fc, b, d);
    shearType = 'one-way';
  } else {
    const c1 = input.columnDimensions?.c1 || 300;
    const c2 = input.columnDimensions?.c2 || 300;
    shear = calculateTwoWayPunchingShear(fc, d, c1, c2);
    shearType = 'two-way-punching';
  }

  const shearDC = Vu / shear.phi_Vn;
  const shearPassed = shearDC <= 1.0;

  const maxDC = Math.max(flexureDC_pos, flexureDC_neg, shearDC);
  let governingCheck: string;
  if (maxDC === flexureDC_pos) {
    governingCheck = 'Positive Flexure';
  } else if (maxDC === flexureDC_neg) {
    governingCheck = 'Negative Flexure';
  } else {
    governingCheck = shearType === 'one-way' ? 'One-Way Shear' : 'Punching Shear';
  }

  const passed = flexurePassed_pos && flexurePassed_neg && shearPassed;

  return {
    flexure: {
      positive: { Mu: Mu_pos, phi_Mn: flexure_pos.phi_Mn, dcRatio: flexureDC_pos, passed: flexurePassed_pos },
      negative: { Mu: Mu_neg, phi_Mn: flexure_neg.phi_Mn, dcRatio: flexureDC_neg, passed: flexurePassed_neg },
    },
    shear: { Vu, phi_Vn: shear.phi_Vn, dcRatio: shearDC, shearType, passed: shearPassed },
    maxDCRatio: maxDC,
    governingCheck,
    passed,
    messages,
  };
}

/**
 * Run ACI 318 design checks for concrete slabs
 */
export async function runACISlabDesignChecks(
  projectId: string,
  analysisRunId: string
): Promise<DesignResult[]> {
  const db = getClient();
  const results: DesignResult[] = [];

  const slabRows = await db.execute({
    sql: `SELECT s.*, m.material_type, m.properties FROM slabs s JOIN materials m ON s.material_id = m.id WHERE s.project_id = ? AND m.material_type = 'concrete'`,
    args: [projectId],
  });

  if (slabRows.rows.length === 0) return results;

  const shellResultsRows = await db.execute({
    sql: `SELECT sr.*, se.parent_id, se.parent_type FROM shell_results sr JOIN shell_elements se ON sr.element_id = se.id WHERE sr.run_id = ? AND se.parent_type = 'slab'`,
    args: [analysisRunId],
  });

  const slabForcesMap = new Map<string, any[]>();
  for (const row of shellResultsRows.rows) {
    const parentId = (row as any).parent_id;
    if (!slabForcesMap.has(parentId)) slabForcesMap.set(parentId, []);
    slabForcesMap.get(parentId)!.push(row);
  }

  for (const row of slabRows.rows) {
    const slabId = (row as any).id;
    const shellResults = slabForcesMap.get(slabId) || [];
    if (shellResults.length === 0) continue;

    let maxM_pos = 0, maxM_neg = 0, maxShear = 0;
    for (const shell of shellResults) {
      const m11 = shell.m11 || 0, m22 = shell.m22 || 0, v13 = shell.v13 || 0, v23 = shell.v23 || 0;
      if (m11 > 0) maxM_pos = Math.max(maxM_pos, m11);
      if (m11 < 0) maxM_neg = Math.max(maxM_neg, Math.abs(m11));
      if (m22 > 0) maxM_pos = Math.max(maxM_pos, m22);
      if (m22 < 0) maxM_neg = Math.max(maxM_neg, Math.abs(m22));
      maxShear = Math.max(maxShear, Math.abs(v13), Math.abs(v23));
    }

    const properties = JSON.parse((row as any).properties || '{}');
    const fc = properties.fc || 28;
    const thickness = (row as any).thickness || 150;
    const slabType = (row as any).slab_type || 'two-way';

    const slabResult = checkConcreteSlab({
      id: slabId,
      slabType,
      thickness,
      width: 1000,
      fc,
      fy: 420,
      forces: { moment_pos: maxM_pos, moment_neg: maxM_neg, shear: maxShear },
      mainRebar: { As: 300, spacing: 400 },
      columnDimensions: { c1: 300, c2: 300 },
    });

    const status: DesignStatus = slabResult.passed ? 'pass' : slabResult.maxDCRatio <= 1.1 ? 'warning' : 'fail';

    // Determine capacity and demand based on governing check
    const isFlexureGoverning = slabResult.governingCheck.includes('Flexure');
    const capacity = isFlexureGoverning
      ? Math.max(slabResult.flexure.positive.phi_Mn, slabResult.flexure.negative.phi_Mn)
      : slabResult.shear.phi_Vn;
    const demand = isFlexureGoverning
      ? Math.max(slabResult.flexure.positive.Mu, slabResult.flexure.negative.Mu)
      : slabResult.shear.Vu;

    const designResult: DesignResult = {
      id: generateDesignResultId(),
      project_id: projectId,
      run_id: analysisRunId,
      combination_id: 'combo_id_placeholder', // TODO: Extract from shell_results
      member_id: slabId,
      member_type: 'slab',
      design_code: 'ACI 318-19',
      demand_capacity_ratio: slabResult.maxDCRatio,
      governing_check: slabResult.governingCheck,
      controlling_check: slabResult.governingCheck,
      capacity: capacity,
      demand: demand,
      status,
      checks: {
        flexure_major_capacity: slabResult.flexure.positive.phi_Mn,
        flexure_major_demand: slabResult.flexure.positive.Mu,
        flexure_major_ratio: slabResult.flexure.positive.dcRatio,
        flexure_minor_capacity: slabResult.flexure.negative.phi_Mn,
        flexure_minor_demand: slabResult.flexure.negative.Mu,
        flexure_minor_ratio: slabResult.flexure.negative.dcRatio,
        shear_major_capacity: slabResult.shear.phi_Vn,
        shear_major_demand: slabResult.shear.Vu,
        shear_major_ratio: slabResult.shear.dcRatio,
      },
      messages: slabResult.messages,
      created_at: new Date().toISOString(),
    };

    results.push(designResult);

    await db.execute({
      sql: `INSERT INTO design_results (id, run_id, member_id, member_type, design_code, demand_capacity_ratio, controlling_check, status, checks, messages, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [designResult.id, designResult.run_id, designResult.member_id, designResult.member_type, designResult.design_code, designResult.demand_capacity_ratio, designResult.controlling_check ?? null, designResult.status, JSON.stringify(designResult.checks), JSON.stringify(designResult.messages), new Date().toISOString()],
    });
  }

  return results;
}
