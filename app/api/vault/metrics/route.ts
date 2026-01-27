/**
 * Vault Metrics API
 *
 * GET /api/vault/metrics
 *
 * Retrieves daily vault metrics (Total Cash In, Out, Net Flow, Payouts).
 * Aggregates transactions for the current day (since midnight).
 *
 * @module app/api/vault/metrics/route */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { NextRequest, NextResponse } from 'next/server';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';

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
    // STEP 4: Define time range (Start of Day)
    // ============================================================================
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // ============================================================================
    // STEP 5: Aggregate Transactions
    // ============================================================================
    const transactions = await VaultTransactionModel.find({
      locationId,
      timestamp: { $gte: startOfDay },
    }).lean();

    let totalCashIn = 0;
    let totalCashOut = 0;
    let payouts = 0;

    transactions.forEach(tx => {
      if (tx.to.type === 'vault') {
        totalCashIn += tx.amount;
      }
      if (tx.from.type === 'vault') {
        totalCashOut += tx.amount;
      }
    });

    const netCashFlow = totalCashIn - totalCashOut;

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
