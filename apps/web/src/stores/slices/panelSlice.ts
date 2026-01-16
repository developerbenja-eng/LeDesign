// ============================================================
// PANEL SLICE
// Manages dockable panel visibility and dimensions
// ============================================================

import { SliceCreator, PanelSlice, PanelState } from './types';

const DEFAULT_PANEL_STATE: PanelState = {
  isOpen: true,
  width: 300,
};

type PanelKey = 'propertiesPanel' | 'treePanel' | 'aiChatPanel' | 'libraryPanel' | 'resultsPanel' | 'analysisPanel';

export const createPanelSlice: SliceCreator<PanelSlice> = (set) => ({
  // Initial state
  propertiesPanel: { isOpen: true, width: 320 },
  treePanel: { isOpen: true, width: 280 },
  aiChatPanel: { isOpen: true, width: 360 },
  libraryPanel: { isOpen: false, width: 300 },
  resultsPanel: { isOpen: false, width: 400 },
  analysisPanel: { isOpen: false, width: 360 },

  // Actions
  togglePanel: (panel: PanelKey) =>
    set((state) => {
      state[panel].isOpen = !state[panel].isOpen;
    }),

  setPanel: (panel: PanelKey, updates: Partial<PanelState>) =>
    set((state) => {
      state[panel] = { ...state[panel], ...updates };
    }),

  setPanelWidth: (panel: PanelKey, width: number) =>
    set((state) => {
      state[panel].width = Math.max(200, Math.min(600, width));
    }),
});
