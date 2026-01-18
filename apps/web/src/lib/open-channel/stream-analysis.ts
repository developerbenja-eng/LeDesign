/**
 * Stream Analysis Module - Multi-Section River Analysis (HEC-RAS Style)
 *
 * Implements reach-based river analysis including:
 * - Multiple cross-sections with structures
 * - Flow profile computation
 * - Rating curve generation
 * - Floodplain delineation
 * - Volume calculations
 *
 * Based on:
 * - HEC-RAS Hydraulic Reference Manual (USACE)
 * - Manual de Carreteras Vol. 3 - MOP Chile
 */

import {
  IrregularCrossSection,
  calculateIrregularGeometry,
  getMinimumElevation,
  getMaximumElevation,
  interpolateCrossSection,
} from './channel-geometry';

import {
  FlowRegime,
  calculateManningFlowIrregular,
  calculateNormalWSEL,
  calculateCriticalWSEL,
  classifyFlowRegime,
  calculateFroudeNumber,
} from './channel-hydraulics';

import {
  BoundaryCondition,
  ProfilePoint,
  WaterSurfaceProfile,
  computeStandardStep,
  generateRatingCurve,
} from './gradually-varied-flow';

import {
  Bridge,
  BridgeResult,
  Culvert,
  CulvertResult,
  Weir,
  WeirResult,
  analyzeBridge,
  analyzeCulvert,
  calculateWeirFlow,
} from './hydraulic-structures';

// ============================================================================
// Types
// ============================================================================

export type JunctionMethod = 'energy' | 'momentum' | 'forced';

/**
 * River reach with cross-sections and structures
 */
export interface RiverReach {
  id: string;
  name: string;
  description?: string;

  // Cross-sections (ordered from upstream to downstream)
  crossSections: IrregularCrossSection[];

  // Inline structures
  bridges?: Bridge[];
  culverts?: Culvert[];
  inlineWeirs?: Weir[];

  // Lateral structures (overflow)
  lateralWeirs?: LateralWeir[];
  lateralDiverts?: LateralDivert[];

  // Optional downstream reach connection
  downstreamReach?: string;
}

/**
 * Lateral weir for overflow
 */
export interface LateralWeir extends Weir {
  station: number;           // River station
  length: number;            // Weir length along channel (m)
  orientation: 'left' | 'right';
}

/**
 * Lateral diversion structure
 */
export interface LateralDivert {
  id: string;
  station: number;
  diversionCurve: { stage: number; flow: number }[];
  maxDiversion: number;
}

/**
 * Junction connecting multiple reaches
 */
export interface Junction {
  id: string;
  name: string;

  // Connected reaches
  upstreamReaches: string[];   // Reach IDs flowing into junction
  downstreamReach: string;     // Reach ID flowing out

  // Computation method
  method: JunctionMethod;

  // Junction parameters
  elevation?: number;          // Junction invert elevation
  lossCoefficient?: number;    // Additional loss at junction
}

/**
 * Complete river system
 */
export interface RiverSystem {
  id: string;
  name: string;
  description?: string;

  // Components
  reaches: RiverReach[];
  junctions?: Junction[];

  // System-level settings
  defaultManningsN?: number;
  defaultContraction?: number;
  defaultExpansion?: number;
}

/**
 * Flow data for analysis
 */
export interface FlowProfile {
  id: string;
  name: string;
  description?: string;

  // Flow by reach (reach ID -> flow)
  flows: Map<string, number>;

  // Boundary conditions (reach ID -> condition)
  boundaryConditions: Map<string, BoundaryCondition>;
}

/**
 * Result of reach analysis
 */
export interface ReachAnalysisResult {
  reachId: string;
  reachName: string;
  profileId: string;
  flow: number;

  // Profile results
  waterSurfaceProfile: WaterSurfaceProfile;

  // Structure results
  bridgeResults: Map<string, BridgeResult>;
  culvertResults: Map<string, CulvertResult>;
  weirResults: Map<string, WeirResult>;

  // Lateral flows
  lateralOverflow: number;
  lateralDiversion: number;

  // Statistics
  minWSEL: number;
  maxWSEL: number;
  avgVelocity: number;
  maxVelocity: number;
  avgFroude: number;

  // Convergence
  converged: boolean;
  iterations: number;

  warnings: string[];
}

/**
 * Floodplain mapping result
 */
export interface FloodplainMapping {
  station: number;
  waterSurfaceElevation: number;
  leftExtent: number;      // Distance to left bank (m)
  rightExtent: number;     // Distance to right bank (m)
  totalWidth: number;      // Total flood width (m)
  maxDepth: number;        // Maximum depth (m)
  avgDepth: number;        // Average depth (m)
  floodedArea: number;     // Cross-sectional area (m²)
}

/**
 * Flood volume calculation
 */
export interface FloodVolume {
  reachId: string;
  profileId: string;
  totalVolume: number;           // m³
  mainChannelVolume: number;     // m³
  leftOverbankVolume: number;    // m³
  rightOverbankVolume: number;   // m³
  surfaceArea: number;           // m²
  averageDepth: number;          // m
  reachLength: number;           // m
}

/**
 * Rating curve point
 */
export interface RatingPoint {
  flow: number;
  waterSurfaceElevation: number;
  velocity: number;
  depth: number;
  area: number;
  froudeNumber: number;
}

// ============================================================================
// Reach Analysis Functions
// ============================================================================

/**
 * Analyze a single reach for given flow and boundary conditions
 */
export function analyzeReach(
  reach: RiverReach,
  flow: number,
  boundary: BoundaryCondition,
  options: {
    includeStructures?: boolean;
    computeLateral?: boolean;
    maxIterations?: number;
  } = {}
): ReachAnalysisResult {
  const warnings: string[] = [];
  const includeStructures = options.includeStructures ?? true;
  const computeLateral = options.computeLateral ?? true;

  // Sort sections by river station
  const sortedSections = [...reach.crossSections].sort((a, b) => a.riverStation - b.riverStation);

  // Compute water surface profile using standard step
  const profile = computeStandardStep(sortedSections, flow, boundary);

  // Initialize structure results
  const bridgeResults = new Map<string, BridgeResult>();
  const culvertResults = new Map<string, CulvertResult>();
  const weirResults = new Map<string, WeirResult>();

  // Analyze inline structures if requested
  if (includeStructures) {
    // Bridges
    if (reach.bridges) {
      for (const bridge of reach.bridges) {
        const dsPoint = findNearestProfilePoint(profile, bridge.downstreamSection.riverStation);
        if (dsPoint) {
          const result = analyzeBridge(bridge, flow, dsPoint.waterSurfaceElevation);
          bridgeResults.set(bridge.id, result);
          warnings.push(...result.warnings.map(w => `Bridge ${bridge.id}: ${w}`));
        }
      }
    }

    // Culverts
    if (reach.culverts) {
      for (const culvert of reach.culverts) {
        // Find tailwater from profile
        const dsStation = culvert.invertElevationDownstream; // Approximate station
        const tailwater = interpolateWSEL(profile, dsStation) ?? culvert.invertElevationDownstream + 0.5;
        const result = analyzeCulvert(culvert, flow, tailwater);
        culvertResults.set(culvert.id, result);
        warnings.push(...result.warnings.map(w => `Culvert ${culvert.id}: ${w}`));
      }
    }

    // Inline weirs
    if (reach.inlineWeirs) {
      for (const weir of reach.inlineWeirs) {
        const head = profile.profilePoints[0]?.waterSurfaceElevation
          ? profile.profilePoints[0].waterSurfaceElevation - weir.crestElevation
          : 1.0;
        if (head > 0) {
          const result = calculateWeirFlow(weir, head);
          weirResults.set(`inline_weir_${weir.crestElevation}`, result);
          warnings.push(...result.warnings.map(w => `Weir at ${weir.crestElevation}m: ${w}`));
        }
      }
    }
  }

  // Compute lateral flows if requested
  let lateralOverflow = 0;
  let lateralDiversion = 0;

  if (computeLateral) {
    // Lateral weirs
    if (reach.lateralWeirs) {
      for (const weir of reach.lateralWeirs) {
        const wsel = interpolateWSEL(profile, weir.station);
        if (wsel !== null) {
          const head = wsel - weir.crestElevation;
          if (head > 0) {
            const result = calculateWeirFlow(weir, head);
            lateralOverflow += result.flow;
          }
        }
      }
    }

    // Lateral diversions
    if (reach.lateralDiverts) {
      for (const divert of reach.lateralDiverts) {
        const wsel = interpolateWSEL(profile, divert.station);
        if (wsel !== null) {
          const diverted = interpolateDiversionCurve(divert.diversionCurve, wsel);
          lateralDiversion += Math.min(diverted, divert.maxDiversion);
        }
      }
    }
  }

  // Calculate statistics
  const points = profile.profilePoints;
  const minWSEL = Math.min(...points.map(p => p.waterSurfaceElevation));
  const maxWSEL = Math.max(...points.map(p => p.waterSurfaceElevation));
  const avgVelocity = points.reduce((sum, p) => sum + p.averageVelocity, 0) / points.length;
  const maxVelocity = Math.max(...points.map(p => p.averageVelocity));
  const avgFroude = points.reduce((sum, p) => sum + p.froudeNumber, 0) / points.length;

  return {
    reachId: reach.id,
    reachName: reach.name,
    profileId: 'default',
    flow,
    waterSurfaceProfile: profile,
    bridgeResults,
    culvertResults,
    weirResults,
    lateralOverflow,
    lateralDiversion,
    minWSEL,
    maxWSEL,
    avgVelocity,
    maxVelocity,
    avgFroude,
    converged: profile.converged,
    iterations: profile.totalIterations,
    warnings: [...warnings, ...profile.warnings],
  };
}

/**
 * Analyze complete river system with multiple reaches and junctions
 */
export function analyzeRiverSystem(
  system: RiverSystem,
  flowProfile: FlowProfile
): Map<string, ReachAnalysisResult> {
  const results = new Map<string, ReachAnalysisResult>();

  // Build dependency graph
  const reachOrder = determineComputationOrder(system);

  // Compute each reach in order
  for (const reachId of reachOrder) {
    const reach = system.reaches.find(r => r.id === reachId);
    if (!reach) continue;

    const flow = flowProfile.flows.get(reachId) ?? 0;
    let boundary = flowProfile.boundaryConditions.get(reachId);

    // If no boundary specified, try to get from downstream reach result
    if (!boundary && reach.downstreamReach) {
      const dsResult = results.get(reach.downstreamReach);
      if (dsResult) {
        const dsFirstPoint = dsResult.waterSurfaceProfile.profilePoints[0];
        boundary = {
          type: 'known_wsel',
          value: dsFirstPoint?.waterSurfaceElevation,
        };
      }
    }

    // Default boundary if still undefined
    if (!boundary) {
      boundary = { type: 'normal_depth' };
    }

    const result = analyzeReach(reach, flow, boundary);
    results.set(reachId, result);
  }

  return results;
}

/**
 * Determine computation order based on reach connections
 * (Most downstream first for subcritical, most upstream first for supercritical)
 */
function determineComputationOrder(system: RiverSystem): string[] {
  // Build adjacency map
  const downstream = new Map<string, string | null>();
  const upstream = new Map<string, string[]>();

  for (const reach of system.reaches) {
    downstream.set(reach.id, reach.downstreamReach ?? null);

    if (reach.downstreamReach) {
      const existing = upstream.get(reach.downstreamReach) ?? [];
      existing.push(reach.id);
      upstream.set(reach.downstreamReach, existing);
    }
  }

  // Find terminal reaches (no downstream)
  const terminals = system.reaches
    .filter(r => !r.downstreamReach)
    .map(r => r.id);

  // BFS from terminals upstream
  const order: string[] = [];
  const visited = new Set<string>();
  const queue = [...terminals];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;

    visited.add(current);
    order.push(current);

    // Add upstream reaches
    const upReaches = upstream.get(current) ?? [];
    for (const upId of upReaches) {
      if (!visited.has(upId)) {
        queue.push(upId);
      }
    }
  }

  // Add any disconnected reaches
  for (const reach of system.reaches) {
    if (!visited.has(reach.id)) {
      order.push(reach.id);
    }
  }

  return order;
}

// ============================================================================
// Floodplain Analysis Functions
// ============================================================================

/**
 * Delineate floodplain extent for a reach
 */
export function delineateFloodplain(
  reach: RiverReach,
  profile: WaterSurfaceProfile
): FloodplainMapping[] {
  const mapping: FloodplainMapping[] = [];

  for (const point of profile.profilePoints) {
    // Find corresponding cross-section
    const section = reach.crossSections.find(
      xs => Math.abs(xs.riverStation - point.station) < 0.1
    );

    if (!section) continue;

    const wsel = point.waterSurfaceElevation;
    const geom = calculateIrregularGeometry(section, wsel);

    // Calculate flood extents
    const sorted = [...section.stationElevation].sort((a, b) => a.station - b.station);
    let leftExtent = 0;
    let rightExtent = 0;
    let maxDepth = 0;
    let totalDepthSum = 0;
    let wettedCount = 0;

    for (let i = 0; i < sorted.length; i++) {
      const pt = sorted[i];
      const depth = wsel - pt.elevation;

      if (depth > 0) {
        // Update extents
        if (i < sorted.length / 2) {
          leftExtent = Math.max(leftExtent, section.bankStations.leftBank - pt.station);
        } else {
          rightExtent = Math.max(rightExtent, pt.station - section.bankStations.rightBank);
        }

        maxDepth = Math.max(maxDepth, depth);
        totalDepthSum += depth;
        wettedCount++;
      }
    }

    const avgDepth = wettedCount > 0 ? totalDepthSum / wettedCount : 0;
    const totalWidth = geom.totalTopWidth;

    mapping.push({
      station: point.station,
      waterSurfaceElevation: wsel,
      leftExtent,
      rightExtent,
      totalWidth,
      maxDepth,
      avgDepth,
      floodedArea: geom.totalArea,
    });
  }

  return mapping;
}

/**
 * Calculate flood storage volume between two stations
 */
export function calculateFloodVolume(
  reach: RiverReach,
  profile: WaterSurfaceProfile,
  startStation?: number,
  endStation?: number
): FloodVolume {
  const points = profile.profilePoints;

  // Filter by station range
  const start = startStation ?? Math.min(...points.map(p => p.station));
  const end = endStation ?? Math.max(...points.map(p => p.station));

  const filteredPoints = points.filter(p => p.station >= start && p.station <= end);

  if (filteredPoints.length < 2) {
    return {
      reachId: reach.id,
      profileId: 'default',
      totalVolume: 0,
      mainChannelVolume: 0,
      leftOverbankVolume: 0,
      rightOverbankVolume: 0,
      surfaceArea: 0,
      averageDepth: 0,
      reachLength: 0,
    };
  }

  let totalVolume = 0;
  let mainChannelVolume = 0;
  let leftOverbankVolume = 0;
  let rightOverbankVolume = 0;
  let surfaceArea = 0;

  // Use trapezoidal rule between consecutive sections
  for (let i = 0; i < filteredPoints.length - 1; i++) {
    const pt1 = filteredPoints[i];
    const pt2 = filteredPoints[i + 1];
    const dx = Math.abs(pt2.station - pt1.station);

    // Find sections
    const xs1 = reach.crossSections.find(
      xs => Math.abs(xs.riverStation - pt1.station) < 0.1
    );
    const xs2 = reach.crossSections.find(
      xs => Math.abs(xs.riverStation - pt2.station) < 0.1
    );

    if (xs1 && xs2) {
      const geom1 = calculateIrregularGeometry(xs1, pt1.waterSurfaceElevation);
      const geom2 = calculateIrregularGeometry(xs2, pt2.waterSurfaceElevation);

      // Average areas
      const avgArea = (geom1.totalArea + geom2.totalArea) / 2;
      const avgLOB = (geom1.zones.leftOverbank.area + geom2.zones.leftOverbank.area) / 2;
      const avgCH = (geom1.zones.mainChannel.area + geom2.zones.mainChannel.area) / 2;
      const avgROB = (geom1.zones.rightOverbank.area + geom2.zones.rightOverbank.area) / 2;
      const avgWidth = (geom1.totalTopWidth + geom2.totalTopWidth) / 2;

      // Volume = average area × distance
      totalVolume += avgArea * dx;
      mainChannelVolume += avgCH * dx;
      leftOverbankVolume += avgLOB * dx;
      rightOverbankVolume += avgROB * dx;
      surfaceArea += avgWidth * dx;
    }
  }

  const reachLength = end - start;
  const averageDepth = surfaceArea > 0 ? totalVolume / surfaceArea : 0;

  return {
    reachId: reach.id,
    profileId: 'default',
    totalVolume,
    mainChannelVolume,
    leftOverbankVolume,
    rightOverbankVolume,
    surfaceArea,
    averageDepth,
    reachLength,
  };
}

// ============================================================================
// Rating Curve Functions
// ============================================================================

/**
 * Generate rating curve for a specific cross-section
 */
export function generateStageDischarge(
  section: IrregularCrossSection,
  slope: number,
  minFlow: number,
  maxFlow: number,
  numPoints: number = 20
): RatingPoint[] {
  const curve = generateRatingCurve(section, slope, minFlow, maxFlow, numPoints);
  const minElev = getMinimumElevation(section);

  return curve.map(pt => {
    const geom = calculateIrregularGeometry(section, pt.wsel);
    const D = geom.totalTopWidth > 0 ? geom.totalArea / geom.totalTopWidth : 0;
    const Fr = calculateFroudeNumber(pt.velocity, D);

    return {
      flow: pt.flow,
      waterSurfaceElevation: pt.wsel,
      velocity: pt.velocity,
      depth: pt.wsel - minElev,
      area: geom.totalArea,
      froudeNumber: Fr,
    };
  });
}

/**
 * Compute velocity distribution across a cross-section
 */
export function computeVelocityDistribution(
  section: IrregularCrossSection,
  wsel: number,
  flow: number
): { station: number; velocity: number; depth: number }[] {
  const geom = calculateIrregularGeometry(section, wsel);
  const distribution: { station: number; velocity: number; depth: number }[] = [];

  // Get flow and velocity by zone
  const totalK = geom.totalConveyance;
  const zones = [
    { key: 'leftOverbank', zone: geom.zones.leftOverbank, bound: section.bankStations.leftBank },
    { key: 'mainChannel', zone: geom.zones.mainChannel, bound: section.bankStations.rightBank },
    { key: 'rightOverbank', zone: geom.zones.rightOverbank, bound: Infinity },
  ];

  for (const pt of section.stationElevation) {
    const depth = wsel - pt.elevation;
    if (depth <= 0) {
      distribution.push({ station: pt.station, velocity: 0, depth: 0 });
      continue;
    }

    // Determine which zone
    let zoneVelocity = 0;
    if (pt.station < section.bankStations.leftBank) {
      zoneVelocity = geom.zones.leftOverbank.area > 0
        ? (geom.zones.leftOverbank.conveyance / totalK) * flow / geom.zones.leftOverbank.area
        : 0;
    } else if (pt.station > section.bankStations.rightBank) {
      zoneVelocity = geom.zones.rightOverbank.area > 0
        ? (geom.zones.rightOverbank.conveyance / totalK) * flow / geom.zones.rightOverbank.area
        : 0;
    } else {
      zoneVelocity = geom.zones.mainChannel.area > 0
        ? (geom.zones.mainChannel.conveyance / totalK) * flow / geom.zones.mainChannel.area
        : 0;
    }

    // Apply depth-based adjustment (simplified log-law profile)
    const avgDepth = geom.totalArea / geom.totalTopWidth;
    const depthRatio = depth / avgDepth;
    const adjustedVelocity = zoneVelocity * Math.pow(depthRatio, 0.2);

    distribution.push({
      station: pt.station,
      velocity: adjustedVelocity,
      depth,
    });
  }

  return distribution;
}

/**
 * Compute shear stress distribution across a cross-section
 */
export function computeShearDistribution(
  section: IrregularCrossSection,
  wsel: number,
  slope: number
): { station: number; shearStress: number; depth: number }[] {
  const geom = calculateIrregularGeometry(section, wsel);
  const distribution: { station: number; shearStress: number; depth: number }[] = [];

  const WATER_SPECIFIC_WEIGHT = 9810; // N/m³

  for (const pt of section.stationElevation) {
    const depth = wsel - pt.elevation;
    if (depth <= 0) {
      distribution.push({ station: pt.station, shearStress: 0, depth: 0 });
      continue;
    }

    // Local hydraulic radius approximation
    // τ = γ × R × S, where R ≈ local depth for wide channels
    const localR = depth * 0.8; // Approximate
    const localShear = WATER_SPECIFIC_WEIGHT * localR * slope;

    distribution.push({
      station: pt.station,
      shearStress: localShear,
      depth,
    });
  }

  return distribution;
}

// ============================================================================
// Interpolation Helpers
// ============================================================================

/**
 * Find nearest profile point to a station
 */
function findNearestProfilePoint(
  profile: WaterSurfaceProfile,
  station: number
): ProfilePoint | null {
  let nearest: ProfilePoint | null = null;
  let minDist = Infinity;

  for (const pt of profile.profilePoints) {
    const dist = Math.abs(pt.station - station);
    if (dist < minDist) {
      minDist = dist;
      nearest = pt;
    }
  }

  return nearest;
}

/**
 * Interpolate WSEL at a specific station
 */
function interpolateWSEL(
  profile: WaterSurfaceProfile,
  station: number
): number | null {
  const points = profile.profilePoints.sort((a, b) => a.station - b.station);

  if (points.length === 0) return null;
  if (station <= points[0].station) return points[0].waterSurfaceElevation;
  if (station >= points[points.length - 1].station) {
    return points[points.length - 1].waterSurfaceElevation;
  }

  for (let i = 0; i < points.length - 1; i++) {
    if (station >= points[i].station && station <= points[i + 1].station) {
      const t = (station - points[i].station) /
                (points[i + 1].station - points[i].station);
      return points[i].waterSurfaceElevation +
             t * (points[i + 1].waterSurfaceElevation - points[i].waterSurfaceElevation);
    }
  }

  return null;
}

/**
 * Interpolate diversion curve
 */
function interpolateDiversionCurve(
  curve: { stage: number; flow: number }[],
  stage: number
): number {
  if (curve.length === 0) return 0;

  const sorted = [...curve].sort((a, b) => a.stage - b.stage);

  if (stage <= sorted[0].stage) return sorted[0].flow;
  if (stage >= sorted[sorted.length - 1].stage) return sorted[sorted.length - 1].flow;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (stage >= sorted[i].stage && stage <= sorted[i + 1].stage) {
      const t = (stage - sorted[i].stage) / (sorted[i + 1].stage - sorted[i].stage);
      return sorted[i].flow + t * (sorted[i + 1].flow - sorted[i].flow);
    }
  }

  return 0;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export profile data for plotting
 */
export function exportProfileData(
  reach: RiverReach,
  profile: WaterSurfaceProfile
): {
  stations: number[];
  bedElevations: number[];
  waterSurface: number[];
  energyGrade: number[];
  criticalDepth: number[];
  leftBank: number[];
  rightBank: number[];
} {
  const stations: number[] = [];
  const bedElevations: number[] = [];
  const waterSurface: number[] = [];
  const energyGrade: number[] = [];
  const criticalDepth: number[] = [];
  const leftBank: number[] = [];
  const rightBank: number[] = [];

  for (const point of profile.profilePoints) {
    const section = reach.crossSections.find(
      xs => Math.abs(xs.riverStation - point.station) < 0.1
    );

    stations.push(point.station);
    bedElevations.push(point.channelBottomElevation);
    waterSurface.push(point.waterSurfaceElevation);
    energyGrade.push(point.energyGradeElevation);
    criticalDepth.push(point.channelBottomElevation + point.criticalDepth);

    if (section) {
      // Get bank elevations
      const leftBankElev = section.stationElevation.find(
        pt => Math.abs(pt.station - section.bankStations.leftBank) < 0.1
      )?.elevation ?? point.channelBottomElevation;
      const rightBankElev = section.stationElevation.find(
        pt => Math.abs(pt.station - section.bankStations.rightBank) < 0.1
      )?.elevation ?? point.channelBottomElevation;

      leftBank.push(leftBankElev);
      rightBank.push(rightBankElev);
    } else {
      leftBank.push(point.channelBottomElevation);
      rightBank.push(point.channelBottomElevation);
    }
  }

  return {
    stations,
    bedElevations,
    waterSurface,
    energyGrade,
    criticalDepth,
    leftBank,
    rightBank,
  };
}

/**
 * Export cross-section data for plotting
 */
export function exportCrossSectionData(
  section: IrregularCrossSection,
  wsel?: number
): {
  stations: number[];
  elevations: number[];
  waterSurface?: { stations: number[]; elevations: number[] };
  bankStations: { left: number; right: number };
} {
  const sorted = [...section.stationElevation].sort((a, b) => a.station - b.station);

  const stations = sorted.map(pt => pt.station);
  const elevations = sorted.map(pt => pt.elevation);

  let waterSurface: { stations: number[]; elevations: number[] } | undefined;

  if (wsel !== undefined) {
    // Find wetted extent
    const wettedStations: number[] = [];
    const wettedElevations: number[] = [];

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].elevation <= wsel) {
        wettedStations.push(sorted[i].station);
        wettedElevations.push(wsel);
      }
    }

    if (wettedStations.length > 0) {
      waterSurface = {
        stations: wettedStations,
        elevations: wettedElevations,
      };
    }
  }

  return {
    stations,
    elevations,
    waterSurface,
    bankStations: {
      left: section.bankStations.leftBank,
      right: section.bankStations.rightBank,
    },
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format reach analysis result for display
 */
export function formatReachAnalysis(result: ReachAnalysisResult): string {
  const lines = [
    `═══ ANÁLISIS DE TRAMO: ${result.reachName} ═══`,
    '',
    `Caudal: ${result.flow.toFixed(3)} m³/s`,
    `Convergió: ${result.converged ? 'Sí' : 'No'}`,
    '',
    '--- NIVELES ---',
    `WSEL Mínimo: ${result.minWSEL.toFixed(3)} m`,
    `WSEL Máximo: ${result.maxWSEL.toFixed(3)} m`,
    '',
    '--- VELOCIDADES ---',
    `Velocidad Media: ${result.avgVelocity.toFixed(2)} m/s`,
    `Velocidad Máxima: ${result.maxVelocity.toFixed(2)} m/s`,
    `Froude Promedio: ${result.avgFroude.toFixed(3)}`,
    '',
    `Secciones: ${result.waterSurfaceProfile.profilePoints.length}`,
    `Iteraciones: ${result.iterations}`,
  ];

  if (result.lateralOverflow > 0 || result.lateralDiversion > 0) {
    lines.push(
      '',
      '--- FLUJOS LATERALES ---',
      `Desborde: ${result.lateralOverflow.toFixed(3)} m³/s`,
      `Derivación: ${result.lateralDiversion.toFixed(3)} m³/s`
    );
  }

  if (result.bridgeResults.size > 0) {
    lines.push('', `--- PUENTES (${result.bridgeResults.size}) ---`);
    result.bridgeResults.forEach((br, id) => {
      lines.push(`  ${id}: Remanso=${(br.backwaterRise * 100).toFixed(1)}cm`);
    });
  }

  if (result.culvertResults.size > 0) {
    lines.push('', `--- ALCANTARILLAS (${result.culvertResults.size}) ---`);
    result.culvertResults.forEach((cr, id) => {
      lines.push(`  ${id}: Control=${cr.controlType}, HW/D=${cr.hwToD.toFixed(2)}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('', '--- ADVERTENCIAS ---');
    result.warnings.slice(0, 10).forEach(w => lines.push(`⚠ ${w}`));
    if (result.warnings.length > 10) {
      lines.push(`... y ${result.warnings.length - 10} más`);
    }
  }

  return lines.join('\n');
}

/**
 * Format flood volume result for display
 */
export function formatFloodVolume(volume: FloodVolume): string {
  const lines = [
    '═══ VOLUMEN DE INUNDACIÓN ═══',
    '',
    `Tramo: ${volume.reachId}`,
    `Longitud: ${volume.reachLength.toFixed(1)} m`,
    '',
    '--- VOLÚMENES ---',
    `Total: ${volume.totalVolume.toFixed(0)} m³`,
    `Canal Principal: ${volume.mainChannelVolume.toFixed(0)} m³`,
    `Planicie Izquierda: ${volume.leftOverbankVolume.toFixed(0)} m³`,
    `Planicie Derecha: ${volume.rightOverbankVolume.toFixed(0)} m³`,
    '',
    '--- SUPERFICIE ---',
    `Área Superficial: ${volume.surfaceArea.toFixed(0)} m²`,
    `Profundidad Media: ${volume.averageDepth.toFixed(2)} m`,
  ];

  return lines.join('\n');
}
