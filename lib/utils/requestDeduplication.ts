/**
 * Request Deduplication Utility
 * Prevents duplicate API calls by tracking in-flight requests
 */

type RequestKey = string;
type RequestPromise<T> = Promise<T>;

// Global map to track in-flight requests
const inFlightRequests = new Map<
  RequestKey,
  { promise: RequestPromise<unknown>; controller: AbortController }
>();

/**
 * Normalizes a URL by removing cache-busting and pagination parameters that don't affect data
 * This allows requests with the same core parameters to be deduplicated
 *
 * @param url - Full URL with query parameters
 * @returns Normalized URL key for deduplication
 */
function normalizeRequestKey(url: string): string {
  try {
    const [basePath, queryString] = url.split('?');
    if (!queryString) return url;

    const params = new URLSearchParams(queryString);

    // Remove cache-busting parameters that don't affect the actual data
    params.delete('clearCache');

    // For locationAggregation, remove pagination params if limit is very high (means "get all")
    // This allows requests with different pagination to be deduplicated if they're requesting all data
    const limit = params.get('limit');
    if (limit && parseInt(limit, 10) >= 1000000) {
      params.delete('limit');
      params.delete('page');
    }

    // Normalize currency: if currency is missing for locationAggregation, default to USD
    // This allows requests with and without explicit currency to be deduplicated
    // (assuming the API defaults to USD when currency is not specified)
    if (basePath.includes('locationAggregation') && !params.has('currency')) {
      params.set('currency', 'USD');
    }

    // Sort parameters for consistent key generation
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return sortedParams ? `${basePath}?${sortedParams}` : basePath;
  } catch {
    // If parsing fails, return original URL
    return url;
  }
}

/**
 * Deduplicates API requests by key
 * If a request with the same normalized key is already in flight, returns the existing promise
 * Otherwise, creates a new request
 *
 * @param key - Unique key for the request (e.g., URL with params)
 * @param requestFn - Function that makes the API call
 * @returns Promise that resolves to the request result
 */
export async function deduplicateRequest<T>(
  key: RequestKey,
  requestFn: (signal: AbortSignal) => RequestPromise<T>
): Promise<T> {
  // Normalize the key to ignore cache-busting and pagination params
  const normalizedKey = normalizeRequestKey(key);

  // Check if request is already in flight
  const existing = inFlightRequests.get(normalizedKey);
  if (existing) {
    // Return existing promise
    return existing.promise as Promise<T>;
  }

  // Create new AbortController for this request
  const controller = new AbortController();
  const promise = requestFn(controller.signal)
    .then(result => {
      // Remove from map when request completes
      inFlightRequests.delete(normalizedKey);
      return result;
    })
    .catch(error => {
      // Remove from map on error
      inFlightRequests.delete(normalizedKey);
      throw error;
    });

  // Store in-flight request with normalized key
  inFlightRequests.set(normalizedKey, { promise, controller });

  return promise as Promise<T>;
}

/**
 * Cancels an in-flight request by key
 * @param key - Unique key for the request
 */
export function cancelRequest(key: RequestKey): void {
  const existing = inFlightRequests.get(key);
  if (existing) {
    existing.controller.abort();
    inFlightRequests.delete(key);
  }
}

/**
 * Clears all in-flight requests (useful for cleanup)
 */
export function clearAllRequests(): void {
  inFlightRequests.forEach(({ controller }) => {
    controller.abort();
  });
  inFlightRequests.clear();
}
