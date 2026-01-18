/**
 * Pipe Hydraulics Module
 *
 * Core hydraulic calculations for sewer design based on:
 * - Manning's Equation for open channel/pipe flow
 * - Chilean standards NCh 1105, NCh 2472
 * - MINVU/MOP design criteria
 *
 * Manning's Equation:
 * Q = (1/n) × A × R^(2/3) × S^(1/2)
 *
 * Where:
 *   Q = Flow rate (m³/s)
 *   n = Manning's roughness coefficient
 *   A = Cross-sectional flow area (m²)
 *   R = Hydraulic radius = A/P (m)
 *   P = Wetted perimeter (m)
 *   S = Slope (m/m)
 */

import {
  ValidationError,
  ValidationWarning,
  EngineeringValidationError,
  validateNumber,
  validateFlowRate,
  validateVelocity,
  validateSlope,
  validateDiameter,
  validateManningN,
} from '../validation';

// ============================================
// VALIDATION TYPES
// ============================================

/** Result of validation with errors and warnings */
interface SewerValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ============================================
// TYPES
// ============================================

export type PipeMaterial =
  | 'concrete'
  | 'pvc'
  | 'hdpe'
  | 'corrugated_metal'
  | 'clay'
  | 'cast_iron'
  | 'ductile_iron'
  | 'fiberglass';

export type PipeShape = 'circular' | 'egg' | 'rectangular' | 'trapezoidal';

export interface PipeProperties {
  material: PipeMaterial;
  diameter: number; // mm (internal diameter)
  slope: number; // m/m (decimal, e.g., 0.01 = 1%)
  length?: number; // m
  shape?: PipeShape;
}

export interface FlowConditions {
  flowRate: number; // L/s
  fillRatio?: number; // y/D ratio (0-1), default varies by sewer type
}

export interface HydraulicResult {
  // Flow characteristics
  flowRate: number; // L/s
  velocity: number; // m/s
  flowDepth: number; // m
  fillRatio: number; // y/D

  // Geometry
  flowArea: number; // m²
  wettedPerimeter: number; // m
  hydraulicRadius: number; // m
  topWidth: number; // m (water surface width)

  // Capacity
  fullFlowCapacity: number; // L/s
  percentCapacity: number; // %

  // Energy
  froudeNumber: number;
  flowRegime: 'subcritical' | 'critical' | 'supercritical';
  specificEnergy: number; // m
  criticalDepth: number; // m

  // Validation
  velocityCheck: {
    meetsMinimum: boolean;
    meetsMaximum: boolean;
    minRequired: number;
    maxAllowed: number;
  };
  slopeCheck: {
    meetsMinimum: boolean;
    minRequired: number;
  };

  // Shear stress (for self-cleaning)
  shearStress: number; // N/m² (Pa)
  isSelfCleaning: boolean;
}

export interface PipeSizingResult {
  recommendedDiameter: number; // mm
  alternatives: Array<{
    diameter: number;
    fillRatio: number;
    velocity: number;
    capacity: number;
    isViable: boolean;
  }>;
  selectedResult: HydraulicResult;
  warnings: string[];
}

// ============================================
// CONSTANTS
// ============================================

// Manning's n coefficients by material
export const MANNING_N: Record<PipeMaterial, { min: number; typical: number; max: number }> = {
  concrete: { min: 0.011, typical: 0.013, max: 0.015 },
  pvc: { min: 0.009, typical: 0.010, max: 0.011 },
  hdpe: { min: 0.009, typical: 0.011, max: 0.012 },
  corrugated_metal: { min: 0.021, typical: 0.024, max: 0.030 },
  clay: { min: 0.011, typical: 0.013, max: 0.015 },
  cast_iron: { min: 0.012, typical: 0.013, max: 0.015 },
  ductile_iron: { min: 0.011, typical: 0.013, max: 0.015 },
  fiberglass: { min: 0.009, typical: 0.010, max: 0.011 },
};

// Standard pipe diameters (mm) available in Chile
export const STANDARD_DIAMETERS = {
  storm: [200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500, 1800, 2000],
  sanitary: [150, 200, 250, 300, 400, 500, 600, 800, 1000],
  pvc: [110, 160, 200, 250, 315, 400, 500, 630],
  hdpe: [110, 160, 200, 250, 315, 400, 500, 630, 800, 1000],
};

// Velocity limits (m/s) by pipe type
export const VELOCITY_LIMITS = {
  storm: { min: 0.6, max: 6.0 },
  sanitary: { min: 0.6, max: 4.5 },
  combined: { min: 0.6, max: 4.0 },
};

// Minimum slopes by diameter (Chilean standards)
export const MINIMUM_SLOPES: Record<number, number> = {
  150: 0.007,
  200: 0.005,
  250: 0.004,
  300: 0.003,
  400: 0.002,
  500: 0.0015,
  600: 0.001,
  800: 0.0008,
  1000: 0.0006,
  1200: 0.0005,
  1500: 0.0004,
};

// Fill ratio limits
export const FILL_RATIOS = {
  storm: { design: 1.0, maxAllowed: 1.0 }, // Can flow full
  sanitary: { design: 0.70, maxAllowed: 0.85 }, // Never flow full (ventilation)
  combined: { design: 0.80, maxAllowed: 0.90 },
};

// Minimum shear stress for self-cleaning (N/m²)
const MIN_SHEAR_STRESS = 1.0; // Pa (N/m²)

// ============================================
// VALIDATION FUNCTIONS
// ============================================

const VALID_PIPE_MATERIALS: PipeMaterial[] = [
  'concrete', 'pvc', 'hdpe', 'corrugated_metal', 'clay',
  'cast_iron', 'ductile_iron', 'fiberglass'
];

const VALID_SEWER_TYPES = ['storm', 'sanitary', 'combined'] as const;

/**
 * Validate pipe properties input
 */
export function validatePipeProperties(pipe: PipeProperties): SewerValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate material
  if (!VALID_PIPE_MATERIALS.includes(pipe.material)) {
    errors.push({
      code: 'INVALID_INPUT',
      field: 'material',
      message: `Invalid pipe material: ${pipe.material}. Valid options: ${VALID_PIPE_MATERIALS.join(', ')}`,
      value: pipe.material,
    });
  }

  // Validate diameter
  const diameterError = validateDiameter(pipe.diameter, 'diameter');
  if (diameterError) {
    errors.push(diameterError);
  } else {
    // Check for common diameter ranges
    if (pipe.diameter < 100) {
      warnings.push({
        field: 'diameter',
        message: `Diameter ${pipe.diameter}mm is smaller than typical sewer pipes (≥150mm)`,
        recommendation: 'Verify this is the correct diameter for the application',
      });
    } else if (pipe.diameter > 3000) {
      warnings.push({
        field: 'diameter',
        message: `Diameter ${pipe.diameter}mm is very large - consider using box culvert or tunnel`,
      });
    }
  }

  // Validate slope
  const slopeError = validateSlope(pipe.slope, 'slope');
  if (slopeError) {
    errors.push(slopeError);
  } else {
    // Check for reasonable slope values
    if (pipe.slope < 0.0001) {
      warnings.push({
        field: 'slope',
        message: `Slope ${(pipe.slope * 100).toFixed(4)}% is very flat - may not achieve self-cleaning velocity`,
        recommendation: 'Consider increasing slope to at least 0.5% for smaller pipes',
      });
    } else if (pipe.slope > 0.20) {
      warnings.push({
        field: 'slope',
        message: `Slope ${(pipe.slope * 100).toFixed(1)}% is very steep - may cause excessive velocity and erosion`,
        recommendation: 'Consider drop structures for steep terrain',
      });
    }
  }

  // Validate optional length
  if (pipe.length !== undefined) {
    const lengthError = validateNumber(pipe.length, 'length', { positive: true });
    if (lengthError) {
      errors.push(lengthError);
    }
  }

  return { errors, warnings };
}

/**
 * Validate flow conditions input
 */
export function validateFlowConditions(flow: FlowConditions): SewerValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate flow rate
  const flowError = validateFlowRate(flow.flowRate, 'flowRate');
  if (flowError) {
    errors.push(flowError);
  }

  // Validate optional fill ratio
  if (flow.fillRatio !== undefined) {
    const fillError = validateNumber(flow.fillRatio, 'fillRatio', { min: 0, max: 1 });
    if (fillError) {
      errors.push(fillError);
    } else if (flow.fillRatio < 0.1) {
      warnings.push({
        field: 'fillRatio',
        message: `Fill ratio ${(flow.fillRatio * 100).toFixed(0)}% is very low - calculations may be less accurate`,
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate pipe sizing input
 */
export function validatePipeSizingInput(
  flowRate: number,
  material: PipeMaterial,
  sewerType: typeof VALID_SEWER_TYPES[number]
): SewerValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate flow rate
  const flowError = validateFlowRate(flowRate, 'flowRate');
  if (flowError) {
    errors.push(flowError);
  }

  // Validate material
  if (!VALID_PIPE_MATERIALS.includes(material)) {
    errors.push({
      code: 'INVALID_INPUT',
      field: 'material',
      message: `Invalid pipe material: ${material}`,
      value: material,
    });
  }

  // Validate sewer type
  if (!VALID_SEWER_TYPES.includes(sewerType)) {
    errors.push({
      code: 'INVALID_INPUT',
      field: 'sewerType',
      message: `Invalid sewer type: ${sewerType}. Valid options: ${VALID_SEWER_TYPES.join(', ')}`,
      value: sewerType,
    });
  }

  return { errors, warnings };
}

// ============================================
// CORE HYDRAULIC FUNCTIONS
// ============================================

/**
 * Calculate hydraulic properties for partially full circular pipe
 *
 * @throws {EngineeringValidationError} When validation fails and throwOnError is true
 */
export function calculateCircularPipeFlow(
  pipe: PipeProperties,
  flow: FlowConditions,
  sewerType: 'storm' | 'sanitary' | 'combined' = 'storm',
  options: { throwOnError?: boolean } = {}
): HydraulicResult & { validation?: SewerValidationResult } {
  const { throwOnError = true } = options;

  // Validate inputs
  const pipeValidation = validatePipeProperties(pipe);
  const flowValidation = validateFlowConditions(flow);

  const allErrors = [...pipeValidation.errors, ...flowValidation.errors];
  const allWarnings = [...pipeValidation.warnings, ...flowValidation.warnings];

  if (allErrors.length > 0 && throwOnError) {
    throw new EngineeringValidationError(allErrors[0]);
  }
  const D = pipe.diameter / 1000; // Convert mm to m
  const Q = flow.flowRate / 1000; // Convert L/s to m³/s
  const S = pipe.slope;
  const n = MANNING_N[pipe.material].typical;

  // First calculate full flow capacity
  const Afull = Math.PI * D * D / 4;
  const Pfull = Math.PI * D;
  const Rfull = D / 4;
  const Qfull = (1 / n) * Afull * Math.pow(Rfull, 2 / 3) * Math.pow(S, 0.5);
  const Vfull = Qfull / Afull;

  // Find flow depth using iterative solution
  let fillRatio: number;
  if (flow.fillRatio !== undefined) {
    fillRatio = flow.fillRatio;
  } else {
    fillRatio = findFillRatio(Q, D, n, S);
  }

  // Ensure fill ratio is within bounds
  const maxFill = FILL_RATIOS[sewerType].maxAllowed;
  fillRatio = Math.min(fillRatio, maxFill);

  // Calculate geometry for partial flow
  const y = fillRatio * D; // Flow depth
  const theta = 2 * Math.acos(1 - 2 * fillRatio); // Central angle (radians)

  const A = (D * D / 8) * (theta - Math.sin(theta)); // Flow area
  const P = D * theta / 2; // Wetted perimeter
  const R = P > 0 ? A / P : 0; // Hydraulic radius
  const T = D * Math.sin(theta / 2); // Top width

  // Actual velocity and flow
  const V = (1 / n) * Math.pow(R, 2 / 3) * Math.pow(S, 0.5);
  const Qactual = V * A;

  // Froude number and flow regime
  const hydraulicDepth = A / T;
  const Fr = V / Math.sqrt(9.81 * hydraulicDepth);

  let flowRegime: 'subcritical' | 'critical' | 'supercritical';
  if (Fr < 0.95) flowRegime = 'subcritical';
  else if (Fr > 1.05) flowRegime = 'supercritical';
  else flowRegime = 'critical';

  // Critical depth (approximate for circular)
  const criticalDepth = Math.pow(Q * Q / (9.81 * (D * 0.8)), 1 / 3);

  // Specific energy
  const specificEnergy = y + V * V / (2 * 9.81);

  // Shear stress
  const shearStress = 9810 * R * S; // γ × R × S (N/m²)

  // Velocity limits
  const velLimits = VELOCITY_LIMITS[sewerType];

  // Minimum slope
  const minSlope = getMinimumSlope(pipe.diameter);

  const result: HydraulicResult & { validation?: SewerValidationResult } = {
    flowRate: Qactual * 1000, // L/s
    velocity: V,
    flowDepth: y,
    fillRatio,
    flowArea: A,
    wettedPerimeter: P,
    hydraulicRadius: R,
    topWidth: T,
    fullFlowCapacity: Qfull * 1000, // L/s
    percentCapacity: (Qactual / Qfull) * 100,
    froudeNumber: Fr,
    flowRegime,
    specificEnergy,
    criticalDepth,
    velocityCheck: {
      meetsMinimum: V >= velLimits.min,
      meetsMaximum: V <= velLimits.max,
      minRequired: velLimits.min,
      maxAllowed: velLimits.max,
    },
    slopeCheck: {
      meetsMinimum: S >= minSlope,
      minRequired: minSlope,
    },
    shearStress,
    isSelfCleaning: shearStress >= MIN_SHEAR_STRESS,
  };

  // Include validation results if there are warnings or errors (when not throwing)
  if (allWarnings.length > 0 || !throwOnError) {
    result.validation = { errors: allErrors, warnings: allWarnings };
  }

  return result;
}

/**
 * Find fill ratio (y/D) for given flow using Newton-Raphson iteration
 */
function findFillRatio(Q: number, D: number, n: number, S: number): number {
  // Initial guess based on full flow ratio
  const Afull = Math.PI * D * D / 4;
  const Rfull = D / 4;
  const Qfull = (1 / n) * Afull * Math.pow(Rfull, 2 / 3) * Math.pow(S, 0.5);
  let fillRatio = Math.min(0.5, Q / Qfull);

  // Newton-Raphson iteration
  for (let i = 0; i < 50; i++) {
    const theta = 2 * Math.acos(1 - 2 * fillRatio);
    const A = (D * D / 8) * (theta - Math.sin(theta));
    const P = D * theta / 2;
    const R = P > 0 ? A / P : 0;
    const Qcalc = (1 / n) * A * Math.pow(R, 2 / 3) * Math.pow(S, 0.5);

    const error = (Qcalc - Q) / Q;
    if (Math.abs(error) < 0.001) break;

    // Adjust fill ratio
    fillRatio *= Math.pow(Q / Qcalc, 0.4);
    fillRatio = Math.max(0.01, Math.min(0.99, fillRatio));
  }

  return fillRatio;
}

/**
 * Calculate full pipe capacity
 */
export function calculateFullCapacity(pipe: PipeProperties): {
  capacity: number; // L/s
  velocity: number; // m/s
} {
  const D = pipe.diameter / 1000;
  const n = MANNING_N[pipe.material].typical;
  const S = pipe.slope;

  const A = Math.PI * D * D / 4;
  const R = D / 4;
  const Q = (1 / n) * A * Math.pow(R, 2 / 3) * Math.pow(S, 0.5);
  const V = Q / A;

  return {
    capacity: Q * 1000,
    velocity: V,
  };
}

/**
 * Get minimum slope for pipe diameter
 */
export function getMinimumSlope(diameterMm: number): number {
  // Find closest standard diameter
  const diameters = Object.keys(MINIMUM_SLOPES).map(Number).sort((a, b) => a - b);
  let closest = diameters[0];

  for (const d of diameters) {
    if (d <= diameterMm) closest = d;
    else break;
  }

  return MINIMUM_SLOPES[closest] || 0.003;
}

/**
 * Size pipe for given flow requirements
 *
 * @throws {EngineeringValidationError} When validation fails and throwOnError is true
 */
export function sizePipe(
  flowRate: number, // L/s
  material: PipeMaterial,
  sewerType: 'storm' | 'sanitary' | 'combined',
  constraints?: {
    minSlope?: number;
    maxSlope?: number;
    maxDiameter?: number;
    minVelocity?: number;
    maxVelocity?: number;
  },
  options: { throwOnError?: boolean } = {}
): PipeSizingResult {
  const { throwOnError = true } = options;

  // Validate inputs
  const validation = validatePipeSizingInput(flowRate, material, sewerType);

  if (validation.errors.length > 0 && throwOnError) {
    throw new EngineeringValidationError(validation.errors[0]);
  }

  const warnings: string[] = [];
  const alternatives: PipeSizingResult['alternatives'] = [];

  // Add validation warnings to output
  validation.warnings.forEach(w => warnings.push(w.message));

  const diameters = sewerType === 'sanitary'
    ? STANDARD_DIAMETERS.sanitary
    : STANDARD_DIAMETERS.storm;

  const targetFill = FILL_RATIOS[sewerType].design;
  const velLimits = VELOCITY_LIMITS[sewerType];
  const minVel = constraints?.minVelocity ?? velLimits.min;
  const maxVel = constraints?.maxVelocity ?? velLimits.max;

  let recommendedDiameter = 0;
  let selectedResult: HydraulicResult | null = null;

  for (const diameter of diameters) {
    if (constraints?.maxDiameter && diameter > constraints.maxDiameter) continue;

    const minSlope = constraints?.minSlope ?? getMinimumSlope(diameter);
    const slope = Math.max(minSlope, constraints?.minSlope ?? 0);

    const pipe: PipeProperties = { material, diameter, slope };
    const result = calculateCircularPipeFlow(
      pipe,
      { flowRate, fillRatio: targetFill },
      sewerType,
      { throwOnError: false }
    );

    const isViable =
      result.velocity >= minVel &&
      result.velocity <= maxVel &&
      result.fillRatio <= FILL_RATIOS[sewerType].maxAllowed;

    alternatives.push({
      diameter,
      fillRatio: result.fillRatio,
      velocity: result.velocity,
      capacity: result.fullFlowCapacity,
      isViable,
    });

    if (isViable && recommendedDiameter === 0) {
      recommendedDiameter = diameter;
      selectedResult = result;
    }
  }

  if (recommendedDiameter === 0) {
    warnings.push('No standard diameter meets all criteria');
    // Use largest available
    recommendedDiameter = diameters[diameters.length - 1];
    const pipe: PipeProperties = {
      material,
      diameter: recommendedDiameter,
      slope: getMinimumSlope(recommendedDiameter),
    };
    selectedResult = calculateCircularPipeFlow(
      pipe,
      { flowRate },
      sewerType,
      { throwOnError: false }
    );
  }

  if (selectedResult && !selectedResult.velocityCheck.meetsMinimum) {
    warnings.push(`Velocity ${selectedResult.velocity.toFixed(2)} m/s below minimum ${minVel} m/s - risk of sedimentation`);
  }

  if (selectedResult && !selectedResult.isSelfCleaning) {
    warnings.push('Shear stress below self-cleaning threshold - consider steeper slope');
  }

  return {
    recommendedDiameter,
    alternatives,
    selectedResult: selectedResult!,
    warnings,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert slope formats
 */
export function convertSlope(value: number, from: 'percent' | 'permille' | 'ratio', to: 'percent' | 'permille' | 'ratio'): number {
  // First convert to ratio
  let ratio: number;
  switch (from) {
    case 'percent': ratio = value / 100; break;
    case 'permille': ratio = value / 1000; break;
    case 'ratio': ratio = value; break;
  }

  // Then convert to target
  switch (to) {
    case 'percent': return ratio * 100;
    case 'permille': return ratio * 1000;
    case 'ratio': return ratio;
  }
}

/**
 * Calculate required slope for minimum velocity
 */
export function calculateRequiredSlope(
  diameter: number, // mm
  material: PipeMaterial,
  targetVelocity: number = 0.6, // m/s
  fillRatio: number = 0.5
): number {
  const D = diameter / 1000;
  const n = MANNING_N[material].typical;

  const theta = 2 * Math.acos(1 - 2 * fillRatio);
  const A = (D * D / 8) * (theta - Math.sin(theta));
  const P = D * theta / 2;
  const R = A / P;

  // V = (1/n) × R^(2/3) × S^(1/2)
  // S = (V × n / R^(2/3))²
  const S = Math.pow(targetVelocity * n / Math.pow(R, 2 / 3), 2);

  return S;
}

/**
 * Calculate travel time through pipe
 */
export function calculateTravelTime(
  pipeLength: number, // m
  velocity: number // m/s
): number {
  return pipeLength / velocity / 60; // minutes
}

/**
 * Calculate head loss in pipe (friction + minor losses)
 */
export function calculateHeadLoss(
  pipe: PipeProperties,
  flow: FlowConditions,
  minorLossCoeff: number = 0.5 // K factor for bends, junctions, etc.
): {
  frictionLoss: number; // m
  minorLoss: number; // m
  totalLoss: number; // m
  energyGradient: number; // m/m
} {
  const result = calculateCircularPipeFlow(pipe, flow);
  const L = pipe.length ?? 100;

  // Friction loss (using slope as energy gradient for uniform flow)
  const frictionLoss = pipe.slope * L;

  // Minor losses: hm = K × V²/2g
  const minorLoss = minorLossCoeff * result.velocity * result.velocity / (2 * 9.81);

  return {
    frictionLoss,
    minorLoss,
    totalLoss: frictionLoss + minorLoss,
    energyGradient: pipe.slope,
  };
}

/**
 * Check if pipe can handle surge/backwater
 */
export function checkSurchargeCapacity(
  pipe: PipeProperties,
  peakFlow: number, // L/s
  surchargeHead: number = 0.5 // m of head above crown
): {
  canHandle: boolean;
  pressureFlow: number; // L/s under pressure
  surchargeVelocity: number; // m/s
} {
  const D = pipe.diameter / 1000;
  const L = pipe.length ?? 100;
  const n = MANNING_N[pipe.material].typical;

  // Pressure flow using Darcy-Weisbach approximation
  const f = 0.02; // Friction factor (approximate)
  const totalHead = pipe.slope * L + surchargeHead;

  // hf = f × L/D × V²/2g
  // V = √(2g × hf × D / (f × L))
  const V = Math.sqrt(2 * 9.81 * totalHead * D / (f * L));
  const A = Math.PI * D * D / 4;
  const Q = V * A * 1000; // L/s

  return {
    canHandle: Q >= peakFlow,
    pressureFlow: Q,
    surchargeVelocity: V,
  };
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format hydraulic result for display
 */
export function formatHydraulicResult(result: HydraulicResult): string {
  const lines = [
    '=== RESULTADO HIDRÁULICO ===',
    '',
    '--- FLUJO ---',
    `Caudal: ${result.flowRate.toFixed(1)} L/s`,
    `Velocidad: ${result.velocity.toFixed(2)} m/s`,
    `Profundidad: ${(result.flowDepth * 100).toFixed(1)} cm`,
    `Llenado (y/D): ${(result.fillRatio * 100).toFixed(0)}%`,
    '',
    '--- GEOMETRÍA ---',
    `Área flujo: ${(result.flowArea * 10000).toFixed(1)} cm²`,
    `Perímetro mojado: ${(result.wettedPerimeter * 100).toFixed(1)} cm`,
    `Radio hidráulico: ${(result.hydraulicRadius * 100).toFixed(2)} cm`,
    '',
    '--- CAPACIDAD ---',
    `Capacidad lleno: ${result.fullFlowCapacity.toFixed(1)} L/s`,
    `% Capacidad usado: ${result.percentCapacity.toFixed(0)}%`,
    '',
    '--- RÉGIMEN ---',
    `Número Froude: ${result.froudeNumber.toFixed(2)}`,
    `Régimen: ${result.flowRegime}`,
    '',
    '--- VERIFICACIÓN ---',
    `Velocidad mínima: ${result.velocityCheck.meetsMinimum ? '✓' : '✗'} (${result.velocityCheck.minRequired} m/s)`,
    `Velocidad máxima: ${result.velocityCheck.meetsMaximum ? '✓' : '✗'} (${result.velocityCheck.maxAllowed} m/s)`,
    `Pendiente mínima: ${result.slopeCheck.meetsMinimum ? '✓' : '✗'} (${(result.slopeCheck.minRequired * 100).toFixed(2)}%)`,
    `Auto-limpieza: ${result.isSelfCleaning ? '✓' : '✗'} (τ=${result.shearStress.toFixed(2)} Pa)`,
  ];

  return lines.join('\n');
}
