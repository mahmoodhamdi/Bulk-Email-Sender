import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter } from '@/lib/rate-limit';
import {
  getQueueHealth,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  checkRedisHealth,
  getWorkerStatus,
} from '@/lib/queue';
import { cleanQueueSchema } from '@/lib/validations/queue';
import { withAuth, AuthContext } from '@/lib/auth';

/**
 * GET /api/queue - Get queue health and statistics
 * Requires admin role - queue operations are sensitive
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  // Rate limiting
  const rateLimitResult = apiRateLimiter.check(`queue-health-${context.userId}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', resetAt: rateLimitResult.resetAt },
      { status: 429 }
    );
  }

  try {
    // Get queue health
    const [queueHealth, redisHealth, workerStatus] = await Promise.all([
      getQueueHealth(),
      checkRedisHealth(),
      Promise.resolve(getWorkerStatus()),
    ]);

    return NextResponse.json({
      data: {
        healthy: queueHealth.healthy && redisHealth.connected,
        redis: {
          connected: redisHealth.connected,
          latency: redisHealth.latency,
          error: redisHealth.error,
        },
        queue: {
          stats: queueHealth.stats,
          activeCampaigns: queueHealth.activeCampaigns,
        },
        worker: {
          running: workerStatus.running,
          paused: workerStatus.paused,
          concurrency: workerStatus.concurrency,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Queue health check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requireAdmin: true });

/**
 * POST /api/queue - Control queue operations (pause, resume, clean)
 * Requires admin role - queue operations are destructive
 */
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  // Rate limiting
  const rateLimitResult = apiRateLimiter.check(`queue-control-${context.userId}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', resetAt: rateLimitResult.resetAt },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'pause': {
        await pauseQueue();
        return NextResponse.json({
          success: true,
          message: 'Queue paused',
        });
      }

      case 'resume': {
        await resumeQueue();
        return NextResponse.json({
          success: true,
          message: 'Queue resumed',
        });
      }

      case 'clean': {
        const validation = cleanQueueSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Validation error',
              details: validation.error.errors,
            },
            { status: 400 }
          );
        }

        const { gracePeriod, limit, status } = validation.data;
        const removedJobs = await cleanQueue(gracePeriod, limit, status);

        return NextResponse.json({
          success: true,
          message: `Cleaned ${removedJobs.length} ${status} jobs`,
          removedCount: removedJobs.length,
        });
      }

      case 'stats': {
        const stats = await getQueueStats();
        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Valid actions: pause, resume, clean, stats' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('Queue control error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { requireAdmin: true });
