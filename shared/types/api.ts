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
 * Standard API response wrapper for paginated responses
 */
export type PaginatedApiResponse<T> = {
  success: boolean;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
  message?: string;
  timestamp: string;
};

/**
 * Standard API error response format
 */
export type ApiErrorResponse = {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
};

/**
 * Generic API response type that can be either success or error
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/**
 * Generic paginated API result type
 */
export type PaginatedApiResult<T> = PaginatedApiResponse<T> | ApiErrorResponse;

/**
 * Standard pagination parameters for API requests
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

/**
 * Standard search parameters for API requests
 */
export type SearchParams = {
  search?: string;
  filter?: Record<string, unknown>;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
};

/**
 * Combined API request parameters
 */
export type ApiRequestParams = PaginationParams & SearchParams;

/**
 * Standard API validation error format
 */
export type ValidationError = {
  field: string;
  message: string;
  value?: unknown;
};

/**
 * API response for validation errors
 */
export type ValidationErrorResponse = {
  success: false;
  error: "Validation failed";
  validationErrors: ValidationError[];
  timestamp: string;
};

/**
 * Standard file upload response
 */
export type FileUploadResponse = {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url?: string;
  message?: string;
  timestamp: string;
};

/**
 * Bulk operation result
 */
export type BulkOperationResult<T> = {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  message?: string;
  timestamp: string;
};

/**
 * Standard API health check response
 */
export type HealthCheckResponse = {
  success: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  services: Record<string, {
    status: "up" | "down";
    responseTime?: number;
    lastCheck: string;
  }>;
  timestamp: string;
};
