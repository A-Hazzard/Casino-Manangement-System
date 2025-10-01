import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { classifyError, type ApiError } from "./errorHandling";
import { showErrorNotification } from "./errorNotifications";

/**
 * Enhanced axios instance with error handling
 */
const apiClient = axios.create({
  timeout: 60000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor to add common headers
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add any common headers here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
      showErrorNotification(apiError, "API Request");
    }

    return Promise.reject(apiError);
  }
);

/**
 * Enhanced API methods with retry logic
 */
export class ApiClient {
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
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

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

  static async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.withRetry(() => apiClient.get<T>(url, config));
  }

  static async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.withRetry(() => apiClient.post<T>(url, data, config));
  }

  static async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.withRetry(() => apiClient.put<T>(url, data, config));
  }

  static async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.withRetry(() => apiClient.patch<T>(url, data, config));
  }

  static async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.withRetry(() => apiClient.delete<T>(url, config));
  }
}

export default apiClient;
