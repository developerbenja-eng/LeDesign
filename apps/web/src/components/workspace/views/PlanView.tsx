'use client';

// ============================================================
// PLAN VIEW
// 2D plan view (top-down) using existing DrawingCanvas2D
// ============================================================

import { useState, useCallback } from 'react';
import type { ViewInstance } from '@/stores/workspace-store';
import DrawingCanvas2D from '@/components/cad/DrawingCanvas2D';
import { StatusBar } from '@/components/cad/StatusBar';
import { ToolOptionsPanel } from '@/components/cad/ToolOptionsPanel';
import { KeyboardShortcutsHelp } from '@/components/cad/KeyboardShortcutsHelp';
import { useCADStore } from '@/stores/cad-store';
import type { Point2D } from '@/types/cad';

interface PlanViewProps {
  view: ViewInstance;
}

export function PlanView({ view }: PlanViewProps) {
  const viewMode = useCADStore((state) => state.viewMode);
  const activeTool = useCADStore((state) => state.activeTool);
  const snapEnabled = useCADStore((state) => state.snapEnabled);
  const orthoEnabled = useCADStore((state) => state.orthoEnabled);
  const gridEnabled = useCADStore((state) => state.gridEnabled);
  const viewState = useCADStore((state) => state.viewState);
  const activeLayer = useCADStore((state) => state.activeLayer);
  const selectedIds = useCADStore((state) => state.selectedIds);

  // Track cursor position and drawing info from canvas
  const [cursorPosition, setCursorPosition] = useState<Point2D>({ x: 0, y: 0 });
  const [drawingInfo, setDrawingInfo] = useState<{
    distance?: number;
    angle?: number;
    deltaX?: number;
    deltaY?: number;
  } | undefined>();

  // Tool options panel collapse state
  const [toolOptionsCollapsed, setToolOptionsCollapsed] = useState(false);

  const handleCursorUpdate = useCallback((pos: Point2D) => {
    setCursorPosition(pos);
  }, []);

  const handleDrawingInfoUpdate = useCallback((info: typeof drawingInfo) => {
    setDrawingInfo(info);
  }, []);

  return (
    <div className="h-full relative">
      {viewMode === 'reference' || viewMode === 'analysis' ? (
        // Show GeoCanvas for map-based views
        <div className="h-full pb-7">
          <DrawingCanvas2D
            onCursorUpdate={handleCursorUpdate}
            onDrawingInfoUpdate={handleDrawingInfoUpdate}
          />
        </div>
      ) : (
        // Show regular 2D canvas
        <div className="h-full pb-7">
          <DrawingCanvas2D
            onCursorUpdate={handleCursorUpdate}
            onDrawingInfoUpdate={handleDrawingInfoUpdate}
          />
        </div>
      )}

      {/* Tool Options Panel */}
      <ToolOptionsPanel
        activeTool={activeTool}
        isCollapsed={toolOptionsCollapsed}
        onToggleCollapse={() => setToolOptionsCollapsed(!toolOptionsCollapsed)}
      />

      {/* Status Bar */}
      <StatusBar
        cursorPosition={cursorPosition}
        zoom={viewState.zoom}
        activeTool={activeTool}
        snapEnabled={snapEnabled}
        orthoEnabled={orthoEnabled}
        gridEnabled={gridEnabled}
        activeLayer={activeLayer}
        selectedCount={selectedIds.size}
        drawingInfo={drawingInfo}
      />

      {/* Keyboard Shortcuts Help (F1 or ?) */}
      <KeyboardShortcutsHelp />
    </div>
  );
}
