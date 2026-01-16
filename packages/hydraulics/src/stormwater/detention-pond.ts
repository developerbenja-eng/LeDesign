/**
 * Detention and Retention Pond Sizing Module
 *
 * Design methodology based on Chilean MINVU and MOP standards
 *
 * DETENTION POND (Estanque de Detención):
 * - Temporary storage, drains completely
 * - Reduces peak discharge
 * - Typical drain time: 24-72 hours
 *
 * RETENTION POND (Estanque de Retención/Laguna):
 * - Permanent pool + temporary storage
 * - Provides treatment through settling
 * - Requires water balance analysis
 *
 * Key Design Criteria:
 * - Post-development peak ≤ Pre-development peak
 * - Minimum freeboard: 0.3m (small), 0.6m (large)
 * - Side slopes: 3:1 to 4:1 (safety)
 * - Emergency spillway for storms > design event
 */

import { SOIL_TYPES, type SoilGroup } from './regional-data';
import {
  calculateRationalMethod,
  calculateModifiedRational,
  type RationalMethodInput,
  type CatchmentArea,
  type RationalMethodResult,
} from './rational-method';

// ============================================
// TYPES
// ============================================

export type PondType = 'detention' | 'retention' | 'infiltration_basin';

export interface PondDesignInput {
  // Site and catchment
  catchmentAreaHa: number;
  preDevelopmentC: number; // runoff coefficient before
  postDevelopmentC: number; // runoff coefficient after

  // Storm parameters
  returnPeriod: number; // years
  rainfallIntensity: number; // mm/hr (for design duration)
  stormDuration: number; // minutes
  stormDepthMm?: number; // total depth if known

  // Target outflow
  targetPeakReduction?: number; // % reduction (default: match pre-dev)
  maxOutflowLps?: number; // L/s (if specified directly)

  // Site constraints
  maxPondArea?: number; // m²
  maxPondDepth?: number; // m
  minPondDepth?: number; // m
  availableHead?: number; // m (for outlet design)

  // Soil (for infiltration basin)
  soilType?: SoilGroup | string;
  infiltrationRate?: number; // mm/hr

  // Pond type
  pondType: PondType;

  // For retention pond
  permanentPoolVolume?: number; // m³ (if retention)
  permanentPoolDepth?: number; // m (if retention)
}

export interface PondGeometry {
  // Surface dimensions (at normal water level or top of storage)
  surfaceArea: number; // m²
  length: number; // m
  width: number; // m

  // Depths
  totalDepth: number; // m
  storageDepth: number; // m (active storage)
  permanentPoolDepth: number; // m (retention only)
  freeboard: number; // m

  // Volumes
  totalVolume: number; // m³
  storageVolume: number; // m³ (active)
  permanentPoolVolume: number; // m³

  // Slopes and shape
  sideSlope: number; // H:V ratio (e.g., 3 = 3:1)
  bottomArea: number; // m²
  lengthToWidthRatio: number;
}

export interface OutletStructure {
  type: 'orifice' | 'weir' | 'riser' | 'combined';

  // Orifice (for primary outlet)
  orificeDiameter?: number; // mm
  orificeElevation?: number; // m above pond bottom
  orificeCapacity?: number; // L/s

  // Weir (for secondary/emergency)
  weirLength?: number; // m
  weirElevation?: number; // m
  weirCapacity?: number; // L/s

  // Riser pipe (common in Chile)
  riserDiameter?: number; // mm
  riserHeight?: number; // m
}

export interface EmergencySpillway {
  type: 'broad_crested' | 'trapezoidal' | 'riprap';
  length: number; // m
  elevation: number; // m above normal storage
  designCapacity: number; // m³/s
  maxHead: number; // m
}

export interface PondDesignResult {
  // Summary
  isViable: boolean;
  pondType: PondType;

  // Geometry
  geometry: PondGeometry;

  // Hydrology
  inflow: {
    peakPreDevelopment: number; // L/s
    peakPostDevelopment: number; // L/s
    runoffVolume: number; // m³
  };

  // Outflow
  outflow: {
    peakDischarge: number; // L/s
    reductionPercent: number; // %
    drainTime: number; // hours
  };

  // Structures
  outlet: OutletStructure;
  spillway: EmergencySpillway;

  // Stage-storage
  stageStorage: Array<{
    stage: number; // m
    volume: number; // m³
    area: number; // m²
    outflow: number; // L/s
  }>;

  // Costs
  estimatedCost: {
    excavation: number;
    embankment: number;
    outlet: number;
    spillway: number;
    landscaping: number;
    total: number;
    perM3Storage: number;
  };

  // Warnings
  warnings: string[];
  recommendations: string[];
}

// ============================================
// CONSTANTS
// ============================================

// Side slopes by pond type
const SIDE_SLOPES = {
  detention: 3, // 3:1 H:V
  retention: 4, // 4:1 H:V (safer with permanent pool)
  infiltration_basin: 3,
};

// Freeboard requirements
const FREEBOARD = {
  small: 0.3, // < 1000 m² surface
  medium: 0.45, // 1000-5000 m²
  large: 0.6, // > 5000 m²
};

// Orifice coefficients
const ORIFICE_CD = 0.62; // discharge coefficient
const WEIR_CD = 1.84; // for broad-crested weir (metric)

// Unit costs (CLP)
const POND_COSTS = {
  excavation: 12000, // per m³
  embankment: 15000, // per m³
  outletStructure: 2500000, // base cost
  outletPerMm: 5000, // per mm diameter
  spillway: 150000, // per m length
  landscaping: 8000, // per m² surface
  riprap: 45000, // per m²
};

// ============================================
// MAIN DESIGN FUNCTION
// ============================================

/**
 * Design detention or retention pond
 */
export function designPond(input: PondDesignInput): PondDesignResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // 1. Calculate inflow characteristics
  const inflow = calculateInflowCharacteristics(input);

  // 2. Determine target outflow
  const targetOutflow = calculateTargetOutflow(input, inflow);

  // 3. Calculate required storage volume
  const requiredStorage = calculateRequiredStorage(
    inflow.runoffVolume,
    inflow.peakPostDevelopment,
    targetOutflow,
    input.stormDuration
  );

  // 4. Design pond geometry
  const geometry = designPondGeometry(
    requiredStorage,
    input.pondType,
    input.maxPondArea,
    input.maxPondDepth,
    input.minPondDepth,
    input.permanentPoolDepth
  );

  // 5. Design outlet structure
  const outlet = designOutletStructure(
    targetOutflow,
    geometry.storageDepth,
    input.pondType
  );

  // 6. Design emergency spillway
  const spillway = designEmergencySpillway(
    inflow.peakPostDevelopment * 1.5, // 150% of design peak
    geometry.freeboard
  );

  // 7. Generate stage-storage curve
  const stageStorage = generateStageStorage(geometry, outlet);

  // 8. Calculate actual drain time
  const drainTime = calculateDrainTime(geometry.storageVolume, targetOutflow);

  // 9. Calculate costs
  const estimatedCost = calculatePondCosts(geometry, outlet, spillway);

  // 10. Validation and warnings
  const isViable = validatePondDesign(
    geometry,
    inflow,
    outlet,
    drainTime,
    warnings,
    recommendations
  );

  return {
    isViable,
    pondType: input.pondType,
    geometry,
    inflow: {
      peakPreDevelopment: inflow.peakPreDevelopment,
      peakPostDevelopment: inflow.peakPostDevelopment,
      runoffVolume: inflow.runoffVolume,
    },
    outflow: {
      peakDischarge: targetOutflow,
      reductionPercent: ((inflow.peakPostDevelopment - targetOutflow) / inflow.peakPostDevelopment) * 100,
      drainTime,
    },
    outlet,
    spillway,
    stageStorage,
    estimatedCost,
    warnings,
    recommendations,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate inflow characteristics
 */
function calculateInflowCharacteristics(input: PondDesignInput): {
  peakPreDevelopment: number;
  peakPostDevelopment: number;
  runoffVolume: number;
} {
  // Convert hectares to m²
  const areaM2 = input.catchmentAreaHa * 10000;

  // Peak flows using rational method (L/s = C × i × A × 2.78)
  // Note: for areas in hectares
  const peakPreDevelopment = input.preDevelopmentC * input.rainfallIntensity * input.catchmentAreaHa * 2.78;
  const peakPostDevelopment = input.postDevelopmentC * input.rainfallIntensity * input.catchmentAreaHa * 2.78;

  // Runoff volume
  let runoffVolume: number;
  if (input.stormDepthMm) {
    // Direct calculation from storm depth
    runoffVolume = (input.postDevelopmentC * input.stormDepthMm * areaM2) / 1000;
  } else {
    // Calculate from intensity and duration
    runoffVolume = (input.postDevelopmentC * input.rainfallIntensity * areaM2 * input.stormDuration) / (60 * 1000);
  }

  return { peakPreDevelopment, peakPostDevelopment, runoffVolume };
}

/**
 * Calculate target outflow
 */
function calculateTargetOutflow(
  input: PondDesignInput,
  inflow: { peakPreDevelopment: number; peakPostDevelopment: number }
): number {
  if (input.maxOutflowLps) {
    return input.maxOutflowLps;
  }

  if (input.targetPeakReduction) {
    return inflow.peakPostDevelopment * (1 - input.targetPeakReduction / 100);
  }

  // Default: match pre-development peak
  return inflow.peakPreDevelopment;
}

/**
 * Calculate required storage volume using simplified routing
 */
function calculateRequiredStorage(
  runoffVolume: number,
  peakInflow: number,
  targetOutflow: number,
  duration: number
): number {
  // Simplified storage estimation
  // V_storage = (Q_in - Q_out) × t_peak × 0.5
  // More conservative: use triangular hydrograph assumption

  const reductionRatio = targetOutflow / peakInflow;

  // Storage coefficient based on reduction ratio
  // Higher reduction = more storage needed
  let storageCoefficient: number;
  if (reductionRatio >= 0.8) {
    storageCoefficient = 0.2;
  } else if (reductionRatio >= 0.5) {
    storageCoefficient = 0.35;
  } else if (reductionRatio >= 0.3) {
    storageCoefficient = 0.5;
  } else {
    storageCoefficient = 0.65;
  }

  // Required storage
  const storage = runoffVolume * storageCoefficient;

  // Minimum storage check
  const minStorage = (peakInflow - targetOutflow) * duration * 60 / 2000; // m³

  return Math.max(storage, minStorage);
}

/**
 * Design pond geometry
 */
function designPondGeometry(
  requiredStorage: number,
  pondType: PondType,
  maxArea?: number,
  maxDepth?: number,
  minDepth?: number,
  permanentPoolDepth?: number
): PondGeometry {
  // Default constraints
  const maxD = maxDepth ?? 3.0;
  const minD = minDepth ?? 0.6;
  const sideSlope = SIDE_SLOPES[pondType];

  // Permanent pool for retention
  const poolDepth = pondType === 'retention' ? (permanentPoolDepth ?? 1.0) : 0;

  // Target storage depth
  let storageDepth = Math.min(maxD - poolDepth, 1.5);
  storageDepth = Math.max(storageDepth, minD);

  // Freeboard
  const totalDepth = poolDepth + storageDepth;
  const freeboard = totalDepth > 2 ? FREEBOARD.large :
                    requiredStorage > 500 ? FREEBOARD.medium : FREEBOARD.small;

  // Calculate surface area needed
  // Using prismoidal formula: V = (A1 + A2 + √(A1×A2)) × h / 3
  // Simplified: assume trapezoidal with 2:1 L:W ratio

  // Iterative sizing
  let surfaceArea = requiredStorage / storageDepth; // initial guess
  let iterations = 0;

  while (iterations < 20) {
    // Calculate bottom area
    const reduction = 2 * sideSlope * storageDepth;
    const length = Math.sqrt(surfaceArea * 2);
    const width = length / 2;

    const bottomLength = Math.max(3, length - reduction);
    const bottomWidth = Math.max(2, width - reduction);
    const bottomArea = bottomLength * bottomWidth;

    // Calculate volume
    const volume = (surfaceArea + bottomArea + Math.sqrt(surfaceArea * bottomArea)) * storageDepth / 3;

    if (Math.abs(volume - requiredStorage) < requiredStorage * 0.02) {
      break;
    }

    // Adjust surface area
    surfaceArea *= requiredStorage / volume;
    iterations++;
  }

  // Check against max area
  if (maxArea && surfaceArea > maxArea) {
    surfaceArea = maxArea;
    // Recalculate depth
    storageDepth = requiredStorage / (surfaceArea * 0.7); // approximate
    storageDepth = Math.min(storageDepth, maxD - poolDepth);
  }

  // Final dimensions
  const length = Math.sqrt(surfaceArea * 2);
  const width = length / 2;
  const reduction = 2 * sideSlope * (storageDepth + poolDepth);
  const bottomLength = Math.max(3, length - reduction);
  const bottomWidth = Math.max(2, width - reduction);
  const bottomArea = bottomLength * bottomWidth;

  // Permanent pool volume (retention only)
  const permanentPoolVolume = pondType === 'retention'
    ? (bottomArea + surfaceArea * 0.7 + Math.sqrt(bottomArea * surfaceArea * 0.7)) * poolDepth / 3
    : 0;

  // Storage volume
  const storageVol = (surfaceArea + bottomArea + Math.sqrt(surfaceArea * bottomArea)) * storageDepth / 3;

  return {
    surfaceArea: Math.round(surfaceArea),
    length: Math.round(length * 10) / 10,
    width: Math.round(width * 10) / 10,
    totalDepth: Math.round((storageDepth + poolDepth + freeboard) * 100) / 100,
    storageDepth: Math.round(storageDepth * 100) / 100,
    permanentPoolDepth: poolDepth,
    freeboard,
    totalVolume: Math.round(storageVol + permanentPoolVolume),
    storageVolume: Math.round(storageVol),
    permanentPoolVolume: Math.round(permanentPoolVolume),
    sideSlope,
    bottomArea: Math.round(bottomArea),
    lengthToWidthRatio: 2,
  };
}

/**
 * Design outlet structure
 */
function designOutletStructure(
  targetOutflow: number,
  storageDepth: number,
  pondType: PondType
): OutletStructure {
  // Convert L/s to m³/s
  const Q = targetOutflow / 1000;

  // Orifice sizing: Q = Cd × A × √(2gh)
  // A = Q / (Cd × √(2gh))
  // Assume head = 0.7 × storage depth for design
  const designHead = storageDepth * 0.7;
  const orificeArea = Q / (ORIFICE_CD * Math.sqrt(2 * 9.81 * designHead));
  const orificeDiameter = Math.sqrt(4 * orificeArea / Math.PI) * 1000; // mm

  // Round to standard sizes
  const standardSizes = [100, 150, 200, 250, 300, 400, 500, 600, 800];
  const selectedDiameter = standardSizes.find(s => s >= orificeDiameter) || orificeDiameter;

  // Weir for overflow (sized for 150% of design flow)
  const weirFlow = Q * 1.5;
  const weirHead = 0.15; // 15cm assumed head
  const weirLength = weirFlow / (WEIR_CD * Math.pow(weirHead, 1.5));

  if (pondType === 'detention') {
    return {
      type: 'orifice',
      orificeDiameter: selectedDiameter,
      orificeElevation: 0.1, // 10cm above bottom
      orificeCapacity: targetOutflow,
      weirLength: Math.ceil(weirLength * 10) / 10,
      weirElevation: storageDepth * 0.9,
      weirCapacity: weirFlow * 1000,
    };
  } else {
    // Retention - use riser structure
    return {
      type: 'riser',
      riserDiameter: Math.max(selectedDiameter + 100, 300),
      riserHeight: storageDepth,
      orificeDiameter: selectedDiameter,
      orificeElevation: 0, // at permanent pool level
      orificeCapacity: targetOutflow,
    };
  }
}

/**
 * Design emergency spillway
 */
function designEmergencySpillway(
  emergencyFlow: number, // L/s
  freeboard: number
): EmergencySpillway {
  // Q = Cd × L × H^1.5
  const Q = emergencyFlow / 1000; // m³/s
  const maxHead = freeboard * 0.5; // Use half of freeboard

  // Solve for length
  const length = Q / (WEIR_CD * Math.pow(maxHead, 1.5));

  return {
    type: 'broad_crested',
    length: Math.max(3, Math.ceil(length)),
    elevation: 0, // relative to top of storage
    designCapacity: Q,
    maxHead,
  };
}

/**
 * Generate stage-storage-discharge relationship
 */
function generateStageStorage(
  geometry: PondGeometry,
  outlet: OutletStructure
): Array<{ stage: number; volume: number; area: number; outflow: number }> {
  const curve: Array<{ stage: number; volume: number; area: number; outflow: number }> = [];
  const steps = 10;
  const totalDepth = geometry.storageDepth + geometry.permanentPoolDepth;

  for (let i = 0; i <= steps; i++) {
    const stage = (i / steps) * totalDepth;
    const stageRatio = stage / totalDepth;

    // Interpolate area (linear approximation)
    const area = geometry.bottomArea + (geometry.surfaceArea - geometry.bottomArea) * stageRatio;

    // Calculate volume (prismoidal)
    const volume = (geometry.bottomArea + area + Math.sqrt(geometry.bottomArea * area)) * stage / 3;

    // Calculate outflow
    let outflow = 0;
    if (outlet.orificeDiameter && stage > (outlet.orificeElevation || 0)) {
      const head = stage - (outlet.orificeElevation || 0);
      const orificeArea = Math.PI * Math.pow(outlet.orificeDiameter / 2000, 2);
      outflow = ORIFICE_CD * orificeArea * Math.sqrt(2 * 9.81 * head) * 1000; // L/s
    }

    curve.push({
      stage: Math.round(stage * 100) / 100,
      volume: Math.round(volume),
      area: Math.round(area),
      outflow: Math.round(outflow * 10) / 10,
    });
  }

  return curve;
}

/**
 * Calculate drain time
 */
function calculateDrainTime(storageVolume: number, averageOutflow: number): number {
  // Simplified: assume average outflow during drain
  const avgOutflowM3s = (averageOutflow * 0.7) / 1000; // 70% of max, in m³/s
  const drainTimeSeconds = storageVolume / avgOutflowM3s;
  return drainTimeSeconds / 3600; // hours
}

/**
 * Calculate pond costs
 */
function calculatePondCosts(
  geometry: PondGeometry,
  outlet: OutletStructure,
  spillway: EmergencySpillway
): PondDesignResult['estimatedCost'] {
  // Excavation volume (with side slopes)
  const avgDepth = geometry.totalDepth / 2;
  const avgArea = (geometry.surfaceArea + geometry.bottomArea) / 2;
  const excavationVolume = avgArea * geometry.totalDepth;

  // Embankment (assume 20% of excavation goes to embankment)
  const embankmentVolume = excavationVolume * 0.2;

  const excavation = excavationVolume * POND_COSTS.excavation;
  const embankment = embankmentVolume * POND_COSTS.embankment;
  const outletCost = POND_COSTS.outletStructure +
    (outlet.orificeDiameter || 0) * POND_COSTS.outletPerMm;
  const spillwayCost = spillway.length * POND_COSTS.spillway +
    spillway.length * 2 * POND_COSTS.riprap; // riprap on spillway
  const landscaping = geometry.surfaceArea * POND_COSTS.landscaping;

  const total = excavation + embankment + outletCost + spillwayCost + landscaping;

  return {
    excavation: Math.round(excavation),
    embankment: Math.round(embankment),
    outlet: Math.round(outletCost),
    spillway: Math.round(spillwayCost),
    landscaping: Math.round(landscaping),
    total: Math.round(total),
    perM3Storage: Math.round(total / geometry.storageVolume),
  };
}

/**
 * Validate pond design
 */
function validatePondDesign(
  geometry: PondGeometry,
  inlet: { peakPostDevelopment: number },
  outlet: OutletStructure,
  drainTime: number,
  warnings: string[],
  recommendations: string[]
): boolean {
  let isViable = true;

  // Check drain time
  if (drainTime > 72) {
    warnings.push(`Drain time (${drainTime.toFixed(0)} hrs) exceeds 72 hours`);
    isViable = false;
  } else if (drainTime > 48) {
    warnings.push(`Drain time (${drainTime.toFixed(0)} hrs) exceeds recommended 48 hours`);
  }

  // Check depth
  if (geometry.totalDepth > 3) {
    warnings.push('Total depth exceeds 3m - requires safety measures');
  }

  // Check minimum dimensions
  if (geometry.bottomArea < 10) {
    warnings.push('Bottom area very small - construction may be difficult');
  }

  // Check outlet size
  if (outlet.orificeDiameter && outlet.orificeDiameter < 100) {
    warnings.push('Orifice diameter < 100mm - prone to clogging');
    recommendations.push('Use trash rack and sediment forebay');
  }

  // Standard recommendations
  recommendations.push('Install sediment forebay (10-15% of volume)');
  recommendations.push('Provide access ramp for maintenance');
  recommendations.push('Plant native vegetation on banks');
  recommendations.push('Install safety signage and fencing if public access');

  return isViable;
}

// ============================================
// QUICK SIZING FUNCTIONS
// ============================================

/**
 * Quick estimate of pond size
 */
export function estimatePondSize(
  catchmentAreaHa: number,
  imperviousPercent: number,
  reductionTargetPercent: number = 50
): {
  surfaceArea: number; // m²
  storageVolume: number; // m³
  depth: number; // m
} {
  // Rule of thumb: 300-500 m³ per hectare of impervious area
  const imperviousAreaHa = catchmentAreaHa * imperviousPercent / 100;
  const storageVolume = imperviousAreaHa * 400 * (reductionTargetPercent / 50);

  // Typical depth 1.2m for storage
  const depth = 1.2;
  const surfaceArea = storageVolume / depth / 0.7; // 0.7 shape factor

  return {
    surfaceArea: Math.round(surfaceArea),
    storageVolume: Math.round(storageVolume),
    depth,
  };
}

/**
 * Calculate pre/post development peaks
 */
export function calculateDevelopmentPeaks(
  catchmentAreaHa: number,
  preDevelopmentC: number,
  postDevelopmentC: number,
  rainfallIntensity: number
): {
  prePeak: number; // L/s
  postPeak: number; // L/s
  increase: number; // %
  storageNeeded: number; // m³ (rough)
} {
  const prePeak = preDevelopmentC * rainfallIntensity * catchmentAreaHa * 2.78;
  const postPeak = postDevelopmentC * rainfallIntensity * catchmentAreaHa * 2.78;
  const increase = ((postPeak - prePeak) / prePeak) * 100;

  // Rough storage estimate
  const storageNeeded = (postPeak - prePeak) * 0.5 * 1800 / 1000; // 30 min storm

  return {
    prePeak: Math.round(prePeak * 10) / 10,
    postPeak: Math.round(postPeak * 10) / 10,
    increase: Math.round(increase),
    storageNeeded: Math.round(storageNeeded),
  };
}

// ============================================
// INFILTRATION BASIN SPECIFIC
// ============================================

/**
 * Design infiltration basin (combines detention with infiltration)
 */
export function designInfiltrationBasin(
  input: PondDesignInput & { infiltrationRate: number }
): PondDesignResult & { infiltrationAnalysis: { infiltratedVolume: number; infiltrationTime: number } } {
  // First, design as detention pond
  const pondResult = designPond({ ...input, pondType: 'detention' });

  // Calculate infiltration capacity
  const infiltrationRateM = input.infiltrationRate / 1000; // m/hr
  const infiltrationCapacity = pondResult.geometry.bottomArea * infiltrationRateM; // m³/hr

  // Time to infiltrate storage volume
  const infiltrationTime = pondResult.geometry.storageVolume / infiltrationCapacity; // hours

  // Volume infiltrated during storm
  const infiltratedDuringStorm = infiltrationCapacity * (input.stormDuration / 60);

  // Add infiltration analysis
  pondResult.recommendations.push(
    `Infiltration capacity: ${infiltrationCapacity.toFixed(1)} m³/hr`
  );
  pondResult.recommendations.push(
    `Time to fully infiltrate: ${infiltrationTime.toFixed(1)} hours`
  );

  if (infiltrationTime > 72) {
    pondResult.warnings.push('Infiltration time exceeds 72 hours - add underdrain system');
  }

  return {
    ...pondResult,
    infiltrationAnalysis: {
      infiltratedVolume: Math.round(infiltratedDuringStorm),
      infiltrationTime: Math.round(infiltrationTime * 10) / 10,
    },
  };
}

// ============================================
// FORMAT FUNCTIONS
// ============================================

/**
 * Format pond design for display
 */
export function formatPondDesign(result: PondDesignResult): string {
  const lines: string[] = [
    `=== DISEÑO DE ${result.pondType === 'detention' ? 'ESTANQUE DE DETENCIÓN' : 'ESTANQUE DE RETENCIÓN'} ===`,
    '',
    `Estado: ${result.isViable ? '✓ VIABLE' : '✗ REQUIERE AJUSTES'}`,
    '',
    '--- GEOMETRÍA ---',
    `Área superficial: ${result.geometry.surfaceArea.toLocaleString()} m²`,
    `Largo × Ancho: ${result.geometry.length}m × ${result.geometry.width}m`,
    `Profundidad total: ${result.geometry.totalDepth.toFixed(2)} m`,
    `Profundidad almacenamiento: ${result.geometry.storageDepth.toFixed(2)} m`,
    result.pondType === 'retention' ? `Profundidad piscina permanente: ${result.geometry.permanentPoolDepth.toFixed(2)} m` : '',
    `Borde libre: ${result.geometry.freeboard.toFixed(2)} m`,
    `Talud: ${result.geometry.sideSlope}:1 (H:V)`,
    '',
    '--- VOLÚMENES ---',
    `Volumen almacenamiento: ${result.geometry.storageVolume.toLocaleString()} m³`,
    result.pondType === 'retention' ? `Volumen piscina permanente: ${result.geometry.permanentPoolVolume.toLocaleString()} m³` : '',
    `Volumen total: ${result.geometry.totalVolume.toLocaleString()} m³`,
    '',
    '--- CAUDALES ---',
    `Caudal pre-desarrollo: ${result.inflow.peakPreDevelopment.toFixed(1)} L/s`,
    `Caudal post-desarrollo: ${result.inflow.peakPostDevelopment.toFixed(1)} L/s`,
    `Caudal salida diseño: ${result.outflow.peakDischarge.toFixed(1)} L/s`,
    `Reducción: ${result.outflow.reductionPercent.toFixed(0)}%`,
    `Tiempo vaciado: ${result.outflow.drainTime.toFixed(1)} hrs`,
    '',
    '--- ESTRUCTURA DE SALIDA ---',
    `Tipo: ${result.outlet.type}`,
    result.outlet.orificeDiameter ? `Orificio: Ø${result.outlet.orificeDiameter}mm` : '',
    result.outlet.weirLength ? `Vertedero: ${result.outlet.weirLength}m` : '',
    '',
    '--- VERTEDERO DE EMERGENCIA ---',
    `Ancho: ${result.spillway.length}m`,
    `Capacidad: ${(result.spillway.designCapacity * 1000).toFixed(1)} L/s`,
    '',
    '--- COSTO ESTIMADO ---',
    `Excavación: $${result.estimatedCost.excavation.toLocaleString()} CLP`,
    `Terraplén: $${result.estimatedCost.embankment.toLocaleString()} CLP`,
    `Estructura salida: $${result.estimatedCost.outlet.toLocaleString()} CLP`,
    `Vertedero: $${result.estimatedCost.spillway.toLocaleString()} CLP`,
    `Paisajismo: $${result.estimatedCost.landscaping.toLocaleString()} CLP`,
    `TOTAL: $${result.estimatedCost.total.toLocaleString()} CLP`,
    `Por m³ almacenamiento: $${result.estimatedCost.perM3Storage.toLocaleString()} CLP/m³`,
  ].filter(Boolean);

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  if (result.recommendations.length > 0) {
    lines.push('', '--- RECOMENDACIONES ---');
    result.recommendations.forEach(r => lines.push(`• ${r}`));
  }

  return lines.join('\n');
}
