-- Migration: Create data_resources table
-- Description: Table for storing external data sources (DEMs, imagery, APIs, services)
-- Date: 2026-01-16

-- Create data_resources table
CREATE TABLE IF NOT EXISTS data_resources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('dem', 'imagery', 'api', 'service', 'dataset', 'sensor', 'weather')),
  provider TEXT NOT NULL CHECK(provider IN ('copernicus', 'opentopography', 'google', 'bing', 'custom', 'shared', 'dga', 'dmc', 'ine', 'minvu')),

  -- Geographic coverage
  bounds_south REAL,
  bounds_north REAL,
  bounds_west REAL,
  bounds_east REAL,
  center_lat REAL,
  center_lon REAL,

  -- Resource details
  url TEXT,
  format TEXT,           -- e.g., 'GeoTIFF', 'WMS', 'JSON'
  resolution TEXT,       -- e.g., '30m', '1km'
  coverage_area TEXT,    -- e.g., 'Chile', 'Región del Biobío'

  -- Access control
  access_type TEXT NOT NULL CHECK(access_type IN ('public', 'private', 'shared', 'api_key')),
  api_key TEXT,          -- Encrypted API key if needed

  -- Metadata
  tags TEXT,             -- JSON array of tags
  source_citation TEXT,
  license TEXT,

  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_accessed TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_data_resources_user_id ON data_resources(user_id);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_data_resources_type ON data_resources(type);

-- Create index on access_type for filtering
CREATE INDEX IF NOT EXISTS idx_data_resources_access_type ON data_resources(access_type);

-- Create index on provider for filtering
CREATE INDEX IF NOT EXISTS idx_data_resources_provider ON data_resources(provider);

-- Create spatial index on center coordinates
CREATE INDEX IF NOT EXISTS idx_data_resources_center ON data_resources(center_lat, center_lon);

-- Create project_resource_links table for linking resources to projects
CREATE TABLE IF NOT EXISTS project_resource_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,

  -- Link metadata
  linked_at TEXT NOT NULL,
  linked_by TEXT NOT NULL,  -- User ID who linked it
  usage_type TEXT,          -- How it's used: 'basemap', 'analysis', 'reference'
  settings TEXT,            -- JSON for custom settings

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES data_resources(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_by) REFERENCES users(id) ON DELETE CASCADE,

  -- Ensure unique link per project-resource pair
  UNIQUE(project_id, resource_id)
);

-- Create index on project_id for faster queries
CREATE INDEX IF NOT EXISTS idx_project_resource_links_project_id ON project_resource_links(project_id);

-- Create index on resource_id for faster queries
CREATE INDEX IF NOT EXISTS idx_project_resource_links_resource_id ON project_resource_links(resource_id);
