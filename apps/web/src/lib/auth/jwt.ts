import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthTokenPayload, User, PublicUser } from '@/types/user';
import { getDb, queryOne } from '@/lib/db/turso';

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = 'auth_token';
const TOKEN_EXPIRY = '7d';

export function generateToken(user: User): string {
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.decode(token) as AuthTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Verify authentication from request (cookie or Authorization header)
 * Returns the authenticated user or null if not authenticated
 */
export async function verifyAuth(request: NextRequest): Promise<PublicUser | null> {
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
      return null;
    }

    // Verify the token
    const decoded = verifyToken(token);

    if (!decoded) {
      return null;
    }

    // Fetch current user data from database
    const user = await queryOne<User>(
      getDb(),
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return null;
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

    return publicUser;
  } catch {
    return null;
  }
}
