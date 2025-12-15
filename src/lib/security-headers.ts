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

// CSP for non-API routes (more restrictive)
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * Apply security headers to a response
 * @param response - The NextResponse object
 * @param isApiRoute - Whether this is an API route (skips CSP)
 * @returns The response with security headers applied
 */
export function applySecurityHeaders(response: NextResponse, isApiRoute: boolean = false): NextResponse {
  // Add standard security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add CSP for non-API routes
  if (!isApiRoute) {
    response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
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
