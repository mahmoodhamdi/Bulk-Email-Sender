import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    recipient: {
      updateMany: vi.fn(),
    },
  },
}));

// Mock email-queue functions
vi.mock('@/lib/queue/email-queue', () => ({
  addEmailJob: vi.fn().mockResolvedValue('job-123'),
  addEmailJobs: vi.fn().mockResolvedValue(['job-1', 'job-2']),
  getQueueStats: vi.fn().mockResolvedValue({
    waiting: 5,
    active: 2,
    completed: 100,
    failed: 3,
    delayed: 10,
    paused: false,
  }),
  getCampaignJobs: vi.fn().mockResolvedValue([]),
  cancelCampaignJobs: vi.fn().mockResolvedValue(5),
  pauseQueue: vi.fn(),
  resumeQueue: vi.fn(),
  getJob: vi.fn(),
}));

// Mock merge-tags functions
vi.mock('@/lib/email/merge-tags', () => ({
  generateTrackingPixel: vi.fn().mockReturnValue('<img src="tracking" />'),
  generateUnsubscribeLink: vi.fn().mockReturnValue('http://unsubscribe'),
}));

import { prisma } from '@/lib/db/prisma';
import { addEmailJobs } from '@/lib/queue/email-queue';
import { queueCampaign } from '@/lib/queue/queue-service';

describe('Queue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('queueCampaign', () => {
    const mockCampaign = {
      id: 'campaign-1',
      status: 'DRAFT',
      subject: 'Test Subject',
      content: '<p>Hello {{firstName}}</p>',
      fromName: 'Sender',
      fromEmail: 'sender@example.com',
      recipients: [
        {
          id: 'recipient-1',
          email: 'test1@example.com',
          contact: { id: 'contact-1', firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 'recipient-2',
          email: 'test2@example.com',
          contact: { id: 'contact-2', firstName: 'Jane', lastName: 'Doe' },
        },
      ],
    };

    it('should queue a campaign successfully', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);

      const result = await queueCampaign('campaign-1');

      expect(result.success).toBe(true);
      expect(result.queuedCount).toBe(2);
      expect(addEmailJobs).toHaveBeenCalled();
    });

    it('should return error when campaign not found', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const result = await queueCampaign('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign not found');
    });

    it('should return error when campaign status is not DRAFT or SCHEDULED', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        ...mockCampaign,
        status: 'SENDING',
      } as never);

      const result = await queueCampaign('campaign-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be sent');
    });

    it('should return error when no recipients', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        ...mockCampaign,
        recipients: [],
      } as never);

      const result = await queueCampaign('campaign-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No recipients to send to');
    });

    it('should support custom batch size', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);

      await queueCampaign('campaign-1', { batchSize: 1 });

      expect(addEmailJobs).toHaveBeenCalled();
    });

    it('should support HIGH priority', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);

      await queueCampaign('campaign-1', { priority: 'HIGH' });

      expect(addEmailJobs).toHaveBeenCalled();
    });

    it('should support LOW priority', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);

      await queueCampaign('campaign-1', { priority: 'LOW' });

      expect(addEmailJobs).toHaveBeenCalled();
    });

    it('should support SCHEDULED campaign status', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        ...mockCampaign,
        status: 'SCHEDULED',
      } as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);

      const result = await queueCampaign('campaign-1');

      expect(result.success).toBe(true);
    });

    it('should support delay between batches', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);

      await queueCampaign('campaign-1', { delayBetweenBatches: 1000 });

      expect(addEmailJobs).toHaveBeenCalled();
    });

    it('should update campaign status to SENDING', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);

      await queueCampaign('campaign-1');

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: expect.objectContaining({
          status: 'SENDING',
          startedAt: expect.any(Date),
        }),
      });
    });
  });
});
