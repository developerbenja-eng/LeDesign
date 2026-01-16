/**
 * Authentication Helper Functions
 * Wrappers around @ledesign/auth to simplify auth route implementation
 */

import { generateToken as generateJWT, verifyToken as verifyJWT, extractTokenFromHeader } from '@ledesign/auth';
import type { User } from '@/types/user';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export { extractTokenFromHeader };

/**
 * Generate JWT token for a user
 * Simplified wrapper that uses environment JWT_SECRET
 */
export function generateToken(user: User): string {
  return generateJWT(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    {
      secret: JWT_SECRET,
      expiresIn: '7d',
    }
  );
}

/**
 * Verify JWT token
 * Simplified wrapper that uses environment JWT_SECRET
 */
export function verifyToken(token: string) {
  return verifyJWT(token, JWT_SECRET);
}
