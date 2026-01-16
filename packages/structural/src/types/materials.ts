// ============================================================
// STRUCTURAL TYPES - MATERIALS
// ============================================================
// Material and section properties

export interface Material {
  id: string;
  project_id: string | null;
  name: string;
  material_type: 'steel' | 'concrete' | 'wood' | 'masonry' | 'aluminum' | 'other';
  is_library: boolean;
  elastic_modulus: number;
  shear_modulus: number | null;
  poisson_ratio: number;
  density: number;
  yield_strength: number | null;
  ultimate_strength: number | null;
  thermal_coefficient: number | null;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialInput {
  project_id?: string;
  name: string;
  material_type: 'steel' | 'concrete' | 'wood' | 'masonry' | 'aluminum' | 'other';
  is_library?: boolean;
  elastic_modulus: number;
  shear_modulus?: number;
  poisson_ratio?: number;
  density: number;
  yield_strength?: number;
  ultimate_strength?: number;
  thermal_coefficient?: number;
  properties?: Record<string, unknown>;
}

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
  properties: string | null; // JSON
  created_at: string;
  updated_at: string;
}

export function materialRowToMaterial(row: MaterialRow): Material {
  return {
    ...row,
    is_library: Boolean(row.is_library),
    properties: row.properties ? JSON.parse(row.properties) : {},
  } as Material;
}

export interface Section {
  id: string;
  project_id: string | null;
  name: string;
  section_type: string;
  material_id: string | null;
  is_library: boolean;
  area: number | null;
  ix: number | null; // Moment of inertia about x-axis
  iy: number | null; // Moment of inertia about y-axis
  iz: number | null; // Polar moment of inertia
  sx: number | null; // Section modulus about x
  sy: number | null; // Section modulus about y
  zx: number | null; // Plastic section modulus about x
  zy: number | null; // Plastic section modulus about y
  rx: number | null; // Radius of gyration about x
  ry: number | null; // Radius of gyration about y
  j: number | null; // Torsional constant
  cw: number | null; // Warping constant
  dimensions: Record<string, unknown>;
  rebar_config_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSectionInput {
  project_id?: string;
  name: string;
  section_type: string;
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
  dimensions?: Record<string, unknown>;
  rebar_config_id?: string;
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
  dimensions: string | null; // JSON
  rebar_config_id: string | null;
  created_at: string;
  updated_at: string;
}

export function sectionRowToSection(row: SectionRow): Section {
  return {
    ...row,
    is_library: Boolean(row.is_library),
    dimensions: row.dimensions ? JSON.parse(row.dimensions) : {},
  };
}
