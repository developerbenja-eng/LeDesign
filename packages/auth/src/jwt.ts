import jwt, { type SignOptions } from 'jsonwebtoken';

// ============================================================
// JWT TOKEN MANAGEMENT
// ============================================================
// Core JWT functions for token generation and verification
// Framework-agnostic implementation
// ============================================================

const DEFAULT_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export interface TokenOptions {
  secret: string;
  expiresIn?: SignOptions['expiresIn'];
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  options: TokenOptions
): string {
  const expiresIn = options.expiresIn ?? DEFAULT_TOKEN_EXPIRY;
  return jwt.sign(payload, options.secret, { expiresIn });
}

/**
 * Verify and decode a JWT token
 * Returns the decoded payload if valid, null otherwise
 */
export function verifyToken(
  token: string,
  secret: string
): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Decode a JWT token without verification
 * Use this only for inspecting token contents
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Extract token from Authorization header
 * Handles both "Bearer <token>" and raw token formats
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Get time until token expiration in seconds
 * Returns -1 if token is already expired or invalid
 */
export function getTokenTimeToLive(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return -1;

  const now = Math.floor(Date.now() / 1000);
  const ttl = decoded.exp - now;

  return ttl > 0 ? ttl : -1;
}

/**
 * Refresh a token by generating a new one with the same payload
 * but extended expiration
 */
export function refreshToken(
  token: string,
  secret: string,
  newExpiry?: SignOptions['expiresIn']
): string | null {
  const decoded = verifyToken(token, secret);
  if (!decoded) return null;

  // Remove iat and exp from payload
  const { iat, exp, ...payload } = decoded;

  return generateToken(payload as Omit<TokenPayload, 'iat' | 'exp'>, {
    secret,
    expiresIn: newExpiry ?? DEFAULT_TOKEN_EXPIRY,
  });
}
