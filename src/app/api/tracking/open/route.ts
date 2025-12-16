import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { trackOpenSchema } from '@/lib/validations/tracking';
import { ZodError } from 'zod';
import { fireEvent, WEBHOOK_EVENTS } from '@/lib/webhook';

// 1x1 transparent PNG pixel
const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * GET /api/tracking/open
 * Track email opens via tracking pixel
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const trackingId = searchParams.get('id') || '';

    // Validate tracking ID
    trackOpenSchema.parse({ trackingId });

    // Find recipient by tracking ID
    const recipient = await prisma.recipient.findUnique({
      where: { trackingId },
      select: {
        id: true,
        campaignId: true,
        openCount: true,
        openedAt: true,
        status: true,
      },
    });

    if (recipient) {
      // Record open event
      const now = new Date();

      // Update recipient record
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: {
          openCount: recipient.openCount + 1,
          openedAt: recipient.openedAt || now,
          status: recipient.status === 'SENT' || recipient.status === 'DELIVERED' ? 'OPENED' : recipient.status,
        },
      });

      // Create email event
      await prisma.emailEvent.create({
        data: {
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          type: 'OPENED',
          metadata: {
            userAgent: request.headers.get('user-agent') || 'unknown',
            timestamp: now.toISOString(),
            openCount: recipient.openCount + 1,
          },
        },
      });

      // Update campaign opened count (only on first open)
      if (!recipient.openedAt) {
        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: {
            openedCount: { increment: 1 },
          },
        });
      }

      // Fire webhook event (non-blocking)
      const recipientWithContact = await prisma.recipient.findUnique({
        where: { id: recipient.id },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, company: true } },
          campaign: { select: { name: true, userId: true } },
        },
      });

      if (recipientWithContact) {
        fireEvent(WEBHOOK_EVENTS.EMAIL_OPENED, {
          campaignId: recipient.campaignId,
          campaignName: recipientWithContact.campaign.name,
          recipientId: recipient.id,
          contactId: recipientWithContact.contact?.id,
          email: recipientWithContact.email,
          firstName: recipientWithContact.contact?.firstName || undefined,
          lastName: recipientWithContact.contact?.lastName || undefined,
          company: recipientWithContact.contact?.company || undefined,
          metadata: {
            userAgent: request.headers.get('user-agent') || 'unknown',
            openCount: recipient.openCount + 1,
          },
        }, {
          userId: recipientWithContact.campaign.userId || undefined,
          campaignId: recipient.campaignId,
        }).catch((err) => console.error('Failed to fire webhook:', err));
      }
    }

    // Return tracking pixel
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': TRACKING_PIXEL.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // Always return the tracking pixel even on error
    // to avoid breaking email rendering
    if (error instanceof ZodError) {
      console.error('Invalid tracking request:', error.errors);
    } else {
      console.error('Error tracking open:', error);
    }

    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': TRACKING_PIXEL.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  }
}
