/**
 * Cashier Shift History API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for cashier shift history
 *
 * @param {string} cashierId - ID of the cashier (REQUIRED)
 * @param {string} locationId - Filter by location ID
 * @param {number} limit - Results per page
 * @param {number} skip - Offset for pagination
 * @param {boolean} variance - Only show shifts with discrepancies
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: payload, userRoles }) => {
    try {
      const { searchParams } = new URL(request.url);
      const cashierId = searchParams.get('cashierId'),
        locationId = searchParams.get('locationId');
      const limit = parseInt(searchParams.get('limit') || '50'),
        skip = parseInt(searchParams.get('skip') || '0');
      const varianceOnly = searchParams.get('variance') === 'true';

      if (!cashierId)
        return NextResponse.json(
          { success: false, error: 'Missing cashierId' },
          { status: 400 }
        );

      const isCashier = userRoles
        .map(r => String(r).toLowerCase())
        .includes('cashier');
      if (isCashier && cashierId !== payload._id)
        return NextResponse.json(
          { success: false, error: 'Access denied: self-only' },
          { status: 403 }
        );

      const query: Record<string, unknown> = { cashierId };
      if (locationId) query.locationId = locationId;
      if (varianceOnly) query.discrepancy = { $ne: 0 };

      const [shifts, total] = await Promise.all([
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
        total,
        pagination: {
          total,
          limit,
          skip,
          hasMore: total > skip + shifts.length,
        },
      });
    } catch (e: unknown) {
      console.error('[Cashier Shift History] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
