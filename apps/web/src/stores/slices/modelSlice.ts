// ============================================================
// MODEL SLICE
// Manages all structural elements state
// ============================================================

import { SliceCreator, ModelSlice, getElementType } from './types';
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
} from '@ledesign/structural';

export const createModelSlice: SliceCreator<ModelSlice> = (set, get) => ({
  // Initial state
  nodes: new Map<string, StructuralNode>(),
  beams: new Map<string, Beam>(),
  columns: new Map<string, Column>(),
  braces: new Map<string, Brace>(),
  walls: new Map<string, Wall>(),
  slabs: new Map<string, Slab>(),
  materials: new Map<string, Material>(),
  sections: new Map<string, Section>(),
  loadCases: new Map<string, LoadCase>(),
  loadCombinations: new Map<string, LoadCombination>(),
  pointLoads: new Map<string, PointLoad>(),
  memberLoads: new Map<string, MemberLoad>(),

  // Node actions
  setNodes: (nodes: StructuralNode[]) =>
    set((state) => {
      state.nodes = new Map(nodes.map((n) => [n.id, n]));
    }),

  addNode: (node: StructuralNode) =>
    set((state) => {
      state.nodes.set(node.id, node);
    }),

  updateNode: (id: string, updates: Partial<StructuralNode>) =>
    set((state) => {
      const node = state.nodes.get(id);
      if (node) {
        state.nodes.set(id, { ...node, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  deleteNode: (id: string) =>
    set((state) => {
      state.nodes.delete(id);
    }),

  // Beam actions
  setBeams: (beams: Beam[]) =>
    set((state) => {
      state.beams = new Map(beams.map((b) => [b.id, b]));
    }),

  addBeam: (beam: Beam) =>
    set((state) => {
      state.beams.set(beam.id, beam);
    }),

  updateBeam: (id: string, updates: Partial<Beam>) =>
    set((state) => {
      const beam = state.beams.get(id);
      if (beam) {
        state.beams.set(id, { ...beam, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  deleteBeam: (id: string) =>
    set((state) => {
      state.beams.delete(id);
    }),

  // Column actions
  setColumns: (columns: Column[]) =>
    set((state) => {
      state.columns = new Map(columns.map((c) => [c.id, c]));
    }),

  addColumn: (column: Column) =>
    set((state) => {
      state.columns.set(column.id, column);
    }),

  updateColumn: (id: string, updates: Partial<Column>) =>
    set((state) => {
      const column = state.columns.get(id);
      if (column) {
        state.columns.set(id, { ...column, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  deleteColumn: (id: string) =>
    set((state) => {
      state.columns.delete(id);
    }),

  // Brace actions
  setBraces: (braces: Brace[]) =>
    set((state) => {
      state.braces = new Map(braces.map((b) => [b.id, b]));
    }),

  addBrace: (brace: Brace) =>
    set((state) => {
      state.braces.set(brace.id, brace);
    }),

  updateBrace: (id: string, updates: Partial<Brace>) =>
    set((state) => {
      const brace = state.braces.get(id);
      if (brace) {
        state.braces.set(id, { ...brace, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  deleteBrace: (id: string) =>
    set((state) => {
      state.braces.delete(id);
    }),

  // Wall actions
  setWalls: (walls: Wall[]) =>
    set((state) => {
      state.walls = new Map(walls.map((w) => [w.id, w]));
    }),

  addWall: (wall: Wall) =>
    set((state) => {
      state.walls.set(wall.id, wall);
    }),

  updateWall: (id: string, updates: Partial<Wall>) =>
    set((state) => {
      const wall = state.walls.get(id);
      if (wall) {
        state.walls.set(id, { ...wall, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  deleteWall: (id: string) =>
    set((state) => {
      state.walls.delete(id);
    }),

  // Slab actions
  setSlabs: (slabs: Slab[]) =>
    set((state) => {
      state.slabs = new Map(slabs.map((s) => [s.id, s]));
    }),

  addSlab: (slab: Slab) =>
    set((state) => {
      state.slabs.set(slab.id, slab);
    }),

  updateSlab: (id: string, updates: Partial<Slab>) =>
    set((state) => {
      const slab = state.slabs.get(id);
      if (slab) {
        state.slabs.set(id, { ...slab, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  deleteSlab: (id: string) =>
    set((state) => {
      state.slabs.delete(id);
    }),

  // Material actions
  setMaterials: (materials: Material[]) =>
    set((state) => {
      state.materials = new Map(materials.map((m) => [m.id, m]));
    }),

  addMaterial: (material: Material) =>
    set((state) => {
      state.materials.set(material.id, material);
    }),

  updateMaterial: (id: string, updates: Partial<Material>) =>
    set((state) => {
      const material = state.materials.get(id);
      if (material) {
        state.materials.set(id, { ...material, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  // Section actions
  setSections: (sections: Section[]) =>
    set((state) => {
      state.sections = new Map(sections.map((s) => [s.id, s]));
    }),

  addSection: (section: Section) =>
    set((state) => {
      state.sections.set(section.id, section);
    }),

  updateSection: (id: string, updates: Partial<Section>) =>
    set((state) => {
      const section = state.sections.get(id);
      if (section) {
        state.sections.set(id, { ...section, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  // Load case actions
  setLoadCases: (loadCases: LoadCase[]) =>
    set((state) => {
      state.loadCases = new Map(loadCases.map((lc) => [lc.id, lc]));
    }),

  addLoadCase: (loadCase: LoadCase) =>
    set((state) => {
      state.loadCases.set(loadCase.id, loadCase);
    }),

  updateLoadCase: (id: string, updates: Partial<LoadCase>) =>
    set((state) => {
      const loadCase = state.loadCases.get(id);
      if (loadCase) {
        state.loadCases.set(id, { ...loadCase, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  deleteLoadCase: (id: string) =>
    set((state) => {
      state.loadCases.delete(id);
    }),

  // Load combination actions
  setLoadCombinations: (combinations: LoadCombination[]) =>
    set((state) => {
      state.loadCombinations = new Map(combinations.map((lc) => [lc.id, lc]));
    }),

  addLoadCombination: (combination: LoadCombination) =>
    set((state) => {
      state.loadCombinations.set(combination.id, combination);
    }),

  updateLoadCombination: (id: string, updates: Partial<LoadCombination>) =>
    set((state) => {
      const combination = state.loadCombinations.get(id);
      if (combination) {
        state.loadCombinations.set(id, { ...combination, ...updates, updated_at: new Date().toISOString() });
      }
    }),

  deleteLoadCombination: (id: string) =>
    set((state) => {
      state.loadCombinations.delete(id);
    }),

  // Point load actions
  setPointLoads: (loads: PointLoad[]) =>
    set((state) => {
      state.pointLoads = new Map(loads.map((l) => [l.id, l]));
    }),

  addPointLoad: (load: PointLoad) =>
    set((state) => {
      state.pointLoads.set(load.id, load);
    }),

  deletePointLoad: (id: string) =>
    set((state) => {
      state.pointLoads.delete(id);
    }),

  // Member load actions
  setMemberLoads: (loads: MemberLoad[]) =>
    set((state) => {
      state.memberLoads = new Map(loads.map((l) => [l.id, l]));
    }),

  addMemberLoad: (load: MemberLoad) =>
    set((state) => {
      state.memberLoads.set(load.id, load);
    }),

  deleteMemberLoad: (id: string) =>
    set((state) => {
      state.memberLoads.delete(id);
    }),

  // Bulk clear
  clearModel: () =>
    set((state) => {
      state.nodes = new Map();
      state.beams = new Map();
      state.columns = new Map();
      state.braces = new Map();
      state.walls = new Map();
      state.slabs = new Map();
      state.loadCases = new Map();
      state.loadCombinations = new Map();
      state.pointLoads = new Map();
      state.memberLoads = new Map();
    }),

  // Get element by ID
  getElement: (id: string) => {
    const elementType = getElementType(id);
    const state = get();

    switch (elementType) {
      case 'node':
        return state.nodes.get(id) ?? null;
      case 'beam':
        return state.beams.get(id) ?? null;
      case 'column':
        return state.columns.get(id) ?? null;
      case 'brace':
        return state.braces.get(id) ?? null;
      case 'wall':
        return state.walls.get(id) ?? null;
      case 'slab':
        return state.slabs.get(id) ?? null;
      default:
        return null;
    }
  },
});
