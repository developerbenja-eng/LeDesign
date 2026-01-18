/**
 * Infiltration Trench (Zanja de Infiltración) Designer
 *
 * Design methodology based on Chilean MINVU and MOP standards
 * Zanjas de infiltración are linear infiltration structures filled with gravel
 * that collect and infiltrate stormwater runoff
 *
 * Key Design Parameters:
 * - Storage Volume = Runoff Volume for design storm
 * - Infiltration Rate must handle peak inflow
 * - Minimum infiltration rate: 13 mm/hr (Chilean standard)
 * - Safety factor: 2-3 for clogging over time
 */

import { SOIL_TYPES, type SoilType, type SoilGroup } from './regional-data';
import { calculateRationalMethod, type RationalMethodInput, type CatchmentArea } from './rational-method';

// ============================================
// TYPES
// ============================================

export interface InfiltrationTrenchInput {
  // Catchment characteristics
  contributingArea: number; // m² (NOT hectares for this scale)
  runoffCoefficient: number; // C value (0-1)

  // Storm parameters
  rainfallIntensity: number; // mm/hr (from IDF curve)
  stormDuration: number; // minutes
  returnPeriod: number; // years

  // Site conditions
  soilType: SoilGroup | string; // A, B, C, D or soil name
  measuredInfiltrationRate?: number; // mm/hr (if field tested)
  groundwaterDepth?: number; // m (minimum 1.2m required)

  // Design constraints
  maxLength?: number; // m
  maxDepth?: number; // m (typical 1.0-2.0m)
  minWidth?: number; // m (typical 0.3-1.0m)

  // Location for hydrology
  latitude?: number;
  longitude?: number;
}

export interface TrenchDimensions {
  length: number; // m
  width: number; // m
  depth: number; // m
  effectiveDepth: number; // m (below inlet)
  freeboardDepth: number; // m
}

export interface TrenchMaterials {
  gravelVolume: number; // m³
  geotextileArea: number; // m²
  perforatedPipeLength: number; // m
  overflowPipeLength: number; // m
}

export interface InfiltrationTrenchResult {
  // Design summary
  isViable: boolean;
  designCapacity: 'adequate' | 'marginal' | 'insufficient';

  // Volumes
  runoffVolume: number; // m³
  storageVolume: number; // m³
  requiredStorageVolume: number; // m³
  storageEfficiency: number; // % (due to gravel voids ~0.35-0.40)

  // Dimensions
  dimensions: TrenchDimensions;

  // Infiltration
  infiltrationRate: number; // mm/hr (design value with safety factor)
  baseInfiltrationRate: number; // mm/hr (measured or estimated)
  safetyFactor: number;
  infiltrationArea: number; // m² (bottom + partial sides)
  infiltrationCapacity: number; // L/s
  peakInflow: number; // L/s

  // Time calculations
  drainTime: number; // hours to empty
  maxDrainTime: number; // hours (standard: 24-72 hrs)

  // Materials
  materials: TrenchMaterials;

  // Costs (rough estimates)
  estimatedCost: {
    excavation: number;
    gravel: number;
    geotextile: number;
    pipes: number;
    total: number;
    perM3Storage: number;
  };

  // Warnings and recommendations
  warnings: string[];
  recommendations: string[];
}

export interface TrenchDesignOptions {
  porosity?: number; // void ratio of gravel (default 0.35)
  safetyFactor?: number; // for infiltration (default 2.5)
  maxDrainTimeHours?: number; // default 48
  includeOverflow?: boolean; // default true
  includeDistributionPipe?: boolean; // default true
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_POROSITY = 0.35; // 35% void space in gravel
const DEFAULT_SAFETY_FACTOR = 2.5; // Account for clogging
const MIN_INFILTRATION_RATE = 13; // mm/hr (Chilean standard)
const MAX_DRAIN_TIME_HOURS = 48; // 48 hours to fully drain
const MIN_GROUNDWATER_DEPTH = 1.2; // m below trench bottom

// Typical infiltration rates by soil group (mm/hr)
const INFILTRATION_BY_SOIL: Record<SoilGroup, { min: number; typical: number; max: number }> = {
  A: { min: 50, typical: 100, max: 250 },
  B: { min: 25, typical: 50, max: 100 },
  C: { min: 5, typical: 15, max: 25 },
  D: { min: 0, typical: 5, max: 13 },
};

// Unit costs (CLP) - rough estimates for Biobío region
const UNIT_COSTS = {
  excavation: 15000, // per m³
  gravel: 25000, // per m³ (gravilla 20-40mm)
  geotextile: 3000, // per m²
  perforatedPipe: 8000, // per m (150mm PVC)
  overflowPipe: 12000, // per m (including fittings)
};

// ============================================
// MAIN DESIGN FUNCTION
// ============================================

/**
 * Design an infiltration trench for the given parameters
 */
export function designInfiltrationTrench(
  input: InfiltrationTrenchInput,
  options: TrenchDesignOptions = {}
): InfiltrationTrenchResult {
  const {
    porosity = DEFAULT_POROSITY,
    safetyFactor = DEFAULT_SAFETY_FACTOR,
    maxDrainTimeHours = MAX_DRAIN_TIME_HOURS,
    includeOverflow = true,
    includeDistributionPipe = true,
  } = options;

  const warnings: string[] = [];
  const recommendations: string[] = [];

  // 1. Get infiltration rate
  const soilData = getSoilInfiltrationData(input.soilType);
  const baseInfiltrationRate = input.measuredInfiltrationRate ?? soilData.typical;
  const designInfiltrationRate = baseInfiltrationRate / safetyFactor;

  // Check minimum infiltration
  if (designInfiltrationRate < MIN_INFILTRATION_RATE) {
    warnings.push(
      `Design infiltration rate (${designInfiltrationRate.toFixed(1)} mm/hr) is below minimum (${MIN_INFILTRATION_RATE} mm/hr)`
    );
    recommendations.push('Consider alternative SUDS: detention pond or permeable pavement with storage');
  }

  // 2. Calculate runoff volume
  // V = C × i × A × t / (60 × 1000)
  // Where: V in m³, i in mm/hr, A in m², t in minutes
  const runoffVolume =
    (input.runoffCoefficient * input.rainfallIntensity * input.contributingArea * input.stormDuration) /
    (60 * 1000);

  // 3. Calculate required storage volume (accounting for porosity)
  const requiredStorageVolume = runoffVolume / porosity;

  // 4. Calculate peak inflow rate
  // Q = C × i × A / (3.6 × 10^6) in m³/s, then × 1000 for L/s
  const peakInflowLps =
    (input.runoffCoefficient * input.rainfallIntensity * input.contributingArea) / 3600;

  // 5. Design dimensions
  const dimensions = calculateTrenchDimensions(
    requiredStorageVolume,
    input.maxLength,
    input.maxDepth,
    input.minWidth
  );

  // 6. Calculate infiltration capacity
  // Infiltration area = bottom + 50% of sides (conservative)
  const bottomArea = dimensions.length * dimensions.width;
  const sideArea = 2 * dimensions.length * dimensions.effectiveDepth * 0.5;
  const infiltrationArea = bottomArea + sideArea;

  // Infiltration capacity in L/s
  // Q_inf = f × A / 3600 where f in mm/hr, A in m²
  const infiltrationCapacityLps = (designInfiltrationRate * infiltrationArea) / 3600;

  // 7. Calculate storage volume provided
  const storageVolume =
    dimensions.length * dimensions.width * dimensions.effectiveDepth * porosity;

  // 8. Calculate drain time
  // Time to drain = Storage Volume / Infiltration Rate
  const drainTimeHours = (storageVolume * 1000) / (designInfiltrationRate * infiltrationArea);

  // 9. Check groundwater depth
  if (input.groundwaterDepth !== undefined) {
    const minRequired = dimensions.depth + MIN_GROUNDWATER_DEPTH;
    if (input.groundwaterDepth < minRequired) {
      warnings.push(
        `Groundwater too shallow: ${input.groundwaterDepth.toFixed(1)}m, need ${minRequired.toFixed(1)}m minimum`
      );
      recommendations.push('Reduce trench depth or consider raised infiltration system');
    }
  } else {
    recommendations.push('Verify groundwater depth > 1.2m below trench bottom');
  }

  // 10. Calculate materials
  const materials = calculateMaterials(dimensions, includeDistributionPipe, includeOverflow);

  // 11. Calculate costs
  const estimatedCost = calculateCosts(dimensions, materials);

  // 12. Determine viability
  const capacityRatio = storageVolume / runoffVolume;
  const inflowRatio = infiltrationCapacityLps / peakInflowLps;

  let designCapacity: 'adequate' | 'marginal' | 'insufficient';
  let isViable = true;

  if (capacityRatio >= 1.0 && drainTimeHours <= maxDrainTimeHours) {
    designCapacity = 'adequate';
  } else if (capacityRatio >= 0.8 && drainTimeHours <= maxDrainTimeHours * 1.5) {
    designCapacity = 'marginal';
    warnings.push('Design is marginal - consider increasing dimensions or adding overflow');
  } else {
    designCapacity = 'insufficient';
    isViable = false;
    warnings.push('Infiltration trench cannot handle design storm - consider detention pond');
  }

  // Additional warnings
  if (drainTimeHours > maxDrainTimeHours) {
    warnings.push(
      `Drain time (${drainTimeHours.toFixed(1)} hrs) exceeds maximum (${maxDrainTimeHours} hrs)`
    );
  }

  if (inflowRatio < 0.5) {
    recommendations.push('Add overflow connection to storm sewer for large events');
  }

  if (dimensions.depth > 2.0) {
    warnings.push('Trench depth > 2.0m may require shoring during construction');
  }

  // Standard recommendations
  recommendations.push('Install geotextile on all sides to prevent fines migration');
  recommendations.push('Use 20-40mm clean gravel (gravilla) for fill');
  recommendations.push('Include inspection/cleanout access points every 15-20m');

  return {
    isViable,
    designCapacity,
    runoffVolume,
    storageVolume,
    requiredStorageVolume,
    storageEfficiency: porosity * 100,
    dimensions,
    infiltrationRate: designInfiltrationRate,
    baseInfiltrationRate,
    safetyFactor,
    infiltrationArea,
    infiltrationCapacity: infiltrationCapacityLps,
    peakInflow: peakInflowLps,
    drainTime: drainTimeHours,
    maxDrainTime: maxDrainTimeHours,
    materials,
    estimatedCost,
    warnings,
    recommendations,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get infiltration data for a soil type
 */
function getSoilInfiltrationData(
  soilType: SoilGroup | string
): { min: number; typical: number; max: number } {
  // Check if it's a soil group
  if (['A', 'B', 'C', 'D'].includes(soilType as string)) {
    return INFILTRATION_BY_SOIL[soilType as SoilGroup];
  }

  // Look up in regional data
  const soil = SOIL_TYPES.find(
    s => s.id === soilType || s.name.toLowerCase() === soilType.toLowerCase()
  );

  if (soil) {
    return INFILTRATION_BY_SOIL[soil.group];
  }

  // Default to group B
  return INFILTRATION_BY_SOIL.B;
}

/**
 * Calculate optimal trench dimensions
 */
function calculateTrenchDimensions(
  requiredVolume: number,
  maxLength?: number,
  maxDepth?: number,
  minWidth?: number
): TrenchDimensions {
  // Default constraints
  const maxL = maxLength ?? 50; // 50m typical max
  const maxD = maxDepth ?? 1.8; // 1.8m typical max
  const minW = minWidth ?? 0.6; // 0.6m typical min

  // Start with standard proportions
  // Typical L:W:D ratio is about 20:1:1.5
  let depth = Math.min(1.5, maxD);
  let width = Math.max(0.8, minW);

  // Calculate length needed
  let length = requiredVolume / (width * depth);

  // If length exceeds max, increase width and depth
  if (length > maxL) {
    length = maxL;
    // Recalculate cross-section
    const crossSection = requiredVolume / length;

    // Try to maintain 1:1.5 width:depth ratio
    depth = Math.min(Math.sqrt(crossSection * 1.5), maxD);
    width = Math.max(crossSection / depth, minW);

    // If still not enough, use max depth
    if (width * depth * length < requiredVolume) {
      depth = maxD;
      width = Math.max(requiredVolume / (length * depth), minW);
    }
  }

  // Round to practical dimensions
  length = Math.ceil(length * 2) / 2; // 0.5m increments
  width = Math.ceil(width * 10) / 10; // 0.1m increments
  depth = Math.ceil(depth * 10) / 10;

  const freeboardDepth = 0.15; // 15cm freeboard
  const effectiveDepth = depth - freeboardDepth;

  return {
    length,
    width,
    depth,
    effectiveDepth,
    freeboardDepth,
  };
}

/**
 * Calculate required materials
 */
function calculateMaterials(
  dimensions: TrenchDimensions,
  includeDistributionPipe: boolean,
  includeOverflow: boolean
): TrenchMaterials {
  const { length, width, depth, effectiveDepth } = dimensions;

  // Gravel volume (full volume minus pipe space)
  const totalVolume = length * width * depth;
  const pipeSpace = includeDistributionPipe ? length * 0.02 : 0; // ~2% for pipe
  const gravelVolume = totalVolume - pipeSpace;

  // Geotextile area (bottom + all sides + top overlap)
  const bottomArea = length * width;
  const sideArea = 2 * (length * depth + width * depth);
  const overlapArea = length * 0.3; // 30cm overlap at top
  const geotextileArea = bottomArea + sideArea + overlapArea;

  // Pipes
  const perforatedPipeLength = includeDistributionPipe ? length : 0;
  const overflowPipeLength = includeOverflow ? 3 : 0; // 3m typical

  return {
    gravelVolume: Math.ceil(gravelVolume * 10) / 10,
    geotextileArea: Math.ceil(geotextileArea),
    perforatedPipeLength: Math.ceil(perforatedPipeLength),
    overflowPipeLength,
  };
}

/**
 * Calculate estimated costs
 */
function calculateCosts(
  dimensions: TrenchDimensions,
  materials: TrenchMaterials
): InfiltrationTrenchResult['estimatedCost'] {
  const excavationVolume = dimensions.length * dimensions.width * dimensions.depth * 1.1; // 10% over-excavation

  const excavation = excavationVolume * UNIT_COSTS.excavation;
  const gravel = materials.gravelVolume * UNIT_COSTS.gravel;
  const geotextile = materials.geotextileArea * UNIT_COSTS.geotextile;
  const pipes =
    materials.perforatedPipeLength * UNIT_COSTS.perforatedPipe +
    materials.overflowPipeLength * UNIT_COSTS.overflowPipe;

  const total = excavation + gravel + geotextile + pipes;
  const storageVolume =
    dimensions.length * dimensions.width * dimensions.effectiveDepth * DEFAULT_POROSITY;

  return {
    excavation: Math.round(excavation),
    gravel: Math.round(gravel),
    geotextile: Math.round(geotextile),
    pipes: Math.round(pipes),
    total: Math.round(total),
    perM3Storage: Math.round(total / storageVolume),
  };
}

// ============================================
// SIZING FUNCTIONS
// ============================================

/**
 * Quick estimate of trench size needed
 */
export function estimateTrenchSize(
  contributingAreaM2: number,
  imperviousPercent: number,
  stormDepthMm: number = 30 // 30mm typical design storm
): { length: number; width: number; depth: number; volume: number } {
  // Rough runoff coefficient
  const C = 0.3 + 0.6 * (imperviousPercent / 100);

  // Runoff volume
  const runoffVolume = (C * stormDepthMm * contributingAreaM2) / 1000; // m³

  // Required storage (with porosity)
  const storageVolume = runoffVolume / DEFAULT_POROSITY;

  // Standard proportions
  const depth = 1.2;
  const width = 0.8;
  const length = Math.ceil(storageVolume / (depth * width));

  return {
    length,
    width,
    depth,
    volume: storageVolume,
  };
}

/**
 * Check if site is suitable for infiltration trench
 */
export function checkInfiltrationSuitability(
  soilType: SoilGroup | string,
  slopePercent: number,
  groundwaterDepthM?: number,
  pollutantLoad: 'low' | 'medium' | 'high' = 'low'
): {
  suitable: boolean;
  score: number; // 0-100
  factors: Array<{ factor: string; status: 'good' | 'fair' | 'poor'; note: string }>;
} {
  const factors: Array<{ factor: string; status: 'good' | 'fair' | 'poor'; note: string }> = [];
  let score = 100;

  // Check soil
  const soilData = getSoilInfiltrationData(soilType);
  if (soilData.typical >= 50) {
    factors.push({ factor: 'Soil infiltration', status: 'good', note: 'Excellent drainage' });
  } else if (soilData.typical >= 15) {
    factors.push({ factor: 'Soil infiltration', status: 'fair', note: 'Adequate drainage' });
    score -= 15;
  } else {
    factors.push({ factor: 'Soil infiltration', status: 'poor', note: 'Poor drainage - consider alternatives' });
    score -= 40;
  }

  // Check slope
  if (slopePercent <= 5) {
    factors.push({ factor: 'Site slope', status: 'good', note: 'Flat to gentle slope' });
  } else if (slopePercent <= 15) {
    factors.push({ factor: 'Site slope', status: 'fair', note: 'May need terracing' });
    score -= 10;
  } else {
    factors.push({ factor: 'Site slope', status: 'poor', note: 'Too steep for trench' });
    score -= 30;
  }

  // Check groundwater
  if (groundwaterDepthM !== undefined) {
    if (groundwaterDepthM >= 3) {
      factors.push({ factor: 'Groundwater depth', status: 'good', note: 'Deep water table' });
    } else if (groundwaterDepthM >= 1.5) {
      factors.push({ factor: 'Groundwater depth', status: 'fair', note: 'Adequate separation' });
      score -= 10;
    } else {
      factors.push({ factor: 'Groundwater depth', status: 'poor', note: 'Too shallow' });
      score -= 35;
    }
  }

  // Check pollutant load
  if (pollutantLoad === 'low') {
    factors.push({ factor: 'Pollutant risk', status: 'good', note: 'Low contamination risk' });
  } else if (pollutantLoad === 'medium') {
    factors.push({ factor: 'Pollutant risk', status: 'fair', note: 'Add pretreatment' });
    score -= 10;
  } else {
    factors.push({ factor: 'Pollutant risk', status: 'poor', note: 'Not recommended - use treatment train' });
    score -= 25;
  }

  return {
    suitable: score >= 50,
    score: Math.max(0, score),
    factors,
  };
}

/**
 * Design multiple trenches in series for large areas
 */
export function designTrenchSystem(
  totalContributingAreaM2: number,
  input: Omit<InfiltrationTrenchInput, 'contributingArea'>,
  maxTrenchLength: number = 30
): {
  numberOfTrenches: number;
  areaPerTrench: number;
  trenchDesign: InfiltrationTrenchResult;
  totalCost: number;
  systemLayout: string;
} {
  // First, try a single trench
  const singleTrench = designInfiltrationTrench({
    ...input,
    contributingArea: totalContributingAreaM2,
    maxLength: maxTrenchLength,
  });

  // If single trench works, use it
  if (singleTrench.isViable && singleTrench.dimensions.length <= maxTrenchLength) {
    return {
      numberOfTrenches: 1,
      areaPerTrench: totalContributingAreaM2,
      trenchDesign: singleTrench,
      totalCost: singleTrench.estimatedCost.total,
      systemLayout: 'Single trench',
    };
  }

  // Otherwise, split into multiple trenches
  // Estimate number needed based on length
  const estimatedTrenches = Math.ceil(singleTrench.dimensions.length / maxTrenchLength);
  const numberOfTrenches = Math.max(2, estimatedTrenches);
  const areaPerTrench = totalContributingAreaM2 / numberOfTrenches;

  const trenchDesign = designInfiltrationTrench({
    ...input,
    contributingArea: areaPerTrench,
    maxLength: maxTrenchLength,
  });

  const totalCost = trenchDesign.estimatedCost.total * numberOfTrenches;

  let systemLayout: string;
  if (numberOfTrenches === 2) {
    systemLayout = 'Parallel trenches with shared overflow';
  } else if (numberOfTrenches <= 4) {
    systemLayout = 'Parallel trenches in series';
  } else {
    systemLayout = 'Grid pattern with central collector';
  }

  return {
    numberOfTrenches,
    areaPerTrench,
    trenchDesign,
    totalCost,
    systemLayout,
  };
}

// ============================================
// EXPORT UTILITIES
// ============================================

/**
 * Format trench design for display
 */
export function formatTrenchDesign(result: InfiltrationTrenchResult): string {
  const lines: string[] = [
    '=== DISEÑO DE ZANJA DE INFILTRACIÓN ===',
    '',
    `Estado: ${result.isViable ? '✓ VIABLE' : '✗ NO VIABLE'} (${result.designCapacity})`,
    '',
    '--- DIMENSIONES ---',
    `Largo: ${result.dimensions.length.toFixed(1)} m`,
    `Ancho: ${result.dimensions.width.toFixed(1)} m`,
    `Profundidad: ${result.dimensions.depth.toFixed(1)} m`,
    `Profundidad efectiva: ${result.dimensions.effectiveDepth.toFixed(2)} m`,
    '',
    '--- VOLÚMENES ---',
    `Volumen escorrentía: ${result.runoffVolume.toFixed(2)} m³`,
    `Volumen almacenamiento: ${result.storageVolume.toFixed(2)} m³`,
    `Eficiencia (porosidad): ${result.storageEfficiency.toFixed(0)}%`,
    '',
    '--- INFILTRACIÓN ---',
    `Tasa base: ${result.baseInfiltrationRate.toFixed(1)} mm/hr`,
    `Tasa diseño (FS=${result.safetyFactor}): ${result.infiltrationRate.toFixed(1)} mm/hr`,
    `Área infiltración: ${result.infiltrationArea.toFixed(1)} m²`,
    `Capacidad: ${result.infiltrationCapacity.toFixed(2)} L/s`,
    `Caudal punta: ${result.peakInflow.toFixed(2)} L/s`,
    '',
    '--- TIEMPOS ---',
    `Tiempo vaciado: ${result.drainTime.toFixed(1)} hrs`,
    `Máximo permitido: ${result.maxDrainTime} hrs`,
    '',
    '--- MATERIALES ---',
    `Gravilla: ${result.materials.gravelVolume.toFixed(1)} m³`,
    `Geotextil: ${result.materials.geotextileArea.toFixed(0)} m²`,
    `Tubería perforada: ${result.materials.perforatedPipeLength.toFixed(0)} m`,
    `Rebose: ${result.materials.overflowPipeLength.toFixed(0)} m`,
    '',
    '--- COSTO ESTIMADO ---',
    `Excavación: $${result.estimatedCost.excavation.toLocaleString()} CLP`,
    `Gravilla: $${result.estimatedCost.gravel.toLocaleString()} CLP`,
    `Geotextil: $${result.estimatedCost.geotextile.toLocaleString()} CLP`,
    `Tuberías: $${result.estimatedCost.pipes.toLocaleString()} CLP`,
    `TOTAL: $${result.estimatedCost.total.toLocaleString()} CLP`,
    `Por m³ almacenamiento: $${result.estimatedCost.perM3Storage.toLocaleString()} CLP/m³`,
  ];

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
