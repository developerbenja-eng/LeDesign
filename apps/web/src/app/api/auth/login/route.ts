import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryOne, execute } from '@ledesign/db';
import { generateToken } from '@/lib/auth-helpers';
import { comparePassword } from '@ledesign/auth';
import { User, PublicUser } from '@/types/user';
import { getAuthDb, getUserDb } from '@/lib/db/database-manager';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await queryOne<User>(
      getDb(),
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    const now = new Date().toISOString();
    await execute(
      getDb(),
      'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?',
      [now, now, user.id]
    );

    // Ensure user database exists (creates if first login)
    const authDb = getAuthDb();
    const dbExists = await queryOne<{ user_id: string }>(
      authDb,
      'SELECT user_id FROM user_databases WHERE user_id = ?',
      [user.id]
    );

    if (!dbExists) {
      console.log(`Creating database for user ${user.id} on first login...`);
      try {
        await getUserDb(user.id);
        console.log(`✓ User database created for ${user.id}`);
      } catch (error) {
        console.error(`Failed to create user database for ${user.id}:`, error);
        // Continue anyway - database will be created on first use
      }
    }

    // Generate JWT
    const token = generateToken(user);

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
      last_login: now,
      google_id: user.google_id,
    };

    const response = NextResponse.json({
      success: true,
      user: publicUser,
      token,
    });

    // Set HTTP-only cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
