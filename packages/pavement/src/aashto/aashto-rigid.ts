/**
 * AASHTO 93 Rigid Pavement Design
 *
 * Implementation of the AASHTO Guide for Design of Pavement Structures (1993)
 * for rigid (concrete) pavements using slab thickness design.
 *
 * Reference: AASHTO Guide for Design of Pavement Structures, 1993
 *
 * @module pavement/aashto-rigid
 */

import { RELIABILITY_ZR } from './aashto-flexible';

// ============================================================================
// Types
// ============================================================================

export interface RigidPavementInput {
  /** Design ESALs (18-kip equivalent single axle loads) */
  W18: number;
  /** Reliability (%) - typically 75-99.9 */
  reliability: number;
  /** Overall standard deviation - typically 0.35-0.40 for rigid */
  standardDeviation: number;
  /** Initial serviceability - typically 4.5 */
  serviceabilityInitial: number;
  /** Terminal serviceability - typically 2.5 */
  serviceabilityTerminal: number;
  /** Concrete elastic modulus (psi) - typically 3-5 million */
  concreteModulus: number;
  /** Concrete modulus of rupture Sc (psi) - typically 600-800 */
  ruptureModulus: number;
  /** Modulus of subgrade reaction k (pci) */
  subgradeK: number;
  /** Load transfer coefficient J (2.5-4.4) */
  loadTransfer: number;
  /** Drainage coefficient Cd (0.9-1.25) */
  drainageCoeff: number;
}

export interface RigidPavementResult {
  /** Required slab thickness (inches) */
  thickness: number;
  /** Required slab thickness (cm) */
  thicknessCm: number;
  /** Recommended concrete grade */
  concreteGrade: string;
  /** Recommended joint spacing (m) */
  jointSpacing: number;
  /** Dowel bar diameter (mm) */
  dowelDiameter: number;
  /** Dowel bar length (mm) */
  dowelLength: number;
  /** Dowel bar spacing (mm) */
  dowelSpacing: number;
  /** Tie bar diameter (mm) */
  tieBarDiameter: number;
  /** Tie bar length (mm) */
  tieBarLength: number;
  /** Tie bar spacing (mm) */
  tieBarSpacing: number;
  /** Whether design is adequate */
  adequate: boolean;
  /** Design reliability used */
  reliability: number;
  /** Serviceability loss (ΔPSI) */
  deltaServiceability: number;
  /** Warnings or notes */
  warnings: string[];
}

export type ConcreteGrade = 'G20' | 'G25' | 'G30' | 'G35' | 'G40';

// ============================================================================
// Constants
// ============================================================================

/**
 * Load transfer coefficients by joint type
 * AASHTO Table 2.6
 */
export const LOAD_TRANSFER_J: Record<string, { doweled: number; undoweled: number }> = {
  plain: {
    doweled: 3.2,
    undoweled: 3.8,
  },
  reinforced: {
    doweled: 2.9,
    undoweled: 3.4,
  },
  crcp: {
    // Continuously reinforced
    doweled: 2.5,
    undoweled: 2.9,
  },
};

/**
 * Drainage coefficient values
 * AASHTO Table 2.5
 */
export const DRAINAGE_COEFF_CD: Record<string, number> = {
  excellent: 1.25,
  good: 1.15,
  fair: 1.0,
  poor: 0.9,
  very_poor: 0.8,
};

/**
 * Concrete properties by grade (Chilean standards NCh 170)
 */
export const CONCRETE_PROPERTIES: Record<
  ConcreteGrade,
  {
    fc: number; // Compressive strength MPa
    Ec: number; // Elastic modulus psi (approximate)
    Sc: number; // Modulus of rupture psi (approximate)
  }
> = {
  G20: { fc: 20, Ec: 3_200_000, Sc: 500 },
  G25: { fc: 25, Ec: 3_600_000, Sc: 570 },
  G30: { fc: 30, Ec: 4_000_000, Sc: 630 },
  G35: { fc: 35, Ec: 4_300_000, Sc: 680 },
  G40: { fc: 40, Ec: 4_600_000, Sc: 730 },
};

/**
 * Minimum slab thickness by traffic level (inches)
 */
export const MINIMUM_SLAB_THICKNESS: Record<string, number> = {
  light: 6, // < 1 million ESALs
  medium: 7, // 1-5 million ESALs
  heavy: 8, // 5-20 million ESALs
  very_heavy: 9, // > 20 million ESALs
};

/**
 * Joint spacing recommendations (times slab thickness)
 * For JPCP (Jointed Plain Concrete Pavement)
 */
export const JOINT_SPACING_FACTOR = {
  min: 18, // Minimum: 18 × thickness (inches) = spacing in inches
  max: 24, // Maximum: 24 × thickness
  typical: 21,
};

/**
 * Dowel bar specifications by slab thickness
 */
export const DOWEL_SPECIFICATIONS: Record<
  string,
  { diameter: number; length: number; spacing: number }
> = {
  '6': { diameter: 20, length: 450, spacing: 300 },
  '7': { diameter: 25, length: 450, spacing: 300 },
  '8': { diameter: 25, length: 450, spacing: 300 },
  '9': { diameter: 32, length: 500, spacing: 300 },
  '10': { diameter: 32, length: 500, spacing: 300 },
  '11': { diameter: 38, length: 500, spacing: 300 },
  '12': { diameter: 38, length: 500, spacing: 300 },
};

/**
 * Tie bar specifications for longitudinal joints
 */
export const TIE_BAR_SPECIFICATIONS = {
  diameter: 12, // mm (#4 bar)
  length: 750, // mm
  spacing: 750, // mm (typical)
};

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Get Zr value for given reliability
 */
function getZr(reliability: number): number {
  if (RELIABILITY_ZR[reliability] !== undefined) {
    return RELIABILITY_ZR[reliability];
  }

  const keys = Object.keys(RELIABILITY_ZR)
    .map(Number)
    .sort((a, b) => a - b);

  for (let i = 0; i < keys.length - 1; i++) {
    if (reliability > keys[i] && reliability < keys[i + 1]) {
      const lower = keys[i];
      const upper = keys[i + 1];
      const ratio = (reliability - lower) / (upper - lower);
      return (
        RELIABILITY_ZR[lower] +
        ratio * (RELIABILITY_ZR[upper] - RELIABILITY_ZR[lower])
      );
    }
  }

  if (reliability < 50) return 0;
  return -3.09;
}

/**
 * Calculate modulus of subgrade reaction k from CBR
 *
 * Approximate correlation:
 * k (pci) = 5.41 × CBR^0.747
 *
 * @param CBR California Bearing Ratio (%)
 * @returns Modulus of subgrade reaction (pci)
 */
export function calculateSubgradeK(CBR: number): number {
  // Approximate correlation from AASHTO
  const k = 5.41 * Math.pow(CBR, 0.747);
  return Math.round(k);
}

/**
 * Calculate effective modulus of subgrade reaction
 * accounting for base layer
 *
 * @param k Subgrade k value (pci)
 * @param baseThickness Base thickness (inches)
 * @param baseModulus Base resilient modulus (psi)
 * @returns Effective k value (pci)
 */
export function calculateEffectiveK(
  k: number,
  baseThickness: number,
  baseModulus: number
): number {
  // Simplified calculation - full method uses nomographs
  // This approximation works for granular bases
  const improvement = 1 + (baseThickness * Math.log10(baseModulus / 15000)) / 10;
  return Math.round(k * Math.max(1, improvement));
}

/**
 * Calculate required slab thickness using AASHTO 93 equation
 *
 * The AASHTO rigid pavement design equation:
 * log10(W18) = Zr × So + 7.35 × log10(D+1) - 0.06
 *            + log10(ΔPSI/(4.5-1.5)) / (1 + 1.624×10^7/(D+1)^8.46)
 *            + (4.22 - 0.32×pt) × log10[(Sc×Cd×(D^0.75-1.132))/(215.63×J×(D^0.75-18.42/(Ec/k)^0.25))]
 *
 * @param input Design inputs
 * @returns Required slab thickness in inches
 */
export function calculateSlabThickness(input: RigidPavementInput): number {
  const {
    W18,
    reliability,
    standardDeviation,
    serviceabilityInitial,
    serviceabilityTerminal,
    concreteModulus,
    ruptureModulus,
    subgradeK,
    loadTransfer,
    drainageCoeff,
  } = input;

  const Zr = getZr(reliability);
  const So = standardDeviation;
  const deltaPSI = serviceabilityInitial - serviceabilityTerminal;
  const pt = serviceabilityTerminal;
  const logW18 = Math.log10(W18);
  const Ec = concreteModulus;
  const Sc = ruptureModulus;
  const k = subgradeK;
  const J = loadTransfer;
  const Cd = drainageCoeff;

  // Solve iteratively for D (slab thickness)
  let D = 8.0; // Starting estimate (inches)
  const maxIterations = 100;
  const tolerance = 0.01;

  for (let i = 0; i < maxIterations; i++) {
    // Calculate each term of the equation
    const term1 = Zr * So;
    const term2 = 7.35 * Math.log10(D + 1) - 0.06;

    const term3Num = Math.log10(deltaPSI / (4.5 - 1.5));
    const term3Den = 1 + (1.624e7 / Math.pow(D + 1, 8.46));
    const term3 = term3Num / term3Den;

    // Term 4 is complex
    const D075 = Math.pow(D, 0.75);
    const EkRatio = Math.pow(Ec / k, 0.25);
    const term4Coeff = 4.22 - 0.32 * pt;
    const term4Num = Sc * Cd * (D075 - 1.132);
    const term4Den = 215.63 * J * (D075 - 18.42 / EkRatio);

    // Avoid log of negative numbers
    if (term4Num <= 0 || term4Den <= 0) {
      D += 0.5;
      continue;
    }

    const term4 = term4Coeff * Math.log10(term4Num / term4Den);

    const calculatedLogW18 = term1 + term2 + term3 + term4;
    const error = logW18 - calculatedLogW18;

    if (Math.abs(error) < tolerance) {
      break;
    }

    // Adjust D based on error
    D += error * 0.3;
    D = Math.max(5, Math.min(D, 18)); // Bound D between 5 and 18 inches
  }

  return Math.round(D * 10) / 10;
}

/**
 * Determine recommended concrete grade based on traffic
 *
 * @param W18 Design ESALs
 * @returns Recommended concrete grade
 */
export function getRecommendedConcreteGrade(W18: number): ConcreteGrade {
  if (W18 < 1_000_000) return 'G25';
  if (W18 < 5_000_000) return 'G30';
  if (W18 < 20_000_000) return 'G35';
  return 'G40';
}

/**
 * Calculate joint spacing
 *
 * @param thicknessInches Slab thickness in inches
 * @returns Joint spacing in meters
 */
export function calculateJointSpacing(thicknessInches: number): number {
  // Spacing = 21 × thickness (in inches), converted to feet then meters
  const spacingInches = JOINT_SPACING_FACTOR.typical * thicknessInches;
  const spacingFeet = spacingInches / 12;
  const spacingMeters = spacingFeet * 0.3048;

  // Round to nearest 0.5m
  return Math.round(spacingMeters * 2) / 2;
}

/**
 * Get dowel bar specifications for slab thickness
 *
 * @param thicknessInches Slab thickness in inches
 * @returns Dowel specifications
 */
export function getDowelSpecifications(
  thicknessInches: number
): { diameter: number; length: number; spacing: number } {
  const rounded = Math.round(thicknessInches);
  const key = Math.max(6, Math.min(12, rounded)).toString();
  return DOWEL_SPECIFICATIONS[key] || DOWEL_SPECIFICATIONS['8'];
}

/**
 * Design complete rigid pavement structure
 *
 * @param input Design inputs
 * @returns Complete pavement design result
 */
export function designRigidPavement(
  input: RigidPavementInput
): RigidPavementResult {
  const warnings: string[] = [];

  // Validate inputs
  if (input.W18 <= 0) {
    warnings.push('Invalid ESAL value - must be positive');
  }
  if (input.reliability < 50 || input.reliability > 99.9) {
    warnings.push('Reliability should be between 50% and 99.9%');
  }
  if (input.standardDeviation < 0.25 || input.standardDeviation > 0.45) {
    warnings.push('Standard deviation for rigid typically ranges from 0.25 to 0.45');
  }
  if (input.subgradeK < 50 || input.subgradeK > 800) {
    warnings.push('Subgrade k appears outside typical range (50-800 pci)');
  }
  if (input.loadTransfer < 2.5 || input.loadTransfer > 4.4) {
    warnings.push('Load transfer coefficient J should be between 2.5 and 4.4');
  }
  if (input.drainageCoeff < 0.8 || input.drainageCoeff > 1.25) {
    warnings.push('Drainage coefficient Cd should be between 0.8 and 1.25');
  }

  // Calculate required slab thickness
  const thickness = calculateSlabThickness(input);
  const thicknessCm = Math.round(thickness * 2.54 * 10) / 10;

  // Check minimum thickness
  let trafficCategory: string;
  if (input.W18 < 1_000_000) trafficCategory = 'light';
  else if (input.W18 < 5_000_000) trafficCategory = 'medium';
  else if (input.W18 < 20_000_000) trafficCategory = 'heavy';
  else trafficCategory = 'very_heavy';

  const minThickness = MINIMUM_SLAB_THICKNESS[trafficCategory];
  if (thickness < minThickness) {
    warnings.push(
      `Calculated thickness (${thickness.toFixed(1)}") is less than minimum (${minThickness}") for ${trafficCategory} traffic`
    );
  }

  // Get concrete grade
  const concreteGrade = getRecommendedConcreteGrade(input.W18);

  // Calculate joint spacing
  const jointSpacing = calculateJointSpacing(thickness);

  // Get dowel specifications
  const dowelSpecs = getDowelSpecifications(thickness);

  // Check if design is adequate
  const adequate = thickness >= minThickness && warnings.filter(w =>
    w.includes('less than minimum')
  ).length === 0;

  // Practical thickness limits
  if (thicknessCm > 35) {
    warnings.push(
      'Slab thickness exceeds 35 cm - consider improving subgrade or using thicker base'
    );
  }

  return {
    thickness,
    thicknessCm,
    concreteGrade,
    jointSpacing,
    dowelDiameter: dowelSpecs.diameter,
    dowelLength: dowelSpecs.length,
    dowelSpacing: dowelSpecs.spacing,
    tieBarDiameter: TIE_BAR_SPECIFICATIONS.diameter,
    tieBarLength: TIE_BAR_SPECIFICATIONS.length,
    tieBarSpacing: TIE_BAR_SPECIFICATIONS.spacing,
    adequate,
    reliability: input.reliability,
    deltaServiceability: input.serviceabilityInitial - input.serviceabilityTerminal,
    warnings,
  };
}

/**
 * Get default rigid pavement input values
 *
 * @param W18 Design ESALs
 * @param reliability Design reliability
 * @returns Default input parameters
 */
export function getDefaultRigidInput(
  W18: number,
  reliability: number = 90
): RigidPavementInput {
  const concreteGrade = getRecommendedConcreteGrade(W18);
  const props = CONCRETE_PROPERTIES[concreteGrade];

  return {
    W18,
    reliability,
    standardDeviation: 0.35,
    serviceabilityInitial: 4.5,
    serviceabilityTerminal: 2.5,
    concreteModulus: props.Ec,
    ruptureModulus: props.Sc,
    subgradeK: 150, // Typical value for fair subgrade
    loadTransfer: LOAD_TRANSFER_J.plain.doweled,
    drainageCoeff: DRAINAGE_COEFF_CD.fair,
  };
}

/**
 * Format rigid pavement design result for display
 *
 * @param result Pavement design result
 * @returns Formatted string
 */
export function formatRigidPavementResult(result: RigidPavementResult): string {
  const lines: string[] = [
    '=== AASHTO 93 Rigid Pavement Design ===',
    '',
    `Slab Thickness: ${result.thicknessCm.toFixed(1)} cm (${result.thickness.toFixed(1)}")`,
    `Concrete Grade: ${result.concreteGrade}`,
    `Status: ${result.adequate ? 'ADEQUATE' : 'INADEQUATE'}`,
    '',
    'Joint Details:',
    `  Transverse Joint Spacing: ${result.jointSpacing.toFixed(1)} m`,
    '',
    'Dowel Bars (Transverse Joints):',
    `  Diameter: ${result.dowelDiameter} mm`,
    `  Length: ${result.dowelLength} mm`,
    `  Spacing: ${result.dowelSpacing} mm`,
    '',
    'Tie Bars (Longitudinal Joints):',
    `  Diameter: ${result.tieBarDiameter} mm`,
    `  Length: ${result.tieBarLength} mm`,
    `  Spacing: ${result.tieBarSpacing} mm`,
  ];

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join('\n');
}
