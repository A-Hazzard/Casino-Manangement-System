'use client';

import { useState, useCallback, useRef } from 'react';
import { AxiosResponse } from 'axios';
import { classifyError, isRetryableError } from '@/lib/utils/errorHandling';
import type { ApiError } from '@/lib/types/errors';
import type {
  UseApiWithRetryOptions,
  UseApiWithRetryReturn,
} from '@/lib/types/apiHooks';

// Types moved to lib/types/apiHooks.ts

/**
 * Custom hook for making API calls with automatic retry logic
 *
 * @param apiFunction - The API function to execute
 * @param options - Configuration options for retry behavior
 * @returns Hook state and methods
 */
export function useApiWithRetry<T>(
  apiFunction: (...args: unknown[]) => Promise<AxiosResponse<T>>,
  options: UseApiWithRetryOptions = {}
): UseApiWithRetryReturn<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    timeout = 300000,
    onError,
    onRetry,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      // Cancel previous request if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);
      setError(null);
      setRetryCount(0);

      let lastError: ApiError | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Add timeout to the request
          const timeoutPromise = new Promise<never>((_, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error(`Request timed out after ${timeout}ms`));
            }, timeout);

            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
            });
          });

          const response = await Promise.race([
            apiFunction(...args),
            timeoutPromise,
          ]);

          // Request successful
          setData(response.data);
          setError(null);
          setRetryCount(0);
          return response.data;
        } catch (err) {
          // Check if request was aborted
          if (signal.aborted) {
            throw new Error('Request was cancelled');
          }

          const apiError = classifyError(err);
          lastError = apiError;

          // Log error in development
          if (process.env.NODE_ENV === 'development') {
            console.error(`API attempt ${attempt + 1} failed:`, {
              error: err,
              classified: apiError,
              attempt: attempt + 1,
              maxRetries,
            });
          }

          // If this is the last attempt or error is not retryable, stop
          if (attempt === maxRetries || !isRetryableError(apiError)) {
            setError(apiError);
            onError?.(apiError);
            break;
          }

          // Call retry callback
          onRetry?.(attempt + 1, apiError);

          // Wait before retrying (exponential backoff)
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          setRetryCount(attempt + 1);
        }
      }

      setError(lastError);
      return null;
    },
    [apiFunction, maxRetries, baseDelay, timeout, onError, onRetry]
  );

  const reset = useCallback(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setData(null);
    setError(null);
    setLoading(false);
    setRetryCount(0);
  }, []);

  return {
    data,
    error,
    loading,
    retryCount,
    execute,
    reset,
  };
}

/**
 * Simplified hook for single API calls with retry
 */
export function useApiCall<T>(
  apiFunction: () => Promise<AxiosResponse<T>>,
  options: UseApiWithRetryOptions = {}
) {
  return useApiWithRetry(apiFunction, options);
}
