import { NextRequest, NextResponse } from 'next/server';
import { getClient, queryOne, execute } from '@ledesign/db';
import { generateToken } from '@/lib/auth-helpers';
import { User } from '@/types/user';
import { generateId } from '@/lib/utils';
import { getUserDb } from '@/lib/db/database-manager';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name?: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle errors from Google
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${APP_URL}/auth/signin?error=google_auth_failed`);
    }

    if (!code) {
      return NextResponse.redirect(`${APP_URL}/auth/signin?error=no_code`);
    }

    // Parse return URL from state
    let returnTo = '/';
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        returnTo = stateData.returnTo || '/';
      } catch {
        // Invalid state, use default
      }
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to exchange code for tokens:', await tokenResponse.text());
      return NextResponse.redirect(`${APP_URL}/auth/signin?error=token_exchange_failed`);
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info:', await userInfoResponse.text());
      return NextResponse.redirect(`${APP_URL}/auth/signin?error=user_info_failed`);
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    // Check if user exists
    let user = await queryOne<User>(
      getClient(),
      'SELECT * FROM users WHERE email = ? OR google_id = ?',
      [googleUser.email.toLowerCase(), googleUser.id]
    );

    const now = new Date().toISOString();

    if (!user) {
      // Create new user
      const userId = generateId();
      // OAuth users don't have a password - use a random placeholder that can't be used for login
      const oauthPasswordPlaceholder = `oauth_${generateId()}_${Date.now()}`;

      await execute(
        getClient(),
        `INSERT INTO users (
          id, email, name, avatar_url, role,
          email_verified, google_id, created_at, updated_at, password_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          googleUser.email.toLowerCase(),
          googleUser.name,
          googleUser.picture,
          'user',
          true, // Google accounts are verified
          googleUser.id,
          now,
          now,
          oauthPasswordPlaceholder,
        ]
      );

      // Fetch created user
      user = await queryOne<User>(
        getClient(),
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
    } else {
      // Update existing user with Google info
      await execute(
        getClient(),
        `UPDATE users SET
          google_id = COALESCE(google_id, ?),
          avatar_url = COALESCE(avatar_url, ?),
          email_verified = 1,
          last_login = ?,
          updated_at = ?
        WHERE id = ?`,
        [googleUser.id, googleUser.picture, now, now, user.id]
      );

      // Refetch user with updates
      user = await queryOne<User>(
        getClient(),
        'SELECT * FROM users WHERE id = ?',
        [user.id]
      );
    }

    if (!user) {
      return NextResponse.redirect(`${APP_URL}/auth/signin?error=user_creation_failed`);
    }

    // Create user database immediately (includes migrations)
    console.log(`Creating database for user ${user.id}...`);
    try {
      await getUserDb(user.id);
      console.log(`✓ User database created for ${user.id}`);
    } catch (error) {
      console.error(`Failed to create user database for ${user.id}:`, error);
      // Continue anyway - database will be created on first use
    }

    // Generate JWT
    const token = generateToken(user);

    // Redirect to app with cookie set
    const response = NextResponse.redirect(`${APP_URL}${returnTo}`);

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${APP_URL}/auth/signin?error=oauth_failed`);
  }
}
