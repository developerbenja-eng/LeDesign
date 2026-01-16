// ============================================================
// STRUCTURAL TYPES - CORE
// ============================================================
// Core types for structural analysis

export const ID_PREFIXES = {
  project: 'proj_',
  building: 'bld_',
  story: 'sty_',
  node: 'nd_',
  beam: 'bm_',
  column: 'col_',
  brace: 'br_',
  wall: 'wall_',
  slab: 'slb_',
  truss: 'trs_',
  connection: 'conn_',
  shellElement: 'sh_',
  material: 'mat_',
  section: 'sec_',
  loadCase: 'lc_',
  loadCombination: 'combo_',
  pointLoad: 'pl_',
  memberLoad: 'ml_',
  areaLoad: 'al_',
  responseSpectrum: 'spec_',
  timeHistory: 'th_',
  analysisRun: 'run_',
  rebarConfig: 'reb_',
  nodeResult: 'nr_',
  memberResult: 'mr_',
  shellResult: 'sr_',
  modalResult: 'mod_',
  modeShape: 'ms_',
  designResult: 'dr_',
  storyDrift: 'drift_',
} as const;

export interface Restraints {
  dx: boolean;
  dy: boolean;
  dz: boolean;
  rx: boolean;
  ry: boolean;
  rz: boolean;
}

export interface EndReleases {
  fx: boolean;
  fy: boolean;
  fz: boolean;
  mx: boolean;
  my: boolean;
  mz: boolean;
}

export interface EndOffset {
  dx: number;
  dy: number;
  dz: number;
}

export interface SpringStiffness {
  kx?: number;
  ky?: number;
  kz?: number;
  krx?: number;
  kry?: number;
  krz?: number;
}

export interface NodalMass {
  mass?: number;      // Uniform mass in all directions
  massX?: number;     // Mass in X direction
  massY?: number;     // Mass in Y direction
  massZ?: number;     // Mass in Z direction
  mx?: number;        // Alias for massX
  my?: number;        // Alias for massY
  mz?: number;        // Alias for massZ
  inertiaX?: number;  // Rotational inertia about X
  inertiaY?: number;  // Rotational inertia about Y
  inertiaZ?: number;  // Rotational inertia about Z
}

export interface PrescribedDisplacements {
  dx?: number;
  dy?: number;
  dz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

export type LoadDirection = 'X' | 'Y' | 'Z' | '-X' | '-Y' | '-Z' | 'gravity' | 'local-x' | 'local-y' | 'local-z';

export type SupportType = 'free' | 'pinned' | 'fixed' | 'roller' | 'roller_x' | 'roller_y' | 'roller_z' | 'spring' | 'custom';
