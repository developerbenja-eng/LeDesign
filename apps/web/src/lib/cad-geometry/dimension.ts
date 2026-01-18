/**
 * CAD Geometry - Dimension Utilities
 *
 * Functions for creating and calculating dimension entities.
 * Supports linear, aligned, angular, radial dimensions.
 */

import type { Point3D, Point2D, DimensionEntity, DimensionType } from '@/types/cad';

export interface DimensionStyle {
  textHeight: number;
  arrowSize: number;
  extensionLineOffset: number;
  extensionLineExtend: number;
  textGap: number;
}

// Default dimension style (matching AutoCAD defaults)
export const DEFAULT_DIMENSION_STYLE: DimensionStyle = {
  textHeight: 2.5,
  arrowSize: 2.5,
  extensionLineOffset: 1.5,
  extensionLineExtend: 2.0,
  textGap: 1.0,
};

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: Point3D, p2: Point3D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Format measurement value as text
 */
export function formatMeasurement(value: number, precision: number = 2): string {
  return value.toFixed(precision);
}

/**
 * Calculate linear dimension (horizontal or vertical)
 * @param defPoint1 - First definition point
 * @param defPoint2 - Second definition point
 * @param dimLinePoint - Point on dimension line (determines offset)
 * @param orientation - 'horizontal' or 'vertical'
 * @param style - Dimension style settings
 */
export function calculateLinearDimension(
  defPoint1: Point3D,
  defPoint2: Point3D,
  dimLinePoint: Point3D,
  orientation: 'horizontal' | 'vertical',
  style: DimensionStyle = DEFAULT_DIMENSION_STYLE
): {
  measurement: number;
  textPosition: Point3D;
  extensionLine1Start: Point3D;
  extensionLine1End: Point3D;
  extensionLine2Start: Point3D;
  extensionLine2End: Point3D;
  dimLineStart: Point3D;
  dimLineEnd: Point3D;
  arrow1Start: Point3D;
  arrow1Tip: Point3D;
  arrow2Start: Point3D;
  arrow2Tip: Point3D;
} {
  let measurement: number;
  let dimLineStart: Point3D;
  let dimLineEnd: Point3D;
  let extensionLine1Start: Point3D;
  let extensionLine1End: Point3D;
  let extensionLine2Start: Point3D;
  let extensionLine2End: Point3D;

  if (orientation === 'horizontal') {
    // Horizontal dimension (measure X distance)
    measurement = Math.abs(defPoint2.x - defPoint1.x);

    // Dimension line at dimLinePoint's Y coordinate
    const dimLineY = dimLinePoint.y;
    dimLineStart = { x: defPoint1.x, y: dimLineY, z: defPoint1.z };
    dimLineEnd = { x: defPoint2.x, y: dimLineY, z: defPoint2.z };

    // Extension lines
    extensionLine1Start = { ...defPoint1 };
    extensionLine1End = { x: defPoint1.x, y: dimLineY + style.extensionLineExtend, z: defPoint1.z };
    extensionLine2Start = { ...defPoint2 };
    extensionLine2End = { x: defPoint2.x, y: dimLineY + style.extensionLineExtend, z: defPoint2.z };
  } else {
    // Vertical dimension (measure Y distance)
    measurement = Math.abs(defPoint2.y - defPoint1.y);

    // Dimension line at dimLinePoint's X coordinate
    const dimLineX = dimLinePoint.x;
    dimLineStart = { x: dimLineX, y: defPoint1.y, z: defPoint1.z };
    dimLineEnd = { x: dimLineX, y: defPoint2.y, z: defPoint2.z };

    // Extension lines
    extensionLine1Start = { ...defPoint1 };
    extensionLine1End = { x: dimLineX + style.extensionLineExtend, y: defPoint1.y, z: defPoint1.z };
    extensionLine2Start = { ...defPoint2 };
    extensionLine2End = { x: dimLineX + style.extensionLineExtend, y: defPoint2.y, z: defPoint2.z };
  }

  // Text position (midpoint of dimension line)
  const textPosition: Point3D = {
    x: (dimLineStart.x + dimLineEnd.x) / 2,
    y: (dimLineStart.y + dimLineEnd.y) / 2,
    z: (dimLineStart.z + dimLineEnd.z) / 2,
  };

  // Calculate arrow positions
  const arrowDir = {
    x: dimLineEnd.x - dimLineStart.x,
    y: dimLineEnd.y - dimLineStart.y,
  };
  const arrowLength = Math.sqrt(arrowDir.x * arrowDir.x + arrowDir.y * arrowDir.y);
  const arrowNormalized = {
    x: arrowDir.x / arrowLength,
    y: arrowDir.y / arrowLength,
  };

  // Arrow 1 (at dimLineStart)
  const arrow1Tip = { ...dimLineStart };
  const arrow1Start = {
    x: dimLineStart.x + arrowNormalized.x * style.arrowSize,
    y: dimLineStart.y + arrowNormalized.y * style.arrowSize,
    z: dimLineStart.z,
  };

  // Arrow 2 (at dimLineEnd)
  const arrow2Tip = { ...dimLineEnd };
  const arrow2Start = {
    x: dimLineEnd.x - arrowNormalized.x * style.arrowSize,
    y: dimLineEnd.y - arrowNormalized.y * style.arrowSize,
    z: dimLineEnd.z,
  };

  return {
    measurement,
    textPosition,
    extensionLine1Start,
    extensionLine1End,
    extensionLine2Start,
    extensionLine2End,
    dimLineStart,
    dimLineEnd,
    arrow1Start,
    arrow1Tip,
    arrow2Start,
    arrow2Tip,
  };
}

/**
 * Calculate aligned dimension (along angle between two points)
 * @param defPoint1 - First definition point
 * @param defPoint2 - Second definition point
 * @param dimLinePoint - Point on dimension line (determines offset)
 * @param style - Dimension style settings
 */
export function calculateAlignedDimension(
  defPoint1: Point3D,
  defPoint2: Point3D,
  dimLinePoint: Point3D,
  style: DimensionStyle = DEFAULT_DIMENSION_STYLE
): {
  measurement: number;
  textPosition: Point3D;
  extensionLine1Start: Point3D;
  extensionLine1End: Point3D;
  extensionLine2Start: Point3D;
  extensionLine2End: Point3D;
  dimLineStart: Point3D;
  dimLineEnd: Point3D;
  arrow1Start: Point3D;
  arrow1Tip: Point3D;
  arrow2Start: Point3D;
  arrow2Tip: Point3D;
} {
  // Calculate measurement (3D distance)
  const measurement = calculateDistance(defPoint1, defPoint2);

  // Direction vector along the dimension
  const dimDir = {
    x: defPoint2.x - defPoint1.x,
    y: defPoint2.y - defPoint1.y,
  };
  const dimLength = Math.sqrt(dimDir.x * dimDir.x + dimDir.y * dimDir.y);
  const dimNormalized = {
    x: dimDir.x / dimLength,
    y: dimDir.y / dimLength,
  };

  // Perpendicular direction (for offset)
  const perpDir = {
    x: -dimNormalized.y,
    y: dimNormalized.x,
  };

  // Calculate offset distance from defPoints to dimLinePoint
  const toMidpoint = {
    x: (defPoint1.x + defPoint2.x) / 2,
    y: (defPoint1.y + defPoint2.y) / 2,
  };
  const toDimLinePoint = {
    x: dimLinePoint.x - toMidpoint.x,
    y: dimLinePoint.y - toMidpoint.y,
  };
  const offset = toDimLinePoint.x * perpDir.x + toDimLinePoint.y * perpDir.y;

  // Dimension line points (offset from defPoints)
  const dimLineStart: Point3D = {
    x: defPoint1.x + perpDir.x * offset,
    y: defPoint1.y + perpDir.y * offset,
    z: defPoint1.z,
  };
  const dimLineEnd: Point3D = {
    x: defPoint2.x + perpDir.x * offset,
    y: defPoint2.y + perpDir.y * offset,
    z: defPoint2.z,
  };

  // Extension lines
  const extensionLine1Start = { ...defPoint1 };
  const extensionLine1End = {
    x: dimLineStart.x + perpDir.x * style.extensionLineExtend,
    y: dimLineStart.y + perpDir.y * style.extensionLineExtend,
    z: dimLineStart.z,
  };
  const extensionLine2Start = { ...defPoint2 };
  const extensionLine2End = {
    x: dimLineEnd.x + perpDir.x * style.extensionLineExtend,
    y: dimLineEnd.y + perpDir.y * style.extensionLineExtend,
    z: dimLineEnd.z,
  };

  // Text position (midpoint of dimension line)
  const textPosition: Point3D = {
    x: (dimLineStart.x + dimLineEnd.x) / 2,
    y: (dimLineStart.y + dimLineEnd.y) / 2,
    z: (dimLineStart.z + dimLineEnd.z) / 2,
  };

  // Calculate arrow positions
  // Arrow 1 (at dimLineStart)
  const arrow1Tip = { ...dimLineStart };
  const arrow1Start = {
    x: dimLineStart.x + dimNormalized.x * style.arrowSize,
    y: dimLineStart.y + dimNormalized.y * style.arrowSize,
    z: dimLineStart.z,
  };

  // Arrow 2 (at dimLineEnd)
  const arrow2Tip = { ...dimLineEnd };
  const arrow2Start = {
    x: dimLineEnd.x - dimNormalized.x * style.arrowSize,
    y: dimLineEnd.y - dimNormalized.y * style.arrowSize,
    z: dimLineEnd.z,
  };

  return {
    measurement,
    textPosition,
    extensionLine1Start,
    extensionLine1End,
    extensionLine2Start,
    extensionLine2End,
    dimLineStart,
    dimLineEnd,
    arrow1Start,
    arrow1Tip,
    arrow2Start,
    arrow2Tip,
  };
}

/**
 * Calculate angular dimension between two lines
 * @param vertex - Vertex point (angle apex)
 * @param point1 - Point on first line
 * @param point2 - Point on second line
 * @param arcRadius - Radius of dimension arc
 * @param style - Dimension style settings
 */
export function calculateAngularDimension(
  vertex: Point3D,
  point1: Point3D,
  point2: Point3D,
  arcRadius: number,
  style: DimensionStyle = DEFAULT_DIMENSION_STYLE
): {
  measurement: number; // Angle in degrees
  angle1: number; // Start angle in radians
  angle2: number; // End angle in radians
  textPosition: Point3D;
  arcCenter: Point3D;
  arcStartPoint: Point3D;
  arcEndPoint: Point3D;
} {
  // Calculate angles from vertex to each point
  const angle1 = Math.atan2(point1.y - vertex.y, point1.x - vertex.x);
  const angle2 = Math.atan2(point2.y - vertex.y, point2.x - vertex.x);

  // Calculate angle difference (measurement)
  let angleDiff = angle2 - angle1;
  if (angleDiff < 0) angleDiff += 2 * Math.PI;
  const measurement = (angleDiff * 180) / Math.PI; // Convert to degrees

  // Arc center is at vertex
  const arcCenter = { ...vertex };

  // Arc start and end points
  const arcStartPoint: Point3D = {
    x: vertex.x + arcRadius * Math.cos(angle1),
    y: vertex.y + arcRadius * Math.sin(angle1),
    z: vertex.z,
  };
  const arcEndPoint: Point3D = {
    x: vertex.x + arcRadius * Math.cos(angle2),
    y: vertex.y + arcRadius * Math.sin(angle2),
    z: vertex.z,
  };

  // Text position (midpoint of arc)
  const midAngle = angle1 + angleDiff / 2;
  const textPosition: Point3D = {
    x: vertex.x + arcRadius * Math.cos(midAngle),
    y: vertex.y + arcRadius * Math.sin(midAngle),
    z: vertex.z,
  };

  return {
    measurement,
    angle1,
    angle2,
    textPosition,
    arcCenter,
    arcStartPoint,
    arcEndPoint,
  };
}

/**
 * Calculate radial dimension (for circles)
 * @param center - Center of circle/arc
 * @param radiusPoint - Point on circle/arc
 * @param style - Dimension style settings
 */
export function calculateRadialDimension(
  center: Point3D,
  radiusPoint: Point3D,
  style: DimensionStyle = DEFAULT_DIMENSION_STYLE
): {
  measurement: number;
  textPosition: Point3D;
  leaderStart: Point3D;
  leaderEnd: Point3D;
} {
  // Calculate radius
  const measurement = calculateDistance(center, radiusPoint);

  // Direction from center to radius point
  const dir = {
    x: radiusPoint.x - center.x,
    y: radiusPoint.y - center.y,
  };
  const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
  const normalized = {
    x: dir.x / length,
    y: dir.y / length,
  };

  // Leader line from center to radius point
  const leaderStart = { ...center };
  const leaderEnd = { ...radiusPoint };

  // Text position slightly beyond radius point
  const textPosition: Point3D = {
    x: radiusPoint.x + normalized.x * style.textGap,
    y: radiusPoint.y + normalized.y * style.textGap,
    z: radiusPoint.z,
  };

  return {
    measurement,
    textPosition,
    leaderStart,
    leaderEnd,
  };
}

/**
 * Calculate diameter dimension (for circles)
 * @param center - Center of circle/arc
 * @param radiusPoint - Point on circle/arc
 * @param style - Dimension style settings
 */
export function calculateDiameterDimension(
  center: Point3D,
  radiusPoint: Point3D,
  style: DimensionStyle = DEFAULT_DIMENSION_STYLE
): {
  measurement: number;
  textPosition: Point3D;
  leaderStart: Point3D;
  leaderEnd: Point3D;
} {
  // Calculate diameter
  const radius = calculateDistance(center, radiusPoint);
  const measurement = radius * 2;

  // Direction from center to radius point
  const dir = {
    x: radiusPoint.x - center.x,
    y: radiusPoint.y - center.y,
  };
  const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
  const normalized = {
    x: dir.x / length,
    y: dir.y / length,
  };

  // Leader line crosses diameter
  const leaderStart: Point3D = {
    x: center.x - normalized.x * radius,
    y: center.y - normalized.y * radius,
    z: center.z,
  };
  const leaderEnd: Point3D = {
    x: center.x + normalized.x * radius,
    y: center.y + normalized.y * radius,
    z: center.z,
  };

  // Text position at center
  const textPosition: Point3D = { ...center };

  return {
    measurement,
    textPosition,
    leaderStart,
    leaderEnd,
  };
}

/**
 * Create a dimension entity
 */
export function createDimensionEntity(
  dimensionType: DimensionType,
  defPoint1: Point3D,
  defPoint2: Point3D,
  dimLinePoint: Point3D,
  style: DimensionStyle = DEFAULT_DIMENSION_STYLE
): DimensionEntity {
  let measurement: number;
  let textPosition: Point3D;
  let text: string;

  if (dimensionType === 'linear') {
    // Default to aligned for now (linear needs orientation parameter)
    const result = calculateAlignedDimension(defPoint1, defPoint2, dimLinePoint, style);
    measurement = result.measurement;
    textPosition = result.textPosition;
    text = formatMeasurement(measurement);
  } else if (dimensionType === 'aligned') {
    const result = calculateAlignedDimension(defPoint1, defPoint2, dimLinePoint, style);
    measurement = result.measurement;
    textPosition = result.textPosition;
    text = formatMeasurement(measurement);
  } else if (dimensionType === 'radial') {
    const result = calculateRadialDimension(defPoint1, defPoint2, style);
    measurement = result.measurement;
    textPosition = result.textPosition;
    text = `R${formatMeasurement(measurement)}`;
  } else if (dimensionType === 'diameter') {
    const result = calculateDiameterDimension(defPoint1, defPoint2, style);
    measurement = result.measurement;
    textPosition = result.textPosition;
    text = `Ø${formatMeasurement(measurement)}`;
  } else {
    // Default fallback
    measurement = calculateDistance(defPoint1, defPoint2);
    textPosition = {
      x: (defPoint1.x + defPoint2.x) / 2,
      y: (defPoint1.y + defPoint2.y) / 2,
      z: (defPoint1.z + defPoint2.z) / 2,
    };
    text = formatMeasurement(measurement);
  }

  return {
    id: `dimension_${Date.now()}`,
    type: 'dimension',
    dimensionType,
    layer: '0', // Will be overridden by active layer
    visible: true,
    selected: false,
    defPoint1,
    defPoint2,
    dimLinePoint,
    textPosition,
    text,
    measurement,
    textHeight: style.textHeight,
    arrowSize: style.arrowSize,
    extensionLineOffset: style.extensionLineOffset,
  };
}
