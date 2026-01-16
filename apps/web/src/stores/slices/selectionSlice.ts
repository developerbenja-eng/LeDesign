// ============================================================
// SELECTION SLICE
// Manages selection and hover state
// ============================================================

import { SliceCreator, SelectionSlice, SelectionMode } from './types';

export const createSelectionSlice: SliceCreator<SelectionSlice> = (set) => ({
  // Initial state
  selectedIds: new Set<string>(),
  hoveredId: null,
  selectionMode: 'single' as SelectionMode,

  // Actions
  select: (ids: string[]) =>
    set((state) => {
      state.selectedIds = new Set(ids);
    }),

  addToSelection: (ids: string[]) =>
    set((state) => {
      ids.forEach((id) => state.selectedIds.add(id));
    }),

  removeFromSelection: (ids: string[]) =>
    set((state) => {
      ids.forEach((id) => state.selectedIds.delete(id));
    }),

  toggleSelection: (id: string) =>
    set((state) => {
      if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
      } else {
        state.selectedIds.add(id);
      }
    }),

  clearSelection: () =>
    set((state) => {
      state.selectedIds = new Set();
    }),

  setHoveredId: (id: string | null) =>
    set((state) => {
      state.hoveredId = id;
    }),

  setSelectionMode: (mode: SelectionMode) =>
    set((state) => {
      state.selectionMode = mode;
    }),
});
