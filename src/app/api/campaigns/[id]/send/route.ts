import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiRateLimiter } from '@/lib/rate-limit';
import { sendCampaignSchema, queueActionSchema } from '@/lib/validations/queue';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';
import {
  queueCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  retryFailedRecipients,
} from '@/lib/queue';

interface RouteParams {
  id: string;
}

/**
 * POST /api/campaigns/[id]/send - Start sending a campaign
 * Requires authentication - users can only send their own campaigns
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('Campaign ID is required', 400);
    }

    const { id: campaignId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`campaign-send-${context.userId}-${campaignId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests', resetAt: rateLimitResult.resetAt },
        { status: 429 }
      );
    }

    // Validate campaign ID
    if (!campaignId || campaignId.length < 20) {
      return createErrorResponse('Invalid campaign ID', 400);
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

    // Check if campaign exists AND belongs to the user (owner validation)
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: context.userId, // Owner validation
      },
      include: {
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
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
      return createErrorResponse('Campaign has no recipients', 400);
    }

    // Handle scheduled sending
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return createErrorResponse('Scheduled time must be in the future', 400);
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
  } catch (error: unknown) {
    console.error('Campaign send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'campaigns:write' });

/**
 * PATCH /api/campaigns/[id]/send - Control campaign sending (pause, resume, cancel, retry)
 * Requires authentication - users can only control their own campaigns
 */
export const PATCH = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('Campaign ID is required', 400);
    }

    const { id: campaignId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`campaign-action-${context.userId}-${campaignId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests', resetAt: rateLimitResult.resetAt },
        { status: 429 }
      );
    }

    // Validate campaign ID
    if (!campaignId || campaignId.length < 20) {
      return createErrorResponse('Invalid campaign ID', 400);
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

    // Check if campaign exists AND belongs to the user (owner validation)
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: context.userId, // Owner validation
      },
      select: { id: true, status: true },
    });

    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }

    // Handle action
    switch (action) {
      case 'pause': {
        if (campaign.status !== 'SENDING') {
          return createErrorResponse('Can only pause a sending campaign', 400);
        }
        const paused = await pauseCampaign(campaignId);
        return NextResponse.json({
          success: paused,
          message: paused ? 'Campaign paused' : 'Failed to pause campaign',
        });
      }

      case 'resume': {
        if (campaign.status !== 'PAUSED') {
          return createErrorResponse('Can only resume a paused campaign', 400);
        }
        const resumed = await resumeCampaign(campaignId);
        return NextResponse.json({
          success: resumed,
          message: resumed ? 'Campaign resumed' : 'Failed to resume campaign',
        });
      }

      case 'cancel': {
        if (!['SENDING', 'PAUSED', 'SCHEDULED'].includes(campaign.status)) {
          return createErrorResponse('Can only cancel a sending, paused, or scheduled campaign', 400);
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
          return createErrorResponse('Can only retry failed recipients for completed or sending campaigns', 400);
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
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error: unknown) {
    console.error('Campaign action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'campaigns:write' });
