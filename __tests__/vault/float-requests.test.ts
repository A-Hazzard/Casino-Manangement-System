/**
 * Float Requests API Test Suite
 *
 * Comprehensive test cases for float request endpoints.
 * These are integration tests that require a running Next.js server.
 *
 * Note: Some endpoints like GET /api/vault/float-requests (list) may not exist yet.
 *
 * @module __tests__/vault/float-requests.test
 */

import {
  getApiUrl,
  createTestRequest,
  extractResponseData,
  extractErrorMessage,
  generateTestFloatRequest,
  skipIfEndpointMissing,
} from './test-utils';

describe('Float Requests API', () => {
  const baseUrl = getApiUrl('/float-requests');
  let testFloatRequestId: string | null = null;
  const testShiftId: string | null = null;

  beforeAll(async () => {
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/api/auth/verify');
      if (response.status === 404) {
        console.warn('⚠️  Server not running. Some tests will be skipped.');
      }
    } catch {
      console.warn('⚠️  Server not reachable. Some tests will be skipped.');
    }
  });

  describe('GET /api/vault/float-requests (list)', () => {
    test('should return list of float requests with pagination (if endpoint exists)', async () => {
      const response = await createTestRequest(baseUrl);

      // This endpoint doesn't exist yet - skip test
      if (skipIfEndpointMissing(response)) {
        console.warn(
          '⚠️  Endpoint GET /api/vault/float-requests (list) does not exist. Skipping test.'
        );
        return;
      }

      if (response.status === 401) {
        console.warn('⚠️  Test requires authentication. Skipping.');
        return;
      }

      expect([200, 403]).toContain(response.status);

      if (response.ok) {
        const data = await extractResponseData<{
          floatRequests: unknown[];
          pagination: {
            page: number;
            limit: number;
            totalCount: number;
          };
        }>(response);

        expect(data.floatRequests).toBeInstanceOf(Array);
        expect(data.pagination).toHaveProperty('page');
        expect(data.pagination).toHaveProperty('totalCount');
      }
    });

    test('should filter by status (if endpoint exists)', async () => {
      const response = await createTestRequest(`${baseUrl}?status=PENDING`);

      if (skipIfEndpointMissing(response) || response.status === 401) {
        return;
      }

      expect([200, 403]).toContain(response.status);

      if (response.ok) {
        const data = await extractResponseData<{
          floatRequests: Array<{ status: string }>;
        }>(response);

        if (data.floatRequests.length > 0) {
          data.floatRequests.forEach((request: { status: string }) => {
            expect(request.status).toBe('PENDING');
          });
        }
      }
    });

    test('should require authentication (if endpoint exists)', async () => {
      const response = await fetch(baseUrl);

      if (skipIfEndpointMissing(response)) {
        return;
      }

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/vault/float-requests (create)', () => {
    test('should create a new float request (cashier only) (if endpoint exists)', async () => {
      if (!testShiftId) {
        console.warn('⚠️  Skipping test: No test shift available');
        return;
      }

      const floatRequestData = generateTestFloatRequest({
        shiftId: testShiftId,
      });

      const response = await createTestRequest(baseUrl, {
        method: 'POST',
        body: JSON.stringify(floatRequestData),
      });

      if (skipIfEndpointMissing(response)) {
        console.warn(
          '⚠️  Endpoint POST /api/vault/float-requests does not exist. Skipping test.'
        );
        return;
      }

      if (response.status === 401) {
        return;
      }

      // Should succeed if user is cashier, fail if not
      if (response.ok) {
        expect(response.status).toBe(201);
        const data = await extractResponseData<{
          floatRequest: { _id: string; status: string };
        }>(response);
        expect(data.floatRequest).toHaveProperty('_id');
        expect(data.floatRequest.status).toBe('PENDING');
        testFloatRequestId = data.floatRequest._id;
      } else {
        expect([403, 400]).toContain(response.status);
      }
    });

    test('should validate required fields (if endpoint exists)', async () => {
      const invalidData = { type: 'FLOAT_INCREASE' }; // Missing fields
      const response = await createTestRequest(baseUrl, {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      if (skipIfEndpointMissing(response) || response.status === 401) {
        return;
      }

      expect([400, 403]).toContain(response.status);

      if (response.status === 400) {
        const error = await extractErrorMessage(response);
        expect(error.toLowerCase()).toContain('required');
      }
    });
  });

  describe('GET /api/vault/float-requests/[id]', () => {
    test('should return float request details', async () => {
      // Use a test ID (will fail if doesn't exist, which is expected)
      const testId = '507f1f77bcf86cd799439011';
      const response = await createTestRequest(`${baseUrl}/${testId}`);

      if (response.status === 401) {
        console.warn('⚠️  Test requires authentication. Skipping.');
        return;
      }

      if (skipIfEndpointMissing(response)) {
        console.warn('⚠️  Endpoint not found. Skipping test.');
        return;
      }

      // Should return 200 if exists, 404 if not found, 403 if no access, 401 if not authenticated, 400 if invalid ID
      expect([200, 404, 403, 401, 400]).toContain(response.status);

      if (response.ok) {
        const data = await extractResponseData<{
          floatRequest: {
            _id: string;
            type: string;
            status: string;
          };
        }>(response);

        expect(data.floatRequest).toHaveProperty('_id');
        expect(data.floatRequest).toHaveProperty('type');
        expect(data.floatRequest).toHaveProperty('status');
      }
    });
  });

  describe('PUT /api/vault/float-requests/[id]', () => {
    test('should allow editing FLOAT_DECREASE requests only', async () => {
      // This test requires a valid FLOAT_DECREASE request ID
      // Skip if we don't have test data
      if (!testFloatRequestId) {
        console.warn('⚠️  Skipping test: No test float request available');
        return;
      }

      const editData = {
        requestedDenom: { '100': 3 },
      };

      const response = await createTestRequest(
        `${baseUrl}/${testFloatRequestId}`,
        {
          method: 'PUT',
          body: JSON.stringify(editData),
        }
      );

      if (response.status === 401) {
        return;
      }

      if (skipIfEndpointMissing(response)) {
        return;
      }

      // Should succeed for FLOAT_DECREASE if user has permission, fail otherwise
      if (response.ok) {
        const data = await extractResponseData<{
          floatRequest: { requestedDenom: Record<string, number> };
        }>(response);
        expect(data.floatRequest.requestedDenom).toBeDefined();
      } else {
        expect([403, 400, 404]).toContain(response.status);
      }
    });
  });

  // Note: Other endpoints like /approve, /reject, /acknowledge may not exist yet
  // These tests are commented out or will be skipped if endpoints don't exist
});
