/**
 * CAD Geometry - Transformation Utilities
 *
 * Functions for transforming geometric entities (translate, rotate, scale, mirror).
 * Used by COPY, MOVE, ROTATE, MIRROR, and ARRAY tools.
 */

import type {
  Point3D,
  LineEntity,
  PolylineEntity,
  CircleEntity,
  ArcEntity,
  PointEntity,
  TextEntity,
  AnyCADEntity,
} from '@/types/cad';

/**
 * Translate (move) a point by delta x, y, z
 */
export function translatePoint(point: Point3D, dx: number, dy: number, dz: number = 0): Point3D {
  return {
    x: point.x + dx,
    y: point.y + dy,
    z: point.z + dz,
  };
}

/**
 * Translate an entire entity by delta x, y, z
 * Returns a new entity with updated coordinates
 */
export function translateEntity(
  entity: AnyCADEntity,
  dx: number,
  dy: number,
  dz: number = 0
): AnyCADEntity {
  switch (entity.type) {
    case 'point': {
      const pt = entity as PointEntity;
      return {
        ...pt,
        id: `${pt.id}_translated`,
        selected: false,
        position: translatePoint(pt.position, dx, dy, dz),
      };
    }

    case 'line': {
      const line = entity as LineEntity;
      return {
        ...line,
        id: `${line.id}_translated`,
        selected: false,
        start: translatePoint(line.start, dx, dy, dz),
        end: translatePoint(line.end, dx, dy, dz),
      };
    }

    case 'polyline': {
      const polyline = entity as PolylineEntity;
      return {
        ...polyline,
        id: `${polyline.id}_translated`,
        selected: false,
        vertices: polyline.vertices.map(v => translatePoint(v, dx, dy, dz)),
      };
    }

    case 'circle': {
      const circle = entity as CircleEntity;
      return {
        ...circle,
        id: `${circle.id}_translated`,
        selected: false,
        center: translatePoint(circle.center, dx, dy, dz),
      };
    }

    case 'arc': {
      const arc = entity as ArcEntity;
      return {
        ...arc,
        id: `${arc.id}_translated`,
        selected: false,
        center: translatePoint(arc.center, dx, dy, dz),
      };
    }

    case 'text': {
      const text = entity as TextEntity;
      return {
        ...text,
        id: `${text.id}_translated`,
        selected: false,
        position: translatePoint(text.position, dx, dy, dz),
      };
    }

    default:
      return entity;
  }
}

/**
 * Rotate a point around a center by angle (in radians)
 */
export function rotatePoint(point: Point3D, center: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
    z: point.z,
  };
}

/**
 * Rotate an entity around a center point by angle (in radians)
 */
export function rotateEntity(
  entity: AnyCADEntity,
  center: Point3D,
  angle: number
): AnyCADEntity {
  switch (entity.type) {
    case 'point': {
      const pt = entity as PointEntity;
      return {
        ...pt,
        id: `${pt.id}_rotated`,
        selected: false,
        position: rotatePoint(pt.position, center, angle),
      };
    }

    case 'line': {
      const line = entity as LineEntity;
      return {
        ...line,
        id: `${line.id}_rotated`,
        selected: false,
        start: rotatePoint(line.start, center, angle),
        end: rotatePoint(line.end, center, angle),
      };
    }

    case 'polyline': {
      const polyline = entity as PolylineEntity;
      return {
        ...polyline,
        id: `${polyline.id}_rotated`,
        selected: false,
        vertices: polyline.vertices.map(v => rotatePoint(v, center, angle)),
      };
    }

    case 'circle': {
      const circle = entity as CircleEntity;
      return {
        ...circle,
        id: `${circle.id}_rotated`,
        selected: false,
        center: rotatePoint(circle.center, center, angle),
      };
    }

    case 'arc': {
      const arc = entity as ArcEntity;
      return {
        ...arc,
        id: `${arc.id}_rotated`,
        selected: false,
        center: rotatePoint(arc.center, center, angle),
        startAngle: arc.startAngle + angle,
        endAngle: arc.endAngle + angle,
      };
    }

    case 'text': {
      const text = entity as TextEntity;
      return {
        ...text,
        id: `${text.id}_rotated`,
        selected: false,
        position: rotatePoint(text.position, center, angle),
        rotation: text.rotation + angle,
      };
    }

    default:
      return entity;
  }
}

/**
 * Scale a point relative to a center by a scale factor
 */
export function scalePoint(point: Point3D, center: Point3D, factor: number): Point3D {
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * factor,
    y: center.y + dy * factor,
    z: point.z,
  };
}

/**
 * Scale an entity relative to a center point by a scale factor
 */
export function scaleEntity(
  entity: AnyCADEntity,
  center: Point3D,
  factor: number
): AnyCADEntity {
  switch (entity.type) {
    case 'point': {
      const pt = entity as PointEntity;
      return {
        ...pt,
        id: `${pt.id}_scaled`,
        selected: false,
        position: scalePoint(pt.position, center, factor),
      };
    }

    case 'line': {
      const line = entity as LineEntity;
      return {
        ...line,
        id: `${line.id}_scaled`,
        selected: false,
        start: scalePoint(line.start, center, factor),
        end: scalePoint(line.end, center, factor),
      };
    }

    case 'polyline': {
      const polyline = entity as PolylineEntity;
      return {
        ...polyline,
        id: `${polyline.id}_scaled`,
        selected: false,
        vertices: polyline.vertices.map(v => scalePoint(v, center, factor)),
      };
    }

    case 'circle': {
      const circle = entity as CircleEntity;
      return {
        ...circle,
        id: `${circle.id}_scaled`,
        selected: false,
        center: scalePoint(circle.center, center, factor),
        radius: circle.radius * factor,
      };
    }

    case 'arc': {
      const arc = entity as ArcEntity;
      return {
        ...arc,
        id: `${arc.id}_scaled`,
        selected: false,
        center: scalePoint(arc.center, center, factor),
        radius: arc.radius * factor,
      };
    }

    case 'text': {
      const text = entity as TextEntity;
      return {
        ...text,
        id: `${text.id}_scaled`,
        selected: false,
        position: scalePoint(text.position, center, factor),
        height: text.height * factor,
      };
    }

    default:
      return entity;
  }
}

/**
 * Mirror a point across an axis defined by two points
 */
export function mirrorPoint(point: Point3D, axisStart: Point3D, axisEnd: Point3D): Point3D {
  // Vector along the mirror axis
  const dx = axisEnd.x - axisStart.x;
  const dy = axisEnd.y - axisStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return point; // Invalid axis

  // Normalize axis vector
  const axisX = dx / length;
  const axisY = dy / length;

  // Vector from axis start to point
  const px = point.x - axisStart.x;
  const py = point.y - axisStart.y;

  // Project point onto axis
  const projection = px * axisX + py * axisY;

  // Find mirrored point
  return {
    x: axisStart.x + 2 * projection * axisX - px,
    y: axisStart.y + 2 * projection * axisY - py,
    z: point.z,
  };
}

/**
 * Mirror an entity across an axis defined by two points
 */
export function mirrorEntity(
  entity: AnyCADEntity,
  axis: { start: Point3D; end: Point3D }
): AnyCADEntity {
  switch (entity.type) {
    case 'point': {
      const pt = entity as PointEntity;
      return {
        ...pt,
        id: `${pt.id}_mirrored`,
        selected: false,
        position: mirrorPoint(pt.position, axis.start, axis.end),
      };
    }

    case 'line': {
      const line = entity as LineEntity;
      return {
        ...line,
        id: `${line.id}_mirrored`,
        selected: false,
        start: mirrorPoint(line.start, axis.start, axis.end),
        end: mirrorPoint(line.end, axis.start, axis.end),
      };
    }

    case 'polyline': {
      const polyline = entity as PolylineEntity;
      return {
        ...polyline,
        id: `${polyline.id}_mirrored`,
        selected: false,
        vertices: polyline.vertices.map(v => mirrorPoint(v, axis.start, axis.end)),
      };
    }

    case 'circle': {
      const circle = entity as CircleEntity;
      return {
        ...circle,
        id: `${circle.id}_mirrored`,
        selected: false,
        center: mirrorPoint(circle.center, axis.start, axis.end),
      };
    }

    case 'arc': {
      const arc = entity as ArcEntity;
      // Mirror the arc and flip angles
      const mirroredCenter = mirrorPoint(arc.center, axis.start, axis.end);
      return {
        ...arc,
        id: `${arc.id}_mirrored`,
        selected: false,
        center: mirroredCenter,
        startAngle: -arc.endAngle,
        endAngle: -arc.startAngle,
      };
    }

    case 'text': {
      const text = entity as TextEntity;
      return {
        ...text,
        id: `${text.id}_mirrored`,
        selected: false,
        position: mirrorPoint(text.position, axis.start, axis.end),
        // Text rotation should be mirrored as well
        rotation: -text.rotation,
      };
    }

    default:
      return entity;
  }
}

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
 * Calculate angle from p1 to p2 in radians
 */
export function calculateAngle(p1: Point3D, p2: Point3D): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
