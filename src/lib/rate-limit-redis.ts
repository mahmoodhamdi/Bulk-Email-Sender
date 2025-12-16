/**
 * Redis-based rate limiting for distributed environments
 * Uses sliding window algorithm for accurate rate limiting
 */

import { getQueueConnection, getRedisStatus } from './queue/redis';
import type Redis from 'ioredis';

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional prefix for Redis keys */
  prefix?: string;
}

export interface RateLimitResult {
  /** Whether the request should be allowed */
  success: boolean;
  /** Number of remaining requests in the window */
  remaining: number;
  /** Time when the limit resets (Unix timestamp ms) */
  resetAt: number;
  /** Current request count */
  current: number;
}

// In-memory fallback store when Redis is unavailable
interface FallbackRecord {
  count: number;
  resetAt: number;
}
const fallbackStore = new Map<string, FallbackRecord>();
const MAX_FALLBACK_SIZE = 10000;

/**
 * Clean up expired entries from fallback store
 */
function cleanupFallbackStore(): void {
  const now = Date.now();
  for (const [key, record] of fallbackStore.entries()) {
    if (record.resetAt < now) {
      fallbackStore.delete(key);
    }
  }
  // Evict oldest entries if store is too large
  if (fallbackStore.size > MAX_FALLBACK_SIZE) {
    const entries = Array.from(fallbackStore.entries());
    entries
      .sort((a, b) => a[1].resetAt - b[1].resetAt)
      .slice(0, fallbackStore.size - MAX_FALLBACK_SIZE + 1000)
      .forEach(([key]) => fallbackStore.delete(key));
  }
}

// Cleanup fallback store periodically
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupFallbackStore, 60000);
}

/**
 * In-memory fallback rate limiting when Redis is unavailable
 */
function checkRateLimitFallback(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `${config.prefix || 'ratelimit'}:${identifier}`;
  const record = fallbackStore.get(key);

  if (!record || record.resetAt < now) {
    const resetAt = now + config.windowMs;
    fallbackStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt,
      current: 1,
    };
  }

  record.count++;
  fallbackStore.set(key, record);

  const success = record.count <= config.limit;
  return {
    success,
    remaining: Math.max(0, config.limit - record.count),
    resetAt: record.resetAt,
    current: record.count,
  };
}

/**
 * Check rate limit using Redis sliding window algorithm
 *
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimitRedis(
  identifier: string,
  config: RateLimitConfig = { limit: 10, windowMs: 60000 }
): Promise<RateLimitResult> {
  // Check if Redis is available
  if (getRedisStatus() !== 'connected') {
    console.warn('[Rate Limit] Redis not connected, using in-memory fallback');
    return checkRateLimitFallback(identifier, config);
  }

  let redis: Redis;
  try {
    redis = getQueueConnection();
  } catch {
    console.warn('[Rate Limit] Failed to get Redis connection, using fallback');
    return checkRateLimitFallback(identifier, config);
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `${config.prefix || 'ratelimit'}:${identifier}`;

  try {
    // Use Lua script for atomic sliding window operation
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local windowMs = tonumber(ARGV[3])
      local limit = tonumber(ARGV[4])

      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

      -- Count current requests in window
      local count = redis.call('ZCARD', key)

      -- Check if under limit
      if count < limit then
        -- Add new request
        redis.call('ZADD', key, now, now .. '-' .. math.random())
        -- Set expiry on the key
        redis.call('PEXPIRE', key, windowMs)
        return {1, count + 1, limit - count - 1}
      else
        return {0, count, 0}
      end
    `;

    const result = await redis.eval(
      luaScript,
      1,
      key,
      now.toString(),
      windowStart.toString(),
      config.windowMs.toString(),
      config.limit.toString()
    ) as [number, number, number];

    const [success, current, remaining] = result;
    const resetAt = now + config.windowMs;

    return {
      success: success === 1,
      remaining: Math.max(0, remaining),
      resetAt,
      current,
    };
  } catch (error) {
    console.error('[Rate Limit] Redis error, using fallback:', error);
    return checkRateLimitFallback(identifier, config);
  }
}

/**
 * Rate limiting middleware wrapper for API routes (async Redis version)
 * Returns a Response object if rate limited, or null to continue
 */
export async function rateLimitMiddlewareRedis(
  request: Request,
  config: RateLimitConfig = { limit: 10, windowMs: 60000 }
): Promise<Response | null> {
  // Get client identifier (IP or forwarded IP)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous';

  const result = await checkRateLimitRedis(ip, config);

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Create a Redis-based rate limiter with specific configuration
 */
export function createRedisRateLimiter(config: RateLimitConfig) {
  return {
    check: (identifier: string) => checkRateLimitRedis(identifier, config),
    middleware: (request: Request) => rateLimitMiddlewareRedis(request, config),
  };
}

/**
 * Reset rate limit for an identifier (useful for testing or admin actions)
 */
export async function resetRateLimit(
  identifier: string,
  prefix: string = 'ratelimit'
): Promise<boolean> {
  if (getRedisStatus() !== 'connected') {
    const key = `${prefix}:${identifier}`;
    fallbackStore.delete(key);
    return true;
  }

  try {
    const redis = getQueueConnection();
    const key = `${prefix}:${identifier}`;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('[Rate Limit] Failed to reset:', error);
    return false;
  }
}

/**
 * Get current rate limit status for an identifier without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig = { limit: 10, windowMs: 60000 }
): Promise<RateLimitResult> {
  if (getRedisStatus() !== 'connected') {
    const key = `${config.prefix || 'ratelimit'}:${identifier}`;
    const record = fallbackStore.get(key);
    const now = Date.now();

    if (!record || record.resetAt < now) {
      return {
        success: true,
        remaining: config.limit,
        resetAt: now + config.windowMs,
        current: 0,
      };
    }

    return {
      success: record.count < config.limit,
      remaining: Math.max(0, config.limit - record.count),
      resetAt: record.resetAt,
      current: record.count,
    };
  }

  try {
    const redis = getQueueConnection();
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const key = `${config.prefix || 'ratelimit'}:${identifier}`;

    // Remove expired entries and count
    await redis.zremrangebyscore(key, '-inf', windowStart);
    const current = await redis.zcard(key);

    return {
      success: current < config.limit,
      remaining: Math.max(0, config.limit - current),
      resetAt: now + config.windowMs,
      current,
    };
  } catch (error) {
    console.error('[Rate Limit] Failed to get status:', error);
    return {
      success: true,
      remaining: config.limit,
      resetAt: Date.now() + config.windowMs,
      current: 0,
    };
  }
}

// Pre-configured Redis-based rate limiters
export const apiRateLimiterRedis = createRedisRateLimiter({
  limit: 100,
  windowMs: 60000,
  prefix: 'api',
}); // 100 req/min

export const authRateLimiterRedis = createRedisRateLimiter({
  limit: 5,
  windowMs: 60000,
  prefix: 'auth',
}); // 5 req/min

export const smtpTestRateLimiterRedis = createRedisRateLimiter({
  limit: 5,
  windowMs: 300000,
  prefix: 'smtp',
}); // 5 req/5min

export const emailSendRateLimiterRedis = createRedisRateLimiter({
  limit: 10,
  windowMs: 60000,
  prefix: 'email',
}); // 10 req/min

export const webhookRateLimiterRedis = createRedisRateLimiter({
  limit: 50,
  windowMs: 60000,
  prefix: 'webhook',
}); // 50 req/min
