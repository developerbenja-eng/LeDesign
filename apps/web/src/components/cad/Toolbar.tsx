'use client';

import { useCADStore } from '@/stores/cad-store';
import type { DrawingTool } from '@/types/cad';

const tools: { id: DrawingTool; icon: string; label: string; shortcut: string }[] = [
  { id: 'select', icon: '↖', label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: '✋', label: 'Pan', shortcut: 'H' },
  { id: 'zoom', icon: '🔍', label: 'Zoom', shortcut: 'Z' },
  { id: 'point', icon: '•', label: 'Point', shortcut: 'P' },
  { id: 'line', icon: '/', label: 'Line', shortcut: 'L' },
  { id: 'polyline', icon: '⌇', label: 'Polyline', shortcut: 'PL' },
  { id: 'circle', icon: '○', label: 'Circle', shortcut: 'C' },
  { id: 'arc', icon: '⌒', label: 'Arc', shortcut: 'A' },
  { id: 'text', icon: 'T', label: 'Text', shortcut: 'T' },
  { id: 'measure', icon: '📏', label: 'Measure', shortcut: 'M' },
];

interface ToolbarProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export default function Toolbar({ orientation = 'vertical', className = '' }: ToolbarProps) {
  const { activeTool, setActiveTool, undo, redo, resetView, toggle3D, viewState } = useCADStore();

  const isVertical = orientation === 'vertical';

  return (
    <div
      className={`bg-cad-panel border-cad-accent ${
        isVertical ? 'flex flex-col border-r w-14' : 'flex flex-row border-b h-14'
      } ${className}`}
    >
      {/* Drawing Tools */}
      <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} p-1 gap-1`}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`w-10 h-10 flex items-center justify-center rounded text-lg transition-colors
              ${
                activeTool === tool.id
                  ? 'bg-cad-highlight text-white'
                  : 'bg-cad-accent text-gray-300 hover:bg-cad-highlight/50'
              }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className={`${isVertical ? 'h-px w-full my-2' : 'w-px h-full mx-2'} bg-cad-accent`} />

      {/* View Controls */}
      <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} p-1 gap-1`}>
        <button
          onClick={undo}
          className="w-10 h-10 flex items-center justify-center rounded bg-cad-accent text-gray-300 hover:bg-cad-highlight/50"
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          onClick={redo}
          className="w-10 h-10 flex items-center justify-center rounded bg-cad-accent text-gray-300 hover:bg-cad-highlight/50"
          title="Redo (Ctrl+Y)"
        >
          ↪
        </button>
        <button
          onClick={resetView}
          className="w-10 h-10 flex items-center justify-center rounded bg-cad-accent text-gray-300 hover:bg-cad-highlight/50"
          title="Reset View"
        >
          ⟲
        </button>
        <button
          onClick={toggle3D}
          className={`w-10 h-10 flex items-center justify-center rounded transition-colors
            ${
              viewState.is3D
                ? 'bg-cad-highlight text-white'
                : 'bg-cad-accent text-gray-300 hover:bg-cad-highlight/50'
            }`}
          title="Toggle 3D View"
        >
          {viewState.is3D ? '3D' : '2D'}
        </button>
      </div>
    </div>
  );
}
