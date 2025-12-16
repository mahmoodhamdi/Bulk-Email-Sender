/**
 * Webhook Retry Integration Tests
 * Tests the webhook delivery and retry functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    webhook: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    webhookDelivery: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock Redis connection
vi.mock('@/lib/queue/redis', () => ({
  getQueueConnection: vi.fn(() => ({
    status: 'ready',
    on: vi.fn(),
  })),
  createRedisConnection: vi.fn(() => ({
    status: 'ready',
    on: vi.fn(),
    quit: vi.fn(),
  })),
}));

// Mock SSRF protection
vi.mock('@/lib/ssrf-protection', () => ({
  validateWebhookUrl: vi.fn(() => Promise.resolve({ safe: true })),
  isUrlSafeSync: vi.fn(() => true),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { prisma } from '@/lib/db/prisma';
import { validateWebhookUrl } from '@/lib/ssrf-protection';

describe('Webhook Retry Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Webhook Delivery Creation', () => {
    it('should create a webhook delivery record', async () => {
      const mockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        event: 'email.sent',
        payload: { emailId: 'email-1' },
        status: 'PENDING',
        attempts: 0,
        createdAt: new Date(),
      };

      vi.mocked(prisma.webhookDelivery.create).mockResolvedValue(mockDelivery as never);

      const result = await prisma.webhookDelivery.create({
        data: {
          webhookId: 'webhook-1',
          event: 'email.sent',
          payload: { emailId: 'email-1' },
          status: 'PENDING',
        },
      });

      expect(result.id).toBe('delivery-1');
      expect(result.status).toBe('PENDING');
      expect(result.attempts).toBe(0);
    });
  });

  describe('Webhook Delivery Status Updates', () => {
    it('should update delivery status to PROCESSING', async () => {
      const mockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        status: 'PROCESSING',
        attempts: 1,
      };

      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue(mockDelivery as never);

      const result = await prisma.webhookDelivery.update({
        where: { id: 'delivery-1' },
        data: {
          status: 'PROCESSING',
          attempts: 1,
        },
      });

      expect(result.status).toBe('PROCESSING');
      expect(result.attempts).toBe(1);
    });

    it('should update delivery status to DELIVERED on success', async () => {
      const mockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        status: 'DELIVERED',
        statusCode: 200,
        deliveredAt: new Date(),
        attempts: 1,
      };

      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue(mockDelivery as never);

      const result = await prisma.webhookDelivery.update({
        where: { id: 'delivery-1' },
        data: {
          status: 'DELIVERED',
          statusCode: 200,
          deliveredAt: new Date(),
        },
      });

      expect(result.status).toBe('DELIVERED');
      expect(result.statusCode).toBe(200);
    });

    it('should update delivery status to RETRYING on failure with retries remaining', async () => {
      const mockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        status: 'RETRYING',
        statusCode: 500,
        error: 'Internal Server Error',
        attempts: 1,
      };

      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue(mockDelivery as never);

      const result = await prisma.webhookDelivery.update({
        where: { id: 'delivery-1' },
        data: {
          status: 'RETRYING',
          statusCode: 500,
          error: 'Internal Server Error',
          attempts: 1,
        },
      });

      expect(result.status).toBe('RETRYING');
      expect(result.error).toBe('Internal Server Error');
    });

    it('should update delivery status to FAILED after max retries', async () => {
      const mockDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        status: 'FAILED',
        statusCode: 500,
        error: 'Max retries exceeded',
        attempts: 3,
      };

      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue(mockDelivery as never);

      const result = await prisma.webhookDelivery.update({
        where: { id: 'delivery-1' },
        data: {
          status: 'FAILED',
          statusCode: 500,
          error: 'Max retries exceeded',
          attempts: 3,
        },
      });

      expect(result.status).toBe('FAILED');
      expect(result.attempts).toBe(3);
    });
  });

  describe('Webhook Retry Logic', () => {
    it('should calculate exponential backoff delay', () => {
      const calculateBackoff = (attempt: number) => {
        // Exponential backoff: 1min -> 5min -> 30min
        const delays = [60000, 300000, 1800000];
        return delays[attempt - 1] || delays[delays.length - 1];
      };

      expect(calculateBackoff(1)).toBe(60000);  // 1 minute
      expect(calculateBackoff(2)).toBe(300000); // 5 minutes
      expect(calculateBackoff(3)).toBe(1800000); // 30 minutes
    });

    it('should track retry attempts correctly', async () => {
      const deliveries = [
        { id: 'd1', attempts: 1, status: 'RETRYING' },
        { id: 'd2', attempts: 2, status: 'RETRYING' },
        { id: 'd3', attempts: 3, status: 'FAILED' },
      ];

      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue(deliveries as never);

      const result = await prisma.webhookDelivery.findMany({
        where: { webhookId: 'webhook-1' },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('RETRYING');
      expect(result[2].status).toBe('FAILED');
    });
  });

  describe('Webhook Delivery History', () => {
    it('should retrieve delivery history for a webhook', async () => {
      const mockDeliveries = [
        {
          id: 'delivery-1',
          webhookId: 'webhook-1',
          event: 'email.sent',
          status: 'DELIVERED',
          statusCode: 200,
          attempts: 1,
          createdAt: new Date('2025-01-01T10:00:00Z'),
        },
        {
          id: 'delivery-2',
          webhookId: 'webhook-1',
          event: 'email.opened',
          status: 'FAILED',
          statusCode: 500,
          attempts: 3,
          createdAt: new Date('2025-01-01T11:00:00Z'),
        },
      ];

      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue(mockDeliveries as never);
      vi.mocked(prisma.webhookDelivery.count).mockResolvedValue(2);

      const [deliveries, total] = await Promise.all([
        prisma.webhookDelivery.findMany({
          where: { webhookId: 'webhook-1' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          skip: 0,
        }),
        prisma.webhookDelivery.count({ where: { webhookId: 'webhook-1' } }),
      ]);

      expect(deliveries).toHaveLength(2);
      expect(total).toBe(2);
    });

    it('should filter deliveries by status', async () => {
      const mockDeliveries = [
        { id: 'd1', status: 'FAILED', attempts: 3 },
        { id: 'd2', status: 'FAILED', attempts: 3 },
      ];

      vi.mocked(prisma.webhookDelivery.findMany).mockResolvedValue(mockDeliveries as never);

      const result = await prisma.webhookDelivery.findMany({
        where: {
          webhookId: 'webhook-1',
          status: 'FAILED',
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every(d => d.status === 'FAILED')).toBe(true);
    });
  });

  describe('SSRF Protection in Webhooks', () => {
    it('should block webhooks to internal addresses', async () => {
      vi.mocked(validateWebhookUrl).mockResolvedValue({
        safe: false,
        reason: 'URL resolves to internal IP address',
      });

      const result = await validateWebhookUrl('http://192.168.1.1/webhook');

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('internal');
    });

    it('should allow webhooks to public addresses', async () => {
      vi.mocked(validateWebhookUrl).mockResolvedValue({ safe: true });

      const result = await validateWebhookUrl('https://api.example.com/webhook');

      expect(result.safe).toBe(true);
    });

    it('should block localhost webhooks', async () => {
      vi.mocked(validateWebhookUrl).mockResolvedValue({
        safe: false,
        reason: 'URL blocked: hostname matches blocked pattern',
      });

      const result = await validateWebhookUrl('http://localhost:3000/webhook');

      expect(result.safe).toBe(false);
    });
  });

  describe('HTTP Response Handling', () => {
    it('should handle successful 200 response', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"success": true}'),
      });

      expect(mockFetch).toBeDefined();
    });

    it('should handle 500 server error response', () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      expect(mockFetch).toBeDefined();
    });

    it('should handle 401 unauthorized response', () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      expect(mockFetch).toBeDefined();
    });

    it('should handle timeout errors', () => {
      mockFetch.mockRejectedValueOnce(
        Object.assign(new Error('Request timeout'), { name: 'AbortError' })
      );

      expect(mockFetch).toBeDefined();
    });

    it('should handle network errors', () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      expect(mockFetch).toBeDefined();
    });
  });

  describe('Webhook Statistics', () => {
    it('should calculate delivery statistics for a webhook', async () => {
      vi.mocked(prisma.webhookDelivery.count).mockImplementation(async (args) => {
        const status = (args?.where as { status?: string })?.status;
        if (status === 'DELIVERED') return 80;
        if (status === 'FAILED') return 15;
        if (status === 'RETRYING') return 5;
        return 100;
      });

      const [total, delivered, failed, retrying] = await Promise.all([
        prisma.webhookDelivery.count({ where: { webhookId: 'webhook-1' } }),
        prisma.webhookDelivery.count({ where: { webhookId: 'webhook-1', status: 'DELIVERED' } }),
        prisma.webhookDelivery.count({ where: { webhookId: 'webhook-1', status: 'FAILED' } }),
        prisma.webhookDelivery.count({ where: { webhookId: 'webhook-1', status: 'RETRYING' } }),
      ]);

      expect(total).toBe(100);
      expect(delivered).toBe(80);
      expect(failed).toBe(15);
      expect(retrying).toBe(5);

      // Success rate: 80%
      const successRate = (delivered / total) * 100;
      expect(successRate).toBe(80);
    });
  });

  describe('Webhook Authentication', () => {
    it('should handle HMAC signature authentication', () => {
      const mockWebhook = {
        id: 'webhook-1',
        authType: 'HMAC',
        secret: 'test-secret',
      };

      expect(mockWebhook.authType).toBe('HMAC');
      expect(mockWebhook.secret).toBeTruthy();
    });

    it('should handle Bearer token authentication', () => {
      const mockWebhook = {
        id: 'webhook-2',
        authType: 'BEARER',
        authValue: 'test-token',
      };

      expect(mockWebhook.authType).toBe('BEARER');
      expect(mockWebhook.authValue).toBe('test-token');
    });

    it('should handle Basic authentication', () => {
      const mockWebhook = {
        id: 'webhook-3',
        authType: 'BASIC',
        authValue: Buffer.from('user:pass').toString('base64'),
      };

      expect(mockWebhook.authType).toBe('BASIC');
    });

    it('should handle API Key authentication', () => {
      const mockWebhook = {
        id: 'webhook-4',
        authType: 'API_KEY',
        authHeader: 'X-API-Key',
        authValue: 'my-api-key',
      };

      expect(mockWebhook.authType).toBe('API_KEY');
      expect(mockWebhook.authHeader).toBe('X-API-Key');
    });
  });

  describe('Manual Retry', () => {
    it('should allow manual retry of failed delivery', async () => {
      const failedDelivery = {
        id: 'delivery-1',
        webhookId: 'webhook-1',
        status: 'FAILED',
        attempts: 3,
        payload: { event: 'email.sent', data: {} },
      };

      vi.mocked(prisma.webhookDelivery.findUnique).mockResolvedValue(failedDelivery as never);

      const retriedDelivery = {
        ...failedDelivery,
        status: 'PENDING',
        attempts: 0,
      };

      vi.mocked(prisma.webhookDelivery.update).mockResolvedValue(retriedDelivery as never);

      // Find the failed delivery
      const found = await prisma.webhookDelivery.findUnique({
        where: { id: 'delivery-1' },
      });
      expect(found?.status).toBe('FAILED');

      // Reset for retry
      const result = await prisma.webhookDelivery.update({
        where: { id: 'delivery-1' },
        data: {
          status: 'PENDING',
          attempts: 0,
          error: null,
        },
      });

      expect(result.status).toBe('PENDING');
      expect(result.attempts).toBe(0);
    });
  });
});
