// ============================================================
// STRUCTURAL TYPES - LOADS
// ============================================================
// Load cases, combinations, and applied loads

import type { LoadDirection } from './core';

// ============================================================
// LOAD CASES
// ============================================================

export interface LoadCase {
  id: string;
  project_id: string;
  name: string;
  load_type: string;
  self_weight_multiplier: number;
  direction: LoadDirection | null;
  eccentricity: number;
  spectrum_id: string | null;
  scale_factor: number;
  time_history_id: string | null;
  modal_combination: string;
  directional_combination: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLoadCaseInput {
  project_id: string;
  name: string;
  load_type: string;
  self_weight_multiplier?: number;
  direction?: LoadDirection;
  eccentricity?: number;
  spectrum_id?: string;
  scale_factor?: number;
  time_history_id?: string;
  modal_combination?: string;
  directional_combination?: string;
}

// ============================================================
// LOAD COMBINATIONS
// ============================================================

export interface LoadCombination {
  id: string;
  project_id: string;
  name: string;
  combination_type: string;
  design_type: string;
  factors: Record<string, number>; // { [load_case_id]: factor }
  is_envelope: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLoadCombinationInput {
  project_id: string;
  name: string;
  combination_type?: string;
  design_type?: string;
  factors: Record<string, number>;
  is_envelope?: boolean;
}

export interface LoadCombinationRow {
  id: string;
  project_id: string;
  name: string;
  combination_type: string;
  design_type: string;
  factors: string; // JSON
  is_envelope: number;
  created_at: string;
  updated_at: string;
}

export function loadCombinationRowToLoadCombination(row: LoadCombinationRow): LoadCombination {
  return {
    ...row,
    factors: JSON.parse(row.factors),
    is_envelope: Boolean(row.is_envelope),
  };
}

// ============================================================
// POINT LOADS
// ============================================================

export interface PointLoad {
  id: string;
  project_id: string;
  load_case_id: string;
  node_id: string;
  fx: number;
  fy: number;
  fz: number;
  mx: number;
  my: number;
  mz: number;
  is_global: boolean;
  created_at: string;
}

export interface CreatePointLoadInput {
  project_id: string;
  load_case_id: string;
  node_id: string;
  fx?: number;
  fy?: number;
  fz?: number;
  mx?: number;
  my?: number;
  mz?: number;
  is_global?: boolean;
}

// Alias for compatibility
export type NodalLoad = PointLoad;

// ============================================================
// MEMBER LOADS
// ============================================================

export interface MemberLoad {
  id: string;
  project_id: string;
  load_case_id: string;
  member_id: string;
  member_type: string;
  load_type: string; // 'distributed', 'point', 'moment'
  direction: LoadDirection;
  is_global: boolean;
  is_projected: boolean;
  value_1: number;
  value_2: number | null;
  distance_1: number;
  distance_2: number | null;
  is_relative: boolean;
  created_at: string;
}

export interface CreateMemberLoadInput {
  project_id: string;
  load_case_id: string;
  member_id: string;
  member_type: string;
  load_type: string;
  direction: LoadDirection;
  is_global?: boolean;
  is_projected?: boolean;
  value_1: number;
  value_2?: number;
  distance_1?: number;
  distance_2?: number;
  is_relative?: boolean;
}

// ============================================================
// AREA LOADS
// ============================================================

export interface AreaLoad {
  id: string;
  project_id: string;
  load_case_id: string;
  element_id: string; // Wall or Slab ID
  element_type: 'wall' | 'slab';
  direction: LoadDirection;
  value: number;
  is_global: boolean;
  created_at: string;
}

export interface CreateAreaLoadInput {
  project_id: string;
  load_case_id: string;
  element_id: string;
  element_type: 'wall' | 'slab';
  direction?: LoadDirection;
  value: number;
  is_global?: boolean;
}

// ============================================================
// RESPONSE SPECTRUM
// ============================================================

export interface SpectrumPoint {
  period: number;
  acceleration: number;
}

export interface ResponseSpectrum {
  id: string;
  project_id: string | null;
  name: string;
  is_library: boolean;
  spectrum_type: string;
  code_params: Record<string, unknown>;
  spectrum_points: SpectrumPoint[];
  damping_ratio: number;
  created_at: string;
}

export interface CreateResponseSpectrumInput {
  project_id?: string;
  name: string;
  is_library?: boolean;
  spectrum_type?: string;
  code_params?: Record<string, unknown>;
  spectrum_points?: SpectrumPoint[];
  damping_ratio?: number;
}

// ============================================================
// TIME HISTORY
// ============================================================

export interface TimeHistory {
  id: string;
  project_id: string | null;
  name: string;
  is_library: boolean;
  function_type: string;
  time_step: number;
  data_points: number[];
  scale_factor: number;
  source: string | null;
  created_at: string;
}

export interface CreateTimeHistoryInput {
  project_id?: string;
  name: string;
  is_library?: boolean;
  function_type?: string;
  time_step: number;
  data_points: number[];
  scale_factor?: number;
  source?: string;
}
