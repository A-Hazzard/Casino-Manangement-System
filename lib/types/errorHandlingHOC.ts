import type { ApiError } from '@/lib/types/errors';

export type WithErrorHandlingProps = {
  onError?: (error: ApiError) => void;
  onRetry?: () => void;
  showErrorUI?: boolean;
  errorTitle?: string;
  errorDescription?: string;
};
