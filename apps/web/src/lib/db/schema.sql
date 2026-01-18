-- ============================================================
-- TURSO DATABASE SCHEMA
-- Civil CAD Platform - Production Database
-- ============================================================

-- Users table (if not already exists)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'civil', -- 'civil', 'water', 'road', 'sewer'

  -- Geographic location
  center_lat REAL,
  center_lon REAL,
  bounds_south REAL,
  bounds_north REAL,
  bounds_west REAL,
  bounds_east REAL,
  region TEXT,
  comuna TEXT,

  -- Settings
  units TEXT DEFAULT 'metric',
  crs TEXT DEFAULT 'EPSG:32719',

  -- File references (GCS)
  terrain_file_id TEXT,

  -- Version control
  current_version INTEGER DEFAULT 1,
  last_saved_at INTEGER,
  last_synced_at INTEGER,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);

-- CAD Entities table
CREATE TABLE IF NOT EXISTS cad_entities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,

  -- Entity data
  type TEXT NOT NULL, -- 'line', 'circle', 'arc', 'polyline', 'point', 'text'
  layer TEXT NOT NULL,
  geometry TEXT NOT NULL, -- JSON: { start, end, points, radius, etc. }
  properties TEXT, -- JSON: { color, lineweight, style, etc. }

  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entities_project ON cad_entities(project_id);
CREATE INDEX IF NOT EXISTS idx_entities_version ON cad_entities(project_id, version);
CREATE INDEX IF NOT EXISTS idx_entities_layer ON cad_entities(project_id, layer);
CREATE INDEX IF NOT EXISTS idx_entities_type ON cad_entities(type);

-- Layers table
CREATE TABLE IF NOT EXISTS layers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  visible BOOLEAN DEFAULT TRUE,
  locked BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,

  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_layers_project ON layers(project_id);

-- Project Versions table (snapshots)
CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,

  -- Snapshot data (compressed JSON)
  entities_snapshot TEXT NOT NULL, -- Gzipped JSON
  layers_snapshot TEXT NOT NULL,   -- Gzipped JSON
  metadata TEXT, -- JSON: { entityCount, layerCount, etc. }

  -- Metadata
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  description TEXT,
  size_bytes INTEGER,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_project ON project_versions(project_id, version_number DESC);

-- Files table (GCS references)
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,

  -- GCS info
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,

  -- Metadata
  file_type TEXT NOT NULL, -- 'terrain', 'attachment', 'export', 'detail'
  uploaded_by TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(file_type);

-- Calculations table (results from cubicaciones, hydrology, etc.)
CREATE TABLE IF NOT EXISTS calculations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,

  -- Calculation metadata
  type TEXT NOT NULL, -- 'cubicaciones', 'hydrology', 'road_geometry'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'

  -- Input/Output data
  input_params TEXT NOT NULL, -- JSON
  results TEXT, -- JSON: calculation results

  -- Execution info
  started_at INTEGER,
  completed_at INTEGER,
  error_message TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calculations_project ON calculations(project_id);
CREATE INDEX IF NOT EXISTS idx_calculations_type ON calculations(type);
CREATE INDEX IF NOT EXISTS idx_calculations_status ON calculations(status);

-- Sync Log table (track sync operations)
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- Sync metadata
  sync_type TEXT NOT NULL, -- 'auto', 'manual'
  changes_count INTEGER DEFAULT 0,
  entities_changed INTEGER DEFAULT 0,
  layers_changed INTEGER DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,

  -- Timestamps
  started_at INTEGER NOT NULL,
  completed_at INTEGER,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sync_log_project ON sync_log(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_user ON sync_log(user_id);

-- Collaboration table (future: multi-user editing)
CREATE TABLE IF NOT EXISTS project_collaborators (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'

  -- Permissions
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_invite BOOLEAN DEFAULT FALSE,

  -- Timestamps
  invited_at INTEGER NOT NULL,
  accepted_at INTEGER,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_project ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON project_collaborators(user_id);
