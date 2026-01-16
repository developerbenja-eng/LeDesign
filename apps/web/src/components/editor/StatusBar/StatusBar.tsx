'use client';

// ============================================================
// STATUS BAR
// Bottom bar showing current state and quick info
// ============================================================

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2,
  Hand,
  RotateCcw,
  Circle,
  Minus,
  Square,
  Triangle,
  Box,
  Grid3X3,
  Eye,
  ArrowUp,
  ArrowRight,
  Magnet,
  Undo2,
  Redo2,
  Layers,
  Command,
} from 'lucide-react';
import { useEditorStore, useCanUndo, useCanRedo } from '@/stores';
import { DrawingTool, ViewMode } from '@/stores/slices/types';

// Tool display config
const toolConfig: Record<DrawingTool, { icon: React.ReactNode; label: string }> = {
  select: { icon: <MousePointer2 size={14} />, label: 'Select' },
  pan: { icon: <Hand size={14} />, label: 'Pan' },
  orbit: { icon: <RotateCcw size={14} />, label: 'Orbit' },
  node: { icon: <Circle size={14} />, label: 'Node' },
  beam: { icon: <Minus size={14} />, label: 'Beam' },
  column: { icon: <Square size={14} />, label: 'Column' },
  brace: { icon: <Triangle size={14} />, label: 'Brace' },
  wall: { icon: <Layers size={14} />, label: 'Wall' },
  slab: { icon: <Box size={14} />, label: 'Slab' },
};

// View mode display config
const viewConfig: Record<ViewMode, { icon: React.ReactNode; label: string }> = {
  '3d': { icon: <Box size={14} />, label: '3D' },
  plan: { icon: <Grid3X3 size={14} />, label: 'Plan' },
  'elevation-x': { icon: <ArrowUp size={14} />, label: 'Elev X' },
  'elevation-y': { icon: <ArrowRight size={14} />, label: 'Elev Y' },
};

export function StatusBar() {
  // Store state
  const activeTool = useEditorStore((state) => state.activeTool);
  const viewMode = useEditorStore((state) => state.viewMode);
  const gridSize = useEditorStore((state) => state.gridSize);
  const showGrid = useEditorStore((state) => state.showGrid);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const nodes = useEditorStore((state) => state.nodes);
  const beams = useEditorStore((state) => state.beams);
  const columns = useEditorStore((state) => state.columns);
  const braces = useEditorStore((state) => state.braces);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  // Computed values
  const selectionCount = selectedIds.size;
  const totalElements = useMemo(() => {
    return nodes.size + beams.size + columns.size + braces.size;
  }, [nodes.size, beams.size, columns.size, braces.size]);

  const tool = toolConfig[activeTool];
  const view = viewConfig[viewMode];

  return (
    <div className="h-7 bg-lele-panel border-t border-lele-border flex items-center justify-between px-3 text-xs text-slate-400">
      {/* Left Section - Tool & View */}
      <div className="flex items-center gap-4">
        {/* Current Tool */}
        <StatusItem
          icon={tool.icon}
          label={tool.label}
          tooltip="Current tool"
        />

        <Divider />

        {/* View Mode */}
        <StatusItem
          icon={view.icon}
          label={view.label}
          tooltip="View mode"
        />

        <Divider />

        {/* Grid */}
        <StatusItem
          icon={<Grid3X3 size={14} />}
          label={`${gridSize}m`}
          active={showGrid}
          tooltip={showGrid ? 'Grid visible' : 'Grid hidden'}
        />

        {/* Snap */}
        <StatusItem
          icon={<Magnet size={14} />}
          label="Snap"
          active={snapToGrid}
          tooltip={snapToGrid ? 'Snap enabled' : 'Snap disabled'}
        />
      </div>

      {/* Center Section - Selection Info */}
      <div className="flex items-center gap-4">
        <AnimatePresence mode="wait">
          {selectionCount > 0 ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-2 text-lele-accent"
            >
              <Eye size={14} />
              <span className="font-medium">{selectionCount} selected</span>
            </motion.div>
          ) : (
            <motion.div
              key="total"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-2"
            >
              <Layers size={14} />
              <span>{totalElements} elements</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Section - Actions & Help */}
      <div className="flex items-center gap-4">
        {/* Undo/Redo Status */}
        <div className="flex items-center gap-2">
          <StatusItem
            icon={<Undo2 size={14} />}
            active={canUndo}
            tooltip={canUndo ? 'Undo available (⌘Z)' : 'Nothing to undo'}
            compact
          />
          <StatusItem
            icon={<Redo2 size={14} />}
            active={canRedo}
            tooltip={canRedo ? 'Redo available (⌘⇧Z)' : 'Nothing to redo'}
            compact
          />
        </div>

        <Divider />

        {/* Command Palette Hint */}
        <div className="flex items-center gap-1.5 text-slate-500 hover:text-slate-400 transition-colors cursor-pointer">
          <Command size={12} />
          <kbd className="px-1 py-0.5 bg-lele-bg rounded text-[10px] font-mono">⌘K</kbd>
        </div>

        <Divider />

        {/* Units */}
        <span className="text-slate-500">m / kN</span>
      </div>
    </div>
  );
}

// ============================================================
// STATUS ITEM
// Individual status indicator
// ============================================================

interface StatusItemProps {
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  tooltip?: string;
  compact?: boolean;
}

function StatusItem({ icon, label, active = true, tooltip, compact }: StatusItemProps) {
  return (
    <div
      className={`
        flex items-center gap-1.5 transition-colors
        ${active ? 'text-slate-300' : 'text-slate-600'}
        ${compact ? '' : 'min-w-[60px]'}
      `}
      title={tooltip}
    >
      <span className={active ? 'text-lele-accent' : ''}>{icon}</span>
      {label && <span>{label}</span>}
    </div>
  );
}

// ============================================================
// DIVIDER
// Visual separator
// ============================================================

function Divider() {
  return <div className="h-3 w-px bg-lele-border" />;
}
