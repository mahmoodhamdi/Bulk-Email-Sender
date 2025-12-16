import { prisma } from '../db/prisma';
import { encryptString, decryptString } from '../crypto';
import { addWebhookJob } from './webhook-queue';
import {
  type WebhookEvent,
  type WebhookEventData,
  type WebhookPayload,
  type WebhookJobData,
  type WebhookStats,
  WEBHOOK_EVENTS,
  DEFAULT_WEBHOOK_CONFIG,
} from './types';
import type { Webhook, WebhookDelivery, WebhookAuthType, Prisma } from '@prisma/client';

/**
 * Fire an event to all subscribed webhooks
 */
export async function fireEvent(
  event: WebhookEvent,
  data: WebhookEventData,
  options?: {
    userId?: string;
    campaignId?: string;
  }
): Promise<{ queued: number; webhookIds: string[] }> {
  // Find all active webhooks subscribed to this event
  const whereClause: Prisma.WebhookWhereInput = {
    isActive: true,
    events: { has: event },
  };

  // Filter by user if provided
  if (options?.userId) {
    whereClause.userId = options.userId;
  }

  const webhooks = await prisma.webhook.findMany({
    where: whereClause,
  });

  if (webhooks.length === 0) {
    return { queued: 0, webhookIds: [] };
  }

  // Filter webhooks by campaign if they have campaign filters
  const filteredWebhooks = webhooks.filter((webhook) => {
    // If webhook has campaign filters, check if current campaign matches
    if (webhook.campaignIds.length > 0 && options?.campaignId) {
      return webhook.campaignIds.includes(options.campaignId);
    }
    // If no campaign filter, include the webhook
    return webhook.campaignIds.length === 0;
  });

  if (filteredWebhooks.length === 0) {
    return { queued: 0, webhookIds: [] };
  }

  // Build payload
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Queue deliveries for each webhook
  const queuedWebhookIds: string[] = [];

  for (const webhook of filteredWebhooks) {
    try {
      await queueDelivery(webhook, event, payload);
      queuedWebhookIds.push(webhook.id);
    } catch (error) {
      console.error(
        `[Webhook Service] Failed to queue delivery for webhook ${webhook.id}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  console.log(
    `[Webhook Service] Fired event "${event}" to ${queuedWebhookIds.length} webhooks`
  );

  return {
    queued: queuedWebhookIds.length,
    webhookIds: queuedWebhookIds,
  };
}

/**
 * Queue a webhook delivery
 */
export async function queueDelivery(
  webhook: Webhook,
  event: string,
  payload: WebhookPayload
): Promise<WebhookDelivery> {
  // Create delivery record
  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event,
      payload: payload as unknown as Prisma.JsonObject,
      status: 'PENDING',
      attempts: 0,
    },
  });

  // Decrypt auth value if needed
  let authValue = webhook.authValue;
  if (authValue && ['BASIC', 'BEARER', 'API_KEY'].includes(webhook.authType)) {
    try {
      authValue = await decryptString(authValue);
    } catch {
      // If decryption fails, use as-is (might not be encrypted)
    }
  }

  // Build job data
  const jobData: WebhookJobData = {
    webhookId: webhook.id,
    deliveryId: delivery.id,
    url: webhook.url,
    payload,
    authType: webhook.authType,
    authHeader: webhook.authHeader || undefined,
    authValue: authValue || undefined,
    secret: webhook.secret || undefined,
    timeout: webhook.timeout,
    attempt: 1,
    maxRetries: webhook.maxRetries,
  };

  // Add to queue
  await addWebhookJob(jobData);

  return delivery;
}

/**
 * Retry a failed delivery
 */
export async function retryDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });

  if (!delivery) {
    return null;
  }

  if (delivery.status !== 'FAILED') {
    throw new Error('Can only retry failed deliveries');
  }

  // Reset delivery status
  const updatedDelivery = await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'PENDING',
      attempts: 0,
      error: null,
      statusCode: null,
      response: null,
      deliveredAt: null,
    },
  });

  // Decrypt auth value if needed
  let authValue = delivery.webhook.authValue;
  if (authValue && ['BASIC', 'BEARER', 'API_KEY'].includes(delivery.webhook.authType)) {
    try {
      authValue = await decryptString(authValue);
    } catch {
      // Use as-is
    }
  }

  // Build job data
  const jobData: WebhookJobData = {
    webhookId: delivery.webhook.id,
    deliveryId: delivery.id,
    url: delivery.webhook.url,
    payload: delivery.payload as unknown as WebhookPayload,
    authType: delivery.webhook.authType,
    authHeader: delivery.webhook.authHeader || undefined,
    authValue: authValue || undefined,
    secret: delivery.webhook.secret || undefined,
    timeout: delivery.webhook.timeout,
    attempt: 1,
    maxRetries: delivery.webhook.maxRetries,
  };

  // Add to queue
  await addWebhookJob(jobData);

  return updatedDelivery;
}

/**
 * Test a webhook endpoint
 */
export async function testWebhook(
  webhookId: string
): Promise<{
  success: boolean;
  statusCode?: number;
  responseTime: number;
  response?: string;
  error?: string;
}> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const startTime = Date.now();

  // Build test payload
  const testPayload: WebhookPayload = {
    event: 'email.sent' as WebhookEvent, // Use a common event for testing
    timestamp: new Date().toISOString(),
    data: {
      campaignId: 'test_campaign_id',
      campaignName: 'Test Campaign',
      recipientId: 'test_recipient_id',
      contactId: 'test_contact_id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      metadata: {
        test: true,
        message: 'This is a test webhook delivery',
      },
    },
  };

  const payloadString = JSON.stringify(testPayload);

  // Decrypt auth value if needed
  let authValue = webhook.authValue;
  if (authValue && ['BASIC', 'BEARER', 'API_KEY'].includes(webhook.authType)) {
    try {
      authValue = await decryptString(authValue);
    } catch {
      // Use as-is
    }
  }

  // Import buildAuthHeaders dynamically to avoid circular deps
  const { buildAuthHeaders } = await import('./signature');
  const timestamp = Date.now().toString();

  const authHeaders = buildAuthHeaders(webhook.authType, {
    authHeader: webhook.authHeader || undefined,
    authValue: authValue || undefined,
    secret: webhook.secret || undefined,
    payload: payloadString,
    timestamp,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'BulkEmailSender-Webhook/1.0',
    'X-Webhook-ID': webhook.id,
    'X-Webhook-Test': 'true',
    ...authHeaders,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

    let response: Response;
    try {
      response = await fetch(webhook.url, {
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

    if (response.ok) {
      return {
        success: true,
        statusCode: response.status,
        responseTime,
        response: responseText.slice(0, 500),
      };
    }

    return {
      success: false,
      statusCode: response.status,
      responseTime,
      response: responseText.slice(0, 500),
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    let errorMessage: string;
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Request timeout after ${webhook.timeout}ms`;
      } else {
        errorMessage = error.message;
      }
    } else {
      errorMessage = 'Unknown error';
    }

    return {
      success: false,
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Get delivery statistics for a webhook
 */
export async function getDeliveryStats(
  webhookId: string,
  period: 'day' | 'week' | 'month' = 'week'
): Promise<WebhookStats> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      webhookId,
      createdAt: { gte: startDate },
    },
    select: {
      status: true,
    },
  });

  const stats = {
    totalDeliveries: deliveries.length,
    delivered: 0,
    failed: 0,
    pending: 0,
    retrying: 0,
    successRate: 0,
  };

  for (const delivery of deliveries) {
    switch (delivery.status) {
      case 'DELIVERED':
        stats.delivered++;
        break;
      case 'FAILED':
        stats.failed++;
        break;
      case 'PENDING':
        stats.pending++;
        break;
      case 'RETRYING':
      case 'PROCESSING':
        stats.retrying++;
        break;
    }
  }

  if (stats.totalDeliveries > 0) {
    stats.successRate =
      Math.round((stats.delivered / stats.totalDeliveries) * 10000) / 100;
  }

  return stats;
}

/**
 * Create a new webhook with encrypted auth value
 */
export async function createWebhook(data: {
  name: string;
  url: string;
  events: string[];
  userId?: string;
  secret?: string;
  authType?: WebhookAuthType;
  authHeader?: string;
  authValue?: string;
  timeout?: number;
  maxRetries?: number;
  campaignIds?: string[];
  contactListIds?: string[];
  isActive?: boolean;
}): Promise<Webhook> {
  // Encrypt auth value if provided
  let encryptedAuthValue = data.authValue;
  if (encryptedAuthValue && ['BASIC', 'BEARER', 'API_KEY'].includes(data.authType || 'NONE')) {
    encryptedAuthValue = await encryptString(encryptedAuthValue);
  }

  return prisma.webhook.create({
    data: {
      name: data.name,
      url: data.url,
      events: data.events,
      userId: data.userId,
      secret: data.secret,
      authType: data.authType || 'NONE',
      authHeader: data.authHeader,
      authValue: encryptedAuthValue,
      timeout: data.timeout || DEFAULT_WEBHOOK_CONFIG.defaultTimeout,
      maxRetries: data.maxRetries || DEFAULT_WEBHOOK_CONFIG.maxRetries,
      campaignIds: data.campaignIds || [],
      contactListIds: data.contactListIds || [],
      isActive: data.isActive ?? true,
    },
  });
}

/**
 * Update a webhook with encrypted auth value
 */
export async function updateWebhook(
  id: string,
  data: Partial<{
    name: string;
    url: string;
    events: string[];
    secret: string;
    authType: WebhookAuthType;
    authHeader: string;
    authValue: string;
    timeout: number;
    maxRetries: number;
    campaignIds: string[];
    contactListIds: string[];
    isActive: boolean;
  }>
): Promise<Webhook> {
  // Encrypt auth value if provided and auth type requires it
  let encryptedAuthValue = data.authValue;
  if (encryptedAuthValue) {
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    const authType = data.authType || webhook?.authType || 'NONE';
    if (['BASIC', 'BEARER', 'API_KEY'].includes(authType)) {
      encryptedAuthValue = await encryptString(encryptedAuthValue);
    }
  }

  return prisma.webhook.update({
    where: { id },
    data: {
      ...data,
      authValue: encryptedAuthValue,
    },
  });
}

/**
 * Delete a webhook and all its deliveries
 */
export async function deleteWebhook(id: string): Promise<void> {
  await prisma.webhook.delete({
    where: { id },
  });
}

/**
 * Get webhook by ID
 */
export async function getWebhook(id: string): Promise<Webhook | null> {
  return prisma.webhook.findUnique({
    where: { id },
  });
}

/**
 * List webhooks for a user
 */
export async function listWebhooks(options: {
  userId?: string;
  isActive?: boolean;
  event?: string;
  page?: number;
  limit?: number;
}): Promise<{ webhooks: Webhook[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.WebhookWhereInput = {};

  if (options.userId) {
    where.userId = options.userId;
  }

  if (options.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  if (options.event) {
    where.events = { has: options.event };
  }

  const [webhooks, total] = await Promise.all([
    prisma.webhook.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.webhook.count({ where }),
  ]);

  return { webhooks, total };
}

/**
 * List deliveries for a webhook
 */
export async function listDeliveries(options: {
  webhookId: string;
  status?: string;
  event?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.WebhookDeliveryWhereInput = {
    webhookId: options.webhookId,
  };

  if (options.status) {
    where.status = options.status as WebhookDelivery['status'];
  }

  if (options.event) {
    where.event = options.event;
  }

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.webhookDelivery.count({ where }),
  ]);

  return { deliveries, total };
}
