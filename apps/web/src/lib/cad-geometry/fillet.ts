/**
 * CAD Geometry - Fillet Utilities
 *
 * Functions for creating fillet arcs between two lines.
 * Used by the FILLET tool for rounding corners (critical for road design).
 */

import type { Point3D, LineEntity, ArcEntity } from '@/types/cad';

export interface FilletResult {
  arc: ArcEntity;
  trimmedLine1: LineEntity;
  trimmedLine2: LineEntity;
  tangentPoint1: Point3D;
  tangentPoint2: Point3D;
}

/**
 * Calculate the intersection point of two infinite lines
 * Returns null if lines are parallel
 */
function findLineIntersection(
  p1: Point3D,
  p2: Point3D,
  p3: Point3D,
  p4: Point3D
): Point3D | null {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 1e-10) {
    return null; // Parallel lines
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
    z: p1.z,
  };
}

/**
 * Find the center of the fillet arc for two lines with given radius
 * Returns null if lines are parallel or radius is too large
 */
export function findFilletCenter(
  line1: LineEntity,
  line2: LineEntity,
  radius: number
): Point3D | null {
  // Find intersection of the two lines (extended if necessary)
  const intersection = findLineIntersection(
    line1.start,
    line1.end,
    line2.start,
    line2.end
  );

  if (!intersection) {
    return null; // Lines are parallel
  }

  // Calculate unit direction vectors for each line
  const dx1 = line1.end.x - line1.start.x;
  const dy1 = line1.end.y - line1.start.y;
  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const dir1 = { x: dx1 / len1, y: dy1 / len1 };

  const dx2 = line2.end.x - line2.start.x;
  const dy2 = line2.end.y - line2.start.y;
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  const dir2 = { x: dx2 / len2, y: dy2 / len2 };

  // Calculate the angle between the two lines
  const dotProduct = dir1.x * dir2.x + dir1.y * dir2.y;
  const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

  // If lines are nearly parallel, fillet not possible
  if (Math.abs(angle) < 0.001 || Math.abs(angle - Math.PI) < 0.001) {
    return null;
  }

  // Calculate distance from intersection to fillet center
  const distToCenter = radius / Math.tan(angle / 2);

  // Calculate bisector direction (average of normalized directions)
  const bisectorX = (dir1.x + dir2.x) / 2;
  const bisectorY = (dir1.y + dir2.y) / 2;
  const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY);
  const bisectorDir = { x: bisectorX / bisectorLen, y: bisectorY / bisectorLen };

  // Calculate offset distance along bisector
  const offsetDist = radius / Math.sin(angle / 2);

  // Fillet center is offset from intersection along bisector
  const center: Point3D = {
    x: intersection.x + bisectorDir.x * offsetDist,
    y: intersection.y + bisectorDir.y * offsetDist,
    z: intersection.z,
  };

  return center;
}

/**
 * Find the tangent point on a line from the fillet center
 */
function findTangentPoint(
  line: LineEntity,
  center: Point3D,
  radius: number
): Point3D | null {
  const x1 = line.start.x, y1 = line.start.y;
  const x2 = line.end.x, y2 = line.end.y;
  const cx = center.x, cy = center.y;

  // Direction vector of line
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return null;

  // Unit direction vector
  const ux = dx / length;
  const uy = dy / length;

  // Vector from line start to center
  const fx = cx - x1;
  const fy = cy - y1;

  // Project center onto line to find closest point
  const t = (fx * ux + fy * uy);

  // Tangent point
  return {
    x: x1 + t * ux,
    y: y1 + t * uy,
    z: line.start.z,
  };
}

/**
 * Calculate the full fillet including arc and trimmed lines
 * Returns null if fillet cannot be created
 */
export function calculateFillet(
  line1: LineEntity,
  line2: LineEntity,
  radius: number
): FilletResult | null {
  if (radius <= 0) {
    return null;
  }

  // Find fillet center
  const center = findFilletCenter(line1, line2, radius);
  if (!center) {
    return null;
  }

  // Find tangent points
  const tangent1 = findTangentPoint(line1, center, radius);
  const tangent2 = findTangentPoint(line2, center, radius);

  if (!tangent1 || !tangent2) {
    return null;
  }

  // Calculate start and end angles for the arc
  const startAngle = Math.atan2(tangent1.y - center.y, tangent1.x - center.x);
  const endAngle = Math.atan2(tangent2.y - center.y, tangent2.x - center.x);

  // Determine if we need to sweep clockwise or counterclockwise
  // Check which direction gives the shorter arc
  let sweepAngle = endAngle - startAngle;
  if (sweepAngle < 0) sweepAngle += 2 * Math.PI;
  if (sweepAngle > Math.PI) {
    // Swap angles for shorter arc
    [tangent1.x, tangent2.x] = [tangent2.x, tangent1.x];
    [tangent1.y, tangent2.y] = [tangent2.y, tangent1.y];
  }

  // Create fillet arc
  const arc: ArcEntity = {
    id: `arc_fillet_${Date.now()}`,
    type: 'arc',
    layer: line1.layer,
    visible: true,
    selected: false,
    center,
    radius,
    startAngle,
    endAngle,
  };

  // Determine which end of each line to trim
  const dist1Start = Math.sqrt(
    (tangent1.x - line1.start.x) ** 2 + (tangent1.y - line1.start.y) ** 2
  );
  const dist1End = Math.sqrt(
    (tangent1.x - line1.end.x) ** 2 + (tangent1.y - line1.end.y) ** 2
  );

  const dist2Start = Math.sqrt(
    (tangent2.x - line2.start.x) ** 2 + (tangent2.y - line2.start.y) ** 2
  );
  const dist2End = Math.sqrt(
    (tangent2.x - line2.end.x) ** 2 + (tangent2.y - line2.end.y) ** 2
  );

  // Trim line 1
  const trimmedLine1: LineEntity = {
    ...line1,
    id: `${line1.id}_filleted`,
    selected: false,
    start: dist1Start < dist1End ? line1.start : tangent1,
    end: dist1Start < dist1End ? tangent1 : line1.end,
  };

  // Trim line 2
  const trimmedLine2: LineEntity = {
    ...line2,
    id: `${line2.id}_filleted`,
    selected: false,
    start: dist2Start < dist2End ? line2.start : tangent2,
    end: dist2Start < dist2End ? tangent2 : line2.end,
  };

  return {
    arc,
    trimmedLine1,
    trimmedLine2,
    tangentPoint1: tangent1,
    tangentPoint2: tangent2,
  };
}

/**
 * Check if a fillet with given radius is possible between two lines
 * Returns error message if not possible, null if OK
 */
export function validateFillet(
  line1: LineEntity,
  line2: LineEntity,
  radius: number
): string | null {
  if (radius <= 0) {
    return 'Radius must be positive';
  }

  // Check if lines intersect or can be extended to intersect
  const intersection = findLineIntersection(
    line1.start,
    line1.end,
    line2.start,
    line2.end
  );

  if (!intersection) {
    return 'Lines are parallel - cannot create fillet';
  }

  // Calculate unit direction vectors
  const dx1 = line1.end.x - line1.start.x;
  const dy1 = line1.end.y - line1.start.y;
  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const dir1 = { x: dx1 / len1, y: dy1 / len1 };

  const dx2 = line2.end.x - line2.start.x;
  const dy2 = line2.end.y - line2.start.y;
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  const dir2 = { x: dx2 / len2, y: dy2 / len2 };

  // Check if lines are nearly parallel
  const dotProduct = dir1.x * dir2.x + dir1.y * dir2.y;
  const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

  if (Math.abs(angle) < 0.001 || Math.abs(angle - Math.PI) < 0.001) {
    return 'Lines are nearly parallel - cannot create fillet';
  }

  // Check if radius is too large (fillet center would be too far from intersection)
  const distToCenter = radius / Math.tan(angle / 2);
  if (distToCenter > 10000) {
    // Arbitrary large limit
    return 'Radius too large for these lines';
  }

  return null; // Fillet is valid
}
