import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/ab-tests/[id]/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    aBTest: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: {
    check: vi.fn(() => ({ success: true, resetAt: Date.now() + 60000 })),
  },
}));

// Mock A/B test service
vi.mock('@/lib/ab-test', () => ({
  getABTest: vi.fn(),
  updateABTest: vi.fn(),
  deleteABTest: vi.fn(),
  startABTest: vi.fn(),
  selectWinner: vi.fn(),
  autoSelectWinner: vi.fn(),
  cancelABTest: vi.fn(),
  addVariant: vi.fn(),
  updateVariant: vi.fn(),
  removeVariant: vi.fn(),
  updateABTestSchema: {
    parse: (data: unknown) => data,
  },
  addVariantSchema: {
    parse: (data: unknown) => data,
  },
  updateVariantSchema: {
    parse: (data: unknown) => data,
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  getABTest,
  updateABTest,
  deleteABTest,
  startABTest,
  selectWinner,
  autoSelectWinner,
  cancelABTest,
  addVariant,
  updateVariant,
  removeVariant,
} from '@/lib/ab-test';

describe('A/B Tests By ID API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ab-tests/[id]', () => {
    it('should get A/B test details with stats', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';
      const mockTest = {
        id: testId,
        campaignId: 'camp-1',
        name: 'Subject Line Test',
        type: 'SUBJECT',
        status: 'RUNNING',
        variants: [
          {
            id: 'var-1',
            name: 'Variant A',
            subject: 'Hello world',
            sent: 100,
            opened: 30,
            clicked: 5,
          },
          {
            id: 'var-2',
            name: 'Variant B',
            subject: 'Hi there',
            sent: 100,
            opened: 25,
            clicked: 4,
          },
        ],
        createdAt: new Date(),
      };

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(getABTest).mockResolvedValue(mockTest as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx');
      const response = await GET(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe(testId);
      expect(data.data.variants).toHaveLength(2);
    });

    it('should verify ownership before returning test', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue(null); // Test not found for user

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx');
      const response = await GET(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('A/B test not found');
      expect(getABTest).not.toHaveBeenCalled();
    });

    it('should return 404 when test not found', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(getABTest).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx');
      const response = await GET(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('A/B test not found');
    });

    it('should return 429 when rate limited', async () => {
      vi.mocked(require('@/lib/rate-limit').apiRateLimiter.check).mockReturnValue({
        success: false,
        resetAt: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx');
      const response = await GET(request, { params: Promise.resolve({ id: 'test-clxxxxxxxxxxxxxxxxxx' }) });

      expect(response.status).toBe(429);
    });
  });

  describe('PATCH /api/ab-tests/[id]', () => {
    it('should start an A/B test', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';
      const mockResult = {
        id: testId,
        status: 'RUNNING',
        startedAt: new Date(),
      };

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(startABTest).mockResolvedValue(mockResult as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('RUNNING');
      expect(startABTest).toHaveBeenCalledWith(testId);
    });

    it('should select winner for a test', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';
      const variantId = 'var-1';
      const mockResult = {
        id: testId,
        status: 'COMPLETED',
        winner: { id: variantId },
      };

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(selectWinner).mockResolvedValue(mockResult as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'select-winner', variantId }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('COMPLETED');
      expect(selectWinner).toHaveBeenCalledWith(testId, variantId);
    });

    it('should auto-select winner based on performance', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';
      const mockResult = {
        id: testId,
        status: 'COMPLETED',
        winner: { id: 'var-2', name: 'Variant B' },
        reason: 'Highest open rate',
      };

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(autoSelectWinner).mockResolvedValue(mockResult as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'auto-select-winner' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('COMPLETED');
      expect(autoSelectWinner).toHaveBeenCalledWith(testId);
    });

    it('should cancel an A/B test', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';
      const mockResult = {
        id: testId,
        status: 'CANCELLED',
      };

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(cancelABTest).mockResolvedValue(mockResult as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'cancel' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('CANCELLED');
      expect(cancelABTest).toHaveBeenCalledWith(testId);
    });

    it('should add a variant to test', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';
      const variantData = { name: 'Variant C', subject: 'New subject' };
      const mockVariant = {
        id: 'var-3',
        ...variantData,
      };

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(addVariant).mockResolvedValue(mockVariant as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'add-variant', ...variantData }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.id).toBe('var-3');
      expect(addVariant).toHaveBeenCalledWith(testId, expect.any(Object));
    });

    it('should update a variant', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';
      const variantId = 'var-1';
      const updateData = { name: 'Updated Variant' };
      const mockVariant = {
        id: variantId,
        ...updateData,
      };

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(updateVariant).mockResolvedValue(mockVariant as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update-variant', variantId, ...updateData }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe(variantId);
      expect(updateVariant).toHaveBeenCalledWith(variantId, expect.any(Object));
    });

    it('should remove a variant', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';
      const variantId = 'var-1';

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(removeVariant).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'remove-variant', variantId }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Variant removed successfully');
      expect(removeVariant).toHaveBeenCalledWith(variantId);
    });

    it('should update test settings without action', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';
      const mockResult = {
        id: testId,
        name: 'Updated Test Name',
      };

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(updateABTest).mockResolvedValue(mockResult as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Test Name' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Updated Test Name');
      expect(updateABTest).toHaveBeenCalledWith(testId, expect.any(Object));
    });

    it('should return 400 when select-winner missing variantId', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'select-winner' }), // Missing variantId
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('variantId is required');
    });

    it('should verify ownership before updating', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue(null); // Test not found for user

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('A/B test not found');
    });

    it('should handle service errors with appropriate status codes', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(startABTest).mockRejectedValue(new Error('Test is not in draft status'));

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Test is not in draft status');
    });
  });

  describe('DELETE /api/ab-tests/[id]', () => {
    it('should delete an A/B test', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(deleteABTest).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('A/B test deleted successfully');
      expect(deleteABTest).toHaveBeenCalledWith(testId);
    });

    it('should verify ownership before deleting', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue(null); // Test not found for user

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('A/B test not found');
      expect(deleteABTest).not.toHaveBeenCalled();
    });

    it('should return 404 when test not found during deletion', async () => {
      const testId = 'test-clxxxxxxxxxxxxxxxxxx';

      vi.mocked(prisma.aBTest.findFirst).mockResolvedValue({ id: testId } as never);
      vi.mocked(deleteABTest).mockRejectedValue(new Error('A/B test not found'));

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: testId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('A/B test not found');
    });

    it('should return 429 when rate limited', async () => {
      vi.mocked(require('@/lib/rate-limit').apiRateLimiter.check).mockReturnValue({
        success: false,
        resetAt: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/ab-tests/test-clxxxxxxxxxxxxxxxxxx', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-clxxxxxxxxxxxxxxxxxx' }) });

      expect(response.status).toBe(429);
    });
  });
});
