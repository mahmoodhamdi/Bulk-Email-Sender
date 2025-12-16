import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../queue/redis';
import { prisma } from '../db/prisma';
import { buildAuthHeaders } from './signature';
import { scheduleWebhookRetry } from './webhook-queue';
import {
  WEBHOOK_QUEUE_NAME,
  DEFAULT_WEBHOOK_CONFIG,
  type WebhookJobData,
  type WebhookJobResult,
  type WebhookQueueConfig,
} from './types';

let webhookWorker: Worker<WebhookJobData, WebhookJobResult> | null = null;

/**
 * Process a single webhook delivery job
 */
async function processWebhookJob(
  job: Job<WebhookJobData, WebhookJobResult>
): Promise<WebhookJobResult> {
  const { data } = job;
  const startTime = Date.now();

  console.log(
    `[Webhook Worker] Processing job ${job.id} for delivery ${data.deliveryId} (attempt ${data.attempt})`
  );

  try {
    // Update delivery status to PROCESSING
    await prisma.webhookDelivery.update({
      where: { id: data.deliveryId },
      data: {
        status: 'PROCESSING',
        attempts: data.attempt,
      },
    });

    // Build request headers
    const payloadString = JSON.stringify(data.payload);
    const timestamp = Date.now().toString();

    const authHeaders = buildAuthHeaders(data.authType, {
      authHeader: data.authHeader,
      authValue: data.authValue,
      secret: data.secret,
      payload: payloadString,
      timestamp,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'BulkEmailSender-Webhook/1.0',
      'X-Webhook-ID': data.webhookId,
      'X-Delivery-ID': data.deliveryId,
      'X-Webhook-Event': data.payload.event,
      ...authHeaders,
    };

    // Make HTTP request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), data.timeout);

    let response: Response;
    try {
      response = await fetch(data.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const responseTime = Date.now() - startTime;
    const responseText = await response.text().catch(() => '');

    // Check if successful (2xx status codes)
    if (response.ok) {
      // Update delivery status to DELIVERED
      await prisma.webhookDelivery.update({
        where: { id: data.deliveryId },
        data: {
          status: 'DELIVERED',
          statusCode: response.status,
          response: responseText.slice(0, 1000), // Limit response size
          deliveredAt: new Date(),
          error: null,
        },
      });

      console.log(
        `[Webhook Worker] Job ${job.id} delivered successfully in ${responseTime}ms (status: ${response.status})`
      );

      return {
        success: true,
        deliveryId: data.deliveryId,
        webhookId: data.webhookId,
        statusCode: response.status,
        response: responseText.slice(0, 500),
        responseTime,
      };
    }

    // Non-2xx response - treat as failure
    throw new WebhookError(
      `HTTP ${response.status}: ${responseText.slice(0, 200)}`,
      response.status,
      responseText
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorMessage: string;
    let statusCode: number | undefined;
    let responseText: string | undefined;

    if (error instanceof WebhookError) {
      errorMessage = error.message;
      statusCode = error.statusCode;
      responseText = error.response;
    } else if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Request timeout after ${data.timeout}ms`;
      } else {
        errorMessage = error.message;
      }
    } else {
      errorMessage = 'Unknown error';
    }

    console.error(
      `[Webhook Worker] Job ${job.id} failed (attempt ${data.attempt}):`,
      errorMessage
    );

    // Check if we should retry
    const canRetry = data.attempt < data.maxRetries;

    if (canRetry) {
      // Schedule retry
      const nextAttempt = data.attempt + 1;

      await prisma.webhookDelivery.update({
        where: { id: data.deliveryId },
        data: {
          status: 'RETRYING',
          statusCode,
          response: responseText?.slice(0, 1000),
          error: errorMessage,
          attempts: data.attempt,
        },
      });

      // Queue the retry
      await scheduleWebhookRetry(data, nextAttempt);

      console.log(
        `[Webhook Worker] Scheduled retry ${nextAttempt}/${data.maxRetries} for delivery ${data.deliveryId}`
      );
    } else {
      // Final failure - no more retries
      await prisma.webhookDelivery.update({
        where: { id: data.deliveryId },
        data: {
          status: 'FAILED',
          statusCode,
          response: responseText?.slice(0, 1000),
          error: errorMessage,
          attempts: data.attempt,
        },
      });

      console.log(
        `[Webhook Worker] Delivery ${data.deliveryId} failed permanently after ${data.attempt} attempts`
      );
    }

    return {
      success: false,
      deliveryId: data.deliveryId,
      webhookId: data.webhookId,
      statusCode,
      error: errorMessage,
      responseTime,
    };
  }
}

/**
 * Custom error class for webhook failures
 */
class WebhookError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: string
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

/**
 * Start the webhook worker
 */
export function startWebhookWorker(
  config?: Partial<WebhookQueueConfig>
): Worker<WebhookJobData, WebhookJobResult> {
  if (webhookWorker) {
    console.log('[Webhook Worker] Webhook worker already running');
    return webhookWorker;
  }

  const mergedConfig = { ...DEFAULT_WEBHOOK_CONFIG, ...config };
  const connection = createRedisConnection();

  webhookWorker = new Worker<WebhookJobData, WebhookJobResult>(
    WEBHOOK_QUEUE_NAME,
    processWebhookJob,
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
  webhookWorker.on('completed', (job, result) => {
    console.log(
      `[Webhook Worker] Job ${job.id} completed:`,
      result.success ? 'delivered' : 'failed'
    );
  });

  webhookWorker.on('failed', (job, error) => {
    console.error(
      `[Webhook Worker] Job ${job?.id} failed:`,
      error.message
    );
  });

  webhookWorker.on('error', (error) => {
    console.error('[Webhook Worker] Worker error:', error.message);
  });

  webhookWorker.on('stalled', (jobId) => {
    console.warn(`[Webhook Worker] Job ${jobId} stalled`);
  });

  console.log(
    `[Webhook Worker] Started with concurrency ${mergedConfig.concurrency}`
  );

  return webhookWorker;
}

/**
 * Stop the webhook worker gracefully
 */
export async function stopWebhookWorker(): Promise<void> {
  if (!webhookWorker) {
    console.log('[Webhook Worker] No webhook worker running');
    return;
  }

  console.log('[Webhook Worker] Stopping webhook worker...');
  await webhookWorker.close();
  webhookWorker = null;
  console.log('[Webhook Worker] Webhook worker stopped');
}

/**
 * Pause the webhook worker
 */
export async function pauseWebhookWorker(): Promise<void> {
  if (!webhookWorker) {
    console.log('[Webhook Worker] No webhook worker running');
    return;
  }

  await webhookWorker.pause();
  console.log('[Webhook Worker] Webhook worker paused');
}

/**
 * Resume the webhook worker
 */
export async function resumeWebhookWorker(): Promise<void> {
  if (!webhookWorker) {
    console.log('[Webhook Worker] No webhook worker running');
    return;
  }

  webhookWorker.resume();
  console.log('[Webhook Worker] Webhook worker resumed');
}

/**
 * Get webhook worker status
 */
export function getWebhookWorkerStatus(): {
  running: boolean;
  paused: boolean;
  concurrency: number;
} {
  if (!webhookWorker) {
    return { running: false, paused: false, concurrency: 0 };
  }

  return {
    running: !webhookWorker.isPaused(),
    paused: webhookWorker.isPaused(),
    concurrency: webhookWorker.opts.concurrency || 1,
  };
}

/**
 * Check if webhook worker is healthy
 */
export async function isWebhookWorkerHealthy(): Promise<boolean> {
  if (!webhookWorker) {
    return false;
  }

  try {
    return webhookWorker.isRunning();
  } catch {
    return false;
  }
}
