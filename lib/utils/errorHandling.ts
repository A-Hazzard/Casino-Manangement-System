/**
 * Utility functions for handling errors gracefully in the application
 */

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isConnectionError?: boolean;
}

/**
 * Classify error types for better error handling
 */
export function classifyError(error: unknown): ApiError {
  // Handle Axios errors with response status
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { status?: number; statusText?: string };
    };
    const status = axiosError.response?.status;
    const statusText = axiosError.response?.statusText;

    if (status === 503) {
      return {
        message:
          "Service temporarily unavailable. The server may be experiencing high load. Please try again in a moment.",
        status: 503,
        isConnectionError: true,
      };
    }

    if (status && status >= 500) {
      return {
        message: `Server error (${status}): ${
          statusText || "Internal server error"
        }`,
        status,
        isConnectionError: true,
      };
    }

    if (status === 404) {
      return {
        message: "The requested resource was not found.",
        status: 404,
      };
    }

    if (status && status >= 400) {
      return {
        message: `Request failed (${status}): ${statusText || "Bad request"}`,
        status,
      };
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Handle timeout errors
    if (message.includes("timeout") || message.includes("econnaborted")) {
      return {
        message: "Request timed out. The server may be experiencing high load.",
        isTimeoutError: true,
        isConnectionError: true,
      };
    }

    // MongoDB connection errors
    if (
      message.includes("mongonetworktimeouterror") ||
      (message.includes("connection") && message.includes("timed out"))
    ) {
      return {
        message:
          "Database connection timed out. The server may be experiencing high load.",
        isTimeoutError: true,
        isConnectionError: true,
      };
    }

    if (
      message.includes("mongoserverselectionerror") ||
      message.includes("server selection")
    ) {
      return {
        message:
          "Unable to connect to the database server. Please check your connection.",
        isConnectionError: true,
      };
    }

    if (message.includes("network") || message.includes("fetch")) {
      return {
        message:
          "Network error occurred. Please check your internet connection.",
        isNetworkError: true,
      };
    }

    // Generic error
    return {
      message: error.message,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: "An unexpected error occurred",
  };
}

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

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: ApiError): string {
  if (error.isTimeoutError) {
    return "The request is taking longer than expected. This usually happens when the server is busy. Please try again in a moment.";
  }

  if (error.isConnectionError) {
    return "Unable to connect to our servers. Please check your internet connection and try again.";
  }

  if (error.isNetworkError) {
    return "Network error occurred. Please check your internet connection and try again.";
  }

  if (error.status === 500) {
    return "Server error occurred. Our team has been notified. Please try again later.";
  }

  if (error.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (error.status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (error.status === 404) {
    return "The requested resource was not found.";
  }

  return error.message || "An unexpected error occurred. Please try again.";
}

/**
 * Create a retry function with exponential backoff
 */
export function createRetryFunction<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): () => Promise<T> {
  return async (): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        const errorInfo = classifyError(error);
        if (!isRetryableError(errorInfo)) {
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };
}

/**
 * Handle API errors with proper error classification
 */
export function handleApiError(error: unknown): ApiError {
  const classifiedError = classifyError(error);

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("API Error:", {
      original: error,
      classified: classifiedError,
    });
  }

  return classifiedError;
}

/**
 * Create a timeout promise that rejects after specified time
 */
export function createTimeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = "Request timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

/**
 * Safe async function wrapper that catches and handles errors
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  fallback?: T
): Promise<{ data?: T; error?: ApiError }> {
  try {
    const data = await asyncFn();
    return { data };
  } catch (error) {
    const apiError = handleApiError(error);
    return { error: apiError, data: fallback };
  }
}
