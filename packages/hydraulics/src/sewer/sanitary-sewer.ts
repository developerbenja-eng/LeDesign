/**
 * Sanitary Sewer Design Module
 *
 * Design methodology for wastewater collection systems based on:
 * - Chilean NCh 2472, NCh 1105 standards
 * - SISS (Superintendencia de Servicios Sanitarios) regulations
 * - Population-based flow calculations
 *
 * Design Flow Components:
 * - Domestic wastewater (population × consumption × return factor)
 * - Commercial/Industrial contributions
 * - Infiltration allowance
 * - Peak factors for daily and hourly variations
 *
 * Key Design Criteria:
 * - Minimum velocity: 0.6 m/s (self-cleaning)
 * - Maximum velocity: 4.5 m/s (pipe protection)
 * - Maximum fill: 70-85% (ventilation)
 * - Minimum diameter: 200mm (residential), 150mm (house connections)
 */

import {
  calculateCircularPipeFlow,
  sizePipe,
  calculateFullCapacity,
  getMinimumSlope,
  calculateTravelTime,
  calculateRequiredSlope,
  STANDARD_DIAMETERS,
  VELOCITY_LIMITS,
  FILL_RATIOS,
  type PipeProperties,
  type PipeMaterial,
  type HydraulicResult,
} from './pipe-hydraulics';

// ============================================
// TYPES
// ============================================

export type LandUseType =
  | 'residential_low'
  | 'residential_medium'
  | 'residential_high'
  | 'commercial'
  | 'industrial_light'
  | 'industrial_heavy'
  | 'institutional'
  | 'mixed';

export interface ServiceArea {
  id: string;
  name?: string;
  area: number; // hectares
  landUse: LandUseType;
  population?: number; // if known directly
  density?: number; // hab/ha (if population not specified)
  waterConsumption?: number; // L/hab/día (override default)
}

export interface SanitaryPipeReach {
  id: string;
  name?: string;
  upstreamNode: string;
  downstreamNode: string;
  length: number; // m
  material: PipeMaterial;
  diameter?: number; // mm (calculated if not provided)
  slope?: number; // m/m
  upstreamInvert?: number; // m
  downstreamInvert?: number; // m
}

export interface ManholeNode {
  id: string;
  name?: string;
  station: number; // chainage (m)
  groundElevation: number; // m
  invertElevation?: number; // m (calculated if not provided)
  type: 'inspection' | 'drop' | 'junction' | 'terminal';
  depth?: number; // m
}

export interface SanitarySewerInput {
  // Project info
  projectName?: string;
  designHorizon: number; // years (typically 20-30)

  // Service areas
  serviceAreas: ServiceArea[];

  // Network
  manholes: ManholeNode[];
  reaches: SanitaryPipeReach[];

  // Design parameters
  pipeMaterial: PipeMaterial;
  returnFactor: number; // typically 0.80
  infiltrationRate: number; // L/s/km (typically 0.1-0.5)
  minCover: number; // m

  // Connections
  connectionsPerHectare?: number;
}

export interface FlowCalculation {
  // Population
  population: number;
  designPopulation: number; // with growth

  // Base flows
  averageDomesticFlow: number; // L/s
  peakDomesticFlow: number; // L/s
  infiltrationFlow: number; // L/s
  industrialFlow: number; // L/s

  // Design flows
  averageDesignFlow: number; // L/s
  peakDesignFlow: number; // L/s
  minimumFlow: number; // L/s

  // Peak factors
  peakHourlyFactor: number;
  peakDailyFactor: number;
}

export interface SanitaryReachResult {
  reachId: string;
  upstreamNode: string;
  downstreamNode: string;

  // Flows
  servicePopulation: number;
  flowCalculation: FlowCalculation;
  cumulativeFlow: number; // L/s (design)

  // Pipe design
  diameter: number; // mm
  slope: number; // m/m
  hydraulics: HydraulicResult;

  // Elevations
  upstreamInvert: number; // m
  downstreamInvert: number; // m
  depth: { upstream: number; downstream: number }; // m

  // Validation
  isAdequate: boolean;
  warnings: string[];
}

export interface SanitarySewerResult {
  // Summary
  projectName: string;
  designHorizon: number;
  totalServiceArea: number; // ha
  totalPopulation: number;
  designPopulation: number;

  // System flows
  systemFlows: {
    averageDaily: number; // L/s
    peakHourly: number; // L/s
    minimum: number; // L/s
  };

  // Reach results
  reaches: SanitaryReachResult[];

  // Network summary
  totalPipeLength: number; // m
  numberOfManholes: number;

  // Materials
  materials: Array<{
    diameter: number;
    length: number;
    material: PipeMaterial;
  }>;

  // Costs
  estimatedCost: {
    pipes: number;
    excavation: number;
    manholes: number;
    connections: number;
    total: number;
    perConnection: number;
  };

  // Validation
  systemWarnings: string[];
  isComplete: boolean;
}

// ============================================
// CONSTANTS
// ============================================

// Population density by land use (hab/ha)
const POPULATION_DENSITY: Record<LandUseType, { min: number; typical: number; max: number }> = {
  residential_low: { min: 30, typical: 50, max: 80 },
  residential_medium: { min: 100, typical: 150, max: 200 },
  residential_high: { min: 250, typical: 350, max: 500 },
  commercial: { min: 20, typical: 50, max: 100 },
  industrial_light: { min: 10, typical: 30, max: 50 },
  industrial_heavy: { min: 5, typical: 15, max: 30 },
  institutional: { min: 50, typical: 100, max: 200 },
  mixed: { min: 100, typical: 200, max: 300 },
};

// Water consumption by land use (L/hab/día)
const WATER_CONSUMPTION: Record<LandUseType, number> = {
  residential_low: 200,
  residential_medium: 180,
  residential_high: 150,
  commercial: 100,
  industrial_light: 80,
  industrial_heavy: 120,
  institutional: 100,
  mixed: 170,
};

// Industrial flow rates (L/s/ha)
const INDUSTRIAL_FLOW_RATES: Record<LandUseType, number> = {
  residential_low: 0,
  residential_medium: 0,
  residential_high: 0,
  commercial: 0.5,
  industrial_light: 1.0,
  industrial_heavy: 2.5,
  institutional: 0.3,
  mixed: 0.3,
};

// Peak factor formula constants (Harmon formula)
// M = 1 + 14 / (4 + √P) where P is population in thousands
function calculateHarmonFactor(populationThousands: number): number {
  return 1 + 14 / (4 + Math.sqrt(populationThousands));
}

// Population growth rate (annual)
const GROWTH_RATE = 0.015; // 1.5% typical for Chile

// Unit costs (CLP)
const SANITARY_PIPE_COSTS: Record<number, number> = {
  150: 18000,
  200: 22000,
  250: 28000,
  300: 35000,
  400: 50000,
  500: 70000,
  600: 90000,
  800: 130000,
};

const MANHOLE_COSTS: Record<string, number> = {
  inspection: 600000,
  drop: 900000,
  junction: 750000,
  terminal: 500000,
};

const CONNECTION_COST = 250000; // per domiciliary connection
const EXCAVATION_COST_M3 = 12000;

// ============================================
// MAIN DESIGN FUNCTIONS
// ============================================

/**
 * Design complete sanitary sewer system
 */
export function designSanitarySewer(input: SanitarySewerInput): SanitarySewerResult {
  const systemWarnings: string[] = [];
  const reachResults: SanitaryReachResult[] = [];

  // Calculate service populations
  const populationMap = calculateServicePopulations(input);

  // Build network and process upstream to downstream
  const network = buildSanitaryNetwork(input);
  const sortedReaches = topologicalSortSanitary(input.reaches, network);

  const cumulativeFlows = new Map<string, number>();
  const cumulativePopulations = new Map<string, number>();

  for (const reach of sortedReaches) {
    const result = designSanitaryReach(
      reach,
      input,
      network,
      populationMap,
      cumulativeFlows,
      cumulativePopulations
    );
    reachResults.push(result);

    // Update cumulatives at downstream node
    const existingFlow = cumulativeFlows.get(reach.downstreamNode) || 0;
    cumulativeFlows.set(reach.downstreamNode, existingFlow + result.cumulativeFlow);

    const existingPop = cumulativePopulations.get(reach.downstreamNode) || 0;
    cumulativePopulations.set(reach.downstreamNode, existingPop + result.servicePopulation);

    if (!result.isAdequate) {
      systemWarnings.push(`Reach ${reach.id}: ${result.warnings.join('; ')}`);
    }
  }

  // Calculate totals
  const totalArea = input.serviceAreas.reduce((sum, a) => sum + a.area, 0);
  const totalPopulation = Array.from(populationMap.values()).reduce((sum, p) => sum + p, 0);
  const designPopulation = totalPopulation * Math.pow(1 + GROWTH_RATE, input.designHorizon);
  const totalLength = reachResults.reduce((sum, r) =>
    sum + input.reaches.find(p => p.id === r.reachId)!.length, 0);

  // System flows
  const maxReach = reachResults.reduce((max, r) =>
    r.cumulativeFlow > max.cumulativeFlow ? r : max);

  // Materials summary
  const materials = summarizeSanitaryMaterials(reachResults, input.reaches, input.pipeMaterial);

  // Cost estimation
  const costs = estimateSanitaryCosts(reachResults, input);

  return {
    projectName: input.projectName || 'Sanitary Sewer Design',
    designHorizon: input.designHorizon,
    totalServiceArea: totalArea,
    totalPopulation: Math.round(totalPopulation),
    designPopulation: Math.round(designPopulation),
    systemFlows: {
      averageDaily: maxReach.flowCalculation.averageDesignFlow,
      peakHourly: maxReach.flowCalculation.peakDesignFlow,
      minimum: maxReach.flowCalculation.minimumFlow,
    },
    reaches: reachResults,
    totalPipeLength: totalLength,
    numberOfManholes: input.manholes.length,
    materials,
    estimatedCost: costs,
    systemWarnings,
    isComplete: systemWarnings.length === 0,
  };
}

/**
 * Design single sanitary reach
 */
function designSanitaryReach(
  reach: SanitaryPipeReach,
  input: SanitarySewerInput,
  network: SanitaryNetwork,
  populationMap: Map<string, number>,
  cumulativeFlows: Map<string, number>,
  cumulativePopulations: Map<string, number>
): SanitaryReachResult {
  const warnings: string[] = [];

  // Get upstream cumulative population and local service population
  const upstreamPop = cumulativePopulations.get(reach.upstreamNode) || 0;
  const localPop = getLocalServicePopulation(reach, input, populationMap);
  const totalPop = upstreamPop + localPop;

  // Calculate design population (with growth)
  const designPop = totalPop * Math.pow(1 + GROWTH_RATE, input.designHorizon);

  // Calculate flows
  const flowCalc = calculateSanitaryFlows(
    designPop,
    input.returnFactor,
    input.infiltrationRate,
    reach.length,
    getIndustrialContribution(reach, input)
  );

  // Get upstream cumulative flow
  const upstreamFlow = cumulativeFlows.get(reach.upstreamNode) || 0;
  const cumulativeFlow = Math.max(flowCalc.peakDesignFlow, upstreamFlow + flowCalc.peakDesignFlow - flowCalc.infiltrationFlow);

  // Get elevations
  const upstreamMH = input.manholes.find(m => m.id === reach.upstreamNode);
  const downstreamMH = input.manholes.find(m => m.id === reach.downstreamNode);

  const groundUp = upstreamMH?.groundElevation || 100;
  const groundDown = downstreamMH?.groundElevation || 99;

  // Calculate or use provided slope
  let slope = reach.slope;
  if (!slope) {
    const groundSlope = (groundUp - groundDown) / reach.length;
    const minSlope = getMinimumSlope(reach.diameter || 200);
    slope = Math.max(groundSlope * 0.85, minSlope);
  }

  // Size pipe if not specified
  let diameter = reach.diameter;
  if (!diameter) {
    const sizing = sizePipe(cumulativeFlow, reach.material, 'sanitary', { minSlope: slope });
    diameter = sizing.recommendedDiameter;
    warnings.push(...sizing.warnings);
  }

  // Ensure minimum diameter
  diameter = Math.max(diameter, 200);

  // Calculate hydraulics
  const pipe: PipeProperties = {
    material: reach.material,
    diameter,
    slope,
    length: reach.length,
  };
  const hydraulics = calculateCircularPipeFlow(pipe, { flowRate: cumulativeFlow }, 'sanitary');

  // Check minimum flow velocity (use minimum flow)
  const minFlowResult = calculateCircularPipeFlow(
    pipe,
    { flowRate: flowCalc.minimumFlow },
    'sanitary'
  );
  if (minFlowResult.velocity < 0.3) {
    warnings.push(`Low velocity at minimum flow: ${minFlowResult.velocity.toFixed(2)} m/s`);
  }

  // Calculate elevations
  const upstreamInvert = reach.upstreamInvert ??
    (upstreamMH?.invertElevation ?? groundUp - input.minCover - diameter / 1000);
  const downstreamInvert = reach.downstreamInvert ??
    (upstreamInvert - slope * reach.length);

  // Calculate depths
  const depthUp = groundUp - upstreamInvert;
  const depthDown = groundDown - downstreamInvert;

  // Validation
  if (hydraulics.fillRatio > FILL_RATIOS.sanitary.maxAllowed) {
    warnings.push(`Fill ratio ${(hydraulics.fillRatio * 100).toFixed(0)}% exceeds maximum 85%`);
  }
  if (!hydraulics.velocityCheck.meetsMinimum) {
    warnings.push(`Velocity ${hydraulics.velocity.toFixed(2)} m/s below minimum`);
  }
  if (depthUp < input.minCover + diameter / 1000) {
    warnings.push(`Insufficient cover upstream: ${depthUp.toFixed(2)}m`);
  }

  return {
    reachId: reach.id,
    upstreamNode: reach.upstreamNode,
    downstreamNode: reach.downstreamNode,
    servicePopulation: Math.round(totalPop),
    flowCalculation: flowCalc,
    cumulativeFlow,
    diameter,
    slope,
    hydraulics,
    upstreamInvert,
    downstreamInvert,
    depth: { upstream: depthUp, downstream: depthDown },
    isAdequate: warnings.length === 0,
    warnings,
  };
}

/**
 * Calculate sanitary flows for a service area
 */
export function calculateSanitaryFlows(
  population: number,
  returnFactor: number = 0.80,
  infiltrationRate: number = 0.2,
  pipeLength: number = 100,
  industrialFlow: number = 0
): FlowCalculation {
  // Average daily domestic flow
  // Q_avg = P × C × R / 86400
  // P = population, C = consumption (L/hab/día), R = return factor
  const consumption = 170; // L/hab/día (average)
  const avgDomesticFlow = (population * consumption * returnFactor) / 86400; // L/s

  // Peak factors (Harmon formula)
  const popThousands = population / 1000;
  const peakHourlyFactor = calculateHarmonFactor(popThousands);
  const peakDailyFactor = 1 + 0.5 * (peakHourlyFactor - 1); // Typically 1.2-1.5

  // Peak domestic flow
  const peakDomesticFlow = avgDomesticFlow * peakHourlyFactor;

  // Infiltration flow
  const infiltrationFlow = infiltrationRate * pipeLength / 1000; // L/s

  // Design flows
  const avgDesignFlow = avgDomesticFlow + industrialFlow + infiltrationFlow;
  const peakDesignFlow = peakDomesticFlow + industrialFlow + infiltrationFlow;

  // Minimum flow (typically 30% of average)
  const minimumFlow = Math.max(0.3 * avgDomesticFlow, 0.5);

  return {
    population: Math.round(population),
    designPopulation: Math.round(population),
    averageDomesticFlow: avgDomesticFlow,
    peakDomesticFlow: peakDomesticFlow,
    infiltrationFlow,
    industrialFlow,
    averageDesignFlow: avgDesignFlow,
    peakDesignFlow: peakDesignFlow,
    minimumFlow,
    peakHourlyFactor,
    peakDailyFactor,
  };
}

// ============================================
// QUICK DESIGN FUNCTIONS
// ============================================

/**
 * Quick sanitary pipe sizing for population
 */
export function quickSanitaryPipeSize(
  population: number,
  material: PipeMaterial = 'pvc',
  slopePercent: number = 1.0
): {
  averageFlow: number;
  peakFlow: number;
  diameter: number;
  velocity: number;
  fillRatio: number;
  isAdequate: boolean;
} {
  const flows = calculateSanitaryFlows(population);

  const sizing = sizePipe(flows.peakDesignFlow, material, 'sanitary', {
    minSlope: slopePercent / 100,
  });

  return {
    averageFlow: flows.averageDesignFlow,
    peakFlow: flows.peakDesignFlow,
    diameter: sizing.recommendedDiameter,
    velocity: sizing.selectedResult.velocity,
    fillRatio: sizing.selectedResult.fillRatio,
    isAdequate: sizing.warnings.length === 0,
  };
}

/**
 * Calculate population equivalent for non-residential uses
 */
export function calculatePopulationEquivalent(
  landUse: LandUseType,
  areaHectares: number
): {
  population: number;
  flowLps: number;
  basis: string;
} {
  const density = POPULATION_DENSITY[landUse].typical;
  const consumption = WATER_CONSUMPTION[landUse];
  const returnFactor = 0.80;

  const population = density * areaHectares;
  const flowLps = (population * consumption * returnFactor) / 86400;

  return {
    population: Math.round(population),
    flowLps,
    basis: `${density} hab/ha × ${areaHectares} ha = ${population} hab`,
  };
}

/**
 * Design house connection (arranque domiciliario)
 */
export function designHouseConnection(
  numberOfUnits: number = 1,
  occupantsPerUnit: number = 4
): {
  diameter: number;
  minSlope: number;
  maxLength: number;
  velocity: number;
  capacity: number;
} {
  const population = numberOfUnits * occupantsPerUnit;
  const flows = calculateSanitaryFlows(population);

  // House connections typically 110-150mm PVC
  const diameter = numberOfUnits <= 2 ? 110 : 150;
  const minSlope = 0.02; // 2% minimum for house connections

  const pipe: PipeProperties = {
    material: 'pvc',
    diameter,
    slope: minSlope,
  };

  const result = calculateCircularPipeFlow(pipe, { flowRate: flows.peakDesignFlow }, 'sanitary');

  return {
    diameter,
    minSlope,
    maxLength: 15, // m typical maximum
    velocity: result.velocity,
    capacity: result.fullFlowCapacity,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface SanitaryNetwork {
  nodes: Map<string, ManholeNode>;
  edges: Map<string, string[]>;
  reverseEdges: Map<string, string[]>;
}

function buildSanitaryNetwork(input: SanitarySewerInput): SanitaryNetwork {
  const nodes = new Map<string, ManholeNode>();
  const edges = new Map<string, string[]>();
  const reverseEdges = new Map<string, string[]>();

  for (const mh of input.manholes) {
    nodes.set(mh.id, mh);
  }

  for (const reach of input.reaches) {
    const downstream = edges.get(reach.upstreamNode) || [];
    downstream.push(reach.downstreamNode);
    edges.set(reach.upstreamNode, downstream);

    const upstream = reverseEdges.get(reach.downstreamNode) || [];
    upstream.push(reach.upstreamNode);
    reverseEdges.set(reach.downstreamNode, upstream);
  }

  return { nodes, edges, reverseEdges };
}

function topologicalSortSanitary(reaches: SanitaryPipeReach[], network: SanitaryNetwork): SanitaryPipeReach[] {
  return [...reaches].sort((a, b) => {
    const upA = network.reverseEdges.get(a.upstreamNode)?.length || 0;
    const upB = network.reverseEdges.get(b.upstreamNode)?.length || 0;
    return upA - upB;
  });
}

function calculateServicePopulations(input: SanitarySewerInput): Map<string, number> {
  const map = new Map<string, number>();

  for (const area of input.serviceAreas) {
    let population: number;
    if (area.population !== undefined) {
      population = area.population;
    } else {
      const density = area.density ?? POPULATION_DENSITY[area.landUse].typical;
      population = density * area.area;
    }
    map.set(area.id, population);
  }

  return map;
}

function getLocalServicePopulation(
  reach: SanitaryPipeReach,
  input: SanitarySewerInput,
  populationMap: Map<string, number>
): number {
  // Simple distribution: divide total by number of reaches
  const totalPop = Array.from(populationMap.values()).reduce((sum, p) => sum + p, 0);
  return totalPop / input.reaches.length;
}

function getIndustrialContribution(reach: SanitaryPipeReach, input: SanitarySewerInput): number {
  // Sum industrial flows from service areas
  return input.serviceAreas.reduce((sum, area) => {
    return sum + INDUSTRIAL_FLOW_RATES[area.landUse] * area.area;
  }, 0) / input.reaches.length;
}

function summarizeSanitaryMaterials(
  results: SanitaryReachResult[],
  reaches: SanitaryPipeReach[],
  defaultMaterial: PipeMaterial
): SanitarySewerResult['materials'] {
  const summary = new Map<number, number>();

  for (const result of results) {
    const reach = reaches.find(r => r.id === result.reachId)!;
    const existing = summary.get(result.diameter) || 0;
    summary.set(result.diameter, existing + reach.length);
  }

  return Array.from(summary.entries()).map(([diameter, length]) => ({
    diameter,
    length,
    material: defaultMaterial,
  }));
}

function estimateSanitaryCosts(
  results: SanitaryReachResult[],
  input: SanitarySewerInput
): SanitarySewerResult['estimatedCost'] {
  let pipeCost = 0;
  let excavationCost = 0;

  for (const result of results) {
    const reach = input.reaches.find(r => r.id === result.reachId)!;

    const unitCost = SANITARY_PIPE_COSTS[result.diameter] || result.diameter * 150;
    pipeCost += unitCost * reach.length;

    const avgDepth = (result.depth.upstream + result.depth.downstream) / 2;
    const trenchWidth = Math.max(0.6, result.diameter / 1000 + 0.3);
    const volume = avgDepth * trenchWidth * reach.length;
    excavationCost += volume * EXCAVATION_COST_M3;
  }

  const manholeCost = input.manholes.reduce((sum, mh) =>
    sum + (MANHOLE_COSTS[mh.type] || 600000), 0);

  const connectionCount = input.connectionsPerHectare
    ? input.connectionsPerHectare * input.serviceAreas.reduce((sum, a) => sum + a.area, 0)
    : results.length * 5; // estimate 5 per reach
  const connectionCost = connectionCount * CONNECTION_COST;

  const total = pipeCost + excavationCost + manholeCost + connectionCost;

  return {
    pipes: Math.round(pipeCost),
    excavation: Math.round(excavationCost),
    manholes: Math.round(manholeCost),
    connections: Math.round(connectionCost),
    total: Math.round(total),
    perConnection: Math.round(total / connectionCount),
  };
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format sanitary sewer results
 */
export function formatSanitarySewerResult(result: SanitarySewerResult): string {
  const lines = [
    '=== DISEÑO ALCANTARILLADO SANITARIO ===',
    '',
    `Proyecto: ${result.projectName}`,
    `Horizonte diseño: ${result.designHorizon} años`,
    `Área servicio: ${result.totalServiceArea.toFixed(2)} ha`,
    `Población actual: ${result.totalPopulation.toLocaleString()} hab`,
    `Población diseño: ${result.designPopulation.toLocaleString()} hab`,
    '',
    '--- CAUDALES SISTEMA ---',
    `Medio diario: ${result.systemFlows.averageDaily.toFixed(2)} L/s`,
    `Punta horario: ${result.systemFlows.peakHourly.toFixed(2)} L/s`,
    `Mínimo: ${result.systemFlows.minimum.toFixed(2)} L/s`,
    '',
    '--- RESUMEN RED ---',
    `Longitud total: ${result.totalPipeLength.toFixed(0)} m`,
    `Cámaras: ${result.numberOfManholes}`,
    '',
    '--- TUBERÍAS ---',
  ];

  for (const mat of result.materials) {
    lines.push(`  Ø${mat.diameter}mm ${mat.material}: ${mat.length.toFixed(0)} m`);
  }

  lines.push('', '--- TRAMOS ---');
  for (const reach of result.reaches) {
    lines.push(`  ${reach.reachId}: Ø${reach.diameter}mm, ${reach.cumulativeFlow.toFixed(1)} L/s, v=${reach.hydraulics.velocity.toFixed(2)} m/s, y/D=${(reach.hydraulics.fillRatio * 100).toFixed(0)}%`);
    if (reach.warnings.length > 0) {
      reach.warnings.forEach(w => lines.push(`    ⚠ ${w}`));
    }
  }

  lines.push('', '--- COSTOS ESTIMADOS ---');
  lines.push(`  Tuberías: $${result.estimatedCost.pipes.toLocaleString()} CLP`);
  lines.push(`  Excavación: $${result.estimatedCost.excavation.toLocaleString()} CLP`);
  lines.push(`  Cámaras: $${result.estimatedCost.manholes.toLocaleString()} CLP`);
  lines.push(`  Arranques: $${result.estimatedCost.connections.toLocaleString()} CLP`);
  lines.push(`  TOTAL: $${result.estimatedCost.total.toLocaleString()} CLP`);
  lines.push(`  Por arranque: $${result.estimatedCost.perConnection.toLocaleString()} CLP`);

  if (result.systemWarnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.systemWarnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  return lines.join('\n');
}
