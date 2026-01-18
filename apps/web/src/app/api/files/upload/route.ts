import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { uploadFile, FileType } from '@/lib/storage/file-service';
import { generateId } from '@/lib/utils';
import { getDb, execute, queryOne } from '@ledesign/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/files/upload
 * Upload large files to GCS and create database records
 *
 * Body (multipart/form-data):
 * - file: File to upload
 * - projectId: Project ID
 * - fileType: 'survey' | 'surface' | 'network' | 'cad'
 * - recordType: Database table to create record in
 * - metadata: Optional JSON metadata for the file
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const projectId = formData.get('projectId') as string;
      const fileType = formData.get('fileType') as FileType;
      const recordType = formData.get('recordType') as string;
      const metadataStr = formData.get('metadata') as string;

      // Validate required fields
      if (!file || !projectId || !fileType || !recordType) {
        return NextResponse.json(
          { error: 'Missing required fields: file, projectId, fileType, recordType' },
          { status: 400 }
        );
      }

      // Verify project ownership
      const project = await queryOne<{ user_id: string }>(
        getDb(),
        'SELECT user_id FROM projects WHERE id = ?',
        [projectId]
      );

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      if (project.user_id !== req.user.userId) {
        return NextResponse.json(
          { error: 'Unauthorized access to project' },
          { status: 403 }
        );
      }

      // Parse metadata
      const metadata = metadataStr ? JSON.parse(metadataStr) : {};

      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Generate unique file ID and name
      const fileId = generateId();
      const fileExt = file.name.split('.').pop() || '';
      const fileName = `${fileId}.${fileExt}`;

      // Upload to GCS
      const { gcsPath, signedUrl, size } = await uploadFile(buffer, {
        userId: req.user.userId,
        projectId,
        fileType,
        fileName,
        contentType: file.type || 'application/octet-stream',
      });

      const now = new Date().toISOString();

      // Create database record based on recordType
      switch (recordType) {
        case 'survey_datasets': {
          await execute(
            getDb(),
            `INSERT INTO survey_datasets (
              id, project_id, name, source_filename, source_format,
              point_count, bounds_json, statistics_json, crs,
              gcs_path, file_size_bytes, file_format, status,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              fileId,
              projectId,
              metadata.name || file.name,
              file.name,
              fileExt,
              metadata.pointCount || 0,
              metadata.bounds ? JSON.stringify(metadata.bounds) : null,
              metadata.statistics ? JSON.stringify(metadata.statistics) : null,
              metadata.crs || 'EPSG:32719',
              gcsPath,
              size,
              fileExt,
              'ready',
              now,
              now,
            ]
          );
          break;
        }

        case 'generated_surfaces': {
          await execute(
            getDb(),
            `INSERT INTO generated_surfaces (
              id, project_id, name, description, method,
              config_json, metrics_json, gcs_path, file_size_bytes,
              file_format, triangle_count, vertex_count, status,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              fileId,
              projectId,
              metadata.name || file.name,
              metadata.description || null,
              metadata.method || 'delaunay',
              metadata.config ? JSON.stringify(metadata.config) : null,
              metadata.metrics ? JSON.stringify(metadata.metrics) : null,
              gcsPath,
              size,
              fileExt,
              metadata.triangleCount || null,
              metadata.vertexCount || null,
              'ready',
              now,
              now,
            ]
          );
          break;
        }

        case 'water_network_designs': {
          await execute(
            getDb(),
            `INSERT INTO water_network_designs (
              id, project_id, name, description, gcs_path,
              file_size_bytes, node_count, pipe_count,
              demand_multiplier, headloss_formula, status,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              fileId,
              projectId,
              metadata.name || file.name,
              metadata.description || null,
              gcsPath,
              size,
              metadata.nodeCount || 0,
              metadata.pipeCount || 0,
              metadata.demandMultiplier || 1.0,
              metadata.headlossFormula || 'hazen-williams',
              'draft',
              now,
              now,
            ]
          );
          break;
        }

        case 'sewer_designs': {
          await execute(
            getDb(),
            `INSERT INTO sewer_designs (
              id, project_id, name, description, system_type,
              gcs_path, file_size_bytes, manhole_count, pipe_count,
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              fileId,
              projectId,
              metadata.name || file.name,
              metadata.description || null,
              metadata.systemType || 'sanitary',
              gcsPath,
              size,
              metadata.manholeCount || 0,
              metadata.pipeCount || 0,
              'draft',
              now,
              now,
            ]
          );
          break;
        }

        default:
          return NextResponse.json(
            { error: `Unsupported recordType: ${recordType}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        fileId,
        gcsPath,
        url: signedUrl,
        size,
        recordType,
      });
    } catch (error) {
      console.error('File upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
  });
}
