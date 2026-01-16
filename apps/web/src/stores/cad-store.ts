import { create } from 'zustand';
import type {
  AnyCADEntity,
  CADLayer,
  DrawingTool,
  ViewState,
  TINSurface,
  GeoTransform,
  GeoControlPoint,
  ViewMode,
  MapStyle,
  StandardDetailPlacement,
  Point3D,
} from '@/types/cad';

interface CADState {
  // Entities
  entities: Map<string, AnyCADEntity>;
  addEntity: (entity: AnyCADEntity) => void;
  removeEntity: (id: string) => void;
  updateEntity: (id: string, updates: Partial<AnyCADEntity>) => void;
  clearEntities: () => void;

  // Layers
  layers: Map<string, CADLayer>;
  activeLayer: string;
  addLayer: (layer: CADLayer) => void;
  setActiveLayer: (name: string) => void;
  toggleLayerVisibility: (name: string) => void;

  // Selection
  selectedIds: Set<string>;
  selectEntity: (id: string) => void;
  deselectEntity: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // View state
  viewState: ViewState;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggle3D: () => void;
  resetView: () => void;

  // Tool
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;

  // Surfaces (for 3D view)
  surfaces: TINSurface[];
  addSurface: (surface: TINSurface) => void;
  removeSurface: (id: string) => void;

  // History (for undo/redo)
  history: AnyCADEntity[][];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Georeferencing
  geoTransform: GeoTransform | null;
  setGeoTransform: (transform: GeoTransform | null) => void;
  addControlPoint: (point: GeoControlPoint) => void;
  removeControlPoint: (id: string) => void;
  clearControlPoints: () => void;

  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Background map
  mapStyle: MapStyle;
  setMapStyle: (style: MapStyle) => void;

  // Standard detail placement
  placementDetail: StandardDetailPlacement | null;
  setPlacementDetail: (detail: StandardDetailPlacement | null) => void;
  insertDetailAtPosition: (position: Point3D) => void;
  cancelPlacement: () => void;
}

const defaultLayer: CADLayer = {
  name: '0',
  color: '#ffffff',
  visible: true,
  locked: false,
};

const defaultViewState: ViewState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  is3D: false,
};

export const useCADStore = create<CADState>((set, get) => ({
  // Entities
  entities: new Map(),
  addEntity: (entity) =>
    set((state) => {
      const newEntities = new Map(state.entities);
      newEntities.set(entity.id, entity);
      return { entities: newEntities };
    }),
  removeEntity: (id) =>
    set((state) => {
      const newEntities = new Map(state.entities);
      newEntities.delete(id);
      return { entities: newEntities };
    }),
  updateEntity: (id, updates) =>
    set((state) => {
      const newEntities = new Map(state.entities);
      const entity = newEntities.get(id);
      if (entity) {
        newEntities.set(id, { ...entity, ...updates } as AnyCADEntity);
      }
      return { entities: newEntities };
    }),
  clearEntities: () => set({ entities: new Map() }),

  // Layers
  layers: new Map([['0', defaultLayer]]),
  activeLayer: '0',
  addLayer: (layer) =>
    set((state) => {
      const newLayers = new Map(state.layers);
      newLayers.set(layer.name, layer);
      return { layers: newLayers };
    }),
  setActiveLayer: (name) => set({ activeLayer: name }),
  toggleLayerVisibility: (name) =>
    set((state) => {
      const newLayers = new Map(state.layers);
      const layer = newLayers.get(name);
      if (layer) {
        newLayers.set(name, { ...layer, visible: !layer.visible });
      }
      return { layers: newLayers };
    }),

  // Selection
  selectedIds: new Set(),
  selectEntity: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      newSelected.add(id);
      return { selectedIds: newSelected };
    }),
  deselectEntity: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      newSelected.delete(id);
      return { selectedIds: newSelected };
    }),
  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(state.entities.keys()),
    })),
  deselectAll: () => set({ selectedIds: new Set() }),

  // View state
  viewState: defaultViewState,
  setZoom: (zoom) =>
    set((state) => ({
      viewState: { ...state.viewState, zoom: Math.max(0.1, Math.min(10, zoom)) },
    })),
  setPan: (x, y) =>
    set((state) => ({
      viewState: { ...state.viewState, panX: x, panY: y },
    })),
  toggle3D: () =>
    set((state) => ({
      viewState: { ...state.viewState, is3D: !state.viewState.is3D },
    })),
  resetView: () => set({ viewState: defaultViewState }),

  // Tool
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Surfaces
  surfaces: [],
  addSurface: (surface) =>
    set((state) => ({
      surfaces: [...state.surfaces, surface],
    })),
  removeSurface: (id) =>
    set((state) => ({
      surfaces: state.surfaces.filter((s) => s.id !== id),
    })),

  // History
  history: [],
  historyIndex: -1,
  pushHistory: () =>
    set((state) => {
      const currentEntities = Array.from(state.entities.values());
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(currentEntities);
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),
  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const entities = new Map<string, AnyCADEntity>();
      state.history[newIndex].forEach((e) => entities.set(e.id, e));
      return { entities, historyIndex: newIndex };
    }),
  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const entities = new Map<string, AnyCADEntity>();
      state.history[newIndex].forEach((e) => entities.set(e.id, e));
      return { entities, historyIndex: newIndex };
    }),

  // Georeferencing
  geoTransform: null,
  setGeoTransform: (transform) => set({ geoTransform: transform }),
  addControlPoint: (point) =>
    set((state) => {
      const currentTransform = state.geoTransform || {
        controlPoints: [],
        scale: 1,
        rotation: 0,
        origin: { lat: 0, lng: 0 },
        cadOrigin: { x: 0, y: 0 },
        isValid: false,
      };
      return {
        geoTransform: {
          ...currentTransform,
          controlPoints: [...currentTransform.controlPoints, point],
        },
      };
    }),
  removeControlPoint: (id) =>
    set((state) => {
      if (!state.geoTransform) return state;
      return {
        geoTransform: {
          ...state.geoTransform,
          controlPoints: state.geoTransform.controlPoints.filter((p) => p.id !== id),
        },
      };
    }),
  clearControlPoints: () =>
    set((state) => {
      if (!state.geoTransform) return state;
      return {
        geoTransform: {
          ...state.geoTransform,
          controlPoints: [],
          isValid: false,
        },
      };
    }),

  // View mode
  viewMode: 'design',
  setViewMode: (mode) => set({ viewMode: mode }),

  // Background map
  mapStyle: 'satellite',
  setMapStyle: (style) => set({ mapStyle: style }),

  // Standard detail placement
  placementDetail: null,
  setPlacementDetail: (detail) =>
    set({
      placementDetail: detail,
      activeTool: detail ? 'standard_detail' : 'select',
    }),
  insertDetailAtPosition: (position) => {
    const state = get();
    const detail = state.placementDetail;
    if (!detail || detail.entities.length === 0) return;

    // Calculate offset from detail's bounds center to insertion point
    const centerX = (detail.bounds.minX + detail.bounds.maxX) / 2;
    const centerY = (detail.bounds.minY + detail.bounds.maxY) / 2;
    const offsetX = position.x - centerX;
    const offsetY = position.y - centerY;

    const newEntities = new Map(state.entities);

    // Add each entity from the detail with offset applied
    for (const entity of detail.entities) {
      const newId = `${entity.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Clone and offset entity based on its type
      let newEntity: AnyCADEntity;

      if ('position' in entity && entity.position) {
        newEntity = {
          ...entity,
          id: newId,
          position: {
            x: entity.position.x + offsetX,
            y: entity.position.y + offsetY,
            z: entity.position.z,
          },
        } as AnyCADEntity;
      } else if ('center' in entity && entity.center) {
        newEntity = {
          ...entity,
          id: newId,
          center: {
            x: entity.center.x + offsetX,
            y: entity.center.y + offsetY,
            z: entity.center.z,
          },
        } as AnyCADEntity;
      } else if ('start' in entity && 'end' in entity && entity.start && entity.end) {
        newEntity = {
          ...entity,
          id: newId,
          start: {
            x: entity.start.x + offsetX,
            y: entity.start.y + offsetY,
            z: entity.start.z,
          },
          end: {
            x: entity.end.x + offsetX,
            y: entity.end.y + offsetY,
            z: entity.end.z,
          },
        } as AnyCADEntity;
      } else if ('vertices' in entity && entity.vertices) {
        newEntity = {
          ...entity,
          id: newId,
          vertices: entity.vertices.map((v: Point3D) => ({
            x: v.x + offsetX,
            y: v.y + offsetY,
            z: v.z,
          })),
        } as AnyCADEntity;
      } else if ('defPoint1' in entity && 'defPoint2' in entity) {
        // Dimension entity
        const dimEntity = entity as AnyCADEntity & {
          defPoint1: Point3D;
          defPoint2: Point3D;
          dimLinePoint: Point3D;
          textPosition: Point3D;
        };
        newEntity = {
          ...dimEntity,
          id: newId,
          defPoint1: {
            x: dimEntity.defPoint1.x + offsetX,
            y: dimEntity.defPoint1.y + offsetY,
            z: dimEntity.defPoint1.z,
          },
          defPoint2: {
            x: dimEntity.defPoint2.x + offsetX,
            y: dimEntity.defPoint2.y + offsetY,
            z: dimEntity.defPoint2.z,
          },
          dimLinePoint: {
            x: dimEntity.dimLinePoint.x + offsetX,
            y: dimEntity.dimLinePoint.y + offsetY,
            z: dimEntity.dimLinePoint.z,
          },
          textPosition: {
            x: dimEntity.textPosition.x + offsetX,
            y: dimEntity.textPosition.y + offsetY,
            z: dimEntity.textPosition.z,
          },
        } as AnyCADEntity;
      } else {
        newEntity = { ...entity, id: newId };
      }

      newEntities.set(newId, newEntity);
    }

    set({
      entities: newEntities,
      placementDetail: null,
      activeTool: 'select',
    });
  },
  cancelPlacement: () =>
    set({
      placementDetail: null,
      activeTool: 'select',
    }),
}));
