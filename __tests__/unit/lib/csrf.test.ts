import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCsrfToken,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  validateCsrfToken,
  createCsrfCookie,
  getOrCreateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_TOKEN_LENGTH,
} from '@/lib/csrf';

describe('CSRF Protection', () => {
  describe('generateCsrfToken', () => {
    it('should generate a token of correct length', () => {
      const token = generateCsrfToken();
      expect(token.length).toBe(CSRF_TOKEN_LENGTH);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate hexadecimal tokens', () => {
      const token = generateCsrfToken();
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('getCsrfTokenFromCookie', () => {
    it('should extract CSRF token from cookie header', () => {
      const token = 'test-token-123';
      const request = new Request('http://localhost', {
        headers: {
          cookie: `${CSRF_COOKIE_NAME}=${token}; other=value`,
        },
      });

      expect(getCsrfTokenFromCookie(request)).toBe(token);
    });

    it('should return null if cookie header is missing', () => {
      const request = new Request('http://localhost');
      expect(getCsrfTokenFromCookie(request)).toBeNull();
    });

    it('should return null if CSRF cookie is not present', () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: 'other=value; another=test',
        },
      });

      expect(getCsrfTokenFromCookie(request)).toBeNull();
    });
  });

  describe('getCsrfTokenFromHeader', () => {
    it('should extract CSRF token from header', () => {
      const token = 'test-token-123';
      const request = new Request('http://localhost', {
        headers: {
          [CSRF_HEADER_NAME]: token,
        },
      });

      expect(getCsrfTokenFromHeader(request)).toBe(token);
    });

    it('should return null if header is missing', () => {
      const request = new Request('http://localhost');
      expect(getCsrfTokenFromHeader(request)).toBeNull();
    });
  });

  describe('validateCsrfToken', () => {
    it('should return true for GET requests', () => {
      const request = new Request('http://localhost', { method: 'GET' });
      expect(validateCsrfToken(request)).toBe(true);
    });

    it('should return true for HEAD requests', () => {
      const request = new Request('http://localhost', { method: 'HEAD' });
      expect(validateCsrfToken(request)).toBe(true);
    });

    it('should return true for OPTIONS requests', () => {
      const request = new Request('http://localhost', { method: 'OPTIONS' });
      expect(validateCsrfToken(request)).toBe(true);
    });

    it('should return false for POST without tokens', () => {
      const request = new Request('http://localhost', { method: 'POST' });
      expect(validateCsrfToken(request)).toBe(false);
    });

    it('should return false for POST with only cookie token', () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: {
          cookie: `${CSRF_COOKIE_NAME}=token123`,
        },
      });
      expect(validateCsrfToken(request)).toBe(false);
    });

    it('should return false for POST with only header token', () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: {
          [CSRF_HEADER_NAME]: 'token123',
        },
      });
      expect(validateCsrfToken(request)).toBe(false);
    });

    it('should return false for POST with mismatched tokens', () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: {
          cookie: `${CSRF_COOKIE_NAME}=token123`,
          [CSRF_HEADER_NAME]: 'different-token',
        },
      });
      expect(validateCsrfToken(request)).toBe(false);
    });

    it('should return true for POST with matching tokens', () => {
      const token = 'valid-token-12345678901234567890';
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: {
          cookie: `${CSRF_COOKIE_NAME}=${token}`,
          [CSRF_HEADER_NAME]: token,
        },
      });
      expect(validateCsrfToken(request)).toBe(true);
    });

    it('should validate PUT requests', () => {
      const token = 'valid-token-12345678901234567890';
      const request = new Request('http://localhost', {
        method: 'PUT',
        headers: {
          cookie: `${CSRF_COOKIE_NAME}=${token}`,
          [CSRF_HEADER_NAME]: token,
        },
      });
      expect(validateCsrfToken(request)).toBe(true);
    });

    it('should validate DELETE requests', () => {
      const token = 'valid-token-12345678901234567890';
      const request = new Request('http://localhost', {
        method: 'DELETE',
        headers: {
          cookie: `${CSRF_COOKIE_NAME}=${token}`,
          [CSRF_HEADER_NAME]: token,
        },
      });
      expect(validateCsrfToken(request)).toBe(true);
    });

    it('should return false for tokens of different lengths', () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: {
          cookie: `${CSRF_COOKIE_NAME}=short`,
          [CSRF_HEADER_NAME]: 'much-longer-token',
        },
      });
      expect(validateCsrfToken(request)).toBe(false);
    });
  });

  describe('createCsrfCookie', () => {
    it('should create cookie with correct name and value', () => {
      const token = 'test-token';
      const cookie = createCsrfCookie(token, { secure: false });
      expect(cookie).toContain(`${CSRF_COOKIE_NAME}=${token}`);
    });

    it('should set Path=/', () => {
      const cookie = createCsrfCookie('token', { secure: false });
      expect(cookie).toContain('Path=/');
    });

    it('should set SameSite=Strict', () => {
      const cookie = createCsrfCookie('token', { secure: false });
      expect(cookie).toContain('SameSite=Strict');
    });

    it('should set HttpOnly', () => {
      const cookie = createCsrfCookie('token', { secure: false });
      expect(cookie).toContain('HttpOnly');
    });

    it('should set Secure when secure option is true', () => {
      const cookie = createCsrfCookie('token', { secure: true });
      expect(cookie).toContain('Secure');
    });

    it('should not set Secure when secure option is false', () => {
      const cookie = createCsrfCookie('token', { secure: false });
      expect(cookie).not.toContain('Secure');
    });
  });

  describe('getOrCreateCsrfToken', () => {
    it('should return existing token from cookie', () => {
      const existingToken = 'existing-token-value';
      const request = new Request('http://localhost', {
        headers: {
          cookie: `${CSRF_COOKIE_NAME}=${existingToken}`,
        },
      });

      const result = getOrCreateCsrfToken(request);
      expect(result.token).toBe(existingToken);
      expect(result.cookie).toBeNull();
    });

    it('should generate new token if no cookie exists', () => {
      const request = new Request('http://localhost');

      const result = getOrCreateCsrfToken(request);
      expect(result.token.length).toBe(CSRF_TOKEN_LENGTH);
      expect(result.cookie).not.toBeNull();
      expect(result.cookie).toContain(CSRF_COOKIE_NAME);
    });
  });

  describe('Constants', () => {
    it('should have correct cookie name', () => {
      expect(CSRF_COOKIE_NAME).toBe('csrf-token');
    });

    it('should have correct header name', () => {
      expect(CSRF_HEADER_NAME).toBe('X-CSRF-Token');
    });

    it('should have correct token length', () => {
      expect(CSRF_TOKEN_LENGTH).toBe(32);
    });
  });
});
