// ============================================================
// HYDRAULICS VALIDATION UTILITIES
// ============================================================
// Validation functions for hydraulic parameters
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
 */
export function validateNumber(
  value: number,
  name: string = 'Value',
  options?: { positive?: boolean; nonNegative?: boolean; min?: number; max?: number }
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
 * Validate flow rate (must be positive)
 */
export function validateFlowRate(flowRate: number, fieldName: string = 'flow_rate'): ValidationError | null {
  const numberError = validateNumber(flowRate, 'Flow rate');
  if (numberError) return numberError;

  if (flowRate <= 0) {
    return {
      code: 'INVALID_FLOW_RATE',
      field: fieldName,
      message: `Flow rate must be positive (got ${flowRate})`,
      value: flowRate,
    };
  }
  return null;
}

/**
 * Validate velocity (must be non-negative, typically between 0.6 and 3.0 m/s for sewers)
 */
export function validateVelocity(velocity: number, fieldName: string = 'velocity'): ValidationError | null {
  const numberError = validateNumber(velocity, 'Velocity');
  if (numberError) return numberError;

  if (velocity < 0) {
    return {
      code: 'INVALID_VELOCITY',
      field: fieldName,
      message: `Velocity cannot be negative (got ${velocity} m/s)`,
      value: velocity,
    };
  }

  // Warning for velocities outside typical range
  if (velocity > 0 && (velocity < 0.3 || velocity > 5.0)) {
    // Note: This is informational, not an error
    // In practice, you might want a separate warning system
  }

  return null;
}

/**
 * Validate slope (must be positive, typically between 0.001 and 0.10 for sewers)
 */
export function validateSlope(slope: number, fieldName: string = 'slope'): ValidationError | null {
  const numberError = validateNumber(slope, 'Slope');
  if (numberError) return numberError;

  if (slope <= 0) {
    return {
      code: 'INVALID_SLOPE',
      field: fieldName,
      message: `Slope must be positive (got ${slope})`,
      value: slope,
    };
  }

  if (slope > 0.5) {
    return {
      code: 'SLOPE_OUT_OF_RANGE',
      field: fieldName,
      message: `Slope exceeds maximum reasonable value (got ${slope})`,
      value: slope,
    };
  }

  return null;
}

/**
 * Validate pipe diameter (must be positive, typically between 100mm and 3000mm)
 */
export function validateDiameter(diameter: number, fieldName: string = 'diameter'): ValidationError | null {
  const numberError = validateNumber(diameter, 'Diameter');
  if (numberError) return numberError;

  if (diameter <= 0) {
    return {
      code: 'INVALID_DIAMETER',
      field: fieldName,
      message: `Diameter must be positive (got ${diameter} mm)`,
      value: diameter,
    };
  }

  if (diameter < 100) {
    return {
      code: 'DIAMETER_TOO_SMALL',
      field: fieldName,
      message: `Diameter is below minimum recommended value of 100mm (got ${diameter} mm)`,
      value: diameter,
    };
  }

  if (diameter > 5000) {
    return {
      code: 'DIAMETER_OUT_OF_RANGE',
      field: fieldName,
      message: `Diameter exceeds maximum reasonable value (got ${diameter} mm)`,
      value: diameter,
    };
  }

  return null;
}

/**
 * Validate Manning's n coefficient (typically between 0.009 and 0.025 for pipes)
 */
export function validateManningN(n: number, fieldName: string = 'manning_n'): ValidationError | null {
  const numberError = validateNumber(n, "Manning's n");
  if (numberError) return numberError;

  if (n <= 0) {
    return {
      code: 'INVALID_MANNING_N',
      field: fieldName,
      message: `Manning's n must be positive (got ${n})`,
      value: n,
    };
  }

  if (n < 0.008 || n > 0.040) {
    return {
      code: 'MANNING_N_OUT_OF_RANGE',
      field: fieldName,
      message: `Manning's n is outside typical range of 0.008-0.040 (got ${n})`,
      value: n,
    };
  }

  return null;
}
