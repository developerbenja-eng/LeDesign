import {
  BaseEntity,
  DesignCode,
  SeismicCode,
  WindCode,
  ConcreteCode,
  LengthUnit,
  ForceUnit,
  MomentUnit,
  StressUnit,
  TemperatureUnit,
} from './core';

// ============================================================
// PROJECT SETTINGS
// ============================================================

export interface ProjectSettings {
  // Default section properties
  default_steel_grade?: string;
  default_concrete_grade?: string;
  default_rebar_grade?: string;

  // Analysis settings
  p_delta_analysis?: boolean;
  include_geometric_nonlinearity?: boolean;

  // Convergence criteria
  displacement_tolerance?: number;
  force_tolerance?: number;
  max_iterations?: number;

  // Output options
  num_output_stations?: number;
  include_mode_shapes?: boolean;

  // Grid settings
  grid_spacing_x?: number;
  grid_spacing_y?: number;

  // Other
  [key: string]: unknown;
}

// ============================================================
// SEISMIC PARAMETERS
// ============================================================

export interface SeismicParameters {
  // Site class (ASCE 7 / Eurocode)
  site_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

  // ASCE 7 parameters
  ss?: number;           // Spectral acceleration at short periods
  s1?: number;           // Spectral acceleration at 1 second
  sds?: number;          // Design spectral acceleration at short periods
  sd1?: number;          // Design spectral acceleration at 1 second
  tl?: number;           // Long-period transition period

  // Seismic design category
  sdc?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

  // System parameters
  r_factor?: number;     // Response modification factor
  cd_factor?: number;    // Deflection amplification factor
  omega_0?: number;      // Overstrength factor

  // Importance factor
  ie?: number;

  // Risk category
  risk_category?: 'I' | 'II' | 'III' | 'IV';

  // Redundancy factor
  rho?: number;

  // Story drift limit
  drift_limit?: number;

  // Accidental torsion
  include_accidental_torsion?: boolean;

  // ============================================================
  // NCh433 Chilean Seismic Parameters
  // ============================================================

  // Chilean seismic zone (1, 2, or 3)
  nch433_zone?: 1 | 2 | 3;

  // Chilean soil type (A-F per DS61)
  nch433_soil_type?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

  // Chilean occupancy category
  nch433_occupancy_category?: 'I' | 'II' | 'III' | 'IV';

  // Chilean structural system type
  nch433_structural_system?: string;

  // Peak ground acceleration (g) - derived from zone
  nch433_A0?: number;

  // Site amplification factor - derived from soil type
  nch433_S?: number;

  // Characteristic period T0 (s) - derived from soil type
  nch433_T0?: number;

  // Plateau period T' (s) - derived from soil type
  nch433_Tp?: number;

  // Spectral exponent n - derived from soil type
  nch433_n?: number;

  // Response modification factor R0 - derived from structural system
  nch433_R0?: number;

  // Response modification factor R (static analysis)
  nch433_R?: number;

  // Importance factor I - derived from occupancy category
  nch433_I?: number;

  // Vs30 value if measured (m/s)
  vs30?: number;

  [key: string]: unknown;
}

// ============================================================
// WIND PARAMETERS
// ============================================================

export interface WindParameters {
  // Basic wind speed
  v?: number;           // mph or m/s based on units

  // Exposure category
  exposure?: 'B' | 'C' | 'D';

  // Wind directionality factor
  kd?: number;

  // Topographic factor
  kzt?: number;

  // Gust effect factor
  gust_factor?: number;

  // Enclosure classification
  enclosure?: 'enclosed' | 'partially_enclosed' | 'open';

  // Internal pressure coefficient
  gcpi?: number;

  // Building dimensions for aspect ratio
  width?: number;
  depth?: number;

  // Risk category and importance factor
  risk_category?: 'I' | 'II' | 'III' | 'IV';

  // ============================================================
  // NCh432 Chilean Wind Parameters
  // ============================================================

  // Chilean wind zone (1-5)
  nch432_zone?: 1 | 2 | 3 | 4 | 5;

  // Basic wind speed (m/s) - derived from zone
  nch432_V?: number;

  // Velocity pressure at height z (kN/m²)
  nch432_qz?: number;

  // Velocity pressure at mean roof height (kN/m²)
  nch432_qh?: number;

  // Velocity pressure coefficient
  nch432_Kz?: number;

  // Topographic factor (from detailed calculation)
  nch432_Kzt?: number;

  // Ground elevation factor
  nch432_Ke?: number;

  // Altitude above sea level (m)
  altitude?: number;

  [key: string]: unknown;
}

// ============================================================
// SNOW PARAMETERS
// ============================================================

export interface SnowParameters {
  // Ground snow load (kN/m² or psf)
  pg?: number;

  // Flat roof snow load
  pf?: number;

  // Sloped roof snow load
  ps?: number;

  // Exposure factor
  Ce?: number;

  // Thermal factor
  Ct?: number;

  // Importance factor
  Is?: number;

  // Slope factor
  Cs?: number;

  // Risk category
  risk_category?: 'I' | 'II' | 'III' | 'IV';

  // ============================================================
  // NCh431 Chilean Snow Parameters
  // ============================================================

  // Altitude above sea level (m)
  nch431_altitude?: number;

  // Longitude (negative for Chile)
  nch431_longitude?: number;

  // Exposure category
  nch431_exposure?: 'fully_exposed' | 'partially_exposed' | 'sheltered';

  // Terrain category
  nch431_terrain?: 'B' | 'C' | 'D';

  // Thermal condition
  nch431_thermal?: 'heated' | 'unheated_enclosed' | 'open' | 'freezer' | 'greenhouse';

  // Roof slope (degrees)
  nch431_roof_slope?: number;

  // Roof surface type
  nch431_roof_surface?: 'slippery' | 'non_slippery' | 'obstructed';

  [key: string]: unknown;
}

// ============================================================
// GEOTECHNICAL / FIELD STUDY PARAMETERS
// ============================================================

export interface GeotechnicalParameters {
  // Soil classification per DS61
  soil_type?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

  // Vs30 value (m/s)
  vs30?: number;

  // Vs30 measurement method
  vs30_method?: 'downhole' | 'crosshole' | 'suspension_logging' | 'sasw' | 'masw' | 'remi';

  // SPT N-value (corrected)
  N1_60?: number;

  // Undrained shear strength (kPa)
  Su?: number;

  // Groundwater depth (m)
  groundwater_depth?: number;

  // Exploration depth (m)
  exploration_depth?: number;

  // Field study completed
  field_study_completed?: boolean;

  // Field study date
  field_study_date?: string;

  // Liquefaction susceptible
  liquefaction_susceptible?: boolean;

  // Special soil conditions
  special_conditions?: string[];

  [key: string]: unknown;
}

// ============================================================
// STRUCTURAL PROJECT
// ============================================================

export interface StructuralProject extends BaseEntity {
  name: string;
  description?: string | null;
  created_by: string;

  // Design codes
  design_code: DesignCode;
  seismic_code?: SeismicCode | null;
  wind_code?: WindCode | null;
  concrete_code?: ConcreteCode | null;

  // Units
  length_unit: LengthUnit;
  force_unit: ForceUnit;
  moment_unit: MomentUnit;
  stress_unit: StressUnit;
  temperature_unit: TemperatureUnit;

  // Settings
  settings: ProjectSettings;
}

export interface CreateStructuralProjectInput {
  name: string;
  description?: string;
  created_by: string;
  design_code?: DesignCode;
  seismic_code?: SeismicCode;
  wind_code?: WindCode;
  concrete_code?: ConcreteCode;
  length_unit?: LengthUnit;
  force_unit?: ForceUnit;
  moment_unit?: MomentUnit;
  stress_unit?: StressUnit;
  temperature_unit?: TemperatureUnit;
  settings?: Partial<ProjectSettings>;
}

export interface UpdateStructuralProjectInput {
  name?: string;
  description?: string | null;
  design_code?: DesignCode;
  seismic_code?: SeismicCode | null;
  wind_code?: WindCode | null;
  concrete_code?: ConcreteCode | null;
  length_unit?: LengthUnit;
  force_unit?: ForceUnit;
  moment_unit?: MomentUnit;
  stress_unit?: StressUnit;
  temperature_unit?: TemperatureUnit;
  settings?: Partial<ProjectSettings>;
}

// ============================================================
// BUILDING
// ============================================================

export interface Building extends BaseEntity {
  project_id: string;
  name: string;
  description?: string | null;

  // Geometry
  base_elevation: number;
  grid_angle: number;

  // Parameters
  seismic_params: SeismicParameters;
  wind_params: WindParameters;
  snow_params?: SnowParameters;
  geotechnical_params?: GeotechnicalParameters;
}

export interface CreateBuildingInput {
  project_id: string;
  name: string;
  description?: string;
  base_elevation?: number;
  grid_angle?: number;
  seismic_params?: Partial<SeismicParameters>;
  wind_params?: Partial<WindParameters>;
  snow_params?: Partial<SnowParameters>;
  geotechnical_params?: Partial<GeotechnicalParameters>;
}

export interface UpdateBuildingInput {
  name?: string;
  description?: string | null;
  base_elevation?: number;
  grid_angle?: number;
  seismic_params?: Partial<SeismicParameters>;
  wind_params?: Partial<WindParameters>;
  snow_params?: Partial<SnowParameters>;
  geotechnical_params?: Partial<GeotechnicalParameters>;
}

// ============================================================
// STORY
// ============================================================

export interface Story extends BaseEntity {
  building_id: string;
  name: string;
  story_number: number;
  elevation: number;
  height: number;
  is_basement: boolean;
  is_roof: boolean;

  // Master story relationship
  master_story_id?: string | null;
  is_master: boolean;
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

export interface UpdateStoryInput {
  name?: string;
  story_number?: number;
  elevation?: number;
  height?: number;
  is_basement?: boolean;
  is_roof?: boolean;
  master_story_id?: string | null;
  is_master?: boolean;
}

// ============================================================
// PROJECT WITH RELATIONS
// ============================================================

export interface StructuralProjectWithBuildings extends StructuralProject {
  buildings: Building[];
}

export interface BuildingWithStories extends Building {
  stories: Story[];
}

export interface FullProjectHierarchy extends StructuralProject {
  buildings: BuildingWithStories[];
}

// ============================================================
// DATABASE ROW TYPES (for direct DB queries)
// ============================================================

export interface StructuralProjectRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  design_code: string;
  seismic_code: string | null;
  wind_code: string | null;
  concrete_code: string | null;
  length_unit: string;
  force_unit: string;
  moment_unit: string;
  stress_unit: string;
  temperature_unit: string;
  settings: string; // JSON string
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
  seismic_params: string;       // JSON string
  wind_params: string;          // JSON string
  snow_params?: string;         // JSON string
  geotechnical_params?: string; // JSON string
}

export interface StoryRow {
  id: string;
  building_id: string;
  name: string;
  story_number: number;
  elevation: number;
  height: number;
  is_basement: number; // SQLite boolean
  is_roof: number;     // SQLite boolean
  master_story_id: string | null;
  is_master: number;   // SQLite boolean
  created_at: string;
  updated_at: string;
}

// ============================================================
// CONVERTERS
// ============================================================

export function projectRowToProject(row: StructuralProjectRow): StructuralProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    design_code: row.design_code as DesignCode,
    seismic_code: row.seismic_code as SeismicCode | null,
    wind_code: row.wind_code as WindCode | null,
    concrete_code: row.concrete_code as ConcreteCode | null,
    length_unit: row.length_unit as LengthUnit,
    force_unit: row.force_unit as ForceUnit,
    moment_unit: row.moment_unit as MomentUnit,
    stress_unit: row.stress_unit as StressUnit,
    temperature_unit: row.temperature_unit as TemperatureUnit,
    settings: JSON.parse(row.settings || '{}'),
  };
}

export function buildingRowToBuilding(row: BuildingRow): Building {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
    base_elevation: row.base_elevation,
    grid_angle: row.grid_angle,
    seismic_params: JSON.parse(row.seismic_params || '{}'),
    wind_params: JSON.parse(row.wind_params || '{}'),
    snow_params: row.snow_params ? JSON.parse(row.snow_params) : undefined,
    geotechnical_params: row.geotechnical_params ? JSON.parse(row.geotechnical_params) : undefined,
  };
}

export function storyRowToStory(row: StoryRow): Story {
  return {
    id: row.id,
    building_id: row.building_id,
    name: row.name,
    story_number: row.story_number,
    elevation: row.elevation,
    height: row.height,
    is_basement: Boolean(row.is_basement),
    is_roof: Boolean(row.is_roof),
    master_story_id: row.master_story_id,
    is_master: Boolean(row.is_master),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
