/**
 * Payout Creation API
 *
 * POST /api/vault/payout
 *
 * Allows a cashier to record a payout for either a ticket redemption or a hand pay.
 * This action creates a Payout record and a corresponding VaultTransaction.
 *
 * @module app/api/vault/payout/route */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import PayoutModel from '@/app/api/lib/models/payout';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import type { CreatePayoutRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';

/**
 * POST /api/vault/payout
 *
 * Handler flow:
 * 1. Performance tracking and authentication
 * 2. Parse and validate request body
 * 3. Database connection and find active cashier shift
 * 4. Licensee/location filtering via cashier shift
 * 5. Create Payout and Transaction records
 * 6. Update cashier shift totals
 * 7. Return response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
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
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasCashierAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'cashier'].includes(role.toLowerCase())
    );
    if (!hasCashierAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body: CreatePayoutRequest = await request.json();
    const { cashierShiftId, type, amount, notes } = body;

    if (!cashierShiftId || !type || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to DB and find active cashier shift
    // ============================================================================
    await connectDB();
    const cashierShift = await CashierShiftModel.findOne({
      _id: cashierShiftId,
      status: 'active',
    });

    if (!cashierShift) {
      return NextResponse.json(
        { success: false, error: 'Active cashier shift not found' },
        { status: 404 }
      );
    }
    if (cashierShift.cashierId !== cashierId) {
      return NextResponse.json(
        { success: false, error: 'Cannot record payout for another cashier' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 4: Licensee/location filtering
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicensees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    if (
      allowedLocationIds !== 'all' &&
      !allowedLocationIds.includes(cashierShift.locationId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied for this location' },
        { status: 403 }
      );
    }

    const cashierFloatBefore =
      cashierShift.openingBalance +
      cashierShift.floatAdjustmentsTotal -
      cashierShift.payoutsTotal;
    if (cashierFloatBefore < amount) {
      return NextResponse.json(
        { success: false, error: 'Insufficient float for this payout' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Create Payout and Transaction records
    // ============================================================================
    const now = new Date();
    const payoutId = nanoid();
    const transactionId = nanoid();

    const payout = await PayoutModel.create({
      _id: payoutId,
      locationId: cashierShift.locationId,
      cashierId,
      cashierShiftId,
      type,
      amount,
      ...(type === 'ticket'
        ? { ticketNumber: body.ticketNumber, ticketBarcode: body.ticketBarcode }
        : {}),
      ...(type === 'hand_pay'
        ? {
            machineId: body.machineId,
            machineName: body.machineName,
            jackpotType: body.jackpotType,
          }
        : {}),
      validated: true, // Assuming validation happens before this call
      timestamp: now,
      cashierFloatBefore,
      cashierFloatAfter: cashierFloatBefore - amount,
      transactionId,
      notes,
      createdAt: now,
    });

    const transaction = await VaultTransactionModel.create({
      _id: transactionId,
      locationId: cashierShift.locationId,
      timestamp: now,
      type: 'payout',
      from: { type: 'cashier', id: cashierId },
      to: { type: 'external' },
      amount,
      denominations: [], // Payouts don't require denomination breakdown from cashier
      vaultShiftId: cashierShift.vaultShiftId,
      cashierShiftId,
      payoutId,
      performedBy: cashierId,
      notes: `Payout: ${type}`,
      isVoid: false,
      createdAt: now,
    });

    // ============================================================================
    // STEP 6: Update cashier shift totals
    // ============================================================================
    cashierShift.payoutsTotal += amount;
    cashierShift.payoutsCount += 1;
    await cashierShift.save();

    // ============================================================================
    // STEP 7: Performance tracking and return response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Payout API took ${duration}ms`);
    }

    return NextResponse.json(
      {
        success: true,
        payout: payout.toObject(),
        transaction: transaction.toObject(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating payout:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
