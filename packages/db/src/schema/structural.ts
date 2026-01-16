// ============================================================
// STRUCTURAL MODULE SCHEMA
// ============================================================
// Database types for structural engineering module
// Tables prefixed with 'structural_' to avoid conflicts

export interface StructuralBuilding {
  id: string;
  project_id: string;
  name: string;
  height: number;
  num_stories: number;
  created_at: string;
  updated_at: string;
}

export interface StructuralStory {
  id: string;
  building_id: string;
  name: string;
  elevation: number;
  height: number;
  created_at: string;
}

export interface StructuralNode {
  id: string;
  project_id: string;
  x: number;
  y: number;
  z: number;
  created_at: string;
}

export interface StructuralBeam {
  id: string;
  project_id: string;
  node_i: string;
  node_j: string;
  section_id: string;
  material_id: string;
  created_at: string;
}

export interface StructuralColumn {
  id: string;
  project_id: string;
  node_i: string;
  node_j: string;
  section_id: string;
  material_id: string;
  created_at: string;
}

export interface StructuralMaterial {
  id: string;
  name: string;
  material_type: 'steel' | 'concrete' | 'wood' | 'other';
  elastic_modulus: number;
  poissons_ratio: number;
  yield_strength: number | null;
  ultimate_strength: number | null;
  density: number;
}

export interface StructuralSection {
  id: string;
  name: string;
  section_type: 'I' | 'box' | 'channel' | 'angle' | 'rectangular' | 'circular' | 'custom';
  area: number;
  Ix: number;
  Iy: number;
  J: number;
  depth: number;
  width: number;
}

// Will be extended during migration
