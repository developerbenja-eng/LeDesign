// ============================================================
// ROAD GEOMETRY VALIDATION UTILITIES
// ============================================================
// Validation functions for road geometry parameters
// ============================================================

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Custom error class for engineering validation failures
 */
export class EngineeringValidationError extends Error {
  public validationErrors: string[];

  constructor(
    message: string | ValidationError,
    validationErrors: string[] = []
  ) {
    if (typeof message === 'string') {
      super(message);
      this.validationErrors = validationErrors;
    } else {
      super(message.message);
      this.validationErrors = [message.message];
    }
    this.name = 'EngineeringValidationError';
  }
}

/**
 * Validate that a value is a finite number
 * Returns ValidationError if invalid, null if valid
 */
export function validateNumber(
  value: number,
  name: string = 'Value',
  options?: { required?: boolean; positive?: boolean; nonNegative?: boolean; min?: number; max?: number }
): ValidationError | null {
  if (!isFinite(value) || isNaN(value)) {
    return {
      code: 'INVALID_NUMBER',
      field: name.toLowerCase().replace(/\s+/g, '_'),
      message: `${name} must be a finite number`,
      value,
    };
  }

  if (options?.positive && value <= 0) {
    return {
      code: 'NOT_POSITIVE',
      field: name.toLowerCase().replace(/\s+/g, '_'),
      message: `${name} must be positive (got ${value})`,
      value,
    };
  }

  if (options?.nonNegative && value < 0) {
    return {
      code: 'NEGATIVE',
      field: name.toLowerCase().replace(/\s+/g, '_'),
      message: `${name} must be non-negative (got ${value})`,
      value,
    };
  }

  if (options?.min !== undefined && value < options.min) {
    return {
      code: 'OUT_OF_RANGE',
      field: name.toLowerCase().replace(/\s+/g, '_'),
      message: `${name} must be at least ${options.min} (got ${value})`,
      value,
    };
  }

  if (options?.max !== undefined && value > options.max) {
    return {
      code: 'OUT_OF_RANGE',
      field: name.toLowerCase().replace(/\s+/g, '_'),
      message: `${name} must be at most ${options.max} (got ${value})`,
      value,
    };
  }

  return null;
}

/**
 * Validate radius value (must be positive)
 */
export function validateRadius(radius: number, fieldName: string = 'radius'): ValidationError | null {
  const numberError = validateNumber(radius, 'Radius');
  if (numberError) return numberError;

  if (radius <= 0) {
    return {
      code: 'INVALID_RADIUS',
      field: fieldName,
      message: `Radius must be positive (got ${radius})`,
      value: radius,
    };
  }
  return null;
}

/**
 * Validate angle value (typically in degrees)
 */
export function validateAngle(angle: number, fieldName: string = 'angle'): ValidationError | null {
  const numberError = validateNumber(angle, 'Angle');
  if (numberError) return numberError;

  // Optional: check if angle is within reasonable range
  if (Math.abs(angle) > 360) {
    return {
      code: 'INVALID_ANGLE',
      field: fieldName,
      message: `Angle should be between -360° and 360° (got ${angle}°)`,
      value: angle,
    };
  }
  return null;
}

/**
 * Validate design speed (must be positive and within reasonable range)
 */
export function validateDesignSpeed(speed: number, fieldName: string = 'design_speed'): ValidationError | null {
  const numberError = validateNumber(speed, 'Design speed');
  if (numberError) return numberError;

  if (speed <= 0) {
    return {
      code: 'INVALID_SPEED',
      field: fieldName,
      message: `Design speed must be positive (got ${speed} km/h)`,
      value: speed,
    };
  }

  if (speed > 200) {
    return {
      code: 'SPEED_OUT_OF_RANGE',
      field: fieldName,
      message: `Design speed exceeds maximum reasonable value (got ${speed} km/h)`,
      value: speed,
    };
  }

  return null;
}

/**
 * Validate superelevation value (typically between 0 and 0.12 or 12%)
 */
export function validateSuperelevation(superelevation: number, fieldName: string = 'superelevation'): ValidationError | null {
  const numberError = validateNumber(superelevation, 'Superelevation');
  if (numberError) return numberError;

  // Superelevation is typically expressed as a decimal (e.g., 0.08 for 8%)
  // or sometimes as a percentage (e.g., 8)
  // We'll accept both ranges
  if (superelevation < 0) {
    return {
      code: 'INVALID_SUPERELEVATION',
      field: fieldName,
      message: `Superelevation cannot be negative (got ${superelevation})`,
      value: superelevation,
    };
  }

  if (superelevation > 0.12 && superelevation <= 12) {
    // Likely percentage format (e.g., 8 for 8%), which is valid
    return null;
  }

  if (superelevation > 12) {
    return {
      code: 'SUPERELEVATION_OUT_OF_RANGE',
      field: fieldName,
      message: `Superelevation exceeds maximum value (got ${superelevation})`,
      value: superelevation,
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
  fieldName: string = 'value'
): ValidationError | null {
  const numberError = validateNumber(value, fieldName);
  if (numberError) return numberError;

  if (value < min || value > max) {
    return {
      code: 'OUT_OF_RANGE',
      field: fieldName,
      message: `${fieldName} must be between ${min} and ${max} (got ${value})`,
      value,
    };
  }
  return null;
}

/**
 * Safe division that returns 0 instead of Infinity
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  if (!isFinite(numerator) || !isFinite(denominator)) return 0;
  return numerator / denominator;
}
