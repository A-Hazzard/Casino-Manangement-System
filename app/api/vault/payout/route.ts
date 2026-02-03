/**
 * Payout Creation API
 *
 * POST /api/vault/payout
 *
 * Allows a cashier to record a payout for either a ticket redemption or a hand pay.
 * This action creates a Payout record and a corresponding VaultTransaction.
 *
 * @module app/api/vault/payout/route */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import PayoutModel from '@/app/api/lib/models/payout';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import type { CreatePayoutRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

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
    const cashierId = userPayload._id as string;
    const username = userPayload.username as string;
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

    const currentBalance = cashierShift.currentBalance || 0;
    if (currentBalance < amount) {
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

    const payoutData: any = {
      _id: payoutId,
      locationId: cashierShift.locationId,
      cashierId,
      cashierShiftId,
      type,
      amount,
      validated: true,
      timestamp: now,
      cashierFloatBefore: currentBalance,
      cashierFloatAfter: currentBalance - amount,
      transactionId,
      notes,
      createdAt: now,
    };

    if (type === 'ticket') {
      payoutData.ticketNumber = body.ticketNumber;
      if (body.printedAt) payoutData.printedAt = new Date(body.printedAt);
    } else if (type === 'hand_pay') {
      payoutData.machineId = body.machineId;
      payoutData.reason = body.reason;
    }

    const payout = await PayoutModel.create(payoutData);

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
    cashierShift.currentBalance -= amount;
    await cashierShift.save();
 
    // STEP 7: Audit Activity
    await logActivity({
      userId: cashierId,
      username,
      action: 'create',
      details: `Processed ${type} payout: $${amount}`,
      metadata: {
        resource: 'machine', // Payouts are often machine linked if handpay
        resourceId: (body as any).machineId || cashierShift.locationId,
        resourceName: type === 'ticket' ? 'Ticket Redemption' : 'Hand Pay',
        payoutId,
        transactionId,
        cashierShiftId,
      },
    });

    // ============================================================================
    // STEP 8: Performance tracking and return response
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
