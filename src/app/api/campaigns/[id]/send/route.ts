import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiRateLimiter } from '@/lib/rate-limit';
import { sendCampaignSchema, queueActionSchema } from '@/lib/validations/queue';
import {
  queueCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  retryFailedRecipients,
} from '@/lib/queue';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/campaigns/[id]/send - Start sending a campaign
 */
export async function POST(request: NextRequest, context: RouteContext) {
  // Rate limiting
  const rateLimitResult = await apiRateLimiter.check(
    request.headers.get('x-forwarded-for') || 'anonymous'
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', resetAt: rateLimitResult.resetAt },
      { status: 429 }
    );
  }

  try {
    const { id: campaignId } = await context.params;

    // Validate campaign ID
    if (!campaignId || campaignId.length < 20) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validation = sendCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { priority, batchSize, delayBetweenBatches, smtpConfigId, scheduledAt } =
      validation.data;

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Validate campaign status
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return NextResponse.json(
        {
          error: `Campaign cannot be sent in ${campaign.status} status`,
          currentStatus: campaign.status,
        },
        { status: 400 }
      );
    }

    // Check for recipients
    if (campaign._count.recipients === 0) {
      return NextResponse.json(
        { error: 'Campaign has no recipients' },
        { status: 400 }
      );
    }

    // Handle scheduled sending
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        );
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'SCHEDULED',
          scheduledAt: scheduledDate,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Campaign scheduled successfully',
        scheduledAt: scheduledDate,
        totalRecipients: campaign._count.recipients,
      });
    }

    // Queue the campaign for immediate sending
    const result = await queueCampaign(campaignId, {
      priority,
      batchSize,
      delayBetweenBatches,
      smtpConfigId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to queue campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign sending started',
      queuedCount: result.queuedCount,
      totalRecipients: campaign._count.recipients,
    });
  } catch (error) {
    console.error('Campaign send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns/[id]/send - Control campaign sending (pause, resume, cancel, retry)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  // Rate limiting
  const rateLimitResult = await apiRateLimiter.check(
    request.headers.get('x-forwarded-for') || 'anonymous'
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', resetAt: rateLimitResult.resetAt },
      { status: 429 }
    );
  }

  try {
    const { id: campaignId } = await context.params;

    // Validate campaign ID
    if (!campaignId || campaignId.length < 20) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validation = queueActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { action } = validation.data;

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Handle action
    switch (action) {
      case 'pause': {
        if (campaign.status !== 'SENDING') {
          return NextResponse.json(
            { error: 'Can only pause a sending campaign' },
            { status: 400 }
          );
        }
        const paused = await pauseCampaign(campaignId);
        return NextResponse.json({
          success: paused,
          message: paused ? 'Campaign paused' : 'Failed to pause campaign',
        });
      }

      case 'resume': {
        if (campaign.status !== 'PAUSED') {
          return NextResponse.json(
            { error: 'Can only resume a paused campaign' },
            { status: 400 }
          );
        }
        const resumed = await resumeCampaign(campaignId);
        return NextResponse.json({
          success: resumed,
          message: resumed ? 'Campaign resumed' : 'Failed to resume campaign',
        });
      }

      case 'cancel': {
        if (!['SENDING', 'PAUSED', 'SCHEDULED'].includes(campaign.status)) {
          return NextResponse.json(
            { error: 'Can only cancel a sending, paused, or scheduled campaign' },
            { status: 400 }
          );
        }
        const result = await cancelCampaign(campaignId);
        return NextResponse.json({
          success: result.success,
          message: result.success
            ? `Campaign cancelled, ${result.cancelledJobs} jobs removed`
            : 'Failed to cancel campaign',
          cancelledJobs: result.cancelledJobs,
        });
      }

      case 'retry': {
        if (campaign.status !== 'COMPLETED' && campaign.status !== 'SENDING') {
          return NextResponse.json(
            { error: 'Can only retry failed recipients for completed or sending campaigns' },
            { status: 400 }
          );
        }
        const result = await retryFailedRecipients(campaignId);
        return NextResponse.json({
          success: result.success,
          message: result.success
            ? `Retrying ${result.retriedCount} failed recipients`
            : 'Failed to retry recipients',
          retriedCount: result.retriedCount,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Campaign action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
