// ============================================================
// VIEWPORT SLICE
// Manages viewport, camera, and drawing tool state
// ============================================================

import { SliceCreator, ViewportSlice, DrawingTool, ViewMode, CameraState } from './types';

const DEFAULT_CAMERA: CameraState = {
  position: [20, 20, 20],
  target: [0, 0, 0],
  zoom: 1,
};

export const createViewportSlice: SliceCreator<ViewportSlice> = (set) => ({
  // Initial state
  activeTool: 'select' as DrawingTool,
  viewMode: '3d' as ViewMode,
  camera: DEFAULT_CAMERA,
  gridSize: 1,
  snapToGrid: true,
  showGrid: true,
  showAxes: true,
  showLabels: false,
  isDrawing: false,
  drawingStartNodeId: null,

  // Actions
  setActiveTool: (tool: DrawingTool) =>
    set((state) => {
      state.activeTool = tool;
      // Clear drawing state when switching tools
      if (tool !== 'beam' && tool !== 'column' && tool !== 'brace') {
        state.isDrawing = false;
        state.drawingStartNodeId = null;
      }
    }),

  setViewMode: (mode: ViewMode) =>
    set((state) => {
      state.viewMode = mode;
    }),

  setCamera: (camera: Partial<CameraState>) =>
    set((state) => {
      state.camera = { ...state.camera, ...camera };
    }),

  setGridSize: (size: number) =>
    set((state) => {
      state.gridSize = Math.max(0.1, size);
    }),

  setSnapToGrid: (snap: boolean) =>
    set((state) => {
      state.snapToGrid = snap;
    }),

  setShowGrid: (show: boolean) =>
    set((state) => {
      state.showGrid = show;
    }),

  toggleGrid: () =>
    set((state) => {
      state.showGrid = !state.showGrid;
    }),

  setShowAxes: (show: boolean) =>
    set((state) => {
      state.showAxes = show;
    }),

  setShowLabels: (show: boolean) =>
    set((state) => {
      state.showLabels = show;
    }),

  setIsDrawing: (drawing: boolean) =>
    set((state) => {
      state.isDrawing = drawing;
    }),

  setDrawingStartNodeId: (nodeId: string | null) =>
    set((state) => {
      state.drawingStartNodeId = nodeId;
    }),

  resetViewport: () =>
    set((state) => {
      state.camera = DEFAULT_CAMERA;
      state.viewMode = '3d';
      state.activeTool = 'select';
      state.isDrawing = false;
      state.drawingStartNodeId = null;
    }),
});
