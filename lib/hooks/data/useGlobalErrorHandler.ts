'use client';

import { useCallback } from 'react';
import { classifyError, showErrorNotification, type ApiError } from '@/lib/utils/errors';

/**
 * Global error handler hook that can be used across all components
 * Provides consistent error handling for API calls
 */
export function useGlobalErrorHandler() {
  const handleError = useCallback((error: unknown, context?: string) => {
    const apiError = classifyError(error);

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Global Error Handler - ${context || 'Unknown'}:`, {
        original: error,
        classified: apiError,
      });
    }

    // Show user-friendly notification
    showErrorNotification(apiError, context);

    return apiError;
  }, []);

  const handleApiCall = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      context?: string
    ): Promise<{ data?: T; error?: ApiError }> => {
      try {
        const data = await apiCall();
        return { data };
      } catch (error) {
        const apiError = handleError(error, context);
        return { error: apiError };
      }
    },
    [handleError]
  );

  const handleApiCallWithRetry = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      context?: string,
      maxRetries: number = 3
    ): Promise<{ data?: T; error?: ApiError }> => {
      let lastError: ApiError | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const data = await apiCall();
          return { data };
        } catch (error) {
          lastError = classifyError(error);

          // Handle specific error types
          if (lastError.status === 503) {
            // For 503 errors, use longer delays and fewer retries
            if (attempt === 0) {
              console.warn(
                `${
                  context || 'API call'
                } temporarily unavailable (503). Retrying...`
              );
            }

            if (attempt >= 2) {
              // Only retry 503 errors twice
              console.warn(
                `${
                  context || 'API call'
                } still unavailable after retries. Returning empty data.`
              );
              return { data: [] as T }; // Return empty array for metrics
            }
          }

          // If this is the last attempt, show error
          if (attempt === maxRetries) {
            handleError(error, context);
            return { error: lastError };
          }

          // Wait before retrying (exponential backoff with longer delays for 503)
          const baseDelay = lastError.status === 503 ? 2000 : 1000;
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      return { error: lastError! };
    },
    [handleError]
  );

  return {
    handleError,
    handleApiCall,
    handleApiCallWithRetry,
  };
}

