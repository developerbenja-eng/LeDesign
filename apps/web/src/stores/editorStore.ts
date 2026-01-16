// ============================================================
// EDITOR STORE
// Combined Zustand store with Immer middleware
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

import {
  EditorStore,
  createProjectSlice,
  createModelSlice,
  createSelectionSlice,
  createViewportSlice,
  createPanelSlice,
  createResultsSlice,
  createHistorySlice,
} from './slices';

// ============================================================
// STORE CREATION
// ============================================================

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector(
    immer((...args) => ({
      ...createProjectSlice(...args),
      ...createModelSlice(...args),
      ...createSelectionSlice(...args),
      ...createViewportSlice(...args),
      ...createPanelSlice(...args),
      ...createResultsSlice(...args),
      ...createHistorySlice(...args),
    }))
  )
);

// ============================================================
// SELECTOR HOOKS (for performance optimization)
// ============================================================

// Project selectors
export const useProject = () => useEditorStore((state) => state.project);
export const useProjectId = () => useEditorStore((state) => state.projectId);
export const useIsLoading = () => useEditorStore((state) => state.isLoading);
export const useIsSaving = () => useEditorStore((state) => state.isSaving);
export const useBuildings = () => useEditorStore((state) => state.buildings);
export const useStories = () => useEditorStore((state) => state.stories);

// Model selectors
export const useNodes = () => useEditorStore((state) => state.nodes);
export const useBeams = () => useEditorStore((state) => state.beams);
export const useColumns = () => useEditorStore((state) => state.columns);
export const useBraces = () => useEditorStore((state) => state.braces);
export const useWalls = () => useEditorStore((state) => state.walls);
export const useSlabs = () => useEditorStore((state) => state.slabs);
export const useMaterials = () => useEditorStore((state) => state.materials);
export const useSections = () => useEditorStore((state) => state.sections);
export const useLoadCases = () => useEditorStore((state) => state.loadCases);
export const useLoadCombinations = () => useEditorStore((state) => state.loadCombinations);

// Selection selectors
export const useSelectedIds = () => useEditorStore((state) => state.selectedIds);
export const useHoveredId = () => useEditorStore((state) => state.hoveredId);
export const useSelectionMode = () => useEditorStore((state) => state.selectionMode);

// Viewport selectors
export const useActiveTool = () => useEditorStore((state) => state.activeTool);
export const useViewMode = () => useEditorStore((state) => state.viewMode);
export const useCamera = () => useEditorStore((state) => state.camera);
export const useGridSize = () => useEditorStore((state) => state.gridSize);
export const useSnapToGrid = () => useEditorStore((state) => state.snapToGrid);
export const useShowGrid = () => useEditorStore((state) => state.showGrid);
export const useIsDrawing = () => useEditorStore((state) => state.isDrawing);
export const useDrawingStartNodeId = () => useEditorStore((state) => state.drawingStartNodeId);

// Panel selectors
export const usePropertiesPanel = () => useEditorStore((state) => state.propertiesPanel);
export const useTreePanel = () => useEditorStore((state) => state.treePanel);
export const useAIChatPanel = () => useEditorStore((state) => state.aiChatPanel);
export const useLibraryPanel = () => useEditorStore((state) => state.libraryPanel);
export const useResultsPanel = () => useEditorStore((state) => state.resultsPanel);
export const useAnalysisPanel = () => useEditorStore((state) => state.analysisPanel);

// Results selectors (Analysis)
export const useAnalysisRuns = () => useEditorStore((state) => state.analysisRuns);
export const useActiveRunId = () => useEditorStore((state) => state.activeRunId);
export const useShowDeformedShape = () => useEditorStore((state) => state.showDeformedShape);
export const useDeformationScale = () => useEditorStore((state) => state.deformationScale);
export const useShowForcesDiagram = () => useEditorStore((state) => state.showForcesDiagram);
export const useDiagramType = () => useEditorStore((state) => state.diagramType);

// Results selectors (Design)
export const useDesignResults = () => useEditorStore((state) => state.designResults);
export const useDesignSummary = () => useEditorStore((state) => state.designSummary);
export const useShowDCRatioColoring = () => useEditorStore((state) => state.showDCRatioColoring);
export const useDCColorMode = () => useEditorStore((state) => state.dcColorMode);
export const useDesignCheckStatus = () => useEditorStore((state) => state.designCheckStatus);
export const useDesignCheckError = () => useEditorStore((state) => state.designCheckError);
export const useDesignResultsFilter = () => useEditorStore((state) => state.designResultsFilter);

// Design result for specific element
export const useDesignResultForElement = (elementId: string) =>
  useEditorStore((state) => state.designResults.get(elementId));

// Filtered design results
export const useFilteredDesignResults = () =>
  useEditorStore((state) => {
    const filter = state.designResultsFilter;
    if (filter === 'all') return Array.from(state.designResults.values());
    return Array.from(state.designResults.values()).filter((result) => {
      if (filter === 'pass') return result.status === 'pass';
      if (filter === 'warning') return result.status === 'warning';
      if (filter === 'fail') return result.status === 'fail';
      return true;
    });
  });

// History selectors
export const useCanUndo = () => useEditorStore((state) => state.undoStack?.length > 0);
export const useCanRedo = () => useEditorStore((state) => state.redoStack?.length > 0);

// ============================================================
// COMPUTED SELECTORS
// ============================================================

// Get selected elements (returns array of actual element objects)
export const useSelectedElements = () =>
  useEditorStore((state) => {
    const elements: unknown[] = [];
    state.selectedIds.forEach((id) => {
      const element = state.getElement(id);
      if (element) elements.push(element);
    });
    return elements;
  });

// Get first selected element (for properties panel)
export const useFirstSelectedElement = () =>
  useEditorStore((state) => {
    const firstId = Array.from(state.selectedIds)[0];
    return firstId ? state.getElement(firstId) : null;
  });

// Get node by ID
export const useNode = (id: string) =>
  useEditorStore((state) => state.nodes.get(id));

// Get beam by ID
export const useBeam = (id: string) =>
  useEditorStore((state) => state.beams.get(id));

// Get column by ID
export const useColumn = (id: string) =>
  useEditorStore((state) => state.columns.get(id));

// Get section by ID
export const useSection = (id: string) =>
  useEditorStore((state) => state.sections.get(id));

// Get material by ID
export const useMaterial = (id: string) =>
  useEditorStore((state) => state.materials.get(id));

// ============================================================
// ACTION HOOKS (for cleaner component code)
// ============================================================

export const useProjectActions = () =>
  useEditorStore((state) => ({
    setProject: state.setProject,
    setBuildings: state.setBuildings,
    setStories: state.setStories,
    setLoading: state.setLoading,
    setSaving: state.setSaving,
    setError: state.setError,
    clearProject: state.clearProject,
  }));

export const useModelActions = () =>
  useEditorStore((state) => ({
    // Nodes
    setNodes: state.setNodes,
    addNode: state.addNode,
    updateNode: state.updateNode,
    deleteNode: state.deleteNode,
    // Beams
    setBeams: state.setBeams,
    addBeam: state.addBeam,
    updateBeam: state.updateBeam,
    deleteBeam: state.deleteBeam,
    // Columns
    setColumns: state.setColumns,
    addColumn: state.addColumn,
    updateColumn: state.updateColumn,
    deleteColumn: state.deleteColumn,
    // Braces
    setBraces: state.setBraces,
    addBrace: state.addBrace,
    updateBrace: state.updateBrace,
    deleteBrace: state.deleteBrace,
    // Materials & Sections
    setMaterials: state.setMaterials,
    setSections: state.setSections,
    // Loads
    setLoadCases: state.setLoadCases,
    setLoadCombinations: state.setLoadCombinations,
    // Clear
    clearModel: state.clearModel,
  }));

export const useSelectionActions = () =>
  useEditorStore((state) => ({
    select: state.select,
    addToSelection: state.addToSelection,
    removeFromSelection: state.removeFromSelection,
    toggleSelection: state.toggleSelection,
    clearSelection: state.clearSelection,
    setHoveredId: state.setHoveredId,
    setSelectionMode: state.setSelectionMode,
  }));

export const useViewportActions = () =>
  useEditorStore((state) => ({
    setActiveTool: state.setActiveTool,
    setViewMode: state.setViewMode,
    setCamera: state.setCamera,
    setGridSize: state.setGridSize,
    setSnapToGrid: state.setSnapToGrid,
    setShowGrid: state.setShowGrid,
    setShowAxes: state.setShowAxes,
    setShowLabels: state.setShowLabels,
    setIsDrawing: state.setIsDrawing,
    setDrawingStartNodeId: state.setDrawingStartNodeId,
    resetViewport: state.resetViewport,
  }));

export const usePanelActions = () =>
  useEditorStore((state) => ({
    togglePanel: state.togglePanel,
    setPanel: state.setPanel,
    setPanelWidth: state.setPanelWidth,
  }));

export const useResultsActions = () =>
  useEditorStore((state) => ({
    // Analysis actions
    setAnalysisRuns: state.setAnalysisRuns,
    addAnalysisRun: state.addAnalysisRun,
    updateAnalysisRun: state.updateAnalysisRun,
    setActiveRun: state.setActiveRun,
    setNodeResults: state.setNodeResults,
    setMemberResults: state.setMemberResults,
    setModalResults: state.setModalResults,
    setActiveCombination: state.setActiveCombination,
    setShowDeformedShape: state.setShowDeformedShape,
    setDeformationScale: state.setDeformationScale,
    setShowForcesDiagram: state.setShowForcesDiagram,
    setDiagramType: state.setDiagramType,
    clearResults: state.clearResults,
    // Design actions
    setDesignResults: state.setDesignResults,
    setDesignSummary: state.setDesignSummary,
    setShowDCRatioColoring: state.setShowDCRatioColoring,
    setDCColorMode: state.setDCColorMode,
    setDesignCheckStatus: state.setDesignCheckStatus,
    setDesignCheckError: state.setDesignCheckError,
    setDesignResultsFilter: state.setDesignResultsFilter,
    clearDesignResults: state.clearDesignResults,
  }));

// Design-specific action hook for components that only need design actions
export const useDesignActions = () =>
  useEditorStore((state) => ({
    setDesignResults: state.setDesignResults,
    setDesignSummary: state.setDesignSummary,
    setShowDCRatioColoring: state.setShowDCRatioColoring,
    setDCColorMode: state.setDCColorMode,
    setDesignCheckStatus: state.setDesignCheckStatus,
    setDesignCheckError: state.setDesignCheckError,
    setDesignResultsFilter: state.setDesignResultsFilter,
    clearDesignResults: state.clearDesignResults,
  }));

export const useHistoryActions = () =>
  useEditorStore((state) => ({
    pushCommand: state.pushCommand,
    undo: state.undo,
    redo: state.redo,
    clearHistory: state.clearHistory,
  }));

// ============================================================
// STORE RE-EXPORT
// ============================================================

export type { EditorStore };
