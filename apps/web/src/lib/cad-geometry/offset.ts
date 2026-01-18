/**
 * CAD Geometry - Offset Operations
 *
 * Functions for offsetting lines, polylines, and circles by a given distance.
 * Used by the OFFSET tool for creating parallel geometry (roads, setbacks, etc.).
 */

import type { Point3D, LineEntity, PolylineEntity, CircleEntity, AnyCADEntity } from '@/types/cad';

/**
 * Calculate perpendicular vector to a line segment
 * Returns unit vector perpendicular to the line (rotated 90° counterclockwise)
 */
function getPerpendicularVector(p1: Point3D, p2: Point3D): { x: number; y: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  // Perpendicular vector (rotate 90° counterclockwise)
  return {
    x: -dy / length,
    y: dx / length,
  };
}

/**
 * Calculate intersection point of two lines defined by points
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

  // Lines are parallel
  if (Math.abs(denom) < 1e-10) {
    return null;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
    z: p1.z, // Preserve Z coordinate
  };
}

/**
 * Offset a single line segment by a given distance
 * Side: 'left' offsets perpendicular to the left, 'right' to the right
 */
export function offsetLine(
  line: LineEntity,
  distance: number,
  side: 'left' | 'right'
): LineEntity {
  const perp = getPerpendicularVector(line.start, line.end);

  // Flip direction for right side
  const sign = side === 'left' ? 1 : -1;
  const offsetX = perp.x * distance * sign;
  const offsetY = perp.y * distance * sign;

  return {
    ...line,
    id: `${line.id}_offset`,
    selected: false,
    start: {
      x: line.start.x + offsetX,
      y: line.start.y + offsetY,
      z: line.start.z,
    },
    end: {
      x: line.end.x + offsetX,
      y: line.end.y + offsetY,
      z: line.end.z,
    },
  };
}

/**
 * Offset a polyline by a given distance
 * Handles corner resolution at vertices
 */
export function offsetPolyline(
  polyline: PolylineEntity,
  distance: number,
  side: 'left' | 'right'
): PolylineEntity {
  const vertices = polyline.vertices;

  if (vertices.length < 2) {
    return { ...polyline, id: `${polyline.id}_offset` };
  }

  const offsetVertices: Point3D[] = [];

  // Handle open polyline
  if (!polyline.closed) {
    // Offset each segment
    const offsetSegments: { start: Point3D; end: Point3D }[] = [];

    for (let i = 0; i < vertices.length - 1; i++) {
      const v1 = vertices[i];
      const v2 = vertices[i + 1];

      const perp = getPerpendicularVector(v1, v2);
      const sign = side === 'left' ? 1 : -1;
      const offsetX = perp.x * distance * sign;
      const offsetY = perp.y * distance * sign;

      offsetSegments.push({
        start: { x: v1.x + offsetX, y: v1.y + offsetY, z: v1.z },
        end: { x: v2.x + offsetX, y: v2.y + offsetY, z: v2.z },
      });
    }

    // First vertex from first segment
    offsetVertices.push(offsetSegments[0].start);

    // Resolve corners using intersection
    for (let i = 0; i < offsetSegments.length - 1; i++) {
      const seg1 = offsetSegments[i];
      const seg2 = offsetSegments[i + 1];

      const intersection = findLineIntersection(
        seg1.start,
        seg1.end,
        seg2.start,
        seg2.end
      );

      if (intersection) {
        offsetVertices.push(intersection);
      } else {
        // Parallel segments - use endpoint
        offsetVertices.push(seg1.end);
      }
    }

    // Last vertex from last segment
    offsetVertices.push(offsetSegments[offsetSegments.length - 1].end);
  } else {
    // Closed polyline - treat as loop
    const numVertices = vertices.length;
    const offsetSegments: { start: Point3D; end: Point3D }[] = [];

    // Offset all segments
    for (let i = 0; i < numVertices; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % numVertices];

      const perp = getPerpendicularVector(v1, v2);
      const sign = side === 'left' ? 1 : -1;
      const offsetX = perp.x * distance * sign;
      const offsetY = perp.y * distance * sign;

      offsetSegments.push({
        start: { x: v1.x + offsetX, y: v1.y + offsetY, z: v1.z },
        end: { x: v2.x + offsetX, y: v2.y + offsetY, z: v2.z },
      });
    }

    // Resolve all corners
    for (let i = 0; i < offsetSegments.length; i++) {
      const seg1 = offsetSegments[i];
      const seg2 = offsetSegments[(i + 1) % offsetSegments.length];

      const intersection = findLineIntersection(
        seg1.start,
        seg1.end,
        seg2.start,
        seg2.end
      );

      if (intersection) {
        offsetVertices.push(intersection);
      } else {
        // Parallel segments - use endpoint
        offsetVertices.push(seg1.end);
      }
    }
  }

  return {
    ...polyline,
    id: `${polyline.id}_offset`,
    selected: false,
    vertices: offsetVertices,
  };
}

/**
 * Offset a circle by a given distance
 * Inside offset: radius - distance
 * Outside offset: radius + distance
 */
export function offsetCircle(
  circle: CircleEntity,
  distance: number,
  side: 'inside' | 'outside'
): CircleEntity | null {
  const newRadius = side === 'inside'
    ? circle.radius - distance
    : circle.radius + distance;

  // Cannot create circle with negative radius
  if (newRadius <= 0) {
    return null;
  }

  return {
    ...circle,
    id: `${circle.id}_offset`,
    selected: false,
    radius: newRadius,
  };
}

/**
 * Determine which side of a line a point is on
 * Returns 'left' or 'right' based on the cross product
 */
export function getSideOfLine(
  lineStart: Point3D,
  lineEnd: Point3D,
  point: Point3D
): 'left' | 'right' {
  const cross = (lineEnd.x - lineStart.x) * (point.y - lineStart.y) -
                (lineEnd.y - lineStart.y) * (point.x - lineStart.x);

  return cross > 0 ? 'left' : 'right';
}

/**
 * Determine which side (inside/outside) of a circle a point is on
 */
export function getSideOfCircle(
  center: Point3D,
  radius: number,
  point: Point3D
): 'inside' | 'outside' {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < radius ? 'inside' : 'outside';
}

/**
 * Main offset function that dispatches to the appropriate entity type
 */
export function offsetEntity(
  entity: AnyCADEntity,
  distance: number,
  clickPoint?: Point3D
): AnyCADEntity | null {
  switch (entity.type) {
    case 'line': {
      const line = entity as LineEntity;
      const side = clickPoint
        ? getSideOfLine(line.start, line.end, clickPoint)
        : 'left';
      return offsetLine(line, distance, side);
    }

    case 'polyline': {
      const polyline = entity as PolylineEntity;
      const side = clickPoint && polyline.vertices.length >= 2
        ? getSideOfLine(polyline.vertices[0], polyline.vertices[1], clickPoint)
        : 'left';
      return offsetPolyline(polyline, distance, side);
    }

    case 'circle': {
      const circle = entity as CircleEntity;
      const side = clickPoint
        ? getSideOfCircle(circle.center, circle.radius, clickPoint)
        : 'outside';
      return offsetCircle(circle, distance, side);
    }

    default:
      // Entity type not supported for offset
      return null;
  }
}
