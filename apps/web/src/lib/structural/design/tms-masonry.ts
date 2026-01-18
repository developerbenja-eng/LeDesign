/**
 * TMS 402 Masonry Design Checks
 *
 * Implements TMS 402-16 (Building Code Requirements for Masonry Structures)
 * - Chapter 8: Strength Design of Masonry
 * - Chapter 9: Strength Design of Reinforced Masonry
 */

import {
  DesignResult,
  DesignMessage,
  DesignStatus,
} from '@/types/structural';
import { generateDesignResultId } from '../factories';

// ============================================================
// STRENGTH REDUCTION FACTORS (TMS 402 Table 8.3.2)
// ============================================================

const PHI_AXIAL = 0.90;           // Axial compression
const PHI_FLEXURE = 0.90;         // Flexure
const PHI_SHEAR = 0.80;           // Shear (reinforced)
const PHI_SHEAR_UNREINFORCED = 0.60; // Shear (unreinforced)
const PHI_BEARING = 0.60;         // Bearing

// ============================================================
// MATERIAL SPECIFICATIONS
// ============================================================

export interface MasonrySpecification {
  type: 'clay' | 'concrete' | 'aac' | 'stone';
  fm: number;          // Compressive strength (MPa)
  Em: number;          // Modulus of elasticity (MPa)
  Evg: number;         // Shear modulus (MPa)
  fr: number;          // Modulus of rupture (MPa)
  weight: number;      // Unit weight (kN/m³)
}

// TMS 402 Table 4.2.2
export function getMasonryModulus(fm: number, type: 'clay' | 'concrete' | 'aac' = 'concrete'): number {
  if (type === 'clay') {
    return 700 * fm; // Em = 700 * f'm for clay
  } else if (type === 'aac') {
    return 6500; // Typical AAC
  }
  return 900 * fm; // Em = 900 * f'm for concrete masonry
}

export function getMasonryShearModulus(Em: number): number {
  return 0.4 * Em; // Evg = 0.4 * Em
}

export function getModulusOfRupture(fm: number, grouting: 'fully' | 'partially' | 'ungrouted'): number {
  // TMS 402 Table 9.1.11.2
  if (grouting === 'fully') {
    return 0.31 * Math.sqrt(fm);
  } else if (grouting === 'partially') {
    return 0.24 * Math.sqrt(fm);
  }
  return 0.17 * Math.sqrt(fm); // Ungrouted
}

// ============================================================
// STANDARD MASONRY UNITS
// ============================================================

export interface MasonryUnit {
  name: string;
  width: number;      // Actual width (mm)
  height: number;     // Actual height (mm)
  length: number;     // Actual length (mm)
  faceShellT: number; // Face shell thickness (mm)
  webT: number;       // Web thickness (mm)
  An: number;         // Net area per unit length (mm²/m)
  In: number;         // Net moment of inertia per unit length (mm⁴/m)
  Sn: number;         // Net section modulus per unit length (mm³/m)
}

export const STANDARD_CMU: Record<string, MasonryUnit> = {
  '150mm': {
    name: '150mm (6")',
    width: 140,
    height: 190,
    length: 390,
    faceShellT: 25,
    webT: 25,
    An: 55900,
    In: 92e6,
    Sn: 1.32e6,
  },
  '200mm': {
    name: '200mm (8")',
    width: 190,
    height: 190,
    length: 390,
    faceShellT: 32,
    webT: 32,
    An: 72400,
    In: 218e6,
    Sn: 2.30e6,
  },
  '250mm': {
    name: '250mm (10")',
    width: 240,
    height: 190,
    length: 390,
    faceShellT: 32,
    webT: 32,
    An: 83900,
    In: 389e6,
    Sn: 3.24e6,
  },
  '300mm': {
    name: '300mm (12")',
    width: 290,
    height: 190,
    length: 390,
    faceShellT: 32,
    webT: 32,
    An: 95400,
    In: 614e6,
    Sn: 4.23e6,
  },
};

// ============================================================
// GROUT PROPERTIES
// ============================================================

export interface GroutProperties {
  fg: number;         // Grout compressive strength (MPa)
  Eg: number;         // Grout modulus (typically 500*fg)
}

export const GROUT_GRADES: Record<string, GroutProperties> = {
  'coarse_14MPa': { fg: 14, Eg: 7000 },
  'fine_14MPa': { fg: 14, Eg: 7000 },
  'coarse_21MPa': { fg: 21, Eg: 10500 },
  'fine_21MPa': { fg: 21, Eg: 10500 },
  'coarse_28MPa': { fg: 28, Eg: 14000 },
  'fine_28MPa': { fg: 28, Eg: 14000 },
};

// ============================================================
// REINFORCEMENT
// ============================================================

export interface MasonryReinforcement {
  vertical: {
    size: string;       // Bar size (e.g., "#4")
    spacing: number;    // On-center spacing (mm)
    As: number;         // Area per unit length (mm²/m)
  };
  horizontal?: {
    size: string;
    spacing: number;    // Vertical spacing (mm)
    As: number;
  };
}

// ============================================================
// SECTION PROPERTIES
// ============================================================

export interface MasonrySectionProperties {
  t: number;          // Wall thickness (mm)
  b: number;          // Unit width considered (mm)
  An: number;         // Net area (mm²)
  Ag: number;         // Gross area (mm²)
  In: number;         // Net moment of inertia (mm⁴)
  Ig: number;         // Gross moment of inertia (mm⁴)
  Sn: number;         // Net section modulus (mm³)
  Sg: number;         // Gross section modulus (mm³)
  d: number;          // Effective depth to tension steel (mm)
  As: number;         // Tension reinforcement area (mm²)
  rho: number;        // Reinforcement ratio
}

/**
 * Calculate section properties for grouted masonry wall
 */
export function calculateSectionProperties(
  unit: MasonryUnit,
  grouting: 'fully' | 'partially' | 'ungrouted',
  reinforcement?: MasonryReinforcement,
  considerLength: number = 1000 // mm (default 1m strip)
): MasonrySectionProperties {
  const t = unit.width;
  const b = considerLength;

  // Gross properties
  const Ag = t * b;
  const Ig = (b * Math.pow(t, 3)) / 12;
  const Sg = (b * Math.pow(t, 2)) / 6;

  // Net properties depend on grouting
  let An: number, In: number, Sn: number;
  if (grouting === 'fully') {
    An = Ag;
    In = Ig;
    Sn = Sg;
  } else {
    // Use tabulated values adjusted for length
    const factor = b / 1000;
    An = unit.An * factor;
    In = unit.In * factor;
    Sn = unit.Sn * factor;
  }

  // Reinforcement properties
  let d = t / 2; // Default to center
  let As = 0;
  if (reinforcement?.vertical) {
    d = t - 40 - 5; // Assuming 40mm cover + half bar diameter
    As = reinforcement.vertical.As * (b / 1000);
  }

  const rho = As / (b * d);

  return {
    t,
    b,
    An,
    Ag,
    In,
    Ig,
    Sn,
    Sg,
    d,
    As,
    rho,
  };
}

// ============================================================
// AXIAL COMPRESSION (TMS 402 Section 8.3.4)
// ============================================================

export interface AxialCapacity {
  Pn: number;         // Nominal axial capacity (kN)
  phi_Pn: number;     // Design axial capacity (kN)
  h_r: number;        // Slenderness ratio
  slendernessFactor: number;
}

/**
 * Calculate axial compression capacity
 */
export function calculateAxialCapacity(
  fm: number,         // Masonry strength (MPa)
  An: number,         // Net area (mm²)
  h: number,          // Effective height (mm)
  r: number,          // Radius of gyration (mm)
  isReinforced: boolean = false
): AxialCapacity {
  const h_r = h / r;

  // Slenderness reduction (TMS 402 Eq. 8-19)
  let slendernessFactor: number;
  if (h_r <= 99) {
    slendernessFactor = 1 - Math.pow(h_r / 140, 2);
  } else {
    slendernessFactor = Math.pow(70 / h_r, 2);
  }

  // Nominal capacity
  let Pn: number;
  if (isReinforced) {
    // TMS 402 Eq. 9-17: Pn = 0.80 * [0.80 * f'm * (An - Ast) + fy * Ast]
    // Simplified without steel contribution
    Pn = 0.80 * 0.80 * fm * An / 1000; // kN
  } else {
    // TMS 402 Eq. 8-19
    Pn = 0.80 * fm * An * slendernessFactor / 1000;
  }

  return {
    Pn,
    phi_Pn: PHI_AXIAL * Pn,
    h_r,
    slendernessFactor,
  };
}

// ============================================================
// FLEXURAL CAPACITY (TMS 402 Section 9.3)
// ============================================================

export interface FlexuralCapacity {
  Mn: number;         // Nominal moment capacity (kN·m)
  phi_Mn: number;     // Design moment capacity (kN·m)
  a: number;          // Compression block depth (mm)
  c: number;          // Neutral axis depth (mm)
  epsilon_s: number;  // Steel strain
  controlMode: 'tension' | 'compression';
}

/**
 * Calculate flexural capacity for reinforced masonry
 */
export function calculateFlexuralCapacity(
  fm: number,         // Masonry strength (MPa)
  fy: number,         // Steel yield strength (MPa)
  b: number,          // Width (mm)
  d: number,          // Effective depth (mm)
  As: number          // Tension steel area (mm²)
): FlexuralCapacity {
  const epsilon_mu = 0.0025; // Ultimate masonry strain (TMS 402)
  const Es = 200000;

  // Assume steel yields
  const a = (As * fy) / (0.80 * fm * b);
  const c = a / 0.80;

  // Check steel strain
  const epsilon_s = epsilon_mu * (d - c) / c;
  const epsilon_y = fy / Es;

  // Control mode
  const controlMode = epsilon_s >= epsilon_y ? 'tension' : 'compression';

  // Moment capacity
  const Mn = As * fy * (d - a / 2) / 1e6; // kN·m

  return {
    Mn,
    phi_Mn: PHI_FLEXURE * Mn,
    a,
    c,
    epsilon_s,
    controlMode,
  };
}

// ============================================================
// SHEAR CAPACITY (TMS 402 Section 9.3.4)
// ============================================================

export interface ShearCapacity {
  Vnm: number;        // Masonry shear contribution (kN)
  Vns: number;        // Steel shear contribution (kN)
  Vn: number;         // Nominal shear capacity (kN)
  phi_Vn: number;     // Design shear capacity (kN)
  Vn_max: number;     // Maximum allowed Vn (kN)
}

/**
 * Calculate shear capacity for reinforced masonry
 */
export function calculateShearCapacity(
  fm: number,         // Masonry strength (MPa)
  fy: number,         // Steel yield strength (MPa)
  An: number,         // Net area in shear (mm²)
  d: number,          // Effective depth (mm)
  Mu: number,         // Moment at section (kN·m)
  Vu: number,         // Shear at section (kN)
  Av: number = 0,     // Shear reinforcement area (mm²)
  s: number = 1       // Shear reinforcement spacing (mm)
): ShearCapacity {
  // M/Vd ratio
  const M_Vd = Math.abs(Mu * 1000 / (Vu * d));
  const M_Vd_limited = Math.min(Math.max(M_Vd, 0.25), 1.0);

  // Masonry shear contribution (TMS 402 Eq. 9-22)
  // Vnm = [4.0 - 1.75(Mu/Vudv)] * An * sqrt(f'm) + 0.25 * Pu (simplified without axial)
  const Vnm_coef = 4.0 - 1.75 * M_Vd_limited;
  const Vnm = Vnm_coef * An * Math.sqrt(fm) / 1000; // kN

  // Steel shear contribution (TMS 402 Eq. 9-23)
  // Vns = 0.5 * (Av / s) * fy * dv
  const Vns = Av > 0 && s > 0 ? 0.5 * (Av / s) * fy * d / 1000 : 0; // kN

  // Total nominal shear
  const Vn = Vnm + Vns;

  // Maximum shear (TMS 402 Eq. 9-26)
  // Based on M/(Vd) ratio
  let Vn_max_coef: number;
  if (M_Vd <= 0.25) {
    Vn_max_coef = 6.0;
  } else if (M_Vd >= 1.0) {
    Vn_max_coef = 4.0;
  } else {
    Vn_max_coef = 6.0 - 2.67 * (M_Vd - 0.25);
  }
  const Vn_max = Vn_max_coef * An * Math.sqrt(fm) / 1000;

  // Limited Vn
  const Vn_limited = Math.min(Vn, Vn_max);

  return {
    Vnm,
    Vns,
    Vn: Vn_limited,
    phi_Vn: PHI_SHEAR * Vn_limited,
    Vn_max,
  };
}

// ============================================================
// COMBINED AXIAL AND FLEXURE (TMS 402 Section 9.3.5)
// ============================================================

export interface CombinedCapacity {
  Pn: number;
  Mn: number;
  interaction: number;
  passed: boolean;
}

/**
 * Check combined axial and flexure using interaction diagram
 * Simplified linear interaction
 */
export function checkCombinedAxialFlexure(
  Pu: number,         // Factored axial load (kN)
  Mu: number,         // Factored moment (kN·m)
  phi_Pn: number,     // Design axial capacity (kN)
  phi_Mn: number      // Design moment capacity (kN·m)
): CombinedCapacity {
  // Simplified linear interaction
  // (Pu / phi_Pn) + (Mu / phi_Mn) <= 1.0

  const interaction = (Pu / phi_Pn) + (Mu / phi_Mn);

  return {
    Pn: phi_Pn,
    Mn: phi_Mn,
    interaction,
    passed: interaction <= 1.0,
  };
}

// ============================================================
// MINIMUM REINFORCEMENT (TMS 402 Section 9.3.3)
// ============================================================

/**
 * Calculate minimum reinforcement requirements
 */
export function getMinimumReinforcement(
  An: number,         // Net area (mm²)
  seismicCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' = 'B'
): { minRho: number; minAs: number; maxSpacing: number } {
  let minRho: number;
  let maxSpacing: number;

  if (seismicCategory >= 'D') {
    // Special reinforced masonry
    minRho = 0.0007;
    maxSpacing = 1200; // 48" max vertical spacing
  } else {
    // Ordinary or intermediate
    minRho = 0.0002;
    maxSpacing = 2400;
  }

  const minAs = minRho * An;

  return {
    minRho,
    minAs,
    maxSpacing,
  };
}

// ============================================================
// DESIGN CHECK RUNNER
// ============================================================

export interface MasonryDesignInput {
  // Geometry
  unit: MasonryUnit;
  height: number;       // Wall height (mm)
  length: number;       // Wall length (mm)

  // Material
  fm: number;           // Masonry strength (MPa)
  fy: number;           // Steel yield strength (MPa)
  grouting: 'fully' | 'partially' | 'ungrouted';

  // Reinforcement
  reinforcement?: MasonryReinforcement;

  // Loads
  Pu: number;           // Factored axial (kN)
  Mu: number;           // Factored moment (kN·m)
  Vu: number;           // Factored shear (kN)
}

export interface MasonryDesignResult {
  dcRatio: number;
  governingCheck: string;
  status: DesignStatus;
  axial: AxialCapacity;
  flexure?: FlexuralCapacity;
  shear: ShearCapacity;
  combined?: CombinedCapacity;
  messages: DesignMessage[];
}

/**
 * Perform complete masonry design check
 */
export function checkMasonryWall(input: MasonryDesignInput): MasonryDesignResult {
  const messages: DesignMessage[] = [];

  // Calculate section properties
  const section = calculateSectionProperties(
    input.unit,
    input.grouting,
    input.reinforcement
  );

  const isReinforced = input.reinforcement !== undefined && section.As > 0;

  // Radius of gyration
  const r = Math.sqrt(section.In / section.An);

  // Axial capacity
  const axial = calculateAxialCapacity(
    input.fm,
    section.An,
    input.height,
    r,
    isReinforced
  );

  // Shear capacity
  const shear = calculateShearCapacity(
    input.fm,
    input.fy,
    section.An,
    section.d,
    input.Mu,
    input.Vu,
    input.reinforcement?.horizontal?.As,
    input.reinforcement?.horizontal?.spacing
  );

  // Flexural capacity (if reinforced)
  let flexure: FlexuralCapacity | undefined;
  if (isReinforced) {
    flexure = calculateFlexuralCapacity(
      input.fm,
      input.fy,
      section.b,
      section.d,
      section.As
    );
  }

  // D/C ratios
  const axialDC = input.Pu / axial.phi_Pn;
  const shearDC = input.Vu / shear.phi_Vn;
  let flexureDC = 0;
  let combinedInteraction = 0;

  if (flexure) {
    flexureDC = input.Mu / flexure.phi_Mn;

    // Combined interaction
    const combined = checkCombinedAxialFlexure(
      input.Pu,
      input.Mu,
      axial.phi_Pn,
      flexure.phi_Mn
    );
    combinedInteraction = combined.interaction;
  }

  // Find governing
  const dcRatios = [
    { name: 'Axial', value: axialDC },
    { name: 'Shear', value: shearDC },
  ];
  if (flexure) {
    dcRatios.push({ name: 'Flexure', value: flexureDC });
    dcRatios.push({ name: 'Combined', value: combinedInteraction });
  }

  const governing = dcRatios.reduce((a, b) => a.value > b.value ? a : b);
  const maxDC = governing.value;

  // Check slenderness
  if (axial.h_r > 99) {
    messages.push({
      type: 'warning',
      code: 'TMS-8.3.4.2',
      message: `Slenderness ratio (${axial.h_r.toFixed(1)}) exceeds 99 - using reduced capacity`,
    });
  }
  if (axial.h_r > 140) {
    messages.push({
      type: 'error',
      code: 'TMS-8.3.4.2',
      message: `Slenderness ratio (${axial.h_r.toFixed(1)}) exceeds maximum of 140`,
    });
  }

  // Check minimum reinforcement
  if (isReinforced) {
    const minReq = getMinimumReinforcement(section.An);
    if (section.rho < minReq.minRho) {
      messages.push({
        type: 'warning',
        code: 'TMS-9.3.3',
        message: `Reinforcement ratio (${(section.rho * 100).toFixed(3)}%) is less than minimum (${(minReq.minRho * 100).toFixed(3)}%)`,
      });
    }
  }

  // Determine status
  let status: DesignStatus;
  if (maxDC > 1.0) {
    status = 'fail';
    messages.push({
      type: 'error',
      code: 'TMS-CAPACITY',
      message: `Demand exceeds capacity (D/C = ${maxDC.toFixed(2)})`,
    });
  } else if (maxDC > 0.9) {
    status = 'warning';
  } else {
    status = 'pass';
  }

  return {
    dcRatio: maxDC,
    governingCheck: governing.name,
    status,
    axial,
    flexure,
    shear,
    combined: flexure ? {
      Pn: axial.phi_Pn,
      Mn: flexure.phi_Mn,
      interaction: combinedInteraction,
      passed: combinedInteraction <= 1.0,
    } : undefined,
    messages,
  };
}

/**
 * Create design result for database storage
 */
export function createMasonryDesignResult(
  elementId: string,
  analysisRunId: string,
  result: MasonryDesignResult
): DesignResult {
  return {
    id: generateDesignResultId(),
    run_id: analysisRunId,
    member_id: elementId,
    member_type: 'column', // Masonry is typically used for walls/columns
    design_code: 'TMS 402-16',
    demand_capacity_ratio: result.dcRatio,
    controlling_check: result.governingCheck,
    status: result.status,
    checks: {
      axial: {
        Pn: result.axial.Pn.toFixed(2),
        phi_Pn: result.axial.phi_Pn.toFixed(2),
        h_r: result.axial.h_r.toFixed(1),
        slendernessFactor: result.axial.slendernessFactor.toFixed(3),
      },
      shear: {
        Vnm: result.shear.Vnm.toFixed(2),
        Vns: result.shear.Vns.toFixed(2),
        Vn: result.shear.Vn.toFixed(2),
        phi_Vn: result.shear.phi_Vn.toFixed(2),
        Vn_max: result.shear.Vn_max.toFixed(2),
      },
      flexure: result.flexure ? {
        Mn: result.flexure.Mn.toFixed(2),
        phi_Mn: result.flexure.phi_Mn.toFixed(2),
        a: result.flexure.a.toFixed(1),
        controlMode: result.flexure.controlMode,
      } : undefined,
      combined: result.combined ? {
        interaction: result.combined.interaction.toFixed(3),
        passed: result.combined.passed,
      } : undefined,
    },
    messages: result.messages,
    created_at: new Date().toISOString(),
  };
}

// ============================================================
// TMS MASONRY WALL DESIGN INTEGRATION
// ============================================================

import { getDb } from '@/lib/db/turso';
import { wallRowToWall, WallRow } from '@/types/structural';

interface WallForces {
  axial: number;      // Axial compression (kN)
  moment: number;     // Bending moment (kN·m)
  shear: number;      // Shear force (kN)
}

/**
 * Aggregate shell element forces for a parent wall
 */
function aggregateShellForcesForMasonry(shellResults: any[]): WallForces {
  let totalAxial = 0;
  let totalShear = 0;
  let totalMoment = 0;

  for (const shell of shellResults) {
    totalAxial += Math.abs(shell.f11 || 0);   // Membrane force (N)
    totalShear += Math.abs(shell.f12 || 0);   // In-plane shear (N)
    totalMoment += Math.abs(shell.m11 || 0);  // Bending moment (N·mm)
  }

  // Convert to kN and kN·m for TMS functions
  return {
    axial: totalAxial / 1000,        // N → kN
    moment: totalMoment / 1000000,   // N·mm → kN·m
    shear: totalShear / 1000,        // N → kN
  };
}

/**
 * Run TMS 402 design checks for masonry walls
 * @param projectId - Project ID
 * @param analysisRunId - Analysis run ID
 * @returns Array of design results for all masonry walls
 */
export async function runTMSWallDesignChecks(
  projectId: string,
  analysisRunId: string
): Promise<DesignResult[]> {
  const db = getDb();
  const results: DesignResult[] = [];

  // 1. Get all masonry walls for this project
  const wallsResult = await db.execute({
    sql: `SELECT w.*, m.name as material_name, m.properties as material_props
          FROM walls w
          JOIN materials m ON w.material_id = m.id
          WHERE w.project_id = ? AND m.material_type = 'masonry'`,
    args: [projectId],
  });

  if (wallsResult.rows.length === 0) {
    return results;
  }

  // 2. Get all shell results for this analysis run
  const shellResultsQuery = await db.execute({
    sql: `SELECT sr.*, se.parent_id, se.parent_type
          FROM shell_results sr
          JOIN shell_elements se ON sr.element_id = se.id
          JOIN analysis_runs ar ON sr.run_id = ar.id
          WHERE ar.id = ? AND se.parent_type = 'wall'`,
    args: [analysisRunId],
  });

  // 3. Group shell results by parent wall ID
  const shellResultsByWall = new Map<string, any[]>();
  for (const row of shellResultsQuery.rows) {
    const parentId = row.parent_id as string;
    if (!shellResultsByWall.has(parentId)) {
      shellResultsByWall.set(parentId, []);
    }
    shellResultsByWall.get(parentId)!.push(row);
  }

  // 4. Run design checks for each masonry wall
  for (const wallRow of wallsResult.rows) {
    const wall = wallRowToWall(wallRow as unknown as WallRow);
    const shellResults = shellResultsByWall.get(wall.id) || [];

    if (shellResults.length === 0) {
      // No shell results for this wall
      const result: DesignResult = {
        id: generateDesignResultId(),
        run_id: analysisRunId,
        member_id: wall.id,
        member_type: 'wall',
        design_code: 'TMS 402-16',
        demand_capacity_ratio: 0,
        controlling_combination_id: null,
        controlling_check: null,
        status: 'warning',
        checks: {},
        messages: [
          {
            type: 'warning',
            message: 'No shell element results found for this wall',
          },
        ],
        created_at: new Date().toISOString(),
      };
      results.push(result);
      continue;
    }

    // Aggregate forces from shell elements
    const forces = aggregateShellForcesForMasonry(shellResults);

    // Parse material properties
    const materialProps = JSON.parse((wallRow as any).material_props || '{}');
    const fm = materialProps.compressive_strength || 20.7; // Default 3000 psi = 20.7 MPa
    const fy = materialProps.steel_yield_strength || 420; // Default 60 ksi = 420 MPa

    // Parse corner nodes from JSON
    const cornerNodesStr = wall.corner_nodes as unknown as string;
    const cornerNodes = typeof cornerNodesStr === 'string' 
      ? JSON.parse(cornerNodesStr) 
      : cornerNodesStr;

    // Calculate wall length from corner nodes
    const lw = Math.sqrt(
      Math.pow(cornerNodes[1].x - cornerNodes[0].x, 2) +
      Math.pow(cornerNodes[1].y - cornerNodes[0].y, 2)
    ); // Wall length (mm)

    // Estimate height (use typical story height)
    const hw = 3000; // Typical 3m story height

    // Select standard CMU unit based on thickness
    const tw = wall.thickness; // Wall thickness (mm)
    let unit = STANDARD_CMU['200mm']; // Default to 8"
    if (tw <= 150) {
      unit = STANDARD_CMU['150mm'];
    } else if (tw <= 200) {
      unit = STANDARD_CMU['200mm'];
    } else if (tw <= 250) {
      unit = STANDARD_CMU['250mm'];
    } else {
      unit = STANDARD_CMU['300mm'];
    }

    // Prepare design input
    const masonryInput: MasonryDesignInput = {
      unit,
      height: hw,
      length: lw,
      fm,
      fy,
      grouting: 'fully', // Assume fully grouted
      Pu: forces.axial,
      Mu: forces.moment,
      Vu: forces.shear,
    };

    // Run TMS 402 design check
    const designResult = checkMasonryWall(masonryInput);

    // Convert MasonryDesignResult to DesignResult format
    // Calculate individual D/C ratios
    const axialDC = forces.axial / designResult.axial.phi_Pn;
    const shearDC = forces.shear / designResult.shear.phi_Vn;

    const checks: any = {
      axial: {
        Pn: designResult.axial.Pn.toFixed(2),
        phi_Pn: designResult.axial.phi_Pn.toFixed(2),
        h_r: designResult.axial.h_r.toFixed(1),
        dcRatio: axialDC.toFixed(3),
        passed: axialDC <= 1.0,
      },
      shear: {
        Vnm: designResult.shear.Vnm.toFixed(2),
        Vns: designResult.shear.Vns.toFixed(2),
        Vn: designResult.shear.Vn.toFixed(2),
        phi_Vn: designResult.shear.phi_Vn.toFixed(2),
        Vn_max: designResult.shear.Vn_max.toFixed(2),
        dcRatio: shearDC.toFixed(3),
        passed: shearDC <= 1.0,
      },
    };

    if (designResult.flexure) {
      const flexureDC = forces.moment / designResult.flexure.phi_Mn;
      checks.flexure = {
        Mn: designResult.flexure.Mn.toFixed(2),
        phi_Mn: designResult.flexure.phi_Mn.toFixed(2),
        a: designResult.flexure.a.toFixed(1),
        controlMode: designResult.flexure.controlMode,
        dcRatio: flexureDC.toFixed(3),
        passed: flexureDC <= 1.0,
      };
    }

    if (designResult.combined) {
      checks.combined = {
        interaction: designResult.combined.interaction.toFixed(3),
        passed: designResult.combined.passed,
      };
    }

    const result: DesignResult = {
      id: generateDesignResultId(),
      run_id: analysisRunId,
      member_id: wall.id,
      member_type: 'wall',
      design_code: 'TMS 402-16',
      demand_capacity_ratio: designResult.dcRatio,
      controlling_combination_id: null,
      controlling_check: designResult.governingCheck,
      status: designResult.status,
      checks,
      messages: designResult.messages,
      created_at: new Date().toISOString(),
    };

    results.push(result);

    // Store in database
    await db.execute(
      `INSERT INTO design_results (
        id, run_id, member_id, member_type, design_code,
        demand_capacity_ratio, controlling_combination_id, controlling_check,
        status, checks, messages, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.id,
        result.run_id,
        result.member_id,
        result.member_type,
        result.design_code,
        result.demand_capacity_ratio,
        result.controlling_combination_id ?? null,
        result.controlling_check ?? null,
        result.status,
        JSON.stringify(result.checks),
        JSON.stringify(result.messages),
        result.created_at,
      ]
    );
  }

  return results;
}
