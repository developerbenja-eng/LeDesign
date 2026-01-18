/**
 * CAD Geometry - Intersection Utilities
 *
 * Functions for calculating intersections between geometric entities.
 * Used by TRIM, EXTEND, and other editing tools.
 */

import type { Point3D, LineEntity, CircleEntity, ArcEntity, PolylineEntity } from '@/types/cad';

/**
 * Calculate intersection point(s) between two line segments
 * Returns null if lines are parallel or don't intersect
 */
export function findLineLineIntersection(
  line1: LineEntity,
  line2: LineEntity,
  extendLines: boolean = false
): Point3D | null {
  const x1 = line1.start.x, y1 = line1.start.y;
  const x2 = line1.end.x, y2 = line1.end.y;
  const x3 = line2.start.x, y3 = line2.start.y;
  const x4 = line2.end.x, y4 = line2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  // Lines are parallel
  if (Math.abs(denom) < 1e-10) {
    return null;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // If not extending lines, check if intersection is within segments
  if (!extendLines) {
    if (t < 0 || t > 1 || u < 0 || u > 1) {
      return null; // Intersection outside segment bounds
    }
  }

  // Calculate intersection point
  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
    z: line1.start.z, // Preserve Z coordinate
  };
}

/**
 * Calculate intersection point(s) between a line and a circle
 * Returns array of intersection points (0, 1, or 2 points)
 */
export function findLineCircleIntersection(
  line: LineEntity,
  circle: CircleEntity,
  extendLine: boolean = false
): Point3D[] {
  const cx = circle.center.x;
  const cy = circle.center.y;
  const r = circle.radius;

  const x1 = line.start.x;
  const y1 = line.start.y;
  const x2 = line.end.x;
  const y2 = line.end.y;

  // Direction vector of line
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Vector from line start to circle center
  const fx = x1 - cx;
  const fy = y1 - cy;

  // Quadratic equation coefficients: at² + bt + c = 0
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  const discriminant = b * b - 4 * a * c;

  // No intersection
  if (discriminant < 0) {
    return [];
  }

  // Calculate t values (parametric position on line)
  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  const intersections: Point3D[] = [];

  // Check t1
  if (extendLine || (t1 >= 0 && t1 <= 1)) {
    intersections.push({
      x: x1 + t1 * dx,
      y: y1 + t1 * dy,
      z: line.start.z,
    });
  }

  // Check t2 (if different from t1, i.e., two distinct intersection points)
  if (Math.abs(discriminant) > 1e-10) {
    if (extendLine || (t2 >= 0 && t2 <= 1)) {
      intersections.push({
        x: x1 + t2 * dx,
        y: y1 + t2 * dy,
        z: line.start.z,
      });
    }
  }

  return intersections;
}

/**
 * Calculate intersection point(s) between two circles
 * Returns array of intersection points (0, 1, or 2 points)
 */
export function findCircleCircleIntersection(
  circle1: CircleEntity,
  circle2: CircleEntity
): Point3D[] {
  const x1 = circle1.center.x;
  const y1 = circle1.center.y;
  const r1 = circle1.radius;

  const x2 = circle2.center.x;
  const y2 = circle2.center.y;
  const r2 = circle2.radius;

  // Distance between centers
  const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  // No intersection cases
  if (d > r1 + r2) return []; // Circles too far apart
  if (d < Math.abs(r1 - r2)) return []; // One circle inside the other
  if (d === 0 && r1 === r2) return []; // Coincident circles

  // Calculate intersection points
  const a = (r1 ** 2 - r2 ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(r1 ** 2 - a ** 2);

  // Point on line between centers
  const px = x1 + a * (x2 - x1) / d;
  const py = y1 + a * (y2 - y1) / d;

  // Perpendicular offset
  const offsetX = h * (y2 - y1) / d;
  const offsetY = h * (x2 - x1) / d;

  const intersections: Point3D[] = [
    { x: px + offsetX, y: py - offsetY, z: circle1.center.z },
  ];

  // Two distinct points (unless circles are tangent)
  if (Math.abs(h) > 1e-10) {
    intersections.push({ x: px - offsetX, y: py + offsetY, z: circle1.center.z });
  }

  return intersections;
}

/**
 * Find all intersections between a polyline and another entity
 */
export function findPolylineIntersections(
  polyline: PolylineEntity,
  other: LineEntity | CircleEntity
): Point3D[] {
  const intersections: Point3D[] = [];

  // Convert polyline to line segments
  for (let i = 0; i < polyline.vertices.length - 1; i++) {
    const segment: LineEntity = {
      id: `temp_segment_${i}`,
      type: 'line',
      layer: polyline.layer,
      visible: true,
      selected: false,
      start: polyline.vertices[i],
      end: polyline.vertices[i + 1],
    };

    if (other.type === 'line') {
      const intersection = findLineLineIntersection(segment, other);
      if (intersection) {
        intersections.push(intersection);
      }
    } else if (other.type === 'circle') {
      const segmentIntersections = findLineCircleIntersection(segment, other);
      intersections.push(...segmentIntersections);
    }
  }

  // Handle closed polyline (connect last vertex to first)
  if (polyline.closed && polyline.vertices.length >= 2) {
    const lastSegment: LineEntity = {
      id: 'temp_segment_last',
      type: 'line',
      layer: polyline.layer,
      visible: true,
      selected: false,
      start: polyline.vertices[polyline.vertices.length - 1],
      end: polyline.vertices[0],
    };

    if (other.type === 'line') {
      const intersection = findLineLineIntersection(lastSegment, other);
      if (intersection) {
        intersections.push(intersection);
      }
    } else if (other.type === 'circle') {
      const segmentIntersections = findLineCircleIntersection(lastSegment, other);
      intersections.push(...segmentIntersections);
    }
  }

  return intersections;
}

/**
 * Calculate the distance from a point to a line segment
 */
export function distanceToLineSegment(point: Point3D, line: LineEntity): number {
  const x = point.x, y = point.y;
  const x1 = line.start.x, y1 = line.start.y;
  const x2 = line.end.x, y2 = line.end.y;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // Line is a point
    return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  }

  // Calculate parameter t for projection onto line
  let t = ((x - x1) * dx + (y - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

  // Closest point on segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
}

/**
 * Extend a line to intersect with a boundary entity
 * Returns the extended line or null if no intersection
 */
export function extendLineToIntersection(
  line: LineEntity,
  boundary: LineEntity | CircleEntity,
  extendFrom: 'start' | 'end'
): LineEntity | null {
  let intersection: Point3D | null = null;

  if (boundary.type === 'line') {
    // Find intersection with extended line
    intersection = findLineLineIntersection(line, boundary, true);
  } else if (boundary.type === 'circle') {
    // Find intersections with extended line
    const intersections = findLineCircleIntersection(line, boundary, true);

    // Choose the intersection closest to the end being extended
    if (intersections.length > 0) {
      const refPoint = extendFrom === 'end' ? line.end : line.start;
      intersection = intersections.reduce((closest, pt) => {
        const distCurrent = Math.sqrt(
          (pt.x - refPoint.x) ** 2 + (pt.y - refPoint.y) ** 2
        );
        const distClosest = Math.sqrt(
          (closest.x - refPoint.x) ** 2 + (closest.y - refPoint.y) ** 2
        );
        return distCurrent < distClosest ? pt : closest;
      });
    }
  }

  if (!intersection) return null;

  // Create extended line
  return {
    ...line,
    id: `${line.id}_extended`,
    selected: false,
    start: extendFrom === 'start' ? intersection : line.start,
    end: extendFrom === 'end' ? intersection : line.end,
  };
}

/**
 * Trim a line at the intersection with a cutting edge
 * Returns the trimmed line or null if no intersection
 * clickPoint determines which portion to keep
 */
export function trimLineAtIntersection(
  line: LineEntity,
  cuttingEdge: LineEntity | CircleEntity,
  clickPoint: Point3D
): LineEntity | null {
  let intersections: Point3D[] = [];

  if (cuttingEdge.type === 'line') {
    const intersection = findLineLineIntersection(line, cuttingEdge);
    if (intersection) {
      intersections = [intersection];
    }
  } else if (cuttingEdge.type === 'circle') {
    intersections = findLineCircleIntersection(line, cuttingEdge);
  }

  if (intersections.length === 0) return null;

  // Find the intersection closest to the click point
  const closestIntersection = intersections.reduce((closest, pt) => {
    const distCurrent = Math.sqrt(
      (pt.x - clickPoint.x) ** 2 + (pt.y - clickPoint.y) ** 2
    );
    const distClosest = Math.sqrt(
      (closest.x - clickPoint.x) ** 2 + (closest.y - clickPoint.y) ** 2
    );
    return distCurrent < distClosest ? pt : closest;
  });

  // Determine which end of the line to trim
  const distToStart = Math.sqrt(
    (clickPoint.x - line.start.x) ** 2 + (clickPoint.y - line.start.y) ** 2
  );
  const distToEnd = Math.sqrt(
    (clickPoint.x - line.end.x) ** 2 + (clickPoint.y - line.end.y) ** 2
  );

  // Keep the portion on the same side as the click point
  return {
    ...line,
    id: `${line.id}_trimmed`,
    selected: false,
    start: distToStart < distToEnd ? line.start : closestIntersection,
    end: distToStart < distToEnd ? closestIntersection : line.end,
  };
}

/**
 * Find the nearest intersection point to a reference point
 */
export function findNearestIntersection(
  intersections: Point3D[],
  referencePoint: Point3D
): Point3D | null {
  if (intersections.length === 0) return null;

  return intersections.reduce((nearest, pt) => {
    const distCurrent = Math.sqrt(
      (pt.x - referencePoint.x) ** 2 + (pt.y - referencePoint.y) ** 2
    );
    const distNearest = Math.sqrt(
      (nearest.x - referencePoint.x) ** 2 + (nearest.y - referencePoint.y) ** 2
    );
    return distCurrent < distNearest ? pt : nearest;
  });
}
