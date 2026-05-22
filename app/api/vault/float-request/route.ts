/**
 * Vault Float Request API Route
 *
 * Handles listing and creating float requests for cashier-to-vault cash operations.
 * Vault managers see all requests; cashiers only see their own.
 *
 * GET  /api/vault/float-request  - List float requests with filtering, pagination
 * POST /api/vault/float-request  - Submit a new float request from a cashier
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
      // STEP 1: Parse query params
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
      // STEP 2: Enforce permissions and build query
      // ============================================================================
      const query: Record<string, unknown> = {};
      if (locationId) query.locationId = locationId;
      if (finalCashierId) query.cashierId = finalCashierId;
      if (status !== 'all') query.status = status;

      if (startDate || endDate) {
        query.requestedAt = {
          $gte: startDate ? new Date(startDate) : undefined,
          $lte: endDate ? new Date(endDate) : undefined,
        };
      }

      // ============================================================================
      // STEP 3: Fetch pending requests
      // ============================================================================
      const [pendingRequests, total] = await Promise.all([
        FloatRequestModel.aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $addFields: {
              cashierIdStr: {
                $ifNull: [{ $toString: '$cashierId' }, '$cashierId'],
              },
              processedByStr: {
                $ifNull: [{ $toString: '$processedBy' }, '$processedBy'],
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'cashierIdStr',
              foreignField: '_id',
              as: 'cashierDetails',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'processedByStr',
              foreignField: '_id',
              as: 'processedByDetails',
            },
          },
          {
            $addFields: {
              cashierName: {
                $let: {
                  vars: { user: { $arrayElemAt: ['$cashierDetails', 0] } },
                  in: {
                    $cond: {
                      if: { $ne: ['$$user', null] },
                      then: {
                        $let: {
                          vars: {
                            fullName: {
                              $trim: {
                                input: {
                                  $concat: [
                                    {
                                      $ifNull: ['$$user.profile.firstName', ''],
                                    },
                                    ' ',
                                    {
                                      $ifNull: ['$$user.profile.lastName', ''],
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          in: {
                            $cond: {
                              if: {
                                $and: [
                                  { $ne: ['$$fullName', null] },
                                  { $ne: ['$$fullName', ''] },
                                  { $ne: ['$$fullName', ' '] },
                                ],
                              },
                              then: {
                                $concat: [
                                  { $ifNull: ['$$user.username', 'Cashier'] },
                                  ' (',
                                  '$$fullName',
                                  ')',
                                ],
                              },
                              else: {
                                $ifNull: ['$$user.username', '$cashierId'],
                              },
                            },
                          },
                        },
                      },
                      else: '$cashierId',
                    },
                  },
                },
              },
              processedByName: {
                $let: {
                  vars: { user: { $arrayElemAt: ['$processedByDetails', 0] } },
                  in: {
                    $cond: {
                      if: { $ne: ['$$user', null] },
                      then: {
                        $let: {
                          vars: {
                            fullName: {
                              $trim: {
                                input: {
                                  $concat: [
                                    {
                                      $ifNull: ['$$user.profile.firstName', ''],
                                    },
                                    ' ',
                                    {
                                      $ifNull: ['$$user.profile.lastName', ''],
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          in: {
                            $cond: {
                              if: {
                                $and: [
                                  { $ne: ['$$fullName', null] },
                                  { $ne: ['$$fullName', ''] },
                                ],
                              },
                              then: '$$fullName',
                              else: {
                                $ifNull: ['$$user.username', '$processedBy'],
                              },
                            },
                          },
                        },
                      },
                      else: '$processedBy',
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              cashierDetails: 0,
              processedByDetails: 0,
              cashierIdStr: 0,
              processedByStr: 0,
            },
          },
        ]),
        FloatRequestModel.countDocuments(query),
      ]);

      // ============================================================================
      // STEP 4: Return results
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
      // STEP 1: Parse request body
      // ============================================================================
      const body = await request.json();
      const {
        type,
        amount,
        denominations,
        reason,
        locationId,
        cashierShiftId,
      } = body;
      if (!type || !amount || !locationId || !cashierShiftId) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/float-request',
          'Missing required fields',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Fetch and validate vault shift
      // ============================================================================
      const vaultShift = await (
        await import('@/app/api/lib/models/vaultShift')
      ).default.findOne({ locationId, status: 'active' });
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
      const { generateMongoId } = await import('@/lib/utils/id');
      const requestId = await generateMongoId();
      const now = new Date();

      const floatRequest = await FloatRequestModel.create({
        _id: requestId,
        locationId,
        cashierId: userPayload._id,
        cashierShiftId,
        vaultShiftId: vaultShift._id,
        type,
        requestedAmount: amount,
        requestedDenominations: denominations,
        requestNotes: reason,
        requestedAt: now,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        auditLog: [
          {
            action: 'created',
            performedBy: userPayload._id,
            timestamp: now,
            notes: reason,
          },
        ],
      });

      // ============================================================================
      // STEP 4: Notify and return
      // ============================================================================
      try {
        const { createFloatRequestNotification } =
          await import('@/lib/helpers/vault/notifications');
        if (vaultShift.vaultManagerId)
          await createFloatRequestNotification(
            floatRequest.toObject(),
            userPayload.username as string,
            vaultShift.vaultManagerId
          );
      } catch (e) {
        console.error('Notification failed:', e);
      }

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
        floatRequest: floatRequest.toObject(),
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

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/vault/float-request';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Parse request body
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

      const isVM = userRoles.some(r =>
        ['admin', 'manager', 'vault-manager'].includes(String(r).toLowerCase())
      );
      if (requestDoc.cashierId.toString() !== userPayload._id && !isVM) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/vault/float-request',
          'Unauthorized',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      const allowedStatuses = ['pending', 'approved_vm'];
      if (!allowedStatuses.includes(requestDoc.status)) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/vault/float-request',
          `Cannot cancel ${requestDoc.status} requests`,
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: `Cannot cancel ${requestDoc.status} requests`,
          },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Cancel request and cleanup notifications
      // ============================================================================
      requestDoc.status = 'cancelled';
      requestDoc.auditLog.push({
        action: 'cancelled',
        performedBy: userPayload._id,
        timestamp: new Date(),
        notes: '',
      });
      await requestDoc.save();

      try {
        const VaultNotificationModel = (
          await import('@/app/api/lib/models/vaultNotification')
        ).default;
        const notifDeleteResult = await VaultNotificationModel.deleteMany({
          relatedEntityId: requestId,
          relatedEntityType: 'float_request',
        });
        if (notifDeleteResult.deletedCount === 0) {
          console.warn(
            `[float-request cancel] No notifications found to delete for requestId: ${requestId}`
          );
        }
      } catch (e) {
        console.error('Notification cleanup failed:', e);
      }

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
