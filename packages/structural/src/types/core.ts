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
  mx?: number;
  my?: number;
  mz?: number;
}

export type LoadDirection = 'X' | 'Y' | 'Z' | 'gravity' | 'local-x' | 'local-y' | 'local-z';

export type SupportType = 'free' | 'pinned' | 'fixed' | 'roller' | 'spring';
