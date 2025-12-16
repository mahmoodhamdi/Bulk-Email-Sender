import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import {
  SECURITY_HEADERS,
  CONTENT_SECURITY_POLICY,
  applySecurityHeaders,
  getSecureApiHeaders,
  generateNonce,
  buildContentSecurityPolicy,
  buildDevContentSecurityPolicy,
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

  describe('generateNonce', () => {
    it('should generate a base64 encoded nonce', () => {
      const nonce = generateNonce();
      expect(nonce).toBeTruthy();
      expect(typeof nonce).toBe('string');
      // Base64 encoded 16 bytes should be ~24 characters
      expect(nonce.length).toBeGreaterThan(20);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('buildContentSecurityPolicy', () => {
    it('should include nonce in script-src', () => {
      const nonce = 'test-nonce-123';
      const csp = buildContentSecurityPolicy(nonce);
      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).toContain("'strict-dynamic'");
    });

    it('should include nonce in style-src', () => {
      const nonce = 'test-nonce-123';
      const csp = buildContentSecurityPolicy(nonce);
      expect(csp).toContain("style-src 'self' 'nonce-test-nonce-123'");
    });

    it('should NOT include unsafe-inline or unsafe-eval', () => {
      const nonce = 'test-nonce-123';
      const csp = buildContentSecurityPolicy(nonce);
      expect(csp).not.toContain('unsafe-inline');
      expect(csp).not.toContain('unsafe-eval');
    });
  });

  describe('buildDevContentSecurityPolicy', () => {
    it('should include unsafe-eval for development hot reload', () => {
      const nonce = 'test-nonce-123';
      const csp = buildDevContentSecurityPolicy(nonce);
      expect(csp).toContain("'unsafe-eval'");
    });

    it('should include ws: and wss: for WebSocket connections', () => {
      const nonce = 'test-nonce-123';
      const csp = buildDevContentSecurityPolicy(nonce);
      expect(csp).toContain('ws:');
      expect(csp).toContain('wss:');
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
      const securedResponse = applySecurityHeaders(response, { isApiRoute: false });

      expect(securedResponse.headers.get('Content-Security-Policy')).toBeTruthy();
    });

    it('should NOT add CSP for API routes', () => {
      const response = NextResponse.json({ data: 'test' });
      const securedResponse = applySecurityHeaders(response, { isApiRoute: true });

      expect(securedResponse.headers.get('Content-Security-Policy')).toBeNull();
    });

    it('should use provided nonce in CSP', () => {
      const response = NextResponse.json({ data: 'test' });
      const nonce = 'custom-nonce-abc';
      const securedResponse = applySecurityHeaders(response, { isApiRoute: false, nonce });

      const csp = securedResponse.headers.get('Content-Security-Policy');
      expect(csp).toContain(`'nonce-${nonce}'`);
    });

    it('should set X-Nonce header for non-API routes', () => {
      const response = NextResponse.json({ data: 'test' });
      const nonce = 'custom-nonce-abc';
      const securedResponse = applySecurityHeaders(response, { isApiRoute: false, nonce });

      expect(securedResponse.headers.get('X-Nonce')).toBe(nonce);
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
