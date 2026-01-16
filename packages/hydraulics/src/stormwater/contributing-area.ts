/**
 * Contributing Area Analysis Module
 *
 * Functions for:
 * - Watershed/catchment delineation
 * - Flow path calculation
 * - Slope analysis
 * - Impervious area calculation
 * - Time of concentration estimation
 *
 * Works with DEM data and CAD entities
 */

import { RUNOFF_COEFFICIENTS } from './regional-data';

// ============================================
// TYPES
// ============================================

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface ContributingAreaInput {
  outletPoint: Point2D;
  boundaryPolygon?: Point2D[];
  demData?: DEMGridData;
  manualAreas?: ManualAreaInput[];
}

export interface DEMGridData {
  width: number;
  height: number;
  cellSize: number; // meters
  originX: number;
  originY: number;
  elevations: number[][]; // [row][col]
  noDataValue?: number;
}

export interface ManualAreaInput {
  polygon: Point2D[];
  surfaceType: string;
  slope?: number;
  name?: string;
}

export interface ContributingAreaResult {
  totalArea: number; // m²
  totalAreaHa: number; // hectares
  imperviousArea: number; // m²
  perviousArea: number; // m²
  imperviousPercent: number;
  weightedSlope: number; // %
  flowPath: FlowPath;
  centroid: Point2D;
  subAreas: SubAreaResult[];
  timeOfConcentration: number; // minutes
}

export interface FlowPath {
  length: number; // m
  points: Point3D[];
  averageSlope: number; // %
  maxSlope: number; // %
  minSlope: number; // %
}

export interface SubAreaResult {
  name: string;
  area: number; // m²
  surfaceType: string;
  runoffCoefficient: number;
  slope: number; // %
  isImpervious: boolean;
}

// ============================================
// POLYGON GEOMETRY FUNCTIONS
// ============================================

/**
 * Calculate area of a polygon using Shoelace formula
 */
export function calculatePolygonArea(polygon: Point2D[]): number {
  if (polygon.length < 3) return 0;

  let area = 0;
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Calculate centroid of a polygon
 */
export function calculateCentroid(polygon: Point2D[]): Point2D {
  if (polygon.length === 0) return { x: 0, y: 0 };

  let cx = 0;
  let cy = 0;
  const n = polygon.length;

  for (const point of polygon) {
    cx += point.x;
    cy += point.y;
  }

  return { x: cx / n, y: cy / n };
}

/**
 * Calculate perimeter of a polygon
 */
export function calculatePerimeter(polygon: Point2D[]): number {
  if (polygon.length < 2) return 0;

  let perimeter = 0;
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = polygon[j].x - polygon[i].x;
    const dy = polygon[j].y - polygon[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  return perimeter;
}

/**
 * Check if a point is inside a polygon (ray casting)
 */
export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate bounding box of polygon
 */
export function getBoundingBox(polygon: Point2D[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (polygon.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = polygon[0].x;
  let maxX = polygon[0].x;
  let minY = polygon[0].y;
  let maxY = polygon[0].y;

  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ============================================
// SLOPE ANALYSIS
// ============================================

/**
 * Calculate slope from DEM grid at a point
 */
export function calculateSlopeAtPoint(
  dem: DEMGridData,
  x: number,
  y: number
): number | null {
  const col = Math.floor((x - dem.originX) / dem.cellSize);
  const row = Math.floor((y - dem.originY) / dem.cellSize);

  // Check bounds (need 3x3 window)
  if (row < 1 || row >= dem.height - 1 || col < 1 || col >= dem.width - 1) {
    return null;
  }

  // Get 3x3 elevation window
  const z = dem.elevations;
  const noData = dem.noDataValue ?? -9999;

  // Check for nodata
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (z[row + dr][col + dc] === noData) return null;
    }
  }

  // Calculate slope using 3x3 window (Horn's method)
  const dzdx = (
    (z[row-1][col+1] + 2*z[row][col+1] + z[row+1][col+1]) -
    (z[row-1][col-1] + 2*z[row][col-1] + z[row+1][col-1])
  ) / (8 * dem.cellSize);

  const dzdy = (
    (z[row+1][col-1] + 2*z[row+1][col] + z[row+1][col+1]) -
    (z[row-1][col-1] + 2*z[row-1][col] + z[row-1][col+1])
  ) / (8 * dem.cellSize);

  const slopeRadians = Math.atan(Math.sqrt(dzdx*dzdx + dzdy*dzdy));
  const slopePercent = Math.tan(slopeRadians) * 100;

  return slopePercent;
}

/**
 * Calculate average slope within a polygon
 */
export function calculateAverageSlope(
  dem: DEMGridData,
  polygon: Point2D[]
): { average: number; max: number; min: number } {
  const bbox = getBoundingBox(polygon);
  const slopes: number[] = [];

  // Sample points within polygon
  const step = dem.cellSize;
  for (let x = bbox.minX; x <= bbox.maxX; x += step) {
    for (let y = bbox.minY; y <= bbox.maxY; y += step) {
      if (pointInPolygon({ x, y }, polygon)) {
        const slope = calculateSlopeAtPoint(dem, x, y);
        if (slope !== null) {
          slopes.push(slope);
        }
      }
    }
  }

  if (slopes.length === 0) {
    return { average: 0, max: 0, min: 0 };
  }

  const average = slopes.reduce((a, b) => a + b, 0) / slopes.length;
  const max = Math.max(...slopes);
  const min = Math.min(...slopes);

  return { average, max, min };
}

/**
 * Calculate slope from two points
 */
export function calculateSlopeBetweenPoints(p1: Point3D, p2: Point3D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const horizontalDist = Math.sqrt(dx*dx + dy*dy);

  if (horizontalDist === 0) return 0;

  return (Math.abs(dz) / horizontalDist) * 100;
}

// ============================================
// FLOW PATH ANALYSIS
// ============================================

/**
 * Find longest flow path from DEM
 */
export function findLongestFlowPath(
  dem: DEMGridData,
  polygon: Point2D[],
  outletPoint: Point2D
): FlowPath {
  // Simplified: find highest point and trace to outlet
  const bbox = getBoundingBox(polygon);
  let highestPoint: Point3D | null = null;
  let maxElevation = -Infinity;

  // Find highest point in catchment
  const step = dem.cellSize;
  for (let x = bbox.minX; x <= bbox.maxX; x += step) {
    for (let y = bbox.minY; y <= bbox.maxY; y += step) {
      if (pointInPolygon({ x, y }, polygon)) {
        const col = Math.floor((x - dem.originX) / dem.cellSize);
        const row = Math.floor((y - dem.originY) / dem.cellSize);

        if (row >= 0 && row < dem.height && col >= 0 && col < dem.width) {
          const z = dem.elevations[row][col];
          if (z !== dem.noDataValue && z > maxElevation) {
            maxElevation = z;
            highestPoint = { x, y, z };
          }
        }
      }
    }
  }

  if (!highestPoint) {
    return {
      length: 0,
      points: [],
      averageSlope: 0,
      maxSlope: 0,
      minSlope: 0,
    };
  }

  // Get outlet elevation
  const outletCol = Math.floor((outletPoint.x - dem.originX) / dem.cellSize);
  const outletRow = Math.floor((outletPoint.y - dem.originY) / dem.cellSize);
  const outletZ = outletRow >= 0 && outletRow < dem.height && outletCol >= 0 && outletCol < dem.width
    ? dem.elevations[outletRow][outletCol]
    : 0;

  // Create simple path (straight line for now - could enhance with D8 flow direction)
  const outletPoint3D: Point3D = { ...outletPoint, z: outletZ };
  const points: Point3D[] = [highestPoint, outletPoint3D];

  // Calculate path length
  const dx = outletPoint.x - highestPoint.x;
  const dy = outletPoint.y - highestPoint.y;
  const length = Math.sqrt(dx*dx + dy*dy);

  // Calculate slope
  const slopePercent = length > 0
    ? (Math.abs(highestPoint.z - outletZ) / length) * 100
    : 0;

  return {
    length,
    points,
    averageSlope: slopePercent,
    maxSlope: slopePercent,
    minSlope: slopePercent,
  };
}

/**
 * Estimate flow path length from area (empirical)
 */
export function estimateFlowPathLength(areaM2: number): number {
  // Empirical relationship: L ≈ 1.4 × A^0.6
  // Where L is in meters and A is in m²
  return 1.4 * Math.pow(areaM2, 0.6);
}

// ============================================
// CONTRIBUTING AREA CALCULATION
// ============================================

/**
 * Analyze contributing area from manual polygon inputs
 */
export function analyzeContributingArea(
  input: ContributingAreaInput
): ContributingAreaResult {
  const subAreas: SubAreaResult[] = [];
  let totalArea = 0;
  let imperviousArea = 0;
  let perviousArea = 0;
  let weightedSlopeSum = 0;

  // Process manual area inputs
  if (input.manualAreas) {
    for (const area of input.manualAreas) {
      const areaM2 = calculatePolygonArea(area.polygon);
      const coefficient = RUNOFF_COEFFICIENTS.find(c => c.id === area.surfaceType);
      const c = coefficient?.cTypical ?? 0.5;
      const isImpervious = c >= 0.7;
      const slope = area.slope ?? 2;

      subAreas.push({
        name: area.name || area.surfaceType,
        area: areaM2,
        surfaceType: area.surfaceType,
        runoffCoefficient: c,
        slope,
        isImpervious,
      });

      totalArea += areaM2;
      weightedSlopeSum += slope * areaM2;

      if (isImpervious) {
        imperviousArea += areaM2;
      } else {
        perviousArea += areaM2;
      }
    }
  }

  // If no manual areas but boundary provided, calculate from boundary
  if (input.boundaryPolygon && totalArea === 0) {
    totalArea = calculatePolygonArea(input.boundaryPolygon);
  }

  // Calculate weighted average slope
  const weightedSlope = totalArea > 0 ? weightedSlopeSum / totalArea : 2;

  // Estimate flow path if no DEM
  const flowLength = input.demData
    ? findLongestFlowPath(input.demData, input.boundaryPolygon || [], input.outletPoint).length
    : estimateFlowPathLength(totalArea);

  // Create flow path result
  const flowPath: FlowPath = {
    length: flowLength,
    points: [],
    averageSlope: weightedSlope,
    maxSlope: Math.max(...subAreas.map(s => s.slope), weightedSlope),
    minSlope: Math.min(...subAreas.map(s => s.slope), weightedSlope),
  };

  // Calculate centroid
  const centroid = input.boundaryPolygon
    ? calculateCentroid(input.boundaryPolygon)
    : input.outletPoint;

  // Estimate time of concentration
  const tc = estimateTimeOfConcentration(totalArea, flowLength, weightedSlope);

  return {
    totalArea,
    totalAreaHa: totalArea / 10000,
    imperviousArea,
    perviousArea,
    imperviousPercent: totalArea > 0 ? (imperviousArea / totalArea) * 100 : 0,
    weightedSlope,
    flowPath,
    centroid,
    subAreas,
    timeOfConcentration: tc,
  };
}

/**
 * Estimate time of concentration
 */
function estimateTimeOfConcentration(
  areaM2: number,
  flowLength: number,
  slope: number
): number {
  if (flowLength <= 0 || slope <= 0) {
    // Fallback based on area
    const areaHa = areaM2 / 10000;
    if (areaHa < 5) return 15;
    if (areaHa < 50) return 30;
    if (areaHa < 500) return 60;
    return 120;
  }

  // Kirpich formula
  const slopeFraction = slope / 100;
  const tc = 0.0195 * Math.pow(flowLength, 0.77) * Math.pow(slopeFraction, -0.385);

  return Math.max(5, Math.round(tc));
}

// ============================================
// DISCHARGE ESTIMATION
// ============================================

export interface DischargeCheckInput {
  contributingArea: ContributingAreaResult;
  intensity: number; // mm/hr
  returnPeriod: number;
}

export interface DischargeCheckResult {
  peakDischarge: number; // L/s
  peakDischargeM3s: number; // m³/s
  specificDischarge: number; // L/s/ha
  runoffVolume: number; // m³
  weightedC: number;
  meetsCapacity: boolean;
  requiredCapacity?: number;
  warnings: string[];
}

/**
 * Calculate discharge from contributing area
 */
export function calculateDischargeFromArea(
  input: DischargeCheckInput
): DischargeCheckResult {
  const warnings: string[] = [];
  const { contributingArea, intensity } = input;

  // Calculate weighted C
  let weightedC = 0;
  if (contributingArea.subAreas.length > 0) {
    const totalArea = contributingArea.subAreas.reduce((sum, a) => sum + a.area, 0);
    weightedC = contributingArea.subAreas.reduce(
      (sum, a) => sum + a.runoffCoefficient * a.area,
      0
    ) / totalArea;
  } else {
    // Estimate from impervious percentage
    weightedC = 0.3 + (contributingArea.imperviousPercent / 100) * 0.6;
  }

  // Rational method: Q = C × i × A
  const areaHa = contributingArea.totalAreaHa;
  const peakDischarge = weightedC * intensity * areaHa * 2.78; // L/s
  const peakDischargeM3s = peakDischarge / 1000;

  // Specific discharge
  const specificDischarge = areaHa > 0 ? peakDischarge / areaHa : 0;

  // Runoff volume for storm duration (tc)
  const durationHours = contributingArea.timeOfConcentration / 60;
  const runoffVolume = weightedC * intensity * (contributingArea.totalArea / 1000) * durationHours;

  // Warnings
  if (areaHa > 200) {
    warnings.push('Area exceeds 200 ha - rational method may not be accurate');
  }
  if (contributingArea.imperviousPercent > 80) {
    warnings.push('High impervious percentage - consider SUDS to reduce runoff');
  }
  if (specificDischarge > 500) {
    warnings.push('High specific discharge - verify design capacity');
  }

  return {
    peakDischarge,
    peakDischargeM3s,
    specificDischarge,
    runoffVolume,
    weightedC,
    meetsCapacity: true,
    warnings,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert CAD entities to polygons for area analysis
 */
export function entitiesGroupsToAreas(
  entities: Array<{ vertices: Point2D[]; layer: string }>
): ManualAreaInput[] {
  return entities.map(entity => ({
    polygon: entity.vertices,
    surfaceType: inferSurfaceTypeFromLayer(entity.layer),
    name: entity.layer,
  }));
}

/**
 * Infer surface type from layer name
 */
function inferSurfaceTypeFromLayer(layerName: string): string {
  const lower = layerName.toLowerCase();

  if (lower.includes('roof') || lower.includes('techo')) return 'roof_metal';
  if (lower.includes('asphalt') || lower.includes('asfalto')) return 'asphalt';
  if (lower.includes('concrete') || lower.includes('hormigon')) return 'concrete';
  if (lower.includes('grass') || lower.includes('cesped') || lower.includes('pasto')) return 'grass_flat';
  if (lower.includes('gravel') || lower.includes('grava')) return 'gravel';
  if (lower.includes('parking') || lower.includes('estacion')) return 'asphalt';
  if (lower.includes('garden') || lower.includes('jardin')) return 'grass_flat';
  if (lower.includes('permeable')) return 'permeable_paver';

  // Default to medium density residential
  return 'residential_medium';
}

/**
 * Format area for display
 */
export function formatArea(areaM2: number): string {
  if (areaM2 < 10000) {
    return `${areaM2.toFixed(0)} m²`;
  }
  return `${(areaM2 / 10000).toFixed(2)} ha`;
}
