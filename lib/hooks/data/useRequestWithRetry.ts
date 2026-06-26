/**
 * useRequestWithRetry Hook
 *
 * Runs an async request with automatic retries, a real per-attempt timeout (via
 * AbortController), exponential backoff, and a live countdown to the next attempt.
 *
 * Unlike {@link useApiWithRetry} (which is tied to an AxiosResponse-returning fn and races a
 * timer without aborting), this hook:
 * - accepts any `(signal: AbortSignal) => Promise<T>` so the caller can wire the signal into
 *   axios/fetch and have a hung request actually cancelled when the timeout fires;
 * - exposes `retryCountdown` so the UI can show "retrying in N s (attempt X of Y)";
 * - only retries connection/timeout/5xx errors (401/403/404 are NOT retryable).
 *
 * @module lib/hooks/data/useRequestWithRetry
 */

'use client';

// ============================================================================
// External Dependencies
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { classifyError, isRetryableError } from '@/lib/utils/errors';
import type { ApiError } from '@/lib/types/errors';
import type {
  UseRequestWithRetryOptions,
  UseRequestWithRetryReturn,
} from '@/lib/types/api';

// ============================================================================
// Main Hook
// ============================================================================

export function useRequestWithRetry<TResult>(
  fn: (signal: AbortSignal) => Promise<TResult>,
  options: UseRequestWithRetryOptions = {}
): UseRequestWithRetryReturn<TResult> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    attemptTimeoutMs = 30000,
    isRetryable = isRetryableError,
    onError,
    onRetry,
  } = options;

  // ==========================================================================
  // Local State
  // ==========================================================================
  const [data, setData] = useState<TResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [retryCountdown, setRetryCountdown] = useState(0);

  // ==========================================================================
  // Refs — latest closures + active timers/controllers for cleanup
  // ==========================================================================
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const isRetryableRef = useRef(isRetryable);
  isRetryableRef.current = isRetryable;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;

  const cancelledRef = useRef(false);
  const activeControllerRef = useRef<AbortController | null>(null);
  const attemptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // ==========================================================================
  // Helpers
  // ==========================================================================
  const clearTimers = useCallback(() => {
    if (attemptTimeoutRef.current) clearTimeout(attemptTimeoutRef.current);
    if (backoffTimeoutRef.current) clearTimeout(backoffTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    attemptTimeoutRef.current = null;
    backoffTimeoutRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  // Wait `delayMs` while ticking down a per-second countdown the UI can render.
  const waitWithCountdown = useCallback(
    (delayMs: number) =>
      new Promise<void>(resolve => {
        let remainingSeconds = Math.ceil(delayMs / 1000);
        setRetryCountdown(remainingSeconds);

        countdownIntervalRef.current = setInterval(() => {
          remainingSeconds -= 1;
          setRetryCountdown(Math.max(remainingSeconds, 0));
          if (remainingSeconds <= 0 && countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        }, 1000);

        backoffTimeoutRef.current = setTimeout(() => {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setRetryCountdown(0);
          resolve();
        }, delayMs);
      }),
    []
  );

  // ==========================================================================
  // Handlers
  // ==========================================================================
  const execute = useCallback(async (): Promise<TResult | null> => {
    // Cancel any in-flight run before starting a new one.
    cancelledRef.current = false;
    activeControllerRef.current?.abort();
    clearTimers();

    setIsLoading(true);
    setError(null);
    setIsRetrying(false);
    setRetryCountdown(0);

    let lastError: ApiError | null = null;

    for (let attemptIndex = 0; attemptIndex <= maxRetries; attemptIndex++) {
      setAttempt(attemptIndex + 1);
      setIsRetrying(false);

      const controller = new AbortController();
      activeControllerRef.current = controller;
      let timedOut = false;
      attemptTimeoutRef.current = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, attemptTimeoutMs);

      try {
        const result = await fnRef.current(controller.signal);
        if (attemptTimeoutRef.current) clearTimeout(attemptTimeoutRef.current);
        if (cancelledRef.current) return null;

        setData(result);
        setError(null);
        setIsLoading(false);
        setIsRetrying(false);
        return result;
      } catch (caught) {
        if (attemptTimeoutRef.current) clearTimeout(attemptTimeoutRef.current);
        // Manual reset/unmount aborted us — stop silently, don't retry or set error.
        if (cancelledRef.current) return null;
        // Aborted externally (e.g. a newer run started, StrictMode double-invoke, or
        // report changed) rather than by our own timeout — stop silently, don't retry.
        if (controller.signal.aborted && !timedOut) return null;

        const apiError: ApiError = timedOut
          ? {
              message: `Request timed out after ${attemptTimeoutMs}ms`,
              isTimeoutError: true,
            }
          : classifyError(caught);
        lastError = apiError;

        if (process.env.NODE_ENV === 'development') {
          console.error(
            `[useRequestWithRetry] Attempt ${attemptIndex + 1}/${maxRetries + 1} failed:`,
            apiError.message
          );
        }

        // Stop on the last attempt or a non-retryable error (401/403/404/etc).
        if (attemptIndex === maxRetries || !isRetryableRef.current(apiError)) {
          setError(apiError);
          setIsLoading(false);
          setIsRetrying(false);
          onErrorRef.current?.(apiError);
          return null;
        }

        onRetryRef.current?.(attemptIndex + 1, apiError);
        setIsRetrying(true);
        await waitWithCountdown(baseDelay * Math.pow(2, attemptIndex));
        if (cancelledRef.current) return null;
      }
    }

    setError(lastError);
    setIsLoading(false);
    setIsRetrying(false);
    return null;
  }, [maxRetries, baseDelay, attemptTimeoutMs, clearTimers, waitWithCountdown]);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    activeControllerRef.current?.abort();
    clearTimers();
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsRetrying(false);
    setAttempt(0);
    setRetryCountdown(0);
  }, [clearTimers]);

  // ==========================================================================
  // Effects — abort any in-flight work on unmount
  // ==========================================================================
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      activeControllerRef.current?.abort();
      clearTimers();
    };
  }, [clearTimers]);

  // ==========================================================================
  // Return
  // ==========================================================================
  return {
    data,
    error,
    isLoading,
    isRetrying,
    attempt,
    maxRetries,
    retryCountdown,
    execute,
    reset,
  };
}
