import {
  BaseEntity,
  AnalysisType,
  AnalysisStatus,
  DesignStatus,
  FrameElementType,
} from './core';

// ============================================================
// ANALYSIS RUN
// ============================================================

export interface AnalysisSettings {
  // Static analysis
  p_delta?: boolean;
  geometric_nonlinearity?: boolean;

  // Modal analysis
  num_modes?: number;
  frequency_shift?: number;
  eigensolver?: 'lanczos' | 'subspace';

  // Dynamic analysis
  time_step?: number;
  duration?: number;
  damping_type?: 'rayleigh' | 'modal' | 'constant';
  damping_ratio?: number;
  alpha?: number; // Rayleigh damping mass coefficient
  beta?: number;  // Rayleigh damping stiffness coefficient

  // Response spectrum analysis
  spectrum_id?: string;
  direction?: 'X' | 'Y' | 'Z';
  modal_combination?: 'CQC' | 'SRSS' | 'ABS' | 'GMC';
  directional_combination?: 'SRSS' | 'ABS' | '100_30_30' | '100_40_40';
  damping?: number;

  // Convergence
  max_iterations?: number;
  displacement_tolerance?: number;
  force_tolerance?: number;

  // Output
  output_stations?: number;
  save_mode_shapes?: boolean;

  [key: string]: unknown;
}

export interface AnalysisMessage {
  type: 'info' | 'warning' | 'error';
  code?: string;
  message: string;
  element_id?: string;
  element_type?: string;
}

export interface AnalysisSummary {
  // Static analysis
  max_displacement?: number;
  max_displacement_node?: string;
  max_reaction?: number;

  // Modal analysis
  fundamental_period_x?: number;
  fundamental_period_y?: number;
  total_mass_participation_x?: number;
  total_mass_participation_y?: number;
  total_mass_participation_z?: number;
  num_modes_computed?: number;

  // Dynamic analysis
  max_base_shear_x?: number;
  max_base_shear_y?: number;
  max_story_drift?: number;
  max_story_drift_story?: string;

  [key: string]: unknown;
}

export interface AnalysisRun extends BaseEntity {
  project_id: string;
  name?: string | null;

  // Analysis type
  analysis_type: AnalysisType;

  // Status
  status: AnalysisStatus;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;

  // Load combinations to analyze
  combination_ids: string[];

  // Settings
  settings: AnalysisSettings;

  // Messages
  messages: AnalysisMessage[];

  // Summary
  summary: AnalysisSummary;
}

export interface CreateAnalysisRunInput {
  project_id: string;
  name?: string;
  analysis_type: AnalysisType;
  combination_ids?: string[];
  settings?: AnalysisSettings;
}

export interface UpdateAnalysisRunInput {
  name?: string | null;
  status?: AnalysisStatus;
  started_at?: string | null;
  completed_at?: string | null;
  messages?: AnalysisMessage[];
  summary?: AnalysisSummary;
}

// ============================================================
// MODAL RESULTS
// ============================================================

export interface ModalResult extends BaseEntity {
  run_id: string;
  mode_number: number;

  // Modal properties
  frequency: number;           // Hz
  period: number;              // seconds
  circular_frequency: number;  // rad/s

  // Mass participation factors (as percentages)
  mass_participation_x: number;
  mass_participation_y: number;
  mass_participation_z: number;
  mass_participation_rx: number;
  mass_participation_ry: number;
  mass_participation_rz: number;

  // Cumulative participation
  cumulative_x: number;
  cumulative_y: number;
  cumulative_z: number;

  // Modal mass
  modal_mass: number;
}

// ============================================================
// MODE SHAPES
// ============================================================

export interface ModeShape {
  id: string;
  modal_result_id: string;
  node_id: string;

  // Displacements (normalized)
  dx: number;
  dy: number;
  dz: number;

  // Rotations (normalized)
  rx: number;
  ry: number;
  rz: number;
}

// ============================================================
// NODE RESULTS
// ============================================================

export interface NodeResult {
  id: string;
  run_id: string;
  combination_id: string;
  node_id: string;

  // Displacements
  dx: number;
  dy: number;
  dz: number;

  // Rotations
  rx: number;
  ry: number;
  rz: number;

  // Reactions (for supported nodes)
  reaction_fx?: number | null;
  reaction_fy?: number | null;
  reaction_fz?: number | null;
  reaction_mx?: number | null;
  reaction_my?: number | null;
  reaction_mz?: number | null;
}

export interface NodeResultSummary {
  node_id: string;
  max_displacement: number;
  max_rotation: number;
  max_reaction_force?: number;
  max_reaction_moment?: number;
  controlling_combination: string;
}

// ============================================================
// MEMBER RESULTS
// ============================================================

export interface MemberResult {
  id: string;
  run_id: string;
  combination_id: string;
  member_id: string;
  member_type: FrameElementType;
  station: number;  // 0.0 to 1.0 (ratio along member length)

  // Forces
  axial: number;        // P (positive = tension)
  shear_major: number;  // V2 (about major axis)
  shear_minor: number;  // V3 (about minor axis)

  // Moments
  torsion: number;      // T
  moment_major: number; // M33 (about major axis)
  moment_minor: number; // M22 (about minor axis)

  // Deflections
  deflection_major?: number | null;
  deflection_minor?: number | null;
}

export interface MemberResultAtStation {
  station: number;
  axial: number;
  shear_major: number;
  shear_minor: number;
  torsion: number;
  moment_major: number;
  moment_minor: number;
  deflection_major?: number;
  deflection_minor?: number;
}

// ============================================================
// MEMBER ENVELOPES
// ============================================================

export interface ControllingCombinations {
  max_axial?: string;
  min_axial?: string;
  max_shear_major?: string;
  min_shear_major?: string;
  max_shear_minor?: string;
  min_shear_minor?: string;
  max_torsion?: string;
  min_torsion?: string;
  max_moment_major?: string;
  min_moment_major?: string;
  max_moment_minor?: string;
  min_moment_minor?: string;
}

export interface MemberEnvelope {
  id: string;
  run_id: string;
  member_id: string;
  member_type: FrameElementType;
  station: number;

  // Maximum values
  max_axial: number;
  max_shear_major: number;
  max_shear_minor: number;
  max_torsion: number;
  max_moment_major: number;
  max_moment_minor: number;

  // Minimum values
  min_axial: number;
  min_shear_major: number;
  min_shear_minor: number;
  min_torsion: number;
  min_moment_major: number;
  min_moment_minor: number;

  // Controlling combinations
  controlling_combinations: ControllingCombinations;
}

// ============================================================
// SHELL RESULTS
// ============================================================

export interface ShellResult {
  id: string;
  run_id: string;
  combination_id: string;
  element_id: string;

  // Membrane forces (force per unit length)
  f11: number;  // Normal force in local 1 direction
  f22: number;  // Normal force in local 2 direction
  f12: number;  // In-plane shear force

  // Bending moments (moment per unit length)
  m11: number;  // Bending moment about local 2 axis
  m22: number;  // Bending moment about local 1 axis
  m12: number;  // Twisting moment

  // Out-of-plane shear forces
  v13: number;  // Transverse shear in local 1-3 plane
  v23: number;  // Transverse shear in local 2-3 plane

  // Principal values
  fmax?: number | null;  // Maximum principal membrane force
  fmin?: number | null;  // Minimum principal membrane force
  mmax?: number | null;  // Maximum principal moment
  mmin?: number | null;  // Minimum principal moment
}

// ============================================================
// STORY DRIFT RESULTS
// ============================================================

export interface StoryDriftResult {
  id: string;
  run_id: string;
  combination_id: string;
  story_id: string;

  // Drifts
  drift_x: number;        // Absolute drift in X
  drift_y: number;        // Absolute drift in Y
  drift_ratio_x: number;  // Drift ratio (drift/height) in X
  drift_ratio_y: number;  // Drift ratio in Y

  // Story shears
  shear_x?: number | null;
  shear_y?: number | null;

  // Torsional irregularity check
  max_drift_x?: number | null;    // Maximum drift at any point
  avg_drift_x?: number | null;    // Average drift
  max_drift_y?: number | null;
  avg_drift_y?: number | null;
  torsional_ratio_x?: number | null;  // max/avg ratio
  torsional_ratio_y?: number | null;
}

export interface StoryDriftSummary {
  story_id: string;
  story_name: string;
  elevation: number;
  height: number;
  max_drift_ratio_x: number;
  max_drift_ratio_y: number;
  controlling_combination_x: string;
  controlling_combination_y: string;
  is_within_limit: boolean;
}

// ============================================================
// DESIGN RESULTS
// ============================================================

export interface DesignCheck {
  name: string;           // e.g., "Flexure", "Shear", "Interaction"
  capacity: number;       // Capacity (Pn, Mn, Vn, etc.)
  demand: number;         // Demand (Pu, Mu, Vu, etc.)
  ratio: number;          // D/C ratio
  equation?: string;      // Reference equation (e.g., "H1-1a")
  is_controlling: boolean;
}

export interface DesignChecks {
  // Compression
  compression_capacity?: number;
  compression_demand?: number;
  compression_ratio?: number;

  // Tension
  tension_capacity?: number;
  tension_demand?: number;
  tension_ratio?: number;

  // Flexure major axis
  flexure_major_capacity?: number;
  flexure_major_demand?: number;
  flexure_major_ratio?: number;

  // Flexure minor axis
  flexure_minor_capacity?: number;
  flexure_minor_demand?: number;
  flexure_minor_ratio?: number;

  // Shear major axis
  shear_major_capacity?: number;
  shear_major_demand?: number;
  shear_major_ratio?: number;

  // Shear minor axis
  shear_minor_capacity?: number;
  shear_minor_demand?: number;
  shear_minor_ratio?: number;

  // Combined (interaction)
  interaction_ratio?: number;
  interaction_equation?: string;

  // Detailed checks
  checks?: DesignCheck[];

  [key: string]: unknown;
}

export interface DesignMessage {
  type: 'info' | 'warning' | 'error';
  message: string;
  code?: string;
}

export interface DesignResult extends BaseEntity {
  run_id: string;
  member_id: string;
  member_type: FrameElementType | 'wall' | 'slab';

  // Design code used
  design_code: string;

  // Overall results
  demand_capacity_ratio: number;
  controlling_combination_id?: string | null;
  controlling_check?: string | null;
  status: DesignStatus;

  // Detailed checks
  checks: DesignChecks;

  // Messages
  messages: DesignMessage[];
}

export interface DesignResultSummary {
  member_id: string;
  member_type: FrameElementType | 'wall' | 'slab';
  section_name: string;
  max_ratio: number;
  status: DesignStatus;
  controlling_check: string;
}

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface AnalysisRunRow {
  id: string;
  project_id: string;
  name: string | null;
  analysis_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  combination_ids: string;
  settings: string;
  messages: string;
  summary: string;
  created_at: string;
  updated_at: string;
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
  cumulative_x: number;
  cumulative_y: number;
  cumulative_z: number;
  modal_mass: number;
  created_at: string;
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

export interface MemberEnvelopeRow {
  id: string;
  run_id: string;
  member_id: string;
  member_type: string;
  station: number;
  max_axial: number;
  max_shear_major: number;
  max_shear_minor: number;
  max_torsion: number;
  max_moment_major: number;
  max_moment_minor: number;
  min_axial: number;
  min_shear_major: number;
  min_shear_minor: number;
  min_torsion: number;
  min_moment_major: number;
  min_moment_minor: number;
  controlling_combinations: string;
}

export interface ShellResultRow {
  id: string;
  run_id: string;
  combination_id: string;
  element_id: string;
  f11: number;
  f22: number;
  f12: number;
  m11: number;
  m22: number;
  m12: number;
  v13: number;
  v23: number;
  fmax: number | null;
  fmin: number | null;
  mmax: number | null;
  mmin: number | null;
}

export interface StoryDriftResultRow {
  id: string;
  run_id: string;
  combination_id: string;
  story_id: string;
  drift_x: number;
  drift_y: number;
  drift_ratio_x: number;
  drift_ratio_y: number;
  shear_x: number | null;
  shear_y: number | null;
  max_drift_x: number | null;
  avg_drift_x: number | null;
  max_drift_y: number | null;
  avg_drift_y: number | null;
  torsional_ratio_x: number | null;
  torsional_ratio_y: number | null;
}

export interface DesignResultRow {
  id: string;
  run_id: string;
  member_id: string;
  member_type: string;
  design_code: string;
  demand_capacity_ratio: number;
  controlling_combination_id: string | null;
  controlling_check: string | null;
  status: string;
  checks: string;
  messages: string;
  created_at: string;
}

// ============================================================
// ROW CONVERTERS
// ============================================================

export function analysisRunRowToAnalysisRun(row: AnalysisRunRow): AnalysisRun {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    analysis_type: row.analysis_type as AnalysisType,
    status: row.status as AnalysisStatus,
    started_at: row.started_at,
    completed_at: row.completed_at,
    error_message: row.error_message,
    combination_ids: JSON.parse(row.combination_ids || '[]'),
    settings: JSON.parse(row.settings || '{}'),
    messages: JSON.parse(row.messages || '[]'),
    summary: JSON.parse(row.summary || '{}'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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
    cumulative_x: row.cumulative_x,
    cumulative_y: row.cumulative_y,
    cumulative_z: row.cumulative_z,
    modal_mass: row.modal_mass,
    created_at: row.created_at,
  };
}

export function nodeResultRowToNodeResult(row: NodeResultRow): NodeResult {
  return {
    id: row.id,
    run_id: row.run_id,
    combination_id: row.combination_id,
    node_id: row.node_id,
    dx: row.dx,
    dy: row.dy,
    dz: row.dz,
    rx: row.rx,
    ry: row.ry,
    rz: row.rz,
    reaction_fx: row.reaction_fx,
    reaction_fy: row.reaction_fy,
    reaction_fz: row.reaction_fz,
    reaction_mx: row.reaction_mx,
    reaction_my: row.reaction_my,
    reaction_mz: row.reaction_mz,
  };
}

export function memberResultRowToMemberResult(row: MemberResultRow): MemberResult {
  return {
    id: row.id,
    run_id: row.run_id,
    combination_id: row.combination_id,
    member_id: row.member_id,
    member_type: row.member_type as FrameElementType,
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

export function memberEnvelopeRowToMemberEnvelope(row: MemberEnvelopeRow): MemberEnvelope {
  return {
    id: row.id,
    run_id: row.run_id,
    member_id: row.member_id,
    member_type: row.member_type as FrameElementType,
    station: row.station,
    max_axial: row.max_axial,
    max_shear_major: row.max_shear_major,
    max_shear_minor: row.max_shear_minor,
    max_torsion: row.max_torsion,
    max_moment_major: row.max_moment_major,
    max_moment_minor: row.max_moment_minor,
    min_axial: row.min_axial,
    min_shear_major: row.min_shear_major,
    min_shear_minor: row.min_shear_minor,
    min_torsion: row.min_torsion,
    min_moment_major: row.min_moment_major,
    min_moment_minor: row.min_moment_minor,
    controlling_combinations: JSON.parse(row.controlling_combinations || '{}'),
  };
}

export function shellResultRowToShellResult(row: ShellResultRow): ShellResult {
  return {
    id: row.id,
    run_id: row.run_id,
    combination_id: row.combination_id,
    element_id: row.element_id,
    f11: row.f11,
    f22: row.f22,
    f12: row.f12,
    m11: row.m11,
    m22: row.m22,
    m12: row.m12,
    v13: row.v13,
    v23: row.v23,
    fmax: row.fmax,
    fmin: row.fmin,
    mmax: row.mmax,
    mmin: row.mmin,
  };
}

export function storyDriftResultRowToStoryDriftResult(row: StoryDriftResultRow): StoryDriftResult {
  return {
    id: row.id,
    run_id: row.run_id,
    combination_id: row.combination_id,
    story_id: row.story_id,
    drift_x: row.drift_x,
    drift_y: row.drift_y,
    drift_ratio_x: row.drift_ratio_x,
    drift_ratio_y: row.drift_ratio_y,
    shear_x: row.shear_x,
    shear_y: row.shear_y,
    max_drift_x: row.max_drift_x,
    avg_drift_x: row.avg_drift_x,
    max_drift_y: row.max_drift_y,
    avg_drift_y: row.avg_drift_y,
    torsional_ratio_x: row.torsional_ratio_x,
    torsional_ratio_y: row.torsional_ratio_y,
  };
}

export function designResultRowToDesignResult(row: DesignResultRow): DesignResult {
  return {
    id: row.id,
    run_id: row.run_id,
    member_id: row.member_id,
    member_type: row.member_type as FrameElementType,
    design_code: row.design_code,
    demand_capacity_ratio: row.demand_capacity_ratio,
    controlling_combination_id: row.controlling_combination_id,
    controlling_check: row.controlling_check,
    status: row.status as DesignStatus,
    checks: JSON.parse(row.checks || '{}'),
    messages: JSON.parse(row.messages || '[]'),
    created_at: row.created_at,
  };
}
