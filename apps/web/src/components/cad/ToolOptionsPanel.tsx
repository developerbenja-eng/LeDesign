'use client';

import { useState } from 'react';
import { useCADStore } from '@/stores/cad-store';
import type { DrawingTool } from '@/types/cad';

interface ToolOptionsPanelProps {
  activeTool: DrawingTool;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ToolOptionsPanel({
  activeTool,
  isCollapsed = false,
  onToggleCollapse,
}: ToolOptionsPanelProps) {
  // Tool-specific parameter state (will be moved to store later)
  const [offsetDistance, setOffsetDistance] = useState(10);
  const [filletRadius, setFilletRadius] = useState(10);
  const [arrayRows, setArrayRows] = useState(3);
  const [arrayCols, setArrayCols] = useState(3);
  const [arrayRowSpacing, setArrayRowSpacing] = useState(10);
  const [arrayColSpacing, setArrayColSpacing] = useState(10);
  const [circleRadius, setCircleRadius] = useState(10);

  // Get grid settings from store
  const gridSpacing = useCADStore((state) => state.gridSpacing);
  const setGridSpacing = useCADStore((state) => state.setGridSpacing);

  // Don't show panel for tools without options
  const toolsWithoutOptions = [
    'select',
    'pan',
    'zoom',
    'point',
    'line',
    'polyline',
    'arc',
    'text',
    'measure',
    'trim',
    'extend',
    'copy',
    'move',
    'rotate',
    'dimension',
    'water_junction',
    'manhole',
    'storm_inlet',
  ];

  if (toolsWithoutOptions.includes(activeTool)) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="absolute right-4 top-4 z-40">
        <button
          onClick={onToggleCollapse}
          className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-md shadow-lg border border-gray-700"
          title="Show Tool Options"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-4 z-40 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 w-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-100 uppercase tracking-wide">
          Tool Options
        </h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-gray-400 hover:text-gray-200 p-1"
            title="Collapse Panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Offset Tool Options */}
      {activeTool === 'offset' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Distance
            </label>
            <input
              type="number"
              value={offsetDistance}
              onChange={(e) => setOffsetDistance(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 20, 50].map((value) => (
                <button
                  key={value}
                  onClick={() => setOffsetDistance(value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    offsetDistance === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
            Click on a side of the entity to offset
          </div>
        </div>
      )}

      {/* Fillet Tool Options */}
      {activeTool === 'fillet' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Radius
            </label>
            <input
              type="number"
              value={filletRadius}
              onChange={(e) => setFilletRadius(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 5, 10, 15, 20].map((value) => (
                <button
                  key={value}
                  onClick={() => setFilletRadius(value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filletRadius === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
            Click two lines to create fillet arc
          </div>
        </div>
      )}

      {/* Circle Tool Options */}
      {activeTool === 'circle' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Radius
            </label>
            <input
              type="number"
              value={circleRadius}
              onChange={(e) => setCircleRadius(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 20, 50].map((value) => (
                <button
                  key={value}
                  onClick={() => setCircleRadius(value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    circleRadius === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
            Click center, then drag to set radius
          </div>
        </div>
      )}

      {/* Array Tool Options */}
      {activeTool === 'array' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-300 mb-2">
            Rectangular Array
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rows</label>
              <input
                type="number"
                value={arrayRows}
                onChange={(e) => setArrayRows(parseInt(e.target.value) || 1)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Columns</label>
              <input
                type="number"
                value={arrayCols}
                onChange={(e) => setArrayCols(parseInt(e.target.value) || 1)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Row Spacing</label>
              <input
                type="number"
                value={arrayRowSpacing}
                onChange={(e) => setArrayRowSpacing(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Col Spacing</label>
              <input
                type="number"
                value={arrayColSpacing}
                onChange={(e) => setArrayColSpacing(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                step="0.1"
              />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
            Select entities, then click to array
          </div>
        </div>
      )}

      {/* Hatch Tool Options */}
      {activeTool === 'hatch' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Pattern
            </label>
            <select className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ansi31">ANSI31 (45° lines)</option>
              <option value="ansi32">ANSI32 (Brick)</option>
              <option value="ansi37">ANSI37 (Concrete)</option>
              <option value="solid">Solid Fill</option>
              <option value="grass">Grass</option>
              <option value="gravel">Gravel</option>
              <option value="water">Water</option>
              <option value="earth">Earth (Cut/Fill)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Angle</label>
              <input
                type="number"
                defaultValue={45}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                step="15"
                min="0"
                max="360"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Scale</label>
              <input
                type="number"
                defaultValue={1.0}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                step="0.1"
                min="0.1"
              />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
            Select closed boundary entities first
          </div>
        </div>
      )}

      {/* Grid Settings (always visible at bottom) */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
          Grid Settings
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Spacing</label>
          <input
            type="number"
            value={gridSpacing}
            onChange={(e) => setGridSpacing(parseFloat(e.target.value) || 10)}
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            step="5"
            min="1"
          />
          <div className="mt-1 text-xs text-gray-600">
            Press <kbd className="px-1 py-0.5 bg-gray-800 rounded">Shift+G</kbd> to toggle
          </div>
        </div>
      </div>
    </div>
  );
}
