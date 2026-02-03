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

    // SECURITY: If not VM, you can ONLY see your own shifts
    let finalCashierId = cashierIdFromParams;
    if (!isVM) {
      finalCashierId = userId;
    }

    const query: any = {};
    if (status) query.status = status;
    if (locationId) query.locationId = locationId;
    if (finalCashierId) query.cashierId = finalCashierId;

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
        $addFields: {
          cashierUsername: '$matchedUser.username',
          cashierName: {
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
      },
      {
        $project: {
          cashierInfo: 0,
          matchedUser: 0,
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
  } catch (error) {
    console.error('Error fetching cashier shifts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
