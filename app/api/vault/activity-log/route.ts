/**
 * Vault Activity Log API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching activity log
 *
 * @param {string} locationId - ID of the location to filter by (REQUIRED)
 * @param {string} userId - Filter by specific user ID
 * @param {string} cashierId - Filter by specific cashier ID
 * @param {string} machineId - Filter by specific machine ID
 * @param {string} cashierShiftId - Filter by specific cashier shift ID
 * @param {string} type - Filter by transaction type
 * @param {string} startDate - ISO date for range start
 * @param {string} endDate - ISO date for range end
 * @param {number} limit - Result limit per page
 * @param {number} skip - Offset for pagination
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/activity-log';
  const user = extractUserFromRequest(request);
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate query parameters
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const locId = searchParams.get('locationId'),
        uid = searchParams.get('userId'),
        cid = searchParams.get('cashierId'),
        mid = searchParams.get('machineId'),
        sid = searchParams.get('cashierShiftId'),
        type = searchParams.get('type'),
        start = searchParams.get('startDate'),
        end = searchParams.get('endDate');
      const limit = parseInt(searchParams.get('limit') || '50'),
        skip = parseInt(searchParams.get('skip') || '0');

      if (!locId && !uid && !cid && !mid && !sid) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/activity-log',
          'Filter required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Filter required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 2: Build match filters
      // ============================================================================
      const filters: Record<string, unknown> = { locationId: locId };
      const isVM = userRoles
        .map(r => String(r).toLowerCase())
        .some(r =>
          ['admin', 'vault-manager', 'manager', 'developer'].includes(r)
        );

      if (!isVM) filters.performedBy = userPayload._id;
      else if (cid) filters.performedBy = cid;
      else if (uid) filters.performedBy = uid;

      if (sid) filters.cashierShiftId = sid;
      if (mid) filters.$or = [{ 'from.id': mid }, { 'to.id': mid }];
      if (type) filters.type = type;
      if (start || end) {
        filters.timestamp = {
          $gte: start ? new Date(start) : undefined,
          $lte: end ? new Date(end) : undefined,
        };
      }

      // ============================================================================
      // STEP 3: Execute query and pagination
      // ============================================================================
      const pipeline = [
        { $match: filters },
        { $sort: { timestamp: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'performedBy',
            foreignField: '_id',
            as: 'p',
          },
        },
        {
          $addFields: {
            performerName: {
              $cond: {
                if: { $gt: [{ $size: '$p' }, 0] },
                then: {
                  $concat: [
                    {
                      $ifNull: [
                        { $arrayElemAt: ['$p.profile.firstName', 0] },
                        '',
                      ],
                    },
                    ' ',
                    {
                      $ifNull: [
                        { $arrayElemAt: ['$p.profile.lastName', 0] },
                        '',
                      ],
                    },
                  ],
                },
                else: '$performedBy',
              },
            },
          },
        },
        { $project: { p: 0 } },
      ];

      const [activities, total] = await Promise.all([
        VaultTransactionModel.aggregate(
          pipeline as Parameters<typeof VaultTransactionModel.aggregate>[0]
        ),
        VaultTransactionModel.countDocuments(filters),
      ]);

      // ============================================================================
      // STEP 4: Return formatted results
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/activity-log',
        activities.length,
        user,
        duration
      );
      return NextResponse.json({
        success: true,
        activities,
        totalCount: total,
        pagination: {
          total,
          limit,
          skip,
          hasMore: total > skip + activities.length,
        },
      });
    } catch (e) {
      logRouteError(
        functionName,
        'GET',
        '/api/vault/activity-log',
        e instanceof Error ? e.message : 'Unknown error',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
