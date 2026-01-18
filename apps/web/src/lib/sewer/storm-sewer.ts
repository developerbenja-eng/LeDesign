/**
 * Storm Sewer Design Module
 *
 * Design methodology for storm drainage pipe networks based on:
 * - Rational Method for peak flows
 * - Chilean NCh standards and MINVU Manual de Drenaje Urbano
 * - MOP drainage design criteria
 *
 * Design Steps:
 * 1. Delineate drainage areas and subareas
 * 2. Calculate time of concentration for each inlet
 * 3. Determine rainfall intensity (IDF curves)
 * 4. Calculate peak flows using Rational Method
 * 5. Size pipes for each reach
 * 6. Design manholes and structures
 */

import {
  calculateCircularPipeFlow,
  sizePipe,
  calculateFullCapacity,
  getMinimumSlope,
  calculateTravelTime,
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

export interface DrainageSubarea {
  id: string;
  name?: string;
  area: number; // hectares
  runoffCoefficient: number; // C value (0-1)
  inletId: string; // connects to this inlet
  timeOfEntry?: number; // minutes (overland flow time to inlet)
}

export interface Inlet {
  id: string;
  name?: string;
  type: 'curb' | 'grate' | 'combination' | 'drop';
  station: number; // chainage along route (m)
  invertElevation: number; // m
  groundElevation: number; // m
  subareas: string[]; // IDs of contributing subareas
}

export interface StormPipeReach {
  id: string;
  name?: string;
  upstreamNode: string; // inlet or manhole ID
  downstreamNode: string;
  length: number; // m
  material: PipeMaterial;
  diameter?: number; // mm (calculated if not provided)
  slope?: number; // m/m (calculated from elevations if not provided)
}

export interface StormSewerInput {
  // Project info
  projectName?: string;
  location: {
    latitude: number;
    longitude: number;
  };

  // Storm parameters
  returnPeriod: number; // years (2, 5, 10, 25, 50, 100)
  rainfallIntensity?: number; // mm/hr (if known, otherwise calculated)

  // Network definition
  subareas: DrainageSubarea[];
  inlets: Inlet[];
  reaches: StormPipeReach[];

  // Design preferences
  pipeMaterial: PipeMaterial;
  minCover: number; // m (minimum soil cover over pipe)
  maxDepth?: number; // m (maximum trench depth)
}

export interface ReachDesignResult {
  reachId: string;
  upstreamNode: string;
  downstreamNode: string;

  // Contributing area
  totalArea: number; // ha
  weightedC: number;

  // Time calculations
  timeOfConcentration: number; // min
  travelTime: number; // min (in this reach)

  // Flow
  intensity: number; // mm/hr
  peakFlow: number; // L/s
  cumulativeFlow: number; // L/s (including upstream)

  // Pipe design
  diameter: number; // mm
  slope: number; // m/m
  hydraulics: HydraulicResult;

  // Elevations
  upstreamInvert: number; // m
  downstreamInvert: number; // m
  cover: { upstream: number; downstream: number }; // m

  // Status
  isAdequate: boolean;
  warnings: string[];
}

export interface StormSewerResult {
  // Summary
  projectName: string;
  totalDrainageArea: number; // ha
  designStorm: { returnPeriod: number; intensity: number };

  // Reach-by-reach results
  reaches: ReachDesignResult[];

  // System totals
  totalPipeLength: number; // m
  outletFlow: number; // L/s

  // Material summary
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
    inlets: number;
    total: number;
    perHectare: number;
  };

  // Validation
  systemWarnings: string[];
  isComplete: boolean;
}

// ============================================
// CONSTANTS
// ============================================

// Inlet capacities (L/s) - typical values
const INLET_CAPACITIES: Record<string, number> = {
  curb: 20, // curbside inlet
  grate: 30, // grate inlet
  combination: 45, // combination inlet
  drop: 100, // drop inlet
};

// Unit costs (CLP/m)
const STORM_PIPE_COSTS: Record<number, number> = {
  200: 25000,
  250: 32000,
  300: 40000,
  400: 55000,
  500: 75000,
  600: 95000,
  800: 140000,
  1000: 200000,
  1200: 280000,
  1500: 400000,
};

const EXCAVATION_COST_PER_M3 = 12000; // CLP
const MANHOLE_COST = 800000; // CLP per unit
const INLET_COSTS: Record<string, number> = {
  curb: 350000,
  grate: 400000,
  combination: 550000,
  drop: 250000,
};

// ============================================
// MAIN DESIGN FUNCTIONS
// ============================================

/**
 * Design complete storm sewer system
 */
export function designStormSewer(input: StormSewerInput): StormSewerResult {
  const systemWarnings: string[] = [];
  const reachResults: ReachDesignResult[] = [];

  // Build network graph
  const network = buildNetworkGraph(input);

  // Process reaches from upstream to downstream
  const sortedReaches = topologicalSort(input.reaches, network);

  let cumulativeFlows: Map<string, number> = new Map();

  for (const reach of sortedReaches) {
    const result = designReach(reach, input, network, cumulativeFlows);
    reachResults.push(result);

    // Update cumulative flow at downstream node
    const existingFlow = cumulativeFlows.get(reach.downstreamNode) || 0;
    cumulativeFlows.set(reach.downstreamNode, existingFlow + result.cumulativeFlow);

    if (!result.isAdequate) {
      systemWarnings.push(`Reach ${reach.id}: ${result.warnings.join('; ')}`);
    }
  }

  // Calculate totals
  const totalArea = input.subareas.reduce((sum, s) => sum + s.area, 0);
  const totalLength = reachResults.reduce((sum, r) =>
    sum + input.reaches.find(p => p.id === r.reachId)!.length, 0);
  const outletFlow = Math.max(...reachResults.map(r => r.cumulativeFlow));

  // Material summary
  const materials = summarizeMaterials(reachResults, input.reaches, input.pipeMaterial);

  // Cost estimation
  const costs = estimateStormCosts(reachResults, input);

  return {
    projectName: input.projectName || 'Storm Sewer Design',
    totalDrainageArea: totalArea,
    designStorm: {
      returnPeriod: input.returnPeriod,
      intensity: input.rainfallIntensity || reachResults[0]?.intensity || 0,
    },
    reaches: reachResults,
    totalPipeLength: totalLength,
    outletFlow,
    materials,
    estimatedCost: costs,
    systemWarnings,
    isComplete: systemWarnings.length === 0,
  };
}

/**
 * Design single pipe reach
 */
function designReach(
  reach: StormPipeReach,
  input: StormSewerInput,
  network: NetworkGraph,
  cumulativeFlows: Map<string, number>
): ReachDesignResult {
  const warnings: string[] = [];

  // Find contributing subareas
  const contributingAreas = findContributingAreas(reach, input, network);
  const totalArea = contributingAreas.reduce((sum, a) => sum + a.area, 0);
  const weightedC = contributingAreas.reduce((sum, a) => sum + a.runoffCoefficient * a.area, 0) / totalArea;

  // Calculate time of concentration
  const upstreamTc = getUpstreamTc(reach, network, input);
  const tc = Math.max(5, upstreamTc); // minimum 5 minutes

  // Get rainfall intensity (using typical IDF relationship if not provided)
  const intensity = input.rainfallIntensity ||
    estimateIntensity(input.returnPeriod, tc, input.location.latitude);

  // Calculate peak flow using Rational Method
  // Q (L/s) = C × i × A × 2.78
  const localPeakFlow = weightedC * intensity * totalArea * 2.78;

  // Add upstream flows
  const upstreamFlow = cumulativeFlows.get(reach.upstreamNode) || 0;
  const cumulativeFlow = localPeakFlow + upstreamFlow;

  // Get elevations
  const upstreamNode = input.inlets.find(i => i.id === reach.upstreamNode);
  const downstreamNode = input.inlets.find(i => i.id === reach.downstreamNode);

  const upstreamInvert = upstreamNode?.invertElevation ||
    (upstreamNode?.groundElevation || 100) - input.minCover - 0.3;
  const groundUp = upstreamNode?.groundElevation || 100;
  const groundDown = downstreamNode?.groundElevation || 99;

  // Calculate or use provided slope
  let slope = reach.slope;
  if (!slope) {
    // Estimate based on ground slope with minimum
    const groundSlope = (groundUp - groundDown) / reach.length;
    const minSlope = getMinimumSlope(reach.diameter || 300);
    slope = Math.max(groundSlope * 0.9, minSlope);
  }

  // Size pipe if diameter not specified
  let diameter = reach.diameter;
  if (!diameter) {
    const sizing = sizePipe(cumulativeFlow, reach.material, 'storm', { minSlope: slope });
    diameter = sizing.recommendedDiameter;
    warnings.push(...sizing.warnings);
  }

  // Calculate hydraulics
  const pipe: PipeProperties = {
    material: reach.material,
    diameter,
    slope,
    length: reach.length,
  };
  const hydraulics = calculateCircularPipeFlow(pipe, { flowRate: cumulativeFlow }, 'storm');

  // Calculate downstream invert
  const downstreamInvert = upstreamInvert - slope * reach.length;

  // Check cover
  const coverUp = groundUp - upstreamInvert - diameter / 1000;
  const coverDown = groundDown - downstreamInvert - diameter / 1000;

  if (coverUp < input.minCover) {
    warnings.push(`Insufficient cover upstream (${coverUp.toFixed(2)}m < ${input.minCover}m)`);
  }
  if (coverDown < input.minCover) {
    warnings.push(`Insufficient cover downstream (${coverDown.toFixed(2)}m < ${input.minCover}m)`);
  }

  // Calculate travel time in this reach
  const travelTime = calculateTravelTime(reach.length, hydraulics.velocity);

  // Validation
  if (!hydraulics.velocityCheck.meetsMinimum) {
    warnings.push(`Low velocity: ${hydraulics.velocity.toFixed(2)} m/s`);
  }
  if (!hydraulics.velocityCheck.meetsMaximum) {
    warnings.push(`High velocity: ${hydraulics.velocity.toFixed(2)} m/s`);
  }
  if (hydraulics.fillRatio > 1.0) {
    warnings.push('Pipe surcharging under design flow');
  }

  return {
    reachId: reach.id,
    upstreamNode: reach.upstreamNode,
    downstreamNode: reach.downstreamNode,
    totalArea,
    weightedC,
    timeOfConcentration: tc + travelTime,
    travelTime,
    intensity,
    peakFlow: localPeakFlow,
    cumulativeFlow,
    diameter,
    slope,
    hydraulics,
    upstreamInvert,
    downstreamInvert,
    cover: { upstream: coverUp, downstream: coverDown },
    isAdequate: warnings.length === 0,
    warnings,
  };
}

// ============================================
// QUICK DESIGN FUNCTIONS
// ============================================

/**
 * Quick storm pipe sizing for single area
 */
export function quickStormPipeSize(
  drainageAreaHa: number,
  runoffCoefficient: number,
  rainfallIntensityMmHr: number,
  material: PipeMaterial = 'concrete',
  slopePercent: number = 1.0
): {
  peakFlow: number;
  diameter: number;
  velocity: number;
  fillRatio: number;
  isAdequate: boolean;
} {
  // Q (L/s) = C × i × A × 2.78
  const peakFlow = runoffCoefficient * rainfallIntensityMmHr * drainageAreaHa * 2.78;

  const sizing = sizePipe(peakFlow, material, 'storm', {
    minSlope: slopePercent / 100,
  });

  return {
    peakFlow,
    diameter: sizing.recommendedDiameter,
    velocity: sizing.selectedResult.velocity,
    fillRatio: sizing.selectedResult.fillRatio,
    isAdequate: sizing.warnings.length === 0,
  };
}

/**
 * Check inlet capacity
 */
export function checkInletCapacity(
  inletType: 'curb' | 'grate' | 'combination' | 'drop',
  designFlow: number, // L/s
  numberOfInlets: number = 1
): {
  totalCapacity: number;
  isAdequate: boolean;
  percentUsed: number;
  recommendation: string;
} {
  const unitCapacity = INLET_CAPACITIES[inletType];
  const totalCapacity = unitCapacity * numberOfInlets;
  const percentUsed = (designFlow / totalCapacity) * 100;
  const isAdequate = percentUsed <= 100;

  let recommendation = '';
  if (!isAdequate) {
    const needed = Math.ceil(designFlow / unitCapacity);
    recommendation = `Need ${needed} ${inletType} inlets (currently have ${numberOfInlets})`;
  }

  return {
    totalCapacity,
    isAdequate,
    percentUsed,
    recommendation,
  };
}

/**
 * Design catch basin / sumidero
 */
export function designCatchBasin(
  streetWidth: number, // m
  streetSlope: number, // % (longitudinal)
  crossSlope: number, // % (transverse)
  rainfallIntensity: number // mm/hr
): {
  spacing: number; // m between catch basins
  captureWidth: number; // m
  bypassFlow: number; // L/s
  inletType: 'curb' | 'grate' | 'combination';
} {
  // Estimate spread width in gutter
  const gutterFlow = (rainfallIntensity / 360) * streetWidth; // rough estimate L/s per m

  // Recommended spacing based on street slope
  let spacing: number;
  if (streetSlope < 1) {
    spacing = 50;
  } else if (streetSlope < 3) {
    spacing = 60;
  } else if (streetSlope < 6) {
    spacing = 80;
  } else {
    spacing = 100;
  }

  // Capture width (should be less than half lane width)
  const captureWidth = Math.min(2.0, streetWidth * 0.3);

  // Estimate bypass
  const bypassFlow = gutterFlow * 0.1; // assume 10% bypass

  // Recommend inlet type
  let inletType: 'curb' | 'grate' | 'combination';
  if (streetSlope > 4) {
    inletType = 'combination'; // high velocity needs combination
  } else if (gutterFlow > 20) {
    inletType = 'grate';
  } else {
    inletType = 'curb';
  }

  return { spacing, captureWidth, bypassFlow, inletType };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface NetworkGraph {
  nodes: Map<string, { type: 'inlet' | 'manhole'; elevation: number }>;
  edges: Map<string, string[]>; // upstream -> downstream[]
  reverseEdges: Map<string, string[]>; // downstream -> upstream[]
}

function buildNetworkGraph(input: StormSewerInput): NetworkGraph {
  const nodes = new Map<string, { type: 'inlet' | 'manhole'; elevation: number }>();
  const edges = new Map<string, string[]>();
  const reverseEdges = new Map<string, string[]>();

  // Add inlet nodes
  for (const inlet of input.inlets) {
    nodes.set(inlet.id, { type: 'inlet', elevation: inlet.invertElevation });
  }

  // Add edges from reaches
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

function topologicalSort(reaches: StormPipeReach[], network: NetworkGraph): StormPipeReach[] {
  // Simple sort by number of upstream connections (fewer = more upstream)
  return [...reaches].sort((a, b) => {
    const upA = network.reverseEdges.get(a.upstreamNode)?.length || 0;
    const upB = network.reverseEdges.get(b.upstreamNode)?.length || 0;
    return upA - upB;
  });
}

function findContributingAreas(
  reach: StormPipeReach,
  input: StormSewerInput,
  network: NetworkGraph
): DrainageSubarea[] {
  // Find all subareas that drain to this reach's upstream node
  const inlet = input.inlets.find(i => i.id === reach.upstreamNode);
  if (!inlet) return [];

  return input.subareas.filter(s => inlet.subareas.includes(s.id));
}

function getUpstreamTc(
  reach: StormPipeReach,
  network: NetworkGraph,
  input: StormSewerInput
): number {
  // Get maximum time of entry from contributing subareas
  const inlet = input.inlets.find(i => i.id === reach.upstreamNode);
  if (!inlet) return 10;

  const subareas = input.subareas.filter(s => inlet.subareas.includes(s.id));
  const maxEntry = Math.max(...subareas.map(s => s.timeOfEntry || 10));

  return maxEntry;
}

function estimateIntensity(
  returnPeriod: number,
  duration: number,
  latitude: number
): number {
  // Simple IDF approximation for central-south Chile
  // i = a / (duration + b)^c
  // Coefficients vary by return period and location

  const a = 1000 + returnPeriod * 50;
  const b = 10;
  const c = 0.7;

  return a / Math.pow(duration + b, c);
}

function summarizeMaterials(
  results: ReachDesignResult[],
  reaches: StormPipeReach[],
  defaultMaterial: PipeMaterial
): StormSewerResult['materials'] {
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

function estimateStormCosts(
  results: ReachDesignResult[],
  input: StormSewerInput
): StormSewerResult['estimatedCost'] {
  let pipeCost = 0;
  let excavationCost = 0;

  for (const result of results) {
    const reach = input.reaches.find(r => r.id === result.reachId)!;

    // Pipe cost
    const unitCost = STORM_PIPE_COSTS[result.diameter] ||
      result.diameter * 200; // fallback estimate
    pipeCost += unitCost * reach.length;

    // Excavation
    const avgDepth = (result.cover.upstream + result.cover.downstream) / 2 +
      result.diameter / 1000 + 0.3; // bedding
    const trenchWidth = Math.max(0.8, result.diameter / 1000 + 0.4);
    const volume = avgDepth * trenchWidth * reach.length;
    excavationCost += volume * EXCAVATION_COST_PER_M3;
  }

  // Manholes (estimate one per reach)
  const manholeCost = results.length * MANHOLE_COST;

  // Inlets
  const inletCost = input.inlets.reduce((sum, inlet) =>
    sum + (INLET_COSTS[inlet.type] || 400000), 0);

  const total = pipeCost + excavationCost + manholeCost + inletCost;
  const totalArea = input.subareas.reduce((sum, s) => sum + s.area, 0);

  return {
    pipes: Math.round(pipeCost),
    excavation: Math.round(excavationCost),
    manholes: Math.round(manholeCost),
    inlets: Math.round(inletCost),
    total: Math.round(total),
    perHectare: Math.round(total / totalArea),
  };
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format storm sewer design results
 */
export function formatStormSewerResult(result: StormSewerResult): string {
  const lines = [
    '=== DISEÑO ALCANTARILLADO PLUVIAL ===',
    '',
    `Proyecto: ${result.projectName}`,
    `Área total: ${result.totalDrainageArea.toFixed(2)} ha`,
    `Tormenta diseño: T=${result.designStorm.returnPeriod} años, i=${result.designStorm.intensity.toFixed(1)} mm/hr`,
    '',
    '--- RESUMEN RED ---',
    `Longitud total: ${result.totalPipeLength.toFixed(0)} m`,
    `Caudal descarga: ${result.outletFlow.toFixed(1)} L/s`,
    '',
    '--- TUBERÍAS ---',
  ];

  for (const mat of result.materials) {
    lines.push(`  Ø${mat.diameter}mm ${mat.material}: ${mat.length.toFixed(0)} m`);
  }

  lines.push('', '--- TRAMOS ---');
  for (const reach of result.reaches) {
    lines.push(`  ${reach.reachId}: Ø${reach.diameter}mm, ${reach.cumulativeFlow.toFixed(1)} L/s, v=${reach.hydraulics.velocity.toFixed(2)} m/s`);
    if (reach.warnings.length > 0) {
      reach.warnings.forEach(w => lines.push(`    ⚠ ${w}`));
    }
  }

  lines.push('', '--- COSTOS ESTIMADOS ---');
  lines.push(`  Tuberías: $${result.estimatedCost.pipes.toLocaleString()} CLP`);
  lines.push(`  Excavación: $${result.estimatedCost.excavation.toLocaleString()} CLP`);
  lines.push(`  Cámaras: $${result.estimatedCost.manholes.toLocaleString()} CLP`);
  lines.push(`  Sumideros: $${result.estimatedCost.inlets.toLocaleString()} CLP`);
  lines.push(`  TOTAL: $${result.estimatedCost.total.toLocaleString()} CLP`);
  lines.push(`  Por hectárea: $${result.estimatedCost.perHectare.toLocaleString()} CLP/ha`);

  if (result.systemWarnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.systemWarnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  return lines.join('\n');
}
