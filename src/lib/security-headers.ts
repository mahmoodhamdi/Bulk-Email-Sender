import { NextResponse } from 'next/server';

// Security headers to add to all responses
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * Generate a cryptographic nonce for CSP
 * Uses Web Crypto API for Edge Runtime compatibility
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Build CSP with nonce for non-API routes (secure, no unsafe-inline/eval)
 */
export function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
}

/**
 * Build a more permissive CSP for development mode
 * Still uses nonces but allows more flexibility for hot reload
 */
export function buildDevContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // Development needs unsafe-eval for Next.js hot reload
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https: ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

// Legacy export for backwards compatibility (deprecated)
export const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy('NONCE_PLACEHOLDER');

/**
 * Apply security headers to a response
 * @param response - The NextResponse object
 * @param options - Configuration options
 * @returns The response with security headers applied
 */
export function applySecurityHeaders(
  response: NextResponse,
  options: {
    isApiRoute?: boolean;
    nonce?: string;
  } = {}
): NextResponse {
  const { isApiRoute = false, nonce } = options;
  const isDev = process.env.NODE_ENV === 'development';

  // Add standard security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add CSP for non-API routes
  if (!isApiRoute) {
    // Generate nonce if not provided
    const cspNonce = nonce || generateNonce();

    // Use dev CSP in development, strict CSP in production
    const csp = isDev
      ? buildDevContentSecurityPolicy(cspNonce)
      : buildContentSecurityPolicy(cspNonce);

    response.headers.set('Content-Security-Policy', csp);

    // Set nonce as header so it can be read by Server Components
    response.headers.set('X-Nonce', cspNonce);
  }

  return response;
}

/**
 * Create secure response headers for API routes
 */
export function getSecureApiHeaders(): Headers {
  const headers = new Headers();
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return headers;
}
