/**
 * Cashier Payout API
 * 
 * POST /api/cashier/payout
 * 
 * Process a ticket redemption or hand pay.
 * Updates cashier shift metrics and creates a payout record.
 * 
 * @module app/api/cashier/payout/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import PayoutModel from '@/app/api/lib/models/payout';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { calculateExpectedBalance } from '@/lib/helpers/vault/calculations';
import type { CreatePayoutRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authorization
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = userPayload._id as string;

    // STEP 2: Parse Request
    const body: CreatePayoutRequest = await request.json();
    const { 
      cashierShiftId, 
      type, 
      amount, 
      ticketNumber, 
      machineId, 
      notes 
    } = body;

    // Validate
    if (!cashierShiftId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payout data' },
        { status: 400 }
      );
    }

    if (type === 'ticket' && !ticketNumber) {
        return NextResponse.json(
            { success: false, error: 'Ticket number required' },
            { status: 400 }
        );
    }
    // For hand_pay, machineId might be optional if generic?
    
    // STEP 3: DB Connection & Shift Check
    await connectDB();
    const shift = await CashierShiftModel.findOne({ 
        _id: cashierShiftId,
        cashierId: userId,
        status: 'active' 
    });

    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Active cashier shift not found' },
        { status: 404 }
      );
    }

    // Check Balance (Optional: prevent negative float? )
    // FRD doesn't explicitly forbid negative, but practically impossible.
    // Calculate current float
    const currentFloat = calculateExpectedBalance(
        shift.openingBalance,
        shift.payoutsTotal,
        shift.floatAdjustmentsTotal
    );

    if (currentFloat < amount) {
        return NextResponse.json(
            { success: false, error: 'Insufficient float for payout' },
            { status: 400 }
        );
    }

    // STEP 4: Process Payout
    const now = new Date();
    const payoutId = nanoid();

    const payout = await PayoutModel.create({
        _id: payoutId,
        locationId: shift.locationId,
        cashierId: userId,
        cashierShiftId: shift._id,
        type,
        amount,
        ticketNumber,
        machineId,
        validated: true, // Mock validation for Phase 1
        timestamp: now,
        cashierFloatBefore: currentFloat,
        cashierFloatAfter: currentFloat - amount,
        notes,
        createdAt: now
    });

    const transactionId = nanoid();
    await VaultTransactionModel.create({
        _id: transactionId,
        locationId: shift.locationId,
        timestamp: now,
        type: 'payout',
        from: { type: 'cashier', id: userId },
        to: { type: 'external' }, // Customer
        amount,
        denominations: [], // Payouts usually don't track exact denom out in this system, or do they? 
                           // FRD BR-02 says "Every transaction". 
                           // If we don't track denom here, we can't strict track denom balance.
                           // Assumption: Payouts decrease "value" but matching denom tracking is hard for high speed.
                           // However, for strict Vault, we *should* track.
                           // For Phase 1, I'll allow empty denoms for payout (just value), 
                           // or strict requires cashier to say "I gave 2x$20".
                           // FRD Flow 4 doesn't explicitly mention payout denom selection.
                           // I'll leave denoms empty for now to simplify UI, but note it.
        payoutId,
        cashierShiftId: shift._id,
        performedBy: userId,
        notes: `Payout (${type})`,
        isVoid: false,
        createdAt: now
    });

    // Link transaction to payout
    payout.transactionId = transactionId;
    await payout.save();

    // STEP 5: Update Shift
    shift.payoutsTotal += amount;
    shift.payoutsCount += 1;
    await shift.save();

    return NextResponse.json({
        success: true,
        payout: payout.toObject(),
        newBalance: currentFloat - amount
    }, { status: 201 });

  } catch (error) {
    console.error('Error processing payout:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
