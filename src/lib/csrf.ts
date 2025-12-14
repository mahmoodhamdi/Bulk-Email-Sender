/**
 * CSRF Protection using Double Submit Cookie pattern
 *
 * This implementation uses the double-submit cookie pattern where:
 * 1. A random token is generated and stored in a cookie
 * 2. The same token must be sent in a header (X-CSRF-Token) for state-changing requests
 * 3. The server validates that both values match
 *
 * This pattern works because attackers cannot read cookies from other domains
 * due to the same-origin policy.
 */

import { generateShortId } from './crypto';

export const CSRF_COOKIE_NAME = 'csrf-token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';
export const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  return generateShortId(CSRF_TOKEN_LENGTH);
}

/**
 * Extract CSRF token from request cookies
 */
export function getCsrfTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  return cookies[CSRF_COOKIE_NAME] || null;
}

/**
 * Extract CSRF token from request header
 */
export function getCsrfTokenFromHeader(request: Request): string | null {
  return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * Parse cookie header into key-value pairs
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}

/**
 * Validate CSRF token for a request
 * Returns true if the request is safe (GET, HEAD, OPTIONS) or has valid CSRF token
 */
export function validateCsrfToken(request: Request): boolean {
  // Safe methods don't need CSRF protection
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (safeMethod) return true;

  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  // Both tokens must be present and match
  if (!cookieToken || !headerToken) return false;

  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(cookieToken, headerToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Create a Set-Cookie header value for CSRF token
 */
export function createCsrfCookie(token: string, options?: { secure?: boolean }): string {
  const secure = options?.secure ?? process.env.NODE_ENV === 'production';
  const parts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'Path=/',
    'SameSite=Strict',
    'HttpOnly',
  ];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * CSRF middleware for API routes
 * Returns a Response if CSRF validation fails, or null to continue
 */
export async function csrfMiddleware(request: Request): Promise<Response | null> {
  // Only apply to API routes
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return null;

  // Skip CSRF for certain API routes that need to be publicly accessible
  const publicApiRoutes = ['/api/health', '/api/track', '/api/unsubscribe'];
  if (publicApiRoutes.some((route) => url.pathname.startsWith(route))) {
    return null;
  }

  if (!validateCsrfToken(request)) {
    return new Response(
      JSON.stringify({
        error: 'CSRF token validation failed',
        message: 'Missing or invalid CSRF token',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}

/**
 * Get or create CSRF token for response
 * Returns the token and the Set-Cookie header
 */
export function getOrCreateCsrfToken(request: Request): { token: string; cookie: string | null } {
  const existingToken = getCsrfTokenFromCookie(request);

  if (existingToken) {
    return { token: existingToken, cookie: null };
  }

  const newToken = generateCsrfToken();
  const cookie = createCsrfCookie(newToken);
  return { token: newToken, cookie };
}
