/**
 * Cashier Shifts List API
 *
 * GET /api/cashier/shifts
 *
 * Retrieves a list of cashier shifts with optional filtering.
 * Useful for VM dashboard to find pending reviews.
 *
 * @module app/api/cashier/shifts/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userRoles = (userPayload?.roles as string[]) || [];
    const userId = userPayload?._id as string;
    const isVM = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const locationId = searchParams.get('locationId');
    const cashierIdFromParams = searchParams.get('cashierId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // SECURITY: If not VM, you can ONLY see your own shifts
    let finalCashierId = cashierIdFromParams;
    if (!isVM) {
      finalCashierId = userId;
    }

    const query: Record<string, unknown> = {};
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    if (locationId) query.locationId = locationId;
    if (finalCashierId) query.cashierId = finalCashierId;

    if (startDate || endDate) {
      const createdAtQuery: Record<string, Date> = {};
      if (startDate) createdAtQuery.$gte = new Date(startDate);
      if (endDate) createdAtQuery.$lte = new Date(endDate);
      query.createdAt = createdAtQuery;
    }

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Fetch shifts
    // ============================================================================
    // Use aggregate to join with users collection to get cashier name if needed
    // But CashierShiftModel stores cashierId. We might need to fetch names separately or rely on frontend to know names if they are cached.
    // Ideally we should populate or store name.
    // For now, let's just fetch shifts. Frontend might need to look up names.

    const shifts = await CashierShiftModel.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'cashierId',
          foreignField: '_id',
          as: 'cashierInfo',
        },
      },
      {
        $addFields: {
          matchedUser: { $arrayElemAt: ['$cashierInfo', 0] },
        },
      },
      {
        $lookup: {
          from: 'gaminglocations', // Collection name for locations
          localField: 'locationId',
          foreignField: '_id',
          as: 'locationInfo',
        },
      },
      {
        $addFields: {
          matchedLocation: { $arrayElemAt: ['$locationInfo', 0] },
        },
      },
      {
        $addFields: {
          cashierUsername: '$matchedUser.username',
          locationName: '$matchedLocation.name',
          cashierName: {
            $let: {
              vars: {
                fullName: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ['$matchedUser.profile.firstName', ''] },
                        ' ',
                        { $ifNull: ['$matchedUser.profile.lastName', ''] },
                      ],
                    },
                  },
                },
              },
              in: {
                $cond: {
                  if: { $and: [{ $ne: ['$$fullName', null] }, { $ne: ['$$fullName', ''] }, { $ne: ['$$fullName', ' '] }] },
                  then: {
                    $concat: [
                      { $ifNull: ['$matchedUser.username', 'Cashier'] },
                      ' (',
                      '$$fullName',
                      ')'
                    ]
                  },
                  else: { $ifNull: ['$matchedUser.username', '$cashierId'] }
                }
              }
            }
          },
        },
      },
      {
        $project: {
          cashierInfo: 0,
          matchedUser: 0,
          locationInfo: 0,
          matchedLocation: 0,
        },
      },
    ]);

    // ============================================================================
    // STEP 5: Return response
    // ============================================================================
    return NextResponse.json({
      success: true,
      shifts,
    });
  } catch (error: unknown) {
    console.error('Error fetching cashier shifts:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
