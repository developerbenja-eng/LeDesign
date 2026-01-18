'use client';

// ============================================================
// TOOLBAR
// Main vertical toolbar with drawing and view tools
// ============================================================

import { useEditorStore } from '@/stores';
import type { DrawingTool } from '@/stores/slices/types';
import {
  MousePointer2,
  CircleDot,
  Minus,
  ArrowUpFromLine,
  Triangle,
  Square,
  Layers,
  Move3d,
  RotateCcw,
  Grid3x3,
  Eye,
  MessageSquare,
  List,
  Sliders,
  FileBox,
} from 'lucide-react';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  shortcut?: string;
}

function ToolButton({ icon, label, isActive, onClick, shortcut }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-10 h-10 flex items-center justify-center rounded-lg transition-colors
        ${isActive
          ? 'bg-lele-accent text-white'
          : 'text-slate-400 hover:bg-lele-bg hover:text-slate-200'
        }
      `}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
    </button>
  );
}

function ToolDivider() {
  return <div className="h-px w-8 bg-lele-border mx-auto my-1" />;
}

export function Toolbar() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const showGrid = useEditorStore((state) => state.showGrid);
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const treePanel = useEditorStore((state) => state.treePanel);
  const propertiesPanel = useEditorStore((state) => state.propertiesPanel);
  const aiChatPanel = useEditorStore((state) => state.aiChatPanel);
  const normativaPanel = useEditorStore((state) => state.normativaPanel);
  const togglePanel = useEditorStore((state) => state.togglePanel);

  const handleToolClick = (tool: DrawingTool) => {
    setActiveTool(tool);
  };

  return (
    <div className="w-14 bg-lele-panel border-r border-lele-border flex flex-col items-center py-2 gap-1 shrink-0">
      {/* Selection Tools */}
      <ToolButton
        icon={<MousePointer2 className="w-5 h-5" />}
        label="Select"
        shortcut="V"
        isActive={activeTool === 'select'}
        onClick={() => handleToolClick('select')}
      />

      <ToolDivider />

      {/* Drawing Tools */}
      <ToolButton
        icon={<CircleDot className="w-5 h-5" />}
        label="Node"
        shortcut="N"
        isActive={activeTool === 'node'}
        onClick={() => handleToolClick('node')}
      />
      <ToolButton
        icon={<Minus className="w-5 h-5" />}
        label="Beam"
        shortcut="B"
        isActive={activeTool === 'beam'}
        onClick={() => handleToolClick('beam')}
      />
      <ToolButton
        icon={<ArrowUpFromLine className="w-5 h-5" />}
        label="Column"
        shortcut="C"
        isActive={activeTool === 'column'}
        onClick={() => handleToolClick('column')}
      />
      <ToolButton
        icon={<Triangle className="w-5 h-5" />}
        label="Brace"
        shortcut="X"
        isActive={activeTool === 'brace'}
        onClick={() => handleToolClick('brace')}
      />
      <ToolButton
        icon={<Square className="w-5 h-5" />}
        label="Wall"
        shortcut="W"
        isActive={activeTool === 'wall'}
        onClick={() => handleToolClick('wall')}
      />
      <ToolButton
        icon={<Layers className="w-5 h-5" />}
        label="Slab"
        shortcut="S"
        isActive={activeTool === 'slab'}
        onClick={() => handleToolClick('slab')}
      />

      <ToolDivider />

      {/* View Tools */}
      <ToolButton
        icon={<Move3d className="w-5 h-5" />}
        label="Pan"
        isActive={activeTool === 'pan'}
        onClick={() => handleToolClick('pan')}
      />
      <ToolButton
        icon={<RotateCcw className="w-5 h-5" />}
        label="Orbit"
        isActive={activeTool === 'orbit'}
        onClick={() => handleToolClick('orbit')}
      />

      <ToolDivider />

      {/* View Options */}
      <ToolButton
        icon={<Grid3x3 className="w-5 h-5" />}
        label="Toggle Grid"
        isActive={showGrid}
        onClick={toggleGrid}
      />
      <ToolButton
        icon={<Eye className="w-5 h-5" />}
        label="View Options"
        onClick={() => {}}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Panel Toggles */}
      <ToolButton
        icon={<List className="w-5 h-5" />}
        label="Model Tree"
        isActive={treePanel.isOpen}
        onClick={() => togglePanel('treePanel')}
      />
      <ToolButton
        icon={<Sliders className="w-5 h-5" />}
        label="Properties"
        isActive={propertiesPanel.isOpen}
        onClick={() => togglePanel('propertiesPanel')}
      />
      <ToolButton
        icon={<MessageSquare className="w-5 h-5" />}
        label="AI Assistant"
        isActive={aiChatPanel.isOpen}
        onClick={() => togglePanel('aiChatPanel')}
      />
      <ToolButton
        icon={<FileBox className="w-5 h-5" />}
        label="Detalles MINVU"
        isActive={normativaPanel.isOpen}
        onClick={() => togglePanel('normativaPanel')}
      />
    </div>
  );
}
