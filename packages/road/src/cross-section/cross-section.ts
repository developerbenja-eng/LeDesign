/**
 * Cross-Section Generator
 *
 * Generates road cross-sections including:
 * - Lane widths and slopes
 * - Shoulders and medians
 * - Sidewalks and bike lanes
 * - Curbs and gutters
 * - Cut/fill slopes
 *
 * References:
 * - REDEVU (Chilean urban road standards)
 * - MOP Manual de Carreteras Vol. 3
 * - AASHTO Green Book
 *
 * @module road-geometry/cross-section
 */

import { RoadClassificationType, MINIMUM_LANE_WIDTH, MINIMUM_SIDEWALK_WIDTH } from '../design-tables';

// ============================================================================
// Types
// ============================================================================

export interface CrossSectionElement {
  /** Element type */
  type:
    | 'lane'
    | 'shoulder'
    | 'median'
    | 'sidewalk'
    | 'bike_lane'
    | 'parking'
    | 'gutter'
    | 'curb'
    | 'planting_strip'
    | 'cut_slope'
    | 'fill_slope'
    | 'ditch';
  /** Width of element (m) */
  width: number;
  /** Cross slope (%, positive = away from centerline) */
  slope: number;
  /** Material or surface type */
  material?: string;
  /** Position: left or right of centerline, or center for median */
  position: 'left' | 'right' | 'center';
  /** Order from centerline (0 = at centerline) */
  order: number;
  /** Offset from centerline to inner edge (m) */
  offset: number;
  /** Description */
  description?: string;
}

export interface CurbSpec {
  /** Curb type */
  type: 'barrier' | 'mountable' | 'rolled' | 'vertical' | 'none';
  /** Face height (m) */
  height: number;
  /** Curb width (m) */
  width: number;
  /** Gutter width (m) */
  gutterWidth: number;
  /** Gutter depth at curb (m) */
  gutterDepth: number;
}

export interface CrossSectionInput {
  /** Road classification */
  classification: RoadClassificationType;
  /** Number of lanes per direction */
  lanesPerDirection: number;
  /** Lane width (m) */
  laneWidth?: number;
  /** Include parking */
  parking?: 'none' | 'left' | 'right' | 'both';
  /** Parking lane width (m) */
  parkingWidth?: number;
  /** Include bike lane */
  bikeLane?: 'none' | 'left' | 'right' | 'both';
  /** Bike lane width (m) */
  bikeLaneWidth?: number;
  /** Include median */
  median?: boolean;
  /** Median width (m) */
  medianWidth?: number;
  /** Sidewalk configuration */
  sidewalk?: 'none' | 'left' | 'right' | 'both';
  /** Sidewalk width (m) */
  sidewalkWidth?: number;
  /** Include planting strip between curb and sidewalk */
  plantingStrip?: boolean;
  /** Planting strip width (m) */
  plantingStripWidth?: number;
  /** Curb specification */
  curb?: CurbSpec;
  /** Crown slope (%) */
  crownSlope?: number;
  /** Superelevation (%, overrides crown) */
  superelevation?: number;
  /** Road environment */
  environment?: 'urban' | 'suburban' | 'rural';
}

export interface CrossSectionResult {
  /** All cross-section elements */
  elements: CrossSectionElement[];
  /** Total right-of-way width (m) */
  totalWidth: number;
  /** Total pavement width (m) */
  pavementWidth: number;
  /** Roadway width (lanes only) (m) */
  roadwayWidth: number;
  /** Width from centerline to right edge (m) */
  rightHalfWidth: number;
  /** Width from centerline to left edge (m) */
  leftHalfWidth: number;
  /** Curb-to-curb width (m) */
  curbToCurb: number;
  /** Crown or superelevation slope (%) */
  crossSlope: number;
  /** Road classification used */
  classification: RoadClassificationType;
  /** Summary description */
  description: string;
}

export type CrownType = 'normal' | 'inverted' | 'tangent_section' | 'superelevated';

export interface CrownResult {
  /** Crown type */
  type: CrownType;
  /** Left side slope (%) */
  leftSlope: number;
  /** Right side slope (%) */
  rightSlope: number;
  /** Crown height at centerline (m) */
  crownHeight: number;
  /** High point offset from centerline (m), 0 if at center */
  highPointOffset: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Standard cross slopes */
export const STANDARD_CROSS_SLOPES = {
  pavement: 2.0, // %
  shoulder_paved: 4.0, // %
  shoulder_gravel: 6.0, // %
  sidewalk: 2.0, // % (toward road)
  gutter: 8.0, // % (for drainage)
};

/** Standard curb specifications */
export const STANDARD_CURBS: Record<string, CurbSpec> = {
  barrier: {
    type: 'barrier',
    height: 0.15,
    width: 0.15,
    gutterWidth: 0.30,
    gutterDepth: 0.03,
  },
  mountable: {
    type: 'mountable',
    height: 0.10,
    width: 0.30,
    gutterWidth: 0.30,
    gutterDepth: 0.02,
  },
  rolled: {
    type: 'rolled',
    height: 0.08,
    width: 0.45,
    gutterWidth: 0.30,
    gutterDepth: 0.02,
  },
  vertical: {
    type: 'vertical',
    height: 0.18,
    width: 0.15,
    gutterWidth: 0.45,
    gutterDepth: 0.05,
  },
};

/** Standard element widths (m) */
export const STANDARD_WIDTHS = {
  lane_minimum: 3.0,
  lane_standard: 3.5,
  lane_wide: 3.65,
  parking_parallel: 2.2,
  parking_angled: 5.0,
  bike_lane: 1.5,
  bike_lane_buffered: 2.0,
  sidewalk_minimum: 1.2,
  sidewalk_standard: 1.8,
  sidewalk_wide: 2.5,
  planting_strip: 1.5,
  median_minimum: 1.2,
  median_standard: 3.0,
  shoulder_paved: 2.5,
  shoulder_total: 3.0,
};

/** Cut/fill slope ratios (H:V) */
export const SLOPE_RATIOS = {
  cut_rock: { h: 0.25, v: 1 }, // 1/4:1
  cut_stable: { h: 1, v: 1 }, // 1:1
  cut_normal: { h: 1.5, v: 1 }, // 1.5:1
  cut_loose: { h: 2, v: 1 }, // 2:1
  fill_normal: { h: 1.5, v: 1 }, // 1.5:1
  fill_steep: { h: 2, v: 1 }, // 2:1
  fill_gentle: { h: 3, v: 1 }, // 3:1
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate complete cross-section from input parameters
 */
export function generateCrossSection(input: CrossSectionInput): CrossSectionResult {
  const {
    classification,
    lanesPerDirection,
    laneWidth = MINIMUM_LANE_WIDTH[classification],
    parking = 'none',
    parkingWidth = STANDARD_WIDTHS.parking_parallel,
    bikeLane = 'none',
    bikeLaneWidth = STANDARD_WIDTHS.bike_lane,
    median = false,
    medianWidth = STANDARD_WIDTHS.median_standard,
    sidewalk = 'both',
    sidewalkWidth = MINIMUM_SIDEWALK_WIDTH[classification],
    plantingStrip = false,
    plantingStripWidth = STANDARD_WIDTHS.planting_strip,
    curb = STANDARD_CURBS.barrier,
    crownSlope = STANDARD_CROSS_SLOPES.pavement,
    superelevation,
    environment = 'urban',
  } = input;

  const elements: CrossSectionElement[] = [];
  const crossSlope = superelevation ?? crownSlope;

  // Build from centerline outward for each side
  for (const side of ['left', 'right'] as const) {
    let offset = 0;
    let order = 0;
    const slopeSign = side === 'right' ? 1 : -1;

    // Median (only once, at center)
    if (median && side === 'right') {
      elements.push({
        type: 'median',
        width: medianWidth,
        slope: 0,
        position: 'center',
        order: 0,
        offset: -medianWidth / 2,
        description: 'Raised median',
      });
      offset = medianWidth / 2;
    }

    // Travel lanes
    for (let i = 0; i < lanesPerDirection; i++) {
      order++;
      elements.push({
        type: 'lane',
        width: laneWidth,
        slope: slopeSign * crossSlope,
        material: 'asphalt',
        position: side,
        order,
        offset,
        description: `Travel lane ${i + 1}`,
      });
      offset += laneWidth;
    }

    // Bike lane
    const includeBike =
      bikeLane === 'both' ||
      (bikeLane === 'left' && side === 'left') ||
      (bikeLane === 'right' && side === 'right');

    if (includeBike) {
      order++;
      elements.push({
        type: 'bike_lane',
        width: bikeLaneWidth,
        slope: slopeSign * crossSlope,
        material: 'asphalt',
        position: side,
        order,
        offset,
        description: 'Bike lane',
      });
      offset += bikeLaneWidth;
    }

    // Parking lane
    const includeParking =
      parking === 'both' ||
      (parking === 'left' && side === 'left') ||
      (parking === 'right' && side === 'right');

    if (includeParking) {
      order++;
      elements.push({
        type: 'parking',
        width: parkingWidth,
        slope: slopeSign * STANDARD_CROSS_SLOPES.gutter,
        material: 'asphalt',
        position: side,
        order,
        offset,
        description: 'Parallel parking',
      });
      offset += parkingWidth;
    }

    // Gutter
    if (curb.type !== 'none') {
      order++;
      elements.push({
        type: 'gutter',
        width: curb.gutterWidth,
        slope: slopeSign * STANDARD_CROSS_SLOPES.gutter,
        material: 'concrete',
        position: side,
        order,
        offset,
        description: 'Gutter',
      });
      offset += curb.gutterWidth;

      // Curb
      order++;
      elements.push({
        type: 'curb',
        width: curb.width,
        slope: 0,
        material: 'concrete',
        position: side,
        order,
        offset,
        description: `${curb.type} curb`,
      });
      offset += curb.width;
    }

    // Planting strip
    if (plantingStrip) {
      order++;
      elements.push({
        type: 'planting_strip',
        width: plantingStripWidth,
        slope: -slopeSign * 2, // Slope toward road for drainage
        material: 'landscaping',
        position: side,
        order,
        offset,
        description: 'Planting strip',
      });
      offset += plantingStripWidth;
    }

    // Sidewalk
    const includeSidewalk =
      sidewalk === 'both' ||
      (sidewalk === 'left' && side === 'left') ||
      (sidewalk === 'right' && side === 'right');

    if (includeSidewalk) {
      order++;
      elements.push({
        type: 'sidewalk',
        width: sidewalkWidth,
        slope: -slopeSign * STANDARD_CROSS_SLOPES.sidewalk,
        material: 'concrete',
        position: side,
        order,
        offset,
        description: 'Sidewalk',
      });
      offset += sidewalkWidth;
    }
  }

  // Calculate summary dimensions
  const rightElements = elements.filter((e) => e.position === 'right' || e.position === 'center');
  const leftElements = elements.filter((e) => e.position === 'left' || e.position === 'center');

  const rightHalfWidth = rightElements.reduce((sum, e) => {
    if (e.position === 'center') return sum + e.width / 2;
    return sum + e.width;
  }, 0);

  const leftHalfWidth = leftElements.reduce((sum, e) => {
    if (e.position === 'center') return sum + e.width / 2;
    return sum + e.width;
  }, 0);

  const totalWidth = leftHalfWidth + rightHalfWidth;

  // Pavement width (lanes + parking + bike lanes)
  const pavementTypes = ['lane', 'parking', 'bike_lane'];
  const pavementWidth = elements
    .filter((e) => pavementTypes.includes(e.type))
    .reduce((sum, e) => sum + e.width, 0);

  // Roadway width (lanes only)
  const roadwayWidth = elements
    .filter((e) => e.type === 'lane')
    .reduce((sum, e) => sum + e.width, 0);

  // Curb to curb
  const curbElements = elements.filter((e) => e.type === 'curb');
  const curbToCurb =
    curbElements.length > 0
      ? pavementWidth + elements.filter((e) => e.type === 'gutter').reduce((sum, e) => sum + e.width, 0)
      : pavementWidth;

  const description = generateDescription(input, totalWidth);

  return {
    elements,
    totalWidth: Math.round(totalWidth * 100) / 100,
    pavementWidth: Math.round(pavementWidth * 100) / 100,
    roadwayWidth: Math.round(roadwayWidth * 100) / 100,
    rightHalfWidth: Math.round(rightHalfWidth * 100) / 100,
    leftHalfWidth: Math.round(leftHalfWidth * 100) / 100,
    curbToCurb: Math.round(curbToCurb * 100) / 100,
    crossSlope,
    classification,
    description,
  };
}

/**
 * Generate text description of cross-section
 */
function generateDescription(input: CrossSectionInput, totalWidth: number): string {
  const parts: string[] = [];

  parts.push(`${input.classification.toUpperCase()} road`);
  parts.push(`${input.lanesPerDirection * 2} lanes`);

  if (input.median) {
    parts.push('divided');
  }

  if (input.parking && input.parking !== 'none') {
    parts.push(`parking ${input.parking}`);
  }

  if (input.bikeLane && input.bikeLane !== 'none') {
    parts.push('with bike lanes');
  }

  parts.push(`ROW ${totalWidth.toFixed(1)}m`);

  return parts.join(', ');
}

// ============================================================================
// Crown Calculation Functions
// ============================================================================

/**
 * Calculate crown elevations across section
 */
export function calculateCrown(
  roadWidth: number,
  crownType: CrownType,
  normalSlope: number = 2.0,
  superelevation: number = 0
): CrownResult {
  const halfWidth = roadWidth / 2;

  switch (crownType) {
    case 'normal':
      // Normal crown: high point at centerline, slopes both directions
      return {
        type: 'normal',
        leftSlope: -normalSlope,
        rightSlope: normalSlope,
        crownHeight: (normalSlope / 100) * halfWidth,
        highPointOffset: 0,
      };

    case 'inverted':
      // Inverted crown: low point at centerline (not common, special drainage)
      return {
        type: 'inverted',
        leftSlope: normalSlope,
        rightSlope: -normalSlope,
        crownHeight: -(normalSlope / 100) * halfWidth,
        highPointOffset: 0,
      };

    case 'tangent_section':
      // Flat: no crown, often used in transition to superelevation
      return {
        type: 'tangent_section',
        leftSlope: 0,
        rightSlope: 0,
        crownHeight: 0,
        highPointOffset: 0,
      };

    case 'superelevated':
      // Superelevation: entire section tilted one way
      return {
        type: 'superelevated',
        leftSlope: superelevation,
        rightSlope: superelevation,
        crownHeight: (superelevation / 100) * halfWidth,
        highPointOffset: -halfWidth, // High point at outside edge
      };

    default:
      return {
        type: 'normal',
        leftSlope: -normalSlope,
        rightSlope: normalSlope,
        crownHeight: (normalSlope / 100) * halfWidth,
        highPointOffset: 0,
      };
  }
}

/**
 * Get elevation at offset from centerline
 */
export function getElevationAtOffset(
  offset: number, // Positive = right of centerline
  centerlineElevation: number,
  crown: CrownResult
): number {
  if (offset >= 0) {
    // Right side
    return centerlineElevation + crown.crownHeight - (crown.rightSlope / 100) * offset;
  } else {
    // Left side
    return centerlineElevation + crown.crownHeight - (crown.leftSlope / 100) * Math.abs(offset);
  }
}

// ============================================================================
// Cut/Fill Functions
// ============================================================================

/**
 * Calculate cut or fill slope width
 */
export function calculateSlopeWidth(
  height: number, // Vertical height of cut or fill
  slopeRatio: { h: number; v: number }
): number {
  return height * (slopeRatio.h / slopeRatio.v);
}

/**
 * Add cut/fill slopes to cross-section
 */
export function addCutFillSlopes(
  section: CrossSectionResult,
  cutHeight: number,
  fillHeight: number,
  cutRatio: { h: number; v: number } = SLOPE_RATIOS.cut_normal,
  fillRatio: { h: number; v: number } = SLOPE_RATIOS.fill_normal
): CrossSectionResult {
  const newElements = [...section.elements];

  // Determine if cut or fill on each side
  // Simplified: assume same on both sides
  const isCut = cutHeight > 0;
  const isFill = fillHeight > 0;

  for (const side of ['left', 'right'] as const) {
    const maxOrder = Math.max(...section.elements.filter((e) => e.position === side).map((e) => e.order));
    const outerElement = section.elements.find((e) => e.position === side && e.order === maxOrder);
    const offset = outerElement ? outerElement.offset + outerElement.width : section.rightHalfWidth;

    if (isCut) {
      const slopeWidth = calculateSlopeWidth(cutHeight, cutRatio);
      newElements.push({
        type: 'cut_slope',
        width: slopeWidth,
        slope: (cutRatio.v / cutRatio.h) * 100 * (side === 'right' ? 1 : -1),
        position: side,
        order: maxOrder + 1,
        offset,
        description: `Cut slope ${cutRatio.h}:${cutRatio.v}`,
      });

      // Add ditch at toe of cut slope
      newElements.push({
        type: 'ditch',
        width: 1.0,
        slope: 0,
        position: side,
        order: maxOrder + 2,
        offset: offset + slopeWidth,
        description: 'Drainage ditch',
      });
    }

    if (isFill) {
      const slopeWidth = calculateSlopeWidth(fillHeight, fillRatio);
      newElements.push({
        type: 'fill_slope',
        width: slopeWidth,
        slope: -(fillRatio.v / fillRatio.h) * 100 * (side === 'right' ? 1 : -1),
        position: side,
        order: maxOrder + 1,
        offset,
        description: `Fill slope ${fillRatio.h}:${fillRatio.v}`,
      });
    }
  }

  // Recalculate widths
  const rightHalfWidth = newElements
    .filter((e) => e.position === 'right')
    .reduce((sum, e) => sum + e.width, 0);

  const leftHalfWidth = newElements
    .filter((e) => e.position === 'left')
    .reduce((sum, e) => sum + e.width, 0);

  return {
    ...section,
    elements: newElements,
    totalWidth: leftHalfWidth + rightHalfWidth,
    rightHalfWidth,
    leftHalfWidth,
  };
}

// ============================================================================
// Shoulder Functions (for rural roads)
// ============================================================================

/**
 * Add shoulders to cross-section (typically for rural roads)
 */
export function addShoulders(
  section: CrossSectionResult,
  pavedWidth: number,
  totalWidth: number,
  shoulderSlope: number = STANDARD_CROSS_SLOPES.shoulder_paved
): CrossSectionResult {
  const newElements = [...section.elements];

  for (const side of ['left', 'right'] as const) {
    // Find outermost lane
    const lanes = section.elements.filter((e) => e.type === 'lane' && e.position === side);
    const outerLane = lanes.reduce((a, b) => (a.order > b.order ? a : b), lanes[0]);

    if (outerLane) {
      const offset = outerLane.offset + outerLane.width;
      const slopeSign = side === 'right' ? 1 : -1;

      // Paved shoulder
      if (pavedWidth > 0) {
        newElements.push({
          type: 'shoulder',
          width: pavedWidth,
          slope: slopeSign * shoulderSlope,
          material: 'asphalt',
          position: side,
          order: outerLane.order + 1,
          offset,
          description: 'Paved shoulder',
        });
      }

      // Gravel shoulder (if total > paved)
      const gravelWidth = totalWidth - pavedWidth;
      if (gravelWidth > 0) {
        newElements.push({
          type: 'shoulder',
          width: gravelWidth,
          slope: slopeSign * STANDARD_CROSS_SLOPES.shoulder_gravel,
          material: 'gravel',
          position: side,
          order: outerLane.order + 2,
          offset: offset + pavedWidth,
          description: 'Gravel shoulder',
        });
      }
    }
  }

  return {
    ...section,
    elements: newElements,
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate cross-section against standards
 */
export function validateCrossSection(
  section: CrossSectionResult
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check lane widths
  const lanes = section.elements.filter((e) => e.type === 'lane');
  const minLaneWidth = MINIMUM_LANE_WIDTH[section.classification];

  for (const lane of lanes) {
    if (lane.width < minLaneWidth) {
      warnings.push(
        `Lane width (${lane.width}m) is below minimum (${minLaneWidth}m) for ${section.classification} roads`
      );
    }
  }

  // Check sidewalk widths
  const sidewalks = section.elements.filter((e) => e.type === 'sidewalk');
  const minSidewalkWidth = MINIMUM_SIDEWALK_WIDTH[section.classification];

  for (const sw of sidewalks) {
    if (sw.width < minSidewalkWidth) {
      warnings.push(
        `Sidewalk width (${sw.width}m) is below minimum (${minSidewalkWidth}m) for ${section.classification} roads`
      );
    }
  }

  // Check bike lane widths
  const bikeLanes = section.elements.filter((e) => e.type === 'bike_lane');
  for (const bl of bikeLanes) {
    if (bl.width < STANDARD_WIDTHS.bike_lane) {
      warnings.push(
        `Bike lane width (${bl.width}m) is below recommended minimum (${STANDARD_WIDTHS.bike_lane}m)`
      );
    }
  }

  // Check cross slopes
  if (Math.abs(section.crossSlope) < 1.5) {
    warnings.push(
      `Cross slope (${section.crossSlope}%) may be insufficient for drainage (minimum 1.5% recommended)`
    );
  }

  if (Math.abs(section.crossSlope) > 4 && section.crossSlope !== 0) {
    warnings.push(
      `Cross slope (${section.crossSlope}%) may be excessive for normal crown (maximum 4% recommended)`
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Get cross-section area for quantity calculations
 */
export function getCrossSectionArea(section: CrossSectionResult): {
  pavement: number;
  sidewalk: number;
  landscaping: number;
  total: number;
} {
  const pavement = section.elements
    .filter((e) => ['lane', 'parking', 'bike_lane', 'shoulder', 'gutter'].includes(e.type))
    .reduce((sum, e) => sum + e.width, 0);

  const sidewalk = section.elements
    .filter((e) => e.type === 'sidewalk')
    .reduce((sum, e) => sum + e.width, 0);

  const landscaping = section.elements
    .filter((e) => e.type === 'planting_strip' || e.type === 'median')
    .reduce((sum, e) => sum + e.width, 0);

  return {
    pavement,
    sidewalk,
    landscaping,
    total: section.totalWidth,
  };
}
