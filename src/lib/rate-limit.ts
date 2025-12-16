/**
 * Simple in-memory rate limiting for API routes
 * For production, consider using Redis-based rate limiting like @upstash/ratelimit
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// Maximum number of unique identifiers to track (prevents memory leak)
const MAX_STORE_SIZE = 10000;

// In-memory store - in production use Redis
const store = new Map<string, RateLimitRecord>();

/**
 * Evict oldest entries when store exceeds max size
 * This prevents unbounded memory growth from unique IPs
 */
function evictOldestEntries(): void {
  if (store.size <= MAX_STORE_SIZE) return;

  const entriesToRemove = store.size - MAX_STORE_SIZE + 1000; // Remove extra 1000 for buffer
  const entries = Array.from(store.entries());

  // Sort by resetAt (oldest first) and remove oldest entries
  entries
    .sort((a, b) => a[1].resetAt - b[1].resetAt)
    .slice(0, entriesToRemove)
    .forEach(([key]) => store.delete(key));
}

// Cleanup old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt < now) {
        store.delete(key);
      }
    }
    // Also check and evict if store is too large
    evictOldestEntries();
  }, 60000); // Cleanup every minute
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
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

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 10, windowMs: 60000 }
): RateLimitResult {
  const now = Date.now();
  const record = store.get(identifier);

  // If no record or window has expired, create new record
  if (!record || record.resetAt < now) {
    const resetAt = now + config.windowMs;
    store.set(identifier, { count: 1, resetAt });
    // Prevent memory leak by evicting old entries when store grows too large
    if (store.size > MAX_STORE_SIZE) {
      evictOldestEntries();
    }
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt,
      current: 1,
    };
  }

  // Increment count
  record.count++;
  store.set(identifier, record);

  // Check if over limit
  const success = record.count <= config.limit;
  return {
    success,
    remaining: Math.max(0, config.limit - record.count),
    resetAt: record.resetAt,
    current: record.count,
  };
}

/**
 * Rate limiting middleware wrapper for API routes
 * Returns a Response object if rate limited, or null to continue
 */
export async function rateLimitMiddleware(
  request: Request,
  config: RateLimitConfig = { limit: 10, windowMs: 60000 }
): Promise<Response | null> {
  // Get client identifier (IP or forwarded IP)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous';

  const result = checkRateLimit(ip, config);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
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
 * Create a rate limiter with specific configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  return {
    check: (identifier: string) => checkRateLimit(identifier, config),
    middleware: (request: Request) => rateLimitMiddleware(request, config),
  };
}

// Pre-configured rate limiters
export const apiRateLimiter = createRateLimiter({ limit: 100, windowMs: 60000 }); // 100 req/min
export const authRateLimiter = createRateLimiter({ limit: 5, windowMs: 60000 }); // 5 req/min
export const smtpTestRateLimiter = createRateLimiter({ limit: 5, windowMs: 300000 }); // 5 req/5min
export const emailSendRateLimiter = createRateLimiter({ limit: 10, windowMs: 60000 }); // 10 req/min
