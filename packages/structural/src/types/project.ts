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
