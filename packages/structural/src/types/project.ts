// ============================================================
// STRUCTURAL TYPES - PROJECT
// ============================================================
// Project, building, and story types

export interface StructuralProject {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  design_code: string;
  seismic_code: string;
  wind_code: string;
  concrete_code: string;
  length_unit: string;
  force_unit: string;
  moment_unit: string;
  stress_unit: string;
  temperature_unit: string;
  settings: Record<string, unknown>;
}

export interface CreateStructuralProjectInput {
  name: string;
  description?: string;
  created_by: string;
  design_code?: string;
  seismic_code?: string;
  wind_code?: string;
  concrete_code?: string;
  length_unit?: string;
  force_unit?: string;
  moment_unit?: string;
  stress_unit?: string;
  temperature_unit?: string;
  settings?: Record<string, unknown>;
}

export interface Building {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  base_elevation: number;
  grid_angle: number;
  seismic_params: Record<string, unknown>;
  wind_params: Record<string, unknown>;
}

export interface CreateBuildingInput {
  project_id: string;
  name: string;
  description?: string;
  base_elevation?: number;
  grid_angle?: number;
  seismic_params?: Record<string, unknown>;
  wind_params?: Record<string, unknown>;
}

export interface Story {
  id: string;
  building_id: string;
  name: string;
  story_number: number;
  elevation: number;
  height: number;
  is_basement: boolean;
  is_roof: boolean;
  master_story_id: string | null;
  is_master: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStoryInput {
  building_id: string;
  name: string;
  story_number: number;
  elevation: number;
  height: number;
  is_basement?: boolean;
  is_roof?: boolean;
  master_story_id?: string;
  is_master?: boolean;
}

// ============================================================
// DATABASE ROW TYPES & CONVERTERS
// ============================================================

export interface StructuralProjectRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  design_code: string;
  seismic_code: string;
  wind_code: string;
  concrete_code: string;
  length_unit: string;
  force_unit: string;
  moment_unit: string;
  stress_unit: string;
  temperature_unit: string;
  settings: string; // JSON
}

export function projectRowToProject(row: StructuralProjectRow): StructuralProject {
  return {
    ...row,
    settings: row.settings ? JSON.parse(row.settings) : {},
  };
}

export interface BuildingRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  base_elevation: number;
  grid_angle: number;
  seismic_params: string; // JSON
  wind_params: string; // JSON
}

export function buildingRowToBuilding(row: BuildingRow): Building {
  return {
    ...row,
    seismic_params: row.seismic_params ? JSON.parse(row.seismic_params) : {},
    wind_params: row.wind_params ? JSON.parse(row.wind_params) : {},
  };
}

export interface StoryRow {
  id: string;
  building_id: string;
  name: string;
  story_number: number;
  elevation: number;
  height: number;
  is_basement: number; // SQLite boolean
  is_roof: number; // SQLite boolean
  master_story_id: string | null;
  is_master: number; // SQLite boolean
  created_at: string;
  updated_at: string;
}

export function storyRowToStory(row: StoryRow): Story {
  return {
    ...row,
    is_basement: Boolean(row.is_basement),
    is_roof: Boolean(row.is_roof),
    is_master: Boolean(row.is_master),
  };
}
