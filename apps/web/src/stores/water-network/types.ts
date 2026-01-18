/**
 * Water Network Studio Types
 * Type definitions for the modern water network design interface
 */

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

// ============================================================================
// Drawing Tools
// ============================================================================

export type DrawingTool =
  | 'select'
  | 'pan'
  | 'junction'
  | 'pipe'
  | 'tank'
  | 'reservoir'
  | 'pump'
  | 'valve'
  | 'demandZone'
  | 'profilePath'
  | 'delete';

// ============================================================================
// Map State
// ============================================================================

export type MapStyle = 'streets' | 'satellite' | 'terrain' | 'dark';

export interface MapState {
  center: [number, number]; // [lat, lng]
  zoom: number;
  style: MapStyle;
  showLabels: boolean;
  showGrid: boolean;
}

// ============================================================================
// Geo Transform (for CAD ↔ Geographic coordinates)
// ============================================================================

export interface GeoTransform {
  origin: { lat: number; lng: number };
  scale: number; // meters per unit
  rotation: number; // radians
  isValid: boolean;
}

// ============================================================================
// Demand Zones
// ============================================================================

export type LandUseCategory =
  | 'residential_low'
  | 'residential_medium'
  | 'residential_high'
  | 'commercial'
  | 'industrial_light'
  | 'industrial_heavy'
  | 'institutional'
  | 'rural'
  | 'mixed_use';

export type ClimateZone = 'norte' | 'centro' | 'sur' | 'austral';

export interface DemandZone {
  id: string;
  name: string;
  polygon: Array<{ lat: number; lng: number }>;
  landUse: LandUseCategory;
  climateZone: ClimateZone;
  populationOverride?: number;
  demandOverride?: number; // L/s
  // Computed
  areaHa: number;
  estimatedPopulation: number;
  estimatedDemand: number;
  assignedJunctions: string[];
  // Styling
  color: string;
  opacity: number;
}

// ============================================================================
// Solver Results
// ============================================================================

export type SolverStatus = 'idle' | 'running' | 'converged' | 'failed' | 'warning';

export interface NodeResult {
  id: string;
  head: number; // m
  pressure: number; // m
  demand: number; // L/s
  quality?: number;
}

export interface LinkResult {
  id: string;
  flow: number; // L/s
  velocity: number; // m/s
  headLoss: number; // m
  status: 'open' | 'closed' | 'active';
}

export interface SolverResults {
  status: SolverStatus;
  converged: boolean;
  iterations: number;
  maxHeadError: number;
  maxFlowError: number;
  totalDemand: number;
  totalSupply: number;
  nodeResults: Map<string, NodeResult>;
  linkResults: Map<string, LinkResult>;
  solveTime: number; // ms
  warnings: string[];
  errors: string[];
}

// ============================================================================
// AI Suggestions
// ============================================================================

export type SuggestionType = 'diameter' | 'pressure' | 'velocity' | 'layout' | 'compliance' | 'demand';
export type SuggestionSeverity = 'info' | 'warning' | 'error';

export interface AISuggestion {
  id: string;
  type: SuggestionType;
  severity: SuggestionSeverity;
  elementId?: string;
  message: string;
  recommendation: string;
  autoFixAvailable: boolean;
}

// ============================================================================
// Visualization Settings
// ============================================================================

export interface ColorScale {
  min: number;
  max: number;
  colors: string[];
  getColor: (value: number) => string;
}

export interface VisualizationSettings {
  showPressure: boolean;
  showVelocity: boolean;
  showFlowDirection: boolean;
  showDemandZones: boolean;
  showLabels: boolean;
  showElevations: boolean;
  pressureColorScale: ColorScale;
  velocityColorScale: ColorScale;
  animateFlow: boolean;
}

// ============================================================================
// Panel State
// ============================================================================

export interface PanelState {
  isOpen: boolean;
  width: number;
}

// ============================================================================
// Selection State
// ============================================================================

export interface SelectionState {
  selectedNodeIds: Set<string>;
  selectedLinkIds: Set<string>;
  selectedZoneIds: Set<string>;
  hoveredElementId: string | null;
  hoveredElementType: 'node' | 'link' | 'zone' | null;
}

// ============================================================================
// Drawing State
// ============================================================================

export interface DrawingState {
  activeTool: DrawingTool;
  isDrawing: boolean;
  drawingStartNode: string | null;
  snapEnabled: boolean;
  snapToNodes: boolean;
  snapToRoads: boolean;
  snapTolerance: number; // meters
  ghostPipe: {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
  } | null;
}

// ============================================================================
// Complete Store State
// ============================================================================

export interface WaterNetworkState {
  // Project
  projectId: string | null;
  projectName: string;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;

  // Network Data
  network: WaterNetwork;

  // Geographic
  geoTransform: GeoTransform | null;
  map: MapState;

  // Drawing
  drawing: DrawingState;

  // Demand Zones
  demandZones: DemandZone[];

  // Selection
  selection: SelectionState;

  // Solver
  solver: SolverResults | null;
  autoSolve: boolean;

  // AI
  aiSuggestions: AISuggestion[];
  aiEnabled: boolean;

  // Visualization
  visualization: VisualizationSettings;

  // Panels
  propertiesPanel: PanelState;
  resultsPanel: PanelState;
  aiPanel: PanelState;
  demandZonePanel: PanelState;
}

// ============================================================================
// Store Actions
// ============================================================================

export interface WaterNetworkActions {
  // Project
  setProjectId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setDirty: (dirty: boolean) => void;

  // Network
  setNetwork: (network: WaterNetwork) => void;
  resetNetwork: () => void;

  // Nodes
  addJunction: (junction: Omit<Junction, 'id' | 'type'> & { id?: string }) => string;
  updateJunction: (id: string, updates: Partial<Junction>) => void;
  deleteJunction: (id: string) => void;
  addTank: (tank: Omit<Tank, 'id' | 'type'> & { id?: string }) => string;
  updateTank: (id: string, updates: Partial<Tank>) => void;
  deleteTank: (id: string) => void;
  addReservoir: (reservoir: Omit<Reservoir, 'id' | 'type'> & { id?: string }) => string;
  updateReservoir: (id: string, updates: Partial<Reservoir>) => void;
  deleteReservoir: (id: string) => void;

  // Links
  addPipe: (pipe: Omit<Pipe, 'id' | 'type'> & { id?: string }) => string;
  updatePipe: (id: string, updates: Partial<Pipe>) => void;
  deletePipe: (id: string) => void;
  addPump: (pump: Omit<Pump, 'id' | 'type'> & { id?: string }) => string;
  updatePump: (id: string, updates: Partial<Pump>) => void;
  deletePump: (id: string) => void;
  addValve: (valve: Omit<Valve, 'id' | 'type'> & { id?: string }) => string;
  updateValve: (id: string, updates: Partial<Valve>) => void;
  deleteValve: (id: string) => void;

  // Delete selected
  deleteSelected: () => void;

  // Map
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  setMapStyle: (style: MapStyle) => void;
  setGeoTransform: (transform: GeoTransform | null) => void;

  // Drawing
  setActiveTool: (tool: DrawingTool) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setDrawingStartNode: (nodeId: string | null) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapToNodes: (enabled: boolean) => void;
  setSnapToRoads: (enabled: boolean) => void;
  setGhostPipe: (ghost: DrawingState['ghostPipe']) => void;

  // Demand Zones
  addDemandZone: (zone: Omit<DemandZone, 'id' | 'areaHa' | 'estimatedPopulation' | 'estimatedDemand' | 'assignedJunctions'>) => string;
  updateDemandZone: (id: string, updates: Partial<DemandZone>) => void;
  deleteDemandZone: (id: string) => void;
  distributeDemandFromZones: () => void;

  // Selection
  selectNode: (id: string, addToSelection?: boolean) => void;
  selectLink: (id: string, addToSelection?: boolean) => void;
  selectZone: (id: string, addToSelection?: boolean) => void;
  clearSelection: () => void;
  setHoveredElement: (id: string | null, type: 'node' | 'link' | 'zone' | null) => void;

  // Solver
  setSolverResults: (results: SolverResults | null) => void;
  setAutoSolve: (enabled: boolean) => void;
  triggerSolve: () => void;

  // AI
  setAISuggestions: (suggestions: AISuggestion[]) => void;
  setAIEnabled: (enabled: boolean) => void;
  dismissSuggestion: (id: string) => void;
  applyAutoFix: (suggestionId: string) => void;

  // Visualization
  setShowPressure: (show: boolean) => void;
  setShowVelocity: (show: boolean) => void;
  setShowFlowDirection: (show: boolean) => void;
  setShowDemandZones: (show: boolean) => void;
  setAnimateFlow: (animate: boolean) => void;

  // Panels
  togglePanel: (panel: 'properties' | 'results' | 'ai' | 'demandZone') => void;
  setPanelOpen: (panel: 'properties' | 'results' | 'ai' | 'demandZone', open: boolean) => void;

  // Utility
  getNodeById: (id: string) => NetworkNode | undefined;
  getLinkById: (id: string) => NetworkLink | undefined;
  getSelectedNodes: () => NetworkNode[];
  getSelectedLinks: () => NetworkLink[];
}

export type WaterNetworkStore = WaterNetworkState & WaterNetworkActions;
