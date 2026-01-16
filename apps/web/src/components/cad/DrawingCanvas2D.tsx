'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useCADStore } from '@/stores/cad-store';
import { useInfrastructureStore } from '@/stores/infrastructure-store';
import type { Point2D, Point3D, LineEntity, PointEntity, PolylineEntity, CircleEntity, ArcEntity, TextEntity } from '@/types/cad';
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

interface DrawingCanvas2DProps {
  className?: string;
}

export default function DrawingCanvas2D({ className = '' }: DrawingCanvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<Point2D>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point2D | null>(null);

  const {
    entities,
    viewState,
    activeTool,
    activeLayer,
    addEntity,
    setZoom,
    setPan,
    selectEntity,
    deselectAll,
    placementDetail,
    insertDetailAtPosition,
    cancelPlacement,
  } = useCADStore();

  const {
    addInfraEntity,
    infrastructureEntities,
    findNearestNode,
    autoConnectPipe,
  } = useInfrastructureStore();

  // Track multi-click drawing state for infrastructure pipes
  const [infraDrawStart, setInfraDrawStart] = useState<Point3D | null>(null);

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
    entities.forEach((entity) => {
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
    if (isDrawing && drawStart && activeTool === 'line') {
      ctx.strokeStyle = '#e94560';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const start = worldToScreen(drawStart.x, drawStart.y);
      const end = worldToScreen(mousePos.x, mousePos.y);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
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

    // Draw coordinates
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`X: ${mousePos.x.toFixed(2)} Y: ${mousePos.y.toFixed(2)}`, 10, canvas.height - 10);
    ctx.fillText(`Zoom: ${(viewState.zoom * 100).toFixed(0)}%`, 10, canvas.height - 30);
  }, [entities, infrastructureEntities, viewState, mousePos, isDrawing, drawStart, infraDrawStart, activeTool, worldToScreen, placementDetail]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 50 * viewState.zoom;
    const offsetX = (viewState.panX % gridSize) + width / 2;
    const offsetY = (viewState.panY % gridSize) + height / 2;

    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = offsetX % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = offsetY % gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 1;

    // X axis
    const yAxis = height / 2 + viewState.panY;
    ctx.beginPath();
    ctx.moveTo(0, yAxis);
    ctx.lineTo(width, yAxis);
    ctx.stroke();

    // Y axis
    const xAxis = width / 2 + viewState.panX;
    ctx.beginPath();
    ctx.moveTo(xAxis, 0);
    ctx.lineTo(xAxis, height);
    ctx.stroke();
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

      // Snap to grid
      const snapSize = 10;
      const snappedWorld = {
        x: Math.round(world.x / snapSize) * snapSize,
        y: Math.round(world.y / snapSize) * snapSize,
      };

      setMousePos(snappedWorld);

      // Handle panning
      if (activeTool === 'pan' && isDrawing && drawStart) {
        setPan(
          viewState.panX + (screenX - (drawStart as unknown as { screenX: number }).screenX),
          viewState.panY + (screenY - (drawStart as unknown as { screenY: number }).screenY)
        );
      }
    },
    [screenToWorld, activeTool, isDrawing, drawStart, viewState, setPan]
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
    [mousePos, activeTool, activeLayer, addEntity, addInfraEntity, autoConnectPipe, infraDrawStart, placementDetail, insertDetailAtPosition]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing && drawStart && activeTool === 'line') {
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
    }

    setIsDrawing(false);
    setDrawStart(null);
  }, [isDrawing, drawStart, activeTool, mousePos, activeLayer, addEntity]);

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

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw]);

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
      if (e.key === 'Escape') {
        setInfraDrawStart(null);
        setIsDrawing(false);
        setDrawStart(null);
        // Also cancel standard detail placement
        if (placementDetail) {
          cancelPlacement();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placementDetail, cancelPlacement]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDrawing(false)}
        onWheel={handleWheel}
        className="cursor-crosshair"
      />
    </div>
  );
}
