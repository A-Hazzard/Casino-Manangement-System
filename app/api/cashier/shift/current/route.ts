/**
 * Get Current Cashier Shift API
 *
 * GET /api/cashier/shift/current
 *
 * Retrieves the currently active shift for the logged-in cashier.
 * Used for populating the cashier dashboard.
 *
 * @module app/api/cashier/shift/current/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import type { CashierShift } from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
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
    const cashierId = userPayload.userId;

    // ============================================================================
    // STEP 2: Find active shift for the current cashier
    // ============================================================================
    await connectDB();
    const activeShift = await CashierShiftModel.findOne({
      cashierId,
      status: 'active',
    }).lean<CashierShift | null>();

    // ============================================================================
    // STEP 3: Return shift data or indicate no active shift
    // ============================================================================
    if (!activeShift) {
      return NextResponse.json({
        success: true,
        data: {
          activeShift: null,
          message: 'No active shift found for this cashier.',
        },
      });
    }

    const currentBalance =
      activeShift.openingBalance +
      activeShift.floatAdjustmentsTotal -
      activeShift.payoutsTotal;

    return NextResponse.json({
      success: true,
      data: {
        activeShift,
        currentBalance,
      },
    });
  } catch (error) {
    console.error('Error fetching current cashier shift:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
