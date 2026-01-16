/**
 * Traffic Analysis and ESAL Calculations
 *
 * Calculates Equivalent Single Axle Loads (ESALs) for pavement design
 * following AASHTO methodology.
 *
 * Reference: AASHTO Guide for Design of Pavement Structures, 1993
 *
 * @module pavement/traffic-analysis
 */

// ============================================================================
// Types
// ============================================================================

export type VehicleClass =
  | 'passenger_car'
  | 'light_truck'
  | 'bus_2_axle'
  | 'bus_3_axle'
  | 'truck_2_axle'
  | 'truck_3_axle'
  | 'truck_4_axle'
  | 'truck_5_axle'
  | 'semi_trailer'
  | 'full_trailer';

export type RoadClassificationType =
  | 'express'
  | 'trunk'
  | 'collector'
  | 'service'
  | 'local'
  | 'passage';

export interface TrafficInput {
  /** Annual Average Daily Traffic (total vehicles) */
  aadt: number;
  /** Commercial vehicles percentage (trucks + buses) */
  truckPercentage: number;
  /** Annual traffic growth rate (%) */
  growthRate: number;
  /** Design period (years) - typically 20 */
  designPeriod: number;
  /** Directional distribution factor (0.5-0.6) */
  directionalFactor: number;
  /** Lane distribution factor (for multi-lane roads) */
  laneDistribution: number;
  /** Vehicle class distribution (percentages, should sum to truckPercentage) */
  vehicleDistribution?: Partial<Record<VehicleClass, number>>;
}

export interface ESALResult {
  /** Total design ESALs (W18) */
  W18: number;
  /** First year ESALs */
  annualESAL: number;
  /** Average daily ESALs */
  dailyESAL: number;
  /** Truck factor (weighted average LEF) */
  truckFactor: number;
  /** Load equivalency factors by vehicle class */
  equivalencyFactors: Record<VehicleClass, number>;
  /** Growth factor applied */
  growthFactor: number;
  /** Design period used */
  designPeriod: number;
  /** Warnings or notes */
  warnings: string[];
}

export interface VehicleLoadData {
  /** Vehicle class */
  class: VehicleClass;
  /** Description in Spanish */
  description: string;
  /** Typical axle configuration */
  axleConfig: string;
  /** Typical gross weight (kg) */
  typicalWeight: number;
  /** Load Equivalency Factor for flexible pavement (pt=2.5) */
  LEF_flexible: number;
  /** Load Equivalency Factor for rigid pavement */
  LEF_rigid: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Load Equivalency Factors (LEF) by vehicle class
 * Based on AASHTO load equivalency tables for terminal serviceability pt=2.5
 * and Chilean truck configurations
 */
export const VEHICLE_LOAD_DATA: Record<VehicleClass, VehicleLoadData> = {
  passenger_car: {
    class: 'passenger_car',
    description: 'Automóvil',
    axleConfig: '1-1',
    typicalWeight: 1500,
    LEF_flexible: 0.0004,
    LEF_rigid: 0.0002,
  },
  light_truck: {
    class: 'light_truck',
    description: 'Camioneta / Furgón',
    axleConfig: '1-1',
    typicalWeight: 3500,
    LEF_flexible: 0.02,
    LEF_rigid: 0.01,
  },
  bus_2_axle: {
    class: 'bus_2_axle',
    description: 'Bus 2 ejes',
    axleConfig: '1-2',
    typicalWeight: 12000,
    LEF_flexible: 0.65,
    LEF_rigid: 0.50,
  },
  bus_3_axle: {
    class: 'bus_3_axle',
    description: 'Bus 3 ejes',
    axleConfig: '1-2-2',
    typicalWeight: 17000,
    LEF_flexible: 1.20,
    LEF_rigid: 0.95,
  },
  truck_2_axle: {
    class: 'truck_2_axle',
    description: 'Camión simple 2 ejes',
    axleConfig: '1-2',
    typicalWeight: 15000,
    LEF_flexible: 0.85,
    LEF_rigid: 0.65,
  },
  truck_3_axle: {
    class: 'truck_3_axle',
    description: 'Camión simple 3 ejes',
    axleConfig: '1-2-2',
    typicalWeight: 23000,
    LEF_flexible: 1.50,
    LEF_rigid: 1.20,
  },
  truck_4_axle: {
    class: 'truck_4_axle',
    description: 'Camión 4 ejes',
    axleConfig: '1-2-2-2',
    typicalWeight: 28000,
    LEF_flexible: 2.10,
    LEF_rigid: 1.75,
  },
  truck_5_axle: {
    class: 'truck_5_axle',
    description: 'Camión 5 ejes',
    axleConfig: '1-2-2-2-2',
    typicalWeight: 35000,
    LEF_flexible: 2.80,
    LEF_rigid: 2.30,
  },
  semi_trailer: {
    class: 'semi_trailer',
    description: 'Tractocamión con semirremolque',
    axleConfig: '1-2-3',
    typicalWeight: 40000,
    LEF_flexible: 3.50,
    LEF_rigid: 2.80,
  },
  full_trailer: {
    class: 'full_trailer',
    description: 'Camión con remolque',
    axleConfig: '1-2-2-2-2',
    typicalWeight: 45000,
    LEF_flexible: 4.50,
    LEF_rigid: 3.60,
  },
};

/**
 * Default vehicle distribution for different road types
 * Percentages are relative to total commercial vehicles
 */
export const DEFAULT_VEHICLE_DISTRIBUTION: Record<
  RoadClassificationType,
  Partial<Record<VehicleClass, number>>
> = {
  express: {
    bus_2_axle: 5,
    bus_3_axle: 3,
    truck_2_axle: 25,
    truck_3_axle: 20,
    truck_4_axle: 15,
    truck_5_axle: 12,
    semi_trailer: 15,
    full_trailer: 5,
  },
  trunk: {
    bus_2_axle: 8,
    bus_3_axle: 4,
    truck_2_axle: 30,
    truck_3_axle: 22,
    truck_4_axle: 14,
    truck_5_axle: 10,
    semi_trailer: 10,
    full_trailer: 2,
  },
  collector: {
    bus_2_axle: 12,
    bus_3_axle: 3,
    truck_2_axle: 40,
    truck_3_axle: 25,
    truck_4_axle: 10,
    truck_5_axle: 5,
    semi_trailer: 5,
    full_trailer: 0,
  },
  service: {
    bus_2_axle: 15,
    bus_3_axle: 2,
    truck_2_axle: 50,
    truck_3_axle: 20,
    truck_4_axle: 8,
    truck_5_axle: 3,
    semi_trailer: 2,
    full_trailer: 0,
  },
  local: {
    bus_2_axle: 10,
    bus_3_axle: 0,
    truck_2_axle: 60,
    truck_3_axle: 20,
    truck_4_axle: 8,
    truck_5_axle: 2,
    semi_trailer: 0,
    full_trailer: 0,
  },
  passage: {
    bus_2_axle: 5,
    bus_3_axle: 0,
    truck_2_axle: 80,
    truck_3_axle: 10,
    truck_4_axle: 5,
    truck_5_axle: 0,
    semi_trailer: 0,
    full_trailer: 0,
  },
};

/**
 * Typical ESAL ranges by Chilean road classification
 * For 20-year design period
 */
export const CHILE_ROAD_TRAFFIC: Record<
  RoadClassificationType,
  { minESAL: number; maxESAL: number; typicalAADT: { min: number; max: number } }
> = {
  express: {
    minESAL: 10_000_000,
    maxESAL: 100_000_000,
    typicalAADT: { min: 20000, max: 80000 },
  },
  trunk: {
    minESAL: 3_000_000,
    maxESAL: 30_000_000,
    typicalAADT: { min: 10000, max: 40000 },
  },
  collector: {
    minESAL: 500_000,
    maxESAL: 5_000_000,
    typicalAADT: { min: 3000, max: 15000 },
  },
  service: {
    minESAL: 100_000,
    maxESAL: 1_000_000,
    typicalAADT: { min: 1000, max: 8000 },
  },
  local: {
    minESAL: 50_000,
    maxESAL: 500_000,
    typicalAADT: { min: 500, max: 3000 },
  },
  passage: {
    minESAL: 10_000,
    maxESAL: 100_000,
    typicalAADT: { min: 100, max: 1000 },
  },
};

/**
 * Lane distribution factors for multi-lane highways
 * Percentage of trucks in design lane
 */
export const LANE_DISTRIBUTION_FACTORS: Record<number, number> = {
  1: 1.0, // Single lane each direction
  2: 0.9, // 2 lanes each direction
  3: 0.7, // 3 lanes each direction
  4: 0.6, // 4+ lanes each direction
};

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate growth factor for compound traffic growth
 *
 * GF = ((1 + r)^n - 1) / r
 *
 * @param rate Annual growth rate (decimal, e.g., 0.03 for 3%)
 * @param years Design period in years
 * @returns Growth factor
 */
export function calculateGrowthFactor(rate: number, years: number): number {
  if (rate === 0) {
    return years;
  }
  return (Math.pow(1 + rate, years) - 1) / rate;
}

/**
 * Get Load Equivalency Factor for a vehicle class
 *
 * @param vehicleClass Vehicle classification
 * @param pavementType Pavement type (flexible or rigid)
 * @returns Load equivalency factor
 */
export function getEquivalencyFactor(
  vehicleClass: VehicleClass,
  pavementType: 'flexible' | 'rigid' = 'flexible'
): number {
  const data = VEHICLE_LOAD_DATA[vehicleClass];
  if (!data) return 0;
  return pavementType === 'flexible' ? data.LEF_flexible : data.LEF_rigid;
}

/**
 * Calculate weighted truck factor from vehicle distribution
 *
 * @param distribution Vehicle class distribution (percentages of commercial vehicles)
 * @param pavementType Pavement type
 * @returns Weighted truck factor
 */
export function calculateTruckFactor(
  distribution: Partial<Record<VehicleClass, number>>,
  pavementType: 'flexible' | 'rigid' = 'flexible'
): number {
  let totalWeight = 0;
  let weightedLEF = 0;

  for (const [vehicleClass, percentage] of Object.entries(distribution)) {
    if (percentage && percentage > 0) {
      const LEF = getEquivalencyFactor(vehicleClass as VehicleClass, pavementType);
      weightedLEF += (percentage / 100) * LEF;
      totalWeight += percentage / 100;
    }
  }

  if (totalWeight === 0) return 1.0;
  return weightedLEF / totalWeight;
}

/**
 * Calculate design ESALs (W18) from traffic data
 *
 * W18 = AADT × T × TF × D × L × GF × 365
 *
 * Where:
 * - AADT = Annual Average Daily Traffic
 * - T = Truck percentage (decimal)
 * - TF = Truck Factor (weighted LEF)
 * - D = Directional factor
 * - L = Lane distribution factor
 * - GF = Growth factor
 * - 365 = Days per year
 *
 * @param input Traffic input parameters
 * @param pavementType Type of pavement for LEF selection
 * @returns ESAL calculation result
 */
export function calculateESAL(
  input: TrafficInput,
  pavementType: 'flexible' | 'rigid' = 'flexible'
): ESALResult {
  const warnings: string[] = [];

  // Validate inputs
  if (input.aadt <= 0) {
    warnings.push('AADT must be positive');
  }
  if (input.truckPercentage < 0 || input.truckPercentage > 100) {
    warnings.push('Truck percentage must be between 0 and 100');
  }
  if (input.growthRate < 0 || input.growthRate > 0.15) {
    warnings.push('Growth rate appears unusual (expected 0-15%)');
  }
  if (input.designPeriod < 10 || input.designPeriod > 40) {
    warnings.push('Design period typically ranges from 10 to 40 years');
  }

  // Use default distribution if not provided
  const distribution = input.vehicleDistribution ||
    DEFAULT_VEHICLE_DISTRIBUTION.collector;

  // Calculate truck factor
  const truckFactor = calculateTruckFactor(distribution, pavementType);

  // Calculate growth factor
  const growthFactor = calculateGrowthFactor(
    input.growthRate / 100,
    input.designPeriod
  );

  // Calculate daily trucks
  const dailyTrucks = input.aadt * (input.truckPercentage / 100);

  // Calculate daily ESALs
  const dailyESAL =
    dailyTrucks *
    truckFactor *
    input.directionalFactor *
    input.laneDistribution;

  // Calculate annual ESALs (first year)
  const annualESAL = dailyESAL * 365;

  // Calculate total design ESALs
  const W18 = annualESAL * growthFactor;

  // Build equivalency factors record
  const equivalencyFactors: Record<VehicleClass, number> = {} as Record<
    VehicleClass,
    number
  >;
  for (const vehicleClass of Object.keys(VEHICLE_LOAD_DATA) as VehicleClass[]) {
    equivalencyFactors[vehicleClass] = getEquivalencyFactor(
      vehicleClass,
      pavementType
    );
  }

  // Add warning if ESAL seems unusual
  if (W18 > 100_000_000) {
    warnings.push('Calculated ESALs exceed 100 million - verify inputs');
  }
  if (W18 < 10_000) {
    warnings.push('Calculated ESALs very low - verify truck percentage and AADT');
  }

  return {
    W18: Math.round(W18),
    annualESAL: Math.round(annualESAL),
    dailyESAL: Math.round(dailyESAL),
    truckFactor: Math.round(truckFactor * 1000) / 1000,
    equivalencyFactors,
    growthFactor: Math.round(growthFactor * 100) / 100,
    designPeriod: input.designPeriod,
    warnings,
  };
}

/**
 * Estimate traffic data from road classification
 *
 * @param classification Road classification
 * @param aadt Optional AADT override
 * @returns Typical traffic input for the classification
 */
export function getTypicalTrafficInput(
  classification: RoadClassificationType,
  aadt?: number
): TrafficInput {
  const trafficData = CHILE_ROAD_TRAFFIC[classification];
  const typicalAADT = aadt ||
    (trafficData.typicalAADT.min + trafficData.typicalAADT.max) / 2;

  // Typical truck percentages by road type
  const truckPercentages: Record<RoadClassificationType, number> = {
    express: 15,
    trunk: 12,
    collector: 8,
    service: 6,
    local: 4,
    passage: 2,
  };

  // Typical growth rates (Chilean urban areas)
  const growthRates: Record<RoadClassificationType, number> = {
    express: 3,
    trunk: 3,
    collector: 2.5,
    service: 2,
    local: 1.5,
    passage: 1,
  };

  return {
    aadt: typicalAADT,
    truckPercentage: truckPercentages[classification],
    growthRate: growthRates[classification],
    designPeriod: 20,
    directionalFactor: 0.5,
    laneDistribution: LANE_DISTRIBUTION_FACTORS[1],
    vehicleDistribution: DEFAULT_VEHICLE_DISTRIBUTION[classification],
  };
}

/**
 * Get design ESAL category description
 *
 * @param W18 Design ESALs
 * @returns Category description
 */
export function getESALCategory(W18: number): string {
  if (W18 < 50_000) return 'Very Light';
  if (W18 < 150_000) return 'Light';
  if (W18 < 500_000) return 'Light-Medium';
  if (W18 < 2_000_000) return 'Medium';
  if (W18 < 7_000_000) return 'Medium-Heavy';
  if (W18 < 30_000_000) return 'Heavy';
  return 'Very Heavy';
}

/**
 * Format ESAL result for display
 *
 * @param result ESAL calculation result
 * @returns Formatted string
 */
export function formatESALResult(result: ESALResult): string {
  const lines: string[] = [
    '=== Traffic Analysis / ESAL Calculation ===',
    '',
    `Design ESALs (W18): ${result.W18.toLocaleString()}`,
    `Traffic Category: ${getESALCategory(result.W18)}`,
    '',
    'Input Parameters:',
    `  Design Period: ${result.designPeriod} years`,
    `  Growth Factor: ${result.growthFactor.toFixed(2)}`,
    `  Truck Factor: ${result.truckFactor.toFixed(3)}`,
    '',
    'Daily/Annual:',
    `  Daily ESALs (Year 1): ${result.dailyESAL.toLocaleString()}`,
    `  Annual ESALs (Year 1): ${result.annualESAL.toLocaleString()}`,
  ];

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join('\n');
}
