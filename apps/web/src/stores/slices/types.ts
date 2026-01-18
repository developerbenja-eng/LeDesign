// ============================================================
// STORE SLICE TYPES
// Shared types and interfaces for the editor store
// ============================================================

import { StateCreator } from 'zustand';
import {
  StructuralNode,
  Beam,
  Column,
  Brace,
  Wall,
  Slab,
  Material,
  Section,
  LoadCase,
  LoadCombination,
  PointLoad,
  MemberLoad,
  AnalysisRun,
  NodeResult,
  MemberResult,
  ModalResult,
  DesignResult,
} from '@ledesign/structural';
import { StructuralProject, Building, Story } from '@ledesign/structural/project';

// ============================================================
// ELEMENT TYPE HELPERS
// ============================================================

export type ElementType = 'node' | 'beam' | 'column' | 'brace' | 'wall' | 'slab';

export function getElementType(id: string): ElementType | null {
  if (id.startsWith('nd_')) return 'node';
  if (id.startsWith('bm_')) return 'beam';
  if (id.startsWith('col_')) return 'column';
  if (id.startsWith('br_')) return 'brace';
  if (id.startsWith('wl_')) return 'wall';
  if (id.startsWith('sl_')) return 'slab';
  return null;
}

// ============================================================
// TOOL TYPES
// ============================================================

export type SelectionMode = 'single' | 'multi' | 'box';

export type DrawingTool =
  | 'select'
  | 'pan'
  | 'orbit'
  | 'node'
  | 'beam'
  | 'column'
  | 'brace'
  | 'wall'
  | 'slab';

export type ViewMode = '3d' | 'plan' | 'elevation-x' | 'elevation-y';

// ============================================================
// VIEWPORT STATE
// ============================================================

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

// ============================================================
// PANEL STATE
// ============================================================

export interface PanelState {
  isOpen: boolean;
  width?: number;
  height?: number;
}

// ============================================================
// COMMAND TYPES
// ============================================================

export interface CommandEntry {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  payload: unknown;
  undoData?: unknown;
}

// ============================================================
// DESIGN RESULTS TYPES
// ============================================================

export type DesignCheckStatus = 'idle' | 'running' | 'completed' | 'error';
export type DCColorMode = 'gradient' | 'threshold';

export interface DesignSummary {
  totalElements: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  passRate: number;
  maxDCRatio: number;
  avgDCRatio: number;
  governingElement: string | null;
  governingCheck: string | null;
}

// ============================================================
// ALL SLICE INTERFACES
// ============================================================

export interface ProjectSlice {
  // State
  projectId: string | null;
  project: StructuralProject | null;
  buildings: Map<string, Building>;
  stories: Map<string, Story>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  setProjectId: (projectId: string) => void;
  setProject: (project: StructuralProject) => void;
  setBuildings: (buildings: Building[]) => void;
  setStories: (stories: Story[]) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  clearProject: () => void;
}

export interface ModelSlice {
  // State
  nodes: Map<string, StructuralNode>;
  beams: Map<string, Beam>;
  columns: Map<string, Column>;
  braces: Map<string, Brace>;
  walls: Map<string, Wall>;
  slabs: Map<string, Slab>;
  materials: Map<string, Material>;
  sections: Map<string, Section>;
  loadCases: Map<string, LoadCase>;
  loadCombinations: Map<string, LoadCombination>;
  pointLoads: Map<string, PointLoad>;
  memberLoads: Map<string, MemberLoad>;

  // Node actions
  setNodes: (nodes: StructuralNode[]) => void;
  addNode: (node: StructuralNode) => void;
  updateNode: (id: string, updates: Partial<StructuralNode>) => void;
  deleteNode: (id: string) => void;

  // Beam actions
  setBeams: (beams: Beam[]) => void;
  addBeam: (beam: Beam) => void;
  updateBeam: (id: string, updates: Partial<Beam>) => void;
  deleteBeam: (id: string) => void;

  // Column actions
  setColumns: (columns: Column[]) => void;
  addColumn: (column: Column) => void;
  updateColumn: (id: string, updates: Partial<Column>) => void;
  deleteColumn: (id: string) => void;

  // Brace actions
  setBraces: (braces: Brace[]) => void;
  addBrace: (brace: Brace) => void;
  updateBrace: (id: string, updates: Partial<Brace>) => void;
  deleteBrace: (id: string) => void;

  // Wall actions
  setWalls: (walls: Wall[]) => void;
  addWall: (wall: Wall) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;

  // Slab actions
  setSlabs: (slabs: Slab[]) => void;
  addSlab: (slab: Slab) => void;
  updateSlab: (id: string, updates: Partial<Slab>) => void;
  deleteSlab: (id: string) => void;

  // Material actions
  setMaterials: (materials: Material[]) => void;
  addMaterial: (material: Material) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;

  // Section actions
  setSections: (sections: Section[]) => void;
  addSection: (section: Section) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;

  // Load case actions
  setLoadCases: (loadCases: LoadCase[]) => void;
  addLoadCase: (loadCase: LoadCase) => void;
  updateLoadCase: (id: string, updates: Partial<LoadCase>) => void;
  deleteLoadCase: (id: string) => void;

  // Load combination actions
  setLoadCombinations: (combinations: LoadCombination[]) => void;
  addLoadCombination: (combination: LoadCombination) => void;
  updateLoadCombination: (id: string, updates: Partial<LoadCombination>) => void;
  deleteLoadCombination: (id: string) => void;

  // Point load actions
  setPointLoads: (loads: PointLoad[]) => void;
  addPointLoad: (load: PointLoad) => void;
  deletePointLoad: (id: string) => void;

  // Member load actions
  setMemberLoads: (loads: MemberLoad[]) => void;
  addMemberLoad: (load: MemberLoad) => void;
  deleteMemberLoad: (id: string) => void;

  // Bulk clear
  clearModel: () => void;

  // Get element by ID (any type)
  getElement: (id: string) => StructuralNode | Beam | Column | Brace | Wall | Slab | null;
}

export interface SelectionSlice {
  // State
  selectedIds: Set<string>;
  hoveredId: string | null;
  selectionMode: SelectionMode;

  // Actions
  select: (ids: string[]) => void;
  addToSelection: (ids: string[]) => void;
  removeFromSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  setHoveredId: (id: string | null) => void;
  setSelectionMode: (mode: SelectionMode) => void;
}

export interface ViewportSlice {
  // State
  activeTool: DrawingTool;
  viewMode: ViewMode;
  camera: CameraState;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  showAxes: boolean;
  showLabels: boolean;

  // Drawing state
  isDrawing: boolean;
  drawingStartNodeId: string | null;

  // Actions
  setActiveTool: (tool: DrawingTool) => void;
  setViewMode: (mode: ViewMode) => void;
  setCamera: (camera: Partial<CameraState>) => void;
  setGridSize: (size: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  setShowGrid: (show: boolean) => void;
  toggleGrid: () => void;
  setShowAxes: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setIsDrawing: (drawing: boolean) => void;
  setDrawingStartNodeId: (nodeId: string | null) => void;
  resetViewport: () => void;
}

export interface PanelSlice {
  // State
  propertiesPanel: PanelState;
  treePanel: PanelState;
  aiChatPanel: PanelState;
  libraryPanel: PanelState;
  resultsPanel: PanelState;
  analysisPanel: PanelState;
  normativaPanel: PanelState;

  // Actions
  togglePanel: (panel: keyof Omit<PanelSlice, 'togglePanel' | 'setPanel' | 'setPanelWidth'>) => void;
  setPanel: (panel: keyof Omit<PanelSlice, 'togglePanel' | 'setPanel' | 'setPanelWidth'>, state: Partial<PanelState>) => void;
  setPanelWidth: (panel: keyof Omit<PanelSlice, 'togglePanel' | 'setPanel' | 'setPanelWidth'>, width: number) => void;
}

export interface ResultsSlice {
  // Analysis State
  analysisRuns: Map<string, AnalysisRun>;
  activeRunId: string | null;
  nodeResults: Map<string, NodeResult[]>;
  memberResults: Map<string, MemberResult[]>;
  modalResults: Map<string, ModalResult[]>;
  activeCombinationId: string | null;
  showDeformedShape: boolean;
  deformationScale: number;
  showForcesDiagram: boolean;
  diagramType: 'moment' | 'shear' | 'axial';

  // Design State
  designResults: Map<string, DesignResult>;
  designSummary: DesignSummary | null;
  showDCRatioColoring: boolean;
  dcColorMode: DCColorMode;
  designCheckStatus: DesignCheckStatus;
  designCheckError: string | null;
  designResultsFilter: 'all' | 'pass' | 'warning' | 'fail';

  // Analysis Actions
  setAnalysisRuns: (runs: AnalysisRun[]) => void;
  addAnalysisRun: (run: AnalysisRun) => void;
  updateAnalysisRun: (id: string, updates: Partial<AnalysisRun>) => void;
  setActiveRun: (runId: string | null) => void;
  setNodeResults: (runId: string, results: NodeResult[]) => void;
  setMemberResults: (runId: string, results: MemberResult[]) => void;
  setModalResults: (runId: string, results: ModalResult[]) => void;
  setActiveCombination: (combinationId: string | null) => void;
  setShowDeformedShape: (show: boolean) => void;
  setDeformationScale: (scale: number) => void;
  setShowForcesDiagram: (show: boolean) => void;
  setDiagramType: (type: 'moment' | 'shear' | 'axial') => void;
  clearResults: () => void;

  // Design Actions
  setDesignResults: (results: DesignResult[]) => void;
  setDesignSummary: (summary: DesignSummary | null) => void;
  setShowDCRatioColoring: (show: boolean) => void;
  setDCColorMode: (mode: DCColorMode) => void;
  setDesignCheckStatus: (status: DesignCheckStatus) => void;
  setDesignCheckError: (error: string | null) => void;
  setDesignResultsFilter: (filter: 'all' | 'pass' | 'warning' | 'fail') => void;
  clearDesignResults: () => void;
  getDesignResultForElement: (elementId: string) => DesignResult | undefined;
}

export interface HistorySlice {
  // State
  undoStack: CommandEntry[];
  redoStack: CommandEntry[];
  maxHistorySize: number;

  // Actions
  pushCommand: (command: CommandEntry) => void;
  undo: () => CommandEntry | null;
  redo: () => CommandEntry | null;
  clearHistory: () => void;
}

// ============================================================
// COMBINED STORE TYPE
// ============================================================

export interface EditorStore extends
  ProjectSlice,
  ModelSlice,
  SelectionSlice,
  ViewportSlice,
  PanelSlice,
  ResultsSlice,
  HistorySlice {}

// ============================================================
// SLICE CREATOR TYPE
// ============================================================

export type SliceCreator<T> = StateCreator<
  EditorStore,
  [['zustand/immer', never]],
  [],
  T
>;
