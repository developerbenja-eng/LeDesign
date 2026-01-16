/**
 * AASHTO 93 Flexible Pavement Design
 *
 * Implementation of the AASHTO Guide for Design of Pavement Structures (1993)
 * for flexible (asphalt) pavements using the Structural Number (SN) method.
 *
 * Reference: AASHTO Guide for Design of Pavement Structures, 1993
 *
 * @module pavement/aashto-flexible
 */

import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  EngineeringValidationError,
  validateNumber,
  validateESAL,
  validateReliability,
  validateResilientModulus,
  validateStructuralNumber,
  createValidator,
  safeDivide,
  safePow,
  safeLog,
} from '../validation';

// ============================================================================
// Types
// ============================================================================

export interface FlexiblePavementInput {
  /** Design ESALs (18-kip equivalent single axle loads) */
  W18: number;
  /** Reliability (%) - typically 75-99.9 */
  reliability: number;
  /** Overall standard deviation - typically 0.40-0.50 */
  standardDeviation: number;
  /** Initial serviceability - typically 4.2-4.5 */
  serviceabilityInitial: number;
  /** Terminal serviceability - typically 2.0-2.5 */
  serviceabilityTerminal: number;
  /** Resilient modulus of subgrade (psi) */
  subgradeMr: number;
}

export interface LayerCoefficients {
  /** Surface layer structural coefficient (a1) */
  a1: number;
  /** Base layer structural coefficient (a2) */
  a2: number;
  /** Subbase layer structural coefficient (a3) */
  a3: number;
  /** Base drainage coefficient (m2) - 0.4-1.4 */
  m2: number;
  /** Subbase drainage coefficient (m3) - 0.4-1.4 */
  m3: number;
}

export interface PavementLayerResult {
  /** Layer name */
  name: string;
  /** Layer thickness in inches (for AASHTO calculation) */
  thickness: number;
  /** Layer thickness in centimeters (for Chilean display) */
  thicknessCm: number;
  /** Material description */
  material: string;
  /** Structural coefficient */
  coefficient: number;
  /** Drainage coefficient (for base/subbase) */
  drainageCoeff?: number;
  /** Layer contribution to Structural Number */
  contribution: number;
}

export interface FlexiblePavementResult {
  /** Required Structural Number */
  SN: number;
  /** Provided Structural Number */
  SNprovided: number;
  /** Designed pavement layers */
  layers: PavementLayerResult[];
  /** Whether design is adequate (SNprovided >= SN) */
  adequate: boolean;
  /** Serviceability loss (ΔPSI) */
  deltaServiceability: number;
  /** Design reliability used */
  reliability: number;
  /** Subgrade resilient modulus used */
  subgradeMr: number;
  /** Warnings or notes */
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Layer structural coefficients for Chilean materials
 * Based on MOP Manual de Carreteras Vol. 3 and AASHTO recommendations
 */
export const LAYER_COEFFICIENTS_CHILE: Record<string, number> = {
  // Surface layers
  asphalt_concrete: 0.44, // Concreto asfáltico denso
  asphalt_concrete_modified: 0.46, // CA modificado con polímeros
  stone_mastic_asphalt: 0.45, // SMA
  open_graded_friction: 0.30, // OGFC (drenante)

  // Base layers
  asphalt_treated_base: 0.34, // Base tratada con asfalto
  cement_treated_base: 0.23, // Base tratada con cemento
  crushed_stone_base: 0.14, // Base granular triturada CBR>80
  granular_base_high: 0.13, // Base granular CBR>60
  granular_base_std: 0.12, // Base granular estándar

  // Subbase layers
  granular_subbase: 0.11, // Subbase granular CBR>40
  sandy_gravel: 0.09, // Grava arenosa
  stabilized_subbase: 0.10, // Subbase estabilizada
  lime_treated: 0.08, // Tratamiento con cal
};

/**
 * Drainage coefficients by drainage quality
 * AASHTO Table 2.4
 */
export const DRAINAGE_COEFFICIENTS: Record<
  string,
  { m2: number; m3: number; description: string }
> = {
  excellent: {
    m2: 1.4,
    m3: 1.4,
    description: 'Water removed within 2 hours',
  },
  good: {
    m2: 1.2,
    m3: 1.2,
    description: 'Water removed within 1 day',
  },
  fair: {
    m2: 1.0,
    m3: 1.0,
    description: 'Water removed within 1 week',
  },
  poor: {
    m2: 0.8,
    m3: 0.8,
    description: 'Water removed within 1 month',
  },
  very_poor: {
    m2: 0.6,
    m3: 0.6,
    description: 'Water does not drain',
  },
};

/**
 * Standard normal deviate (Zr) by reliability level
 * AASHTO Table 4.2
 */
export const RELIABILITY_ZR: Record<number, number> = {
  50: 0.0,
  60: -0.253,
  70: -0.524,
  75: -0.674,
  80: -0.841,
  85: -1.037,
  90: -1.282,
  91: -1.34,
  92: -1.405,
  93: -1.476,
  94: -1.555,
  95: -1.645,
  96: -1.751,
  97: -1.881,
  98: -2.054,
  99: -2.327,
  99.9: -3.09,
};

/**
 * Recommended reliability levels by road classification
 * Based on AASHTO recommendations and Chilean practice
 */
export const RECOMMENDED_RELIABILITY: Record<string, number> = {
  express: 99,
  trunk: 95,
  collector: 90,
  service: 85,
  local: 80,
  passage: 75,
};

/**
 * Minimum layer thicknesses (inches) by ESAL level
 * AASHTO Table 11.1
 */
export const MINIMUM_THICKNESSES: Record<
  string,
  { asphalt: number; base: number }
> = {
  under_50k: { asphalt: 1.0, base: 4.0 },
  '50k_150k': { asphalt: 2.0, base: 4.0 },
  '150k_500k': { asphalt: 2.5, base: 4.0 },
  '500k_2M': { asphalt: 3.0, base: 6.0 },
  '2M_7M': { asphalt: 3.5, base: 6.0 },
  over_7M: { asphalt: 4.0, base: 6.0 },
};

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validates flexible pavement design input
 */
export function validateFlexiblePavementInput(
  input: FlexiblePavementInput
): ValidationResult<FlexiblePavementInput> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate ESAL
  const esalError = validateESAL(input.W18, 'W18 (ESAL)');
  if (esalError) errors.push(esalError);

  // Validate reliability
  const relError = validateReliability(input.reliability, 'reliability');
  if (relError) errors.push(relError);

  // Validate standard deviation
  const soError = validateNumber(input.standardDeviation, 'standardDeviation (So)', {
    positive: true,
    min: 0.2,
    max: 0.7,
  });
  if (soError) errors.push(soError);
  else if (input.standardDeviation < 0.35 || input.standardDeviation > 0.50) {
    warnings.push({
      field: 'standardDeviation',
      message: `So = ${input.standardDeviation} está fuera del rango típico (0.35 - 0.50)`,
      recommendation: 'Para pavimentos flexibles nuevos, So típico es 0.40 - 0.50',
    });
  }

  // Validate serviceability
  const piError = validateNumber(input.serviceabilityInitial, 'serviceabilityInitial (pi)', {
    min: 3.5,
    max: 5.0,
  });
  if (piError) errors.push(piError);

  const ptError = validateNumber(input.serviceabilityTerminal, 'serviceabilityTerminal (pt)', {
    min: 1.0,
    max: 3.5,
  });
  if (ptError) errors.push(ptError);

  // Check serviceability relationship
  if (!piError && !ptError) {
    if (input.serviceabilityInitial <= input.serviceabilityTerminal) {
      errors.push({
        code: 'CONSTRAINT_VIOLATION',
        field: 'serviceability',
        message: `La serviciabilidad inicial (${input.serviceabilityInitial}) debe ser mayor que la terminal (${input.serviceabilityTerminal})`,
        value: { pi: input.serviceabilityInitial, pt: input.serviceabilityTerminal },
      });
    }

    const deltaPSI = input.serviceabilityInitial - input.serviceabilityTerminal;
    if (deltaPSI < 1.0) {
      warnings.push({
        field: 'serviceability',
        message: `ΔPSI = ${deltaPSI.toFixed(2)} es bajo`,
        recommendation: 'ΔPSI típico es 1.7 - 2.2',
      });
    }
  }

  // Validate subgrade modulus
  const mrError = validateResilientModulus(input.subgradeMr, 'subgradeMr', { unit: 'psi' });
  if (mrError) errors.push(mrError);

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? input : undefined,
    errors,
    warnings,
  };
}

/**
 * Validates layer coefficients
 */
export function validateLayerCoefficients(
  coefficients: LayerCoefficients
): ValidationResult<LayerCoefficients> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate structural coefficients
  const a1Error = validateNumber(coefficients.a1, 'a1 (surface coefficient)', {
    positive: true,
    min: 0.20,
    max: 0.55,
  });
  if (a1Error) errors.push(a1Error);

  const a2Error = validateNumber(coefficients.a2, 'a2 (base coefficient)', {
    positive: true,
    min: 0.05,
    max: 0.40,
  });
  if (a2Error) errors.push(a2Error);

  const a3Error = validateNumber(coefficients.a3, 'a3 (subbase coefficient)', {
    positive: true,
    min: 0.03,
    max: 0.20,
  });
  if (a3Error) errors.push(a3Error);

  // Validate drainage coefficients
  const m2Error = validateNumber(coefficients.m2, 'm2 (base drainage)', {
    min: 0.4,
    max: 1.5,
  });
  if (m2Error) errors.push(m2Error);

  const m3Error = validateNumber(coefficients.m3, 'm3 (subbase drainage)', {
    min: 0.4,
    max: 1.5,
  });
  if (m3Error) errors.push(m3Error);

  // Check coefficient relationships
  if (!a1Error && !a2Error && !a3Error) {
    if (coefficients.a1 < coefficients.a2) {
      warnings.push({
        field: 'a1',
        message: 'a1 < a2: El coeficiente de superficie es menor que el de base',
        recommendation: 'Típicamente a1 > a2 > a3',
      });
    }
    if (coefficients.a2 < coefficients.a3) {
      warnings.push({
        field: 'a2',
        message: 'a2 < a3: El coeficiente de base es menor que el de subbase',
        recommendation: 'Típicamente a1 > a2 > a3',
      });
    }
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? coefficients : undefined,
    errors,
    warnings,
  };
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Get Zr value for given reliability, interpolating if needed
 */
function getZr(reliability: number): number {
  // Direct lookup
  if (RELIABILITY_ZR[reliability] !== undefined) {
    return RELIABILITY_ZR[reliability];
  }

  // Interpolation for values not in table
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

  // Default for out of range
  if (reliability < 50) return 0;
  return -3.09;
}

/**
 * Get minimum thickness category based on ESALs
 */
function getThicknessCategory(W18: number): string {
  if (W18 < 50000) return 'under_50k';
  if (W18 < 150000) return '50k_150k';
  if (W18 < 500000) return '150k_500k';
  if (W18 < 2000000) return '500k_2M';
  if (W18 < 7000000) return '2M_7M';
  return 'over_7M';
}

/**
 * Calculate required Structural Number using AASHTO 93 equation
 *
 * The AASHTO flexible pavement design equation:
 * log10(W18) = Zr × So + 9.36 × log10(SN+1) - 0.20
 *            + log10(ΔPSI/(4.2-1.5)) / (0.40 + 1094/(SN+1)^5.19)
 *            + 2.32 × log10(Mr) - 8.07
 *
 * @param input Design inputs
 * @returns Required Structural Number
 * @throws {EngineeringValidationError} If inputs are invalid
 */
export function calculateStructuralNumber(input: FlexiblePavementInput): number {
  // Validate inputs first
  const validation = validateFlexiblePavementInput(input);
  if (!validation.success) {
    throw new EngineeringValidationError(validation.errors[0]);
  }

  const { W18, reliability, standardDeviation, serviceabilityInitial, serviceabilityTerminal, subgradeMr } = input;

  const Zr = getZr(reliability);
  const So = standardDeviation;
  const deltaPSI = serviceabilityInitial - serviceabilityTerminal;

  // Safe logarithm calculations (base 10 for AASHTO equation)
  const logW18 = safeLog(W18, 10);
  const logMr = safeLog(subgradeMr, 10);

  // Check deltaPSI validity for logarithm
  const deltaPSIRatio = deltaPSI / (4.2 - 1.5);
  if (deltaPSIRatio <= 0) {
    throw new EngineeringValidationError({
      code: 'PHYSICAL_IMPOSSIBILITY',
      field: 'deltaPSI',
      message: `ΔPSI/(4.2-1.5) = ${deltaPSIRatio.toFixed(4)} debe ser positivo para el cálculo`,
      value: deltaPSI,
    });
  }

  // Solve iteratively for SN
  // Starting estimate
  let SN = 3.0;
  const maxIterations = 100;
  const tolerance = 0.001;
  let converged = false;

  for (let i = 0; i < maxIterations; i++) {
    // Calculate right side of equation with safe operations
    const term1 = Zr * So;
    const term2 = 9.36 * Math.log10(SN + 1) - 0.2;
    const term3Num = Math.log10(deltaPSIRatio);
    const term3Den = 0.4 + safeDivide(1094, safePow(SN + 1, 5.19));
    const term3 = safeDivide(term3Num, term3Den);
    const term4 = 2.32 * logMr - 8.07;

    const calculatedLogW18 = term1 + term2 + term3 + term4;
    const error = logW18 - calculatedLogW18;

    if (Math.abs(error) < tolerance) {
      converged = true;
      break;
    }

    // Adjust SN based on error
    // If error positive, need larger SN
    SN += error * 0.5;
    SN = Math.max(1, Math.min(SN, 15)); // Bound SN
  }

  if (!converged) {
    throw new EngineeringValidationError({
      code: 'CONVERGENCE_FAILURE',
      field: 'SN',
      message: `El cálculo del SN no convergió después de ${maxIterations} iteraciones. Verifique los parámetros de entrada.`,
      value: SN,
    });
  }

  return Math.round(SN * 100) / 100;
}

/**
 * Calculate layer thicknesses to provide required SN
 *
 * Uses the layer analysis approach:
 * SN = a1×D1 + a2×m2×D2 + a3×m3×D3
 *
 * Where:
 * - a1, a2, a3 = layer coefficients
 * - D1, D2, D3 = layer thicknesses (inches)
 * - m2, m3 = drainage coefficients
 *
 * @param SN Required structural number
 * @param coefficients Layer and drainage coefficients
 * @param W18 Design ESALs (for minimum thickness)
 * @returns Designed layer thicknesses
 */
export function calculateMinimumThickness(
  SN: number,
  coefficients: LayerCoefficients,
  W18: number = 1000000
): PavementLayerResult[] {
  const { a1, a2, a3, m2, m3 } = coefficients;

  // Get minimum thicknesses based on traffic
  const category = getThicknessCategory(W18);
  const minThick = MINIMUM_THICKNESSES[category];

  // Start with minimum surface thickness
  let D1 = minThick.asphalt;
  const SN1 = a1 * D1;

  // Remaining SN to be provided by base and subbase
  let SNremaining = SN - SN1;

  // If surface alone is sufficient
  if (SNremaining <= 0) {
    return [
      {
        name: 'Surface',
        thickness: D1,
        thicknessCm: D1 * 2.54,
        material: 'Asphalt Concrete',
        coefficient: a1,
        contribution: SN1,
      },
    ];
  }

  // Calculate base thickness
  // Start with minimum, increase if needed
  let D2 = minThick.base;
  let SN2 = a2 * m2 * D2;

  // Check if more base is needed before adding subbase
  const SN1_SN2 = SN1 + SN2;
  SNremaining = SN - SN1_SN2;

  // Calculate subbase thickness
  let D3 = 0;
  let SN3 = 0;

  if (SNremaining > 0) {
    // Need subbase
    D3 = SNremaining / (a3 * m3);
    D3 = Math.ceil(D3); // Round up to whole inch
    SN3 = a3 * m3 * D3;
  }

  // If still not enough, increase base
  const SNprovided = SN1 + SN2 + SN3;
  if (SNprovided < SN) {
    const deficit = SN - SNprovided;
    const additionalBase = deficit / (a2 * m2);
    D2 += Math.ceil(additionalBase);
    SN2 = a2 * m2 * D2;
  }

  // Build result
  const layers: PavementLayerResult[] = [
    {
      name: 'Surface',
      thickness: D1,
      thicknessCm: Math.round(D1 * 2.54 * 10) / 10,
      material: 'Asphalt Concrete',
      coefficient: a1,
      contribution: Math.round(SN1 * 100) / 100,
    },
    {
      name: 'Base',
      thickness: D2,
      thicknessCm: Math.round(D2 * 2.54 * 10) / 10,
      material: 'Crushed Stone Base',
      coefficient: a2,
      drainageCoeff: m2,
      contribution: Math.round(SN2 * 100) / 100,
    },
  ];

  if (D3 > 0) {
    layers.push({
      name: 'Subbase',
      thickness: D3,
      thicknessCm: Math.round(D3 * 2.54 * 10) / 10,
      material: 'Granular Subbase',
      coefficient: a3,
      drainageCoeff: m3,
      contribution: Math.round(SN3 * 100) / 100,
    });
  }

  return layers;
}

/**
 * Design complete flexible pavement structure
 *
 * @param input Design inputs
 * @param coefficients Layer and drainage coefficients
 * @param options Additional options
 * @returns Complete pavement design result
 * @throws {EngineeringValidationError} If inputs are invalid and throwOnError is true
 */
export function designFlexiblePavement(
  input: FlexiblePavementInput,
  coefficients: LayerCoefficients,
  options: { throwOnError?: boolean } = {}
): FlexiblePavementResult {
  const { throwOnError = false } = options;
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate inputs
  const inputValidation = validateFlexiblePavementInput(input);
  if (!inputValidation.success) {
    if (throwOnError) {
      throw new EngineeringValidationError(inputValidation.errors[0]);
    }
    errors.push(...inputValidation.errors.map(e => e.message));
  }

  // Add warnings from input validation
  warnings.push(...inputValidation.warnings.map(w => w.message));

  // Validate coefficients
  const coeffValidation = validateLayerCoefficients(coefficients);
  if (!coeffValidation.success) {
    if (throwOnError) {
      throw new EngineeringValidationError(coeffValidation.errors[0]);
    }
    errors.push(...coeffValidation.errors.map(e => e.message));
  }

  // Add warnings from coefficient validation
  warnings.push(...coeffValidation.warnings.map(w => w.message));

  // If we have validation errors and not throwing, return early with error info
  if (errors.length > 0 && !throwOnError) {
    return {
      SN: 0,
      SNprovided: 0,
      layers: [],
      adequate: false,
      deltaServiceability: 0,
      reliability: input.reliability,
      subgradeMr: input.subgradeMr,
      warnings: [...errors, ...warnings],
    };
  }

  // Calculate required SN (this will throw if there are convergence issues)
  let SN: number;
  try {
    SN = calculateStructuralNumber(input);
  } catch (error) {
    if (throwOnError) throw error;
    const message = error instanceof Error ? error.message : 'Error en cálculo de SN';
    return {
      SN: 0,
      SNprovided: 0,
      layers: [],
      adequate: false,
      deltaServiceability: 0,
      reliability: input.reliability,
      subgradeMr: input.subgradeMr,
      warnings: [message, ...warnings],
    };
  }

  // Validate calculated SN
  const snValidation = validateStructuralNumber(SN, 'SN calculado');
  if (snValidation) {
    warnings.push(snValidation.message);
  }

  // Design layer thicknesses
  const layers = calculateMinimumThickness(SN, coefficients, input.W18);

  // Calculate provided SN
  const SNprovided = layers.reduce((sum, layer) => sum + layer.contribution, 0);

  // Check adequacy
  const adequate = SNprovided >= SN;

  if (!adequate) {
    warnings.push(
      `SN proporcionado (${SNprovided.toFixed(2)}) es menor que el requerido (${SN.toFixed(2)})`
    );
  }

  // Check layer thicknesses against practical limits
  const totalThicknessCm = layers.reduce((sum, l) => sum + l.thicknessCm, 0);
  if (totalThicknessCm > 80) {
    warnings.push(
      'Espesor total del pavimento excede 80 cm - considere mejoramiento de subrasante'
    );
  }

  if (totalThicknessCm > 100) {
    warnings.push(
      'Espesor total > 100 cm indica subrasante muy débil. Evalúe: estabilización, geotextiles, o alternativas de diseño.'
    );
  }

  // Check minimum surface thickness
  const surfaceLayer = layers.find(l => l.name === 'Surface');
  if (surfaceLayer && surfaceLayer.thicknessCm < 5) {
    warnings.push(
      'Espesor de capa asfáltica < 5 cm puede tener problemas de durabilidad'
    );
  }

  return {
    SN,
    SNprovided: Math.round(SNprovided * 100) / 100,
    layers,
    adequate,
    deltaServiceability: input.serviceabilityInitial - input.serviceabilityTerminal,
    reliability: input.reliability,
    subgradeMr: input.subgradeMr,
    warnings,
  };
}

/**
 * Calculate layer coefficient from resilient modulus
 *
 * For asphalt concrete (surface):
 * a1 = 0.40 × (EAC / 450000)^0.33
 *
 * For granular base:
 * a2 = 0.249 × log10(EBS) - 0.977
 *
 * For granular subbase:
 * a3 = 0.227 × log10(ESB) - 0.839
 *
 * @param modulusPsi Layer resilient modulus in psi
 * @param layerType Type of layer
 * @returns Structural coefficient
 * @throws {EngineeringValidationError} If modulus is invalid
 */
export function calculateLayerCoefficient(
  modulusPsi: number,
  layerType: 'asphalt' | 'base' | 'subbase'
): number {
  // Validate modulus
  const modulusError = validateNumber(modulusPsi, 'modulusPsi', { positive: true });
  if (modulusError) {
    throw new EngineeringValidationError(modulusError);
  }

  // Validate ranges by layer type
  const ranges: Record<string, { min: number; max: number; typical: string }> = {
    asphalt: { min: 100000, max: 1000000, typical: '350,000-450,000 psi' },
    base: { min: 5000, max: 100000, typical: '15,000-40,000 psi' },
    subbase: { min: 3000, max: 50000, typical: '10,000-25,000 psi' },
  };

  const range = ranges[layerType];
  if (range && (modulusPsi < range.min || modulusPsi > range.max)) {
    // This is a warning, not an error - we'll still calculate
    console.warn(
      `Módulo resiliente ${modulusPsi} psi está fuera del rango típico para ${layerType}: ${range.typical}`
    );
  }

  let coefficient: number;

  switch (layerType) {
    case 'asphalt':
      // EAC typically 350,000-450,000 psi
      coefficient = 0.4 * safePow(modulusPsi / 450000, 0.33);
      break;

    case 'base':
      // EBS typically 15,000-40,000 psi
      coefficient = 0.249 * safeLog(modulusPsi, 10) - 0.977;
      break;

    case 'subbase':
      // ESB typically 10,000-25,000 psi
      coefficient = 0.227 * safeLog(modulusPsi, 10) - 0.839;
      break;

    default:
      throw new EngineeringValidationError({
        code: 'INVALID_INPUT',
        field: 'layerType',
        message: `Tipo de capa inválido: ${layerType}. Debe ser 'asphalt', 'base', o 'subbase'`,
        value: layerType,
      });
  }

  // Ensure coefficient is in valid range
  if (coefficient <= 0) {
    throw new EngineeringValidationError({
      code: 'PHYSICAL_IMPOSSIBILITY',
      field: 'coefficient',
      message: `Coeficiente calculado (${coefficient.toFixed(4)}) es no positivo. El módulo resiliente puede ser demasiado bajo.`,
      value: coefficient,
    });
  }

  return Math.round(coefficient * 1000) / 1000;
}

/**
 * Get default layer coefficients for Chilean standard materials
 *
 * @param surfaceMaterial Surface material type
 * @param baseMaterial Base material type
 * @param subbaseMaterial Subbase material type
 * @param drainageQuality Drainage quality rating
 * @returns Layer coefficients
 */
export function getDefaultCoefficients(
  surfaceMaterial: string = 'asphalt_concrete',
  baseMaterial: string = 'crushed_stone_base',
  subbaseMaterial: string = 'granular_subbase',
  drainageQuality: string = 'fair'
): LayerCoefficients {
  const a1 = LAYER_COEFFICIENTS_CHILE[surfaceMaterial] || 0.44;
  const a2 = LAYER_COEFFICIENTS_CHILE[baseMaterial] || 0.14;
  const a3 = LAYER_COEFFICIENTS_CHILE[subbaseMaterial] || 0.11;

  const drainage = DRAINAGE_COEFFICIENTS[drainageQuality] ||
    DRAINAGE_COEFFICIENTS.fair;

  return {
    a1,
    a2,
    a3,
    m2: drainage.m2,
    m3: drainage.m3,
  };
}

/**
 * Format pavement design result for display
 *
 * @param result Pavement design result
 * @returns Formatted string
 */
export function formatFlexiblePavementResult(
  result: FlexiblePavementResult
): string {
  const lines: string[] = [
    '=== AASHTO 93 Flexible Pavement Design ===',
    '',
    `Required SN: ${result.SN.toFixed(2)}`,
    `Provided SN: ${result.SNprovided.toFixed(2)}`,
    `Status: ${result.adequate ? 'ADEQUATE' : 'INADEQUATE'}`,
    '',
    'Pavement Structure:',
  ];

  let totalCm = 0;
  for (const layer of result.layers) {
    lines.push(
      `  ${layer.name}: ${layer.thicknessCm.toFixed(1)} cm (${layer.material})`
    );
    lines.push(`    Contribution to SN: ${layer.contribution.toFixed(2)}`);
    totalCm += layer.thicknessCm;
  }

  lines.push('');
  lines.push(`Total Thickness: ${totalCm.toFixed(1)} cm`);

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join('\n');
}
