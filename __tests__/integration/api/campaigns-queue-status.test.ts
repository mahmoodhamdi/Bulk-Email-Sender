import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/campaigns/[id]/queue-status/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
    },
    recipient: {
      groupBy: vi.fn(),
    },
  },
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: {
    check: vi.fn(() => ({ success: true, resetAt: Date.now() + 60000 })),
  },
}));

// Mock queue functions
vi.mock('@/lib/queue', () => ({
  getCampaignQueueStatus: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { getCampaignQueueStatus } from '@/lib/queue';

describe('Campaign Queue Status API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/campaigns/[id]/queue-status', () => {
    it('should return complete queue status with metrics', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        status: 'SENDING',
        totalRecipients: 100,
        sentCount: 75,
        deliveredCount: 70,
        openedCount: 35,
        clickedCount: 10,
        bouncedCount: 5,
        unsubscribedCount: 2,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: null,
      };

      const mockQueueStatus = {
        queued: 25,
        progress: 75,
        status: 'sending',
        estimatedCompletion: new Date('2024-01-01T10:30:00Z'),
      };

      const mockRecipientStats = [
        { status: 'PENDING', _count: { status: 25 } },
        { status: 'SENT', _count: { status: 75 } },
      ];

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(getCampaignQueueStatus).mockResolvedValue(mockQueueStatus as never);
      vi.mocked(prisma.recipient.groupBy).mockResolvedValue(mockRecipientStats as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.campaign.id).toBe(campaignId);
      expect(data.data.campaign.name).toBe('Test Campaign');
      expect(data.data.metrics.sent).toBe(75);
      expect(data.data.metrics.delivered).toBe(70);
      expect(data.data.metrics.opened).toBe(35);
      expect(data.data.metrics.clicked).toBe(10);
      expect(data.data.progress.percentage).toBe(75);
      expect(data.data.progress.processed).toBe(80);
      expect(data.data.progress.remaining).toBe(20);
      expect(data.data.statusBreakdown.PENDING).toBe(25);
      expect(data.data.statusBreakdown.SENT).toBe(75);
    });

    it('should calculate progress correctly', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        status: 'SENDING',
        totalRecipients: 200,
        sentCount: 150,
        deliveredCount: 145,
        openedCount: 50,
        clickedCount: 20,
        bouncedCount: 10,
        unsubscribedCount: 5,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: null,
      };

      const mockQueueStatus = {
        queued: 40,
        progress: 75,
        status: 'sending',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(getCampaignQueueStatus).mockResolvedValue(mockQueueStatus as never);
      vi.mocked(prisma.recipient.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.progress.processed).toBe(160); // 150 sent + 10 bounced
      expect(data.data.progress.remaining).toBe(40);
      expect(data.data.progress.percentage).toBe(80);
    });

    it('should calculate sending rate and time remaining', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const startTime = new Date(Date.now() - 600000); // 10 minutes ago
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        status: 'SENDING',
        totalRecipients: 1000,
        sentCount: 500,
        deliveredCount: 490,
        openedCount: 100,
        clickedCount: 20,
        bouncedCount: 10,
        unsubscribedCount: 5,
        startedAt: startTime,
        completedAt: null,
      };

      const mockQueueStatus = {
        queued: 490,
        progress: 50,
        status: 'sending',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(getCampaignQueueStatus).mockResolvedValue(mockQueueStatus as never);
      vi.mocked(prisma.recipient.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.progress.sendingRate).toBeDefined();
      expect(data.data.progress.estimatedTimeRemaining).toBeDefined();
      expect(data.data.progress.sendingRate).toBeGreaterThan(0);
      expect(data.data.progress.estimatedTimeRemaining).toBeGreaterThan(0);
    });

    it('should return zero progress when campaign has not started', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        status: 'SCHEDULED',
        totalRecipients: 100,
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
        startedAt: null,
        completedAt: null,
      };

      const mockQueueStatus = {
        queued: 100,
        progress: 0,
        status: 'scheduled',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(getCampaignQueueStatus).mockResolvedValue(mockQueueStatus as never);
      vi.mocked(prisma.recipient.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.progress.percentage).toBe(0);
      expect(data.data.progress.processed).toBe(0);
      expect(data.data.progress.remaining).toBe(100);
      expect(data.data.progress.sendingRate).toBeNull();
      expect(data.data.progress.estimatedTimeRemaining).toBeNull();
    });

    it('should include timing information', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const startTime = new Date('2024-01-01T10:00:00Z');
      const completionTime = new Date('2024-01-01T10:30:00Z');
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        status: 'COMPLETED',
        totalRecipients: 100,
        sentCount: 100,
        deliveredCount: 100,
        openedCount: 50,
        clickedCount: 10,
        bouncedCount: 0,
        unsubscribedCount: 0,
        startedAt: startTime,
        completedAt: completionTime,
      };

      const mockQueueStatus = {
        queued: 0,
        progress: 100,
        status: 'completed',
        estimatedCompletion: completionTime,
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(getCampaignQueueStatus).mockResolvedValue(mockQueueStatus as never);
      vi.mocked(prisma.recipient.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.timing.startedAt).toBe(startTime.toISOString());
      expect(data.data.timing.completedAt).toBe(completionTime.toISOString());
    });

    it('should return 404 when campaign not found', async () => {
      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Campaign not found');
    });

    it('should return 400 for invalid campaign ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/campaigns/short/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: 'short' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid campaign ID');
    });

    it('should return 429 when rate limited', async () => {
      vi.mocked(require('@/lib/rate-limit').apiRateLimiter.check).mockReturnValue({
        success: false,
        resetAt: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });

      expect(response.status).toBe(429);
    });

    it('should handle empty recipient stats gracefully', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        status: 'DRAFT',
        totalRecipients: 0,
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
        startedAt: null,
        completedAt: null,
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(getCampaignQueueStatus).mockResolvedValue({
        queued: 0,
        progress: 0,
        status: 'draft',
      } as never);
      vi.mocked(prisma.recipient.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.progress.percentage).toBe(0);
      expect(data.data.statusBreakdown).toEqual({});
    });

    it('should aggregate recipient status counts correctly', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        status: 'SENDING',
        totalRecipients: 100,
        sentCount: 60,
        deliveredCount: 55,
        openedCount: 20,
        clickedCount: 5,
        bouncedCount: 10,
        unsubscribedCount: 5,
        startedAt: new Date(),
        completedAt: null,
      };

      const mockRecipientStats = [
        { status: 'SENT', _count: { status: 60 } },
        { status: 'PENDING', _count: { status: 30 } },
        { status: 'FAILED', _count: { status: 10 } },
      ];

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(getCampaignQueueStatus).mockResolvedValue({
        queued: 30,
        progress: 60,
        status: 'sending',
      } as never);
      vi.mocked(prisma.recipient.groupBy).mockResolvedValue(mockRecipientStats as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/queue-status');
      const response = await GET(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.statusBreakdown.SENT).toBe(60);
      expect(data.data.statusBreakdown.PENDING).toBe(30);
      expect(data.data.statusBreakdown.FAILED).toBe(10);
    });
  });
});
