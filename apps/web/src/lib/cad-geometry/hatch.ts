/**
 * CAD Geometry - Hatch/Pattern Fill Utilities
 *
 * Functions for generating hatch patterns within closed boundaries.
 * Supports AutoCAD-style hatch patterns for civil engineering drawings.
 */

import type { Point2D, Point3D, HatchPattern, HatchEntity, AnyCADEntity, PolylineEntity } from '@/types/cad';

/**
 * Generate hatch lines for ANSI31 pattern (45° lines)
 * @param boundary - Bounding box of the hatch region
 * @param scale - Pattern scale factor
 * @param angle - Pattern rotation in radians
 */
export function generateANSI31Pattern(
  boundary: { minX: number; minY: number; maxX: number; maxY: number },
  scale: number,
  angle: number
): { start: Point2D; end: Point2D }[] {
  const lines: { start: Point2D; end: Point2D }[] = [];
  const spacing = 5 * scale; // 5 units between lines

  // Calculate pattern angle (45° + rotation)
  const patternAngle = Math.PI / 4 + angle;
  const cos = Math.cos(patternAngle);
  const sin = Math.sin(patternAngle);

  // Calculate perpendicular direction for line spacing
  const perpCos = Math.cos(patternAngle + Math.PI / 2);
  const perpSin = Math.sin(patternAngle + Math.PI / 2);

  // Calculate bounding box diagonal
  const diagonal = Math.sqrt(
    Math.pow(boundary.maxX - boundary.minX, 2) + Math.pow(boundary.maxY - boundary.minY, 2)
  );

  // Number of lines needed
  const numLines = Math.ceil(diagonal / spacing) * 2;

  // Center point of boundary
  const centerX = (boundary.minX + boundary.maxX) / 2;
  const centerY = (boundary.minY + boundary.maxY) / 2;

  // Generate parallel lines
  for (let i = -numLines; i <= numLines; i++) {
    const offset = i * spacing;

    // Line passes through center + offset in perpendicular direction
    const lineOriginX = centerX + perpCos * offset;
    const lineOriginY = centerY + perpSin * offset;

    // Extend line in both directions
    const start: Point2D = {
      x: lineOriginX - cos * diagonal,
      y: lineOriginY - sin * diagonal,
    };
    const end: Point2D = {
      x: lineOriginX + cos * diagonal,
      y: lineOriginY + sin * diagonal,
    };

    lines.push({ start, end });
  }

  return lines;
}

/**
 * Generate hatch lines for ANSI32 pattern (brick pattern)
 * @param boundary - Bounding box of the hatch region
 * @param scale - Pattern scale factor
 * @param angle - Pattern rotation in radians
 */
export function generateANSI32Pattern(
  boundary: { minX: number; minY: number; maxX: number; maxY: number },
  scale: number,
  angle: number
): { start: Point2D; end: Point2D }[] {
  const lines: { start: Point2D; end: Point2D }[] = [];
  const horizontalSpacing = 10 * scale;
  const verticalSpacing = 5 * scale;
  const brickOffset = horizontalSpacing / 2;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const width = boundary.maxX - boundary.minX;
  const height = boundary.maxY - boundary.minY;
  const numRows = Math.ceil(height / verticalSpacing) + 2;
  const numCols = Math.ceil(width / horizontalSpacing) + 2;

  // Generate horizontal lines with brick offset
  for (let row = 0; row < numRows; row++) {
    const y = boundary.minY + row * verticalSpacing;
    const offset = (row % 2) * brickOffset;

    for (let col = 0; col < numCols; col++) {
      const x = boundary.minX + col * horizontalSpacing + offset;

      // Horizontal line segment
      const start: Point2D = { x, y };
      const end: Point2D = { x: x + horizontalSpacing, y };

      // Apply rotation
      const rotatedStart = rotatePoint(start, { x: boundary.minX, y: boundary.minY }, angle);
      const rotatedEnd = rotatePoint(end, { x: boundary.minX, y: boundary.minY }, angle);

      lines.push({ start: rotatedStart, end: rotatedEnd });
    }
  }

  // Generate vertical lines
  for (let col = 0; col < numCols + 1; col++) {
    for (let row = 0; row < numRows; row++) {
      const offset = (row % 2) * brickOffset;
      const x = boundary.minX + col * horizontalSpacing + offset;
      const y = boundary.minY + row * verticalSpacing;

      const start: Point2D = { x, y };
      const end: Point2D = { x, y: y + verticalSpacing };

      // Apply rotation
      const rotatedStart = rotatePoint(start, { x: boundary.minX, y: boundary.minY }, angle);
      const rotatedEnd = rotatePoint(end, { x: boundary.minX, y: boundary.minY }, angle);

      lines.push({ start: rotatedStart, end: rotatedEnd });
    }
  }

  return lines;
}

/**
 * Generate hatch lines for ANSI33 pattern (square pattern)
 * @param boundary - Bounding box of the hatch region
 * @param scale - Pattern scale factor
 * @param angle - Pattern rotation in radians
 */
export function generateANSI33Pattern(
  boundary: { minX: number; minY: number; maxX: number; maxY: number },
  scale: number,
  angle: number
): { start: Point2D; end: Point2D }[] {
  const lines: { start: Point2D; end: Point2D }[] = [];
  const spacing = 8 * scale;

  const width = boundary.maxX - boundary.minX;
  const height = boundary.maxY - boundary.minY;
  const numRows = Math.ceil(height / spacing) + 2;
  const numCols = Math.ceil(width / spacing) + 2;

  // Generate horizontal lines
  for (let row = 0; row <= numRows; row++) {
    const y = boundary.minY + row * spacing;
    const start: Point2D = { x: boundary.minX, y };
    const end: Point2D = { x: boundary.maxX, y };

    const rotatedStart = rotatePoint(start, { x: boundary.minX, y: boundary.minY }, angle);
    const rotatedEnd = rotatePoint(end, { x: boundary.minX, y: boundary.minY }, angle);

    lines.push({ start: rotatedStart, end: rotatedEnd });
  }

  // Generate vertical lines
  for (let col = 0; col <= numCols; col++) {
    const x = boundary.minX + col * spacing;
    const start: Point2D = { x, y: boundary.minY };
    const end: Point2D = { x, y: boundary.maxY };

    const rotatedStart = rotatePoint(start, { x: boundary.minX, y: boundary.minY }, angle);
    const rotatedEnd = rotatePoint(end, { x: boundary.minX, y: boundary.minY }, angle);

    lines.push({ start: rotatedStart, end: rotatedEnd });
  }

  return lines;
}

/**
 * Generate hatch lines for ANSI37 pattern (concrete)
 * @param boundary - Bounding box of the hatch region
 * @param scale - Pattern scale factor
 * @param angle - Pattern rotation in radians
 */
export function generateANSI37Pattern(
  boundary: { minX: number; minY: number; maxX: number; maxY: number },
  scale: number,
  angle: number
): { start: Point2D; end: Point2D }[] {
  const lines: { start: Point2D; end: Point2D }[] = [];
  const spacing = 6 * scale;

  // Random-looking pattern (pseudo-random based on position)
  const width = boundary.maxX - boundary.minX;
  const height = boundary.maxY - boundary.minY;
  const numRows = Math.ceil(height / spacing) + 2;
  const numCols = Math.ceil(width / spacing) + 2;

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const x = boundary.minX + col * spacing + (Math.sin(row * 1.3 + col * 0.7) * spacing * 0.3);
      const y = boundary.minY + row * spacing + (Math.cos(row * 0.9 + col * 1.1) * spacing * 0.3);
      const length = spacing * 0.4;
      const localAngle = angle + (Math.sin(row * 2.1 + col * 1.7) * Math.PI / 6);

      const start: Point2D = {
        x: x - Math.cos(localAngle) * length / 2,
        y: y - Math.sin(localAngle) * length / 2,
      };
      const end: Point2D = {
        x: x + Math.cos(localAngle) * length / 2,
        y: y + Math.sin(localAngle) * length / 2,
      };

      lines.push({ start, end });
    }
  }

  return lines;
}

/**
 * Generate hatch lines for grass pattern
 * @param boundary - Bounding box of the hatch region
 * @param scale - Pattern scale factor
 * @param angle - Pattern rotation in radians
 */
export function generateGrassPattern(
  boundary: { minX: number; minY: number; maxX: number; maxY: number },
  scale: number,
  angle: number
): { start: Point2D; end: Point2D }[] {
  const lines: { start: Point2D; end: Point2D }[] = [];
  const spacing = 4 * scale;
  const bladeHeight = 3 * scale;

  const width = boundary.maxX - boundary.minX;
  const height = boundary.maxY - boundary.minY;
  const numRows = Math.ceil(height / spacing) + 2;
  const numCols = Math.ceil(width / spacing) + 2;

  // Generate grass blades (short vertical lines)
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const x = boundary.minX + col * spacing + (Math.sin(row * 1.1 + col * 0.8) * spacing * 0.4);
      const y = boundary.minY + row * spacing + (Math.cos(row * 0.7 + col * 1.3) * spacing * 0.4);
      const localAngle = angle + Math.PI / 2 + (Math.sin(row * 1.5 + col * 2.1) * Math.PI / 12);

      const start: Point2D = { x, y };
      const end: Point2D = {
        x: x + Math.cos(localAngle) * bladeHeight,
        y: y + Math.sin(localAngle) * bladeHeight,
      };

      lines.push({ start, end });
    }
  }

  return lines;
}

/**
 * Rotate a point around a center
 */
function rotatePoint(point: Point2D, center: Point2D, angle: number): Point2D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Calculate bounding box for an array of entities
 */
export function calculateBoundingBox(entities: AnyCADEntity[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (entities.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  entities.forEach(entity => {
    switch (entity.type) {
      case 'point': {
        const pt = entity;
        if ('position' in pt) {
          minX = Math.min(minX, pt.position.x);
          minY = Math.min(minY, pt.position.y);
          maxX = Math.max(maxX, pt.position.x);
          maxY = Math.max(maxY, pt.position.y);
        }
        break;
      }
      case 'line': {
        const line = entity;
        if ('start' in line && 'end' in line) {
          minX = Math.min(minX, line.start.x, line.end.x);
          minY = Math.min(minY, line.start.y, line.end.y);
          maxX = Math.max(maxX, line.start.x, line.end.x);
          maxY = Math.max(maxY, line.start.y, line.end.y);
        }
        break;
      }
      case 'polyline': {
        const poly = entity as PolylineEntity;
        poly.vertices.forEach(v => {
          minX = Math.min(minX, v.x);
          minY = Math.min(minY, v.y);
          maxX = Math.max(maxX, v.x);
          maxY = Math.max(maxY, v.y);
        });
        break;
      }
      case 'circle': {
        const circle = entity;
        if ('center' in circle && 'radius' in circle) {
          minX = Math.min(minX, circle.center.x - circle.radius);
          minY = Math.min(minY, circle.center.y - circle.radius);
          maxX = Math.max(maxX, circle.center.x + circle.radius);
          maxY = Math.max(maxY, circle.center.y + circle.radius);
        }
        break;
      }
    }
  });

  if (minX === Infinity || maxX === -Infinity) return null;

  return { minX, minY, maxX, maxY };
}

/**
 * Generate hatch pattern lines based on pattern type
 */
export function generateHatchPattern(
  pattern: HatchPattern,
  boundary: { minX: number; minY: number; maxX: number; maxY: number },
  scale: number,
  angle: number
): { start: Point2D; end: Point2D }[] {
  switch (pattern) {
    case 'ansi31':
      return generateANSI31Pattern(boundary, scale, angle);
    case 'ansi32':
      return generateANSI32Pattern(boundary, scale, angle);
    case 'ansi33':
      return generateANSI33Pattern(boundary, scale, angle);
    case 'ansi37':
      return generateANSI37Pattern(boundary, scale, angle);
    case 'grass':
      return generateGrassPattern(boundary, scale, angle);
    case 'solid':
      return []; // Solid fill rendered differently
    default:
      return generateANSI31Pattern(boundary, scale, angle); // Default pattern
  }
}

/**
 * Create a hatch entity
 */
export function createHatchEntity(
  boundaryIds: string[],
  pattern: HatchPattern,
  angle: number,
  scale: number,
  layer: string
): HatchEntity {
  return {
    id: `hatch_${Date.now()}`,
    type: 'hatch',
    layer,
    visible: true,
    selected: false,
    boundaryIds,
    pattern,
    angle,
    scale,
  };
}
