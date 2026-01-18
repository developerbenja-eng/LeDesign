/**
 * CAD Geometry - Advanced Snap Utilities
 *
 * Enhanced object snap (OSNAP) modes for precision drawing.
 * Implements AutoCAD-style snap points with priority ordering.
 */

import type { Point3D, Point2D, LineEntity, CircleEntity, ArcEntity, PolylineEntity, AnyCADEntity } from '@/types/cad';
import { findLineLineIntersection, findLineCircleIntersection, findCircleCircleIntersection } from './intersection';

export interface SnapPoint {
  point: Point2D;
  type: 'endpoint' | 'midpoint' | 'center' | 'quadrant' | 'intersection' | 'perpendicular' | 'tangent' | 'nearest' | 'node' | 'extension';
  distance: number;
}

/**
 * Find all intersection points between two entities
 */
export function findIntersectionSnaps(
  entity1: AnyCADEntity,
  entity2: AnyCADEntity
): Point2D[] {
  const intersections: Point2D[] = [];

  // Line-Line intersection
  if (entity1.type === 'line' && entity2.type === 'line') {
    const intersection = findLineLineIntersection(entity1, entity2, false);
    if (intersection) {
      intersections.push({ x: intersection.x, y: intersection.y });
    }
  }

  // Line-Circle intersection
  if (entity1.type === 'line' && entity2.type === 'circle') {
    const points = findLineCircleIntersection(entity1, entity2, false);
    intersections.push(...points.map(p => ({ x: p.x, y: p.y })));
  }
  if (entity1.type === 'circle' && entity2.type === 'line') {
    const points = findLineCircleIntersection(entity2, entity1, false);
    intersections.push(...points.map(p => ({ x: p.x, y: p.y })));
  }

  // Circle-Circle intersection
  if (entity1.type === 'circle' && entity2.type === 'circle') {
    const points = findCircleCircleIntersection(entity1, entity2);
    intersections.push(...points.map(p => ({ x: p.x, y: p.y })));
  }

  // Polyline intersections (check each segment)
  if (entity1.type === 'polyline') {
    const polyline = entity1 as PolylineEntity;
    for (let i = 0; i < polyline.vertices.length - 1; i++) {
      const segment: LineEntity = {
        id: 'temp',
        type: 'line',
        layer: polyline.layer,
        visible: true,
        selected: false,
        start: polyline.vertices[i],
        end: polyline.vertices[i + 1],
      };

      if (entity2.type === 'line') {
        const intersection = findLineLineIntersection(segment, entity2, false);
        if (intersection) {
          intersections.push({ x: intersection.x, y: intersection.y });
        }
      } else if (entity2.type === 'circle') {
        const points = findLineCircleIntersection(segment, entity2, false);
        intersections.push(...points.map(p => ({ x: p.x, y: p.y })));
      }
    }
  }

  return intersections;
}

/**
 * Find perpendicular snap point on a line from cursor position
 */
export function findPerpendicularSnapOnLine(
  line: LineEntity,
  cursorPos: Point2D
): Point2D | null {
  const x1 = line.start.x, y1 = line.start.y;
  const x2 = line.end.x, y2 = line.end.y;
  const cx = cursorPos.x, cy = cursorPos.y;

  // Direction vector of line
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return null; // Line is a point

  // Project cursor onto line
  const t = ((cx - x1) * dx + (cy - y1) * dy) / lengthSquared;

  // Clamp t to [0, 1] to stay within segment
  const tClamped = Math.max(0, Math.min(1, t));

  return {
    x: x1 + tClamped * dx,
    y: y1 + tClamped * dy,
  };
}

/**
 * Find perpendicular snap point on a circle from cursor position
 */
export function findPerpendicularSnapOnCircle(
  circle: CircleEntity,
  cursorPos: Point2D
): Point2D | null {
  const cx = circle.center.x;
  const cy = circle.center.y;
  const r = circle.radius;

  // Vector from center to cursor
  const dx = cursorPos.x - cx;
  const dy = cursorPos.y - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return null; // Cursor at center

  // Normalize and scale to radius
  return {
    x: cx + (dx / distance) * r,
    y: cy + (dy / distance) * r,
  };
}

/**
 * Find tangent snap points on a circle from cursor position
 * Returns two tangent points (left and right)
 */
export function findTangentSnapsOnCircle(
  circle: CircleEntity,
  cursorPos: Point2D
): Point2D[] {
  const cx = circle.center.x;
  const cy = circle.center.y;
  const r = circle.radius;

  // Vector from center to cursor
  const dx = cursorPos.x - cx;
  const dy = cursorPos.y - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Cursor must be outside circle
  if (distance <= r) return [];

  // Calculate tangent points using right triangle geometry
  // Distance from cursor to tangent point
  const tangentLength = Math.sqrt(distance * distance - r * r);

  // Angle from center to cursor
  const angleToCenter = Math.atan2(dy, dx);

  // Angle offset for tangent points
  const angleOffset = Math.asin(r / distance);

  // Two tangent points
  const tangent1 = {
    x: cx + r * Math.cos(angleToCenter + angleOffset + Math.PI / 2),
    y: cy + r * Math.sin(angleToCenter + angleOffset + Math.PI / 2),
  };

  const tangent2 = {
    x: cx + r * Math.cos(angleToCenter - angleOffset - Math.PI / 2),
    y: cy + r * Math.sin(angleToCenter - angleOffset - Math.PI / 2),
  };

  return [tangent1, tangent2];
}

/**
 * Find nearest point on an entity from cursor position
 */
export function findNearestSnapOnEntity(
  entity: AnyCADEntity,
  cursorPos: Point2D
): Point2D | null {
  switch (entity.type) {
    case 'point':
      return { x: entity.position.x, y: entity.position.y };

    case 'line':
      return findPerpendicularSnapOnLine(entity, cursorPos);

    case 'circle':
      return findPerpendicularSnapOnCircle(entity, cursorPos);

    case 'arc': {
      const arc = entity as ArcEntity;
      // Find perpendicular point on full circle
      const perpPoint = findPerpendicularSnapOnCircle(
        { ...arc, type: 'circle' } as CircleEntity,
        cursorPos
      );
      if (!perpPoint) return null;

      // Check if point is within arc angle range
      const angle = Math.atan2(perpPoint.y - arc.center.y, perpPoint.x - arc.center.x);
      let normalizedAngle = angle;
      if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

      let startAngle = arc.startAngle;
      let endAngle = arc.endAngle;
      if (startAngle < 0) startAngle += 2 * Math.PI;
      if (endAngle < 0) endAngle += 2 * Math.PI;

      // Check if angle is within arc range
      if (startAngle <= endAngle) {
        if (normalizedAngle >= startAngle && normalizedAngle <= endAngle) {
          return perpPoint;
        }
      } else {
        if (normalizedAngle >= startAngle || normalizedAngle <= endAngle) {
          return perpPoint;
        }
      }

      // Return closest endpoint if not within arc
      const distToStart = Math.sqrt(
        (cursorPos.x - (arc.center.x + arc.radius * Math.cos(arc.startAngle))) ** 2 +
        (cursorPos.y - (arc.center.y + arc.radius * Math.sin(arc.startAngle))) ** 2
      );
      const distToEnd = Math.sqrt(
        (cursorPos.x - (arc.center.x + arc.radius * Math.cos(arc.endAngle))) ** 2 +
        (cursorPos.y - (arc.center.y + arc.radius * Math.sin(arc.endAngle))) ** 2
      );

      return distToStart < distToEnd
        ? { x: arc.center.x + arc.radius * Math.cos(arc.startAngle), y: arc.center.y + arc.radius * Math.sin(arc.startAngle) }
        : { x: arc.center.x + arc.radius * Math.cos(arc.endAngle), y: arc.center.y + arc.radius * Math.sin(arc.endAngle) };
    }

    case 'polyline': {
      const polyline = entity as PolylineEntity;
      let closestPoint: Point2D | null = null;
      let closestDistance = Infinity;

      // Check each segment
      for (let i = 0; i < polyline.vertices.length - 1; i++) {
        const segment: LineEntity = {
          id: 'temp',
          type: 'line',
          layer: polyline.layer,
          visible: true,
          selected: false,
          start: polyline.vertices[i],
          end: polyline.vertices[i + 1],
        };

        const snapPoint = findPerpendicularSnapOnLine(segment, cursorPos);
        if (snapPoint) {
          const distance = Math.sqrt(
            (snapPoint.x - cursorPos.x) ** 2 + (snapPoint.y - cursorPos.y) ** 2
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = snapPoint;
          }
        }
      }

      return closestPoint;
    }

    default:
      return null;
  }
}

/**
 * Find extension snap point on a line (extended beyond endpoints)
 */
export function findExtensionSnapOnLine(
  line: LineEntity,
  cursorPos: Point2D,
  maxExtension: number = 1000
): Point2D | null {
  const x1 = line.start.x, y1 = line.start.y;
  const x2 = line.end.x, y2 = line.end.y;

  // Direction vector
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return null;

  // Unit direction
  const ux = dx / length;
  const uy = dy / length;

  // Project cursor onto infinite line
  const t = ((cursorPos.x - x1) * ux + (cursorPos.y - y1) * uy);

  // Check if projection is beyond endpoints (extension)
  if (t < 0 || t > length) {
    // Clamp to max extension distance
    const clampedT = Math.max(-maxExtension, Math.min(length + maxExtension, t));

    return {
      x: x1 + clampedT * ux,
      y: y1 + clampedT * uy,
    };
  }

  return null; // Projection is within segment
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the closest snap point from an array of snap points
 */
export function findClosestSnap(
  snapPoints: SnapPoint[],
  tolerance: number
): SnapPoint | null {
  if (snapPoints.length === 0) return null;

  // Filter by tolerance
  const validSnaps = snapPoints.filter(snap => snap.distance <= tolerance);

  if (validSnaps.length === 0) return null;

  // Priority order for snap types (higher priority first)
  const priorityOrder: Record<string, number> = {
    endpoint: 10,
    intersection: 9,
    midpoint: 8,
    center: 7,
    quadrant: 6,
    perpendicular: 5,
    tangent: 4,
    nearest: 3,
    node: 2,
    extension: 1,
  };

  // Sort by priority first, then by distance
  validSnaps.sort((a, b) => {
    const priorityDiff = (priorityOrder[b.type] || 0) - (priorityOrder[a.type] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return a.distance - b.distance;
  });

  return validSnaps[0];
}
