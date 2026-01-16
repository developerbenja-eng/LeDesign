// ============================================================
// VALIDATION AND SAFE MATH UTILITIES
// ============================================================
// Common validation and mathematical utility functions
// ============================================================

/**
 * Validation error with detailed context
 */
export interface ValidationError {
  code: string;
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation warning with recommendation
 */
export interface ValidationWarning {
  field: string;
  message: string;
  recommendation?: string;
}

/**
 * Generic validation result
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Engineering validation error class
 */
export class EngineeringValidationError extends Error {
  code?: string;
  field?: string;
  value?: unknown;

  constructor(error: ValidationError | string) {
    if (typeof error === 'string') {
      super(error);
      this.name = 'EngineeringValidationError';
    } else {
      super(error.message);
      this.name = 'EngineeringValidationError';
      this.code = error.code;
      this.field = error.field;
      this.value = error.value;
    }
  }
}

export type Validator<T> = (value: T) => ValidationResult<T>;

/**
 * Create a validator function
 */
export function createValidator<T>(
  checks: Array<{
    check: (value: T) => boolean;
    message: string;
    code?: string;
    field?: string;
  }>
): Validator<T> {
  return (value: T) => {
    const errors: ValidationError[] = [];
    for (const { check, message, code = 'VALIDATION_FAILED', field = 'value' } of checks) {
      if (!check(value)) {
        errors.push({ code, field, message, value });
      }
    }
    return {
      success: errors.length === 0,
      data: errors.length === 0 ? value : undefined,
      errors,
      warnings: [],
    };
  };
}

/**
 * Safe division that returns 0 instead of Infinity
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  if (!isFinite(numerator) || !isFinite(denominator)) return 0;
  return numerator / denominator;
}

/**
 * Safe power function that handles edge cases
 */
export function safePow(base: number, exponent: number): number {
  if (!isFinite(base) || !isFinite(exponent)) return 0;
  if (base === 0 && exponent === 0) return 1;
  if (base < 0 && exponent % 1 !== 0) return 0; // Negative base with fractional exponent
  const result = Math.pow(base, exponent);
  return isFinite(result) ? result : 0;
}

/**
 * Safe logarithm function that handles edge cases
 */
export function safeLog(value: number, base: number = Math.E): number {
  if (value <= 0 || base <= 0 || base === 1 || !isFinite(value) || !isFinite(base)) {
    return 0;
  }
  const result = Math.log(value) / Math.log(base);
  return isFinite(result) ? result : 0;
}

/**
 * Validate that a value is a finite number
 */
export function validateNumber(
  value: number,
  name: string = 'Value',
  options?: { positive?: boolean; min?: number; max?: number }
): ValidationError | null {
  if (!isFinite(value) || isNaN(value)) {
    return {
      code: 'INVALID_NUMBER',
      field: name,
      message: `${name} must be a finite number`,
      value,
    };
  }

  if (options?.positive && value <= 0) {
    return {
      code: 'MUST_BE_POSITIVE',
      field: name,
      message: `${name} must be positive (got ${value})`,
      value,
    };
  }

  if (options?.min !== undefined && value < options.min) {
    return {
      code: 'BELOW_MINIMUM',
      field: name,
      message: `${name} must be >= ${options.min} (got ${value})`,
      value,
    };
  }

  if (options?.max !== undefined && value > options.max) {
    return {
      code: 'ABOVE_MAXIMUM',
      field: name,
      message: `${name} must be <= ${options.max} (got ${value})`,
      value,
    };
  }

  return null;
}

/**
 * Validate that a value is within a range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  name: string = 'Value'
): ValidationError | null {
  return validateNumber(value, name, { min, max });
}

/**
 * Validate ESAL (Equivalent Single Axle Load) value
 */
export function validateESAL(value: number, name: string = 'ESAL'): ValidationError | null {
  const error = validateNumber(value, name, { positive: true });
  if (error) return error;

  // ESAL typically ranges from 10^4 to 10^8
  if (value < 1e4) {
    return {
      code: 'VALUE_TOO_LOW',
      field: name,
      message: `${name} = ${value.toExponential(2)} es muy bajo. Valores típicos: 10⁴ - 10⁸`,
      value,
    };
  }

  if (value > 1e9) {
    return {
      code: 'VALUE_TOO_HIGH',
      field: name,
      message: `${name} = ${value.toExponential(2)} es excesivamente alto`,
      value,
    };
  }

  return null;
}

/**
 * Validate reliability percentage (0-100 or 0-1)
 */
export function validateReliability(
  value: number,
  name: string = 'reliability'
): ValidationError | null {
  const error = validateNumber(value, name, { positive: true });
  if (error) return error;

  // Accept both percentage (0-100) and decimal (0-1) formats
  if (value > 1 && value <= 100) {
    // Percentage format (75-99.9 typical)
    if (value < 50) {
      return {
        code: 'VALUE_TOO_LOW',
        field: name,
        message: `${name} = ${value}% es muy bajo. Rango típico: 75-99.9%`,
        value,
      };
    }
  } else if (value > 0 && value <= 1) {
    // Decimal format (0.75-0.999 typical)
    if (value < 0.5) {
      return {
        code: 'VALUE_TOO_LOW',
        field: name,
        message: `${name} = ${(value * 100).toFixed(1)}% es muy bajo. Rango típico: 75-99.9%`,
        value,
      };
    }
  } else {
    return {
      code: 'OUT_OF_RANGE',
      field: name,
      message: `${name} debe estar entre 0-1 (decimal) o 0-100 (porcentaje). Valor recibido: ${value}`,
      value,
    };
  }

  return null;
}

/**
 * Validate resilient modulus (Mr)
 */
export function validateResilientModulus(
  value: number,
  name: string = 'Mr',
  options?: { unit?: 'psi' | 'MPa' }
): ValidationError | null {
  const error = validateNumber(value, name, { positive: true });
  if (error) return error;

  const unit = options?.unit || 'psi';

  if (unit === 'psi') {
    // Typical range: 1,500 - 100,000 psi
    if (value < 500) {
      return {
        code: 'VALUE_TOO_LOW',
        field: name,
        message: `${name} = ${value} psi es muy bajo. Rango típico: 1,500 - 100,000 psi`,
        value,
      };
    }
    if (value > 200000) {
      return {
        code: 'VALUE_TOO_HIGH',
        field: name,
        message: `${name} = ${value} psi es excesivamente alto`,
        value,
      };
    }
  } else {
    // MPa: typical range 10 - 700 MPa
    if (value < 3) {
      return {
        code: 'VALUE_TOO_LOW',
        field: name,
        message: `${name} = ${value} MPa es muy bajo. Rango típico: 10 - 700 MPa`,
        value,
      };
    }
    if (value > 1500) {
      return {
        code: 'VALUE_TOO_HIGH',
        field: name,
        message: `${name} = ${value} MPa es excesivamente alto`,
        value,
      };
    }
  }

  return null;
}

/**
 * Validate structural number (SN)
 */
export function validateStructuralNumber(
  value: number,
  name: string = 'SN'
): ValidationError | null {
  const error = validateNumber(value, name, { positive: true });
  if (error) return error;

  // Typical SN range: 1.0 - 8.0
  if (value < 0.5) {
    return {
      code: 'VALUE_TOO_LOW',
      field: name,
      message: `${name} = ${value} es muy bajo. SN típico: 1.0 - 8.0`,
      value,
    };
  }

  if (value > 12.0) {
    return {
      code: 'VALUE_TOO_HIGH',
      field: name,
      message: `${name} = ${value} es excesivamente alto. Considere revisar los parámetros de diseño`,
      value,
    };
  }

  return null;
}
