// ============================================================
// SURFACE MANAGEMENT TABLES MIGRATION
// ============================================================
// Adds survey_datasets and generated_surfaces tables for terrain module

import { Client } from '@libsql/client';

export async function addSurfaceTables(db: Client) {
  console.log('Adding surface management tables...');

  // Create survey_datasets table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS survey_datasets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      source_filename TEXT,
      source_format TEXT,
      point_count INTEGER NOT NULL DEFAULT 0,
      bounds_json TEXT,
      statistics_json TEXT,
      crs TEXT NOT NULL DEFAULT 'EPSG:32719',
      points_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'ready',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create generated_surfaces table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS generated_surfaces (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      dataset_id TEXT REFERENCES survey_datasets(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      method TEXT NOT NULL DEFAULT 'delaunay',
      config_json TEXT,
      surface_json TEXT,
      metrics_json TEXT,
      breakline_sources TEXT,
      status TEXT NOT NULL DEFAULT 'generating',
      error_message TEXT,
      compute_time_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Surface management tables added successfully');
}
