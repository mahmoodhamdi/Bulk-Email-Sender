import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/auth/api-keys/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/auth/api-keys/[id]/route';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock API key generation
vi.mock('@/lib/auth/api-key', () => ({
  generateApiKey: vi.fn().mockReturnValue({
    key: 'bes_test_api_key_12345',
    hash: 'hashed_key_value',
    prefix: 'bes_test_api_',
  }),
}));

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    apiKey: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

describe('/api/auth/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER',
    },
  };

  const mockApiKey = {
    id: 'key-1',
    name: 'Test API Key',
    keyPrefix: 'bes_test_api_',
    permissions: ['campaigns:read', 'contacts:read'],
    rateLimit: 1000,
    isActive: true,
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user-1',
  };

  describe('GET /api/auth/api-keys', () => {
    it('should list user API keys', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.findMany).mockResolvedValue([mockApiKey] as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Test API Key');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return empty array when user has no API keys', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });
  });

  describe('POST /api/auth/api-keys', () => {
    const createRequest = (body: object) => {
      return new NextRequest('http://localhost/api/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };

    it('should create a new API key', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.count).mockResolvedValue(0);
      vi.mocked(prisma.apiKey.create).mockResolvedValue(mockApiKey as never);

      const request = createRequest({
        name: 'My New API Key',
        permissions: ['campaigns:read'],
        rateLimit: 500,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.key).toBe('bes_test_api_key_12345');
      expect(data.message).toContain('API key created');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createRequest({ name: 'My API Key' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for missing name', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);

      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return 400 when max API keys reached', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.count).mockResolvedValue(10);

      const request = createRequest({ name: 'One Too Many' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Maximum number of API keys');
    });

    it('should return 400 for invalid permissions', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.count).mockResolvedValue(0);

      const request = createRequest({
        name: 'My API Key',
        permissions: ['invalid:permission'],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid permissions provided');
    });
  });

  describe('GET /api/auth/api-keys/:id', () => {
    it('should get API key details', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(mockApiKey as never);

      const response = await GET_BY_ID(
        new NextRequest('http://localhost/api/auth/api-keys/key-1'),
        { params: Promise.resolve({ id: 'key-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('key-1');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET_BY_ID(
        new NextRequest('http://localhost/api/auth/api-keys/key-1'),
        { params: Promise.resolve({ id: 'key-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent key', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);

      const response = await GET_BY_ID(
        new NextRequest('http://localhost/api/auth/api-keys/non-existent'),
        { params: Promise.resolve({ id: 'non-existent' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('API key not found');
    });
  });

  describe('PATCH /api/auth/api-keys/:id', () => {
    const createRequest = (body: object) => {
      return new NextRequest('http://localhost/api/auth/api-keys/key-1', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };

    it('should update API key', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(mockApiKey as never);
      vi.mocked(prisma.apiKey.update).mockResolvedValue({
        ...mockApiKey,
        name: 'Updated Name',
      } as never);

      const response = await PATCH(
        createRequest({ name: 'Updated Name' }),
        { params: Promise.resolve({ id: 'key-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await PATCH(
        createRequest({ name: 'Updated' }),
        { params: Promise.resolve({ id: 'key-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent key', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);

      const response = await PATCH(
        createRequest({ name: 'Updated' }),
        { params: Promise.resolve({ id: 'non-existent' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('API key not found');
    });

    it('should allow toggling isActive', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(mockApiKey as never);
      vi.mocked(prisma.apiKey.update).mockResolvedValue({
        ...mockApiKey,
        isActive: false,
      } as never);

      const response = await PATCH(
        createRequest({ isActive: false }),
        { params: Promise.resolve({ id: 'key-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.isActive).toBe(false);
    });
  });

  describe('DELETE /api/auth/api-keys/:id', () => {
    it('should delete API key', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(mockApiKey as never);
      vi.mocked(prisma.apiKey.delete).mockResolvedValue(mockApiKey as never);

      const response = await DELETE(
        new NextRequest('http://localhost/api/auth/api-keys/key-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'key-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('API key deleted successfully');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest('http://localhost/api/auth/api-keys/key-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'key-1' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent key', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest('http://localhost/api/auth/api-keys/non-existent', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'non-existent' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('API key not found');
    });
  });
});
