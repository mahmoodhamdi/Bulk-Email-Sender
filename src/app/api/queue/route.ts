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
import { workerControlSchema, cleanQueueSchema } from '@/lib/validations/queue';

/**
 * GET /api/queue - Get queue health and statistics
 */
export async function GET(request: NextRequest) {
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
  } catch (error) {
    console.error('Queue health check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/queue - Control queue operations (pause, resume, clean)
 */
export async function POST(request: NextRequest) {
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
  } catch (error) {
    console.error('Queue control error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
