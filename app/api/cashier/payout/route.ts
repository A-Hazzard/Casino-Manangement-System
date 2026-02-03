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
      printedAt,
      machineId,
      reason,
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

    if (type === 'hand_pay' && !machineId) {
        return NextResponse.json(
            { success: false, error: 'Machine identification required for Hand Pay' },
            { status: 400 }
        );
    }
    
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

    // Check Balance using live tracking
    const currentBalance = shift.currentBalance || 0;

    if (currentBalance < amount) {
        return NextResponse.json(
            { success: false, error: 'Insufficient funds for payout' },
            { status: 400 }
        );
    }

    // STEP 4: Process Payout
    const now = new Date();
    const payoutId = nanoid();
    const transactionId = nanoid();

    const payoutData: any = {
        _id: payoutId,
        locationId: shift.locationId,
        cashierId: userId,
        cashierShiftId: shift._id,
        type,
        amount,
        validated: true, // Mock validation for Phase 1
        timestamp: now,
        cashierFloatBefore: currentBalance,
        cashierFloatAfter: currentBalance - amount,
        transactionId, // Satisfy requirement before creation
        notes,
        createdAt: now
    };

    if (type === 'ticket') {
        payoutData.ticketNumber = ticketNumber;
        if (printedAt) payoutData.printedAt = new Date(printedAt);
    } else if (type === 'hand_pay') {
        payoutData.machineId = machineId;
        payoutData.reason = reason;
    }

    const payout = await PayoutModel.create(payoutData);

    await VaultTransactionModel.create({
        _id: transactionId,
        locationId: shift.locationId,
        timestamp: now,
        type: 'payout',
        from: { type: 'cashier', id: userId },
        to: { type: 'external' }, // Customer
        amount,
        denominations: [], // No denomination tracking for payouts
        payoutId,
        cashierShiftId: shift._id,
        performedBy: userId,
        notes: `Payout (${type})`,
        isVoid: false,
        createdAt: now
    });

    // STEP 5: Update Shift
    shift.currentBalance -= amount;
    shift.payoutsTotal += amount;
    shift.payoutsCount += 1;
    await shift.save();

    return NextResponse.json({
        success: true,
        payout: payout.toObject(),
        newBalance: shift.currentBalance
    }, { status: 201 });

  } catch (error) {
    console.error('Error processing payout:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
