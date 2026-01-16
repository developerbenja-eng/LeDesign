// ============================================================
// NEXT-AUTH V5 CONFIGURATION
// ============================================================
// Unified authentication configuration for LeDesign web app

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { comparePassword } from '@ledesign/auth';

// User type for authentication
interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // TODO: Implement database query
        // This would query the database:
        // const user = await db.query.users.findFirst({ where: eq(users.email, credentials.email) })
        // if (!user) return null;
        // const isValid = await comparePassword(credentials.password as string, user.password_hash);
        // if (!isValid) return null;
        // return { id: user.id, email: user.email, name: user.name };

        // Placeholder: Authentication not yet implemented
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

// Auth helper functions
export async function getSession() {
  return await auth();
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
