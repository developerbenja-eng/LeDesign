import {
  BaseEntity,
  MaterialType,
  SectionType,
  AiscShapeType,
} from './core';

// ============================================================
// MATERIAL PROPERTIES (type-specific)
// ============================================================

export interface SteelProperties {
  grade?: string;         // e.g., "A992", "A36"
  fy: number;             // Yield strength
  fu: number;             // Ultimate strength
}

export interface ConcreteProperties {
  grade?: string;         // e.g., "4000 psi"
  fc: number;             // Compressive strength
  fr?: number;            // Modulus of rupture
  ec?: number;            // Concrete modulus (if different from calculated)
  lambda?: number;        // Lightweight concrete factor
  is_lightweight?: boolean;
}

export interface TimberProperties {
  grade?: string;         // e.g., "No. 2", "Select Structural"
  species?: string;       // e.g., "Douglas Fir-Larch"
  fb?: number;            // Bending strength
  ft?: number;            // Tension parallel to grain
  fc?: number;            // Compression parallel to grain
  fv?: number;            // Shear parallel to grain
  fc_perp?: number;       // Compression perpendicular to grain
  size_category?: 'dimension' | 'beams_stringers' | 'posts_timbers' | 'glulam';
}

export interface MasonryProperties {
  fm?: number;            // Compressive strength
  type?: 'concrete' | 'clay' | 'aac';
  mortar_type?: 'M' | 'S' | 'N' | 'O';
  grouting?: 'solid' | 'partial' | 'ungrouted';
}

export interface ColdFormedSteelProperties {
  fy: number;             // Yield strength
  fu: number;             // Ultimate strength
  thickness?: number;     // Sheet thickness
  coating?: string;       // e.g., "G60", "G90"
}

export type MaterialProperties =
  | SteelProperties
  | ConcreteProperties
  | TimberProperties
  | MasonryProperties
  | ColdFormedSteelProperties
  | Record<string, unknown>;

// ============================================================
// MATERIAL
// ============================================================

export interface Material extends BaseEntity {
  project_id?: string | null; // null for library materials
  name: string;
  material_type: MaterialType;
  is_library: boolean;

  // Mechanical properties
  elastic_modulus: number;      // E
  shear_modulus?: number | null; // G
  poisson_ratio: number;         // nu
  density: number;               // Weight density
  yield_strength?: number | null;
  ultimate_strength?: number | null;

  // Thermal
  thermal_coefficient?: number | null;

  // Type-specific properties
  properties: MaterialProperties;
}

export interface CreateMaterialInput {
  project_id?: string;
  name: string;
  material_type: MaterialType;
  is_library?: boolean;
  elastic_modulus: number;
  shear_modulus?: number;
  poisson_ratio?: number;
  density: number;
  yield_strength?: number;
  ultimate_strength?: number;
  thermal_coefficient?: number;
  properties?: MaterialProperties;
}

export interface UpdateMaterialInput {
  name?: string;
  elastic_modulus?: number;
  shear_modulus?: number | null;
  poisson_ratio?: number;
  density?: number;
  yield_strength?: number | null;
  ultimate_strength?: number | null;
  thermal_coefficient?: number | null;
  properties?: MaterialProperties;
}

// ============================================================
// STEEL GRADES (Library)
// ============================================================

export interface SteelGrade {
  id: string;
  name: string;          // e.g., "ASTM A992"
  standard: string;      // e.g., "ASTM", "EN"
  fy: number;            // Yield strength (ksi or MPa)
  fu: number;            // Ultimate strength
  elastic_modulus: number;
  density: number;
  description?: string | null;
}

// ============================================================
// CONCRETE GRADES (Library)
// ============================================================

export interface ConcreteGrade {
  id: string;
  name: string;          // e.g., "4000 psi"
  fc: number;            // Compressive strength
  density: number;       // pcf or kg/m³
  elastic_modulus?: number | null;
  description?: string | null;
}

// ============================================================
// REBAR GRADES (Library)
// ============================================================

export interface RebarGrade {
  id: string;
  name: string;          // e.g., "Grade 60"
  fy: number;            // Yield strength
  fu?: number | null;    // Ultimate strength
  elastic_modulus: number;
  description?: string | null;
}

// ============================================================
// SECTION DIMENSIONS
// ============================================================

// W, M, S, HP shapes
export interface WShapeDimensions {
  d: number;     // Depth
  bf: number;    // Flange width
  tw: number;    // Web thickness
  tf: number;    // Flange thickness
  k?: number;    // Distance from outer face of flange to web toe of fillet
  k1?: number;   // Distance from web center to flange toe of fillet
}

// Channels
export interface ChannelDimensions {
  d: number;     // Depth
  bf: number;    // Flange width
  tw: number;    // Web thickness
  tf: number;    // Flange thickness
  x_bar?: number; // Distance to centroid
}

// Angles
export interface AngleDimensions {
  d: number;     // Long leg
  b: number;     // Short leg
  t: number;     // Thickness
  x_bar?: number;
  y_bar?: number;
}

// Double angles
export interface DoubleAngleDimensions extends AngleDimensions {
  spacing: number; // Gap between angles
}

// HSS Rectangular
export interface HssRectDimensions {
  ht: number;    // Height (outside)
  b: number;     // Width (outside)
  t: number;     // Wall thickness
}

// HSS Round / Pipe
export interface HssRoundDimensions {
  od: number;    // Outside diameter
  t: number;     // Wall thickness
}

// Rectangular concrete
export interface RectConcreteDimensions {
  b: number;     // Width
  h: number;     // Depth
}

// Circular concrete
export interface CircularConcreteDimensions {
  d: number;     // Diameter
}

// T-beam concrete
export interface TBeamConcreteDimensions {
  b_eff: number; // Effective flange width
  bf: number;    // Flange width
  hf: number;    // Flange thickness
  bw: number;    // Web width
  h: number;     // Total depth
}

// Rectangular timber
export interface RectTimberDimensions {
  b: number;     // Width (nominal)
  d: number;     // Depth (nominal)
  b_actual?: number; // Actual width
  d_actual?: number; // Actual depth
}

export type SectionDimensions =
  | WShapeDimensions
  | ChannelDimensions
  | AngleDimensions
  | DoubleAngleDimensions
  | HssRectDimensions
  | HssRoundDimensions
  | RectConcreteDimensions
  | CircularConcreteDimensions
  | TBeamConcreteDimensions
  | RectTimberDimensions
  | Record<string, number>;

// ============================================================
// SECTION
// ============================================================

export interface Section extends BaseEntity {
  project_id?: string | null; // null for library sections
  name: string;
  section_type: SectionType;
  material_id?: string | null;
  is_library: boolean;

  // Geometric properties
  area?: number | null;        // Cross-sectional area
  ix?: number | null;          // Moment of inertia about X-X (major)
  iy?: number | null;          // Moment of inertia about Y-Y (minor)
  iz?: number | null;          // Polar moment of inertia (for torsion)
  sx?: number | null;          // Section modulus X-X
  sy?: number | null;          // Section modulus Y-Y
  zx?: number | null;          // Plastic section modulus X-X
  zy?: number | null;          // Plastic section modulus Y-Y
  rx?: number | null;          // Radius of gyration X-X
  ry?: number | null;          // Radius of gyration Y-Y
  j?: number | null;           // Torsional constant
  cw?: number | null;          // Warping constant

  // Dimensions
  dimensions: SectionDimensions;

  // For concrete sections
  rebar_config_id?: string | null;
}

export interface CreateSectionInput {
  project_id?: string;
  name: string;
  section_type: SectionType;
  material_id?: string;
  is_library?: boolean;
  area?: number;
  ix?: number;
  iy?: number;
  iz?: number;
  sx?: number;
  sy?: number;
  zx?: number;
  zy?: number;
  rx?: number;
  ry?: number;
  j?: number;
  cw?: number;
  dimensions?: SectionDimensions;
  rebar_config_id?: string;
}

export interface UpdateSectionInput {
  name?: string;
  material_id?: string | null;
  area?: number | null;
  ix?: number | null;
  iy?: number | null;
  iz?: number | null;
  sx?: number | null;
  sy?: number | null;
  zx?: number | null;
  zy?: number | null;
  rx?: number | null;
  ry?: number | null;
  j?: number | null;
  cw?: number | null;
  dimensions?: SectionDimensions;
  rebar_config_id?: string | null;
}

// ============================================================
// AISC SHAPES (Library)
// ============================================================

export interface AiscShapeProperties {
  // Additional AISC properties
  bf_2tf?: number;  // Flange slenderness
  h_tw?: number;    // Web slenderness
  rts?: number;     // Effective radius of gyration
  ho?: number;      // Distance between flange centroids
  pa?: number;      // Shape perimeter
  pb?: number;      // Shape perimeter
  pc?: number;      // Shape perimeter
  pd?: number;      // Shape perimeter
  [key: string]: unknown;
}

export interface AiscShape {
  id: string;
  aisc_name: string;    // e.g., "W14X22"
  shape_type: AiscShapeType;

  // Dimensions
  d?: number | null;    // Depth
  bf?: number | null;   // Flange width
  tw?: number | null;   // Web thickness
  tf?: number | null;   // Flange thickness
  k?: number | null;
  k1?: number | null;

  // Section properties
  area: number;
  ix: number;
  iy: number;
  sx: number;
  sy: number;
  zx: number;
  zy: number;
  rx: number;
  ry: number;
  j: number;
  cw?: number | null;

  // Weight
  weight_per_ft: number;

  // Compactness
  bf_2tf?: number | null;
  h_tw?: number | null;

  // Additional properties
  properties: AiscShapeProperties;
}

// ============================================================
// REBAR CONFIGURATION
// ============================================================

export interface RebarBar {
  size: string;        // e.g., "#4", "#5", "#8"
  area: number;        // Bar area
  x: number;           // X position from section center
  y: number;           // Y position from section center
  layer?: number;      // Layer number (for multi-layer)
}

export interface TransverseBars {
  size: string;
  spacing: number;
  legs?: number;
  type?: 'stirrup' | 'tie' | 'spiral';
}

export interface RebarConfiguration extends BaseEntity {
  project_id?: string | null;
  name: string;
  section_id?: string | null;

  // Rebar layout
  longitudinal_bars: RebarBar[];
  transverse_bars: TransverseBars;

  // Cover
  cover_top: number;
  cover_bottom: number;
  cover_sides: number;
}

export interface CreateRebarConfigurationInput {
  project_id?: string;
  name: string;
  section_id?: string;
  longitudinal_bars: RebarBar[];
  transverse_bars?: TransverseBars;
  cover_top?: number;
  cover_bottom?: number;
  cover_sides?: number;
}

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface MaterialRow {
  id: string;
  project_id: string | null;
  name: string;
  material_type: string;
  is_library: number;
  elastic_modulus: number;
  shear_modulus: number | null;
  poisson_ratio: number;
  density: number;
  yield_strength: number | null;
  ultimate_strength: number | null;
  thermal_coefficient: number | null;
  properties: string;
  created_at: string;
  updated_at: string;
}

export interface SectionRow {
  id: string;
  project_id: string | null;
  name: string;
  section_type: string;
  material_id: string | null;
  is_library: number;
  area: number | null;
  ix: number | null;
  iy: number | null;
  iz: number | null;
  sx: number | null;
  sy: number | null;
  zx: number | null;
  zy: number | null;
  rx: number | null;
  ry: number | null;
  j: number | null;
  cw: number | null;
  dimensions: string;
  rebar_config_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiscShapeRow {
  id: string;
  aisc_name: string;
  shape_type: string;
  d: number | null;
  bf: number | null;
  tw: number | null;
  tf: number | null;
  k: number | null;
  k1: number | null;
  area: number;
  ix: number;
  iy: number;
  sx: number;
  sy: number;
  zx: number;
  zy: number;
  rx: number;
  ry: number;
  j: number;
  cw: number | null;
  weight_per_ft: number;
  bf_2tf: number | null;
  h_tw: number | null;
  properties: string;
}

// ============================================================
// ROW CONVERTERS
// ============================================================

export function materialRowToMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    material_type: row.material_type as MaterialType,
    is_library: Boolean(row.is_library),
    elastic_modulus: row.elastic_modulus,
    shear_modulus: row.shear_modulus,
    poisson_ratio: row.poisson_ratio,
    density: row.density,
    yield_strength: row.yield_strength,
    ultimate_strength: row.ultimate_strength,
    thermal_coefficient: row.thermal_coefficient,
    properties: JSON.parse(row.properties || '{}'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function sectionRowToSection(row: SectionRow): Section {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    section_type: row.section_type as SectionType,
    material_id: row.material_id,
    is_library: Boolean(row.is_library),
    area: row.area,
    ix: row.ix,
    iy: row.iy,
    iz: row.iz,
    sx: row.sx,
    sy: row.sy,
    zx: row.zx,
    zy: row.zy,
    rx: row.rx,
    ry: row.ry,
    j: row.j,
    cw: row.cw,
    dimensions: JSON.parse(row.dimensions || '{}'),
    rebar_config_id: row.rebar_config_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function aiscShapeRowToAiscShape(row: AiscShapeRow): AiscShape {
  return {
    id: row.id,
    aisc_name: row.aisc_name,
    shape_type: row.shape_type as AiscShapeType,
    d: row.d,
    bf: row.bf,
    tw: row.tw,
    tf: row.tf,
    k: row.k,
    k1: row.k1,
    area: row.area,
    ix: row.ix,
    iy: row.iy,
    sx: row.sx,
    sy: row.sy,
    zx: row.zx,
    zy: row.zy,
    rx: row.rx,
    ry: row.ry,
    j: row.j,
    cw: row.cw,
    weight_per_ft: row.weight_per_ft,
    bf_2tf: row.bf_2tf,
    h_tw: row.h_tw,
    properties: JSON.parse(row.properties || '{}'),
  };
}

// ============================================================
// STANDARD REBAR SIZES (US)
// ============================================================

export const REBAR_SIZES = {
  '#3': { diameter: 0.375, area: 0.11 },
  '#4': { diameter: 0.500, area: 0.20 },
  '#5': { diameter: 0.625, area: 0.31 },
  '#6': { diameter: 0.750, area: 0.44 },
  '#7': { diameter: 0.875, area: 0.60 },
  '#8': { diameter: 1.000, area: 0.79 },
  '#9': { diameter: 1.128, area: 1.00 },
  '#10': { diameter: 1.270, area: 1.27 },
  '#11': { diameter: 1.410, area: 1.56 },
  '#14': { diameter: 1.693, area: 2.25 },
  '#18': { diameter: 2.257, area: 4.00 },
} as const;

export type RebarSize = keyof typeof REBAR_SIZES;
