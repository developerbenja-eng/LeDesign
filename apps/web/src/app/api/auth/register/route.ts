import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryOne, execute } from '@ledesign/db';
import { generateToken } from '@/lib/auth-helpers';
import { hashPassword, validatePasswordStrength } from '@ledesign/auth';
import { User, PublicUser } from '@/types/user';
import { generateId, isValidEmail } from '@/lib/utils';
import { getUserDb } from '@/lib/db/database-manager';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await queryOne<User>(
      getDb(),
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await execute(
      getDb(),
      `INSERT INTO users (
        id, email, password_hash, name, role,
        email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        email.toLowerCase(),
        passwordHash,
        name || null,
        'user',
        false,
        now,
        now,
      ]
    );

    // Fetch created user
    const user = await queryOne<User>(
      getDb(),
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create user database immediately (includes migrations)
    console.log(`Creating database for new user ${userId}...`);
    try {
      await getUserDb(userId);
      console.log(`✓ User database created for ${userId}`);
    } catch (error) {
      console.error(`Failed to create user database for ${userId}:`, error);
      // Continue anyway - database will be created on first use
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
      last_login: user.last_login,
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
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
