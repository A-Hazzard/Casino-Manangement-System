/**
 * Payouts API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { getMoneyOutAndJackpotScale } from '@/app/api/lib/utils/reviewerScale';
import PayoutModel from '@/app/api/lib/models/payout';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for listing payouts
 *
 * @param {string} locationId - REQUIRED. Filter payouts by gaming location.
 * @param {number} page - Optional. Page number for pagination. Default: 1.
 * @param {number} limit - Optional. Items per page. Default: 20.
 * @param {string} search - Optional. Search query for ticket, notes, or cashier ID.
 * @param {string} type - Optional. Filter by specific payout type.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/payouts';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate permissions
      // ============================================================================
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVaultAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager', 'cashier'].includes(
          role
        )
      );
      if (!hasVaultAccess) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/payouts',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Parse query params
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      if (!locationId) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/payouts',
          'Location ID is required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Location ID is required' },
          { status: 400 }
        );
      }

      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const skip = (page - 1) * limit;
      const search = searchParams.get('search');
      const type = searchParams.get('type');

      // ============================================================================
      // STEP 3: Build query
      // ============================================================================
      const query: Record<string, unknown> = { locationId };
      if (type && type !== 'all') query.type = type;
      if (search) {
        const sr = { $regex: search, $options: 'i' };
        const orArray: Array<Record<string, unknown>> = [
          { ticketNumber: sr },
          { notes: sr },
          { cashierId: sr },
        ];
        const ns = parseFloat(search);
        if (!isNaN(ns)) orArray.push({ amount: ns });
        query.$or = orArray;
      }

      // ============================================================================
      // STEP 4: Fetch payouts
      // ============================================================================
      const [payouts, total] = await Promise.all([
        PayoutModel.aggregate([
          { $match: query },
          { $sort: { timestamp: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'cashierId',
              foreignField: '_id',
              as: 'cashierDetails',
            },
          },
          {
            $addFields: {
              cashierName: {
                $let: {
                  vars: { user: { $arrayElemAt: ['$cashierDetails', 0] } },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $gt: ['$$user.profile.firstName', null] },
                          { $gt: ['$$user.profile.lastName', null] },
                        ],
                      },
                      then: {
                        $concat: [
                          '$$user.profile.firstName',
                          ' ',
                          '$$user.profile.lastName',
                        ],
                      },
                      else: '$cashierId',
                    },
                  },
                },
              },
            },
          },
          { $project: { cashierDetails: 0 } },
        ]),
        PayoutModel.countDocuments(query),
      ]);

      // ============================================================================
      // STEP 5: Apply reviewer scaling
      // ============================================================================
      payouts.forEach(
        (payoutItem: { amount: number; timestamp?: Date | string | null }) => {
          const payoutScale = getMoneyOutAndJackpotScale(
            userPayload as {
              moneyOutAndJackpotMultiplier?: number | null;
              roles?: string[];
              reviewerMultiplierStartTime?: Date | string | null;
            },
            payoutItem.timestamp ?? null
          );

          if (payoutScale !== 1 && typeof payoutItem.amount === 'number') {
            payoutItem.amount *= payoutScale;
          }
        }
      );

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/payouts',
        payouts.length,
        user,
        duration
      );

      // ============================================================================
      // STEP 6: Return response
      // ============================================================================
      return NextResponse.json({
        success: true,
        payouts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch payouts';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/payouts',
        errorMessage,
        user
      );
      console.error('[Payouts API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
