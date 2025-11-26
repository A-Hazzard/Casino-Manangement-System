/**
 * User Data Cache Utilities
 *
 * User data cache utility to prevent excessive API calls and provide
 * a centralized way to cache user data with TTL.
 *
 * Features:
 * - In-memory user data cache with TTL
 * - Singleton cache instance
 * - In-flight request de-duplication
 * - Typed cache keys for common user data
 */

// ============================================================================
// Types
// ============================================================================
type CachedUserData = {
  data: unknown;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
};

// ============================================================================
// UserCache Class
// ============================================================================
class UserCache {
  private cache = new Map<string, CachedUserData>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached user data.
   */
  get(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached user data.
   */
  set(key: string, data: unknown, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear specific cache entry.
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Check if cache entry exists and is valid.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics.
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create a singleton instance
export const userCache = new UserCache();

// Track in-flight requests so concurrent callers share the same promise
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Cache keys for different types of user data
 */
export const CACHE_KEYS = {
  CURRENT_USER: 'current_user',
  USER_PROFILE: 'user_profile',
  USER_PERMISSIONS: 'user_permissions',
} as const;

/**
 * Wrapper function to fetch user data with caching
 */
export async function fetchUserWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T | null> {
  // Check cache first
  const cached = userCache.get(key);
  if (cached) {
    console.warn(`Cache hit for ${key}`);
    return cached as T;
  }

  if (inFlightRequests.has(key)) {
    console.warn(`Waiting for in-flight request for ${key}`);
    try {
      const data = (await inFlightRequests.get(key)) as T;
      return data ?? null;
    } catch (error) {
      console.error(`In-flight request for ${key} failed:`, error);
      return null;
    }
  }

  // Fetch from API
  console.warn(`Cache miss for ${key}, fetching from API`);
  const fetchPromise = (async () => {
  try {
    const data = await fetchFn();
    userCache.set(key, data, ttl);
    return data;
  } catch (error) {
    console.error(`Failed to fetch ${key}:`, error);
      throw error;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, fetchPromise);

  try {
    return (await fetchPromise) as T;
  } catch {
    return null;
  }
}

/**
 * Clear all user-related cache entries
 */
export function clearUserCache(): void {
  Object.values(CACHE_KEYS).forEach(key => {
    userCache.clear(key);
  });
}
