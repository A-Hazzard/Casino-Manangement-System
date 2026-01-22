/**
 * Error Utilities
 *
 * Central export point for error handling and notification utilities.
 *
 * Features:
 * - Error classification and handling
 * - User-friendly error messages
 * - Toast notifications for errors
 */

export {
  classifyError,
  getUserFriendlyErrorMessage,
  isAbortError,
  isRetryableError,
  type ApiError,
} from './handling';

export {
  showErrorNotification,
  showRetrySuccessNotification,
  showRetryWarningNotification,
} from './notifications';
