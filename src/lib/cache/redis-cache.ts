/**
 * Redis Caching Layer
 * Provides caching for frequently accessed data with TTL support
 */

import Redis from 'ioredis';

// Cache key prefixes for namespace isolation
export const CACHE_PREFIXES = {
  TEMPLATE: 'cache:template:',
  TEMPLATES_LIST: 'cache:templates:list:',
  CAMPAIGN: 'cache:campaign:',
  CAMPAIGN_STATS: 'cache:campaign:stats:',
  CONTACT: 'cache:contact:',
  USER: 'cache:user:',
  SESSION: 'cache:session:',
} as const;

// Default TTL values in seconds
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 900,           // 15 minutes
  EXTENDED: 3600,      // 1 hour
  DAY: 86400,          // 24 hours
} as const;

// Global cache connection
let cacheConnection: Redis | null = null;
let connectionFailed = false;

/**
 * Parse Redis URL into configuration object
 */
function parseRedisUrl(url: string): {
  host: string;
  port: number;
  password?: string;
  db?: number;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    db: parsed.pathname ? parseInt(parsed.pathname.slice(1) || '0', 10) : 0,
  };
}

/**
 * Get or create Redis connection for caching
 */
function getCacheConnection(): Redis | null {
  // Don't retry if connection already failed
  if (connectionFailed) {
    return null;
  }

  if (!cacheConnection) {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      connectionFailed = true;
      return null;
    }

    try {
      const config = parseRedisUrl(redisUrl);
      cacheConnection = new Redis({
        ...config,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            connectionFailed = true;
            return null;
          }
          return Math.min(times * 100, 1000);
        },
      });

      cacheConnection.on('error', () => {
        // Silently handle errors - caching is optional
      });
    } catch {
      connectionFailed = true;
      return null;
    }
  }

  return cacheConnection;
}

/**
 * Check if caching is available
 */
export function isCacheAvailable(): boolean {
  const connection = getCacheConnection();
  return connection !== null && connection.status === 'ready';
}

/**
 * Get a cached value by key
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const connection = getCacheConnection();
  if (!connection) return null;

  try {
    const value = await connection.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with optional TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
  const connection = getCacheConnection();
  if (!connection) return false;

  try {
    const serialized = JSON.stringify(value);
    await connection.setex(key, ttlSeconds, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a cached value
 */
export async function cacheDelete(key: string): Promise<boolean> {
  const connection = getCacheConnection();
  if (!connection) return false;

  try {
    await connection.del(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete multiple cached values by pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  const connection = getCacheConnection();
  if (!connection) return 0;

  try {
    const keys = await connection.keys(pattern);
    if (keys.length === 0) return 0;
    return await connection.del(...keys);
  } catch {
    return 0;
  }
}

/**
 * Get or set cached value (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const fresh = await factory();

  // Cache the result (fire and forget)
  cacheSet(key, fresh, ttlSeconds).catch(() => {});

  return fresh;
}

// ==================== Template Caching ====================

/**
 * Cache a single template
 */
export async function cacheTemplate<T>(id: string, template: T): Promise<boolean> {
  return cacheSet(`${CACHE_PREFIXES.TEMPLATE}${id}`, template, CACHE_TTL.LONG);
}

/**
 * Get cached template
 */
export async function getCachedTemplate<T>(id: string): Promise<T | null> {
  return cacheGet<T>(`${CACHE_PREFIXES.TEMPLATE}${id}`);
}

/**
 * Invalidate template cache
 */
export async function invalidateTemplateCache(id: string): Promise<void> {
  await cacheDelete(`${CACHE_PREFIXES.TEMPLATE}${id}`);
  // Also invalidate any list caches
  await cacheDeletePattern(`${CACHE_PREFIXES.TEMPLATES_LIST}*`);
}

/**
 * Cache templates list
 */
export async function cacheTemplatesList<T>(
  userId: string | null,
  category: string | null,
  page: number,
  templates: T
): Promise<boolean> {
  const key = `${CACHE_PREFIXES.TEMPLATES_LIST}${userId || 'all'}:${category || 'all'}:${page}`;
  return cacheSet(key, templates, CACHE_TTL.MEDIUM);
}

/**
 * Get cached templates list
 */
export async function getCachedTemplatesList<T>(
  userId: string | null,
  category: string | null,
  page: number
): Promise<T | null> {
  const key = `${CACHE_PREFIXES.TEMPLATES_LIST}${userId || 'all'}:${category || 'all'}:${page}`;
  return cacheGet<T>(key);
}

// ==================== Campaign Caching ====================

/**
 * Cache campaign data
 */
export async function cacheCampaign<T>(id: string, campaign: T): Promise<boolean> {
  return cacheSet(`${CACHE_PREFIXES.CAMPAIGN}${id}`, campaign, CACHE_TTL.MEDIUM);
}

/**
 * Get cached campaign
 */
export async function getCachedCampaign<T>(id: string): Promise<T | null> {
  return cacheGet<T>(`${CACHE_PREFIXES.CAMPAIGN}${id}`);
}

/**
 * Invalidate campaign cache
 */
export async function invalidateCampaignCache(id: string): Promise<void> {
  await cacheDelete(`${CACHE_PREFIXES.CAMPAIGN}${id}`);
  await cacheDelete(`${CACHE_PREFIXES.CAMPAIGN_STATS}${id}`);
}

/**
 * Cache campaign statistics
 */
export async function cacheCampaignStats<T>(id: string, stats: T): Promise<boolean> {
  return cacheSet(`${CACHE_PREFIXES.CAMPAIGN_STATS}${id}`, stats, CACHE_TTL.SHORT);
}

/**
 * Get cached campaign statistics
 */
export async function getCachedCampaignStats<T>(id: string): Promise<T | null> {
  return cacheGet<T>(`${CACHE_PREFIXES.CAMPAIGN_STATS}${id}`);
}

// ==================== User/Session Caching ====================

/**
 * Cache user data
 */
export async function cacheUser<T>(id: string, user: T): Promise<boolean> {
  return cacheSet(`${CACHE_PREFIXES.USER}${id}`, user, CACHE_TTL.EXTENDED);
}

/**
 * Get cached user
 */
export async function getCachedUser<T>(id: string): Promise<T | null> {
  return cacheGet<T>(`${CACHE_PREFIXES.USER}${id}`);
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(id: string): Promise<void> {
  await cacheDelete(`${CACHE_PREFIXES.USER}${id}`);
}

/**
 * Cache session data
 */
export async function cacheSession<T>(token: string, session: T): Promise<boolean> {
  return cacheSet(`${CACHE_PREFIXES.SESSION}${token}`, session, CACHE_TTL.EXTENDED);
}

/**
 * Get cached session
 */
export async function getCachedSession<T>(token: string): Promise<T | null> {
  return cacheGet<T>(`${CACHE_PREFIXES.SESSION}${token}`);
}

/**
 * Invalidate session cache
 */
export async function invalidateSessionCache(token: string): Promise<void> {
  await cacheDelete(`${CACHE_PREFIXES.SESSION}${token}`);
}

// ==================== Cache Management ====================

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<boolean> {
  const connection = getCacheConnection();
  if (!connection) return false;

  try {
    const keys = await connection.keys('cache:*');
    if (keys.length > 0) {
      await connection.del(...keys);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  available: boolean;
  keyCount: number;
  memoryUsage?: string;
}> {
  const connection = getCacheConnection();
  if (!connection) {
    return { available: false, keyCount: 0 };
  }

  try {
    const keys = await connection.keys('cache:*');
    const info = await connection.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\S+)/);

    return {
      available: true,
      keyCount: keys.length,
      memoryUsage: memoryMatch ? memoryMatch[1] : undefined,
    };
  } catch {
    return { available: false, keyCount: 0 };
  }
}

/**
 * Close cache connection
 */
export async function closeCacheConnection(): Promise<void> {
  if (cacheConnection) {
    await cacheConnection.quit();
    cacheConnection = null;
  }
}
