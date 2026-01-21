import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  message?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: HealthCheck[];
}

/**
 * GET /api/health
 * Comprehensive health check endpoint for monitoring
 */
export async function GET() {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Database health check
  const dbCheck = await checkDatabase();
  checks.push(dbCheck);
  if (dbCheck.status === 'unhealthy') overallStatus = 'unhealthy';
  else if (dbCheck.status === 'degraded' && overallStatus === 'healthy') overallStatus = 'degraded';

  // Redis health check (optional - only if configured)
  if (process.env.REDIS_URL) {
    const redisCheck = await checkRedis();
    checks.push(redisCheck);
    if (redisCheck.status === 'unhealthy' && overallStatus === 'healthy') overallStatus = 'degraded';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  return NextResponse.json(response, { status: statusCode });
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      name: 'database',
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Dynamic import to avoid errors if Redis is not configured
    const { checkRedisHealth } = await import('@/lib/queue');
    const health = await checkRedisHealth();
    return {
      name: 'redis',
      status: health.connected ? 'healthy' : 'unhealthy',
      latency: health.latency || Date.now() - start,
      message: health.error,
    };
  } catch (error) {
    return {
      name: 'redis',
      status: 'degraded',
      latency: Date.now() - start,
      message: 'Redis check skipped - not configured',
    };
  }
}
