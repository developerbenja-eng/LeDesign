/**
 * Channel Geometry Module - HEC-RAS Style Cross-Section Calculations
 *
 * Supports both prismatic (engineered) and irregular (natural) channel sections.
 * Implements full HEC-RAS features including:
 * - Multiple roughness zones (LOB/Channel/ROB)
 * - Ineffective flow areas
 * - Levees and obstructions
 *
 * Based on:
 * - HEC-RAS Hydraulic Reference Manual (USACE)
 * - Manual de Carreteras Vol. 3 - MOP Chile
 */

// ============================================================================
// Types - Prismatic Channels
// ============================================================================

export type PrismaticShape = 'rectangular' | 'trapezoidal' | 'triangular' | 'circular' | 'parabolic';

export interface RectangularSection {
  shape: 'rectangular';
  bottomWidth: number; // m
}

export interface TrapezoidalSection {
  shape: 'trapezoidal';
  bottomWidth: number; // m
  leftSideSlope: number; // z (horizontal:vertical, e.g., 2 means 2H:1V)
  rightSideSlope: number; // z
}

export interface TriangularSection {
  shape: 'triangular';
  leftSideSlope: number; // z
  rightSideSlope: number; // z
}

export interface CircularSection {
  shape: 'circular';
  diameter: number; // m
}

export interface ParabolicSection {
  shape: 'parabolic';
  topWidthAtUnitDepth: number; // T1 (top width when depth = 1m)
}

export type PrismaticSection =
  | RectangularSection
  | TrapezoidalSection
  | TriangularSection
  | CircularSection
  | ParabolicSection;

// ============================================================================
// Types - Irregular (Natural) Channels - HEC-RAS Style
// ============================================================================

export interface StationElevation {
  station: number; // Horizontal distance from left reference point (m)
  elevation: number; // Vertical elevation (m)
  roughness?: number; // Manning's n at this point (optional, for subsection variation)
}

export type FlowZone = 'left_overbank' | 'main_channel' | 'right_overbank';

export interface BankStations {
  leftBank: number; // Station where left overbank ends (main channel begins)
  rightBank: number; // Station where right overbank starts (main channel ends)
}

export interface IneffectiveArea {
  leftStation: number; // Left boundary of ineffective area
  rightStation: number; // Right boundary of ineffective area
  elevation: number; // Below this elevation, area is ineffective
  permanent: boolean; // true = always ineffective, false = only when WSEL < elevation
}

export interface Levee {
  station: number; // Station where levee is located
  elevation: number; // Top of levee elevation
  side: 'left' | 'right'; // Which overbank the levee protects
}

export interface Obstruction {
  leftStation: number;
  rightStation: number;
  topElevation: number; // Top of obstruction
  bottomElevation?: number; // Bottom (default = ground)
}

export interface IrregularCrossSection {
  id: string;
  riverStation: number; // Distance along river (for profile computation)
  description?: string;

  // Core geometry
  stationElevation: StationElevation[];
  bankStations: BankStations;

  // Roughness by zone (HEC-RAS style)
  manningsN: {
    leftOverbank: number;
    mainChannel: number;
    rightOverbank: number;
  };

  // Optional HEC-RAS features
  ineffectiveAreas?: IneffectiveArea[];
  levees?: Levee[];
  obstructions?: Obstruction[];

  // Reach lengths to next downstream section (for friction loss calculation)
  reachLengths: {
    leftOverbank: number;
    mainChannel: number;
    rightOverbank: number;
  };

  // Contraction/expansion coefficients (optional)
  contractionCoeff?: number; // Default 0.1
  expansionCoeff?: number; // Default 0.3
}

// ============================================================================
// Types - Computation Results
// ============================================================================

export interface ZoneGeometry {
  area: number; // m²
  wettedPerimeter: number; // m
  topWidth: number; // m
  hydraulicRadius: number; // m
  conveyance: number; // m³/s (K = (1/n) * A * R^(2/3))
}

export interface CrossSectionGeometry {
  waterSurfaceElevation: number;
  totalArea: number;
  totalWettedPerimeter: number;
  totalTopWidth: number;
  averageHydraulicRadius: number;
  totalConveyance: number;

  zones: {
    leftOverbank: ZoneGeometry;
    mainChannel: ZoneGeometry;
    rightOverbank: ZoneGeometry;
  };

  // For alpha (kinetic energy) and beta (momentum) coefficients
  alphaCoefficient: number; // Velocity distribution coefficient
  betaCoefficient: number; // Momentum coefficient
}

// ============================================================================
// Prismatic Channel Geometry Functions
// ============================================================================

/**
 * Calculate flow area for prismatic channel at given depth
 */
export function calculatePrismaticArea(section: PrismaticSection, depth: number): number {
  if (depth <= 0) return 0;

  switch (section.shape) {
    case 'rectangular':
      return section.bottomWidth * depth;

    case 'trapezoidal': {
      const avgSideSlope = (section.leftSideSlope + section.rightSideSlope) / 2;
      return (section.bottomWidth + avgSideSlope * depth) * depth;
    }

    case 'triangular': {
      const avgSideSlope = (section.leftSideSlope + section.rightSideSlope) / 2;
      return avgSideSlope * depth * depth;
    }

    case 'circular': {
      const D = section.diameter;
      if (depth >= D) {
        return Math.PI * D * D / 4; // Full pipe
      }
      // Partial flow using central angle
      const theta = 2 * Math.acos(1 - 2 * depth / D);
      return (D * D / 8) * (theta - Math.sin(theta));
    }

    case 'parabolic': {
      // A = (2/3) * T * y where T = T1 * sqrt(y)
      const T = section.topWidthAtUnitDepth * Math.sqrt(depth);
      return (2 / 3) * T * depth;
    }
  }
}

/**
 * Calculate wetted perimeter for prismatic channel at given depth
 */
export function calculatePrismaticWettedPerimeter(section: PrismaticSection, depth: number): number {
  if (depth <= 0) return 0;

  switch (section.shape) {
    case 'rectangular':
      return section.bottomWidth + 2 * depth;

    case 'trapezoidal': {
      const leftLength = depth * Math.sqrt(1 + section.leftSideSlope * section.leftSideSlope);
      const rightLength = depth * Math.sqrt(1 + section.rightSideSlope * section.rightSideSlope);
      return section.bottomWidth + leftLength + rightLength;
    }

    case 'triangular': {
      const leftLength = depth * Math.sqrt(1 + section.leftSideSlope * section.leftSideSlope);
      const rightLength = depth * Math.sqrt(1 + section.rightSideSlope * section.rightSideSlope);
      return leftLength + rightLength;
    }

    case 'circular': {
      const D = section.diameter;
      if (depth >= D) {
        return Math.PI * D; // Full pipe
      }
      const theta = 2 * Math.acos(1 - 2 * depth / D);
      return D * theta / 2;
    }

    case 'parabolic': {
      // Approximate: P ≈ T + (8/3) * y²/T for shallow flow
      const T = section.topWidthAtUnitDepth * Math.sqrt(depth);
      if (T > 0) {
        return T + (8 / 3) * (depth * depth) / T;
      }
      return 0;
    }
  }
}

/**
 * Calculate top width (water surface width) for prismatic channel
 */
export function calculatePrismaticTopWidth(section: PrismaticSection, depth: number): number {
  if (depth <= 0) return 0;

  switch (section.shape) {
    case 'rectangular':
      return section.bottomWidth;

    case 'trapezoidal':
      return section.bottomWidth + (section.leftSideSlope + section.rightSideSlope) * depth;

    case 'triangular':
      return (section.leftSideSlope + section.rightSideSlope) * depth;

    case 'circular': {
      const D = section.diameter;
      if (depth >= D) return 0; // Full pipe has no free surface
      return D * Math.sin(Math.acos(1 - 2 * depth / D));
    }

    case 'parabolic':
      return section.topWidthAtUnitDepth * Math.sqrt(depth);
  }
}

/**
 * Calculate hydraulic radius for prismatic channel
 */
export function calculatePrismaticHydraulicRadius(section: PrismaticSection, depth: number): number {
  const A = calculatePrismaticArea(section, depth);
  const P = calculatePrismaticWettedPerimeter(section, depth);
  return P > 0 ? A / P : 0;
}

/**
 * Calculate hydraulic depth (D = A/T) for prismatic channel
 */
export function calculatePrismaticHydraulicDepth(section: PrismaticSection, depth: number): number {
  const A = calculatePrismaticArea(section, depth);
  const T = calculatePrismaticTopWidth(section, depth);
  return T > 0 ? A / T : depth;
}

// ============================================================================
// Irregular (Natural) Channel Geometry Functions
// ============================================================================

/**
 * Get minimum bed elevation from cross-section
 */
export function getMinimumElevation(section: IrregularCrossSection): number {
  return Math.min(...section.stationElevation.map(pt => pt.elevation));
}

/**
 * Get maximum elevation from cross-section
 */
export function getMaximumElevation(section: IrregularCrossSection): number {
  return Math.max(...section.stationElevation.map(pt => pt.elevation));
}

/**
 * Interpolate elevation at a given station
 */
export function interpolateElevation(
  stationElevation: StationElevation[],
  station: number
): number | null {
  if (stationElevation.length < 2) return null;

  // Sort by station
  const sorted = [...stationElevation].sort((a, b) => a.station - b.station);

  // Check bounds
  if (station < sorted[0].station || station > sorted[sorted.length - 1].station) {
    return null;
  }

  // Find bracketing points
  for (let i = 0; i < sorted.length - 1; i++) {
    if (station >= sorted[i].station && station <= sorted[i + 1].station) {
      const t = (station - sorted[i].station) / (sorted[i + 1].station - sorted[i].station);
      return sorted[i].elevation + t * (sorted[i + 1].elevation - sorted[i].elevation);
    }
  }

  return null;
}

/**
 * Calculate area for a segment between two points at given water surface elevation
 */
function calculateSegmentArea(
  pt1: StationElevation,
  pt2: StationElevation,
  wsel: number
): number {
  const y1 = Math.max(0, wsel - pt1.elevation);
  const y2 = Math.max(0, wsel - pt2.elevation);
  const width = Math.abs(pt2.station - pt1.station);

  // Trapezoidal area
  return 0.5 * (y1 + y2) * width;
}

/**
 * Calculate wetted perimeter for a segment between two points
 */
function calculateSegmentWettedPerimeter(
  pt1: StationElevation,
  pt2: StationElevation,
  wsel: number
): number {
  const y1 = wsel - pt1.elevation;
  const y2 = wsel - pt2.elevation;

  // Both points above water - no wetted perimeter
  if (y1 <= 0 && y2 <= 0) return 0;

  const dx = Math.abs(pt2.station - pt1.station);
  const dz = pt2.elevation - pt1.elevation;

  // Both points below water - full segment length
  if (y1 >= 0 && y2 >= 0) {
    return Math.sqrt(dx * dx + dz * dz);
  }

  // Partial submersion - find intersection point
  const t = y1 / (y1 - y2);
  const partialDx = dx * (y1 > 0 ? t : 1 - t);
  const partialDz = Math.abs(dz) * (y1 > 0 ? t : 1 - t);

  return Math.sqrt(partialDx * partialDx + partialDz * partialDz);
}

/**
 * Calculate geometry for an irregular cross-section at given water surface elevation
 */
export function calculateIrregularGeometry(
  section: IrregularCrossSection,
  wsel: number
): CrossSectionGeometry {
  const sorted = [...section.stationElevation].sort((a, b) => a.station - b.station);

  // Initialize zone results
  const zones = {
    leftOverbank: { area: 0, wettedPerimeter: 0, topWidth: 0, hydraulicRadius: 0, conveyance: 0 },
    mainChannel: { area: 0, wettedPerimeter: 0, topWidth: 0, hydraulicRadius: 0, conveyance: 0 },
    rightOverbank: { area: 0, wettedPerimeter: 0, topWidth: 0, hydraulicRadius: 0, conveyance: 0 },
  };

  // Process each segment
  for (let i = 0; i < sorted.length - 1; i++) {
    const pt1 = sorted[i];
    const pt2 = sorted[i + 1];
    const midStation = (pt1.station + pt2.station) / 2;

    // Determine which zone this segment belongs to
    let zone: FlowZone;
    if (midStation < section.bankStations.leftBank) {
      zone = 'left_overbank';
    } else if (midStation > section.bankStations.rightBank) {
      zone = 'right_overbank';
    } else {
      zone = 'main_channel';
    }

    // Calculate segment contributions
    const segmentArea = calculateSegmentArea(pt1, pt2, wsel);
    const segmentWP = calculateSegmentWettedPerimeter(pt1, pt2, wsel);

    // Add to appropriate zone
    const zoneKey = zone === 'left_overbank' ? 'leftOverbank' :
                    zone === 'right_overbank' ? 'rightOverbank' : 'mainChannel';

    zones[zoneKey].area += segmentArea;
    zones[zoneKey].wettedPerimeter += segmentWP;
  }

  // Calculate top width for each zone
  zones.leftOverbank.topWidth = calculateZoneTopWidth(sorted, wsel, 0, section.bankStations.leftBank);
  zones.mainChannel.topWidth = calculateZoneTopWidth(sorted, wsel, section.bankStations.leftBank, section.bankStations.rightBank);
  zones.rightOverbank.topWidth = calculateZoneTopWidth(sorted, wsel, section.bankStations.rightBank, Infinity);

  // Apply ineffective areas if present
  if (section.ineffectiveAreas) {
    applyIneffectiveAreas(section, wsel, zones);
  }

  // Apply levees if present
  if (section.levees) {
    applyLevees(section, wsel, zones);
  }

  // Calculate hydraulic radius and conveyance for each zone
  for (const [key, zone] of Object.entries(zones) as [keyof typeof zones, ZoneGeometry][]) {
    zone.hydraulicRadius = zone.wettedPerimeter > 0 ? zone.area / zone.wettedPerimeter : 0;

    const n = key === 'leftOverbank' ? section.manningsN.leftOverbank :
              key === 'rightOverbank' ? section.manningsN.rightOverbank :
              section.manningsN.mainChannel;

    // K = (1/n) * A * R^(2/3)
    zone.conveyance = zone.hydraulicRadius > 0
      ? (1 / n) * zone.area * Math.pow(zone.hydraulicRadius, 2 / 3)
      : 0;
  }

  // Calculate totals
  const totalArea = zones.leftOverbank.area + zones.mainChannel.area + zones.rightOverbank.area;
  const totalWettedPerimeter = zones.leftOverbank.wettedPerimeter + zones.mainChannel.wettedPerimeter + zones.rightOverbank.wettedPerimeter;
  const totalTopWidth = zones.leftOverbank.topWidth + zones.mainChannel.topWidth + zones.rightOverbank.topWidth;
  const totalConveyance = zones.leftOverbank.conveyance + zones.mainChannel.conveyance + zones.rightOverbank.conveyance;
  const averageHydraulicRadius = totalWettedPerimeter > 0 ? totalArea / totalWettedPerimeter : 0;

  // Calculate velocity and momentum distribution coefficients
  const { alpha, beta } = calculateDistributionCoefficients(zones, totalArea, totalConveyance);

  return {
    waterSurfaceElevation: wsel,
    totalArea,
    totalWettedPerimeter,
    totalTopWidth,
    averageHydraulicRadius,
    totalConveyance,
    zones,
    alphaCoefficient: alpha,
    betaCoefficient: beta,
  };
}

/**
 * Calculate top width within a station range
 */
function calculateZoneTopWidth(
  sorted: StationElevation[],
  wsel: number,
  leftBound: number,
  rightBound: number
): number {
  let minStation = Infinity;
  let maxStation = -Infinity;
  let foundWetted = false;

  for (let i = 0; i < sorted.length - 1; i++) {
    const pt1 = sorted[i];
    const pt2 = sorted[i + 1];

    // Skip if entirely outside zone
    if (pt2.station < leftBound || pt1.station > rightBound) continue;

    // Check if segment is wetted
    const y1 = wsel - pt1.elevation;
    const y2 = wsel - pt2.elevation;

    if (y1 > 0 || y2 > 0) {
      foundWetted = true;

      // Find wetted extent of this segment
      let segLeft = Math.max(pt1.station, leftBound);
      let segRight = Math.min(pt2.station, rightBound);

      // Adjust for partial wetting
      if (y1 <= 0 && y2 > 0) {
        const t = y1 / (y1 - y2);
        segLeft = pt1.station + t * (pt2.station - pt1.station);
      }
      if (y1 > 0 && y2 <= 0) {
        const t = y1 / (y1 - y2);
        segRight = pt1.station + t * (pt2.station - pt1.station);
      }

      segLeft = Math.max(segLeft, leftBound);
      segRight = Math.min(segRight, rightBound);

      if (segLeft < minStation) minStation = segLeft;
      if (segRight > maxStation) maxStation = segRight;
    }
  }

  return foundWetted ? maxStation - minStation : 0;
}

/**
 * Apply ineffective flow areas to reduce effective area
 */
function applyIneffectiveAreas(
  section: IrregularCrossSection,
  wsel: number,
  zones: CrossSectionGeometry['zones']
): void {
  if (!section.ineffectiveAreas) return;

  for (const ineffective of section.ineffectiveAreas) {
    // Check if ineffective area is active
    if (!ineffective.permanent && wsel >= ineffective.elevation) {
      continue; // Area becomes effective when water rises above threshold
    }

    // Determine which zone(s) the ineffective area affects
    const midStation = (ineffective.leftStation + ineffective.rightStation) / 2;

    // Calculate area to remove (simplified - assumes rectangular slice)
    const width = ineffective.rightStation - ineffective.leftStation;
    const depth = Math.max(0, wsel - getGroundElevationAtStation(section, midStation));
    const areaToRemove = width * depth;

    if (midStation < section.bankStations.leftBank) {
      zones.leftOverbank.area = Math.max(0, zones.leftOverbank.area - areaToRemove);
    } else if (midStation > section.bankStations.rightBank) {
      zones.rightOverbank.area = Math.max(0, zones.rightOverbank.area - areaToRemove);
    }
    // Note: Ineffective areas are typically not in main channel
  }
}

/**
 * Apply levees to block overbank flow
 */
function applyLevees(
  section: IrregularCrossSection,
  wsel: number,
  zones: CrossSectionGeometry['zones']
): void {
  if (!section.levees) return;

  for (const levee of section.levees) {
    // If water is below levee, block flow in that overbank
    if (wsel < levee.elevation) {
      if (levee.side === 'left') {
        zones.leftOverbank.area = 0;
        zones.leftOverbank.wettedPerimeter = 0;
        zones.leftOverbank.topWidth = 0;
        zones.leftOverbank.conveyance = 0;
      } else {
        zones.rightOverbank.area = 0;
        zones.rightOverbank.wettedPerimeter = 0;
        zones.rightOverbank.topWidth = 0;
        zones.rightOverbank.conveyance = 0;
      }
    }
  }
}

/**
 * Get ground elevation at a specific station
 */
function getGroundElevationAtStation(section: IrregularCrossSection, station: number): number {
  return interpolateElevation(section.stationElevation, station) ?? 0;
}

/**
 * Calculate alpha (kinetic energy) and beta (momentum) coefficients
 * These account for non-uniform velocity distribution across the section
 */
function calculateDistributionCoefficients(
  zones: CrossSectionGeometry['zones'],
  totalArea: number,
  totalConveyance: number
): { alpha: number; beta: number } {
  if (totalArea <= 0 || totalConveyance <= 0) {
    return { alpha: 1.0, beta: 1.0 };
  }

  // α = Σ(Ki³/Ai²) / (Kt³/At²)
  // β = Σ(Ki²/Ai) / (Kt²/At)

  let sumAlpha = 0;
  let sumBeta = 0;

  for (const zone of Object.values(zones)) {
    if (zone.area > 0 && zone.conveyance > 0) {
      sumAlpha += Math.pow(zone.conveyance, 3) / Math.pow(zone.area, 2);
      sumBeta += Math.pow(zone.conveyance, 2) / zone.area;
    }
  }

  const alpha = sumAlpha / (Math.pow(totalConveyance, 3) / Math.pow(totalArea, 2));
  const beta = sumBeta / (Math.pow(totalConveyance, 2) / totalArea);

  return { alpha, beta };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a simple trapezoidal prismatic section
 */
export function createTrapezoidalSection(
  bottomWidth: number,
  sideSlope: number
): TrapezoidalSection {
  return {
    shape: 'trapezoidal',
    bottomWidth,
    leftSideSlope: sideSlope,
    rightSideSlope: sideSlope,
  };
}

/**
 * Create a simple rectangular section
 */
export function createRectangularSection(bottomWidth: number): RectangularSection {
  return {
    shape: 'rectangular',
    bottomWidth,
  };
}

/**
 * Create a simple triangular section
 */
export function createTriangularSection(sideSlope: number): TriangularSection {
  return {
    shape: 'triangular',
    leftSideSlope: sideSlope,
    rightSideSlope: sideSlope,
  };
}

/**
 * Create a circular section (for culverts/tunnels)
 */
export function createCircularSection(diameter: number): CircularSection {
  return {
    shape: 'circular',
    diameter,
  };
}

/**
 * Convert depth to water surface elevation for irregular section
 */
export function depthToWSEL(section: IrregularCrossSection, depth: number): number {
  return getMinimumElevation(section) + depth;
}

/**
 * Convert water surface elevation to depth for irregular section
 */
export function wselToDepth(section: IrregularCrossSection, wsel: number): number {
  return wsel - getMinimumElevation(section);
}

/**
 * Interpolate cross-section geometry between two sections
 * Used for generating intermediate sections in GVF computation
 */
export function interpolateCrossSection(
  xs1: IrregularCrossSection,
  xs2: IrregularCrossSection,
  distance: number, // Distance from xs1
  totalDistance: number // Total distance between xs1 and xs2
): IrregularCrossSection {
  const t = distance / totalDistance;

  // Interpolate station-elevation points
  // This is simplified - assumes both sections have same number of points
  const interpolatedStations: StationElevation[] = [];

  const minPoints = Math.min(xs1.stationElevation.length, xs2.stationElevation.length);
  for (let i = 0; i < minPoints; i++) {
    interpolatedStations.push({
      station: xs1.stationElevation[i].station * (1 - t) + xs2.stationElevation[i].station * t,
      elevation: xs1.stationElevation[i].elevation * (1 - t) + xs2.stationElevation[i].elevation * t,
    });
  }

  return {
    id: `${xs1.id}_${xs2.id}_interp`,
    riverStation: xs1.riverStation * (1 - t) + xs2.riverStation * t,
    description: `Interpolated between ${xs1.id} and ${xs2.id}`,
    stationElevation: interpolatedStations,
    bankStations: {
      leftBank: xs1.bankStations.leftBank * (1 - t) + xs2.bankStations.leftBank * t,
      rightBank: xs1.bankStations.rightBank * (1 - t) + xs2.bankStations.rightBank * t,
    },
    manningsN: {
      leftOverbank: xs1.manningsN.leftOverbank * (1 - t) + xs2.manningsN.leftOverbank * t,
      mainChannel: xs1.manningsN.mainChannel * (1 - t) + xs2.manningsN.mainChannel * t,
      rightOverbank: xs1.manningsN.rightOverbank * (1 - t) + xs2.manningsN.rightOverbank * t,
    },
    reachLengths: {
      leftOverbank: distance,
      mainChannel: distance,
      rightOverbank: distance,
    },
    contractionCoeff: (xs1.contractionCoeff ?? 0.1) * (1 - t) + (xs2.contractionCoeff ?? 0.1) * t,
    expansionCoeff: (xs1.expansionCoeff ?? 0.3) * (1 - t) + (xs2.expansionCoeff ?? 0.3) * t,
  };
}

/**
 * Validate cross-section data
 */
export function validateCrossSection(section: IrregularCrossSection): string[] {
  const errors: string[] = [];

  if (section.stationElevation.length < 3) {
    errors.push('Cross-section must have at least 3 points');
  }

  const sorted = [...section.stationElevation].sort((a, b) => a.station - b.station);
  const minStation = sorted[0]?.station ?? 0;
  const maxStation = sorted[sorted.length - 1]?.station ?? 0;

  if (section.bankStations.leftBank < minStation || section.bankStations.leftBank > maxStation) {
    errors.push('Left bank station is outside cross-section bounds');
  }

  if (section.bankStations.rightBank < minStation || section.bankStations.rightBank > maxStation) {
    errors.push('Right bank station is outside cross-section bounds');
  }

  if (section.bankStations.leftBank >= section.bankStations.rightBank) {
    errors.push('Left bank station must be less than right bank station');
  }

  if (section.manningsN.leftOverbank <= 0 || section.manningsN.mainChannel <= 0 || section.manningsN.rightOverbank <= 0) {
    errors.push("Manning's n values must be positive");
  }

  return errors;
}
