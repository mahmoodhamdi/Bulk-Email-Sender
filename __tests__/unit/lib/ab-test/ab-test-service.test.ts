/**
 * A/B Test Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
    },
    aBTest: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    aBTestVariant: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  createABTest,
  getABTest,
  getABTestByCampaign,
  listABTests,
  updateABTest,
  addVariant,
  updateVariant,
  removeVariant,
  startABTest,
  selectWinner,
  autoSelectWinner,
  cancelABTest,
  deleteABTest,
  updateVariantResults,
} from '@/lib/ab-test/ab-test-service';

describe('A/B Test Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createABTest', () => {
    it('should_create_ab_test_with_variants_when_campaign_exists', async () => {
      const campaignId = 'camp-123';
      const userId = 'user-123';
      const input = {
        campaignId,
        name: 'Subject Test',
        testType: 'SUBJECT' as const,
        sampleSize: 20,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        variants: [
          { name: 'Variant A', subject: 'Test A', content: null, fromName: null, sendTime: null },
          { name: 'Variant B', subject: 'Test B', content: null, fromName: null, sendTime: null },
        ],
      };

      const mockCampaign = { id: campaignId, name: 'Test Campaign' };
      const mockTest = {
        id: 'test-123',
        campaignId,
        name: input.name,
        testType: input.testType,
        sampleSize: input.sampleSize,
        winnerCriteria: input.winnerCriteria,
        testDuration: input.testDuration,
        autoSelectWinner: input.autoSelectWinner,
        userId,
        status: 'DRAFT' as const,
        winnerId: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            testId: 'test-123',
            name: 'Variant A',
            subject: 'Test A',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 0,
            sent: 0,
            opened: 0,
            clicked: 0,
            converted: 0,
            bounced: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'var-2',
            testId: 'test-123',
            name: 'Variant B',
            subject: 'Test B',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 1,
            sent: 0,
            opened: 0,
            clicked: 0,
            converted: 0,
            bounced: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(mockCampaign as any);
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.aBTest.create).mockResolvedValue(mockTest as any);

      const result = await createABTest(input, userId);

      expect(result.id).toBe('test-123');
      expect(result.variants).toHaveLength(2);
      expect(result.status).toBe('DRAFT');
      expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: campaignId },
      });
      expect(prisma.aBTest.create).toHaveBeenCalled();
    });

    it('should_throw_error_when_campaign_not_found', async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      const input = {
        campaignId: 'non-existent',
        name: 'Test',
        testType: 'SUBJECT' as const,
        sampleSize: 20,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        variants: [
          { name: 'Variant A', subject: 'Test A', content: null, fromName: null, sendTime: null },
          { name: 'Variant B', subject: 'Test B', content: null, fromName: null, sendTime: null },
        ],
      };

      await expect(createABTest(input)).rejects.toThrow('Campaign not found');
    });

    it('should_throw_error_when_campaign_already_has_test', async () => {
      const campaignId = 'camp-123';
      const input = {
        campaignId,
        name: 'Test',
        testType: 'SUBJECT' as const,
        sampleSize: 20,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        variants: [
          { name: 'Variant A', subject: 'Test A', content: null, fromName: null, sendTime: null },
          { name: 'Variant B', subject: 'Test B', content: null, fromName: null, sendTime: null },
        ],
      };

      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: campaignId } as any);
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({ id: 'existing-test' } as any);

      await expect(createABTest(input)).rejects.toThrow('Campaign already has an A/B test');
    });

    it('should_parse_sendTime_as_date', async () => {
      const campaignId = 'camp-123';
      const sendTimeStr = '2026-02-01T12:00:00Z';
      const input = {
        campaignId,
        name: 'Send Time Test',
        testType: 'SEND_TIME' as const,
        sampleSize: 20,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        variants: [
          { name: 'Variant A', subject: null, content: null, fromName: null, sendTime: sendTimeStr },
          { name: 'Variant B', subject: null, content: null, fromName: null, sendTime: '2026-02-01T14:00:00Z' },
        ],
      };

      const mockTest = {
        id: 'test-123',
        campaignId,
        name: input.name,
        testType: input.testType,
        sampleSize: input.sampleSize,
        winnerCriteria: input.winnerCriteria,
        testDuration: input.testDuration,
        autoSelectWinner: input.autoSelectWinner,
        userId: undefined,
        status: 'DRAFT',
        winnerId: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
      };

      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: campaignId } as any);
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.aBTest.create).mockResolvedValue(mockTest as any);

      await createABTest(input);

      const createCall = vi.mocked(prisma.aBTest.create).mock.calls[0];
      expect(createCall[0].data.variants.create).toBeDefined();
    });
  });

  describe('getABTest', () => {
    it('should_return_test_with_stats_when_exists', async () => {
      const testId = 'test-123';
      const mockTest = {
        id: testId,
        campaignId: 'camp-123',
        name: 'Test',
        testType: 'SUBJECT' as const,
        sampleSize: 20,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        userId: 'user-123',
        status: 'RUNNING' as const,
        winnerId: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            testId,
            name: 'Variant A',
            subject: 'Test A',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 0,
            sent: 100,
            opened: 50,
            clicked: 25,
            converted: 10,
            bounced: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'var-2',
            testId,
            name: 'Variant B',
            subject: 'Test B',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 1,
            sent: 100,
            opened: 40,
            clicked: 20,
            converted: 8,
            bounced: 4,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);

      const result = await getABTest(testId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testId);
      expect(result?.stats.totalSent).toBe(200);
      expect(result?.stats.totalOpened).toBe(90);
      expect(result?.stats.openRate).toBeCloseTo(45, 0);
      expect(result?.variants).toHaveLength(2);
      expect(result?.variants[0].openRate).toBeCloseTo(50, 0);
    });

    it('should_return_null_when_test_not_found', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);

      const result = await getABTest('non-existent');

      expect(result).toBeNull();
    });

    it('should_calculate_correct_conversion_rates', async () => {
      const mockTest = {
        id: 'test-123',
        campaignId: 'camp-123',
        name: 'Test',
        testType: 'CONTENT' as const,
        sampleSize: 20,
        winnerCriteria: 'CONVERSION_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        userId: 'user-123',
        status: 'RUNNING' as const,
        winnerId: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            testId: 'test-123',
            name: 'A',
            subject: null,
            content: 'Content A',
            fromName: null,
            sendTime: null,
            sortOrder: 0,
            sent: 200,
            opened: 100,
            clicked: 50,
            converted: 20,
            bounced: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);

      const result = await getABTest('test-123');

      expect(result?.stats.conversionRate).toBeCloseTo(10, 0);
      expect(result?.variants[0].conversionRate).toBeCloseTo(10, 0);
    });
  });

  describe('getABTestByCampaign', () => {
    it('should_return_test_by_campaign_id', async () => {
      const campaignId = 'camp-123';
      const mockTest = {
        id: 'test-123',
        campaignId,
        name: 'Test',
        testType: 'SUBJECT' as const,
        sampleSize: 20,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        userId: 'user-123',
        status: 'DRAFT' as const,
        winnerId: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);

      const result = await getABTestByCampaign(campaignId);

      expect(result?.id).toBe('test-123');
      expect(prisma.aBTest.findUnique).toHaveBeenCalledWith({
        where: { campaignId },
        include: {
          variants: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    it('should_return_null_when_no_test_for_campaign', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);

      const result = await getABTestByCampaign('camp-123');

      expect(result).toBeNull();
    });
  });

  describe('listABTests', () => {
    it('should_list_tests_with_pagination', async () => {
      const mockTests = [
        {
          id: 'test-1',
          campaignId: 'camp-1',
          name: 'Test 1',
          testType: 'SUBJECT' as const,
          sampleSize: 20,
          winnerCriteria: 'OPEN_RATE' as const,
          testDuration: 4,
          autoSelectWinner: true,
          userId: 'user-123',
          status: 'DRAFT' as const,
          winnerId: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
          variants: [],
        },
        {
          id: 'test-2',
          campaignId: 'camp-2',
          name: 'Test 2',
          testType: 'CONTENT' as const,
          sampleSize: 20,
          winnerCriteria: 'CLICK_RATE' as const,
          testDuration: 4,
          autoSelectWinner: false,
          userId: 'user-123',
          status: 'RUNNING' as const,
          winnerId: null,
          startedAt: new Date('2026-01-10'),
          completedAt: null,
          createdAt: new Date('2026-01-10'),
          updatedAt: new Date('2026-01-10'),
          variants: [],
        },
      ];

      vi.mocked(prisma.aBTest.findMany).mockResolvedValue(mockTests as any);
      vi.mocked(prisma.aBTest.count).mockResolvedValue(2);

      const result = await listABTests({ userId: 'user-123', page: 1, limit: 20 });

      expect(result.tests).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.aBTest.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          variants: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    it('should_filter_by_status', async () => {
      vi.mocked(prisma.aBTest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.aBTest.count).mockResolvedValue(0);

      await listABTests({ status: 'RUNNING' });

      expect(prisma.aBTest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'RUNNING' },
        })
      );
    });

    it('should_calculate_pagination_skip_correctly', async () => {
      vi.mocked(prisma.aBTest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.aBTest.count).mockResolvedValue(0);

      await listABTests({ page: 3, limit: 10 });

      expect(prisma.aBTest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });

    it('should_use_defaults_when_pagination_not_provided', async () => {
      vi.mocked(prisma.aBTest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.aBTest.count).mockResolvedValue(0);

      await listABTests({});

      expect(prisma.aBTest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      );
    });
  });

  describe('updateABTest', () => {
    it('should_update_draft_test', async () => {
      const testId = 'test-123';
      const mockTest = {
        id: testId,
        status: 'DRAFT' as const,
      };

      const mockUpdatedTest = {
        id: testId,
        campaignId: 'camp-123',
        name: 'Updated Name',
        testType: 'SUBJECT' as const,
        sampleSize: 30,
        winnerCriteria: 'CLICK_RATE' as const,
        testDuration: 5,
        autoSelectWinner: false,
        userId: 'user-123',
        status: 'DRAFT' as const,
        winnerId: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [],
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);
      vi.mocked(prisma.aBTest.update).mockResolvedValue(mockUpdatedTest as any);

      const result = await updateABTest(testId, {
        name: 'Updated Name',
        sampleSize: 30,
        winnerCriteria: 'CLICK_RATE' as const,
      });

      expect(result.name).toBe('Updated Name');
      expect(result.sampleSize).toBe(30);
      expect(prisma.aBTest.update).toHaveBeenCalledWith({
        where: { id: testId },
        data: {
          name: 'Updated Name',
          sampleSize: 30,
          winnerCriteria: 'CLICK_RATE',
        },
        include: {
          variants: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    it('should_throw_error_when_test_not_found', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);

      await expect(updateABTest('non-existent', { name: 'New Name' })).rejects.toThrow(
        'A/B test not found'
      );
    });

    it('should_throw_error_when_test_not_draft', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({
        id: 'test-123',
        status: 'RUNNING',
      } as any);

      await expect(updateABTest('test-123', { name: 'New Name' })).rejects.toThrow(
        'Cannot update a test that is not in draft status'
      );
    });
  });

  describe('addVariant', () => {
    it('should_add_variant_to_draft_test', async () => {
      const testId = 'test-123';
      const mockTest = {
        id: testId,
        status: 'DRAFT' as const,
        variants: [
          { id: 'var-1', name: 'A' },
          { id: 'var-2', name: 'B' },
        ],
      };

      const mockNewVariant = {
        id: 'var-3',
        testId,
        name: 'Variant C',
        subject: 'Test C',
        content: null,
        fromName: null,
        sendTime: null,
        sortOrder: 2,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        bounced: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);
      vi.mocked(prisma.aBTestVariant.create).mockResolvedValue(mockNewVariant as any);

      const result = await addVariant(testId, {
        name: 'Variant C',
        subject: 'Test C',
      });

      expect(result.id).toBe('var-3');
      expect(result.sortOrder).toBe(2);
      expect(prisma.aBTestVariant.create).toHaveBeenCalledWith({
        data: {
          testId,
          name: 'Variant C',
          subject: 'Test C',
          content: undefined,
          fromName: undefined,
          sendTime: null,
          sortOrder: 2,
        },
      });
    });

    it('should_throw_error_when_test_not_draft', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({
        id: 'test-123',
        status: 'RUNNING',
        variants: [],
      } as any);

      await expect(
        addVariant('test-123', { name: 'Variant C', subject: 'Test C' })
      ).rejects.toThrow('Cannot add variants to a test that is not in draft status');
    });

    it('should_throw_error_when_max_variants_reached', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({
        id: 'test-123',
        status: 'DRAFT',
        variants: [
          { id: 'var-1' },
          { id: 'var-2' },
          { id: 'var-3' },
          { id: 'var-4' },
          { id: 'var-5' },
        ],
      } as any);

      await expect(
        addVariant('test-123', { name: 'Variant F', subject: 'Test F' })
      ).rejects.toThrow('Maximum 5 variants allowed');
    });

    it('should_throw_error_when_test_not_found', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);

      await expect(addVariant('non-existent', { name: 'Variant C' })).rejects.toThrow(
        'A/B test not found'
      );
    });

    it('should_parse_sendTime_when_provided', async () => {
      const testId = 'test-123';
      const sendTime = '2026-02-01T12:00:00Z';
      const mockTest = {
        id: testId,
        status: 'DRAFT' as const,
        variants: [{ id: 'var-1' }],
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);
      vi.mocked(prisma.aBTestVariant.create).mockResolvedValue({
        id: 'var-2',
        testId,
        name: 'Variant B',
        subject: null,
        content: null,
        fromName: null,
        sendTime: new Date(sendTime),
        sortOrder: 1,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        bounced: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await addVariant(testId, {
        name: 'Variant B',
        sendTime,
      });

      expect(prisma.aBTestVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sendTime: new Date(sendTime),
          }),
        })
      );
    });
  });

  describe('updateVariant', () => {
    it('should_update_draft_test_variant', async () => {
      const variantId = 'var-123';
      const mockVariant = {
        id: variantId,
        test: { status: 'DRAFT' as const },
      };

      const mockUpdatedVariant = {
        id: variantId,
        testId: 'test-123',
        name: 'Updated Variant',
        subject: 'Updated Subject',
        content: 'Updated Content',
        fromName: 'Updated Sender',
        sendTime: null,
        sortOrder: 0,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        bounced: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue(mockVariant as any);
      vi.mocked(prisma.aBTestVariant.update).mockResolvedValue(mockUpdatedVariant as any);

      const result = await updateVariant(variantId, {
        name: 'Updated Variant',
        subject: 'Updated Subject',
        content: 'Updated Content',
        fromName: 'Updated Sender',
      });

      expect(result.name).toBe('Updated Variant');
      expect(result.subject).toBe('Updated Subject');
    });

    it('should_throw_error_when_variant_not_found', async () => {
      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue(null);

      await expect(updateVariant('non-existent', { name: 'New Name' })).rejects.toThrow(
        'Variant not found'
      );
    });

    it('should_throw_error_when_test_not_draft', async () => {
      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue({
        id: 'var-123',
        test: { status: 'RUNNING' },
      } as any);

      await expect(updateVariant('var-123', { name: 'New Name' })).rejects.toThrow(
        'Cannot update variants of a test that is not in draft status'
      );
    });
  });

  describe('removeVariant', () => {
    it('should_remove_variant_from_draft_test', async () => {
      const variantId = 'var-123';
      const mockVariant = {
        id: variantId,
        test: {
          status: 'DRAFT' as const,
          variants: [{ id: 'var-1' }, { id: 'var-2' }, { id: 'var-123' }],
        },
      };

      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue(mockVariant as any);
      vi.mocked(prisma.aBTestVariant.delete).mockResolvedValue(mockVariant as any);

      await removeVariant(variantId);

      expect(prisma.aBTestVariant.delete).toHaveBeenCalledWith({
        where: { id: variantId },
      });
    });

    it('should_throw_error_when_variant_not_found', async () => {
      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue(null);

      await expect(removeVariant('non-existent')).rejects.toThrow('Variant not found');
    });

    it('should_throw_error_when_test_not_draft', async () => {
      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue({
        id: 'var-123',
        test: {
          status: 'RUNNING',
          variants: [],
        },
      } as any);

      await expect(removeVariant('var-123')).rejects.toThrow(
        'Cannot remove variants from a test that is not in draft status'
      );
    });

    it('should_throw_error_when_minimum_variants_required', async () => {
      vi.mocked(prisma.aBTestVariant.findUnique).mockResolvedValue({
        id: 'var-123',
        test: {
          status: 'DRAFT',
          variants: [{ id: 'var-1' }],
        },
      } as any);

      await expect(removeVariant('var-123')).rejects.toThrow('Minimum 2 variants are required');
    });
  });

  describe('startABTest', () => {
    it('should_start_draft_test_with_variants', async () => {
      const testId = 'test-123';
      const mockTest = {
        id: testId,
        status: 'DRAFT' as const,
        variants: [{ id: 'var-1' }, { id: 'var-2' }],
      };

      const mockStartedTest = {
        ...mockTest,
        status: 'RUNNING' as const,
        startedAt: new Date(),
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);
      vi.mocked(prisma.aBTest.update).mockResolvedValue(mockStartedTest as any);

      const result = await startABTest(testId);

      expect(result.status).toBe('RUNNING');
      expect(result.startedAt).not.toBeNull();
      expect(prisma.aBTest.update).toHaveBeenCalledWith({
        where: { id: testId },
        data: {
          status: 'RUNNING',
          startedAt: expect.any(Date),
        },
      });
    });

    it('should_throw_error_when_test_not_found', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);

      await expect(startABTest('non-existent')).rejects.toThrow('A/B test not found');
    });

    it('should_throw_error_when_test_not_draft', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({
        id: 'test-123',
        status: 'RUNNING',
        variants: [],
      } as any);

      await expect(startABTest('test-123')).rejects.toThrow('Test is not in draft status');
    });

    it('should_throw_error_when_less_than_2_variants', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({
        id: 'test-123',
        status: 'DRAFT',
        variants: [{ id: 'var-1' }],
      } as any);

      await expect(startABTest('test-123')).rejects.toThrow(
        'At least 2 variants are required to start a test'
      );
    });
  });

  describe('selectWinner', () => {
    it('should_select_winner_for_running_test', async () => {
      const testId = 'test-123';
      const winnerVariantId = 'var-2';
      const mockTest = {
        id: testId,
        status: 'RUNNING' as const,
        variants: [
          { id: 'var-1', name: 'A' },
          { id: winnerVariantId, name: 'B' },
        ],
      };

      const mockCompletedTest = {
        ...mockTest,
        status: 'COMPLETED' as const,
        winnerId: winnerVariantId,
        completedAt: new Date(),
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);
      vi.mocked(prisma.aBTest.update).mockResolvedValue(mockCompletedTest as any);

      const result = await selectWinner(testId, winnerVariantId);

      expect(result.status).toBe('COMPLETED');
      expect(result.winnerId).toBe(winnerVariantId);
      expect(result.completedAt).not.toBeNull();
    });

    it('should_throw_error_when_test_not_found', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);

      await expect(selectWinner('non-existent', 'var-1')).rejects.toThrow('A/B test not found');
    });

    it('should_throw_error_when_test_not_running', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({
        id: 'test-123',
        status: 'DRAFT',
        variants: [],
      } as any);

      await expect(selectWinner('test-123', 'var-1')).rejects.toThrow(
        'Can only select winner for running tests'
      );
    });

    it('should_throw_error_when_variant_not_in_test', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({
        id: 'test-123',
        status: 'RUNNING',
        variants: [{ id: 'var-1' }, { id: 'var-2' }],
      } as any);

      await expect(selectWinner('test-123', 'non-existent-var')).rejects.toThrow(
        'Variant not found in this test'
      );
    });
  });

  describe('autoSelectWinner', () => {
    it('should_select_winner_based_on_open_rate', async () => {
      const testId = 'test-123';
      const mockTestWithStats = {
        id: testId,
        campaignId: 'camp-123',
        name: 'Test',
        testType: 'SUBJECT' as const,
        sampleSize: 20,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        userId: 'user-123',
        status: 'RUNNING' as const,
        winnerId: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            testId,
            name: 'A',
            subject: 'Test A',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 0,
            sent: 100,
            opened: 40,
            clicked: 20,
            converted: 10,
            bounced: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            variantId: 'var-1',
            openRate: 40,
            clickRate: 20,
            conversionRate: 10,
            isWinner: false,
          },
          {
            id: 'var-2',
            testId,
            name: 'B',
            subject: 'Test B',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 1,
            sent: 100,
            opened: 50,
            clicked: 25,
            converted: 12,
            bounced: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            variantId: 'var-2',
            openRate: 50,
            clickRate: 25,
            conversionRate: 12,
            isWinner: false,
          },
        ],
        stats: {
          totalSent: 200,
          totalOpened: 90,
          totalClicked: 45,
          totalConverted: 22,
          openRate: 45,
          clickRate: 22.5,
          conversionRate: 11,
        },
      };

      const mockCompletedTest = {
        id: testId,
        status: 'COMPLETED' as const,
        winnerId: 'var-2',
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTestWithStats as any);
      vi.mocked(prisma.aBTest.update).mockResolvedValue(mockCompletedTest as any);

      const result = await autoSelectWinner(testId);

      expect(result?.winnerId).toBe('var-2');
      expect(result?.status).toBe('COMPLETED');
    });

    it('should_select_winner_based_on_click_rate', async () => {
      const testId = 'test-123';
      const mockTestWithStats = {
        id: testId,
        campaignId: 'camp-123',
        name: 'Test',
        testType: 'CONTENT' as const,
        sampleSize: 20,
        winnerCriteria: 'CLICK_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        userId: 'user-123',
        status: 'RUNNING' as const,
        winnerId: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            variantId: 'var-1',
            name: 'A',
            openRate: 40,
            clickRate: 15,
            conversionRate: 5,
          },
          {
            id: 'var-2',
            variantId: 'var-2',
            name: 'B',
            openRate: 38,
            clickRate: 22,
            conversionRate: 6,
          },
        ],
        stats: {} as any,
      };

      const mockCompletedTest = {
        id: testId,
        status: 'COMPLETED' as const,
        winnerId: 'var-2',
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTestWithStats as any);
      vi.mocked(prisma.aBTest.update).mockResolvedValue(mockCompletedTest as any);

      const result = await autoSelectWinner(testId);

      expect(result?.winnerId).toBe('var-2');
    });

    it('should_select_winner_based_on_conversion_rate', async () => {
      const testId = 'test-123';
      const mockTestWithStats = {
        id: testId,
        campaignId: 'camp-123',
        name: 'Test',
        testType: 'CONTENT' as const,
        sampleSize: 20,
        winnerCriteria: 'CONVERSION_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        userId: 'user-123',
        status: 'RUNNING' as const,
        winnerId: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            variantId: 'var-1',
            name: 'A',
            openRate: 40,
            clickRate: 20,
            conversionRate: 5,
          },
          {
            id: 'var-2',
            variantId: 'var-2',
            name: 'B',
            openRate: 45,
            clickRate: 23,
            conversionRate: 8,
          },
        ],
        stats: {} as any,
      };

      const mockCompletedTest = {
        id: testId,
        status: 'COMPLETED' as const,
        winnerId: 'var-2',
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTestWithStats as any);
      vi.mocked(prisma.aBTest.update).mockResolvedValue(mockCompletedTest as any);

      const result = await autoSelectWinner(testId);

      expect(result?.winnerId).toBe('var-2');
    });

    it('should_throw_error_when_test_not_found', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);

      await expect(autoSelectWinner('non-existent')).rejects.toThrow('A/B test not found');
    });

    it('should_throw_error_when_test_not_running', async () => {
      const mockTestWithStats = {
        id: 'test-123',
        status: 'DRAFT' as const,
        variants: [],
        stats: {} as any,
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTestWithStats as any);

      await expect(autoSelectWinner('test-123')).rejects.toThrow(
        'Can only auto-select winner for running tests'
      );
    });
  });

  describe('cancelABTest', () => {
    it('should_cancel_running_test', async () => {
      const testId = 'test-123';
      const mockTest = {
        id: testId,
        status: 'RUNNING' as const,
      };

      const mockCancelledTest = {
        ...mockTest,
        status: 'CANCELLED' as const,
        completedAt: new Date(),
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);
      vi.mocked(prisma.aBTest.update).mockResolvedValue(mockCancelledTest as any);

      const result = await cancelABTest(testId);

      expect(result.status).toBe('CANCELLED');
      expect(result.completedAt).not.toBeNull();
    });

    it('should_cancel_draft_test', async () => {
      const testId = 'test-123';
      const mockTest = {
        id: testId,
        status: 'DRAFT' as const,
      };

      const mockCancelledTest = {
        ...mockTest,
        status: 'CANCELLED' as const,
        completedAt: new Date(),
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);
      vi.mocked(prisma.aBTest.update).mockResolvedValue(mockCancelledTest as any);

      const result = await cancelABTest(testId);

      expect(result.status).toBe('CANCELLED');
    });

    it('should_throw_error_when_test_not_found', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);

      await expect(cancelABTest('non-existent')).rejects.toThrow('A/B test not found');
    });

    it('should_throw_error_when_test_already_completed', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({
        id: 'test-123',
        status: 'COMPLETED',
      } as any);

      await expect(cancelABTest('test-123')).rejects.toThrow(
        'Test is already completed or cancelled'
      );
    });

    it('should_throw_error_when_test_already_cancelled', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue({
        id: 'test-123',
        status: 'CANCELLED',
      } as any);

      await expect(cancelABTest('test-123')).rejects.toThrow(
        'Test is already completed or cancelled'
      );
    });
  });

  describe('deleteABTest', () => {
    it('should_delete_test', async () => {
      const testId = 'test-123';
      const mockTest = {
        id: testId,
        status: 'DRAFT' as const,
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);
      vi.mocked(prisma.aBTest.delete).mockResolvedValue(mockTest as any);

      await deleteABTest(testId);

      expect(prisma.aBTest.delete).toHaveBeenCalledWith({
        where: { id: testId },
      });
    });

    it('should_throw_error_when_test_not_found', async () => {
      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(null);

      await expect(deleteABTest('non-existent')).rejects.toThrow('A/B test not found');
    });
  });

  describe('updateVariantResults', () => {
    it('should_increment_sent_count', async () => {
      const variantId = 'var-123';
      const mockUpdatedVariant = {
        id: variantId,
        sent: 150,
        opened: 50,
        clicked: 25,
        converted: 10,
        bounced: 5,
      };

      vi.mocked(prisma.aBTestVariant.update).mockResolvedValue(mockUpdatedVariant as any);

      const result = await updateVariantResults(variantId, { sent: 50 });

      expect(result.sent).toBe(150);
      expect(prisma.aBTestVariant.update).toHaveBeenCalledWith({
        where: { id: variantId },
        data: {
          sent: { increment: 50 },
          opened: undefined,
          clicked: undefined,
          converted: undefined,
          bounced: undefined,
        },
      });
    });

    it('should_increment_opened_count', async () => {
      const variantId = 'var-123';
      const mockUpdatedVariant = {
        id: variantId,
        sent: 100,
        opened: 60,
        clicked: 25,
        converted: 10,
        bounced: 5,
      };

      vi.mocked(prisma.aBTestVariant.update).mockResolvedValue(mockUpdatedVariant as any);

      const result = await updateVariantResults(variantId, { opened: 10 });

      expect(result.opened).toBe(60);
      expect(prisma.aBTestVariant.update).toHaveBeenCalledWith({
        where: { id: variantId },
        data: {
          sent: undefined,
          opened: { increment: 10 },
          clicked: undefined,
          converted: undefined,
          bounced: undefined,
        },
      });
    });

    it('should_increment_multiple_metrics', async () => {
      const variantId = 'var-123';
      const mockUpdatedVariant = {
        id: variantId,
        sent: 100,
        opened: 60,
        clicked: 30,
        converted: 12,
        bounced: 5,
      };

      vi.mocked(prisma.aBTestVariant.update).mockResolvedValue(mockUpdatedVariant as any);

      const result = await updateVariantResults(variantId, {
        sent: 50,
        opened: 10,
        clicked: 5,
        converted: 2,
        bounced: 1,
      });

      expect(result.sent).toBe(100);
      expect(result.opened).toBe(60);
      expect(result.clicked).toBe(30);
      expect(result.converted).toBe(12);
      expect(result.bounced).toBe(5);
    });

    it('should_only_update_provided_metrics', async () => {
      const variantId = 'var-123';
      const mockUpdatedVariant = {
        id: variantId,
        sent: 100,
        opened: 50,
        clicked: 30,
        converted: 10,
        bounced: 5,
      };

      vi.mocked(prisma.aBTestVariant.update).mockResolvedValue(mockUpdatedVariant as any);

      await updateVariantResults(variantId, { clicked: 5 });

      expect(prisma.aBTestVariant.update).toHaveBeenCalledWith({
        where: { id: variantId },
        data: {
          sent: undefined,
          opened: undefined,
          clicked: { increment: 5 },
          converted: undefined,
          bounced: undefined,
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should_handle_zero_metrics_in_stats_calculation', async () => {
      const mockTest = {
        id: 'test-123',
        campaignId: 'camp-123',
        name: 'Test',
        testType: 'SUBJECT' as const,
        sampleSize: 20,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        userId: 'user-123',
        status: 'DRAFT' as const,
        winnerId: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            testId: 'test-123',
            name: 'Variant A',
            subject: 'Test A',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 0,
            sent: 0,
            opened: 0,
            clicked: 0,
            converted: 0,
            bounced: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);

      const result = await getABTest('test-123');

      expect(result?.stats.openRate).toBe(0);
      expect(result?.stats.clickRate).toBe(0);
      expect(result?.stats.conversionRate).toBe(0);
      expect(result?.variants[0].openRate).toBe(0);
    });

    it('should_mark_correct_variant_as_winner', async () => {
      const testId = 'test-123';
      const winnerVariantId = 'var-2';
      const mockTest = {
        id: testId,
        campaignId: 'camp-123',
        name: 'Test',
        testType: 'SUBJECT' as const,
        sampleSize: 20,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        userId: 'user-123',
        status: 'COMPLETED' as const,
        winnerId: winnerVariantId,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            testId,
            name: 'A',
            subject: 'Test A',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 0,
            sent: 100,
            opened: 40,
            clicked: 20,
            converted: 10,
            bounced: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: winnerVariantId,
            testId,
            name: 'B',
            subject: 'Test B',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 1,
            sent: 100,
            opened: 50,
            clicked: 25,
            converted: 12,
            bounced: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);

      const result = await getABTest(testId);

      expect(result?.variants[0].isWinner).toBe(false);
      expect(result?.variants[1].isWinner).toBe(true);
    });

    it('should_handle_large_numbers_in_metrics', async () => {
      const mockTest = {
        id: 'test-123',
        campaignId: 'camp-123',
        name: 'Test',
        testType: 'SUBJECT' as const,
        sampleSize: 50,
        winnerCriteria: 'OPEN_RATE' as const,
        testDuration: 4,
        autoSelectWinner: true,
        userId: 'user-123',
        status: 'RUNNING' as const,
        winnerId: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          {
            id: 'var-1',
            testId: 'test-123',
            name: 'Variant A',
            subject: 'Test A',
            content: null,
            fromName: null,
            sendTime: null,
            sortOrder: 0,
            sent: 1000000,
            opened: 500000,
            clicked: 250000,
            converted: 125000,
            bounced: 10000,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(prisma.aBTest.findUnique).mockResolvedValue(mockTest as any);

      const result = await getABTest('test-123');

      expect(result?.stats.totalSent).toBe(1000000);
      expect(result?.stats.openRate).toBeCloseTo(50, 0);
      expect(result?.variants[0].clickRate).toBeCloseTo(25, 0);
    });
  });
});
