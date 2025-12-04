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

import { useRef, useEffect, useCallback } from 'react';

export function useAbortableRequest() {
  // Ref to hold the current AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount - abort any in-flight requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  /**
   * Execute an abortable request
   * Aborts any previous request and executes the new one
   *
   * @param requestFn - Async function that accepts an AbortSignal
   * @param queryName - Optional name to identify the query in logs
   * @returns Promise that resolves when request completes or rejects with non-abort errors
   */
  const makeRequest = useCallback(
    async <T = void>(
      requestFn: (signal: AbortSignal) => Promise<T>,
      queryName?: string
    ): Promise<T | null> => {
      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await requestFn(controller.signal);
        return result;
      } catch (error) {
        // Check for axios cancellation using axios.isCancel()
        const axios = (await import('axios')).default;
        if (axios.isCancel(error)) {
          if (queryName) {
            console.log(`[Query Canceled] ${queryName}`);
          }
          return null;
        }
        
        // Check for standard AbortError (fetch API)
        if (error instanceof Error && error.name === 'AbortError') {
          if (queryName) {
            console.log(`[Query Aborted] ${queryName}`);
          }
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

