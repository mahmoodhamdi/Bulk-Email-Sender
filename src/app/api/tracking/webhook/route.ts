import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { webhookEventSchema, bounceEventSchema, complaintEventSchema } from '@/lib/validations/tracking';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * POST /api/tracking/webhook
 * Receive webhook events from email providers
 * Supports: SendGrid, Mailgun, Amazon SES, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
  } catch (error) {
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

  // Find recipient if we have the info
  let recipient = null;
  if (event.recipientId) {
    recipient = await prisma.recipient.findUnique({
      where: { id: event.recipientId },
    });
  } else if (event.campaignId && event.email) {
    recipient = await prisma.recipient.findFirst({
      where: {
        campaignId: event.campaignId,
        email: event.email,
      },
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
  metadata?: Record<string, unknown>
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
  } catch (error) {
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
  } catch (error) {
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
