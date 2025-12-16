import { prisma } from '../db/prisma';
import {
  addEmailJob,
  addEmailJobs,
  getQueueStats,
  getCampaignJobs,
  cancelCampaignJobs,
  pauseQueue,
  resumeQueue,
  getJob,
} from './email-queue';
import {
  type EmailJobData,
  type CampaignQueueStatus,
  JOB_PRIORITIES,
} from './types';
import {
  generateTrackingPixel,
  generateUnsubscribeLink,
} from '../email/merge-tags';

/**
 * Queue a campaign for sending using cursor-based pagination
 * This prevents loading all recipients into memory at once for large campaigns
 */
export async function queueCampaign(
  campaignId: string,
  options?: {
    priority?: 'HIGH' | 'NORMAL' | 'LOW';
    batchSize?: number;
    delayBetweenBatches?: number;
    smtpConfigId?: string;
  }
): Promise<{
  success: boolean;
  queuedCount: number;
  error?: string;
}> {
  const batchSize = options?.batchSize || 100;
  const delayBetweenBatches = options?.delayBetweenBatches || 0;
  const priority = JOB_PRIORITIES[options?.priority || 'NORMAL'];

  try {
    // Get campaign (without recipients - we'll fetch them in batches)
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
      return { success: false, queuedCount: 0, error: 'Campaign not found' };
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return {
        success: false,
        queuedCount: 0,
        error: `Campaign cannot be sent in ${campaign.status} status`,
      };
    }

    // Check if there are pending recipients
    const pendingCount = await prisma.recipient.count({
      where: {
        campaignId,
        status: 'PENDING',
      },
    });

    if (pendingCount === 0) {
      return { success: false, queuedCount: 0, error: 'No recipients to send to' };
    }

    // Update campaign status to SENDING
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENDING',
        startedAt: new Date(),
        totalRecipients: pendingCount,
      },
    });

    // Process recipients in batches using cursor-based pagination
    let queuedCount = 0;
    let cursor: string | undefined;
    let batchNumber = 0;

    while (true) {
      // Fetch a batch of recipients using cursor
      const recipients = await prisma.recipient.findMany({
        where: {
          campaignId,
          status: 'PENDING',
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        take: batchSize,
        orderBy: { id: 'asc' },
        include: {
          contact: true,
        },
      });

      // No more recipients to process
      if (recipients.length === 0) {
        break;
      }

      // Calculate delay for this batch
      const batchDelay = batchNumber > 0 ? batchNumber * delayBetweenBatches : 0;

      // Create jobs for this batch
      const jobs = recipients.map((recipient) => {
        const contact = recipient.contact;

        const jobData: EmailJobData = {
          recipientId: recipient.id,
          campaignId: campaign.id,
          email: recipient.email,
          subject: campaign.subject,
          content: campaign.content,
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
          replyTo: campaign.replyTo || undefined,
          trackingId: recipient.trackingId,
          smtpConfigId: options?.smtpConfigId,
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
            delay: batchDelay,
            jobId: `campaign-${campaignId}-recipient-${recipient.id}`,
          },
        };
      });

      await addEmailJobs(jobs);
      queuedCount += recipients.length;

      // Update cursor to the last recipient's ID
      cursor = recipients[recipients.length - 1].id;
      batchNumber++;

      // Log progress for large campaigns
      if (batchNumber % 10 === 0) {
        console.log(
          `[QueueService] Queued ${queuedCount}/${pendingCount} emails for campaign ${campaignId}`
        );
      }
    }

    console.log(
      `[QueueService] Queued ${queuedCount} emails for campaign ${campaignId}`
    );

    return { success: true, queuedCount };
  } catch (error) {
    // Revert campaign status on error
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'DRAFT',
        startedAt: null,
      },
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[QueueService] Failed to queue campaign: ${errorMessage}`);

    return { success: false, queuedCount: 0, error: errorMessage };
  }
}

/**
 * Get campaign queue status
 */
export async function getCampaignQueueStatus(
  campaignId: string
): Promise<CampaignQueueStatus | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      totalRecipients: true,
      sentCount: true,
      bouncedCount: true,
      startedAt: true,
    },
  });

  if (!campaign) {
    return null;
  }

  // Get current queue jobs for this campaign
  const jobs = await getCampaignJobs(campaignId);

  // Properly await all job states before filtering
  const jobStates = await Promise.all(
    jobs.map(async (job) => ({
      job,
      state: await job.getState(),
    }))
  );

  const waitingJobs = jobStates.filter((j) => j.state === 'waiting');
  const activeJobs = jobStates.filter((j) => j.state === 'active');
  const failedJobs = jobStates.filter((j) => j.state === 'failed');

  // Calculate queue stats
  const queued = waitingJobs.length + activeJobs.length;
  const sent = campaign.sentCount;
  const failed = campaign.bouncedCount;
  const total = campaign.totalRecipients;
  const progress = total > 0 ? Math.round((sent / total) * 100) : 0;

  // Determine status
  let status: CampaignQueueStatus['status'] = 'pending';
  if (campaign.status === 'SENDING') {
    status = queued > 0 ? 'processing' : 'completed';
  } else if (campaign.status === 'COMPLETED') {
    status = 'completed';
  } else if (campaign.status === 'PAUSED') {
    status = 'paused';
  } else if (campaign.status === 'CANCELLED') {
    status = 'failed';
  }

  // Estimate completion time based on sending rate
  let estimatedCompletion: Date | undefined;
  if (campaign.startedAt && sent > 0 && queued > 0) {
    const elapsedMs = Date.now() - campaign.startedAt.getTime();
    const msPerEmail = elapsedMs / sent;
    const remainingMs = msPerEmail * queued;
    estimatedCompletion = new Date(Date.now() + remainingMs);
  }

  return {
    campaignId,
    totalRecipients: total,
    queued,
    sent,
    failed,
    progress,
    status,
    estimatedCompletion,
  };
}

/**
 * Pause a campaign's email sending
 */
export async function pauseCampaign(campaignId: string): Promise<boolean> {
  try {
    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    // Note: BullMQ doesn't support pausing jobs by filter,
    // so we update the campaign status and the worker will check this
    console.log(`[QueueService] Campaign ${campaignId} paused`);
    return true;
  } catch (error) {
    console.error(`[QueueService] Failed to pause campaign:`, error);
    return false;
  }
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(campaignId: string): Promise<boolean> {
  try {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    console.log(`[QueueService] Campaign ${campaignId} resumed`);
    return true;
  } catch (error) {
    console.error(`[QueueService] Failed to resume campaign:`, error);
    return false;
  }
}

/**
 * Cancel a campaign's email sending
 */
export async function cancelCampaign(campaignId: string): Promise<{
  success: boolean;
  cancelledJobs: number;
}> {
  try {
    // Cancel queued jobs
    const cancelledJobs = await cancelCampaignJobs(campaignId);

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' },
    });

    // Update remaining recipients to show they weren't sent
    await prisma.recipient.updateMany({
      where: {
        campaignId,
        status: { in: ['PENDING', 'QUEUED'] },
      },
      data: {
        status: 'FAILED',
        errorMessage: 'Campaign cancelled',
      },
    });

    console.log(
      `[QueueService] Campaign ${campaignId} cancelled, ${cancelledJobs} jobs removed`
    );

    return { success: true, cancelledJobs };
  } catch (error) {
    console.error(`[QueueService] Failed to cancel campaign:`, error);
    return { success: false, cancelledJobs: 0 };
  }
}

/**
 * Get overall queue health and statistics
 */
export async function getQueueHealth(): Promise<{
  healthy: boolean;
  stats: Awaited<ReturnType<typeof getQueueStats>>;
  activeCampaigns: number;
}> {
  try {
    const stats = await getQueueStats();

    // Count active campaigns
    const activeCampaigns = await prisma.campaign.count({
      where: { status: 'SENDING' },
    });

    return {
      healthy: true,
      stats,
      activeCampaigns,
    };
  } catch (error) {
    console.error('[QueueService] Health check failed:', error);
    return {
      healthy: false,
      stats: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
      },
      activeCampaigns: 0,
    };
  }
}

/**
 * Retry failed recipients for a campaign using cursor-based pagination
 */
export async function retryFailedRecipients(
  campaignId: string,
  options?: { batchSize?: number }
): Promise<{
  success: boolean;
  retriedCount: number;
}> {
  const batchSize = options?.batchSize || 100;

  try {
    // Get campaign details first
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        subject: true,
        content: true,
        fromName: true,
        fromEmail: true,
        replyTo: true,
        status: true,
      },
    });

    if (!campaign) {
      return { success: false, retriedCount: 0 };
    }

    // Count failed recipients
    const failedCount = await prisma.recipient.count({
      where: {
        campaignId,
        status: 'FAILED',
      },
    });

    if (failedCount === 0) {
      return { success: true, retriedCount: 0 };
    }

    // Reset all failed recipients to PENDING status
    await prisma.recipient.updateMany({
      where: {
        campaignId,
        status: 'FAILED',
      },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    // Process failed recipients in batches using cursor
    let retriedCount = 0;
    let cursor: string | undefined;
    const retryTimestamp = Date.now();

    while (true) {
      // Fetch a batch of recipients (now PENDING after the updateMany)
      const recipients = await prisma.recipient.findMany({
        where: {
          campaignId,
          status: 'PENDING',
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        take: batchSize,
        orderBy: { id: 'asc' },
        include: {
          contact: true,
        },
      });

      if (recipients.length === 0) {
        break;
      }

      // Create jobs for this batch
      const jobs = recipients.map((recipient) => {
        const contact = recipient.contact;

        const jobData: EmailJobData = {
          recipientId: recipient.id,
          campaignId: campaign.id,
          email: recipient.email,
          subject: campaign.subject,
          content: campaign.content,
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
          replyTo: campaign.replyTo || undefined,
          trackingId: recipient.trackingId,
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
            jobId: `retry-${campaignId}-${recipient.id}-${retryTimestamp}`,
          },
        };
      });

      await addEmailJobs(jobs);
      retriedCount += recipients.length;

      // Update cursor
      cursor = recipients[recipients.length - 1].id;

      // Stop if we've processed the expected count
      if (retriedCount >= failedCount) {
        break;
      }
    }

    // Update campaign status if needed
    if (campaign.status === 'COMPLETED') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'SENDING' },
      });
    }

    console.log(
      `[QueueService] Retried ${retriedCount} failed recipients for campaign ${campaignId}`
    );

    return { success: true, retriedCount };
  } catch (error) {
    console.error(`[QueueService] Failed to retry recipients:`, error);
    return { success: false, retriedCount: 0 };
  }
}

/**
 * Complete a campaign if all emails are processed
 */
export async function checkAndCompleteCampaign(
  campaignId: string
): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      status: true,
      totalRecipients: true,
      sentCount: true,
      bouncedCount: true,
    },
  });

  if (!campaign || campaign.status !== 'SENDING') {
    return false;
  }

  const processedCount = campaign.sentCount + campaign.bouncedCount;

  if (processedCount >= campaign.totalRecipients) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    console.log(`[QueueService] Campaign ${campaignId} completed`);
    return true;
  }

  return false;
}
