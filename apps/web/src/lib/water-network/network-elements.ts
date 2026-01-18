/**
 * Water Distribution Network Elements Module
 *
 * Defines all network components: junctions, tanks, reservoirs, pipes, pumps, valves
 * Compatible with EPANET-style network modeling
 *
 * Based on Chilean standards: NCh 691, NCh 2485, SISS regulations
 */

import {
  WaterPipeMaterial,
  FrictionFormula,
  getFrictionCoefficients,
  calculateHeadLoss,
  VELOCITY_LIMITS_WATER,
  PRESSURE_LIMITS,
} from './pipe-hydraulics';

// ============================================================================
// Node Types (Junctions, Tanks, Reservoirs)
// ============================================================================

export type NodeType = 'junction' | 'tank' | 'reservoir';

export interface BaseNode {
  id: string;
  type: NodeType;
  x: number;                   // X coordinate (m)
  y: number;                   // Y coordinate (m)
  elevation: number;           // Ground elevation (m)
  description?: string;
}

/**
 * Junction - demand node with base demand and optional patterns
 */
export interface Junction extends BaseNode {
  type: 'junction';
  baseDemand: number;          // Base demand (L/s)
  demandPattern?: string;      // ID of demand pattern
  emitterCoeff?: number;       // Emitter coefficient (L/s/m^0.5) for leakage
  initialQuality?: number;     // Initial water quality (mg/L or age)
  sourceQuality?: number;      // Source quality if injection point

  // Computed results (filled by solver)
  head?: number;               // Hydraulic head (m)
  pressure?: number;           // Pressure (m)
  actualDemand?: number;       // Actual demand considering pressure (L/s)
  quality?: number;            // Water quality result
}

/**
 * Tank - storage node with variable water level
 */
export interface Tank extends BaseNode {
  type: 'tank';
  initLevel: number;           // Initial water level above bottom (m)
  minLevel: number;            // Minimum water level (m)
  maxLevel: number;            // Maximum water level (m)
  diameter: number;            // Tank diameter (m) - for cylindrical tanks
  minVolume?: number;          // Minimum volume (m³) - for irregular shapes
  volumeCurve?: string;        // ID of volume curve (level vs volume)
  mixingModel?: 'mixed' | 'fifo' | '2comp' | 'lifo';
  mixingFraction?: number;     // Fraction of total volume for 2-compartment model
  reactionCoeff?: number;      // Bulk reaction coefficient (1/day)

  // Computed results
  head?: number;               // Hydraulic head (water surface elevation)
  volume?: number;             // Current volume (m³)
  percentFull?: number;        // Percentage of capacity
  netInflow?: number;          // Net inflow rate (L/s)
  quality?: number;            // Water quality in tank
}

/**
 * Reservoir - infinite source/sink with fixed head
 */
export interface Reservoir extends BaseNode {
  type: 'reservoir';
  totalHead: number;           // Fixed total head (m)
  headPattern?: string;        // ID of head pattern for variable head
  initialQuality?: number;     // Source water quality

  // Computed results
  head?: number;               // Same as totalHead (or from pattern)
  netOutflow?: number;         // Net outflow rate (L/s)
}

export type NetworkNode = Junction | Tank | Reservoir;

// ============================================================================
// Link Types (Pipes, Pumps, Valves)
// ============================================================================

export type LinkType = 'pipe' | 'pump' | 'valve';
export type LinkStatus = 'open' | 'closed' | 'cv'; // cv = check valve behavior

/**
 * Pipe - conduit with friction losses
 */
export interface Pipe {
  id: string;
  type: 'pipe';
  startNode: string;           // Start node ID
  endNode: string;             // End node ID
  length: number;              // Length (m)
  diameter: number;            // Internal diameter (mm)
  roughness: number;           // Roughness (C for H-W, ε for D-W, n for Manning)
  material: WaterPipeMaterial;
  status: LinkStatus;
  minorLossCoeff?: number;     // Sum of minor loss K values
  bulkCoeff?: number;          // Bulk reaction coefficient (1/day)
  wallCoeff?: number;          // Wall reaction coefficient (m/day)

  // Computed results
  flow?: number;               // Flow rate (L/s) - positive = start to end
  velocity?: number;           // Velocity (m/s)
  headLoss?: number;           // Head loss (m) - includes minor losses
  frictionFactor?: number;     // Darcy friction factor
  quality?: number;            // Average quality in pipe
}

/**
 * Pump types and curve definitions
 */
export type PumpType = 'constant_hp' | 'power_func' | 'three_point' | 'variable_speed';

export interface PumpCurvePoint {
  flow: number;                // Flow (L/s)
  head: number;                // Head (m)
}

/**
 * Pump - device that adds energy to flow
 */
export interface Pump {
  id: string;
  type: 'pump';
  startNode: string;           // Suction node ID
  endNode: string;             // Discharge node ID
  status: LinkStatus;
  pumpType: PumpType;

  // For power function: Head = A - B × Q^C
  powerCoeffA?: number;
  powerCoeffB?: number;
  powerCoeffC?: number;

  // For three-point curve
  curveId?: string;            // ID of pump curve
  curvePoints?: PumpCurvePoint[];

  // Operating parameters
  speed?: number;              // Relative speed (1.0 = rated)
  speedPattern?: string;       // ID of speed pattern
  power?: number;              // Power (kW) for constant power pump

  // Efficiency
  efficiencyCurve?: string;    // ID of efficiency curve
  ratedEfficiency?: number;    // Rated efficiency (fraction)
  energyPrice?: number;        // Energy price ($/kWh)

  // Computed results
  flow?: number;               // Flow through pump (L/s)
  headGain?: number;           // Head added by pump (m)
  efficiency?: number;         // Operating efficiency
  powerUsed?: number;          // Power consumed (kW)
  energyCost?: number;         // Energy cost ($/day)
}

/**
 * Valve types
 */
export type ValveType =
  | 'prv'    // Pressure Reducing Valve
  | 'psv'    // Pressure Sustaining Valve
  | 'pbv'    // Pressure Breaker Valve
  | 'fcv'    // Flow Control Valve
  | 'tcv'    // Throttle Control Valve
  | 'gpv';   // General Purpose Valve

/**
 * Valve - device that controls flow or pressure
 */
export interface Valve {
  id: string;
  type: 'valve';
  valveType: ValveType;
  startNode: string;           // Upstream node ID
  endNode: string;             // Downstream node ID
  diameter: number;            // Valve diameter (mm)
  status: LinkStatus;
  setting: number;             // Valve setting (depends on type)
                               // PRV/PSV/PBV: pressure (m)
                               // FCV: flow (L/s)
                               // TCV: loss coefficient
                               // GPV: curve ID
  minorLossCoeff?: number;     // Minor loss when fully open

  // Computed results
  flow?: number;               // Flow through valve (L/s)
  headLoss?: number;           // Head loss across valve (m)
  state?: 'active' | 'open' | 'closed'; // Valve operating state
}

export type NetworkLink = Pipe | Pump | Valve;

// ============================================================================
// Network Patterns and Curves
// ============================================================================

/**
 * Time pattern for demands, heads, or speeds
 */
export interface Pattern {
  id: string;
  description?: string;
  multipliers: number[];       // Multipliers for each time period
  timeStep?: number;           // Pattern time step (hours), default from options
}

/**
 * Pump curve (head vs flow)
 */
export interface PumpCurve {
  id: string;
  description?: string;
  points: PumpCurvePoint[];
}

/**
 * Volume curve (level vs volume for irregular tanks)
 */
export interface VolumeCurve {
  id: string;
  description?: string;
  points: { level: number; volume: number }[];
}

/**
 * Efficiency curve (flow vs efficiency)
 */
export interface EfficiencyCurve {
  id: string;
  description?: string;
  points: { flow: number; efficiency: number }[];
}

/**
 * Head loss curve for GPV (flow vs head loss)
 */
export interface HeadLossCurve {
  id: string;
  description?: string;
  points: { flow: number; headLoss: number }[];
}

// ============================================================================
// Network Controls and Rules
// ============================================================================

export type ControlType = 'simple' | 'rule';

/**
 * Simple control - IF condition THEN action
 */
export interface SimpleControl {
  id: string;
  type: 'simple';
  linkId: string;              // Link being controlled
  linkSetting: 'open' | 'closed' | number; // Status or setting
  conditionType: 'node_level' | 'node_pressure' | 'time' | 'clocktime';
  conditionNode?: string;      // Node ID for level/pressure conditions
  conditionValue: number;      // Threshold value
  conditionOperator: 'above' | 'below'; // Trigger direction
}

/**
 * Rule-based control - more complex logic
 */
export interface RuleControl {
  id: string;
  type: 'rule';
  priority: number;            // Rule priority (higher = more important)
  conditions: string;          // Rule conditions (parsed format)
  actions: string;             // Rule actions (parsed format)
}

export type NetworkControl = SimpleControl | RuleControl;

// ============================================================================
// Complete Network Definition
// ============================================================================

export interface NetworkOptions {
  units: 'lps' | 'lpm' | 'cms' | 'gpm'; // Flow units
  headlossFormula: FrictionFormula;
  hydraulicTimestep: number;   // Hydraulic timestep (hours)
  qualityTimestep: number;     // Quality timestep (minutes)
  patternTimestep: number;     // Pattern timestep (hours)
  reportTimestep: number;      // Report timestep (hours)
  duration: number;            // Simulation duration (hours)
  specificGravity?: number;    // Specific gravity (default 1.0)
  relativeViscosity?: number;  // Relative viscosity (default 1.0)
  demandMultiplier?: number;   // Global demand multiplier
  emitterExponent?: number;    // Pressure exponent for emitters (default 0.5)
  accuracy?: number;           // Convergence accuracy
  maxIterations?: number;      // Maximum iterations per timestep
  unbalanced?: 'stop' | 'continue'; // Action if unbalanced
  qualityType?: 'none' | 'chemical' | 'age' | 'trace';
  qualityChemical?: string;    // Chemical name
  sourceNodeForTrace?: string; // Node ID for source tracing
}

export interface WaterNetwork {
  title: string;
  description?: string;
  junctions: Junction[];
  tanks: Tank[];
  reservoirs: Reservoir[];
  pipes: Pipe[];
  pumps: Pump[];
  valves: Valve[];
  patterns: Pattern[];
  curves: {
    pump: PumpCurve[];
    efficiency: EfficiencyCurve[];
    volume: VolumeCurve[];
    headLoss: HeadLossCurve[];
  };
  controls: NetworkControl[];
  options: NetworkOptions;
}

// ============================================================================
// Node Creation Functions
// ============================================================================

/**
 * Create a junction node
 */
export function createJunction(
  id: string,
  x: number,
  y: number,
  elevation: number,
  baseDemand: number = 0,
  options: Partial<Junction> = {}
): Junction {
  return {
    id,
    type: 'junction',
    x,
    y,
    elevation,
    baseDemand,
    ...options,
  };
}

/**
 * Create a tank
 */
export function createTank(
  id: string,
  x: number,
  y: number,
  elevation: number,
  diameter: number,
  initLevel: number,
  minLevel: number,
  maxLevel: number,
  options: Partial<Tank> = {}
): Tank {
  return {
    id,
    type: 'tank',
    x,
    y,
    elevation,
    diameter,
    initLevel,
    minLevel,
    maxLevel,
    mixingModel: 'mixed',
    ...options,
  };
}

/**
 * Create a reservoir
 */
export function createReservoir(
  id: string,
  x: number,
  y: number,
  elevation: number,
  totalHead: number,
  options: Partial<Reservoir> = {}
): Reservoir {
  return {
    id,
    type: 'reservoir',
    x,
    y,
    elevation,
    totalHead,
    ...options,
  };
}

// ============================================================================
// Link Creation Functions
// ============================================================================

/**
 * Create a pipe
 */
export function createPipe(
  id: string,
  startNode: string,
  endNode: string,
  length: number,
  diameter: number,
  material: WaterPipeMaterial = 'hdpe',
  options: Partial<Pipe> = {}
): Pipe {
  const coeffs = getFrictionCoefficients(material);

  return {
    id,
    type: 'pipe',
    startNode,
    endNode,
    length,
    diameter,
    material,
    roughness: coeffs.hazenWilliamsC,
    status: 'open',
    ...options,
  };
}

/**
 * Create a pump with power function curve
 */
export function createPumpPowerFunc(
  id: string,
  startNode: string,
  endNode: string,
  shutoffHead: number,        // Head at zero flow (A coefficient)
  designFlow: number,         // Design flow (L/s)
  designHead: number,         // Head at design flow
  options: Partial<Pump> = {}
): Pump {
  // Calculate B and C for Head = A - B × Q^C
  // Assume C = 2 (typical for centrifugal pumps)
  const C = 2;
  const A = shutoffHead;
  const B = (A - designHead) / Math.pow(designFlow, C);

  return {
    id,
    type: 'pump',
    startNode,
    endNode,
    status: 'open',
    pumpType: 'power_func',
    powerCoeffA: A,
    powerCoeffB: B,
    powerCoeffC: C,
    speed: 1.0,
    ratedEfficiency: 0.75,
    ...options,
  };
}

/**
 * Create a pump with three-point curve
 */
export function createPumpThreePoint(
  id: string,
  startNode: string,
  endNode: string,
  points: [PumpCurvePoint, PumpCurvePoint, PumpCurvePoint],
  options: Partial<Pump> = {}
): Pump {
  return {
    id,
    type: 'pump',
    startNode,
    endNode,
    status: 'open',
    pumpType: 'three_point',
    curvePoints: points,
    speed: 1.0,
    ratedEfficiency: 0.75,
    ...options,
  };
}

/**
 * Create a valve
 */
export function createValve(
  id: string,
  startNode: string,
  endNode: string,
  diameter: number,
  valveType: ValveType,
  setting: number,
  options: Partial<Valve> = {}
): Valve {
  return {
    id,
    type: 'valve',
    valveType,
    startNode,
    endNode,
    diameter,
    status: 'open',
    setting,
    ...options,
  };
}

// ============================================================================
// Tank Calculations
// ============================================================================

/**
 * Calculate cylindrical tank volume
 */
export function calculateTankVolume(diameter: number, level: number): number {
  const area = Math.PI * Math.pow(diameter / 2, 2);
  return area * level;
}

/**
 * Calculate tank level from volume (cylindrical)
 */
export function calculateTankLevel(diameter: number, volume: number): number {
  const area = Math.PI * Math.pow(diameter / 2, 2);
  return volume / area;
}

/**
 * Get tank volume from volume curve (interpolation)
 */
export function getTankVolumeFromCurve(
  level: number,
  curve: VolumeCurve
): number {
  const points = curve.points;

  if (level <= points[0].level) return points[0].volume;
  if (level >= points[points.length - 1].level) return points[points.length - 1].volume;

  // Linear interpolation
  for (let i = 0; i < points.length - 1; i++) {
    if (level >= points[i].level && level <= points[i + 1].level) {
      const t = (level - points[i].level) / (points[i + 1].level - points[i].level);
      return points[i].volume + t * (points[i + 1].volume - points[i].volume);
    }
  }

  return 0;
}

// ============================================================================
// Pump Calculations
// ============================================================================

/**
 * Calculate pump head at given flow using power function
 * Head = A - B × Q^C
 */
export function calculatePumpHead(pump: Pump, flow: number): number {
  if (pump.pumpType === 'power_func' && pump.powerCoeffA && pump.powerCoeffB && pump.powerCoeffC) {
    return pump.powerCoeffA - pump.powerCoeffB * Math.pow(flow, pump.powerCoeffC);
  }

  if (pump.pumpType === 'three_point' && pump.curvePoints && pump.curvePoints.length >= 2) {
    return interpolatePumpCurve(flow, pump.curvePoints);
  }

  if (pump.pumpType === 'constant_hp' && pump.power) {
    // Power = ρgQH/η → H = Pη/(ρgQ)
    const efficiency = pump.ratedEfficiency || 0.75;
    const rho = 998.2; // kg/m³
    const g = 9.81;
    const Q = flow / 1000; // Convert to m³/s
    if (Q > 0) {
      return (pump.power * 1000 * efficiency) / (rho * g * Q);
    }
  }

  return 0;
}

/**
 * Interpolate pump curve to get head at given flow
 */
function interpolatePumpCurve(flow: number, points: PumpCurvePoint[]): number {
  const sorted = [...points].sort((a, b) => a.flow - b.flow);

  if (flow <= sorted[0].flow) return sorted[0].head;
  if (flow >= sorted[sorted.length - 1].flow) return sorted[sorted.length - 1].head;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (flow >= sorted[i].flow && flow <= sorted[i + 1].flow) {
      const t = (flow - sorted[i].flow) / (sorted[i + 1].flow - sorted[i].flow);
      return sorted[i].head + t * (sorted[i + 1].head - sorted[i].head);
    }
  }

  return 0;
}

/**
 * Calculate pump power consumption
 * P = ρgQH/η
 */
export function calculatePumpPower(
  flow: number,              // L/s
  head: number,              // m
  efficiency: number = 0.75
): number {
  const rho = 998.2; // kg/m³
  const g = 9.81;
  const Q = flow / 1000; // m³/s
  const power = (rho * g * Q * head) / (efficiency * 1000); // kW
  return power;
}

/**
 * Calculate pump operating point (intersection with system curve)
 */
export function findPumpOperatingPoint(
  pump: Pump,
  staticHead: number,        // Static head to overcome (m)
  systemK: number            // System curve coefficient: H = Hs + K×Q²
): { flow: number; head: number } | null {
  // Pump: H = A - B×Q^C
  // System: H = Hs + K×Q²
  // Solve: A - B×Q^C = Hs + K×Q²

  if (pump.pumpType !== 'power_func' || !pump.powerCoeffA || !pump.powerCoeffB || !pump.powerCoeffC) {
    return null;
  }

  const A = pump.powerCoeffA;
  const B = pump.powerCoeffB;
  const C = pump.powerCoeffC;
  const Hs = staticHead;

  // Newton-Raphson iteration
  let Q = 10; // Initial guess (L/s)
  for (let i = 0; i < 50; i++) {
    const pumpHead = A - B * Math.pow(Q, C);
    const systemHead = Hs + systemK * Math.pow(Q, 2);
    const f = pumpHead - systemHead;
    const df = -B * C * Math.pow(Q, C - 1) - 2 * systemK * Q;

    if (Math.abs(f) < 0.001) {
      return { flow: Q, head: pumpHead };
    }

    Q = Q - f / df;
    if (Q < 0) Q = 0.1;
  }

  return null;
}

// ============================================================================
// Valve Calculations
// ============================================================================

/**
 * Calculate PRV head loss (maintains downstream pressure)
 */
export function calculatePRVHeadLoss(
  upstreamHead: number,
  downstreamElevation: number,
  setting: number            // Target downstream pressure (m)
): { headLoss: number; state: 'active' | 'open' | 'closed' } {
  const targetHead = downstreamElevation + setting;

  if (upstreamHead <= targetHead) {
    // PRV fully open, no pressure reduction needed
    return { headLoss: 0, state: 'open' };
  }

  // Active - reducing pressure
  return { headLoss: upstreamHead - targetHead, state: 'active' };
}

/**
 * Calculate PSV head loss (maintains upstream pressure)
 */
export function calculatePSVHeadLoss(
  downstreamHead: number,
  upstreamElevation: number,
  setting: number            // Minimum upstream pressure (m)
): { headLoss: number; state: 'active' | 'open' | 'closed' } {
  const minHead = upstreamElevation + setting;

  if (downstreamHead + setting <= minHead) {
    // Need to sustain upstream pressure
    return { headLoss: setting, state: 'active' };
  }

  // Fully open
  return { headLoss: 0, state: 'open' };
}

/**
 * Calculate FCV head loss (maintains fixed flow)
 */
export function calculateFCVHeadLoss(
  flow: number,
  setting: number,           // Target flow (L/s)
  availableHead: number
): { headLoss: number; actualFlow: number; state: 'active' | 'open' } {
  if (flow > setting) {
    // Throttle to achieve target flow
    // This is simplified - actual calculation depends on system
    return { headLoss: availableHead * 0.5, actualFlow: setting, state: 'active' };
  }

  return { headLoss: 0, actualFlow: flow, state: 'open' };
}

/**
 * Calculate TCV head loss (throttle control)
 */
export function calculateTCVHeadLoss(
  velocity: number,
  setting: number            // Loss coefficient K
): number {
  const g = 9.81;
  return setting * Math.pow(velocity, 2) / (2 * g);
}

// ============================================================================
// Network Validation
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate network configuration
 */
export function validateNetwork(network: WaterNetwork): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeIds = new Set<string>();
  const linkIds = new Set<string>();

  // Check for duplicate IDs
  for (const junction of network.junctions) {
    if (nodeIds.has(junction.id)) {
      errors.push(`Duplicate junction ID: ${junction.id}`);
    }
    nodeIds.add(junction.id);
  }

  for (const tank of network.tanks) {
    if (nodeIds.has(tank.id)) {
      errors.push(`Duplicate tank ID: ${tank.id}`);
    }
    nodeIds.add(tank.id);

    // Validate tank levels
    if (tank.initLevel < tank.minLevel || tank.initLevel > tank.maxLevel) {
      errors.push(`Tank ${tank.id}: initial level outside min/max range`);
    }
  }

  for (const reservoir of network.reservoirs) {
    if (nodeIds.has(reservoir.id)) {
      errors.push(`Duplicate reservoir ID: ${reservoir.id}`);
    }
    nodeIds.add(reservoir.id);
  }

  // Validate links
  const allLinks = [...network.pipes, ...network.pumps, ...network.valves];

  for (const link of allLinks) {
    if (linkIds.has(link.id)) {
      errors.push(`Duplicate link ID: ${link.id}`);
    }
    linkIds.add(link.id);

    if (!nodeIds.has(link.startNode)) {
      errors.push(`Link ${link.id}: start node ${link.startNode} not found`);
    }
    if (!nodeIds.has(link.endNode)) {
      errors.push(`Link ${link.id}: end node ${link.endNode} not found`);
    }

    // Validate pipe properties
    if (link.type === 'pipe') {
      const pipe = link as Pipe;
      if (pipe.diameter <= 0) {
        errors.push(`Pipe ${pipe.id}: invalid diameter ${pipe.diameter}`);
      }
      if (pipe.length <= 0) {
        errors.push(`Pipe ${pipe.id}: invalid length ${pipe.length}`);
      }
    }
  }

  // Check for at least one source
  if (network.reservoirs.length === 0 && network.tanks.length === 0) {
    errors.push('Network must have at least one reservoir or tank');
  }

  // Check for isolated nodes
  const connectedNodes = new Set<string>();
  for (const link of allLinks) {
    connectedNodes.add(link.startNode);
    connectedNodes.add(link.endNode);
  }

  for (const nodeId of nodeIds) {
    if (!connectedNodes.has(nodeId)) {
      warnings.push(`Node ${nodeId} is not connected to any link`);
    }
  }

  // Validate patterns
  const patternIds = new Set(network.patterns.map(p => p.id));
  for (const junction of network.junctions) {
    if (junction.demandPattern && !patternIds.has(junction.demandPattern)) {
      warnings.push(`Junction ${junction.id}: demand pattern ${junction.demandPattern} not found`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Network Statistics
// ============================================================================

export interface NetworkStatistics {
  nodeCount: number;
  junctionCount: number;
  tankCount: number;
  reservoirCount: number;
  pipeCount: number;
  pumpCount: number;
  valveCount: number;
  totalPipeLength: number;    // m
  totalDemand: number;        // L/s
  totalTankVolume: number;    // m³
  elevationRange: { min: number; max: number };
  diameterRange: { min: number; max: number };
}

/**
 * Calculate network statistics
 */
export function getNetworkStatistics(network: WaterNetwork): NetworkStatistics {
  const junctionCount = network.junctions.length;
  const tankCount = network.tanks.length;
  const reservoirCount = network.reservoirs.length;

  let totalPipeLength = 0;
  let minDiameter = Infinity;
  let maxDiameter = 0;

  for (const pipe of network.pipes) {
    totalPipeLength += pipe.length;
    if (pipe.diameter < minDiameter) minDiameter = pipe.diameter;
    if (pipe.diameter > maxDiameter) maxDiameter = pipe.diameter;
  }

  let totalDemand = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  for (const junction of network.junctions) {
    totalDemand += junction.baseDemand;
    if (junction.elevation < minElevation) minElevation = junction.elevation;
    if (junction.elevation > maxElevation) maxElevation = junction.elevation;
  }

  for (const tank of network.tanks) {
    if (tank.elevation < minElevation) minElevation = tank.elevation;
    if (tank.elevation > maxElevation) maxElevation = tank.elevation;
  }

  for (const reservoir of network.reservoirs) {
    if (reservoir.elevation < minElevation) minElevation = reservoir.elevation;
    if (reservoir.elevation > maxElevation) maxElevation = reservoir.elevation;
  }

  let totalTankVolume = 0;
  for (const tank of network.tanks) {
    totalTankVolume += calculateTankVolume(tank.diameter, tank.maxLevel);
  }

  return {
    nodeCount: junctionCount + tankCount + reservoirCount,
    junctionCount,
    tankCount,
    reservoirCount,
    pipeCount: network.pipes.length,
    pumpCount: network.pumps.length,
    valveCount: network.valves.length,
    totalPipeLength,
    totalDemand,
    totalTankVolume,
    elevationRange: { min: minElevation, max: maxElevation },
    diameterRange: { min: minDiameter, max: maxDiameter },
  };
}

// ============================================================================
// Default Network Options
// ============================================================================

export function getDefaultNetworkOptions(): NetworkOptions {
  return {
    units: 'lps',
    headlossFormula: 'hazen-williams',
    hydraulicTimestep: 1,       // 1 hour
    qualityTimestep: 5,         // 5 minutes
    patternTimestep: 1,         // 1 hour
    reportTimestep: 1,          // 1 hour
    duration: 24,               // 24 hours
    specificGravity: 1.0,
    relativeViscosity: 1.0,
    demandMultiplier: 1.0,
    emitterExponent: 0.5,
    accuracy: 0.001,
    maxIterations: 40,
    unbalanced: 'continue',
    qualityType: 'none',
  };
}

/**
 * Create an empty network
 */
export function createEmptyNetwork(title: string = 'New Network'): WaterNetwork {
  return {
    title,
    junctions: [],
    tanks: [],
    reservoirs: [],
    pipes: [],
    pumps: [],
    valves: [],
    patterns: [],
    curves: {
      pump: [],
      efficiency: [],
      volume: [],
      headLoss: [],
    },
    controls: [],
    options: getDefaultNetworkOptions(),
  };
}
