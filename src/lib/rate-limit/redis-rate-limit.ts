/**
 * Redis-based rate limiting for distributed deployments
 * Uses sliding window algorithm for accurate rate limiting
 */

import Redis from 'ioredis';
import { getQueueConnection, getRedisStatus } from '../queue/redis';

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key prefix for Redis (default: 'ratelimit') */
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

// Lua script for atomic rate limiting (sliding window)
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local windowStart = now - windowMs

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count current requests in window
local current = redis.call('ZCARD', key)

-- Check if under limit
if current < limit then
  -- Add new request with current timestamp as score
  redis.call('ZADD', key, now, now .. '-' .. math.random())
  -- Set expiry on key
  redis.call('PEXPIRE', key, windowMs)
  return {1, limit - current - 1, now + windowMs, current + 1}
else
  -- Get oldest entry to calculate reset time
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetAt = oldest[2] and (tonumber(oldest[2]) + windowMs) or (now + windowMs)
  return {0, 0, resetAt, current}
end
`;

// Script SHA cache
let scriptSha: string | null = null;

/**
 * Load the rate limit script into Redis
 */
async function loadScript(redis: Redis): Promise<string> {
  if (scriptSha) {
    // Verify script still exists
    const exists = await redis.script('EXISTS', scriptSha);
    if ((exists as number[])[0] === 1) {
      return scriptSha;
    }
  }

  scriptSha = await redis.script('LOAD', RATE_LIMIT_SCRIPT) as string;
  return scriptSha;
}

/**
 * Check rate limit using Redis
 */
export async function checkRateLimitRedis(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const prefix = config.prefix || 'ratelimit';
  const key = `${prefix}:${identifier}`;
  const now = Date.now();

  try {
    const redis = getQueueConnection();

    // Check if Redis is connected
    if (getRedisStatus() !== 'connected') {
      throw new Error('Redis not connected');
    }

    const sha = await loadScript(redis);

    const result = await redis.evalsha(
      sha,
      1,
      key,
      config.limit.toString(),
      config.windowMs.toString(),
      now.toString()
    ) as [number, number, number, number];

    return {
      success: result[0] === 1,
      remaining: result[1],
      resetAt: result[2],
      current: result[3],
    };
  } catch (error) {
    // Log error but don't throw - let caller handle fallback
    console.error('[RateLimit] Redis error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * In-memory fallback rate limiter (for when Redis is unavailable)
 */
interface InMemoryRecord {
  count: number;
  resetAt: number;
}

const inMemoryStore = new Map<string, InMemoryRecord>();
const MAX_MEMORY_STORE_SIZE = 10000;

// Cleanup old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of inMemoryStore.entries()) {
      if (record.resetAt < now) {
        inMemoryStore.delete(key);
      }
    }
    // Evict if too large
    if (inMemoryStore.size > MAX_MEMORY_STORE_SIZE) {
      const entries = Array.from(inMemoryStore.entries());
      entries
        .sort((a, b) => a[1].resetAt - b[1].resetAt)
        .slice(0, inMemoryStore.size - MAX_MEMORY_STORE_SIZE + 1000)
        .forEach(([key]) => inMemoryStore.delete(key));
    }
  }, 60000);
}

export function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = inMemoryStore.get(identifier);

  // Handle zero limit case - always deny
  if (config.limit <= 0) {
    return {
      success: false,
      remaining: 0,
      resetAt: now + config.windowMs,
      current: 0,
    };
  }

  if (!record || record.resetAt < now) {
    const resetAt = now + config.windowMs;
    inMemoryStore.set(identifier, { count: 1, resetAt });
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt,
      current: 1,
    };
  }

  record.count++;
  inMemoryStore.set(identifier, record);

  return {
    success: record.count <= config.limit,
    remaining: Math.max(0, config.limit - record.count),
    resetAt: record.resetAt,
    current: record.count,
  };
}

/**
 * Hybrid rate limiter - uses Redis when available, falls back to memory
 */
export async function checkRateLimitHybrid(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    return await checkRateLimitRedis(identifier, config);
  } catch {
    // Fall back to in-memory
    return checkRateLimitMemory(identifier, config);
  }
}

/**
 * Create a distributed rate limiter with specific configuration
 */
export function createDistributedRateLimiter(config: RateLimitConfig) {
  return {
    /**
     * Check rate limit (async - uses Redis with memory fallback)
     */
    check: async (identifier: string): Promise<RateLimitResult> => {
      return checkRateLimitHybrid(identifier, config);
    },

    /**
     * Check rate limit synchronously (memory only - for backward compatibility)
     */
    checkSync: (identifier: string): RateLimitResult => {
      return checkRateLimitMemory(identifier, config);
    },

    /**
     * Middleware for API routes
     */
    middleware: async (request: Request): Promise<Response | null> => {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous';

      const result = await checkRateLimitHybrid(ip, config);

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
    },
  };
}

// Pre-configured distributed rate limiters
export const distributedApiLimiter = createDistributedRateLimiter({
  limit: 100,
  windowMs: 60000,
  prefix: 'api',
});

export const distributedAuthLimiter = createDistributedRateLimiter({
  limit: 5,
  windowMs: 60000,
  prefix: 'auth',
});

export const distributedSmtpTestLimiter = createDistributedRateLimiter({
  limit: 5,
  windowMs: 300000,
  prefix: 'smtp',
});

export const distributedEmailSendLimiter = createDistributedRateLimiter({
  limit: 10,
  windowMs: 60000,
  prefix: 'email',
});
