// ============================================================
// WORKSPACE STORE
// Manages multiple views, layouts, and navigation modes
// ============================================================

import { create } from 'zustand';

// View types available in the workspace
export type ViewType =
  | 'plan'           // 2D plan view (top-down)
  | 'profile'        // Longitudinal profile
  | 'cross-section'  // Transverse sections
  | '3d'             // 3D perspective/isometric
  | 'cubicaciones'   // Volume calculations (earthwork)
  | 'details'        // Standard details library
  | 'alignment'      // Horizontal/vertical alignment editor
  | 'layers'         // Layer management
  | 'properties';    // Properties panel

// Navigation/Layout modes
export type LayoutMode =
  | 'tabs'           // Horizontal tabs (browser-style)
  | 'sidebar'        // Sidebar tree navigation
  | 'split'          // Split panes (resizable)
  | 'floating';      // Floating windows

// Individual view instance
export interface ViewInstance {
  id: string;
  type: ViewType;
  title: string;
  isActive: boolean;
  isVisible: boolean;
  isDirty: boolean;      // Has unsaved changes
  data?: any;            // View-specific data
  position?: {           // For floating/split layouts
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Split pane configuration
export interface SplitPane {
  id: string;
  orientation: 'horizontal' | 'vertical';
  size: number;           // Percentage (0-100)
  children: (string | SplitPane)[]; // View IDs or nested panes
}

// Workspace state
interface WorkspaceState {
  // Views management
  views: ViewInstance[];
  activeViewId: string | null;

  // Layout configuration
  layoutMode: LayoutMode;
  splitLayout: SplitPane | null;

  // Navigation
  sidebarExpanded: boolean;

  // Actions
  addView: (type: ViewType, title?: string, data?: any) => string;
  removeView: (id: string) => void;
  setActiveView: (id: string) => void;
  updateView: (id: string, updates: Partial<ViewInstance>) => void;

  // Layout actions
  setLayoutMode: (mode: LayoutMode) => void;
  setSplitLayout: (layout: SplitPane | null) => void;
  toggleSidebar: () => void;

  // Utilities
  getView: (id: string) => ViewInstance | undefined;
  getViewsByType: (type: ViewType) => ViewInstance[];
  closeAllViews: () => void;
}

// Default view titles
const defaultViewTitles: Record<ViewType, string> = {
  plan: 'Plan View',
  profile: 'Profile View',
  'cross-section': 'Cross Sections',
  '3d': '3D View',
  cubicaciones: 'Earthwork Volumes',
  details: 'Standard Details',
  alignment: 'Alignment Editor',
  layers: 'Layers',
  properties: 'Properties',
};

// Create workspace store
export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // Initial state
  views: [
    {
      id: 'plan-main',
      type: 'plan',
      title: 'Plan View',
      isActive: true,
      isVisible: true,
      isDirty: false,
    },
  ],
  activeViewId: 'plan-main',
  layoutMode: 'tabs',
  splitLayout: null,
  sidebarExpanded: false,

  // Add a new view
  addView: (type, title, data) => {
    const id = `${type}-${Date.now()}`;
    const newView: ViewInstance = {
      id,
      type,
      title: title || defaultViewTitles[type],
      isActive: true,
      isVisible: true,
      isDirty: false,
      data,
    };

    set((state) => ({
      views: [
        ...state.views.map((v) => ({ ...v, isActive: false })),
        newView,
      ],
      activeViewId: id,
    }));

    return id;
  },

  // Remove a view
  removeView: (id) => {
    set((state) => {
      const views = state.views.filter((v) => v.id !== id);
      let activeViewId = state.activeViewId;

      // If removing active view, activate another
      if (activeViewId === id && views.length > 0) {
        activeViewId = views[views.length - 1].id;
        views[views.length - 1].isActive = true;
      }

      return { views, activeViewId };
    });
  },

  // Set active view
  setActiveView: (id) => {
    set((state) => ({
      views: state.views.map((v) => ({
        ...v,
        isActive: v.id === id,
      })),
      activeViewId: id,
    }));
  },

  // Update view properties
  updateView: (id, updates) => {
    set((state) => ({
      views: state.views.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    }));
  },

  // Set layout mode
  setLayoutMode: (mode) => {
    set({ layoutMode: mode });
  },

  // Set split layout configuration
  setSplitLayout: (layout) => {
    set({ splitLayout: layout });
  },

  // Toggle sidebar
  toggleSidebar: () => {
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded }));
  },

  // Get view by ID
  getView: (id) => {
    return get().views.find((v) => v.id === id);
  },

  // Get views by type
  getViewsByType: (type) => {
    return get().views.filter((v) => v.type === type);
  },

  // Close all views
  closeAllViews: () => {
    set({ views: [], activeViewId: null });
  },
}));
