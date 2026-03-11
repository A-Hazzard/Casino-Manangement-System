/**
 * API Hooks Types
 * Types for custom API hooks with retry logic and error handling.
 *
 * Used by useApiWithRetry hook for configurable API calls with
 * automatic retry, timeout, and error handling.
 */
import type { ApiError } from '@/lib/types/errors';

export type UseApiWithRetryOptions = {
  maxRetries?: number;
  baseDelay?: number;
  timeout?: number;
  onError?: (error: ApiError) => void;
  onRetry?: (attempt: number, error: ApiError) => void;
};

export type UseApiWithRetryReturn<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  retryCount: number;
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
};

