import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getFileUrl, deleteFile } from '@/lib/storage/file-service';
import { getClient, queryOne, execute } from '@ledesign/db';

export const dynamic = 'force-dynamic';

interface FileRecord {
  gcs_path: string | null;
  project_id: string;
  name?: string;
  file_size_bytes?: number;
}

/**
 * GET /api/files/[id]?type=survey_datasets
 * Get signed URL for file download
 *
 * Query params:
 * - type: 'survey_datasets' | 'generated_surfaces' | 'water_network_designs' | 'sewer_designs'
 * - expires: URL expiration in minutes (default: 60)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const fileId = params.id;
      const url = new URL(request.url);
      const type = url.searchParams.get('type');
      const expiresStr = url.searchParams.get('expires');
      const expires = expiresStr ? parseInt(expiresStr) : 60;

      if (!type) {
        return NextResponse.json(
          { error: 'Missing required query parameter: type' },
          { status: 400 }
        );
      }

      // Query file record based on type
      const validTables = [
        'survey_datasets',
        'generated_surfaces',
        'water_network_designs',
        'sewer_designs',
        'stormwater_designs',
        'channel_designs',
      ];

      if (!validTables.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type: ${type}` },
          { status: 400 }
        );
      }

      const file = await queryOne<FileRecord>(
        getClient(),
        `SELECT gcs_path, project_id, name, file_size_bytes FROM ${type} WHERE id = ?`,
        [fileId]
      );

      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      if (!file.gcs_path) {
        return NextResponse.json(
          { error: 'File has no GCS path (legacy data?)' },
          { status: 404 }
        );
      }

      // Verify user owns this file's project
      const project = await queryOne<{ user_id: string }>(
        getClient(),
        'SELECT user_id FROM projects WHERE id = ?',
        [file.project_id]
      );

      if (!project || project.user_id !== req.user.userId) {
        return NextResponse.json(
          { error: 'Unauthorized access to file' },
          { status: 403 }
        );
      }

      // Generate signed URL
      const signedUrl = await getFileUrl(file.gcs_path, expires);

      return NextResponse.json({
        success: true,
        fileId,
        name: file.name,
        size: file.file_size_bytes,
        url: signedUrl,
        expiresIn: expires * 60, // seconds
      });
    } catch (error) {
      console.error('File download error:', error);
      return NextResponse.json(
        { error: 'Failed to get file URL' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/files/[id]?type=survey_datasets
 * Delete file from GCS and database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const fileId = params.id;
      const url = new URL(request.url);
      const type = url.searchParams.get('type');

      if (!type) {
        return NextResponse.json(
          { error: 'Missing required query parameter: type' },
          { status: 400 }
        );
      }

      // Query file record
      const validTables = [
        'survey_datasets',
        'generated_surfaces',
        'water_network_designs',
        'sewer_designs',
        'stormwater_designs',
        'channel_designs',
      ];

      if (!validTables.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type: ${type}` },
          { status: 400 }
        );
      }

      const file = await queryOne<FileRecord>(
        getClient(),
        `SELECT gcs_path, project_id FROM ${type} WHERE id = ?`,
        [fileId]
      );

      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      // Verify user owns this file's project
      const project = await queryOne<{ user_id: string }>(
        getClient(),
        'SELECT user_id FROM projects WHERE id = ?',
        [file.project_id]
      );

      if (!project || project.user_id !== req.user.userId) {
        return NextResponse.json(
          { error: 'Unauthorized access to file' },
          { status: 403 }
        );
      }

      // Delete from GCS
      if (file.gcs_path) {
        await deleteFile(file.gcs_path);
      }

      // Delete database record
      await execute(getClient(), `DELETE FROM ${type} WHERE id = ?`, [fileId]);

      return NextResponse.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('File deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }
  });
}
