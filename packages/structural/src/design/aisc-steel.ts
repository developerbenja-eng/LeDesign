/**
 * AISC Steel Design Checks
 *
 * Implements AISC 360-22 (Specification for Structural Steel Buildings)
 * - Chapter D: Design of Members for Tension
 * - Chapter E: Design of Members for Compression
 * - Chapter F: Design of Members for Flexure
 * - Chapter G: Design of Members for Shear
 * - Chapter H: Design of Members for Combined Forces
 */

import { getDb } from '@ledesign/db';
import {
  Beam,
  Column,
  Brace,
  Material,
  Section,
  MemberResult,
  DesignResult,
  DesignChecks,
  DesignMessage,
  DesignStatus,
  beamRowToBeam,
  BeamRow,
  columnRowToColumn,
  ColumnRow,
  braceRowToBrace,
  BraceRow,
  materialRowToMaterial,
  MaterialRow,
  sectionRowToSection,
  SectionRow,
  memberResultRowToMemberResult,
  MemberResultRow,
  nodeRowToNode,
  NodeRow,
} from './types';
import { generateDesignResultId } from '../factories';

// LRFD Resistance factors
const PHI_TENSION = 0.90;      // Tension yielding
const PHI_TENSION_RUPTURE = 0.75; // Tension rupture
const PHI_COMPRESSION = 0.90;  // Compression
const PHI_FLEXURE = 0.90;      // Flexure
const PHI_SHEAR = 0.90;        // Shear (rolled I-shapes)
const PHI_TORSION = 0.90;      // Torsion

interface ElementInfo {
  id: string;
  type: 'beam' | 'column' | 'brace';
  section: Section;
  material: Material;
  length: number;
  unbracedLengthY: number;
  unbracedLengthZ: number;
  effectiveLengthFactorY: number;
  effectiveLengthFactorZ: number;
  cb: number; // Lateral-torsional buckling modification factor
}

interface DesignForces {
  Pu: number;     // Axial force (positive = tension)
  Muy: number;    // Moment about y-axis
  Muz: number;    // Moment about z-axis
  Vuy: number;    // Shear in y direction
  Vuz: number;    // Shear in z direction
  Tu: number;     // Torsion
}

interface DesignCapacities {
  Pn_tension: number;
  Pn_compression: number;
  Mny: number;
  Mnz: number;
  Vny: number;
  Vnz: number;
  Tn: number;
}

interface DesignCheckResult {
  dcRatio: number;
  governingCase: string;
  details: Record<string, any>;
  passed: boolean;
}

/**
 * Calculate tensile yield strength (AISC 360 D2)
 */
function calculateTensileYieldCapacity(
  Fy: number,
  Ag: number
): number {
  return PHI_TENSION * Fy * Ag;
}

/**
 * Calculate tensile rupture strength (AISC 360 D2)
 * Simplified - assumes Ae = Ag (no holes)
 */
function calculateTensileRuptureCapacity(
  Fu: number,
  Ag: number,
  U: number = 1.0 // Shear lag factor
): number {
  const Ae = U * Ag; // Effective net area
  return PHI_TENSION_RUPTURE * Fu * Ae;
}

/**
 * Calculate compressive strength (AISC 360 E3)
 * For doubly symmetric members without slender elements
 */
function calculateCompressiveCapacity(
  Fy: number,
  E: number,
  Ag: number,
  rx: number,
  ry: number,
  Lcx: number,  // Effective length for x-axis buckling
  Lcy: number   // Effective length for y-axis buckling
): { Pn: number; Fe: number; Fcr: number } {
  // Slenderness ratios
  const KLr_x = Lcx / rx;
  const KLr_y = Lcy / ry;
  const KLr = Math.max(KLr_x, KLr_y);

  // Elastic buckling stress
  const Fe = (Math.PI * Math.PI * E) / (KLr * KLr);

  // Critical stress
  let Fcr: number;
  if (Fy / Fe <= 2.25) {
    // Inelastic buckling
    Fcr = Fy * Math.pow(0.658, Fy / Fe);
  } else {
    // Elastic buckling
    Fcr = 0.877 * Fe;
  }

  const Pn = PHI_COMPRESSION * Fcr * Ag;

  return { Pn, Fe, Fcr };
}

/**
 * Calculate flexural capacity for compact I-shapes (AISC 360 F2)
 */
function calculateFlexuralCapacityY(
  Fy: number,
  E: number,
  Zx: number,
  Sx: number,
  Iy: number,
  J: number,
  Cw: number,
  ry: number,
  ho: number,  // Distance between flange centroids
  Lb: number,  // Unbraced length
  Cb: number   // Modification factor for non-uniform moment
): { Mn: number; governingMode: string } {
  // Plastic moment
  const Mp = Fy * Zx;

  // Limiting laterally unbraced lengths
  const Lp = 1.76 * ry * Math.sqrt(E / Fy);

  // Calculate Lr
  const c = 1.0; // For doubly symmetric I-shapes
  const rts = Math.sqrt(Math.sqrt(Iy * Cw) / Sx); // Radius of gyration for LTB
  const term1 = (Sx * ho) / (J * c);
  const term2 = 6.76 * Math.pow((Fy * term1) / E, 2);
  const Lr = 1.95 * rts * (E / (0.7 * Fy)) * Math.sqrt(term1 + Math.sqrt(term1 * term1 + term2));

  let Mn: number;
  let governingMode: string;

  if (Lb <= Lp) {
    // Yielding (compact section, adequate bracing)
    Mn = Mp;
    governingMode = 'Yielding';
  } else if (Lb <= Lr) {
    // Inelastic lateral-torsional buckling
    Mn = Cb * (Mp - (Mp - 0.7 * Fy * Sx) * ((Lb - Lp) / (Lr - Lp)));
    Mn = Math.min(Mn, Mp);
    governingMode = 'Inelastic LTB';
  } else {
    // Elastic lateral-torsional buckling
    const Fcr = (Cb * Math.PI * Math.PI * E) / (Math.pow(Lb / rts, 2)) *
                Math.sqrt(1 + 0.078 * (J * c) / (Sx * ho) * Math.pow(Lb / rts, 2));
    Mn = Math.min(Fcr * Sx, Mp);
    governingMode = 'Elastic LTB';
  }

  return { Mn: PHI_FLEXURE * Mn, governingMode };
}

/**
 * Calculate flexural capacity about minor axis (AISC 360 F6)
 * For compact I-shape flanges
 */
function calculateFlexuralCapacityZ(
  Fy: number,
  Zy: number
): number {
  // For compact sections, yielding governs
  const Mp = Fy * Zy;
  return PHI_FLEXURE * Math.min(Mp, 1.6 * Fy * Zy);
}

/**
 * Calculate shear capacity (AISC 360 G2)
 * For rolled I-shapes with h/tw <= 2.24*sqrt(E/Fy)
 */
function calculateShearCapacity(
  Fy: number,
  E: number,
  Aw: number,  // Area of web = d * tw
  h: number,   // Clear distance between flanges
  tw: number   // Web thickness
): { Vn: number; Cv1: number } {
  const limit = 2.24 * Math.sqrt(E / Fy);

  let Cv1: number;
  if (h / tw <= limit) {
    // No web buckling
    Cv1 = 1.0;
  } else {
    // Web buckling consideration
    const kv = 5.34; // For unstiffened webs
    if (h / tw <= 1.10 * Math.sqrt(kv * E / Fy)) {
      Cv1 = 1.0;
    } else {
      Cv1 = 1.10 * Math.sqrt(kv * E / Fy) / (h / tw);
    }
  }

  const Vn = PHI_SHEAR * 0.6 * Fy * Aw * Cv1;
  return { Vn, Cv1 };
}

/**
 * Combined axial and flexure check (AISC 360 H1)
 */
function checkCombinedLoading(
  Pr: number,   // Required axial strength (positive = compression)
  Pc: number,   // Available axial strength
  Mrx: number,  // Required flexural strength about x
  Mry: number,  // Required flexural strength about y
  Mcx: number,  // Available flexural strength about x
  Mcy: number   // Available flexural strength about y
): { dcRatio: number; equation: string } {
  const ratio = Math.abs(Pr) / Pc;

  let dcRatio: number;
  let equation: string;

  if (ratio >= 0.2) {
    // Equation H1-1a
    dcRatio = ratio + (8 / 9) * (Math.abs(Mrx) / Mcx + Math.abs(Mry) / Mcy);
    equation = 'H1-1a';
  } else {
    // Equation H1-1b
    dcRatio = ratio / 2 + (Math.abs(Mrx) / Mcx + Math.abs(Mry) / Mcy);
    equation = 'H1-1b';
  }

  return { dcRatio, equation };
}

/**
 * Get element information from database
 */
async function getElementInfo(
  projectId: string,
  elementId: string,
  elementType: 'beam' | 'column' | 'brace'
): Promise<ElementInfo | null> {
  const db = getDb();

  let element: Beam | Column | Brace | null = null;

  if (elementType === 'beam') {
    const result = await db.execute({
      sql: `SELECT * FROM beams WHERE id = ? AND project_id = ?`,
      args: [elementId, projectId],
    });
    if (result.rows.length > 0) {
      element = beamRowToBeam(result.rows[0] as unknown as BeamRow);
    }
  } else if (elementType === 'column') {
    const result = await db.execute({
      sql: `SELECT * FROM columns WHERE id = ? AND project_id = ?`,
      args: [elementId, projectId],
    });
    if (result.rows.length > 0) {
      element = columnRowToColumn(result.rows[0] as unknown as ColumnRow);
    }
  } else if (elementType === 'brace') {
    const result = await db.execute({
      sql: `SELECT * FROM braces WHERE id = ? AND project_id = ?`,
      args: [elementId, projectId],
    });
    if (result.rows.length > 0) {
      element = braceRowToBrace(result.rows[0] as unknown as BraceRow);
    }
  }

  if (!element) return null;
  if (!element.section_id || !element.material_id) return null;

  // Get section
  const sectionResult = await db.execute({
    sql: `SELECT * FROM sections WHERE id = ?`,
    args: [element.section_id],
  });
  if (sectionResult.rows.length === 0) return null;
  const section = sectionRowToSection(sectionResult.rows[0] as unknown as SectionRow);

  // Get material
  const materialResult = await db.execute({
    sql: `SELECT * FROM materials WHERE id = ?`,
    args: [element.material_id],
  });
  if (materialResult.rows.length === 0) return null;
  const material = materialRowToMaterial(materialResult.rows[0] as unknown as MaterialRow);

  // Get nodes to calculate length
  const startNodeResult = await db.execute({
    sql: `SELECT * FROM nodes WHERE id = ?`,
    args: [element.node_i_id],
  });
  const endNodeResult = await db.execute({
    sql: `SELECT * FROM nodes WHERE id = ?`,
    args: [element.node_j_id],
  });

  if (startNodeResult.rows.length === 0 || endNodeResult.rows.length === 0) return null;

  const startNode = nodeRowToNode(startNodeResult.rows[0] as unknown as NodeRow);
  const endNode = nodeRowToNode(endNodeResult.rows[0] as unknown as NodeRow);

  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  const dz = endNode.z - startNode.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Default values for unbraced lengths and K factors
  let unbracedLengthY = length;
  let unbracedLengthZ = length;
  let effectiveLengthFactorY = 1.0;
  let effectiveLengthFactorZ = 1.0;
  let cbValue = 1.0;

  // Use element-specific values if available
  if ('unbraced_length_major' in element && element.unbraced_length_major) {
    unbracedLengthY = element.unbraced_length_major;
  }
  if ('unbraced_length_minor' in element && element.unbraced_length_minor) {
    unbracedLengthZ = element.unbraced_length_minor;
  }
  if ('k_major' in element && element.k_major) {
    effectiveLengthFactorY = element.k_major;
  }
  if ('k_minor' in element && element.k_minor) {
    effectiveLengthFactorZ = element.k_minor;
  }
  if ('cb' in element && element.cb) {
    cbValue = element.cb;
  }

  return {
    id: element.id,
    type: elementType,
    section,
    material,
    length,
    unbracedLengthY,
    unbracedLengthZ,
    effectiveLengthFactorY,
    effectiveLengthFactorZ,
    cb: cbValue,
  };
}

/**
 * Get maximum forces from analysis results for a member
 */
async function getMaxForces(
  analysisRunId: string,
  elementId: string
): Promise<DesignForces | null> {
  const db = getDb();

  const result = await db.execute({
    sql: `SELECT * FROM member_results WHERE run_id = ? AND member_id = ?`,
    args: [analysisRunId, elementId],
  });

  if (result.rows.length === 0) return null;

  // Find maximum forces across all combinations and stations
  // Each row is now a single station result
  let maxPu = 0, minPu = 0;
  let maxMuy = 0, maxMuz = 0;
  let maxVuy = 0, maxVuz = 0;
  let maxTu = 0;

  for (const row of result.rows) {
    const memberResult = memberResultRowToMemberResult(row as unknown as MemberResultRow);

    // Each row represents a single station
    const P = memberResult.axial;
    const My = memberResult.moment_major;
    const Mz = memberResult.moment_minor;
    const Vy = memberResult.shear_major;
    const Vz = memberResult.shear_minor;
    const T = memberResult.torsion;

    maxPu = Math.max(maxPu, P);
    minPu = Math.min(minPu, P);
    maxMuy = Math.max(maxMuy, Math.abs(My));
    maxMuz = Math.max(maxMuz, Math.abs(Mz));
    maxVuy = Math.max(maxVuy, Math.abs(Vy));
    maxVuz = Math.max(maxVuz, Math.abs(Vz));
    maxTu = Math.max(maxTu, Math.abs(T));
  }

  // Use the controlling axial force (max tension or max compression)
  const Pu = Math.abs(maxPu) > Math.abs(minPu) ? maxPu : minPu;

  return {
    Pu,
    Muy: maxMuy,
    Muz: maxMuz,
    Vuy: maxVuy,
    Vuz: maxVuz,
    Tu: maxTu,
  };
}

/**
 * Perform AISC design check for a single element
 */
async function checkElement(
  elementInfo: ElementInfo,
  forces: DesignForces
): Promise<DesignCheckResult> {
  const { section, material, unbracedLengthY, unbracedLengthZ,
          effectiveLengthFactorY, effectiveLengthFactorZ, cb } = elementInfo;

  const Fy = material.yield_strength ?? 345; // MPa (default A992)
  const Fu = material.ultimate_strength ?? 450; // MPa
  const E = material.elastic_modulus ?? 200000; // MPa (default steel)

  const Ag = section.area ?? 1;
  const Ix = section.ix ?? 1;
  const Iy = section.iy ?? 1;
  const rx = section.rx ?? Math.sqrt(Ix / Ag);
  const ry = section.ry ?? Math.sqrt(Iy / Ag);
  const sxVal = section.sx ?? Ix / (Math.sqrt(Ix / Ag) * 2);
  const syVal = section.sy ?? Iy / (Math.sqrt(Iy / Ag) * 2);
  const zxVal = section.zx ?? sxVal * 1.1;
  const zyVal = section.zy ?? syVal * 1.1;
  const Zx = zxVal;
  const Zy = zyVal;
  const Sx = sxVal;
  const Sy = syVal;
  const J = section.j ?? 0;
  const Cw = section.cw ?? 0;

  // Get dimensions from section (cast to any for flexible property access)
  const dims = (section.dimensions ?? {}) as Record<string, number | undefined>;
  const d = dims.d ?? Math.sqrt(Ix / Ag) * 4; // Approximate depth
  const tw = dims.tw ?? Ag / d / 2; // Approximate web thickness
  const ho = dims.ho ?? d * 0.9; // Approximate flange centroids distance
  const h = dims.h ?? d - 2 * (dims.tf ?? tw * 2); // Clear web height
  const Aw = d * tw;

  // Effective lengths
  const Lcx = effectiveLengthFactorY * unbracedLengthY;
  const Lcy = effectiveLengthFactorZ * unbracedLengthZ;

  const details: Record<string, any> = {};
  let governingCase = '';
  let dcRatio = 0;

  // Calculate capacities
  const Pn_tension_yield = calculateTensileYieldCapacity(Fy, Ag);
  const Pn_tension_rupture = calculateTensileRuptureCapacity(Fu, Ag);
  const Pn_tension = Math.min(Pn_tension_yield, Pn_tension_rupture);

  const { Pn: Pn_compression, Fe, Fcr } = calculateCompressiveCapacity(
    Fy, E, Ag, rx, ry, Lcx, Lcy
  );

  const { Mn: Mny, governingMode: flexureModeY } = calculateFlexuralCapacityY(
    Fy, E, Zx, Sx, Iy, J, Cw, ry, ho, unbracedLengthZ, cb
  );

  const Mnz = calculateFlexuralCapacityZ(Fy, Zy);

  const { Vn: Vny, Cv1 } = calculateShearCapacity(Fy, E, Aw, h, tw);
  const Vnz = Vny; // Simplified - same capacity in both directions

  details.capacities = {
    Pn_tension,
    Pn_compression,
    Mny,
    Mnz,
    Vny,
    Vnz,
    Fe,
    Fcr,
  };

  details.slenderness = {
    KLr_x: Lcx / rx,
    KLr_y: Lcy / ry,
  };

  details.flexureMode = flexureModeY;

  // Check each limit state
  const checks: { ratio: number; name: string }[] = [];

  // Tension check
  if (forces.Pu > 0) {
    const tensionRatio = forces.Pu / Pn_tension;
    checks.push({ ratio: tensionRatio, name: 'Tension' });
    details.tensionRatio = tensionRatio;
  }

  // Compression check
  if (forces.Pu < 0) {
    const compressionRatio = Math.abs(forces.Pu) / Pn_compression;
    checks.push({ ratio: compressionRatio, name: 'Compression' });
    details.compressionRatio = compressionRatio;
  }

  // Flexure checks
  if (forces.Muy > 0) {
    const flexureYRatio = forces.Muy / Mny;
    checks.push({ ratio: flexureYRatio, name: 'Flexure-Y' });
    details.flexureYRatio = flexureYRatio;
  }

  if (forces.Muz > 0) {
    const flexureZRatio = forces.Muz / Mnz;
    checks.push({ ratio: flexureZRatio, name: 'Flexure-Z' });
    details.flexureZRatio = flexureZRatio;
  }

  // Shear checks
  if (forces.Vuy > 0) {
    const shearYRatio = forces.Vuy / Vny;
    checks.push({ ratio: shearYRatio, name: 'Shear-Y' });
    details.shearYRatio = shearYRatio;
  }

  if (forces.Vuz > 0) {
    const shearZRatio = forces.Vuz / Vnz;
    checks.push({ ratio: shearZRatio, name: 'Shear-Z' });
    details.shearZRatio = shearZRatio;
  }

  // Combined loading check (H1)
  const Pc = forces.Pu >= 0 ? Pn_tension : Pn_compression;
  const { dcRatio: combinedRatio, equation } = checkCombinedLoading(
    forces.Pu, Pc, forces.Muy, forces.Muz, Mny, Mnz
  );
  checks.push({ ratio: combinedRatio, name: `Combined (${equation})` });
  details.combinedRatio = combinedRatio;
  details.combinedEquation = equation;

  // Find governing check
  const maxCheck = checks.reduce((max, check) =>
    check.ratio > max.ratio ? check : max,
    { ratio: 0, name: 'None' }
  );

  dcRatio = maxCheck.ratio;
  governingCase = maxCheck.name;

  return {
    dcRatio,
    governingCase,
    details,
    passed: dcRatio <= 1.0,
  };
}

/**
 * Run AISC steel design checks for all members in an analysis run
 */
export async function runAISCDesignChecks(
  projectId: string,
  analysisRunId: string
): Promise<DesignResult[]> {
  const db = getDb();
  const results: DesignResult[] = [];

  // Get all member results for this analysis run
  const memberResults = await db.execute({
    sql: `SELECT DISTINCT member_id, member_type FROM member_results WHERE run_id = ?`,
    args: [analysisRunId],
  });

  for (const row of memberResults.rows) {
    const elementId = (row as any).member_id;
    const elementType = (row as any).member_type as 'beam' | 'column' | 'brace';

    // Get element info
    const elementInfo = await getElementInfo(projectId, elementId, elementType);
    if (!elementInfo) continue;

    // Check if material is steel
    if (elementInfo.material.material_type !== 'steel') continue;

    // Get maximum forces
    const forces = await getMaxForces(analysisRunId, elementId);
    if (!forces) continue;

    // Perform design check
    const checkResult = await checkElement(elementInfo, forces);

    // Build DesignChecks from checkResult.details
    const checks: DesignChecks = checkResult.details || {};
    const status: DesignStatus = checkResult.passed ? 'pass' : 'fail';
    const messages: DesignMessage[] = [];

    if (!checkResult.passed) {
      messages.push({
        type: 'warning',
        message: `Governing check: ${checkResult.governingCase} with D/C ratio of ${checkResult.dcRatio.toFixed(3)}`,
      });
    }

    const designResult: DesignResult = {
      id: generateDesignResultId(),
      run_id: analysisRunId,
      member_id: elementId,
      member_type: elementType,
      design_code: 'AISC 360-22',
      demand_capacity_ratio: checkResult.dcRatio,
      controlling_check: checkResult.governingCase,
      status,
      checks,
      messages,
      created_at: new Date().toISOString(),
    };

    // Store result in database
    await db.execute({
      sql: `INSERT INTO design_results (
        id, run_id, member_id, member_type,
        design_code, demand_capacity_ratio, controlling_check,
        status, checks, messages, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        designResult.id, designResult.run_id, designResult.member_id,
        designResult.member_type, designResult.design_code,
        designResult.demand_capacity_ratio, designResult.controlling_check ?? null,
        designResult.status, JSON.stringify(designResult.checks),
        JSON.stringify(designResult.messages), designResult.created_at,
      ],
    });

    results.push(designResult);
  }

  return results;
}
