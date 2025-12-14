import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import {
  validateCsrfToken,
  getOrCreateCsrfToken,
  CSRF_COOKIE_NAME,
} from './lib/csrf';

const intlMiddleware = createMiddleware(routing);

// API routes that don't require CSRF protection
const PUBLIC_API_ROUTES = ['/api/health', '/api/track', '/api/unsubscribe'];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle API routes with CSRF protection
  if (pathname.startsWith('/api/')) {
    // Skip CSRF for public API routes
    const isPublicRoute = PUBLIC_API_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (!isPublicRoute && !validateCsrfToken(request)) {
      return NextResponse.json(
        {
          error: 'CSRF token validation failed',
          message: 'Missing or invalid CSRF token',
        },
        { status: 403 }
      );
    }

    // API routes don't need intl middleware
    return NextResponse.next();
  }

  // Apply intl middleware for non-API routes
  const response = intlMiddleware(request);

  // Ensure CSRF token cookie is set for page requests
  const { token, cookie } = getOrCreateCsrfToken(request);
  if (cookie) {
    response.headers.set('Set-Cookie', cookie);
  }

  return response;
}

export const config = {
  matcher: ['/', '/(ar|en)/:path*', '/((?!_next|_vercel|.*\\..*).*)'],
};
