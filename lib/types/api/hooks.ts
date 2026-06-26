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

export type UseRequestWithRetryOptions = {
  maxRetries?: number;
  baseDelay?: number;
  attemptTimeoutMs?: number;
  isRetryable?: (error: ApiError) => boolean;
  onError?: (error: ApiError) => void;
  onRetry?: (attempt: number, error: ApiError) => void;
};

export type UseRequestWithRetryReturn<T> = {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isRetrying: boolean;
  attempt: number;
  maxRetries: number;
  retryCountdown: number;
  execute: () => Promise<T | null>;
  reset: () => void;
};
