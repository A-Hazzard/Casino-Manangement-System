import { toast } from 'sonner';
import { classifyError, getUserFriendlyErrorMessage } from './errorHandling';

/**
 * Show error notifications based on error type
 */
export function showErrorNotification(error: unknown, context?: string) {
  const apiError = classifyError(error);
  const message = getUserFriendlyErrorMessage(apiError);

  // Add context if provided
  const fullMessage = context ? `${context}: ${message}` : message;

  if (apiError.isTimeoutError) {
    toast.error('Connection Timeout', {
      description: fullMessage,
      duration: 8000,
      action: {
        label: 'Retry',
        onClick: () => window.location.reload(),
      },
    });
  } else if (apiError.isConnectionError) {
    toast.error('Connection Failed', {
      description: fullMessage,
      duration: 10000,
      action: {
        label: 'Retry',
        onClick: () => window.location.reload(),
      },
    });
  } else if (apiError.isNetworkError) {
    toast.error('Network Error', {
      description: fullMessage,
      duration: 8000,
    });
  } else {
    toast.error('Error', {
      description: fullMessage,
      duration: 5000,
    });
  }
}

/**
 * Show success notification for retry attempts
 */
export function showRetrySuccessNotification(context?: string) {
  const message = context
    ? `${context} - Connection restored`
    : 'Connection restored';

  toast.success('Connection Restored', {
    description: message,
    duration: 3000,
  });
}

/**
 * Show warning notification for retry attempts
 */
export function showRetryWarningNotification(
  attempt: number,
  maxRetries: number,
  context?: string
) {
  const message = context
    ? `${context} - Retrying connection (${attempt}/${maxRetries})`
    : `Retrying connection (${attempt}/${maxRetries})`;

  toast.warning('Retrying Connection', {
    description: message,
    duration: 3000,
  });
}

/**
 * Show info notification for connection status
 */
export function showConnectionInfoNotification(message: string) {
  toast.info('Connection Status', {
    description: message,
    duration: 4000,
  });
}
