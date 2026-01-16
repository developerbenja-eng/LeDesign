import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, extractTokenFromHeader } from './auth-helpers';
import { AuthTokenPayload, User } from '@/types/user';
import { getDb, queryOne } from '@ledesign/db';

const COOKIE_NAME = 'auth_token';

export interface AuthenticatedRequest extends NextRequest {
  user: AuthTokenPayload;
  dbUser?: User; // Fresh user data from database
}

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Get token from cookie first (using next/headers like /api/auth/me does)
  const cookieStore = await cookies();
  let token = cookieStore.get(COOKIE_NAME)?.value;

  // Fall back to Authorization header if no cookie
  if (!token || token.trim() === '') {
    const authHeader = request.headers.get('Authorization');
    token = extractTokenFromHeader(authHeader) || undefined;
  }

  if (!token || token.trim() === '') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // Fetch fresh user data from database (for role verification)
  const dbUser = await queryOne<User>(
    getDb(),
    'SELECT * FROM users WHERE id = ?',
    [payload.userId]
  );

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  // Update payload with current role from database
  const updatedPayload: AuthTokenPayload = {
    ...payload,
    role: dbUser.role, // Use the database role instead of JWT role
  };

  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = updatedPayload;
  authenticatedRequest.dbUser = dbUser;

  return handler(authenticatedRequest);
}

export async function withAdminAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (req) => {
    if (!['admin', 'owner'].includes(req.user.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return handler(req);
  });
}

export async function withOwnerAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (req) => {
    if (req.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Owner access required' },
        { status: 403 }
      );
    }

    return handler(req);
  });
}

export interface OptionalAuthRequest extends NextRequest {
  user: AuthTokenPayload | null;
}

export async function withOptionalAuth(
  request: NextRequest,
  handler: (req: OptionalAuthRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  const optionalRequest = request as OptionalAuthRequest;

  if (token) {
    const payload = verifyToken(token);
    optionalRequest.user = payload;
  } else {
    optionalRequest.user = null;
  }

  return handler(optionalRequest);
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthTokenPayload | null> {
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) return null;

  return verifyToken(token);
}

export async function getFullUser(userId: string): Promise<User | null> {
  return queryOne<User>(
    getDb(),
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
}
