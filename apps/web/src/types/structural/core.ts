// ============================================================
// CORE TYPES AND ENUMS
// ============================================================

// 3D Point type
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Vector in 3D space
export interface Vector3D {
  dx: number;
  dy: number;
  dz: number;
}

// ============================================================
// UNIT SYSTEMS
// ============================================================

export type LengthUnit = 'ft' | 'in' | 'm' | 'mm' | 'cm';
export type ForceUnit = 'kip' | 'lb' | 'kN' | 'N' | 'kg';
export type MomentUnit = 'kip-ft' | 'kip-in' | 'lb-ft' | 'lb-in' | 'kN-m' | 'N-m';
export type StressUnit = 'ksi' | 'psi' | 'MPa' | 'kPa' | 'Pa';
export type TemperatureUnit = 'F' | 'C';

export interface UnitSystem {
  length: LengthUnit;
  force: ForceUnit;
  moment: MomentUnit;
  stress: StressUnit;
  temperature: TemperatureUnit;
}

// ============================================================
// DESIGN CODES
// ============================================================

export type DesignCode =
  | 'AISC360'     // AISC 360-16 Steel
  | 'AISC341'     // AISC 341-16 Seismic Steel
  | 'ACI318'      // ACI 318-19 Concrete
  | 'NDS'         // NDS 2018 Timber
  | 'TMS402'      // TMS 402-16 Masonry
  | 'AISI'        // AISI S100-16 Cold-Formed Steel
  | 'EC3'         // Eurocode 3 Steel
  | 'EC2'         // Eurocode 2 Concrete
  | 'EC5';        // Eurocode 5 Timber

export type SeismicCode = 'ASCE7' | 'IBC' | 'EC8' | 'UBC97' | 'NCh433' | 'NCh2369';
export type WindCode = 'ASCE7' | 'IBC' | 'EC1' | 'NCh432';
export type SnowCode = 'ASCE7' | 'EC1' | 'NCh431';
export type LiveLoadCode = 'ASCE7' | 'EC1' | 'NCh1537';
export type ConcreteCode = 'ACI318' | 'EC2' | 'CSA-A23.3';

// ============================================================
// MATERIAL TYPES
// ============================================================

export type MaterialType =
  | 'steel'
  | 'concrete'
  | 'timber'
  | 'masonry'
  | 'cold_formed_steel'
  | 'aluminum'
  | 'other';

// ============================================================
// SECTION TYPES
// ============================================================

export type SectionType =
  // Steel shapes
  | 'w_shape'           // Wide flange
  | 'hp_shape'          // HP pile
  | 'm_shape'           // M shape
  | 's_shape'           // S shape (American Standard)
  | 'c_channel'         // Channel
  | 'mc_channel'        // Miscellaneous channel
  | 'wt_shape'          // WT structural tee
  | 'st_shape'          // ST structural tee
  | 'mt_shape'          // MT structural tee
  | 'l_angle'           // Single angle
  | 'double_angle'      // Double angle
  | 'hss_rect'          // HSS rectangular
  | 'hss_round'         // HSS round
  | 'pipe'              // Pipe
  | 'plate'             // Plate
  // Concrete sections
  | 'rect_concrete'     // Rectangular concrete
  | 'circular_concrete' // Circular concrete
  | 't_beam_concrete'   // T-beam concrete
  | 'l_beam_concrete'   // L-beam concrete
  // Timber sections
  | 'rect_timber'       // Rectangular timber
  | 'glulam'            // Glued laminated timber
  // Generic
  | 'general'           // General section with user-defined properties
  | 'custom';           // Custom parametric section

// ============================================================
// AISC SHAPE TYPES
// ============================================================

export type AiscShapeType =
  | 'W'
  | 'M'
  | 'S'
  | 'HP'
  | 'C'
  | 'MC'
  | 'WT'
  | 'MT'
  | 'ST'
  | 'L'
  | '2L'
  | 'HSS'
  | 'PIPE';

// ============================================================
// ELEMENT TYPES
// ============================================================

export type FrameElementType = 'beam' | 'column' | 'brace';

export type ShellElementType = 'wall' | 'slab';

export type StructuralElementType = FrameElementType | ShellElementType | 'node' | 'truss' | 'connection';

// ============================================================
// SUPPORT TYPES
// ============================================================

export type SupportType =
  | 'free'          // No support
  | 'pinned'        // Translation fixed, rotation free
  | 'fixed'         // All DOF fixed
  | 'roller_x'      // Free in X direction
  | 'roller_y'      // Free in Y direction
  | 'roller_z'      // Free in Z direction
  | 'spring'        // Spring support
  | 'custom';       // Custom restraints

export interface Restraints {
  dx: boolean;  // Translation X
  dy: boolean;  // Translation Y
  dz: boolean;  // Translation Z
  rx: boolean;  // Rotation X
  ry: boolean;  // Rotation Y
  rz: boolean;  // Rotation Z
}

export interface SpringStiffness {
  kx?: number;  // Translation X stiffness
  ky?: number;  // Translation Y stiffness
  kz?: number;  // Translation Z stiffness
  krx?: number; // Rotation X stiffness
  kry?: number; // Rotation Y stiffness
  krz?: number; // Rotation Z stiffness
}

export interface NodalMass {
  mass?: number;     // Translational mass
  massX?: number;    // Mass in X direction
  massY?: number;    // Mass in Y direction
  massZ?: number;    // Mass in Z direction
  inertiaX?: number; // Rotational inertia about X
  inertiaY?: number; // Rotational inertia about Y
  inertiaZ?: number; // Rotational inertia about Z
}

// ============================================================
// MEMBER END RELEASES
// ============================================================

export interface EndReleases {
  mx: boolean;  // Moment about X (torsion)
  my: boolean;  // Moment about Y (major axis)
  mz: boolean;  // Moment about Z (minor axis)
  fx?: boolean; // Axial force (rare)
  fy?: boolean; // Shear Y (rare)
  fz?: boolean; // Shear Z (rare)
}

export interface EndOffset {
  dx: number;
  dy: number;
  dz: number;
}

// ============================================================
// LOAD TYPES
// ============================================================

export type LoadType =
  | 'dead'           // Dead load
  | 'live'           // Live load
  | 'live_roof'      // Roof live load
  | 'snow'           // Snow load
  | 'rain'           // Rain load
  | 'wind'           // Wind load
  | 'seismic'        // Seismic load
  | 'earth'          // Earth pressure
  | 'fluid'          // Fluid pressure
  | 'temperature'    // Temperature effects
  | 'settlement'     // Support settlement
  | 'impact'         // Impact load
  | 'pattern_live'   // Pattern live load
  | 'notional'       // Notional load
  | 'other';         // Other

export type MemberLoadType =
  | 'distributed'       // Uniform distributed load
  | 'trapezoidal'       // Trapezoidal distributed load
  | 'triangular'        // Triangular distributed load
  | 'concentrated'      // Point load on member
  | 'moment'            // Applied moment
  | 'temperature'       // Temperature gradient
  | 'strain';           // Initial strain

export type LoadDirection =
  | 'x'      // Global X
  | 'y'      // Global Y
  | 'z'      // Global Z
  | 'local_x' // Local member X (axial)
  | 'local_y' // Local member Y
  | 'local_z' // Local member Z
  | 'gravity'; // Gravity direction (-Z)

// ============================================================
// ANALYSIS TYPES
// ============================================================

export type AnalysisType =
  | 'static_linear'        // Linear static analysis
  | 'static_nonlinear'     // Nonlinear static (P-Delta)
  | 'modal'                // Modal analysis
  | 'response_spectrum'    // Response spectrum analysis
  | 'time_history_linear'  // Linear time history
  | 'time_history_nonlinear' // Nonlinear time history
  | 'buckling';            // Buckling analysis

export type ModalCombinationMethod = 'CQC' | 'SRSS' | 'ABS' | 'GMC';
export type DirectionalCombinationMethod = 'SRSS' | 'ABS' | '100_30_30' | '100_40_40';

// ============================================================
// COMBINATION TYPES
// ============================================================

export type CombinationType = 'linear' | 'envelope' | 'abs_add' | 'srss' | 'range_add';
export type DesignType = 'strength' | 'service' | 'drift' | 'seismic' | 'wind';

// ============================================================
// WALL/SLAB TYPES
// ============================================================

export type WallType = 'shear' | 'bearing' | 'retaining' | 'partition';
export type SlabType = 'one-way' | 'two-way' | 'flat_plate' | 'flat_slab' | 'waffle' | 'ribbed';
export type DiaphragmType = 'rigid' | 'semi_rigid' | 'flexible' | 'none';

// ============================================================
// TRUSS TYPES
// ============================================================

export type TrussType =
  | 'warren'          // Warren truss
  | 'pratt'           // Pratt truss
  | 'howe'            // Howe truss
  | 'k_truss'         // K-truss
  | 'vierendeel'      // Vierendeel truss
  | 'flat'            // Flat truss (open web joist)
  | 'custom';         // Custom layout

// ============================================================
// CONNECTION TYPES
// ============================================================

export type ConnectionType =
  | 'shear_tab'           // Simple shear tab
  | 'end_plate_moment'    // End plate moment connection
  | 'flange_plate_moment' // Flange plate moment connection
  | 'directly_welded'     // Directly welded moment connection
  | 'base_plate'          // Column base plate
  | 'splice'              // Column splice
  | 'brace_gusset'        // Brace gusset plate
  | 'beam_seat'           // Beam seat connection
  | 'clip_angle'          // Clip angle connection
  | 'extended_end_plate'  // Extended end plate
  | 'custom';             // Custom connection

// ============================================================
// BRACE TYPES
// ============================================================

export type BraceType =
  | 'diagonal'        // Single diagonal
  | 'x_brace'         // X-bracing (half)
  | 'chevron'         // Chevron (inverted V)
  | 'v_brace'         // V-bracing
  | 'k_brace'         // K-bracing
  | 'knee_brace'      // Knee brace
  | 'eccentric';      // Eccentrically braced

// ============================================================
// ANALYSIS STATUS
// ============================================================

export type AnalysisStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DesignStatus =
  | 'pass'
  | 'fail'
  | 'warning'
  | 'not_designed';

// ============================================================
// ID PREFIXES (for entity identification)
// ============================================================

export const ID_PREFIXES = {
  project: 'prj_',
  building: 'bld_',
  story: 'sty_',
  node: 'nd_',
  beam: 'bm_',
  column: 'col_',
  brace: 'br_',
  wall: 'wl_',
  slab: 'sl_',
  truss: 'tr_',
  connection: 'cn_',
  shellElement: 'sh_',
  material: 'mat_',
  section: 'sec_',
  loadCase: 'lc_',
  loadCombination: 'lcb_',
  pointLoad: 'pl_',
  memberLoad: 'ml_',
  areaLoad: 'al_',
  responseSpectrum: 'rs_',
  timeHistory: 'th_',
  analysisRun: 'run_',
  rebarConfig: 'rb_',
  nodeResult: 'nr_',
  memberResult: 'mr_',
  modalResult: 'mdr_',
  modeShape: 'ms_',
  designResult: 'dr_',
  storyDrift: 'sd_',
} as const;

// ============================================================
// UTILITY TYPES
// ============================================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface ProjectEntity extends BaseEntity {
  project_id: string;
}

export interface StoryEntity extends ProjectEntity {
  story_id?: string | null;
}

// Generic coordinate system reference
export type CoordinateSystem = 'global' | 'local';

// Opening definition for walls/slabs
export interface Opening {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  corner_radius?: number;
}

// ============================================================
// TYPE GUARDS
// ============================================================

export function isFrameElementType(type: string): type is FrameElementType {
  return ['beam', 'column', 'brace'].includes(type);
}

export function isShellElementType(type: string): type is ShellElementType {
  return ['wall', 'slab'].includes(type);
}

export function isMaterialType(type: string): type is MaterialType {
  return ['steel', 'concrete', 'timber', 'masonry', 'cold_formed_steel', 'aluminum', 'other'].includes(type);
}
