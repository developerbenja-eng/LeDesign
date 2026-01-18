import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, queryOne, execute } from '@ledesign/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth-helpers';
import { comparePassword, hashPassword } from '@ledesign/auth';
import { User } from '@/types/user';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'auth_token';

export async function POST(request: NextRequest) {
  try {
    // Get token
    const cookieStore = await cookies();
    let token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      const authHeader = request.headers.get('Authorization');
      token = extractTokenFromHeader(authHeader) || undefined;
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Fetch user from database
    const user = await queryOne<User>(
      getDb(),
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const now = new Date().toISOString();
    await execute(
      getDb(),
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [newPasswordHash, now, user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
