import { getDb } from './turso';

export async function runStructuralMigrations(): Promise<void> {
  const db = getDb();

  // ============================================================
  // CORE HIERARCHY TABLES
  // ============================================================

  // Structural Projects
  await db.execute(`
    CREATE TABLE IF NOT EXISTS structural_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      -- Project settings
      design_code TEXT NOT NULL DEFAULT 'AISC360',
      seismic_code TEXT DEFAULT 'ASCE7',
      wind_code TEXT DEFAULT 'ASCE7',
      concrete_code TEXT DEFAULT 'ACI318',

      -- Units system
      length_unit TEXT NOT NULL DEFAULT 'ft',
      force_unit TEXT NOT NULL DEFAULT 'kip',
      moment_unit TEXT NOT NULL DEFAULT 'kip-ft',
      stress_unit TEXT NOT NULL DEFAULT 'ksi',
      temperature_unit TEXT NOT NULL DEFAULT 'F',

      -- Global settings (JSON)
      settings TEXT DEFAULT '{}',

      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Buildings within project
  await db.execute(`
    CREATE TABLE IF NOT EXISTS buildings (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      -- Building geometry
      base_elevation REAL NOT NULL DEFAULT 0,
      grid_angle REAL NOT NULL DEFAULT 0,

      -- Seismic parameters (JSON)
      seismic_params TEXT DEFAULT '{}',

      -- Wind parameters (JSON)
      wind_params TEXT DEFAULT '{}',

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE
    )
  `);

  // Stories within building
  await db.execute(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      building_id TEXT NOT NULL,
      name TEXT NOT NULL,
      story_number INTEGER NOT NULL,
      elevation REAL NOT NULL,
      height REAL NOT NULL,
      is_basement INTEGER NOT NULL DEFAULT 0,
      is_roof INTEGER NOT NULL DEFAULT 0,

      -- Story properties
      master_story_id TEXT,
      is_master INTEGER NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
      FOREIGN KEY (master_story_id) REFERENCES stories(id)
    )
  `);

  // ============================================================
  // MATERIALS & SECTIONS TABLES
  // ============================================================

  // Materials (project-specific and library)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      material_type TEXT NOT NULL,
      is_library INTEGER NOT NULL DEFAULT 0,

      -- Mechanical properties
      elastic_modulus REAL NOT NULL,
      shear_modulus REAL,
      poisson_ratio REAL NOT NULL DEFAULT 0.3,
      density REAL NOT NULL,
      yield_strength REAL,
      ultimate_strength REAL,

      -- Thermal properties
      thermal_coefficient REAL,

      -- Material-specific properties (JSON)
      properties TEXT DEFAULT '{}',

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE
    )
  `);

  // Steel grades library
  await db.execute(`
    CREATE TABLE IF NOT EXISTS steel_grades (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      standard TEXT NOT NULL,
      fy REAL NOT NULL,
      fu REAL NOT NULL,
      elastic_modulus REAL NOT NULL DEFAULT 29000,
      density REAL NOT NULL DEFAULT 490,
      description TEXT
    )
  `);

  // Concrete grades library
  await db.execute(`
    CREATE TABLE IF NOT EXISTS concrete_grades (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      fc REAL NOT NULL,
      density REAL NOT NULL DEFAULT 150,
      elastic_modulus REAL,
      description TEXT
    )
  `);

  // Rebar grades library
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rebar_grades (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      fy REAL NOT NULL,
      fu REAL,
      elastic_modulus REAL NOT NULL DEFAULT 29000,
      description TEXT
    )
  `);

  // Sections (project-specific and library)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      section_type TEXT NOT NULL,
      material_id TEXT,
      is_library INTEGER NOT NULL DEFAULT 0,

      -- Geometric properties
      area REAL,
      ix REAL,
      iy REAL,
      iz REAL,
      sx REAL,
      sy REAL,
      zx REAL,
      zy REAL,
      rx REAL,
      ry REAL,
      j REAL,
      cw REAL,

      -- Dimensions (JSON based on section_type)
      dimensions TEXT DEFAULT '{}',

      -- For concrete sections
      rebar_config_id TEXT,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // AISC shapes database
  await db.execute(`
    CREATE TABLE IF NOT EXISTS aisc_shapes (
      id TEXT PRIMARY KEY,
      aisc_name TEXT NOT NULL UNIQUE,
      shape_type TEXT NOT NULL,

      -- Dimensions
      d REAL,
      bf REAL,
      tw REAL,
      tf REAL,
      k REAL,
      k1 REAL,

      -- Section properties
      area REAL NOT NULL,
      ix REAL NOT NULL,
      iy REAL NOT NULL,
      sx REAL NOT NULL,
      sy REAL NOT NULL,
      zx REAL NOT NULL,
      zy REAL NOT NULL,
      rx REAL NOT NULL,
      ry REAL NOT NULL,
      j REAL NOT NULL,
      cw REAL,

      -- Weight
      weight_per_ft REAL NOT NULL,

      -- Compactness
      bf_2tf REAL,
      h_tw REAL,

      -- Additional properties (JSON)
      properties TEXT DEFAULT '{}'
    )
  `);

  // Rebar configurations for concrete sections
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rebar_configurations (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      section_id TEXT,

      -- Rebar layout (JSON array of bar positions)
      longitudinal_bars TEXT NOT NULL DEFAULT '[]',
      transverse_bars TEXT DEFAULT '{}',

      -- Cover
      cover_top REAL NOT NULL DEFAULT 1.5,
      cover_bottom REAL NOT NULL DEFAULT 1.5,
      cover_sides REAL NOT NULL DEFAULT 1.5,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
    )
  `);

  // ============================================================
  // STRUCTURAL ELEMENTS TABLES
  // ============================================================

  // Nodes (connection points)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      story_id TEXT,
      name TEXT,

      -- Coordinates
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,

      -- Support conditions
      support_type TEXT NOT NULL DEFAULT 'free',
      restraints TEXT DEFAULT '{"dx":false,"dy":false,"dz":false,"rx":false,"ry":false,"rz":false}',

      -- Spring stiffnesses (if support_type is 'spring')
      spring_stiffness TEXT DEFAULT '{}',

      -- Prescribed displacements
      prescribed_displacements TEXT DEFAULT '{}',

      -- Mass for dynamic analysis
      mass TEXT DEFAULT '{}',

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (story_id) REFERENCES stories(id)
    )
  `);

  // Beams (horizontal frame members)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS beams (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      story_id TEXT,
      name TEXT,

      -- Connectivity
      node_i_id TEXT NOT NULL,
      node_j_id TEXT NOT NULL,

      -- Section and material
      section_id TEXT NOT NULL,
      material_id TEXT,

      -- Member properties
      rotation_angle REAL NOT NULL DEFAULT 0,

      -- End releases (JSON)
      releases_i TEXT DEFAULT '{"mx":false,"my":false,"mz":false}',
      releases_j TEXT DEFAULT '{"mx":false,"my":false,"mz":false}',

      -- End offsets (JSON)
      offset_i TEXT DEFAULT '{"dx":0,"dy":0,"dz":0}',
      offset_j TEXT DEFAULT '{"dx":0,"dy":0,"dz":0}',

      -- Rigid end zones
      rigid_zone_i REAL DEFAULT 0,
      rigid_zone_j REAL DEFAULT 0,

      -- Design parameters
      unbraced_length_major REAL,
      unbraced_length_minor REAL,
      unbraced_length_ltb REAL,
      cb REAL DEFAULT 1.0,

      -- Camber
      camber REAL DEFAULT 0,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (node_i_id) REFERENCES nodes(id),
      FOREIGN KEY (node_j_id) REFERENCES nodes(id),
      FOREIGN KEY (section_id) REFERENCES sections(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // Columns (vertical frame members)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      story_id TEXT,
      name TEXT,

      -- Connectivity
      node_i_id TEXT NOT NULL,
      node_j_id TEXT NOT NULL,

      -- Section and material
      section_id TEXT NOT NULL,
      material_id TEXT,

      -- Member properties
      rotation_angle REAL NOT NULL DEFAULT 0,

      -- End releases (JSON)
      releases_i TEXT DEFAULT '{"mx":false,"my":false,"mz":false}',
      releases_j TEXT DEFAULT '{"mx":false,"my":false,"mz":false}',

      -- End offsets (JSON)
      offset_i TEXT DEFAULT '{"dx":0,"dy":0,"dz":0}',
      offset_j TEXT DEFAULT '{"dx":0,"dy":0,"dz":0}',

      -- Effective length factors
      k_major REAL DEFAULT 1.0,
      k_minor REAL DEFAULT 1.0,

      -- Unbraced lengths
      unbraced_length_major REAL,
      unbraced_length_minor REAL,

      -- Splice location (ratio from node_i)
      splice_location REAL,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (node_i_id) REFERENCES nodes(id),
      FOREIGN KEY (node_j_id) REFERENCES nodes(id),
      FOREIGN KEY (section_id) REFERENCES sections(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // Braces (diagonal members)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS braces (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      story_id TEXT,
      name TEXT,

      -- Connectivity
      node_i_id TEXT NOT NULL,
      node_j_id TEXT NOT NULL,

      -- Section and material
      section_id TEXT NOT NULL,
      material_id TEXT,

      -- Member properties
      rotation_angle REAL NOT NULL DEFAULT 0,
      brace_type TEXT NOT NULL DEFAULT 'diagonal',

      -- End releases (JSON)
      releases_i TEXT DEFAULT '{"mx":true,"my":true,"mz":true}',
      releases_j TEXT DEFAULT '{"mx":true,"my":true,"mz":true}',

      -- End offsets (JSON)
      offset_i TEXT DEFAULT '{"dx":0,"dy":0,"dz":0}',
      offset_j TEXT DEFAULT '{"dx":0,"dy":0,"dz":0}',

      -- Effective length factor
      k REAL DEFAULT 1.0,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (node_i_id) REFERENCES nodes(id),
      FOREIGN KEY (node_j_id) REFERENCES nodes(id),
      FOREIGN KEY (section_id) REFERENCES sections(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // Walls (shear/bearing walls)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS walls (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      story_id TEXT,
      name TEXT,

      -- Wall type
      wall_type TEXT NOT NULL DEFAULT 'shear',
      material_type TEXT NOT NULL DEFAULT 'concrete',
      material_id TEXT,

      -- Geometry (JSON array of corner nodes)
      corner_nodes TEXT NOT NULL DEFAULT '[]',
      thickness REAL NOT NULL,

      -- Openings (JSON array)
      openings TEXT DEFAULT '[]',

      -- Pier/spandrel assignment
      pier_label TEXT,
      spandrel_label TEXT,

      -- Meshing parameters
      mesh_size REAL,
      is_meshed INTEGER NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // Slabs (floor/roof plates)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS slabs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      story_id TEXT,
      name TEXT,

      -- Slab type
      slab_type TEXT NOT NULL DEFAULT 'one-way',
      material_type TEXT NOT NULL DEFAULT 'concrete',
      material_id TEXT,

      -- Geometry (JSON array of boundary nodes)
      boundary_nodes TEXT NOT NULL DEFAULT '[]',
      thickness REAL NOT NULL,

      -- Openings (JSON array)
      openings TEXT DEFAULT '[]',

      -- Load distribution
      span_direction REAL DEFAULT 0,

      -- Meshing parameters
      mesh_size REAL,
      is_meshed INTEGER NOT NULL DEFAULT 0,

      -- Diaphragm properties
      is_diaphragm INTEGER NOT NULL DEFAULT 1,
      diaphragm_type TEXT DEFAULT 'rigid',

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // Trusses (generates multiple members)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS trusses (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      story_id TEXT,
      name TEXT,

      -- Truss type
      truss_type TEXT NOT NULL DEFAULT 'warren',

      -- Geometry
      node_start_id TEXT NOT NULL,
      node_end_id TEXT NOT NULL,
      depth REAL NOT NULL,
      num_panels INTEGER NOT NULL,

      -- Sections
      top_chord_section_id TEXT NOT NULL,
      bottom_chord_section_id TEXT NOT NULL,
      diagonal_section_id TEXT NOT NULL,
      vertical_section_id TEXT,

      -- Material
      material_id TEXT,

      -- Generated member IDs (JSON array)
      generated_members TEXT DEFAULT '[]',

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (node_start_id) REFERENCES nodes(id),
      FOREIGN KEY (node_end_id) REFERENCES nodes(id)
    )
  `);

  // Connections
  await db.execute(`
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT,

      -- Connection type
      connection_type TEXT NOT NULL,

      -- Connected elements
      primary_member_id TEXT,
      primary_member_type TEXT,
      secondary_member_id TEXT,
      secondary_member_type TEXT,
      node_id TEXT,

      -- Connection details (JSON)
      details TEXT NOT NULL DEFAULT '{}',

      -- Design results
      design_capacity REAL,
      demand_capacity_ratio REAL,
      is_adequate INTEGER,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES nodes(id)
    )
  `);

  // Shell elements (for meshed walls/slabs)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shell_elements (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      parent_type TEXT NOT NULL,

      -- Element type
      element_type TEXT NOT NULL DEFAULT 'quad',

      -- Corner nodes (3 for tri, 4 for quad)
      node_1_id TEXT NOT NULL,
      node_2_id TEXT NOT NULL,
      node_3_id TEXT NOT NULL,
      node_4_id TEXT,

      -- Thickness
      thickness REAL NOT NULL,

      -- Material
      material_id TEXT,

      -- Local axes rotation
      local_axis_angle REAL DEFAULT 0,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (node_1_id) REFERENCES nodes(id),
      FOREIGN KEY (node_2_id) REFERENCES nodes(id),
      FOREIGN KEY (node_3_id) REFERENCES nodes(id),
      FOREIGN KEY (node_4_id) REFERENCES nodes(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // ============================================================
  // LOADS TABLES
  // ============================================================

  // Load cases
  await db.execute(`
    CREATE TABLE IF NOT EXISTS load_cases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      load_type TEXT NOT NULL,

      -- Load case properties
      self_weight_multiplier REAL DEFAULT 0,

      -- For seismic cases
      direction TEXT,
      eccentricity REAL DEFAULT 0.05,

      -- For response spectrum
      spectrum_id TEXT,
      scale_factor REAL DEFAULT 1.0,

      -- For time history
      time_history_id TEXT,

      -- Modal combination method
      modal_combination TEXT DEFAULT 'CQC',
      directional_combination TEXT DEFAULT 'SRSS',

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE
    )
  `);

  // Response spectra
  await db.execute(`
    CREATE TABLE IF NOT EXISTS response_spectra (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      is_library INTEGER NOT NULL DEFAULT 0,

      -- Spectrum type
      spectrum_type TEXT NOT NULL DEFAULT 'user',

      -- Code-based parameters (JSON)
      code_params TEXT DEFAULT '{}',

      -- User-defined spectrum points (JSON array of {period, acceleration})
      spectrum_points TEXT DEFAULT '[]',

      -- Damping ratio
      damping_ratio REAL NOT NULL DEFAULT 0.05,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE
    )
  `);

  // Time histories
  await db.execute(`
    CREATE TABLE IF NOT EXISTS time_histories (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      is_library INTEGER NOT NULL DEFAULT 0,

      -- Time history type
      function_type TEXT NOT NULL DEFAULT 'acceleration',

      -- Time step
      time_step REAL NOT NULL,

      -- Data points (JSON array of values)
      data_points TEXT NOT NULL DEFAULT '[]',

      -- Scale factor
      scale_factor REAL NOT NULL DEFAULT 1.0,

      -- Source
      source TEXT,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE
    )
  `);

  // Point loads (nodal forces/moments)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS point_loads (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      load_case_id TEXT NOT NULL,
      node_id TEXT NOT NULL,

      -- Forces
      fx REAL DEFAULT 0,
      fy REAL DEFAULT 0,
      fz REAL DEFAULT 0,

      -- Moments
      mx REAL DEFAULT 0,
      my REAL DEFAULT 0,
      mz REAL DEFAULT 0,

      -- Coordinate system
      is_global INTEGER NOT NULL DEFAULT 1,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (load_case_id) REFERENCES load_cases(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `);

  // Member loads (distributed/concentrated on beams/columns/braces)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS member_loads (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      load_case_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      member_type TEXT NOT NULL,

      -- Load type
      load_type TEXT NOT NULL,
      direction TEXT NOT NULL,

      -- Coordinate system
      is_global INTEGER NOT NULL DEFAULT 1,
      is_projected INTEGER NOT NULL DEFAULT 0,

      -- Load values (interpretation depends on load_type)
      value_1 REAL NOT NULL,
      value_2 REAL,
      distance_1 REAL DEFAULT 0,
      distance_2 REAL,
      is_relative INTEGER NOT NULL DEFAULT 1,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (load_case_id) REFERENCES load_cases(id) ON DELETE CASCADE
    )
  `);

  // Area loads (surface loads on slabs/walls)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS area_loads (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      load_case_id TEXT NOT NULL,
      element_id TEXT NOT NULL,
      element_type TEXT NOT NULL,

      -- Load direction
      direction TEXT NOT NULL DEFAULT 'gravity',

      -- Load value (force per unit area)
      value REAL NOT NULL,

      -- Coordinate system
      is_global INTEGER NOT NULL DEFAULT 1,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (load_case_id) REFERENCES load_cases(id) ON DELETE CASCADE
    )
  `);

  // Load combinations
  await db.execute(`
    CREATE TABLE IF NOT EXISTS load_combinations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      combination_type TEXT NOT NULL DEFAULT 'linear',

      -- Design type
      design_type TEXT NOT NULL DEFAULT 'strength',

      -- Load case factors (JSON object {load_case_id: factor})
      factors TEXT NOT NULL DEFAULT '{}',

      -- For envelope combinations
      is_envelope INTEGER NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE
    )
  `);

  // ============================================================
  // ANALYSIS RESULTS TABLES
  // ============================================================

  // Analysis runs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS analysis_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT,

      -- Analysis type
      analysis_type TEXT NOT NULL,

      -- Status
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,

      -- Load combinations to run (JSON array of IDs)
      combination_ids TEXT DEFAULT '[]',

      -- Settings (JSON)
      settings TEXT DEFAULT '{}',

      -- Errors/warnings (JSON array)
      messages TEXT DEFAULT '[]',

      -- Summary (JSON)
      summary TEXT DEFAULT '{}',

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES structural_projects(id) ON DELETE CASCADE
    )
  `);

  // Modal analysis results
  await db.execute(`
    CREATE TABLE IF NOT EXISTS modal_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      mode_number INTEGER NOT NULL,

      -- Modal properties
      frequency REAL NOT NULL,
      period REAL NOT NULL,
      circular_frequency REAL NOT NULL,

      -- Mass participation
      mass_participation_x REAL NOT NULL,
      mass_participation_y REAL NOT NULL,
      mass_participation_z REAL NOT NULL,
      mass_participation_rx REAL NOT NULL,
      mass_participation_ry REAL NOT NULL,
      mass_participation_rz REAL NOT NULL,

      -- Cumulative participation
      cumulative_x REAL NOT NULL,
      cumulative_y REAL NOT NULL,
      cumulative_z REAL NOT NULL,

      -- Modal mass
      modal_mass REAL NOT NULL,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
    )
  `);

  // Mode shapes
  await db.execute(`
    CREATE TABLE IF NOT EXISTS mode_shapes (
      id TEXT PRIMARY KEY,
      modal_result_id TEXT NOT NULL,
      node_id TEXT NOT NULL,

      -- Displacements
      dx REAL NOT NULL,
      dy REAL NOT NULL,
      dz REAL NOT NULL,

      -- Rotations
      rx REAL NOT NULL,
      ry REAL NOT NULL,
      rz REAL NOT NULL,

      FOREIGN KEY (modal_result_id) REFERENCES modal_results(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `);

  // Node results (displacements, reactions)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS node_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      combination_id TEXT NOT NULL,
      node_id TEXT NOT NULL,

      -- Displacements
      dx REAL NOT NULL,
      dy REAL NOT NULL,
      dz REAL NOT NULL,

      -- Rotations
      rx REAL NOT NULL,
      ry REAL NOT NULL,
      rz REAL NOT NULL,

      -- Reactions (for supported nodes)
      reaction_fx REAL,
      reaction_fy REAL,
      reaction_fz REAL,
      reaction_mx REAL,
      reaction_my REAL,
      reaction_mz REAL,

      FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (combination_id) REFERENCES load_combinations(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `);

  // Member results (forces at stations)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS member_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      combination_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      member_type TEXT NOT NULL,
      station REAL NOT NULL,

      -- Forces
      axial REAL NOT NULL,
      shear_major REAL NOT NULL,
      shear_minor REAL NOT NULL,

      -- Moments
      torsion REAL NOT NULL,
      moment_major REAL NOT NULL,
      moment_minor REAL NOT NULL,

      -- Deflections
      deflection_major REAL,
      deflection_minor REAL,

      FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (combination_id) REFERENCES load_combinations(id) ON DELETE CASCADE
    )
  `);

  // Member envelopes (max/min across combinations)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS member_envelopes (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      member_type TEXT NOT NULL,
      station REAL NOT NULL,

      -- Max values
      max_axial REAL NOT NULL,
      max_shear_major REAL NOT NULL,
      max_shear_minor REAL NOT NULL,
      max_torsion REAL NOT NULL,
      max_moment_major REAL NOT NULL,
      max_moment_minor REAL NOT NULL,

      -- Min values
      min_axial REAL NOT NULL,
      min_shear_major REAL NOT NULL,
      min_shear_minor REAL NOT NULL,
      min_torsion REAL NOT NULL,
      min_moment_major REAL NOT NULL,
      min_moment_minor REAL NOT NULL,

      -- Controlling combinations (JSON)
      controlling_combinations TEXT DEFAULT '{}',

      FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
    )
  `);

  // Shell element results
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shell_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      combination_id TEXT NOT NULL,
      element_id TEXT NOT NULL,

      -- Membrane forces (per unit length)
      f11 REAL NOT NULL,
      f22 REAL NOT NULL,
      f12 REAL NOT NULL,

      -- Bending moments (per unit length)
      m11 REAL NOT NULL,
      m22 REAL NOT NULL,
      m12 REAL NOT NULL,

      -- Shear forces
      v13 REAL NOT NULL,
      v23 REAL NOT NULL,

      -- Principal values
      fmax REAL,
      fmin REAL,
      mmax REAL,
      mmin REAL,

      FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (combination_id) REFERENCES load_combinations(id) ON DELETE CASCADE,
      FOREIGN KEY (element_id) REFERENCES shell_elements(id) ON DELETE CASCADE
    )
  `);

  // Story drift results
  await db.execute(`
    CREATE TABLE IF NOT EXISTS story_drift_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      combination_id TEXT NOT NULL,
      story_id TEXT NOT NULL,

      -- Drifts
      drift_x REAL NOT NULL,
      drift_y REAL NOT NULL,
      drift_ratio_x REAL NOT NULL,
      drift_ratio_y REAL NOT NULL,

      -- Story shears
      shear_x REAL,
      shear_y REAL,

      -- Torsional irregularity
      max_drift_x REAL,
      avg_drift_x REAL,
      max_drift_y REAL,
      avg_drift_y REAL,
      torsional_ratio_x REAL,
      torsional_ratio_y REAL,

      FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (combination_id) REFERENCES load_combinations(id) ON DELETE CASCADE,
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
    )
  `);

  // ============================================================
  // DESIGN RESULTS TABLES
  // ============================================================

  // Design results
  await db.execute(`
    CREATE TABLE IF NOT EXISTS design_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      member_type TEXT NOT NULL,

      -- Design code
      design_code TEXT NOT NULL,

      -- Overall results
      demand_capacity_ratio REAL NOT NULL,
      controlling_combination_id TEXT,
      controlling_check TEXT,
      status TEXT NOT NULL,

      -- Detailed checks (JSON object with all D/C ratios)
      checks TEXT NOT NULL DEFAULT '{}',

      -- Warnings/notes (JSON array)
      messages TEXT DEFAULT '[]',

      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
    )
  `);

  // ============================================================
  // INDEXES
  // ============================================================

  // Project indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_buildings_project ON buildings(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_stories_building ON stories(building_id)`);

  // Element indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_nodes_story ON nodes(story_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_beams_project ON beams(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_beams_story ON beams(story_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_columns_project ON columns(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_columns_story ON columns(story_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_braces_project ON braces(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_walls_project ON walls(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_slabs_project ON slabs(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_shell_elements_project ON shell_elements(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_shell_elements_parent ON shell_elements(parent_id, parent_type)`);

  // Material/section indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sections_project ON sections(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_aisc_shapes_type ON aisc_shapes(shape_type)`);

  // Load indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_load_cases_project ON load_cases(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_point_loads_case ON point_loads(load_case_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_member_loads_case ON member_loads(load_case_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_area_loads_case ON area_loads(load_case_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_load_combinations_project ON load_combinations(project_id)`);

  // Results indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_analysis_runs_project ON analysis_runs(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_modal_results_run ON modal_results(run_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_node_results_run ON node_results(run_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_node_results_combination ON node_results(combination_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_member_results_run ON member_results(run_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_member_results_member ON member_results(member_id, member_type)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_shell_results_run ON shell_results(run_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_story_drift_results_run ON story_drift_results(run_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_design_results_run ON design_results(run_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_design_results_member ON design_results(member_id, member_type)`);

  // ============================================================
  // SCHEMA UPDATES (for existing databases)
  // ============================================================

  // Add combination_ids column to analysis_runs if it doesn't exist
  try {
    await db.execute(`ALTER TABLE analysis_runs ADD COLUMN combination_ids TEXT DEFAULT '[]'`);
  } catch {
    // Column already exists, ignore
  }

  console.log('Structural migrations completed successfully');
}
