/**
 * Vault Metrics API
 *
 * GET /api/vault/metrics
 *
 * Retrieves daily vault metrics (Total Cash In, Out, Net Flow, Payouts).
 * Aggregates transactions for the current day (since midnight).
 *
 * @module app/api/vault/metrics/route */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getGamingDayRange } from '@/lib/utils/gamingDayRange';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/vault/metrics
 *
 * Handler flow:
 * 1. Performance tracking and authentication
 * 2. Parse and validate request parameters
 * 3. Licensee/location filtering
 * 4. Database connection and time range definition
 * 5. Aggregate transactions for metrics
 * 6. Calculate totals and return response
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Authentication & Performance Tracking
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const dateStr = searchParams.get('date');

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // ============================================================================
    // STEP 3: Licensee/location filtering
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicensees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    if (
      allowedLocationIds !== 'all' &&
      !allowedLocationIds.includes(locationId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied for this location' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 4: Define time range (Gaming Day)
    // ============================================================================
    const locationInfo = await GamingLocations.findOne({ _id: locationId }, { gameDayOffset: 1 }).lean();
    const gameDayOffset = (locationInfo as any)?.gameDayOffset ?? 8;
    
    const requestDate = dateStr ? new Date(dateStr) : new Date();
    const { rangeStart, rangeEnd } = getGamingDayRange(requestDate, gameDayOffset);

    // ============================================================================
    // STEP 5: Aggregate Transactions
    // ============================================================================
    const transactions = await VaultTransactionModel.find({
      locationId,
      timestamp: { 
        $gte: rangeStart,
        $lte: rangeEnd
      },
    }).lean();

    let totalCashIn = 0;
    let totalCashOut = 0;
    let payouts = 0;
    let expenses = 0;

    transactions.forEach(tx => {
      if (tx.to.type === 'vault') {
        totalCashIn += tx.amount;
      }
      if (tx.from.type === 'vault') {
        totalCashOut += tx.amount;
      }
      if (tx.type === 'expense') {
        expenses += tx.amount;
      }
    });

    const netCashFlow = totalCashIn - totalCashOut;

    // A. Cashier Floats sum
    const activeCashiersData = await CashierShiftModel.find({
        locationId,
        status: { $in: ['active', 'pending_review'] }
    }, { currentBalance: 1 }).lean();
    const totalCashierFloats = activeCashiersData.reduce((sum: number, s: any) => sum + (s.currentBalance || 0), 0);

    // B. Machine Money In (Drops) - Use Gaming Day Logic
    // Using the same range calculated above
    const gamingDayRange = { rangeStart, rangeEnd };

    // Get all machine IDs for this location
    const machines = await Machine.find({ gamingLocation: locationId }, { _id: 1 }).lean();
    const machineIds = machines.map((m: any) => String(m._id));

    const machineMeters = await Meters.aggregate([
        {
          $match: {
            machine: { $in: machineIds },
            readAt: {
              $gte: gamingDayRange.rangeStart,
              $lte: gamingDayRange.rangeEnd,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalMoneyIn: { $sum: '$movement.drop' },
          },
        },
    ]);
    const totalMachineBalance = machineMeters.length > 0 ? machineMeters[0].totalMoneyIn : 0;

    // ============================================================================
    // STEP 6: Performance tracking and return response
    // ============================================================================
    const payoutTxs = transactions.filter(t => t.type === 'payout');
    payouts = payoutTxs.length;

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(
        `Vault metrics API took ${duration}ms for location: ${locationId}`
      );
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalCashIn,
        totalCashOut,
        netCashFlow,
        payouts,
        totalMachineBalance,
        totalCashierFloats,
        expenses,
      },
    });
  } catch (error) {
    console.error('Error fetching vault metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
