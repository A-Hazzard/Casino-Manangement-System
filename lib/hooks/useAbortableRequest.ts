/**
 * useAbortableRequest Hook
 *
 * Provides an AbortController-based request management system to prevent
 * race conditions and allow users to rapidly change filters without waiting
 * for previous requests to complete.
 *
 * Features:
 * - Automatically aborts previous requests when a new one is initiated
 * - Silently handles AbortError (no error toasts for canceled requests)
 * - Cleans up (aborts) on component unmount
 * - Returns a function to execute abortable async requests
 *
 * Usage:
 * ```tsx
 * const makeRequest = useAbortableRequest();
 *
 * const fetchData = async () => {
 *   await makeRequest(async (signal) => {
 *     const response = await axios.get('/api/data', { signal });
 *     setData(response.data);
 *   });
 * };
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';

export function useAbortableRequest() {
  // Map of AbortControllers keyed by purpose (e.g., 'chart', 'cabinets', 'totals')
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  // Cleanup on unmount - abort any in-flight requests
  useEffect(() => {
    // Copy ref value to variable to ensure cleanup uses the correct value
    const controllers = controllersRef.current;
    return () => {
      // Abort all in-flight requests on unmount
      controllers.forEach(controller => controller.abort());
      controllers.clear();
    };
  }, []);

  /**
   * Execute an abortable request
   * Aborts any previous request and executes the new one
   *
   * @param requestFn - Async function that accepts an AbortSignal
   * @returns Promise that resolves when request completes or rejects with non-abort errors
   */
  const makeRequest = useCallback(
    async <T = void>(
      requestFn: (signal: AbortSignal) => Promise<T>,
      key: string = 'default'
    ): Promise<T | null> => {
      // Abort any existing request for this key
      const existing = controllersRef.current.get(key);
      if (existing) existing.abort();

      // Create and store new controller for this key
      const controller = new AbortController();
      controllersRef.current.set(key, controller);

      try {
        const result = await requestFn(controller.signal);
        return result;
      } catch (error) {
        // Check for axios cancellation using axios.isCancel()
        const axios = (await import('axios')).default;
        if (axios.isCancel(error)) {
          // Silently handle canceled requests - don't log or re-throw
          return null;
        }

        // Check for standard AbortError (fetch API) or CanceledError
        if (
          (error instanceof Error && error.name === 'AbortError') ||
          (error instanceof Error && error.message === 'canceled') ||
          (error instanceof Error &&
            error.message === 'The user aborted a request.')
        ) {
          // Silently handle aborted requests - don't log or re-throw
          return null;
        }

        // Check for CanceledError type (Axios)
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED')
        ) {
          // Silently handle canceled requests
          return null;
        }

        // Re-throw other errors so they can be handled by the caller
        throw error;
      }
    },
    []
  );

  return makeRequest;
}

