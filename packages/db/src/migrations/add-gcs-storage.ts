// ============================================================
// GCS STORAGE MIGRATION
// ============================================================
// Adds gcs_path columns to move large data from JSON to Google Cloud Storage
// This enables storing 50GB+ per user without database size limits

import { Client } from '@libsql/client';

export async function addGcsStorage(db: Client) {
  console.log('Adding GCS storage support columns...');

  // Survey datasets - move points from JSON to GCS files
  const surveyColumns = [
    'gcs_path TEXT',  // Path to .las/.xyz/.csv file in GCS
    'file_size_bytes INTEGER',  // File size for storage tracking
    'file_format TEXT',  // 'las', 'xyz', 'csv', 'laz'
  ];

  for (const column of surveyColumns) {
    try {
      await db.execute(`ALTER TABLE survey_datasets ADD COLUMN ${column}`);
      console.log(`✓ Added column to survey_datasets: ${column}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log(`  Column already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  // Generated surfaces - move mesh data from JSON to GCS files
  const surfaceColumns = [
    'gcs_path TEXT',  // Path to .obj/.stl/.geojson file in GCS
    'file_size_bytes INTEGER',
    'file_format TEXT',  // 'obj', 'stl', 'geojson'
    'triangle_count INTEGER',
    'vertex_count INTEGER',
  ];

  for (const column of surfaceColumns) {
    try {
      await db.execute(`ALTER TABLE generated_surfaces ADD COLUMN ${column}`);
      console.log(`✓ Added column to generated_surfaces: ${column}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log(`  Column already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  // Water network designs - move network data from JSON to GCS files
  const networkColumns = [
    'gcs_path TEXT',  // Path to network JSON file in GCS
    'file_size_bytes INTEGER',
    'node_count INTEGER DEFAULT 0',
    'pipe_count INTEGER DEFAULT 0',
  ];

  for (const column of networkColumns) {
    try {
      await db.execute(`ALTER TABLE water_network_designs ADD COLUMN ${column}`);
      console.log(`✓ Added column to water_network_designs: ${column}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log(`  Column already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  // Sewer designs
  const sewerColumns = [
    'gcs_path TEXT',
    'file_size_bytes INTEGER',
    'manhole_count INTEGER DEFAULT 0',
    'pipe_count INTEGER DEFAULT 0',
  ];

  for (const column of sewerColumns) {
    try {
      await db.execute(`ALTER TABLE sewer_designs ADD COLUMN ${column}`);
      console.log(`✓ Added column to sewer_designs: ${column}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log(`  Column already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  // Stormwater designs
  const stormwaterColumns = [
    'gcs_path TEXT',
    'file_size_bytes INTEGER',
    'catchment_count INTEGER DEFAULT 0',
    'conduit_count INTEGER DEFAULT 0',
  ];

  for (const column of stormwaterColumns) {
    try {
      await db.execute(`ALTER TABLE stormwater_designs ADD COLUMN ${column}`);
      console.log(`✓ Added column to stormwater_designs: ${column}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log(`  Column already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  // Channel designs
  const channelColumns = [
    'gcs_path TEXT',
    'file_size_bytes INTEGER',
    'section_count INTEGER DEFAULT 0',
    'reach_count INTEGER DEFAULT 0',
  ];

  for (const column of channelColumns) {
    try {
      await db.execute(`ALTER TABLE channel_designs ADD COLUMN ${column}`);
      console.log(`✓ Added column to channel_designs: ${column}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate column name')) {
        console.log(`  Column already exists, skipping`);
      } else {
        throw error;
      }
    }
  }

  console.log('✅ GCS storage columns added successfully');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Deploy file upload/download service');
  console.log('   2. Migrate existing JSON data to GCS');
  console.log('   3. Remove old *_json columns after migration complete');
}
