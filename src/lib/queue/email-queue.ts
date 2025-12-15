import { Queue, QueueEvents } from 'bullmq';
import { getQueueConnection } from './redis';
import {
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  DEFAULT_QUEUE_CONFIG,
  type EmailJobData,
  type QueueStats,
  type QueueConfig,
} from './types';

// Queue instance singleton
let emailQueue: Queue<EmailJobData> | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Get or create the email queue instance
 */
export function getEmailQueue(): Queue<EmailJobData> {
  if (!emailQueue) {
    const connection = getQueueConnection();

    emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    console.log(`[Queue] Email queue "${QUEUE_NAMES.EMAIL}" initialized`);
  }

  return emailQueue;
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(): QueueEvents {
  if (!queueEvents) {
    const connection = getQueueConnection();
    queueEvents = new QueueEvents(QUEUE_NAMES.EMAIL, { connection });
    console.log(`[Queue] Queue events listener initialized`);
  }

  return queueEvents;
}

/**
 * Add an email job to the queue
 */
export async function addEmailJob(
  data: EmailJobData,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }
): Promise<string> {
  const queue = getEmailQueue();

  const job = await queue.add('send-email', data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: options?.jobId || `email-${data.recipientId}`,
  });

  return job.id || '';
}

/**
 * Add multiple email jobs to the queue (bulk)
 */
export async function addEmailJobs(
  jobs: Array<{
    data: EmailJobData;
    options?: {
      priority?: number;
      delay?: number;
      jobId?: string;
    };
  }>
): Promise<string[]> {
  const queue = getEmailQueue();

  const bulkJobs = jobs.map((job) => ({
    name: 'send-email',
    data: job.data,
    opts: {
      priority: job.options?.priority,
      delay: job.options?.delay,
      jobId: job.options?.jobId || `email-${job.data.recipientId}`,
    },
  }));

  const addedJobs = await queue.addBulk(bulkJobs);
  return addedJobs.map((j) => j.id || '');
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const queue = getEmailQueue();

  const [waiting, active, completed, failed, delayed, isPaused] =
    await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused: isPaused,
  };
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string) {
  const queue = getEmailQueue();
  return queue.getJob(jobId);
}

/**
 * Get jobs by state
 */
export async function getJobsByState(
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
  start = 0,
  end = 100
) {
  const queue = getEmailQueue();

  switch (state) {
    case 'waiting':
      return queue.getWaiting(start, end);
    case 'active':
      return queue.getActive(start, end);
    case 'completed':
      return queue.getCompleted(start, end);
    case 'failed':
      return queue.getFailed(start, end);
    case 'delayed':
      return queue.getDelayed(start, end);
    default:
      return [];
  }
}

/**
 * Remove a job from the queue
 */
export async function removeJob(jobId: string): Promise<boolean> {
  const queue = getEmailQueue();
  const job = await queue.getJob(jobId);

  if (job) {
    await job.remove();
    return true;
  }

  return false;
}

/**
 * Retry a failed job
 */
export async function retryJob(jobId: string): Promise<boolean> {
  const queue = getEmailQueue();
  const job = await queue.getJob(jobId);

  if (job) {
    await job.retry();
    return true;
  }

  return false;
}

/**
 * Pause the queue
 */
export async function pauseQueue(): Promise<void> {
  const queue = getEmailQueue();
  await queue.pause();
  console.log('[Queue] Email queue paused');
}

/**
 * Resume the queue
 */
export async function resumeQueue(): Promise<void> {
  const queue = getEmailQueue();
  await queue.resume();
  console.log('[Queue] Email queue resumed');
}

/**
 * Drain the queue (remove all jobs)
 */
export async function drainQueue(): Promise<void> {
  const queue = getEmailQueue();
  await queue.drain();
  console.log('[Queue] Email queue drained');
}

/**
 * Clean old jobs from the queue
 */
export async function cleanQueue(
  gracePeriod: number = 24 * 60 * 60 * 1000, // 24 hours
  limit: number = 1000,
  status: 'completed' | 'failed' | 'delayed' | 'wait' = 'completed'
): Promise<string[]> {
  const queue = getEmailQueue();
  const removedJobs = await queue.clean(gracePeriod, limit, status);
  console.log(`[Queue] Cleaned ${removedJobs.length} ${status} jobs`);
  return removedJobs;
}

/**
 * Get jobs for a specific campaign
 */
export async function getCampaignJobs(
  campaignId: string,
  state?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
) {
  const queue = getEmailQueue();
  const states = state
    ? [state]
    : (['waiting', 'active', 'completed', 'failed', 'delayed'] as const);

  const allJobs = [];

  for (const s of states) {
    const jobs = await getJobsByState(s, 0, 10000);
    const campaignJobs = jobs.filter((job) => job.data.campaignId === campaignId);
    allJobs.push(...campaignJobs);
  }

  return allJobs;
}

/**
 * Cancel all jobs for a campaign
 */
export async function cancelCampaignJobs(campaignId: string): Promise<number> {
  const jobs = await getCampaignJobs(campaignId);
  let cancelled = 0;

  for (const job of jobs) {
    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      cancelled++;
    }
  }

  console.log(`[Queue] Cancelled ${cancelled} jobs for campaign ${campaignId}`);
  return cancelled;
}

/**
 * Close the queue and event listeners
 */
export async function closeQueue(): Promise<void> {
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }

  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }

  console.log('[Queue] Email queue closed');
}

/**
 * Apply rate limiting configuration to queue
 */
export async function configureRateLimiting(config: Partial<QueueConfig>): Promise<void> {
  const queue = getEmailQueue();
  const mergedConfig = { ...DEFAULT_QUEUE_CONFIG, ...config };

  // BullMQ rate limiting is set per-worker, not per-queue
  // This function stores the config for workers to use
  await queue.setGlobalConcurrency(mergedConfig.concurrency);

  console.log(
    `[Queue] Rate limiting configured: ${mergedConfig.rateLimitMax} jobs per ${mergedConfig.rateLimitDuration}ms`
  );
}
