import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/webhooks/route';
import { GET as GETById, PATCH, DELETE } from '@/app/api/webhooks/[id]/route';
import { POST as TestWebhook } from '@/app/api/webhooks/[id]/test/route';
import { GET as GetDeliveries } from '@/app/api/webhooks/[id]/deliveries/route';
import { GET as GetEvents } from '@/app/api/webhooks/events/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    webhook: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    webhookDelivery: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: {
    check: vi.fn(() => ({ success: true, resetAt: Date.now() + 60000 })),
  },
}));

// Mock webhook service
vi.mock('@/lib/webhook/webhook-service', () => ({
  createWebhook: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  getWebhook: vi.fn(),
  listWebhooks: vi.fn(),
  listDeliveries: vi.fn(),
  getDeliveryStats: vi.fn(),
  testWebhook: vi.fn(),
  retryDelivery: vi.fn(),
}));

// Mock crypto
vi.mock('@/lib/crypto', () => ({
  encryptString: vi.fn((str) => `encrypted_${str}`),
  decryptString: vi.fn((str) => str.replace('encrypted_', '')),
}));

import { prisma } from '@/lib/db/prisma';
import {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhook,
  listWebhooks,
  listDeliveries,
  getDeliveryStats,
  testWebhook as testWebhookService,
} from '@/lib/webhook/webhook-service';

describe('Webhooks API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/webhooks', () => {
    it('should return webhooks list with pagination', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['email.sent'],
          isActive: true,
          authType: 'NONE',
          secret: null,
          authValue: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(listWebhooks).mockResolvedValue({
        webhooks: mockWebhooks as never,
        total: 1,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(1);
    });

    it('should mask sensitive fields in response', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['email.sent'],
          isActive: true,
          authType: 'BEARER',
          secret: 'secret-value',
          authValue: 'token-value',
          createdAt: new Date(),
        },
      ];

      vi.mocked(listWebhooks).mockResolvedValue({
        webhooks: mockWebhooks as never,
        total: 1,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data[0].secret).toBe('••••••••');
      expect(data.data[0].authValue).toBe('••••••••');
    });

    it('should filter by isActive', async () => {
      vi.mocked(listWebhooks).mockResolvedValue({
        webhooks: [],
        total: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks?isActive=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(listWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );
    });

    it('should filter by event', async () => {
      vi.mocked(listWebhooks).mockResolvedValue({
        webhooks: [],
        total: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks?event=email.sent');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(listWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'email.sent' })
      );
    });
  });

  describe('POST /api/webhooks', () => {
    it('should create a new webhook', async () => {
      const newWebhook = {
        id: 'webhook-new',
        name: 'New Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent', 'email.opened'],
        isActive: true,
        authType: 'NONE',
        secret: null,
        authValue: null,
        timeout: 30000,
        maxRetries: 3,
        createdAt: new Date(),
      };

      vi.mocked(createWebhook).mockResolvedValue(newWebhook as never);

      const request = new NextRequest('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Webhook',
          url: 'https://example.com/webhook',
          events: ['email.sent', 'email.opened'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe('New Webhook');
    });

    it('should return 400 for invalid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          name: '', // Invalid: empty name
          url: 'not-a-url', // Invalid URL
          events: [], // Invalid: empty events
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/webhooks/[id]', () => {
    it('should return webhook details with stats', async () => {
      const mockWebhook = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
        isActive: true,
        authType: 'NONE',
        secret: null,
        authValue: null,
      };

      const mockStats = {
        totalDeliveries: 100,
        delivered: 95,
        failed: 5,
        pending: 0,
        retrying: 0,
        successRate: 95,
      };

      vi.mocked(getWebhook).mockResolvedValue(mockWebhook as never);
      vi.mocked(getDeliveryStats).mockResolvedValue(mockStats);

      const request = new NextRequest('http://localhost:3000/api/webhooks/webhook-1');
      const response = await GETById(request, { params: Promise.resolve({ id: 'webhook-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Test Webhook');
      expect(data.data.stats).toBeDefined();
      expect(data.data.stats.successRate).toBe(95);
    });

    it('should return 404 for non-existent webhook', async () => {
      vi.mocked(getWebhook).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/webhooks/nonexistent');
      const response = await GETById(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/webhooks/[id]', () => {
    it('should update webhook', async () => {
      const existingWebhook = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['email.sent'],
        isActive: true,
      };

      const updatedWebhook = {
        ...existingWebhook,
        name: 'Updated Webhook',
      };

      vi.mocked(getWebhook).mockResolvedValue(existingWebhook as never);
      vi.mocked(updateWebhook).mockResolvedValue(updatedWebhook as never);

      const request = new NextRequest('http://localhost:3000/api/webhooks/webhook-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Webhook' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'webhook-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Updated Webhook');
    });

    it('should return 404 for non-existent webhook', async () => {
      vi.mocked(getWebhook).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/webhooks/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/webhooks/[id]', () => {
    it('should delete webhook', async () => {
      vi.mocked(getWebhook).mockResolvedValue({ id: 'webhook-1' } as never);
      vi.mocked(deleteWebhook).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/webhooks/webhook-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'webhook-1' }) });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent webhook', async () => {
      vi.mocked(getWebhook).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/webhooks/nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/webhooks/[id]/test', () => {
    it('should test webhook and return success', async () => {
      vi.mocked(getWebhook).mockResolvedValue({ id: 'webhook-1' } as never);
      vi.mocked(testWebhookService).mockResolvedValue({
        success: true,
        statusCode: 200,
        responseTime: 150,
        response: 'OK',
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/webhook-1/test', {
        method: 'POST',
      });

      const response = await TestWebhook(request, { params: Promise.resolve({ id: 'webhook-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(true);
      expect(data.data.statusCode).toBe(200);
    });

    it('should return test failure details', async () => {
      vi.mocked(getWebhook).mockResolvedValue({ id: 'webhook-1' } as never);
      vi.mocked(testWebhookService).mockResolvedValue({
        success: false,
        statusCode: 500,
        responseTime: 200,
        error: 'Internal Server Error',
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/webhook-1/test', {
        method: 'POST',
      });

      const response = await TestWebhook(request, { params: Promise.resolve({ id: 'webhook-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(false);
      expect(data.data.error).toBe('Internal Server Error');
    });

    it('should return 404 for non-existent webhook', async () => {
      vi.mocked(getWebhook).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/webhooks/nonexistent/test', {
        method: 'POST',
      });

      const response = await TestWebhook(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/webhooks/[id]/deliveries', () => {
    it('should return deliveries list with pagination', async () => {
      const mockDeliveries = [
        {
          id: 'delivery-1',
          webhookId: 'webhook-1',
          event: 'email.sent',
          status: 'DELIVERED',
          statusCode: 200,
          attempts: 1,
          createdAt: new Date(),
        },
      ];

      vi.mocked(getWebhook).mockResolvedValue({ id: 'webhook-1' } as never);
      vi.mocked(listDeliveries).mockResolvedValue({
        deliveries: mockDeliveries as never,
        total: 1,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/webhook-1/deliveries');
      const response = await GetDeliveries(request, { params: Promise.resolve({ id: 'webhook-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
    });

    it('should filter by status', async () => {
      vi.mocked(getWebhook).mockResolvedValue({ id: 'webhook-1' } as never);
      vi.mocked(listDeliveries).mockResolvedValue({
        deliveries: [],
        total: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/webhook-1/deliveries?status=FAILED');
      const response = await GetDeliveries(request, { params: Promise.resolve({ id: 'webhook-1' }) });

      expect(response.status).toBe(200);
      expect(listDeliveries).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED' })
      );
    });
  });

  describe('GET /api/webhooks/events', () => {
    it('should return available webhook events', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/events');
      const response = await GetEvents();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.events).toBeDefined();
      expect(data.data.grouped).toBeDefined();
      expect(data.data.grouped.email).toBeDefined();
      expect(data.data.grouped.campaign).toBeDefined();
      expect(data.data.grouped.contact).toBeDefined();
    });

    it('should include event details', async () => {
      const response = await GetEvents();
      const data = await response.json();

      const sentEvent = data.data.events.find((e: { id: string }) => e.id === 'email.sent');
      expect(sentEvent).toBeDefined();
      expect(sentEvent.name).toBeDefined();
      expect(sentEvent.description).toBeDefined();
    });
  });
});
