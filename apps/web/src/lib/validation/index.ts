/**
 * Engineering Validation Framework
 *
 * Comprehensive validation utilities for engineering calculations.
 * Provides input validation, error handling, and user-friendly messages.
 */

// ============================================================
// ERROR TYPES
// ============================================================

export type ValidationErrorCode =
  | 'INVALID_INPUT'
  | 'OUT_OF_RANGE'
  | 'NEGATIVE_VALUE'
  | 'ZERO_VALUE'
  | 'NAN_VALUE'
  | 'INFINITY_VALUE'
  | 'DIVISION_BY_ZERO'
  | 'PHYSICAL_IMPOSSIBILITY'
  | 'MISSING_REQUIRED'
  | 'INVALID_TYPE'
  | 'INVALID_UNIT'
  | 'ARRAY_EMPTY'
  | 'ARRAY_TOO_SHORT'
  | 'CONSTRAINT_VIOLATION'
  | 'GEOMETRY_ERROR'
  | 'CONVERGENCE_FAILURE';

export interface ValidationError {
  code: ValidationErrorCode;
  field: string;
  message: string;
  value?: unknown;
  constraint?: {
    min?: number;
    max?: number;
    expected?: unknown;
  };
}

export class EngineeringValidationError extends Error {
  public readonly code: ValidationErrorCode;
  public readonly field: string;
  public readonly value?: unknown;
  public readonly constraint?: { min?: number; max?: number; expected?: unknown };

  constructor(error: ValidationError) {
    super(error.message);
    this.name = 'EngineeringValidationError';
    this.code = error.code;
    this.field = error.field;
    this.value = error.value;
    this.constraint = error.constraint;
  }
}

// ============================================================
// VALIDATION RESULT TYPE
// ============================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation?: string;
}

// ============================================================
// NUMBER VALIDATORS
// ============================================================

/**
 * Validates that a value is a finite number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Validates that a number is positive (> 0)
 */
export function isPositive(value: number): boolean {
  return isValidNumber(value) && value > 0;
}

/**
 * Validates that a number is non-negative (>= 0)
 */
export function isNonNegative(value: number): boolean {
  return isValidNumber(value) && value >= 0;
}

/**
 * Validates that a number is within a range (inclusive)
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return isValidNumber(value) && value >= min && value <= max;
}

/**
 * Validates a number and returns detailed error if invalid
 */
export function validateNumber(
  value: unknown,
  field: string,
  options: {
    required?: boolean;
    positive?: boolean;
    nonNegative?: boolean;
    min?: number;
    max?: number;
    notZero?: boolean;
  } = {}
): ValidationError | null {
  const { required = true, positive, nonNegative, min, max, notZero } = options;

  // Check if value exists
  if (value === undefined || value === null) {
    if (required) {
      return {
        code: 'MISSING_REQUIRED',
        field,
        message: `El campo "${field}" es requerido`,
      };
    }
    return null;
  }

  // Check if it's a number
  if (typeof value !== 'number') {
    return {
      code: 'INVALID_TYPE',
      field,
      message: `El campo "${field}" debe ser un número`,
      value,
    };
  }

  // Check for NaN
  if (isNaN(value)) {
    return {
      code: 'NAN_VALUE',
      field,
      message: `El campo "${field}" tiene un valor inválido (NaN)`,
      value,
    };
  }

  // Check for Infinity
  if (!isFinite(value)) {
    return {
      code: 'INFINITY_VALUE',
      field,
      message: `El campo "${field}" tiene un valor infinito`,
      value,
    };
  }

  // Check for zero
  if (notZero && value === 0) {
    return {
      code: 'ZERO_VALUE',
      field,
      message: `El campo "${field}" no puede ser cero`,
      value,
    };
  }

  // Check for positive
  if (positive && value <= 0) {
    return {
      code: 'NEGATIVE_VALUE',
      field,
      message: `El campo "${field}" debe ser positivo (> 0), valor recibido: ${value}`,
      value,
      constraint: { min: 0 },
    };
  }

  // Check for non-negative
  if (nonNegative && value < 0) {
    return {
      code: 'NEGATIVE_VALUE',
      field,
      message: `El campo "${field}" no puede ser negativo, valor recibido: ${value}`,
      value,
      constraint: { min: 0 },
    };
  }

  // Check range
  if (min !== undefined && value < min) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El campo "${field}" debe ser mayor o igual a ${min}, valor recibido: ${value}`,
      value,
      constraint: { min },
    };
  }

  if (max !== undefined && value > max) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El campo "${field}" debe ser menor o igual a ${max}, valor recibido: ${value}`,
      value,
      constraint: { max },
    };
  }

  return null;
}

// ============================================================
// ENGINEERING-SPECIFIC VALIDATORS
// ============================================================

/**
 * Validates flow rate (caudal)
 * @param Q - Flow rate in m³/s or L/s
 */
export function validateFlowRate(Q: unknown, field: string = 'Q'): ValidationError | null {
  const error = validateNumber(Q, field, { positive: true });
  if (error) return error;

  // Physical constraint: typical range for civil engineering
  if ((Q as number) > 100000) {
    return {
      code: 'PHYSICAL_IMPOSSIBILITY',
      field,
      message: `El caudal ${field} = ${Q} m³/s parece excesivamente alto. Verifique las unidades.`,
      value: Q,
      constraint: { max: 100000 },
    };
  }

  return null;
}

/**
 * Validates velocity
 * @param V - Velocity in m/s
 */
export function validateVelocity(
  V: unknown,
  field: string = 'V',
  options: { maxVelocity?: number } = {}
): ValidationError | null {
  const { maxVelocity = 20 } = options;

  const error = validateNumber(V, field, { nonNegative: true });
  if (error) return error;

  if ((V as number) > maxVelocity) {
    return {
      code: 'PHYSICAL_IMPOSSIBILITY',
      field,
      message: `La velocidad ${field} = ${V} m/s excede el máximo típico de ${maxVelocity} m/s`,
      value: V,
      constraint: { max: maxVelocity },
    };
  }

  return null;
}

/**
 * Validates slope/gradient
 * @param S - Slope (dimensionless or percentage)
 * @param isPercentage - If true, expects percentage (0-100+)
 */
export function validateSlope(
  S: unknown,
  field: string = 'S',
  options: { isPercentage?: boolean; maxSlope?: number } = {}
): ValidationError | null {
  const { isPercentage = false, maxSlope = isPercentage ? 100 : 1 } = options;

  const error = validateNumber(S, field, { nonNegative: true });
  if (error) return error;

  if ((S as number) > maxSlope) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `La pendiente ${field} = ${S}${isPercentage ? '%' : ''} excede el máximo de ${maxSlope}${isPercentage ? '%' : ''}`,
      value: S,
      constraint: { max: maxSlope },
    };
  }

  return null;
}

/**
 * Validates diameter
 * @param D - Diameter in mm or m
 */
export function validateDiameter(
  D: unknown,
  field: string = 'D',
  options: { unit?: 'mm' | 'm'; minDiameter?: number; maxDiameter?: number } = {}
): ValidationError | null {
  const { unit = 'mm', minDiameter, maxDiameter } = options;

  const error = validateNumber(D, field, { positive: true });
  if (error) return error;

  const min = minDiameter ?? (unit === 'mm' ? 50 : 0.05);
  const max = maxDiameter ?? (unit === 'mm' ? 5000 : 5);

  if ((D as number) < min) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El diámetro ${field} = ${D} ${unit} es menor al mínimo de ${min} ${unit}`,
      value: D,
      constraint: { min },
    };
  }

  if ((D as number) > max) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El diámetro ${field} = ${D} ${unit} excede el máximo de ${max} ${unit}`,
      value: D,
      constraint: { max },
    };
  }

  return null;
}

/**
 * Validates Manning's roughness coefficient
 */
export function validateManningN(n: unknown, field: string = 'n'): ValidationError | null {
  const error = validateNumber(n, field, { positive: true });
  if (error) return error;

  // Typical Manning's n range: 0.008 (smooth) to 0.15 (heavily vegetated)
  if ((n as number) < 0.005 || (n as number) > 0.2) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El coeficiente de Manning n = ${n} está fuera del rango típico (0.005 - 0.2)`,
      value: n,
      constraint: { min: 0.005, max: 0.2 },
    };
  }

  return null;
}

/**
 * Validates Hazen-Williams coefficient
 */
export function validateHazenWilliamsC(C: unknown, field: string = 'C'): ValidationError | null {
  const error = validateNumber(C, field, { positive: true });
  if (error) return error;

  // Typical C range: 60 (rough) to 150 (smooth)
  if ((C as number) < 50 || (C as number) > 160) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El coeficiente Hazen-Williams C = ${C} está fuera del rango típico (50 - 160)`,
      value: C,
      constraint: { min: 50, max: 160 },
    };
  }

  return null;
}

/**
 * Validates pressure
 * @param P - Pressure in mca (meters of water column) or kPa
 */
export function validatePressure(
  P: unknown,
  field: string = 'P',
  options: { unit?: 'mca' | 'kPa'; allowNegative?: boolean } = {}
): ValidationError | null {
  const { unit = 'mca', allowNegative = false } = options;

  const error = validateNumber(P, field, { nonNegative: !allowNegative });
  if (error) return error;

  // Typical pressure limits
  const maxPressure = unit === 'mca' ? 200 : 2000;

  if ((P as number) > maxPressure) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `La presión ${field} = ${P} ${unit} excede el máximo típico de ${maxPressure} ${unit}`,
      value: P,
      constraint: { max: maxPressure },
    };
  }

  return null;
}

/**
 * Validates runoff coefficient (C)
 */
export function validateRunoffCoefficient(C: unknown, field: string = 'C'): ValidationError | null {
  const error = validateNumber(C, field, { required: true });
  if (error) return error;

  if ((C as number) < 0 || (C as number) > 1) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El coeficiente de escorrentía ${field} = ${C} debe estar entre 0 y 1`,
      value: C,
      constraint: { min: 0, max: 1 },
    };
  }

  return null;
}

/**
 * Validates Curve Number (CN) for SCS method
 */
export function validateCurveNumber(CN: unknown, field: string = 'CN'): ValidationError | null {
  const error = validateNumber(CN, field, { required: true });
  if (error) return error;

  if ((CN as number) < 0 || (CN as number) > 100) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El Número de Curva ${field} = ${CN} debe estar entre 0 y 100`,
      value: CN,
      constraint: { min: 0, max: 100 },
    };
  }

  return null;
}

/**
 * Validates area
 * @param A - Area in hectares or m²
 */
export function validateArea(
  A: unknown,
  field: string = 'A',
  options: { unit?: 'ha' | 'm2' | 'km2' } = {}
): ValidationError | null {
  const { unit = 'ha' } = options;

  const error = validateNumber(A, field, { positive: true });
  if (error) return error;

  // Maximum reasonable drainage area for urban design
  const maxArea = unit === 'km2' ? 10000 : unit === 'ha' ? 100000 : 1e9;

  if ((A as number) > maxArea) {
    return {
      code: 'PHYSICAL_IMPOSSIBILITY',
      field,
      message: `El área ${field} = ${A} ${unit} parece excesivamente grande. Verifique las unidades.`,
      value: A,
      constraint: { max: maxArea },
    };
  }

  return null;
}

/**
 * Validates length
 */
export function validateLength(
  L: unknown,
  field: string = 'L',
  options: { unit?: 'm' | 'km'; positive?: boolean; max?: number } = {}
): ValidationError | null {
  const { unit = 'm', positive = true, max } = options;

  const error = validateNumber(L, field, { positive, nonNegative: !positive });
  if (error) return error;

  const maxLength = max ?? (unit === 'km' ? 1000 : 100000);

  if ((L as number) > maxLength) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `La longitud ${field} = ${L} ${unit} excede el máximo de ${maxLength} ${unit}`,
      value: L,
      constraint: { max: maxLength },
    };
  }

  return null;
}

/**
 * Validates depth/height
 */
export function validateDepth(
  y: unknown,
  field: string = 'y',
  options: { max?: number } = {}
): ValidationError | null {
  const { max = 100 } = options;

  const error = validateNumber(y, field, { positive: true });
  if (error) return error;

  if ((y as number) > max) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `La profundidad ${field} = ${y} m excede el máximo de ${max} m`,
      value: y,
      constraint: { max },
    };
  }

  return null;
}

// ============================================================
// ARRAY VALIDATORS
// ============================================================

/**
 * Validates an array of numbers
 */
export function validateNumberArray(
  arr: unknown,
  field: string,
  options: {
    minLength?: number;
    maxLength?: number;
    elementOptions?: Parameters<typeof validateNumber>[2];
  } = {}
): ValidationError | null {
  const { minLength = 1, maxLength, elementOptions = {} } = options;

  if (!Array.isArray(arr)) {
    return {
      code: 'INVALID_TYPE',
      field,
      message: `El campo "${field}" debe ser un array`,
      value: arr,
    };
  }

  if (arr.length < minLength) {
    return {
      code: 'ARRAY_TOO_SHORT',
      field,
      message: `El array "${field}" debe tener al menos ${minLength} elementos`,
      value: arr,
      constraint: { min: minLength },
    };
  }

  if (maxLength !== undefined && arr.length > maxLength) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El array "${field}" excede el máximo de ${maxLength} elementos`,
      value: arr,
      constraint: { max: maxLength },
    };
  }

  // Validate each element
  for (let i = 0; i < arr.length; i++) {
    const elementError = validateNumber(arr[i], `${field}[${i}]`, elementOptions);
    if (elementError) return elementError;
  }

  return null;
}

/**
 * Validates that an array is monotonically increasing
 */
export function validateMonotonicIncreasing(
  arr: number[],
  field: string
): ValidationError | null {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] <= arr[i - 1]) {
      return {
        code: 'CONSTRAINT_VIOLATION',
        field,
        message: `El array "${field}" debe ser monotónicamente creciente. Valor en posición ${i} (${arr[i]}) <= valor anterior (${arr[i - 1]})`,
        value: arr,
      };
    }
  }
  return null;
}

// ============================================================
// GEOMETRY VALIDATORS
// ============================================================

/**
 * Validates a coordinate point
 */
export function validatePoint(
  point: unknown,
  field: string
): ValidationError | null {
  if (!point || typeof point !== 'object') {
    return {
      code: 'INVALID_TYPE',
      field,
      message: `El campo "${field}" debe ser un objeto con coordenadas`,
      value: point,
    };
  }

  const p = point as Record<string, unknown>;

  const xError = validateNumber(p.x, `${field}.x`);
  if (xError) return xError;

  const yError = validateNumber(p.y, `${field}.y`);
  if (yError) return yError;

  // z is optional
  if (p.z !== undefined) {
    const zError = validateNumber(p.z, `${field}.z`);
    if (zError) return zError;
  }

  return null;
}

/**
 * Validates angle in degrees
 */
export function validateAngle(
  angle: unknown,
  field: string = 'angle',
  options: { min?: number; max?: number } = {}
): ValidationError | null {
  const { min = -360, max = 360 } = options;

  const error = validateNumber(angle, field, { min, max });
  if (error) return error;

  return null;
}

/**
 * Validates radius
 */
export function validateRadius(
  R: unknown,
  field: string = 'R',
  options: { minRadius?: number; maxRadius?: number } = {}
): ValidationError | null {
  const { minRadius = 0.1, maxRadius = 100000 } = options;

  const error = validateNumber(R, field, { positive: true });
  if (error) return error;

  if ((R as number) < minRadius) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El radio ${field} = ${R} m es menor al mínimo de ${minRadius} m`,
      value: R,
      constraint: { min: minRadius },
    };
  }

  if ((R as number) > maxRadius) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El radio ${field} = ${R} m excede el máximo de ${maxRadius} m`,
      value: R,
      constraint: { max: maxRadius },
    };
  }

  return null;
}

// ============================================================
// PAVEMENT SPECIFIC VALIDATORS
// ============================================================

/**
 * Validates ESAL (Equivalent Single Axle Loads)
 */
export function validateESAL(W18: unknown, field: string = 'W18'): ValidationError | null {
  const error = validateNumber(W18, field, { positive: true });
  if (error) return error;

  // Typical ESAL range: 10,000 to 100,000,000
  if ((W18 as number) < 1000) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El ESAL ${field} = ${W18} parece muy bajo para un diseño de pavimento`,
      value: W18,
      constraint: { min: 1000 },
    };
  }

  if ((W18 as number) > 1e9) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El ESAL ${field} = ${W18} parece excesivamente alto`,
      value: W18,
      constraint: { max: 1e9 },
    };
  }

  return null;
}

/**
 * Validates CBR (California Bearing Ratio)
 */
export function validateCBR(CBR: unknown, field: string = 'CBR'): ValidationError | null {
  const error = validateNumber(CBR, field, { positive: true });
  if (error) return error;

  // Typical CBR range: 1% to 100%
  if ((CBR as number) < 0.5 || (CBR as number) > 150) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El CBR ${field} = ${CBR}% está fuera del rango típico (0.5% - 150%)`,
      value: CBR,
      constraint: { min: 0.5, max: 150 },
    };
  }

  return null;
}

/**
 * Validates Resilient Modulus
 */
export function validateResilientModulus(
  Mr: unknown,
  field: string = 'Mr',
  options: { unit?: 'psi' | 'MPa' } = {}
): ValidationError | null {
  const { unit = 'psi' } = options;

  const error = validateNumber(Mr, field, { positive: true });
  if (error) return error;

  // Typical range: 1,500 - 40,000 psi or 10 - 275 MPa
  const min = unit === 'psi' ? 1000 : 7;
  const max = unit === 'psi' ? 50000 : 350;

  if ((Mr as number) < min || (Mr as number) > max) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El módulo resiliente ${field} = ${Mr} ${unit} está fuera del rango típico (${min} - ${max} ${unit})`,
      value: Mr,
      constraint: { min, max },
    };
  }

  return null;
}

/**
 * Validates structural number (SN)
 */
export function validateStructuralNumber(SN: unknown, field: string = 'SN'): ValidationError | null {
  const error = validateNumber(SN, field, { positive: true });
  if (error) return error;

  // Typical SN range: 1 to 10
  if ((SN as number) < 0.5 || (SN as number) > 15) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El número estructural ${field} = ${SN} está fuera del rango típico (0.5 - 15)`,
      value: SN,
      constraint: { min: 0.5, max: 15 },
    };
  }

  return null;
}

/**
 * Validates reliability percentage
 */
export function validateReliability(R: unknown, field: string = 'R'): ValidationError | null {
  const error = validateNumber(R, field, { required: true });
  if (error) return error;

  // Reliability: 50% to 99.99%
  if ((R as number) < 50 || (R as number) > 99.99) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `La confiabilidad ${field} = ${R}% debe estar entre 50% y 99.99%`,
      value: R,
      constraint: { min: 50, max: 99.99 },
    };
  }

  return null;
}

// ============================================================
// ROAD GEOMETRY VALIDATORS
// ============================================================

/**
 * Validates design speed
 */
export function validateDesignSpeed(
  V: unknown,
  field: string = 'V',
  options: { minSpeed?: number; maxSpeed?: number } = {}
): ValidationError | null {
  const { minSpeed = 20, maxSpeed = 200 } = options;

  const error = validateNumber(V, field, { positive: true });
  if (error) return error;

  if ((V as number) < minSpeed || (V as number) > maxSpeed) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `La velocidad de diseño ${field} = ${V} km/h debe estar entre ${minSpeed} y ${maxSpeed} km/h`,
      value: V,
      constraint: { min: minSpeed, max: maxSpeed },
    };
  }

  return null;
}

/**
 * Validates superelevation (peralte)
 */
export function validateSuperelevation(
  e: unknown,
  field: string = 'e',
  options: { maxSuperelevation?: number } = {}
): ValidationError | null {
  const { maxSuperelevation = 12 } = options;

  const error = validateNumber(e, field, { required: true });
  if (error) return error;

  // Superelevation typically -2% (adverse) to +12%
  if ((e as number) < -4 || (e as number) > maxSuperelevation) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El peralte ${field} = ${e}% debe estar entre -4% y ${maxSuperelevation}%`,
      value: e,
      constraint: { min: -4, max: maxSuperelevation },
    };
  }

  return null;
}

/**
 * Validates horizontal curve radius
 */
export function validateHorizontalCurveRadius(
  R: unknown,
  field: string = 'R',
  options: { designSpeed?: number } = {}
): ValidationError | null {
  const { designSpeed } = options;

  const error = validateNumber(R, field, { positive: true });
  if (error) return error;

  // Minimum radius based on design speed (if provided)
  if (designSpeed) {
    // Approximate minimum radius: R_min ≈ V²/(127*(e_max + f_max))
    // With e_max=0.08, f_max=0.15: R_min ≈ V²/29
    const approximateMinR = (designSpeed * designSpeed) / 35;

    if ((R as number) < approximateMinR * 0.8) { // Allow 20% margin
      return {
        code: 'CONSTRAINT_VIOLATION',
        field,
        message: `El radio ${field} = ${R} m es muy pequeño para V = ${designSpeed} km/h. Radio mínimo aproximado: ${approximateMinR.toFixed(0)} m`,
        value: R,
        constraint: { min: approximateMinR },
      };
    }
  }

  // General range
  if ((R as number) < 10 || (R as number) > 50000) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El radio ${field} = ${R} m está fuera del rango típico (10 - 50,000 m)`,
      value: R,
      constraint: { min: 10, max: 50000 },
    };
  }

  return null;
}

/**
 * Validates vertical curve K parameter
 */
export function validateKParameter(
  K: unknown,
  field: string = 'K',
  options: { curveType?: 'crest' | 'sag' } = {}
): ValidationError | null {
  const error = validateNumber(K, field, { positive: true });
  if (error) return error;

  // Typical K range: 5 to 400
  if ((K as number) < 1 || (K as number) > 500) {
    return {
      code: 'OUT_OF_RANGE',
      field,
      message: `El parámetro K = ${K} está fuera del rango típico (1 - 500)`,
      value: K,
      constraint: { min: 1, max: 500 },
    };
  }

  return null;
}

// ============================================================
// BATCH VALIDATION
// ============================================================

/**
 * Validates multiple fields and collects all errors
 */
export function validateAll(
  validations: Array<ValidationError | null>
): ValidationError[] {
  return validations.filter((e): e is ValidationError => e !== null);
}

/**
 * Creates a validator builder for complex objects
 */
export class Validator<T> {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private data: Partial<T> = {};

  constructor(private input: Record<string, unknown>) {}

  /**
   * Validates a required field
   */
  required<K extends keyof T>(
    field: K,
    validator: (value: unknown, field: string) => ValidationError | null
  ): this {
    const error = validator(this.input[field as string], field as string);
    if (error) {
      this.errors.push(error);
    } else {
      this.data[field] = this.input[field as string] as T[K];
    }
    return this;
  }

  /**
   * Validates an optional field
   */
  optional<K extends keyof T>(
    field: K,
    validator: (value: unknown, field: string) => ValidationError | null,
    defaultValue?: T[K]
  ): this {
    const value = this.input[field as string];

    if (value === undefined || value === null) {
      if (defaultValue !== undefined) {
        this.data[field] = defaultValue;
      }
      return this;
    }

    const error = validator(value, field as string);
    if (error) {
      this.errors.push(error);
    } else {
      this.data[field] = value as T[K];
    }
    return this;
  }

  /**
   * Adds a custom validation
   */
  custom(validation: () => ValidationError | null): this {
    const error = validation();
    if (error) {
      this.errors.push(error);
    }
    return this;
  }

  /**
   * Adds a warning
   */
  warn(condition: boolean, warning: ValidationWarning): this {
    if (condition) {
      this.warnings.push(warning);
    }
    return this;
  }

  /**
   * Returns the validation result
   */
  result(): ValidationResult<T> {
    return {
      success: this.errors.length === 0,
      data: this.errors.length === 0 ? this.data as T : undefined,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Throws if validation failed
   */
  throwIfInvalid(): T {
    if (this.errors.length > 0) {
      throw new EngineeringValidationError(this.errors[0]);
    }
    return this.data as T;
  }
}

/**
 * Creates a new validator
 */
export function createValidator<T>(input: Record<string, unknown>): Validator<T> {
  return new Validator<T>(input);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';

  return errors
    .map((e, i) => `${i + 1}. ${e.message}`)
    .join('\n');
}

/**
 * Checks if a calculation can proceed with warnings
 */
export function canProceedWithWarnings(result: ValidationResult<unknown>): boolean {
  return result.success || (result.errors.length === 0 && result.warnings.length > 0);
}

/**
 * Safe division that throws descriptive error on division by zero
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  denominatorName: string = 'denominador'
): number {
  if (denominator === 0) {
    throw new EngineeringValidationError({
      code: 'DIVISION_BY_ZERO',
      field: denominatorName,
      message: `División por cero: el ${denominatorName} no puede ser cero`,
      value: denominator,
    });
  }
  return numerator / denominator;
}

/**
 * Safe square root that throws on negative input
 */
export function safeSqrt(value: number, fieldName: string = 'valor'): number {
  if (value < 0) {
    throw new EngineeringValidationError({
      code: 'PHYSICAL_IMPOSSIBILITY',
      field: fieldName,
      message: `Raíz cuadrada de número negativo: ${fieldName} = ${value}`,
      value,
    });
  }
  return Math.sqrt(value);
}

/**
 * Safe logarithm that throws on non-positive input
 */
export function safeLog(value: number, fieldName: string = 'valor'): number {
  if (value <= 0) {
    throw new EngineeringValidationError({
      code: 'PHYSICAL_IMPOSSIBILITY',
      field: fieldName,
      message: `Logaritmo de número no positivo: ${fieldName} = ${value}`,
      value,
    });
  }
  return Math.log(value);
}

/**
 * Safe power function
 */
export function safePow(base: number, exponent: number, baseName: string = 'base'): number {
  const result = Math.pow(base, exponent);

  if (!isFinite(result)) {
    throw new EngineeringValidationError({
      code: 'INFINITY_VALUE',
      field: baseName,
      message: `Resultado infinito: ${baseName}^${exponent} = ${result}`,
      value: base,
    });
  }

  return result;
}
