/**
 * A/B Test Executor
 * Handles the execution of A/B tests during campaign sending
 */

import { prisma } from '../db/prisma';
import { addEmailJobs } from '../queue/email-queue';
import { type EmailJobData, JOB_PRIORITIES } from '../queue/types';
import { autoSelectWinner, updateVariantResults, getABTestByCampaign } from './ab-test-service';

/**
 * Split recipients for A/B testing
 * Returns test recipients (grouped by variant) and remaining recipients
 */
export async function splitRecipientsForABTest(
  campaignId: string,
  sampleSize: number,
  variantIds: string[]
): Promise<{
  testGroups: Map<string, string[]>; // variantId -> recipientIds
  remainingRecipientIds: string[];
  totalTestRecipients: number;
}> {
  // Get all pending recipients
  const recipients = await prisma.recipient.findMany({
    where: {
      campaignId,
      status: 'PENDING',
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const totalRecipients = recipients.length;
  const testSize = Math.ceil((sampleSize / 100) * totalRecipients);
  const recipientsPerVariant = Math.ceil(testSize / variantIds.length);

  // Shuffle recipients for random assignment
  const shuffled = [...recipients].sort(() => Math.random() - 0.5);

  // Split into test groups
  const testGroups = new Map<string, string[]>();
  let assigned = 0;

  for (const variantId of variantIds) {
    const start = assigned;
    const end = Math.min(start + recipientsPerVariant, testSize);
    const variantRecipients = shuffled.slice(start, end).map((r) => r.id);
    testGroups.set(variantId, variantRecipients);
    assigned = end;
  }

  // Remaining recipients (will receive winner content)
  const testRecipientIds = new Set(
    Array.from(testGroups.values()).flat()
  );
  const remainingRecipientIds = shuffled
    .slice(testSize)
    .map((r) => r.id);

  return {
    testGroups,
    remainingRecipientIds,
    totalTestRecipients: testRecipientIds.size,
  };
}

/**
 * Queue A/B test emails for a campaign
 */
export async function queueABTestCampaign(
  campaignId: string,
  options?: {
    priority?: 'HIGH' | 'NORMAL' | 'LOW';
    batchSize?: number;
    smtpConfigId?: string;
  }
): Promise<{
  success: boolean;
  queuedCount: number;
  testRecipients: number;
  remainingRecipients: number;
  error?: string;
}> {
  const batchSize = options?.batchSize || 100;
  const priority = JOB_PRIORITIES[options?.priority || 'NORMAL'];

  try {
    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        subject: true,
        content: true,
        fromName: true,
        fromEmail: true,
        replyTo: true,
        status: true,
      },
    });

    if (!campaign) {
      return { success: false, queuedCount: 0, testRecipients: 0, remainingRecipients: 0, error: 'Campaign not found' };
    }

    // Get A/B test for this campaign
    const abTest = await getABTestByCampaign(campaignId);

    if (!abTest) {
      return { success: false, queuedCount: 0, testRecipients: 0, remainingRecipients: 0, error: 'No A/B test found for campaign' };
    }

    if (abTest.status !== 'DRAFT' && abTest.status !== 'RUNNING') {
      return { success: false, queuedCount: 0, testRecipients: 0, remainingRecipients: 0, error: `A/B test is in ${abTest.status} status` };
    }

    // Get variants from database
    const variants = await prisma.aBTestVariant.findMany({
      where: { testId: abTest.id },
      orderBy: { sortOrder: 'asc' },
    });

    if (variants.length < 2) {
      return { success: false, queuedCount: 0, testRecipients: 0, remainingRecipients: 0, error: 'At least 2 variants required' };
    }

    // Split recipients
    const { testGroups, remainingRecipientIds, totalTestRecipients } = await splitRecipientsForABTest(
      campaignId,
      abTest.sampleSize,
      variants.map((v) => v.id)
    );

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENDING',
        startedAt: new Date(),
        totalRecipients: totalTestRecipients + remainingRecipientIds.length,
      },
    });

    // Start the A/B test
    await prisma.aBTest.update({
      where: { id: abTest.id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    let queuedCount = 0;

    // Queue test emails for each variant
    for (const [variantId, recipientIds] of testGroups) {
      const variant = variants.find((v) => v.id === variantId);
      if (!variant) continue;

      // Process in batches
      for (let i = 0; i < recipientIds.length; i += batchSize) {
        const batch = recipientIds.slice(i, i + batchSize);

        // Fetch recipients with contacts
        const recipients = await prisma.recipient.findMany({
          where: { id: { in: batch } },
          include: { contact: true },
        });

        // Update recipients with variant assignment
        await prisma.recipient.updateMany({
          where: { id: { in: batch } },
          data: {
            variantId,
            status: 'QUEUED',
          },
        });

        // Create jobs with variant content
        const jobs = recipients.map((recipient) => {
          const contact = recipient.contact;

          // Use variant content or fall back to campaign defaults
          const subject = variant.subject || campaign.subject;
          const content = variant.content || campaign.content;
          const fromName = variant.fromName || campaign.fromName;

          const jobData: EmailJobData = {
            recipientId: recipient.id,
            campaignId: campaign.id,
            email: recipient.email,
            subject,
            content,
            fromName,
            fromEmail: campaign.fromEmail,
            replyTo: campaign.replyTo || undefined,
            trackingId: recipient.trackingId,
            smtpConfigId: options?.smtpConfigId,
            variantId, // Track which variant this email belongs to
            mergeData: {
              firstName: contact?.firstName || '',
              lastName: contact?.lastName || '',
              email: recipient.email,
              company: contact?.company || '',
              customField1: contact?.customField1 || '',
              customField2: contact?.customField2 || '',
            },
          };

          return {
            data: jobData,
            options: {
              priority,
              jobId: `ab-${campaignId}-${variantId}-${recipient.id}`,
            },
          };
        });

        await addEmailJobs(jobs);
        queuedCount += jobs.length;
      }
    }

    // Mark remaining recipients as waiting for winner
    if (remainingRecipientIds.length > 0) {
      await prisma.recipient.updateMany({
        where: { id: { in: remainingRecipientIds } },
        data: {
          status: 'PENDING', // Will be queued after winner is selected
        },
      });
    }

    // Schedule winner selection if auto-select is enabled
    if (abTest.autoSelectWinner && abTest.testDuration > 0) {
      scheduleWinnerSelection(abTest.id, abTest.testDuration);
    }

    console.log(
      `[ABTestExecutor] Queued ${queuedCount} test emails for campaign ${campaignId}, ` +
      `${remainingRecipientIds.length} recipients waiting for winner`
    );

    return {
      success: true,
      queuedCount,
      testRecipients: totalTestRecipients,
      remainingRecipients: remainingRecipientIds.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ABTestExecutor] Failed to queue A/B test campaign: ${errorMessage}`);
    return { success: false, queuedCount: 0, testRecipients: 0, remainingRecipients: 0, error: errorMessage };
  }
}

/**
 * Send remaining emails to winner variant recipients
 */
export async function sendToRemainingRecipients(
  campaignId: string,
  winnerVariantId: string,
  options?: {
    priority?: 'HIGH' | 'NORMAL' | 'LOW';
    batchSize?: number;
    smtpConfigId?: string;
  }
): Promise<{
  success: boolean;
  queuedCount: number;
  error?: string;
}> {
  const batchSize = options?.batchSize || 100;
  const priority = JOB_PRIORITIES[options?.priority || 'NORMAL'];

  try {
    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        subject: true,
        content: true,
        fromName: true,
        fromEmail: true,
        replyTo: true,
      },
    });

    if (!campaign) {
      return { success: false, queuedCount: 0, error: 'Campaign not found' };
    }

    // Get winner variant
    const variant = await prisma.aBTestVariant.findUnique({
      where: { id: winnerVariantId },
    });

    if (!variant) {
      return { success: false, queuedCount: 0, error: 'Winner variant not found' };
    }

    // Get remaining recipients
    const remainingRecipients = await prisma.recipient.findMany({
      where: {
        campaignId,
        status: 'PENDING',
        variantId: null, // Recipients not yet assigned to a variant
      },
      include: { contact: true },
    });

    if (remainingRecipients.length === 0) {
      return { success: true, queuedCount: 0 };
    }

    let queuedCount = 0;

    // Process in batches
    for (let i = 0; i < remainingRecipients.length; i += batchSize) {
      const batch = remainingRecipients.slice(i, i + batchSize);

      // Update recipients with winner variant
      await prisma.recipient.updateMany({
        where: { id: { in: batch.map((r) => r.id) } },
        data: {
          variantId: winnerVariantId,
          status: 'QUEUED',
        },
      });

      // Create jobs with winner content
      const jobs = batch.map((recipient) => {
        const contact = recipient.contact;

        const subject = variant.subject || campaign.subject;
        const content = variant.content || campaign.content;
        const fromName = variant.fromName || campaign.fromName;

        const jobData: EmailJobData = {
          recipientId: recipient.id,
          campaignId: campaign.id,
          email: recipient.email,
          subject,
          content,
          fromName,
          fromEmail: campaign.fromEmail,
          replyTo: campaign.replyTo || undefined,
          trackingId: recipient.trackingId,
          smtpConfigId: options?.smtpConfigId,
          variantId: winnerVariantId,
          mergeData: {
            firstName: contact?.firstName || '',
            lastName: contact?.lastName || '',
            email: recipient.email,
            company: contact?.company || '',
            customField1: contact?.customField1 || '',
            customField2: contact?.customField2 || '',
          },
        };

        return {
          data: jobData,
          options: {
            priority,
            jobId: `winner-${campaignId}-${recipient.id}`,
          },
        };
      });

      await addEmailJobs(jobs);
      queuedCount += jobs.length;
    }

    console.log(
      `[ABTestExecutor] Queued ${queuedCount} winner emails for campaign ${campaignId}`
    );

    return { success: true, queuedCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ABTestExecutor] Failed to send winner emails: ${errorMessage}`);
    return { success: false, queuedCount: 0, error: errorMessage };
  }
}

/**
 * Record email event for A/B test tracking
 */
export async function recordABTestEvent(
  recipientId: string,
  eventType: 'sent' | 'opened' | 'clicked' | 'bounced' | 'converted'
): Promise<void> {
  try {
    // Get recipient with variant info
    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId },
      select: { variantId: true },
    });

    if (!recipient?.variantId) {
      return;
    }

    // Map event type to update field
    const updateField = eventType === 'sent' ? 'sent'
      : eventType === 'opened' ? 'opened'
      : eventType === 'clicked' ? 'clicked'
      : eventType === 'bounced' ? 'bounced'
      : eventType === 'converted' ? 'converted'
      : null;

    if (!updateField) {
      return;
    }

    // Update variant stats
    await updateVariantResults(recipient.variantId, {
      [updateField]: 1,
    });
  } catch (error) {
    console.error(`[ABTestExecutor] Failed to record A/B test event:`, error);
  }
}

/**
 * Schedule automatic winner selection
 */
export function scheduleWinnerSelection(testId: string, hoursFromNow: number): void {
  const delayMs = hoursFromNow * 60 * 60 * 1000;

  setTimeout(async () => {
    try {
      // Check if test is still running
      const test = await prisma.aBTest.findUnique({
        where: { id: testId },
        select: { status: true, campaignId: true, autoSelectWinner: true },
      });

      if (!test || test.status !== 'RUNNING') {
        return;
      }

      if (!test.autoSelectWinner) {
        return;
      }

      console.log(`[ABTestExecutor] Auto-selecting winner for test ${testId}`);

      // Auto-select winner
      const updatedTest = await autoSelectWinner(testId);

      if (updatedTest?.winnerId) {
        // Send to remaining recipients
        await sendToRemainingRecipients(test.campaignId, updatedTest.winnerId);
      }
    } catch (error) {
      console.error(`[ABTestExecutor] Failed to auto-select winner:`, error);
    }
  }, delayMs);

  console.log(
    `[ABTestExecutor] Scheduled winner selection for test ${testId} in ${hoursFromNow} hours`
  );
}

/**
 * Get A/B test results for a campaign
 */
export async function getABTestResults(campaignId: string): Promise<{
  test: Awaited<ReturnType<typeof getABTestByCampaign>>;
  isComplete: boolean;
  winner: {
    variantId: string;
    name: string;
    score: number;
  } | null;
} | null> {
  const test = await getABTestByCampaign(campaignId);

  if (!test) {
    return null;
  }

  let winner: { variantId: string; name: string; score: number } | null = null;

  if (test.winnerId) {
    const winnerVariant = test.variants.find((v) => v.variantId === test.winnerId);
    if (winnerVariant) {
      const score = test.winnerCriteria === 'OPEN_RATE' ? winnerVariant.openRate
        : test.winnerCriteria === 'CLICK_RATE' ? winnerVariant.clickRate
        : winnerVariant.conversionRate;

      winner = {
        variantId: winnerVariant.variantId,
        name: winnerVariant.name,
        score,
      };
    }
  }

  return {
    test,
    isComplete: test.status === 'COMPLETED',
    winner,
  };
}

/**
 * Check if a campaign has an A/B test
 */
export async function campaignHasABTest(campaignId: string): Promise<boolean> {
  const count = await prisma.aBTest.count({
    where: { campaignId },
  });
  return count > 0;
}
