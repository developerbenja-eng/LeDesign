/**
 * CBR-Based Pavement Design
 *
 * Simplified pavement design method based on California Bearing Ratio (CBR)
 * commonly used for preliminary design and lower-volume roads.
 *
 * References:
 * - U.S. Army Corps of Engineers CBR Method
 * - MOP Manual de Carreteras Vol. 3 (Chile)
 * - NAASRA (Australian method)
 *
 * @module pavement/cbr-design
 */

// ============================================================================
// Types
// ============================================================================

export type PavementType = 'asphalt' | 'concrete' | 'blocks';

export interface CBRDesignInput {
  /** Subgrade CBR (%) */
  subgradeCBR: number;
  /** Design ESALs or traffic category */
  designESAL: number;
  /** Pavement surface type */
  pavementType: PavementType;
  /** Whether to include subbase */
  includeSubbase?: boolean;
  /** Subbase CBR if different from calculated */
  subbaseCBR?: number;
  /** Base CBR if different from standard */
  baseCBR?: number;
}

export interface CBRLayerResult {
  /** Layer name */
  name: string;
  /** Layer thickness (cm) */
  thickness: number;
  /** Minimum CBR requirement */
  minCBR: number;
  /** Material description */
  material: string;
}

export interface CBRDesignResult {
  /** Total required structure thickness (cm) */
  totalThickness: number;
  /** Individual layer thicknesses */
  layers: CBRLayerResult[];
  /** Subgrade class */
  subgradeClass: string;
  /** Traffic category */
  trafficCategory: string;
  /** Whether subgrade improvement is needed */
  subgradeImprovement: boolean;
  /** Improvement depth if needed (cm) */
  improvementDepth?: number;
  /** Equivalent subgrade modulus Mr (psi) */
  subgradeMr: number;
  /** Warnings or notes */
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Subgrade classification by CBR
 * Based on Chilean standards
 */
export const SUBGRADE_CLASSIFICATION: Record<
  string,
  { minCBR: number; maxCBR: number; description: string }
> = {
  S0: { minCBR: 0, maxCBR: 3, description: 'Very Poor - Requires improvement' },
  S1: { minCBR: 3, maxCBR: 6, description: 'Poor' },
  S2: { minCBR: 6, maxCBR: 10, description: 'Fair' },
  S3: { minCBR: 10, maxCBR: 20, description: 'Good' },
  S4: { minCBR: 20, maxCBR: 100, description: 'Excellent' },
};

/**
 * Traffic categories by ESAL
 */
export const TRAFFIC_CATEGORIES: Record<
  string,
  { minESAL: number; maxESAL: number; description: string }
> = {
  T1: { minESAL: 0, maxESAL: 50_000, description: 'Very Light' },
  T2: { minESAL: 50_000, maxESAL: 150_000, description: 'Light' },
  T3: { minESAL: 150_000, maxESAL: 500_000, description: 'Light-Medium' },
  T4: { minESAL: 500_000, maxESAL: 2_000_000, description: 'Medium' },
  T5: { minESAL: 2_000_000, maxESAL: 7_000_000, description: 'Medium-Heavy' },
  T6: { minESAL: 7_000_000, maxESAL: 30_000_000, description: 'Heavy' },
  T7: { minESAL: 30_000_000, maxESAL: Infinity, description: 'Very Heavy' },
};

/**
 * Minimum layer CBR requirements
 * Based on MOP and international standards
 */
export const LAYER_CBR_REQUIREMENTS = {
  surface_asphalt: 0, // N/A for asphalt
  surface_concrete: 0, // N/A for concrete
  surface_blocks: 0, // N/A for blocks
  base_granular: 80,
  base_stabilized: 100,
  subbase_granular: 30,
  subbase_stabilized: 50,
  improved_subgrade: 15,
};

/**
 * CBR Design Charts - Total pavement thickness (cm)
 * From U.S. Army Corps of Engineers method
 * Rows: CBR, Columns: Traffic Category
 */
const CBR_THICKNESS_CHART: Record<number, Record<string, number>> = {
  2: { T1: 65, T2: 75, T3: 85, T4: 95, T5: 105, T6: 115, T7: 130 },
  3: { T1: 50, T2: 60, T3: 70, T4: 80, T5: 90, T6: 100, T7: 115 },
  4: { T1: 42, T2: 50, T3: 60, T4: 70, T5: 80, T6: 90, T7: 100 },
  5: { T1: 35, T2: 42, T3: 52, T4: 62, T5: 72, T6: 82, T7: 92 },
  6: { T1: 30, T2: 38, T3: 46, T4: 55, T5: 65, T6: 75, T7: 85 },
  7: { T1: 27, T2: 34, T3: 42, T4: 50, T5: 60, T6: 70, T7: 80 },
  8: { T1: 24, T2: 30, T3: 38, T4: 46, T5: 55, T6: 65, T7: 75 },
  10: { T1: 20, T2: 26, T3: 32, T4: 40, T5: 48, T6: 56, T7: 65 },
  15: { T1: 15, T2: 20, T3: 25, T4: 32, T5: 38, T6: 45, T7: 52 },
  20: { T1: 12, T2: 16, T3: 21, T4: 27, T5: 32, T6: 38, T7: 45 },
  30: { T1: 10, T2: 13, T3: 17, T4: 22, T5: 27, T6: 32, T7: 37 },
  40: { T1: 8, T2: 11, T3: 14, T4: 19, T5: 23, T6: 28, T7: 32 },
  50: { T1: 7, T2: 9, T3: 12, T4: 16, T5: 20, T6: 24, T7: 28 },
  80: { T1: 5, T2: 7, T3: 9, T4: 12, T5: 15, T6: 18, T7: 22 },
};

/**
 * Minimum surface thickness by pavement type (cm)
 */
export const MINIMUM_SURFACE_THICKNESS: Record<PavementType, Record<string, number>> = {
  asphalt: {
    T1: 4,
    T2: 5,
    T3: 6,
    T4: 7.5,
    T5: 10,
    T6: 12,
    T7: 15,
  },
  concrete: {
    T1: 12,
    T2: 15,
    T3: 17,
    T4: 18,
    T5: 20,
    T6: 22,
    T7: 25,
  },
  blocks: {
    T1: 6,
    T2: 6,
    T3: 8,
    T4: 8,
    T5: 10,
    T6: 10,
    T7: 10,
  },
};

/**
 * Minimum base thickness (cm)
 */
export const MINIMUM_BASE_THICKNESS: Record<string, number> = {
  T1: 10,
  T2: 12,
  T3: 15,
  T4: 15,
  T5: 18,
  T6: 20,
  T7: 25,
};

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Get subgrade class from CBR value
 *
 * @param CBR Subgrade CBR (%)
 * @returns Subgrade class (S0-S4)
 */
export function getSubgradeClass(CBR: number): string {
  if (CBR < 3) return 'S0';
  if (CBR < 6) return 'S1';
  if (CBR < 10) return 'S2';
  if (CBR < 20) return 'S3';
  return 'S4';
}

/**
 * Get traffic category from ESAL value
 *
 * @param ESAL Design ESALs
 * @returns Traffic category (T1-T7)
 */
export function getTrafficCategory(ESAL: number): string {
  if (ESAL < 50_000) return 'T1';
  if (ESAL < 150_000) return 'T2';
  if (ESAL < 500_000) return 'T3';
  if (ESAL < 2_000_000) return 'T4';
  if (ESAL < 7_000_000) return 'T5';
  if (ESAL < 30_000_000) return 'T6';
  return 'T7';
}

/**
 * Calculate resilient modulus from CBR
 *
 * Mr = 1500 × CBR (for CBR ≤ 10)
 * Mr = 3000 × CBR^0.65 (for CBR > 10)
 *
 * @param CBR California Bearing Ratio (%)
 * @returns Resilient modulus (psi)
 */
export function getSubgradeMrFromCBR(CBR: number): number {
  if (CBR <= 10) {
    return Math.round(1500 * CBR);
  }
  return Math.round(3000 * Math.pow(CBR, 0.65));
}

/**
 * Interpolate total thickness from CBR chart
 *
 * @param CBR Subgrade CBR
 * @param trafficCategory Traffic category
 * @returns Total pavement thickness (cm)
 */
function interpolateThickness(CBR: number, trafficCategory: string): number {
  const cbrValues = Object.keys(CBR_THICKNESS_CHART)
    .map(Number)
    .sort((a, b) => a - b);

  // Find bounding CBR values
  let lowerCBR = cbrValues[0];
  let upperCBR = cbrValues[cbrValues.length - 1];

  for (let i = 0; i < cbrValues.length - 1; i++) {
    if (CBR >= cbrValues[i] && CBR <= cbrValues[i + 1]) {
      lowerCBR = cbrValues[i];
      upperCBR = cbrValues[i + 1];
      break;
    }
  }

  // Handle edge cases
  if (CBR <= cbrValues[0]) {
    return CBR_THICKNESS_CHART[cbrValues[0]][trafficCategory];
  }
  if (CBR >= cbrValues[cbrValues.length - 1]) {
    return CBR_THICKNESS_CHART[cbrValues[cbrValues.length - 1]][trafficCategory];
  }

  // Linear interpolation
  const lowerThickness = CBR_THICKNESS_CHART[lowerCBR][trafficCategory];
  const upperThickness = CBR_THICKNESS_CHART[upperCBR][trafficCategory];
  const ratio = (CBR - lowerCBR) / (upperCBR - lowerCBR);

  return Math.round(lowerThickness + ratio * (upperThickness - lowerThickness));
}

/**
 * Calculate required pavement depth above a layer with given CBR
 *
 * Uses simplified relationship:
 * Depth = K × log10(ESAL/1000) / CBR^0.5
 *
 * @param CBR Layer CBR (%)
 * @param ESAL Design ESALs
 * @returns Required depth of superior layers (cm)
 */
export function calculateRequiredDepth(CBR: number, ESAL: number): number {
  // Empirical constant (calibrated to match full design)
  const K = 8.5;
  const logTerm = Math.log10(Math.max(1000, ESAL) / 1000);
  const depth = (K * logTerm) / Math.pow(CBR, 0.5);
  return Math.round(depth);
}

/**
 * Design pavement structure from CBR
 *
 * @param input Design inputs
 * @returns Complete pavement design result
 */
export function designFromCBR(input: CBRDesignInput): CBRDesignResult {
  const warnings: string[] = [];

  // Validate inputs
  if (input.subgradeCBR <= 0 || input.subgradeCBR > 100) {
    warnings.push('Subgrade CBR should be between 1% and 100%');
  }
  if (input.designESAL <= 0) {
    warnings.push('Design ESAL must be positive');
  }

  // Get classifications
  const subgradeClass = getSubgradeClass(input.subgradeCBR);
  const trafficCategory = getTrafficCategory(input.designESAL);

  // Check if subgrade improvement is needed
  let effectiveCBR = input.subgradeCBR;
  let subgradeImprovement = false;
  let improvementDepth: number | undefined;

  if (input.subgradeCBR < 3) {
    subgradeImprovement = true;
    improvementDepth = 30; // Typical improvement depth
    effectiveCBR = 6; // Assume improvement achieves CBR 6
    warnings.push(
      `Subgrade CBR (${input.subgradeCBR}%) is very low - improvement required`
    );
  }

  // Calculate total thickness needed above subgrade
  const totalThickness = interpolateThickness(effectiveCBR, trafficCategory);

  // Determine layer thicknesses
  const layers: CBRLayerResult[] = [];

  // Surface layer
  const surfaceThickness = MINIMUM_SURFACE_THICKNESS[input.pavementType][trafficCategory];
  let surfaceMaterial: string;

  switch (input.pavementType) {
    case 'asphalt':
      surfaceMaterial = 'Concreto Asfáltico';
      break;
    case 'concrete':
      surfaceMaterial = 'Hormigón';
      break;
    case 'blocks':
      surfaceMaterial = 'Adoquines + Arena';
      break;
  }

  layers.push({
    name: 'Carpeta',
    thickness: surfaceThickness,
    minCBR: 0,
    material: surfaceMaterial,
  });

  // Remaining thickness for base and subbase
  let remainingThickness = totalThickness - surfaceThickness;

  // For concrete, less granular base is needed
  if (input.pavementType === 'concrete') {
    remainingThickness = Math.max(10, remainingThickness * 0.5);
  }

  // Base layer
  const minBaseThickness = MINIMUM_BASE_THICKNESS[trafficCategory];
  const baseThickness = Math.max(minBaseThickness, Math.round(remainingThickness * 0.5));

  layers.push({
    name: 'Base',
    thickness: baseThickness,
    minCBR: input.baseCBR || LAYER_CBR_REQUIREMENTS.base_granular,
    material: 'Base Granular',
  });

  remainingThickness -= baseThickness;

  // Subbase layer (if needed)
  if (remainingThickness > 0 || input.includeSubbase) {
    const subbaseThickness = Math.max(15, remainingThickness);

    layers.push({
      name: 'Subbase',
      thickness: subbaseThickness,
      minCBR: input.subbaseCBR || LAYER_CBR_REQUIREMENTS.subbase_granular,
      material: 'Subbase Granular',
    });
  }

  // Improved subgrade if needed
  if (subgradeImprovement && improvementDepth) {
    layers.push({
      name: 'Mejoramiento',
      thickness: improvementDepth,
      minCBR: LAYER_CBR_REQUIREMENTS.improved_subgrade,
      material: 'Suelo Mejorado / Estabilizado',
    });
  }

  // Calculate actual total
  const actualTotal = layers.reduce((sum, layer) => sum + layer.thickness, 0);

  // Additional warnings
  if (actualTotal > 80) {
    warnings.push(
      'Total pavement structure exceeds 80 cm - consider subgrade stabilization'
    );
  }

  const subgradeInfo = SUBGRADE_CLASSIFICATION[subgradeClass];
  const trafficInfo = TRAFFIC_CATEGORIES[trafficCategory];

  return {
    totalThickness: actualTotal,
    layers,
    subgradeClass: `${subgradeClass} - ${subgradeInfo.description}`,
    trafficCategory: `${trafficCategory} - ${trafficInfo.description}`,
    subgradeImprovement,
    improvementDepth,
    subgradeMr: getSubgradeMrFromCBR(effectiveCBR),
    warnings,
  };
}

/**
 * Quick design for urban street by road classification
 *
 * @param classification Road classification
 * @param subgradeCBR Subgrade CBR (%)
 * @param pavementType Pavement type
 * @returns CBR design result
 */
export function designUrbanStreet(
  classification: string,
  subgradeCBR: number,
  pavementType: PavementType = 'asphalt'
): CBRDesignResult {
  // Typical ESALs by classification
  const typicalESALs: Record<string, number> = {
    express: 20_000_000,
    trunk: 8_000_000,
    collector: 2_000_000,
    service: 500_000,
    local: 150_000,
    passage: 50_000,
  };

  const designESAL = typicalESALs[classification] || 500_000;

  return designFromCBR({
    subgradeCBR,
    designESAL,
    pavementType,
    includeSubbase: true,
  });
}

/**
 * Format CBR design result for display
 *
 * @param result CBR design result
 * @returns Formatted string
 */
export function formatCBRDesignResult(result: CBRDesignResult): string {
  const lines: string[] = [
    '=== CBR-Based Pavement Design ===',
    '',
    `Subgrade Class: ${result.subgradeClass}`,
    `Traffic Category: ${result.trafficCategory}`,
    `Subgrade Mr: ${result.subgradeMr.toLocaleString()} psi`,
    '',
    'Pavement Structure:',
  ];

  for (const layer of result.layers) {
    let layerInfo = `  ${layer.name}: ${layer.thickness} cm (${layer.material})`;
    if (layer.minCBR > 0) {
      layerInfo += ` - CBR mín: ${layer.minCBR}%`;
    }
    lines.push(layerInfo);
  }

  lines.push('');
  lines.push(`Total Thickness: ${result.totalThickness} cm`);

  if (result.subgradeImprovement) {
    lines.push('');
    lines.push('** Subgrade improvement required **');
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join('\n');
}
