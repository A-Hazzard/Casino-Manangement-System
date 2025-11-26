/**
 * Error Handling HOC Types
 * Types for Higher Order Component error handling.
 *
 * Provides consistent error handling props for components wrapped
 * with error handling HOC functionality.
 */
import type { ApiError } from '@/lib/types/errors';

export type WithErrorHandlingProps = {
  onError?: (error: ApiError) => void;
  onRetry?: () => void;
  showErrorUI?: boolean;
  errorTitle?: string;
  errorDescription?: string;
};
