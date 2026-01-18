'use client';

// ============================================================
// 3D VIEW
// Perspective/isometric 3D visualization
// ============================================================

import { useRef, useEffect } from 'react';
import type { ViewInstance } from '@/stores/workspace-store';
import { useCADStore } from '@/stores/cad-store';
import { RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface View3DProps {
  view: ViewInstance;
}

export function View3D({ view }: View3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entities = useCADStore((state) => state.entities);

  const [rotation, setRotation] = React.useState({ x: 30, y: 45 });
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });

  // Draw 3D scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;

    // 3D to 2D projection (isometric)
    const project = (x: number, y: number, z: number) => {
      const angleX = (rotation.x * Math.PI) / 180;
      const angleY = (rotation.y * Math.PI) / 180;

      // Rotate around Y axis
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      // Rotate around X axis
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      // Apply zoom and center
      const screenX = centerX + x1 * zoom;
      const screenY = centerY - y1 * zoom;

      return { x: screenX, y: screenY, z: z2 };
    };

    // Draw 3D grid
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1;

    const gridSize = 100;
    const gridStep = 10;

    // XY plane grid
    for (let x = -gridSize; x <= gridSize; x += gridStep) {
      const p1 = project(x, -gridSize, 0);
      const p2 = project(x, gridSize, 0);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    for (let y = -gridSize; y <= gridSize; y += gridStep) {
      const p1 = project(-gridSize, y, 0);
      const p2 = project(gridSize, y, 0);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw 3D axes
    ctx.lineWidth = 2;

    // X axis (red)
    ctx.strokeStyle = '#ef4444';
    const xAxis1 = project(0, 0, 0);
    const xAxis2 = project(50, 0, 0);
    ctx.beginPath();
    ctx.moveTo(xAxis1.x, xAxis1.y);
    ctx.lineTo(xAxis2.x, xAxis2.y);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = '12px sans-serif';
    ctx.fillText('X', xAxis2.x + 10, xAxis2.y);

    // Y axis (green)
    ctx.strokeStyle = '#10b981';
    const yAxis1 = project(0, 0, 0);
    const yAxis2 = project(0, 50, 0);
    ctx.beginPath();
    ctx.moveTo(yAxis1.x, yAxis1.y);
    ctx.lineTo(yAxis2.x, yAxis2.y);
    ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.fillText('Y', yAxis2.x, yAxis2.y - 10);

    // Z axis (blue)
    ctx.strokeStyle = '#3b82f6';
    const zAxis1 = project(0, 0, 0);
    const zAxis2 = project(0, 0, 50);
    ctx.beginPath();
    ctx.moveTo(zAxis1.x, zAxis1.y);
    ctx.lineTo(zAxis2.x, zAxis2.y);
    ctx.stroke();
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Z', zAxis2.x + 10, zAxis2.y);

    // Draw CAD entities in 3D
    ctx.strokeStyle = '#60a5fa'; // blue-400
    ctx.lineWidth = 2;

    entities.forEach((entity) => {
      if (entity.type === 'line') {
        const p1 = project(entity.start.x, entity.start.y, 0);
        const p2 = project(entity.end!.x, entity.end!.y, 0);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      } else if (entity.type === 'circle') {
        // Draw circle as series of points
        const segments = 32;
        const radius = entity.radius || 10;

        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * 2 * Math.PI;
          const x = entity.start.x + Math.cos(angle) * radius;
          const y = entity.start.y + Math.sin(angle) * radius;
          const p = project(x, y, 0);

          if (i === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }
    });

  }, [entities, rotation, zoom, pan]);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Toolbar */}
      <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
        <span className="text-xs text-slate-400">3D View</span>
        <div className="flex-1" />

        <button
          onClick={() => {
            setRotation({ x: 30, y: 45 });
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
          title="Reset view"
        >
          <RotateCcw size={14} />
        </button>

        <button
          onClick={() => setZoom(zoom * 1.2)}
          className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>

        <button
          onClick={() => setZoom(zoom / 1.2)}
          className="p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startY = e.clientY;
            const startRotation = { ...rotation };

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const deltaY = moveEvent.clientY - startY;

              setRotation({
                x: startRotation.x + deltaY * 0.5,
                y: startRotation.y + deltaX * 0.5,
              });
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(zoom * delta);
          }}
        />
      </div>

      {/* Info Panel */}
      <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700 flex items-center gap-4 text-xs">
        <div className="text-slate-400">
          Rotation: <span className="text-white">X:{rotation.x.toFixed(0)}° Y:{rotation.y.toFixed(0)}°</span>
        </div>
        <div className="text-slate-400">
          Zoom: <span className="text-white">{(zoom * 100).toFixed(0)}%</span>
        </div>
        <div className="text-slate-400">
          Entities: <span className="text-white">{entities.length}</span>
        </div>
      </div>
    </div>
  );
}
