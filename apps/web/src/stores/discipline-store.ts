import { create } from 'zustand';
import type {
  WaterNetworkDesign,
  SewerDesign,
  StormwaterDesign,
  ChannelDesign,
  WaterNode,
  WaterPipe,
  SewerManhole,
  SewerPipe,
  StormwaterCatchment,
  ChannelSection,
} from '@/types/disciplines';

type DisciplineType = 'water-network' | 'sewer' | 'stormwater' | 'channel';

interface DisciplineState {
  // Current project ID
  projectId: string | null;
  setProjectId: (id: string | null) => void;

  // Water Network
  waterNetworkDesigns: WaterNetworkDesign[];
  activeWaterNetworkDesign: WaterNetworkDesign | null;
  setActiveWaterNetworkDesign: (design: WaterNetworkDesign | null) => void;

  // Sewer
  sewerDesigns: SewerDesign[];
  activeSewerDesign: SewerDesign | null;
  setActiveSewerDesign: (design: SewerDesign | null) => void;

  // Stormwater
  stormwaterDesigns: StormwaterDesign[];
  activeStormwaterDesign: StormwaterDesign | null;
  setActiveStormwaterDesign: (design: StormwaterDesign | null) => void;

  // Channel
  channelDesigns: ChannelDesign[];
  activeChannelDesign: ChannelDesign | null;
  setActiveChannelDesign: (design: ChannelDesign | null) => void;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // API Operations
  loadDesigns: (projectId: string, type: DisciplineType) => Promise<void>;
  loadAllDesigns: (projectId: string) => Promise<void>;
  createDesign: (type: DisciplineType, data: Record<string, unknown>) => Promise<void>;
  updateDesign: (type: DisciplineType, id: string, data: Record<string, unknown>) => Promise<void>;
  deleteDesign: (type: DisciplineType, id: string) => Promise<void>;

  // Local modifications (before save)
  addWaterNode: (node: WaterNode) => void;
  updateWaterNode: (id: string, updates: Partial<WaterNode>) => void;
  removeWaterNode: (id: string) => void;
  addWaterPipe: (pipe: WaterPipe) => void;
  updateWaterPipe: (id: string, updates: Partial<WaterPipe>) => void;
  removeWaterPipe: (id: string) => void;

  addSewerManhole: (manhole: SewerManhole) => void;
  updateSewerManhole: (id: string, updates: Partial<SewerManhole>) => void;
  removeSewerManhole: (id: string) => void;
  addSewerPipe: (pipe: SewerPipe) => void;
  updateSewerPipe: (id: string, updates: Partial<SewerPipe>) => void;
  removeSewerPipe: (id: string) => void;

  addStormwaterCatchment: (catchment: StormwaterCatchment) => void;
  updateStormwaterCatchment: (id: string, updates: Partial<StormwaterCatchment>) => void;
  removeStormwaterCatchment: (id: string) => void;

  addChannelSection: (section: ChannelSection) => void;
  updateChannelSection: (id: string, updates: Partial<ChannelSection>) => void;
  removeChannelSection: (id: string) => void;

  // Save current active design
  saveActiveDesign: (type: DisciplineType) => Promise<void>;

  // Clear all
  clearAll: () => void;
}

export const useDisciplineStore = create<DisciplineState>((set, get) => ({
  // State
  projectId: null,
  waterNetworkDesigns: [],
  activeWaterNetworkDesign: null,
  sewerDesigns: [],
  activeSewerDesign: null,
  stormwaterDesigns: [],
  activeStormwaterDesign: null,
  channelDesigns: [],
  activeChannelDesign: null,
  isLoading: false,
  isSaving: false,
  error: null,

  setProjectId: (id) => set({ projectId: id }),

  setActiveWaterNetworkDesign: (design) => set({ activeWaterNetworkDesign: design }),
  setActiveSewerDesign: (design) => set({ activeSewerDesign: design }),
  setActiveStormwaterDesign: (design) => set({ activeStormwaterDesign: design }),
  setActiveChannelDesign: (design) => set({ activeChannelDesign: design }),

  // Load designs from API
  loadDesigns: async (projectId, type) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/disciplines/${type}`);
      if (!res.ok) throw new Error('Failed to load designs');
      const data = await res.json();

      switch (type) {
        case 'water-network':
          set({ waterNetworkDesigns: data.designs });
          if (data.designs.length > 0 && !get().activeWaterNetworkDesign) {
            set({ activeWaterNetworkDesign: data.designs[0] });
          }
          break;
        case 'sewer':
          set({ sewerDesigns: data.designs });
          if (data.designs.length > 0 && !get().activeSewerDesign) {
            set({ activeSewerDesign: data.designs[0] });
          }
          break;
        case 'stormwater':
          set({ stormwaterDesigns: data.designs });
          if (data.designs.length > 0 && !get().activeStormwaterDesign) {
            set({ activeStormwaterDesign: data.designs[0] });
          }
          break;
        case 'channel':
          set({ channelDesigns: data.designs });
          if (data.designs.length > 0 && !get().activeChannelDesign) {
            set({ activeChannelDesign: data.designs[0] });
          }
          break;
      }
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  loadAllDesigns: async (projectId) => {
    set({ isLoading: true, error: null, projectId });
    try {
      await Promise.all([
        get().loadDesigns(projectId, 'water-network'),
        get().loadDesigns(projectId, 'sewer'),
        get().loadDesigns(projectId, 'stormwater'),
        get().loadDesigns(projectId, 'channel'),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },

  createDesign: async (type, data) => {
    const { projectId } = get();
    if (!projectId) return;

    set({ isSaving: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/disciplines/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create design');
      const result = await res.json();

      switch (type) {
        case 'water-network':
          set((state) => ({
            waterNetworkDesigns: [result.design, ...state.waterNetworkDesigns],
            activeWaterNetworkDesign: result.design,
          }));
          break;
        case 'sewer':
          set((state) => ({
            sewerDesigns: [result.design, ...state.sewerDesigns],
            activeSewerDesign: result.design,
          }));
          break;
        case 'stormwater':
          set((state) => ({
            stormwaterDesigns: [result.design, ...state.stormwaterDesigns],
            activeStormwaterDesign: result.design,
          }));
          break;
        case 'channel':
          set((state) => ({
            channelDesigns: [result.design, ...state.channelDesigns],
            activeChannelDesign: result.design,
          }));
          break;
      }
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isSaving: false });
    }
  },

  updateDesign: async (type, id, data) => {
    const { projectId } = get();
    if (!projectId) return;

    set({ isSaving: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/disciplines/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      if (!res.ok) throw new Error('Failed to update design');
      const result = await res.json();

      switch (type) {
        case 'water-network':
          set((state) => ({
            waterNetworkDesigns: state.waterNetworkDesigns.map((d) =>
              d.id === id ? result.design : d
            ),
            activeWaterNetworkDesign:
              state.activeWaterNetworkDesign?.id === id
                ? result.design
                : state.activeWaterNetworkDesign,
          }));
          break;
        case 'sewer':
          set((state) => ({
            sewerDesigns: state.sewerDesigns.map((d) =>
              d.id === id ? result.design : d
            ),
            activeSewerDesign:
              state.activeSewerDesign?.id === id ? result.design : state.activeSewerDesign,
          }));
          break;
        case 'stormwater':
          set((state) => ({
            stormwaterDesigns: state.stormwaterDesigns.map((d) =>
              d.id === id ? result.design : d
            ),
            activeStormwaterDesign:
              state.activeStormwaterDesign?.id === id
                ? result.design
                : state.activeStormwaterDesign,
          }));
          break;
        case 'channel':
          set((state) => ({
            channelDesigns: state.channelDesigns.map((d) =>
              d.id === id ? result.design : d
            ),
            activeChannelDesign:
              state.activeChannelDesign?.id === id ? result.design : state.activeChannelDesign,
          }));
          break;
      }
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isSaving: false });
    }
  },

  deleteDesign: async (type, id) => {
    const { projectId } = get();
    if (!projectId) return;

    set({ isSaving: true, error: null });
    try {
      const res = await fetch(
        `/api/projects/${projectId}/disciplines/${type}?designId=${id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete design');

      switch (type) {
        case 'water-network':
          set((state) => ({
            waterNetworkDesigns: state.waterNetworkDesigns.filter((d) => d.id !== id),
            activeWaterNetworkDesign:
              state.activeWaterNetworkDesign?.id === id ? null : state.activeWaterNetworkDesign,
          }));
          break;
        case 'sewer':
          set((state) => ({
            sewerDesigns: state.sewerDesigns.filter((d) => d.id !== id),
            activeSewerDesign:
              state.activeSewerDesign?.id === id ? null : state.activeSewerDesign,
          }));
          break;
        case 'stormwater':
          set((state) => ({
            stormwaterDesigns: state.stormwaterDesigns.filter((d) => d.id !== id),
            activeStormwaterDesign:
              state.activeStormwaterDesign?.id === id ? null : state.activeStormwaterDesign,
          }));
          break;
        case 'channel':
          set((state) => ({
            channelDesigns: state.channelDesigns.filter((d) => d.id !== id),
            activeChannelDesign:
              state.activeChannelDesign?.id === id ? null : state.activeChannelDesign,
          }));
          break;
      }
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isSaving: false });
    }
  },

  // Water Network local modifications
  addWaterNode: (node) => {
    const design = get().activeWaterNetworkDesign;
    if (!design) return;
    set({
      activeWaterNetworkDesign: {
        ...design,
        nodes: [...design.nodes, node],
      },
    });
  },

  updateWaterNode: (id, updates) => {
    const design = get().activeWaterNetworkDesign;
    if (!design) return;
    set({
      activeWaterNetworkDesign: {
        ...design,
        nodes: design.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      },
    });
  },

  removeWaterNode: (id) => {
    const design = get().activeWaterNetworkDesign;
    if (!design) return;
    set({
      activeWaterNetworkDesign: {
        ...design,
        nodes: design.nodes.filter((n) => n.id !== id),
        // Also remove pipes connected to this node
        pipes: design.pipes.filter((p) => p.startNodeId !== id && p.endNodeId !== id),
      },
    });
  },

  addWaterPipe: (pipe) => {
    const design = get().activeWaterNetworkDesign;
    if (!design) return;
    set({
      activeWaterNetworkDesign: {
        ...design,
        pipes: [...design.pipes, pipe],
      },
    });
  },

  updateWaterPipe: (id, updates) => {
    const design = get().activeWaterNetworkDesign;
    if (!design) return;
    set({
      activeWaterNetworkDesign: {
        ...design,
        pipes: design.pipes.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      },
    });
  },

  removeWaterPipe: (id) => {
    const design = get().activeWaterNetworkDesign;
    if (!design) return;
    set({
      activeWaterNetworkDesign: {
        ...design,
        pipes: design.pipes.filter((p) => p.id !== id),
      },
    });
  },

  // Sewer local modifications
  addSewerManhole: (manhole) => {
    const design = get().activeSewerDesign;
    if (!design) return;
    set({
      activeSewerDesign: {
        ...design,
        manholes: [...design.manholes, manhole],
      },
    });
  },

  updateSewerManhole: (id, updates) => {
    const design = get().activeSewerDesign;
    if (!design) return;
    set({
      activeSewerDesign: {
        ...design,
        manholes: design.manholes.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      },
    });
  },

  removeSewerManhole: (id) => {
    const design = get().activeSewerDesign;
    if (!design) return;
    set({
      activeSewerDesign: {
        ...design,
        manholes: design.manholes.filter((m) => m.id !== id),
        pipes: design.pipes.filter(
          (p) => p.upstreamManholeId !== id && p.downstreamManholeId !== id
        ),
      },
    });
  },

  addSewerPipe: (pipe) => {
    const design = get().activeSewerDesign;
    if (!design) return;
    set({
      activeSewerDesign: {
        ...design,
        pipes: [...design.pipes, pipe],
      },
    });
  },

  updateSewerPipe: (id, updates) => {
    const design = get().activeSewerDesign;
    if (!design) return;
    set({
      activeSewerDesign: {
        ...design,
        pipes: design.pipes.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      },
    });
  },

  removeSewerPipe: (id) => {
    const design = get().activeSewerDesign;
    if (!design) return;
    set({
      activeSewerDesign: {
        ...design,
        pipes: design.pipes.filter((p) => p.id !== id),
      },
    });
  },

  // Stormwater local modifications
  addStormwaterCatchment: (catchment) => {
    const design = get().activeStormwaterDesign;
    if (!design) return;
    set({
      activeStormwaterDesign: {
        ...design,
        catchments: [...design.catchments, catchment],
      },
    });
  },

  updateStormwaterCatchment: (id, updates) => {
    const design = get().activeStormwaterDesign;
    if (!design) return;
    set({
      activeStormwaterDesign: {
        ...design,
        catchments: design.catchments.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      },
    });
  },

  removeStormwaterCatchment: (id) => {
    const design = get().activeStormwaterDesign;
    if (!design) return;
    set({
      activeStormwaterDesign: {
        ...design,
        catchments: design.catchments.filter((c) => c.id !== id),
      },
    });
  },

  // Channel local modifications
  addChannelSection: (section) => {
    const design = get().activeChannelDesign;
    if (!design) return;
    set({
      activeChannelDesign: {
        ...design,
        sections: [...design.sections, section],
      },
    });
  },

  updateChannelSection: (id, updates) => {
    const design = get().activeChannelDesign;
    if (!design) return;
    set({
      activeChannelDesign: {
        ...design,
        sections: design.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      },
    });
  },

  removeChannelSection: (id) => {
    const design = get().activeChannelDesign;
    if (!design) return;
    set({
      activeChannelDesign: {
        ...design,
        sections: design.sections.filter((s) => s.id !== id),
      },
    });
  },

  // Save active design to server
  saveActiveDesign: async (type) => {
    const { projectId } = get();
    if (!projectId) return;

    let design: WaterNetworkDesign | SewerDesign | StormwaterDesign | ChannelDesign | null = null;

    switch (type) {
      case 'water-network':
        design = get().activeWaterNetworkDesign;
        break;
      case 'sewer':
        design = get().activeSewerDesign;
        break;
      case 'stormwater':
        design = get().activeStormwaterDesign;
        break;
      case 'channel':
        design = get().activeChannelDesign;
        break;
    }

    if (!design) return;

    await get().updateDesign(type, design.id, design as unknown as Record<string, unknown>);
  },

  clearAll: () =>
    set({
      projectId: null,
      waterNetworkDesigns: [],
      activeWaterNetworkDesign: null,
      sewerDesigns: [],
      activeSewerDesign: null,
      stormwaterDesigns: [],
      activeStormwaterDesign: null,
      channelDesigns: [],
      activeChannelDesign: null,
      isLoading: false,
      isSaving: false,
      error: null,
    }),
}));
