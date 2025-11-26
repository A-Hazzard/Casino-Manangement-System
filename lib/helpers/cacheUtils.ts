/**
 * Cache Utility Functions
 *
 * Provides in-memory caching utilities for API performance optimization.
 * It implements a simple TTL-based cache system to reduce redundant API calls
 * and improve application responsiveness.
 *
 * Features:
 * - In-memory cache with configurable TTL (default: 5 minutes).
 * - Cache key generation from parameters.
 * - Cache validation and expiration checking.
 * - Cache statistics and management utilities.
 */

// ============================================================================
// Cache Configuration
// ============================================================================

// Simple in-memory cache for performance
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Generates a cache key from parameters
 *
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
export function isCacheValid(timestamp: number): boolean {
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

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clears all cached data
 * Useful for testing or forced refresh
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Gets cache statistics
 * @returns Object with cache size and entry count
 */
export function getCacheStats() {
  return {
    entryCount: cache.size,
    entries: Array.from(cache.keys()),
  };
}
