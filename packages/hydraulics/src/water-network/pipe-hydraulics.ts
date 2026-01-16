/**
 * Water Distribution Pipe Hydraulics Module
 *
 * Hydraulic calculations for pressurized water distribution systems
 * Based on Chilean standards: NCh 691, NCh 2485, SISS regulations
 *
 * Equations supported:
 * - Hazen-Williams (most common in Chile)
 * - Darcy-Weisbach (more accurate, universal)
 * - Manning (less common for pressure systems)
 */

// ============================================================================
// Types
// ============================================================================

export type FrictionFormula = 'hazen-williams' | 'darcy-weisbach' | 'manning';

export type WaterPipeMaterial =
  | 'hdpe'           // HDPE PE100
  | 'pvc'            // PVC pressure pipe
  | 'ductile_iron'   // Ductile iron
  | 'steel'          // Steel pipe
  | 'asbestos_cement'// Asbestos cement (legacy)
  | 'concrete'       // Reinforced concrete
  | 'copper';        // Copper (service lines)

export interface PipeFrictionCoefficients {
  hazenWilliamsC: number;      // Hazen-Williams C factor (dimensionless)
  darcyRoughness: number;      // Absolute roughness ε (mm)
  manningN: number;            // Manning's n
}

export interface WaterPipeProperties {
  diameter: number;            // Internal diameter (mm)
  length: number;              // Length (m)
  material: WaterPipeMaterial;
  age?: number;                // Age in years (affects roughness)
  frictionCoeffs: PipeFrictionCoefficients;
}

export interface PipeFlowResult {
  flow: number;                // Flow rate (L/s)
  velocity: number;            // Velocity (m/s)
  headLoss: number;            // Head loss (m)
  headLossPerKm: number;       // Unit head loss (m/km)
  reynoldsNumber: number;      // Reynolds number
  frictionFactor?: number;     // Darcy friction factor (if D-W used)
  formula: FrictionFormula;
  warnings: string[];
}

export interface HeadLossResult {
  headLoss: number;            // Total head loss (m)
  headLossPerKm: number;       // Unit head loss (m/km)
  velocity: number;            // Velocity (m/s)
  reynoldsNumber: number;
  frictionFactor?: number;
  formula: FrictionFormula;
}

export interface PipeSizingInput {
  flow: number;                // Required flow (L/s)
  length: number;              // Pipe length (m)
  availableHead: number;       // Available head loss (m)
  material: WaterPipeMaterial;
  formula?: FrictionFormula;
}

export interface PipeSizingResult {
  diameter: number;            // Selected diameter (mm)
  velocity: number;            // Resulting velocity (m/s)
  headLoss: number;            // Actual head loss (m)
  headLossPerKm: number;       // Unit head loss (m/km)
  capacityUsed: number;        // Percentage of available head used
  alternativeDiameters: {
    diameter: number;
    velocity: number;
    headLoss: number;
  }[];
  warnings: string[];
}

// ============================================================================
// Constants - Chilean Standards (NCh 691, SISS)
// ============================================================================

/**
 * Hazen-Williams C coefficients by material and age
 * Higher C = smoother pipe = less friction
 */
export const HAZEN_WILLIAMS_C: Record<WaterPipeMaterial, { new: number; aged: number }> = {
  hdpe: { new: 150, aged: 140 },
  pvc: { new: 150, aged: 140 },
  ductile_iron: { new: 140, aged: 100 },
  steel: { new: 140, aged: 100 },
  asbestos_cement: { new: 140, aged: 120 },
  concrete: { new: 130, aged: 100 },
  copper: { new: 140, aged: 130 },
};

/**
 * Darcy-Weisbach absolute roughness ε (mm)
 */
export const DARCY_ROUGHNESS: Record<WaterPipeMaterial, { new: number; aged: number }> = {
  hdpe: { new: 0.007, aged: 0.05 },
  pvc: { new: 0.0015, aged: 0.05 },
  ductile_iron: { new: 0.25, aged: 1.0 },
  steel: { new: 0.045, aged: 1.0 },
  asbestos_cement: { new: 0.025, aged: 0.3 },
  concrete: { new: 0.3, aged: 1.0 },
  copper: { new: 0.0015, aged: 0.03 },
};

/**
 * Manning's n coefficients
 */
export const MANNING_N_WATER: Record<WaterPipeMaterial, number> = {
  hdpe: 0.009,
  pvc: 0.009,
  ductile_iron: 0.013,
  steel: 0.012,
  asbestos_cement: 0.011,
  concrete: 0.013,
  copper: 0.011,
};

/**
 * Standard commercial diameters (mm) - Chilean market
 */
export const STANDARD_DIAMETERS_WATER: Record<WaterPipeMaterial, number[]> = {
  hdpe: [20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630],
  pvc: [20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 200, 250, 315, 400],
  ductile_iron: [80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000],
  steel: [50, 80, 100, 125, 150, 200, 250, 300, 350, 400, 500, 600, 800, 1000],
  asbestos_cement: [50, 75, 100, 125, 150, 200, 250, 300, 350, 400],
  concrete: [300, 400, 500, 600, 800, 1000, 1200, 1500, 1800, 2000],
  copper: [10, 12, 15, 18, 22, 28, 35, 42, 54, 76, 108],
};

/**
 * Velocity limits (m/s) - NCh 691, SISS
 */
export const VELOCITY_LIMITS_WATER = {
  minimum: 0.3,           // Prevent sedimentation
  maximum: 3.0,           // Prevent erosion, noise, surge
  recommended: {
    min: 0.6,
    max: 2.0,
  },
  serviceLines: {
    min: 0.3,
    max: 2.5,
  },
};

/**
 * Pressure limits (m.c.a.) - NCh 691, SISS
 */
export const PRESSURE_LIMITS = {
  minimum: {
    static: 15,           // Minimum static pressure at node
    residual: 10,         // Minimum residual during peak demand
    fireFlow: 7,          // Minimum during fire flow
  },
  maximum: {
    static: 70,           // Maximum static pressure
    recommended: 50,      // Recommended maximum
  },
  serviceConnection: {
    min: 10,              // Minimum at meter
    max: 50,              // Maximum at meter (use PRV if higher)
  },
};

/**
 * Head loss limits (m/km) - Design guidelines
 */
export const HEAD_LOSS_LIMITS = {
  transmission: {
    min: 0.5,
    max: 3.0,
    typical: 1.5,
  },
  distribution: {
    min: 1.0,
    max: 10.0,
    typical: 5.0,
  },
  serviceLines: {
    max: 15.0,
  },
};

/**
 * Water properties at 20°C
 */
export const WATER_PROPERTIES = {
  density: 998.2,              // kg/m³
  kinematicViscosity: 1.004e-6, // m²/s
  dynamicViscosity: 1.002e-3,  // Pa·s
  bulkModulus: 2.2e9,          // Pa (for surge analysis)
};

// ============================================================================
// Friction Coefficient Functions
// ============================================================================

/**
 * Get friction coefficients for a pipe material
 */
export function getFrictionCoefficients(
  material: WaterPipeMaterial,
  ageYears: number = 0
): PipeFrictionCoefficients {
  // Interpolate between new and aged values based on age
  const ageFactor = Math.min(1, ageYears / 30); // Full aging at 30 years

  const hwNew = HAZEN_WILLIAMS_C[material].new;
  const hwAged = HAZEN_WILLIAMS_C[material].aged;
  const hazenWilliamsC = hwNew - (hwNew - hwAged) * ageFactor;

  const drNew = DARCY_ROUGHNESS[material].new;
  const drAged = DARCY_ROUGHNESS[material].aged;
  const darcyRoughness = drNew + (drAged - drNew) * ageFactor;

  return {
    hazenWilliamsC,
    darcyRoughness,
    manningN: MANNING_N_WATER[material],
  };
}

// ============================================================================
// Head Loss Calculations
// ============================================================================

/**
 * Calculate head loss using Hazen-Williams equation
 *
 * hf = 10.67 × L × Q^1.852 / (C^1.852 × D^4.87)
 *
 * Where:
 * - hf = head loss (m)
 * - L = length (m)
 * - Q = flow (m³/s)
 * - C = Hazen-Williams coefficient
 * - D = diameter (m)
 */
export function calculateHeadLossHazenWilliams(
  flow: number,              // L/s
  diameter: number,          // mm
  length: number,            // m
  C: number                  // Hazen-Williams C
): HeadLossResult {
  const Q = flow / 1000;     // Convert to m³/s
  const D = diameter / 1000; // Convert to m

  // Hazen-Williams formula
  const headLoss = 10.67 * length * Math.pow(Q, 1.852) /
                   (Math.pow(C, 1.852) * Math.pow(D, 4.87));

  const headLossPerKm = (headLoss / length) * 1000;

  // Calculate velocity
  const area = Math.PI * Math.pow(D, 2) / 4;
  const velocity = Q / area;

  // Calculate Reynolds number
  const reynoldsNumber = velocity * D / WATER_PROPERTIES.kinematicViscosity;

  return {
    headLoss,
    headLossPerKm,
    velocity,
    reynoldsNumber,
    formula: 'hazen-williams',
  };
}

/**
 * Calculate Darcy friction factor using Colebrook-White equation
 * (iterative solution)
 *
 * 1/√f = -2 × log10(ε/(3.7×D) + 2.51/(Re×√f))
 */
export function calculateDarcyFrictionFactor(
  reynoldsNumber: number,
  diameter: number,          // mm
  roughness: number          // mm
): number {
  const D = diameter / 1000;
  const eps = roughness / 1000;
  const relativeRoughness = eps / D;

  // Handle laminar flow
  if (reynoldsNumber < 2300) {
    return 64 / reynoldsNumber;
  }

  // Swamee-Jain approximation for turbulent flow (explicit formula)
  // Accurate to within 1% of Colebrook-White
  const f = 0.25 / Math.pow(
    Math.log10(relativeRoughness / 3.7 + 5.74 / Math.pow(reynoldsNumber, 0.9)),
    2
  );

  return f;
}

/**
 * Calculate head loss using Darcy-Weisbach equation
 *
 * hf = f × (L/D) × (V²/2g)
 *
 * Where:
 * - hf = head loss (m)
 * - f = Darcy friction factor
 * - L = length (m)
 * - D = diameter (m)
 * - V = velocity (m/s)
 * - g = gravitational acceleration (9.81 m/s²)
 */
export function calculateHeadLossDarcyWeisbach(
  flow: number,              // L/s
  diameter: number,          // mm
  length: number,            // m
  roughness: number          // mm (absolute roughness)
): HeadLossResult {
  const Q = flow / 1000;     // Convert to m³/s
  const D = diameter / 1000; // Convert to m
  const g = 9.81;

  // Calculate velocity
  const area = Math.PI * Math.pow(D, 2) / 4;
  const velocity = Q / area;

  // Calculate Reynolds number
  const reynoldsNumber = velocity * D / WATER_PROPERTIES.kinematicViscosity;

  // Calculate friction factor
  const f = calculateDarcyFrictionFactor(reynoldsNumber, diameter, roughness);

  // Darcy-Weisbach formula
  const headLoss = f * (length / D) * (Math.pow(velocity, 2) / (2 * g));
  const headLossPerKm = (headLoss / length) * 1000;

  return {
    headLoss,
    headLossPerKm,
    velocity,
    reynoldsNumber,
    frictionFactor: f,
    formula: 'darcy-weisbach',
  };
}

/**
 * Calculate head loss using Manning equation (for pressure pipes)
 *
 * hf = 10.29 × n² × L × Q² / D^5.33
 */
export function calculateHeadLossManning(
  flow: number,              // L/s
  diameter: number,          // mm
  length: number,            // m
  n: number                  // Manning's n
): HeadLossResult {
  const Q = flow / 1000;     // Convert to m³/s
  const D = diameter / 1000; // Convert to m

  // Manning formula for full pipe
  const headLoss = 10.29 * Math.pow(n, 2) * length * Math.pow(Q, 2) /
                   Math.pow(D, 5.333);

  const headLossPerKm = (headLoss / length) * 1000;

  // Calculate velocity
  const area = Math.PI * Math.pow(D, 2) / 4;
  const velocity = Q / area;

  // Calculate Reynolds number
  const reynoldsNumber = velocity * D / WATER_PROPERTIES.kinematicViscosity;

  return {
    headLoss,
    headLossPerKm,
    velocity,
    reynoldsNumber,
    formula: 'manning',
  };
}

/**
 * Universal head loss calculation - chooses formula based on input
 */
export function calculateHeadLoss(
  flow: number,              // L/s
  diameter: number,          // mm
  length: number,            // m
  material: WaterPipeMaterial,
  formula: FrictionFormula = 'hazen-williams',
  ageYears: number = 0
): HeadLossResult {
  const coeffs = getFrictionCoefficients(material, ageYears);

  switch (formula) {
    case 'hazen-williams':
      return calculateHeadLossHazenWilliams(flow, diameter, length, coeffs.hazenWilliamsC);
    case 'darcy-weisbach':
      return calculateHeadLossDarcyWeisbach(flow, diameter, length, coeffs.darcyRoughness);
    case 'manning':
      return calculateHeadLossManning(flow, diameter, length, coeffs.manningN);
  }
}

// ============================================================================
// Flow Calculations (inverse of head loss)
// ============================================================================

/**
 * Calculate flow given head loss using Hazen-Williams
 *
 * Q = 0.2785 × C × D^2.63 × S^0.54
 *
 * Where S = hf/L (hydraulic gradient)
 */
export function calculateFlowHazenWilliams(
  headLoss: number,          // m
  diameter: number,          // mm
  length: number,            // m
  C: number                  // Hazen-Williams C
): number {
  const D = diameter / 1000; // Convert to m
  const S = headLoss / length; // Hydraulic gradient

  // Hazen-Williams velocity formula: V = 0.8492 × C × R^0.63 × S^0.54
  // For circular pipe: R = D/4
  // Q = V × A = V × π×D²/4

  const Q = 0.2785 * C * Math.pow(D, 2.63) * Math.pow(S, 0.54);

  return Q * 1000; // Convert to L/s
}

// ============================================================================
// Pipe Sizing
// ============================================================================

/**
 * Size a pipe for given flow and available head
 */
export function sizePipeForFlow(input: PipeSizingInput): PipeSizingResult {
  const { flow, length, availableHead, material, formula = 'hazen-williams' } = input;

  const diameters = STANDARD_DIAMETERS_WATER[material];
  const warnings: string[] = [];
  const alternatives: { diameter: number; velocity: number; headLoss: number }[] = [];

  let selectedDiameter = diameters[diameters.length - 1]; // Default to largest
  let selectedResult: HeadLossResult | null = null;

  // Find smallest diameter that satisfies constraints
  for (const diameter of diameters) {
    const result = calculateHeadLoss(flow, diameter, length, material, formula);

    alternatives.push({
      diameter,
      velocity: result.velocity,
      headLoss: result.headLoss,
    });

    // Check head loss constraint
    if (result.headLoss <= availableHead) {
      // Check velocity constraints
      if (result.velocity >= VELOCITY_LIMITS_WATER.minimum &&
          result.velocity <= VELOCITY_LIMITS_WATER.maximum) {
        selectedDiameter = diameter;
        selectedResult = result;
        break;
      } else if (result.velocity < VELOCITY_LIMITS_WATER.minimum) {
        // Velocity too low - pipe might be oversized, but head loss OK
        if (!selectedResult || result.headLoss < selectedResult.headLoss) {
          selectedDiameter = diameter;
          selectedResult = result;
          warnings.push(`Velocity ${result.velocity.toFixed(2)} m/s is below minimum ${VELOCITY_LIMITS_WATER.minimum} m/s`);
        }
      }
    }
  }

  // If no suitable diameter found, use the one with lowest head loss
  if (!selectedResult) {
    const lastAlt = alternatives[alternatives.length - 1];
    selectedResult = calculateHeadLoss(flow, lastAlt.diameter, length, material, formula);
    warnings.push('No standard diameter satisfies all constraints - largest diameter selected');
  }

  // Additional velocity warnings
  if (selectedResult.velocity > VELOCITY_LIMITS_WATER.maximum) {
    warnings.push(`Velocity ${selectedResult.velocity.toFixed(2)} m/s exceeds maximum ${VELOCITY_LIMITS_WATER.maximum} m/s`);
  }
  if (selectedResult.velocity > VELOCITY_LIMITS_WATER.recommended.max) {
    warnings.push(`Velocity ${selectedResult.velocity.toFixed(2)} m/s exceeds recommended maximum ${VELOCITY_LIMITS_WATER.recommended.max} m/s`);
  }

  // Head loss per km warning
  if (selectedResult.headLossPerKm > HEAD_LOSS_LIMITS.distribution.max) {
    warnings.push(`Head loss ${selectedResult.headLossPerKm.toFixed(1)} m/km exceeds distribution limit ${HEAD_LOSS_LIMITS.distribution.max} m/km`);
  }

  return {
    diameter: selectedDiameter,
    velocity: selectedResult.velocity,
    headLoss: selectedResult.headLoss,
    headLossPerKm: selectedResult.headLossPerKm,
    capacityUsed: (selectedResult.headLoss / availableHead) * 100,
    alternativeDiameters: alternatives.slice(0, 5), // Top 5 alternatives
    warnings,
  };
}

// ============================================================================
// Minor Loss Calculations
// ============================================================================

export type MinorLossType =
  | 'entrance_sharp'
  | 'entrance_rounded'
  | 'exit'
  | 'elbow_90'
  | 'elbow_45'
  | 'tee_through'
  | 'tee_branch'
  | 'gate_valve_open'
  | 'gate_valve_half'
  | 'butterfly_valve_open'
  | 'check_valve'
  | 'reducer'
  | 'expander'
  | 'meter';

/**
 * Minor loss coefficients (K values)
 */
export const MINOR_LOSS_K: Record<MinorLossType, number> = {
  entrance_sharp: 0.5,
  entrance_rounded: 0.2,
  exit: 1.0,
  elbow_90: 0.9,
  elbow_45: 0.4,
  tee_through: 0.3,
  tee_branch: 1.0,
  gate_valve_open: 0.2,
  gate_valve_half: 5.6,
  butterfly_valve_open: 0.3,
  check_valve: 2.5,
  reducer: 0.5,
  expander: 0.8,
  meter: 7.0,
};

/**
 * Calculate minor head loss
 *
 * hm = K × V²/(2g)
 */
export function calculateMinorLoss(
  velocity: number,          // m/s
  K: number                  // Loss coefficient
): number {
  const g = 9.81;
  return K * Math.pow(velocity, 2) / (2 * g);
}

/**
 * Calculate total minor losses for a set of fittings
 */
export function calculateTotalMinorLosses(
  velocity: number,
  fittings: { type: MinorLossType; count: number }[]
): { totalK: number; totalHeadLoss: number; breakdown: { type: string; K: number; headLoss: number }[] } {
  let totalK = 0;
  const breakdown: { type: string; K: number; headLoss: number }[] = [];

  for (const fitting of fittings) {
    const K = MINOR_LOSS_K[fitting.type] * fitting.count;
    const headLoss = calculateMinorLoss(velocity, K);
    totalK += K;
    breakdown.push({
      type: fitting.type,
      K,
      headLoss,
    });
  }

  return {
    totalK,
    totalHeadLoss: calculateMinorLoss(velocity, totalK),
    breakdown,
  };
}

// ============================================================================
// Equivalent Pipe Length
// ============================================================================

/**
 * Convert minor losses to equivalent pipe length
 *
 * Le = K × D / f
 */
export function getEquivalentLength(
  K: number,
  diameter: number,          // mm
  frictionFactor: number
): number {
  const D = diameter / 1000;
  return K * D / frictionFactor;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert pressure from m.c.a. (meters of water column) to other units
 */
export function convertPressure(
  value: number,
  from: 'mca' | 'kPa' | 'psi' | 'bar',
  to: 'mca' | 'kPa' | 'psi' | 'bar'
): number {
  // Convert to mca first
  let mca: number;
  switch (from) {
    case 'mca': mca = value; break;
    case 'kPa': mca = value / 9.81; break;
    case 'psi': mca = value * 0.703; break;
    case 'bar': mca = value * 10.2; break;
  }

  // Convert from mca to target
  switch (to) {
    case 'mca': return mca;
    case 'kPa': return mca * 9.81;
    case 'psi': return mca / 0.703;
    case 'bar': return mca / 10.2;
  }
}

/**
 * Calculate pipe capacity at maximum velocity
 */
export function calculatePipeCapacity(
  diameter: number,          // mm
  maxVelocity: number = VELOCITY_LIMITS_WATER.maximum
): number {
  const D = diameter / 1000;
  const area = Math.PI * Math.pow(D, 2) / 4;
  return area * maxVelocity * 1000; // L/s
}

/**
 * Format head loss result for display
 */
export function formatHeadLossResult(result: HeadLossResult): string {
  const lines = [
    `Head Loss Calculation (${result.formula.replace('-', ' ')})`,
    `========================================`,
    `Head Loss: ${result.headLoss.toFixed(3)} m`,
    `Head Loss: ${result.headLossPerKm.toFixed(2)} m/km`,
    `Velocity: ${result.velocity.toFixed(2)} m/s`,
    `Reynolds Number: ${result.reynoldsNumber.toFixed(0)}`,
  ];

  if (result.frictionFactor) {
    lines.push(`Friction Factor: ${result.frictionFactor.toFixed(4)}`);
  }

  // Flow regime
  if (result.reynoldsNumber < 2300) {
    lines.push(`Flow Regime: Laminar`);
  } else if (result.reynoldsNumber < 4000) {
    lines.push(`Flow Regime: Transitional`);
  } else {
    lines.push(`Flow Regime: Turbulent`);
  }

  return lines.join('\n');
}

/**
 * Format pipe sizing result for display
 */
export function formatPipeSizingResult(result: PipeSizingResult): string {
  const lines = [
    `Pipe Sizing Result`,
    `========================================`,
    `Selected Diameter: ${result.diameter} mm`,
    `Velocity: ${result.velocity.toFixed(2)} m/s`,
    `Head Loss: ${result.headLoss.toFixed(3)} m`,
    `Head Loss: ${result.headLossPerKm.toFixed(2)} m/km`,
    `Head Capacity Used: ${result.capacityUsed.toFixed(1)}%`,
    ``,
    `Alternative Diameters:`,
  ];

  for (const alt of result.alternativeDiameters) {
    lines.push(`  Ø${alt.diameter}mm: V=${alt.velocity.toFixed(2)} m/s, hf=${alt.headLoss.toFixed(3)} m`);
  }

  if (result.warnings.length > 0) {
    lines.push(``, `Warnings:`);
    for (const warning of result.warnings) {
      lines.push(`  ⚠ ${warning}`);
    }
  }

  return lines.join('\n');
}
