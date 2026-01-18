/**
 * Water Network Store
 * Zustand store for the Water Network Studio
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  WaterNetwork,
  Junction,
  Tank,
  Reservoir,
  Pipe,
  Pump,
  Valve,
  NetworkNode,
  NetworkLink,
} from '@ledesign/hydraulics';
import { createEmptyNetwork, getDefaultNetworkOptions } from '@ledesign/hydraulics';

import type {
  WaterNetworkStore,
  WaterNetworkState,
  DrawingTool,
  MapStyle,
  GeoTransform,
  DemandZone,
  SolverResults,
  AISuggestion,
  ColorScale,
  DrawingState,
} from './types';

// ============================================================================
// Color Scales
// ============================================================================

function createColorScale(min: number, max: number, colors: string[]): ColorScale {
  return {
    min,
    max,
    colors,
    getColor: (value: number) => {
      if (value <= min) return colors[0];
      if (value >= max) return colors[colors.length - 1];
      const ratio = (value - min) / (max - min);
      const index = Math.floor(ratio * (colors.length - 1));
      return colors[Math.min(index, colors.length - 1)];
    },
  };
}

// Pressure: red (low) → yellow → green (good) → blue (high)
const pressureColorScale = createColorScale(0, 70, [
  '#ef4444', // red - too low
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green - optimal
  '#3b82f6', // blue - high
]);

// Velocity: green (low) → yellow → red (high)
const velocityColorScale = createColorScale(0, 3, [
  '#22c55e', // green - low
  '#84cc16', // lime
  '#eab308', // yellow
  '#f97316', // orange
  '#ef4444', // red - high
]);

// ============================================================================
// Initial State
// ============================================================================

const initialState: WaterNetworkState = {
  // Project
  projectId: null,
  projectName: 'Nueva Red de Agua',
  isLoading: false,
  isSaving: false,
  isDirty: false,
  lastSaved: null,

  // Network
  network: createEmptyNetwork('Nueva Red'),

  // Geographic - default to Santiago, Chile
  geoTransform: null,
  map: {
    center: [-33.45, -70.65],
    zoom: 14,
    style: 'streets',
    showLabels: true,
    showGrid: false,
  },

  // Drawing
  drawing: {
    activeTool: 'select',
    isDrawing: false,
    drawingStartNode: null,
    snapEnabled: true,
    snapToNodes: true,
    snapToRoads: false,
    snapTolerance: 5,
    ghostPipe: null,
  },

  // Demand Zones
  demandZones: [],

  // Selection
  selection: {
    selectedNodeIds: new Set(),
    selectedLinkIds: new Set(),
    selectedZoneIds: new Set(),
    hoveredElementId: null,
    hoveredElementType: null,
  },

  // Solver
  solver: null,
  autoSolve: true,

  // AI
  aiSuggestions: [],
  aiEnabled: true,

  // Visualization
  visualization: {
    showPressure: true,
    showVelocity: false,
    showFlowDirection: true,
    showDemandZones: true,
    showLabels: true,
    showElevations: false,
    pressureColorScale,
    velocityColorScale,
    animateFlow: true,
  },

  // Panels
  propertiesPanel: { isOpen: true, width: 320 },
  resultsPanel: { isOpen: false, width: 400 },
  aiPanel: { isOpen: true, width: 300 },
  demandZonePanel: { isOpen: false, width: 350 },
};

// ============================================================================
// Store Creation
// ============================================================================

export const useWaterNetworkStore = create<WaterNetworkStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // ========================================
      // Project Actions
      // ========================================

      setProjectId: (id) => set((state) => { state.projectId = id; }),
      setProjectName: (name) => set((state) => { state.projectName = name; }),
      setLoading: (loading) => set((state) => { state.isLoading = loading; }),
      setSaving: (saving) => set((state) => { state.isSaving = saving; }),
      setDirty: (dirty) => set((state) => { state.isDirty = dirty; }),

      // ========================================
      // Network Actions
      // ========================================

      setNetwork: (network) => set((state) => {
        state.network = network;
        state.isDirty = true;
      }),

      resetNetwork: () => set((state) => {
        state.network = createEmptyNetwork('Nueva Red');
        state.demandZones = [];
        state.solver = null;
        state.aiSuggestions = [];
        state.selection = initialState.selection;
        state.isDirty = false;
      }),

      // ========================================
      // Junction Actions
      // ========================================

      addJunction: (junction) => {
        const id = junction.id || `J-${nanoid(6)}`;
        set((state) => {
          state.network.junctions.push({
            id,
            type: 'junction',
            x: junction.x,
            y: junction.y,
            elevation: junction.elevation,
            baseDemand: junction.baseDemand ?? 0,
            ...junction,
          } as Junction);
          state.isDirty = true;
        });
        return id;
      },

      updateJunction: (id, updates) => set((state) => {
        const idx = state.network.junctions.findIndex((j) => j.id === id);
        if (idx !== -1) {
          Object.assign(state.network.junctions[idx], updates);
          state.isDirty = true;
        }
      }),

      deleteJunction: (id) => set((state) => {
        state.network.junctions = state.network.junctions.filter((j) => j.id !== id);
        // Also delete connected pipes
        state.network.pipes = state.network.pipes.filter(
          (p) => p.startNode !== id && p.endNode !== id
        );
        state.selection.selectedNodeIds.delete(id);
        state.isDirty = true;
      }),

      // ========================================
      // Tank Actions
      // ========================================

      addTank: (tank) => {
        const id = tank.id || `T-${nanoid(6)}`;
        set((state) => {
          state.network.tanks.push({
            id,
            type: 'tank',
            ...tank,
          } as Tank);
          state.isDirty = true;
        });
        return id;
      },

      updateTank: (id, updates) => set((state) => {
        const idx = state.network.tanks.findIndex((t) => t.id === id);
        if (idx !== -1) {
          Object.assign(state.network.tanks[idx], updates);
          state.isDirty = true;
        }
      }),

      deleteTank: (id) => set((state) => {
        state.network.tanks = state.network.tanks.filter((t) => t.id !== id);
        state.network.pipes = state.network.pipes.filter(
          (p) => p.startNode !== id && p.endNode !== id
        );
        state.selection.selectedNodeIds.delete(id);
        state.isDirty = true;
      }),

      // ========================================
      // Reservoir Actions
      // ========================================

      addReservoir: (reservoir) => {
        const id = reservoir.id || `R-${nanoid(6)}`;
        set((state) => {
          state.network.reservoirs.push({
            id,
            type: 'reservoir',
            ...reservoir,
          } as Reservoir);
          state.isDirty = true;
        });
        return id;
      },

      updateReservoir: (id, updates) => set((state) => {
        const idx = state.network.reservoirs.findIndex((r) => r.id === id);
        if (idx !== -1) {
          Object.assign(state.network.reservoirs[idx], updates);
          state.isDirty = true;
        }
      }),

      deleteReservoir: (id) => set((state) => {
        state.network.reservoirs = state.network.reservoirs.filter((r) => r.id !== id);
        state.network.pipes = state.network.pipes.filter(
          (p) => p.startNode !== id && p.endNode !== id
        );
        state.selection.selectedNodeIds.delete(id);
        state.isDirty = true;
      }),

      // ========================================
      // Pipe Actions
      // ========================================

      addPipe: (pipe) => {
        const id = pipe.id || `P-${nanoid(6)}`;
        set((state) => {
          state.network.pipes.push({
            id,
            type: 'pipe',
            status: 'open',
            roughness: 140, // Default Hazen-Williams for PVC
            material: 'pvc',
            ...pipe,
          } as Pipe);
          state.isDirty = true;
        });
        return id;
      },

      updatePipe: (id, updates) => set((state) => {
        const idx = state.network.pipes.findIndex((p) => p.id === id);
        if (idx !== -1) {
          Object.assign(state.network.pipes[idx], updates);
          state.isDirty = true;
        }
      }),

      deletePipe: (id) => set((state) => {
        state.network.pipes = state.network.pipes.filter((p) => p.id !== id);
        state.selection.selectedLinkIds.delete(id);
        state.isDirty = true;
      }),

      // ========================================
      // Pump Actions
      // ========================================

      addPump: (pump) => {
        const id = pump.id || `PU-${nanoid(6)}`;
        set((state) => {
          state.network.pumps.push({
            id,
            type: 'pump',
            status: 'open',
            pumpType: 'power_func',
            speed: 1.0,
            ratedEfficiency: 0.75,
            ...pump,
          } as Pump);
          state.isDirty = true;
        });
        return id;
      },

      updatePump: (id, updates) => set((state) => {
        const idx = state.network.pumps.findIndex((p) => p.id === id);
        if (idx !== -1) {
          Object.assign(state.network.pumps[idx], updates);
          state.isDirty = true;
        }
      }),

      deletePump: (id) => set((state) => {
        state.network.pumps = state.network.pumps.filter((p) => p.id !== id);
        state.selection.selectedLinkIds.delete(id);
        state.isDirty = true;
      }),

      // ========================================
      // Valve Actions
      // ========================================

      addValve: (valve) => {
        const id = valve.id || `V-${nanoid(6)}`;
        set((state) => {
          state.network.valves.push({
            id,
            type: 'valve',
            status: 'open',
            ...valve,
          } as Valve);
          state.isDirty = true;
        });
        return id;
      },

      updateValve: (id, updates) => set((state) => {
        const idx = state.network.valves.findIndex((v) => v.id === id);
        if (idx !== -1) {
          Object.assign(state.network.valves[idx], updates);
          state.isDirty = true;
        }
      }),

      deleteValve: (id) => set((state) => {
        state.network.valves = state.network.valves.filter((v) => v.id !== id);
        state.selection.selectedLinkIds.delete(id);
        state.isDirty = true;
      }),

      // ========================================
      // Delete Selected
      // ========================================

      deleteSelected: () => set((state) => {
        const { selectedNodeIds, selectedLinkIds, selectedZoneIds } = state.selection;

        // Delete selected nodes
        for (const nodeId of selectedNodeIds) {
          state.network.junctions = state.network.junctions.filter((j) => j.id !== nodeId);
          state.network.tanks = state.network.tanks.filter((t) => t.id !== nodeId);
          state.network.reservoirs = state.network.reservoirs.filter((r) => r.id !== nodeId);
          // Delete connected links
          state.network.pipes = state.network.pipes.filter(
            (p) => p.startNode !== nodeId && p.endNode !== nodeId
          );
          state.network.pumps = state.network.pumps.filter(
            (p) => p.startNode !== nodeId && p.endNode !== nodeId
          );
          state.network.valves = state.network.valves.filter(
            (v) => v.startNode !== nodeId && v.endNode !== nodeId
          );
        }

        // Delete selected links
        for (const linkId of selectedLinkIds) {
          state.network.pipes = state.network.pipes.filter((p) => p.id !== linkId);
          state.network.pumps = state.network.pumps.filter((p) => p.id !== linkId);
          state.network.valves = state.network.valves.filter((v) => v.id !== linkId);
        }

        // Delete selected zones
        for (const zoneId of selectedZoneIds) {
          state.demandZones = state.demandZones.filter((z) => z.id !== zoneId);
        }

        // Clear selection
        state.selection.selectedNodeIds.clear();
        state.selection.selectedLinkIds.clear();
        state.selection.selectedZoneIds.clear();
        state.isDirty = true;
      }),

      // ========================================
      // Map Actions
      // ========================================

      setMapCenter: (center) => set((state) => { state.map.center = center; }),
      setMapZoom: (zoom) => set((state) => { state.map.zoom = zoom; }),
      setMapStyle: (style) => set((state) => { state.map.style = style; }),
      setGeoTransform: (transform) => set((state) => { state.geoTransform = transform; }),

      // ========================================
      // Drawing Actions
      // ========================================

      setActiveTool: (tool) => set((state) => {
        state.drawing.activeTool = tool;
        state.drawing.isDrawing = false;
        state.drawing.drawingStartNode = null;
        state.drawing.ghostPipe = null;
      }),

      setIsDrawing: (isDrawing) => set((state) => { state.drawing.isDrawing = isDrawing; }),
      setDrawingStartNode: (nodeId) => set((state) => { state.drawing.drawingStartNode = nodeId; }),
      setSnapEnabled: (enabled) => set((state) => { state.drawing.snapEnabled = enabled; }),
      setSnapToNodes: (enabled) => set((state) => { state.drawing.snapToNodes = enabled; }),
      setSnapToRoads: (enabled) => set((state) => { state.drawing.snapToRoads = enabled; }),
      setGhostPipe: (ghost) => set((state) => { state.drawing.ghostPipe = ghost; }),

      // ========================================
      // Demand Zone Actions
      // ========================================

      addDemandZone: (zone) => {
        const id = `DZ-${nanoid(6)}`;
        set((state) => {
          state.demandZones.push({
            id,
            areaHa: 0,
            estimatedPopulation: 0,
            estimatedDemand: 0,
            assignedJunctions: [],
            ...zone,
          });
          state.isDirty = true;
        });
        return id;
      },

      updateDemandZone: (id, updates) => set((state) => {
        const idx = state.demandZones.findIndex((z) => z.id === id);
        if (idx !== -1) {
          Object.assign(state.demandZones[idx], updates);
          state.isDirty = true;
        }
      }),

      deleteDemandZone: (id) => set((state) => {
        state.demandZones = state.demandZones.filter((z) => z.id !== id);
        state.selection.selectedZoneIds.delete(id);
        state.isDirty = true;
      }),

      distributeDemandFromZones: () => set((state) => {
        // TODO: Implement demand distribution from zones to junctions
        // This will use the NCh691 calculations from @ledesign/hydraulics
        state.isDirty = true;
      }),

      // ========================================
      // Selection Actions
      // ========================================

      selectNode: (id, addToSelection = false) => set((state) => {
        if (!addToSelection) {
          state.selection.selectedNodeIds.clear();
          state.selection.selectedLinkIds.clear();
          state.selection.selectedZoneIds.clear();
        }
        state.selection.selectedNodeIds.add(id);
      }),

      selectLink: (id, addToSelection = false) => set((state) => {
        if (!addToSelection) {
          state.selection.selectedNodeIds.clear();
          state.selection.selectedLinkIds.clear();
          state.selection.selectedZoneIds.clear();
        }
        state.selection.selectedLinkIds.add(id);
      }),

      selectZone: (id, addToSelection = false) => set((state) => {
        if (!addToSelection) {
          state.selection.selectedNodeIds.clear();
          state.selection.selectedLinkIds.clear();
          state.selection.selectedZoneIds.clear();
        }
        state.selection.selectedZoneIds.add(id);
      }),

      clearSelection: () => set((state) => {
        state.selection.selectedNodeIds.clear();
        state.selection.selectedLinkIds.clear();
        state.selection.selectedZoneIds.clear();
      }),

      setHoveredElement: (id, type) => set((state) => {
        state.selection.hoveredElementId = id;
        state.selection.hoveredElementType = type;
      }),

      // ========================================
      // Solver Actions
      // ========================================

      setSolverResults: (results) => set((state) => { state.solver = results; }),
      setAutoSolve: (enabled) => set((state) => { state.autoSolve = enabled; }),

      triggerSolve: () => {
        // This will be handled by a hook that listens to network changes
        // and triggers the web worker
      },

      // ========================================
      // AI Actions
      // ========================================

      setAISuggestions: (suggestions) => set((state) => { state.aiSuggestions = suggestions; }),
      setAIEnabled: (enabled) => set((state) => { state.aiEnabled = enabled; }),

      dismissSuggestion: (id) => set((state) => {
        state.aiSuggestions = state.aiSuggestions.filter((s) => s.id !== id);
      }),

      applyAutoFix: (suggestionId) => {
        // TODO: Implement auto-fix actions based on suggestion type
        const state = get();
        const suggestion = state.aiSuggestions.find((s) => s.id === suggestionId);
        if (suggestion?.autoFixAvailable) {
          // Apply the fix based on suggestion type
          set((s) => {
            s.aiSuggestions = s.aiSuggestions.filter((sug) => sug.id !== suggestionId);
          });
        }
      },

      // ========================================
      // Visualization Actions
      // ========================================

      setShowPressure: (show) => set((state) => { state.visualization.showPressure = show; }),
      setShowVelocity: (show) => set((state) => { state.visualization.showVelocity = show; }),
      setShowFlowDirection: (show) => set((state) => { state.visualization.showFlowDirection = show; }),
      setShowDemandZones: (show) => set((state) => { state.visualization.showDemandZones = show; }),
      setAnimateFlow: (animate) => set((state) => { state.visualization.animateFlow = animate; }),

      // ========================================
      // Panel Actions
      // ========================================

      togglePanel: (panel) => set((state) => {
        const panelKey = `${panel}Panel` as keyof Pick<WaterNetworkState, 'propertiesPanel' | 'resultsPanel' | 'aiPanel' | 'demandZonePanel'>;
        state[panelKey].isOpen = !state[panelKey].isOpen;
      }),

      setPanelOpen: (panel, open) => set((state) => {
        const panelKey = `${panel}Panel` as keyof Pick<WaterNetworkState, 'propertiesPanel' | 'resultsPanel' | 'aiPanel' | 'demandZonePanel'>;
        state[panelKey].isOpen = open;
      }),

      // ========================================
      // Utility Methods
      // ========================================

      getNodeById: (id) => {
        const state = get();
        return (
          state.network.junctions.find((j) => j.id === id) ||
          state.network.tanks.find((t) => t.id === id) ||
          state.network.reservoirs.find((r) => r.id === id)
        );
      },

      getLinkById: (id) => {
        const state = get();
        return (
          state.network.pipes.find((p) => p.id === id) ||
          state.network.pumps.find((p) => p.id === id) ||
          state.network.valves.find((v) => v.id === id)
        );
      },

      getSelectedNodes: () => {
        const state = get();
        const nodes: NetworkNode[] = [];
        for (const id of state.selection.selectedNodeIds) {
          const node = state.getNodeById(id);
          if (node) nodes.push(node);
        }
        return nodes;
      },

      getSelectedLinks: () => {
        const state = get();
        const links: NetworkLink[] = [];
        for (const id of state.selection.selectedLinkIds) {
          const link = state.getLinkById(id);
          if (link) links.push(link);
        }
        return links;
      },
    }))
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useNetwork = () => useWaterNetworkStore((s) => s.network);
export const useJunctions = () => useWaterNetworkStore((s) => s.network.junctions);
export const useTanks = () => useWaterNetworkStore((s) => s.network.tanks);
export const useReservoirs = () => useWaterNetworkStore((s) => s.network.reservoirs);
export const usePipes = () => useWaterNetworkStore((s) => s.network.pipes);
export const usePumps = () => useWaterNetworkStore((s) => s.network.pumps);
export const useValves = () => useWaterNetworkStore((s) => s.network.valves);

export const useMapState = () => useWaterNetworkStore((s) => s.map);
export const useDrawingState = () => useWaterNetworkStore((s) => s.drawing);
export const useActiveTool = () => useWaterNetworkStore((s) => s.drawing.activeTool);
export const useSelectionState = () => useWaterNetworkStore((s) => s.selection);
export const useSolverResults = () => useWaterNetworkStore((s) => s.solver);
export const useVisualization = () => useWaterNetworkStore((s) => s.visualization);
export const useDemandZones = () => useWaterNetworkStore((s) => s.demandZones);
export const useAISuggestions = () => useWaterNetworkStore((s) => s.aiSuggestions);

// Panel selectors
export const usePropertiesPanel = () => useWaterNetworkStore((s) => s.propertiesPanel);
export const useResultsPanel = () => useWaterNetworkStore((s) => s.resultsPanel);
export const useAIPanel = () => useWaterNetworkStore((s) => s.aiPanel);
export const useDemandZonePanel = () => useWaterNetworkStore((s) => s.demandZonePanel);

// Action hooks
export const useNetworkActions = () => useWaterNetworkStore((s) => ({
  addJunction: s.addJunction,
  updateJunction: s.updateJunction,
  deleteJunction: s.deleteJunction,
  addTank: s.addTank,
  updateTank: s.updateTank,
  deleteTank: s.deleteTank,
  addReservoir: s.addReservoir,
  updateReservoir: s.updateReservoir,
  deleteReservoir: s.deleteReservoir,
  addPipe: s.addPipe,
  updatePipe: s.updatePipe,
  deletePipe: s.deletePipe,
  addPump: s.addPump,
  updatePump: s.updatePump,
  deletePump: s.deletePump,
  addValve: s.addValve,
  updateValve: s.updateValve,
  deleteValve: s.deleteValve,
  deleteSelected: s.deleteSelected,
  setNetwork: s.setNetwork,
  resetNetwork: s.resetNetwork,
}));

export const useDrawingActions = () => useWaterNetworkStore((s) => ({
  setActiveTool: s.setActiveTool,
  setIsDrawing: s.setIsDrawing,
  setDrawingStartNode: s.setDrawingStartNode,
  setSnapEnabled: s.setSnapEnabled,
  setGhostPipe: s.setGhostPipe,
}));

export const useSelectionActions = () => useWaterNetworkStore((s) => ({
  selectNode: s.selectNode,
  selectLink: s.selectLink,
  selectZone: s.selectZone,
  clearSelection: s.clearSelection,
  setHoveredElement: s.setHoveredElement,
}));

export const useMapActions = () => useWaterNetworkStore((s) => ({
  setMapCenter: s.setMapCenter,
  setMapZoom: s.setMapZoom,
  setMapStyle: s.setMapStyle,
  setGeoTransform: s.setGeoTransform,
}));

export const useSolverActions = () => useWaterNetworkStore((s) => ({
  setSolverResults: s.setSolverResults,
  setAutoSolve: s.setAutoSolve,
  triggerSolve: s.triggerSolve,
}));

export const useVisualizationActions = () => useWaterNetworkStore((s) => ({
  setShowPressure: s.setShowPressure,
  setShowVelocity: s.setShowVelocity,
  setShowFlowDirection: s.setShowFlowDirection,
  setShowDemandZones: s.setShowDemandZones,
  setAnimateFlow: s.setAnimateFlow,
}));

export const usePanelActions = () => useWaterNetworkStore((s) => ({
  togglePanel: s.togglePanel,
  setPanelOpen: s.setPanelOpen,
}));
