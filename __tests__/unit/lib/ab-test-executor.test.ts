/**
 * A/B Test Executor Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    recipient: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    aBTest: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    aBTestVariant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock queue
vi.mock('@/lib/queue/email-queue', () => ({
  addEmailJobs: vi.fn().mockResolvedValue([]),
}));

// Mock AB test service
vi.mock('@/lib/ab-test/ab-test-service', () => ({
  getABTestByCampaign: vi.fn(),
  autoSelectWinner: vi.fn(),
  updateVariantResults: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { addEmailJobs } from '@/lib/queue/email-queue';
import { getABTestByCampaign, autoSelectWinner, updateVariantResults } from '@/lib/ab-test/ab-test-service';
import {
  splitRecipientsForABTest,
  queueABTestCampaign,
  sendToRemainingRecipients,
  recordABTestEvent,
  getABTestResults,
  campaignHasABTest,
} from '@/lib/ab-test/ab-test-executor';

describe('A/B Test Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('splitRecipientsForABTest', () => {
    it('should split recipients evenly among variants', async () => {
      const recipients = Array.from({ length: 100 }, (_, i) => ({
        id: `recipient-${i}`,
      }));

      vi.mocked(prisma.recipient.findMany).mockResolvedValue(recipients as never);

      const result = await splitRecipientsForABTest(
        'campaign-1',
        20, // 20% sample size
        ['variant-a', 'variant-b']
      );

      // 20% of 100 = 20 test recipients
      expect(result.totalTestRecipients).toBe(20);
      // Split between 2 variants
      expect(result.testGroups.get('variant-a')?.length).toBe(10);
      expect(result.testGroups.get('variant-b')?.length).toBe(10);
      // 80 remaining recipients
      expect(result.remainingRecipientIds.length).toBe(80);
    });

    it('should handle odd number of recipients', async () => {
      const recipients = Array.from({ length: 50 }, (_, i) => ({
        id: `recipient-${i}`,
      }));

      vi.mocked(prisma.recipient.findMany).mockResolvedValue(recipients as never);

      const result = await splitRecipientsForABTest(
        'campaign-1',
        30, // 30% sample size
        ['variant-a', 'variant-b', 'variant-c']
      );

      // 30% of 50 = 15 test recipients
      expect(result.totalTestRecipients).toBe(15);
      // Split among 3 variants (5 each)
      expect(result.testGroups.get('variant-a')?.length).toBe(5);
      expect(result.testGroups.get('variant-b')?.length).toBe(5);
      expect(result.testGroups.get('variant-c')?.length).toBe(5);
      // 35 remaining
      expect(result.remainingRecipientIds.length).toBe(35);
    });

    it('should handle small sample sizes', async () => {
      const recipients = Array.from({ length: 10 }, (_, i) => ({
        id: `recipient-${i}`,
      }));

      vi.mocked(prisma.recipient.findMany).mockResolvedValue(recipients as never);

      const result = await splitRecipientsForABTest(
        'campaign-1',
        10, // 10% sample size (1 recipient)
        ['variant-a', 'variant-b']
      );

      // 10% of 10 = 1 test recipient (rounded up to split)
      expect(result.totalTestRecipients).toBeGreaterThanOrEqual(1);
    });
  });

  describe('queueABTestCampaign', () => {
    it('should return error if campaign not found', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const result = await queueABTestCampaign('non-existent-campaign');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign not found');
    });

    it('should return error if no A/B test exists', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        name: 'Test Campaign',
        subject: 'Test Subject',
        content: '<p>Test</p>',
        fromName: 'Sender',
        fromEmail: 'sender@example.com',
        replyTo: null,
        status: 'DRAFT',
      } as never);

      vi.mocked(getABTestByCampaign).mockResolvedValue(null);

      const result = await queueABTestCampaign('campaign-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No A/B test found for campaign');
    });

    it('should return error if A/B test has wrong status', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        name: 'Test Campaign',
        subject: 'Test Subject',
        content: '<p>Test</p>',
        fromName: 'Sender',
        fromEmail: 'sender@example.com',
        replyTo: null,
        status: 'DRAFT',
      } as never);

      vi.mocked(getABTestByCampaign).mockResolvedValue({
        id: 'test-1',
        campaignId: 'campaign-1',
        status: 'COMPLETED',
        variants: [],
      } as never);

      const result = await queueABTestCampaign('campaign-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('A/B test is in COMPLETED status');
    });

    it('should return error if less than 2 variants', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        name: 'Test Campaign',
        subject: 'Test Subject',
        content: '<p>Test</p>',
        fromName: 'Sender',
        fromEmail: 'sender@example.com',
        replyTo: null,
        status: 'DRAFT',
      } as never);

      vi.mocked(getABTestByCampaign).mockResolvedValue({
        id: 'test-1',
        campaignId: 'campaign-1',
        status: 'DRAFT',
        sampleSize: 20,
        variants: [],
      } as never);

      vi.mocked(prisma.aBTestVariant.findMany).mockResolvedValue([
        { id: 'variant-1', name: 'A' },
      ] as never);

      const result = await queueABTestCampaign('campaign-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least 2 variants required');
    });
  });

  describe('sendToRemainingRecipients', () => {
    it('should return error if campaign not found', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const result = await sendToRemainingRecipients('campaign-1', 'variant-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign not found');
    });

    it('should return error if variant not found', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        subject: 'Test',
        content: '<p>Test</p>',
        fromName: 'Sender',
        fromEmail: 'sender@example.com',
        replyTo: null,
      } as never);

      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue(null);

      const result = await sendToRemainingRecipients('campaign-1', 'non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Winner variant not found');
    });

    it('should succeed with no remaining recipients', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        subject: 'Test',
        content: '<p>Test</p>',
        fromName: 'Sender',
        fromEmail: 'sender@example.com',
        replyTo: null,
      } as never);

      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue({
        id: 'variant-1',
        name: 'Winner',
        subject: 'Winner Subject',
        content: null,
        fromName: null,
      } as never);

      vi.mocked(prisma.recipient.findMany).mockResolvedValue([]);

      const result = await sendToRemainingRecipients('campaign-1', 'variant-1');

      expect(result.success).toBe(true);
      expect(result.queuedCount).toBe(0);
    });

    it('should queue remaining recipients with winner content', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: 'campaign-1',
        subject: 'Test',
        content: '<p>Test</p>',
        fromName: 'Sender',
        fromEmail: 'sender@example.com',
        replyTo: null,
      } as never);

      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue({
        id: 'variant-1',
        name: 'Winner',
        subject: 'Winner Subject',
        content: '<p>Winner Content</p>',
        fromName: 'Winner Sender',
      } as never);

      vi.mocked(prisma.recipient.findMany).mockResolvedValue([
        { id: 'r1', email: 'test1@example.com', trackingId: 't1', contact: null },
        { id: 'r2', email: 'test2@example.com', trackingId: 't2', contact: null },
      ] as never);

      vi.mocked(prisma.recipient.updateMany).mockResolvedValue({ count: 2 } as never);

      const result = await sendToRemainingRecipients('campaign-1', 'variant-1');

      expect(result.success).toBe(true);
      expect(result.queuedCount).toBe(2);
      expect(addEmailJobs).toHaveBeenCalled();
    });
  });

  describe('recordABTestEvent', () => {
    it('should not record if recipient has no variant', async () => {
      vi.mocked(prisma.recipient.findUnique).mockResolvedValue({
        variantId: null,
      } as never);

      await recordABTestEvent('recipient-1', 'opened');

      expect(updateVariantResults).not.toHaveBeenCalled();
    });

    it('should update variant results for valid event', async () => {
      vi.mocked(prisma.recipient.findUnique).mockResolvedValue({
        variantId: 'variant-1',
      } as never);

      await recordABTestEvent('recipient-1', 'opened');

      expect(updateVariantResults).toHaveBeenCalledWith('variant-1', {
        opened: 1,
      });
    });

    it('should handle all event types', async () => {
      vi.mocked(prisma.recipient.findUnique).mockResolvedValue({
        variantId: 'variant-1',
      } as never);

      const events = ['sent', 'opened', 'clicked', 'bounced', 'converted'] as const;

      for (const event of events) {
        await recordABTestEvent('recipient-1', event);
        expect(updateVariantResults).toHaveBeenCalledWith('variant-1', {
          [event]: 1,
        });
      }
    });
  });

  describe('getABTestResults', () => {
    it('should return null if no test exists', async () => {
      vi.mocked(getABTestByCampaign).mockResolvedValue(null);

      const result = await getABTestResults('campaign-1');

      expect(result).toBeNull();
    });

    it('should return results with winner info', async () => {
      vi.mocked(getABTestByCampaign).mockResolvedValue({
        id: 'test-1',
        campaignId: 'campaign-1',
        status: 'COMPLETED',
        winnerId: 'variant-1',
        winnerCriteria: 'OPEN_RATE',
        variants: [
          {
            variantId: 'variant-1',
            name: 'Variant A',
            openRate: 25,
            clickRate: 10,
            conversionRate: 5,
          },
          {
            variantId: 'variant-2',
            name: 'Variant B',
            openRate: 20,
            clickRate: 8,
            conversionRate: 4,
          },
        ],
      } as never);

      const result = await getABTestResults('campaign-1');

      expect(result).not.toBeNull();
      expect(result?.isComplete).toBe(true);
      expect(result?.winner).toEqual({
        variantId: 'variant-1',
        name: 'Variant A',
        score: 25, // openRate since winnerCriteria is OPEN_RATE
      });
    });

    it('should return results without winner if not completed', async () => {
      vi.mocked(getABTestByCampaign).mockResolvedValue({
        id: 'test-1',
        campaignId: 'campaign-1',
        status: 'RUNNING',
        winnerId: null,
        winnerCriteria: 'CLICK_RATE',
        variants: [],
      } as never);

      const result = await getABTestResults('campaign-1');

      expect(result).not.toBeNull();
      expect(result?.isComplete).toBe(false);
      expect(result?.winner).toBeNull();
    });
  });

  describe('campaignHasABTest', () => {
    it('should return true if campaign has A/B test', async () => {
      vi.mocked(prisma.aBTest.count).mockResolvedValue(1 as never);

      const result = await campaignHasABTest('campaign-1');

      expect(result).toBe(true);
    });

    it('should return false if campaign has no A/B test', async () => {
      vi.mocked(prisma.aBTest.count).mockResolvedValue(0 as never);

      const result = await campaignHasABTest('campaign-1');

      expect(result).toBe(false);
    });
  });
});
