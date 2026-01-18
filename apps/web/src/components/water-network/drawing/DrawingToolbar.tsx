'use client';

import {
  MousePointer2,
  Circle,
  GitBranch,
  Container,
  Droplets,
  Zap,
  Disc,
  PenTool,
  Trash2,
  Move,
} from 'lucide-react';
import {
  useWaterNetworkStore,
  useActiveTool,
  useDrawingActions,
} from '@/stores/water-network/waterNetworkStore';
import type { DrawingTool } from '@/stores/water-network/types';

interface ToolButton {
  id: DrawingTool;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

const tools: ToolButton[] = [
  { id: 'select', icon: <MousePointer2 size={20} />, label: 'Seleccionar', shortcut: 'V' },
  { id: 'pan', icon: <Move size={20} />, label: 'Mover', shortcut: 'H' },
  { id: 'junction', icon: <Circle size={20} />, label: 'Nodo', shortcut: 'J' },
  { id: 'pipe', icon: <GitBranch size={20} />, label: 'Tubería', shortcut: 'P' },
  { id: 'tank', icon: <Container size={20} />, label: 'Estanque', shortcut: 'T' },
  { id: 'reservoir', icon: <Droplets size={20} />, label: 'Embalse', shortcut: 'R' },
  { id: 'pump', icon: <Zap size={20} />, label: 'Bomba', shortcut: 'B' },
  { id: 'valve', icon: <Disc size={20} />, label: 'Válvula', shortcut: 'L' },
  { id: 'demandZone', icon: <PenTool size={20} />, label: 'Zona Demanda', shortcut: 'Z' },
  { id: 'delete', icon: <Trash2 size={20} />, label: 'Eliminar', shortcut: 'Del' },
];

export function DrawingToolbar() {
  const activeTool = useActiveTool();
  const { setActiveTool } = useDrawingActions();

  return (
    <div className="w-14 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2 gap-1 shrink-0">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`
            w-10 h-10 flex items-center justify-center rounded-lg transition-all
            ${activeTool === tool.id
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }
          `}
          title={`${tool.label} (${tool.shortcut})`}
        >
          {tool.icon}
        </button>
      ))}

      {/* Separator */}
      <div className="w-8 h-px bg-slate-700 my-2" />

      {/* Snap Toggle */}
      <SnapToggle />
    </div>
  );
}

function SnapToggle() {
  const snapEnabled = useWaterNetworkStore((s) => s.drawing.snapEnabled);
  const setSnapEnabled = useWaterNetworkStore((s) => s.setSnapEnabled);

  return (
    <button
      onClick={() => setSnapEnabled(!snapEnabled)}
      className={`
        w-10 h-10 flex items-center justify-center rounded-lg transition-all text-xs font-bold
        ${snapEnabled
          ? 'bg-green-600/20 text-green-400 border border-green-600'
          : 'text-slate-500 hover:bg-slate-700 hover:text-slate-300 border border-transparent'
        }
      `}
      title={`Snap ${snapEnabled ? 'ON' : 'OFF'} (F3)`}
    >
      SNAP
    </button>
  );
}
