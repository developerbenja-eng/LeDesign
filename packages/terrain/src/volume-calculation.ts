/**
 * Volume Calculation Service
 * Calculates cut/fill volumes between two surfaces (existing vs proposed)
 *
 * Key features:
 * - Grid-based volume calculation using average end area method
 * - Barycentric interpolation for sampling TIN surfaces
 * - Cross-section analysis along alignments
 * - Mass haul diagram generation
 * - Cut/fill heat map generation
 */

export interface Surface {
  vertices: Array<{ x: number; y: number; z: number }>;
  triangles: number[][];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export interface VolumeResult {
  cutVolume: number; // m³
  fillVolume: number; // m³
  netVolume: number; // m³ (cut - fill)
  area: number; // m²
  cutArea: number; // m²
  fillArea: number; // m²
  noChangeArea: number; // m²
  avgCutDepth: number; // m
  avgFillDepth: number; // m
  maxCutDepth: number; // m
  maxFillDepth: number; // m
  gridResolution: number; // m
  gridPoints: number;
}

export interface VolumeGridCell {
  x: number;
  y: number;
  existingZ: number | null;
  proposedZ: number | null;
  difference: number | null; // proposed - existing (+ = fill, - = cut)
  area: number; // cell area in m²
  volume: number; // cell volume in m³
  type: 'cut' | 'fill' | 'no-change' | 'undefined';
}

export interface VolumeGrid {
  cells: VolumeGridCell[];
  rows: number;
  cols: number;
  cellSize: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Calculate volumes between existing and proposed surfaces using grid method
 *
 * @param existingSurface - Original terrain surface
 * @param proposedSurface - Designed/proposed surface
 * @param gridResolution - Grid cell size in meters (default: 1m)
 * @returns Volume calculation results
 */
export function calculateVolumes(
  existingSurface: Surface,
  proposedSurface: Surface,
  gridResolution: number = 1.0
): VolumeResult {
  // Create grid covering both surfaces
  const grid = createVolumeGrid(existingSurface, proposedSurface, gridResolution);

  // Calculate volumes from grid
  let cutVolume = 0;
  let fillVolume = 0;
  let cutArea = 0;
  let fillArea = 0;
  let noChangeArea = 0;

  let maxCutDepth = 0;
  let maxFillDepth = 0;
  let totalCutDepth = 0;
  let totalFillDepth = 0;
  let cutCells = 0;
  let fillCells = 0;

  const tolerance = 0.01; // 1cm tolerance for "no change"

  for (const cell of grid.cells) {
    if (cell.type === 'cut') {
      cutVolume += Math.abs(cell.volume);
      cutArea += cell.area;
      totalCutDepth += Math.abs(cell.difference!);
      cutCells++;
      maxCutDepth = Math.max(maxCutDepth, Math.abs(cell.difference!));
    } else if (cell.type === 'fill') {
      fillVolume += cell.volume;
      fillArea += cell.area;
      totalFillDepth += cell.difference!;
      fillCells++;
      maxFillDepth = Math.max(maxFillDepth, cell.difference!);
    } else if (cell.type === 'no-change') {
      noChangeArea += cell.area;
    }
  }

  const totalArea = cutArea + fillArea + noChangeArea;
  const netVolume = fillVolume - cutVolume;

  return {
    cutVolume,
    fillVolume,
    netVolume,
    area: totalArea,
    cutArea,
    fillArea,
    noChangeArea,
    avgCutDepth: cutCells > 0 ? totalCutDepth / cutCells : 0,
    avgFillDepth: fillCells > 0 ? totalFillDepth / fillCells : 0,
    maxCutDepth,
    maxFillDepth,
    gridResolution,
    gridPoints: grid.cells.length,
  };
}

/**
 * Create a grid covering both surfaces and sample elevations
 */
export function createVolumeGrid(
  existingSurface: Surface,
  proposedSurface: Surface,
  cellSize: number
): VolumeGrid {
  // Find combined bounds
  const bounds = {
    minX: Math.min(existingSurface.bounds.minX, proposedSurface.bounds.minX),
    maxX: Math.max(existingSurface.bounds.maxX, proposedSurface.bounds.maxX),
    minY: Math.min(existingSurface.bounds.minY, proposedSurface.bounds.minY),
    maxY: Math.max(existingSurface.bounds.maxY, proposedSurface.bounds.maxY),
  };

  const rangeX = bounds.maxX - bounds.minX;
  const rangeY = bounds.maxY - bounds.minY;

  const cols = Math.ceil(rangeX / cellSize);
  const rows = Math.ceil(rangeY / cellSize);

  const cells: VolumeGridCell[] = [];
  const tolerance = 0.01; // 1cm tolerance

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Cell center point
      const x = bounds.minX + (col + 0.5) * cellSize;
      const y = bounds.minY + (row + 0.5) * cellSize;

      // Sample both surfaces at this point
      const existingZ = sampleSurfaceAt(existingSurface, x, y);
      const proposedZ = sampleSurfaceAt(proposedSurface, x, y);

      // Calculate difference and type
      let difference: number | null = null;
      let type: VolumeGridCell['type'] = 'undefined';
      let volume = 0;

      if (existingZ !== null && proposedZ !== null) {
        difference = proposedZ - existingZ;

        if (Math.abs(difference) < tolerance) {
          type = 'no-change';
        } else if (difference > 0) {
          type = 'fill';
          volume = difference * cellSize * cellSize;
        } else {
          type = 'cut';
          volume = difference * cellSize * cellSize; // negative
        }
      }

      cells.push({
        x,
        y,
        existingZ,
        proposedZ,
        difference,
        area: cellSize * cellSize,
        volume,
        type,
      });
    }
  }

  return {
    cells,
    rows,
    cols,
    cellSize,
    bounds,
  };
}

/**
 * Sample elevation from a TIN surface at a given point
 * Uses barycentric interpolation within triangles
 */
export function sampleSurfaceAt(surface: Surface, x: number, y: number): number | null {
  // Check if point is within surface bounds
  if (
    x < surface.bounds.minX ||
    x > surface.bounds.maxX ||
    y < surface.bounds.minY ||
    y > surface.bounds.maxY
  ) {
    return null;
  }

  // Find triangle containing this point
  for (const triangle of surface.triangles) {
    const v0 = surface.vertices[triangle[0]];
    const v1 = surface.vertices[triangle[1]];
    const v2 = surface.vertices[triangle[2]];

    // Check if point is inside triangle using barycentric coordinates
    const bary = getBarycentricCoordinates(x, y, v0, v1, v2);

    if (bary && bary.u >= 0 && bary.v >= 0 && bary.u + bary.v <= 1) {
      // Point is inside triangle - interpolate Z
      const w = 1 - bary.u - bary.v;
      return w * v0.z + bary.u * v1.z + bary.v * v2.z;
    }
  }

  return null; // Point not found in any triangle
}

/**
 * Calculate barycentric coordinates for a point in a triangle
 */
function getBarycentricCoordinates(
  px: number,
  py: number,
  v0: { x: number; y: number; z: number },
  v1: { x: number; y: number; z: number },
  v2: { x: number; y: number; z: number }
): { u: number; v: number } | null {
  const v0x = v1.x - v0.x;
  const v0y = v1.y - v0.y;
  const v1x = v2.x - v0.x;
  const v1y = v2.y - v0.y;
  const v2x = px - v0.x;
  const v2y = py - v0.y;

  const den = v0x * v1y - v1x * v0y;

  if (Math.abs(den) < 1e-10) {
    return null; // Degenerate triangle
  }

  const v = (v2x * v1y - v1x * v2y) / den;
  const u = (v0x * v2y - v2x * v0y) / den;

  return { u, v };
}

/**
 * Cross section at a specific station
 */
export interface CrossSection {
  station: number; // distance along alignment
  x: number;
  y: number;
  existingZ: number | null;
  proposedZ: number | null;
  cutDepth: number | null;
  fillDepth: number | null;
}

/**
 * Calculate cross sections at regular intervals along an alignment
 *
 * @param existingSurface - Original terrain surface
 * @param proposedSurface - Designed/proposed surface
 * @param alignment - Path defined by x,y points
 * @param interval - Spacing between cross sections in meters (default: 20m)
 * @returns Array of cross sections
 */
export function calculateCrossSections(
  existingSurface: Surface,
  proposedSurface: Surface,
  alignment: Array<{ x: number; y: number }>,
  interval: number = 20
): CrossSection[] {
  const sections: CrossSection[] = [];
  let totalDistance = 0;

  for (let i = 0; i < alignment.length - 1; i++) {
    const p1 = alignment[i];
    const p2 = alignment[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    const numSamples = Math.ceil(segmentLength / interval);

    for (let j = 0; j <= numSamples; j++) {
      const t = j / numSamples;
      const x = p1.x + t * dx;
      const y = p1.y + t * dy;
      const station = totalDistance + t * segmentLength;

      const existingZ = sampleSurfaceAt(existingSurface, x, y);
      const proposedZ = sampleSurfaceAt(proposedSurface, x, y);

      let cutDepth: number | null = null;
      let fillDepth: number | null = null;

      if (existingZ !== null && proposedZ !== null) {
        const diff = proposedZ - existingZ;
        if (diff < 0) {
          cutDepth = Math.abs(diff);
        } else if (diff > 0) {
          fillDepth = diff;
        }
      }

      sections.push({
        station,
        x,
        y,
        existingZ,
        proposedZ,
        cutDepth,
        fillDepth,
      });
    }

    totalDistance += segmentLength;
  }

  return sections;
}

/**
 * Cut/fill heat map for visualization
 */
export interface CutFillHeatMap {
  points: Array<{
    x: number;
    y: number;
    depth: number;
    type: 'cut' | 'fill' | 'no-change';
  }>;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  minDepth: number;
  maxDepth: number;
}

/**
 * Generate a heat map of cut/fill depths for visualization
 *
 * @param grid - Volume grid with calculated differences
 * @param includeNoChange - Whether to include no-change points (default: false)
 * @returns Heat map data structure
 */
export function generateCutFillHeatMap(
  grid: VolumeGrid,
  includeNoChange: boolean = false
): CutFillHeatMap {
  const points: CutFillHeatMap['points'] = [];
  let minDepth = Infinity;
  let maxDepth = -Infinity;

  for (const cell of grid.cells) {
    if (cell.type === 'undefined') continue;
    if (!includeNoChange && cell.type === 'no-change') continue;

    const depth = cell.difference || 0;
    points.push({
      x: cell.x,
      y: cell.y,
      depth: Math.abs(depth),
      type: cell.type,
    });

    minDepth = Math.min(minDepth, Math.abs(depth));
    maxDepth = Math.max(maxDepth, Math.abs(depth));
  }

  return {
    points,
    bounds: grid.bounds,
    minDepth: minDepth === Infinity ? 0 : minDepth,
    maxDepth: maxDepth === -Infinity ? 0 : maxDepth,
  };
}

/**
 * Mass haul station data for earthwork distribution analysis
 */
export interface MassHaulStation {
  station: number;
  cumulativeVolume: number; // m³
  freeHaul: number;
  overHaul: number;
}

/**
 * Calculate mass haul diagram data for earthwork distribution
 *
 * Used to optimize haul distances and identify balance points.
 *
 * @param sections - Cross sections along alignment
 * @param freeHaulDistance - Distance within which haul is "free" (default: 100m)
 * @returns Array of mass haul stations
 */
export function calculateMassHaul(
  sections: CrossSection[],
  freeHaulDistance: number = 100
): MassHaulStation[] {
  const stations: MassHaulStation[] = [];
  let cumulative = 0;

  for (let i = 0; i < sections.length - 1; i++) {
    const s1 = sections[i];
    const s2 = sections[i + 1];
    const distance = s2.station - s1.station;

    // Average end area method
    const area1 = (s1.fillDepth || 0) - (s1.cutDepth || 0);
    const area2 = (s2.fillDepth || 0) - (s2.cutDepth || 0);

    const volume = ((area1 + area2) / 2) * distance;
    cumulative += volume;

    // Simple free haul / overhaul split (can be enhanced)
    const freeHaul = Math.min(Math.abs(volume), freeHaulDistance * Math.abs(area1 + area2) / 2);
    const overHaul = Math.abs(volume) - freeHaul;

    stations.push({
      station: s2.station,
      cumulativeVolume: cumulative,
      freeHaul,
      overHaul,
    });
  }

  return stations;
}
