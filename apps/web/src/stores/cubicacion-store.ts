/**
 * Cubicación Store
 *
 * Manages quantity takeoff (cubicación) state with Zustand
 * Integrates with infrastructure store for automatic generation
 */

import { create } from 'zustand';
import type {
  Cubicacion,
  CubicacionItem,
  CubicacionGeneratorConfig,
} from '@/lib/cubicacion/types';
import { DEFAULT_GENERATOR_CONFIG } from '@/lib/cubicacion/types';
import {
  generateCubicacion,
  recalculateTotals,
  addManualItem,
  updateItem,
  removeItem,
} from '@/lib/cubicacion/generator';
import { useInfrastructureStore } from './infrastructure-store';

interface CubicacionState {
  // Current state
  projectId: string | null;
  cubicaciones: Cubicacion[];
  activeCubicacion: Cubicacion | null;

  // Generation config
  generatorConfig: CubicacionGeneratorConfig;
  region: string;
  terrainType: 1 | 2 | 3;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  error: string | null;
  lastGeneratedAt: string | null;

  // View state
  selectedItemId: string | null;
  filterCategory: string | null;
  showOnlyManualItems: boolean;

  // Actions - Project
  setProjectId: (id: string | null) => void;
  loadCubicaciones: (projectId: string) => Promise<void>;

  // Actions - CRUD
  createCubicacion: (name: string) => Promise<Cubicacion | null>;
  saveCubicacion: () => Promise<void>;
  deleteCubicacion: (id: string) => Promise<void>;
  setActiveCubicacion: (cubicacion: Cubicacion | null) => void;

  // Actions - Generation
  generateFromInfrastructure: () => void;
  regenerate: () => void;
  setGeneratorConfig: (config: Partial<CubicacionGeneratorConfig>) => void;
  setRegion: (region: string) => void;
  setTerrainType: (type: 1 | 2 | 3) => void;

  // Actions - Item Management
  addItem: (item: Omit<CubicacionItem, 'id' | 'totalPrice' | 'isManualOverride' | 'autoCalculated' | 'lastUpdated'>) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  updateItemPrice: (itemId: string, unitPrice: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  deleteItem: (itemId: string) => void;

  // Actions - UI
  setSelectedItem: (itemId: string | null) => void;
  setFilterCategory: (category: string | null) => void;
  setShowOnlyManualItems: (show: boolean) => void;

  // Actions - Status
  updateStatus: (status: Cubicacion['status']) => void;
  approveCubicacion: (approvedBy: string) => void;

  // Actions - Clear
  clearAll: () => void;

  // Computed values (using getters pattern via selectors)
  getFilteredItems: () => CubicacionItem[];
  getItemsByCategory: () => Map<string, CubicacionItem[]>;
  getTotalsByCategory: () => Map<string, number>;
}

export const useCubicacionStore = create<CubicacionState>((set, get) => ({
  // Initial state
  projectId: null,
  cubicaciones: [],
  activeCubicacion: null,
  generatorConfig: DEFAULT_GENERATOR_CONFIG,
  region: 'Metropolitana',
  terrainType: 1,
  isLoading: false,
  isSaving: false,
  isGenerating: false,
  error: null,
  lastGeneratedAt: null,
  selectedItemId: null,
  filterCategory: null,
  showOnlyManualItems: false,

  // Project actions
  setProjectId: (id) => set({ projectId: id }),

  loadCubicaciones: async (projectId) => {
    set({ isLoading: true, error: null, projectId });
    try {
      const res = await fetch(`/api/projects/${projectId}/cubicacion`);
      if (!res.ok) throw new Error('Failed to load cubicaciones');
      const data = await res.json();
      set({
        cubicaciones: data.cubicaciones || [],
        activeCubicacion: data.cubicaciones?.[0] || null,
      });
    } catch (err) {
      set({ error: (err as Error).message, cubicaciones: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  // CRUD actions
  createCubicacion: async (name) => {
    const { projectId, generatorConfig, region, terrainType } = get();
    if (!projectId) return null;

    set({ isSaving: true, error: null });
    try {
      // Get infrastructure entities from infrastructure store
      const infrastructureStore = useInfrastructureStore.getState();
      const entities = infrastructureStore.infrastructureEntities;

      // Generate cubicación from infrastructure
      const cubicacion = generateCubicacion(entities, projectId, {
        name,
        config: generatorConfig,
        region,
        terrainType,
      });

      // Save to database
      const res = await fetch(`/api/projects/${projectId}/cubicacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cubicacion),
      });

      if (!res.ok) throw new Error('Failed to create cubicación');
      const data = await res.json();
      const savedCubicacion = data.cubicacion;

      set((state) => ({
        cubicaciones: [savedCubicacion, ...state.cubicaciones],
        activeCubicacion: savedCubicacion,
        lastGeneratedAt: new Date().toISOString(),
      }));

      return savedCubicacion;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    } finally {
      set({ isSaving: false });
    }
  },

  saveCubicacion: async () => {
    const { projectId, activeCubicacion } = get();
    if (!projectId || !activeCubicacion) return;

    set({ isSaving: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/cubicacion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeCubicacion),
      });

      if (!res.ok) throw new Error('Failed to save cubicación');
      const data = await res.json();

      set((state) => ({
        cubicaciones: state.cubicaciones.map((c) =>
          c.id === data.cubicacion.id ? data.cubicacion : c
        ),
        activeCubicacion: data.cubicacion,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isSaving: false });
    }
  },

  deleteCubicacion: async (id) => {
    const { projectId } = get();
    if (!projectId) return;

    set({ isSaving: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/cubicacion?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete cubicación');

      set((state) => ({
        cubicaciones: state.cubicaciones.filter((c) => c.id !== id),
        activeCubicacion: state.activeCubicacion?.id === id ? null : state.activeCubicacion,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isSaving: false });
    }
  },

  setActiveCubicacion: (cubicacion) => set({ activeCubicacion: cubicacion }),

  // Generation actions
  generateFromInfrastructure: () => {
    const { projectId, activeCubicacion, generatorConfig, region, terrainType } = get();
    if (!projectId || !activeCubicacion) return;

    set({ isGenerating: true });

    // Get infrastructure entities
    const infrastructureStore = useInfrastructureStore.getState();
    const entities = infrastructureStore.infrastructureEntities;

    // Generate new cubicación data
    const generated = generateCubicacion(entities, projectId, {
      name: activeCubicacion.name,
      config: generatorConfig,
      region,
      terrainType,
    });

    // Merge with existing manual items
    const manualItems = activeCubicacion.items.filter((item) => item.isManualOverride);
    const newItems = [...generated.items, ...manualItems];

    const updated = recalculateTotals({
      ...activeCubicacion,
      items: newItems,
      lastAutoGenerated: new Date().toISOString(),
    });

    set({
      activeCubicacion: updated,
      isGenerating: false,
      lastGeneratedAt: new Date().toISOString(),
    });
  },

  regenerate: () => {
    get().generateFromInfrastructure();
  },

  setGeneratorConfig: (config) =>
    set((state) => ({
      generatorConfig: { ...state.generatorConfig, ...config },
    })),

  setRegion: (region) => set({ region }),
  setTerrainType: (type) => set({ terrainType: type }),

  // Item management actions
  addItem: (item) => {
    const { activeCubicacion } = get();
    if (!activeCubicacion) return;

    const updated = addManualItem(activeCubicacion, item);
    set({ activeCubicacion: updated });
  },

  updateItemQuantity: (itemId, quantity) => {
    const { activeCubicacion } = get();
    if (!activeCubicacion) return;

    const updated = updateItem(activeCubicacion, itemId, { quantity });
    set({ activeCubicacion: updated });
  },

  updateItemPrice: (itemId, unitPrice) => {
    const { activeCubicacion } = get();
    if (!activeCubicacion) return;

    const updated = updateItem(activeCubicacion, itemId, { unitPrice });
    set({ activeCubicacion: updated });
  },

  updateItemNotes: (itemId, notes) => {
    const { activeCubicacion } = get();
    if (!activeCubicacion) return;

    const updated = updateItem(activeCubicacion, itemId, { notes });
    set({ activeCubicacion: updated });
  },

  deleteItem: (itemId) => {
    const { activeCubicacion } = get();
    if (!activeCubicacion) return;

    const updated = removeItem(activeCubicacion, itemId);
    set({ activeCubicacion: updated });
  },

  // UI actions
  setSelectedItem: (itemId) => set({ selectedItemId: itemId }),
  setFilterCategory: (category) => set({ filterCategory: category }),
  setShowOnlyManualItems: (show) => set({ showOnlyManualItems: show }),

  // Status actions
  updateStatus: (status) => {
    const { activeCubicacion } = get();
    if (!activeCubicacion) return;

    set({
      activeCubicacion: {
        ...activeCubicacion,
        status,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  approveCubicacion: (approvedBy) => {
    const { activeCubicacion } = get();
    if (!activeCubicacion) return;

    set({
      activeCubicacion: {
        ...activeCubicacion,
        status: 'approved',
        approvedBy,
        approvalDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  // Clear
  clearAll: () =>
    set({
      projectId: null,
      cubicaciones: [],
      activeCubicacion: null,
      isLoading: false,
      isSaving: false,
      isGenerating: false,
      error: null,
      lastGeneratedAt: null,
      selectedItemId: null,
      filterCategory: null,
      showOnlyManualItems: false,
    }),

  // Computed values (selectors)
  getFilteredItems: () => {
    const { activeCubicacion, filterCategory, showOnlyManualItems } = get();
    if (!activeCubicacion) return [];

    let items = activeCubicacion.items;

    if (filterCategory) {
      items = items.filter((item) => item.category === filterCategory);
    }

    if (showOnlyManualItems) {
      items = items.filter((item) => item.isManualOverride);
    }

    return items;
  },

  getItemsByCategory: () => {
    const { activeCubicacion } = get();
    if (!activeCubicacion) return new Map();

    const byCategory = new Map<string, CubicacionItem[]>();
    for (const item of activeCubicacion.items) {
      const existing = byCategory.get(item.category) || [];
      byCategory.set(item.category, [...existing, item]);
    }
    return byCategory;
  },

  getTotalsByCategory: () => {
    const { activeCubicacion } = get();
    if (!activeCubicacion) return new Map();

    const totals = new Map<string, number>();
    for (const item of activeCubicacion.items) {
      const existing = totals.get(item.category) || 0;
      totals.set(item.category, existing + item.totalPrice);
    }
    return totals;
  },
}));

// Selector hooks for optimized re-renders
export const useCubicacionItems = () =>
  useCubicacionStore((state) => state.activeCubicacion?.items ?? []);

export const useCubicacionSubtotals = () =>
  useCubicacionStore((state) => state.activeCubicacion?.subtotals ?? []);

export const useCubicacionGrandTotal = () =>
  useCubicacionStore((state) => state.activeCubicacion?.grandTotal ?? 0);

export const useIsGenerating = () => useCubicacionStore((state) => state.isGenerating);

export const useIsSaving = () => useCubicacionStore((state) => state.isSaving);
