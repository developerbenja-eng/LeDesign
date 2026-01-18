/**
 * AISI S100 Cold-Formed Steel Design Checks
 *
 * Implements AISI S100-16 (North American Specification for Cold-Formed Steel)
 * - Chapter C: Members in Tension
 * - Chapter D: Members in Compression
 * - Chapter E: Members in Flexure
 * - Chapter F: Members in Shear
 * - Chapter G: Members under Combined Forces
 * - Appendix 1: Direct Strength Method (DSM)
 * - Appendix 2: Second-Order Analysis
 */

import { DesignResult, DesignMessage, DesignStatus } from '@/types/structural';
import { generateDesignResultId } from '../factories';

// ============================================================
// DESIGN METHOD (LRFD vs ASD)
// ============================================================

export type DesignMethod = 'LRFD' | 'ASD';

// ============================================================
// RESISTANCE FACTORS (LRFD - AISI S100 Table A1.2-1)
// ============================================================

const PHI = {
  TENSION_YIELD: 0.9,
  TENSION_RUPTURE: 0.75,
  COMPRESSION: 0.85,
  FLEXURE: 0.9,
  SHEAR: 0.95,
  WEB_CRIPPLING: 0.75,
  SCREW_SHEAR: 0.5,
  SCREW_BEARING: 0.5,
  SCREW_TENSION: 0.65,
  BOLT_SHEAR: 0.65,
  BOLT_BEARING: 0.6,
  WELD: 0.55,
};

// ============================================================
// SAFETY FACTORS (ASD - AISI S100 Table A1.2-1)
// ============================================================

const OMEGA = {
  TENSION_YIELD: 1.67,
  TENSION_RUPTURE: 2.0,
  COMPRESSION: 1.8,
  FLEXURE: 1.67,
  SHEAR: 1.6,
  WEB_CRIPPLING: 2.0,
  SCREW_SHEAR: 3.0,
  SCREW_BEARING: 3.0,
  SCREW_TENSION: 2.35,
  BOLT_SHEAR: 2.4,
  BOLT_BEARING: 2.5,
  WELD: 2.55,
};

// ============================================================
// MATERIAL PROPERTIES
// ============================================================

export interface ColdFormedSteelMaterial {
  grade: string;
  Fy: number; // Yield strength (MPa)
  Fu: number; // Ultimate strength (MPa)
  E: number; // Modulus of elasticity (MPa)
  G: number; // Shear modulus (MPa)
  nu: number; // Poisson's ratio
}

export const CFS_MATERIALS: Record<string, ColdFormedSteelMaterial> = {
  A653_SS33: {
    grade: 'ASTM A653 SS Grade 33',
    Fy: 230,
    Fu: 310,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A653_SS37: {
    grade: 'ASTM A653 SS Grade 37',
    Fy: 255,
    Fu: 345,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A653_SS40: {
    grade: 'ASTM A653 SS Grade 40',
    Fy: 275,
    Fu: 380,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A653_SS50: {
    grade: 'ASTM A653 SS Grade 50',
    Fy: 345,
    Fu: 450,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A653_SS55: {
    grade: 'ASTM A653 SS Grade 55',
    Fy: 380,
    Fu: 450,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A653_SS80: {
    grade: 'ASTM A653 SS Grade 80',
    Fy: 550,
    Fu: 565,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A1011_SS33: {
    grade: 'ASTM A1011 SS Grade 33',
    Fy: 230,
    Fu: 310,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A1011_SS40: {
    grade: 'ASTM A1011 SS Grade 40',
    Fy: 275,
    Fu: 380,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A1011_SS50: {
    grade: 'ASTM A1011 SS Grade 50',
    Fy: 345,
    Fu: 450,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A1011_HSLAS50: {
    grade: 'ASTM A1011 HSLAS Grade 50',
    Fy: 345,
    Fu: 415,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A792_SS33: {
    grade: 'ASTM A792 SS Grade 33',
    Fy: 230,
    Fu: 310,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
  A792_SS50: {
    grade: 'ASTM A792 SS Grade 50',
    Fy: 345,
    Fu: 450,
    E: 203000,
    G: 78000,
    nu: 0.3,
  },
};

// ============================================================
// SECTION TYPES
// ============================================================

export type CFSectionType =
  | 'C_section' // Lipped channel
  | 'Z_section' // Lipped Z
  | 'hat_section' // Hat section
  | 'track' // Track (unlipped channel)
  | 'stud' // C-stud
  | 'angle' // Angle
  | 'sigma' // Sigma section
  | 'custom';

export interface CFSectionDimensions {
  h: number; // Web height (mm)
  b: number; // Flange width (mm)
  d?: number; // Lip depth (mm)
  t: number; // Base metal thickness (mm)
  r?: number; // Inside bend radius (mm)
}

export interface CFSectionProperties {
  A: number; // Gross area (mm²)
  Ae: number; // Effective area (mm²)
  Ix: number; // Moment of inertia - x (mm⁴)
  Iy: number; // Moment of inertia - y (mm⁴)
  Sx: number; // Section modulus - x (mm³)
  Sy: number; // Section modulus - y (mm³)
  Se: number; // Effective section modulus (mm³)
  rx: number; // Radius of gyration - x (mm)
  ry: number; // Radius of gyration - y (mm)
  J: number; // Torsional constant (mm⁴)
  Cw: number; // Warping constant (mm⁶)
  xo: number; // Shear center x-coordinate (mm)
  yo: number; // Shear center y-coordinate (mm)
  ro?: number; // Polar radius of gyration about shear center (mm)
}

// ============================================================
// SECTION PROPERTY CALCULATOR
// ============================================================

/**
 * Calculate section properties for C-section (lipped channel)
 */
export function calculateCsectionProperties(
  h: number, // Web height (mm)
  b: number, // Flange width (mm)
  d: number, // Lip depth (mm)
  t: number, // Thickness (mm)
  r: number = t // Inside bend radius (mm)
): CFSectionProperties {
  // Centerline dimensions
  const hc = h - t;
  const bc = b - t / 2 - r;
  const dc = d - t / 2 - r;
  const u = Math.PI * (r + t / 2) / 2; // Corner arc length

  // Gross area
  const A = t * (hc + 2 * bc + 2 * dc + 4 * u);

  // Centroid location from web centerline
  const xBar =
    (2 * bc * t * (bc / 2) + 2 * dc * t * bc + 4 * u * t * (bc + r)) / A;

  // Moment of inertia about x-axis (through centroid)
  const Ix =
    (t * Math.pow(hc, 3)) / 12 +
    2 * bc * t * Math.pow(hc / 2, 2) +
    2 * ((t * Math.pow(dc, 3)) / 12 + dc * t * Math.pow(hc / 2 - dc / 2, 2));

  // Moment of inertia about y-axis (through centroid)
  const Iy_web = (hc * Math.pow(t, 3)) / 12 + hc * t * Math.pow(xBar, 2);
  const Iy_flanges =
    2 * ((t * Math.pow(bc, 3)) / 12 + bc * t * Math.pow(bc / 2 - xBar, 2));
  const Iy_lips =
    2 * ((dc * Math.pow(t, 3)) / 12 + dc * t * Math.pow(bc - xBar, 2));
  const Iy = Iy_web + Iy_flanges + Iy_lips;

  // Section moduli
  const Sx = Ix / (hc / 2 + t / 2);
  const Sy = Iy / Math.max(xBar, b - xBar);

  // Radii of gyration
  const rx = Math.sqrt(Ix / A);
  const ry = Math.sqrt(Iy / A);

  // Torsional constant (approximate for thin-walled)
  const J = (t * t * t * (hc + 2 * bc + 2 * dc)) / 3;

  // Warping constant (approximate)
  const Cw = (Math.pow(hc, 2) * Math.pow(bc, 2) * t * (3 * hc + 6 * bc)) / 12;

  // Shear center (approximate for C-section)
  const m = bc / (bc + hc / 6);
  const xo = -(bc - xBar + m * hc * hc * bc) / (2 * Ix / (hc * t));
  const yo = 0;

  // Polar radius of gyration about shear center
  const ro = Math.sqrt(rx * rx + ry * ry + xo * xo + yo * yo);

  return {
    A,
    Ae: A, // Will be calculated with effective width
    Ix,
    Iy,
    Sx,
    Sy,
    Se: Sx, // Will be calculated with effective width
    rx,
    ry,
    J,
    Cw,
    xo,
    yo,
    ro,
  };
}

/**
 * Calculate section properties for track (unlipped channel)
 */
export function calculateTrackProperties(
  h: number, // Web height (mm)
  b: number, // Flange width (mm)
  t: number, // Thickness (mm)
  r: number = t // Inside bend radius (mm)
): CFSectionProperties {
  // Centerline dimensions
  const hc = h - t;
  const bc = b - t / 2 - r;
  const u = Math.PI * (r + t / 2) / 2;

  // Gross area
  const A = t * (hc + 2 * bc + 2 * u);

  // Centroid from web
  const xBar = (2 * bc * t * (bc / 2) + 2 * u * t * (bc + r * 0.6366)) / A;

  // Moment of inertia about x-axis
  const Ix = (t * Math.pow(hc, 3)) / 12 + 2 * bc * t * Math.pow(hc / 2, 2);

  // Moment of inertia about y-axis
  const Iy =
    (hc * Math.pow(t, 3)) / 12 +
    hc * t * Math.pow(xBar, 2) +
    2 * ((t * Math.pow(bc, 3)) / 12 + bc * t * Math.pow(bc / 2 - xBar, 2));

  const Sx = Ix / (hc / 2 + t / 2);
  const Sy = Iy / Math.max(xBar, b - xBar);

  const rx = Math.sqrt(Ix / A);
  const ry = Math.sqrt(Iy / A);

  const J = (t * t * t * (hc + 2 * bc)) / 3;
  const Cw = (Math.pow(hc, 2) * Math.pow(bc, 2) * t * (hc + 3 * bc)) / 6;

  const xo = -(bc - xBar);
  const yo = 0;
  const ro = Math.sqrt(rx * rx + ry * ry + xo * xo);

  return {
    A,
    Ae: A,
    Ix,
    Iy,
    Sx,
    Sy,
    Se: Sx,
    rx,
    ry,
    J,
    Cw,
    xo,
    yo,
    ro,
  };
}

/**
 * Calculate section properties for Z-section
 */
export function calculateZsectionProperties(
  h: number,
  b: number,
  d: number,
  t: number,
  r: number = t
): CFSectionProperties {
  // Z-sections have similar properties to C-sections
  // but with different orientation of flanges
  const cProps = calculateCsectionProperties(h, b, d, t, r);

  // Z-sections are point-symmetric, shear center at centroid
  return {
    ...cProps,
    xo: 0,
    yo: 0,
    ro: Math.sqrt(cProps.rx * cProps.rx + cProps.ry * cProps.ry),
  };
}

/**
 * Calculate section properties based on type
 */
export function calculateSectionProperties(
  type: CFSectionType,
  dimensions: CFSectionDimensions
): CFSectionProperties {
  const { h, b, d = 0, t, r = t } = dimensions;

  switch (type) {
    case 'C_section':
    case 'stud':
      return calculateCsectionProperties(h, b, d, t, r);
    case 'track':
      return calculateTrackProperties(h, b, t, r);
    case 'Z_section':
      return calculateZsectionProperties(h, b, d, t, r);
    default:
      // For custom sections, return approximate values
      return calculateCsectionProperties(h, b, d || h / 10, t, r);
  }
}

// ============================================================
// EFFECTIVE WIDTH CALCULATIONS (AISI S100 Section 1.1)
// ============================================================

/**
 * Calculate effective width for uniformly compressed stiffened elements
 * AISI S100 Section 1.1.1
 */
export function calculateEffectiveWidthStiffened(
  w: number, // Flat width (mm)
  t: number, // Thickness (mm)
  f: number, // Stress in element (MPa)
  E: number, // Modulus of elasticity (MPa)
  k: number = 4.0 // Plate buckling coefficient
): { be: number; rho: number; lambda: number; Fcr: number } {
  // Plate slenderness
  const lambda = ((w / t) * Math.sqrt(f / E)) / (0.95 * Math.sqrt(k));

  // Elastic critical buckling stress
  const Fcr =
    ((k * Math.PI * Math.PI * E) / (12 * (1 - 0.3 * 0.3))) *
    Math.pow(t / w, 2);

  // Effective width factor
  let rho: number;
  if (lambda <= 0.673) {
    rho = 1.0;
  } else {
    rho = (1 - 0.22 / lambda) / lambda;
  }

  // Effective width
  const be = rho * w;

  return { be, rho, lambda, Fcr };
}

/**
 * Calculate effective width for uniformly compressed unstiffened elements
 * AISI S100 Section 1.1.2
 */
export function calculateEffectiveWidthUnstiffened(
  w: number, // Flat width (mm)
  t: number, // Thickness (mm)
  f: number, // Stress in element (MPa)
  E: number, // Modulus of elasticity (MPa)
  k: number = 0.43 // Plate buckling coefficient for unstiffened
): { be: number; rho: number; lambda: number } {
  const lambda = ((w / t) * Math.sqrt(f / E)) / (0.95 * Math.sqrt(k));

  let rho: number;
  if (lambda <= 0.673) {
    rho = 1.0;
  } else {
    rho = (1 - 0.22 / lambda) / lambda;
  }

  const be = rho * w;

  return { be, rho, lambda };
}

/**
 * Calculate effective width for elements with stress gradient
 * AISI S100 Section 1.1.3
 */
export function calculateEffectiveWidthGradient(
  w: number, // Flat width (mm)
  t: number, // Thickness (mm)
  f1: number, // Maximum compression stress (MPa)
  f2: number, // Stress at other edge (MPa)
  E: number // Modulus of elasticity (MPa)
): { be1: number; be2: number; psi: number; k: number } {
  // Stress ratio
  const psi = f2 / f1;

  // Buckling coefficient for stress gradient
  let k: number;
  if (psi >= 0) {
    k = 4 + 2 * Math.pow(1 - psi, 3) + 2 * (1 - psi);
  } else {
    k = 5.98 * Math.pow(1 - psi, 2);
  }

  const { be } = calculateEffectiveWidthStiffened(w, t, f1, E, k);

  // Distribution of effective width
  let be1: number, be2: number;
  if (psi >= 0) {
    be1 = be / (3 - psi);
    be2 = be - be1;
  } else {
    be1 = be / (3 - psi);
    be2 = 0;
  }

  return { be1, be2, psi, k };
}

// ============================================================
// DISTORTIONAL BUCKLING (AISI S100 Section 1.4)
// ============================================================

export interface DistortionalBucklingResult {
  Fd: number; // Distortional buckling stress (MPa)
  Fn: number; // Nominal stress (MPa)
  lambda_d: number; // Distortional slenderness
}

/**
 * Calculate elastic distortional buckling stress for C and Z sections
 * Based on simplified closed-form expressions
 */
export function calculateElasticDistortionalStress(
  h: number, // Web height (mm)
  b: number, // Flange width (mm)
  d: number, // Lip depth (mm)
  t: number, // Thickness (mm)
  E: number, // Modulus of elasticity (MPa)
  nu: number = 0.3, // Poisson's ratio
  Lm: number // Half-wavelength (mm) - use Lcrd for compression, Lcrd for flexure
): number {
  // Plate stiffness
  const D = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu));

  // Flange + lip rotational stiffness
  const Af = b * t + d * t;
  const Jf = (t * t * t * (b + d)) / 3;
  const Ixf =
    (t * Math.pow(d, 3)) / 12 + d * t * Math.pow(b - d / 2, 2) / (Af / (b * t));
  const Iyf = (t * Math.pow(b, 3)) / 12 + (d * Math.pow(t, 3)) / 12;
  const Ixyf = 0; // Approximate
  const Cwf = 0; // Approximate for simple lip

  const hxf = -(b - (b * b * t) / (2 * Af));
  const hyf = -((d * d * t) / (2 * Af));

  // Distortional buckling half-wavelength (approximate if not provided)
  const L = Lm > 0 ? Lm : 4.8 * Math.pow((h * Math.pow(b, 4) * t) / D, 0.25);

  // Rotational stiffness from web
  const kphiwe = (Math.PI / L) * Math.PI * D * h;

  // Rotational stiffness from flange
  const kphife =
    (Math.pow(Math.PI, 4) * E * (Af * (hxf * hxf + hyf * hyf) + Ixf + Iyf)) /
      Math.pow(L, 3) +
    (Math.PI * Math.PI * E * Cwf) / L;

  // Geometric stiffness coefficient
  const beta = 1 - Math.pow(Ixyf, 2) / (Ixf * Iyf) || 1;

  // Critical stress (simplified)
  const kphi = kphiwe + kphife;
  const Fd = (kphi * Math.pow(L, 2)) / (Math.PI * Math.PI * Af * h);

  return Math.max(Fd, E * Math.pow(t / h, 2));
}

/**
 * Calculate distortional buckling strength
 * AISI S100 Section 1.4.1
 */
export function calculateDistortionalBuckling(
  Fy: number, // Yield strength (MPa)
  Fd: number // Elastic distortional buckling stress (MPa)
): DistortionalBucklingResult {
  const lambda_d = Math.sqrt(Fy / Fd);

  let Fn: number;
  if (lambda_d <= 0.561) {
    Fn = Fy;
  } else {
    Fn =
      (1 - 0.25 * Math.pow(Fd / Fy, 0.6)) * Math.pow(Fd / Fy, 0.6) * Fy;
  }

  return { Fd, Fn, lambda_d };
}

// ============================================================
// DIRECT STRENGTH METHOD (DSM) - APPENDIX 1
// ============================================================

export interface DSMResult {
  Pn_global: number; // Global buckling strength (kN)
  Pn_local: number; // Local buckling strength (kN)
  Pn_dist: number; // Distortional buckling strength (kN)
  Pn: number; // Nominal strength (kN)
  governingMode: 'global' | 'local' | 'distortional';
}

/**
 * DSM Compression Capacity (AISI S100 Appendix 1, Section 1.2.1)
 */
export function calculateDSMCompression(
  Ag: number, // Gross area (mm²)
  Fy: number, // Yield strength (MPa)
  Fcre: number, // Critical elastic global buckling stress (MPa)
  Fcrl: number, // Critical elastic local buckling stress (MPa)
  Fcrd: number // Critical elastic distortional buckling stress (MPa)
): DSMResult {
  const Py = Ag * Fy / 1000; // Squash load (kN)

  // Global buckling
  const lambda_c = Math.sqrt(Fy / Fcre);
  let Pn_global: number;
  if (lambda_c <= 1.5) {
    Pn_global = Math.pow(0.658, lambda_c * lambda_c) * Py;
  } else {
    Pn_global = (0.877 / (lambda_c * lambda_c)) * Py;
  }

  // Local buckling (interaction with global)
  const lambda_l = Math.sqrt(Pn_global / (Ag * Fcrl / 1000));
  let Pn_local: number;
  if (lambda_l <= 0.776) {
    Pn_local = Pn_global;
  } else {
    Pn_local =
      (1 - 0.15 * Math.pow(Fcrl * Ag / 1000 / Pn_global, 0.4)) *
      Math.pow(Fcrl * Ag / 1000 / Pn_global, 0.4) *
      Pn_global;
  }

  // Distortional buckling
  const lambda_d = Math.sqrt(Py / (Ag * Fcrd / 1000));
  let Pn_dist: number;
  if (lambda_d <= 0.561) {
    Pn_dist = Py;
  } else {
    Pn_dist =
      (1 - 0.25 * Math.pow(Fcrd * Ag / 1000 / Py, 0.6)) *
      Math.pow(Fcrd * Ag / 1000 / Py, 0.6) *
      Py;
  }

  // Governing
  const capacities = [
    { mode: 'global' as const, value: Pn_global },
    { mode: 'local' as const, value: Pn_local },
    { mode: 'distortional' as const, value: Pn_dist },
  ];
  const governing = capacities.reduce((a, b) => (a.value < b.value ? a : b));

  return {
    Pn_global,
    Pn_local,
    Pn_dist,
    Pn: governing.value,
    governingMode: governing.mode,
  };
}

/**
 * DSM Flexural Capacity (AISI S100 Appendix 1, Section 1.2.2)
 */
export function calculateDSMFlexure(
  Sf: number, // Full section modulus (mm³)
  Fy: number, // Yield strength (MPa)
  Fcre: number, // Critical elastic LTB stress (MPa)
  Fcrl: number, // Critical elastic local buckling stress (MPa)
  Fcrd: number // Critical elastic distortional buckling stress (MPa)
): {
  Mn_global: number;
  Mn_local: number;
  Mn_dist: number;
  Mn: number;
  governingMode: 'global' | 'local' | 'distortional';
} {
  const My = (Sf * Fy) / 1e6; // Yield moment (kN·m)

  // Global (LTB) buckling
  let Mn_global: number;
  if (Fcre >= 2.78 * Fy) {
    Mn_global = My;
  } else if (Fcre > 0.56 * Fy) {
    Mn_global = (10 / 9) * My * (1 - (10 * Fy) / (36 * Fcre));
  } else {
    Mn_global = (Sf * Fcre) / 1e6;
  }

  // Local buckling (interaction with global)
  const Mcre = (Sf * Fcre) / 1e6;
  const Mcrl = (Sf * Fcrl) / 1e6;
  const lambda_l = Math.sqrt(Mn_global / Mcrl);
  let Mn_local: number;
  if (lambda_l <= 0.776) {
    Mn_local = Mn_global;
  } else {
    Mn_local =
      (1 - 0.15 * Math.pow(Mcrl / Mn_global, 0.4)) *
      Math.pow(Mcrl / Mn_global, 0.4) *
      Mn_global;
  }

  // Distortional buckling
  const Mcrd = (Sf * Fcrd) / 1e6;
  const lambda_d = Math.sqrt(My / Mcrd);
  let Mn_dist: number;
  if (lambda_d <= 0.673) {
    Mn_dist = My;
  } else {
    Mn_dist =
      (1 - 0.22 * Math.pow(Mcrd / My, 0.5)) * Math.pow(Mcrd / My, 0.5) * My;
  }

  // Governing
  const capacities = [
    { mode: 'global' as const, value: Mn_global },
    { mode: 'local' as const, value: Mn_local },
    { mode: 'distortional' as const, value: Mn_dist },
  ];
  const governing = capacities.reduce((a, b) => (a.value < b.value ? a : b));

  return {
    Mn_global,
    Mn_local,
    Mn_dist,
    Mn: governing.value,
    governingMode: governing.mode,
  };
}

// ============================================================
// ELASTIC BUCKLING CALCULATIONS
// ============================================================

/**
 * Calculate elastic flexural buckling stress
 */
export function calculateFlexuralBucklingStress(
  E: number, // Modulus of elasticity (MPa)
  K: number, // Effective length factor
  L: number, // Unbraced length (mm)
  r: number // Radius of gyration (mm)
): number {
  return (Math.PI * Math.PI * E) / Math.pow((K * L) / r, 2);
}

/**
 * Calculate elastic torsional buckling stress
 */
export function calculateTorsionalBucklingStress(
  E: number, // Modulus of elasticity (MPa)
  G: number, // Shear modulus (MPa)
  Cw: number, // Warping constant (mm⁶)
  J: number, // St. Venant torsional constant (mm⁴)
  A: number, // Cross-sectional area (mm²)
  ro: number, // Polar radius of gyration about shear center (mm)
  Kt: number, // Effective length factor for torsion
  Lt: number // Unbraced length for torsion (mm)
): number {
  const sigma_t =
    ((Math.PI * Math.PI * E * Cw) / Math.pow(Kt * Lt, 2) + G * J) /
    (A * ro * ro);
  return sigma_t;
}

/**
 * Calculate flexural-torsional buckling stress for singly symmetric sections
 * AISI S100 Section D2
 */
export function calculateFlexuralTorsionalBucklingStress(
  Fex: number, // Flexural buckling stress about x (MPa)
  Fey: number, // Flexural buckling stress about y (MPa)
  Fez: number, // Torsional buckling stress (MPa)
  beta: number // Coefficient (= 1 - (xo/ro)²)
): number {
  // For singly symmetric sections bending about symmetry axis
  const Fe_ft =
    ((Fex + Fez) / (2 * beta)) *
    (1 - Math.sqrt(1 - (4 * beta * Fex * Fez) / Math.pow(Fex + Fez, 2)));

  return Math.min(Fey, Fe_ft);
}

/**
 * Calculate Cb factor for lateral-torsional buckling
 * AISI S100 Section E2.2
 */
export function calculateCb(
  Mmax: number, // Maximum moment in unbraced segment (kN·m)
  Ma: number, // Moment at quarter point (kN·m)
  Mb: number, // Moment at centerline (kN·m)
  Mc: number // Moment at three-quarter point (kN·m)
): number {
  // All moments should be absolute values
  const M_max = Math.abs(Mmax);
  const M_a = Math.abs(Ma);
  const M_b = Math.abs(Mb);
  const M_c = Math.abs(Mc);

  const Cb = (12.5 * M_max) / (2.5 * M_max + 3 * M_a + 4 * M_b + 3 * M_c);

  // Cb shall not exceed 3.0
  return Math.min(Cb, 3.0);
}

/**
 * Calculate elastic lateral-torsional buckling stress
 */
export function calculateLTBStress(
  E: number,
  G: number,
  Iy: number,
  Cw: number,
  J: number,
  Sf: number,
  L: number,
  Cb: number = 1.0
): number {
  const Fe =
    (Cb * Math.PI * Math.PI * E * Iy * (G * J + (Math.PI * Math.PI * E * Cw) / (L * L))) /
    (L * L * Sf * Sf);
  return Math.sqrt(Fe);
}

// ============================================================
// TENSION MEMBERS (AISI S100 Section C)
// ============================================================

export interface TensionCapacity {
  Tn_yield: number; // Nominal yielding capacity (kN)
  Tn_rupture: number; // Nominal rupture capacity (kN)
  Tn: number; // Governing nominal capacity (kN)
  phi_Tn: number; // Design capacity (kN) - LRFD
  Tn_ASD: number; // Allowable capacity (kN) - ASD
  governingMode: 'yield' | 'rupture';
}

/**
 * Calculate tension capacity
 */
export function calculateTensionCapacity(
  Ag: number, // Gross area (mm²)
  An: number, // Net area (mm²)
  Fy: number, // Yield strength (MPa)
  Fu: number, // Ultimate strength (MPa)
  method: DesignMethod = 'LRFD'
): TensionCapacity {
  // Yielding in gross section
  const Tn_yield = (Ag * Fy) / 1000; // kN
  const phi_Tn_yield = PHI.TENSION_YIELD * Tn_yield;
  const Tn_yield_ASD = Tn_yield / OMEGA.TENSION_YIELD;

  // Rupture in net section
  const Tn_rupture = (An * Fu) / 1000; // kN
  const phi_Tn_rupture = PHI.TENSION_RUPTURE * Tn_rupture;
  const Tn_rupture_ASD = Tn_rupture / OMEGA.TENSION_RUPTURE;

  // Governing (based on design method)
  let governingMode: 'yield' | 'rupture';
  let phi_Tn: number;
  let Tn_ASD: number;

  if (method === 'LRFD') {
    governingMode = phi_Tn_yield < phi_Tn_rupture ? 'yield' : 'rupture';
    phi_Tn = Math.min(phi_Tn_yield, phi_Tn_rupture);
    Tn_ASD = governingMode === 'yield' ? Tn_yield_ASD : Tn_rupture_ASD;
  } else {
    governingMode = Tn_yield_ASD < Tn_rupture_ASD ? 'yield' : 'rupture';
    phi_Tn = governingMode === 'yield' ? phi_Tn_yield : phi_Tn_rupture;
    Tn_ASD = Math.min(Tn_yield_ASD, Tn_rupture_ASD);
  }

  const Tn = governingMode === 'yield' ? Tn_yield : Tn_rupture;

  return {
    Tn_yield,
    Tn_rupture,
    Tn,
    phi_Tn,
    Tn_ASD,
    governingMode,
  };
}

// ============================================================
// COMPRESSION MEMBERS (AISI S100 Section D)
// ============================================================

export interface CompressionCapacity {
  Fn: number; // Nominal buckling stress (MPa)
  Pn: number; // Nominal capacity (kN)
  phi_Pn: number; // Design capacity (kN) - LRFD
  Pn_ASD: number; // Allowable capacity (kN) - ASD
  Fe: number; // Elastic buckling stress (MPa)
  lambda_c: number; // Column slenderness
  governingMode: 'yielding' | 'flexural' | 'torsional' | 'flexural-torsional' | 'distortional';
}

/**
 * Calculate compression capacity for flexural buckling
 */
export function calculateCompressionCapacityFlexural(
  Ae: number, // Effective area (mm²)
  Fy: number, // Yield strength (MPa)
  E: number, // Modulus of elasticity (MPa)
  KL: number, // Effective length (mm)
  r: number // Radius of gyration (mm)
): CompressionCapacity {
  // Elastic flexural buckling stress
  const Fe = (Math.PI * Math.PI * E) / Math.pow(KL / r, 2);

  // Column slenderness
  const lambda_c = Math.sqrt(Fy / Fe);

  // Nominal buckling stress
  let Fn: number;
  if (lambda_c <= 1.5) {
    Fn = Math.pow(0.658, lambda_c * lambda_c) * Fy;
  } else {
    Fn = (0.877 / (lambda_c * lambda_c)) * Fy;
  }

  // Nominal capacity
  const Pn = (Ae * Fn) / 1000; // kN

  return {
    Fn,
    Pn,
    phi_Pn: PHI.COMPRESSION * Pn,
    Pn_ASD: Pn / OMEGA.COMPRESSION,
    Fe,
    lambda_c,
    governingMode: lambda_c <= 1.5 ? 'yielding' : 'flexural',
  };
}

/**
 * Calculate complete compression capacity including all buckling modes
 */
export function calculateCompressionCapacityComplete(
  properties: CFSectionProperties,
  material: ColdFormedSteelMaterial,
  Kx: number,
  Ky: number,
  Kt: number,
  Lx: number,
  Ly: number,
  Lt: number,
  Lcrd: number = Lx // Distortional buckling half-wavelength
): CompressionCapacity {
  const { A, Ae, rx, ry, J, Cw, xo, ro } = properties;
  const { Fy, E, G } = material;

  // Flexural buckling about x-axis
  const Fex = calculateFlexuralBucklingStress(E, Kx, Lx, rx);

  // Flexural buckling about y-axis
  const Fey = calculateFlexuralBucklingStress(E, Ky, Ly, ry);

  // Torsional buckling
  const roCalc = ro || Math.sqrt(rx * rx + ry * ry + xo * xo);
  const Fez = calculateTorsionalBucklingStress(E, G, Cw, J, A, roCalc, Kt, Lt);

  // Flexural-torsional buckling (for singly symmetric sections)
  const beta = 1 - Math.pow(xo / roCalc, 2);
  const Fe_ft = calculateFlexuralTorsionalBucklingStress(Fex, Fey, Fez, beta);

  // Governing elastic buckling stress
  const Fe = Math.min(Fex, Fey, Fe_ft);

  // Column slenderness
  const lambda_c = Math.sqrt(Fy / Fe);

  // Inelastic buckling stress
  let Fn: number;
  if (lambda_c <= 1.5) {
    Fn = Math.pow(0.658, lambda_c * lambda_c) * Fy;
  } else {
    Fn = (0.877 / (lambda_c * lambda_c)) * Fy;
  }

  // Nominal capacity
  const Pn = (Ae * Fn) / 1000;

  // Determine governing mode
  let governingMode: CompressionCapacity['governingMode'];
  if (Fe === Fex) governingMode = 'flexural';
  else if (Fe === Fey) governingMode = 'flexural';
  else if (Fe === Fe_ft) governingMode = 'flexural-torsional';
  else governingMode = 'torsional';

  if (lambda_c <= 1.5) governingMode = 'yielding';

  return {
    Fn,
    Pn,
    phi_Pn: PHI.COMPRESSION * Pn,
    Pn_ASD: Pn / OMEGA.COMPRESSION,
    Fe,
    lambda_c,
    governingMode,
  };
}

// ============================================================
// FLEXURAL MEMBERS (AISI S100 Section E)
// ============================================================

export interface FlexuralCapacity {
  Mn_yield: number; // Yield moment (kN·m)
  Mn_LTB: number; // Lateral-torsional buckling moment (kN·m)
  Mn_local: number; // Local buckling moment (kN·m)
  Mn_dist?: number; // Distortional buckling moment (kN·m)
  Mn: number; // Governing moment capacity (kN·m)
  phi_Mn: number; // Design moment capacity (kN·m) - LRFD
  Mn_ASD: number; // Allowable moment capacity (kN·m) - ASD
  governingMode: 'yield' | 'LTB' | 'local' | 'distortional';
}

/**
 * Calculate flexural capacity
 */
export function calculateFlexuralCapacity(
  Se: number, // Effective section modulus (mm³)
  Sf: number, // Full section modulus (mm³)
  Fy: number, // Yield strength (MPa)
  Fe: number, // Elastic LTB stress (MPa)
  Fd?: number // Distortional buckling stress (MPa)
): FlexuralCapacity {
  // Yield moment
  const My = (Sf * Fy) / 1e6; // kN·m
  const Mn_yield = My;

  // Local buckling moment
  const Mn_local = (Se * Fy) / 1e6; // kN·m

  // Lateral-torsional buckling
  let Mn_LTB: number;
  if (Fe >= 2.78 * Fy) {
    Mn_LTB = My;
  } else if (Fe > 0.56 * Fy) {
    Mn_LTB = (10 / 9) * My * (1 - (10 * My) / ((36 * Fe * Sf) / 1e6));
  } else {
    Mn_LTB = (Fe * Sf) / 1e6;
  }

  // Distortional buckling (if applicable)
  let Mn_dist: number | undefined;
  if (Fd !== undefined) {
    const { Fn } = calculateDistortionalBuckling(Fy, Fd);
    Mn_dist = (Sf * Fn) / 1e6;
  }

  // Governing capacity
  const capacities: Array<{
    mode: 'yield' | 'LTB' | 'local' | 'distortional';
    value: number;
  }> = [
    { mode: 'yield', value: Mn_yield },
    { mode: 'LTB', value: Mn_LTB },
    { mode: 'local', value: Mn_local },
  ];
  if (Mn_dist !== undefined) {
    capacities.push({ mode: 'distortional', value: Mn_dist });
  }

  const governing = capacities.reduce((a, b) => (a.value < b.value ? a : b));

  return {
    Mn_yield,
    Mn_LTB,
    Mn_local,
    Mn_dist,
    Mn: governing.value,
    phi_Mn: PHI.FLEXURE * governing.value,
    Mn_ASD: governing.value / OMEGA.FLEXURE,
    governingMode: governing.mode,
  };
}

/**
 * Calculate complete flexural capacity with Cb and all modes
 */
export function calculateFlexuralCapacityComplete(
  properties: CFSectionProperties,
  material: ColdFormedSteelMaterial,
  Lt: number, // Unbraced length for LTB (mm)
  Cb: number = 1.0, // Moment gradient factor
  Fd?: number // Elastic distortional buckling stress (MPa)
): FlexuralCapacity {
  const { Sx, Se, Iy, J, Cw } = properties;
  const { Fy, E, G } = material;

  // Elastic LTB stress
  const Fe = calculateLTBStress(E, G, Iy, Cw, J, Sx, Lt, Cb);

  return calculateFlexuralCapacity(Se, Sx, Fy, Fe, Fd);
}

// ============================================================
// SHEAR (AISI S100 Section F)
// ============================================================

export interface ShearCapacity {
  Vn: number; // Nominal shear capacity (kN)
  phi_Vn: number; // Design shear capacity (kN) - LRFD
  Vn_ASD: number; // Allowable shear capacity (kN) - ASD
  Vcr: number; // Critical shear buckling stress (MPa)
  governingMode: 'yield' | 'inelastic' | 'elastic';
}

/**
 * Calculate shear capacity for web
 */
export function calculateShearCapacity(
  h: number, // Web height (mm)
  t: number, // Web thickness (mm)
  Fy: number, // Yield strength (MPa)
  E: number, // Modulus of elasticity (MPa)
  kv: number = 5.34 // Shear buckling coefficient
): ShearCapacity {
  // Shear yield stress
  const Fvy = 0.6 * Fy;

  // Web slenderness
  const h_t = h / t;

  // Elastic critical shear stress
  const Fcr =
    (kv * Math.PI * Math.PI * E) / (12 * (1 - 0.3 * 0.3) * h_t * h_t);

  // Nominal shear stress
  let Fv: number;
  let governingMode: 'yield' | 'inelastic' | 'elastic';

  if (h_t <= Math.sqrt((E * kv) / Fy)) {
    // Yielding
    Fv = Fvy;
    governingMode = 'yield';
  } else if (h_t <= 1.51 * Math.sqrt((E * kv) / Fy)) {
    // Inelastic buckling
    Fv = (0.6 * Math.sqrt(E * kv * Fy)) / h_t;
    governingMode = 'inelastic';
  } else {
    // Elastic buckling
    Fv = Fcr;
    governingMode = 'elastic';
  }

  // Shear capacity
  const Aw = h * t;
  const Vn = (Aw * Fv) / 1000; // kN

  return {
    Vn,
    phi_Vn: PHI.SHEAR * Vn,
    Vn_ASD: Vn / OMEGA.SHEAR,
    Vcr: Fcr,
    governingMode,
  };
}

// ============================================================
// WEB CRIPPLING (AISI S100 Section F5)
// ============================================================

export interface WebCripplingCapacity {
  Pn: number; // Nominal capacity (kN)
  phi_Pn: number; // Design capacity (kN) - LRFD
  Pn_ASD: number; // Allowable capacity (kN) - ASD
  loadCase: string;
}

export type WebCripplingLoadCase = 'EOF' | 'IOF' | 'ETF' | 'ITF';

/**
 * Calculate web crippling capacity
 */
export function calculateWebCripplingCapacity(
  h: number, // Web height (mm)
  t: number, // Web thickness (mm)
  N: number, // Bearing length (mm)
  Fy: number, // Yield strength (MPa)
  theta: number = 90, // Web inclination (degrees)
  loadCase: WebCripplingLoadCase = 'EOF',
  hasHole: boolean = false
): WebCripplingCapacity {
  // Coefficients based on load case (from AISI S100 Table F5.1-1)
  let C: number, Cr: number, Cn: number, Ch: number;

  switch (loadCase) {
    case 'EOF': // End One-Flange
      C = 4;
      Cr = 0.14;
      Cn = 0.35;
      Ch = 0.02;
      break;
    case 'IOF': // Interior One-Flange
      C = 13;
      Cr = 0.23;
      Cn = 0.14;
      Ch = 0.01;
      break;
    case 'ETF': // End Two-Flange
      C = 2;
      Cr = 0.11;
      Cn = 0.37;
      Ch = 0.01;
      break;
    case 'ITF': // Interior Two-Flange
      C = 7.5;
      Cr = 0.08;
      Cn = 0.12;
      Ch = 0.048;
      break;
  }

  const R = t; // Inside bend radius (assume = t for simplicity)
  const thetaRad = (theta * Math.PI) / 180;

  // Web crippling capacity
  const Pn =
    ((C *
      t *
      t *
      Fy *
      Math.sin(thetaRad) *
      (1 - Cr * Math.sqrt(R / t)) *
      (1 + Cn * Math.sqrt(N / t)) *
      (1 - Ch * Math.sqrt(h / t))) /
      1000); // kN

  // Hole reduction factor (if applicable)
  const Rc = hasHole ? 0.7 : 1.0;

  return {
    Pn: Pn * Rc,
    phi_Pn: PHI.WEB_CRIPPLING * Pn * Rc,
    Pn_ASD: (Pn * Rc) / OMEGA.WEB_CRIPPLING,
    loadCase,
  };
}

// ============================================================
// WEB HOLES PROVISIONS (AISI S100 Sections C3, D4, E2.1)
// ============================================================

export interface WebHoleReduction {
  compressionFactor: number;
  shearFactor: number;
  flexureFactor: number;
  webCripplingFactor: number;
}

/**
 * Calculate reduction factors for web holes
 * Based on AISI S100 provisions for circular and non-circular holes
 */
export function calculateWebHoleReduction(
  h: number, // Web height (mm)
  t: number, // Web thickness (mm)
  dh: number, // Hole depth (mm)
  Lh: number, // Hole length (mm) - for non-circular
  isCircular: boolean = true,
  holeSpacing: number = 0 // Center-to-center spacing of holes (mm)
): WebHoleReduction {
  const h_t = h / t;

  // Limits for web holes (AISI S100)
  const maxHoleDepth = isCircular ? 0.5 * h : 0.4 * h;
  const dhRatio = dh / h;

  // Check if hole is within limits
  if (dh > maxHoleDepth) {
    // Hole exceeds limits - significant reduction
    return {
      compressionFactor: 0.5,
      shearFactor: 0.5,
      flexureFactor: 0.6,
      webCripplingFactor: 0.5,
    };
  }

  // Compression reduction (AISI S100 D4)
  let compressionFactor = 1.0;
  if (isCircular && dhRatio <= 0.5) {
    // Circular holes up to 0.5h
    compressionFactor = 1 - dhRatio;
  } else if (!isCircular && dhRatio <= 0.4) {
    // Non-circular holes
    const Lh_h = Lh / h;
    compressionFactor = 1 - 0.8 * dhRatio - 0.1 * Lh_h;
  }

  // Shear reduction (AISI S100 G3.3)
  let shearFactor = 1.0;
  if (dhRatio <= 0.7) {
    shearFactor = Math.max(0.4, 1 - 1.1 * dhRatio);
  } else {
    shearFactor = 0.4;
  }

  // Flexure reduction (AISI S100 E2.1)
  let flexureFactor = 1.0;
  if (isCircular && dhRatio <= 0.5) {
    flexureFactor = 1 - 0.5 * dhRatio;
  } else if (!isCircular) {
    flexureFactor = 1 - 0.7 * dhRatio;
  }

  // Web crippling reduction
  const webCripplingFactor = dhRatio <= 0.4 ? 0.7 : 0.5;

  return {
    compressionFactor: Math.max(0.3, compressionFactor),
    shearFactor: Math.max(0.3, shearFactor),
    flexureFactor: Math.max(0.5, flexureFactor),
    webCripplingFactor,
  };
}

// ============================================================
// COMBINED LOADING (AISI S100 Section G)
// ============================================================

export interface CombinedLoadingResult {
  interaction: number;
  passed: boolean;
  equation: string;
}

/**
 * Check combined bending and compression (AISI S100 Section G1)
 */
export function checkCombinedBendingCompression(
  Pu: number, // Required axial compression (kN)
  Mux: number, // Required moment about x (kN·m)
  Muy: number, // Required moment about y (kN·m)
  phi_Pn: number, // Design compression capacity (kN)
  phi_Mnx: number, // Design moment capacity about x (kN·m)
  phi_Mny: number, // Design moment capacity about y (kN·m)
  Cmx: number = 1.0, // Moment coefficient x
  Cmy: number = 1.0, // Moment coefficient y
  alpha_x: number = 1.0, // Amplification factor x
  alpha_y: number = 1.0 // Amplification factor y
): CombinedLoadingResult {
  // Interaction equation (AISI S100 Eq. G1-1)
  const term1 = Pu / phi_Pn;
  const term2 = (Cmx * Mux) / (phi_Mnx * alpha_x);
  const term3 = (Cmy * Muy) / (phi_Mny * alpha_y);

  const interaction = term1 + term2 + term3;

  return {
    interaction,
    passed: interaction <= 1.0,
    equation: 'AISI G1-1',
  };
}

/**
 * Check combined bending and tension (AISI S100 Section G2)
 */
export function checkCombinedBendingTension(
  Tu: number, // Required axial tension (kN)
  Mux: number, // Required moment about x (kN·m)
  Muy: number, // Required moment about y (kN·m)
  phi_Tn: number, // Design tension capacity (kN)
  phi_Mnx: number, // Design moment capacity about x (kN·m)
  phi_Mny: number // Design moment capacity about y (kN·m)
): CombinedLoadingResult {
  // Interaction equation
  const interaction = Tu / phi_Tn + Mux / phi_Mnx + Muy / phi_Mny;

  return {
    interaction,
    passed: interaction <= 1.0,
    equation: 'AISI G2-1',
  };
}

/**
 * Check combined bending and shear (AISI S100 Section G3)
 */
export function checkCombinedBendingShear(
  Mu: number, // Required moment (kN·m)
  Vu: number, // Required shear (kN)
  phi_Mn: number, // Design moment capacity (kN·m)
  phi_Vn: number // Design shear capacity (kN)
): CombinedLoadingResult {
  // Circular interaction
  const interaction = Math.sqrt(
    Math.pow(Mu / phi_Mn, 2) + Math.pow(Vu / phi_Vn, 2)
  );

  return {
    interaction,
    passed: interaction <= 1.0,
    equation: 'AISI G3-1',
  };
}

/**
 * Check combined web crippling and bending (AISI S100 Section G4)
 */
export function checkCombinedWebCripplingBending(
  Pu: number, // Required concentrated load (kN)
  Mu: number, // Required moment at load point (kN·m)
  phi_Pn: number, // Design web crippling capacity (kN)
  phi_Mn: number, // Design moment capacity (kN·m)
  loadCase: 'EOF' | 'IOF' | 'ETF' | 'ITF'
): CombinedLoadingResult {
  let interaction: number;
  let equation: string;

  if (loadCase === 'EOF' || loadCase === 'IOF') {
    // One-flange loading: linear interaction
    interaction = Pu / phi_Pn + Mu / phi_Mn;
    equation = 'AISI G4-1';
  } else {
    // Two-flange loading: modified interaction
    interaction =
      1.07 * Math.pow(Pu / phi_Pn, 1.42) +
      Math.pow(Mu / phi_Mn, 2);
    equation = 'AISI G4-2';
  }

  return {
    interaction,
    passed: interaction <= 1.0,
    equation,
  };
}

// ============================================================
// SECOND-ORDER ANALYSIS (P-DELTA) - APPENDIX 2
// ============================================================

/**
 * Calculate B1 factor (P-delta amplification for braced frames)
 * AISI S100 Appendix 2
 */
export function calculateB1(
  Cm: number, // Equivalent moment factor
  Pr: number, // Required axial load (kN)
  Pe1: number, // Euler buckling load (kN)
  alpha: number = 1.0 // LRFD = 1.0, ASD = 1.6
): number {
  const B1 = Cm / (1 - (alpha * Pr) / Pe1);
  return Math.max(1.0, B1);
}

/**
 * Calculate B2 factor (P-Delta amplification for sway frames)
 * AISI S100 Appendix 2
 */
export function calculateB2(
  sumPr: number, // Sum of required axial loads in story (kN)
  sumPe2: number, // Sum of Euler buckling loads in story (kN)
  alpha: number = 1.0 // LRFD = 1.0, ASD = 1.6
): number {
  const B2 = 1 / (1 - (alpha * sumPr) / sumPe2);
  return Math.max(1.0, B2);
}

/**
 * Calculate Cm factor (equivalent uniform moment factor)
 */
export function calculateCm(
  M1: number, // Smaller end moment (kN·m)
  M2: number, // Larger end moment (kN·m)
  isReverseCurvature: boolean = false
): number {
  // M1/M2 is negative for reverse curvature
  const ratio = isReverseCurvature ? -Math.abs(M1 / M2) : Math.abs(M1 / M2);
  return 0.6 - 0.4 * ratio;
}

// ============================================================
// SERVICEABILITY (DEFLECTION)
// ============================================================

export interface DeflectionResult {
  delta: number; // Calculated deflection (mm)
  limit: number; // Allowable deflection (mm)
  ratio: number; // L/delta ratio
  passed: boolean;
}

/**
 * Calculate beam deflection (simple span, uniform load)
 */
export function calculateBeamDeflection(
  w: number, // Uniform load (kN/m)
  L: number, // Span length (mm)
  E: number, // Modulus of elasticity (MPa)
  I: number // Moment of inertia (mm⁴)
): number {
  // 5wL^4 / (384EI) - convert units
  const wN = w * 1000; // kN/m to N/mm
  return (5 * wN * Math.pow(L, 4)) / (384 * E * I);
}

/**
 * Check deflection against limits
 */
export function checkDeflection(
  delta: number, // Calculated deflection (mm)
  L: number, // Span length (mm)
  limitRatio: number = 240 // L/limit ratio (default L/240)
): DeflectionResult {
  const limit = L / limitRatio;
  const ratio = L / delta;

  return {
    delta,
    limit,
    ratio,
    passed: delta <= limit,
  };
}

// ============================================================
// CONNECTION DESIGN
// ============================================================

// Screw connections
export interface ScrewCapacity {
  Pns_shear: number; // Nominal shear capacity (kN)
  Pns_bearing: number; // Nominal bearing capacity (kN)
  Pns_tension: number; // Nominal tension capacity (kN)
  Pns: number; // Governing capacity (kN)
  phi_Pns: number; // Design capacity (kN)
  governingMode: 'shear' | 'bearing' | 'tension' | 'pullover' | 'pullout';
}

/**
 * Calculate screw shear capacity
 * AISI S100 Chapter E
 */
export function calculateScrewCapacity(
  d: number, // Nominal screw diameter (mm)
  t1: number, // Thickness of member in contact with screw head (mm)
  t2: number, // Thickness of member not in contact with screw head (mm)
  Fu1: number, // Ultimate strength of member 1 (MPa)
  Fu2: number, // Ultimate strength of member 2 (MPa)
  Fus: number = 689 // Screw ultimate tensile strength (MPa) - default for #10-12 screws
): ScrewCapacity {
  // Shear capacity of screw (connection shear)
  let Pns_shear: number;

  if (t2 / t1 <= 1.0) {
    // t2 ≤ t1
    if (t2 / t1 < 0.5) {
      Pns_shear = (4.2 * Math.pow(t2, 3) * d * Fu2) / 1000;
    } else {
      Pns_shear =
        ((2.7 * t1 * d * Fu1 + 2.7 * t2 * d * Fu2 - 4.2 * Math.pow(t2, 3) * d * Fu2 / t1) / 1000);
    }
  } else {
    // t2 > t1
    Pns_shear = (2.7 * t1 * d * Fu1) / 1000;
  }

  // Bearing capacity
  const Pns_bearing = Math.min(
    (2.7 * t1 * d * Fu1) / 1000,
    (2.7 * t2 * d * Fu2) / 1000
  );

  // Tension capacity (pullout from t2)
  const Pns_tension = (0.85 * t2 * d * Fu2) / 1000;

  // Governing capacity
  const capacities = [
    { mode: 'shear' as const, value: Pns_shear },
    { mode: 'bearing' as const, value: Pns_bearing },
    { mode: 'tension' as const, value: Pns_tension },
  ];
  const governing = capacities.reduce((a, b) => (a.value < b.value ? a : b));

  return {
    Pns_shear,
    Pns_bearing,
    Pns_tension,
    Pns: governing.value,
    phi_Pns: PHI.SCREW_SHEAR * governing.value,
    governingMode: governing.mode,
  };
}

// Bolt connections
export interface BoltCapacity {
  Rn_shear: number; // Nominal shear capacity per bolt (kN)
  Rn_bearing: number; // Nominal bearing capacity per bolt (kN)
  Rn: number; // Governing capacity per bolt (kN)
  phi_Rn: number; // Design capacity per bolt (kN)
  governingMode: 'shear' | 'bearing';
}

/**
 * Calculate bolt shear and bearing capacity
 */
export function calculateBoltCapacity(
  d: number, // Bolt diameter (mm)
  t: number, // Connected material thickness (mm)
  Fu_bolt: number, // Bolt ultimate strength (MPa)
  Fu_plate: number, // Plate ultimate strength (MPa)
  e: number, // Edge distance (mm)
  s: number, // Bolt spacing (mm)
  nShearPlanes: number = 1 // Number of shear planes
): BoltCapacity {
  // Bolt shear capacity
  const Ab = (Math.PI * d * d) / 4;
  const Rn_shear = (0.5 * Ab * Fu_bolt * nShearPlanes) / 1000; // kN

  // Bearing capacity (with edge distance and spacing limits)
  const mf = Math.min(e / d, s / (3 * d), 1.0);
  const Rn_bearing = (mf * 2.4 * d * t * Fu_plate) / 1000; // kN

  const governingMode = Rn_shear < Rn_bearing ? 'shear' : 'bearing';
  const Rn = Math.min(Rn_shear, Rn_bearing);

  return {
    Rn_shear,
    Rn_bearing,
    Rn,
    phi_Rn:
      governingMode === 'shear'
        ? PHI.BOLT_SHEAR * Rn
        : PHI.BOLT_BEARING * Rn,
    governingMode,
  };
}

// Weld connections
export interface WeldCapacity {
  Rn: number; // Nominal capacity per unit length (kN/mm)
  phi_Rn: number; // Design capacity per unit length (kN/mm)
  Rn_total: number; // Total capacity for given length (kN)
  phi_Rn_total: number; // Total design capacity (kN)
}

/**
 * Calculate fillet weld capacity
 */
export function calculateWeldCapacity(
  w: number, // Weld size (leg) (mm)
  L: number, // Weld length (mm)
  Fexx: number = 482, // Electrode tensile strength (MPa) - E70XX default
  theta: number = 0 // Angle of loading (degrees from weld axis)
): WeldCapacity {
  // Effective throat
  const te = w * 0.707;

  // Directional strength increase
  const thetaRad = (theta * Math.PI) / 180;
  const k = 1.0 + 0.5 * Math.pow(Math.sin(thetaRad), 1.5);

  // Nominal strength per unit length
  const Fnw = 0.6 * Fexx * k;
  const Rn = (te * Fnw) / 1000; // kN/mm

  // Minimum weld length
  const Leff = Math.max(L, 4 * w);

  return {
    Rn,
    phi_Rn: PHI.WELD * Rn,
    Rn_total: Rn * Leff,
    phi_Rn_total: PHI.WELD * Rn * Leff,
  };
}

// ============================================================
// BUILT-UP SECTIONS
// ============================================================

/**
 * Calculate modification factors for built-up members
 * AISI S100 Section D1.2
 */
export function calculateBuiltUpModification(
  slenderness: number, // Overall slenderness (KL/r)
  a: number, // Connector spacing (mm)
  ri: number // Minimum radius of gyration of individual shape (mm)
): { modifiedSlenderness: number; reductionFactor: number } {
  // Modified slenderness for built-up members
  const localSlenderness = a / ri;

  let modifiedSlenderness: number;
  if (localSlenderness <= 0.5 * slenderness) {
    // Closely spaced connectors
    modifiedSlenderness = slenderness;
  } else {
    // Modified slenderness
    modifiedSlenderness = Math.sqrt(
      slenderness * slenderness +
        Math.pow(localSlenderness, 2)
    );
  }

  // Reduction factor for shear deformation
  const reductionFactor = Math.max(
    0.75,
    1 - 0.15 * (localSlenderness / slenderness)
  );

  return { modifiedSlenderness, reductionFactor };
}

// ============================================================
// SSMA STANDARD SECTIONS
// ============================================================

export interface SSMASection {
  designation: string;
  type: CFSectionType;
  h: number; // Depth (mm)
  b: number; // Flange width (mm)
  d: number; // Lip depth (mm)
  t: number; // Thickness (mm)
  properties: CFSectionProperties;
}

/**
 * Parse SSMA designation
 * Format: 600S162-54 (depth x type x flange x thickness)
 */
export function parseSSMADesignation(designation: string): {
  depth: number;
  type: 'S' | 'T' | 'U';
  flange: number;
  thickness: number;
} | null {
  const match = designation.match(/^(\d+)([STU])(\d+)-(\d+)$/);
  if (!match) return null;

  return {
    depth: parseInt(match[1]) / 100 * 25.4, // Convert mils to mm
    type: match[2] as 'S' | 'T' | 'U',
    flange: parseInt(match[3]) / 100 * 25.4, // Convert mils to mm
    thickness: parseInt(match[4]) / 1000 * 25.4, // Convert mils to mm
  };
}

/**
 * Get standard SSMA sections
 */
export function getStandardSSMASections(): SSMASection[] {
  const sections: SSMASection[] = [];

  // Common stud depths (in mils converted to mm)
  const depths = [350, 362, 400, 550, 600, 800, 1000, 1200];
  const flanges = [125, 137, 162, 200, 250];
  const thicknesses = [33, 43, 54, 68, 97, 118];

  for (const d of [600]) {
    for (const f of [162]) {
      for (const t of [54, 68]) {
        const h = (d / 100) * 25.4;
        const b = (f / 100) * 25.4;
        const thickness = (t / 1000) * 25.4;
        const lip = b * 0.6; // Typical lip depth

        const designation = `${d}S${f}-${t}`;
        const props = calculateCsectionProperties(h, b, lip, thickness);

        sections.push({
          designation,
          type: 'stud',
          h,
          b,
          d: lip,
          t: thickness,
          properties: props,
        });
      }
    }
  }

  return sections;
}

// ============================================================
// DESIGN CHECK RUNNER
// ============================================================

export interface CFSDesignInput {
  // Section
  sectionType: CFSectionType;
  dimensions: CFSectionDimensions;
  properties: CFSectionProperties;

  // Material
  material: ColdFormedSteelMaterial;

  // Member
  Lx: number; // Unbraced length for x-axis buckling (mm)
  Ly: number; // Unbraced length for y-axis buckling (mm)
  Lt: number; // Unbraced length for torsional buckling (mm)
  Kx: number; // Effective length factor x
  Ky: number; // Effective length factor y

  // Loads
  Pu: number; // Factored axial (kN, + = compression)
  Mux: number; // Factored moment about x (kN·m)
  Muy: number; // Factored moment about y (kN·m)
  Vu: number; // Factored shear (kN)

  // Optional
  method?: DesignMethod;
  Cb?: number; // Moment gradient factor
  useDSM?: boolean; // Use Direct Strength Method
  webHole?: { dh: number; Lh: number; isCircular: boolean };
}

export interface CFSDesignResult {
  dcRatio: number;
  governingCheck: string;
  status: DesignStatus;
  compression?: CompressionCapacity;
  tension?: TensionCapacity;
  flexure: FlexuralCapacity;
  shear: ShearCapacity;
  combined?: CombinedLoadingResult;
  messages: DesignMessage[];
  method: DesignMethod;
}

/**
 * Perform complete CFS design check
 */
export function checkCFSMember(input: CFSDesignInput): CFSDesignResult {
  const messages: DesignMessage[] = [];
  const { material, properties, dimensions } = input;
  const method = input.method || 'LRFD';
  const Cb = input.Cb || 1.0;

  // Apply web hole reductions if applicable
  let holeFactors: WebHoleReduction | undefined;
  if (input.webHole) {
    holeFactors = calculateWebHoleReduction(
      dimensions.h,
      dimensions.t,
      input.webHole.dh,
      input.webHole.Lh,
      input.webHole.isCircular
    );
    messages.push({
      type: 'info',
      code: 'AISI-HOLE',
      message: `Web hole reductions applied: compression=${(holeFactors.compressionFactor * 100).toFixed(0)}%, shear=${(holeFactors.shearFactor * 100).toFixed(0)}%`,
    });
  }

  // Compression or tension check
  let compression: CompressionCapacity | undefined;
  let tension: TensionCapacity | undefined;

  if (input.Pu > 0) {
    // Compression
    const KLx = input.Kx * input.Lx;
    const KLy = input.Ky * input.Ly;

    const compX = calculateCompressionCapacityFlexural(
      properties.Ae,
      material.Fy,
      material.E,
      KLx,
      properties.rx
    );

    const compY = calculateCompressionCapacityFlexural(
      properties.Ae,
      material.Fy,
      material.E,
      KLy,
      properties.ry
    );

    compression = compX.phi_Pn < compY.phi_Pn ? compX : compY;

    // Apply hole reduction
    if (holeFactors) {
      compression.phi_Pn *= holeFactors.compressionFactor;
      compression.Pn_ASD *= holeFactors.compressionFactor;
    }

    // Check slenderness
    const maxKLr = Math.max(KLx / properties.rx, KLy / properties.ry);
    if (maxKLr > 200) {
      messages.push({
        type: 'warning',
        code: 'AISI-D1',
        message: `Slenderness ratio (${maxKLr.toFixed(1)}) exceeds recommended limit of 200`,
      });
    }
  } else if (input.Pu < 0) {
    // Tension
    tension = calculateTensionCapacity(
      properties.A,
      properties.A * 0.9, // Simplified net area
      material.Fy,
      material.Fu,
      method
    );
  }

  // Flexure check
  const Fe_LTB =
    (Cb *
      Math.PI *
      Math.PI *
      material.E *
      properties.Iy *
      properties.Cw) /
    (input.Lt * input.Lt * properties.Sx);

  const flexure = calculateFlexuralCapacity(
    properties.Se,
    properties.Sx,
    material.Fy,
    Math.sqrt(Fe_LTB)
  );

  // Apply hole reduction to flexure
  if (holeFactors) {
    flexure.phi_Mn *= holeFactors.flexureFactor;
    flexure.Mn_ASD *= holeFactors.flexureFactor;
  }

  // Shear check
  const shear = calculateShearCapacity(
    dimensions.h,
    dimensions.t,
    material.Fy,
    material.E
  );

  // Apply hole reduction to shear
  if (holeFactors) {
    shear.phi_Vn *= holeFactors.shearFactor;
    shear.Vn_ASD *= holeFactors.shearFactor;
  }

  // Combined check
  let combined: CombinedLoadingResult | undefined;
  if (input.Pu > 0 && compression) {
    combined = checkCombinedBendingCompression(
      input.Pu,
      input.Mux,
      input.Muy,
      method === 'LRFD' ? compression.phi_Pn : compression.Pn_ASD,
      method === 'LRFD' ? flexure.phi_Mn : flexure.Mn_ASD,
      (method === 'LRFD' ? flexure.phi_Mn : flexure.Mn_ASD) * 0.7 // Simplified for y-axis
    );
  } else if (input.Pu < 0 && tension) {
    combined = checkCombinedBendingTension(
      Math.abs(input.Pu),
      input.Mux,
      input.Muy,
      method === 'LRFD' ? tension.phi_Tn : tension.Tn_ASD,
      method === 'LRFD' ? flexure.phi_Mn : flexure.Mn_ASD,
      (method === 'LRFD' ? flexure.phi_Mn : flexure.Mn_ASD) * 0.7
    );
  }

  // Calculate D/C ratios
  const dcRatios: Array<{ name: string; value: number }> = [];

  if (compression) {
    const capacity =
      method === 'LRFD' ? compression.phi_Pn : compression.Pn_ASD;
    dcRatios.push({ name: 'Compression', value: input.Pu / capacity });
  }
  if (tension) {
    const capacity = method === 'LRFD' ? tension.phi_Tn : tension.Tn_ASD;
    dcRatios.push({ name: 'Tension', value: Math.abs(input.Pu) / capacity });
  }

  const flexCapacity = method === 'LRFD' ? flexure.phi_Mn : flexure.Mn_ASD;
  dcRatios.push({ name: 'Flexure', value: input.Mux / flexCapacity });

  const shearCapacity = method === 'LRFD' ? shear.phi_Vn : shear.Vn_ASD;
  dcRatios.push({ name: 'Shear', value: input.Vu / shearCapacity });

  if (combined) {
    dcRatios.push({ name: 'Combined', value: combined.interaction });
  }

  const governing = dcRatios.reduce((a, b) => (a.value > b.value ? a : b));
  const maxDC = governing.value;

  // Determine status
  let status: DesignStatus;
  if (maxDC > 1.0) {
    status = 'fail';
    messages.push({
      type: 'error',
      code: 'AISI-CAPACITY',
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
    compression,
    tension,
    flexure,
    shear,
    combined,
    messages,
    method,
  };
}

/**
 * Create design result for database storage
 */
export function createCFSDesignResult(
  elementId: string,
  analysisRunId: string,
  result: CFSDesignResult
): DesignResult {
  return {
    id: generateDesignResultId(),
    run_id: analysisRunId,
    member_id: elementId,
    member_type: 'beam', // CFS members - typically beams/columns
    design_code: 'AISI S100-16',
    demand_capacity_ratio: result.dcRatio,
    controlling_check: result.governingCheck,
    status: result.status,
    checks: {
      compression: result.compression
        ? {
            Pn: result.compression.Pn.toFixed(2),
            phi_Pn: result.compression.phi_Pn.toFixed(2),
            Fn: result.compression.Fn.toFixed(1),
            lambda_c: result.compression.lambda_c.toFixed(3),
            governingMode: result.compression.governingMode,
          }
        : undefined,
      tension: result.tension
        ? {
            Tn: result.tension.Tn.toFixed(2),
            phi_Tn: result.tension.phi_Tn.toFixed(2),
            governingMode: result.tension.governingMode,
          }
        : undefined,
      flexure: {
        Mn: result.flexure.Mn.toFixed(2),
        phi_Mn: result.flexure.phi_Mn.toFixed(2),
        governingMode: result.flexure.governingMode,
      },
      shear: {
        Vn: result.shear.Vn.toFixed(2),
        phi_Vn: result.shear.phi_Vn.toFixed(2),
        governingMode: result.shear.governingMode,
      },
      combined: result.combined
        ? {
            interaction: result.combined.interaction.toFixed(3),
            equation: result.combined.equation,
            passed: result.combined.passed,
          }
        : undefined,
    },
    messages: result.messages,
    created_at: new Date().toISOString(),
  };
}
