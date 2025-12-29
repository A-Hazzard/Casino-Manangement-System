/**
 * Error Handling Utilities
 *
 * Utility functions for handling errors gracefully in the application.
 *
 * Features:
 * - Error classification and categorization
 * - Retry logic with exponential backoff
 * - User-friendly error messages
 * - Timeout handling
 * - Safe async function wrappers
 */

import type { ApiError } from '@/lib/types/errors';

// Re-export for use in other files
export type { ApiError };

// ============================================================================
// Error Classification
// ============================================================================
/**
 * Classify error types for better error handling
 */
export function classifyError(error: unknown): ApiError {
  // Handle Axios errors with response status
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: { status?: number; statusText?: string };
    };
    const status = axiosError.response?.status;
    const statusText = axiosError.response?.statusText;

    if (status === 503) {
      return {
        message:
          'Service temporarily unavailable. The server may be experiencing high load. Please try again in a moment.',
        status: 503,
        isConnectionError: true,
      };
    }

    if (status && status >= 500) {
      return {
        message: `Server error (${status}): ${
          statusText || 'Internal server error'
        }`,
        status,
        isConnectionError: true,
      };
    }

    if (status === 404) {
      return {
        message: 'The requested resource was not found.',
        status: 404,
      };
    }

    if (status && status >= 400) {
      return {
        message: `Request failed (${status}): ${statusText || 'Bad request'}`,
        status,
      };
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Handle timeout errors
    if (message.includes('timeout') || message.includes('econnaborted')) {
      return {
        message: 'Request timed out. The server may be experiencing high load.',
        isTimeoutError: true,
        isConnectionError: true,
      };
    }

    // MongoDB connection errors
    if (
      message.includes('mongonetworktimeouterror') ||
      (message.includes('connection') && message.includes('timed out'))
    ) {
      return {
        message:
          'Database connection timed out. The server may be experiencing high load.',
        isTimeoutError: true,
        isConnectionError: true,
      };
    }

    if (
      message.includes('mongoserverselectionerror') ||
      message.includes('server selection')
    ) {
      return {
        message:
          'Unable to connect to the database server. Please check your connection.',
        isConnectionError: true,
      };
    }

    if (message.includes('network') || message.includes('fetch')) {
      return {
        message:
          'Network error occurred. Please check your internet connection.',
        isNetworkError: true,
      };
    }

    // Generic error
    return {
      message: error.message,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {
    message: 'An unexpected error occurred',
  };
}

// ============================================================================
// Error Checking Functions
// ============================================================================
/**
 * Check if an error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
  return !!(
    error.isTimeoutError ||
    error.isConnectionError ||
    error.isNetworkError ||
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
}

// ============================================================================
// Error Message Helpers
// ============================================================================
/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: ApiError): string {
  if (error.isTimeoutError) {
    return 'The request is taking longer than expected. This usually happens when the server is busy. Please try again in a moment.';
  }

  if (error.isConnectionError) {
    return 'Unable to connect to our servers. Please check your internet connection and try again.';
  }

  if (error.isNetworkError) {
    return 'Network error occurred. Please check your internet connection and try again.';
  }

  if (error.status === 500) {
    return 'Server error occurred. Our team has been notified. Please try again later.';
  }

  if (error.status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  if (error.status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (error.status === 404) {
    return 'The requested resource was not found.';
  }

  return error.message || 'An unexpected error occurred. Please try again.';
}

