/**
 * API Client Utility
 *
 * Enhanced axios instance with automatic error handling, retry logic, and interceptors.
 *
 * Features:
 * - Automatic error classification and handling
 * - Request/response interceptors
 * - Retry logic with exponential backoff
 * - Error notifications for connection issues
 * - Type-safe API methods
 */

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { classifyError, type ApiError } from './errorHandling';
import { showErrorNotification } from './errorNotifications';

// ============================================================================
// Axios Instance Configuration
// ============================================================================
/**
 * Enhanced axios instance with error handling
 */
const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request Interceptor
// ============================================================================
/**
 * Request interceptor to add common headers
 */
apiClient.interceptors.request.use(
  config => {
    // Add any common headers here
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor
// ============================================================================
/**
 * Response interceptor to handle errors globally
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    const apiError = classifyError(error);

    // Show error notification for connection issues
    if (
      apiError.isTimeoutError ||
      apiError.isConnectionError ||
      apiError.isNetworkError
    ) {
      showErrorNotification(apiError, 'API Request');
    }

    return Promise.reject(apiError);
  }
);

// ============================================================================
// API Client Class
// ============================================================================
/**
 * Enhanced API methods with retry logic
 */
export class ApiClient {
  // ============================================================================
  // Private Methods
  // ============================================================================
  private static async withRetry<T>(
    apiCall: () => Promise<AxiosResponse<T>>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: ApiError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await apiCall();
        return response.data;
      } catch (error) {
        lastError = classifyError(error);

        // If this is the last attempt or error is not retryable, stop
        if (attempt === maxRetries || !this.isRetryableError(lastError)) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: ApiError): boolean {
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
  // Public API Methods
  // ============================================================================
  /**
   * GET request with retry logic
   */
  static async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.withRetry(() => apiClient.get<T>(url, config));
  }

  /**
   * POST request with retry logic
   */
  static async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.withRetry(() => apiClient.post<T>(url, data, config));
  }

  /**
   * PUT request with retry logic
   */
  static async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.withRetry(() => apiClient.put<T>(url, data, config));
  }

  /**
   * PATCH request with retry logic
   */
  static async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.withRetry(() => apiClient.patch<T>(url, data, config));
  }

  /**
   * DELETE request with retry logic
   */
  static async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.withRetry(() => apiClient.delete<T>(url, config));
  }
}

export default apiClient;
