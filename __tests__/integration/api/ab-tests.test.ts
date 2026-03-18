import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { GET, POST } from '@/app/api/ab-tests/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
    },
    aBTest: {
      findMany: vi.fn(),
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

// Mock A/B test service
vi.mock('@/lib/ab-test', () => ({
  createABTest: vi.fn(),
  listABTests: vi.fn(),
  createABTestSchema: {
    parse: vi.fn((data: unknown) => data),
  },
}));

import { prisma } from '@/lib/db/prisma';
import { createABTest, listABTests, createABTestSchema } from '@/lib/ab-test';
import { apiRateLimiter } from '@/lib/rate-limit';

describe('A/B Tests API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default rate limiter behavior after each clear
    vi.mocked(apiRateLimiter.check).mockReturnValue({ success: true, resetAt: Date.now() + 60000 });
    // Restore default schema parse behavior
    vi.mocked(createABTestSchema.parse).mockImplementation((data: unknown) => data);
  });

  describe('GET /api/ab-tests', () => {
    it('should list A/B tests with pagination', async () => {
      const mockTests = [
        {
          id: 'test-1',
          campaignId: 'camp-1',
          name: 'Subject Line Test',
          type: 'SUBJECT',
          status: 'RUNNING',
          createdAt: new Date(),
        },
        {
          id: 'test-2',
          campaignId: 'camp-2',
          name: 'Content Test',
          type: 'CONTENT',
          status: 'DRAFT',
          createdAt: new Date(),
        },
      ];

      vi.mocked(listABTests).mockResolvedValue({
        tests: mockTests,
        total: 2,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.totalPages).toBe(1);
    });

    it('should support pagination with custom page and limit', async () => {
      const mockTests = Array(10)
        .fill(0)
        .map((_, i) => ({
          id: `test-${i}`,
          campaignId: `camp-${i}`,
          name: `Test ${i}`,
          type: 'SUBJECT',
          status: 'DRAFT',
          createdAt: new Date(),
        }));

      vi.mocked(listABTests).mockResolvedValue({
        tests: mockTests,
        total: 50,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests?page=2&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(listABTests).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
        })
      );
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBe(50);
      expect(data.pagination.totalPages).toBe(5);
    });

    it('should filter by status', async () => {
      const mockTests = [
        {
          id: 'test-1',
          status: 'RUNNING',
          name: 'Running Test',
        },
      ];

      vi.mocked(listABTests).mockResolvedValue({
        tests: mockTests,
        total: 1,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests?status=RUNNING');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(listABTests).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'RUNNING',
        })
      );
    });

    it('should enforce limit maximum of 100', async () => {
      vi.mocked(listABTests).mockResolvedValue({
        tests: [],
        total: 0,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests?limit=500');
      const response = await GET(request);

      expect(listABTests).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Should be capped at 100
        })
      );
    });

    it('should return empty list when no tests exist', async () => {
      vi.mocked(listABTests).mockResolvedValue({
        tests: [],
        total: 0,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('should return 429 when rate limited', async () => {
      vi.mocked(apiRateLimiter.check).mockReturnValue({
        success: false,
        resetAt: Date.now() + 60000,
        remaining: 0,
        current: 101,
      });

      const request = new NextRequest('http://localhost:3000/api/ab-tests');
      const response = await GET(request);

      expect(response.status).toBe(429);
    });
  });

  describe('POST /api/ab-tests', () => {
    it('should create a new A/B test', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const newTest = {
        id: 'test-new',
        campaignId,
        name: 'Subject Line Test',
        type: 'SUBJECT',
        status: 'DRAFT',
        variants: [
          { id: 'var-1', name: 'Variant A', subject: 'Hello world' },
          { id: 'var-2', name: 'Variant B', subject: 'Hi there' },
        ],
        createdAt: new Date(),
      };

      const mockCampaign = { id: campaignId };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(createABTest).mockResolvedValue(newTest as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          campaignId,
          name: 'Subject Line Test',
          type: 'SUBJECT',
          variants: [
            { name: 'Variant A', subject: 'Hello world' },
            { name: 'Variant B', subject: 'Hi there' },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe('Subject Line Test');
      expect(data.data.variants).toHaveLength(2);
    });

    it('should verify campaign ownership before creating test', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null); // Campaign not found for user

      const request = new NextRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          campaignId,
          name: 'Subject Line Test',
          type: 'SUBJECT',
          variants: [
            { name: 'Variant A', subject: 'Hello' },
            { name: 'Variant B', subject: 'Hi' },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.message).toBe('Campaign not found');
    });

    it('should return validation error for invalid data', async () => {
      // Make schema parse throw a ZodError to simulate validation failure
      vi.mocked(createABTestSchema.parse).mockImplementation(() => {
        throw new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['campaignId'],
            message: 'Campaign ID is required',
          },
        ]);
      });

      const request = new NextRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          name: 'Test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return error when campaign already has A/B test', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = { id: campaignId };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(createABTest).mockRejectedValue(new Error('Campaign already has an A/B test'));

      const request = new NextRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          campaignId,
          name: 'Subject Line Test',
          type: 'SUBJECT',
          variants: [
            { name: 'Variant A', subject: 'Hello' },
            { name: 'Variant B', subject: 'Hi' },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toBe('Campaign already has an A/B test');
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: '{invalid json}',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON body');
    });

    it('should return 429 when rate limited', async () => {
      vi.mocked(apiRateLimiter.check).mockReturnValue({
        success: false,
        resetAt: Date.now() + 60000,
        remaining: 0,
        current: 101,
      });

      const request = new NextRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: 'camp-1',
          name: 'Test',
          type: 'SUBJECT',
          variants: [],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
    });

    it('should support all A/B test types', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = { id: campaignId };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(createABTest).mockResolvedValue({
        id: 'test-new',
        campaignId,
        type: 'CONTENT',
        variants: [],
      } as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          campaignId,
          name: 'Content Test',
          type: 'CONTENT',
          variants: [
            { name: 'Version A', content: '<p>Hello</p>' },
            { name: 'Version B', content: '<p>Hi</p>' },
          ],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(createABTest).toHaveBeenCalled();
    });

    it('should include user context when creating test', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = { id: campaignId };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(createABTest).mockResolvedValue({
        id: 'test-new',
        campaignId,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({
          campaignId,
          name: 'Test',
          type: 'SUBJECT',
          variants: [{ name: 'A' }, { name: 'B' }],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(createABTest).toHaveBeenCalledWith(
        expect.any(Object),
        'test-user-id' // User ID from auth context
      );
    });
  });
});
