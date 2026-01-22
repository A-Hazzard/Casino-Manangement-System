/**
 * Test Utilities
 *
 * Shared utilities for vault API tests.
 *
 * @module __tests__/vault/test-utils
 */

/**
 * Get API URL for a given path
 */
export function getApiUrl(path: string): string {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/vault${path}`;
}

/**
 * Check if server is running by making a simple request
 */
export async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(baseUrl.replace('/api/vault', '/api/auth/verify'));
    return response.status !== 404;
  } catch {
    return false;
  }
}

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Create a test request with optional authentication
 * Note: For integration tests, authentication should be handled via cookies
 * in a real browser environment. These tests may fail with 401 if not authenticated.
 */
export async function createTestRequest(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Add default headers
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  return fetch(url, {
    ...options,
    headers: defaultHeaders,
  });
}

/**
 * Extract response data from JSON response
 */
export async function extractResponseData<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}`);
  }

  const json = await response.json();
  return json.data as T;
}

/**
 * Extract error message from JSON response
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const json = await response.json();
    return (json.error || json.message || 'Unknown error') as string;
  } catch {
    return 'Failed to parse error response';
  }
}

/**
 * Generate test float request data
 */
export function generateTestFloatRequest(overrides?: {
  shiftId?: string;
  locationId?: string;
  type?: string;
  requestedDenom?: Record<string, number>;
}): {
  type: string;
  shiftId: string;
  locationId: string;
  requestedDenom: Record<string, number>;
} {
  return {
    type: overrides?.type || 'FLOAT_INCREASE',
    shiftId: overrides?.shiftId || 'test-shift-id',
    locationId: overrides?.locationId || 'test-location-id',
    requestedDenom: overrides?.requestedDenom || {
      '20': 10,
      '50': 5,
      '100': 2,
    },
  };
}

/**
 * Skip test if endpoint doesn't exist (404)
 */
export function skipIfEndpointMissing(response: Response): boolean {
  return response.status === 404;
}
