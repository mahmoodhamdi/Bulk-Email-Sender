import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import {
  validateCsrfToken,
  getOrCreateCsrfToken,
} from './lib/csrf';
import { applySecurityHeaders, generateNonce } from './lib/security-headers';

const intlMiddleware = createMiddleware(routing);

// API routes that don't require CSRF protection
const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/tracking/open',
  '/api/tracking/click',
  '/api/tracking/unsubscribe',
  '/api/tracking/webhook',
  '/api/auth', // NextAuth.js routes handle their own CSRF
];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle API routes with CSRF protection
  if (pathname.startsWith('/api/')) {
    // Skip CSRF for public API routes (GET requests, webhooks, tracking)
    const isPublicRoute = PUBLIC_API_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    // Skip CSRF for GET requests (read-only operations)
    const isGetRequest = request.method === 'GET';

    if (!isPublicRoute && !isGetRequest && !validateCsrfToken(request)) {
      const response = NextResponse.json(
        {
          error: 'CSRF token validation failed',
          message: 'Missing or invalid CSRF token',
        },
        { status: 403 }
      );
      return applySecurityHeaders(response, { isApiRoute: true });
    }

    // API routes don't need intl middleware
    const response = NextResponse.next();
    return applySecurityHeaders(response, { isApiRoute: true });
  }

  // Generate nonce for CSP
  const nonce = generateNonce();

  // Apply intl middleware for non-API routes
  const response = intlMiddleware(request);

  // Ensure CSRF token cookie is set for page requests
  const { cookie } = getOrCreateCsrfToken(request);
  if (cookie) {
    response.headers.set('Set-Cookie', cookie);
  }

  return applySecurityHeaders(response, { isApiRoute: false, nonce });
}

export const config = {
  matcher: ['/', '/(ar|en)/:path*', '/((?!_next|_vercel|.*\\..*).*)'],
};
