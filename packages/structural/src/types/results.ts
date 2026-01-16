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
  circular_frequency: number; // rad/s (2 * PI * frequency)

  // Mass participation factors
  mass_participation_x: number;
  mass_participation_y: number;
  mass_participation_z: number;
  mass_participation_rx: number;
  mass_participation_ry: number;
  mass_participation_rz: number;

  // Aliases for backwards compatibility
  participation_x: number;
  participation_y: number;
  participation_z: number;
  mass_ratio_x: number;
  mass_ratio_y: number;
  mass_ratio_z: number;

  // Cumulative mass participation
  cumulative_x: number;
  cumulative_y: number;
  cumulative_z: number;
  cumulative_mass_x: number;
  cumulative_mass_y: number;
  cumulative_mass_z: number;

  // Modal mass
  modal_mass: number;

  created_at: string;
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

export type DesignChecks = Record<string, unknown>;

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
  controlling_check?: string; // Alias for governing_check
  capacity: number;
  demand: number;
  checks?: Record<string, unknown>; // Individual check results
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

// ============================================================
// DATABASE ROW TYPES & CONVERTERS
// ============================================================

export interface MemberResultRow {
  id: string;
  run_id: string;
  combination_id: string;
  member_id: string;
  member_type: string;
  station: number;
  axial: number;
  shear_major: number;
  shear_minor: number;
  torsion: number;
  moment_major: number;
  moment_minor: number;
  deflection_major: number | null;
  deflection_minor: number | null;
}

export function memberResultRowToMemberResult(row: MemberResultRow): MemberResult {
  return {
    id: row.id,
    run_id: row.run_id,
    combination_id: row.combination_id,
    member_id: row.member_id,
    member_type: row.member_type as 'beam' | 'column' | 'brace',
    station: row.station,
    axial: row.axial,
    shear_major: row.shear_major,
    shear_minor: row.shear_minor,
    torsion: row.torsion,
    moment_major: row.moment_major,
    moment_minor: row.moment_minor,
    deflection_major: row.deflection_major,
    deflection_minor: row.deflection_minor,
  };
}

export interface NodeResultRow {
  id: string;
  run_id: string;
  combination_id: string;
  node_id: string;
  dx: number;
  dy: number;
  dz: number;
  rx: number;
  ry: number;
  rz: number;
  reaction_fx: number | null;
  reaction_fy: number | null;
  reaction_fz: number | null;
  reaction_mx: number | null;
  reaction_my: number | null;
  reaction_mz: number | null;
}

export function nodeResultRowToNodeResult(row: NodeResultRow): NodeResult {
  return {
    ...row,
  };
}

export interface ModalResultRow {
  id: string;
  run_id: string;
  mode_number: number;
  frequency: number;
  period: number;
  circular_frequency: number;
  mass_participation_x: number;
  mass_participation_y: number;
  mass_participation_z: number;
  mass_participation_rx: number;
  mass_participation_ry: number;
  mass_participation_rz: number;
  participation_x: number;
  participation_y: number;
  participation_z: number;
  mass_ratio_x: number;
  mass_ratio_y: number;
  mass_ratio_z: number;
  cumulative_x: number;
  cumulative_y: number;
  cumulative_z: number;
  cumulative_mass_x: number;
  cumulative_mass_y: number;
  cumulative_mass_z: number;
  modal_mass: number;
  created_at: string;
}

export function modalResultRowToModalResult(row: ModalResultRow): ModalResult {
  return {
    id: row.id,
    run_id: row.run_id,
    mode_number: row.mode_number,
    frequency: row.frequency,
    period: row.period,
    circular_frequency: row.circular_frequency,
    mass_participation_x: row.mass_participation_x,
    mass_participation_y: row.mass_participation_y,
    mass_participation_z: row.mass_participation_z,
    mass_participation_rx: row.mass_participation_rx,
    mass_participation_ry: row.mass_participation_ry,
    mass_participation_rz: row.mass_participation_rz,
    participation_x: row.participation_x,
    participation_y: row.participation_y,
    participation_z: row.participation_z,
    mass_ratio_x: row.mass_ratio_x,
    mass_ratio_y: row.mass_ratio_y,
    mass_ratio_z: row.mass_ratio_z,
    cumulative_x: row.cumulative_x,
    cumulative_y: row.cumulative_y,
    cumulative_z: row.cumulative_z,
    cumulative_mass_x: row.cumulative_mass_x,
    cumulative_mass_y: row.cumulative_mass_y,
    cumulative_mass_z: row.cumulative_mass_z,
    modal_mass: row.modal_mass,
    created_at: row.created_at,
  };
}

export interface AnalysisRunRow {
  id: string;
  project_id: string;
  name: string | null;
  analysis_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  combination_ids: string; // JSON
  settings: string; // JSON
  messages: string; // JSON
  summary: string; // JSON
  created_at: string;
}

export function analysisRunRowToAnalysisRun(row: AnalysisRunRow): AnalysisRun {
  return {
    ...row,
    combination_ids: row.combination_ids ? JSON.parse(row.combination_ids) : [],
    settings: row.settings ? JSON.parse(row.settings) : {},
    messages: row.messages ? JSON.parse(row.messages) : [],
    summary: row.summary ? JSON.parse(row.summary) : {},
  };
}

export interface DesignResultRow {
  id: string;
  project_id: string;
  run_id: string;
  combination_id: string;
  member_id: string;
  member_type: string;
  design_code: string;
  status: string;
  demand_capacity_ratio: number;
  governing_check: string;
  controlling_check: string | null;
  capacity: number;
  demand: number;
  checks: string | null; // JSON
  messages: string; // JSON
  created_at: string;
}

export function designResultRowToDesignResult(row: DesignResultRow): DesignResult {
  return {
    ...row,
    status: row.status as DesignStatus,
    controlling_check: row.controlling_check ?? undefined,
    checks: row.checks ? JSON.parse(row.checks) : undefined,
    messages: row.messages ? JSON.parse(row.messages) : [],
  };
}
