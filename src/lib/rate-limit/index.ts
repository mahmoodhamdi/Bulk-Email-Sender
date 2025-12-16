/**
 * Rate Limiting Module
 * Exports both in-memory (for simple deployments) and Redis-based (for distributed) rate limiters
 */

// In-memory rate limiting (original implementation)
export {
  checkRateLimit,
  rateLimitMiddleware,
  createRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  smtpTestRateLimiter,
  emailSendRateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
} from '../rate-limit';

// Redis-based distributed rate limiting
export {
  checkRateLimitRedis,
  checkRateLimitMemory,
  checkRateLimitHybrid,
  createDistributedRateLimiter,
  distributedApiLimiter,
  distributedAuthLimiter,
  distributedSmtpTestLimiter,
  distributedEmailSendLimiter,
} from './redis-rate-limit';
