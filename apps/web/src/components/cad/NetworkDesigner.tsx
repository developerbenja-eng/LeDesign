'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCADStore } from '@/stores/cad-store';
import { useInfrastructureStore } from '@/stores/infrastructure-store';
import type { DrawingTool, Point3D } from '@/types/cad';
import type { InfrastructureCategory } from '@/types/infrastructure-entities';
import {
  createWaterPipe,
  createWaterJunction,
  createSewerPipe,
  createManhole,
  createStormCollector,
  createStormInlet,
} from '@/types/infrastructure-entities';

interface NetworkDesignerProps {
  onClose: () => void;
}

// Drawing state for multi-click tools (pipes, polylines)
interface DrawingState {
  isDrawing: boolean;
  vertices: Point3D[];
  startNodeId?: string; // For auto-connection
}

// Quick settings for common element properties
interface QuickSettings {
  // Water pipe
  waterDiameter: number;
  waterMaterial: 'hdpe' | 'pvc' | 'ductile_iron';
  waterPressure: number;
  // Sewer pipe
  sewerDiameter: number;
  sewerSlope: number;
  sewerMaterial: 'pvc' | 'hdpe' | 'concrete';
  // Storm collector
  stormDiameter: number;
  stormReturnPeriod: number;
  // Common
  autoConnect: boolean;
  snapDistance: number;
}

const DEFAULT_SETTINGS: QuickSettings = {
  waterDiameter: 110,
  waterMaterial: 'hdpe',
  waterPressure: 10,
  sewerDiameter: 200,
  sewerSlope: 0.01,
  sewerMaterial: 'pvc',
  stormDiameter: 400,
  stormReturnPeriod: 10,
  autoConnect: true,
  snapDistance: 2.0,
};

// Tool categories for filtering
const TOOL_CATEGORIES: Record<string, DrawingTool[]> = {
  water: ['water_pipe', 'water_junction', 'water_valve', 'water_tank', 'water_pump', 'hydrant'],
  sewer: ['sewer_pipe', 'manhole', 'house_connection'],
  stormwater: ['storm_collector', 'storm_inlet', 'gutter'],
  road: ['road_segment', 'curb'],
  basic: ['select', 'pan', 'line', 'polyline', 'circle', 'arc', 'point', 'text', 'measure'],
};

// Tool info
interface ToolInfo {
  name: string;
  icon: string;
  description: string;
  clickType: 'single' | 'two-point' | 'multi-point';
}

const TOOL_INFO: Partial<Record<DrawingTool, ToolInfo>> = {
  select: { name: 'Select', icon: '↖', description: 'Select elements', clickType: 'single' },
  pan: { name: 'Pan', icon: '✋', description: 'Pan view', clickType: 'single' },
  water_pipe: { name: 'Water Pipe', icon: '━', description: 'Draw water pipe (click start, then end)', clickType: 'two-point' },
  water_junction: { name: 'Junction', icon: '⊕', description: 'Place water junction', clickType: 'single' },
  water_valve: { name: 'Valve', icon: '⋈', description: 'Place valve on pipe', clickType: 'single' },
  water_tank: { name: 'Tank', icon: '▣', description: 'Place storage tank', clickType: 'single' },
  water_pump: { name: 'Pump', icon: '⬡', description: 'Place pump', clickType: 'single' },
  hydrant: { name: 'Hydrant', icon: '🔴', description: 'Place fire hydrant', clickType: 'single' },
  sewer_pipe: { name: 'Sewer Pipe', icon: '┅', description: 'Draw sewer pipe (click start, then end)', clickType: 'two-point' },
  manhole: { name: 'Manhole', icon: '◉', description: 'Place manhole', clickType: 'single' },
  house_connection: { name: 'House Conn.', icon: '┄', description: 'Draw house connection', clickType: 'two-point' },
  storm_collector: { name: 'Collector', icon: '═', description: 'Draw storm collector', clickType: 'two-point' },
  storm_inlet: { name: 'Inlet', icon: '▦', description: 'Place storm inlet', clickType: 'single' },
  gutter: { name: 'Gutter', icon: '⌒', description: 'Draw gutter', clickType: 'multi-point' },
  road_segment: { name: 'Road', icon: '▬', description: 'Draw road centerline', clickType: 'multi-point' },
  curb: { name: 'Curb', icon: '▐', description: 'Draw curb', clickType: 'multi-point' },
  line: { name: 'Line', icon: '╱', description: 'Draw line', clickType: 'two-point' },
  polyline: { name: 'Polyline', icon: '⟋', description: 'Draw polyline (double-click to end)', clickType: 'multi-point' },
  circle: { name: 'Circle', icon: '○', description: 'Draw circle', clickType: 'two-point' },
  arc: { name: 'Arc', icon: '⌒', description: 'Draw arc', clickType: 'multi-point' },
  point: { name: 'Point', icon: '•', description: 'Place point', clickType: 'single' },
  text: { name: 'Text', icon: 'T', description: 'Place text', clickType: 'single' },
  measure: { name: 'Measure', icon: '📏', description: 'Measure distance', clickType: 'two-point' },
};

export function NetworkDesigner({ onClose }: NetworkDesignerProps) {
  const { activeTool, setActiveTool, selectedIds, deselectAll } = useCADStore();
  const {
    addInfraEntity,
    findNearestNode,
    autoConnectPipe,
    validateNetwork,
    getNetworkStatistics,
    setActiveCategory,
    activeCategory,
    initializeLayers,
  } = useInfrastructureStore();

  const [settings, setSettings] = useState<QuickSettings>(DEFAULT_SETTINGS);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    vertices: [],
  });
  const [selectedToolCategory, setSelectedToolCategory] = useState<string>('water');
  const [showSettings, setShowSettings] = useState(false);

  // Initialize infrastructure layers
  useEffect(() => {
    initializeLayers();
  }, [initializeLayers]);

  // Determine current category from active tool
  useEffect(() => {
    for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
      if (tools.includes(activeTool)) {
        if (category !== 'basic') {
          setActiveCategory(category as InfrastructureCategory);
        }
        break;
      }
    }
  }, [activeTool, setActiveCategory]);

  // Get tool info
  const currentToolInfo = TOOL_INFO[activeTool];

  // Handle point input from canvas (this would be called by the canvas component)
  const handlePointInput = useCallback(
    (point: Point3D) => {
      const toolInfo = TOOL_INFO[activeTool];
      if (!toolInfo) return;

      if (toolInfo.clickType === 'single') {
        // Single click tools - create element immediately
        createElementAtPoint(point);
      } else if (toolInfo.clickType === 'two-point') {
        if (!drawingState.isDrawing) {
          // First click - start drawing
          let startNodeId: string | undefined;
          if (settings.autoConnect) {
            const category = getCategoryForTool(activeTool);
            if (category) {
              startNodeId = findNearestNode(point, category, settings.snapDistance) || undefined;
            }
          }
          setDrawingState({
            isDrawing: true,
            vertices: [point],
            startNodeId,
          });
        } else {
          // Second click - finish drawing
          finishTwoPointElement(point);
        }
      } else if (toolInfo.clickType === 'multi-point') {
        // Multi-point tools - add vertex
        setDrawingState((prev) => ({
          ...prev,
          isDrawing: true,
          vertices: [...prev.vertices, point],
        }));
      }
    },
    [activeTool, drawingState, settings, findNearestNode]
  );

  // Create single-click element
  const createElementAtPoint = (point: Point3D) => {
    switch (activeTool) {
      case 'water_junction':
        addInfraEntity(createWaterJunction(point, {}));
        break;
      case 'manhole':
        addInfraEntity(createManhole(point, { rimElevation: point.z + 2 }));
        break;
      case 'storm_inlet':
        addInfraEntity(createStormInlet(point, {}));
        break;
      // Add more single-click tools as needed
    }
  };

  // Finish two-point element
  const finishTwoPointElement = (endPoint: Point3D) => {
    const startPoint = drawingState.vertices[0];
    if (!startPoint) return;

    const vertices = [startPoint, endPoint];

    switch (activeTool) {
      case 'water_pipe': {
        const pipe = createWaterPipe(vertices, {
          diameter: settings.waterDiameter,
          material: settings.waterMaterial,
          nominalPressure: settings.waterPressure,
        });
        addInfraEntity(pipe);
        if (settings.autoConnect) {
          autoConnectPipe(pipe.id);
        }
        break;
      }
      case 'sewer_pipe': {
        const pipe = createSewerPipe(vertices, {
          diameter: settings.sewerDiameter,
          slope: settings.sewerSlope,
          material: settings.sewerMaterial,
        });
        addInfraEntity(pipe);
        if (settings.autoConnect) {
          autoConnectPipe(pipe.id);
        }
        break;
      }
      case 'storm_collector': {
        const collector = createStormCollector(vertices, {
          diameter: settings.stormDiameter,
          returnPeriod: settings.stormReturnPeriod,
        });
        addInfraEntity(collector);
        if (settings.autoConnect) {
          autoConnectPipe(collector.id);
        }
        break;
      }
    }

    // Reset drawing state
    setDrawingState({ isDrawing: false, vertices: [] });
  };

  // Finish multi-point element (called on double-click or Escape)
  const finishMultiPointElement = useCallback(() => {
    if (drawingState.vertices.length < 2) {
      setDrawingState({ isDrawing: false, vertices: [] });
      return;
    }

    // Create element based on tool type
    // ... implementation for multi-point tools

    setDrawingState({ isDrawing: false, vertices: [] });
  }, [drawingState]);

  // Cancel current drawing
  const cancelDrawing = useCallback(() => {
    setDrawingState({ isDrawing: false, vertices: [] });
  }, []);

  // Get category for tool
  const getCategoryForTool = (tool: DrawingTool): InfrastructureCategory | null => {
    if (TOOL_CATEGORIES.water.includes(tool)) return 'water';
    if (TOOL_CATEGORIES.sewer.includes(tool)) return 'sewer';
    if (TOOL_CATEGORIES.stormwater.includes(tool)) return 'stormwater';
    if (TOOL_CATEGORIES.road.includes(tool)) return 'road';
    return null;
  };

  // Run validation
  const handleValidate = () => {
    const messages = validateNetwork(activeCategory || undefined);
    const errors = messages.filter((m) => m.type === 'error').length;
    const warnings = messages.filter((m) => m.type === 'warning').length;
    alert(`Validation complete:\n${errors} errors, ${warnings} warnings`);
  };

  // Get statistics
  const stats = getNetworkStatistics();

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ width: '280px', maxHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="bg-gray-700 px-3 py-2 flex justify-between items-center shrink-0">
        <h3 className="text-white font-semibold text-sm">Network Designer</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
          ×
        </button>
      </div>

      {/* Tool Category Tabs */}
      <div className="flex border-b border-gray-700 shrink-0">
        {Object.keys(TOOL_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedToolCategory(category)}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              selectedToolCategory === category
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Tool Grid */}
      <div className="p-2 border-b border-gray-700 shrink-0">
        <div className="grid grid-cols-4 gap-1">
          {TOOL_CATEGORIES[selectedToolCategory]?.map((tool) => {
            const info = TOOL_INFO[tool];
            if (!info) return null;
            const isActive = activeTool === tool;

            return (
              <button
                key={tool}
                onClick={() => {
                  setActiveTool(tool);
                  cancelDrawing();
                }}
                title={`${info.name}\n${info.description}`}
                className={`flex flex-col items-center justify-center p-1.5 rounded transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="text-lg leading-none">{info.icon}</span>
                <span className="text-[10px] mt-0.5 leading-tight truncate w-full text-center">
                  {info.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tool Info */}
      {currentToolInfo && (
        <div className="px-3 py-2 bg-gray-700/30 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentToolInfo.icon}</span>
            <div>
              <div className="text-white text-sm font-medium">{currentToolInfo.name}</div>
              <div className="text-gray-400 text-xs">{currentToolInfo.description}</div>
            </div>
          </div>
          {drawingState.isDrawing && (
            <div className="mt-2 text-xs text-blue-400">
              Drawing... {drawingState.vertices.length} point(s)
              <button
                onClick={cancelDrawing}
                className="ml-2 text-red-400 hover:text-red-300"
              >
                [Cancel]
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="px-3 py-1.5 text-left text-xs text-gray-400 hover:text-white border-b border-gray-700 flex items-center justify-between"
      >
        <span>Quick Settings</span>
        <span>{showSettings ? '▲' : '▼'}</span>
      </button>

      {/* Quick Settings Panel */}
      {showSettings && (
        <div className="p-3 border-b border-gray-700 space-y-3 overflow-y-auto">
          {/* Water Settings */}
          {selectedToolCategory === 'water' && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Diameter</span>
                <select
                  value={settings.waterDiameter}
                  onChange={(e) => setSettings({ ...settings, waterDiameter: Number(e.target.value) })}
                  className="bg-gray-700 text-white text-xs rounded px-2 py-1"
                >
                  {[50, 63, 75, 90, 110, 160, 200, 250, 315, 400].map((d) => (
                    <option key={d} value={d}>{d} mm</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Material</span>
                <select
                  value={settings.waterMaterial}
                  onChange={(e) => setSettings({ ...settings, waterMaterial: e.target.value as QuickSettings['waterMaterial'] })}
                  className="bg-gray-700 text-white text-xs rounded px-2 py-1"
                >
                  <option value="hdpe">HDPE</option>
                  <option value="pvc">PVC</option>
                  <option value="ductile_iron">Ductile Iron</option>
                </select>
              </div>
            </>
          )}

          {/* Sewer Settings */}
          {selectedToolCategory === 'sewer' && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Diameter</span>
                <select
                  value={settings.sewerDiameter}
                  onChange={(e) => setSettings({ ...settings, sewerDiameter: Number(e.target.value) })}
                  className="bg-gray-700 text-white text-xs rounded px-2 py-1"
                >
                  {[160, 200, 250, 315, 400, 500, 600, 800].map((d) => (
                    <option key={d} value={d}>{d} mm</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Slope</span>
                <select
                  value={settings.sewerSlope * 100}
                  onChange={(e) => setSettings({ ...settings, sewerSlope: Number(e.target.value) / 100 })}
                  className="bg-gray-700 text-white text-xs rounded px-2 py-1"
                >
                  {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0].map((s) => (
                    <option key={s} value={s}>{s}%</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Storm Settings */}
          {selectedToolCategory === 'stormwater' && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Diameter</span>
                <select
                  value={settings.stormDiameter}
                  onChange={(e) => setSettings({ ...settings, stormDiameter: Number(e.target.value) })}
                  className="bg-gray-700 text-white text-xs rounded px-2 py-1"
                >
                  {[300, 400, 500, 600, 800, 1000, 1200, 1500].map((d) => (
                    <option key={d} value={d}>{d} mm</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Return Period</span>
                <select
                  value={settings.stormReturnPeriod}
                  onChange={(e) => setSettings({ ...settings, stormReturnPeriod: Number(e.target.value) })}
                  className="bg-gray-700 text-white text-xs rounded px-2 py-1"
                >
                  {[2, 5, 10, 25, 50, 100].map((t) => (
                    <option key={t} value={t}>{t} years</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Common Settings */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-700">
            <span className="text-gray-400 text-xs">Auto-connect</span>
            <input
              type="checkbox"
              checked={settings.autoConnect}
              onChange={(e) => setSettings({ ...settings, autoConnect: e.target.checked })}
              className="w-4 h-4 rounded"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Snap Distance</span>
            <select
              value={settings.snapDistance}
              onChange={(e) => setSettings({ ...settings, snapDistance: Number(e.target.value) })}
              className="bg-gray-700 text-white text-xs rounded px-2 py-1"
            >
              {[0.5, 1.0, 2.0, 5.0].map((d) => (
                <option key={d} value={d}>{d} m</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Network Statistics */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-xs text-gray-400 mb-2">Network Statistics</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Nodes</span>
            <span className="text-white">{stats.totalNodes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Links</span>
            <span className="text-white">{stats.totalLinks}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Length</span>
            <span className="text-white">{stats.totalLength.toFixed(1)} m</span>
          </div>
          {stats.isolatedNodes > 0 && (
            <div className="flex justify-between text-yellow-400">
              <span>Isolated Nodes</span>
              <span>{stats.isolatedNodes}</span>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">By Category</div>
          {(['water', 'sewer', 'stormwater'] as const).map((cat) => {
            const catStats = stats.byCategory[cat];
            if (catStats.nodes === 0 && catStats.links === 0) return null;
            return (
              <div key={cat} className="mb-2">
                <div className="text-xs text-gray-300 font-medium capitalize">{cat}</div>
                <div className="text-xs text-gray-500 pl-2">
                  {catStats.nodes} nodes, {catStats.links} links ({catStats.length.toFixed(0)} m)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 p-2 border-t border-gray-700 flex gap-2">
        <button
          onClick={handleValidate}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium py-1.5 rounded transition-colors"
        >
          Validate
        </button>
        <button
          onClick={() => deselectAll()}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium py-1.5 rounded transition-colors"
        >
          Deselect
        </button>
      </div>
    </div>
  );
}

// Export handle point input for use by canvas
export type { DrawingState };
