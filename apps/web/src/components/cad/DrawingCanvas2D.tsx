'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useCADStore } from '@/stores/cad-store';
import { useInfrastructureStore } from '@/stores/infrastructure-store';
import type { Point2D, Point3D, LineEntity, PointEntity, PolylineEntity, CircleEntity, ArcEntity, TextEntity, DimensionEntity, HatchEntity, HatchPattern } from '@/types/cad';
import { renderInfrastructureEntity, isInfraEntity } from './InfrastructureRenderer';
import type { AnyInfrastructureEntity } from '@/types/infrastructure-entities';
import {
  createWaterPipe,
  createWaterJunction,
  createSewerPipe,
  createManhole,
  createStormCollector,
  createStormInlet,
} from '@/types/infrastructure-entities';
import { offsetEntity } from '@/lib/cad-geometry/offset';
import { trimLineAtIntersection, extendLineToIntersection } from '@/lib/cad-geometry/intersection';
import {
  translateEntity,
  rotateEntity,
  rotatePoint,
  calculateAngle,
  radiansToDegrees,
  degreesToRadians,
  calculateDistance,
} from '@/lib/cad-geometry/transform';
import { calculateFillet, validateFillet } from '@/lib/cad-geometry/fillet';
import {
  findIntersectionSnaps,
  findPerpendicularSnapOnLine,
  findPerpendicularSnapOnCircle,
  findTangentSnapsOnCircle,
  findNearestSnapOnEntity,
  findClosestSnap,
  distance,
  type SnapPoint,
} from '@/lib/cad-geometry/snap';
import {
  calculateLinearDimension,
  calculateAlignedDimension,
  calculateAngularDimension,
  calculateRadialDimension,
  calculateDiameterDimension,
  DEFAULT_DIMENSION_STYLE,
} from '@/lib/cad-geometry/dimension';
import {
  generateHatchPattern,
  calculateBoundingBox,
  createHatchEntity,
} from '@/lib/cad-geometry/hatch';

/**
 * Helper function to get the center point of any entity
 */
function getEntityCenter(entity: AnyCADEntity): Point3D {
  switch (entity.type) {
    case 'point':
      return entity.position;
    case 'line':
      // Return midpoint of line
      return {
        x: (entity.start.x + entity.end.x) / 2,
        y: (entity.start.y + entity.end.y) / 2,
        z: (entity.start.z + entity.end.z) / 2,
      };
    case 'polyline':
      // Return average of all vertices
      if (entity.vertices.length === 0) return { x: 0, y: 0, z: 0 };
      const sum = entity.vertices.reduce(
        (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y, z: acc.z + v.z }),
        { x: 0, y: 0, z: 0 }
      );
      return {
        x: sum.x / entity.vertices.length,
        y: sum.y / entity.vertices.length,
        z: sum.z / entity.vertices.length,
      };
    case 'circle':
    case 'arc':
      return entity.center;
    case 'text':
      return entity.position;
    case 'dimension':
      // Return midpoint of definition points
      return {
        x: (entity.defPoint1.x + entity.defPoint2.x) / 2,
        y: (entity.defPoint1.y + entity.defPoint2.y) / 2,
        z: (entity.defPoint1.z + entity.defPoint2.z) / 2,
      };
    case 'hatch':
      // Return center of bounding box
      const bbox = entity.boundingBox;
      return {
        x: (bbox.min.x + bbox.max.x) / 2,
        y: (bbox.min.y + bbox.max.y) / 2,
        z: (bbox.min.z + bbox.max.z) / 2,
      };
    default:
      return { x: 0, y: 0, z: 0 };
  }
}

interface DrawingCanvas2DProps {
  className?: string;
  onCursorUpdate?: (pos: Point2D) => void;
  onDrawingInfoUpdate?: (info: {
    distance?: number;
    angle?: number;
    deltaX?: number;
    deltaY?: number;
  }) => void;
}

export default function DrawingCanvas2D({
  className = '',
  onCursorUpdate,
  onDrawingInfoUpdate
}: DrawingCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<Point2D>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point2D | null>(null);
  const [polylineVertices, setPolylineVertices] = useState<Point3D[]>([]);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [arcStart, setArcStart] = useState<Point3D | null>(null);
  const [arcEnd, setArcEnd] = useState<Point3D | null>(null);
  const [textPlacement, setTextPlacement] = useState<Point3D | null>(null);
  const [measurePoints, setMeasurePoints] = useState<Point3D[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point2D | null>(null);
  const [trimExtendBoundaries, setTrimExtendBoundaries] = useState<Set<string>>(new Set());
  const [copyMoveBasePoint, setCopyMoveBasePoint] = useState<Point3D | null>(null);
  const [filletFirstLine, setFilletFirstLine] = useState<LineEntity | null>(null);
  const [filletRadius, setFilletRadius] = useState<number>(10);
  const [dimensionDefPoint1, setDimensionDefPoint1] = useState<Point3D | null>(null);
  const [dimensionDefPoint2, setDimensionDefPoint2] = useState<Point3D | null>(null);
  const [hatchBoundaries, setHatchBoundaries] = useState<Set<string>>(new Set());
  const [rotateCenter, setRotateCenter] = useState<Point3D | null>(null);
  const [editingPolylineId, setEditingPolylineId] = useState<string | null>(null);
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [hoveredVertexIndex, setHoveredVertexIndex] = useState<number | null>(null);

  const {
    entities,
    viewState,
    activeTool,
    activeLayer,
    addEntity,
    removeEntity,
    setZoom,
    setPan,
    selectEntity,
    deselectAll,
    selectedIds,
    updateEntity,
    placementDetail,
    insertDetailAtPosition,
    cancelPlacement,
    undo,
    redo,
    setActiveTool,
  } = useCADStore();

  const {
    addInfraEntity,
    infrastructureEntities,
    findNearestNode,
    autoConnectPipe,
  } = useInfrastructureStore();

  // Track multi-click drawing state for infrastructure pipes
  const [infraDrawStart, setInfraDrawStart] = useState<Point3D | null>(null);
  const [snapPoint, setSnapPoint] = useState<{ point: Point2D; type: string } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ start: Point2D; end: Point2D } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Get snap/ortho/grid state from store
  const snapEnabled = useCADStore((state) => state.snapEnabled);
  const orthoEnabled = useCADStore((state) => state.orthoEnabled);
  const gridEnabled = useCADStore((state) => state.gridEnabled);
  const gridSpacing = useCADStore((state) => state.gridSpacing);
  const toggleSnap = useCADStore((state) => state.toggleSnap);
  const toggleOrtho = useCADStore((state) => state.toggleOrtho);
  const toggleGrid = useCADStore((state) => state.toggleGrid);

  // Calculate distance between two points
  const calculateDistance = useCallback((p1: Point3D, p2: Point3D): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, []);

  // Apply ortho mode constraint (snap to horizontal or vertical)
  const applyOrthoConstraint = useCallback((from: Point2D, to: Point2D): Point2D => {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);

    // Snap to the axis with larger displacement
    if (dx > dy) {
      // Horizontal
      return { x: to.x, y: from.y };
    } else {
      // Vertical
      return { x: from.x, y: to.y };
    }
  }, []);

  // Find nearest snap point with enhanced OSNAP modes
  const findSnapPoint = useCallback((worldPoint: Point2D, snapTolerance: number = 15): { point: Point2D; type: string } | null => {
    const entityArray = Array.from(entities.values()).filter(e => e.visible);
    const tolerance = snapTolerance / viewState.zoom;
    const allSnapPoints: SnapPoint[] = [];

    // 1. Collect basic snap points (endpoint, midpoint, center, quadrant)
    entityArray.forEach(entity => {
      switch (entity.type) {
        case 'point': {
          const pt = entity as PointEntity;
          allSnapPoints.push({
            point: { x: pt.position.x, y: pt.position.y },
            type: 'node',
            distance: distance(worldPoint, { x: pt.position.x, y: pt.position.y }),
          });
          break;
        }
        case 'line': {
          const line = entity as LineEntity;
          // Endpoints
          allSnapPoints.push({
            point: { x: line.start.x, y: line.start.y },
            type: 'endpoint',
            distance: distance(worldPoint, { x: line.start.x, y: line.start.y }),
          });
          allSnapPoints.push({
            point: { x: line.end.x, y: line.end.y },
            type: 'endpoint',
            distance: distance(worldPoint, { x: line.end.x, y: line.end.y }),
          });
          // Midpoint
          const midpoint = { x: (line.start.x + line.end.x) / 2, y: (line.start.y + line.end.y) / 2 };
          allSnapPoints.push({
            point: midpoint,
            type: 'midpoint',
            distance: distance(worldPoint, midpoint),
          });
          // Perpendicular snap
          const perpPoint = findPerpendicularSnapOnLine(line, worldPoint);
          if (perpPoint) {
            allSnapPoints.push({
              point: perpPoint,
              type: 'perpendicular',
              distance: distance(worldPoint, perpPoint),
            });
          }
          break;
        }
        case 'circle': {
          const circle = entity as CircleEntity;
          // Center
          allSnapPoints.push({
            point: { x: circle.center.x, y: circle.center.y },
            type: 'center',
            distance: distance(worldPoint, { x: circle.center.x, y: circle.center.y }),
          });
          // Quadrant points
          const quadrants = [
            { x: circle.center.x + circle.radius, y: circle.center.y },
            { x: circle.center.x - circle.radius, y: circle.center.y },
            { x: circle.center.x, y: circle.center.y + circle.radius },
            { x: circle.center.x, y: circle.center.y - circle.radius },
          ];
          quadrants.forEach(q => {
            allSnapPoints.push({
              point: q,
              type: 'quadrant',
              distance: distance(worldPoint, q),
            });
          });
          // Perpendicular snap (nearest point on circle)
          const perpPoint = findPerpendicularSnapOnCircle(circle, worldPoint);
          if (perpPoint) {
            allSnapPoints.push({
              point: perpPoint,
              type: 'perpendicular',
              distance: distance(worldPoint, perpPoint),
            });
          }
          // Tangent snaps
          const tangentPoints = findTangentSnapsOnCircle(circle, worldPoint);
          tangentPoints.forEach(tp => {
            allSnapPoints.push({
              point: tp,
              type: 'tangent',
              distance: distance(worldPoint, tp),
            });
          });
          break;
        }
        case 'arc': {
          const arc = entity as ArcEntity;
          // Center
          allSnapPoints.push({
            point: { x: arc.center.x, y: arc.center.y },
            type: 'center',
            distance: distance(worldPoint, { x: arc.center.x, y: arc.center.y }),
          });
          // Start and end points
          const startPoint = {
            x: arc.center.x + arc.radius * Math.cos(arc.startAngle),
            y: arc.center.y + arc.radius * Math.sin(arc.startAngle),
          };
          const endPoint = {
            x: arc.center.x + arc.radius * Math.cos(arc.endAngle),
            y: arc.center.y + arc.radius * Math.sin(arc.endAngle),
          };
          allSnapPoints.push({
            point: startPoint,
            type: 'endpoint',
            distance: distance(worldPoint, startPoint),
          });
          allSnapPoints.push({
            point: endPoint,
            type: 'endpoint',
            distance: distance(worldPoint, endPoint),
          });
          // Midpoint of arc
          const midAngle = (arc.startAngle + arc.endAngle) / 2;
          const midpoint = {
            x: arc.center.x + arc.radius * Math.cos(midAngle),
            y: arc.center.y + arc.radius * Math.sin(midAngle),
          };
          allSnapPoints.push({
            point: midpoint,
            type: 'midpoint',
            distance: distance(worldPoint, midpoint),
          });
          break;
        }
        case 'polyline': {
          const polyline = entity as PolylineEntity;
          // All vertices are endpoints
          polyline.vertices.forEach(v => {
            allSnapPoints.push({
              point: { x: v.x, y: v.y },
              type: 'endpoint',
              distance: distance(worldPoint, { x: v.x, y: v.y }),
            });
          });
          // Midpoints and perpendicular snaps for segments
          for (let i = 0; i < polyline.vertices.length - 1; i++) {
            const v1 = polyline.vertices[i];
            const v2 = polyline.vertices[i + 1];
            const midpoint = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };
            allSnapPoints.push({
              point: midpoint,
              type: 'midpoint',
              distance: distance(worldPoint, midpoint),
            });

            // Perpendicular snap on this segment
            const segment: LineEntity = {
              id: 'temp',
              type: 'line',
              layer: polyline.layer,
              visible: true,
              selected: false,
              start: v1,
              end: v2,
            };
            const perpPoint = findPerpendicularSnapOnLine(segment, worldPoint);
            if (perpPoint) {
              allSnapPoints.push({
                point: perpPoint,
                type: 'perpendicular',
                distance: distance(worldPoint, perpPoint),
              });
            }
          }
          break;
        }
        case 'text': {
          const text = entity as TextEntity;
          allSnapPoints.push({
            point: { x: text.position.x, y: text.position.y },
            type: 'node',
            distance: distance(worldPoint, { x: text.position.x, y: text.position.y }),
          });
          break;
        }
      }
    });

    // 2. Find intersection snaps between all pairs of entities
    for (let i = 0; i < entityArray.length; i++) {
      for (let j = i + 1; j < entityArray.length; j++) {
        const intersectionPoints = findIntersectionSnaps(entityArray[i], entityArray[j]);
        intersectionPoints.forEach(pt => {
          allSnapPoints.push({
            point: pt,
            type: 'intersection',
            distance: distance(worldPoint, pt),
          });
        });
      }
    }

    // 3. Find the closest snap within tolerance
    return findClosestSnap(allSnapPoints, tolerance);
  }, [entities, viewState.zoom]);

  // Find entity at point (hit testing)
  const findEntityAtPoint = useCallback((worldPoint: Point2D, tolerance: number = 5): string | null => {
    const entityArray = Array.from(entities.values());

    // Check entities in reverse order (last drawn = first checked)
    for (let i = entityArray.length - 1; i >= 0; i--) {
      const entity = entityArray[i];
      if (!entity.visible) continue;

      switch (entity.type) {
        case 'point': {
          const pt = entity as PointEntity;
          const dist = Math.sqrt(
            Math.pow(worldPoint.x - pt.position.x, 2) +
            Math.pow(worldPoint.y - pt.position.y, 2)
          );
          if (dist <= tolerance / viewState.zoom) return entity.id;
          break;
        }
        case 'line': {
          const line = entity as LineEntity;
          // Distance from point to line segment
          const dx = line.end.x - line.start.x;
          const dy = line.end.y - line.start.y;
          const lengthSquared = dx * dx + dy * dy;
          if (lengthSquared === 0) {
            const dist = Math.sqrt(
              Math.pow(worldPoint.x - line.start.x, 2) +
              Math.pow(worldPoint.y - line.start.y, 2)
            );
            if (dist <= tolerance / viewState.zoom) return entity.id;
          } else {
            const t = Math.max(0, Math.min(1,
              ((worldPoint.x - line.start.x) * dx + (worldPoint.y - line.start.y) * dy) / lengthSquared
            ));
            const projX = line.start.x + t * dx;
            const projY = line.start.y + t * dy;
            const dist = Math.sqrt(
              Math.pow(worldPoint.x - projX, 2) +
              Math.pow(worldPoint.y - projY, 2)
            );
            if (dist <= tolerance / viewState.zoom) return entity.id;
          }
          break;
        }
        case 'circle': {
          const circle = entity as CircleEntity;
          const distToCenter = Math.sqrt(
            Math.pow(worldPoint.x - circle.center.x, 2) +
            Math.pow(worldPoint.y - circle.center.y, 2)
          );
          const distToCircle = Math.abs(distToCenter - circle.radius);
          if (distToCircle <= tolerance / viewState.zoom) return entity.id;
          break;
        }
        case 'polyline': {
          const polyline = entity as PolylineEntity;
          if (polyline.vertices.length < 2) continue;

          for (let j = 0; j < polyline.vertices.length - 1; j++) {
            const v1 = polyline.vertices[j];
            const v2 = polyline.vertices[j + 1];
            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            const lengthSquared = dx * dx + dy * dy;

            if (lengthSquared === 0) continue;

            const t = Math.max(0, Math.min(1,
              ((worldPoint.x - v1.x) * dx + (worldPoint.y - v1.y) * dy) / lengthSquared
            ));
            const projX = v1.x + t * dx;
            const projY = v1.y + t * dy;
            const dist = Math.sqrt(
              Math.pow(worldPoint.x - projX, 2) +
              Math.pow(worldPoint.y - projY, 2)
            );
            if (dist <= tolerance / viewState.zoom) return entity.id;
          }
          break;
        }
        case 'text': {
          const text = entity as TextEntity;
          // Simple bounding box check for text
          const approxWidth = text.text.length * text.height * 0.6;
          const approxHeight = text.height;

          if (worldPoint.x >= text.position.x - tolerance / viewState.zoom &&
              worldPoint.x <= text.position.x + approxWidth + tolerance / viewState.zoom &&
              worldPoint.y >= text.position.y - approxHeight - tolerance / viewState.zoom &&
              worldPoint.y <= text.position.y + tolerance / viewState.zoom) {
            return entity.id;
          }
          break;
        }
      }
    }

    return null;
  }, [entities, viewState.zoom]);

  // Find entities in selection box (window or crossing)
  const findEntitiesInBox = useCallback((box: { start: Point2D; end: Point2D }, crossingMode: boolean): string[] => {
    const entityArray = Array.from(entities.values());
    const selectedIds: string[] = [];

    const minX = Math.min(box.start.x, box.end.x);
    const maxX = Math.max(box.start.x, box.end.x);
    const minY = Math.min(box.start.y, box.end.y);
    const maxY = Math.max(box.start.y, box.end.y);

    entityArray.forEach(entity => {
      if (!entity.visible) return;

      let shouldSelect = false;

      switch (entity.type) {
        case 'point': {
          const pt = entity as PointEntity;
          const inside = pt.position.x >= minX && pt.position.x <= maxX &&
                        pt.position.y >= minY && pt.position.y <= maxY;
          shouldSelect = inside;
          break;
        }
        case 'line': {
          const line = entity as LineEntity;
          const start = line.start;
          const end = line.end;

          if (crossingMode) {
            // Crossing: select if line touches or crosses box
            const startInside = start.x >= minX && start.x <= maxX && start.y >= minY && start.y <= maxY;
            const endInside = end.x >= minX && end.x <= maxX && end.y >= minY && end.y <= maxY;
            shouldSelect = startInside || endInside ||
                          lineIntersectsBox(start, end, minX, minY, maxX, maxY);
          } else {
            // Window: select only if both endpoints are inside
            shouldSelect = (start.x >= minX && start.x <= maxX && start.y >= minY && start.y <= maxY) &&
                          (end.x >= minX && end.x <= maxX && end.y >= minY && end.y <= maxY);
          }
          break;
        }
        case 'circle': {
          const circle = entity as CircleEntity;
          const center = circle.center;

          if (crossingMode) {
            // Crossing: select if circle touches or overlaps box
            const closestX = Math.max(minX, Math.min(center.x, maxX));
            const closestY = Math.max(minY, Math.min(center.y, maxY));
            const dist = Math.sqrt(Math.pow(center.x - closestX, 2) + Math.pow(center.y - closestY, 2));
            shouldSelect = dist <= circle.radius;
          } else {
            // Window: select only if entire circle is inside
            shouldSelect = (center.x - circle.radius >= minX) &&
                          (center.x + circle.radius <= maxX) &&
                          (center.y - circle.radius >= minY) &&
                          (center.y + circle.radius <= maxY);
          }
          break;
        }
        case 'polyline': {
          const polyline = entity as PolylineEntity;
          if (crossingMode) {
            // Crossing: select if any vertex is inside or any segment crosses
            shouldSelect = polyline.vertices.some(v =>
              v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY
            );
          } else {
            // Window: select only if all vertices are inside
            shouldSelect = polyline.vertices.every(v =>
              v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY
            );
          }
          break;
        }
        case 'text': {
          const text = entity as TextEntity;
          const inside = text.position.x >= minX && text.position.x <= maxX &&
                        text.position.y >= minY && text.position.y <= maxY;
          shouldSelect = inside;
          break;
        }
      }

      if (shouldSelect) {
        selectedIds.push(entity.id);
      }
    });

    return selectedIds;
  }, [entities]);

  // Helper function to check if line intersects box
  const lineIntersectsBox = (start: Point3D, end: Point3D, minX: number, minY: number, maxX: number, maxY: number): boolean => {
    // Check if line segment crosses any of the box edges
    const lineSegmentIntersects = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean => {
      const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
      if (denom === 0) return false;

      const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
      const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    };

    // Check all four edges of the box
    return lineSegmentIntersects(start.x, start.y, end.x, end.y, minX, minY, maxX, minY) || // top
           lineSegmentIntersects(start.x, start.y, end.x, end.y, maxX, minY, maxX, maxY) || // right
           lineSegmentIntersects(start.x, start.y, end.x, end.y, maxX, maxY, minX, maxY) || // bottom
           lineSegmentIntersects(start.x, start.y, end.x, end.y, minX, maxY, minX, minY);   // left
  };

  // Calculate arc parameters from 3 points (start, end, point on arc)
  const calculateArcFrom3Points = useCallback((start: Point3D, end: Point3D, pointOnArc: Point3D) => {
    // Find the center by calculating intersection of perpendicular bisectors
    const mid1x = (start.x + pointOnArc.x) / 2;
    const mid1y = (start.y + pointOnArc.y) / 2;
    const mid2x = (end.x + pointOnArc.x) / 2;
    const mid2y = (end.y + pointOnArc.y) / 2;

    const dx1 = pointOnArc.x - start.x;
    const dy1 = pointOnArc.y - start.y;
    const dx2 = pointOnArc.x - end.x;
    const dy2 = pointOnArc.y - end.y;

    // Perpendicular slopes (negative reciprocal)
    const slope1 = dx1 !== 0 ? -dy1 / dx1 : Infinity;
    const slope2 = dx2 !== 0 ? -dy2 / dx2 : Infinity;

    let centerX: number, centerY: number;

    if (Math.abs(slope1) === Infinity) {
      centerX = mid1x;
      centerY = slope2 * (centerX - mid2x) + mid2y;
    } else if (Math.abs(slope2) === Infinity) {
      centerX = mid2x;
      centerY = slope1 * (centerX - mid1x) + mid1y;
    } else {
      centerX = (slope1 * mid1x - slope2 * mid2x + mid2y - mid1y) / (slope1 - slope2);
      centerY = slope1 * (centerX - mid1x) + mid1y;
    }

    // Calculate radius
    const radius = Math.sqrt(Math.pow(centerX - start.x, 2) + Math.pow(centerY - start.y, 2));

    // Calculate angles
    const startAngle = Math.atan2(start.y - centerY, start.x - centerX);
    const endAngle = Math.atan2(end.y - centerY, end.x - centerX);
    const midAngle = Math.atan2(pointOnArc.y - centerY, pointOnArc.x - centerX);

    // Determine if arc is counter-clockwise (CCW)
    // Check if midAngle is between startAngle and endAngle in CCW direction
    let normalizedMid = midAngle;
    let normalizedEnd = endAngle;
    if (startAngle > normalizedMid) normalizedMid += 2 * Math.PI;
    if (startAngle > normalizedEnd) normalizedEnd += 2 * Math.PI;

    return {
      center: { x: centerX, y: centerY, z: 0 },
      radius,
      startAngle,
      endAngle: normalizedMid > normalizedEnd ? endAngle - 2 * Math.PI : endAngle,
    };
  }, []);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point2D => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      return {
        x: (screenX - centerX - viewState.panX) / viewState.zoom,
        y: -(screenY - centerY - viewState.panY) / viewState.zoom,
      };
    },
    [viewState]
  );

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback(
    (worldX: number, worldY: number): Point2D => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      return {
        x: worldX * viewState.zoom + centerX + viewState.panX,
        y: -worldY * viewState.zoom + centerY + viewState.panY,
      };
    },
    [viewState]
  );

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw entities - render infrastructure entities with specialized renderer
    // Convert Map to array for iteration
    const entityArray = Array.from(entities.values());
    entityArray.forEach((entity) => {
      if (!entity.visible) return;

      // Check if this is an infrastructure entity
      if (isInfraEntity(entity)) {
        renderInfrastructureEntity(entity as AnyInfrastructureEntity, {
          ctx,
          worldToScreen,
          zoom: viewState.zoom,
        });
        return;
      }

      // Standard CAD entity rendering
      ctx.strokeStyle = entity.color || '#ffffff';
      ctx.lineWidth = entity.selected ? 2 : 1;

      switch (entity.type) {
        case 'point':
          drawPoint(ctx, entity as PointEntity);
          break;
        case 'line':
          drawLine(ctx, entity as LineEntity);
          break;
        case 'polyline':
          drawPolyline(ctx, entity as PolylineEntity);
          break;
        case 'circle':
          drawCircle(ctx, entity as CircleEntity);
          break;
        case 'arc':
          drawArc(ctx, entity as ArcEntity);
          break;
        case 'text':
          drawText(ctx, entity as TextEntity);
          break;
        case 'dimension':
          drawDimension(ctx, entity as DimensionEntity);
          break;
      }
    });

    // Also render infrastructure entities from the infrastructure store
    infrastructureEntities.forEach((entity) => {
      if (!entity.visible) return;
      renderInfrastructureEntity(entity, {
        ctx,
        worldToScreen,
        zoom: viewState.zoom,
      });
    });

    // Draw current drawing preview
    if (isDrawing && drawStart) {
      ctx.strokeStyle = '#e94560';
      ctx.setLineDash([5, 5]);

      if (activeTool === 'line') {
        ctx.beginPath();
        const start = worldToScreen(drawStart.x, drawStart.y);
        const end = worldToScreen(mousePos.x, mousePos.y);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (activeTool === 'circle') {
        const center = worldToScreen(drawStart.x, drawStart.y);
        const mouse = worldToScreen(mousePos.x, mousePos.y);
        const dx = mouse.x - center.x;
        const dy = mouse.y - center.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

    // Draw polyline preview
    if (activeTool === 'polyline' && polylineVertices.length > 0) {
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 2;

      // Draw completed segments
      ctx.beginPath();
      const firstPt = worldToScreen(polylineVertices[0].x, polylineVertices[0].y);
      ctx.moveTo(firstPt.x, firstPt.y);

      for (let i = 1; i < polylineVertices.length; i++) {
        const pt = worldToScreen(polylineVertices[i].x, polylineVertices[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Draw preview line from last vertex to mouse
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const lastPt = worldToScreen(
        polylineVertices[polylineVertices.length - 1].x,
        polylineVertices[polylineVertices.length - 1].y
      );
      const mousePt = worldToScreen(mousePos.x, mousePos.y);
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(mousePt.x, mousePt.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw vertex markers
      ctx.fillStyle = '#e94560';
      polylineVertices.forEach(v => {
        const pt = worldToScreen(v.x, v.y);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw instruction text
      ctx.fillStyle = '#e94560';
      ctx.font = '14px monospace';
      ctx.fillText('Click to add vertex, Enter or double-click to finish', 10, 30);
    }

    // Draw arc preview
    if (activeTool === 'arc') {
      if (arcStart && arcEnd) {
        // Two points selected, show preview arc with third point at mouse
        const pointOnArc: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
        try {
          const arcParams = calculateArcFrom3Points(arcStart, arcEnd, pointOnArc);
          const centerScreen = worldToScreen(arcParams.center.x, arcParams.center.y);
          const radiusScreen = arcParams.radius * viewState.zoom;

          ctx.strokeStyle = '#e94560';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(centerScreen.x, centerScreen.y, radiusScreen, -arcParams.startAngle, -arcParams.endAngle, arcParams.endAngle < arcParams.startAngle);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw center point
          ctx.fillStyle = '#e94560';
          ctx.beginPath();
          ctx.arc(centerScreen.x, centerScreen.y, 4, 0, Math.PI * 2);
          ctx.fill();

          // Draw instruction text
          ctx.fillStyle = '#e94560';
          ctx.font = '14px monospace';
          ctx.fillText('Click third point on arc', 10, 30);
        } catch (e) {
          // Invalid arc, show instruction
          ctx.fillStyle = '#e94560';
          ctx.font = '14px monospace';
          ctx.fillText('Click third point on arc (not collinear)', 10, 30);
        }

        // Draw start and end markers
        const startScreen = worldToScreen(arcStart.x, arcStart.y);
        const endScreen = worldToScreen(arcEnd.x, arcEnd.y);
        ctx.fillStyle = '#e94560';
        ctx.beginPath();
        ctx.arc(startScreen.x, startScreen.y, 5, 0, Math.PI * 2);
        ctx.arc(endScreen.x, endScreen.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (arcStart) {
        // One point selected, show line to mouse
        const startScreen = worldToScreen(arcStart.x, arcStart.y);
        const mouseScreen = worldToScreen(mousePos.x, mousePos.y);

        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startScreen.x, startScreen.y);
        ctx.lineTo(mouseScreen.x, mouseScreen.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw start marker
        ctx.fillStyle = '#e94560';
        ctx.beginPath();
        ctx.arc(startScreen.x, startScreen.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw instruction text
        ctx.fillStyle = '#e94560';
        ctx.font = '14px monospace';
        ctx.fillText('Click arc end point', 10, 30);
      } else {
        // No points selected yet
        ctx.fillStyle = '#e94560';
        ctx.font = '14px monospace';
        ctx.fillText('Click arc start point', 10, 30);
      }
    }

    // Draw text tool preview
    if (activeTool === 'text') {
      const mouseScreen = worldToScreen(mousePos.x, mousePos.y);

      // Draw crosshair at text placement point
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mouseScreen.x - 10, mouseScreen.y);
      ctx.lineTo(mouseScreen.x + 10, mouseScreen.y);
      ctx.moveTo(mouseScreen.x, mouseScreen.y - 10);
      ctx.lineTo(mouseScreen.x, mouseScreen.y + 10);
      ctx.stroke();

      // Draw sample text preview
      ctx.fillStyle = 'rgba(233, 69, 96, 0.5)';
      ctx.font = '16px Arial';
      ctx.fillText('Sample Text', mouseScreen.x + 5, mouseScreen.y - 5);

      // Draw instruction text
      ctx.fillStyle = '#e94560';
      ctx.font = '14px monospace';
      ctx.fillText('Click to place text', 10, 30);
    }

    // Draw measure tool preview
    if (activeTool === 'measure' && measurePoints.length > 0) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;

      // Draw completed segments with distance labels
      let totalDistance = 0;
      ctx.beginPath();
      const firstPt = worldToScreen(measurePoints[0].x, measurePoints[0].y);
      ctx.moveTo(firstPt.x, firstPt.y);

      for (let i = 1; i < measurePoints.length; i++) {
        const pt = worldToScreen(measurePoints[i].x, measurePoints[i].y);
        ctx.lineTo(pt.x, pt.y);

        // Calculate and display segment distance
        const segmentDistance = calculateDistance(measurePoints[i - 1], measurePoints[i]);
        totalDistance += segmentDistance;

        // Draw distance label at midpoint
        const prevPt = worldToScreen(measurePoints[i - 1].x, measurePoints[i - 1].y);
        const midX = (prevPt.x + pt.x) / 2;
        const midY = (prevPt.y + pt.y) / 2;

        ctx.save();
        ctx.fillStyle = '#22c55e';
        ctx.font = '12px monospace';
        ctx.fillText(`${segmentDistance.toFixed(2)}`, midX + 5, midY - 5);
        ctx.restore();
      }
      ctx.stroke();

      // Draw preview line from last point to mouse
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const lastPt = worldToScreen(
        measurePoints[measurePoints.length - 1].x,
        measurePoints[measurePoints.length - 1].y
      );
      const mousePt = worldToScreen(mousePos.x, mousePos.y);
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(mousePt.x, mousePt.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Calculate preview segment distance
      const previewDistance = calculateDistance(
        measurePoints[measurePoints.length - 1],
        { x: mousePos.x, y: mousePos.y, z: 0 }
      );

      // Draw preview distance
      const previewMidX = (lastPt.x + mousePt.x) / 2;
      const previewMidY = (lastPt.y + mousePt.y) / 2;
      ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
      ctx.font = '12px monospace';
      ctx.fillText(`${previewDistance.toFixed(2)}`, previewMidX + 5, previewMidY - 5);

      // Draw point markers
      ctx.fillStyle = '#22c55e';
      measurePoints.forEach(v => {
        const pt = worldToScreen(v.x, v.y);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw total distance and instructions
      ctx.fillStyle = '#22c55e';
      ctx.font = '14px monospace';
      ctx.fillText(`Total: ${totalDistance.toFixed(2)} | Next: ${previewDistance.toFixed(2)}`, 10, 30);
      ctx.fillText('Click to add point, Enter or double-click to finish', 10, 50);
    } else if (activeTool === 'measure') {
      // No points yet
      ctx.fillStyle = '#22c55e';
      ctx.font = '14px monospace';
      ctx.fillText('Click to start measuring', 10, 30);
    }

    // Draw dimension tool preview
    if (activeTool === 'dimension') {
      ctx.strokeStyle = '#00ff00';
      ctx.fillStyle = '#00ff00';
      ctx.lineWidth = 2;

      if (dimensionDefPoint1 && dimensionDefPoint2) {
        // Two points selected, show preview dimension with third point at mouse
        const dimLinePoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
        const result = calculateAlignedDimension(
          dimensionDefPoint1,
          dimensionDefPoint2,
          dimLinePoint,
          DEFAULT_DIMENSION_STYLE
        );

        // Draw extension lines
        const ext1Start = worldToScreen(result.extensionLine1Start.x, result.extensionLine1Start.y);
        const ext1End = worldToScreen(result.extensionLine1End.x, result.extensionLine1End.y);
        const ext2Start = worldToScreen(result.extensionLine2Start.x, result.extensionLine2Start.y);
        const ext2End = worldToScreen(result.extensionLine2End.x, result.extensionLine2End.y);

        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(ext1Start.x, ext1Start.y);
        ctx.lineTo(ext1End.x, ext1End.y);
        ctx.moveTo(ext2Start.x, ext2Start.y);
        ctx.lineTo(ext2End.x, ext2End.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw dimension line
        const dimStart = worldToScreen(result.dimLineStart.x, result.dimLineStart.y);
        const dimEnd = worldToScreen(result.dimLineEnd.x, result.dimLineEnd.y);

        ctx.beginPath();
        ctx.moveTo(dimStart.x, dimStart.y);
        ctx.lineTo(dimEnd.x, dimEnd.y);
        ctx.stroke();

        // Draw arrows
        const arrow1Tip = worldToScreen(result.arrow1Tip.x, result.arrow1Tip.y);
        const arrow1Start = worldToScreen(result.arrow1Start.x, result.arrow1Start.y);
        const arrow2Tip = worldToScreen(result.arrow2Tip.x, result.arrow2Tip.y);
        const arrow2Start = worldToScreen(result.arrow2Start.x, result.arrow2Start.y);

        const perpDir1 = { x: -(dimEnd.y - dimStart.y), y: dimEnd.x - dimStart.x };
        const perpLen1 = Math.sqrt(perpDir1.x * perpDir1.x + perpDir1.y * perpDir1.y);
        const arrowSize = DEFAULT_DIMENSION_STYLE.arrowSize;
        const perpNorm1 = { x: perpDir1.x / perpLen1 * arrowSize, y: perpDir1.y / perpLen1 * arrowSize };

        ctx.beginPath();
        ctx.moveTo(arrow1Tip.x, arrow1Tip.y);
        ctx.lineTo(arrow1Start.x + perpNorm1.x, arrow1Start.y + perpNorm1.y);
        ctx.lineTo(arrow1Start.x - perpNorm1.x, arrow1Start.y - perpNorm1.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(arrow2Tip.x, arrow2Tip.y);
        ctx.lineTo(arrow2Start.x + perpNorm1.x, arrow2Start.y + perpNorm1.y);
        ctx.lineTo(arrow2Start.x - perpNorm1.x, arrow2Start.y - perpNorm1.y);
        ctx.closePath();
        ctx.fill();

        // Draw measurement text
        const textPos = worldToScreen(result.textPosition.x, result.textPosition.y);
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(result.measurement.toFixed(2), textPos.x, textPos.y);

        // Draw def point markers
        const def1Screen = worldToScreen(dimensionDefPoint1.x, dimensionDefPoint1.y);
        const def2Screen = worldToScreen(dimensionDefPoint2.x, dimensionDefPoint2.y);
        ctx.beginPath();
        ctx.arc(def1Screen.x, def1Screen.y, 5, 0, Math.PI * 2);
        ctx.arc(def2Screen.x, def2Screen.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw instruction text
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.fillText('Click to place dimension', 10, 30);
      } else if (dimensionDefPoint1) {
        // One point selected, show preview line to mouse
        const def1Screen = worldToScreen(dimensionDefPoint1.x, dimensionDefPoint1.y);
        const mouseScreen = worldToScreen(mousePos.x, mousePos.y);

        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(def1Screen.x, def1Screen.y);
        ctx.lineTo(mouseScreen.x, mouseScreen.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw first def point marker
        ctx.beginPath();
        ctx.arc(def1Screen.x, def1Screen.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw instruction text
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.fillText('Click second point', 10, 30);
      } else {
        // No points yet
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.fillText('Click first definition point', 10, 30);
      }
    }

    // Draw hatch tool preview
    if (activeTool === 'hatch' && hatchBoundaries.size > 0) {
      ctx.strokeStyle = '#4169E1'; // Royal blue
      ctx.fillStyle = '#4169E1';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;

      // Highlight selected boundaries
      hatchBoundaries.forEach(boundaryId => {
        const entity = entities.get(boundaryId);
        if (entity && entity.type === 'polyline') {
          const polyline = entity as PolylineEntity;

          // Draw highlighted boundary
          ctx.beginPath();
          polyline.vertices.forEach((vertex, i) => {
            const screen = worldToScreen(vertex.x, vertex.y);
            if (i === 0) {
              ctx.moveTo(screen.x, screen.y);
            } else {
              ctx.lineTo(screen.x, screen.y);
            }
          });
          if (polyline.closed && polyline.vertices.length > 0) {
            const first = worldToScreen(polyline.vertices[0].x, polyline.vertices[0].y);
            ctx.lineTo(first.x, first.y);
          }
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1;

      // Draw instruction text
      ctx.fillStyle = '#4169E1';
      ctx.font = '14px monospace';
      ctx.fillText(
        `${hatchBoundaries.size} boundaries selected. Press Enter to configure pattern, Escape to cancel`,
        10,
        30
      );
    }

    // Draw rotate tool preview
    if (activeTool === 'rotate' && rotateCenter) {
      ctx.strokeStyle = '#FF4500'; // Orange-red
      ctx.fillStyle = '#FF4500';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;

      // Draw rotation center point
      const centerScreen = worldToScreen(rotateCenter.x, rotateCenter.y);
      ctx.beginPath();
      ctx.arc(centerScreen.x, centerScreen.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw crosshair at center
      ctx.beginPath();
      ctx.moveTo(centerScreen.x - 15, centerScreen.y);
      ctx.lineTo(centerScreen.x + 15, centerScreen.y);
      ctx.moveTo(centerScreen.x, centerScreen.y - 15);
      ctx.lineTo(centerScreen.x, centerScreen.y + 15);
      ctx.stroke();

      // Draw angle reference line from center to cursor
      const cursorScreen = worldToScreen(mousePos.x, mousePos.y);
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(centerScreen.x, centerScreen.y);
      ctx.lineTo(cursorScreen.x, cursorScreen.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = 1;

      // Draw instruction text
      const angleRadians = calculateAngle(rotateCenter, mousePos);
      const angleDegrees = radiansToDegrees(angleRadians);
      ctx.fillStyle = '#FF4500';
      ctx.font = '14px monospace';
      ctx.fillText(
        `Rotation center set. Angle: ${angleDegrees.toFixed(2)}°. Click to rotate or press Escape to cancel.`,
        10,
        30
      );
    }

    // Draw infrastructure drawing preview
    if (infraDrawStart) {
      const start = worldToScreen(infraDrawStart.x, infraDrawStart.y);
      const end = worldToScreen(mousePos.x, mousePos.y);

      // Set color based on active tool
      let previewColor = '#e94560';
      if (activeTool === 'water_pipe') previewColor = '#0088ff';
      else if (activeTool === 'sewer_pipe') previewColor = '#8B4513';
      else if (activeTool === 'storm_collector') previewColor = '#1E90FF';

      ctx.strokeStyle = previewColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw snap indicator at start point
      ctx.fillStyle = previewColor;
      ctx.beginPath();
      ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw ghost end point
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw standard detail placement preview
    if (activeTool === 'standard_detail' && placementDetail) {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = '#22c55e';
      ctx.lineWidth = 1;

      // Calculate offset from detail center to mouse position
      const centerX = (placementDetail.bounds.minX + placementDetail.bounds.maxX) / 2;
      const centerY = (placementDetail.bounds.minY + placementDetail.bounds.maxY) / 2;
      const offsetX = mousePos.x - centerX;
      const offsetY = mousePos.y - centerY;

      // Draw bounding box preview
      const minScreen = worldToScreen(
        placementDetail.bounds.minX + offsetX,
        placementDetail.bounds.maxY + offsetY  // Y flipped for screen coords
      );
      const maxScreen = worldToScreen(
        placementDetail.bounds.maxX + offsetX,
        placementDetail.bounds.minY + offsetY  // Y flipped for screen coords
      );
      const boxWidth = maxScreen.x - minScreen.x;
      const boxHeight = maxScreen.y - minScreen.y;

      ctx.setLineDash([4, 4]);
      ctx.strokeRect(minScreen.x, minScreen.y, boxWidth, boxHeight);
      ctx.setLineDash([]);

      // Draw crosshair at placement point
      const placeScreen = worldToScreen(mousePos.x, mousePos.y);
      ctx.beginPath();
      ctx.moveTo(placeScreen.x - 10, placeScreen.y);
      ctx.lineTo(placeScreen.x + 10, placeScreen.y);
      ctx.moveTo(placeScreen.x, placeScreen.y - 10);
      ctx.lineTo(placeScreen.x, placeScreen.y + 10);
      ctx.stroke();

      // Draw detail name label
      ctx.font = '12px monospace';
      ctx.fillText(placementDetail.name, minScreen.x, minScreen.y - 5);

      ctx.globalAlpha = 1;
    }

    // Draw crosshair cursor
    drawCrosshair(ctx, canvas.width, canvas.height);

    // Draw snap point indicator with enhanced visual feedback
    if (snapPoint) {
      const screenSnap = worldToScreen(snapPoint.point.x, snapPoint.point.y);

      // Set colors based on snap type
      const snapColors: Record<string, string> = {
        endpoint: '#22c55e',      // Green
        midpoint: '#3b82f6',      // Blue
        center: '#f59e0b',        // Amber
        quadrant: '#8b5cf6',      // Purple
        intersection: '#ef4444',  // Red
        perpendicular: '#06b6d4', // Cyan
        tangent: '#ec4899',       // Pink
        nearest: '#10b981',       // Emerald
        node: '#f97316',          // Orange
      };

      ctx.strokeStyle = snapColors[snapPoint.type] || '#22c55e';
      ctx.fillStyle = snapColors[snapPoint.type] || '#22c55e';
      ctx.lineWidth = 2;

      // Draw marker based on snap type
      switch (snapPoint.type) {
        case 'endpoint':
          // Square marker for endpoints
          ctx.strokeRect(screenSnap.x - 6, screenSnap.y - 6, 12, 12);
          break;
        case 'midpoint':
          // Triangle marker for midpoints
          ctx.beginPath();
          ctx.moveTo(screenSnap.x, screenSnap.y - 7);
          ctx.lineTo(screenSnap.x - 6, screenSnap.y + 5);
          ctx.lineTo(screenSnap.x + 6, screenSnap.y + 5);
          ctx.closePath();
          ctx.stroke();
          break;
        case 'center':
          // Circle marker for centers
          ctx.beginPath();
          ctx.arc(screenSnap.x, screenSnap.y, 6, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'quadrant':
          // Diamond marker for quadrant points
          ctx.beginPath();
          ctx.moveTo(screenSnap.x, screenSnap.y - 7);
          ctx.lineTo(screenSnap.x + 7, screenSnap.y);
          ctx.lineTo(screenSnap.x, screenSnap.y + 7);
          ctx.lineTo(screenSnap.x - 7, screenSnap.y);
          ctx.closePath();
          ctx.stroke();
          break;
        case 'intersection':
          // X marker for intersections
          ctx.beginPath();
          ctx.moveTo(screenSnap.x - 6, screenSnap.y - 6);
          ctx.lineTo(screenSnap.x + 6, screenSnap.y + 6);
          ctx.moveTo(screenSnap.x + 6, screenSnap.y - 6);
          ctx.lineTo(screenSnap.x - 6, screenSnap.y + 6);
          ctx.stroke();
          break;
        case 'perpendicular':
          // Right angle marker for perpendicular
          ctx.beginPath();
          ctx.moveTo(screenSnap.x - 6, screenSnap.y + 6);
          ctx.lineTo(screenSnap.x - 6, screenSnap.y - 3);
          ctx.lineTo(screenSnap.x + 3, screenSnap.y - 3);
          ctx.stroke();
          // Small square at corner
          ctx.strokeRect(screenSnap.x - 6, screenSnap.y - 3, 3, 3);
          break;
        case 'tangent':
          // Circle with tangent line marker
          ctx.beginPath();
          ctx.arc(screenSnap.x, screenSnap.y, 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(screenSnap.x - 8, screenSnap.y);
          ctx.lineTo(screenSnap.x + 8, screenSnap.y);
          ctx.stroke();
          break;
        case 'nearest':
          // Small filled circle for nearest
          ctx.beginPath();
          ctx.arc(screenSnap.x, screenSnap.y, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'node':
          // Filled square for nodes
          ctx.fillRect(screenSnap.x - 4, screenSnap.y - 4, 8, 8);
          break;
        default:
          // Default marker
          ctx.beginPath();
          ctx.arc(screenSnap.x, screenSnap.y, 5, 0, Math.PI * 2);
          ctx.stroke();
      }

      // Draw snap type label with background
      ctx.font = '11px monospace';
      ctx.textBaseline = 'top';
      const label = snapPoint.type.charAt(0).toUpperCase() + snapPoint.type.slice(1);
      const textWidth = ctx.measureText(label).width;

      // Semi-transparent background for readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(screenSnap.x + 8, screenSnap.y - 12, textWidth + 6, 16);

      // Text
      ctx.fillStyle = snapColors[snapPoint.type] || '#22c55e';
      ctx.fillText(label, screenSnap.x + 11, screenSnap.y - 9);
    }

    // Draw line length while drawing
    if ((activeTool === 'line' || activeTool === 'water_pipe' || activeTool === 'sewer_pipe' || activeTool === 'storm_collector') && isDrawing && drawStart) {
      const dx = mousePos.x - drawStart.x;
      const dy = mousePos.y - drawStart.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180 / Math.PI + 360) % 360; // Normalize to 0-360

      // Update drawing info for status bar
      onDrawingInfoUpdate?.({
        distance: length,
        angle: angleDeg,
        deltaX: dx,
        deltaY: dy,
      });

      // Draw length label near cursor
      const cursorScreen = worldToScreen(mousePos.x, mousePos.y);
      ctx.fillStyle = '#22c55e';
      ctx.font = '14px monospace';
      ctx.fillText(`Length: ${length.toFixed(2)}`, cursorScreen.x + 15, cursorScreen.y - 15);
    }

    // Draw line length for infrastructure pipes
    if (['water_pipe', 'sewer_pipe', 'storm_collector', 'house_connection', 'gutter'].includes(activeTool) && infraDrawStart) {
      const dx = mousePos.x - infraDrawStart.x;
      const dy = mousePos.y - infraDrawStart.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

      // Update drawing info for status bar
      onDrawingInfoUpdate?.({
        distance: length,
        angle: angleDeg,
        deltaX: dx,
        deltaY: dy,
      });

      // Draw length label near cursor
      const cursorScreen = worldToScreen(mousePos.x, mousePos.y);
      ctx.fillStyle = '#0088ff';
      ctx.font = '14px monospace';
      ctx.fillText(`Length: ${length.toFixed(2)}`, cursorScreen.x + 15, cursorScreen.y - 15);
    } else {
      // Clear drawing info when not actively drawing
      if (!isDrawing && !infraDrawStart) {
        onDrawingInfoUpdate?.(undefined);
      }
    }

    // Draw selection box
    if (isSelecting && selectionBox) {
      const start = worldToScreen(selectionBox.start.x, selectionBox.start.y);
      const end = worldToScreen(selectionBox.end.x, selectionBox.end.y);

      const dx = selectionBox.end.x - selectionBox.start.x;
      const crossingMode = dx < 0;

      // Different colors for window vs crossing
      if (crossingMode) {
        // Crossing selection - green dashed box
        ctx.strokeStyle = '#22c55e';
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        ctx.setLineDash([5, 5]);
      } else {
        // Window selection - blue solid box
        ctx.strokeStyle = '#3b82f6';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.setLineDash([]);
      }

      ctx.lineWidth = 1;
      ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.setLineDash([]); // Reset line dash
    }

    // Draw ortho mode guide lines
    if (orthoEnabled && (isDrawing || infraDrawStart) && (drawStart || infraDrawStart)) {
      const startPoint = drawStart || infraDrawStart;
      if (startPoint) {
        const startScreen = worldToScreen(startPoint.x, startPoint.y);
        const mouseScreen = worldToScreen(mousePos.x, mousePos.y);

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Draw horizontal or vertical guide line
        const dx = Math.abs(mousePos.x - startPoint.x);
        const dy = Math.abs(mousePos.y - startPoint.y);

        if (dx > dy) {
          // Horizontal guide
          ctx.beginPath();
          ctx.moveTo(0, startScreen.y);
          ctx.lineTo(canvas.width, startScreen.y);
          ctx.stroke();
        } else {
          // Vertical guide
          ctx.beginPath();
          ctx.moveTo(startScreen.x, 0);
          ctx.lineTo(startScreen.x, canvas.height);
          ctx.stroke();
        }

        ctx.setLineDash([]); // Reset line dash
      }
    }

    // Draw polyline vertex handles when editing
    if (activeTool === 'select' && selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const entity = entities.get(selectedId);

      if (entity && entity.type === 'polyline') {
        const polyline = entity as PolylineEntity;
        const VERTEX_HANDLE_SIZE = 6;
        const SEGMENT_HANDLE_SIZE = 4;

        // Draw vertex handles
        polyline.vertices.forEach((vertex, index) => {
          const screen = worldToScreen(vertex.x, vertex.y);

          // Highlight hovered vertex
          if (index === hoveredVertexIndex) {
            ctx.fillStyle = '#fbbf24'; // Yellow for hover
            ctx.strokeStyle = '#fbbf24';
          } else if (index === draggingVertexIndex) {
            ctx.fillStyle = '#22c55e'; // Green for dragging
            ctx.strokeStyle = '#22c55e';
          } else {
            ctx.fillStyle = '#3b82f6'; // Blue for normal
            ctx.strokeStyle = '#3b82f6';
          }

          ctx.lineWidth = 2;

          // Draw handle as a square
          ctx.fillRect(
            screen.x - VERTEX_HANDLE_SIZE,
            screen.y - VERTEX_HANDLE_SIZE,
            VERTEX_HANDLE_SIZE * 2,
            VERTEX_HANDLE_SIZE * 2
          );

          // Draw border
          ctx.strokeRect(
            screen.x - VERTEX_HANDLE_SIZE,
            screen.y - VERTEX_HANDLE_SIZE,
            VERTEX_HANDLE_SIZE * 2,
            VERTEX_HANDLE_SIZE * 2
          );
        });

        // Draw segment midpoint handles for adding vertices
        for (let i = 0; i < polyline.vertices.length - 1; i++) {
          const v1 = polyline.vertices[i];
          const v2 = polyline.vertices[i + 1];
          const midpoint = {
            x: (v1.x + v2.x) / 2,
            y: (v1.y + v2.y) / 2
          };
          const screen = worldToScreen(midpoint.x, midpoint.y);

          // Draw small plus sign to indicate "add vertex here"
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(screen.x - SEGMENT_HANDLE_SIZE, screen.y);
          ctx.lineTo(screen.x + SEGMENT_HANDLE_SIZE, screen.y);
          ctx.moveTo(screen.x, screen.y - SEGMENT_HANDLE_SIZE);
          ctx.lineTo(screen.x, screen.y + SEGMENT_HANDLE_SIZE);
          ctx.stroke();
        }
      }
    }

    // Draw coordinates at top-right (non-intrusive)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '11px monospace';
    const coordText = `X: ${mousePos.x.toFixed(2)} Y: ${mousePos.y.toFixed(2)}`;
    const coordWidth = ctx.measureText(coordText).width;
    ctx.fillText(coordText, canvas.width - coordWidth - 10, 20);
  }, [entities, infrastructureEntities, viewState, mousePos, isDrawing, drawStart, infraDrawStart, activeTool, worldToScreen, placementDetail, polylineVertices, arcStart, arcEnd, calculateArcFrom3Points, textPlacement, measurePoints, calculateDistance, findEntityAtPoint, snapPoint, snapEnabled, orthoEnabled, gridEnabled, gridSpacing, isSelecting, selectionBox, selectedIds, hoveredVertexIndex, draggingVertexIndex]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!gridEnabled) return; // Only draw if grid is enabled

    const gridSize = gridSpacing * viewState.zoom;
    const offsetX = (viewState.panX % gridSize) + width / 2;
    const offsetY = (viewState.panY % gridSize) + height / 2;

    // Calculate starting world coordinates
    const startWorldX = Math.floor((-width / 2 - viewState.panX) / viewState.zoom / gridSpacing) * gridSpacing;
    const startWorldY = Math.floor((-height / 2 - viewState.panY) / viewState.zoom / gridSpacing) * gridSpacing;

    // Minor grid lines
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 0.5;

    let lineCount = 0;
    // Vertical lines
    for (let x = offsetX % gridSize; x < width; x += gridSize) {
      const worldX = startWorldX + (lineCount * gridSpacing);
      const isMajor = Math.abs(worldX % (gridSpacing * 5)) < 0.01;

      if (isMajor) {
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = '#2a2a4a';
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      lineCount++;
    }

    lineCount = 0;
    // Horizontal lines
    for (let y = offsetY % gridSize; y < height; y += gridSize) {
      const worldY = startWorldY + (lineCount * gridSpacing);
      const isMajor = Math.abs(worldY % (gridSpacing * 5)) < 0.01;

      if (isMajor) {
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = '#2a2a4a';
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      lineCount++;
    }

    // Draw axes (always visible when grid is on)
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 1.5;

    // X axis
    const yAxis = height / 2 + viewState.panY;
    if (yAxis >= 0 && yAxis <= height) {
      ctx.beginPath();
      ctx.moveTo(0, yAxis);
      ctx.lineTo(width, yAxis);
      ctx.stroke();
    }

    // Y axis
    const xAxis = width / 2 + viewState.panX;
    if (xAxis >= 0 && xAxis <= width) {
      ctx.beginPath();
      ctx.moveTo(xAxis, 0);
      ctx.lineTo(xAxis, height);
      ctx.stroke();
    }
  };

  const drawPoint = (ctx: CanvasRenderingContext2D, entity: PointEntity) => {
    const screen = worldToScreen(entity.position.x, entity.position.y);
    const size = entity.selected ? 6 : 4;

    ctx.fillStyle = entity.color || '#ffffff';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
    ctx.fill();

    // Draw cross for visibility
    ctx.beginPath();
    ctx.moveTo(screen.x - size - 2, screen.y);
    ctx.lineTo(screen.x + size + 2, screen.y);
    ctx.moveTo(screen.x, screen.y - size - 2);
    ctx.lineTo(screen.x, screen.y + size + 2);
    ctx.stroke();
  };

  const drawLine = (ctx: CanvasRenderingContext2D, entity: LineEntity) => {
    const start = worldToScreen(entity.start.x, entity.start.y);
    const end = worldToScreen(entity.end.x, entity.end.y);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    if (entity.selected) {
      // Draw endpoint markers
      ctx.fillStyle = entity.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
      ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawPolyline = (ctx: CanvasRenderingContext2D, entity: PolylineEntity) => {
    if (entity.vertices.length < 2) return;

    const points = entity.vertices.map(v => worldToScreen(v.x, v.y));

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    if (entity.closed) {
      ctx.closePath();
    }
    ctx.stroke();

    if (entity.selected) {
      // Draw vertex markers
      ctx.fillStyle = entity.color || '#ffffff';
      points.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, entity: CircleEntity) => {
    const center = worldToScreen(entity.center.x, entity.center.y);
    const radius = entity.radius * viewState.zoom;

    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (entity.selected) {
      // Draw center point
      ctx.fillStyle = entity.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawArc = (ctx: CanvasRenderingContext2D, entity: ArcEntity) => {
    const center = worldToScreen(entity.center.x, entity.center.y);
    const radius = entity.radius * viewState.zoom;

    // Canvas arcs: positive angles go clockwise, CAD uses counter-clockwise
    // Also need to flip Y axis, so we negate angles
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, -entity.startAngle, -entity.endAngle, true);
    ctx.stroke();

    if (entity.selected) {
      // Draw center point
      ctx.fillStyle = entity.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawText = (ctx: CanvasRenderingContext2D, entity: TextEntity) => {
    const pos = worldToScreen(entity.position.x, entity.position.y);
    const fontSize = Math.max(10, entity.height * viewState.zoom);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    // Negate rotation because Y axis is flipped
    ctx.rotate(-entity.rotation * Math.PI / 180);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = entity.color || '#ffffff';
    ctx.textBaseline = 'bottom';
    ctx.fillText(entity.text, 0, 0);
    ctx.restore();

    if (entity.selected) {
      // Draw position marker
      ctx.fillStyle = entity.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawHatch = (ctx: CanvasRenderingContext2D, entity: HatchEntity) => {
    // Get boundary entities
    const boundaryEntities = entity.boundaryIds
      .map(id => entities.get(id))
      .filter(e => e !== undefined);

    if (boundaryEntities.length === 0) return;

    // Calculate bounding box
    const bbox = calculateBoundingBox(boundaryEntities);
    if (!bbox) return;

    ctx.strokeStyle = entity.color || '#4169E1'; // Royal blue for hatches
    ctx.lineWidth = entity.selected ? 2 : 1;
    ctx.globalAlpha = entity.selected ? 0.8 : 0.6;

    if (entity.pattern === 'solid') {
      // Solid fill - draw filled polygon for each boundary entity
      boundaryEntities.forEach(boundaryEntity => {
        if (boundaryEntity.type === 'polyline' && 'vertices' in boundaryEntity) {
          const poly = boundaryEntity as PolylineEntity;
          if (poly.vertices.length < 3) return;

          ctx.fillStyle = entity.color || '#4169E1';
          ctx.beginPath();
          const firstPt = worldToScreen(poly.vertices[0].x, poly.vertices[0].y);
          ctx.moveTo(firstPt.x, firstPt.y);

          for (let i = 1; i < poly.vertices.length; i++) {
            const pt = worldToScreen(poly.vertices[i].x, poly.vertices[i].y);
            ctx.lineTo(pt.x, pt.y);
          }

          if (poly.closed) {
            ctx.closePath();
          }
          ctx.fill();
        }
      });
    } else {
      // Pattern fill - generate and draw pattern lines
      const patternLines = generateHatchPattern(entity.pattern, bbox, entity.scale, entity.angle);

      // Clip to boundary
      ctx.save();
      ctx.beginPath();
      boundaryEntities.forEach(boundaryEntity => {
        if (boundaryEntity.type === 'polyline' && 'vertices' in boundaryEntity) {
          const poly = boundaryEntity as PolylineEntity;
          if (poly.vertices.length < 2) return;

          const firstPt = worldToScreen(poly.vertices[0].x, poly.vertices[0].y);
          ctx.moveTo(firstPt.x, firstPt.y);

          for (let i = 1; i < poly.vertices.length; i++) {
            const pt = worldToScreen(poly.vertices[i].x, poly.vertices[i].y);
            ctx.lineTo(pt.x, pt.y);
          }

          if (poly.closed) {
            ctx.closePath();
          }
        }
      });
      ctx.clip();

      // Draw pattern lines
      patternLines.forEach(line => {
        const start = worldToScreen(line.start.x, line.start.y);
        const end = worldToScreen(line.end.x, line.end.y);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      });

      ctx.restore();
    }

    ctx.globalAlpha = 1;

    if (entity.selected) {
      // Draw boundary entity markers
      boundaryEntities.forEach(boundaryEntity => {
        if (boundaryEntity.type === 'polyline' && 'vertices' in boundaryEntity) {
          const poly = boundaryEntity as PolylineEntity;
          ctx.fillStyle = entity.color || '#4169E1';
          poly.vertices.forEach(v => {
            const pt = worldToScreen(v.x, v.y);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });
    }
  };

  const drawDimension = (ctx: CanvasRenderingContext2D, entity: DimensionEntity) => {
    const style = {
      textHeight: entity.textHeight || DEFAULT_DIMENSION_STYLE.textHeight,
      arrowSize: entity.arrowSize || DEFAULT_DIMENSION_STYLE.arrowSize,
      extensionLineOffset: entity.extensionLineOffset || DEFAULT_DIMENSION_STYLE.extensionLineOffset,
      extensionLineExtend: DEFAULT_DIMENSION_STYLE.extensionLineExtend,
      textGap: DEFAULT_DIMENSION_STYLE.textGap,
    };

    ctx.strokeStyle = entity.color || '#00ff00'; // Green for dimensions
    ctx.fillStyle = entity.color || '#00ff00';
    ctx.lineWidth = entity.selected ? 2 : 1;

    // Calculate dimension geometry based on type
    if (entity.dimensionType === 'linear' || entity.dimensionType === 'aligned') {
      const result = calculateAlignedDimension(
        entity.defPoint1,
        entity.defPoint2,
        entity.dimLinePoint,
        style
      );

      // Draw extension lines
      const ext1Start = worldToScreen(result.extensionLine1Start.x, result.extensionLine1Start.y);
      const ext1End = worldToScreen(result.extensionLine1End.x, result.extensionLine1End.y);
      const ext2Start = worldToScreen(result.extensionLine2Start.x, result.extensionLine2Start.y);
      const ext2End = worldToScreen(result.extensionLine2End.x, result.extensionLine2End.y);

      ctx.beginPath();
      ctx.moveTo(ext1Start.x, ext1Start.y);
      ctx.lineTo(ext1End.x, ext1End.y);
      ctx.moveTo(ext2Start.x, ext2Start.y);
      ctx.lineTo(ext2End.x, ext2End.y);
      ctx.stroke();

      // Draw dimension line
      const dimStart = worldToScreen(result.dimLineStart.x, result.dimLineStart.y);
      const dimEnd = worldToScreen(result.dimLineEnd.x, result.dimLineEnd.y);

      ctx.beginPath();
      ctx.moveTo(dimStart.x, dimStart.y);
      ctx.lineTo(dimEnd.x, dimEnd.y);
      ctx.stroke();

      // Draw arrows
      const arrow1Tip = worldToScreen(result.arrow1Tip.x, result.arrow1Tip.y);
      const arrow1Start = worldToScreen(result.arrow1Start.x, result.arrow1Start.y);
      const arrow2Tip = worldToScreen(result.arrow2Tip.x, result.arrow2Tip.y);
      const arrow2Start = worldToScreen(result.arrow2Start.x, result.arrow2Start.y);

      // Draw arrow 1
      const perpDir1 = { x: -(dimEnd.y - dimStart.y), y: dimEnd.x - dimStart.x };
      const perpLen1 = Math.sqrt(perpDir1.x * perpDir1.x + perpDir1.y * perpDir1.y);
      const perpNorm1 = { x: perpDir1.x / perpLen1 * style.arrowSize, y: perpDir1.y / perpLen1 * style.arrowSize };

      ctx.beginPath();
      ctx.moveTo(arrow1Tip.x, arrow1Tip.y);
      ctx.lineTo(arrow1Start.x + perpNorm1.x, arrow1Start.y + perpNorm1.y);
      ctx.lineTo(arrow1Start.x - perpNorm1.x, arrow1Start.y - perpNorm1.y);
      ctx.closePath();
      ctx.fill();

      // Draw arrow 2
      ctx.beginPath();
      ctx.moveTo(arrow2Tip.x, arrow2Tip.y);
      ctx.lineTo(arrow2Start.x + perpNorm1.x, arrow2Start.y + perpNorm1.y);
      ctx.lineTo(arrow2Start.x - perpNorm1.x, arrow2Start.y - perpNorm1.y);
      ctx.closePath();
      ctx.fill();

      // Draw measurement text
      const textPos = worldToScreen(result.textPosition.x, result.textPosition.y);
      const fontSize = Math.max(10, style.textHeight * viewState.zoom);

      ctx.save();
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(entity.text, textPos.x, textPos.y);
      ctx.restore();
    } else if (entity.dimensionType === 'radial' || entity.dimensionType === 'diameter') {
      const result = entity.dimensionType === 'radial'
        ? calculateRadialDimension(entity.defPoint1, entity.defPoint2, style)
        : calculateDiameterDimension(entity.defPoint1, entity.defPoint2, style);

      // Draw leader line
      const leaderStart = worldToScreen(result.leaderStart.x, result.leaderStart.y);
      const leaderEnd = worldToScreen(result.leaderEnd.x, result.leaderEnd.y);

      ctx.beginPath();
      ctx.moveTo(leaderStart.x, leaderStart.y);
      ctx.lineTo(leaderEnd.x, leaderEnd.y);
      ctx.stroke();

      // Draw arrow at leaderEnd
      const dir = {
        x: leaderEnd.x - leaderStart.x,
        y: leaderEnd.y - leaderStart.y,
      };
      const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      const norm = { x: dir.x / len, y: dir.y / len };
      const perpNorm = { x: -norm.y * style.arrowSize, y: norm.x * style.arrowSize };

      ctx.beginPath();
      ctx.moveTo(leaderEnd.x, leaderEnd.y);
      ctx.lineTo(leaderEnd.x - norm.x * style.arrowSize + perpNorm.x, leaderEnd.y - norm.y * style.arrowSize + perpNorm.y);
      ctx.lineTo(leaderEnd.x - norm.x * style.arrowSize - perpNorm.x, leaderEnd.y - norm.y * style.arrowSize - perpNorm.y);
      ctx.closePath();
      ctx.fill();

      // Draw measurement text
      const textPos = worldToScreen(result.textPosition.x, result.textPosition.y);
      const fontSize = Math.max(10, style.textHeight * viewState.zoom);

      ctx.save();
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(entity.text, textPos.x, textPos.y);
      ctx.restore();
    } else if (entity.dimensionType === 'angular') {
      const result = calculateAngularDimension(
        entity.defPoint1,
        entity.defPoint2,
        entity.dimLinePoint,
        50, // Default arc radius
        style
      );

      // Draw arc
      const arcCenter = worldToScreen(result.arcCenter.x, result.arcCenter.y);
      const arcRadius = 50 * viewState.zoom;

      ctx.beginPath();
      ctx.arc(arcCenter.x, arcCenter.y, arcRadius, -result.angle1, -result.angle2, true);
      ctx.stroke();

      // Draw measurement text
      const textPos = worldToScreen(result.textPosition.x, result.textPosition.y);
      const fontSize = Math.max(10, style.textHeight * viewState.zoom);

      ctx.save();
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(entity.text, textPos.x, textPos.y);
      ctx.restore();
    }

    if (entity.selected) {
      // Draw def point markers
      const def1 = worldToScreen(entity.defPoint1.x, entity.defPoint1.y);
      const def2 = worldToScreen(entity.defPoint2.x, entity.defPoint2.y);
      const dimLine = worldToScreen(entity.dimLinePoint.x, entity.dimLinePoint.y);

      ctx.fillStyle = entity.color || '#00ff00';
      ctx.beginPath();
      ctx.arc(def1.x, def1.y, 4, 0, Math.PI * 2);
      ctx.arc(def2.x, def2.y, 4, 0, Math.PI * 2);
      ctx.arc(dimLine.x, dimLine.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawCrosshair = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const screen = worldToScreen(mousePos.x, mousePos.y);

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(0, screen.y);
    ctx.lineTo(width, screen.y);
    ctx.stroke();

    // Vertical
    ctx.beginPath();
    ctx.moveTo(screen.x, 0);
    ctx.lineTo(screen.x, height);
    ctx.stroke();

    ctx.setLineDash([]);
  };

  // Handle mouse events
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld(screenX, screenY);

      // Try object snapping first (if enabled)
      let snappedWorld: Point2D;

      if (snapEnabled) {
        const objectSnap = findSnapPoint(world);
        if (objectSnap) {
          snappedWorld = objectSnap.point;
          setSnapPoint(objectSnap);
        } else {
          // Fall back to grid snapping
          const snapSize = 10;
          snappedWorld = {
            x: Math.round(world.x / snapSize) * snapSize,
            y: Math.round(world.y / snapSize) * snapSize,
          };
          setSnapPoint(null);
        }
      } else {
        // Snapping disabled - use raw world coordinates
        snappedWorld = world;
        setSnapPoint(null);
      }

      // Apply ortho mode constraint if enabled (for drawing tools)
      let finalWorld = snappedWorld;
      if (orthoEnabled && (isDrawing || infraDrawStart) && (drawStart || infraDrawStart)) {
        const startPoint = drawStart || infraDrawStart;
        if (startPoint) {
          finalWorld = applyOrthoConstraint({ x: startPoint.x, y: startPoint.y }, snappedWorld);
        }
      }

      setMousePos(finalWorld);
      onCursorUpdate?.(finalWorld);

      // Handle polyline vertex dragging
      if (activeTool === 'select' && draggingVertexIndex !== null && selectedIds.size === 1) {
        const selectedId = Array.from(selectedIds)[0];
        const entity = entities.get(selectedId);

        if (entity && entity.type === 'polyline') {
          const polyline = entity as PolylineEntity;
          const newVertices = [...polyline.vertices];
          newVertices[draggingVertexIndex] = { x: snappedWorld.x, y: snappedWorld.y, z: 0 };

          updateEntity(selectedId, {
            ...polyline,
            vertices: newVertices,
          });
        }
        return;
      }

      // Detect hover over polyline vertices (for visual feedback)
      if (activeTool === 'select' && selectedIds.size === 1 && draggingVertexIndex === null) {
        const selectedId = Array.from(selectedIds)[0];
        const entity = entities.get(selectedId);

        if (entity && entity.type === 'polyline') {
          const polyline = entity as PolylineEntity;
          const VERTEX_HANDLE_SIZE = 6;

          let foundHoveredVertex = false;
          for (let i = 0; i < polyline.vertices.length; i++) {
            const vertex = polyline.vertices[i];
            const screen = worldToScreen(vertex.x, vertex.y);
            const mouseScreen = worldToScreen(snappedWorld.x, snappedWorld.y);

            const distance = Math.sqrt(
              Math.pow(mouseScreen.x - screen.x, 2) + Math.pow(mouseScreen.y - screen.y, 2)
            );

            if (distance <= VERTEX_HANDLE_SIZE + 2) {
              setHoveredVertexIndex(i);
              foundHoveredVertex = true;
              break;
            }
          }

          if (!foundHoveredVertex && hoveredVertexIndex !== null) {
            setHoveredVertexIndex(null);
          }
        } else {
          setHoveredVertexIndex(null);
        }
      }

      // Handle selection box dragging
      if (activeTool === 'select' && isSelecting && dragStart) {
        setSelectionBox({ start: dragStart, end: finalWorld });
        return;
      }

      // Handle dragging selected entities
      if (activeTool === 'select' && isDragging && dragStart && selectedIds.size > 0) {
        const dx = snappedWorld.x - dragStart.x;
        const dy = snappedWorld.y - dragStart.y;

        selectedIds.forEach(id => {
          const entity = entities.get(id);
          if (!entity) return;

          // Move entity based on type
          if ('position' in entity && entity.position) {
            updateEntity(id, {
              position: {
                x: entity.position.x + dx,
                y: entity.position.y + dy,
                z: entity.position.z,
              },
            });
          } else if ('center' in entity && entity.center) {
            updateEntity(id, {
              center: {
                x: entity.center.x + dx,
                y: entity.center.y + dy,
                z: entity.center.z,
              },
            });
          } else if ('start' in entity && 'end' in entity && entity.start && entity.end) {
            updateEntity(id, {
              start: {
                x: entity.start.x + dx,
                y: entity.start.y + dy,
                z: entity.start.z,
              },
              end: {
                x: entity.end.x + dx,
                y: entity.end.y + dy,
                z: entity.end.z,
              },
            });
          } else if ('vertices' in entity && entity.vertices) {
            updateEntity(id, {
              vertices: entity.vertices.map((v: Point3D) => ({
                x: v.x + dx,
                y: v.y + dy,
                z: v.z,
              })),
            });
          }
        });

        setDragStart(snappedWorld);
        return;
      }

      // Handle panning
      if (activeTool === 'pan' && isDrawing && drawStart) {
        setPan(
          viewState.panX + (screenX - (drawStart as unknown as { screenX: number }).screenX),
          viewState.panY + (screenY - (drawStart as unknown as { screenY: number }).screenY)
        );
      }
    },
    [screenToWorld, worldToScreen, activeTool, isDrawing, drawStart, viewState, setPan, isDragging, dragStart, selectedIds, entities, updateEntity, snapEnabled, findSnapPoint, setSnapPoint, orthoEnabled, infraDrawStart, applyOrthoConstraint, setMousePos, isSelecting, setSelectionBox, draggingVertexIndex, setDraggingVertexIndex, hoveredVertexIndex, setHoveredVertexIndex, mousePos]
  );

  // Check if tool is an infrastructure pipe tool
  const isInfraPipeTool = (tool: string) => {
    return ['water_pipe', 'sewer_pipe', 'storm_collector', 'house_connection', 'gutter'].includes(tool);
  };

  // Check if tool is an infrastructure node tool
  const isInfraNodeTool = (tool: string) => {
    return ['water_junction', 'water_valve', 'water_tank', 'water_pump', 'hydrant', 'manhole', 'storm_inlet'].includes(tool);
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click

      // Handle zoom tool (click to zoom in)
      if (activeTool === 'zoom') {
        const newZoom = e.shiftKey ? viewState.zoom * 0.8 : viewState.zoom * 1.25;
        setZoom(newZoom);
        return;
      }

      // Handle select tool
      if (activeTool === 'select') {
        // Check if clicking on a polyline vertex handle
        if (selectedIds.size === 1) {
          const selectedId = Array.from(selectedIds)[0];
          const entity = entities.get(selectedId);

          if (entity && entity.type === 'polyline') {
            const polyline = entity as PolylineEntity;
            const VERTEX_HANDLE_SIZE = 6;
            const SEGMENT_HANDLE_SIZE = 4;

            // Check if clicking on a vertex
            for (let i = 0; i < polyline.vertices.length; i++) {
              const vertex = polyline.vertices[i];
              const screen = worldToScreen(vertex.x, vertex.y);
              const mouseScreen = worldToScreen(mousePos.x, mousePos.y);

              const distance = Math.sqrt(
                Math.pow(mouseScreen.x - screen.x, 2) + Math.pow(mouseScreen.y - screen.y, 2)
              );

              if (distance <= VERTEX_HANDLE_SIZE + 2) {
                // Clicked on a vertex - start dragging it
                setDraggingVertexIndex(i);

                // Right-click or Shift+click on vertex = delete vertex
                if (e.shiftKey && polyline.vertices.length > 2) {
                  const newVertices = polyline.vertices.filter((_, index) => index !== i);
                  updateEntity(selectedId, {
                    ...polyline,
                    vertices: newVertices,
                  });
                  return;
                }

                return;
              }
            }

            // Check if clicking on a segment midpoint (to add vertex)
            for (let i = 0; i < polyline.vertices.length - 1; i++) {
              const v1 = polyline.vertices[i];
              const v2 = polyline.vertices[i + 1];
              const midpoint = {
                x: (v1.x + v2.x) / 2,
                y: (v1.y + v2.y) / 2
              };
              const screen = worldToScreen(midpoint.x, midpoint.y);
              const mouseScreen = worldToScreen(mousePos.x, mousePos.y);

              const distance = Math.sqrt(
                Math.pow(mouseScreen.x - screen.x, 2) + Math.pow(mouseScreen.y - screen.y, 2)
              );

              if (distance <= SEGMENT_HANDLE_SIZE + 4) {
                // Clicked on segment midpoint - add new vertex
                const newVertices = [
                  ...polyline.vertices.slice(0, i + 1),
                  { x: mousePos.x, y: mousePos.y, z: 0 },
                  ...polyline.vertices.slice(i + 1)
                ];
                updateEntity(selectedId, {
                  ...polyline,
                  vertices: newVertices,
                });
                return;
              }
            }
          }
        }

        const entityId = findEntityAtPoint(mousePos);

        if (entityId) {
          // Entity found - select it
          if (e.shiftKey) {
            // Shift+click: toggle selection
            const entity = entities.get(entityId);
            if (entity?.selected) {
              updateEntity(entityId, { selected: false });
              // Remove from selectedIds
              const newSelectedIds = new Set(selectedIds);
              newSelectedIds.delete(entityId);
            } else {
              updateEntity(entityId, { selected: true });
              selectEntity(entityId);
            }
          } else {
            // Regular click: select only this entity
            const wasSelected = entities.get(entityId)?.selected;

            // Deselect all first
            selectedIds.forEach(id => {
              updateEntity(id, { selected: false });
            });
            deselectAll();

            // Select clicked entity
            updateEntity(entityId, { selected: true });
            selectEntity(entityId);

            // Start drag operation
            setIsDragging(true);
            setDragStart(mousePos);
          }
        } else {
          // Clicked empty space - start selection box
          selectedIds.forEach(id => {
            updateEntity(id, { selected: false });
          });
          deselectAll();

          // Start selection box drawing
          setIsSelecting(true);
          setDragStart(mousePos);
          setSelectionBox({ start: mousePos, end: mousePos });
        }
        return;
      }

      // Handle polyline tool (multi-click drawing)
      if (activeTool === 'polyline') {
        const currentTime = Date.now();
        const isDoubleClick = currentTime - lastClickTime < 300;
        setLastClickTime(currentTime);

        if (isDoubleClick && polylineVertices.length >= 2) {
          // Double-click detected - finish polyline
          const newPolyline: PolylineEntity = {
            id: `polyline_${Date.now()}`,
            type: 'polyline',
            layer: activeLayer,
            visible: true,
            selected: false,
            vertices: polylineVertices,
            closed: false,
          };
          addEntity(newPolyline);
          setPolylineVertices([]);
        } else {
          // Add vertex
          const newVertex: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
          setPolylineVertices(prev => [...prev, newVertex]);
        }
        return;
      }

      // Handle arc tool (three-click drawing)
      if (activeTool === 'arc') {
        if (!arcStart) {
          // First click - set start point
          setArcStart({ x: mousePos.x, y: mousePos.y, z: 0 });
        } else if (!arcEnd) {
          // Second click - set end point
          setArcEnd({ x: mousePos.x, y: mousePos.y, z: 0 });
        } else {
          // Third click - create arc
          const pointOnArc: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
          try {
            const arcParams = calculateArcFrom3Points(arcStart, arcEnd, pointOnArc);
            const newArc: ArcEntity = {
              id: `arc_${Date.now()}`,
              type: 'arc',
              layer: activeLayer,
              visible: true,
              selected: false,
              center: arcParams.center,
              radius: arcParams.radius,
              startAngle: arcParams.startAngle,
              endAngle: arcParams.endAngle,
            };
            addEntity(newArc);
            setArcStart(null);
            setArcEnd(null);
          } catch (e) {
            // Invalid arc (collinear points), reset
            console.error('Invalid arc: points are collinear');
            setArcStart(null);
            setArcEnd(null);
          }
        }
        return;
      }

      // Handle text tool (click to place, then prompt for text)
      if (activeTool === 'text') {
        const textInput = prompt('Enter text:');
        if (textInput && textInput.trim() !== '') {
          const newText: TextEntity = {
            id: `text_${Date.now()}`,
            type: 'text',
            layer: activeLayer,
            visible: true,
            selected: false,
            position: { x: mousePos.x, y: mousePos.y, z: 0 },
            text: textInput.trim(),
            height: 20, // Default text height in world units
            rotation: 0,
          };
          addEntity(newText);
        }
        return;
      }

      // Handle measure tool (multi-click distance measurement)
      if (activeTool === 'measure') {
        const currentTime = Date.now();
        const isDoubleClick = currentTime - lastClickTime < 300;
        setLastClickTime(currentTime);

        if (isDoubleClick && measurePoints.length >= 1) {
          // Double-click detected - reset measurements
          setMeasurePoints([]);
        } else {
          // Add measurement point
          const newPoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
          setMeasurePoints(prev => [...prev, newPoint]);
        }
        return;
      }

      // Handle offset tool (create parallel geometry)
      if (activeTool === 'offset') {
        // Check if any entities are selected
        if (selectedIds.size === 0) {
          alert('Please select an entity first (line, polyline, or circle) before using OFFSET tool');
          return;
        }

        // Get the first selected entity
        const entityId = Array.from(selectedIds)[0];
        const entity = entities.get(entityId);

        if (!entity) return;

        // Check if entity type is supported for offset
        if (entity.type !== 'line' && entity.type !== 'polyline' && entity.type !== 'circle') {
          alert('OFFSET tool only supports lines, polylines, and circles');
          return;
        }

        // Prompt for offset distance
        const distanceStr = prompt('Enter offset distance:', '10');
        if (!distanceStr) return;

        const distance = parseFloat(distanceStr);
        if (isNaN(distance) || distance <= 0) {
          alert('Invalid distance. Please enter a positive number.');
          return;
        }

        // Create offset entity using click point to determine side
        const clickPoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
        const offsetResult = offsetEntity(entity, distance, clickPoint);

        if (offsetResult) {
          addEntity(offsetResult);
          // Switch to select tool to allow further operations
          setActiveTool('select');
        } else {
          alert('Could not create offset. The offset distance may be too large for this entity.');
        }

        return;
      }

      // Handle trim tool (remove portion of entity at cutting edge)
      if (activeTool === 'trim') {
        // First click: Select boundary/cutting edges
        if (trimExtendBoundaries.size === 0) {
          // Check if clicked entity can be a boundary
          const clickedEntity = findEntityAtPoint(mousePos, 10 / viewState.zoom);
          if (clickedEntity) {
            if (clickedEntity.type === 'line' || clickedEntity.type === 'circle') {
              setTrimExtendBoundaries(new Set([clickedEntity.id]));
              alert('Boundary selected. Now click entities to trim. Press Escape to cancel.');
            } else {
              alert('TRIM boundaries must be lines or circles');
            }
          }
          return;
        }

        // Subsequent clicks: Trim entities at boundary
        const clickedEntity = findEntityAtPoint(mousePos, 10 / viewState.zoom);
        if (!clickedEntity) return;

        if (clickedEntity.type !== 'line') {
          alert('TRIM currently only supports line entities');
          return;
        }

        // Find boundary entity
        const boundaryId = Array.from(trimExtendBoundaries)[0];
        const boundary = entities.get(boundaryId);
        if (!boundary || (boundary.type !== 'line' && boundary.type !== 'circle')) return;

        // Trim the entity
        const clickPoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
        const trimmedLine = trimLineAtIntersection(
          clickedEntity as LineEntity,
          boundary as LineEntity | CircleEntity,
          clickPoint
        );

        if (trimmedLine) {
          // Replace original entity with trimmed version
          removeEntity(clickedEntity.id);
          addEntity(trimmedLine);
        } else {
          alert('No intersection found between entity and boundary');
        }

        return;
      }

      // Handle extend tool (lengthen entity to boundary)
      if (activeTool === 'extend') {
        // First click: Select boundary edges
        if (trimExtendBoundaries.size === 0) {
          const clickedEntity = findEntityAtPoint(mousePos, 10 / viewState.zoom);
          if (clickedEntity) {
            if (clickedEntity.type === 'line' || clickedEntity.type === 'circle') {
              setTrimExtendBoundaries(new Set([clickedEntity.id]));
              alert('Boundary selected. Now click entities to extend. Press Escape to cancel.');
            } else {
              alert('EXTEND boundaries must be lines or circles');
            }
          }
          return;
        }

        // Subsequent clicks: Extend entities to boundary
        const clickedEntity = findEntityAtPoint(mousePos, 10 / viewState.zoom);
        if (!clickedEntity) return;

        if (clickedEntity.type !== 'line') {
          alert('EXTEND currently only supports line entities');
          return;
        }

        // Find boundary entity
        const boundaryId = Array.from(trimExtendBoundaries)[0];
        const boundary = entities.get(boundaryId);
        if (!boundary || (boundary.type !== 'line' && boundary.type !== 'circle')) return;

        // Determine which end to extend (closer to click point)
        const line = clickedEntity as LineEntity;
        const clickPoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
        const distToStart = Math.sqrt(
          (clickPoint.x - line.start.x) ** 2 + (clickPoint.y - line.start.y) ** 2
        );
        const distToEnd = Math.sqrt(
          (clickPoint.x - line.end.x) ** 2 + (clickPoint.y - line.end.y) ** 2
        );
        const extendFrom = distToStart < distToEnd ? 'start' : 'end';

        // Extend the entity
        const extendedLine = extendLineToIntersection(
          line,
          boundary as LineEntity | CircleEntity,
          extendFrom
        );

        if (extendedLine) {
          // Replace original entity with extended version
          removeEntity(clickedEntity.id);
          addEntity(extendedLine);
        } else {
          alert('No intersection found when extending entity to boundary');
        }

        return;
      }

      // Handle move tool (translate entities)
      if (activeTool === 'move') {
        // Check if entities are selected
        if (selectedIds.size === 0) {
          alert('Please select entities first before using MOVE tool');
          return;
        }

        // First click: Set base point
        if (!copyMoveBasePoint) {
          const basePoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
          setCopyMoveBasePoint(basePoint);
          alert('Base point set. Click destination point to move entities.');
          return;
        }

        // Second click: Move entities to destination
        const destination: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
        const dx = destination.x - copyMoveBasePoint.x;
        const dy = destination.y - copyMoveBasePoint.y;
        const dz = destination.z - copyMoveBasePoint.z;

        // Move all selected entities
        selectedIds.forEach(id => {
          const entity = entities.get(id);
          if (entity) {
            const movedEntity = translateEntity(entity, dx, dy, dz);
            // Replace original with moved entity (keep same ID)
            removeEntity(id);
            addEntity({ ...movedEntity, id });
          }
        });

        // Reset and switch to select tool
        setCopyMoveBasePoint(null);
        deselectAll();
        setActiveTool('select');
        return;
      }

      // Handle copy tool (duplicate and translate entities)
      if (activeTool === 'copy') {
        // Check if entities are selected
        if (selectedIds.size === 0) {
          alert('Please select entities first before using COPY tool');
          return;
        }

        // First click: Set base point
        if (!copyMoveBasePoint) {
          const basePoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
          setCopyMoveBasePoint(basePoint);
          alert('Base point set. Click destination point(s) to copy entities. Press Escape when done.');
          return;
        }

        // Subsequent clicks: Create copies at destination
        const destination: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
        const dx = destination.x - copyMoveBasePoint.x;
        const dy = destination.y - copyMoveBasePoint.y;
        const dz = destination.z - copyMoveBasePoint.z;

        // Copy all selected entities
        selectedIds.forEach(id => {
          const entity = entities.get(id);
          if (entity) {
            const copiedEntity = translateEntity(entity, dx, dy, dz);
            addEntity(copiedEntity);
          }
        });

        // Keep tool active for multiple copies (user can press Escape to finish)
        return;
      }

      // Handle rotate tool (rotate entities around a center point)
      if (activeTool === 'rotate') {
        // Check if entities are selected
        if (selectedIds.size === 0) {
          alert('Please select entities first before using ROTATE tool');
          return;
        }

        // First click: Set rotation center point
        if (!rotateCenter) {
          const center: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
          setRotateCenter(center);
          alert('Rotation center set. Click to specify rotation angle or type angle in degrees.');
          return;
        }

        // Second click: Calculate angle and rotate entities
        const clickPoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };

        // Calculate angle from center to click point
        const angleRadians = calculateAngle(rotateCenter, clickPoint);

        // Prompt user for angle (or use calculated angle)
        const angleInput = prompt(
          `Rotate by angle:\n` +
          `Calculated from click: ${radiansToDegrees(angleRadians).toFixed(2)}°\n` +
          `Enter angle in degrees (or press OK to use calculated):`,
          radiansToDegrees(angleRadians).toFixed(2)
        );

        if (angleInput === null) {
          // User cancelled
          setRotateCenter(null);
          return;
        }

        const angleDegrees = parseFloat(angleInput);
        if (isNaN(angleDegrees)) {
          alert('Invalid angle');
          setRotateCenter(null);
          return;
        }

        const rotationAngle = degreesToRadians(angleDegrees);

        // Rotate all selected entities
        selectedIds.forEach(id => {
          const entity = entities.get(id);
          if (entity) {
            const rotatedEntity = rotateEntity(entity, rotateCenter, rotationAngle);
            // Replace original with rotated entity (keep same ID)
            removeEntity(id);
            addEntity({ ...rotatedEntity, id });
          }
        });

        // Reset and switch to select tool
        setRotateCenter(null);
        deselectAll();
        setActiveTool('select');
        return;
      }

      // Handle array tool (create rectangular or polar arrays)
      if (activeTool === 'array') {
        // Check if entities are selected
        if (selectedIds.size === 0) {
          alert('Please select entities first before using ARRAY tool');
          return;
        }

        // Prompt user to choose array type
        const arrayType = prompt(
          'Array Type:\n' +
          '1 - Rectangular (rows and columns)\n' +
          '2 - Polar (circular around center)\n' +
          'Enter 1 or 2:',
          '1'
        );

        if (arrayType === null) {
          return; // User cancelled
        }

        if (arrayType === '1') {
          // Rectangular Array
          const rowsInput = prompt('Number of rows:', '3');
          if (rowsInput === null) return;
          const rows = parseInt(rowsInput);

          const colsInput = prompt('Number of columns:', '3');
          if (colsInput === null) return;
          const cols = parseInt(colsInput);

          const rowSpacingInput = prompt('Row spacing (vertical distance):', '10');
          if (rowSpacingInput === null) return;
          const rowSpacing = parseFloat(rowSpacingInput);

          const colSpacingInput = prompt('Column spacing (horizontal distance):', '10');
          if (colSpacingInput === null) return;
          const colSpacing = parseFloat(colSpacingInput);

          if (isNaN(rows) || isNaN(cols) || isNaN(rowSpacing) || isNaN(colSpacing) ||
              rows < 1 || cols < 1) {
            alert('Invalid array parameters');
            return;
          }

          // Create rectangular array
          const originalEntities = Array.from(selectedIds).map(id => entities.get(id)).filter(e => e !== undefined);

          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              // Skip the first item (0,0) as it's the original
              if (row === 0 && col === 0) continue;

              const dx = col * colSpacing;
              const dy = -row * rowSpacing; // Negative because Y grows downward in canvas

              // Copy all selected entities at this offset
              originalEntities.forEach(entity => {
                if (entity) {
                  const copiedEntity = translateEntity(entity, dx, dy, 0);
                  addEntity(copiedEntity);
                }
              });
            }
          }

          deselectAll();
          setActiveTool('select');
          return;

        } else if (arrayType === '2') {
          // Polar Array
          const centerPoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };

          const countInput = prompt('Number of items (including original):', '6');
          if (countInput === null) return;
          const count = parseInt(countInput);

          const angleFillInput = prompt('Angle to fill (degrees, 360 for full circle):', '360');
          if (angleFillInput === null) return;
          const angleFill = parseFloat(angleFillInput);

          const rotateItemsInput = prompt('Rotate items as they are copied? (yes/no):', 'yes');
          if (rotateItemsInput === null) return;
          const rotateItems = rotateItemsInput.toLowerCase() === 'yes';

          if (isNaN(count) || isNaN(angleFill) || count < 2) {
            alert('Invalid array parameters');
            return;
          }

          const angleIncrement = degreesToRadians(angleFill / (count - 1));
          const originalEntities = Array.from(selectedIds).map(id => entities.get(id)).filter(e => e !== undefined);

          // Create polar array
          for (let i = 1; i < count; i++) {
            const angle = angleIncrement * i;

            originalEntities.forEach(entity => {
              if (entity) {
                let copiedEntity = rotateEntity(entity, centerPoint, angle);

                // If not rotating items, only translate the position, don't rotate the entity itself
                if (!rotateItems) {
                  // Calculate the position offset only
                  const entityCenter = getEntityCenter(entity);
                  const rotatedCenter = rotatePoint(entityCenter, centerPoint, angle);
                  const dx = rotatedCenter.x - entityCenter.x;
                  const dy = rotatedCenter.y - entityCenter.y;
                  copiedEntity = translateEntity(entity, dx, dy, 0);
                }

                addEntity(copiedEntity);
              }
            });
          }

          deselectAll();
          setActiveTool('select');
          return;

        } else {
          alert('Invalid array type. Enter 1 or 2.');
          return;
        }
      }

      // Handle dimension tool (create aligned dimensions)
      if (activeTool === 'dimension') {
        if (!dimensionDefPoint1) {
          // First click: Set first definition point
          setDimensionDefPoint1({ x: mousePos.x, y: mousePos.y, z: 0 });
          return;
        }

        if (!dimensionDefPoint2) {
          // Second click: Set second definition point
          setDimensionDefPoint2({ x: mousePos.x, y: mousePos.y, z: 0 });
          return;
        }

        // Third click: Set dimension line point and create dimension
        const dimLinePoint: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };

        // Calculate measurement
        const measurement = calculateDistance(dimensionDefPoint1, dimensionDefPoint2);

        // Create dimension entity
        const dimension: DimensionEntity = {
          id: `dimension_${Date.now()}`,
          type: 'dimension',
          dimensionType: 'aligned',
          layer: activeLayer,
          visible: true,
          selected: false,
          defPoint1: dimensionDefPoint1,
          defPoint2: dimensionDefPoint2,
          dimLinePoint,
          textPosition: {
            x: (dimensionDefPoint1.x + dimensionDefPoint2.x) / 2,
            y: (dimensionDefPoint1.y + dimensionDefPoint2.y) / 2,
            z: 0,
          },
          text: measurement.toFixed(2),
          measurement,
          textHeight: DEFAULT_DIMENSION_STYLE.textHeight,
          arrowSize: DEFAULT_DIMENSION_STYLE.arrowSize,
          extensionLineOffset: DEFAULT_DIMENSION_STYLE.extensionLineOffset,
        };

        addEntity(dimension);

        // Reset and continue (allow multiple dimensions)
        setDimensionDefPoint1(null);
        setDimensionDefPoint2(null);
        return;
      }

      // Handle hatch tool (create pattern fill within boundaries)
      if (activeTool === 'hatch') {
        // First, allow user to select boundary entities by clicking
        if (hatchBoundaries.size === 0) {
          const clickedEntity = findEntityAtPoint(mousePos, 10 / viewState.zoom);
          if (!clickedEntity) return;

          // Only closed polylines can be boundaries
          if (clickedEntity.type !== 'polyline') {
            alert('HATCH boundaries must be closed polylines');
            return;
          }

          const polyline = clickedEntity as PolylineEntity;
          if (!polyline.closed) {
            alert('HATCH boundaries must be closed polylines');
            return;
          }

          // Add to boundary set
          setHatchBoundaries(new Set([clickedEntity.id]));
          alert('Boundary selected. Press Enter to configure hatch pattern, or click more boundaries to add. Press Escape to cancel.');
          return;
        }

        // User clicked another boundary - add to set
        const clickedEntity = findEntityAtPoint(mousePos, 10 / viewState.zoom);
        if (clickedEntity && clickedEntity.type === 'polyline') {
          const polyline = clickedEntity as PolylineEntity;
          if (polyline.closed) {
            const newBoundaries = new Set(hatchBoundaries);
            newBoundaries.add(clickedEntity.id);
            setHatchBoundaries(newBoundaries);
            alert(`${newBoundaries.size} boundaries selected. Press Enter to configure pattern.`);
          } else {
            alert('Boundary must be a closed polyline');
          }
        }

        return;
      }

      // Handle fillet tool (create rounded corners between lines)
      if (activeTool === 'fillet') {
        // First click: Select first line
        if (!filletFirstLine) {
          const clickedEntity = findEntityAtPoint(mousePos, 10 / viewState.zoom);
          if (!clickedEntity) return;

          if (clickedEntity.type !== 'line') {
            alert('FILLET only supports lines. Please select a line.');
            return;
          }

          // Prompt for fillet radius
          const radiusStr = prompt('Enter fillet radius:', filletRadius.toString());
          if (!radiusStr) return;

          const radius = parseFloat(radiusStr);
          if (isNaN(radius) || radius <= 0) {
            alert('Invalid radius. Please enter a positive number.');
            return;
          }

          setFilletRadius(radius);
          setFilletFirstLine(clickedEntity as LineEntity);
          alert('First line selected. Click second line to create fillet.');
          return;
        }

        // Second click: Select second line and create fillet
        const clickedEntity = findEntityAtPoint(mousePos, 10 / viewState.zoom);
        if (!clickedEntity) return;

        if (clickedEntity.type !== 'line') {
          alert('FILLET only supports lines. Please select a line.');
          return;
        }

        const secondLine = clickedEntity as LineEntity;

        // Validate fillet
        const validationError = validateFillet(filletFirstLine, secondLine, filletRadius);
        if (validationError) {
          alert(`Cannot create fillet: ${validationError}`);
          setFilletFirstLine(null);
          return;
        }

        // Calculate fillet
        const filletResult = calculateFillet(filletFirstLine, secondLine, filletRadius);
        if (!filletResult) {
          alert('Could not create fillet. Lines may be parallel or radius too large.');
          setFilletFirstLine(null);
          return;
        }

        // Remove original lines and add trimmed lines + arc
        removeEntity(filletFirstLine.id);
        removeEntity(secondLine.id);
        addEntity(filletResult.trimmedLine1);
        addEntity(filletResult.trimmedLine2);
        addEntity(filletResult.arc);

        // Reset and continue (allow multiple fillets)
        setFilletFirstLine(null);
        return;
      }

      // Handle infrastructure pipe tools (two-click drawing)
      if (isInfraPipeTool(activeTool)) {
        if (!infraDrawStart) {
          // First click - start drawing
          setInfraDrawStart({ x: mousePos.x, y: mousePos.y, z: 0 });
        } else {
          // Second click - finish drawing
          const startPt: Point3D = infraDrawStart;
          const endPt: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };
          const vertices = [startPt, endPt];

          switch (activeTool) {
            case 'water_pipe': {
              const pipe = createWaterPipe(vertices, {});
              addInfraEntity(pipe);
              autoConnectPipe(pipe.id);
              break;
            }
            case 'sewer_pipe': {
              const pipe = createSewerPipe(vertices, {});
              addInfraEntity(pipe);
              autoConnectPipe(pipe.id);
              break;
            }
            case 'storm_collector': {
              const collector = createStormCollector(vertices, {});
              addInfraEntity(collector);
              autoConnectPipe(collector.id);
              break;
            }
          }
          setInfraDrawStart(null);
        }
        return;
      }

      // Handle infrastructure node tools (single-click placement)
      if (isInfraNodeTool(activeTool)) {
        const pos: Point3D = { x: mousePos.x, y: mousePos.y, z: 0 };

        switch (activeTool) {
          case 'water_junction':
            addInfraEntity(createWaterJunction(pos, {}));
            break;
          case 'manhole':
            addInfraEntity(createManhole(pos, { rimElevation: pos.z + 2 }));
            break;
          case 'storm_inlet':
            addInfraEntity(createStormInlet(pos, {}));
            break;
        }
        return;
      }

      // Handle standard detail placement (single-click)
      if (activeTool === 'standard_detail' && placementDetail) {
        insertDetailAtPosition({ x: mousePos.x, y: mousePos.y, z: 0 });
        return;
      }

      // Standard CAD tools
      setIsDrawing(true);
      setDrawStart(mousePos);

      if (activeTool === 'point') {
        const newPoint: PointEntity = {
          id: `point_${Date.now()}`,
          type: 'point',
          layer: activeLayer,
          visible: true,
          selected: false,
          position: { x: mousePos.x, y: mousePos.y, z: 0 },
        };
        addEntity(newPoint);
      }
    },
    [mousePos, activeTool, activeLayer, addEntity, addInfraEntity, autoConnectPipe, infraDrawStart, placementDetail, insertDetailAtPosition, viewState, setZoom, lastClickTime, polylineVertices, arcStart, arcEnd, calculateArcFrom3Points, measurePoints, calculateDistance, findEntityAtPoint, entities, selectedIds, updateEntity, selectEntity, deselectAll, worldToScreen, setDraggingVertexIndex, setIsDragging, setDragStart, setIsSelecting, setSelectionBox]
  );

  const handleMouseUp = useCallback(() => {
    // Stop dragging polyline vertex
    if (draggingVertexIndex !== null) {
      setDraggingVertexIndex(null);
      return;
    }

    // Complete selection box
    if (isSelecting && selectionBox && dragStart) {
      const dx = selectionBox.end.x - selectionBox.start.x;

      // Determine window vs crossing based on drag direction
      // Left-to-right (positive dx) = window selection (requires full containment)
      // Right-to-left (negative dx) = crossing selection (partial overlap)
      const crossingMode = dx < 0;

      // Only perform selection if box has meaningful size
      const boxWidth = Math.abs(dx);
      const boxHeight = Math.abs(selectionBox.end.y - selectionBox.start.y);

      if (boxWidth > 5 || boxHeight > 5) {
        const selectedEntityIds = findEntitiesInBox(selectionBox, crossingMode);

        // Select found entities
        selectedEntityIds.forEach(id => {
          updateEntity(id, { selected: true });
          selectEntity(id);
        });
      }

      setIsSelecting(false);
      setSelectionBox(null);
      setDragStart(null);
      return;
    }

    // End dragging
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }

    if (isDrawing && drawStart) {
      if (activeTool === 'line') {
        const newLine: LineEntity = {
          id: `line_${Date.now()}`,
          type: 'line',
          layer: activeLayer,
          visible: true,
          selected: false,
          start: { x: drawStart.x, y: drawStart.y, z: 0 },
          end: { x: mousePos.x, y: mousePos.y, z: 0 },
        };
        addEntity(newLine);
      } else if (activeTool === 'circle') {
        const dx = mousePos.x - drawStart.x;
        const dy = mousePos.y - drawStart.y;
        const radius = Math.sqrt(dx * dx + dy * dy);

        const newCircle: CircleEntity = {
          id: `circle_${Date.now()}`,
          type: 'circle',
          layer: activeLayer,
          visible: true,
          selected: false,
          center: { x: drawStart.x, y: drawStart.y, z: 0 },
          radius: radius,
        };
        addEntity(newCircle);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
  }, [isDrawing, drawStart, activeTool, mousePos, activeLayer, addEntity, isDragging, isSelecting, selectionBox, dragStart, findEntitiesInBox, updateEntity, selectEntity, draggingVertexIndex]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(viewState.zoom * delta);
    },
    [viewState.zoom, setZoom]
  );

  // Resize canvas to fit container
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // Only resize if dimensions are valid
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    // Initial resize with a small delay to ensure layout is calculated
    const timer = setTimeout(resizeCanvas, 0);

    // Also resize immediately
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []); // Remove draw dependency to avoid infinite loops

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Animation loop
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [draw]);

  // Handle keyboard events for canceling drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Function key shortcuts
      if (e.key === 'F3') {
        // Toggle object snapping (like AutoCAD)
        e.preventDefault();
        toggleSnap();
      } else if (e.key === 'F8') {
        // Toggle ortho mode (like AutoCAD)
        e.preventDefault();
        toggleOrtho();
      } else if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && e.shiftKey) {
        // Toggle grid display (Shift+G to avoid conflict with other 'g' tools)
        e.preventDefault();
        toggleGrid();
      }
      // Tool shortcuts (case-insensitive, like AutoCAD)
      else if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('line');
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('circle');
      } else if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('arc');
      } else if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('point');
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('measure');
      } else if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('text');
      } else if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('pan');
      } else if (e.key.toLowerCase() === 'z' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('zoom');
      } else if (e.key === 'Escape') {
        setInfraDrawStart(null);
        setIsDrawing(false);
        setDrawStart(null);
        setPolylineVertices([]);
        setArcStart(null);
        setArcEnd(null);
        setTextPlacement(null);
        setMeasurePoints([]);
        setIsSelecting(false);
        setSelectionBox(null);
        setTrimExtendBoundaries(new Set()); // Clear trim/extend boundaries
        setCopyMoveBasePoint(null); // Clear copy/move base point
        setFilletFirstLine(null); // Clear fillet first line
        setDimensionDefPoint1(null); // Clear dimension first point
        setDimensionDefPoint2(null); // Clear dimension second point
        setHatchBoundaries(new Set()); // Clear hatch boundaries
        setRotateCenter(null); // Clear rotate center

        // Also cancel standard detail placement
        if (placementDetail) {
          cancelPlacement();
        }

        // Return to select tool (AutoCAD behavior)
        const isDrawingTool = ['line', 'circle', 'arc', 'polyline', 'point', 'text', 'measure', 'trim', 'extend', 'copy', 'move', 'rotate', 'array', 'fillet', 'dimension', 'hatch'].includes(activeTool);
        if (isDrawingTool) {
          setActiveTool('select');
        }
      }
      // Undo/Redo shortcuts
      else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
      }
      // Delete selected entities
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          selectedIds.forEach(id => {
            removeEntity(id);
          });
          deselectAll();
        }
      } else if (e.key === 'Enter') {
        if (activeTool === 'polyline' && polylineVertices.length >= 2) {
          // Finish polyline on Enter key
          const newPolyline: PolylineEntity = {
            id: `polyline_${Date.now()}`,
            type: 'polyline',
            layer: activeLayer,
            visible: true,
            selected: false,
            vertices: polylineVertices,
            closed: false,
          };
          addEntity(newPolyline);
          setPolylineVertices([]);
        } else if (activeTool === 'measure' && measurePoints.length >= 1) {
          // Reset measurements on Enter key
          setMeasurePoints([]);
        } else if (activeTool === 'hatch' && hatchBoundaries.size > 0) {
          // Create hatch entity with selected boundaries
          e.preventDefault();

          // Prompt for pattern type
          const patternOptions = ['solid', 'ansi31', 'ansi32', 'ansi33', 'ansi37', 'grass', 'earth', 'gravel', 'water'];
          const patternStr = prompt(
            `Select hatch pattern:\n${patternOptions.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
            '2'
          );
          if (!patternStr) {
            setHatchBoundaries(new Set());
            return;
          }

          const patternIndex = parseInt(patternStr) - 1;
          if (isNaN(patternIndex) || patternIndex < 0 || patternIndex >= patternOptions.length) {
            alert('Invalid pattern selection');
            setHatchBoundaries(new Set());
            return;
          }

          const pattern = patternOptions[patternIndex] as HatchPattern;

          // Prompt for angle (degrees)
          const angleStr = prompt('Enter pattern angle (degrees):', '0');
          if (angleStr === null) {
            setHatchBoundaries(new Set());
            return;
          }

          const angleDegrees = parseFloat(angleStr);
          if (isNaN(angleDegrees)) {
            alert('Invalid angle');
            setHatchBoundaries(new Set());
            return;
          }

          const angleRadians = (angleDegrees * Math.PI) / 180;

          // Prompt for scale
          const scaleStr = prompt('Enter pattern scale:', '1.0');
          if (scaleStr === null) {
            setHatchBoundaries(new Set());
            return;
          }

          const scale = parseFloat(scaleStr);
          if (isNaN(scale) || scale <= 0) {
            alert('Invalid scale. Must be positive.');
            setHatchBoundaries(new Set());
            return;
          }

          // Create hatch entity
          const hatch = createHatchEntity(
            Array.from(hatchBoundaries),
            pattern,
            angleRadians,
            scale,
            activeLayer
          );

          addEntity(hatch);
          setHatchBoundaries(new Set());
          setActiveTool('select');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placementDetail, cancelPlacement, activeTool, polylineVertices, activeLayer, addEntity, measurePoints, setActiveTool, undo, redo, selectedIds, removeEntity, deselectAll, toggleSnap, toggleOrtho, hatchBoundaries]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDrawing(false);
          setIsDragging(false);
          setDragStart(null);
        }}
        onWheel={handleWheel}
        className="cursor-crosshair"
      />
    </div>
  );
}
