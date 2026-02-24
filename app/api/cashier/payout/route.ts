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
import { Machine } from '@/app/api/lib/models/machines';
import PayoutModel from '@/app/api/lib/models/payout';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import type { CreatePayoutRequest } from '@/shared/types/vault';
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

    // STEP 3.5: Check if Vault is reconciled
    const vaultShift = await VaultShiftModel.findOne({ 
        _id: shift.vaultShiftId,
        status: 'active'
    });

    if (!vaultShift?.isReconciled) {
        return NextResponse.json(
            { success: false, error: 'Vault is not reconciled. Operation blocked until Vault Manager performs reconciliation.' },
            { status: 403 }
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

    // STEP 3.7: Fetch Machine Serial if Hand Pay
    let machineSerialNumber = '';
    if (type === 'hand_pay' && machineId) {
        const machine = await Machine.findOne({ _id: machineId }, { origSerialNumber: 1, 'custom.name': 1 }).lean();
        machineSerialNumber = (machine as any)?.custom?.name || (machine as any)?.origSerialNumber || machineId;
    }

    // STEP 4: Process Payout
    const now = new Date();
    const payoutId = await generateMongoId();
    const transactionId = await generateMongoId();

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
        payoutData.machineSerialNumber = machineSerialNumber;
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
        notes: type === 'hand_pay' ? `Payout (Hand Pay - ${machineSerialNumber})` : `Payout (Ticket Redemption - ${ticketNumber})`,
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

export async function GET(request: NextRequest) {
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
    const userRoles = (userPayload?.roles as string[]) || [];
    const isVM = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );

    // STEP 2: Parse query parameters
    const { searchParams } = new URL(request.url);
    const cashierShiftId = searchParams.get('cashierShiftId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // STEP 3: Build Query
    await connectDB();
    const query: any = {};
    
    // SECURITY: If not VM, can only see their own payouts
    if (!isVM) {
        query.cashierId = userId;
    } else {
        const queryCashierId = searchParams.get('cashierId');
        if (queryCashierId) query.cashierId = queryCashierId;
    }

    if (cashierShiftId) query.cashierShiftId = cashierShiftId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // STEP 4: Fetch Payouts
    const payouts = await PayoutModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Backward compatibility: Populate machineSerialNumber if missing
    const handPayPayouts = payouts.filter(p => p.type === 'hand_pay' && !p.machineSerialNumber && p.machineId);
    if (handPayPayouts.length > 0) {
        const machineIds = [...new Set(handPayPayouts.map(p => p.machineId))];
        const machines = await Machine.find({ _id: { $in: machineIds } }, { origSerialNumber: 1, 'custom.name': 1 }).lean();
        const machineMap = machines.reduce((acc, m) => {
            acc[String(m._id)] = (m as any)?.custom?.name || (m as any)?.origSerialNumber || String(m._id);
            return acc;
        }, {} as Record<string, string>);

        payouts.forEach(p => {
            if (p.type === 'hand_pay' && !p.machineSerialNumber && p.machineId) {
                p.machineSerialNumber = machineMap[p.machineId] || p.machineId;
            }
        });
    }

    return NextResponse.json({
      success: true,
      payouts
    });

  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
