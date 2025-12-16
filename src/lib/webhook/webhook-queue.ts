import { Queue, QueueEvents } from 'bullmq';
import { getQueueConnection } from '../queue/redis';
import {
  WEBHOOK_QUEUE_NAME,
  DEFAULT_WEBHOOK_JOB_OPTIONS,
  DEFAULT_WEBHOOK_CONFIG,
  RETRY_DELAYS,
  type WebhookJobData,
  type WebhookStats,
} from './types';

// Queue instance singleton
let webhookQueue: Queue<WebhookJobData> | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Get or create the webhook queue instance
 */
export function getWebhookQueue(): Queue<WebhookJobData> {
  if (!webhookQueue) {
    const connection = getQueueConnection();

    webhookQueue = new Queue<WebhookJobData>(WEBHOOK_QUEUE_NAME, {
      connection,
      defaultJobOptions: DEFAULT_WEBHOOK_JOB_OPTIONS,
    });

    console.log(`[Webhook Queue] Queue "${WEBHOOK_QUEUE_NAME}" initialized`);
  }

  return webhookQueue;
}

/**
 * Get queue events for monitoring
 */
export function getWebhookQueueEvents(): QueueEvents {
  if (!queueEvents) {
    const connection = getQueueConnection();
    queueEvents = new QueueEvents(WEBHOOK_QUEUE_NAME, { connection });
    console.log(`[Webhook Queue] Queue events listener initialized`);
  }

  return queueEvents;
}

/**
 * Calculate delay for retry attempt using exponential backoff
 */
function getRetryDelay(attempt: number): number {
  const index = Math.min(attempt - 1, RETRY_DELAYS.length - 1);
  return RETRY_DELAYS[index];
}

/**
 * Add a webhook job to the queue
 */
export async function addWebhookJob(
  data: WebhookJobData,
  options?: {
    priority?: number;
    delay?: number;
  }
): Promise<string> {
  const queue = getWebhookQueue();

  const job = await queue.add('deliver-webhook', data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: `webhook-${data.deliveryId}`,
  });

  return job.id || '';
}

/**
 * Add multiple webhook jobs to the queue (bulk)
 */
export async function addWebhookJobs(
  jobs: Array<{
    data: WebhookJobData;
    options?: {
      priority?: number;
      delay?: number;
    };
  }>
): Promise<string[]> {
  const queue = getWebhookQueue();

  const bulkJobs = jobs.map((job) => ({
    name: 'deliver-webhook',
    data: job.data,
    opts: {
      priority: job.options?.priority,
      delay: job.options?.delay,
      jobId: `webhook-${job.data.deliveryId}`,
    },
  }));

  const addedJobs = await queue.addBulk(bulkJobs);
  return addedJobs.map((j) => j.id || '');
}

/**
 * Schedule a retry for a failed webhook delivery
 */
export async function scheduleWebhookRetry(
  data: WebhookJobData,
  attempt: number
): Promise<string> {
  const delay = getRetryDelay(attempt);

  const updatedData: WebhookJobData = {
    ...data,
    attempt,
  };

  return addWebhookJob(updatedData, { delay });
}

/**
 * Get webhook queue statistics
 */
export async function getWebhookQueueStats(): Promise<WebhookStats> {
  const queue = getWebhookQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  const total = waiting + active + completed + failed + delayed;
  const successRate = total > 0 ? (completed / total) * 100 : 0;

  return {
    totalDeliveries: total,
    delivered: completed,
    failed,
    pending: waiting + delayed,
    retrying: active,
    successRate: Math.round(successRate * 100) / 100,
  };
}

/**
 * Get a webhook job by ID
 */
export async function getWebhookJob(jobId: string) {
  const queue = getWebhookQueue();
  return queue.getJob(jobId);
}

/**
 * Get webhook jobs by state
 */
export async function getWebhookJobsByState(
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
  start = 0,
  end = 100
) {
  const queue = getWebhookQueue();

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
 * Remove a webhook job from the queue
 */
export async function removeWebhookJob(jobId: string): Promise<boolean> {
  const queue = getWebhookQueue();
  const job = await queue.getJob(jobId);

  if (job) {
    await job.remove();
    return true;
  }

  return false;
}

/**
 * Retry a failed webhook job
 */
export async function retryWebhookJob(jobId: string): Promise<boolean> {
  const queue = getWebhookQueue();
  const job = await queue.getJob(jobId);

  if (job) {
    await job.retry();
    return true;
  }

  return false;
}

/**
 * Get all jobs for a specific webhook
 */
export async function getJobsByWebhookId(
  webhookId: string,
  state?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
) {
  const states = state
    ? [state]
    : (['waiting', 'active', 'completed', 'failed', 'delayed'] as const);

  const allJobs = [];

  for (const s of states) {
    const jobs = await getWebhookJobsByState(s, 0, 10000);
    const webhookJobs = jobs.filter((job) => job.data.webhookId === webhookId);
    allJobs.push(...webhookJobs);
  }

  return allJobs;
}

/**
 * Cancel all pending jobs for a webhook
 */
export async function cancelWebhookJobs(webhookId: string): Promise<number> {
  const jobs = await getJobsByWebhookId(webhookId);
  let cancelled = 0;

  for (const job of jobs) {
    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      cancelled++;
    }
  }

  console.log(`[Webhook Queue] Cancelled ${cancelled} jobs for webhook ${webhookId}`);
  return cancelled;
}

/**
 * Pause the webhook queue
 */
export async function pauseWebhookQueue(): Promise<void> {
  const queue = getWebhookQueue();
  await queue.pause();
  console.log('[Webhook Queue] Queue paused');
}

/**
 * Resume the webhook queue
 */
export async function resumeWebhookQueue(): Promise<void> {
  const queue = getWebhookQueue();
  await queue.resume();
  console.log('[Webhook Queue] Queue resumed');
}

/**
 * Drain the webhook queue (remove all jobs)
 */
export async function drainWebhookQueue(): Promise<void> {
  const queue = getWebhookQueue();
  await queue.drain();
  console.log('[Webhook Queue] Queue drained');
}

/**
 * Clean old jobs from the queue
 */
export async function cleanWebhookQueue(
  gracePeriod: number = 24 * 60 * 60 * 1000, // 24 hours
  limit: number = 1000,
  status: 'completed' | 'failed' | 'delayed' | 'wait' = 'completed'
): Promise<string[]> {
  const queue = getWebhookQueue();
  const removedJobs = await queue.clean(gracePeriod, limit, status);
  console.log(`[Webhook Queue] Cleaned ${removedJobs.length} ${status} jobs`);
  return removedJobs;
}

/**
 * Close the webhook queue and event listeners
 */
export async function closeWebhookQueue(): Promise<void> {
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }

  if (webhookQueue) {
    await webhookQueue.close();
    webhookQueue = null;
  }

  console.log('[Webhook Queue] Queue closed');
}

/**
 * Check if webhook queue is healthy
 */
export async function isWebhookQueueHealthy(): Promise<boolean> {
  try {
    const queue = getWebhookQueue();
    await queue.getWaitingCount();
    return true;
  } catch {
    return false;
  }
}
