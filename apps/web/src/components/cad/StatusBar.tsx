'use client';

import { memo } from 'react';
import type { Point2D, DrawingTool } from '@/types/cad';

interface StatusBarProps {
  cursorPosition: Point2D;
  zoom: number;
  activeTool: DrawingTool;
  snapEnabled: boolean;
  orthoEnabled: boolean;
  gridEnabled?: boolean;
  activeLayer: string;
  selectedCount: number;
  drawingInfo?: {
    distance?: number;
    angle?: number;
    deltaX?: number;
    deltaY?: number;
  };
}

function StatusBarComponent({
  cursorPosition,
  zoom,
  activeTool,
  snapEnabled,
  orthoEnabled,
  gridEnabled = false,
  activeLayer,
  selectedCount,
  drawingInfo,
}: StatusBarProps) {
  // Format tool name for display
  const toolName = activeTool
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 text-gray-100 text-xs py-1.5 px-3 flex items-center gap-4 font-mono z-50 select-none">
      {/* Active Tool */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">TOOL:</span>
        <span className="font-semibold text-blue-400">{toolName}</span>
      </div>

      {/* Snap Mode */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">SNAP:</span>
        <span className={snapEnabled ? 'text-green-400 font-semibold' : 'text-gray-600'}>
          {snapEnabled ? 'ON' : 'OFF'}
        </span>
        <span className="text-gray-700 text-[10px]">(F3)</span>
      </div>

      {/* Ortho Mode */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">ORTHO:</span>
        <span className={orthoEnabled ? 'text-green-400 font-semibold' : 'text-gray-600'}>
          {orthoEnabled ? 'ON' : 'OFF'}
        </span>
        <span className="text-gray-700 text-[10px]">(F8)</span>
      </div>

      {/* Grid Display */}
      {gridEnabled !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">GRID:</span>
          <span className={gridEnabled ? 'text-green-400 font-semibold' : 'text-gray-600'}>
            {gridEnabled ? 'ON' : 'OFF'}
          </span>
          <span className="text-gray-700 text-[10px]">(G)</span>
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-4 bg-gray-700" />

      {/* Coordinates */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">X:</span>
          <span className="text-cyan-400 tabular-nums">{cursorPosition.x.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Y:</span>
          <span className="text-cyan-400 tabular-nums">{cursorPosition.y.toFixed(2)}</span>
        </div>
      </div>

      {/* Drawing Info (distance, angle) */}
      {drawingInfo && (
        <>
          {drawingInfo.distance !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">DIST:</span>
              <span className="text-yellow-400 tabular-nums font-semibold">
                {drawingInfo.distance.toFixed(2)}
              </span>
            </div>
          )}
          {drawingInfo.angle !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">ANGLE:</span>
              <span className="text-yellow-400 tabular-nums font-semibold">
                {drawingInfo.angle.toFixed(1)}°
              </span>
            </div>
          )}
          {drawingInfo.deltaX !== undefined && drawingInfo.deltaY !== undefined && (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">ΔX:</span>
                <span className="tabular-nums">{drawingInfo.deltaX.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">ΔY:</span>
                <span className="tabular-nums">{drawingInfo.deltaY.toFixed(2)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Divider */}
      <div className="w-px h-4 bg-gray-700" />

      {/* Zoom Level */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">ZOOM:</span>
        <span className="text-purple-400 tabular-nums">{(zoom * 100).toFixed(0)}%</span>
      </div>

      {/* Layer */}
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">LAYER:</span>
        <span className="text-orange-400">{activeLayer}</span>
      </div>

      {/* Selection Count */}
      {selectedCount > 0 && (
        <>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">SELECTED:</span>
            <span className="text-green-400 font-semibold">{selectedCount}</span>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Help Hint */}
      <div className="text-gray-600 text-[10px]">
        Press <span className="text-gray-500">?</span> or <span className="text-gray-500">F1</span> for help
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const StatusBar = memo(StatusBarComponent);
