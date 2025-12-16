import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock api-key functions
vi.mock('@/lib/auth/api-key', () => ({
  extractApiKey: vi.fn(),
  validateApiKey: vi.fn(),
  hasPermission: vi.fn(),
  checkApiKeyRateLimit: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  extractApiKey,
  validateApiKey,
  hasPermission,
  checkApiKeyRateLimit,
} from '@/lib/auth/api-key';
import {
  authenticateRequest,
  requireAuth,
  requirePermission,
  requireAdmin,
  requireSuperAdmin,
  checkApiKeyRateLimitMiddleware,
  withAuth,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/auth/middleware';

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost/api/test', {
      headers: new Headers(headers),
    });
  };

  describe('authenticateRequest', () => {
    it('should authenticate with API key', async () => {
      const request = createRequest({ 'x-api-key': 'test-key' });
      vi.mocked(extractApiKey).mockReturnValue('test-key');
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        permissions: ['email:send', 'email:read'],
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'USER' } as never);

      const result = await authenticateRequest(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.type).toBe('api-key');
        expect(result.context.userId).toBe('user-123');
        expect(result.context.permissions).toEqual(['email:send', 'email:read']);
      }
    });

    it('should return error for invalid API key', async () => {
      const request = createRequest({ 'x-api-key': 'invalid-key' });
      vi.mocked(extractApiKey).mockReturnValue('invalid-key');
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: false,
        error: 'Invalid API key',
      });

      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid API key');
        expect(result.status).toBe(401);
      }
    });

    it('should fall back to session auth when no API key', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-456', role: 'ADMIN' },
        expires: new Date().toISOString(),
      } as never);

      const result = await authenticateRequest(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.type).toBe('session');
        expect(result.context.userId).toBe('user-456');
        expect(result.context.userRole).toBe('ADMIN');
      }
    });

    it('should return unauthorized when no session', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue(null);

      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized');
        expect(result.status).toBe(401);
      }
    });

    it('should use default USER role when user not found', async () => {
      const request = createRequest({ 'x-api-key': 'test-key' });
      vi.mocked(extractApiKey).mockReturnValue('test-key');
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        permissions: ['email:read'],
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await authenticateRequest(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.userRole).toBe('USER');
      }
    });
  });

  describe('requireAuth', () => {
    it('should return context for authenticated user', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
        expires: new Date().toISOString(),
      } as never);

      const middleware = requireAuth();
      const result = await middleware(request);

      expect('context' in result).toBe(true);
    });

    it('should return error response for unauthenticated user', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue(null);

      const middleware = requireAuth();
      const result = await middleware(request);

      expect('context' in result).toBe(false);
      expect(result.status).toBe(401);
    });
  });

  describe('requirePermission', () => {
    it('should allow session-based auth without checking permissions', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
        expires: new Date().toISOString(),
      } as never);

      const middleware = requirePermission('email:send');
      const result = await middleware(request);

      expect('context' in result).toBe(true);
    });

    it('should check permissions for API key auth', async () => {
      const request = createRequest({ 'x-api-key': 'test-key' });
      vi.mocked(extractApiKey).mockReturnValue('test-key');
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        permissions: ['email:send'],
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'USER' } as never);
      vi.mocked(hasPermission).mockReturnValue(true);

      const middleware = requirePermission('email:send');
      const result = await middleware(request);

      expect('context' in result).toBe(true);
      expect(hasPermission).toHaveBeenCalledWith(['email:send'], 'email:send');
    });

    it('should reject API key without required permission', async () => {
      const request = createRequest({ 'x-api-key': 'test-key' });
      vi.mocked(extractApiKey).mockReturnValue('test-key');
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        permissions: ['email:read'],
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'USER' } as never);
      vi.mocked(hasPermission).mockReturnValue(false);

      const middleware = requirePermission('email:send');
      const result = await middleware(request);

      expect('context' in result).toBe(false);
      expect(result.status).toBe(403);
    });
  });

  describe('requireAdmin', () => {
    it('should allow ADMIN role', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'ADMIN' },
        expires: new Date().toISOString(),
      } as never);

      const middleware = requireAdmin();
      const result = await middleware(request);

      expect('context' in result).toBe(true);
    });

    it('should allow SUPER_ADMIN role', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'SUPER_ADMIN' },
        expires: new Date().toISOString(),
      } as never);

      const middleware = requireAdmin();
      const result = await middleware(request);

      expect('context' in result).toBe(true);
    });

    it('should reject USER role', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
        expires: new Date().toISOString(),
      } as never);

      const middleware = requireAdmin();
      const result = await middleware(request);

      expect('context' in result).toBe(false);
      expect(result.status).toBe(403);
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow SUPER_ADMIN role', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'SUPER_ADMIN' },
        expires: new Date().toISOString(),
      } as never);

      const middleware = requireSuperAdmin();
      const result = await middleware(request);

      expect('context' in result).toBe(true);
    });

    it('should reject ADMIN role', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'ADMIN' },
        expires: new Date().toISOString(),
      } as never);

      const middleware = requireSuperAdmin();
      const result = await middleware(request);

      expect('context' in result).toBe(false);
      expect(result.status).toBe(403);
    });
  });

  describe('checkApiKeyRateLimitMiddleware', () => {
    it('should return null when under limit', async () => {
      const request = createRequest();
      vi.mocked(checkApiKeyRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });

      const result = await checkApiKeyRateLimitMiddleware(request, 'key-1', 100);

      expect(result).toBeNull();
    });

    it('should return 429 response when over limit', async () => {
      const request = createRequest();
      const resetAt = new Date();
      vi.mocked(checkApiKeyRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt,
      });

      const result = await checkApiKeyRateLimitMiddleware(request, 'key-1', 100);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });

  describe('withAuth', () => {
    it('should call handler with authenticated context', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
        expires: new Date().toISOString(),
      } as never);

      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(request);

      expect(handler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ userId: 'user-123' }),
        undefined
      );
    });

    it('should return 401 for unauthenticated request', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue(null);

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);
      const result = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(result.status).toBe(401);
    });

    it('should check admin requirement', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
        expires: new Date().toISOString(),
      } as never);

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler, { requireAdmin: true });
      const result = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(result.status).toBe(403);
    });

    it('should check super admin requirement', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'ADMIN' },
        expires: new Date().toISOString(),
      } as never);

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler, { requireSuperAdmin: true });
      const result = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(result.status).toBe(403);
    });

    it('should check permission requirement for API key', async () => {
      const request = createRequest({ 'x-api-key': 'test-key' });
      vi.mocked(extractApiKey).mockReturnValue('test-key');
      vi.mocked(validateApiKey).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        permissions: ['email:read'],
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'USER' } as never);
      vi.mocked(hasPermission).mockReturnValue(false);

      const handler = vi.fn();
      const wrappedHandler = withAuth(handler, { requiredPermission: 'email:send' });
      const result = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(result.status).toBe(403);
    });

    it('should pass route params to handler', async () => {
      const request = createRequest();
      vi.mocked(extractApiKey).mockReturnValue(null);
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', role: 'USER' },
        expires: new Date().toISOString(),
      } as never);

      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const wrappedHandler = withAuth(handler);
      await wrappedHandler(request, { params: Promise.resolve({ id: '123' }) });

      expect(handler).toHaveBeenCalledWith(
        request,
        expect.any(Object),
        { id: '123' }
      );
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response', async () => {
      const response = createErrorResponse('Not found', 404);
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Not found');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with default status', async () => {
      const response = createSuccessResponse({ message: 'OK' });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('OK');
    });

    it('should create success response with custom status', async () => {
      const response = createSuccessResponse({ id: '123' }, 201);
      expect(response.status).toBe(201);
    });
  });
});
