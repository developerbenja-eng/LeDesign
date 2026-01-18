/**
 * SCS Curve Number Method Module
 *
 * Implements the USDA-NRCS (formerly SCS) Curve Number method for:
 * - Runoff depth calculation from rainfall
 * - Composite CN for mixed land use
 * - Antecedent Moisture Condition (AMC) adjustments
 * - Unit hydrograph generation (SCS dimensionless)
 * - Peak discharge estimation (TR-55)
 *
 * Based on:
 * - USDA-NRCS Technical Release 55 (TR-55)
 * - National Engineering Handbook (NEH), Part 630
 * - Urban Hydrology for Small Watersheds (1986)
 * - Manual de Drenaje Urbano - MINVU Chile
 */

import { SoilGroup } from './regional-data';

// ============================================================================
// Types
// ============================================================================

export type AntecedentMoistureCondition = 'AMC_I' | 'AMC_II' | 'AMC_III';

export type LandUseCategory =
  | 'residential_1_8_acre'
  | 'residential_1_4_acre'
  | 'residential_1_3_acre'
  | 'residential_1_2_acre'
  | 'residential_1_acre'
  | 'residential_2_acre'
  | 'commercial_industrial'
  | 'commercial_business'
  | 'industrial'
  | 'open_space_good'
  | 'open_space_fair'
  | 'open_space_poor'
  | 'impervious'
  | 'paved_roads'
  | 'gravel_roads'
  | 'dirt_roads'
  | 'agricultural_fallow'
  | 'agricultural_row_crops'
  | 'agricultural_small_grain'
  | 'agricultural_pasture_good'
  | 'agricultural_pasture_fair'
  | 'agricultural_pasture_poor'
  | 'forest_good'
  | 'forest_fair'
  | 'forest_poor'
  | 'meadow_good'
  | 'meadow_fair'
  | 'brush_good'
  | 'brush_fair'
  | 'brush_poor'
  | 'water_wetlands';

export interface LandUseArea {
  category: LandUseCategory;
  area: number;          // m² or ha
  soilGroup: SoilGroup;
  description?: string;
}

export interface CNCalculationInput {
  landUseAreas: LandUseArea[];
  areaUnit?: 'sqm' | 'ha' | 'km2';
  amc?: AntecedentMoistureCondition;
}

export interface CNResult {
  compositeCN: number;
  totalArea: number;           // m²
  potentialRetention: number;  // S (mm)
  initialAbstraction: number;  // Ia (mm)
  areas: Array<{
    category: LandUseCategory;
    area: number;
    soilGroup: SoilGroup;
    cn: number;
    weightedCN: number;
  }>;
  amc: AntecedentMoistureCondition;
  warnings: string[];
}

export interface RunoffCalculationInput {
  rainfall: number;       // P (mm)
  curveNumber: number;    // CN
  iaRatio?: number;       // Ia/S ratio (default 0.2, TR-55 recommends 0.05 for small storms)
}

export interface RunoffResult {
  rainfall: number;        // P (mm)
  curveNumber: number;     // CN
  potentialRetention: number;  // S (mm)
  initialAbstraction: number;  // Ia (mm)
  runoffDepth: number;     // Q (mm)
  runoffRatio: number;     // Q/P
  infiltration: number;    // F (mm)
  storageRemaining: number; // S - F (mm)
}

export interface UnitHydrographInput {
  area: number;           // Watershed area (km²)
  curveNumber: number;    // CN
  timeOfConcentration: number;  // tc (hours)
  rainfall: number;       // P (mm)
  stormDuration: number;  // D (hours)
}

export interface UnitHydrographPoint {
  time: number;           // t (hours)
  timeRatio: number;      // t/Tp
  discharge: number;      // Q (m³/s)
  dischargeRatio: number; // Q/Qp
}

export interface UnitHydrographResult {
  peakDischarge: number;          // Qp (m³/s)
  timeToPeak: number;             // Tp (hours)
  timeOfRise: number;             // tr (hours)
  lagTime: number;                // tL (hours)
  baseTime: number;               // tb (hours)
  totalRunoffVolume: number;      // V (m³)
  runoffDepth: number;            // Q (mm)
  hydrograph: UnitHydrographPoint[];
  peakFactor: number;             // qu (dimensionless peak rate)
}

export interface TR55Input {
  area: number;           // Watershed area (km²)
  curveNumber: number;    // CN
  timeOfConcentration: number;  // tc (hours)
  rainfall24hr: number;   // 24-hour rainfall (mm)
  rainfallType?: 'I' | 'IA' | 'II' | 'III';  // SCS rainfall distribution
}

export interface TR55Result {
  peakDischarge: number;      // Qp (m³/s)
  runoffDepth: number;        // Q (mm)
  runoffVolume: number;       // V (m³)
  unitPeakDischarge: number;  // qu (m³/s/km²/mm)
  timeOfPeak: number;         // hours from start
  rainfallType: string;
  ponding: boolean;
  recommendations: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Standard CN values by land use and soil group
 * Reference: TR-55 Table 2-2a, 2-2b, 2-2c
 */
export const CURVE_NUMBER_TABLE: Record<LandUseCategory, Record<SoilGroup, number>> = {
  // Residential (by lot size)
  residential_1_8_acre: { A: 77, B: 85, C: 90, D: 92 },   // 500 m² - 65% impervious
  residential_1_4_acre: { A: 61, B: 75, C: 83, D: 87 },   // 1000 m² - 38% impervious
  residential_1_3_acre: { A: 57, B: 72, C: 81, D: 86 },   // 1350 m² - 30% impervious
  residential_1_2_acre: { A: 54, B: 70, C: 80, D: 85 },   // 2000 m² - 25% impervious
  residential_1_acre: { A: 51, B: 68, C: 79, D: 84 },     // 4000 m² - 20% impervious
  residential_2_acre: { A: 46, B: 65, C: 77, D: 82 },     // 8000 m² - 12% impervious

  // Commercial/Industrial
  commercial_industrial: { A: 81, B: 88, C: 91, D: 93 },  // 72% impervious
  commercial_business: { A: 89, B: 92, C: 94, D: 95 },    // 85% impervious
  industrial: { A: 81, B: 88, C: 91, D: 93 },

  // Open Space (lawns, parks, golf courses)
  open_space_good: { A: 39, B: 61, C: 74, D: 80 },        // >75% grass cover
  open_space_fair: { A: 49, B: 69, C: 79, D: 84 },        // 50-75% grass cover
  open_space_poor: { A: 68, B: 79, C: 86, D: 89 },        // <50% grass cover

  // Impervious surfaces
  impervious: { A: 98, B: 98, C: 98, D: 98 },
  paved_roads: { A: 98, B: 98, C: 98, D: 98 },
  gravel_roads: { A: 76, B: 85, C: 89, D: 91 },
  dirt_roads: { A: 72, B: 82, C: 87, D: 89 },

  // Agricultural
  agricultural_fallow: { A: 77, B: 86, C: 91, D: 94 },    // Bare soil
  agricultural_row_crops: { A: 67, B: 78, C: 85, D: 89 }, // Contoured
  agricultural_small_grain: { A: 63, B: 75, C: 83, D: 87 },
  agricultural_pasture_good: { A: 39, B: 61, C: 74, D: 80 },
  agricultural_pasture_fair: { A: 49, B: 69, C: 79, D: 84 },
  agricultural_pasture_poor: { A: 68, B: 79, C: 86, D: 89 },

  // Forest
  forest_good: { A: 30, B: 55, C: 70, D: 77 },            // Good cover
  forest_fair: { A: 36, B: 60, C: 73, D: 79 },            // Fair cover
  forest_poor: { A: 45, B: 66, C: 77, D: 83 },            // Poor cover

  // Other
  meadow_good: { A: 30, B: 58, C: 71, D: 78 },
  meadow_fair: { A: 35, B: 63, C: 75, D: 81 },
  brush_good: { A: 30, B: 48, C: 65, D: 73 },
  brush_fair: { A: 35, B: 56, C: 70, D: 77 },
  brush_poor: { A: 48, B: 67, C: 77, D: 83 },

  water_wetlands: { A: 100, B: 100, C: 100, D: 100 },     // Open water
};

/**
 * SCS Dimensionless Unit Hydrograph Ordinates
 * Reference: NEH Part 630, Chapter 16
 */
export const SCS_UNIT_HYDROGRAPH_ORDINATES: Array<{ tRatio: number; qRatio: number }> = [
  { tRatio: 0.0, qRatio: 0.000 },
  { tRatio: 0.1, qRatio: 0.015 },
  { tRatio: 0.2, qRatio: 0.075 },
  { tRatio: 0.3, qRatio: 0.160 },
  { tRatio: 0.4, qRatio: 0.280 },
  { tRatio: 0.5, qRatio: 0.430 },
  { tRatio: 0.6, qRatio: 0.600 },
  { tRatio: 0.7, qRatio: 0.770 },
  { tRatio: 0.8, qRatio: 0.890 },
  { tRatio: 0.9, qRatio: 0.970 },
  { tRatio: 1.0, qRatio: 1.000 },  // Peak
  { tRatio: 1.1, qRatio: 0.980 },
  { tRatio: 1.2, qRatio: 0.920 },
  { tRatio: 1.3, qRatio: 0.840 },
  { tRatio: 1.4, qRatio: 0.750 },
  { tRatio: 1.5, qRatio: 0.660 },
  { tRatio: 1.6, qRatio: 0.560 },
  { tRatio: 1.8, qRatio: 0.420 },
  { tRatio: 2.0, qRatio: 0.320 },
  { tRatio: 2.2, qRatio: 0.240 },
  { tRatio: 2.4, qRatio: 0.180 },
  { tRatio: 2.6, qRatio: 0.130 },
  { tRatio: 2.8, qRatio: 0.098 },
  { tRatio: 3.0, qRatio: 0.075 },
  { tRatio: 3.5, qRatio: 0.036 },
  { tRatio: 4.0, qRatio: 0.018 },
  { tRatio: 4.5, qRatio: 0.009 },
  { tRatio: 5.0, qRatio: 0.004 },
];

/**
 * TR-55 Rainfall Distribution Coefficients
 * C0, C1, C2 for Ia/P calculation
 */
export const RAINFALL_DISTRIBUTION: Record<string, { C0: number; C1: number; C2: number }> = {
  I: { C0: 2.30550, C1: -0.51429, C2: -0.11750 },
  IA: { C0: 2.03250, C1: -0.31583, C2: -0.13748 },
  II: { C0: 2.55323, C1: -0.61512, C2: -0.16403 },
  III: { C0: 2.46532, C1: -0.62257, C2: -0.11657 },
};

// ============================================================================
// Core Curve Number Functions
// ============================================================================

/**
 * Get CN value for a specific land use and soil group
 */
export function getCurveNumber(category: LandUseCategory, soilGroup: SoilGroup): number {
  const cnTable = CURVE_NUMBER_TABLE[category];
  if (!cnTable) {
    throw new Error(`Unknown land use category: ${category}`);
  }
  return cnTable[soilGroup];
}

/**
 * Adjust CN for antecedent moisture condition
 * AMC I: Dry conditions (wilting point)
 * AMC II: Average conditions (default)
 * AMC III: Wet conditions (field capacity)
 *
 * Reference: NEH Part 630, Chapter 10
 */
export function adjustCNForAMC(cn: number, amc: AntecedentMoistureCondition): number {
  switch (amc) {
    case 'AMC_I':
      // Dry: CN_I = CN_II × 4.2 / (10 - 0.058 × CN_II)
      return (cn * 4.2) / (10 - 0.058 * cn);
    case 'AMC_II':
      // Average: No adjustment
      return cn;
    case 'AMC_III':
      // Wet: CN_III = CN_II × 23 / (10 + 0.13 × CN_II)
      return (cn * 23) / (10 + 0.13 * cn);
  }
}

/**
 * Calculate composite (weighted) curve number for multiple land uses
 */
export function calculateCompositeCN(input: CNCalculationInput): CNResult {
  const warnings: string[] = [];

  // Convert areas to m²
  const convertedAreas = input.landUseAreas.map(area => {
    let areaInSqm = area.area;
    if (input.areaUnit === 'ha') {
      areaInSqm = area.area * 10000;
    } else if (input.areaUnit === 'km2') {
      areaInSqm = area.area * 1000000;
    }
    return { ...area, area: areaInSqm };
  });

  // Calculate CN for each area
  const areasWithCN = convertedAreas.map(area => {
    const baseCN = getCurveNumber(area.category, area.soilGroup);
    const adjustedCN = input.amc
      ? adjustCNForAMC(baseCN, input.amc)
      : baseCN;

    return {
      category: area.category,
      area: area.area,
      soilGroup: area.soilGroup,
      cn: adjustedCN,
      weightedCN: adjustedCN * area.area,
    };
  });

  // Calculate total area and composite CN
  const totalArea = areasWithCN.reduce((sum, a) => sum + a.area, 0);
  const compositeCN = areasWithCN.reduce((sum, a) => sum + a.weightedCN, 0) / totalArea;

  // Calculate S and Ia
  const S = (25400 / compositeCN) - 254;  // mm
  const Ia = 0.2 * S;  // mm (standard ratio)

  // Warnings
  if (compositeCN > 95) {
    warnings.push('Very high CN - watershed is predominantly impervious');
  }
  if (compositeCN < 40) {
    warnings.push('Very low CN - verify forest/brush land use classifications');
  }
  if (areasWithCN.length > 10) {
    warnings.push('Many land use areas - consider simplifying for regional analysis');
  }

  return {
    compositeCN,
    totalArea,
    potentialRetention: S,
    initialAbstraction: Ia,
    areas: areasWithCN,
    amc: input.amc || 'AMC_II',
    warnings,
  };
}

// ============================================================================
// Runoff Calculation
// ============================================================================

/**
 * Calculate runoff depth using SCS-CN equation
 *
 * Q = (P - Ia)² / (P - Ia + S)  for P > Ia
 * Q = 0                         for P ≤ Ia
 *
 * where:
 *   Q = runoff depth (mm)
 *   P = rainfall depth (mm)
 *   Ia = initial abstraction (mm) = λS (typically λ = 0.2)
 *   S = potential maximum retention (mm) = (25400/CN) - 254
 */
export function calculateRunoffDepth(input: RunoffCalculationInput): RunoffResult {
  const { rainfall, curveNumber, iaRatio = 0.2 } = input;

  // Calculate S (potential maximum retention)
  const S = (25400 / curveNumber) - 254;

  // Calculate Ia (initial abstraction)
  const Ia = iaRatio * S;

  let runoffDepth: number;
  let infiltration: number;

  if (rainfall <= Ia) {
    // All rainfall is abstracted
    runoffDepth = 0;
    infiltration = rainfall;
  } else {
    // Apply SCS equation
    const excessRainfall = rainfall - Ia;
    runoffDepth = (excessRainfall * excessRainfall) / (excessRainfall + S);
    infiltration = rainfall - runoffDepth - Ia;
  }

  return {
    rainfall,
    curveNumber,
    potentialRetention: S,
    initialAbstraction: Ia,
    runoffDepth,
    runoffRatio: rainfall > 0 ? runoffDepth / rainfall : 0,
    infiltration: Math.max(0, infiltration),
    storageRemaining: Math.max(0, S - infiltration),
  };
}

/**
 * Quick runoff calculation from rainfall and CN
 */
export function quickRunoff(rainfall: number, curveNumber: number): number {
  const S = (25400 / curveNumber) - 254;
  const Ia = 0.2 * S;

  if (rainfall <= Ia) return 0;

  const Pe = rainfall - Ia;
  return (Pe * Pe) / (Pe + S);
}

/**
 * Calculate minimum rainfall needed to produce runoff
 */
export function calculateThresholdRainfall(curveNumber: number, iaRatio: number = 0.2): number {
  const S = (25400 / curveNumber) - 254;
  return iaRatio * S;
}

// ============================================================================
// Unit Hydrograph Generation
// ============================================================================

/**
 * Calculate lag time using SCS formula
 * L = (S + 1)^0.7 × L^0.8 / (1900 × Y^0.5)
 *
 * Simplified: L = 0.6 × tc (for tc in hours)
 */
export function calculateLagTime(timeOfConcentration: number): number {
  return 0.6 * timeOfConcentration;  // hours
}

/**
 * Generate SCS dimensionless unit hydrograph
 */
export function generateUnitHydrograph(input: UnitHydrographInput): UnitHydrographResult {
  const { area, curveNumber, timeOfConcentration, rainfall, stormDuration } = input;

  // Calculate runoff depth
  const runoff = calculateRunoffDepth({ rainfall, curveNumber });
  const Q = runoff.runoffDepth; // mm

  // Calculate timing parameters
  const lagTime = calculateLagTime(timeOfConcentration);  // hours
  const D = stormDuration;  // hours
  const Tp = D / 2 + lagTime;  // Time to peak (hours)
  const tr = D / 2 + lagTime;  // Time of rise
  const tb = 2.67 * Tp;  // Base time (hours)

  // Calculate peak discharge
  // Qp = 0.208 × A × Q / Tp (m³/s)
  // where A is in km², Q is in mm, Tp is in hours
  const peakFactor = 0.208;  // dimensionless unit hydrograph peak rate factor
  const Qp = (peakFactor * area * Q) / Tp;

  // Total runoff volume
  const V = Q * area * 1000;  // m³ (Q in mm, area in km²)

  // Generate hydrograph ordinates
  const hydrograph: UnitHydrographPoint[] = [];

  for (const ordinate of SCS_UNIT_HYDROGRAPH_ORDINATES) {
    const time = ordinate.tRatio * Tp;
    const discharge = ordinate.qRatio * Qp;

    hydrograph.push({
      time,
      timeRatio: ordinate.tRatio,
      discharge,
      dischargeRatio: ordinate.qRatio,
    });
  }

  return {
    peakDischarge: Qp,
    timeToPeak: Tp,
    timeOfRise: tr,
    lagTime,
    baseTime: tb,
    totalRunoffVolume: V,
    runoffDepth: Q,
    hydrograph,
    peakFactor,
  };
}

// ============================================================================
// TR-55 Peak Discharge
// ============================================================================

/**
 * Calculate peak discharge using TR-55 Graphical Method
 *
 * Qp = qu × A × Q × Fp
 *
 * where:
 *   Qp = peak discharge (m³/s)
 *   qu = unit peak discharge (m³/s/km²/mm)
 *   A = drainage area (km²)
 *   Q = runoff depth (mm)
 *   Fp = pond adjustment factor (1.0 if no ponding)
 */
export function calculateTR55PeakDischarge(input: TR55Input): TR55Result {
  const { area, curveNumber, timeOfConcentration, rainfall24hr, rainfallType = 'II' } = input;
  const recommendations: string[] = [];

  // Calculate runoff depth
  const runoff = calculateRunoffDepth({ rainfall: rainfall24hr, curveNumber });
  const Q = runoff.runoffDepth;

  if (Q <= 0) {
    return {
      peakDischarge: 0,
      runoffDepth: 0,
      runoffVolume: 0,
      unitPeakDischarge: 0,
      timeOfPeak: timeOfConcentration,
      rainfallType,
      ponding: false,
      recommendations: ['No runoff generated - rainfall less than initial abstraction'],
    };
  }

  // Get rainfall distribution coefficients
  const dist = RAINFALL_DISTRIBUTION[rainfallType];

  // Calculate Ia/P ratio for lookup
  const S = (25400 / curveNumber) - 254;
  const Ia = 0.2 * S;
  const IaP = Ia / rainfall24hr;

  // Calculate log(qu) using TR-55 equation
  // log(qu) = C0 + C1×log(tc) + C2×(log(tc))²
  const logTc = Math.log10(timeOfConcentration);
  const logQu = dist.C0 + dist.C1 * logTc + dist.C2 * logTc * logTc;
  const qu = Math.pow(10, logQu);  // m³/s/km²/mm

  // Pond adjustment factor (assume no ponding for now)
  const Fp = 1.0;
  const ponding = false;

  // Calculate peak discharge
  const Qp = qu * area * Q * Fp;

  // Runoff volume
  const V = Q * area * 1000;  // m³

  // Time of peak
  const tp = timeOfConcentration * 0.6 + timeOfConcentration;

  // Recommendations
  if (IaP < 0.1) {
    recommendations.push('Low Ia/P ratio - high runoff efficiency');
  }
  if (IaP > 0.5) {
    recommendations.push('High Ia/P ratio - use adjusted Ia/P curves');
  }
  if (timeOfConcentration < 0.1) {
    recommendations.push('Very short tc - verify watershed characteristics');
  }
  if (timeOfConcentration > 10) {
    recommendations.push('Long tc - consider channel routing effects');
  }
  if (area > 25) {
    recommendations.push('Large watershed - TR-55 may underestimate peaks');
  }

  return {
    peakDischarge: Qp,
    runoffDepth: Q,
    runoffVolume: V,
    unitPeakDischarge: qu,
    timeOfPeak: tp,
    rainfallType,
    ponding,
    recommendations,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Estimate CN from watershed characteristics
 */
export function estimateCNFromImperviousness(
  imperviousFraction: number,
  soilGroup: SoilGroup,
  perviousCondition: 'good' | 'fair' | 'poor' = 'fair'
): number {
  // Get CN for pervious areas
  const perviousCN = CURVE_NUMBER_TABLE[`open_space_${perviousCondition}`][soilGroup];

  // Impervious CN is always 98
  const imperviousCN = 98;

  // Weighted average
  return imperviousFraction * imperviousCN + (1 - imperviousFraction) * perviousCN;
}

/**
 * Back-calculate CN from observed rainfall-runoff event
 */
export function estimateCNFromEvent(
  rainfall: number,
  observedRunoff: number,
  iaRatio: number = 0.2
): number {
  // From Q = (P - Ia)² / (P - Ia + S)
  // Solve for S, then CN = 25400 / (S + 254)

  if (observedRunoff <= 0 || rainfall <= observedRunoff) {
    return 100; // All runoff = impervious
  }

  // Iterative solution
  let CN = 75; // Initial guess
  for (let i = 0; i < 100; i++) {
    const S = (25400 / CN) - 254;
    const Ia = iaRatio * S;

    if (rainfall <= Ia) {
      CN = Math.min(99, CN + 5);
      continue;
    }

    const Pe = rainfall - Ia;
    const calcRunoff = (Pe * Pe) / (Pe + S);
    const error = calcRunoff - observedRunoff;

    if (Math.abs(error) < 0.1) break;

    // Adjust CN
    CN = error > 0 ? CN - 1 : CN + 1;
    CN = Math.max(30, Math.min(99, CN));
  }

  return CN;
}

/**
 * Calculate CN for connected impervious areas
 * Uses the connected/unconnected impervious approach
 */
export function calculateConnectedImperviousCN(
  totalImperviousFraction: number,
  connectedFraction: number,  // Fraction of impervious that is connected
  perviousCN: number
): number {
  // All connected impervious has CN = 98
  // Unconnected impervious drains to pervious areas

  const connectedImpervious = totalImperviousFraction * connectedFraction;
  const unconnectedImpervious = totalImperviousFraction * (1 - connectedFraction);
  const perviousArea = 1 - totalImperviousFraction;

  // Unconnected impervious effectively adds to pervious CN
  const modifiedPerviousFraction = perviousArea + unconnectedImpervious;
  const modifiedPerviousCN = perviousCN; // Simplified - could add adjustment

  // Composite CN
  return connectedImpervious * 98 + modifiedPerviousFraction * modifiedPerviousCN;
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format CN calculation result for display
 */
export function formatCNResult(result: CNResult): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '      CÁLCULO DE NÚMERO DE CURVA SCS',
    '═══════════════════════════════════════════════════════',
    '',
    `--- RESULTADO ---`,
    `  Número de Curva Compuesto: ${result.compositeCN.toFixed(1)}`,
    `  Área Total: ${(result.totalArea / 10000).toFixed(2)} ha`,
    `  Retención Potencial S: ${result.potentialRetention.toFixed(1)} mm`,
    `  Abstracción Inicial Ia: ${result.initialAbstraction.toFixed(1)} mm`,
    `  Condición de Humedad: ${result.amc}`,
    '',
    '--- DETALLE POR ÁREA ---',
  ];

  result.areas.forEach((area, i) => {
    lines.push(
      `  [${i + 1}] ${area.category}`,
      `      Área: ${(area.area / 10000).toFixed(2)} ha`,
      `      Suelo: Grupo ${area.soilGroup}`,
      `      CN: ${area.cn.toFixed(0)}`
    );
  });

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`  ⚠ ${w}`));
  }

  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Format runoff result for display
 */
export function formatRunoffResult(result: RunoffResult): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '      CÁLCULO DE ESCORRENTÍA SCS-CN',
    '═══════════════════════════════════════════════════════',
    '',
    '--- DATOS DE ENTRADA ---',
    `  Precipitación P: ${result.rainfall.toFixed(1)} mm`,
    `  Número de Curva CN: ${result.curveNumber.toFixed(0)}`,
    '',
    '--- RESULTADOS ---',
    `  Retención Potencial S: ${result.potentialRetention.toFixed(1)} mm`,
    `  Abstracción Inicial Ia: ${result.initialAbstraction.toFixed(1)} mm`,
    `  Escorrentía Q: ${result.runoffDepth.toFixed(2)} mm`,
    `  Coeficiente de Escorrentía: ${(result.runoffRatio * 100).toFixed(1)}%`,
    `  Infiltración F: ${result.infiltration.toFixed(2)} mm`,
    '',
    '═══════════════════════════════════════════════════════',
  ];

  return lines.join('\n');
}

/**
 * Format hydrograph result for display
 */
export function formatHydrographResult(result: UnitHydrographResult): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '      HIDROGRAMA UNITARIO SCS',
    '═══════════════════════════════════════════════════════',
    '',
    '--- PARÁMETROS ---',
    `  Caudal Pico Qp: ${result.peakDischarge.toFixed(3)} m³/s`,
    `  Tiempo al Pico Tp: ${result.timeToPeak.toFixed(2)} h`,
    `  Tiempo de Retardo L: ${result.lagTime.toFixed(2)} h`,
    `  Tiempo Base tb: ${result.baseTime.toFixed(2)} h`,
    `  Volumen de Escorrentía: ${result.totalRunoffVolume.toFixed(0)} m³`,
    `  Lámina de Escorrentía: ${result.runoffDepth.toFixed(2)} mm`,
    '',
    '--- ORDENADAS ---',
    '  t (h)     t/Tp    Q (m³/s)   Q/Qp',
  ];

  result.hydrograph.slice(0, 15).forEach(pt => {
    lines.push(
      `  ${pt.time.toFixed(2).padStart(6)}  ${pt.timeRatio.toFixed(2).padStart(6)}  ${pt.discharge.toFixed(3).padStart(9)}  ${pt.dischargeRatio.toFixed(3).padStart(6)}`
    );
  });

  if (result.hydrograph.length > 15) {
    lines.push(`  ... (${result.hydrograph.length - 15} más)`);
  }

  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Format TR-55 result for display
 */
export function formatTR55Result(result: TR55Result): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '      ANÁLISIS TR-55 - CAUDAL PICO',
    '═══════════════════════════════════════════════════════',
    '',
    '--- RESULTADOS ---',
    `  Caudal Pico Qp: ${result.peakDischarge.toFixed(3)} m³/s`,
    `  Lámina de Escorrentía: ${result.runoffDepth.toFixed(2)} mm`,
    `  Volumen de Escorrentía: ${result.runoffVolume.toFixed(0)} m³`,
    `  Caudal Unitario qu: ${result.unitPeakDischarge.toFixed(4)} m³/s/km²/mm`,
    `  Tiempo al Pico: ${result.timeOfPeak.toFixed(2)} h`,
    `  Distribución de Lluvia: Tipo ${result.rainfallType}`,
    '',
  ];

  if (result.recommendations.length > 0) {
    lines.push('--- RECOMENDACIONES ---');
    result.recommendations.forEach(r => lines.push(`  • ${r}`));
  }

  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}
