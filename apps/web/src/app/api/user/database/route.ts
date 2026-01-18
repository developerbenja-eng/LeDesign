import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getUserDb, getAuthDb } from '@/lib/db/database-manager';
import { getUserStorageStats } from '@/lib/storage/archival-service';
import { queryOne } from '@ledesign/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/database
 * Get user database status and storage statistics
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user.userId;
      const authDb = getAuthDb();

      // Check if user database exists
      const dbInfo = await queryOne<{
        turso_db_name: string;
        turso_db_url: string;
        database_size_bytes: number;
        created_at: string;
        updated_at: string;
      }>(
        authDb,
        `SELECT turso_db_name, turso_db_url, database_size_bytes, created_at, updated_at
         FROM user_databases WHERE user_id = ?`,
        [userId]
      );

      if (!dbInfo) {
        return NextResponse.json({
          exists: false,
          message: 'User database not yet created',
        });
      }

      // Get storage statistics
      const stats = await getUserStorageStats(userId);

      return NextResponse.json({
        exists: true,
        database: {
          name: dbInfo.turso_db_name,
          url: dbInfo.turso_db_url,
          sizeBytes: dbInfo.database_size_bytes,
          sizeMB: (dbInfo.database_size_bytes / 1024 / 1024).toFixed(2),
          createdAt: dbInfo.created_at,
          updatedAt: dbInfo.updated_at,
        },
        storage: {
          tursoBytes: stats.tursoBytes,
          tursoMB: (stats.tursoBytes / 1024 / 1024).toFixed(2),
          gcsBytes: stats.gcsBytes,
          gcsMB: (stats.gcsBytes / 1024 / 1024).toFixed(2),
          totalBytes: stats.totalBytes,
          totalMB: (stats.totalBytes / 1024 / 1024).toFixed(2),
          hotSurveys: stats.hotSurveys,
          coldSurveys: stats.coldSurveys,
          hotNetworks: stats.hotNetworks,
          coldNetworks: stats.coldNetworks,
        },
      });
    } catch (error) {
      console.error('Get database info error:', error);
      return NextResponse.json(
        { error: 'Failed to get database information' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/user/database
 * Initialize user database (called on first project creation)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user.userId;
      const authDb = getAuthDb();

      // Check if database already exists
      const existing = await queryOne<{ turso_db_name: string }>(
        authDb,
        `SELECT turso_db_name FROM user_databases WHERE user_id = ?`,
        [userId]
      );

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'User database already exists',
          databaseName: existing.turso_db_name,
        });
      }

      // Create user database (this will also run migrations)
      const userDb = await getUserDb(userId);

      // Fetch the database info that was just created
      const dbInfo = await queryOne<{
        turso_db_name: string;
        turso_db_url: string;
      }>(
        authDb,
        `SELECT turso_db_name, turso_db_url FROM user_databases WHERE user_id = ?`,
        [userId]
      );

      return NextResponse.json({
        success: true,
        message: 'User database created successfully',
        database: {
          name: dbInfo!.turso_db_name,
          url: dbInfo!.turso_db_url,
        },
      });
    } catch (error: any) {
      console.error('Initialize database error:', error);
      return NextResponse.json(
        {
          error: 'Failed to initialize user database',
          details: error.message,
        },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/user/database
 * Delete user database (admin only - for testing)
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      // Only allow admins to delete databases
      if (!['admin', 'owner'].includes(req.user.role)) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      const userId = req.user.userId;
      const authDb = getAuthDb();

      // Get database name
      const dbInfo = await queryOne<{ turso_db_name: string }>(
        authDb,
        `SELECT turso_db_name FROM user_databases WHERE user_id = ?`,
        [userId]
      );

      if (!dbInfo) {
        return NextResponse.json(
          { error: 'User database not found' },
          { status: 404 }
        );
      }

      // Delete from Turso using CLI
      const { execSync } = require('child_process');
      execSync(`turso db destroy ${dbInfo.turso_db_name} --yes`, {
        stdio: 'inherit',
      });

      // Remove from registry
      await authDb.execute({
        sql: 'DELETE FROM user_databases WHERE user_id = ?',
        args: [userId],
      });

      return NextResponse.json({
        success: true,
        message: 'User database deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete database error:', error);
      return NextResponse.json(
        {
          error: 'Failed to delete user database',
          details: error.message,
        },
        { status: 500 }
      );
    }
  });
}
