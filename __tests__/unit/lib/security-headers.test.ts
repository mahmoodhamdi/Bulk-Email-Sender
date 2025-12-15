import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import {
  SECURITY_HEADERS,
  CONTENT_SECURITY_POLICY,
  applySecurityHeaders,
  getSecureApiHeaders,
} from '@/lib/security-headers';

describe('Security Headers', () => {
  describe('SECURITY_HEADERS', () => {
    it('should include X-Content-Type-Options', () => {
      expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should include X-Frame-Options', () => {
      expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    });

    it('should include X-XSS-Protection', () => {
      expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block');
    });

    it('should include Referrer-Policy', () => {
      expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should include Permissions-Policy', () => {
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()');
    });

    it('should include Strict-Transport-Security', () => {
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age');
    });
  });

  describe('CONTENT_SECURITY_POLICY', () => {
    it('should include default-src', () => {
      expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    });

    it('should include script-src', () => {
      expect(CONTENT_SECURITY_POLICY).toContain('script-src');
    });

    it('should include style-src', () => {
      expect(CONTENT_SECURITY_POLICY).toContain('style-src');
    });

    it('should include img-src with data and https', () => {
      expect(CONTENT_SECURITY_POLICY).toContain('img-src');
      expect(CONTENT_SECURITY_POLICY).toContain('data:');
    });

    it('should include frame-ancestors none', () => {
      expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    });
  });

  describe('applySecurityHeaders', () => {
    it('should apply all security headers to response', () => {
      const response = NextResponse.json({ data: 'test' });
      const securedResponse = applySecurityHeaders(response);

      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(securedResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should add CSP for non-API routes', () => {
      const response = NextResponse.json({ data: 'test' });
      const securedResponse = applySecurityHeaders(response, false);

      expect(securedResponse.headers.get('Content-Security-Policy')).toBeTruthy();
    });

    it('should NOT add CSP for API routes', () => {
      const response = NextResponse.json({ data: 'test' });
      const securedResponse = applySecurityHeaders(response, true);

      expect(securedResponse.headers.get('Content-Security-Policy')).toBeNull();
    });

    it('should return the same response object', () => {
      const response = NextResponse.json({ data: 'test' });
      const securedResponse = applySecurityHeaders(response);

      expect(securedResponse).toBe(response);
    });
  });

  describe('getSecureApiHeaders', () => {
    it('should return Headers object with security headers', () => {
      const headers = getSecureApiHeaders();

      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headers.get('X-Frame-Options')).toBe('DENY');
      expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should NOT include CSP in API headers', () => {
      const headers = getSecureApiHeaders();

      expect(headers.get('Content-Security-Policy')).toBeNull();
    });
  });
});
