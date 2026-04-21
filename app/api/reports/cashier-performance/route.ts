/**
 * Cashier Performance Reports API
 *
 * GET /api/reports/cashier-performance
 *
 * Retrieves cashier performance metrics and analytics.
 *
 * @module app/api/reports/cashier-performance/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import { NextRequest, NextResponse } from 'next/server';

interface CashierPerformanceQuery {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  cashierId?: string;
}

/**
 * Main GET handler for fetching cashier performance report
 *
 * @param {string} locationId - Filter by specific location ID
 * @param {string} cashierId - Filter by specific cashier user ID
 * @param {string} startDate - ISO date for range start
 * @param {string} endDate - ISO date for range end
 */
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

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const query: CashierPerformanceQuery = {
      locationId: searchParams.get('locationId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      cashierId: searchParams.get('cashierId') || undefined,
    };

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Build query filters
    // ============================================================================
    const shiftFilters: Record<string, unknown> = {};

    if (query.locationId) {
      shiftFilters.locationId = query.locationId;
    }

    if (query.startDate || query.endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (query.startDate) {
        createdAtFilter.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        createdAtFilter.$lte = new Date(query.endDate);
      }
      shiftFilters.createdAt = createdAtFilter;
    }

    if (query.cashierId) {
      shiftFilters.cashierId = query.cashierId;
    }

    // ============================================================================
    // STEP 5: Fetch cashier shifts
    // ============================================================================
    const shifts = await CashierShiftModel.find(shiftFilters)
      .sort({ createdAt: -1 })
      .limit(1000);

    // ============================================================================
    // STEP 6: Calculate performance metrics
    // ============================================================================
    const performance = shifts.map(shift => {
      const duration =
        shift.closedAt && shift.openedAt
          ? (shift.closedAt.getTime() - shift.openedAt.getTime()) /
          (1000 * 60 * 60) // hours
          : 0;

      const discrepancy = shift.discrepancy || 0;
      const accuracy =
        shift.expectedClosingBalance && shift.expectedClosingBalance > 0
          ? Math.max(
            0,
            1 - Math.abs(discrepancy) / shift.expectedClosingBalance
          )
          : 1;

      return {
        shiftId: shift._id,
        cashierId: shift.cashierId,
        date: shift.createdAt.toISOString().split('T')[0],
        duration,
        payoutsTotal: shift.payoutsTotal,
        payoutsCount: shift.payoutsCount,
        discrepancy,
        accuracy: accuracy * 100, // percentage
        status: shift.status,
      };
    });

    interface CashierSummary {
      shifts: number;
      totalPayouts: number;
      averageAccuracy: number;
      totalDiscrepancy: number;
    }

    // ============================================================================
    // STEP 7: Calculate summary statistics
    // ============================================================================
    const summary = {
      totalShifts: shifts.length,
      averageAccuracy:
        performance.reduce((sum, p) => sum + p.accuracy, 0) /
        performance.length || 0,
      totalPayouts: performance.reduce((sum, p) => sum + p.payoutsTotal, 0),
      averageShiftDuration:
        performance.reduce((sum, p) => sum + p.duration, 0) /
        performance.length || 0,
      byCashier: {} as Record<string, CashierSummary>,
    };

    // Group by cashier
    performance.forEach(p => {
      if (!summary.byCashier[p.cashierId]) {
        summary.byCashier[p.cashierId] = {
          shifts: 0,
          totalPayouts: 0,
          averageAccuracy: 0,
          totalDiscrepancy: 0,
        };
      }
      const cashier = summary.byCashier[p.cashierId] as CashierSummary;
      cashier.shifts += 1;
      cashier.totalPayouts += p.payoutsTotal;
      cashier.averageAccuracy =
        (cashier.averageAccuracy * (cashier.shifts - 1) + p.accuracy) /
        cashier.shifts;
      cashier.totalDiscrepancy += p.discrepancy;
    });

    // ============================================================================
    // STEP 8: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      performance,
      summary,
      filters: query,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching cashier performance reports:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
