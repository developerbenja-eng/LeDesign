/**
 * Pump Station Design Module
 *
 * Complete toolkit for sewer pump station design based on:
 * - Hydraulic Institute Standards (HI)
 * - ASCE/WEF Manual of Practice FD-4
 * - Chilean SISS standards
 * - NCh 1105, NCh 2472 requirements
 *
 * Features:
 * - Wet well sizing using cycle time optimization
 * - System head curve calculation
 * - Pump selection and operating point analysis
 * - NPSH verification
 * - Multiple pump configurations (duty/standby)
 * - Variable frequency drive (VFD) analysis
 * - Power and energy calculations
 */

// ============================================================================
// Types
// ============================================================================

export type PumpType = 'submersible' | 'dry_pit' | 'vertical_turbine' | 'horizontal';
export type PumpConfiguration = 'single' | 'duty_standby' | 'duty_duty_standby' | 'multiple';
export type ControlType = 'level' | 'pressure' | 'flow' | 'vfd';

export interface FlowPattern {
  averageFlow: number;      // L/s
  peakFlow: number;         // L/s
  minimumFlow: number;      // L/s
  peakingFactor: number;    // Peak/Average ratio
  diurnalPattern?: number[]; // 24-hour flow factors (hourly)
}

export interface StaticHeadConditions {
  wetWellBottom: number;    // Elevation (m)
  lowWaterLevel: number;    // Minimum operating level (m)
  highWaterLevel: number;   // Maximum operating level (m)
  dischargePoint: number;   // Discharge elevation (m)
  freeDischarge: boolean;   // True if discharging to open channel
}

export interface ForcemainProperties {
  length: number;           // m
  diameter: number;         // mm (internal)
  material: 'hdpe' | 'pvc' | 'ductile_iron' | 'steel';
  roughness?: number;       // Hazen-Williams C or Darcy-Weisbach ε
}

export interface MinorLoss {
  type: string;
  count: number;
  kFactor: number;
}

export interface SystemCurveInput {
  staticHead: StaticHeadConditions;
  forcemain: ForcemainProperties;
  minorLosses: MinorLoss[];
}

export interface SystemCurvePoint {
  flow: number;             // L/s
  head: number;             // m
  staticHead: number;       // m
  frictionLoss: number;     // m
  minorLoss: number;        // m
  velocity: number;         // m/s in forcemain
}

export interface PumpCurve {
  manufacturer?: string;
  model?: string;
  impellerDiameter: number; // mm
  speed: number;            // RPM
  points: Array<{
    flow: number;           // L/s
    head: number;           // m
    efficiency?: number;    // %
    power?: number;         // kW
    npshRequired?: number;  // m
  }>;
}

export interface PumpSelection {
  pump: PumpCurve;
  operatingPoint: {
    flow: number;           // L/s
    head: number;           // m
    efficiency: number;     // %
    power: number;          // kW
  };
  npshAvailable: number;    // m
  npshRequired: number;     // m
  npshMargin: number;       // m (safety margin)
  isWithinRange: boolean;
  warnings: string[];
}

export interface WetWellDesign {
  volume: number;           // m³
  activeVolume: number;     // m³ (between levels)
  diameter: number;         // m (or width for rectangular)
  depth: number;            // m
  shape: 'circular' | 'rectangular';
  dimensions: {
    width?: number;
    length?: number;
    diameter?: number;
  };
  cycleTime: number;        // minutes
  retentionTime: number;    // minutes at average flow
  startsPerhour: number;    // pump cycles/hour
  recommendations: string[];
}

export interface PumpStationDesign {
  wetWell: WetWellDesign;
  systemCurve: SystemCurvePoint[];
  pumpSelection: PumpSelection;
  configuration: PumpConfiguration;
  numberOfPumps: number;
  firmCapacity: number;     // L/s (with largest pump out)
  totalCapacity: number;    // L/s (all pumps running)
  power: {
    installedPower: number;     // kW
    operatingPower: number;     // kW (at design point)
    annualEnergy: number;       // kWh/year
    specificEnergy: number;     // kWh/m³
  };
  controls: {
    lowLevel: number;       // Pump off elevation
    leadOn: number;         // First pump on
    lagOn: number;          // Second pump on
    highLevel: number;      // Alarm level
    emergencyOverflow: number;
  };
  costs: {
    pumps: number;
    wetWell: number;
    electrical: number;
    controls: number;
    building: number;
    total: number;
    annualOperating: number;
  };
  recommendations: string[];
}

// ============================================================================
// Constants
// ============================================================================

const GRAVITY = 9.81;  // m/s²
const WATER_DENSITY = 1000;  // kg/m³

/**
 * Hazen-Williams C coefficients by pipe material
 */
export const HAZEN_WILLIAMS_C: Record<ForcemainProperties['material'], number> = {
  hdpe: 150,
  pvc: 150,
  ductile_iron: 130,
  steel: 120,
};

/**
 * Standard minor loss K factors
 */
export const MINOR_LOSS_K: Record<string, number> = {
  'entrance_bellmouth': 0.05,
  'entrance_square': 0.5,
  'entrance_projecting': 0.8,
  'exit_submerged': 1.0,
  'exit_free': 1.0,
  'elbow_90_short': 0.9,
  'elbow_90_long': 0.6,
  'elbow_45': 0.4,
  'tee_through': 0.3,
  'tee_branch': 1.0,
  'check_valve_swing': 2.5,
  'check_valve_ball': 4.5,
  'gate_valve_full': 0.2,
  'gate_valve_half': 5.6,
  'butterfly_valve': 0.3,
  'reducer': 0.25,
  'increaser': 0.25,
  'air_valve': 0.5,
};

/**
 * Pump station design criteria (Chilean SISS standards)
 */
export const DESIGN_CRITERIA = {
  minCycleTime: 6,           // minutes (max 10 starts/hour)
  maxCycleTime: 30,          // minutes (freshness)
  minRetentionTime: 10,      // minutes
  maxRetentionTime: 30,      // minutes (prevent septicity)
  minNpshMargin: 1.5,        // m (safety factor)
  minEfficiency: 60,         // %
  maxVelocityForcemain: 3.0, // m/s
  minVelocityForcemain: 0.6, // m/s (prevent settling)
  motorEfficiency: 0.92,     // typical motor efficiency
  vfdEfficiency: 0.97,       // VFD efficiency
};

/**
 * Unit costs for estimation (CLP/unit, 2024 approximate)
 */
export const UNIT_COSTS = {
  pumpPerKw: 500000,         // CLP per installed kW
  wetWellPerM3: 800000,      // CLP per m³ wet well volume
  electricalPerKw: 200000,   // CLP per kW (MCC, cables, etc.)
  controlsBase: 15000000,    // CLP base for control system
  buildingPerM2: 600000,     // CLP per m² dry pit building
  electricityCostKwh: 150,   // CLP per kWh
};

// ============================================================================
// System Head Curve Functions
// ============================================================================

/**
 * Calculate friction head loss using Hazen-Williams equation
 * hf = 10.67 × L × Q^1.852 / (C^1.852 × D^4.87)
 */
export function calculateFrictionLoss(
  flow: number,              // L/s
  forcemain: ForcemainProperties
): number {
  const L = forcemain.length;
  const D = forcemain.diameter / 1000;  // Convert to m
  const C = forcemain.roughness || HAZEN_WILLIAMS_C[forcemain.material];
  const Q = flow / 1000;  // Convert to m³/s

  // Hazen-Williams formula
  const hf = 10.67 * L * Math.pow(Q, 1.852) / (Math.pow(C, 1.852) * Math.pow(D, 4.87));

  return hf;
}

/**
 * Calculate velocity in forcemain
 */
export function calculateForcemainVelocity(
  flow: number,              // L/s
  diameter: number           // mm
): number {
  const D = diameter / 1000;
  const Q = flow / 1000;
  const A = Math.PI * D * D / 4;
  return Q / A;
}

/**
 * Calculate minor losses
 * hm = Σ(K × V²/2g)
 */
export function calculateMinorLosses(
  flow: number,              // L/s
  diameter: number,          // mm
  losses: MinorLoss[]
): number {
  const V = calculateForcemainVelocity(flow, diameter);
  const velocityHead = V * V / (2 * GRAVITY);

  let totalK = 0;
  for (const loss of losses) {
    totalK += loss.kFactor * loss.count;
  }

  return totalK * velocityHead;
}

/**
 * Calculate total static head
 */
export function calculateStaticHead(
  staticHead: StaticHeadConditions,
  wetWellLevel: 'low' | 'high' | 'average' = 'low'
): number {
  let pumpLevel: number;

  switch (wetWellLevel) {
    case 'low':
      pumpLevel = staticHead.lowWaterLevel;
      break;
    case 'high':
      pumpLevel = staticHead.highWaterLevel;
      break;
    case 'average':
      pumpLevel = (staticHead.lowWaterLevel + staticHead.highWaterLevel) / 2;
      break;
  }

  return staticHead.dischargePoint - pumpLevel;
}

/**
 * Generate system head curve
 */
export function generateSystemCurve(
  input: SystemCurveInput,
  flowRange: { min: number; max: number; step: number }
): SystemCurvePoint[] {
  const points: SystemCurvePoint[] = [];

  for (let flow = flowRange.min; flow <= flowRange.max; flow += flowRange.step) {
    const staticH = calculateStaticHead(input.staticHead, 'low');
    const frictionH = calculateFrictionLoss(flow, input.forcemain);
    const minorH = calculateMinorLosses(flow, input.forcemain.diameter, input.minorLosses);
    const velocity = calculateForcemainVelocity(flow, input.forcemain.diameter);

    points.push({
      flow,
      head: staticH + frictionH + minorH,
      staticHead: staticH,
      frictionLoss: frictionH,
      minorLoss: minorH,
      velocity,
    });
  }

  return points;
}

// ============================================================================
// Wet Well Design Functions
// ============================================================================

/**
 * Calculate minimum wet well volume for cycle time constraint
 * V = Q × T / 4 (for pump cycling between on/off levels)
 * T = 4V / Q (cycle time)
 */
export function calculateMinimumWetWellVolume(
  pumpCapacity: number,     // L/s
  inflowRate: number,       // L/s
  minCycleTime: number = DESIGN_CRITERIA.minCycleTime  // minutes
): number {
  // For a single pump system:
  // Filling time: tf = V / Qi
  // Emptying time: te = V / (Qp - Qi)
  // Total cycle time: T = tf + te = V × Qp / (Qi × (Qp - Qi))

  // Minimum volume for cycle time at critical inflow (Qi = Qp/2)
  // V = Qp × T / 4

  const Qp = pumpCapacity / 1000;  // m³/s
  const T = minCycleTime * 60;      // seconds

  return Qp * T / 4;  // m³
}

/**
 * Design wet well based on flow pattern and pump configuration
 */
export function designWetWell(
  flowPattern: FlowPattern,
  pumpCapacity: number,     // L/s (single pump)
  numberOfPumps: number = 2,
  shape: 'circular' | 'rectangular' = 'circular'
): WetWellDesign {
  const recommendations: string[] = [];

  // Calculate required active volume
  const Qi = flowPattern.averageFlow / 1000;  // m³/s
  const Qp = pumpCapacity / 1000;             // m³/s

  // Volume for cycle time
  const minVolume = calculateMinimumWetWellVolume(
    pumpCapacity,
    flowPattern.averageFlow,
    DESIGN_CRITERIA.minCycleTime
  );

  // Volume for retention time (prevent septicity)
  const retentionVolume = Qi * DESIGN_CRITERIA.maxRetentionTime * 60;

  // Active volume (between pump on and off levels)
  let activeVolume = Math.max(minVolume, retentionVolume * 0.5);

  // Total volume includes freeboard and sump
  const totalVolume = activeVolume * 1.5;

  // Calculate cycle time
  const fillTime = activeVolume / Qi;
  const emptyTime = Qp > Qi ? activeVolume / (Qp - Qi) : Infinity;
  const cycleTime = (fillTime + emptyTime) / 60;  // minutes

  // Starts per hour
  const startsPerHour = 60 / cycleTime;

  // Retention time
  const retentionTime = totalVolume / (Qi * 60);

  // Determine dimensions
  let diameter = 0;
  let depth = 0;
  let width = 0;
  let length = 0;

  if (shape === 'circular') {
    // Typical depth-to-diameter ratio: 1.5 - 2.5
    const depthRatio = 2.0;
    diameter = Math.pow(totalVolume / (Math.PI / 4 * depthRatio), 1 / 3);
    depth = diameter * depthRatio;

    // Round to standard sizes
    diameter = Math.ceil(diameter * 2) / 2;  // Round to nearest 0.5m
    depth = totalVolume / (Math.PI * diameter * diameter / 4);
  } else {
    // Rectangular: width:length ratio = 1:2
    const aspectRatio = 2.0;
    const depthRatio = 1.5;
    width = Math.pow(totalVolume / (aspectRatio * depthRatio), 1 / 3);
    length = width * aspectRatio;
    depth = totalVolume / (width * length);

    // Round to 0.5m increments
    width = Math.ceil(width * 2) / 2;
    length = Math.ceil(length * 2) / 2;
    depth = totalVolume / (width * length);
  }

  // Recommendations
  if (cycleTime < DESIGN_CRITERIA.minCycleTime) {
    recommendations.push(`Cycle time ${cycleTime.toFixed(1)} min < ${DESIGN_CRITERIA.minCycleTime} min - increase volume`);
  }
  if (startsPerHour > 10) {
    recommendations.push(`Pump starts ${startsPerHour.toFixed(1)}/hour > 10 - may reduce pump life`);
  }
  if (retentionTime > DESIGN_CRITERIA.maxRetentionTime) {
    recommendations.push(`Retention time ${retentionTime.toFixed(0)} min > ${DESIGN_CRITERIA.maxRetentionTime} min - risk of septicity`);
  }
  if (depth > 8) {
    recommendations.push('Depth > 8m - consider submersible pump access and maintenance');
  }
  if (numberOfPumps >= 2) {
    recommendations.push('Duty-standby configuration provides redundancy');
  }

  return {
    volume: totalVolume,
    activeVolume,
    diameter: shape === 'circular' ? diameter : 0,
    depth,
    shape,
    dimensions: shape === 'circular'
      ? { diameter }
      : { width, length },
    cycleTime,
    retentionTime,
    startsPerhour: startsPerHour,
    recommendations,
  };
}

// ============================================================================
// Pump Selection Functions
// ============================================================================

/**
 * Generate a typical pump curve based on parameters
 * Used when specific manufacturer data isn't available
 */
export function generateTypicalPumpCurve(
  designFlow: number,       // L/s
  designHead: number,       // m
  shutoffHead?: number      // m (typically 1.2-1.3 × design head)
): PumpCurve {
  const Qd = designFlow;
  const Hd = designHead;
  const H0 = shutoffHead || Hd * 1.25;

  // Generate curve points using parabolic approximation
  // H = H0 - k × Q²
  const k = (H0 - Hd) / (Qd * Qd);

  const points: PumpCurve['points'] = [];
  const maxFlow = Qd * 1.3;

  for (let Q = 0; Q <= maxFlow; Q += maxFlow / 10) {
    const H = H0 - k * Q * Q;
    if (H < 0) break;

    // Efficiency curve (typical shape with peak at BEP)
    const flowRatio = Q / Qd;
    const efficiency = 80 * (1 - Math.pow(flowRatio - 1, 2) * 0.5);

    // Power = ρgQH / (η × 1000)
    const power = Q > 0
      ? WATER_DENSITY * GRAVITY * (Q / 1000) * H / (efficiency / 100 * 1000)
      : 0;

    // NPSH required (increases with flow)
    const npshRequired = 2 + 3 * Math.pow(flowRatio, 2);

    points.push({
      flow: Q,
      head: Math.max(0, H),
      efficiency: Math.max(0, efficiency),
      power,
      npshRequired,
    });
  }

  return {
    impellerDiameter: 250,  // Typical
    speed: 1750,            // Typical 4-pole motor at 60Hz
    points,
  };
}

/**
 * Find operating point (intersection of system and pump curves)
 */
export function findOperatingPoint(
  systemCurve: SystemCurvePoint[],
  pumpCurve: PumpCurve
): { flow: number; head: number } | null {
  // Find intersection by comparing pump head vs system head
  for (let i = 0; i < pumpCurve.points.length - 1; i++) {
    const p1 = pumpCurve.points[i];
    const p2 = pumpCurve.points[i + 1];

    // Find system head at each pump flow
    const sys1 = interpolateSystemHead(systemCurve, p1.flow);
    const sys2 = interpolateSystemHead(systemCurve, p2.flow);

    if (sys1 === null || sys2 === null) continue;

    // Check if intersection exists in this interval
    const diff1 = p1.head - sys1;
    const diff2 = p2.head - sys2;

    if (diff1 >= 0 && diff2 <= 0) {
      // Linear interpolation to find intersection
      const t = diff1 / (diff1 - diff2);
      const flow = p1.flow + t * (p2.flow - p1.flow);
      const head = p1.head + t * (p2.head - p1.head);

      return { flow, head };
    }
  }

  return null;
}

/**
 * Interpolate system head at given flow
 */
function interpolateSystemHead(
  systemCurve: SystemCurvePoint[],
  flow: number
): number | null {
  if (flow < systemCurve[0].flow || flow > systemCurve[systemCurve.length - 1].flow) {
    return null;
  }

  for (let i = 0; i < systemCurve.length - 1; i++) {
    if (flow >= systemCurve[i].flow && flow <= systemCurve[i + 1].flow) {
      const t = (flow - systemCurve[i].flow) / (systemCurve[i + 1].flow - systemCurve[i].flow);
      return systemCurve[i].head + t * (systemCurve[i + 1].head - systemCurve[i].head);
    }
  }

  return null;
}

/**
 * Interpolate pump parameters at given flow
 */
function interpolatePumpParameters(
  pumpCurve: PumpCurve,
  flow: number
): { head: number; efficiency: number; power: number; npshRequired: number } | null {
  const points = pumpCurve.points;

  if (flow < points[0].flow || flow > points[points.length - 1].flow) {
    return null;
  }

  for (let i = 0; i < points.length - 1; i++) {
    if (flow >= points[i].flow && flow <= points[i + 1].flow) {
      const t = (flow - points[i].flow) / (points[i + 1].flow - points[i].flow);
      return {
        head: points[i].head + t * ((points[i + 1].head || 0) - points[i].head),
        efficiency: (points[i].efficiency || 0) + t * ((points[i + 1].efficiency || 0) - (points[i].efficiency || 0)),
        power: (points[i].power || 0) + t * ((points[i + 1].power || 0) - (points[i].power || 0)),
        npshRequired: (points[i].npshRequired || 0) + t * ((points[i + 1].npshRequired || 0) - (points[i].npshRequired || 0)),
      };
    }
  }

  return null;
}

/**
 * Calculate NPSH available
 * NPSHa = Patm/γ + Zs - hf - Pvp/γ
 */
export function calculateNPSHAvailable(
  staticHead: StaticHeadConditions,
  frictionLossToSuction: number = 0.5,
  elevation: number = 0,            // Site elevation above sea level (m)
  waterTemperature: number = 20     // °C
): number {
  // Atmospheric pressure (adjusted for elevation)
  const Patm = 101325 * Math.exp(-elevation / 8500);  // Pa
  const Hatm = Patm / (WATER_DENSITY * GRAVITY);       // m

  // Vapor pressure (approximate)
  const Pvp = 2339 * Math.pow(waterTemperature / 100, 4);  // Pa (rough approximation)
  const Hvp = Pvp / (WATER_DENSITY * GRAVITY);              // m

  // Suction head (positive if pump below water level)
  const Zs = staticHead.lowWaterLevel - staticHead.wetWellBottom;

  return Hatm + Zs - frictionLossToSuction - Hvp;
}

/**
 * Select and analyze pump performance
 */
export function selectPump(
  systemCurve: SystemCurvePoint[],
  pumpCurve: PumpCurve,
  npshAvailable: number
): PumpSelection {
  const warnings: string[] = [];

  // Find operating point
  const opPoint = findOperatingPoint(systemCurve, pumpCurve);

  if (!opPoint) {
    return {
      pump: pumpCurve,
      operatingPoint: { flow: 0, head: 0, efficiency: 0, power: 0 },
      npshAvailable,
      npshRequired: 0,
      npshMargin: 0,
      isWithinRange: false,
      warnings: ['No operating point found - pump curve does not intersect system curve'],
    };
  }

  // Get pump parameters at operating point
  const params = interpolatePumpParameters(pumpCurve, opPoint.flow);

  if (!params) {
    return {
      pump: pumpCurve,
      operatingPoint: { flow: opPoint.flow, head: opPoint.head, efficiency: 0, power: 0 },
      npshAvailable,
      npshRequired: 0,
      npshMargin: 0,
      isWithinRange: false,
      warnings: ['Could not interpolate pump parameters'],
    };
  }

  // NPSH check
  const npshMargin = npshAvailable - params.npshRequired;

  if (npshMargin < DESIGN_CRITERIA.minNpshMargin) {
    warnings.push(`NPSH margin ${npshMargin.toFixed(1)} m < ${DESIGN_CRITERIA.minNpshMargin} m - cavitation risk`);
  }

  // Efficiency check
  if (params.efficiency < DESIGN_CRITERIA.minEfficiency) {
    warnings.push(`Efficiency ${params.efficiency.toFixed(0)}% < ${DESIGN_CRITERIA.minEfficiency}% - consider different pump`);
  }

  // Operating range check (typically 70-120% of BEP flow)
  const bepFlow = pumpCurve.points.reduce((max, p) =>
    (p.efficiency || 0) > (max.efficiency || 0) ? p : max
  ).flow;

  const flowRatio = opPoint.flow / bepFlow;
  const isWithinRange = flowRatio >= 0.7 && flowRatio <= 1.2;

  if (!isWithinRange) {
    warnings.push(`Operating at ${(flowRatio * 100).toFixed(0)}% of BEP - outside preferred range (70-120%)`);
  }

  // Velocity check
  const velocity = systemCurve.find(p => Math.abs(p.flow - opPoint.flow) < 1)?.velocity || 0;
  if (velocity > DESIGN_CRITERIA.maxVelocityForcemain) {
    warnings.push(`Forcemain velocity ${velocity.toFixed(1)} m/s > ${DESIGN_CRITERIA.maxVelocityForcemain} m/s - increase diameter`);
  }
  if (velocity < DESIGN_CRITERIA.minVelocityForcemain) {
    warnings.push(`Forcemain velocity ${velocity.toFixed(1)} m/s < ${DESIGN_CRITERIA.minVelocityForcemain} m/s - risk of settling`);
  }

  return {
    pump: pumpCurve,
    operatingPoint: {
      flow: opPoint.flow,
      head: opPoint.head,
      efficiency: params.efficiency,
      power: params.power,
    },
    npshAvailable,
    npshRequired: params.npshRequired,
    npshMargin,
    isWithinRange,
    warnings,
  };
}

// ============================================================================
// Power and Energy Functions
// ============================================================================

/**
 * Calculate pump power
 * P = ρgQH / (ηp × ηm)
 */
export function calculatePumpPower(
  flow: number,              // L/s
  head: number,              // m
  efficiency: number,        // % (pump efficiency)
  motorEfficiency: number = DESIGN_CRITERIA.motorEfficiency
): {
  hydraulicPower: number;    // kW
  shaftPower: number;        // kW
  motorPower: number;        // kW (input power)
  installedPower: number;    // kW (motor nameplate)
} {
  const Q = flow / 1000;  // m³/s
  const ηp = efficiency / 100;
  const ηm = motorEfficiency;

  // Hydraulic power
  const Phydraulic = WATER_DENSITY * GRAVITY * Q * head / 1000;  // kW

  // Shaft power (pump input)
  const Pshaft = Phydraulic / ηp;

  // Motor input power
  const Pmotor = Pshaft / ηm;

  // Installed motor (next standard size, typically 115-125% of calculated)
  const standardSizes = [0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160];
  const Pinstalled = standardSizes.find(p => p >= Pmotor * 1.15) || Pmotor * 1.25;

  return {
    hydraulicPower: Phydraulic,
    shaftPower: Pshaft,
    motorPower: Pmotor,
    installedPower: Pinstalled,
  };
}

/**
 * Calculate annual energy consumption
 */
export function calculateAnnualEnergy(
  flowPattern: FlowPattern,
  pumpCapacity: number,      // L/s
  pumpHead: number,          // m
  pumpEfficiency: number,    // %
  motorEfficiency: number = DESIGN_CRITERIA.motorEfficiency
): {
  annualEnergy: number;      // kWh/year
  annualVolume: number;      // m³/year
  specificEnergy: number;    // kWh/m³
  hoursPerDay: number;       // Operating hours
  operatingFactor: number;   // Fraction of time running
} {
  // Daily volume
  const dailyVolume = flowPattern.averageFlow * 3600 * 24 / 1000;  // m³/day
  const annualVolume = dailyVolume * 365;  // m³/year

  // Pump runtime
  const pumpCapacityM3s = pumpCapacity / 1000;
  const operatingFactor = flowPattern.averageFlow / pumpCapacity;
  const hoursPerDay = 24 * operatingFactor;

  // Power at operating point
  const power = calculatePumpPower(pumpCapacity, pumpHead, pumpEfficiency, motorEfficiency);

  // Annual energy
  const annualEnergy = power.motorPower * hoursPerDay * 365;  // kWh/year

  // Specific energy
  const specificEnergy = annualEnergy / annualVolume;

  return {
    annualEnergy,
    annualVolume,
    specificEnergy,
    hoursPerDay,
    operatingFactor,
  };
}

// ============================================================================
// Complete Design Function
// ============================================================================

/**
 * Design complete pump station
 */
export function designPumpStation(
  flowPattern: FlowPattern,
  systemInput: SystemCurveInput,
  options: {
    configuration?: PumpConfiguration;
    pumpType?: PumpType;
    numberOfPumps?: number;
    wetWellShape?: 'circular' | 'rectangular';
    siteElevation?: number;
    waterTemperature?: number;
  } = {}
): PumpStationDesign {
  const recommendations: string[] = [];

  // Default options
  const config = options.configuration || 'duty_standby';
  const numberOfPumps = options.numberOfPumps || (config === 'duty_standby' ? 2 : 3);
  const shape = options.wetWellShape || 'circular';
  const siteElevation = options.siteElevation || 0;
  const waterTemp = options.waterTemperature || 20;

  // Design pump capacity (each pump handles peak flow for redundancy)
  const pumpCapacity = flowPattern.peakFlow;

  // Generate system curve
  const systemCurve = generateSystemCurve(systemInput, {
    min: 0,
    max: pumpCapacity * 1.5,
    step: pumpCapacity / 20,
  });

  // Calculate design head
  const designHead = systemCurve.find(p => Math.abs(p.flow - pumpCapacity) < 1)?.head ||
                     calculateStaticHead(systemInput.staticHead) + 5;

  // Generate typical pump curve
  const pumpCurve = generateTypicalPumpCurve(pumpCapacity, designHead);

  // Calculate NPSH available
  const npshAvailable = calculateNPSHAvailable(
    systemInput.staticHead,
    0.5,
    siteElevation,
    waterTemp
  );

  // Select pump
  const pumpSelection = selectPump(systemCurve, pumpCurve, npshAvailable);

  // Design wet well
  const wetWell = designWetWell(flowPattern, pumpCapacity, numberOfPumps, shape);

  // Calculate capacities
  const firmCapacity = pumpCapacity;  // With one pump down
  const totalCapacity = numberOfPumps > 2 ? pumpCapacity * 2 : pumpCapacity;

  // Power calculations
  const power = calculatePumpPower(
    pumpSelection.operatingPoint.flow,
    pumpSelection.operatingPoint.head,
    pumpSelection.operatingPoint.efficiency
  );

  const energy = calculateAnnualEnergy(
    flowPattern,
    pumpSelection.operatingPoint.flow,
    pumpSelection.operatingPoint.head,
    pumpSelection.operatingPoint.efficiency
  );

  // Control levels
  const levelRange = systemInput.staticHead.highWaterLevel - systemInput.staticHead.lowWaterLevel;
  const controls = {
    lowLevel: systemInput.staticHead.lowWaterLevel,
    leadOn: systemInput.staticHead.lowWaterLevel + levelRange * 0.2,
    lagOn: systemInput.staticHead.lowWaterLevel + levelRange * 0.6,
    highLevel: systemInput.staticHead.highWaterLevel,
    emergencyOverflow: systemInput.staticHead.highWaterLevel + 0.3,
  };

  // Cost estimation
  const costs = {
    pumps: power.installedPower * numberOfPumps * UNIT_COSTS.pumpPerKw,
    wetWell: wetWell.volume * UNIT_COSTS.wetWellPerM3,
    electrical: power.installedPower * numberOfPumps * UNIT_COSTS.electricalPerKw,
    controls: UNIT_COSTS.controlsBase,
    building: options.pumpType === 'dry_pit' ? 20 * UNIT_COSTS.buildingPerM2 : 0,
    total: 0,
    annualOperating: energy.annualEnergy * UNIT_COSTS.electricityCostKwh,
  };
  costs.total = costs.pumps + costs.wetWell + costs.electrical + costs.controls + costs.building;

  // Recommendations
  recommendations.push(...pumpSelection.warnings);
  recommendations.push(...wetWell.recommendations);

  if (firmCapacity < flowPattern.peakFlow) {
    recommendations.push('Firm capacity less than peak flow - consider additional pumps');
  }
  if (energy.specificEnergy > 0.5) {
    recommendations.push(`Specific energy ${energy.specificEnergy.toFixed(2)} kWh/m³ is high - consider VFD`);
  }
  if (options.pumpType === 'submersible') {
    recommendations.push('Submersible pumps recommended for smaller stations');
  }

  return {
    wetWell,
    systemCurve,
    pumpSelection,
    configuration: config,
    numberOfPumps,
    firmCapacity,
    totalCapacity,
    power: {
      installedPower: power.installedPower * numberOfPumps,
      operatingPower: power.motorPower,
      annualEnergy: energy.annualEnergy,
      specificEnergy: energy.specificEnergy,
    },
    controls,
    costs,
    recommendations,
  };
}

// ============================================================================
// VFD (Variable Frequency Drive) Analysis
// ============================================================================

/**
 * Analyze VFD operation for energy savings
 */
export function analyzeVFD(
  flowPattern: FlowPattern,
  pumpCurve: PumpCurve,
  systemCurve: SystemCurvePoint[]
): {
  savingsPercent: number;
  paybackYears: number;
  annualEnergySavings: number;  // kWh
  annualCostSavings: number;    // CLP
  recommendations: string[];
} {
  const recommendations: string[] = [];

  // Find operating points at different flows
  const flows = [
    flowPattern.minimumFlow,
    flowPattern.averageFlow,
    flowPattern.peakFlow,
  ];

  let constantSpeedEnergy = 0;
  let vfdEnergy = 0;

  // Assume 8 hours at min, 12 hours at average, 4 hours at peak
  const durations = [8, 12, 4];  // hours

  for (let i = 0; i < flows.length; i++) {
    const flow = flows[i];
    const duration = durations[i];

    // Constant speed: pump cycles on/off
    const cyclingFactor = flow / flowPattern.peakFlow;
    const constantPower = calculatePumpPower(
      flowPattern.peakFlow,
      systemCurve.find(p => p.flow >= flowPattern.peakFlow)?.head || 10,
      70
    ).motorPower;
    constantSpeedEnergy += constantPower * cyclingFactor * duration;

    // VFD: pump speed varies (affinity laws)
    // P2/P1 = (Q2/Q1)³
    const speedRatio = flow / flowPattern.peakFlow;
    const vfdPowerRatio = Math.pow(speedRatio, 3);
    const vfdPower = constantPower * vfdPowerRatio / DESIGN_CRITERIA.vfdEfficiency;
    vfdEnergy += vfdPower * duration;
  }

  // Annual projections
  const annualConstant = constantSpeedEnergy * 365;
  const annualVFD = vfdEnergy * 365;
  const annualEnergySavings = annualConstant - annualVFD;
  const savingsPercent = annualEnergySavings / annualConstant * 100;

  const annualCostSavings = annualEnergySavings * UNIT_COSTS.electricityCostKwh;

  // VFD cost estimate
  const vfdCost = 200000 * (flowPattern.peakFlow / 50);  // Rough estimate
  const paybackYears = annualCostSavings > 0 ? vfdCost / annualCostSavings : Infinity;

  if (savingsPercent > 20) {
    recommendations.push('VFD recommended - significant energy savings potential');
  }
  if (paybackYears < 3) {
    recommendations.push(`VFD payback ${paybackYears.toFixed(1)} years - economically viable`);
  }
  if (flowPattern.peakingFactor > 2) {
    recommendations.push('High peaking factor makes VFD particularly beneficial');
  }

  return {
    savingsPercent,
    paybackYears,
    annualEnergySavings,
    annualCostSavings,
    recommendations,
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format pump station design result
 */
export function formatPumpStationDesign(design: PumpStationDesign): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '         DISEÑO DE ESTACIÓN DE BOMBEO',
    '═══════════════════════════════════════════════════════',
    '',
    '--- CÁMARA HÚMEDA ---',
    `  Volumen total: ${design.wetWell.volume.toFixed(1)} m³`,
    `  Volumen activo: ${design.wetWell.activeVolume.toFixed(1)} m³`,
    `  Forma: ${design.wetWell.shape === 'circular' ? 'Circular' : 'Rectangular'}`,
  ];

  if (design.wetWell.shape === 'circular') {
    lines.push(`  Diámetro: ${design.wetWell.dimensions.diameter?.toFixed(1)} m`);
  } else {
    lines.push(`  Dimensiones: ${design.wetWell.dimensions.width?.toFixed(1)} × ${design.wetWell.dimensions.length?.toFixed(1)} m`);
  }

  lines.push(
    `  Profundidad: ${design.wetWell.depth.toFixed(1)} m`,
    `  Tiempo de ciclo: ${design.wetWell.cycleTime.toFixed(1)} min`,
    `  Arranques/hora: ${design.wetWell.startsPerhour.toFixed(1)}`,
    '',
    '--- CONFIGURACIÓN DE BOMBAS ---',
    `  Número de bombas: ${design.numberOfPumps}`,
    `  Configuración: ${design.configuration}`,
    `  Capacidad firme: ${design.firmCapacity.toFixed(1)} L/s`,
    `  Capacidad total: ${design.totalCapacity.toFixed(1)} L/s`,
    '',
    '--- PUNTO DE OPERACIÓN ---',
    `  Caudal: ${design.pumpSelection.operatingPoint.flow.toFixed(1)} L/s`,
    `  Altura: ${design.pumpSelection.operatingPoint.head.toFixed(1)} m`,
    `  Eficiencia: ${design.pumpSelection.operatingPoint.efficiency.toFixed(0)}%`,
    '',
    '--- NPSH ---',
    `  NPSH disponible: ${design.pumpSelection.npshAvailable.toFixed(1)} m`,
    `  NPSH requerido: ${design.pumpSelection.npshRequired.toFixed(1)} m`,
    `  Margen: ${design.pumpSelection.npshMargin.toFixed(1)} m`,
    '',
    '--- POTENCIA Y ENERGÍA ---',
    `  Potencia instalada: ${design.power.installedPower.toFixed(1)} kW`,
    `  Potencia operación: ${design.power.operatingPower.toFixed(1)} kW`,
    `  Energía anual: ${(design.power.annualEnergy / 1000).toFixed(0)} MWh/año`,
    `  Energía específica: ${design.power.specificEnergy.toFixed(2)} kWh/m³`,
    '',
    '--- NIVELES DE CONTROL ---',
    `  Apagado: ${design.controls.lowLevel.toFixed(2)} m`,
    `  Encendido bomba 1: ${design.controls.leadOn.toFixed(2)} m`,
    `  Encendido bomba 2: ${design.controls.lagOn.toFixed(2)} m`,
    `  Alarma alto: ${design.controls.highLevel.toFixed(2)} m`,
    `  Rebalse emergencia: ${design.controls.emergencyOverflow.toFixed(2)} m`,
    '',
    '--- COSTOS ESTIMADOS ---',
    `  Bombas: $${(design.costs.pumps / 1e6).toFixed(1)} M CLP`,
    `  Cámara húmeda: $${(design.costs.wetWell / 1e6).toFixed(1)} M CLP`,
    `  Eléctrico: $${(design.costs.electrical / 1e6).toFixed(1)} M CLP`,
    `  Controles: $${(design.costs.controls / 1e6).toFixed(1)} M CLP`,
    `  TOTAL: $${(design.costs.total / 1e6).toFixed(1)} M CLP`,
    `  Operación anual: $${(design.costs.annualOperating / 1e6).toFixed(2)} M CLP/año`,
  );

  if (design.recommendations.length > 0) {
    lines.push('', '--- RECOMENDACIONES ---');
    design.recommendations.forEach(r => lines.push(`  • ${r}`));
  }

  lines.push('═══════════════════════════════════════════════════════');
  return lines.join('\n');
}

/**
 * Format system curve for display
 */
export function formatSystemCurve(curve: SystemCurvePoint[]): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '              CURVA DEL SISTEMA',
    '═══════════════════════════════════════════════════════',
    '',
    '  Caudal    Altura    Estático   Fricción   Menores   Velocidad',
    '   (L/s)      (m)       (m)        (m)        (m)      (m/s)',
    '  ─────────────────────────────────────────────────────────────',
  ];

  for (const point of curve) {
    lines.push(
      `  ${point.flow.toFixed(1).padStart(6)}   ${point.head.toFixed(2).padStart(6)}    ` +
      `${point.staticHead.toFixed(2).padStart(6)}    ${point.frictionLoss.toFixed(2).padStart(6)}    ` +
      `${point.minorLoss.toFixed(2).padStart(6)}    ${point.velocity.toFixed(2).padStart(6)}`
    );
  }

  lines.push('═══════════════════════════════════════════════════════');
  return lines.join('\n');
}
