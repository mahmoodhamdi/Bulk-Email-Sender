import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiRateLimiter } from '@/lib/rate-limit';
import { withAuth, createErrorResponse, AuthContext } from '@/lib/auth';
import { getCampaignQueueStatus } from '@/lib/queue';

interface RouteParams {
  id: string;
}

/**
 * GET /api/campaigns/[id]/queue-status - Get campaign queue status
 * Requires authentication - users can only view their own campaign status
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext, params?: RouteParams) => {
  try {
    if (!params?.id) {
      return createErrorResponse('Campaign ID is required', 400);
    }

    const { id: campaignId } = params;

    // Rate limiting
    const rateLimitResult = apiRateLimiter.check(`queue-status-${context.userId}-${campaignId}`);
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

    // Check if campaign exists AND belongs to the user (owner validation)
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: context.userId, // Owner validation
      },
      select: {
        id: true,
        name: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        openedCount: true,
        clickedCount: true,
        bouncedCount: true,
        unsubscribedCount: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!campaign) {
      return createErrorResponse('Campaign not found', 404);
    }

    // Get queue status
    const queueStatus = await getCampaignQueueStatus(campaignId);

    // Get recipient status breakdown
    const recipientStats = await prisma.recipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { status: true },
    });

    const statusBreakdown: Record<string, number> = {};
    for (const stat of recipientStats) {
      statusBreakdown[stat.status] = stat._count.status;
    }

    // Calculate progress metrics
    const processed = campaign.sentCount + campaign.bouncedCount;
    const remaining = campaign.totalRecipients - processed;
    const progress = campaign.totalRecipients > 0
      ? Math.round((processed / campaign.totalRecipients) * 100)
      : 0;

    // Calculate sending rate if campaign is in progress
    let sendingRate: number | null = null;
    let estimatedTimeRemaining: number | null = null;

    if (campaign.startedAt && campaign.sentCount > 0 && remaining > 0) {
      const elapsedSeconds = (Date.now() - campaign.startedAt.getTime()) / 1000;
      sendingRate = Math.round((campaign.sentCount / elapsedSeconds) * 60); // emails per minute
      estimatedTimeRemaining = Math.round((remaining / sendingRate) * 60); // seconds
    }

    return NextResponse.json({
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
        },
        metrics: {
          totalRecipients: campaign.totalRecipients,
          sent: campaign.sentCount,
          delivered: campaign.deliveredCount,
          opened: campaign.openedCount,
          clicked: campaign.clickedCount,
          bounced: campaign.bouncedCount,
          unsubscribed: campaign.unsubscribedCount,
        },
        queue: queueStatus || {
          queued: 0,
          progress: 0,
          status: campaign.status.toLowerCase(),
        },
        progress: {
          percentage: progress,
          processed,
          remaining,
          sendingRate, // emails per minute
          estimatedTimeRemaining, // seconds
        },
        statusBreakdown,
        timing: {
          startedAt: campaign.startedAt,
          completedAt: campaign.completedAt,
          estimatedCompletion: queueStatus?.estimatedCompletion,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requiredPermission: 'campaigns:read' });
