/**
 * Archival Service - Move data between Turso (hot) and GCS (cold)
 * Automatically archives large/old data to reduce Turso database size
 */

import 'server-only';
import { getUserDb, getAuthDb } from '@/lib/db/database-manager';
import { uploadFile, getFileUrl, downloadFile } from '@/lib/storage/file-service';
import { query, queryOne, execute } from '@ledesign/db';
import { generateId } from '@/lib/utils';

// Storage thresholds
const THRESHOLDS = {
  SURVEY_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  SURFACE_SIZE_BYTES: 50 * 1024 * 1024,  // 50MB
  NETWORK_INACTIVE_DAYS: 7,               // 7 days
  USER_DB_MAX_BYTES: 5 * 1024 * 1024 * 1024, // 5GB
};

interface ArchiveResult {
  success: boolean;
  itemsArchived: number;
  bytesArchived: number;
  errors: string[];
}

/**
 * Archive a survey dataset to GCS
 */
export async function archiveSurvey(
  userId: string,
  surveyId: string
): Promise<void> {
  const userDb = await getUserDb(userId);

  // Get survey data
  const survey = await queryOne<any>(
    userDb,
    'SELECT * FROM survey_datasets WHERE id = ? AND storage_tier = ?',
    [surveyId, 'hot']
  );

  if (!survey) {
    throw new Error(`Survey ${surveyId} not found or already archived`);
  }

  if (!survey.points_json) {
    throw new Error(`Survey ${surveyId} has no data to archive`);
  }

  console.log(`Archiving survey ${surveyId} (${survey.file_size_bytes} bytes)`);

  // Upload to GCS
  const buffer = Buffer.from(survey.points_json);
  const { gcsPath } = await uploadFile(buffer, {
    userId,
    projectId: survey.project_id,
    fileType: 'survey',
    fileName: `${surveyId}.json`,
    contentType: 'application/json',
  });

  // Update database record
  await execute(
    userDb,
    `UPDATE survey_datasets SET
     storage_tier = 'cold',
     gcs_path = ?,
     points_json = NULL
     WHERE id = ?`,
    [gcsPath, surveyId]
  );

  console.log(`✓ Archived survey ${surveyId} to ${gcsPath}`);
}

/**
 * Archive a network design to GCS
 */
export async function archiveNetwork(
  userId: string,
  networkId: string
): Promise<void> {
  const userDb = await getUserDb(userId);

  // Get network data
  const network = await queryOne<any>(
    userDb,
    'SELECT * FROM water_network_designs WHERE id = ? AND storage_tier = ?',
    [networkId, 'hot']
  );

  if (!network) {
    throw new Error(`Network ${networkId} not found or already archived`);
  }

  console.log(`Archiving network ${networkId}`);

  // Prepare network data
  const networkData = {
    nodes: JSON.parse(network.nodes_json || '[]'),
    pipes: JSON.parse(network.pipes_json || '[]'),
    pumps: JSON.parse(network.pumps_json || '[]'),
    tanks: JSON.parse(network.tanks_json || '[]'),
    metadata: {
      name: network.name,
      description: network.description,
      demandMultiplier: network.demand_multiplier,
      headlossFormula: network.headloss_formula,
    },
  };

  // Upload to GCS
  const buffer = Buffer.from(JSON.stringify(networkData));
  const { gcsPath } = await uploadFile(buffer, {
    userId,
    projectId: network.project_id,
    fileType: 'network',
    fileName: `${networkId}.json`,
    contentType: 'application/json',
  });

  // Update database record
  await execute(
    userDb,
    `UPDATE water_network_designs SET
     storage_tier = 'cold',
     gcs_path = ?,
     nodes_json = NULL,
     pipes_json = NULL,
     pumps_json = NULL,
     tanks_json = NULL
     WHERE id = ?`,
    [gcsPath, networkId]
  );

  console.log(`✓ Archived network ${networkId} to ${gcsPath}`);
}

/**
 * Restore a survey from GCS to Turso
 */
export async function restoreSurvey(
  userId: string,
  surveyId: string
): Promise<any> {
  const userDb = await getUserDb(userId);

  // Get survey metadata
  const survey = await queryOne<any>(
    userDb,
    'SELECT * FROM survey_datasets WHERE id = ?',
    [surveyId]
  );

  if (!survey) {
    throw new Error(`Survey ${surveyId} not found`);
  }

  // If already hot, return existing data
  if (survey.storage_tier === 'hot' && survey.points_json) {
    return JSON.parse(survey.points_json);
  }

  if (!survey.gcs_path) {
    throw new Error(`Survey ${surveyId} has no GCS path`);
  }

  console.log(`Restoring survey ${surveyId} from ${survey.gcs_path}`);

  // Download from GCS
  const signedUrl = await getFileUrl(survey.gcs_path, 60);
  const response = await fetch(signedUrl);
  const data = await response.json();

  // Update database
  await execute(
    userDb,
    `UPDATE survey_datasets SET
     storage_tier = 'hot',
     points_json = ?
     WHERE id = ?`,
    [JSON.stringify(data), surveyId]
  );

  console.log(`✓ Restored survey ${surveyId} from cold storage`);
  return data;
}

/**
 * Restore a network from GCS to Turso
 */
export async function restoreNetwork(
  userId: string,
  networkId: string
): Promise<any> {
  const userDb = await getUserDb(userId);

  // Get network metadata
  const network = await queryOne<any>(
    userDb,
    'SELECT * FROM water_network_designs WHERE id = ?',
    [networkId]
  );

  if (!network) {
    throw new Error(`Network ${networkId} not found`);
  }

  // If already hot, return existing data
  if (network.storage_tier === 'hot' && network.nodes_json) {
    return {
      nodes: JSON.parse(network.nodes_json),
      pipes: JSON.parse(network.pipes_json),
      pumps: JSON.parse(network.pumps_json || '[]'),
      tanks: JSON.parse(network.tanks_json || '[]'),
    };
  }

  if (!network.gcs_path) {
    throw new Error(`Network ${networkId} has no GCS path`);
  }

  console.log(`Restoring network ${networkId} from ${network.gcs_path}`);

  // Download from GCS
  const signedUrl = await getFileUrl(network.gcs_path, 60);
  const response = await fetch(signedUrl);
  const data = await response.json();

  // Update database
  await execute(
    userDb,
    `UPDATE water_network_designs SET
     storage_tier = 'hot',
     nodes_json = ?,
     pipes_json = ?,
     pumps_json = ?,
     tanks_json = ?
     WHERE id = ?`,
    [
      JSON.stringify(data.nodes || []),
      JSON.stringify(data.pipes || []),
      JSON.stringify(data.pumps || []),
      JSON.stringify(data.tanks || []),
      networkId,
    ]
  );

  console.log(`✓ Restored network ${networkId} from cold storage`);
  return data;
}

/**
 * Run archival job for a user
 * Archives large surveys and inactive networks
 */
export async function runArchivalJob(userId: string): Promise<ArchiveResult> {
  const userDb = await getUserDb(userId);
  const authDb = getAuthDb();

  const result: ArchiveResult = {
    success: true,
    itemsArchived: 0,
    bytesArchived: 0,
    errors: [],
  };

  // Create job record
  const jobId = generateId();
  const now = new Date().toISOString();

  await execute(
    authDb,
    `INSERT INTO archival_jobs (
      id, user_id, job_type, status, started_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [jobId, userId, 'auto-archive', 'running', now, now]
  );

  try {
    // Archive large surveys (>100MB)
    const largeSurveys = await query<any>(
      userDb,
      `SELECT id, file_size_bytes FROM survey_datasets
       WHERE storage_tier = 'hot'
       AND file_size_bytes > ?`,
      [THRESHOLDS.SURVEY_SIZE_BYTES]
    );

    console.log(`Found ${largeSurveys.length} large surveys to archive`);

    for (const survey of largeSurveys) {
      try {
        await archiveSurvey(userId, survey.id);
        result.itemsArchived++;
        result.bytesArchived += survey.file_size_bytes || 0;
      } catch (error: any) {
        result.errors.push(`Survey ${survey.id}: ${error.message}`);
        result.success = false;
      }
    }

    // Archive inactive networks (>7 days since modification)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - THRESHOLDS.NETWORK_INACTIVE_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    const inactiveNetworks = await query<any>(
      userDb,
      `SELECT id FROM water_network_designs
       WHERE storage_tier = 'hot'
       AND datetime(last_modified_at) < ?`,
      [cutoffISO]
    );

    console.log(`Found ${inactiveNetworks.length} inactive networks to archive`);

    for (const network of inactiveNetworks) {
      try {
        await archiveNetwork(userId, network.id);
        result.itemsArchived++;
      } catch (error: any) {
        result.errors.push(`Network ${network.id}: ${error.message}`);
        result.success = false;
      }
    }

    // Update job record
    await execute(
      authDb,
      `UPDATE archival_jobs SET
       status = ?,
       items_processed = ?,
       bytes_archived = ?,
       error_message = ?,
       completed_at = ?
       WHERE id = ?`,
      [
        result.success ? 'completed' : 'failed',
        result.itemsArchived,
        result.bytesArchived,
        result.errors.length > 0 ? result.errors.join('; ') : null,
        new Date().toISOString(),
        jobId,
      ]
    );

    console.log(`✓ Archival job complete: ${result.itemsArchived} items, ${(result.bytesArchived / 1024 / 1024).toFixed(2)} MB`);

  } catch (error: any) {
    result.success = false;
    result.errors.push(`Job failed: ${error.message}`);

    await execute(
      authDb,
      `UPDATE archival_jobs SET
       status = 'failed',
       error_message = ?,
       completed_at = ?
       WHERE id = ?`,
      [error.message, new Date().toISOString(), jobId]
    );
  }

  return result;
}

/**
 * Get storage statistics for a user
 */
export async function getUserStorageStats(userId: string): Promise<{
  tursoBytes: number;
  gcsBytes: number;
  totalBytes: number;
  hotSurveys: number;
  coldSurveys: number;
  hotNetworks: number;
  coldNetworks: number;
}> {
  const userDb = await getUserDb(userId);

  // Count hot surveys
  const hotSurveys = await query<{ count: number; total_bytes: number }>(
    userDb,
    `SELECT COUNT(*) as count, SUM(file_size_bytes) as total_bytes
     FROM survey_datasets WHERE storage_tier = 'hot'`
  );

  // Count cold surveys
  const coldSurveys = await query<{ count: number; total_bytes: number }>(
    userDb,
    `SELECT COUNT(*) as count, SUM(file_size_bytes) as total_bytes
     FROM survey_datasets WHERE storage_tier = 'cold'`
  );

  // Count hot networks
  const hotNetworks = await query<{ count: number }>(
    userDb,
    `SELECT COUNT(*) as count FROM water_network_designs WHERE storage_tier = 'hot'`
  );

  // Count cold networks
  const coldNetworks = await query<{ count: number }>(
    userDb,
    `SELECT COUNT(*) as count FROM water_network_designs WHERE storage_tier = 'cold'`
  );

  const tursoBytes = hotSurveys[0]?.total_bytes || 0;
  const gcsBytes = coldSurveys[0]?.total_bytes || 0;

  return {
    tursoBytes,
    gcsBytes,
    totalBytes: tursoBytes + gcsBytes,
    hotSurveys: hotSurveys[0]?.count || 0,
    coldSurveys: coldSurveys[0]?.count || 0,
    hotNetworks: hotNetworks[0]?.count || 0,
    coldNetworks: coldNetworks[0]?.count || 0,
  };
}
