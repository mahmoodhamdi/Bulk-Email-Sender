import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    recipient: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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
import { addEmailJobs, getQueueStats, getCampaignJobs, cancelCampaignJobs } from '@/lib/queue/email-queue';
import {
  queueCampaign,
  getCampaignQueueStatus,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  getQueueHealth,
  retryFailedRecipients,
  checkAndCompleteCampaign,
} from '@/lib/queue/queue-service';

describe('Queue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCampaign = {
    id: 'campaign-1',
    name: 'Test Campaign',
    status: 'DRAFT',
    subject: 'Test Subject',
    content: '<p>Hello {{firstName}}</p>',
    fromName: 'Sender',
    fromEmail: 'sender@example.com',
    replyTo: null,
    totalRecipients: 100,
    sentCount: 50,
    bouncedCount: 5,
    startedAt: new Date(Date.now() - 60000),
  };

  const mockRecipients = [
    {
      id: 'recipient-1',
      email: 'test1@example.com',
      trackingId: 'track-1',
      contact: { id: 'contact-1', firstName: 'John', lastName: 'Doe', company: 'Acme', customField1: '', customField2: '' },
    },
    {
      id: 'recipient-2',
      email: 'test2@example.com',
      trackingId: 'track-2',
      contact: { id: 'contact-2', firstName: 'Jane', lastName: 'Doe', company: '', customField1: '', customField2: '' },
    },
  ];

  describe('queueCampaign', () => {
    it('should queue a campaign successfully', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.recipient.count).mockResolvedValue(2);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);
      // First call returns recipients, second call returns empty array (end of cursor)
      vi.mocked(prisma.recipient.findMany)
        .mockResolvedValueOnce(mockRecipients as never)
        .mockResolvedValueOnce([] as never);

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
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.recipient.count).mockResolvedValue(0);

      const result = await queueCampaign('campaign-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No recipients to send to');
    });

    it('should handle errors and revert campaign status', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.recipient.count).mockResolvedValue(2);
      vi.mocked(prisma.campaign.update).mockResolvedValueOnce(mockCampaign as never);
      vi.mocked(prisma.recipient.findMany).mockResolvedValueOnce(mockRecipients as never);
      vi.mocked(addEmailJobs).mockRejectedValueOnce(new Error('Queue error'));

      const result = await queueCampaign('campaign-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue error');
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { status: 'DRAFT', startedAt: null },
      });
    });

    it('should support custom SMTP config ID', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.recipient.count).mockResolvedValue(2);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.recipient.findMany)
        .mockResolvedValueOnce(mockRecipients as never)
        .mockResolvedValueOnce([] as never);

      await queueCampaign('campaign-1', { smtpConfigId: 'smtp-custom' });

      expect(addEmailJobs).toHaveBeenCalled();
    });

    it('should handle recipients without contacts', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.recipient.count).mockResolvedValue(1);
      vi.mocked(prisma.campaign.update).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.recipient.findMany)
        .mockResolvedValueOnce([{ id: 'r1', email: 'test@test.com', trackingId: 't1', contact: null }] as never)
        .mockResolvedValueOnce([] as never);

      const result = await queueCampaign('campaign-1');

      expect(result.success).toBe(true);
    });
  });

  describe('getCampaignQueueStatus', () => {
    it('should return null when campaign not found', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const status = await getCampaignQueueStatus('nonexistent');

      expect(status).toBeNull();
    });

    it('should return campaign queue status', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        status: 'SENDING',
        totalRecipients: 100,
        sentCount: 50,
        bouncedCount: 5,
        startedAt: new Date(Date.now() - 60000),
      } as never);
      vi.mocked(getCampaignJobs).mockResolvedValue([]);

      const status = await getCampaignQueueStatus('campaign-1');

      expect(status).toBeDefined();
      expect(status?.campaignId).toBe('campaign-1');
      expect(status?.totalRecipients).toBe(100);
      expect(status?.sent).toBe(50);
      expect(status?.failed).toBe(5);
    });

    it('should calculate progress correctly', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        status: 'SENDING',
        totalRecipients: 100,
        sentCount: 50,
        bouncedCount: 0,
        startedAt: new Date(),
      } as never);
      vi.mocked(getCampaignJobs).mockResolvedValue([]);

      const status = await getCampaignQueueStatus('campaign-1');

      expect(status?.progress).toBe(50);
    });

    it('should handle completed campaign status', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        status: 'COMPLETED',
        totalRecipients: 100,
        sentCount: 100,
        bouncedCount: 0,
        startedAt: new Date(),
      } as never);
      vi.mocked(getCampaignJobs).mockResolvedValue([]);

      const status = await getCampaignQueueStatus('campaign-1');

      expect(status?.status).toBe('completed');
    });

    it('should handle paused campaign status', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        status: 'PAUSED',
        totalRecipients: 100,
        sentCount: 50,
        bouncedCount: 0,
        startedAt: new Date(),
      } as never);
      vi.mocked(getCampaignJobs).mockResolvedValue([]);

      const status = await getCampaignQueueStatus('campaign-1');

      expect(status?.status).toBe('paused');
    });

    it('should handle cancelled campaign status', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        status: 'CANCELLED',
        totalRecipients: 100,
        sentCount: 50,
        bouncedCount: 0,
        startedAt: new Date(),
      } as never);
      vi.mocked(getCampaignJobs).mockResolvedValue([]);

      const status = await getCampaignQueueStatus('campaign-1');

      expect(status?.status).toBe('failed');
    });
  });

  describe('pauseCampaign', () => {
    it('should pause a campaign successfully', async () => {
      vi.mocked(prisma.campaign.update).mockResolvedValue({ id: 'campaign-1', status: 'PAUSED' } as never);

      const result = await pauseCampaign('campaign-1');

      expect(result).toBe(true);
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { status: 'PAUSED' },
      });
    });

    it('should return false on error', async () => {
      vi.mocked(prisma.campaign.update).mockRejectedValue(new Error('DB error'));

      const result = await pauseCampaign('campaign-1');

      expect(result).toBe(false);
    });
  });

  describe('resumeCampaign', () => {
    it('should resume a campaign successfully', async () => {
      vi.mocked(prisma.campaign.update).mockResolvedValue({ id: 'campaign-1', status: 'SENDING' } as never);

      const result = await resumeCampaign('campaign-1');

      expect(result).toBe(true);
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { status: 'SENDING' },
      });
    });

    it('should return false on error', async () => {
      vi.mocked(prisma.campaign.update).mockRejectedValue(new Error('DB error'));

      const result = await resumeCampaign('campaign-1');

      expect(result).toBe(false);
    });
  });

  describe('cancelCampaign', () => {
    it('should cancel a campaign successfully', async () => {
      vi.mocked(cancelCampaignJobs).mockResolvedValue(10);
      vi.mocked(prisma.campaign.update).mockResolvedValue({ id: 'campaign-1', status: 'CANCELLED' } as never);
      vi.mocked(prisma.recipient.updateMany).mockResolvedValue({ count: 5 } as never);

      const result = await cancelCampaign('campaign-1');

      expect(result.success).toBe(true);
      expect(result.cancelledJobs).toBe(10);
      expect(cancelCampaignJobs).toHaveBeenCalledWith('campaign-1');
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should update recipient statuses to FAILED', async () => {
      vi.mocked(cancelCampaignJobs).mockResolvedValue(5);
      vi.mocked(prisma.campaign.update).mockResolvedValue({} as never);
      vi.mocked(prisma.recipient.updateMany).mockResolvedValue({ count: 3 } as never);

      await cancelCampaign('campaign-1');

      expect(prisma.recipient.updateMany).toHaveBeenCalledWith({
        where: {
          campaignId: 'campaign-1',
          status: { in: ['PENDING', 'QUEUED'] },
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Campaign cancelled',
        },
      });
    });

    it('should return failure on error', async () => {
      vi.mocked(cancelCampaignJobs).mockRejectedValue(new Error('Queue error'));

      const result = await cancelCampaign('campaign-1');

      expect(result.success).toBe(false);
      expect(result.cancelledJobs).toBe(0);
    });
  });

  describe('getQueueHealth', () => {
    it('should return healthy status with stats', async () => {
      vi.mocked(getQueueStats).mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 10,
        paused: false,
      });
      vi.mocked(prisma.campaign.count).mockResolvedValue(2);

      const health = await getQueueHealth();

      expect(health.healthy).toBe(true);
      expect(health.stats.waiting).toBe(5);
      expect(health.activeCampaigns).toBe(2);
    });

    it('should return unhealthy status on error', async () => {
      vi.mocked(getQueueStats).mockRejectedValue(new Error('Redis error'));

      const health = await getQueueHealth();

      expect(health.healthy).toBe(false);
      expect(health.stats.waiting).toBe(0);
      expect(health.activeCampaigns).toBe(0);
    });
  });

  describe('retryFailedRecipients', () => {
    it('should retry failed recipients successfully', async () => {
      const pendingRecipients = [
        {
          id: 'recipient-1',
          email: 'test@example.com',
          trackingId: 'track-1',
          contact: { firstName: 'John', lastName: 'Doe', company: 'Acme', customField1: '', customField2: '' },
        },
      ];
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.recipient.count).mockResolvedValue(1);
      vi.mocked(prisma.recipient.updateMany).mockResolvedValue({ count: 1 } as never);
      // First call returns the now-PENDING recipients, second call returns empty (end of cursor)
      vi.mocked(prisma.recipient.findMany)
        .mockResolvedValueOnce(pendingRecipients as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(addEmailJobs).mockResolvedValue(['job-1']);

      const result = await retryFailedRecipients('campaign-1');

      expect(result.success).toBe(true);
      expect(result.retriedCount).toBe(1);
      expect(addEmailJobs).toHaveBeenCalled();
    });

    it('should return zero count when no failed recipients', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as never);
      vi.mocked(prisma.recipient.count).mockResolvedValue(0);

      const result = await retryFailedRecipients('campaign-1');

      expect(result.success).toBe(true);
      expect(result.retriedCount).toBe(0);
    });

    it('should update campaign status from COMPLETED to SENDING', async () => {
      const pendingRecipients = [
        {
          id: 'recipient-1',
          email: 'test@example.com',
          trackingId: 'track-1',
          contact: null,
        },
      ];
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ ...mockCampaign, status: 'COMPLETED' } as never);
      vi.mocked(prisma.recipient.count).mockResolvedValue(1);
      vi.mocked(prisma.recipient.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.recipient.findMany)
        .mockResolvedValueOnce(pendingRecipients as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue({} as never);

      await retryFailedRecipients('campaign-1');

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { status: 'SENDING' },
      });
    });

    it('should return failure on error', async () => {
      vi.mocked(prisma.campaign.findUnique).mockRejectedValue(new Error('DB error'));

      const result = await retryFailedRecipients('campaign-1');

      expect(result.success).toBe(false);
      expect(result.retriedCount).toBe(0);
    });

    it('should return failure when campaign not found', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const result = await retryFailedRecipients('campaign-1');

      expect(result.success).toBe(false);
      expect(result.retriedCount).toBe(0);
    });
  });

  describe('checkAndCompleteCampaign', () => {
    it('should complete campaign when all emails processed', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        status: 'SENDING',
        totalRecipients: 100,
        sentCount: 95,
        bouncedCount: 5,
      } as never);
      vi.mocked(prisma.campaign.update).mockResolvedValue({} as never);

      const result = await checkAndCompleteCampaign('campaign-1');

      expect(result).toBe(true);
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should return false when not all emails processed', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        status: 'SENDING',
        totalRecipients: 100,
        sentCount: 50,
        bouncedCount: 5,
      } as never);

      const result = await checkAndCompleteCampaign('campaign-1');

      expect(result).toBe(false);
    });

    it('should return false when campaign not found', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const result = await checkAndCompleteCampaign('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when campaign is not SENDING', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        status: 'PAUSED',
        totalRecipients: 100,
        sentCount: 100,
        bouncedCount: 0,
      } as never);

      const result = await checkAndCompleteCampaign('campaign-1');

      expect(result).toBe(false);
    });
  });
});
