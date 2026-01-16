// ============================================================
// STRUCTURAL TYPES - RESULTS
// ============================================================
// Analysis results and design check results

// ============================================================
// ANALYSIS RUNS
// ============================================================

export interface AnalysisRun {
  id: string;
  project_id: string;
  name: string | null;
  analysis_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  combination_ids: string[];
  settings: Record<string, unknown>;
  messages: string[];
  summary: Record<string, unknown>;
  created_at: string;
}

export interface CreateAnalysisRunInput {
  project_id: string;
  name?: string;
  analysis_type: string;
  combination_ids?: string[];
  settings?: Record<string, unknown>;
}

// ============================================================
// NODE RESULTS
// ============================================================

export interface NodeResult {
  id: string;
  run_id: string;
  combination_id: string;
  node_id: string;
  dx: number; // Displacement in x
  dy: number; // Displacement in y
  dz: number; // Displacement in z
  rx: number; // Rotation about x
  ry: number; // Rotation about y
  rz: number; // Rotation about z
  reaction_fx: number | null; // Reaction force in x
  reaction_fy: number | null; // Reaction force in y
  reaction_fz: number | null; // Reaction force in z
  reaction_mx: number | null; // Reaction moment about x
  reaction_my: number | null; // Reaction moment about y
  reaction_mz: number | null; // Reaction moment about z
}

// ============================================================
// MEMBER RESULTS
// ============================================================

export interface MemberResult {
  id: string;
  run_id: string;
  combination_id: string;
  member_id: string;
  member_type: 'beam' | 'column' | 'brace';
  station: number; // Position along member (0-1)
  axial: number; // Axial force
  shear_major: number; // Shear force in major direction
  shear_minor: number; // Shear force in minor direction
  torsion: number; // Torsional moment
  moment_major: number; // Bending moment about major axis
  moment_minor: number; // Bending moment about minor axis
  deflection_major: number | null; // Deflection in major direction
  deflection_minor: number | null; // Deflection in minor direction
}

// ============================================================
// SHELL RESULTS
// ============================================================

export interface ShellResult {
  id: string;
  run_id: string;
  combination_id: string;
  element_id: string;

  // Membrane forces (N/mm or kN/m)
  f11: number; // Normal force in local x
  f22: number; // Normal force in local y
  f12: number; // Shear force in-plane

  // Bending moments (N·mm/mm or kN·m/m)
  m11: number; // Moment about local x
  m22: number; // Moment about local y
  m12: number; // Twisting moment

  // Transverse shears (N/mm or kN/m)
  v13: number; // Shear in xz plane
  v23: number; // Shear in yz plane
}

// ============================================================
// MODAL RESULTS
// ============================================================

export interface ModalResult {
  id: string;
  run_id: string;
  mode_number: number;
  frequency: number; // Hz
  period: number; // seconds
  participation_x: number;
  participation_y: number;
  participation_z: number;
  mass_ratio_x: number;
  mass_ratio_y: number;
  mass_ratio_z: number;
  cumulative_mass_x: number;
  cumulative_mass_y: number;
  cumulative_mass_z: number;
}

export interface ModeShape {
  id: string;
  modal_result_id: string;
  node_id: string;
  dx: number;
  dy: number;
  dz: number;
  rx: number;
  ry: number;
  rz: number;
}

// ============================================================
// DESIGN RESULTS
// ============================================================

export interface DesignResult {
  id: string;
  project_id: string;
  run_id: string;
  combination_id: string;
  member_id: string;
  member_type: string;
  design_code: string;
  status: DesignStatus;
  demand_capacity_ratio: number;
  governing_check: string;
  capacity: number;
  demand: number;
  messages: DesignMessage[];
  created_at: string;
}

export type DesignStatus = 'pass' | 'warning' | 'fail' | 'not_checked';

export interface DesignMessage {
  type: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  value?: number;
  limit?: number;
}

// ============================================================
// STORY DRIFT RESULTS
// ============================================================

export interface StoryDrift {
  id: string;
  run_id: string;
  combination_id: string;
  story_id: string;
  direction: 'X' | 'Y';
  drift: number;
  drift_ratio: number;
  allowable_drift_ratio: number;
  is_adequate: boolean;
}
