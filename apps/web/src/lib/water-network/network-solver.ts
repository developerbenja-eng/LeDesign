/**
 * Water Distribution Network Hydraulic Solver
 *
 * Implements the Gradient Method (Todini & Pilati, 1988) for solving
 * water distribution network hydraulics, similar to EPANET.
 *
 * Key equations:
 * - Continuity at nodes: Σ(Qin) - Σ(Qout) = Demand
 * - Energy equation in loops: Σ(hf) = 0
 * - Head loss in pipes: hf = r × Q × |Q|^(n-1) + m × Q × |Q|
 */

import {
  WaterNetwork,
  NetworkNode,
  NetworkLink,
  Junction,
  Tank,
  Reservoir,
  Pipe,
  Pump,
  Valve,
  Pattern,
  calculateTankVolume,
  calculateTankLevel,
  calculatePumpHead,
  calculatePumpPower,
} from './network-elements';

import {
  calculateHeadLoss,
  calculateHeadLossHazenWilliams,
  calculateHeadLossDarcyWeisbach,
  WATER_PROPERTIES,
  FrictionFormula,
} from './pipe-hydraulics';

// ============================================================================
// Types
// ============================================================================

export interface SolverOptions {
  maxIterations: number;
  accuracy: number;            // Convergence tolerance
  dampingFactor: number;       // Damping for Newton-Raphson
  checkValves: boolean;        // Enable check valve modeling
  demandModel: 'dda' | 'pda';  // Demand-driven or Pressure-driven
  minPressure?: number;        // Min pressure for PDA (m)
  requiredPressure?: number;   // Required pressure for full demand (m)
}

export interface SolverResult {
  converged: boolean;
  iterations: number;
  maxHeadError: number;
  maxFlowError: number;
  totalDemand: number;         // L/s
  totalSupply: number;         // L/s
  totalHeadLoss: number;       // m
  totalPumpPower: number;      // kW
  warnings: string[];
}

export interface TimeStepResult {
  time: number;                // Time in hours
  solverResult: SolverResult;
  nodeResults: Map<string, NodeResult>;
  linkResults: Map<string, LinkResult>;
}

export interface NodeResult {
  head: number;                // m
  pressure: number;            // m
  demand: number;              // L/s (actual)
  quality?: number;
}

export interface LinkResult {
  flow: number;                // L/s
  velocity: number;            // m/s
  headLoss: number;            // m
  status: 'open' | 'closed' | 'active';
  quality?: number;
}

export interface SimulationResult {
  network: WaterNetwork;
  timeSteps: TimeStepResult[];
  summary: {
    maxPressure: { value: number; nodeId: string; time: number };
    minPressure: { value: number; nodeId: string; time: number };
    maxVelocity: { value: number; linkId: string; time: number };
    maxHeadLoss: { value: number; linkId: string; time: number };
    totalEnergyUsed: number;   // kWh
    totalEnergyCost: number;   // $
  };
}

// ============================================================================
// Matrix Operations (Sparse)
// ============================================================================

/**
 * Simple sparse matrix implementation for network solver
 */
class SparseMatrix {
  private data: Map<string, number> = new Map();
  public rows: number;
  public cols: number;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
  }

  private key(i: number, j: number): string {
    return `${i},${j}`;
  }

  get(i: number, j: number): number {
    return this.data.get(this.key(i, j)) || 0;
  }

  set(i: number, j: number, value: number): void {
    if (value === 0) {
      this.data.delete(this.key(i, j));
    } else {
      this.data.set(this.key(i, j), value);
    }
  }

  add(i: number, j: number, value: number): void {
    this.set(i, j, this.get(i, j) + value);
  }

  /**
   * Multiply matrix by vector
   */
  multiplyVector(v: number[]): number[] {
    const result = new Array(this.rows).fill(0);
    for (const [key, value] of this.data) {
      const [i, j] = key.split(',').map(Number);
      result[i] += value * v[j];
    }
    return result;
  }

  /**
   * Solve Ax = b using Cholesky decomposition (for symmetric positive definite)
   * Falls back to Gauss-Seidel for general case
   */
  solve(b: number[]): number[] {
    return this.solveGaussSeidel(b);
  }

  private solveGaussSeidel(b: number[], maxIter: number = 100, tol: number = 1e-6): number[] {
    const x = new Array(this.rows).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
      let maxDiff = 0;

      for (let i = 0; i < this.rows; i++) {
        const diag = this.get(i, i);
        if (Math.abs(diag) < 1e-10) continue;

        let sum = b[i];
        for (let j = 0; j < this.cols; j++) {
          if (j !== i) {
            sum -= this.get(i, j) * x[j];
          }
        }

        const newX = sum / diag;
        maxDiff = Math.max(maxDiff, Math.abs(newX - x[i]));
        x[i] = newX;
      }

      if (maxDiff < tol) break;
    }

    return x;
  }

  clear(): void {
    this.data.clear();
  }
}

// ============================================================================
// Network Indexing
// ============================================================================

interface NetworkIndex {
  nodeIndex: Map<string, number>;
  linkIndex: Map<string, number>;
  junctions: Junction[];
  fixedHeadNodes: (Tank | Reservoir)[];
  pipes: Pipe[];
  pumps: Pump[];
  valves: Valve[];
  nodeCount: number;
  linkCount: number;
}

function buildNetworkIndex(network: WaterNetwork): NetworkIndex {
  const nodeIndex = new Map<string, number>();
  const linkIndex = new Map<string, number>();

  // Index junctions first (unknowns)
  let idx = 0;
  for (const junction of network.junctions) {
    nodeIndex.set(junction.id, idx++);
  }

  // Index tanks and reservoirs (known heads)
  const fixedHeadNodes: (Tank | Reservoir)[] = [...network.tanks, ...network.reservoirs];
  for (const node of fixedHeadNodes) {
    nodeIndex.set(node.id, idx++);
  }

  // Index links
  idx = 0;
  for (const pipe of network.pipes) {
    linkIndex.set(pipe.id, idx++);
  }
  for (const pump of network.pumps) {
    linkIndex.set(pump.id, idx++);
  }
  for (const valve of network.valves) {
    linkIndex.set(valve.id, idx++);
  }

  return {
    nodeIndex,
    linkIndex,
    junctions: network.junctions,
    fixedHeadNodes,
    pipes: network.pipes,
    pumps: network.pumps,
    valves: network.valves,
    nodeCount: nodeIndex.size,
    linkCount: linkIndex.size,
  };
}

// ============================================================================
// Head Loss Coefficient Functions
// ============================================================================

/**
 * Calculate resistance coefficient for pipe
 * For Hazen-Williams: r = 10.67 × L / (C^1.852 × D^4.87)
 */
function getPipeResistance(
  pipe: Pipe,
  formula: FrictionFormula
): number {
  const L = pipe.length;
  const D = pipe.diameter / 1000; // m

  if (formula === 'hazen-williams') {
    const C = pipe.roughness;
    return 10.67 * L / (Math.pow(C, 1.852) * Math.pow(D, 4.87));
  }

  // Darcy-Weisbach: r = 8 × f × L / (π² × g × D^5)
  // Using approximate f for initial calculation
  const eps = pipe.roughness / 1000;
  const f = 0.25 / Math.pow(Math.log10(eps / (3.7 * D) + 5.74 / Math.pow(1e5, 0.9)), 2);
  const g = 9.81;
  return 8 * f * L / (Math.PI * Math.PI * g * Math.pow(D, 5));
}

/**
 * Calculate minor loss coefficient for pipe
 * hm = m × Q × |Q| where m = K / (2 × g × A²)
 */
function getMinorLossCoeff(
  pipe: Pipe
): number {
  const K = pipe.minorLossCoeff || 0;
  if (K === 0) return 0;

  const D = pipe.diameter / 1000;
  const A = Math.PI * Math.pow(D, 2) / 4;
  const g = 9.81;

  return K / (2 * g * A * A);
}

// ============================================================================
// Gradient Method Solver
// ============================================================================

/**
 * Solve network hydraulics using the Gradient Method
 *
 * The system of equations:
 * [A11  A12] [dQ]   [E1]
 * [A21   0 ] [dH] = [E2]
 *
 * Where:
 * A11 = diagonal matrix of ∂hL/∂Q for each link
 * A12 = topology matrix (node-link incidence)
 * A21 = transpose of A12
 * E1 = -hL + A12 × H (energy balance error)
 * E2 = -A21 × Q + D (continuity error)
 */
export function solveNetwork(
  network: WaterNetwork,
  options: Partial<SolverOptions> = {},
  patternMultipliers?: Map<string, number>
): SolverResult & { nodeResults: Map<string, NodeResult>; linkResults: Map<string, LinkResult> } {
  const opts: SolverOptions = {
    maxIterations: 40,
    accuracy: 0.001,
    dampingFactor: 1.0,
    checkValves: true,
    demandModel: 'dda',
    minPressure: 0,
    requiredPressure: 20,
    ...options,
  };

  const index = buildNetworkIndex(network);
  const warnings: string[] = [];

  // Initialize flows and heads
  const Q = new Array(index.linkCount).fill(1); // Initial flow guess (L/s)
  const H = new Array(index.nodeCount).fill(0);

  // Set initial heads for junctions (estimate)
  for (let i = 0; i < index.junctions.length; i++) {
    const junction = index.junctions[i];
    H[i] = junction.elevation + 20; // Assume 20m pressure initially
  }

  // Set heads for fixed-head nodes
  for (let i = 0; i < index.fixedHeadNodes.length; i++) {
    const node = index.fixedHeadNodes[i];
    const idx = index.junctions.length + i;

    if (node.type === 'reservoir') {
      H[idx] = node.totalHead;
    } else {
      // Tank - head is elevation + water level
      H[idx] = node.elevation + node.initLevel;
    }
  }

  // Get demands with pattern multipliers
  const demands = new Array(index.junctions.length).fill(0);
  for (let i = 0; i < index.junctions.length; i++) {
    const junction = index.junctions[i];
    let demand = junction.baseDemand;

    if (junction.demandPattern && patternMultipliers) {
      const mult = patternMultipliers.get(junction.demandPattern) || 1.0;
      demand *= mult;
    }

    demands[i] = demand;
  }

  // Build topology matrices
  const A12 = new SparseMatrix(index.linkCount, index.nodeCount);
  const formula = network.options.headlossFormula;

  // All links
  const allLinks: NetworkLink[] = [...index.pipes, ...index.pumps, ...index.valves];

  for (let linkIdx = 0; linkIdx < allLinks.length; linkIdx++) {
    const link = allLinks[linkIdx];
    const startIdx = index.nodeIndex.get(link.startNode);
    const endIdx = index.nodeIndex.get(link.endNode);

    if (startIdx !== undefined) {
      A12.set(linkIdx, startIdx, -1);
    }
    if (endIdx !== undefined) {
      A12.set(linkIdx, endIdx, 1);
    }
  }

  // Iterative solution
  let converged = false;
  let iterations = 0;
  let maxHeadError = Infinity;
  let maxFlowError = Infinity;

  for (let iter = 0; iter < opts.maxIterations; iter++) {
    iterations = iter + 1;

    // Build A11 (diagonal of ∂hL/∂Q) and E1 (energy error)
    const A11 = new Array(index.linkCount).fill(0);
    const E1 = new Array(index.linkCount).fill(0);

    for (let linkIdx = 0; linkIdx < allLinks.length; linkIdx++) {
      const link = allLinks[linkIdx];

      if (link.status === 'closed') {
        A11[linkIdx] = 1e10; // High resistance for closed link
        E1[linkIdx] = 0;
        continue;
      }

      const startIdx = index.nodeIndex.get(link.startNode)!;
      const endIdx = index.nodeIndex.get(link.endNode)!;
      const dH = H[startIdx] - H[endIdx];
      const q = Q[linkIdx];

      if (link.type === 'pipe') {
        const pipe = link as Pipe;
        const r = getPipeResistance(pipe, formula);
        const m = getMinorLossCoeff(pipe);

        // Head loss: hL = r × Q × |Q|^(n-1) + m × Q × |Q|
        // For H-W: n = 1.852
        const n = formula === 'hazen-williams' ? 1.852 : 2;
        const hL = r * q * Math.pow(Math.abs(q), n - 1) + m * q * Math.abs(q);

        // Derivative: ∂hL/∂Q = n × r × |Q|^(n-1) + 2 × m × |Q|
        const dhLdQ = n * r * Math.pow(Math.abs(q) + 0.001, n - 1) + 2 * m * (Math.abs(q) + 0.001);

        A11[linkIdx] = 1 / dhLdQ;
        E1[linkIdx] = dH - hL;

        // Check valve behavior
        if (opts.checkValves && link.status === 'cv' && q < 0) {
          Q[linkIdx] = 0;
          A11[linkIdx] = 1e-10;
        }
      } else if (link.type === 'pump') {
        const pump = link as Pump;
        const pumpHead = calculatePumpHead(pump, Math.abs(q));

        // Pump adds head from start to end
        const hGain = pumpHead * (pump.speed || 1.0);

        // Derivative (approximate)
        const q2 = Math.abs(q) + 0.1;
        const pumpHead2 = calculatePumpHead(pump, q2);
        const dhGaindQ = (pumpHead2 - pumpHead) / 0.1;

        A11[linkIdx] = 1 / (Math.abs(dhGaindQ) + 0.001);
        E1[linkIdx] = dH + hGain; // Pump adds head
      } else if (link.type === 'valve') {
        const valve = link as Valve;

        // Simplified valve modeling
        if (valve.valveType === 'prv') {
          const targetPressure = valve.setting;
          const downstreamElev = index.junctions.find(j => j.id === valve.endNode)?.elevation ||
                                 index.fixedHeadNodes.find(n => n.id === valve.endNode)?.elevation || 0;
          const targetHead = downstreamElev + targetPressure;

          if (H[startIdx] > targetHead) {
            // Active - force downstream head to target
            E1[linkIdx] = H[endIdx] - targetHead;
            A11[linkIdx] = 1e-3;
          } else {
            // Open - act like open pipe
            A11[linkIdx] = 1e-3;
            E1[linkIdx] = dH;
          }
        } else {
          // TCV and others - act as resistance
          const K = valve.setting || 1;
          const D = valve.diameter / 1000;
          const A = Math.PI * D * D / 4;
          const m = K / (2 * 9.81 * A * A);

          A11[linkIdx] = 1 / (2 * m * (Math.abs(q) + 0.001));
          E1[linkIdx] = dH - m * q * Math.abs(q);
        }
      }
    }

    // Build continuity error E2 = D - A21 × Q
    const E2 = [...demands];
    for (let linkIdx = 0; linkIdx < allLinks.length; linkIdx++) {
      const link = allLinks[linkIdx];
      const startIdx = index.nodeIndex.get(link.startNode);
      const endIdx = index.nodeIndex.get(link.endNode);

      if (startIdx !== undefined && startIdx < index.junctions.length) {
        E2[startIdx] += Q[linkIdx]; // Flow leaving node
      }
      if (endIdx !== undefined && endIdx < index.junctions.length) {
        E2[endIdx] -= Q[linkIdx]; // Flow entering node
      }
    }

    // Solve for head corrections at junctions
    // Using simplified approach: H = H + α × (E2 / connectivity)
    const connectivity = new Array(index.junctions.length).fill(0);
    for (let linkIdx = 0; linkIdx < allLinks.length; linkIdx++) {
      const link = allLinks[linkIdx];
      const startIdx = index.nodeIndex.get(link.startNode);
      const endIdx = index.nodeIndex.get(link.endNode);

      if (startIdx !== undefined && startIdx < index.junctions.length) {
        connectivity[startIdx] += A11[linkIdx];
      }
      if (endIdx !== undefined && endIdx < index.junctions.length) {
        connectivity[endIdx] += A11[linkIdx];
      }
    }

    maxHeadError = 0;
    for (let i = 0; i < index.junctions.length; i++) {
      if (connectivity[i] > 0) {
        const dH = opts.dampingFactor * E2[i] / connectivity[i];
        H[i] += dH;
        maxHeadError = Math.max(maxHeadError, Math.abs(dH));
      }
    }

    // Update flows: Q = Q + A11 × E1
    maxFlowError = 0;
    for (let linkIdx = 0; linkIdx < allLinks.length; linkIdx++) {
      const dQ = opts.dampingFactor * A11[linkIdx] * E1[linkIdx];
      Q[linkIdx] += dQ;
      maxFlowError = Math.max(maxFlowError, Math.abs(dQ));
    }

    // Check convergence
    if (maxHeadError < opts.accuracy && maxFlowError < opts.accuracy * 10) {
      converged = true;
      break;
    }
  }

  if (!converged) {
    warnings.push(`Did not converge after ${opts.maxIterations} iterations (head error: ${maxHeadError.toFixed(4)}, flow error: ${maxFlowError.toFixed(4)})`);
  }

  // Compile results
  const nodeResults = new Map<string, NodeResult>();
  const linkResults = new Map<string, LinkResult>();

  // Junction results
  for (let i = 0; i < index.junctions.length; i++) {
    const junction = index.junctions[i];
    const head = H[i];
    const pressure = head - junction.elevation;

    if (pressure < PRESSURE_LIMITS.minimum.residual) {
      warnings.push(`Low pressure at ${junction.id}: ${pressure.toFixed(1)} m`);
    }

    nodeResults.set(junction.id, {
      head,
      pressure,
      demand: demands[i],
    });
  }

  // Fixed head node results
  for (let i = 0; i < index.fixedHeadNodes.length; i++) {
    const node = index.fixedHeadNodes[i];
    const idx = index.junctions.length + i;

    nodeResults.set(node.id, {
      head: H[idx],
      pressure: H[idx] - node.elevation,
      demand: 0,
    });
  }

  // Link results
  let totalHeadLoss = 0;
  let totalPumpPower = 0;

  for (let linkIdx = 0; linkIdx < allLinks.length; linkIdx++) {
    const link = allLinks[linkIdx];
    const flow = Q[linkIdx];

    if (link.type === 'pipe') {
      const pipe = link as Pipe;
      const D = pipe.diameter / 1000;
      const A = Math.PI * D * D / 4;
      const velocity = Math.abs(flow / 1000) / A;

      const startIdx = index.nodeIndex.get(link.startNode)!;
      const endIdx = index.nodeIndex.get(link.endNode)!;
      const headLoss = Math.abs(H[startIdx] - H[endIdx]);
      totalHeadLoss += headLoss;

      linkResults.set(link.id, {
        flow,
        velocity,
        headLoss,
        status: link.status === 'closed' ? 'closed' : 'open',
      });

      // Velocity warnings
      if (velocity > 3.0) {
        warnings.push(`High velocity in ${pipe.id}: ${velocity.toFixed(2)} m/s`);
      }
    } else if (link.type === 'pump') {
      const pump = link as Pump;
      const headGain = calculatePumpHead(pump, Math.abs(flow));
      const power = calculatePumpPower(Math.abs(flow), headGain, pump.ratedEfficiency);
      totalPumpPower += power;

      linkResults.set(link.id, {
        flow: Math.abs(flow),
        velocity: 0,
        headLoss: -headGain, // Negative = head gain
        status: link.status === 'closed' ? 'closed' : 'active',
      });
    } else if (link.type === 'valve') {
      const valve = link as Valve;
      const startIdx = index.nodeIndex.get(link.startNode)!;
      const endIdx = index.nodeIndex.get(link.endNode)!;
      const headLoss = H[startIdx] - H[endIdx];

      const D = valve.diameter / 1000;
      const A = Math.PI * D * D / 4;
      const velocity = Math.abs(flow / 1000) / A;

      linkResults.set(link.id, {
        flow,
        velocity,
        headLoss,
        status: headLoss > 0.1 ? 'active' : 'open',
      });
    }
  }

  // Calculate totals
  const totalDemand = demands.reduce((a, b) => a + b, 0);
  let totalSupply = 0;
  for (const node of index.fixedHeadNodes) {
    const result = linkResults.get(node.id);
    if (result) {
      totalSupply += Math.abs(result.flow);
    }
  }

  return {
    converged,
    iterations,
    maxHeadError,
    maxFlowError,
    totalDemand,
    totalSupply,
    totalHeadLoss,
    totalPumpPower,
    warnings,
    nodeResults,
    linkResults,
  };
}

// ============================================================================
// Extended Period Simulation
// ============================================================================

import { PRESSURE_LIMITS } from './pipe-hydraulics';

/**
 * Run extended period simulation
 */
export function runSimulation(
  network: WaterNetwork,
  options: Partial<SolverOptions> = {}
): SimulationResult {
  const duration = network.options.duration;
  const timeStep = network.options.hydraulicTimestep;
  const numSteps = Math.ceil(duration / timeStep);

  const timeSteps: TimeStepResult[] = [];

  // Track extremes
  let maxPressure = { value: -Infinity, nodeId: '', time: 0 };
  let minPressure = { value: Infinity, nodeId: '', time: 0 };
  let maxVelocity = { value: 0, linkId: '', time: 0 };
  let maxHeadLoss = { value: 0, linkId: '', time: 0 };
  let totalEnergyUsed = 0;

  // Clone network for simulation (to update tank levels)
  const simNetwork = JSON.parse(JSON.stringify(network)) as WaterNetwork;

  for (let step = 0; step <= numSteps; step++) {
    const time = step * timeStep;

    // Get pattern multipliers for this time
    const patternMultipliers = new Map<string, number>();
    for (const pattern of simNetwork.patterns) {
      const patternStep = network.options.patternTimestep || 1;
      const idx = Math.floor((time / patternStep) % pattern.multipliers.length);
      patternMultipliers.set(pattern.id, pattern.multipliers[idx]);
    }

    // Solve network
    const result = solveNetwork(simNetwork, options, patternMultipliers);

    timeSteps.push({
      time,
      solverResult: {
        converged: result.converged,
        iterations: result.iterations,
        maxHeadError: result.maxHeadError,
        maxFlowError: result.maxFlowError,
        totalDemand: result.totalDemand,
        totalSupply: result.totalSupply,
        totalHeadLoss: result.totalHeadLoss,
        totalPumpPower: result.totalPumpPower,
        warnings: result.warnings,
      },
      nodeResults: result.nodeResults,
      linkResults: result.linkResults,
    });

    // Track extremes
    for (const [nodeId, nodeResult] of result.nodeResults) {
      if (nodeResult.pressure > maxPressure.value) {
        maxPressure = { value: nodeResult.pressure, nodeId, time };
      }
      if (nodeResult.pressure < minPressure.value && nodeResult.demand > 0) {
        minPressure = { value: nodeResult.pressure, nodeId, time };
      }
    }

    for (const [linkId, linkResult] of result.linkResults) {
      if (linkResult.velocity > maxVelocity.value) {
        maxVelocity = { value: linkResult.velocity, linkId, time };
      }
      if (linkResult.headLoss > maxHeadLoss.value) {
        maxHeadLoss = { value: linkResult.headLoss, linkId, time };
      }
    }

    // Accumulate energy
    totalEnergyUsed += result.totalPumpPower * timeStep;

    // Update tank levels
    for (const tank of simNetwork.tanks) {
      let netInflow = 0;

      // Find flows into/out of tank
      for (const pipe of simNetwork.pipes) {
        const linkResult = result.linkResults.get(pipe.id);
        if (!linkResult) continue;

        if (pipe.endNode === tank.id) {
          netInflow += linkResult.flow;
        } else if (pipe.startNode === tank.id) {
          netInflow -= linkResult.flow;
        }
      }

      // Update level (L/s → m³/h → level change)
      const volumeChange = netInflow * 3.6 * timeStep; // m³
      const area = Math.PI * Math.pow(tank.diameter / 2, 2);
      const levelChange = volumeChange / area;

      tank.initLevel = Math.max(tank.minLevel,
        Math.min(tank.maxLevel, tank.initLevel + levelChange));
    }
  }

  // Calculate energy cost
  const avgEnergyPrice = simNetwork.pumps.reduce(
    (sum, p) => sum + (p.energyPrice || 0.1), 0
  ) / Math.max(1, simNetwork.pumps.length);
  const totalEnergyCost = totalEnergyUsed * avgEnergyPrice;

  return {
    network: simNetwork,
    timeSteps,
    summary: {
      maxPressure,
      minPressure,
      maxVelocity,
      maxHeadLoss,
      totalEnergyUsed,
      totalEnergyCost,
    },
  };
}

// ============================================================================
// Fire Flow Analysis
// ============================================================================

export interface FireFlowResult {
  nodeId: string;
  availableFireFlow: number;   // L/s at minimum residual pressure
  residualPressure: number;    // m at fire flow
  maximumFireFlow: number;     // L/s at zero residual pressure
  deficiency?: number;         // L/s if requirement not met
}

/**
 * Analyze fire flow capacity at a node
 */
export function analyzeFireFlow(
  network: WaterNetwork,
  nodeId: string,
  requiredFireFlow: number = 30, // L/s (typical requirement)
  minResidualPressure: number = 7, // m (typical during fire)
  solverOptions: Partial<SolverOptions> = {}
): FireFlowResult {
  // Find the junction
  const junction = network.junctions.find(j => j.id === nodeId);
  if (!junction) {
    throw new Error(`Junction ${nodeId} not found`);
  }

  // Binary search for available fire flow
  let lowFlow = 0;
  let highFlow = 500; // L/s max search
  let availableFireFlow = 0;
  let residualPressure = 0;

  // Create modified network with fire flow demand
  const fireNetwork = JSON.parse(JSON.stringify(network)) as WaterNetwork;
  const fireJunction = fireNetwork.junctions.find(j => j.id === nodeId)!;

  for (let iter = 0; iter < 20; iter++) {
    const testFlow = (lowFlow + highFlow) / 2;

    // Add fire flow to junction demand
    fireJunction.baseDemand = junction.baseDemand + testFlow;

    // Solve network
    const result = solveNetwork(fireNetwork, solverOptions);
    const nodeResult = result.nodeResults.get(nodeId);

    if (nodeResult) {
      residualPressure = nodeResult.pressure;

      if (residualPressure >= minResidualPressure) {
        availableFireFlow = testFlow;
        lowFlow = testFlow;
      } else {
        highFlow = testFlow;
      }
    }

    if (highFlow - lowFlow < 1) break;
  }

  // Find maximum fire flow (at zero pressure)
  fireJunction.baseDemand = junction.baseDemand + 500;
  const maxResult = solveNetwork(fireNetwork, solverOptions);
  const maxNodeResult = maxResult.nodeResults.get(nodeId);

  let maximumFireFlow = 500;
  if (maxNodeResult && maxNodeResult.pressure < 0) {
    // Binary search for zero pressure flow
    lowFlow = 0;
    highFlow = 500;
    for (let iter = 0; iter < 20; iter++) {
      const testFlow = (lowFlow + highFlow) / 2;
      fireJunction.baseDemand = junction.baseDemand + testFlow;
      const result = solveNetwork(fireNetwork, solverOptions);
      const nodeResult = result.nodeResults.get(nodeId);

      if (nodeResult && nodeResult.pressure > 0) {
        lowFlow = testFlow;
      } else {
        highFlow = testFlow;
        maximumFireFlow = testFlow;
      }

      if (highFlow - lowFlow < 1) break;
    }
  }

  return {
    nodeId,
    availableFireFlow,
    residualPressure,
    maximumFireFlow,
    deficiency: availableFireFlow < requiredFireFlow ? requiredFireFlow - availableFireFlow : undefined,
  };
}

// ============================================================================
// Format Functions
// ============================================================================

export function formatSolverResult(result: SolverResult): string {
  const lines = [
    `Hydraulic Analysis Results`,
    `========================================`,
    `Converged: ${result.converged ? 'Yes' : 'No'}`,
    `Iterations: ${result.iterations}`,
    `Head Error: ${result.maxHeadError.toFixed(4)} m`,
    `Flow Error: ${result.maxFlowError.toFixed(4)} L/s`,
    ``,
    `System Summary:`,
    `  Total Demand: ${result.totalDemand.toFixed(2)} L/s`,
    `  Total Supply: ${result.totalSupply.toFixed(2)} L/s`,
    `  Total Head Loss: ${result.totalHeadLoss.toFixed(2)} m`,
    `  Total Pump Power: ${result.totalPumpPower.toFixed(2)} kW`,
  ];

  if (result.warnings.length > 0) {
    lines.push(``, `Warnings:`);
    for (const warning of result.warnings) {
      lines.push(`  ⚠ ${warning}`);
    }
  }

  return lines.join('\n');
}

export function formatSimulationSummary(result: SimulationResult): string {
  const { summary } = result;

  return [
    `Extended Period Simulation Summary`,
    `========================================`,
    `Duration: ${result.network.options.duration} hours`,
    `Time Steps: ${result.timeSteps.length}`,
    ``,
    `Pressure Extremes:`,
    `  Maximum: ${summary.maxPressure.value.toFixed(1)} m at ${summary.maxPressure.nodeId} (t=${summary.maxPressure.time}h)`,
    `  Minimum: ${summary.minPressure.value.toFixed(1)} m at ${summary.minPressure.nodeId} (t=${summary.minPressure.time}h)`,
    ``,
    `Velocity/Head Loss:`,
    `  Max Velocity: ${summary.maxVelocity.value.toFixed(2)} m/s in ${summary.maxVelocity.linkId}`,
    `  Max Head Loss: ${summary.maxHeadLoss.value.toFixed(2)} m in ${summary.maxHeadLoss.linkId}`,
    ``,
    `Energy:`,
    `  Total Energy Used: ${summary.totalEnergyUsed.toFixed(1)} kWh`,
    `  Total Energy Cost: $${summary.totalEnergyCost.toFixed(2)}`,
  ].join('\n');
}
