/**
 * Cache Module
 * Export all caching functionality
 */

export {
  // Constants
  CACHE_PREFIXES,
  CACHE_TTL,
  // Core functions
  isCacheAvailable,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetOrSet,
  // Template caching
  cacheTemplate,
  getCachedTemplate,
  invalidateTemplateCache,
  cacheTemplatesList,
  getCachedTemplatesList,
  // Campaign caching
  cacheCampaign,
  getCachedCampaign,
  invalidateCampaignCache,
  cacheCampaignStats,
  getCachedCampaignStats,
  // User caching
  cacheUser,
  getCachedUser,
  invalidateUserCache,
  // Session caching
  cacheSession,
  getCachedSession,
  invalidateSessionCache,
  // Cache management
  clearAllCache,
  getCacheStats,
  closeCacheConnection,
} from './redis-cache';
