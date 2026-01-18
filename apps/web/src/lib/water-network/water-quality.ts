/**
 * Water Quality Module
 *
 * Models water quality constituents in distribution networks:
 * - Chemical decay (chlorine residual)
 * - Water age
 * - Source tracing
 *
 * Based on EPANET water quality modeling and Chilean regulations (NCh 409)
 */

import {
  WaterNetwork,
  Junction,
  Tank,
  Reservoir,
  Pipe,
  Pattern,
} from './network-elements';

// ============================================================================
// Types
// ============================================================================

export type QualityModel = 'none' | 'chemical' | 'age' | 'trace';

export interface QualityOptions {
  model: QualityModel;
  timestep: number;            // Quality timestep (minutes)
  tolerance: number;           // Concentration tolerance

  // For chemical decay
  bulkDecayCoeff?: number;     // Bulk reaction coefficient (1/day)
  wallDecayCoeff?: number;     // Wall reaction coefficient (m/day)
  limitingConcentration?: number; // Limiting concentration (mg/L)
  decayOrder?: 1 | 2;          // Reaction order

  // For source tracing
  traceNode?: string;          // Node ID for trace
}

export interface QualitySource {
  nodeId: string;
  sourceType: 'concentration' | 'mass' | 'setpoint' | 'flowpaced';
  baseline: number;            // Baseline value
  patternId?: string;          // Pattern for time-varying source
}

export interface QualityResult {
  time: number;                // hours
  nodeQuality: Map<string, number>;
  linkQuality: Map<string, number>;
  averageAge?: number;         // hours (for age model)
  minChlorine?: number;        // mg/L (for chemical model)
  maxAge?: number;             // hours
}

// ============================================================================
// Chilean Water Quality Standards (NCh 409)
// ============================================================================

export const CHILEAN_WATER_STANDARDS = {
  chlorine: {
    minimum: 0.2,              // mg/L - minimum residual
    maximum: 2.0,              // mg/L - maximum allowed
    recommended: {
      min: 0.5,
      max: 1.5,
    },
    sourceConcentration: 1.5,  // Typical dosing at source
  },
  turbidity: {
    maximum: 2.0,              // NTU
  },
  pH: {
    min: 6.5,
    max: 8.5,
  },
  temperature: {
    maximum: 25,               // °C
  },
};

/**
 * Typical bulk decay coefficients (1/day) at 20°C
 */
export const BULK_DECAY_COEFFICIENTS = {
  clean_source: -0.5,          // Low organics
  typical: -1.0,               // Average
  high_organics: -2.0,         // High organic content
};

/**
 * Typical wall decay coefficients (m/day)
 */
export const WALL_DECAY_COEFFICIENTS = {
  new_pipe: -0.1,
  average_pipe: -0.5,
  old_pipe: -1.0,
  corroded_pipe: -2.0,
};

/**
 * Temperature correction for decay coefficients
 * k(T) = k(20) × 1.1^(T-20)
 */
export function temperatureCorrectedDecay(
  k20: number,
  temperature: number
): number {
  return k20 * Math.pow(1.1, temperature - 20);
}

// ============================================================================
// Chlorine Decay Model
// ============================================================================

/**
 * First-order bulk decay: C(t) = C0 × e^(kb × t)
 */
export function calculateBulkDecay(
  initialConc: number,         // mg/L
  bulkCoeff: number,           // 1/day (negative)
  travelTime: number           // hours
): number {
  const tDays = travelTime / 24;
  return initialConc * Math.exp(bulkCoeff * tDays);
}

/**
 * Wall decay rate: rw = kw × C / R
 * Where R = hydraulic radius
 */
export function calculateWallDecayRate(
  concentration: number,       // mg/L
  wallCoeff: number,           // m/day
  diameter: number             // mm
): number {
  const R = (diameter / 1000) / 4; // Hydraulic radius for circular pipe
  return wallCoeff * concentration / R;
}

/**
 * Combined bulk and wall decay in pipe
 */
export function calculatePipeDecay(
  initialConc: number,         // mg/L
  bulkCoeff: number,           // 1/day
  wallCoeff: number,           // m/day
  diameter: number,            // mm
  travelTime: number           // hours
): number {
  const R = (diameter / 1000) / 4;
  const kTotal = bulkCoeff + wallCoeff / R;
  const tDays = travelTime / 24;

  return initialConc * Math.exp(kTotal * tDays);
}

/**
 * Calculate chlorine residual at end of pipe
 */
export function calculateChlorineResidual(
  pipe: Pipe,
  inletConc: number,           // mg/L
  velocity: number,            // m/s
  bulkCoeff: number = BULK_DECAY_COEFFICIENTS.typical,
  wallCoeff: number = WALL_DECAY_COEFFICIENTS.average_pipe
): {
  outletConc: number;          // mg/L
  travelTime: number;          // hours
  decayAmount: number;         // mg/L
} {
  if (velocity <= 0) {
    return {
      outletConc: inletConc,
      travelTime: 0,
      decayAmount: 0,
    };
  }

  const travelTime = pipe.length / velocity / 3600; // hours
  const outletConc = calculatePipeDecay(
    inletConc,
    bulkCoeff,
    wallCoeff,
    pipe.diameter,
    travelTime
  );

  return {
    outletConc: Math.max(0, outletConc),
    travelTime,
    decayAmount: inletConc - outletConc,
  };
}

// ============================================================================
// Water Age Model
// ============================================================================

/**
 * Calculate water age at junction considering multiple inflows
 */
export function calculateJunctionAge(
  inflowAges: { age: number; flow: number }[]
): number {
  const totalFlow = inflowAges.reduce((sum, i) => sum + Math.abs(i.flow), 0);
  if (totalFlow === 0) return 0;

  // Flow-weighted average age
  let weightedAge = 0;
  for (const inflow of inflowAges) {
    weightedAge += inflow.age * Math.abs(inflow.flow);
  }

  return weightedAge / totalFlow;
}

/**
 * Calculate age at pipe outlet
 */
export function calculatePipeAge(
  inletAge: number,            // hours
  travelTime: number           // hours
): number {
  return inletAge + travelTime;
}

/**
 * Calculate age in tank (assumes complete mixing)
 */
export function calculateTankAge(
  currentAge: number,          // Current average age in tank (hours)
  currentVolume: number,       // Current volume (m³)
  inflowAge: number,           // Age of inflow (hours)
  inflowVolume: number,        // Volume of inflow (m³)
  timestep: number             // Time step (hours)
): number {
  const newVolume = currentVolume + inflowVolume;
  if (newVolume <= 0) return currentAge;

  // Mixed age
  const mixedAge = (currentAge * currentVolume + inflowAge * inflowVolume) / newVolume;

  // Add timestep to account for aging during storage
  return mixedAge + timestep;
}

// ============================================================================
// Source Tracing
// ============================================================================

/**
 * Calculate fraction of water from traced source at a junction
 */
export function calculateSourceFraction(
  inflowFractions: { fraction: number; flow: number }[]
): number {
  const totalFlow = inflowFractions.reduce((sum, i) => sum + Math.abs(i.flow), 0);
  if (totalFlow === 0) return 0;

  let weightedFraction = 0;
  for (const inflow of inflowFractions) {
    weightedFraction += inflow.fraction * Math.abs(inflow.flow);
  }

  return weightedFraction / totalFlow;
}

// ============================================================================
// Water Quality Analysis Functions
// ============================================================================

export interface ChlorineAnalysisResult {
  nodeId: string;
  chlorineResidual: number;    // mg/L
  waterAge: number;            // hours
  travelDistance: number;      // m from source
  meetsStandard: boolean;
  warnings: string[];
}

/**
 * Analyze chlorine residual at critical points
 */
export function analyzeChlorineDistribution(
  sourceConcentration: number, // mg/L
  networkPaths: Array<{
    nodeId: string;
    pipes: Array<{
      length: number;
      diameter: number;
      velocity: number;
    }>;
  }>,
  options: {
    bulkCoeff?: number;
    wallCoeff?: number;
    minResidual?: number;
  } = {}
): ChlorineAnalysisResult[] {
  const bulkCoeff = options.bulkCoeff ?? BULK_DECAY_COEFFICIENTS.typical;
  const wallCoeff = options.wallCoeff ?? WALL_DECAY_COEFFICIENTS.average_pipe;
  const minResidual = options.minResidual ?? CHILEAN_WATER_STANDARDS.chlorine.minimum;

  const results: ChlorineAnalysisResult[] = [];

  for (const path of networkPaths) {
    let currentConc = sourceConcentration;
    let totalAge = 0;
    let totalDistance = 0;
    const warnings: string[] = [];

    for (const pipe of path.pipes) {
      if (pipe.velocity <= 0) continue;

      const travelTime = pipe.length / pipe.velocity / 3600; // hours
      totalAge += travelTime;
      totalDistance += pipe.length;

      currentConc = calculatePipeDecay(
        currentConc,
        bulkCoeff,
        wallCoeff,
        pipe.diameter,
        travelTime
      );
    }

    const meetsStandard = currentConc >= minResidual;
    if (!meetsStandard) {
      warnings.push(`Chlorine residual ${currentConc.toFixed(2)} mg/L below minimum ${minResidual} mg/L`);
    }
    if (currentConc < 0.1) {
      warnings.push('Critical: Chlorine nearly depleted');
    }
    if (totalAge > 48) {
      warnings.push(`High water age: ${totalAge.toFixed(1)} hours`);
    }

    results.push({
      nodeId: path.nodeId,
      chlorineResidual: Math.max(0, currentConc),
      waterAge: totalAge,
      travelDistance: totalDistance,
      meetsStandard,
      warnings,
    });
  }

  return results;
}

/**
 * Calculate required source chlorine concentration
 * to maintain minimum residual at farthest point
 */
export function calculateRequiredChlorineDose(
  targetMinResidual: number,   // mg/L at farthest point
  maxTravelTime: number,       // hours
  maxPipeDiameter: number,     // mm (conservative - smallest adds most decay)
  options: {
    bulkCoeff?: number;
    wallCoeff?: number;
    safetyFactor?: number;
  } = {}
): {
  requiredDose: number;        // mg/L
  expectedResidual: number;    // mg/L at farthest point
  safetyMargin: number;        // mg/L
} {
  const bulkCoeff = options.bulkCoeff ?? BULK_DECAY_COEFFICIENTS.typical;
  const wallCoeff = options.wallCoeff ?? WALL_DECAY_COEFFICIENTS.average_pipe;
  const safetyFactor = options.safetyFactor ?? 1.2;

  // Calculate total decay coefficient
  const R = (maxPipeDiameter / 1000) / 4;
  const kTotal = bulkCoeff + wallCoeff / R;
  const tDays = maxTravelTime / 24;

  // C(t) = C0 × e^(k×t) → C0 = C(t) / e^(k×t)
  const decayFactor = Math.exp(kTotal * tDays);
  const requiredDose = (targetMinResidual * safetyFactor) / decayFactor;

  // Verify
  const expectedResidual = requiredDose * decayFactor;

  return {
    requiredDose: Math.min(CHILEAN_WATER_STANDARDS.chlorine.maximum, requiredDose),
    expectedResidual,
    safetyMargin: expectedResidual - targetMinResidual,
  };
}

/**
 * Identify dead ends and stagnation zones
 */
export function identifyStagnationZones(
  nodeConnections: Map<string, string[]>, // nodeId → connected linkIds
  linkFlows: Map<string, number>,        // linkId → flow (L/s)
  minFlowThreshold: number = 0.01        // L/s
): {
  deadEnds: string[];
  lowFlowNodes: string[];
  stagnantPipes: string[];
} {
  const deadEnds: string[] = [];
  const lowFlowNodes: string[] = [];
  const stagnantPipes: string[] = [];

  // Find dead ends (single connection)
  for (const [nodeId, links] of nodeConnections) {
    if (links.length === 1) {
      deadEnds.push(nodeId);
    }

    // Check for low flow
    let totalFlow = 0;
    for (const linkId of links) {
      totalFlow += Math.abs(linkFlows.get(linkId) || 0);
    }
    if (totalFlow < minFlowThreshold * links.length) {
      lowFlowNodes.push(nodeId);
    }
  }

  // Find stagnant pipes
  for (const [linkId, flow] of linkFlows) {
    if (Math.abs(flow) < minFlowThreshold) {
      stagnantPipes.push(linkId);
    }
  }

  return { deadEnds, lowFlowNodes, stagnantPipes };
}

// ============================================================================
// Tank Quality Modeling
// ============================================================================

export interface TankQualityResult {
  tankId: string;
  averageAge: number;          // hours
  chlorineResidual: number;    // mg/L
  turnoverTime: number;        // hours (time to replace volume)
  stratification: 'mixed' | 'stratified' | 'stagnant';
  recommendations: string[];
}

/**
 * Analyze tank water quality
 */
export function analyzeTankQuality(
  tankId: string,
  tankVolume: number,          // m³
  averageInflow: number,       // L/s
  inletChlorine: number,       // mg/L
  currentAge: number,          // hours
  options: {
    bulkCoeff?: number;
    targetAge?: number;        // hours
    targetChlorine?: number;   // mg/L
  } = {}
): TankQualityResult {
  const bulkCoeff = options.bulkCoeff ?? BULK_DECAY_COEFFICIENTS.typical;
  const targetAge = options.targetAge ?? 24;
  const targetChlorine = options.targetChlorine ?? CHILEAN_WATER_STANDARDS.chlorine.minimum;

  const recommendations: string[] = [];

  // Turnover time
  const inflowM3h = averageInflow * 3.6;
  const turnoverTime = inflowM3h > 0 ? tankVolume / inflowM3h : Infinity;

  // Chlorine decay during storage
  const storageDecay = calculateBulkDecay(inletChlorine, bulkCoeff, turnoverTime);

  // Determine stratification based on turnover
  let stratification: 'mixed' | 'stratified' | 'stagnant';
  if (turnoverTime < 12) {
    stratification = 'mixed';
  } else if (turnoverTime < 48) {
    stratification = 'stratified';
  } else {
    stratification = 'stagnant';
    recommendations.push('Consider tank mixing or level controls to improve turnover');
  }

  // Age recommendations
  if (currentAge > targetAge) {
    recommendations.push(`Water age ${currentAge.toFixed(0)}h exceeds target ${targetAge}h - increase turnover`);
  }

  // Chlorine recommendations
  if (storageDecay < targetChlorine) {
    recommendations.push(`Chlorine may fall below ${targetChlorine} mg/L - consider booster chlorination`);
  }

  if (turnoverTime > 72) {
    recommendations.push('Turnover time exceeds 72 hours - risk of water quality degradation');
  }

  return {
    tankId,
    averageAge: currentAge,
    chlorineResidual: storageDecay,
    turnoverTime,
    stratification,
    recommendations,
  };
}

// ============================================================================
// Format Functions
// ============================================================================

export function formatChlorineAnalysis(results: ChlorineAnalysisResult[]): string {
  const lines = [
    `Chlorine Distribution Analysis`,
    `========================================`,
    `Min Standard: ${CHILEAN_WATER_STANDARDS.chlorine.minimum} mg/L`,
    ``,
  ];

  for (const result of results) {
    const status = result.meetsStandard ? '✓' : '✗';
    lines.push(`${status} Node ${result.nodeId}:`);
    lines.push(`    Residual: ${result.chlorineResidual.toFixed(2)} mg/L`);
    lines.push(`    Age: ${result.waterAge.toFixed(1)} hours`);
    lines.push(`    Distance: ${result.travelDistance.toFixed(0)} m`);

    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        lines.push(`    ⚠ ${warning}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function formatTankQuality(result: TankQualityResult): string {
  return [
    `Tank Water Quality: ${result.tankId}`,
    `========================================`,
    `Average Age: ${result.averageAge.toFixed(1)} hours`,
    `Chlorine Residual: ${result.chlorineResidual.toFixed(2)} mg/L`,
    `Turnover Time: ${result.turnoverTime.toFixed(1)} hours`,
    `Mixing Status: ${result.stratification}`,
    ``,
    `Recommendations:`,
    ...result.recommendations.map(r => `  • ${r}`),
  ].join('\n');
}

export function formatQualityStandards(): string {
  const std = CHILEAN_WATER_STANDARDS;
  return [
    `Chilean Water Quality Standards (NCh 409)`,
    `========================================`,
    `Chlorine Residual:`,
    `  Minimum: ${std.chlorine.minimum} mg/L`,
    `  Maximum: ${std.chlorine.maximum} mg/L`,
    `  Recommended: ${std.chlorine.recommended.min}-${std.chlorine.recommended.max} mg/L`,
    ``,
    `Turbidity: < ${std.turbidity.maximum} NTU`,
    `pH: ${std.pH.min} - ${std.pH.max}`,
    `Temperature: < ${std.temperature.maximum}°C`,
  ].join('\n');
}
