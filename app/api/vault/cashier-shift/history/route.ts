/**
 * Cashier Shift History API
 *
 * GET /api/vault/cashier-shift/history
 *
 * Retrieves shift history for a specific cashier.
 *
 * @module app/api/vault/cashier-shift/history/route
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

    const { searchParams } = new URL(request.url);
    const cashierId = searchParams.get('cashierId');
    const locationId = searchParams.get('locationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // ============================================================================
    // STEP 2: Authorization Check
    // ============================================================================
    const userRoles = (userPayload.roles as string[]) || [];
    const isCashier = userRoles.some(r => r.toLowerCase() === 'cashier');

    // VMs can view any cashier's history at their location
    // Cashiers can only view their own history
    if (isCashier && cashierId !== userPayload._id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Can only view your own history' },
        { status: 403 }
      );
    }

    if (!cashierId) {
      return NextResponse.json(
        { success: false, error: 'Missing cashierId' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Build Query
    // ============================================================================
    const query: any = { cashierId };

    if (locationId) {
      query.locationId = locationId;
    }

    // ============================================================================
    // STEP 4: Fetch Shift History
    // ============================================================================
    await connectDB();

    const [shifts, totalCount] = await Promise.all([
      CashierShiftModel.find(query)
        .sort({ openedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select({
          _id: 1,
          openedAt: 1,
          closedAt: 1,
          status: 1,
          openingBalance: 1,
          closingBalance: 1,
          expectedClosingBalance: 1,
          cashierEnteredBalance: 1,
          discrepancy: 1,
          payoutsTotal: 1,
          payoutsCount: 1,
          floatAdjustmentsTotal: 1,
          vmReviewNotes: 1,
          reviewedBy: 1,
          reviewedAt: 1,
        })
        .lean(),
      CashierShiftModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      shifts,
      total: totalCount,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: totalCount > skip + shifts.length,
      },
    });
  } catch (error) {
    console.error('Error fetching cashier shift history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
