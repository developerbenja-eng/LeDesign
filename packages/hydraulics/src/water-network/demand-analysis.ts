/**
 * Water Demand Analysis Module
 *
 * Population-based demand estimation, peak factors, and demand patterns
 * Based on Chilean standards: NCh 691, NCh 2485, SISS, MINVU
 */

import { Pattern } from './network-elements';

// ============================================================================
// Types
// ============================================================================

export type LandUseCategory =
  | 'residential_low'      // Residential low density (< 100 hab/ha)
  | 'residential_medium'   // Residential medium density (100-250 hab/ha)
  | 'residential_high'     // Residential high density (> 250 hab/ha)
  | 'commercial'           // Commercial areas
  | 'industrial_light'     // Light industrial
  | 'industrial_heavy'     // Heavy industrial
  | 'institutional'        // Schools, hospitals, etc.
  | 'mixed_use'           // Mixed residential/commercial
  | 'rural';              // Rural areas

export type ClimateZone = 'norte' | 'centro' | 'sur' | 'austral';

export interface DemandFactors {
  baseConsumption: number;     // L/hab/día base
  climateFactor: number;       // Climate adjustment
  peakHourFactor: number;      // K1 - maximum hour factor
  peakDayFactor: number;       // K2 - maximum day factor
  lossPercentage: number;      // Non-revenue water %
}

export interface PopulationDemand {
  population: number;
  area: number;                // hectares
  density: number;             // hab/ha
  landUse: LandUseCategory;
  averageDailyDemand: number;  // L/s
  maximumDailyDemand: number;  // L/s (with K2)
  maximumHourlyDemand: number; // L/s (with K1 × K2)
  fireFlowDemand: number;      // L/s
  totalDesignDemand: number;   // L/s (max hourly + fire)
}

export interface ServiceConnection {
  type: 'residential' | 'commercial' | 'industrial' | 'institutional';
  units: number;               // Number of units/houses
  consumptionPerUnit: number;  // L/day per unit
  simultaneityFactor: number;  // Simultaneity factor
  designFlow: number;          // L/s
  connectionDiameter: number;  // mm
}

export interface FireFlowRequirement {
  category: string;
  requiredFlow: number;        // L/s
  duration: number;            // hours
  residualPressure: number;    // m
  hydrantSpacing: number;      // m
}

// ============================================================================
// Constants - Chilean Standards (NCh 691, SISS)
// ============================================================================

/**
 * Base water consumption by land use (L/hab/día)
 * Source: NCh 691, SISS Norma Técnica
 */
export const BASE_CONSUMPTION: Record<LandUseCategory, number> = {
  residential_low: 200,        // Houses with gardens
  residential_medium: 170,     // Apartments with some green areas
  residential_high: 150,       // High-rise apartments
  commercial: 30,              // L/m²/día
  industrial_light: 50,        // L/m²/día
  industrial_heavy: 100,       // L/m²/día
  institutional: 50,           // L/person/día (schools, offices)
  mixed_use: 180,              // Weighted average
  rural: 120,                  // Basic consumption
};

/**
 * Climate factors by zone
 * Higher in northern Chile due to aridity
 */
export const CLIMATE_FACTORS: Record<ClimateZone, number> = {
  norte: 1.30,                 // Atacama, Coquimbo
  centro: 1.15,                // Valparaíso, Santiago, O'Higgins
  sur: 1.00,                   // Maule to Los Lagos
  austral: 0.90,               // Aysén, Magallanes
};

/**
 * Peak hour factor K1 by population
 * K1 = 1.5 for P > 10,000; increases for smaller populations
 */
export function getPeakHourFactor(population: number): number {
  if (population >= 100000) return 1.5;
  if (population >= 50000) return 1.6;
  if (population >= 20000) return 1.7;
  if (population >= 10000) return 1.8;
  if (population >= 5000) return 2.0;
  if (population >= 2000) return 2.2;
  return 2.5;
}

/**
 * Peak day factor K2 by population
 * K2 = 1.2 for P > 10,000; increases for smaller populations
 */
export function getPeakDayFactor(population: number): number {
  if (population >= 100000) return 1.2;
  if (population >= 50000) return 1.25;
  if (population >= 20000) return 1.3;
  if (population >= 10000) return 1.35;
  if (population >= 5000) return 1.4;
  if (population >= 2000) return 1.5;
  return 1.6;
}

/**
 * Non-revenue water (losses) percentage by system age
 */
export const LOSS_PERCENTAGES = {
  new_system: 15,              // New, well-maintained
  average_system: 25,          // Average Chilean urban
  old_system: 35,              // Older systems
  rural_system: 40,            // Rural systems
};

/**
 * Fire flow requirements by building/area type (NCh 691)
 */
export const FIRE_FLOW_REQUIREMENTS: Record<string, FireFlowRequirement> = {
  residential_single: {
    category: 'Single-family residential',
    requiredFlow: 16,          // L/s
    duration: 2,               // hours
    residualPressure: 7,       // m
    hydrantSpacing: 200,       // m
  },
  residential_multi: {
    category: 'Multi-family residential',
    requiredFlow: 32,          // L/s
    duration: 2,
    residualPressure: 7,
    hydrantSpacing: 150,
  },
  commercial_small: {
    category: 'Small commercial',
    requiredFlow: 32,          // L/s
    duration: 2,
    residualPressure: 7,
    hydrantSpacing: 150,
  },
  commercial_large: {
    category: 'Large commercial/Industrial',
    requiredFlow: 63,          // L/s
    duration: 3,
    residualPressure: 10,
    hydrantSpacing: 100,
  },
  industrial: {
    category: 'Industrial',
    requiredFlow: 95,          // L/s
    duration: 4,
    residualPressure: 10,
    hydrantSpacing: 80,
  },
  high_risk: {
    category: 'High-risk facilities',
    requiredFlow: 126,         // L/s
    duration: 4,
    residualPressure: 10,
    hydrantSpacing: 60,
  },
};

/**
 * Population density by land use (hab/ha)
 */
export const POPULATION_DENSITY: Record<LandUseCategory, { typical: number; max: number }> = {
  residential_low: { typical: 50, max: 100 },
  residential_medium: { typical: 150, max: 250 },
  residential_high: { typical: 350, max: 600 },
  commercial: { typical: 0, max: 0 }, // Use employees instead
  industrial_light: { typical: 0, max: 0 },
  industrial_heavy: { typical: 0, max: 0 },
  institutional: { typical: 0, max: 0 },
  mixed_use: { typical: 200, max: 400 },
  rural: { typical: 10, max: 30 },
};

// ============================================================================
// Demand Calculation Functions
// ============================================================================

/**
 * Calculate water demand for a service area
 */
export function calculateAreaDemand(
  area: number,                // hectares
  landUse: LandUseCategory,
  climateZone: ClimateZone,
  population?: number,         // Override calculated population
  options: {
    lossPercentage?: number;
    fireFlowCategory?: keyof typeof FIRE_FLOW_REQUIREMENTS;
  } = {}
): PopulationDemand {
  // Determine population
  const density = POPULATION_DENSITY[landUse].typical;
  const pop = population ?? Math.round(area * density);

  // Get demand factors
  const baseConsumption = BASE_CONSUMPTION[landUse];
  const climateFactor = CLIMATE_FACTORS[climateZone];
  const K1 = getPeakHourFactor(pop);
  const K2 = getPeakDayFactor(pop);
  const lossPercentage = options.lossPercentage ?? LOSS_PERCENTAGES.average_system;

  // Calculate demands
  // Average daily: (population × consumption × climate) / (1 - losses)
  const grossConsumption = baseConsumption * climateFactor;
  const netConsumption = grossConsumption / (1 - lossPercentage / 100);

  const averageDailyDemandLpd = pop * netConsumption; // L/day
  const averageDailyDemand = averageDailyDemandLpd / 86400; // L/s

  const maximumDailyDemand = averageDailyDemand * K2;
  const maximumHourlyDemand = averageDailyDemand * K1 * K2;

  // Fire flow
  const fireCategory = options.fireFlowCategory ?? 'residential_single';
  const fireFlowDemand = FIRE_FLOW_REQUIREMENTS[fireCategory]?.requiredFlow ?? 16;

  // Total design demand (maximum hourly + one fire)
  const totalDesignDemand = maximumHourlyDemand + fireFlowDemand;

  return {
    population: pop,
    area,
    density,
    landUse,
    averageDailyDemand,
    maximumDailyDemand,
    maximumHourlyDemand,
    fireFlowDemand,
    totalDesignDemand,
  };
}

/**
 * Calculate demand for a single connection
 */
export function calculateConnectionDemand(
  type: ServiceConnection['type'],
  units: number,
  options: {
    consumptionPerUnit?: number; // L/day
    persons?: number;            // For residential
  } = {}
): ServiceConnection {
  let consumptionPerUnit: number;
  let simultaneityFactor: number;

  switch (type) {
    case 'residential':
      consumptionPerUnit = options.consumptionPerUnit ?? (options.persons ?? 4) * 200;
      simultaneityFactor = units === 1 ? 1.0 : Math.max(0.3, 1 / Math.sqrt(units));
      break;
    case 'commercial':
      consumptionPerUnit = options.consumptionPerUnit ?? 500;
      simultaneityFactor = 0.8;
      break;
    case 'industrial':
      consumptionPerUnit = options.consumptionPerUnit ?? 2000;
      simultaneityFactor = 0.9;
      break;
    case 'institutional':
      consumptionPerUnit = options.consumptionPerUnit ?? 1000;
      simultaneityFactor = 0.7;
      break;
  }

  // Design flow (L/s)
  const totalDaily = units * consumptionPerUnit * simultaneityFactor;
  const designFlow = totalDaily / 86400 * 2.5; // With peak factor

  // Select connection diameter based on flow
  let connectionDiameter: number;
  if (designFlow < 0.3) connectionDiameter = 20;
  else if (designFlow < 0.6) connectionDiameter = 25;
  else if (designFlow < 1.2) connectionDiameter = 32;
  else if (designFlow < 2.0) connectionDiameter = 40;
  else if (designFlow < 4.0) connectionDiameter = 50;
  else connectionDiameter = 63;

  return {
    type,
    units,
    consumptionPerUnit,
    simultaneityFactor,
    designFlow,
    connectionDiameter,
  };
}

/**
 * Calculate storage tank volume requirements (NCh 691)
 */
export function calculateStorageRequirements(
  maximumDailyDemand: number,  // L/s
  options: {
    regulationHours?: number;   // Hours of equalization storage
    emergencyHours?: number;    // Hours of emergency storage
    fireFlowLps?: number;       // Fire flow (L/s)
    fireDurationHours?: number; // Fire duration (hours)
  } = {}
): {
  regulationVolume: number;    // m³
  emergencyVolume: number;     // m³
  fireVolume: number;          // m³
  totalVolume: number;         // m³
  recommendedDimensions: { diameter: number; height: number };
} {
  const regulationHours = options.regulationHours ?? 4;
  const emergencyHours = options.emergencyHours ?? 2;
  const fireFlowLps = options.fireFlowLps ?? 16;
  const fireDurationHours = options.fireDurationHours ?? 2;

  // Convert L/s to m³/hour
  const maxDailyM3h = maximumDailyDemand * 3.6;

  // Regulation storage (equalization)
  const regulationVolume = maxDailyM3h * regulationHours;

  // Emergency storage
  const emergencyVolume = maxDailyM3h * emergencyHours;

  // Fire storage
  const fireVolume = fireFlowLps * 3.6 * fireDurationHours;

  const totalVolume = regulationVolume + emergencyVolume + fireVolume;

  // Recommend cylindrical tank dimensions (height ≈ diameter)
  const volumeM3 = totalVolume;
  const diameter = Math.pow((4 * volumeM3) / Math.PI, 1/3);
  const height = diameter;

  return {
    regulationVolume,
    emergencyVolume,
    fireVolume,
    totalVolume,
    recommendedDimensions: {
      diameter: Math.ceil(diameter * 10) / 10,
      height: Math.ceil(height * 10) / 10,
    },
  };
}

// ============================================================================
// Demand Patterns
// ============================================================================

/**
 * Standard residential demand pattern (hourly multipliers)
 * Based on Chilean urban consumption patterns
 */
export const RESIDENTIAL_PATTERN: number[] = [
  0.30,  // 00:00
  0.25,  // 01:00
  0.25,  // 02:00
  0.25,  // 03:00
  0.30,  // 04:00
  0.50,  // 05:00
  0.80,  // 06:00
  1.20,  // 07:00 - morning peak start
  1.50,  // 08:00 - morning peak
  1.30,  // 09:00
  1.00,  // 10:00
  0.90,  // 11:00
  1.10,  // 12:00
  1.40,  // 13:00 - lunch peak
  1.20,  // 14:00
  1.00,  // 15:00
  0.90,  // 16:00
  1.00,  // 17:00
  1.30,  // 18:00
  1.50,  // 19:00 - evening peak
  1.40,  // 20:00
  1.20,  // 21:00
  0.80,  // 22:00
  0.50,  // 23:00
];

/**
 * Commercial demand pattern
 */
export const COMMERCIAL_PATTERN: number[] = [
  0.20,  // 00:00
  0.15,  // 01:00
  0.15,  // 02:00
  0.15,  // 03:00
  0.15,  // 04:00
  0.20,  // 05:00
  0.30,  // 06:00
  0.50,  // 07:00
  0.90,  // 08:00 - stores open
  1.20,  // 09:00
  1.40,  // 10:00
  1.50,  // 11:00
  1.60,  // 12:00 - peak
  1.50,  // 13:00
  1.40,  // 14:00
  1.30,  // 15:00
  1.20,  // 16:00
  1.30,  // 17:00
  1.40,  // 18:00
  1.30,  // 19:00
  1.00,  // 20:00
  0.60,  // 21:00 - stores close
  0.40,  // 22:00
  0.25,  // 23:00
];

/**
 * Industrial demand pattern (8-hour shift)
 */
export const INDUSTRIAL_PATTERN: number[] = [
  0.20,  // 00:00
  0.20,  // 01:00
  0.20,  // 02:00
  0.20,  // 03:00
  0.20,  // 04:00
  0.30,  // 05:00
  0.60,  // 06:00
  1.00,  // 07:00 - shift starts
  1.50,  // 08:00
  1.50,  // 09:00
  1.50,  // 10:00
  1.40,  // 11:00
  1.20,  // 12:00 - lunch
  1.40,  // 13:00
  1.50,  // 14:00
  1.50,  // 15:00
  1.30,  // 16:00 - shift ends
  0.80,  // 17:00
  0.40,  // 18:00
  0.30,  // 19:00
  0.25,  // 20:00
  0.20,  // 21:00
  0.20,  // 22:00
  0.20,  // 23:00
];

/**
 * Create a demand pattern
 */
export function createPattern(
  id: string,
  multipliers: number[],
  description?: string
): Pattern {
  // Normalize multipliers so average = 1.0
  const avg = multipliers.reduce((a, b) => a + b, 0) / multipliers.length;
  const normalized = multipliers.map(m => m / avg);

  return {
    id,
    description,
    multipliers: normalized,
  };
}

/**
 * Create standard patterns
 */
export function getStandardPatterns(): Pattern[] {
  return [
    createPattern('residential', RESIDENTIAL_PATTERN, 'Residential consumption pattern'),
    createPattern('commercial', COMMERCIAL_PATTERN, 'Commercial consumption pattern'),
    createPattern('industrial', INDUSTRIAL_PATTERN, 'Industrial 8-hour shift pattern'),
  ];
}

/**
 * Interpolate pattern value at specific time
 */
export function getPatternValue(
  pattern: Pattern,
  time: number,              // hours (can be fractional)
  patternStep: number = 1    // hours
): number {
  const idx = (time / patternStep) % pattern.multipliers.length;
  const lowerIdx = Math.floor(idx);
  const upperIdx = (lowerIdx + 1) % pattern.multipliers.length;
  const fraction = idx - lowerIdx;

  return pattern.multipliers[lowerIdx] * (1 - fraction) +
         pattern.multipliers[upperIdx] * fraction;
}

// ============================================================================
// Demand Allocation to Nodes
// ============================================================================

export interface DemandAllocation {
  nodeId: string;
  baseDemand: number;          // L/s
  patternId?: string;
  category: LandUseCategory;
}

/**
 * Allocate demand to network nodes based on service areas
 */
export function allocateDemandToNodes(
  serviceAreas: Array<{
    nodeIds: string[];
    area: number;              // hectares
    landUse: LandUseCategory;
    population?: number;
  }>,
  climateZone: ClimateZone
): DemandAllocation[] {
  const allocations: DemandAllocation[] = [];

  for (const serviceArea of serviceAreas) {
    const demand = calculateAreaDemand(
      serviceArea.area,
      serviceArea.landUse,
      climateZone,
      serviceArea.population
    );

    // Distribute demand equally among nodes
    const demandPerNode = demand.averageDailyDemand / serviceArea.nodeIds.length;

    // Determine pattern based on land use
    let patternId: string;
    switch (serviceArea.landUse) {
      case 'commercial':
        patternId = 'commercial';
        break;
      case 'industrial_light':
      case 'industrial_heavy':
        patternId = 'industrial';
        break;
      default:
        patternId = 'residential';
    }

    for (const nodeId of serviceArea.nodeIds) {
      allocations.push({
        nodeId,
        baseDemand: demandPerNode,
        patternId,
        category: serviceArea.landUse,
      });
    }
  }

  return allocations;
}

// ============================================================================
// Format Functions
// ============================================================================

export function formatPopulationDemand(demand: PopulationDemand): string {
  return [
    `Water Demand Analysis`,
    `========================================`,
    `Area: ${demand.area.toFixed(1)} ha`,
    `Population: ${demand.population.toLocaleString()} inhabitants`,
    `Density: ${demand.density.toFixed(0)} hab/ha`,
    `Land Use: ${demand.landUse.replace(/_/g, ' ')}`,
    ``,
    `Demand Summary:`,
    `  Average Daily: ${demand.averageDailyDemand.toFixed(2)} L/s`,
    `  Maximum Daily (K2): ${demand.maximumDailyDemand.toFixed(2)} L/s`,
    `  Maximum Hourly (K1×K2): ${demand.maximumHourlyDemand.toFixed(2)} L/s`,
    `  Fire Flow: ${demand.fireFlowDemand.toFixed(1)} L/s`,
    `  Total Design: ${demand.totalDesignDemand.toFixed(2)} L/s`,
  ].join('\n');
}

export function formatStorageRequirements(storage: ReturnType<typeof calculateStorageRequirements>): string {
  return [
    `Storage Tank Requirements`,
    `========================================`,
    `Regulation Volume: ${storage.regulationVolume.toFixed(0)} m³`,
    `Emergency Volume: ${storage.emergencyVolume.toFixed(0)} m³`,
    `Fire Volume: ${storage.fireVolume.toFixed(0)} m³`,
    `Total Volume: ${storage.totalVolume.toFixed(0)} m³`,
    ``,
    `Recommended Tank:`,
    `  Diameter: ${storage.recommendedDimensions.diameter.toFixed(1)} m`,
    `  Height: ${storage.recommendedDimensions.height.toFixed(1)} m`,
  ].join('\n');
}
