import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { trackClickSchema } from '@/lib/validations/tracking';
import { ZodError } from 'zod';
import { fireEvent, WEBHOOK_EVENTS } from '@/lib/webhook';

/**
 * GET /api/tracking/click
 * Track link clicks and redirect to destination URL
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const trackingId = searchParams.get('id') || '';
    const url = searchParams.get('url') || '';
    const linkId = searchParams.get('linkId') || undefined;

    // Validate parameters
    const validated = trackClickSchema.parse({ trackingId, url, linkId });

    // Find recipient by tracking ID
    const recipient = await prisma.recipient.findUnique({
      where: { trackingId: validated.trackingId },
      select: {
        id: true,
        campaignId: true,
        clickCount: true,
        clickedAt: true,
        status: true,
      },
    });

    if (recipient) {
      // Record click event
      const now = new Date();

      // Update recipient record
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: {
          clickCount: recipient.clickCount + 1,
          clickedAt: recipient.clickedAt || now,
          status: ['SENT', 'DELIVERED', 'OPENED'].includes(recipient.status) ? 'CLICKED' : recipient.status,
        },
      });

      // Create email event
      await prisma.emailEvent.create({
        data: {
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          type: 'CLICKED',
          metadata: {
            url: validated.url,
            linkId: validated.linkId,
            userAgent: request.headers.get('user-agent') || 'unknown',
            timestamp: now.toISOString(),
            clickCount: recipient.clickCount + 1,
          },
        },
      });

      // Update campaign clicked count (only on first click)
      if (!recipient.clickedAt) {
        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: {
            clickedCount: { increment: 1 },
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
        fireEvent(WEBHOOK_EVENTS.EMAIL_CLICKED, {
          campaignId: recipient.campaignId,
          campaignName: recipientWithContact.campaign.name,
          recipientId: recipient.id,
          contactId: recipientWithContact.contact?.id,
          email: recipientWithContact.email,
          firstName: recipientWithContact.contact?.firstName || undefined,
          lastName: recipientWithContact.contact?.lastName || undefined,
          company: recipientWithContact.contact?.company || undefined,
          metadata: {
            url: validated.url,
            linkId: validated.linkId,
            userAgent: request.headers.get('user-agent') || 'unknown',
            clickCount: recipient.clickCount + 1,
          },
        }, {
          userId: recipientWithContact.campaign.userId || undefined,
          campaignId: recipient.campaignId,
        }).catch((err) => console.error('Failed to fire webhook:', err));
      }
    }

    // Redirect to destination URL
    return NextResponse.redirect(validated.url, { status: 302 });
  } catch (error) {
    if (error instanceof ZodError) {
      // If URL validation fails, return error
      return NextResponse.json(
        { error: 'Invalid tracking parameters' },
        { status: 400 }
      );
    }
    console.error('Error tracking click:', error);

    // Try to redirect to the URL even on error
    const url = request.nextUrl.searchParams.get('url');
    if (url) {
      try {
        new URL(url); // Validate URL
        return NextResponse.redirect(url, { status: 302 });
      } catch {
        // Invalid URL
      }
    }

    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
  }
}
