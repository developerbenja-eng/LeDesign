import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, queryOne, execute } from '@ledesign/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth-helpers';
import { User, PublicUser } from '@/types/user';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'auth_token';

export async function GET(request: NextRequest) {
  try {
    // Try to get token from cookie first, then from Authorization header
    const cookieStore = await cookies();
    let token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      // Fallback to Authorization header
      const authHeader = request.headers.get('Authorization');
      token = extractTokenFromHeader(authHeader) || undefined;
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify the token
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch current user data from database
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

    // Return user without password hash
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      role: user.role,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      google_id: user.google_id,
    };

    return NextResponse.json({
      success: true,
      user: publicUser,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Try to get token from cookie first, then from Authorization header
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

    const body = await request.json();
    const { name, company } = body;

    // Update user profile
    const now = new Date().toISOString();
    await execute(
      getDb(),
      'UPDATE users SET name = ?, company = ?, updated_at = ? WHERE id = ?',
      [name || null, company || null, now, decoded.userId]
    );

    // Fetch updated user
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

    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      role: user.role,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      google_id: user.google_id,
    };

    return NextResponse.json({
      success: true,
      user: publicUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
