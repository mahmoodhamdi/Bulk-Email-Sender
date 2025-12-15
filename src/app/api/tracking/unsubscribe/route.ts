import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { unsubscribeSchema } from '@/lib/validations/tracking';
import { ZodError } from 'zod';

/**
 * GET /api/tracking/unsubscribe
 * Handle one-click unsubscribe via link
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token') || '';

    // Validate token
    unsubscribeSchema.parse({ token });

    // Find unsubscribe record
    const unsubscribe = await prisma.unsubscribe.findUnique({
      where: { token },
    });

    if (!unsubscribe) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe link' },
        { status: 404 }
      );
    }

    // Check if already unsubscribed
    const contact = await prisma.contact.findFirst({
      where: { email: unsubscribe.email },
    });

    if (contact && contact.status === 'UNSUBSCRIBED') {
      return NextResponse.json({
        message: 'You have already been unsubscribed',
        email: unsubscribe.email,
      });
    }

    // Update contact status
    if (contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: new Date(),
        },
      });
    }

    // Create unsubscribe event if we have campaign and recipient info
    if (unsubscribe.campaignId) {
      const recipient = await prisma.recipient.findFirst({
        where: {
          campaignId: unsubscribe.campaignId,
          email: unsubscribe.email,
        },
      });

      if (recipient) {
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { status: 'UNSUBSCRIBED' },
        });

        await prisma.emailEvent.create({
          data: {
            campaignId: unsubscribe.campaignId,
            recipientId: recipient.id,
            type: 'UNSUBSCRIBED',
            metadata: {
              timestamp: new Date().toISOString(),
              userAgent: request.headers.get('user-agent') || 'unknown',
            },
          },
        });

        // Update campaign unsubscribe count
        await prisma.campaign.update({
          where: { id: unsubscribe.campaignId },
          data: {
            unsubscribedCount: { increment: 1 },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'You have been successfully unsubscribed',
      email: unsubscribe.email,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe request' },
        { status: 400 }
      );
    }
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracking/unsubscribe
 * Handle unsubscribe with optional reason
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = unsubscribeSchema.parse(body);

    // Find unsubscribe record
    const unsubscribe = await prisma.unsubscribe.findUnique({
      where: { token: validated.token },
    });

    if (!unsubscribe) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe link' },
        { status: 404 }
      );
    }

    // Update the unsubscribe record with reason
    if (validated.reason) {
      await prisma.unsubscribe.update({
        where: { token: validated.token },
        data: { reason: validated.reason },
      });
    }

    // Update contact status
    const contact = await prisma.contact.findFirst({
      where: { email: unsubscribe.email },
    });

    if (contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: new Date(),
        },
      });
    }

    // Create unsubscribe event if we have campaign info
    if (unsubscribe.campaignId) {
      const recipient = await prisma.recipient.findFirst({
        where: {
          campaignId: unsubscribe.campaignId,
          email: unsubscribe.email,
        },
      });

      if (recipient) {
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { status: 'UNSUBSCRIBED' },
        });

        await prisma.emailEvent.create({
          data: {
            campaignId: unsubscribe.campaignId,
            recipientId: recipient.id,
            type: 'UNSUBSCRIBED',
            metadata: {
              reason: validated.reason,
              timestamp: new Date().toISOString(),
            },
          },
        });

        // Update campaign unsubscribe count
        await prisma.campaign.update({
          where: { id: unsubscribe.campaignId },
          data: {
            unsubscribedCount: { increment: 1 },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'You have been successfully unsubscribed',
      email: unsubscribe.email,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe request', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
