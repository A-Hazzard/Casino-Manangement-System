// Standardized API response types for consistent data handling across the application

/**
 * Standard API response wrapper for single item responses
 */
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
};

/**
 * Standard API error response format
 */
export type ApiErrorResponse = {
  success: false;
  error: string;
  message?: string;  // For frontend compatibility (same as error)
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
};

