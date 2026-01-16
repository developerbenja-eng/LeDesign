import { nanoid } from 'nanoid';
import {
  ID_PREFIXES,
  Restraints,
  EndReleases,
  EndOffset,
  SpringStiffness,
  NodalMass,
} from './types/core';
import {
  StructuralProject,
  CreateStructuralProjectInput,
  Building,
  CreateBuildingInput,
  Story,
  CreateStoryInput,
} from './types/project';
import {
  StructuralNode,
  CreateNodeInput,
  Beam,
  CreateBeamInput,
  Column,
  CreateColumnInput,
  Brace,
  CreateBraceInput,
  Wall,
  CreateWallInput,
  Slab,
  CreateSlabInput,
  Truss,
  CreateTrussInput,
  Connection,
  CreateConnectionInput,
} from './types/elements';
import {
  Material,
  CreateMaterialInput,
  Section,
  CreateSectionInput,
} from './types/materials';
import {
  LoadCase,
  CreateLoadCaseInput,
  LoadCombination,
  CreateLoadCombinationInput,
  PointLoad,
  CreatePointLoadInput,
  MemberLoad,
  CreateMemberLoadInput,
  AreaLoad,
  CreateAreaLoadInput,
  ResponseSpectrum,
  CreateResponseSpectrumInput,
  TimeHistory,
  CreateTimeHistoryInput,
} from './types/loads';
import {
  AnalysisRun,
  CreateAnalysisRunInput,
} from './types/results';

// ============================================================
// ID GENERATION
// ============================================================

export function generateId(prefix: string): string {
  return `${prefix}${nanoid(12)}`;
}

export function generateProjectId(): string {
  return generateId(ID_PREFIXES.project);
}

export function generateBuildingId(): string {
  return generateId(ID_PREFIXES.building);
}

export function generateStoryId(): string {
  return generateId(ID_PREFIXES.story);
}

export function generateNodeId(): string {
  return generateId(ID_PREFIXES.node);
}

export function generateBeamId(): string {
  return generateId(ID_PREFIXES.beam);
}

export function generateColumnId(): string {
  return generateId(ID_PREFIXES.column);
}

export function generateBraceId(): string {
  return generateId(ID_PREFIXES.brace);
}

export function generateWallId(): string {
  return generateId(ID_PREFIXES.wall);
}

export function generateSlabId(): string {
  return generateId(ID_PREFIXES.slab);
}

export function generateTrussId(): string {
  return generateId(ID_PREFIXES.truss);
}

export function generateConnectionId(): string {
  return generateId(ID_PREFIXES.connection);
}

export function generateShellElementId(): string {
  return generateId(ID_PREFIXES.shellElement);
}

export function generateMaterialId(): string {
  return generateId(ID_PREFIXES.material);
}

export function generateSectionId(): string {
  return generateId(ID_PREFIXES.section);
}

export function generateLoadCaseId(): string {
  return generateId(ID_PREFIXES.loadCase);
}

export function generateLoadCombinationId(): string {
  return generateId(ID_PREFIXES.loadCombination);
}

export function generatePointLoadId(): string {
  return generateId(ID_PREFIXES.pointLoad);
}

export function generateMemberLoadId(): string {
  return generateId(ID_PREFIXES.memberLoad);
}

export function generateAreaLoadId(): string {
  return generateId(ID_PREFIXES.areaLoad);
}

export function generateResponseSpectrumId(): string {
  return generateId(ID_PREFIXES.responseSpectrum);
}

export function generateTimeHistoryId(): string {
  return generateId(ID_PREFIXES.timeHistory);
}

export function generateAnalysisRunId(): string {
  return generateId(ID_PREFIXES.analysisRun);
}

export function generateRebarConfigId(): string {
  return generateId(ID_PREFIXES.rebarConfig);
}

export function generateNodeResultId(): string {
  return generateId(ID_PREFIXES.nodeResult);
}

export function generateMemberResultId(): string {
  return generateId(ID_PREFIXES.memberResult);
}

export function generateModalResultId(): string {
  return generateId(ID_PREFIXES.modalResult);
}

export function generateModeShapeId(): string {
  return generateId(ID_PREFIXES.modeShape);
}

export function generateDesignResultId(): string {
  return generateId(ID_PREFIXES.designResult);
}

export function generateStoryDriftId(): string {
  return generateId(ID_PREFIXES.storyDrift);
}

// ============================================================
// DEFAULT VALUES
// ============================================================

export const DEFAULT_RESTRAINTS: Restraints = {
  dx: false,
  dy: false,
  dz: false,
  rx: false,
  ry: false,
  rz: false,
};

export const FIXED_RESTRAINTS: Restraints = {
  dx: true,
  dy: true,
  dz: true,
  rx: true,
  ry: true,
  rz: true,
};

export const PINNED_RESTRAINTS: Restraints = {
  dx: true,
  dy: true,
  dz: true,
  rx: false,
  ry: false,
  rz: false,
};

export const DEFAULT_END_RELEASES: EndReleases = {
  fx: false,
  fy: false,
  fz: false,
  mx: false,
  my: false,
  mz: false,
};

export const PINNED_END_RELEASES: EndReleases = {
  fx: false,
  fy: false,
  fz: false,
  mx: true,
  my: true,
  mz: true,
};

export const DEFAULT_END_OFFSET: EndOffset = {
  dx: 0,
  dy: 0,
  dz: 0,
};

export const DEFAULT_SPRING_STIFFNESS: SpringStiffness = {};

export const DEFAULT_NODAL_MASS: NodalMass = {};

// ============================================================
// TIMESTAMP HELPERS
// ============================================================

function now(): string {
  return new Date().toISOString();
}

// ============================================================
// PROJECT FACTORY
// ============================================================

export function createStructuralProject(input: CreateStructuralProjectInput): StructuralProject {
  const timestamp = now();
  return {
    id: generateProjectId(),
    name: input.name,
    description: input.description || null,
    created_by: input.created_by,
    created_at: timestamp,
    updated_at: timestamp,
    design_code: input.design_code || 'AISC360',
    seismic_code: input.seismic_code || 'ASCE7',
    wind_code: input.wind_code || 'ASCE7',
    concrete_code: input.concrete_code || 'ACI318',
    length_unit: input.length_unit || 'ft',
    force_unit: input.force_unit || 'kip',
    moment_unit: input.moment_unit || 'kip-ft',
    stress_unit: input.stress_unit || 'ksi',
    temperature_unit: input.temperature_unit || 'F',
    settings: input.settings || {},
  };
}

// ============================================================
// BUILDING FACTORY
// ============================================================

export function createBuilding(input: CreateBuildingInput): Building {
  const timestamp = now();
  return {
    id: generateBuildingId(),
    project_id: input.project_id,
    name: input.name,
    description: input.description || null,
    created_at: timestamp,
    updated_at: timestamp,
    base_elevation: input.base_elevation ?? 0,
    grid_angle: input.grid_angle ?? 0,
    seismic_params: input.seismic_params || {},
    wind_params: input.wind_params || {},
  };
}

// ============================================================
// STORY FACTORY
// ============================================================

export function createStory(input: CreateStoryInput): Story {
  const timestamp = now();
  return {
    id: generateStoryId(),
    building_id: input.building_id,
    name: input.name,
    story_number: input.story_number,
    elevation: input.elevation,
    height: input.height,
    is_basement: input.is_basement ?? false,
    is_roof: input.is_roof ?? false,
    master_story_id: input.master_story_id || null,
    is_master: input.is_master ?? false,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// NODE FACTORY
// ============================================================

export function createNode(input: CreateNodeInput): StructuralNode {
  const timestamp = now();
  return {
    id: generateNodeId(),
    project_id: input.project_id,
    story_id: input.story_id || null,
    name: input.name || null,
    x: input.x,
    y: input.y,
    z: input.z,
    support_type: input.support_type || 'free',
    restraints: { ...DEFAULT_RESTRAINTS, ...input.restraints },
    spring_stiffness: { ...DEFAULT_SPRING_STIFFNESS, ...input.spring_stiffness },
    prescribed_displacements: input.prescribed_displacements || {},
    mass: { ...DEFAULT_NODAL_MASS, ...input.mass },
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// BEAM FACTORY
// ============================================================

export function createBeam(input: CreateBeamInput): Beam {
  const timestamp = now();
  return {
    id: generateBeamId(),
    project_id: input.project_id,
    story_id: input.story_id || null,
    name: input.name || null,
    node_i_id: input.node_i_id,
    node_j_id: input.node_j_id,
    section_id: input.section_id,
    material_id: input.material_id || null,
    rotation_angle: input.rotation_angle ?? 0,
    releases_i: { ...DEFAULT_END_RELEASES, ...input.releases_i },
    releases_j: { ...DEFAULT_END_RELEASES, ...input.releases_j },
    offset_i: { ...DEFAULT_END_OFFSET, ...input.offset_i },
    offset_j: { ...DEFAULT_END_OFFSET, ...input.offset_j },
    rigid_zone_i: input.rigid_zone_i ?? 0,
    rigid_zone_j: input.rigid_zone_j ?? 0,
    unbraced_length_major: input.unbraced_length_major ?? null,
    unbraced_length_minor: input.unbraced_length_minor ?? null,
    unbraced_length_ltb: input.unbraced_length_ltb ?? null,
    cb: input.cb ?? 1.0,
    camber: input.camber ?? 0,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// COLUMN FACTORY
// ============================================================

export function createColumn(input: CreateColumnInput): Column {
  const timestamp = now();
  return {
    id: generateColumnId(),
    project_id: input.project_id,
    story_id: input.story_id || null,
    name: input.name || null,
    node_i_id: input.node_i_id,
    node_j_id: input.node_j_id,
    section_id: input.section_id,
    material_id: input.material_id || null,
    rotation_angle: input.rotation_angle ?? 0,
    releases_i: { ...DEFAULT_END_RELEASES, ...input.releases_i },
    releases_j: { ...DEFAULT_END_RELEASES, ...input.releases_j },
    offset_i: { ...DEFAULT_END_OFFSET, ...input.offset_i },
    offset_j: { ...DEFAULT_END_OFFSET, ...input.offset_j },
    k_major: input.k_major ?? 1.0,
    k_minor: input.k_minor ?? 1.0,
    unbraced_length_major: input.unbraced_length_major ?? null,
    unbraced_length_minor: input.unbraced_length_minor ?? null,
    splice_location: input.splice_location ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// BRACE FACTORY
// ============================================================

export function createBrace(input: CreateBraceInput): Brace {
  const timestamp = now();
  return {
    id: generateBraceId(),
    project_id: input.project_id,
    story_id: input.story_id || null,
    name: input.name || null,
    node_i_id: input.node_i_id,
    node_j_id: input.node_j_id,
    section_id: input.section_id,
    material_id: input.material_id || null,
    rotation_angle: input.rotation_angle ?? 0,
    brace_type: input.brace_type || 'diagonal',
    releases_i: { ...PINNED_END_RELEASES, ...input.releases_i },
    releases_j: { ...PINNED_END_RELEASES, ...input.releases_j },
    offset_i: { ...DEFAULT_END_OFFSET, ...input.offset_i },
    offset_j: { ...DEFAULT_END_OFFSET, ...input.offset_j },
    k: input.k ?? 1.0,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// WALL FACTORY
// ============================================================

export function createWall(input: CreateWallInput): Wall {
  const timestamp = now();
  return {
    id: generateWallId(),
    project_id: input.project_id,
    story_id: input.story_id || null,
    name: input.name || null,
    wall_type: input.wall_type || 'shear',
    material_type: input.material_type || 'concrete',
    material_id: input.material_id || null,
    corner_nodes: input.corner_nodes,
    thickness: input.thickness,
    openings: input.openings || [],
    pier_label: input.pier_label || null,
    spandrel_label: input.spandrel_label || null,
    mesh_size: input.mesh_size || null,
    is_meshed: false,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// SLAB FACTORY
// ============================================================

export function createSlab(input: CreateSlabInput): Slab {
  const timestamp = now();
  return {
    id: generateSlabId(),
    project_id: input.project_id,
    story_id: input.story_id || null,
    name: input.name || null,
    slab_type: input.slab_type || 'two-way',
    material_type: input.material_type || 'concrete',
    material_id: input.material_id || null,
    boundary_nodes: input.boundary_nodes,
    thickness: input.thickness,
    openings: input.openings || [],
    span_direction: input.span_direction ?? 0,
    mesh_size: input.mesh_size || null,
    is_meshed: false,
    is_diaphragm: input.is_diaphragm ?? true,
    diaphragm_type: input.diaphragm_type || 'rigid',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// TRUSS FACTORY
// ============================================================

export function createTruss(input: CreateTrussInput): Truss {
  const timestamp = now();
  return {
    id: generateTrussId(),
    project_id: input.project_id,
    story_id: input.story_id || null,
    name: input.name || null,
    truss_type: input.truss_type || 'warren',
    node_start_id: input.node_start_id,
    node_end_id: input.node_end_id,
    depth: input.depth,
    num_panels: input.num_panels,
    top_chord_section_id: input.top_chord_section_id,
    bottom_chord_section_id: input.bottom_chord_section_id,
    diagonal_section_id: input.diagonal_section_id,
    vertical_section_id: input.vertical_section_id || null,
    material_id: input.material_id || null,
    generated_members: [],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// CONNECTION FACTORY
// ============================================================

export function createConnection(input: CreateConnectionInput): Connection {
  const timestamp = now();
  return {
    id: generateConnectionId(),
    project_id: input.project_id,
    name: input.name || null,
    connection_type: input.connection_type,
    primary_member_id: input.primary_member_id || null,
    primary_member_type: input.primary_member_type || null,
    secondary_member_id: input.secondary_member_id || null,
    secondary_member_type: input.secondary_member_type || null,
    node_id: input.node_id || null,
    details: input.details || {},
    design_capacity: null,
    demand_capacity_ratio: null,
    is_adequate: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// MATERIAL FACTORY
// ============================================================

export function createMaterial(input: CreateMaterialInput): Material {
  const timestamp = now();
  return {
    id: generateMaterialId(),
    project_id: input.project_id || null,
    name: input.name,
    material_type: input.material_type,
    is_library: input.is_library ?? false,
    elastic_modulus: input.elastic_modulus,
    shear_modulus: input.shear_modulus ?? null,
    poisson_ratio: input.poisson_ratio ?? 0.3,
    density: input.density,
    yield_strength: input.yield_strength ?? null,
    ultimate_strength: input.ultimate_strength ?? null,
    thermal_coefficient: input.thermal_coefficient ?? null,
    properties: input.properties || {},
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// SECTION FACTORY
// ============================================================

export function createSection(input: CreateSectionInput): Section {
  const timestamp = now();
  return {
    id: generateSectionId(),
    project_id: input.project_id || null,
    name: input.name,
    section_type: input.section_type,
    material_id: input.material_id || null,
    is_library: input.is_library ?? false,
    area: input.area ?? null,
    ix: input.ix ?? null,
    iy: input.iy ?? null,
    iz: input.iz ?? null,
    sx: input.sx ?? null,
    sy: input.sy ?? null,
    zx: input.zx ?? null,
    zy: input.zy ?? null,
    rx: input.rx ?? null,
    ry: input.ry ?? null,
    j: input.j ?? null,
    cw: input.cw ?? null,
    dimensions: input.dimensions || {},
    rebar_config_id: input.rebar_config_id || null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// LOAD CASE FACTORY
// ============================================================

export function createLoadCase(input: CreateLoadCaseInput): LoadCase {
  const timestamp = now();
  return {
    id: generateLoadCaseId(),
    project_id: input.project_id,
    name: input.name,
    load_type: input.load_type,
    self_weight_multiplier: input.self_weight_multiplier ?? 0,
    direction: input.direction || null,
    eccentricity: input.eccentricity ?? 0.05,
    spectrum_id: input.spectrum_id || null,
    scale_factor: input.scale_factor ?? 1.0,
    time_history_id: input.time_history_id || null,
    modal_combination: input.modal_combination || 'CQC',
    directional_combination: input.directional_combination || 'SRSS',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// LOAD COMBINATION FACTORY
// ============================================================

export function createLoadCombination(input: CreateLoadCombinationInput): LoadCombination {
  const timestamp = now();
  return {
    id: generateLoadCombinationId(),
    project_id: input.project_id,
    name: input.name,
    combination_type: input.combination_type || 'linear',
    design_type: input.design_type || 'strength',
    factors: input.factors,
    is_envelope: input.is_envelope ?? false,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

// ============================================================
// POINT LOAD FACTORY
// ============================================================

export function createPointLoad(input: CreatePointLoadInput): PointLoad {
  const timestamp = now();
  return {
    id: generatePointLoadId(),
    project_id: input.project_id,
    load_case_id: input.load_case_id,
    node_id: input.node_id,
    fx: input.fx ?? 0,
    fy: input.fy ?? 0,
    fz: input.fz ?? 0,
    mx: input.mx ?? 0,
    my: input.my ?? 0,
    mz: input.mz ?? 0,
    is_global: input.is_global ?? true,
    created_at: timestamp,
  };
}

// ============================================================
// MEMBER LOAD FACTORY
// ============================================================

export function createMemberLoad(input: CreateMemberLoadInput): MemberLoad {
  const timestamp = now();
  return {
    id: generateMemberLoadId(),
    project_id: input.project_id,
    load_case_id: input.load_case_id,
    member_id: input.member_id,
    member_type: input.member_type,
    load_type: input.load_type,
    direction: input.direction,
    is_global: input.is_global ?? true,
    is_projected: input.is_projected ?? false,
    value_1: input.value_1,
    value_2: input.value_2 ?? null,
    distance_1: input.distance_1 ?? 0,
    distance_2: input.distance_2 ?? null,
    is_relative: input.is_relative ?? true,
    created_at: timestamp,
  };
}

// ============================================================
// AREA LOAD FACTORY
// ============================================================

export function createAreaLoad(input: CreateAreaLoadInput): AreaLoad {
  const timestamp = now();
  return {
    id: generateAreaLoadId(),
    project_id: input.project_id,
    load_case_id: input.load_case_id,
    element_id: input.element_id,
    element_type: input.element_type,
    direction: input.direction || 'gravity',
    value: input.value,
    is_global: input.is_global ?? true,
    created_at: timestamp,
  };
}

// ============================================================
// RESPONSE SPECTRUM FACTORY
// ============================================================

export function createResponseSpectrum(input: CreateResponseSpectrumInput): ResponseSpectrum {
  const timestamp = now();
  return {
    id: generateResponseSpectrumId(),
    project_id: input.project_id || null,
    name: input.name,
    is_library: input.is_library ?? false,
    spectrum_type: input.spectrum_type || 'user',
    code_params: input.code_params || {},
    spectrum_points: input.spectrum_points || [],
    damping_ratio: input.damping_ratio ?? 0.05,
    created_at: timestamp,
  };
}

// ============================================================
// TIME HISTORY FACTORY
// ============================================================

export function createTimeHistory(input: CreateTimeHistoryInput): TimeHistory {
  const timestamp = now();
  return {
    id: generateTimeHistoryId(),
    project_id: input.project_id || null,
    name: input.name,
    is_library: input.is_library ?? false,
    function_type: input.function_type || 'acceleration',
    time_step: input.time_step,
    data_points: input.data_points,
    scale_factor: input.scale_factor ?? 1.0,
    source: input.source || null,
    created_at: timestamp,
  };
}

// ============================================================
// ANALYSIS RUN FACTORY
// ============================================================

export function createAnalysisRun(input: CreateAnalysisRunInput): AnalysisRun {
  const timestamp = now();
  return {
    id: generateAnalysisRunId(),
    project_id: input.project_id,
    name: input.name || null,
    analysis_type: input.analysis_type,
    status: 'pending',
    started_at: null,
    completed_at: null,
    combination_ids: input.combination_ids || [],
    settings: input.settings || {},
    messages: [],
    summary: {},
    created_at: timestamp,
  };
}

// ============================================================
// PREDEFINED MATERIALS
// ============================================================

export function createDefaultSteelMaterial(projectId?: string): Material {
  return createMaterial({
    project_id: projectId,
    name: 'A992 Steel',
    material_type: 'steel',
    elastic_modulus: 29000,     // ksi
    shear_modulus: 11200,       // ksi
    poisson_ratio: 0.3,
    density: 490,               // pcf
    yield_strength: 50,         // ksi
    ultimate_strength: 65,      // ksi
    thermal_coefficient: 6.5e-6,
    properties: {
      grade: 'A992',
      fy: 50,
      fu: 65,
    },
  });
}

export function createDefaultConcreteMaterial(projectId?: string): Material {
  return createMaterial({
    project_id: projectId,
    name: '4000 psi Concrete',
    material_type: 'concrete',
    elastic_modulus: 3605,      // ksi (57000 * sqrt(4000) / 1000)
    poisson_ratio: 0.2,
    density: 150,               // pcf
    properties: {
      fc: 4,                    // ksi
      fr: 0.474,                // ksi (7.5 * sqrt(4000) / 1000)
      lambda: 1.0,
      is_lightweight: false,
    },
  });
}

// ============================================================
// HELPER: Create Standard Node Support
// ============================================================

export function createFixedNode(input: Omit<CreateNodeInput, 'support_type' | 'restraints'>): StructuralNode {
  return createNode({
    ...input,
    support_type: 'fixed',
    restraints: FIXED_RESTRAINTS,
  });
}

export function createPinnedNode(input: Omit<CreateNodeInput, 'support_type' | 'restraints'>): StructuralNode {
  return createNode({
    ...input,
    support_type: 'pinned',
    restraints: PINNED_RESTRAINTS,
  });
}

export function createFreeNode(input: Omit<CreateNodeInput, 'support_type' | 'restraints'>): StructuralNode {
  return createNode({
    ...input,
    support_type: 'free',
    restraints: DEFAULT_RESTRAINTS,
  });
}
