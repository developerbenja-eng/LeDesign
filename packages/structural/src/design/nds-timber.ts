/**
 * NDS Timber Design Checks
 *
 * Implements NDS 2018 (National Design Specification for Wood Construction)
 * - Chapter 3: Design Provisions and Equations
 * - Chapter 4: Sawn Lumber
 * - Chapter 5: Structural Glued Laminated Timber
 */

import { getDb } from '@ledesign/db';
import {
  Beam,
  Column,
  Section,
  Material,
  MemberResult,
  DesignResult,
  DesignMessage,
  DesignStatus,
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
// NDS 2018 CONSTANTS AND FACTORS
// ============================================================

// Resistance factors for LRFD (NDS 2018 Table N1)
const PHI_BENDING = 0.85;
const PHI_STABILITY = 0.85;
const PHI_COMPRESSION = 0.90;
const PHI_TENSION = 0.80;
const PHI_SHEAR = 0.75;
const PHI_CONNECTIONS = 0.65;

// Time effect factors (NDS 2018 Table N3)
const LAMBDA_FACTORS: Record<string, number> = {
  'dead_only': 0.6,
  'dead_live': 0.8,
  'dead_live_snow': 0.8,
  'dead_snow': 0.8,
  'dead_wind': 1.0,
  'dead_seismic': 1.0,
  'impact': 1.25,
};

// Format conversion factor (NDS 2018 Table N2)
const KF_BENDING = 2.54;
const KF_TENSION = 2.70;
const KF_COMPRESSION = 2.40;
const KF_COMPRESSION_PERP = 1.67;
const KF_SHEAR = 2.88;
const KF_STABILITY = 1.76;

// ============================================================
// REFERENCE DESIGN VALUES (Sample - Douglas Fir-Larch)
// ============================================================

export interface TimberGrade {
  species: string;
  grade: string;
  Fb: number;        // Bending (psi or MPa)
  Ft: number;        // Tension parallel (psi or MPa)
  Fc: number;        // Compression parallel (psi or MPa)
  Fv: number;        // Shear parallel (psi or MPa)
  Fc_perp: number;   // Compression perpendicular (psi or MPa)
  E: number;         // Modulus of elasticity (psi or MPa)
  E_min: number;     // Minimum modulus of elasticity
}

// Reference values in MPa (converted from NDS tables)
export const TIMBER_GRADES: Record<string, TimberGrade> = {
  'DF-L_SS': {
    species: 'Douglas Fir-Larch',
    grade: 'Select Structural',
    Fb: 10.3,    // 1500 psi
    Ft: 7.6,     // 1100 psi
    Fc: 11.4,    // 1650 psi
    Fv: 1.3,     // 180 psi
    Fc_perp: 4.5, // 650 psi
    E: 12400,    // 1,800,000 psi
    E_min: 6600, // 960,000 psi
  },
  'DF-L_1': {
    species: 'Douglas Fir-Larch',
    grade: 'No. 1',
    Fb: 8.3,     // 1200 psi
    Ft: 5.9,     // 850 psi
    Fc: 10.0,    // 1450 psi
    Fv: 1.3,     // 180 psi
    Fc_perp: 4.5, // 650 psi
    E: 11700,    // 1,700,000 psi
    E_min: 6200, // 900,000 psi
  },
  'DF-L_2': {
    species: 'Douglas Fir-Larch',
    grade: 'No. 2',
    Fb: 6.6,     // 950 psi
    Ft: 4.1,     // 600 psi
    Fc: 9.3,     // 1350 psi
    Fv: 1.3,     // 180 psi
    Fc_perp: 4.5, // 650 psi
    E: 11000,    // 1,600,000 psi
    E_min: 5800, // 840,000 psi
  },
  'SPF_SS': {
    species: 'Spruce-Pine-Fir',
    grade: 'Select Structural',
    Fb: 8.6,     // 1250 psi
    Ft: 5.9,     // 850 psi
    Fc: 8.6,     // 1250 psi
    Fv: 1.0,     // 140 psi
    Fc_perp: 3.1, // 450 psi
    E: 9700,     // 1,400,000 psi
    E_min: 5100, // 740,000 psi
  },
  'SPF_2': {
    species: 'Spruce-Pine-Fir',
    grade: 'No. 2',
    Fb: 6.2,     // 900 psi
    Ft: 3.4,     // 500 psi
    Fc: 7.2,     // 1050 psi
    Fv: 1.0,     // 140 psi
    Fc_perp: 3.1, // 450 psi
    E: 9700,     // 1,400,000 psi
    E_min: 5100, // 740,000 psi
  },
  'SYP_1': {
    species: 'Southern Pine',
    grade: 'No. 1',
    Fb: 10.3,    // 1500 psi
    Ft: 6.9,     // 1000 psi
    Fc: 12.4,    // 1800 psi
    Fv: 1.2,     // 175 psi
    Fc_perp: 4.0, // 575 psi
    E: 12400,    // 1,800,000 psi
    E_min: 6600, // 960,000 psi
  },
};

// ============================================================
// ADJUSTMENT FACTORS
// ============================================================

export interface AdjustmentFactors {
  CD: number;   // Load duration factor
  CM: number;   // Wet service factor
  Ct: number;   // Temperature factor
  CL: number;   // Beam stability factor
  CF: number;   // Size factor
  Cfu: number;  // Flat use factor
  Ci: number;   // Incising factor
  Cr: number;   // Repetitive member factor
  CP: number;   // Column stability factor
  Cb: number;   // Bearing area factor
  CV: number;   // Volume factor (glulam)
}

/**
 * Get default adjustment factors
 */
export function getDefaultAdjustmentFactors(): AdjustmentFactors {
  return {
    CD: 1.0,   // Normal load duration
    CM: 1.0,   // Dry conditions
    Ct: 1.0,   // Normal temperature
    CL: 1.0,   // Will be calculated
    CF: 1.0,   // Will be calculated
    Cfu: 1.0,  // Loaded on narrow face
    Ci: 1.0,   // Not incised
    Cr: 1.0,   // Not repetitive (conservative)
    CP: 1.0,   // Will be calculated
    Cb: 1.0,   // Will be calculated
    CV: 1.0,   // Will be calculated for glulam
  };
}

// ============================================================
// SIZE FACTOR (NDS 2018 4.3.6)
// ============================================================

/**
 * Calculate size factor CF for sawn lumber
 */
export function calculateSizeFactor(
  d: number,  // Depth in mm
  sizeCategory: 'dimension' | 'beams_stringers' | 'posts_timbers'
): number {
  const d_in = d / 25.4; // Convert to inches

  if (sizeCategory === 'dimension') {
    // Dimension lumber (2-4 inches thick)
    if (d_in <= 12) {
      return Math.pow(12 / d_in, 1/9);
    }
    return 0.9;
  } else if (sizeCategory === 'beams_stringers') {
    // Beams and stringers
    if (d_in > 12) {
      return Math.pow(12 / d_in, 1/9);
    }
    return 1.0;
  }
  // Posts and timbers
  return 1.0;
}

// ============================================================
// VOLUME FACTOR (NDS 2018 5.3.6) - Glulam
// ============================================================

/**
 * Calculate volume factor CV for glued laminated timber
 */
export function calculateVolumeFactor(
  L: number,    // Length in mm
  d: number,    // Depth in mm
  b: number,    // Width in mm
  loading: 'single_span' | 'cantilever' | 'continuous' = 'single_span'
): number {
  const L_ft = L / 304.8;
  const d_in = d / 25.4;
  const b_in = b / 25.4;

  // Reference dimensions
  const L_ref = 21; // feet
  const d_ref = 12; // inches
  const b_ref = 5.125; // inches

  // Exponent x based on loading
  const x = loading === 'single_span' ? 0.1 : 0.1;

  const CV = Math.pow(L_ref / L_ft, x) *
             Math.pow(d_ref / d_in, x) *
             Math.pow(b_ref / b_in, x);

  return Math.min(CV, 1.0);
}

// ============================================================
// BEAM STABILITY FACTOR (NDS 2018 3.3.3)
// ============================================================

/**
 * Calculate beam stability factor CL
 */
export function calculateBeamStabilityFactor(
  Le: number,    // Effective unbraced length (mm)
  d: number,     // Depth (mm)
  b: number,     // Width (mm)
  Fb_star: number, // Adjusted Fb without CL (MPa)
  E_min_prime: number // Adjusted E_min (MPa)
): number {
  // Slenderness ratio
  const RB = Math.sqrt(Le * d / (b * b));

  if (RB <= 7) {
    return 1.0; // No stability reduction
  }

  // Critical buckling stress
  const FbE = 1.20 * E_min_prime / (RB * RB);

  // Stability factor
  const ratio = FbE / Fb_star;
  const CL = (1 + ratio) / 1.9 -
             Math.sqrt(Math.pow((1 + ratio) / 1.9, 2) - ratio / 0.95);

  return CL;
}

// ============================================================
// COLUMN STABILITY FACTOR (NDS 2018 3.7.1)
// ============================================================

/**
 * Calculate column stability factor CP
 */
export function calculateColumnStabilityFactor(
  Le: number,     // Effective length (mm)
  d: number,      // Dimension parallel to buckling (mm)
  Fc_star: number, // Adjusted Fc without CP (MPa)
  E_min_prime: number, // Adjusted E_min (MPa)
  c: number = 0.8  // Column coefficient (0.8 for sawn, 0.9 for glulam)
): number {
  // Slenderness ratio
  const Le_d = Le / d;

  if (Le_d > 50) {
    // Exceeds maximum slenderness - needs special analysis
    return 0.1;
  }

  // Critical buckling stress
  const FcE = 0.822 * E_min_prime / (Le_d * Le_d);

  // Column stability factor
  const ratio = FcE / Fc_star;
  const CP = (1 + ratio) / (2 * c) -
             Math.sqrt(Math.pow((1 + ratio) / (2 * c), 2) - ratio / c);

  return CP;
}

// ============================================================
// ADJUSTED DESIGN VALUES
// ============================================================

export interface AdjustedDesignValues {
  Fb_prime: number;  // Adjusted bending
  Ft_prime: number;  // Adjusted tension
  Fc_prime: number;  // Adjusted compression parallel
  Fv_prime: number;  // Adjusted shear
  Fc_perp_prime: number; // Adjusted compression perpendicular
  E_prime: number;   // Adjusted E
  E_min_prime: number; // Adjusted E_min
}

/**
 * Calculate adjusted design values for sawn lumber (LRFD)
 */
export function calculateAdjustedDesignValuesLRFD(
  grade: TimberGrade,
  factors: AdjustmentFactors,
  lambda: number = 0.8  // Time effect factor
): AdjustedDesignValues {
  const { CD, CM, Ct, CL, CF, Cfu, Ci, Cr, CP } = factors;

  // LRFD adjusted values
  return {
    Fb_prime: grade.Fb * KF_BENDING * PHI_BENDING * lambda * CM * Ct * CL * CF * Cfu * Ci * Cr,
    Ft_prime: grade.Ft * KF_TENSION * PHI_TENSION * lambda * CM * Ct * CF * Ci,
    Fc_prime: grade.Fc * KF_COMPRESSION * PHI_COMPRESSION * lambda * CM * Ct * CF * Ci * CP,
    Fv_prime: grade.Fv * KF_SHEAR * PHI_SHEAR * lambda * CM * Ct * Ci,
    Fc_perp_prime: grade.Fc_perp * KF_COMPRESSION_PERP * PHI_COMPRESSION * lambda * CM * Ct * Ci,
    E_prime: grade.E * CM * Ct,
    E_min_prime: grade.E_min * KF_STABILITY * PHI_STABILITY * CM * Ct,
  };
}

/**
 * Calculate adjusted design values for sawn lumber (ASD)
 */
export function calculateAdjustedDesignValuesASD(
  grade: TimberGrade,
  factors: AdjustmentFactors
): AdjustedDesignValues {
  const { CD, CM, Ct, CL, CF, Cfu, Ci, Cr, CP, Cb } = factors;

  return {
    Fb_prime: grade.Fb * CD * CM * Ct * CL * CF * Cfu * Ci * Cr,
    Ft_prime: grade.Ft * CD * CM * Ct * CF * Ci,
    Fc_prime: grade.Fc * CD * CM * Ct * CF * Ci * CP,
    Fv_prime: grade.Fv * CD * CM * Ct * Ci,
    Fc_perp_prime: grade.Fc_perp * CM * Ct * Ci * Cb,
    E_prime: grade.E * CM * Ct,
    E_min_prime: grade.E_min * CM * Ct,
  };
}

// ============================================================
// CAPACITY CALCULATIONS
// ============================================================

export interface BendingCapacity {
  Mn: number;      // Nominal moment capacity (kN·m)
  Fb_prime: number; // Adjusted bending stress
  fb: number;      // Actual bending stress
  dcRatio: number;
  CL: number;      // Beam stability factor used
  governingMode: 'strength' | 'stability';
}

/**
 * Calculate bending capacity
 */
export function calculateBendingCapacity(
  Mu: number,      // Factored moment (kN·m)
  b: number,       // Width (mm)
  d: number,       // Depth (mm)
  Le: number,      // Effective unbraced length (mm)
  grade: TimberGrade,
  factors: AdjustmentFactors,
  method: 'LRFD' | 'ASD' = 'LRFD'
): BendingCapacity {
  // Section modulus
  const S = (b * d * d) / 6 / 1e6; // m³

  // Calculate adjusted values without CL
  const factorsNoCL = { ...factors, CL: 1.0 };
  const values = method === 'LRFD'
    ? calculateAdjustedDesignValuesLRFD(grade, factorsNoCL)
    : calculateAdjustedDesignValuesASD(grade, factorsNoCL);

  // Calculate beam stability factor
  const CL = calculateBeamStabilityFactor(Le, d, b, values.Fb_prime, values.E_min_prime);

  // Final adjusted bending stress
  const Fb_prime = values.Fb_prime * CL;

  // Moment capacity
  const Mn = Fb_prime * S * 1000; // kN·m

  // Actual stress
  const fb = Mu / S / 1000; // MPa

  return {
    Mn,
    Fb_prime,
    fb,
    dcRatio: fb / Fb_prime,
    CL,
    governingMode: CL < 1.0 ? 'stability' : 'strength',
  };
}

export interface ShearCapacity {
  Vn: number;      // Nominal shear capacity (kN)
  Fv_prime: number; // Adjusted shear stress
  fv: number;      // Actual shear stress
  dcRatio: number;
}

/**
 * Calculate shear capacity
 */
export function calculateShearCapacity(
  Vu: number,      // Factored shear (kN)
  b: number,       // Width (mm)
  d: number,       // Depth (mm)
  grade: TimberGrade,
  factors: AdjustmentFactors,
  method: 'LRFD' | 'ASD' = 'LRFD'
): ShearCapacity {
  const values = method === 'LRFD'
    ? calculateAdjustedDesignValuesLRFD(grade, factors)
    : calculateAdjustedDesignValuesASD(grade, factors);

  // Shear capacity (NDS 3.4.2)
  const A = b * d / 1e6; // m²
  const Vn = (2/3) * values.Fv_prime * A * 1000; // kN

  // Actual shear stress
  const fv = (3/2) * Vu / (b * d) * 1000; // MPa

  return {
    Vn,
    Fv_prime: values.Fv_prime,
    fv,
    dcRatio: fv / values.Fv_prime,
  };
}

export interface CompressionCapacity {
  Pn: number;        // Nominal compression capacity (kN)
  Fc_prime: number;  // Adjusted compression stress
  fc: number;        // Actual compression stress
  dcRatio: number;
  CP: number;        // Column stability factor used
  slenderness: number;
  governingMode: 'strength' | 'buckling';
}

/**
 * Calculate compression capacity for column
 */
export function calculateCompressionCapacity(
  Pu: number,        // Factored axial load (kN)
  b: number,         // Width (mm)
  d: number,         // Depth (mm) - parallel to buckling
  Le: number,        // Effective length (mm)
  grade: TimberGrade,
  factors: AdjustmentFactors,
  isGlulam: boolean = false,
  method: 'LRFD' | 'ASD' = 'LRFD'
): CompressionCapacity {
  const A = b * d / 1e6; // m²
  const Le_d = Le / d;

  // Calculate adjusted values without CP
  const factorsNoCP = { ...factors, CP: 1.0 };
  const values = method === 'LRFD'
    ? calculateAdjustedDesignValuesLRFD(grade, factorsNoCP)
    : calculateAdjustedDesignValuesASD(grade, factorsNoCP);

  // Column stability factor
  const c = isGlulam ? 0.9 : 0.8;
  const CP = calculateColumnStabilityFactor(Le, d, values.Fc_prime, values.E_min_prime, c);

  // Final adjusted compression stress
  const Fc_prime = values.Fc_prime * CP;

  // Compression capacity
  const Pn = Fc_prime * A * 1000; // kN

  // Actual stress
  const fc = Pu / A / 1000; // MPa

  return {
    Pn,
    Fc_prime,
    fc,
    dcRatio: fc / Fc_prime,
    CP,
    slenderness: Le_d,
    governingMode: CP < 1.0 ? 'buckling' : 'strength',
  };
}

// ============================================================
// COMBINED LOADING (NDS 2018 3.9)
// ============================================================

export interface CombinedLoadingResult {
  interaction: number;  // Interaction equation result
  passed: boolean;
  equation: string;     // Which equation governed
}

/**
 * Check combined bending and axial compression (NDS 3.9.2)
 */
export function checkCombinedBendingCompression(
  fc: number,      // Actual compression stress (MPa)
  Fc_prime: number, // Adjusted compression stress (MPa)
  fb1: number,     // Actual bending stress about axis 1 (MPa)
  Fb1_prime: number, // Adjusted bending stress about axis 1 (MPa)
  fb2: number = 0,     // Actual bending stress about axis 2 (MPa)
  Fb2_prime: number = 0, // Adjusted bending stress about axis 2 (MPa)
  FcE1: number,    // Critical buckling stress axis 1 (MPa)
  FcE2: number = 0 // Critical buckling stress axis 2 (MPa)
): CombinedLoadingResult {
  // Amplification factors
  const amp1 = fc / FcE1 < 1 ? 1 - fc / FcE1 : 0.001;
  const amp2 = FcE2 > 0 && fc / FcE2 < 1 ? 1 - fc / FcE2 : 1.0;

  // Interaction equation (NDS Eq. 3.9-3)
  const term1 = Math.pow(fc / Fc_prime, 2);
  const term2 = fb1 / (Fb1_prime * amp1);
  const term3 = fb2 > 0 ? fb2 / (Fb2_prime * amp2) : 0;

  const interaction = term1 + term2 + term3;

  return {
    interaction,
    passed: interaction <= 1.0,
    equation: 'NDS 3.9-3',
  };
}

/**
 * Check combined bending and axial tension (NDS 3.9.1)
 */
export function checkCombinedBendingTension(
  ft: number,      // Actual tension stress (MPa)
  Ft_prime: number, // Adjusted tension stress (MPa)
  fb: number,      // Actual bending stress (MPa)
  Fb_prime: number, // Adjusted bending stress (MPa)
  Fb_star: number  // Adjusted bending stress without CL (MPa)
): CombinedLoadingResult {
  // Two equations must be checked
  const eq1 = ft / Ft_prime + fb / Fb_prime;
  const eq2 = (fb - ft) / Fb_star;

  const interaction = Math.max(eq1, eq2);

  return {
    interaction,
    passed: interaction <= 1.0,
    equation: eq1 >= eq2 ? 'NDS 3.9-1' : 'NDS 3.9-2',
  };
}

// ============================================================
// DESIGN CHECK RUNNER
// ============================================================

/**
 * Run NDS design checks for timber elements
 */
export async function runNDSDesignChecks(
  projectId: string,
  analysisRunId: string
): Promise<DesignResult[]> {
  const db = getDb();
  const results: DesignResult[] = [];

  // Get beams with timber material
  const beamRows = await db.execute({
    sql: `
      SELECT b.*, m.material_type, m.yield_strength, m.properties,
             s.section_type, s.dimensions,
             n1.x as x1, n1.y as y1, n1.z as z1,
             n2.x as x2, n2.y as y2, n2.z as z2
      FROM beams b
      JOIN materials m ON b.material_id = m.id
      JOIN sections s ON b.section_id = s.id
      JOIN nodes n1 ON b.start_node_id = n1.id
      JOIN nodes n2 ON b.end_node_id = n2.id
      WHERE b.project_id = ? AND m.material_type = 'timber'
    `,
    args: [projectId],
  });

  // Get member results
  const memberResultsRows = await db.execute({
    sql: `SELECT * FROM member_results WHERE analysis_run_id = ?`,
    args: [analysisRunId],
  });

  const memberResultsMap = new Map<string, MemberResult>();
  for (const row of memberResultsRows.rows) {
    const result = memberResultRowToMemberResult(row as unknown as MemberResultRow);
    memberResultsMap.set(result.member_id, result);
  }

  for (const row of beamRows.rows) {
    const beam = beamRowToBeam(row as unknown as BeamRow);
    const memberResult = memberResultsMap.get(beam.id);

    if (!memberResult) continue;

    // Extract properties
    const dimensions = (row as any).dimensions as any;
    const properties = JSON.parse((row as any).properties || '{}');

    // Get timber grade (default to Douglas Fir-Larch No. 2)
    const gradeKey = properties.gradeKey || 'DF-L_2';
    const grade = TIMBER_GRADES[gradeKey] || TIMBER_GRADES['DF-L_2'];

    // Section dimensions
    const b = dimensions?.b || 89;  // mm (typical 2x dimension)
    const d = dimensions?.d || 235; // mm (typical 2x10)

    // Calculate length
    const dx = (row as any).x2 - (row as any).x1;
    const dy = (row as any).y2 - (row as any).y1;
    const dz = (row as any).z2 - (row as any).z1;
    const length = Math.sqrt(dx*dx + dy*dy + dz*dz) * 1000; // mm

    // Get forces
    const Mu = Math.abs(memberResult.moment_major || 0);
    const Vu = Math.abs(memberResult.shear_major || 0);

    // Set up adjustment factors
    const factors = getDefaultAdjustmentFactors();
    factors.CF = calculateSizeFactor(d, 'dimension');

    // Calculate capacities
    const bending = calculateBendingCapacity(Mu, b, d, length, grade, factors);
    const shear = calculateShearCapacity(Vu, b, d, grade, factors);

    const maxDC = Math.max(bending.dcRatio, shear.dcRatio);
    const messages: DesignMessage[] = [];

    // Check slenderness
    const Le_d = length / d;
    if (Le_d > 50) {
      messages.push({
        type: 'error',
        code: 'NDS-3.7.1.4',
        message: `Slenderness ratio (${Le_d.toFixed(1)}) exceeds maximum of 50`,
      });
    }

    // Check depth/width ratio for stability
    if (d / b > 7) {
      messages.push({
        type: 'warning',
        code: 'NDS-4.4.1',
        message: `Depth/width ratio (${(d/b).toFixed(1)}) exceeds 7:1 - lateral bracing required`,
      });
    }

    // Determine status
    let status: DesignStatus;
    if (maxDC > 1.0) {
      status = 'fail';
      messages.push({
        type: 'error',
        code: 'NDS-CAPACITY',
        message: `Demand exceeds capacity (D/C = ${maxDC.toFixed(2)})`,
      });
    } else if (maxDC > 0.9 || bending.CL < 0.9) {
      status = 'warning';
    } else {
      status = 'pass';
    }

    const designResult: DesignResult = {
      id: generateDesignResultId(),
      run_id: analysisRunId,
      member_id: beam.id,
      member_type: 'beam',
      design_code: 'NDS 2018',
      demand_capacity_ratio: maxDC,
      controlling_check: bending.dcRatio >= shear.dcRatio ? 'Bending' : 'Shear',
      status,
      checks: {
        bending: {
          Mu: Mu.toFixed(2),
          Mn: bending.Mn.toFixed(2),
          Fb_prime: bending.Fb_prime.toFixed(2),
          fb: bending.fb.toFixed(2),
          CL: bending.CL.toFixed(3),
          CF: factors.CF.toFixed(3),
          dcRatio: bending.dcRatio.toFixed(3),
          governingMode: bending.governingMode,
        },
        shear: {
          Vu: Vu.toFixed(2),
          Vn: shear.Vn.toFixed(2),
          Fv_prime: shear.Fv_prime.toFixed(2),
          fv: shear.fv.toFixed(2),
          dcRatio: shear.dcRatio.toFixed(3),
        },
        section: {
          b: b.toFixed(0),
          d: d.toFixed(0),
          length: length.toFixed(0),
          slenderness: Le_d.toFixed(1),
        },
        material: {
          species: grade.species,
          grade: grade.grade,
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
