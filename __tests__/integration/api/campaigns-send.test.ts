import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, PATCH } from '@/app/api/campaigns/[id]/send/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
      update: vi.fn(),
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
  queueCampaign: vi.fn(),
  pauseCampaign: vi.fn(),
  resumeCampaign: vi.fn(),
  cancelCampaign: vi.fn(),
  retryFailedRecipients: vi.fn(),
  getCampaignQueueStatus: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import {
  queueCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  retryFailedRecipients,
} from '@/lib/queue';

describe('Campaign Send API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/campaigns/[id]/send', () => {
    it('should queue campaign for immediate sending', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        status: 'DRAFT',
        _count: { recipients: 100 },
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(queueCampaign).mockResolvedValue({
        success: true,
        queuedCount: 100,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'POST',
        body: JSON.stringify({
          priority: 'normal',
          batchSize: 50,
          delayBetweenBatches: 1000,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Campaign sending started');
      expect(data.queuedCount).toBe(100);
      expect(queueCampaign).toHaveBeenCalledWith(
        campaignId,
        expect.objectContaining({
          priority: 'normal',
          batchSize: 50,
          delayBetweenBatches: 1000,
        })
      );
    });

    it('should schedule campaign for future sending', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const mockCampaign = {
        id: campaignId,
        status: 'DRAFT',
        _count: { recipients: 50 },
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue({
        ...mockCampaign,
        status: 'SCHEDULED',
        scheduledAt: futureDate,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'POST',
        body: JSON.stringify({
          scheduledAt: futureDate.toISOString(),
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Campaign scheduled successfully');
      expect(data.totalRecipients).toBe(50);
      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: campaignId },
          data: expect.objectContaining({
            status: 'SCHEDULED',
          }),
        })
      );
    });

    it('should return 404 when campaign not found', async () => {
      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'POST',
        body: JSON.stringify({ priority: 'normal' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Campaign not found');
    });

    it('should return 400 when campaign has no recipients', async () => {
      const mockCampaign = {
        id: 'clxxxxxxxxxxxxxxxxxx',
        status: 'DRAFT',
        _count: { recipients: 0 },
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'POST',
        body: JSON.stringify({ priority: 'normal' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Campaign has no recipients');
    });

    it('should return 400 when scheduled time is in the past', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const mockCampaign = {
        id: 'clxxxxxxxxxxxxxxxxxx',
        status: 'DRAFT',
        _count: { recipients: 50 },
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'POST',
        body: JSON.stringify({
          scheduledAt: pastDate.toISOString(),
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Scheduled time must be in the future');
    });

    it('should return 400 when campaign is not in DRAFT or SCHEDULED status', async () => {
      const mockCampaign = {
        id: 'clxxxxxxxxxxxxxxxxxx',
        status: 'COMPLETED',
        _count: { recipients: 50 },
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'POST',
        body: JSON.stringify({ priority: 'normal' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Campaign cannot be sent in COMPLETED status');
    });

    it('should return 400 for invalid campaign ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/campaigns/short/send', {
        method: 'POST',
        body: JSON.stringify({ priority: 'normal' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'short' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid campaign ID');
    });

    it('should return 429 when rate limited', async () => {
      vi.mocked(require('@/lib/rate-limit').apiRateLimiter.check).mockReturnValue({
        success: false,
        resetAt: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'POST',
        body: JSON.stringify({ priority: 'normal' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });

      expect(response.status).toBe(429);
    });

    it('should return 400 for validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'POST',
        body: JSON.stringify({
          priority: 'invalid-priority',
          batchSize: -1, // Invalid: negative batch size
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('PATCH /api/campaigns/[id]/send', () => {
    it('should pause a sending campaign', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        status: 'SENDING',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(pauseCampaign).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'pause' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Campaign paused');
      expect(pauseCampaign).toHaveBeenCalledWith(campaignId);
    });

    it('should resume a paused campaign', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        status: 'PAUSED',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(resumeCampaign).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'resume' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Campaign resumed');
      expect(resumeCampaign).toHaveBeenCalledWith(campaignId);
    });

    it('should cancel a sending campaign', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        status: 'SENDING',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(cancelCampaign).mockResolvedValue({
        success: true,
        cancelledJobs: 50,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'cancel' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Campaign cancelled');
      expect(data.cancelledJobs).toBe(50);
    });

    it('should retry failed recipients for completed campaign', async () => {
      const campaignId = 'clxxxxxxxxxxxxxxxxxx';
      const mockCampaign = {
        id: campaignId,
        status: 'COMPLETED',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);
      vi.mocked(retryFailedRecipients).mockResolvedValue({
        success: true,
        retriedCount: 10,
      } as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'retry' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: campaignId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.retriedCount).toBe(10);
    });

    it('should return 400 when trying to pause non-sending campaign', async () => {
      const mockCampaign = {
        id: 'clxxxxxxxxxxxxxxxxxx',
        status: 'DRAFT',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'pause' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Can only pause a sending campaign');
    });

    it('should return 400 when trying to resume non-paused campaign', async () => {
      const mockCampaign = {
        id: 'clxxxxxxxxxxxxxxxxxx',
        status: 'DRAFT',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'resume' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Can only resume a paused campaign');
    });

    it('should return 404 when campaign not found', async () => {
      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'pause' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Campaign not found');
    });

    it('should return 400 for invalid action', async () => {
      const mockCampaign = {
        id: 'clxxxxxxxxxxxxxxxxxx',
        status: 'SENDING',
      };

      vi.mocked(prisma.campaign.findFirst).mockResolvedValue(mockCampaign as never);

      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'invalid-action' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });

    it('should return 400 for validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/campaigns/clxxxxxxxxxxxxxxxxxx/send', {
        method: 'PATCH',
        body: JSON.stringify({ action: '' }), // Empty action
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'clxxxxxxxxxxxxxxxxxx' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });
});
