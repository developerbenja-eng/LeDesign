// ============================================================
// STRUCTURAL TYPES - ELEMENTS
// ============================================================
// Structural element types (nodes, beams, columns, walls, slabs, etc.)

import type { Restraints, EndReleases, EndOffset, SpringStiffness, NodalMass, SupportType } from './core';

// ============================================================
// NODES
// ============================================================

export interface StructuralNode {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  x: number;
  y: number;
  z: number;
  support_type: SupportType;
  restraints: Restraints;
  spring_stiffness: SpringStiffness;
  prescribed_displacements: Record<string, unknown>;
  mass: NodalMass;
  created_at: string;
  updated_at: string;
}

export interface CreateNodeInput {
  project_id: string;
  story_id?: string;
  name?: string;
  x: number;
  y: number;
  z: number;
  support_type?: SupportType;
  restraints?: Partial<Restraints>;
  spring_stiffness?: Partial<SpringStiffness>;
  prescribed_displacements?: Record<string, unknown>;
  mass?: Partial<NodalMass>;
}

// Database row types
export interface NodeRow {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  x: number;
  y: number;
  z: number;
  support_type: string;
  restraints: string; // JSON
  spring_stiffness: string | null; // JSON
  prescribed_displacements: string | null; // JSON
  mass: string | null; // JSON
  created_at: string;
  updated_at: string;
}

export function nodeRowToNode(row: NodeRow): StructuralNode {
  return {
    ...row,
    restraints: JSON.parse(row.restraints),
    spring_stiffness: row.spring_stiffness ? JSON.parse(row.spring_stiffness) : {},
    prescribed_displacements: row.prescribed_displacements ? JSON.parse(row.prescribed_displacements) : {},
    mass: row.mass ? JSON.parse(row.mass) : {},
  };
}

// ============================================================
// BEAMS
// ============================================================

export interface Beam {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  node_i_id: string;
  node_j_id: string;
  section_id: string;
  material_id: string | null;
  rotation_angle: number;
  releases_i: EndReleases;
  releases_j: EndReleases;
  offset_i: EndOffset;
  offset_j: EndOffset;
  rigid_zone_i: number;
  rigid_zone_j: number;
  unbraced_length_major: number | null;
  unbraced_length_minor: number | null;
  unbraced_length_ltb: number | null;
  cb: number;
  camber: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBeamInput {
  project_id: string;
  story_id?: string;
  name?: string;
  node_i_id: string;
  node_j_id: string;
  section_id: string;
  material_id?: string;
  rotation_angle?: number;
  releases_i?: Partial<EndReleases>;
  releases_j?: Partial<EndReleases>;
  offset_i?: Partial<EndOffset>;
  offset_j?: Partial<EndOffset>;
  rigid_zone_i?: number;
  rigid_zone_j?: number;
  unbraced_length_major?: number;
  unbraced_length_minor?: number;
  unbraced_length_ltb?: number;
  cb?: number;
  camber?: number;
}

export interface BeamRow {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  node_i_id: string;
  node_j_id: string;
  section_id: string;
  material_id: string | null;
  rotation_angle: number;
  releases_i: string; // JSON
  releases_j: string; // JSON
  offset_i: string; // JSON
  offset_j: string; // JSON
  rigid_zone_i: number;
  rigid_zone_j: number;
  unbraced_length_major: number | null;
  unbraced_length_minor: number | null;
  unbraced_length_ltb: number | null;
  cb: number;
  camber: number;
  created_at: string;
  updated_at: string;
}

export function beamRowToBeam(row: BeamRow): Beam {
  return {
    ...row,
    releases_i: JSON.parse(row.releases_i),
    releases_j: JSON.parse(row.releases_j),
    offset_i: JSON.parse(row.offset_i),
    offset_j: JSON.parse(row.offset_j),
  };
}

// ============================================================
// COLUMNS
// ============================================================

export interface Column {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  node_i_id: string;
  node_j_id: string;
  section_id: string;
  material_id: string | null;
  rotation_angle: number;
  releases_i: EndReleases;
  releases_j: EndReleases;
  offset_i: EndOffset;
  offset_j: EndOffset;
  k_major: number;
  k_minor: number;
  unbraced_length_major: number | null;
  unbraced_length_minor: number | null;
  splice_location: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateColumnInput {
  project_id: string;
  story_id?: string;
  name?: string;
  node_i_id: string;
  node_j_id: string;
  section_id: string;
  material_id?: string;
  rotation_angle?: number;
  releases_i?: Partial<EndReleases>;
  releases_j?: Partial<EndReleases>;
  offset_i?: Partial<EndOffset>;
  offset_j?: Partial<EndOffset>;
  k_major?: number;
  k_minor?: number;
  unbraced_length_major?: number;
  unbraced_length_minor?: number;
  splice_location?: number;
}

export interface ColumnRow {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  node_i_id: string;
  node_j_id: string;
  section_id: string;
  material_id: string | null;
  rotation_angle: number;
  releases_i: string; // JSON
  releases_j: string; // JSON
  offset_i: string; // JSON
  offset_j: string; // JSON
  k_major: number;
  k_minor: number;
  unbraced_length_major: number | null;
  unbraced_length_minor: number | null;
  splice_location: number | null;
  created_at: string;
  updated_at: string;
}

export function columnRowToColumn(row: ColumnRow): Column {
  return {
    ...row,
    releases_i: JSON.parse(row.releases_i),
    releases_j: JSON.parse(row.releases_j),
    offset_i: JSON.parse(row.offset_i),
    offset_j: JSON.parse(row.offset_j),
  };
}

// ============================================================
// BRACES
// ============================================================

export interface Brace {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  node_i_id: string;
  node_j_id: string;
  section_id: string;
  material_id: string | null;
  rotation_angle: number;
  brace_type: string;
  releases_i: EndReleases;
  releases_j: EndReleases;
  offset_i: EndOffset;
  offset_j: EndOffset;
  k: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBraceInput {
  project_id: string;
  story_id?: string;
  name?: string;
  node_i_id: string;
  node_j_id: string;
  section_id: string;
  material_id?: string;
  rotation_angle?: number;
  brace_type?: string;
  releases_i?: Partial<EndReleases>;
  releases_j?: Partial<EndReleases>;
  offset_i?: Partial<EndOffset>;
  offset_j?: Partial<EndOffset>;
  k?: number;
}

export interface BraceRow {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  node_i_id: string;
  node_j_id: string;
  section_id: string;
  material_id: string | null;
  rotation_angle: number;
  brace_type: string;
  releases_i: string; // JSON
  releases_j: string; // JSON
  offset_i: string; // JSON
  offset_j: string; // JSON
  k: number;
  created_at: string;
  updated_at: string;
}

export function braceRowToBrace(row: BraceRow): Brace {
  return {
    ...row,
    releases_i: JSON.parse(row.releases_i),
    releases_j: JSON.parse(row.releases_j),
    offset_i: JSON.parse(row.offset_i),
    offset_j: JSON.parse(row.offset_j),
  };
}

// ============================================================
// WALLS
// ============================================================

export interface Opening {
  id: string;
  corner_nodes: string[]; // Array of node IDs
  width: number;
  height: number;
  offset_x: number;
  offset_y: number;
}

export interface Wall {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  wall_type: string;
  material_type: string;
  material_id: string | null;
  corner_nodes: string[]; // Array of node IDs
  thickness: number;
  openings: Opening[];
  pier_label: string | null;
  spandrel_label: string | null;
  mesh_size: number | null;
  is_meshed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWallInput {
  project_id: string;
  story_id?: string;
  name?: string;
  wall_type?: string;
  material_type?: string;
  material_id?: string;
  corner_nodes: string[];
  thickness: number;
  openings?: Opening[];
  pier_label?: string;
  spandrel_label?: string;
  mesh_size?: number;
}

export interface WallRow {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  wall_type: string;
  material_type: string;
  material_id: string | null;
  corner_nodes: string; // JSON
  thickness: number;
  openings: string | null; // JSON
  pier_label: string | null;
  spandrel_label: string | null;
  mesh_size: number | null;
  is_meshed: number;
  created_at: string;
  updated_at: string;
}

export function wallRowToWall(row: WallRow): Wall {
  return {
    ...row,
    corner_nodes: JSON.parse(row.corner_nodes),
    openings: row.openings ? JSON.parse(row.openings) : [],
    is_meshed: Boolean(row.is_meshed),
  };
}

// ============================================================
// SLABS
// ============================================================

export interface Slab {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  slab_type: string;
  material_type: string;
  material_id: string | null;
  boundary_nodes: string[]; // Array of node IDs
  thickness: number;
  openings: Opening[];
  span_direction: number;
  mesh_size: number | null;
  is_meshed: boolean;
  is_diaphragm: boolean;
  diaphragm_type: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSlabInput {
  project_id: string;
  story_id?: string;
  name?: string;
  slab_type?: string;
  material_type?: string;
  material_id?: string;
  boundary_nodes: string[];
  thickness: number;
  openings?: Opening[];
  span_direction?: number;
  mesh_size?: number;
  is_diaphragm?: boolean;
  diaphragm_type?: string;
}

// ============================================================
// SHELL ELEMENTS
// ============================================================

export interface ShellElement {
  id: string;
  project_id: string;
  parent_id: string; // Wall or Slab ID
  parent_type: 'wall' | 'slab';
  element_type: 'quad4' | 'tri3';
  corner_nodes: string[]; // Array of 3-4 node IDs
  thickness: number;
  material_id: string | null;
  area: number | null;
  centroid_x: number | null;
  centroid_y: number | null;
  centroid_z: number | null;
  created_at: string;
}

export interface CreateShellElementInput {
  project_id: string;
  parent_id: string;
  parent_type: 'wall' | 'slab';
  element_type: 'quad4' | 'tri3';
  corner_nodes: string[];
  thickness: number;
  material_id?: string;
  area?: number;
  centroid_x?: number;
  centroid_y?: number;
  centroid_z?: number;
}

// ============================================================
// TRUSSES
// ============================================================

export interface Truss {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  truss_type: string;
  node_start_id: string;
  node_end_id: string;
  depth: number;
  num_panels: number;
  top_chord_section_id: string;
  bottom_chord_section_id: string;
  diagonal_section_id: string;
  vertical_section_id: string | null;
  material_id: string | null;
  generated_members: string[]; // Array of generated member IDs
  created_at: string;
  updated_at: string;
}

export interface CreateTrussInput {
  project_id: string;
  story_id?: string;
  name?: string;
  truss_type?: string;
  node_start_id: string;
  node_end_id: string;
  depth: number;
  num_panels: number;
  top_chord_section_id: string;
  bottom_chord_section_id: string;
  diagonal_section_id: string;
  vertical_section_id?: string;
  material_id?: string;
}

// ============================================================
// CONNECTIONS
// ============================================================

export interface Connection {
  id: string;
  project_id: string;
  name: string | null;
  connection_type: string;
  primary_member_id: string | null;
  primary_member_type: string | null;
  secondary_member_id: string | null;
  secondary_member_type: string | null;
  node_id: string | null;
  details: Record<string, unknown>;
  design_capacity: number | null;
  demand_capacity_ratio: number | null;
  is_adequate: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CreateConnectionInput {
  project_id: string;
  name?: string;
  connection_type: string;
  primary_member_id?: string;
  primary_member_type?: string;
  secondary_member_id?: string;
  secondary_member_type?: string;
  node_id?: string;
  details?: Record<string, unknown>;
}
