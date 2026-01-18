import { NextRequest, NextResponse } from 'next/server';
import { getAuthDb } from '@/lib/db/database-manager';
import { runArchivalJob } from '@/lib/storage/archival-service';
import { query } from '@ledesign/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/archival
 * Run archival job for all users
 *
 * This endpoint should be called by a cron service (e.g., Vercel Cron)
 * to automatically archive large/old data to GCS.
 *
 * Security: Verify cron secret token to prevent unauthorized access
 *
 * Vercel cron.json example:
 * {
 *   "crons": [{
 *     "path": "/api/cron/archival",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (recommended for production)
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }

    const authDb = getAuthDb();

    // Get all users with databases
    const users = await query<{ user_id: string; turso_db_name: string }>(
      authDb,
      `SELECT user_id, turso_db_name FROM user_databases ORDER BY user_id`
    );

    console.log(`Starting archival job for ${users.length} users`);

    const results = {
      totalUsers: users.length,
      successfulUsers: 0,
      failedUsers: 0,
      totalItemsArchived: 0,
      totalBytesArchived: 0,
      errors: [] as string[],
      startedAt: new Date().toISOString(),
      completedAt: '',
    };

    // Run archival job for each user
    for (const user of users) {
      try {
        console.log(`Running archival for user ${user.user_id}...`);

        const result = await runArchivalJob(user.user_id);

        if (result.success) {
          results.successfulUsers++;
          results.totalItemsArchived += result.itemsArchived;
          results.totalBytesArchived += result.bytesArchived;

          console.log(
            `✓ User ${user.user_id}: ${result.itemsArchived} items, ${(
              result.bytesArchived /
              1024 /
              1024
            ).toFixed(2)} MB`
          );
        } else {
          results.failedUsers++;
          results.errors.push(
            `User ${user.user_id}: ${result.errors.join('; ')}`
          );
          console.error(`✗ User ${user.user_id} failed:`, result.errors);
        }
      } catch (error: any) {
        results.failedUsers++;
        results.errors.push(`User ${user.user_id}: ${error.message}`);
        console.error(`✗ User ${user.user_id} error:`, error);
      }
    }

    results.completedAt = new Date().toISOString();

    console.log(`Archival job complete:`);
    console.log(`  - Successful: ${results.successfulUsers}/${results.totalUsers}`);
    console.log(`  - Items archived: ${results.totalItemsArchived}`);
    console.log(
      `  - Data archived: ${(results.totalBytesArchived / 1024 / 1024).toFixed(2)} MB`
    );

    if (results.errors.length > 0) {
      console.error(`  - Errors:`, results.errors);
    }

    return NextResponse.json({
      success: results.failedUsers === 0,
      results,
    });
  } catch (error: any) {
    console.error('Cron archival job error:', error);
    return NextResponse.json(
      {
        error: 'Archival job failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/archival
 * Get last archival job status (for monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    const authDb = getAuthDb();

    // Get recent archival jobs
    const recentJobs = await query<{
      id: string;
      user_id: string;
      job_type: string;
      status: string;
      items_processed: number;
      bytes_archived: number;
      error_message: string | null;
      started_at: string;
      completed_at: string | null;
    }>(
      authDb,
      `SELECT * FROM archival_jobs
       ORDER BY started_at DESC
       LIMIT 50`
    );

    // Calculate summary statistics
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recent = recentJobs.filter(
      (j) => new Date(j.started_at) > last24Hours
    );

    const summary = {
      last24Hours: {
        totalJobs: recent.length,
        successful: recent.filter((j) => j.status === 'completed').length,
        failed: recent.filter((j) => j.status === 'failed').length,
        running: recent.filter((j) => j.status === 'running').length,
        totalItemsArchived: recent.reduce(
          (sum, j) => sum + (j.items_processed || 0),
          0
        ),
        totalBytesArchived: recent.reduce(
          (sum, j) => sum + (j.bytes_archived || 0),
          0
        ),
      },
      allTime: {
        totalJobs: recentJobs.length,
        successful: recentJobs.filter((j) => j.status === 'completed').length,
        failed: recentJobs.filter((j) => j.status === 'failed').length,
      },
      recentJobs: recentJobs.slice(0, 10), // Last 10 jobs
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Get archival status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get archival status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
