import { Worker, Job } from 'bullmq';
import { createRedisConnection } from './redis';
import { prisma } from '../db/prisma';
import {
  createEmailSender,
  type SmtpConfig as SmtpConfigType,
  type EmailOptions,
} from '../email/sender';
import {
  replaceMergeTags,
  generateUnsubscribeLink,
  generateTrackingPixel,
  wrapLinksForTracking,
} from '../email/merge-tags';
import {
  QUEUE_NAMES,
  DEFAULT_QUEUE_CONFIG,
  type EmailJobData,
  type EmailJobResult,
  type QueueConfig,
  getSmtpRateLimit,
} from './types';
import { fireEvent, WEBHOOK_EVENTS } from '../webhook';

let emailWorker: Worker<EmailJobData, EmailJobResult> | null = null;

/**
 * Process a single email job
 */
async function processEmailJob(
  job: Job<EmailJobData, EmailJobResult>
): Promise<EmailJobResult> {
  const { data } = job;
  const startTime = Date.now();

  console.log(
    `[Worker] Processing job ${job.id} for recipient ${data.recipientId}`
  );

  try {
    // Update recipient status to QUEUED if still PENDING
    await prisma.recipient.update({
      where: { id: data.recipientId },
      data: {
        status: 'QUEUED',
      },
    });

    // Get SMTP configuration
    const smtpConfig = await getSmtpConfig(data.smtpConfigId);
    if (!smtpConfig) {
      throw new Error('No active SMTP configuration found');
    }

    // Prepare email content with merge tags
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const trackingUrl = process.env.TRACKING_URL || baseUrl;

    // Generate tracking components
    const trackingPixel = generateTrackingPixel(data.trackingId, trackingUrl);
    const unsubscribeToken = data.trackingId; // Use tracking ID as unsubscribe token
    const unsubscribeLink = generateUnsubscribeLink(unsubscribeToken, trackingUrl);

    // Build merge data
    const mergeData = {
      ...data.mergeData,
      trackingPixel,
      unsubscribeLink,
    };

    // Replace merge tags in subject and content
    const subject = replaceMergeTags(data.subject, mergeData);
    let content = replaceMergeTags(data.content, mergeData);

    // Wrap links for click tracking
    content = wrapLinksForTracking(content, data.trackingId, trackingUrl);

    // Add tracking pixel to end of content if not already present
    if (!content.includes(trackingPixel)) {
      content += trackingPixel;
    }

    // Create email sender
    const sender = createEmailSender({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    // Send email
    const emailOptions: EmailOptions = {
      from: data.fromEmail,
      fromName: data.fromName,
      to: data.email,
      replyTo: data.replyTo,
      subject,
      html: content,
    };

    const result = await sender.send(emailOptions);

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    // Update recipient status to SENT
    const now = new Date();
    await prisma.recipient.update({
      where: { id: data.recipientId },
      data: {
        status: 'SENT',
        sentAt: now,
      },
    });

    // Create SENT event
    await prisma.emailEvent.create({
      data: {
        campaignId: data.campaignId,
        recipientId: data.recipientId,
        type: 'SENT',
        metadata: {
          messageId: result.messageId,
          processingTime: Date.now() - startTime,
        },
      },
    });

    // Update campaign sent count
    await prisma.campaign.update({
      where: { id: data.campaignId },
      data: {
        sentCount: { increment: 1 },
      },
    });

    // Fire webhook event (non-blocking)
    const campaign = await prisma.campaign.findUnique({
      where: { id: data.campaignId },
      select: { name: true, userId: true },
    });

    const recipient = await prisma.recipient.findUnique({
      where: { id: data.recipientId },
      select: { contactId: true },
    });

    fireEvent(WEBHOOK_EVENTS.EMAIL_SENT, {
      campaignId: data.campaignId,
      campaignName: campaign?.name,
      recipientId: data.recipientId,
      contactId: recipient?.contactId || undefined,
      email: data.email,
      firstName: data.mergeData.firstName,
      lastName: data.mergeData.lastName,
      company: data.mergeData.company,
      metadata: {
        messageId: result.messageId,
        processingTime: Date.now() - startTime,
      },
    }, {
      userId: campaign?.userId || undefined,
      campaignId: data.campaignId,
    }).catch((err) => console.error('Failed to fire webhook:', err));

    console.log(
      `[Worker] Job ${job.id} completed successfully in ${Date.now() - startTime}ms`
    );

    return {
      success: true,
      messageId: result.messageId,
      recipientId: data.recipientId,
      campaignId: data.campaignId,
      sentAt: now,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Worker] Job ${job.id} failed:`, errorMessage);

    // Check if this is the final attempt
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 3) - 1;

    if (isFinalAttempt) {
      // Update recipient status to FAILED
      await prisma.recipient.update({
        where: { id: data.recipientId },
        data: {
          status: 'FAILED',
          errorMessage,
        },
      });

      // Update campaign failed count (track as bounced for simplicity)
      await prisma.campaign.update({
        where: { id: data.campaignId },
        data: {
          bouncedCount: { increment: 1 },
        },
      });
    }

    return {
      success: false,
      error: errorMessage,
      recipientId: data.recipientId,
      campaignId: data.campaignId,
    };
  }
}

/**
 * Get SMTP configuration from database
 */
async function getSmtpConfig(configId?: string): Promise<{
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  provider?: string;
} | null> {
  if (configId) {
    const config = await prisma.smtpConfig.findUnique({
      where: { id: configId, isActive: true },
    });
    if (config) return config;
  }

  // Fall back to default SMTP config
  const defaultConfig = await prisma.smtpConfig.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (defaultConfig) return defaultConfig;

  // Fall back to any active config
  const anyConfig = await prisma.smtpConfig.findFirst({
    where: { isActive: true },
  });

  return anyConfig;
}

/**
 * Start the email worker
 */
export function startEmailWorker(config?: Partial<QueueConfig>): Worker<EmailJobData, EmailJobResult> {
  if (emailWorker) {
    console.log('[Worker] Email worker already running');
    return emailWorker;
  }

  const mergedConfig = { ...DEFAULT_QUEUE_CONFIG, ...config };
  const connection = createRedisConnection();

  emailWorker = new Worker<EmailJobData, EmailJobResult>(
    QUEUE_NAMES.EMAIL,
    processEmailJob,
    {
      connection,
      concurrency: mergedConfig.concurrency,
      limiter: {
        max: mergedConfig.rateLimitMax,
        duration: mergedConfig.rateLimitDuration,
      },
    }
  );

  // Event handlers
  emailWorker.on('completed', (job, result) => {
    console.log(
      `[Worker] Job ${job.id} completed:`,
      result.success ? 'success' : 'failed'
    );
  });

  emailWorker.on('failed', (job, error) => {
    console.error(
      `[Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      error.message
    );
  });

  emailWorker.on('error', (error) => {
    console.error('[Worker] Worker error:', error.message);
  });

  emailWorker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} stalled`);
  });

  emailWorker.on('progress', (job, progress) => {
    console.log(`[Worker] Job ${job.id} progress:`, progress);
  });

  console.log(
    `[Worker] Email worker started with concurrency ${mergedConfig.concurrency}`
  );

  return emailWorker;
}

/**
 * Stop the email worker gracefully
 */
export async function stopEmailWorker(): Promise<void> {
  if (!emailWorker) {
    console.log('[Worker] No email worker running');
    return;
  }

  console.log('[Worker] Stopping email worker...');
  await emailWorker.close();
  emailWorker = null;
  console.log('[Worker] Email worker stopped');
}

/**
 * Pause the email worker
 */
export async function pauseEmailWorker(): Promise<void> {
  if (!emailWorker) {
    console.log('[Worker] No email worker running');
    return;
  }

  await emailWorker.pause();
  console.log('[Worker] Email worker paused');
}

/**
 * Resume the email worker
 */
export async function resumeEmailWorker(): Promise<void> {
  if (!emailWorker) {
    console.log('[Worker] No email worker running');
    return;
  }

  emailWorker.resume();
  console.log('[Worker] Email worker resumed');
}

/**
 * Get worker status
 */
export function getWorkerStatus(): {
  running: boolean;
  paused: boolean;
  concurrency: number;
} {
  if (!emailWorker) {
    return { running: false, paused: false, concurrency: 0 };
  }

  return {
    running: !emailWorker.isPaused(),
    paused: emailWorker.isPaused(),
    concurrency: emailWorker.opts.concurrency || 1,
  };
}

/**
 * Check if worker is healthy
 */
export async function isWorkerHealthy(): Promise<boolean> {
  if (!emailWorker) {
    return false;
  }

  try {
    // Worker is healthy if it can process the queue
    return emailWorker.isRunning();
  } catch {
    return false;
  }
}
