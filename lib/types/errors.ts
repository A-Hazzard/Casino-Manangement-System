/**
 * Error Types
 * Types for API and network errors.
 *
 * Standardized error structure including error message, status code,
 * error code, and flags for network/timeout/connection errors.
 */
export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isConnectionError?: boolean;
};
