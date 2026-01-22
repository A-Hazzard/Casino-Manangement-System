/**
 * Cache utility functions for API performance optimization
 */

// Simple in-memory cache for performance
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generates a cache key from parameters
 * @param params - Object containing parameters to cache
 * @returns String cache key
 */
export function getCacheKey(params: Record<string, unknown>): string {
  return JSON.stringify(params);
}
/**
 * Checks if cached data is still valid
 * @param timestamp - Timestamp when data was cached
 * @returns Boolean indicating if cache is valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}
/**
 * Retrieves data from cache if valid
 * @param key - Cache key
 * @returns Cached data or null if invalid/missing
 */
export function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data as T;
  }

  // Remove expired cache entry
  if (cached) {
    cache.delete(key);
  }

  return null;
}

/**
 * Stores data in cache with current timestamp
 * @param key - Cache key
 * @param data - Data to cache
 */
export function setCachedData(key: string, data: unknown): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clears all cached data
 * Useful for testing or forced refresh
 */
export function clearCache(): void {
  cache.clear();
}

