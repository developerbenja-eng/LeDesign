import { NextRequest, NextResponse } from 'next/server';
import { getDb, execute, queryOne } from '@ledesign/db';
import { generateId } from '@/lib/utils';
import type { TestVerification, CreateVerificationRequest } from '@/types/validation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/validation/verify
 *
 * Create a verification for a test result
 *
 * Request body:
 * {
 *   "test_result_id": "result_id",
 *   "verified_by_name": "Jane Doe",
 *   "verified_by_email": "jane@example.com",
 *   "verified_by_role": "Senior Engineer",
 *   "verification_status": "verified" | "disputed" | "needs_review",
 *   "comment": "Optional comment"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateVerificationRequest = await request.json();
    const {
      test_result_id,
      verified_by_name,
      verified_by_email,
      verified_by_role,
      verification_status,
      comment,
    } = body;

    // Validate required fields
    if (!test_result_id || !verified_by_name || !verification_status) {
      return NextResponse.json(
        {
          error: 'Missing required fields: test_result_id, verified_by_name, verification_status',
        },
        { status: 400 }
      );
    }

    // Validate verification status
    const validStatuses = ['verified', 'disputed', 'needs_review'];
    if (!validStatuses.includes(verification_status)) {
      return NextResponse.json(
        { error: `Invalid verification_status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check that the test result exists
    const testResult = await queryOne<{ id: string }>(
      db,
      `SELECT id FROM test_results WHERE id = ?`,
      [test_result_id]
    );

    if (!testResult) {
      return NextResponse.json({ error: 'Test result not found' }, { status: 404 });
    }

    // Get client info for audit trail
    const ip_address =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';

    // Create the verification
    const id = generateId();
    const now = new Date().toISOString();

    await execute(
      db,
      `INSERT INTO test_verifications (
        id, test_result_id, verified_by_name, verified_by_email, verified_by_role,
        verification_status, comment, verification_date, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        test_result_id,
        verified_by_name,
        verified_by_email || null,
        verified_by_role || null,
        verification_status,
        comment || null,
        now,
        ip_address,
        user_agent,
        now,
      ]
    );

    // Fetch the created verification
    const verification = await queryOne<TestVerification>(
      db,
      `SELECT * FROM test_verifications WHERE id = ?`,
      [id]
    );

    return NextResponse.json(
      {
        success: true,
        verification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating verification:', error);
    return NextResponse.json(
      {
        error: 'Failed to create verification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
