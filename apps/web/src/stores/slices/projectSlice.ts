// ============================================================
// PROJECT SLICE
// Manages project, buildings, and stories state
// ============================================================

import { SliceCreator, ProjectSlice } from './types';
import { StructuralProject, Building, Story } from '@ledesign/structural/project';

export const createProjectSlice: SliceCreator<ProjectSlice> = (set) => ({
  // Initial state
  projectId: null,
  project: null,
  buildings: new Map<string, Building>(),
  stories: new Map<string, Story>(),
  isLoading: false,
  isSaving: false,
  error: null,

  // Actions
  setProjectId: (projectId: string) =>
    set((state) => {
      state.projectId = projectId;
    }),

  setProject: (project: StructuralProject) =>
    set((state) => {
      state.projectId = project.id;
      state.project = project;
    }),

  setBuildings: (buildings: Building[]) =>
    set((state) => {
      state.buildings = new Map(buildings.map((b) => [b.id, b]));
    }),

  setStories: (stories: Story[]) =>
    set((state) => {
      state.stories = new Map(stories.map((s) => [s.id, s]));
    }),

  setLoading: (loading: boolean) =>
    set((state) => {
      state.isLoading = loading;
    }),

  setSaving: (saving: boolean) =>
    set((state) => {
      state.isSaving = saving;
    }),

  setError: (error: string | null) =>
    set((state) => {
      state.error = error;
    }),

  clearProject: () =>
    set((state) => {
      state.projectId = null;
      state.project = null;
      state.buildings = new Map();
      state.stories = new Map();
      state.error = null;
    }),
});
