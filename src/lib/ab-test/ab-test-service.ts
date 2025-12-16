/**
 * A/B Testing Service
 * Server-side logic for A/B test management
 */

import { prisma } from '../db/prisma';
import type { ABTest, ABTestVariant, ABTestStatus, WinnerCriteria, Prisma } from '@prisma/client';
import type {
  CreateABTestInput,
  UpdateABTestInput,
  AddVariantInput,
  UpdateVariantInput,
  ABTestStats,
  VariantStats,
  ABTestWithStats,
} from './types';

/**
 * Create a new A/B test for a campaign
 */
export async function createABTest(
  input: CreateABTestInput,
  userId?: string
): Promise<ABTest & { variants: ABTestVariant[] }> {
  // Check if campaign exists
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Check if campaign already has an A/B test
  const existingTest = await prisma.aBTest.findUnique({
    where: { campaignId: input.campaignId },
  });

  if (existingTest) {
    throw new Error('Campaign already has an A/B test');
  }

  // Create the A/B test with variants
  const abTest = await prisma.aBTest.create({
    data: {
      campaignId: input.campaignId,
      name: input.name,
      testType: input.testType,
      sampleSize: input.sampleSize,
      winnerCriteria: input.winnerCriteria,
      testDuration: input.testDuration,
      autoSelectWinner: input.autoSelectWinner,
      userId,
      variants: {
        create: input.variants.map((variant, index) => ({
          name: variant.name,
          subject: variant.subject,
          content: variant.content,
          fromName: variant.fromName,
          sendTime: variant.sendTime ? new Date(variant.sendTime) : null,
          sortOrder: index,
        })),
      },
    },
    include: {
      variants: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return abTest;
}

/**
 * Get an A/B test by ID with variants and stats
 */
export async function getABTest(testId: string): Promise<ABTestWithStats | null> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      variants: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!test) {
    return null;
  }

  return calculateTestStats(test);
}

/**
 * Get A/B test by campaign ID
 */
export async function getABTestByCampaign(campaignId: string): Promise<ABTestWithStats | null> {
  const test = await prisma.aBTest.findUnique({
    where: { campaignId },
    include: {
      variants: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!test) {
    return null;
  }

  return calculateTestStats(test);
}

/**
 * List A/B tests with pagination
 */
export async function listABTests(options: {
  userId?: string;
  status?: ABTestStatus;
  page?: number;
  limit?: number;
}): Promise<{ tests: ABTestWithStats[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.ABTestWhereInput = {};

  if (options.userId) {
    where.userId = options.userId;
  }

  if (options.status) {
    where.status = options.status;
  }

  const [tests, total] = await Promise.all([
    prisma.aBTest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.aBTest.count({ where }),
  ]);

  const testsWithStats = tests.map(calculateTestStats);

  return { tests: testsWithStats, total };
}

/**
 * Update an A/B test
 */
export async function updateABTest(
  testId: string,
  input: UpdateABTestInput
): Promise<ABTest & { variants: ABTestVariant[] }> {
  // Verify test exists and is in draft status
  const existingTest = await prisma.aBTest.findUnique({
    where: { id: testId },
  });

  if (!existingTest) {
    throw new Error('A/B test not found');
  }

  if (existingTest.status !== 'DRAFT') {
    throw new Error('Cannot update a test that is not in draft status');
  }

  return prisma.aBTest.update({
    where: { id: testId },
    data: input,
    include: {
      variants: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

/**
 * Add a variant to an A/B test
 */
export async function addVariant(
  testId: string,
  input: AddVariantInput
): Promise<ABTestVariant> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test) {
    throw new Error('A/B test not found');
  }

  if (test.status !== 'DRAFT') {
    throw new Error('Cannot add variants to a test that is not in draft status');
  }

  if (test.variants.length >= 5) {
    throw new Error('Maximum 5 variants allowed');
  }

  return prisma.aBTestVariant.create({
    data: {
      testId,
      name: input.name,
      subject: input.subject,
      content: input.content,
      fromName: input.fromName,
      sendTime: input.sendTime ? new Date(input.sendTime) : null,
      sortOrder: test.variants.length,
    },
  });
}

/**
 * Update a variant
 */
export async function updateVariant(
  variantId: string,
  input: UpdateVariantInput
): Promise<ABTestVariant> {
  const variant = await prisma.aBTestVariant.findUnique({
    where: { id: variantId },
    include: { test: true },
  });

  if (!variant) {
    throw new Error('Variant not found');
  }

  if (variant.test.status !== 'DRAFT') {
    throw new Error('Cannot update variants of a test that is not in draft status');
  }

  return prisma.aBTestVariant.update({
    where: { id: variantId },
    data: {
      name: input.name,
      subject: input.subject,
      content: input.content,
      fromName: input.fromName,
      sendTime: input.sendTime ? new Date(input.sendTime) : undefined,
    },
  });
}

/**
 * Remove a variant from an A/B test
 */
export async function removeVariant(variantId: string): Promise<void> {
  const variant = await prisma.aBTestVariant.findUnique({
    where: { id: variantId },
    include: { test: { include: { variants: true } } },
  });

  if (!variant) {
    throw new Error('Variant not found');
  }

  if (variant.test.status !== 'DRAFT') {
    throw new Error('Cannot remove variants from a test that is not in draft status');
  }

  if (variant.test.variants.length <= 2) {
    throw new Error('Minimum 2 variants are required');
  }

  await prisma.aBTestVariant.delete({
    where: { id: variantId },
  });
}

/**
 * Start an A/B test
 */
export async function startABTest(testId: string): Promise<ABTest> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test) {
    throw new Error('A/B test not found');
  }

  if (test.status !== 'DRAFT') {
    throw new Error('Test is not in draft status');
  }

  if (test.variants.length < 2) {
    throw new Error('At least 2 variants are required to start a test');
  }

  return prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });
}

/**
 * Select a winner for an A/B test
 */
export async function selectWinner(testId: string, variantId: string): Promise<ABTest> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test) {
    throw new Error('A/B test not found');
  }

  if (test.status !== 'RUNNING') {
    throw new Error('Can only select winner for running tests');
  }

  const variant = test.variants.find((v) => v.id === variantId);
  if (!variant) {
    throw new Error('Variant not found in this test');
  }

  return prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'COMPLETED',
      winnerId: variantId,
      completedAt: new Date(),
    },
  });
}

/**
 * Auto-select winner based on criteria
 */
export async function autoSelectWinner(testId: string): Promise<ABTest | null> {
  const testWithStats = await getABTest(testId);

  if (!testWithStats) {
    throw new Error('A/B test not found');
  }

  if (testWithStats.status !== 'RUNNING') {
    throw new Error('Can only auto-select winner for running tests');
  }

  // Find the best performing variant
  const winnerVariant = testWithStats.variants.reduce((best, current) => {
    let currentScore: number;
    let bestScore: number;

    switch (testWithStats.winnerCriteria) {
      case 'OPEN_RATE':
        currentScore = current.openRate;
        bestScore = best.openRate;
        break;
      case 'CLICK_RATE':
        currentScore = current.clickRate;
        bestScore = best.clickRate;
        break;
      case 'CONVERSION_RATE':
        currentScore = current.conversionRate;
        bestScore = best.conversionRate;
        break;
      default:
        currentScore = current.openRate;
        bestScore = best.openRate;
    }

    return currentScore > bestScore ? current : best;
  });

  return selectWinner(testId, winnerVariant.variantId);
}

/**
 * Cancel an A/B test
 */
export async function cancelABTest(testId: string): Promise<ABTest> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
  });

  if (!test) {
    throw new Error('A/B test not found');
  }

  if (test.status === 'COMPLETED' || test.status === 'CANCELLED') {
    throw new Error('Test is already completed or cancelled');
  }

  return prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });
}

/**
 * Delete an A/B test
 */
export async function deleteABTest(testId: string): Promise<void> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
  });

  if (!test) {
    throw new Error('A/B test not found');
  }

  await prisma.aBTest.delete({
    where: { id: testId },
  });
}

/**
 * Update variant results (for tracking)
 */
export async function updateVariantResults(
  variantId: string,
  updates: {
    sent?: number;
    opened?: number;
    clicked?: number;
    converted?: number;
    bounced?: number;
  }
): Promise<ABTestVariant> {
  return prisma.aBTestVariant.update({
    where: { id: variantId },
    data: {
      sent: updates.sent !== undefined ? { increment: updates.sent } : undefined,
      opened: updates.opened !== undefined ? { increment: updates.opened } : undefined,
      clicked: updates.clicked !== undefined ? { increment: updates.clicked } : undefined,
      converted: updates.converted !== undefined ? { increment: updates.converted } : undefined,
      bounced: updates.bounced !== undefined ? { increment: updates.bounced } : undefined,
    },
  });
}

/**
 * Helper: Calculate stats for a test
 */
function calculateTestStats(
  test: ABTest & { variants: ABTestVariant[] }
): ABTestWithStats {
  const totalSent = test.variants.reduce((sum, v) => sum + v.sent, 0);
  const totalOpened = test.variants.reduce((sum, v) => sum + v.opened, 0);
  const totalClicked = test.variants.reduce((sum, v) => sum + v.clicked, 0);
  const totalConverted = test.variants.reduce((sum, v) => sum + v.converted, 0);

  const stats: ABTestStats = {
    totalSent,
    totalOpened,
    totalClicked,
    totalConverted,
    openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    conversionRate: totalSent > 0 ? (totalConverted / totalSent) * 100 : 0,
  };

  const variants: VariantStats[] = test.variants.map((v) => ({
    variantId: v.id,
    name: v.name,
    sent: v.sent,
    opened: v.opened,
    clicked: v.clicked,
    converted: v.converted,
    openRate: v.sent > 0 ? (v.opened / v.sent) * 100 : 0,
    clickRate: v.sent > 0 ? (v.clicked / v.sent) * 100 : 0,
    conversionRate: v.sent > 0 ? (v.converted / v.sent) * 100 : 0,
    isWinner: v.id === test.winnerId,
  }));

  return {
    id: test.id,
    campaignId: test.campaignId,
    name: test.name,
    testType: test.testType,
    sampleSize: test.sampleSize,
    winnerCriteria: test.winnerCriteria,
    testDuration: test.testDuration,
    autoSelectWinner: test.autoSelectWinner,
    status: test.status,
    winnerId: test.winnerId,
    startedAt: test.startedAt,
    completedAt: test.completedAt,
    createdAt: test.createdAt,
    updatedAt: test.updatedAt,
    stats,
    variants,
  };
}
