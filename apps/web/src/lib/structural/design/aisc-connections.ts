/**
 * AISC Connection Design Checks
 *
 * Implements AISC 360-22 connection design provisions
 * - Chapter J: Design of Connections
 * - Bolted connections (bearing type and slip-critical)
 * - Welded connections (fillet and CJP)
 * - Block shear
 * - Prying action (simplified)
 */

import { generateDesignResultId } from '../factories';
import {
  DesignResult,
  DesignMessage,
  DesignStatus,
} from '@/types/structural';

// ============================================================
// RESISTANCE FACTORS (LRFD)
// ============================================================

const PHI_BOLT_SHEAR = 0.75;
const PHI_BOLT_TENSION = 0.75;
const PHI_BOLT_BEARING = 0.75;
const PHI_SLIP = 1.00;  // Slip at service load
const PHI_BLOCK_SHEAR = 0.75;
const PHI_WELD = 0.75;
const PHI_BASE_METAL = 0.90;

// ============================================================
// BOLT SPECIFICATIONS (AISC Table J3.2)
// ============================================================

export interface BoltSpecification {
  group: 'A' | 'B';
  Fnt: number;  // Nominal tensile strength (MPa)
  Fnv: number;  // Nominal shear strength (MPa)
}

export const BOLT_SPECS: Record<string, BoltSpecification> = {
  'A307': { group: 'A', Fnt: 310, Fnv: 188 },        // Grade A
  'A325-N': { group: 'A', Fnt: 620, Fnv: 372 },     // Threads included
  'A325-X': { group: 'A', Fnt: 620, Fnv: 457 },     // Threads excluded
  'A490-N': { group: 'B', Fnt: 780, Fnv: 457 },     // Threads included
  'A490-X': { group: 'B', Fnt: 780, Fnv: 579 },     // Threads excluded
  'F1852-N': { group: 'A', Fnt: 620, Fnv: 372 },    // Twist-off (A325 equiv)
  'F2280-N': { group: 'B', Fnt: 780, Fnv: 457 },    // Twist-off (A490 equiv)
};

// Standard bolt sizes (diameter in mm, area in mm²)
export const BOLT_SIZES: Record<string, { d: number; Ab: number }> = {
  'M16': { d: 16, Ab: 201 },
  'M20': { d: 20, Ab: 314 },
  'M22': { d: 22, Ab: 380 },
  'M24': { d: 24, Ab: 452 },
  'M27': { d: 27, Ab: 573 },
  'M30': { d: 30, Ab: 707 },
  'M36': { d: 36, Ab: 1018 },
  // Imperial sizes
  '5/8"': { d: 15.9, Ab: 199 },
  '3/4"': { d: 19.1, Ab: 285 },
  '7/8"': { d: 22.2, Ab: 388 },
  '1"': { d: 25.4, Ab: 507 },
  '1-1/8"': { d: 28.6, Ab: 641 },
  '1-1/4"': { d: 31.8, Ab: 792 },
};

// ============================================================
// HOLE TYPES (AISC Table J3.3)
// ============================================================

export type HoleType = 'STD' | 'OVS' | 'SSL' | 'LSL';

export const HOLE_DIMENSIONS: Record<HoleType, (d: number) => { dh: number; slot_length?: number }> = {
  'STD': (d) => ({ dh: d + (d <= 24 ? 2 : 3) }),  // Standard
  'OVS': (d) => ({ dh: d + (d <= 24 ? 4 : 6) }),  // Oversized
  'SSL': (d) => ({ dh: d + (d <= 24 ? 2 : 3), slot_length: d + 6 }),  // Short-slotted
  'LSL': (d) => ({ dh: d + (d <= 24 ? 2 : 3), slot_length: 2.5 * d }),  // Long-slotted
};

// ============================================================
// SLIP COEFFICIENTS (AISC Table J3.1)
// ============================================================

export const SLIP_COEFFICIENTS: Record<string, number> = {
  'Class A': 0.30,  // Unpainted clean mill scale
  'Class B': 0.50,  // Blast-cleaned with Class B coating
  'Class C': 0.35,  // Hot-dip galvanized, roughened
};

// ============================================================
// WELD SPECIFICATIONS
// ============================================================

export interface WeldElectrode {
  designation: string;
  FEXX: number;  // Electrode strength (MPa)
}

export const WELD_ELECTRODES: Record<string, WeldElectrode> = {
  'E60': { designation: 'E60XX', FEXX: 415 },
  'E70': { designation: 'E70XX', FEXX: 485 },
  'E80': { designation: 'E80XX', FEXX: 550 },
  'E90': { designation: 'E90XX', FEXX: 620 },
  'E100': { designation: 'E100XX', FEXX: 690 },
  'E110': { designation: 'E110XX', FEXX: 760 },
};

// ============================================================
// BOLT CONNECTION INTERFACES
// ============================================================

export interface BoltedConnectionInput {
  boltSpec: string;         // e.g., 'A325-N'
  boltSize: string;         // e.g., 'M20' or '3/4"'
  numBolts: number;
  numShearPlanes: number;   // 1 for single shear, 2 for double
  holeType: HoleType;

  // Connected material
  Fy: number;               // Yield strength (MPa)
  Fu: number;               // Ultimate strength (MPa)
  t: number;                // Connected thickness (mm)

  // Edge/spacing distances
  Le: number;               // Edge distance (mm)
  s: number;                // Bolt spacing (mm)

  // Optional parameters
  isSlipCritical?: boolean;
  slipClass?: 'Class A' | 'Class B' | 'Class C';
  Du?: number;              // Hole deformation factor
  hf?: number;              // Filler factor
}

export interface BoltedConnectionResult {
  // Shear capacity
  Rn_shear: number;         // Nominal shear per bolt (kN)
  phi_Rn_shear: number;     // Design shear per bolt (kN)

  // Bearing capacity
  Rn_bearing: number;       // Nominal bearing per bolt (kN)
  phi_Rn_bearing: number;   // Design bearing per bolt (kN)

  // Slip resistance (if applicable)
  Rn_slip?: number;
  phi_Rn_slip?: number;

  // Connection capacity
  Rn_connection: number;    // Total connection capacity (kN)
  governingMode: 'shear' | 'bearing' | 'slip';
}

// ============================================================
// BOLT SHEAR (AISC J3.6)
// ============================================================

/**
 * Calculate nominal shear strength per bolt
 */
export function calculateBoltShearCapacity(
  boltSpec: string,
  boltSize: string,
  numShearPlanes: number = 1
): { Fnv: number; Ab: number; Rn: number; phi_Rn: number } {
  const spec = BOLT_SPECS[boltSpec];
  const size = BOLT_SIZES[boltSize];

  if (!spec || !size) {
    throw new Error(`Unknown bolt specification: ${boltSpec} or size: ${boltSize}`);
  }

  const Fnv = spec.Fnv;
  const Ab = size.Ab;
  const Rn = Fnv * Ab * numShearPlanes / 1000; // kN

  return {
    Fnv,
    Ab,
    Rn,
    phi_Rn: PHI_BOLT_SHEAR * Rn,
  };
}

// ============================================================
// BOLT BEARING (AISC J3.10)
// ============================================================

/**
 * Calculate bearing strength at bolt hole
 */
export function calculateBoltBearingCapacity(
  boltSize: string,
  t: number,           // Connected material thickness (mm)
  Fu: number,          // Ultimate tensile strength (MPa)
  Le: number,          // Clear distance to edge (mm)
  s: number,           // Bolt spacing (mm)
  holeType: HoleType = 'STD',
  deformationConsidered: boolean = true
): { Rn: number; phi_Rn: number; governingLimit: string } {
  const size = BOLT_SIZES[boltSize];
  if (!size) {
    throw new Error(`Unknown bolt size: ${boltSize}`);
  }

  const d = size.d;
  const { dh } = HOLE_DIMENSIONS[holeType](d);

  // Clear distances
  const Lc_edge = Le - dh / 2;
  const Lc_spacing = s - dh;

  // Use minimum clear distance
  const Lc = Math.min(Lc_edge, Lc_spacing);

  let Rn: number;
  let governingLimit: string;

  if (deformationConsidered) {
    // When deformation at bolt hole is a design consideration
    const Rn_tearout = 1.2 * Lc * t * Fu / 1000; // kN
    const Rn_bearing = 2.4 * d * t * Fu / 1000;  // kN

    if (Rn_tearout < Rn_bearing) {
      Rn = Rn_tearout;
      governingLimit = 'tearout';
    } else {
      Rn = Rn_bearing;
      governingLimit = 'bearing';
    }
  } else {
    // When deformation is not a design consideration
    const Rn_tearout = 1.5 * Lc * t * Fu / 1000;
    const Rn_bearing = 3.0 * d * t * Fu / 1000;

    if (Rn_tearout < Rn_bearing) {
      Rn = Rn_tearout;
      governingLimit = 'tearout';
    } else {
      Rn = Rn_bearing;
      governingLimit = 'bearing';
    }
  }

  return {
    Rn,
    phi_Rn: PHI_BOLT_BEARING * Rn,
    governingLimit,
  };
}

// ============================================================
// SLIP-CRITICAL CONNECTIONS (AISC J3.8)
// ============================================================

/**
 * Calculate slip resistance
 */
export function calculateSlipResistance(
  boltSpec: string,
  boltSize: string,
  slipClass: 'Class A' | 'Class B' | 'Class C' = 'Class A',
  numSlipPlanes: number = 1,
  holeType: HoleType = 'STD',
  Du: number = 1.13,  // Standard installation
  hf: number = 1.0    // No fillers
): { Rn: number; phi_Rn: number; Tb: number; mu: number } {
  const spec = BOLT_SPECS[boltSpec];
  const size = BOLT_SIZES[boltSize];

  if (!spec || !size) {
    throw new Error(`Unknown bolt specification or size`);
  }

  // Minimum pretension (AISC Table J3.1)
  // Simplified - using 70% of tensile capacity
  const Tb = 0.70 * spec.Fnt * size.Ab / 1000; // kN

  // Slip coefficient
  const mu = SLIP_COEFFICIENTS[slipClass];

  // Hole factor
  let hsc = 1.0;
  if (holeType === 'OVS') hsc = 0.85;
  else if (holeType === 'SSL') hsc = 0.70;
  else if (holeType === 'LSL') hsc = 0.60;

  const Rn = mu * Du * hf * Tb * numSlipPlanes * hsc;

  return {
    Rn,
    phi_Rn: PHI_SLIP * Rn,
    Tb,
    mu,
  };
}

// ============================================================
// COMBINED TENSION AND SHEAR (AISC J3.7)
// ============================================================

/**
 * Check bolt under combined tension and shear
 */
export function checkCombinedTensionShear(
  boltSpec: string,
  boltSize: string,
  Vu: number,          // Required shear per bolt (kN)
  Tu: number,          // Required tension per bolt (kN)
  numShearPlanes: number = 1
): { interaction: number; F_nt_prime: number; passed: boolean } {
  const spec = BOLT_SPECS[boltSpec];
  const size = BOLT_SIZES[boltSize];

  if (!spec || !size) {
    throw new Error(`Unknown bolt specification or size`);
  }

  const Fnt = spec.Fnt;
  const Fnv = spec.Fnv;
  const Ab = size.Ab;

  // Required shear stress
  const frv = Vu * 1000 / (Ab * numShearPlanes);

  // Modified tensile strength (AISC Eq. J3-3a)
  const F_nt_prime = 1.3 * Fnt - (Fnt / (PHI_BOLT_TENSION * Fnv)) * frv;

  // Available tensile strength
  const phi_Rnt = PHI_BOLT_TENSION * Math.min(F_nt_prime, Fnt) * Ab / 1000; // kN

  // Check capacities
  const shear = calculateBoltShearCapacity(boltSpec, boltSize, numShearPlanes);
  const shearDC = Vu / shear.phi_Rn;
  const tensionDC = Tu / phi_Rnt;

  const interaction = Math.max(shearDC, tensionDC);

  return {
    interaction,
    F_nt_prime: Math.min(F_nt_prime, Fnt),
    passed: interaction <= 1.0,
  };
}

// ============================================================
// BLOCK SHEAR (AISC J4.3)
// ============================================================

/**
 * Calculate block shear rupture strength
 */
export function calculateBlockShear(
  Agv: number,      // Gross area in shear (mm²)
  Anv: number,      // Net area in shear (mm²)
  Ant: number,      // Net area in tension (mm²)
  Fy: number,       // Yield strength (MPa)
  Fu: number,       // Ultimate strength (MPa)
  Ubs: number = 1.0 // 1.0 for uniform tension, 0.5 for non-uniform
): { Rn: number; phi_Rn: number; governingCase: string } {
  // Case 1: Shear yielding + tension rupture
  const Rn_1 = 0.6 * Fy * Agv + Ubs * Fu * Ant;

  // Case 2: Shear rupture + tension rupture
  const Rn_2 = 0.6 * Fu * Anv + Ubs * Fu * Ant;

  const Rn = Math.min(Rn_1, Rn_2) / 1000; // kN
  const governingCase = Rn_1 < Rn_2 ? 'shear_yield' : 'shear_rupture';

  return {
    Rn,
    phi_Rn: PHI_BLOCK_SHEAR * Rn,
    governingCase,
  };
}

// ============================================================
// FILLET WELD DESIGN (AISC J2.4)
// ============================================================

export interface FilletWeldInput {
  electrode: string;      // e.g., 'E70'
  weldSize: number;       // Leg size (mm)
  weldLength: number;     // Effective length (mm)
  angle: number;          // Load angle (degrees, 0 = longitudinal)
  baseMetal: {
    Fy: number;
    Fu: number;
    t: number;            // Thickness (mm)
  };
}

export interface FilletWeldResult {
  // Weld capacity
  Rn_weld: number;        // Nominal weld strength (kN)
  phi_Rn_weld: number;    // Design weld strength (kN)

  // Base metal capacity
  Rn_base: number;        // Nominal base metal strength (kN)
  phi_Rn_base: number;    // Design base metal strength (kN)

  // Connection capacity
  Rn: number;             // Governing capacity (kN)
  governingMode: 'weld' | 'base_metal';

  // Stresses
  fw: number;             // Weld stress (MPa)
  Fnw: number;            // Nominal weld strength (MPa)
}

/**
 * Calculate fillet weld capacity
 */
export function calculateFilletWeldCapacity(input: FilletWeldInput): FilletWeldResult {
  const electrode = WELD_ELECTRODES[input.electrode];
  if (!electrode) {
    throw new Error(`Unknown electrode: ${input.electrode}`);
  }

  const FEXX = electrode.FEXX;
  const w = input.weldSize;
  const L = input.weldLength;
  const theta = input.angle * Math.PI / 180;

  // Effective throat
  const a = w / Math.sqrt(2);

  // Directional strength increase (AISC J2.4b)
  // Fnw = 0.60 * FEXX * (1.0 + 0.50 * sin^1.5(theta))
  const directionalFactor = 1.0 + 0.50 * Math.pow(Math.sin(theta), 1.5);
  const Fnw = 0.60 * FEXX * directionalFactor;

  // Weld strength
  const Rn_weld = Fnw * a * L / 1000; // kN

  // Base metal shear yielding
  const Rn_base = 0.60 * input.baseMetal.Fy * input.baseMetal.t * L / 1000;

  // Governing capacity
  const phi_Rn_weld = PHI_WELD * Rn_weld;
  const phi_Rn_base = PHI_BASE_METAL * Rn_base;

  const Rn = Math.min(phi_Rn_weld, phi_Rn_base);
  const governingMode = phi_Rn_weld < phi_Rn_base ? 'weld' : 'base_metal';

  return {
    Rn_weld,
    phi_Rn_weld,
    Rn_base,
    phi_Rn_base,
    Rn,
    governingMode,
    fw: Rn * 1000 / (a * L),
    Fnw,
  };
}

// ============================================================
// MINIMUM WELD SIZE (AISC Table J2.4)
// ============================================================

export function getMinFilletWeldSize(t: number): number {
  // t = thickness of thinner part joined (mm)
  if (t <= 6) return 3;
  if (t <= 13) return 5;
  if (t <= 19) return 6;
  return 8;
}

// ============================================================
// MAXIMUM WELD SIZE (AISC J2.2b)
// ============================================================

export function getMaxFilletWeldSize(t: number): number {
  if (t < 6) return t;
  return t - 2; // 1.6mm less than thickness
}

// ============================================================
// CJP GROOVE WELD (AISC J2.3)
// ============================================================

/**
 * Calculate CJP groove weld capacity
 * CJP welds develop full strength of the connected material
 */
export function calculateCJPWeldCapacity(
  Fu: number,       // Base metal ultimate strength (MPa)
  t: number,        // Effective throat = plate thickness (mm)
  L: number         // Weld length (mm)
): { Rn: number; phi_Rn: number } {
  // Tension or compression parallel to weld axis: Full base metal strength
  // Tension or compression normal to weld axis: Full base metal strength

  const Rn = Fu * t * L / 1000; // kN

  return {
    Rn,
    phi_Rn: PHI_BASE_METAL * Rn,
  };
}

// ============================================================
// COMPLETE CONNECTION DESIGN CHECK
// ============================================================

export interface ConnectionDesignInput {
  type: 'bolted' | 'welded' | 'combined';

  // Applied loads
  Pu: number;        // Axial force (kN, + = tension)
  Vu: number;        // Shear force (kN)
  Mu?: number;       // Moment (kN·m, for eccentric connections)

  // Bolted connection details
  bolted?: BoltedConnectionInput;

  // Welded connection details
  welded?: FilletWeldInput;
}

export interface ConnectionDesignResult {
  dcRatio: number;
  governingCheck: string;
  status: DesignStatus;
  checks: Record<string, unknown>;
  messages: DesignMessage[];
}

/**
 * Perform complete connection design check
 */
export function checkConnection(input: ConnectionDesignInput): ConnectionDesignResult {
  const messages: DesignMessage[] = [];
  const checks: Record<string, unknown> = {};
  let maxDC = 0;
  let governingCheck = '';

  // Check bolted connection
  if (input.type === 'bolted' && input.bolted) {
    const bolt = input.bolted;

    // Shear capacity
    const shear = calculateBoltShearCapacity(
      bolt.boltSpec,
      bolt.boltSize,
      bolt.numShearPlanes
    );

    // Bearing capacity
    const bearing = calculateBoltBearingCapacity(
      bolt.boltSize,
      bolt.t,
      bolt.Fu,
      bolt.Le,
      bolt.s,
      bolt.holeType
    );

    // Per-bolt capacity
    const perBoltCapacity = Math.min(shear.phi_Rn, bearing.phi_Rn);
    const totalCapacity = perBoltCapacity * bolt.numBolts;

    // D/C ratio for shear
    const shearDC = input.Vu / totalCapacity;

    checks.bolts = {
      specification: bolt.boltSpec,
      size: bolt.boltSize,
      quantity: bolt.numBolts,
      shearPlanes: bolt.numShearPlanes,
      shearCapacityPerBolt: shear.phi_Rn.toFixed(2),
      bearingCapacityPerBolt: bearing.phi_Rn.toFixed(2),
      bearingGoverningLimit: bearing.governingLimit,
      perBoltCapacity: perBoltCapacity.toFixed(2),
      totalCapacity: totalCapacity.toFixed(2),
      demandVu: input.Vu.toFixed(2),
      dcRatio: shearDC.toFixed(3),
    };

    if (shearDC > maxDC) {
      maxDC = shearDC;
      governingCheck = 'Bolt Shear/Bearing';
    }

    // Check slip-critical if specified
    if (bolt.isSlipCritical && bolt.slipClass) {
      const slip = calculateSlipResistance(
        bolt.boltSpec,
        bolt.boltSize,
        bolt.slipClass,
        bolt.numShearPlanes,
        bolt.holeType
      );

      const totalSlipCapacity = slip.phi_Rn * bolt.numBolts;
      const slipDC = input.Vu / totalSlipCapacity;

      checks.slipCritical = {
        slipClass: bolt.slipClass,
        minPretension: slip.Tb.toFixed(2),
        slipCoefficient: slip.mu,
        slipCapacityPerBolt: slip.phi_Rn.toFixed(2),
        totalSlipCapacity: totalSlipCapacity.toFixed(2),
        dcRatio: slipDC.toFixed(3),
      };

      if (slipDC > maxDC) {
        maxDC = slipDC;
        governingCheck = 'Slip Resistance';
      }
    }

    // Check edge distance
    const size = BOLT_SIZES[bolt.boltSize];
    const minEdge = 1.5 * size.d;
    if (bolt.Le < minEdge) {
      messages.push({
        type: 'error',
        code: 'AISC-J3.4',
        message: `Edge distance (${bolt.Le}mm) is less than minimum (${minEdge.toFixed(1)}mm)`,
      });
    }

    // Check spacing
    const minSpacing = 2.67 * size.d;
    const prefSpacing = 3 * size.d;
    if (bolt.s < minSpacing) {
      messages.push({
        type: 'error',
        code: 'AISC-J3.3',
        message: `Bolt spacing (${bolt.s}mm) is less than minimum (${minSpacing.toFixed(1)}mm)`,
      });
    } else if (bolt.s < prefSpacing) {
      messages.push({
        type: 'warning',
        code: 'AISC-J3.3',
        message: `Bolt spacing (${bolt.s}mm) is less than preferred (${prefSpacing.toFixed(1)}mm)`,
      });
    }
  }

  // Check welded connection
  if ((input.type === 'welded' || input.type === 'combined') && input.welded) {
    const weld = input.welded;
    const weldResult = calculateFilletWeldCapacity(weld);

    const weldDC = input.Vu / weldResult.Rn;

    checks.weld = {
      electrode: weld.electrode,
      size: weld.weldSize.toFixed(1),
      length: weld.weldLength.toFixed(1),
      angle: weld.angle,
      weldCapacity: weldResult.phi_Rn_weld.toFixed(2),
      baseMetalCapacity: weldResult.phi_Rn_base.toFixed(2),
      governingMode: weldResult.governingMode,
      capacity: weldResult.Rn.toFixed(2),
      demandVu: input.Vu.toFixed(2),
      dcRatio: weldDC.toFixed(3),
    };

    if (weldDC > maxDC) {
      maxDC = weldDC;
      governingCheck = 'Weld Capacity';
    }

    // Check minimum weld size
    const minSize = getMinFilletWeldSize(weld.baseMetal.t);
    if (weld.weldSize < minSize) {
      messages.push({
        type: 'error',
        code: 'AISC-J2.2b',
        message: `Weld size (${weld.weldSize}mm) is less than minimum (${minSize}mm)`,
      });
    }

    // Check maximum weld size
    const maxSize = getMaxFilletWeldSize(weld.baseMetal.t);
    if (weld.weldSize > maxSize) {
      messages.push({
        type: 'error',
        code: 'AISC-J2.2b',
        message: `Weld size (${weld.weldSize}mm) exceeds maximum (${maxSize}mm)`,
      });
    }

    // Check minimum length
    const minLength = 4 * weld.weldSize;
    if (weld.weldLength < minLength) {
      messages.push({
        type: 'warning',
        code: 'AISC-J2.2b',
        message: `Weld length (${weld.weldLength}mm) is less than recommended minimum (${minLength}mm)`,
      });
    }
  }

  // Determine status
  let status: DesignStatus;
  if (maxDC > 1.0) {
    status = 'fail';
    messages.push({
      type: 'error',
      code: 'AISC-CAPACITY',
      message: `Connection capacity exceeded (D/C = ${maxDC.toFixed(2)})`,
    });
  } else if (maxDC > 0.9) {
    status = 'warning';
  } else {
    status = 'pass';
  }

  return {
    dcRatio: maxDC,
    governingCheck,
    status,
    checks,
    messages,
  };
}

// ============================================================
// DESIGN RESULT GENERATOR
// ============================================================

/**
 * Create a design result for a connection
 */
export function createConnectionDesignResult(
  connectionId: string,
  analysisRunId: string,
  checkResult: ConnectionDesignResult
): DesignResult {
  return {
    id: generateDesignResultId(),
    run_id: analysisRunId,
    member_id: connectionId,
    member_type: 'beam', // Connections are typically associated with beams
    design_code: 'AISC 360-22',
    demand_capacity_ratio: checkResult.dcRatio,
    controlling_check: checkResult.governingCheck,
    status: checkResult.status,
    checks: checkResult.checks,
    messages: checkResult.messages,
    created_at: new Date().toISOString(),
  };
}
