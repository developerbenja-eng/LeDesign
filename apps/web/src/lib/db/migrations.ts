import { getDb, execute } from './turso';
import { runStructuralMigrations } from './structural-migrations';

/**
 * Create users table
 */
export async function createUsersTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      email_verified INTEGER DEFAULT 0,
      google_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login TEXT
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`);

  console.log('Users table created/verified');
}

/**
 * Create projects table
 */
export async function createProjectsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      -- Geographic bounds for map view
      bounds_south REAL,
      bounds_north REAL,
      bounds_west REAL,
      bounds_east REAL,
      -- Center point for map marker
      center_lat REAL,
      center_lon REAL,
      -- Chilean region/comuna for grouping
      region TEXT,
      comuna TEXT,
      -- Project type
      project_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_projects_region ON projects(region)`);

  console.log('Projects table created/verified');
}

/**
 * Create project_elements table
 */
export async function createProjectElementsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS project_elements (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      element_type TEXT NOT NULL,
      layer TEXT NOT NULL DEFAULT '0',
      geometry TEXT NOT NULL,
      properties TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_elements_project_id ON project_elements(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_elements_type ON project_elements(element_type)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_elements_layer ON project_elements(layer)`);

  console.log('Project elements table created/verified');
}

/**
 * Create project_topography table
 */
export async function createProjectTopographyTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS project_topography (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      dem_path TEXT,
      bounds_south REAL NOT NULL,
      bounds_north REAL NOT NULL,
      bounds_west REAL NOT NULL,
      bounds_east REAL NOT NULL,
      resolution REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_topo_project_id ON project_topography(project_id)`);

  console.log('Project topography table created/verified');
}

/**
 * Create manuals table for quick access to Chilean infrastructure manuals
 */
export async function createManualsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS manuals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      -- 'pavement', 'sewer', 'drainage', 'general'
      file_url TEXT,
      thumbnail_url TEXT,
      source TEXT,
      -- 'MOP', 'SERVIU', 'MINVU', etc.
      year INTEGER,
      created_at TEXT NOT NULL
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_manuals_category ON manuals(category)`);

  console.log('Manuals table created/verified');
}

/**
 * Create weather_data table for site weather analysis
 */
export async function createWeatherDataTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS weather_data (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      temperature REAL,
      humidity REAL,
      precipitation REAL,
      wind_speed REAL,
      wind_direction REAL,
      source TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_weather_project_id ON weather_data(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_weather_timestamp ON weather_data(timestamp)`);

  console.log('Weather data table created/verified');
}

/**
 * Create documents table for generated engineering documents
 */
export async function createDocumentsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      version TEXT DEFAULT '1.0',
      status TEXT DEFAULT 'draft',
      caratula TEXT NOT NULL,
      sections TEXT NOT NULL,
      latex_content TEXT,
      pdf_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      approved_by TEXT,
      approval_date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by)`);

  console.log('Documents table created/verified');
}

/**
 * Create document_templates table for reusable document templates
 */
export async function createDocumentTemplatesTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS document_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      sections TEXT NOT NULL,
      default_caratula TEXT,
      is_system INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_templates_type ON document_templates(type)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_templates_system ON document_templates(is_system)`);

  console.log('Document templates table created/verified');
}

/**
 * Create document_revisions table for version history
 */
export async function createDocumentRevisionsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS document_revisions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL,
      sections TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      comment TEXT,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_revisions_document ON document_revisions(document_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_revisions_number ON document_revisions(revision_number)`);

  console.log('Document revisions table created/verified');
}

// ============================================================================
// Test Validation Dashboard Tables
// ============================================================================

/**
 * Create test_runs table for storing CI/CD test run metadata
 */
export async function createTestRunsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      commit_sha TEXT,
      branch TEXT,
      trigger TEXT NOT NULL DEFAULT 'manual',
      environment TEXT DEFAULT 'development',
      total_tests INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      created_at TEXT NOT NULL
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_runs_timestamp ON test_runs(timestamp)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_runs_branch ON test_runs(branch)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_runs_commit ON test_runs(commit_sha)`);

  console.log('Test runs table created/verified');
}

/**
 * Create test_results table for individual test results
 */
export async function createTestResultsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      module TEXT NOT NULL,
      suite TEXT NOT NULL,
      test_name TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      error_message TEXT,
      error_stack TEXT,
      expected_value TEXT,
      actual_value TEXT,
      tolerance TEXT,
      formula TEXT,
      reference_standard TEXT,
      reference_example TEXT,
      input_parameters TEXT,
      file_path TEXT,
      line_number INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_results_run ON test_results(run_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_results_module ON test_results(module)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_results_suite ON test_results(suite)`);

  console.log('Test results table created/verified');
}

/**
 * Create test_verifications table for human verification records
 */
export async function createTestVerificationsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS test_verifications (
      id TEXT PRIMARY KEY,
      test_result_id TEXT NOT NULL,
      verified_by_name TEXT NOT NULL,
      verified_by_email TEXT,
      verified_by_role TEXT,
      verification_status TEXT NOT NULL,
      comment TEXT,
      verification_date TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (test_result_id) REFERENCES test_results(id) ON DELETE CASCADE
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_verifications_result ON test_verifications(test_result_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_verifications_status ON test_verifications(verification_status)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_verifications_date ON test_verifications(verification_date)`);

  console.log('Test verifications table created/verified');
}

// ============================================================================
// MINVU Standard CAD Details Tables
// ============================================================================

/**
 * Create standard_details table for MINVU/SERVIU CAD details
 * These are insertable construction details (sumideros, cámaras, zanjas, etc.)
 */
export async function createStandardDetailsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS standard_details (
      id TEXT PRIMARY KEY,

      -- Classification
      category TEXT NOT NULL,
      subcategory TEXT,
      code TEXT UNIQUE NOT NULL,

      -- Display info
      name_es TEXT NOT NULL,
      name_en TEXT,
      description TEXT,

      -- Source file
      source_file TEXT NOT NULL,
      source_url TEXT,

      -- Extracted geometry (in LeleCAD format)
      geometry_json TEXT NOT NULL,
      bounds_json TEXT,
      insertion_point_json TEXT,

      -- Metadata for filtering/search
      layers_json TEXT,
      tags_json TEXT,

      -- Thumbnail for UI
      thumbnail_svg TEXT,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_standard_details_category ON standard_details(category)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_standard_details_code ON standard_details(code)`);

  console.log('Standard details table created/verified');
}

/**
 * Create drawing_templates table for MINVU drawing layout templates
 */
export async function createDrawingTemplatesTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS drawing_templates (
      id TEXT PRIMARY KEY,

      name TEXT NOT NULL,
      description TEXT,
      template_type TEXT NOT NULL,

      source_file TEXT NOT NULL,
      source_url TEXT,

      -- Full drawing content
      content_json TEXT NOT NULL,
      paper_size TEXT,
      scale TEXT,

      -- Title block fields (what user fills in)
      title_block_fields_json TEXT,

      thumbnail_svg TEXT,

      created_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_drawing_templates_type ON drawing_templates(template_type)`);

  console.log('Drawing templates table created/verified');
}

/**
 * Create cad_symbols table for annotation symbols and standard notes
 */
export async function createCADSymbolsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS cad_symbols (
      id TEXT PRIMARY KEY,

      category TEXT NOT NULL,
      name TEXT NOT NULL,

      source_file TEXT NOT NULL,

      -- Symbol geometry
      geometry_json TEXT NOT NULL,
      bounds_json TEXT,
      insertion_point_json TEXT,

      -- For text blocks
      is_text_block INTEGER DEFAULT 0,
      text_content TEXT,

      thumbnail_svg TEXT,

      created_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_cad_symbols_category ON cad_symbols(category)`);

  console.log('CAD symbols table created/verified');
}

/**
 * Create infrastructure_detail_defaults table for linking infrastructure types to standard details
 */
export async function createInfrastructureDetailDefaultsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS infrastructure_detail_defaults (
      id TEXT PRIMARY KEY,
      infrastructure_type TEXT NOT NULL,
      detail_code TEXT NOT NULL,
      is_default INTEGER DEFAULT 1,
      conditions_json TEXT,

      FOREIGN KEY (detail_code) REFERENCES standard_details(code)
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_infra_detail_defaults_type ON infrastructure_detail_defaults(infrastructure_type)`);

  console.log('Infrastructure detail defaults table created/verified');
}

// ============================================================================
// MINVU Normativa Data Tables
// ============================================================================

/**
 * Create unit_prices table for SERVIU/MINVU standard unit prices
 * Used for automatic budget generation from project quantities
 */
export async function createUnitPricesTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS unit_prices (
      id TEXT PRIMARY KEY,

      -- Item identification
      code TEXT UNIQUE NOT NULL,           -- e.g., 'EXC-001', 'PAV-ASF-01'
      category TEXT NOT NULL,              -- 'excavation', 'pavement', 'drainage', 'curbs'
      subcategory TEXT,

      -- Description
      description_es TEXT NOT NULL,        -- 'Excavación en terreno blando'
      description_en TEXT,

      -- Pricing
      unit TEXT NOT NULL,                  -- 'm³', 'm²', 'ml', 'un', 'gl'
      price_uf REAL,                       -- Price in UF (Unidad de Fomento)
      price_clp INTEGER,                   -- Price in CLP (Chilean Peso)
      price_date TEXT,                     -- Date price was set

      -- Source
      source TEXT,                         -- 'SERVIU_RM_2024', 'MOP_2023'
      source_document TEXT,
      ordinance_number TEXT,

      -- Validity
      valid_from TEXT,
      valid_until TEXT,
      is_active INTEGER DEFAULT 1,

      -- Metadata
      notes TEXT,
      tags_json TEXT,                      -- ["aguas_lluvias", "excavacion"]

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_unit_prices_code ON unit_prices(code)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_unit_prices_category ON unit_prices(category)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_unit_prices_active ON unit_prices(is_active)`);

  console.log('Unit prices table created/verified');
}

/**
 * Create verification_criteria table for inspection checklists
 * Used for automatic generation of inspection reports
 */
export async function createVerificationCriteriaTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS verification_criteria (
      id TEXT PRIMARY KEY,

      -- Classification
      code TEXT UNIQUE NOT NULL,           -- 'VER-PAV-001'
      category TEXT NOT NULL,              -- 'pavement', 'drainage', 'curbs', 'excavation'
      subcategory TEXT,
      phase TEXT NOT NULL,                 -- 'pre_construction', 'during', 'final_reception'

      -- Criterion
      description_es TEXT NOT NULL,        -- 'Verificar compactación ≥ 95% DMCS'
      description_en TEXT,

      -- Pass/Fail conditions
      measurement_type TEXT,               -- 'numeric', 'boolean', 'visual', 'document'
      pass_condition TEXT,                 -- '>= 95', '== true', 'exists'
      min_value REAL,
      max_value REAL,
      tolerance REAL,
      unit TEXT,                           -- '%', 'mm', 'MPa'

      -- Severity
      severity TEXT NOT NULL DEFAULT 'major',  -- 'critical', 'major', 'minor', 'observation'

      -- Reference
      reference_standard TEXT,             -- 'NCh 1511', 'AASHTO T-99'
      reference_section TEXT,

      -- Source
      source_document TEXT,

      -- Metadata
      requires_photo INTEGER DEFAULT 0,
      requires_lab_test INTEGER DEFAULT 0,
      test_method TEXT,

      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_verification_code ON verification_criteria(code)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_verification_category ON verification_criteria(category)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_verification_phase ON verification_criteria(phase)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_verification_severity ON verification_criteria(severity)`);

  console.log('Verification criteria table created/verified');
}

/**
 * Create test_specifications table for QC/QA testing requirements
 * Used for generating test schedules based on project quantities
 */
export async function createTestSpecificationsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS test_specifications (
      id TEXT PRIMARY KEY,

      -- Classification
      code TEXT UNIQUE NOT NULL,           -- 'TEST-CBR-001'
      test_type TEXT NOT NULL,             -- 'CBR', 'compaction', 'granulometry', 'thickness'
      category TEXT NOT NULL,              -- 'soil', 'aggregate', 'asphalt', 'concrete'

      -- Description
      name_es TEXT NOT NULL,               -- 'Ensayo CBR'
      name_en TEXT,
      description TEXT,

      -- Requirements
      min_value REAL,
      max_value REAL,
      unit TEXT,                           -- '%', 'mm', 'MPa'

      -- Frequency
      frequency_type TEXT,                 -- 'area', 'length', 'volume', 'batch'
      frequency_value REAL,                -- e.g., 350 (every 350 m²)
      frequency_unit TEXT,                 -- 'm²', 'ml', 'm³'
      min_samples INTEGER DEFAULT 1,

      -- Method
      test_method TEXT,                    -- 'NCh 1852', 'AASHTO T-193'
      lab_required INTEGER DEFAULT 1,
      field_test INTEGER DEFAULT 0,

      -- Applies to
      applies_to_json TEXT,                -- ["base_layer", "subbase", "subgrade"]

      -- Source
      reference_standard TEXT,
      source_document TEXT,

      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_spec_code ON test_specifications(code)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_spec_type ON test_specifications(test_type)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_test_spec_category ON test_specifications(category)`);

  console.log('Test specifications table created/verified');
}

/**
 * Create material_standards table for pavement/infrastructure layer specifications
 * Used for validating design sections against MINVU/MOP standards
 */
export async function createMaterialStandardsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS material_standards (
      id TEXT PRIMARY KEY,

      -- Classification
      code TEXT UNIQUE NOT NULL,           -- 'MAT-BASE-01'
      material_type TEXT NOT NULL,         -- 'base', 'subbase', 'asphalt', 'concrete', 'fill'
      category TEXT NOT NULL,              -- 'granular', 'stabilized', 'bituminous', 'hydraulic'

      -- Description
      name_es TEXT NOT NULL,               -- 'Base Granular CBR ≥ 80%'
      name_en TEXT,
      description TEXT,

      -- Specifications
      thickness_min_mm REAL,
      thickness_max_mm REAL,
      thickness_typical_mm REAL,

      -- Material requirements
      cbr_min REAL,                        -- Minimum CBR value
      compaction_min REAL,                 -- Minimum compaction (% DMCS)
      plasticity_index_max REAL,           -- Max IP
      liquid_limit_max REAL,               -- Max LL

      -- Aggregate specs
      gradation_spec TEXT,                 -- 'TM-50a', 'AG-20'
      max_aggregate_size_mm REAL,

      -- Additional specs as JSON
      specs_json TEXT,                     -- Flexible storage for additional requirements

      -- Applicability
      traffic_class_json TEXT,             -- ["T1", "T2", "T3"] - traffic classes this applies to
      road_type_json TEXT,                 -- ["urban", "rural", "highway"]

      -- Reference
      reference_standard TEXT,             -- 'Manual de Carreteras Vol. 5'
      reference_section TEXT,

      source_document TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_material_code ON material_standards(code)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_material_type ON material_standards(material_type)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_material_category ON material_standards(category)`);

  console.log('Material standards table created/verified');
}

/**
 * Create approved_products table for MINVU/SERVIU validated technologies
 * Used for filtering product selection to only approved options
 */
export async function createApprovedProductsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS approved_products (
      id TEXT PRIMARY KEY,

      -- Product identification
      code TEXT UNIQUE NOT NULL,           -- 'PROD-STORM-001'
      name TEXT NOT NULL,                  -- 'Stormtech SC-740'
      manufacturer TEXT,
      model TEXT,

      -- Classification
      category TEXT NOT NULL,              -- 'drainage', 'storage', 'inlet', 'pipe'
      subcategory TEXT,
      product_type TEXT,                   -- 'modular_tank', 'linear_drain', 'sumidero'

      -- Approval info
      ordinance_number TEXT,               -- 'Ord. 2847'
      approval_date TEXT,
      approval_entity TEXT,                -- 'SERVIU RM', 'MOP'
      approval_document_url TEXT,

      -- Specifications
      specs_json TEXT,                     -- Detailed technical specifications

      -- Performance requirements
      load_capacity_tn_m2 REAL,            -- Load capacity
      storage_volume_m3 REAL,              -- For storage products
      flow_capacity_l_s REAL,              -- Flow capacity

      -- Dimensions
      dimensions_json TEXT,                -- {length, width, height, unit}

      -- Materials
      material TEXT,                       -- 'HDPE', 'PP', 'concrete', 'cast_iron'

      -- Usage constraints
      min_cover_mm REAL,                   -- Minimum soil cover
      max_depth_mm REAL,
      traffic_compatible INTEGER DEFAULT 0,

      -- Validity
      valid_until TEXT,
      is_active INTEGER DEFAULT 1,

      -- Source
      source_document TEXT,
      datasheet_url TEXT,

      notes TEXT,
      tags_json TEXT,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_approved_products_code ON approved_products(code)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_approved_products_category ON approved_products(category)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_approved_products_manufacturer ON approved_products(manufacturer)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_approved_products_active ON approved_products(is_active)`);

  console.log('Approved products table created/verified');
}

// ============================================================================
// Discipline Design Tables
// ============================================================================

/**
 * Create water_network_designs table for storing water network designs per project
 */
export async function createWaterNetworkDesignsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS water_network_designs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,

      -- Network data stored as JSON
      nodes_json TEXT NOT NULL DEFAULT '[]',
      pipes_json TEXT NOT NULL DEFAULT '[]',
      pumps_json TEXT NOT NULL DEFAULT '[]',
      tanks_json TEXT NOT NULL DEFAULT '[]',

      -- Settings
      demand_multiplier REAL DEFAULT 1.0,
      headloss_formula TEXT DEFAULT 'hazen-williams',

      -- Analysis results
      analysis_results_json TEXT,
      last_analysis_at TEXT,

      -- Metadata
      status TEXT DEFAULT 'draft',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_water_network_project ON water_network_designs(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_water_network_status ON water_network_designs(status)`);

  console.log('Water network designs table created/verified');
}

/**
 * Create sewer_designs table for storing sewer network designs per project
 */
export async function createSewerDesignsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS sewer_designs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,

      -- System type
      system_type TEXT NOT NULL DEFAULT 'sanitary',

      -- Network data stored as JSON
      manholes_json TEXT NOT NULL DEFAULT '[]',
      pipes_json TEXT NOT NULL DEFAULT '[]',
      connections_json TEXT NOT NULL DEFAULT '[]',

      -- Design criteria as JSON
      design_criteria_json TEXT,

      -- Analysis results
      analysis_results_json TEXT,
      last_analysis_at TEXT,

      -- Metadata
      status TEXT DEFAULT 'draft',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_sewer_project ON sewer_designs(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_sewer_status ON sewer_designs(status)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_sewer_type ON sewer_designs(system_type)`);

  console.log('Sewer designs table created/verified');
}

/**
 * Create stormwater_designs table for storing stormwater designs per project
 */
export async function createStormwaterDesignsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS stormwater_designs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,

      -- Network data stored as JSON
      catchments_json TEXT NOT NULL DEFAULT '[]',
      outlets_json TEXT NOT NULL DEFAULT '[]',
      conduits_json TEXT NOT NULL DEFAULT '[]',
      storages_json TEXT NOT NULL DEFAULT '[]',

      -- Design storm parameters
      design_storm_json TEXT,
      analysis_method TEXT DEFAULT 'rational',

      -- Analysis results
      analysis_results_json TEXT,
      last_analysis_at TEXT,

      -- Metadata
      status TEXT DEFAULT 'draft',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_stormwater_project ON stormwater_designs(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_stormwater_status ON stormwater_designs(status)`);

  console.log('Stormwater designs table created/verified');
}

/**
 * Create channel_designs table for storing open channel designs per project
 */
export async function createChannelDesignsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS channel_designs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,

      -- Channel data stored as JSON
      sections_json TEXT NOT NULL DEFAULT '[]',
      reaches_json TEXT NOT NULL DEFAULT '[]',
      structures_json TEXT NOT NULL DEFAULT '[]',

      -- Design parameters
      design_flow REAL,
      design_freeboard REAL DEFAULT 0.3,

      -- Analysis results
      analysis_results_json TEXT,
      last_analysis_at TEXT,

      -- Metadata
      status TEXT DEFAULT 'draft',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_channel_project ON channel_designs(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_channel_status ON channel_designs(status)`);

  console.log('Channel designs table created/verified');
}

// ============================================================================
// Smart Surface Generation Tables
// ============================================================================

/**
 * Create survey_datasets table for storing uploaded survey point data
 */
export async function createSurveyDatasetsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS survey_datasets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,

      -- Source file info
      source_file TEXT,
      source_format TEXT,               -- 'csv', 'xyz', 'las', 'manual'

      -- Point data stats
      point_count INTEGER NOT NULL DEFAULT 0,
      original_count INTEGER,           -- Before filtering
      removed_duplicates INTEGER,
      removed_outliers INTEGER,

      -- Bounding box
      bounds_min_x REAL,
      bounds_max_x REAL,
      bounds_min_y REAL,
      bounds_max_y REAL,
      bounds_min_z REAL,
      bounds_max_z REAL,

      -- Statistics
      z_mean REAL,
      z_std_dev REAL,
      point_density REAL,               -- Points per hectare

      -- Coordinate system
      crs TEXT DEFAULT 'EPSG:32719',    -- UTM Zone 19S default for Chile

      -- Status
      status TEXT DEFAULT 'pending',    -- 'pending', 'processing', 'ready', 'error'
      error_message TEXT,

      -- Storage (points stored as compressed JSON or external file)
      points_json TEXT,                 -- For small datasets (<10K points)
      points_file_path TEXT,            -- For large datasets

      -- Metadata
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_survey_datasets_project ON survey_datasets(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_survey_datasets_status ON survey_datasets(status)`);

  console.log('Survey datasets table created/verified');
}

/**
 * Create generated_surfaces table for storing generated TIN/interpolated surfaces
 */
export async function createGeneratedSurfacesTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS generated_surfaces (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      dataset_id TEXT,                  -- Source survey dataset

      name TEXT NOT NULL,
      description TEXT,

      -- Method info
      method TEXT NOT NULL,             -- 'delaunay', 'idw', 'kriging', 'constrained'
      method_config_json TEXT,          -- IDWConfig or KrigingConfig

      -- AI analysis results
      terrain_class TEXT,               -- 'flat', 'rolling', 'hilly', 'mountainous', 'complex'
      ai_recommendation_json TEXT,      -- Full AI analysis response
      ai_confidence REAL,

      -- Quality metrics
      rmse REAL,
      mae REAL,
      max_error REAL,
      r2 REAL,
      mbe REAL,
      quality_score INTEGER,            -- 0-100
      quality_rating TEXT,              -- 'excellent', 'good', 'acceptable', 'poor'

      -- Triangle count and stats
      triangle_count INTEGER,
      vertex_count INTEGER,

      -- Bounding box
      bounds_min_x REAL,
      bounds_max_x REAL,
      bounds_min_y REAL,
      bounds_max_y REAL,
      bounds_min_z REAL,
      bounds_max_z REAL,

      -- Surface data (TINSurface JSON or file path)
      surface_json TEXT,                -- For small surfaces
      surface_file_path TEXT,           -- For large surfaces

      -- Breaklines used
      breaklines_json TEXT,             -- Array of breakline definitions
      breakline_sources TEXT,           -- 'ide_chile', 'manual', 'auto'

      -- Status
      status TEXT DEFAULT 'generating', -- 'generating', 'ready', 'error', 'archived'
      error_message TEXT,
      compute_time_ms INTEGER,

      -- Metadata
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (dataset_id) REFERENCES survey_datasets(id) ON DELETE SET NULL
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_generated_surfaces_project ON generated_surfaces(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_generated_surfaces_dataset ON generated_surfaces(dataset_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_generated_surfaces_method ON generated_surfaces(method)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_generated_surfaces_status ON generated_surfaces(status)`);

  console.log('Generated surfaces table created/verified');
}

// ============================================================================
// Cubicación Tables
// ============================================================================

/**
 * Create cubicaciones table for storing quantity takeoffs per project
 */
export async function createCubicacionesTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS cubicaciones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft',

      -- Items stored as JSON array
      items_json TEXT NOT NULL DEFAULT '[]',
      subtotals_json TEXT NOT NULL DEFAULT '[]',
      grand_total INTEGER NOT NULL DEFAULT 0,

      -- Pricing reference
      price_date TEXT,
      price_source TEXT,
      currency TEXT DEFAULT 'CLP',
      uf_value REAL,

      -- Auto-generation state
      auto_generation_enabled INTEGER DEFAULT 1,
      last_auto_generated TEXT,
      generator_config_json TEXT,

      -- Approval workflow
      approved_by TEXT,
      approval_date TEXT,

      -- Metadata
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT,

      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_cubicaciones_project ON cubicaciones(project_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_cubicaciones_status ON cubicaciones(status)`);

  console.log('Cubicaciones table created/verified');
}

/**
 * Create workflow_states table for SERVIU project lifecycle tracking
 * Defines the state machine for project approval process
 */
export async function createWorkflowStatesTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS workflow_states (
      id TEXT PRIMARY KEY,

      -- State identification
      code TEXT UNIQUE NOT NULL,           -- 'WF-SUBMIT', 'WF-REVIEW'
      name_es TEXT NOT NULL,               -- 'Proyecto Ingresado'
      name_en TEXT,
      description TEXT,

      -- Classification
      workflow_type TEXT NOT NULL,         -- 'project_approval', 'inspection', 'reception'
      phase TEXT,                          -- 'design', 'construction', 'handover'

      -- State machine
      order_index INTEGER NOT NULL,        -- For sequential ordering
      next_states_json TEXT,               -- ["WF-APPROVED", "WF-REJECTED", "WF-OBSERVATIONS"]

      -- Requirements
      required_documents_json TEXT,        -- Documents needed to reach this state
      required_forms_json TEXT,            -- Forms that must be filled
      required_approvals_json TEXT,        -- Who must approve

      -- Timing
      max_duration_days INTEGER,           -- SLA for this state

      -- UI
      color TEXT,                          -- '#28a745' for display
      icon TEXT,                           -- 'check-circle'

      is_terminal INTEGER DEFAULT 0,       -- Is this an end state?
      is_active INTEGER DEFAULT 1,

      created_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_workflow_code ON workflow_states(code)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_workflow_type ON workflow_states(workflow_type)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_workflow_order ON workflow_states(order_index)`);

  console.log('Workflow states table created/verified');
}

/**
 * Create normativa_documents table for referencing source documents
 * Links extracted data back to original MINVU/SERVIU documents
 */
export async function createNormativaDocumentsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS normativa_documents (
      id TEXT PRIMARY KEY,

      -- Document identification
      name TEXT NOT NULL,
      description TEXT,

      -- Classification
      document_type TEXT NOT NULL,         -- 'manual', 'form', 'checklist', 'standard', 'validation'
      category TEXT,                       -- 'pavement', 'drainage', 'general'
      subcategory TEXT,

      -- Source
      file_type TEXT NOT NULL,             -- 'PDF', 'Excel', 'Word', 'AutoCAD'
      file_path TEXT,                      -- Local path if downloaded
      source_url TEXT,                     -- Original URL

      -- Version
      version TEXT,
      publication_date TEXT,

      -- Extracted data status
      data_extracted INTEGER DEFAULT 0,
      extraction_date TEXT,
      extracted_tables_json TEXT,          -- Which data tables were populated from this doc

      -- Metadata from manifest
      manifest_name TEXT,
      manifest_category TEXT,
      manifest_subcategory TEXT,

      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`
  );

  await execute(db, `CREATE INDEX IF NOT EXISTS idx_normativa_docs_type ON normativa_documents(document_type)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_normativa_docs_category ON normativa_documents(category)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_normativa_docs_extracted ON normativa_documents(data_extracted)`);

  console.log('Normativa documents table created/verified');
}

/**
 * Run all migrations
 */
export async function runAllMigrations() {
  console.log('Running database migrations...');

  await createUsersTable();
  await createProjectsTable();
  await createProjectElementsTable();
  await createProjectTopographyTable();
  await createManualsTable();
  await createWeatherDataTable();
  await createDocumentsTable();
  await createDocumentTemplatesTable();
  await createDocumentRevisionsTable();
  // Validation dashboard tables
  await createTestRunsTable();
  await createTestResultsTable();
  await createTestVerificationsTable();
  // MINVU CAD tables
  await createStandardDetailsTable();
  await createDrawingTemplatesTable();
  await createCADSymbolsTable();
  await createInfrastructureDetailDefaultsTable();
  // MINVU Normativa data tables
  await createUnitPricesTable();
  await createVerificationCriteriaTable();
  await createTestSpecificationsTable();
  await createMaterialStandardsTable();
  await createApprovedProductsTable();
  await createWorkflowStatesTable();
  await createNormativaDocumentsTable();
  // Discipline design tables
  await createWaterNetworkDesignsTable();
  await createSewerDesignsTable();
  await createStormwaterDesignsTable();
  await createChannelDesignsTable();
  // Surface generation tables
  await createSurveyDatasetsTable();
  await createGeneratedSurfacesTable();
  // Cubicación tables
  await createCubicacionesTable();
  // Structural engineering tables
  await runStructuralMigrations();

  console.log('All migrations completed');
}
