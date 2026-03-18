import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHmac } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { webhookEventSchema, bounceEventSchema, complaintEventSchema } from '@/lib/validations/tracking';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { fireEvent, WEBHOOK_EVENTS } from '@/lib/webhook';

/**
 * Verify inbound webhook signature from email providers.
 * Checks X-Webhook-Secret (shared secret) or X-Webhook-Signature (HMAC-SHA256).
 */
function verifyInboundWebhook(request: NextRequest, rawBody: string): boolean {
  const webhookSecret = process.env.TRACKING_WEBHOOK_SECRET;

  // If no secret configured, reject all inbound webhooks in production
  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    // Allow in development without auth for testing convenience
    return true;
  }

  // Check shared secret header
  const secretHeader = request.headers.get('x-webhook-secret');
  if (secretHeader) {
    try {
      return timingSafeEqual(
        Buffer.from(secretHeader),
        Buffer.from(webhookSecret)
      );
    } catch {
      return false;
    }
  }

  // Check HMAC signature header (X-Webhook-Signature: sha256=<hex>)
  const signatureHeader = request.headers.get('x-webhook-signature');
  if (signatureHeader) {
    const expectedSig = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    const receivedSig = signatureHeader.replace('sha256=', '');
    if (expectedSig.length !== receivedSig.length) return false;
    try {
      return timingSafeEqual(
        Buffer.from(expectedSig, 'hex'),
        Buffer.from(receivedSig, 'hex')
      );
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * POST /api/tracking/webhook
 * Receive webhook events from email providers
 * Supports: SendGrid, Mailgun, Amazon SES, etc.
 * Requires X-Webhook-Secret or X-Webhook-Signature header for authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook authenticity
    if (!verifyInboundWebhook(request, rawBody)) {
      return NextResponse.json(
        { error: 'Invalid or missing webhook signature' },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    // Handle array of events (common in webhooks)
    const events = Array.isArray(body) ? body : [body];

    const results = {
      processed: 0,
      errors: [] as { event: unknown; error: string }[],
    };

    for (const event of events) {
      try {
        // Try to parse as a standard webhook event
        const validated = webhookEventSchema.parse(event);
        await processWebhookEvent(validated);
        results.processed++;
      } catch (err) {
        results.errors.push({
          event,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.processed,
      errors: results.errors.length,
      details: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process a single webhook event
 */
async function processWebhookEvent(event: {
  type: string;
  email: string;
  campaignId?: string;
  recipientId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}) {
  const now = event.timestamp ? new Date(event.timestamp) : new Date();

  // Find recipient if we have the info (include contact/campaign for webhook)
  const recipientSelect = {
    id: true,
    email: true,
    campaignId: true,
    status: true,
    contact: { select: { id: true, firstName: true, lastName: true, company: true } },
    campaign: { select: { name: true, userId: true } },
  } as const;

  let recipient = null;
  if (event.recipientId) {
    recipient = await prisma.recipient.findUnique({
      where: { id: event.recipientId },
      select: recipientSelect,
    });
  } else if (event.campaignId && event.email) {
    recipient = await prisma.recipient.findFirst({
      where: {
        campaignId: event.campaignId,
        email: event.email,
      },
      select: recipientSelect,
    });
  }

  // Process based on event type
  switch (event.type) {
    case 'DELIVERED':
      if (recipient) {
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: now,
          },
        });

        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: {
            deliveredCount: { increment: 1 },
          },
        });
      }
      break;

    case 'BOUNCED':
      await handleBounce(event.email, event.campaignId, recipient?.id, event.metadata);
      break;

    case 'COMPLAINED':
      await handleComplaint(event.email, event.campaignId, recipient?.id, event.metadata);
      break;

    case 'UNSUBSCRIBED':
      if (recipient) {
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { status: 'UNSUBSCRIBED' },
        });
      }
      // Update contact status
      await prisma.contact.updateMany({
        where: { email: event.email },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: now,
        },
      });
      break;
  }

  // Create email event record
  if (recipient) {
    await prisma.emailEvent.create({
      data: {
        campaignId: recipient.campaignId,
        recipientId: recipient.id,
        type: event.type as 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'UNSUBSCRIBED' | 'COMPLAINED',
        metadata: (event.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    // Fire outbound webhook event (non-blocking) - uses data from initial query
    const webhookEventMap: Record<string, string> = {
      'DELIVERED': WEBHOOK_EVENTS.EMAIL_DELIVERED,
      'BOUNCED': WEBHOOK_EVENTS.EMAIL_BOUNCED,
      'UNSUBSCRIBED': WEBHOOK_EVENTS.EMAIL_UNSUBSCRIBED,
      'COMPLAINED': WEBHOOK_EVENTS.EMAIL_COMPLAINED,
    };

    const webhookEvent = webhookEventMap[event.type];
    if (webhookEvent) {
      fireEvent(webhookEvent as typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS], {
        campaignId: recipient.campaignId,
        campaignName: recipient.campaign.name,
        recipientId: recipient.id,
        contactId: recipient.contact?.id,
        email: recipient.email,
        firstName: recipient.contact?.firstName || undefined,
        lastName: recipient.contact?.lastName || undefined,
        company: recipient.contact?.company || undefined,
        metadata: event.metadata,
      }, {
        userId: recipient.campaign.userId || undefined,
        campaignId: recipient.campaignId,
      }).catch((err) => console.error('Failed to fire outbound webhook:', err));
    }
  }
}

/**
 * Handle bounce event
 */
async function handleBounce(
  email: string,
  campaignId?: string,
  recipientId?: string,
  metadata?: Record<string, unknown>
) {
  const bounceType = (metadata?.type as string) || 'hard';
  const now = new Date();

  // Update recipient if exists
  if (recipientId) {
    await prisma.recipient.update({
      where: { id: recipientId },
      data: {
        status: 'BOUNCED',
        bouncedAt: now,
        bounceType,
        errorMessage: (metadata?.reason as string) || 'Bounced',
      },
    });
  }

  // Update contact
  await prisma.contact.updateMany({
    where: { email },
    data: {
      status: 'BOUNCED',
      bouncedAt: now,
    },
  });

  // Update campaign bounce count
  if (campaignId) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        bouncedCount: { increment: 1 },
      },
    });
  }
}

/**
 * Handle complaint event (spam report)
 */
async function handleComplaint(
  email: string,
  campaignId?: string,
  recipientId?: string,
  _metadata?: Record<string, unknown>
) {
  // Update contact
  await prisma.contact.updateMany({
    where: { email },
    data: {
      status: 'COMPLAINED',
    },
  });

  // Update recipient if exists
  if (recipientId) {
    await prisma.recipient.update({
      where: { id: recipientId },
      data: {
        status: 'UNSUBSCRIBED',
        errorMessage: 'Complaint received',
      },
    });
  }

  // Note: We don't automatically unsubscribe count for complaints
  // as they're tracked separately
}

/**
 * POST /api/tracking/webhook/bounce
 * Dedicated endpoint for bounce notifications
 */
export async function handleBounceWebhook(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = bounceEventSchema.parse(body);

    await handleBounce(
      validated.email,
      validated.campaignId,
      validated.recipientId,
      { type: validated.type, reason: validated.reason }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error processing bounce webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracking/webhook/complaint
 * Dedicated endpoint for complaint notifications
 */
export async function handleComplaintWebhook(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = complaintEventSchema.parse(body);

    await handleComplaint(
      validated.email,
      validated.campaignId,
      validated.recipientId,
      { feedbackType: validated.feedbackType }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error processing complaint webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
