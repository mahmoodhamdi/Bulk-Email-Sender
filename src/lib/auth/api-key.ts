import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

/**
 * API Key prefix for identification
 */
export const API_KEY_PREFIX = 'bes_';

/**
 * Generate a new API key
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const key = `${API_KEY_PREFIX}${randomBytes}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 12); // "bes_" + 8 chars

  return { key, hash, prefix };
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith(API_KEY_PREFIX)) {
      return token;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader?.startsWith(API_KEY_PREFIX)) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Validate API key and return user info
 */
export async function validateApiKey(
  apiKey: string
): Promise<{
  valid: boolean;
  userId?: string;
  permissions?: string[];
  error?: string;
}> {
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const hashedKey = hashApiKey(apiKey);

  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!apiKeyRecord) {
    return { valid: false, error: 'API key not found' };
  }

  if (!apiKeyRecord.isActive) {
    return { valid: false, error: 'API key is disabled' };
  }

  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  if (!apiKeyRecord.user.isActive) {
    return { valid: false, error: 'User account is disabled' };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    userId: apiKeyRecord.userId,
    permissions: apiKeyRecord.permissions,
  };
}

/**
 * Check if API key has required permission
 */
export function hasPermission(
  permissions: string[],
  required: string | string[]
): boolean {
  const requiredPerms = Array.isArray(required) ? required : [required];

  // Check for wildcard permissions
  if (permissions.includes('*')) {
    return true;
  }

  // Check for category wildcard (e.g., "campaigns:*")
  for (const req of requiredPerms) {
    const [category] = req.split(':');
    if (permissions.includes(`${category}:*`)) {
      return true;
    }
    if (permissions.includes(req)) {
      return true;
    }
  }

  return false;
}

/**
 * API key rate limiting check
 * Simple in-memory rate limiter for API keys
 */
const apiKeyRateLimits: Map<string, { count: number; resetAt: number }> = new Map();

export async function checkApiKeyRateLimit(
  apiKeyId: string,
  limit: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  const resetAt = now + hourInMs;

  const current = apiKeyRateLimits.get(apiKeyId);

  if (!current || current.resetAt < now) {
    // New window or expired window
    apiKeyRateLimits.set(apiKeyId, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(resetAt),
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(current.resetAt),
    };
  }

  current.count++;
  apiKeyRateLimits.set(apiKeyId, current);

  return {
    allowed: true,
    remaining: limit - current.count,
    resetAt: new Date(current.resetAt),
  };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitEntries(): void {
  const now = Date.now();
  for (const [key, value] of apiKeyRateLimits.entries()) {
    if (value.resetAt < now) {
      apiKeyRateLimits.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitEntries, 5 * 60 * 1000);
}
