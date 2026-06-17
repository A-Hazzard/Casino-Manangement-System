/**
 * Vault Float Request API Route
 *
 * Handles listing and creating float requests for cashier-to-vault cash operations.
 * Vault managers see all requests; cashiers only see their own.
 *
 * GET  /api/vault/float-request  - List float requests with filtering, pagination
 * POST /api/vault/float-request  - Submit a new float request from a cashier
 * DELETE /api/vault/float-request - Cancel a pending float request
 *
 * @module app/api/vault/float-request/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import {
  buildFloatRequestQuery,
  fetchFloatRequestsWithDetails,
  validateFloatRequestBody,
  getActiveVaultShift,
  createFloatRequestRecord,
  sendFloatRequestNotification,
  validateCancellationPermissions,
  cancelFloatRequestDocument,
  cleanupFloatRequestNotifications,
} from '@/app/api/lib/helpers/vault/floatRequestOperations';
import type { FloatRequestDocument } from '@shared/types';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for float requests
 *
 * @param {string} cashierId - Filter by cashier ID (Admin/VM required to view others)
 * @param {string} locationId - Filter by location ID
 * @param {number} page - Page number for pagination
 * @param {number} limit - Results per page
 * @param {string} status - Filter by request status ('pending', 'approved', etc.)
 * @param {string} startDate - ISO date for range start
 * @param {string} endDate - ISO date for range end
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/float-request';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Parse query params and determine cashier filter
      // ============================================================================
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const isVM = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
      );

      const { searchParams } = new URL(request.url);
      const cashierIdFromParams = searchParams.get('cashierId');
      const finalCashierId = isVM ? cashierIdFromParams : userPayload._id;
      const locationId = searchParams.get('locationId');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const skip = (page - 1) * limit;
      const status = searchParams.get('status') || 'pending';
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // ============================================================================
      // STEP 2: Build query and fetch data
      // ============================================================================
      const query = buildFloatRequestQuery({
        locationId,
        cashierId: finalCashierId,
        status,
        startDate,
        endDate,
      });

      const { data: pendingRequests, total } =
        await fetchFloatRequestsWithDetails(query, page, limit, skip);

      // ============================================================================
      // STEP 3: Return paginated results
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/float-request',
        pendingRequests.length,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        data: pendingRequests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to fetch float requests';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/float-request',
        errorMessage,
        user
      );
      console.error(
        '[GET] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * Main POST handler for submitting float requests
 *
 * @body {string} type - Request type ('increase', 'decrease') (REQUIRED)
 * @body {number} amount - Requested amount (REQUIRED)
 * @body {Array} denominations - Break down of requested denominations
 * @body {string} reason - Reason for float request
 * @body {string} locationId - ID of the location (REQUIRED)
 * @body {string} cashierShiftId - ID of the active cashier shift (REQUIRED)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/float-request';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload }) => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request body
      // ============================================================================
      const body = await request.json();
      const { type, amount, denominations, reason, locationId, cashierShiftId } =
        body;

      const validation = validateFloatRequestBody(body);
      if (!validation.valid) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/float-request',
          validation.error || 'Missing required fields',
          user
        );
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: validation.status || 400 }
        );
      }

      // ============================================================================
      // STEP 2: Fetch and validate active vault shift
      // ============================================================================
      const vaultShift = await getActiveVaultShift(locationId);
      if (!vaultShift) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/float-request',
          'No active vault shift',
          user
        );
        return NextResponse.json(
          { success: false, error: 'No active vault shift' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Create float request
      // ============================================================================
      const floatRequest = await createFloatRequestRecord({
        locationId,
        cashierId: userPayload._id,
        cashierShiftId,
        vaultShiftId: String(vaultShift._id),
        type,
        amount,
        denominations: denominations || [],
        reason,
      });

      // ============================================================================
      // STEP 4: Send notification to vault manager
      // ============================================================================
      if (vaultShift.vaultManagerId) {
        await sendFloatRequestNotification(
          floatRequest,
          userPayload.username as string,
          String(vaultShift.vaultManagerId)
        );
      }

      // ============================================================================
      // STEP 5: Return created request
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteCreate(
        functionName,
        'POST',
        '/api/vault/float-request',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        message: 'Float request submitted',
        floatRequest,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to create float request';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/float-request',
        errorMessage,
        user
      );
      console.error(
        '[Float Create API] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE handler for cancelling float requests
 *
 * @body {string} requestId - ID of the float request to cancel (REQUIRED)
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/vault/float-request';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate request body
      // ============================================================================
      const { requestId } = await request.json();
      if (!requestId) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/vault/float-request',
          'Request ID required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Request ID required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Fetch and validate float request
      // ============================================================================
      const requestDoc = await FloatRequestModel.findOne({ _id: requestId });
      if (!requestDoc) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/vault/float-request',
          'Request not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Request not found' },
          { status: 404 }
        );
      }

      const permCheck = validateCancellationPermissions(
        requestDoc.toObject(),
        userPayload._id,
        userRoles
      );
      if (!permCheck.valid) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/vault/float-request',
          permCheck.error || 'Permission denied',
          user
        );
        return NextResponse.json(
          { success: false, error: permCheck.error },
          { status: permCheck.status || 403 }
        );
      }

      // ============================================================================
      // STEP 3: Cancel request and clean up notifications
      // ============================================================================
      await cancelFloatRequestDocument(
        requestDoc as FloatRequestDocument & { save: () => Promise<unknown> },
        userPayload._id
      );

      await cleanupFloatRequestNotifications(requestId);

      // ============================================================================
      // STEP 4: Return result
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'DELETE',
        '/api/vault/float-request',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        message: 'Request cancelled successfully',
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to cancel float request';
      logRouteError(
        functionName,
        'DELETE',
        '/api/vault/float-request',
        errorMessage,
        user
      );
      console.error(
        '[Float Cancel API] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
