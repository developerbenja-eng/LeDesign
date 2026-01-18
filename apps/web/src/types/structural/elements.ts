import {
  StoryEntity,
  ProjectEntity,
  SupportType,
  Restraints,
  SpringStiffness,
  NodalMass,
  EndReleases,
  EndOffset,
  WallType,
  SlabType,
  DiaphragmType,
  TrussType,
  ConnectionType,
  BraceType,
  MaterialType,
  Opening,
  Point3D,
} from './core';

// ============================================================
// NODE (Joint/Connection Point)
// ============================================================

export interface StructuralNode extends StoryEntity {
  name?: string | null;

  // Coordinates
  x: number;
  y: number;
  z: number;

  // Support conditions
  support_type: SupportType;
  restraints: Restraints;
  spring_stiffness: SpringStiffness;

  // Prescribed displacements
  prescribed_displacements: {
    dx?: number;
    dy?: number;
    dz?: number;
    rx?: number;
    ry?: number;
    rz?: number;
  };

  // Mass for dynamic analysis
  mass: NodalMass;
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
  prescribed_displacements?: {
    dx?: number;
    dy?: number;
    dz?: number;
    rx?: number;
    ry?: number;
    rz?: number;
  };
  mass?: Partial<NodalMass>;
}

export interface UpdateNodeInput {
  name?: string | null;
  x?: number;
  y?: number;
  z?: number;
  story_id?: string | null;
  support_type?: SupportType;
  restraints?: Partial<Restraints>;
  spring_stiffness?: Partial<SpringStiffness>;
  prescribed_displacements?: {
    dx?: number;
    dy?: number;
    dz?: number;
    rx?: number;
    ry?: number;
    rz?: number;
  };
  mass?: Partial<NodalMass>;
}

// ============================================================
// BASE FRAME MEMBER (shared by Beam, Column, Brace)
// ============================================================

interface BaseFrameMember extends StoryEntity {
  name?: string | null;

  // Connectivity
  node_i_id: string;
  node_j_id: string;

  // Section and material
  section_id: string;
  material_id?: string | null;

  // Member properties
  rotation_angle: number;

  // End releases
  releases_i: EndReleases;
  releases_j: EndReleases;

  // End offsets
  offset_i: EndOffset;
  offset_j: EndOffset;
}

// ============================================================
// BEAM
// ============================================================

export interface Beam extends BaseFrameMember {
  // Rigid end zones
  rigid_zone_i: number;
  rigid_zone_j: number;

  // Design parameters
  unbraced_length_major?: number | null;
  unbraced_length_minor?: number | null;
  unbraced_length_ltb?: number | null;
  cb: number;

  // Camber
  camber: number;
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

export interface UpdateBeamInput {
  name?: string | null;
  story_id?: string | null;
  node_i_id?: string;
  node_j_id?: string;
  section_id?: string;
  material_id?: string | null;
  rotation_angle?: number;
  releases_i?: Partial<EndReleases>;
  releases_j?: Partial<EndReleases>;
  offset_i?: Partial<EndOffset>;
  offset_j?: Partial<EndOffset>;
  rigid_zone_i?: number;
  rigid_zone_j?: number;
  unbraced_length_major?: number | null;
  unbraced_length_minor?: number | null;
  unbraced_length_ltb?: number | null;
  cb?: number;
  camber?: number;
}

// ============================================================
// COLUMN
// ============================================================

export interface Column extends BaseFrameMember {
  // Effective length factors
  k_major: number;
  k_minor: number;

  // Unbraced lengths
  unbraced_length_major?: number | null;
  unbraced_length_minor?: number | null;

  // Splice location (ratio from node_i, 0-1)
  splice_location?: number | null;
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

export interface UpdateColumnInput {
  name?: string | null;
  story_id?: string | null;
  node_i_id?: string;
  node_j_id?: string;
  section_id?: string;
  material_id?: string | null;
  rotation_angle?: number;
  releases_i?: Partial<EndReleases>;
  releases_j?: Partial<EndReleases>;
  offset_i?: Partial<EndOffset>;
  offset_j?: Partial<EndOffset>;
  k_major?: number;
  k_minor?: number;
  unbraced_length_major?: number | null;
  unbraced_length_minor?: number | null;
  splice_location?: number | null;
}

// ============================================================
// BRACE
// ============================================================

export interface Brace extends BaseFrameMember {
  // Brace type
  brace_type: BraceType;

  // Effective length factor
  k: number;
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
  brace_type?: BraceType;
  releases_i?: Partial<EndReleases>;
  releases_j?: Partial<EndReleases>;
  offset_i?: Partial<EndOffset>;
  offset_j?: Partial<EndOffset>;
  k?: number;
}

export interface UpdateBraceInput {
  name?: string | null;
  story_id?: string | null;
  node_i_id?: string;
  node_j_id?: string;
  section_id?: string;
  material_id?: string | null;
  rotation_angle?: number;
  brace_type?: BraceType;
  releases_i?: Partial<EndReleases>;
  releases_j?: Partial<EndReleases>;
  offset_i?: Partial<EndOffset>;
  offset_j?: Partial<EndOffset>;
  k?: number;
}

// ============================================================
// WALL
// ============================================================

export interface Wall extends StoryEntity {
  name?: string | null;

  // Wall type
  wall_type: WallType;
  material_type: MaterialType;
  material_id?: string | null;

  // Geometry
  corner_nodes: string[]; // Array of node IDs defining the wall boundary
  thickness: number;

  // Openings
  openings: Opening[];

  // Pier/spandrel assignment
  pier_label?: string | null;
  spandrel_label?: string | null;

  // Meshing
  mesh_size?: number | null;
  is_meshed: boolean;
}

export interface CreateWallInput {
  project_id: string;
  story_id?: string;
  name?: string;
  wall_type?: WallType;
  material_type?: MaterialType;
  material_id?: string;
  corner_nodes: string[];
  thickness: number;
  openings?: Opening[];
  pier_label?: string;
  spandrel_label?: string;
  mesh_size?: number;
}

export interface UpdateWallInput {
  name?: string | null;
  story_id?: string | null;
  wall_type?: WallType;
  material_type?: MaterialType;
  material_id?: string | null;
  corner_nodes?: string[];
  thickness?: number;
  openings?: Opening[];
  pier_label?: string | null;
  spandrel_label?: string | null;
  mesh_size?: number | null;
  is_meshed?: boolean;
}

// ============================================================
// SLAB
// ============================================================

export interface Slab extends StoryEntity {
  name?: string | null;

  // Slab type
  slab_type: SlabType;
  material_type: MaterialType;
  material_id?: string | null;

  // Geometry
  boundary_nodes: string[]; // Array of node IDs defining the slab boundary
  thickness: number;

  // Openings
  openings: Opening[];

  // Load distribution
  span_direction: number; // Angle in degrees for one-way slabs

  // Meshing
  mesh_size?: number | null;
  is_meshed: boolean;

  // Diaphragm
  is_diaphragm: boolean;
  diaphragm_type: DiaphragmType;
}

export interface CreateSlabInput {
  project_id: string;
  story_id?: string;
  name?: string;
  slab_type?: SlabType;
  material_type?: MaterialType;
  material_id?: string;
  boundary_nodes: string[];
  thickness: number;
  openings?: Opening[];
  span_direction?: number;
  mesh_size?: number;
  is_diaphragm?: boolean;
  diaphragm_type?: DiaphragmType;
}

export interface UpdateSlabInput {
  name?: string | null;
  story_id?: string | null;
  slab_type?: SlabType;
  material_type?: MaterialType;
  material_id?: string | null;
  boundary_nodes?: string[];
  thickness?: number;
  openings?: Opening[];
  span_direction?: number;
  mesh_size?: number | null;
  is_meshed?: boolean;
  is_diaphragm?: boolean;
  diaphragm_type?: DiaphragmType;
}

// ============================================================
// TRUSS
// ============================================================

export interface Truss extends StoryEntity {
  name?: string | null;

  // Truss type
  truss_type: TrussType;

  // Geometry
  node_start_id: string;
  node_end_id: string;
  depth: number;
  num_panels: number;

  // Sections
  top_chord_section_id: string;
  bottom_chord_section_id: string;
  diagonal_section_id: string;
  vertical_section_id?: string | null;

  // Material
  material_id?: string | null;

  // Generated members (IDs of beams/braces created from this truss)
  generated_members: string[];
}

export interface CreateTrussInput {
  project_id: string;
  story_id?: string;
  name?: string;
  truss_type?: TrussType;
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

export interface UpdateTrussInput {
  name?: string | null;
  story_id?: string | null;
  truss_type?: TrussType;
  node_start_id?: string;
  node_end_id?: string;
  depth?: number;
  num_panels?: number;
  top_chord_section_id?: string;
  bottom_chord_section_id?: string;
  diagonal_section_id?: string;
  vertical_section_id?: string | null;
  material_id?: string | null;
}

// ============================================================
// CONNECTION
// ============================================================

export interface ConnectionDetails {
  // Bolt information
  bolt_diameter?: number;
  bolt_grade?: string;
  num_bolts?: number;
  bolt_rows?: number;
  bolt_columns?: number;
  bolt_spacing?: number;
  edge_distance?: number;

  // Weld information
  weld_type?: 'fillet' | 'groove' | 'plug';
  weld_size?: number;
  weld_length?: number;

  // Plate information
  plate_thickness?: number;
  plate_width?: number;
  plate_length?: number;
  plate_grade?: string;

  // Stiffener information
  stiffener_thickness?: number;
  stiffener_width?: number;

  // Other details
  [key: string]: unknown;
}

export interface Connection extends ProjectEntity {
  name?: string | null;

  // Connection type
  connection_type: ConnectionType;

  // Connected elements
  primary_member_id?: string | null;
  primary_member_type?: string | null;
  secondary_member_id?: string | null;
  secondary_member_type?: string | null;
  node_id?: string | null;

  // Connection details
  details: ConnectionDetails;

  // Design results
  design_capacity?: number | null;
  demand_capacity_ratio?: number | null;
  is_adequate?: boolean | null;
}

export interface CreateConnectionInput {
  project_id: string;
  name?: string;
  connection_type: ConnectionType;
  primary_member_id?: string;
  primary_member_type?: string;
  secondary_member_id?: string;
  secondary_member_type?: string;
  node_id?: string;
  details?: Partial<ConnectionDetails>;
}

export interface UpdateConnectionInput {
  name?: string | null;
  connection_type?: ConnectionType;
  primary_member_id?: string | null;
  primary_member_type?: string | null;
  secondary_member_id?: string | null;
  secondary_member_type?: string | null;
  node_id?: string | null;
  details?: Partial<ConnectionDetails>;
  design_capacity?: number | null;
  demand_capacity_ratio?: number | null;
  is_adequate?: boolean | null;
}

// ============================================================
// SHELL ELEMENT (Mesh element for walls/slabs)
// ============================================================

export type ShellElementMeshType = 'quad' | 'tri';
export type ShellParentType = 'wall' | 'slab';

export interface ShellElement extends ProjectEntity {
  parent_id: string;
  parent_type: ShellParentType;

  // Element type
  element_type: ShellElementMeshType;

  // Corner nodes
  node_1_id: string;
  node_2_id: string;
  node_3_id: string;
  node_4_id?: string | null; // Only for quad elements

  // Properties
  thickness: number;
  material_id?: string | null;
  local_axis_angle: number;
}

export interface CreateShellElementInput {
  project_id: string;
  parent_id: string;
  parent_type: ShellParentType;
  element_type?: ShellElementMeshType;
  node_1_id: string;
  node_2_id: string;
  node_3_id: string;
  node_4_id?: string;
  thickness: number;
  material_id?: string;
  local_axis_angle?: number;
}

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface NodeRow {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  x: number;
  y: number;
  z: number;
  support_type: string;
  restraints: string;
  spring_stiffness: string;
  prescribed_displacements: string;
  mass: string;
  created_at: string;
  updated_at: string;
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
  releases_i: string;
  releases_j: string;
  offset_i: string;
  offset_j: string;
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
  releases_i: string;
  releases_j: string;
  offset_i: string;
  offset_j: string;
  k_major: number;
  k_minor: number;
  unbraced_length_major: number | null;
  unbraced_length_minor: number | null;
  splice_location: number | null;
  created_at: string;
  updated_at: string;
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
  releases_i: string;
  releases_j: string;
  offset_i: string;
  offset_j: string;
  k: number;
  created_at: string;
  updated_at: string;
}

export interface WallRow {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  wall_type: string;
  material_type: string;
  material_id: string | null;
  corner_nodes: string;
  thickness: number;
  openings: string;
  pier_label: string | null;
  spandrel_label: string | null;
  mesh_size: number | null;
  is_meshed: number;
  created_at: string;
  updated_at: string;
}

export interface SlabRow {
  id: string;
  project_id: string;
  story_id: string | null;
  name: string | null;
  slab_type: string;
  material_type: string;
  material_id: string | null;
  boundary_nodes: string;
  thickness: number;
  openings: string;
  span_direction: number;
  mesh_size: number | null;
  is_meshed: number;
  is_diaphragm: number;
  diaphragm_type: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ROW CONVERTERS
// ============================================================

export function nodeRowToNode(row: NodeRow): StructuralNode {
  return {
    id: row.id,
    project_id: row.project_id,
    story_id: row.story_id,
    name: row.name,
    x: row.x,
    y: row.y,
    z: row.z,
    support_type: row.support_type as SupportType,
    restraints: JSON.parse(row.restraints),
    spring_stiffness: JSON.parse(row.spring_stiffness || '{}'),
    prescribed_displacements: JSON.parse(row.prescribed_displacements || '{}'),
    mass: JSON.parse(row.mass || '{}'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function beamRowToBeam(row: BeamRow): Beam {
  return {
    id: row.id,
    project_id: row.project_id,
    story_id: row.story_id,
    name: row.name,
    node_i_id: row.node_i_id,
    node_j_id: row.node_j_id,
    section_id: row.section_id,
    material_id: row.material_id,
    rotation_angle: row.rotation_angle,
    releases_i: JSON.parse(row.releases_i),
    releases_j: JSON.parse(row.releases_j),
    offset_i: JSON.parse(row.offset_i),
    offset_j: JSON.parse(row.offset_j),
    rigid_zone_i: row.rigid_zone_i,
    rigid_zone_j: row.rigid_zone_j,
    unbraced_length_major: row.unbraced_length_major,
    unbraced_length_minor: row.unbraced_length_minor,
    unbraced_length_ltb: row.unbraced_length_ltb,
    cb: row.cb,
    camber: row.camber,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function columnRowToColumn(row: ColumnRow): Column {
  return {
    id: row.id,
    project_id: row.project_id,
    story_id: row.story_id,
    name: row.name,
    node_i_id: row.node_i_id,
    node_j_id: row.node_j_id,
    section_id: row.section_id,
    material_id: row.material_id,
    rotation_angle: row.rotation_angle,
    releases_i: JSON.parse(row.releases_i),
    releases_j: JSON.parse(row.releases_j),
    offset_i: JSON.parse(row.offset_i),
    offset_j: JSON.parse(row.offset_j),
    k_major: row.k_major,
    k_minor: row.k_minor,
    unbraced_length_major: row.unbraced_length_major,
    unbraced_length_minor: row.unbraced_length_minor,
    splice_location: row.splice_location,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function braceRowToBrace(row: BraceRow): Brace {
  return {
    id: row.id,
    project_id: row.project_id,
    story_id: row.story_id,
    name: row.name,
    node_i_id: row.node_i_id,
    node_j_id: row.node_j_id,
    section_id: row.section_id,
    material_id: row.material_id,
    rotation_angle: row.rotation_angle,
    brace_type: row.brace_type as BraceType,
    releases_i: JSON.parse(row.releases_i),
    releases_j: JSON.parse(row.releases_j),
    offset_i: JSON.parse(row.offset_i),
    offset_j: JSON.parse(row.offset_j),
    k: row.k,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function wallRowToWall(row: WallRow): Wall {
  return {
    id: row.id,
    project_id: row.project_id,
    story_id: row.story_id,
    name: row.name,
    wall_type: row.wall_type as WallType,
    material_type: row.material_type as MaterialType,
    material_id: row.material_id,
    corner_nodes: JSON.parse(row.corner_nodes),
    thickness: row.thickness,
    openings: JSON.parse(row.openings || '[]'),
    pier_label: row.pier_label,
    spandrel_label: row.spandrel_label,
    mesh_size: row.mesh_size,
    is_meshed: Boolean(row.is_meshed),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function slabRowToSlab(row: SlabRow): Slab {
  return {
    id: row.id,
    project_id: row.project_id,
    story_id: row.story_id,
    name: row.name,
    slab_type: row.slab_type as SlabType,
    material_type: row.material_type as MaterialType,
    material_id: row.material_id,
    boundary_nodes: JSON.parse(row.boundary_nodes),
    thickness: row.thickness,
    openings: JSON.parse(row.openings || '[]'),
    span_direction: row.span_direction,
    mesh_size: row.mesh_size,
    is_meshed: Boolean(row.is_meshed),
    is_diaphragm: Boolean(row.is_diaphragm),
    diaphragm_type: row.diaphragm_type as DiaphragmType,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ============================================================
// UNION TYPE FOR ALL STRUCTURAL ELEMENTS
// ============================================================

export type StructuralElement =
  | StructuralNode
  | Beam
  | Column
  | Brace
  | Wall
  | Slab
  | Truss
  | Connection
  | ShellElement;

export type FrameMember = Beam | Column | Brace;

// Type guard for frame members
export function isFrameMember(element: StructuralElement): element is FrameMember {
  return 'node_i_id' in element && 'node_j_id' in element && 'section_id' in element;
}

// Type guards for specific element types
export function isBeam(element: StructuralElement): element is Beam {
  return 'rigid_zone_i' in element && 'cb' in element;
}

export function isColumn(element: StructuralElement): element is Column {
  return 'k_major' in element && 'k_minor' in element;
}

export function isBrace(element: StructuralElement): element is Brace {
  return 'brace_type' in element && 'k' in element;
}

export function isWall(element: StructuralElement): element is Wall {
  return 'wall_type' in element && 'corner_nodes' in element;
}

export function isSlab(element: StructuralElement): element is Slab {
  return 'slab_type' in element && 'boundary_nodes' in element;
}

export function isNode(element: StructuralElement): element is StructuralNode {
  return 'support_type' in element && 'restraints' in element && !('node_i_id' in element);
}
