import {
  BaseEntity,
  ProjectEntity,
  LoadType,
  MemberLoadType,
  LoadDirection,
  ModalCombinationMethod,
  DirectionalCombinationMethod,
  CombinationType,
  DesignType,
  FrameElementType,
} from './core';

// ============================================================
// LOAD CASE
// ============================================================

export interface LoadCase extends BaseEntity {
  project_id: string;
  name: string;
  load_type: LoadType;

  // Self-weight
  self_weight_multiplier: number;

  // Seismic case properties
  direction?: string | null; // 'X', 'Y', 'Z', 'X+Y', etc.
  eccentricity: number;     // Accidental eccentricity (default 0.05)

  // Response spectrum reference
  spectrum_id?: string | null;
  scale_factor: number;

  // Time history reference
  time_history_id?: string | null;

  // Modal/directional combination
  modal_combination: ModalCombinationMethod;
  directional_combination: DirectionalCombinationMethod;
}

export interface CreateLoadCaseInput {
  project_id: string;
  name: string;
  load_type: LoadType;
  self_weight_multiplier?: number;
  direction?: string;
  eccentricity?: number;
  spectrum_id?: string;
  scale_factor?: number;
  time_history_id?: string;
  modal_combination?: ModalCombinationMethod;
  directional_combination?: DirectionalCombinationMethod;
}

export interface UpdateLoadCaseInput {
  name?: string;
  load_type?: LoadType;
  self_weight_multiplier?: number;
  direction?: string | null;
  eccentricity?: number;
  spectrum_id?: string | null;
  scale_factor?: number;
  time_history_id?: string | null;
  modal_combination?: ModalCombinationMethod;
  directional_combination?: DirectionalCombinationMethod;
}

// ============================================================
// RESPONSE SPECTRUM
// ============================================================

export interface SpectrumPoint {
  period: number;       // Period in seconds
  acceleration: number; // Spectral acceleration (g)
}

export interface CodeBasedSpectrumParams {
  // ASCE 7 parameters
  sds?: number;
  sd1?: number;
  tl?: number;

  // Site class
  site_class?: string;

  // Code type
  code?: 'ASCE7-16' | 'ASCE7-22' | 'EC8' | 'IBC' | 'NCh433' | 'NCh2369';

  // NCh433 Chilean parameters
  nch433_zone?: 1 | 2 | 3;                    // Seismic zone (A0)
  nch433_soil_type?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';  // Soil classification
  nch433_occupancy?: 'I' | 'II' | 'III' | 'IV';  // Occupancy category
  nch433_system?: string;                     // Structural system type
  nch433_A0?: number;                         // Peak ground acceleration (g)
  nch433_S?: number;                          // Site amplification factor
  nch433_T0?: number;                         // Characteristic period (s)
  nch433_Tp?: number;                         // Plateau period T' (s)
  nch433_n?: number;                          // Spectral exponent
  nch433_I?: number;                          // Importance factor
  nch433_R0?: number;                         // Response modification factor

  [key: string]: unknown;
}

export type SpectrumType = 'user' | 'asce7' | 'ec8' | 'ibc' | 'nch433' | 'nch2369';

export interface ResponseSpectrum extends BaseEntity {
  project_id?: string | null;
  name: string;
  is_library: boolean;

  // Spectrum type
  spectrum_type: SpectrumType;

  // Code-based parameters
  code_params: CodeBasedSpectrumParams;

  // User-defined points
  spectrum_points: SpectrumPoint[];

  // Damping
  damping_ratio: number;
}

export interface CreateResponseSpectrumInput {
  project_id?: string;
  name: string;
  is_library?: boolean;
  spectrum_type?: SpectrumType;
  code_params?: CodeBasedSpectrumParams;
  spectrum_points?: SpectrumPoint[];
  damping_ratio?: number;
}

export interface UpdateResponseSpectrumInput {
  name?: string;
  spectrum_type?: SpectrumType;
  code_params?: CodeBasedSpectrumParams;
  spectrum_points?: SpectrumPoint[];
  damping_ratio?: number;
}

// ============================================================
// TIME HISTORY
// ============================================================

export type TimeHistoryFunctionType = 'acceleration' | 'velocity' | 'displacement' | 'force';

export interface TimeHistory extends BaseEntity {
  project_id?: string | null;
  name: string;
  is_library: boolean;

  // Function type
  function_type: TimeHistoryFunctionType;

  // Time step
  time_step: number;

  // Data points (array of values at each time step)
  data_points: number[];

  // Scale factor
  scale_factor: number;

  // Source information
  source?: string | null;
}

export interface CreateTimeHistoryInput {
  project_id?: string;
  name: string;
  is_library?: boolean;
  function_type?: TimeHistoryFunctionType;
  time_step: number;
  data_points: number[];
  scale_factor?: number;
  source?: string;
}

export interface UpdateTimeHistoryInput {
  name?: string;
  function_type?: TimeHistoryFunctionType;
  time_step?: number;
  data_points?: number[];
  scale_factor?: number;
  source?: string | null;
}

// ============================================================
// POINT LOAD (Nodal Forces/Moments)
// ============================================================

export interface PointLoad extends ProjectEntity {
  load_case_id: string;
  node_id: string;

  // Forces
  fx: number;
  fy: number;
  fz: number;

  // Moments
  mx: number;
  my: number;
  mz: number;

  // Coordinate system
  is_global: boolean;
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

export interface UpdatePointLoadInput {
  fx?: number;
  fy?: number;
  fz?: number;
  mx?: number;
  my?: number;
  mz?: number;
  is_global?: boolean;
}

// ============================================================
// MEMBER LOAD (Distributed/Concentrated on Members)
// ============================================================

export interface MemberLoad extends ProjectEntity {
  load_case_id: string;
  member_id: string;
  member_type: FrameElementType;

  // Load type
  load_type: MemberLoadType;
  direction: LoadDirection;

  // Coordinate system
  is_global: boolean;
  is_projected: boolean;

  // Load values
  // For distributed: value_1 = start value, value_2 = end value (for uniform: both equal)
  // For concentrated: value_1 = load value
  // For moment: value_1 = moment value
  value_1: number;
  value_2?: number | null;

  // Load position (distance_1 = start, distance_2 = end for distributed)
  // is_relative: true = ratio (0-1), false = absolute distance
  distance_1: number;
  distance_2?: number | null;
  is_relative: boolean;
}

export interface CreateMemberLoadInput {
  project_id: string;
  load_case_id: string;
  member_id: string;
  member_type: FrameElementType;
  load_type: MemberLoadType;
  direction: LoadDirection;
  is_global?: boolean;
  is_projected?: boolean;
  value_1: number;
  value_2?: number;
  distance_1?: number;
  distance_2?: number;
  is_relative?: boolean;
}

export interface UpdateMemberLoadInput {
  load_type?: MemberLoadType;
  direction?: LoadDirection;
  is_global?: boolean;
  is_projected?: boolean;
  value_1?: number;
  value_2?: number | null;
  distance_1?: number;
  distance_2?: number | null;
  is_relative?: boolean;
}

// ============================================================
// AREA LOAD (Surface Loads on Slabs/Walls)
// ============================================================

export type AreaElementType = 'slab' | 'wall';

export interface AreaLoad extends ProjectEntity {
  load_case_id: string;
  element_id: string;
  element_type: AreaElementType;

  // Load direction
  direction: LoadDirection;

  // Load value (force per unit area)
  value: number;

  // Coordinate system
  is_global: boolean;
}

export interface CreateAreaLoadInput {
  project_id: string;
  load_case_id: string;
  element_id: string;
  element_type: AreaElementType;
  direction?: LoadDirection;
  value: number;
  is_global?: boolean;
}

export interface UpdateAreaLoadInput {
  direction?: LoadDirection;
  value?: number;
  is_global?: boolean;
}

// ============================================================
// LOAD COMBINATION
// ============================================================

export interface LoadCombinationFactors {
  [loadCaseId: string]: number;
}

export interface LoadCombination extends BaseEntity {
  project_id: string;
  name: string;
  combination_type: CombinationType;
  design_type: DesignType;

  // Load case factors
  factors: LoadCombinationFactors;

  // Envelope
  is_envelope: boolean;
}

export interface CreateLoadCombinationInput {
  project_id: string;
  name: string;
  combination_type?: CombinationType;
  design_type?: DesignType;
  factors: LoadCombinationFactors;
  is_envelope?: boolean;
}

export interface UpdateLoadCombinationInput {
  name?: string;
  combination_type?: CombinationType;
  design_type?: DesignType;
  factors?: LoadCombinationFactors;
  is_envelope?: boolean;
}

// ============================================================
// STANDARD LOAD COMBINATIONS (ASCE 7)
// ============================================================

export interface StandardCombinationDefinition {
  name: string;
  design_type: DesignType;
  // Factors by load type (will be applied to matching load cases)
  type_factors: {
    [key in LoadType]?: number;
  };
}

export const ASCE7_STRENGTH_COMBINATIONS: StandardCombinationDefinition[] = [
  { name: '1.4D', design_type: 'strength', type_factors: { dead: 1.4 } },
  { name: '1.2D + 1.6L + 0.5Lr', design_type: 'strength', type_factors: { dead: 1.2, live: 1.6, live_roof: 0.5 } },
  { name: '1.2D + 1.6L + 0.5S', design_type: 'strength', type_factors: { dead: 1.2, live: 1.6, snow: 0.5 } },
  { name: '1.2D + 1.6Lr + L', design_type: 'strength', type_factors: { dead: 1.2, live_roof: 1.6, live: 1.0 } },
  { name: '1.2D + 1.6S + L', design_type: 'strength', type_factors: { dead: 1.2, snow: 1.6, live: 1.0 } },
  { name: '1.2D + W + L + 0.5Lr', design_type: 'strength', type_factors: { dead: 1.2, wind: 1.0, live: 1.0, live_roof: 0.5 } },
  { name: '1.2D + W + L + 0.5S', design_type: 'strength', type_factors: { dead: 1.2, wind: 1.0, live: 1.0, snow: 0.5 } },
  { name: '0.9D + W', design_type: 'strength', type_factors: { dead: 0.9, wind: 1.0 } },
  { name: '1.2D + E + L + 0.2S', design_type: 'seismic', type_factors: { dead: 1.2, seismic: 1.0, live: 1.0, snow: 0.2 } },
  { name: '0.9D + E', design_type: 'seismic', type_factors: { dead: 0.9, seismic: 1.0 } },
];

export const ASCE7_SERVICE_COMBINATIONS: StandardCombinationDefinition[] = [
  { name: 'D', design_type: 'service', type_factors: { dead: 1.0 } },
  { name: 'D + L', design_type: 'service', type_factors: { dead: 1.0, live: 1.0 } },
  { name: 'D + L + Lr', design_type: 'service', type_factors: { dead: 1.0, live: 1.0, live_roof: 1.0 } },
  { name: 'D + L + S', design_type: 'service', type_factors: { dead: 1.0, live: 1.0, snow: 1.0 } },
  { name: 'D + W', design_type: 'service', type_factors: { dead: 1.0, wind: 0.6 } },
  { name: 'D + 0.75L + 0.75W', design_type: 'service', type_factors: { dead: 1.0, live: 0.75, wind: 0.45 } },
];

// ============================================================
// CHILEAN LOAD COMBINATIONS (NCh433 / NCh3171)
// ============================================================

export const NCH433_STRENGTH_COMBINATIONS: StandardCombinationDefinition[] = [
  // Basic combinations
  { name: '1.4D', design_type: 'strength', type_factors: { dead: 1.4 } },
  { name: '1.2D + 1.6L', design_type: 'strength', type_factors: { dead: 1.2, live: 1.6 } },
  { name: '1.2D + 1.6L + 0.5Lr', design_type: 'strength', type_factors: { dead: 1.2, live: 1.6, live_roof: 0.5 } },
  { name: '1.2D + 1.6L + 0.5S', design_type: 'strength', type_factors: { dead: 1.2, live: 1.6, snow: 0.5 } },
  { name: '1.2D + 1.6Lr + L', design_type: 'strength', type_factors: { dead: 1.2, live_roof: 1.6, live: 1.0 } },
  { name: '1.2D + 1.6S + L', design_type: 'strength', type_factors: { dead: 1.2, snow: 1.6, live: 1.0 } },
  // Wind combinations
  { name: '1.2D + W + L', design_type: 'wind', type_factors: { dead: 1.2, wind: 1.0, live: 1.0 } },
  { name: '0.9D + W', design_type: 'wind', type_factors: { dead: 0.9, wind: 1.0 } },
];

export const NCH433_SEISMIC_COMBINATIONS: StandardCombinationDefinition[] = [
  // Seismic combinations per NCh433 and NCh3171
  { name: '1.2D + E + L', design_type: 'seismic', type_factors: { dead: 1.2, seismic: 1.0, live: 1.0 } },
  { name: '1.2D + E + 0.5L', design_type: 'seismic', type_factors: { dead: 1.2, seismic: 1.0, live: 0.5 } },
  { name: '0.9D + E', design_type: 'seismic', type_factors: { dead: 0.9, seismic: 1.0 } },
  { name: '0.9D - E', design_type: 'seismic', type_factors: { dead: 0.9, seismic: -1.0 } },
  // With snow
  { name: '1.2D + E + L + 0.2S', design_type: 'seismic', type_factors: { dead: 1.2, seismic: 1.0, live: 1.0, snow: 0.2 } },
];

export const NCH433_SERVICE_COMBINATIONS: StandardCombinationDefinition[] = [
  { name: 'D', design_type: 'service', type_factors: { dead: 1.0 } },
  { name: 'D + L', design_type: 'service', type_factors: { dead: 1.0, live: 1.0 } },
  { name: 'D + L + Lr', design_type: 'service', type_factors: { dead: 1.0, live: 1.0, live_roof: 1.0 } },
  { name: 'D + 0.5L + 0.7E', design_type: 'service', type_factors: { dead: 1.0, live: 0.5, seismic: 0.7 } },
];

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface LoadCaseRow {
  id: string;
  project_id: string;
  name: string;
  load_type: string;
  self_weight_multiplier: number;
  direction: string | null;
  eccentricity: number;
  spectrum_id: string | null;
  scale_factor: number;
  time_history_id: string | null;
  modal_combination: string;
  directional_combination: string;
  created_at: string;
  updated_at: string;
}

export interface ResponseSpectrumRow {
  id: string;
  project_id: string | null;
  name: string;
  is_library: number;
  spectrum_type: string;
  code_params: string;
  spectrum_points: string;
  damping_ratio: number;
  created_at: string;
}

export interface TimeHistoryRow {
  id: string;
  project_id: string | null;
  name: string;
  is_library: number;
  function_type: string;
  time_step: number;
  data_points: string;
  scale_factor: number;
  source: string | null;
  created_at: string;
}

export interface PointLoadRow {
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
  is_global: number;
  created_at: string;
}

export interface MemberLoadRow {
  id: string;
  project_id: string;
  load_case_id: string;
  member_id: string;
  member_type: string;
  load_type: string;
  direction: string;
  is_global: number;
  is_projected: number;
  value_1: number;
  value_2: number | null;
  distance_1: number;
  distance_2: number | null;
  is_relative: number;
  created_at: string;
}

export interface AreaLoadRow {
  id: string;
  project_id: string;
  load_case_id: string;
  element_id: string;
  element_type: string;
  direction: string;
  value: number;
  is_global: number;
  created_at: string;
}

export interface LoadCombinationRow {
  id: string;
  project_id: string;
  name: string;
  combination_type: string;
  design_type: string;
  factors: string;
  is_envelope: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ROW CONVERTERS
// ============================================================

export function loadCaseRowToLoadCase(row: LoadCaseRow): LoadCase {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    load_type: row.load_type as LoadType,
    self_weight_multiplier: row.self_weight_multiplier,
    direction: row.direction,
    eccentricity: row.eccentricity,
    spectrum_id: row.spectrum_id,
    scale_factor: row.scale_factor,
    time_history_id: row.time_history_id,
    modal_combination: row.modal_combination as ModalCombinationMethod,
    directional_combination: row.directional_combination as DirectionalCombinationMethod,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function responseSpectrumRowToResponseSpectrum(row: ResponseSpectrumRow): ResponseSpectrum {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    is_library: Boolean(row.is_library),
    spectrum_type: row.spectrum_type as SpectrumType,
    code_params: JSON.parse(row.code_params || '{}'),
    spectrum_points: JSON.parse(row.spectrum_points || '[]'),
    damping_ratio: row.damping_ratio,
    created_at: row.created_at,
  };
}

export function timeHistoryRowToTimeHistory(row: TimeHistoryRow): TimeHistory {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    is_library: Boolean(row.is_library),
    function_type: row.function_type as TimeHistoryFunctionType,
    time_step: row.time_step,
    data_points: JSON.parse(row.data_points || '[]'),
    scale_factor: row.scale_factor,
    source: row.source,
    created_at: row.created_at,
  };
}

export function pointLoadRowToPointLoad(row: PointLoadRow): PointLoad {
  return {
    id: row.id,
    project_id: row.project_id,
    load_case_id: row.load_case_id,
    node_id: row.node_id,
    fx: row.fx,
    fy: row.fy,
    fz: row.fz,
    mx: row.mx,
    my: row.my,
    mz: row.mz,
    is_global: Boolean(row.is_global),
    created_at: row.created_at,
  };
}

export function memberLoadRowToMemberLoad(row: MemberLoadRow): MemberLoad {
  return {
    id: row.id,
    project_id: row.project_id,
    load_case_id: row.load_case_id,
    member_id: row.member_id,
    member_type: row.member_type as FrameElementType,
    load_type: row.load_type as MemberLoadType,
    direction: row.direction as LoadDirection,
    is_global: Boolean(row.is_global),
    is_projected: Boolean(row.is_projected),
    value_1: row.value_1,
    value_2: row.value_2,
    distance_1: row.distance_1,
    distance_2: row.distance_2,
    is_relative: Boolean(row.is_relative),
    created_at: row.created_at,
  };
}

export function areaLoadRowToAreaLoad(row: AreaLoadRow): AreaLoad {
  return {
    id: row.id,
    project_id: row.project_id,
    load_case_id: row.load_case_id,
    element_id: row.element_id,
    element_type: row.element_type as AreaElementType,
    direction: row.direction as LoadDirection,
    value: row.value,
    is_global: Boolean(row.is_global),
    created_at: row.created_at,
  };
}

export function loadCombinationRowToLoadCombination(row: LoadCombinationRow): LoadCombination {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    combination_type: row.combination_type as CombinationType,
    design_type: row.design_type as DesignType,
    factors: JSON.parse(row.factors || '{}'),
    is_envelope: Boolean(row.is_envelope),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
