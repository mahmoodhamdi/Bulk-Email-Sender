import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { updateCampaignSchema, campaignIdSchema } from '@/lib/validations/campaign';
import { apiRateLimiter } from '@/lib/rate-limit';
import { sanitizeEmailHtml } from '@/lib/sanitize-server';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/campaigns/[id]
 * Get a single campaign by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`campaign-get-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    campaignIdSchema.parse({ id });

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        template: {
          select: { id: true, name: true, content: true },
        },
        recipients: {
          take: 100,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            status: true,
            sentAt: true,
            openedAt: true,
            clickedAt: true,
          },
        },
        _count: {
          select: { recipients: true, events: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: campaign });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error getting campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/campaigns/[id]
 * Update an existing campaign
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`campaign-update-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    campaignIdSchema.parse({ id });

    // Check if campaign exists
    const existing = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow updating campaigns that are sending or completed
    if (['SENDING', 'COMPLETED'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Cannot update campaign in current status' },
        { status: 400 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = updateCampaignSchema.parse(body);

    // Build update data with sanitized content
    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.subject !== undefined) updateData.subject = validated.subject;
    if (validated.fromName !== undefined) updateData.fromName = validated.fromName;
    if (validated.fromEmail !== undefined) updateData.fromEmail = validated.fromEmail;
    if (validated.replyTo !== undefined) updateData.replyTo = validated.replyTo;
    if (validated.content !== undefined) {
      // Sanitize HTML content to prevent XSS attacks (preserves merge tags)
      updateData.content = sanitizeEmailHtml(validated.content);
    }
    if (validated.contentType !== undefined) updateData.contentType = validated.contentType;
    if (validated.templateId !== undefined) updateData.templateId = validated.templateId;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.scheduledAt !== undefined) {
      updateData.scheduledAt = validated.scheduledAt ? new Date(validated.scheduledAt) : null;
    }

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        template: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ data: campaign });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/[id]
 * Delete a campaign
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`campaign-delete-${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      );
    }

    // Validate ID
    campaignIdSchema.parse({ id });

    // Check if campaign exists
    const existing = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting campaigns that are currently sending
    if (existing.status === 'SENDING') {
      return NextResponse.json(
        { error: 'Cannot delete campaign while sending' },
        { status: 400 }
      );
    }

    // Delete campaign (cascades to recipients and events)
    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
