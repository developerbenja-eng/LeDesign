// ============================================================
// MIDDLEWARE - AUTHENTICATION & ROUTING
// ============================================================
// Protects routes and handles authentication flow

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/signup',
    '/auth/signup',
    '/auth/error',
    '/early-access',
    '/presentation',
    '/presentation/video',
    '/presentations',
    '/business-analysis',
    '/coming-soon',
    '/enterprise',
    '/hydraulics',
    '/integrations',
    '/pavement',
    '/pitch',
    '/plan',
    '/road',
    '/sponsors',
    '/structural',
    '/terrain',
  ];

  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const token = request.cookies.get('auth_token')?.value;

  // Protected routes - redirect to signin if not authenticated
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // TODO: Optionally verify token here for extra security
  // For now, we trust the token presence and let API routes validate

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled by API middleware)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next/data).*)',
  ],
};
