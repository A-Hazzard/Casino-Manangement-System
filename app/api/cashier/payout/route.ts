/**
 * POST /api/cashier/payout — Process a ticket redemption or hand-pay payout.
 *
 * Called when a cashier redeems a TITO ticket or processes a machine hand-pay.
 * Validates that the cashier has sufficient float balance, creates a payout record
 * and a corresponding vault transaction, and decrements the shift's running balance.
 * Requires the vault shift to be reconciled before any payout can proceed.
 *
 * Body fields:
 * @param cashierShiftId {string}  Required. The ID of the cashier's active shift.
 * @param type           {string}  Required. Payout type: 'ticket' or 'hand_pay'.
 * @param amount         {number}  Required. Payout amount; must be > 0 and ≤ current float balance.
 * @param ticketNumber   {string}  Conditional. Required when type is 'ticket'.
 * @param printedAt      {string}  Optional. ISO timestamp when the ticket was printed; stored for audit.
 * @param machineId      {string}  Conditional. Required when type is 'hand_pay'; used to look up
 *   machine serial number.
 * @param reason         {string}  Optional. Description of the hand-pay reason; stored for audit.
 * @param notes          {string}  Optional. Free-text notes attached to the payout record.
 *
 * ---
 *
 * GET /api/cashier/payout — Retrieve payout history.
 *
 * Returns payout records for the requesting cashier, or for any cashier if the
 * caller has VM-level access. Populates machineSerialNumber on hand-pay records
 * that pre-date the serial field for backward compatibility.
 *
 * Query parameters:
 * @param cashierShiftId {string} Optional. Filter payouts to a specific shift.
 * @param cashierId      {string} Optional. VM only — filter by a specific cashier's user ID.
 * @param limit          {number} Optional. Maximum records to return. Defaults to 20.
 * @param startDate      {string} Optional. ISO date string lower bound on payout timestamp.
 * @param endDate        {string} Optional. ISO date string upper bound on payout timestamp.
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
      interface MachineResult { _id: string; origSerialNumber?: string; custom?: { name?: string } }
      const machine = await Machine.findOne({ _id: machineId }, { origSerialNumber: 1, 'custom.name': 1 }).lean() as unknown as MachineResult | null;
      machineSerialNumber = machine?.custom?.name || machine?.origSerialNumber || machineId;
    }

    // STEP 4: Process Payout
    const now = new Date();
    const payoutId = await generateMongoId();
    const transactionId = await generateMongoId();

    const payoutData: Record<string, unknown> = {
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

  } catch (error: unknown) {
    console.error('Error processing payout:', error instanceof Error ? error.message : error);
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
    const query: Record<string, unknown> = {};

    // SECURITY: If not VM, can only see their own payouts
    if (!isVM) {
      query.cashierId = userId;
    } else {
      const queryCashierId = searchParams.get('cashierId');
      if (queryCashierId) query.cashierId = queryCashierId;
    }

    if (cashierShiftId) query.cashierShiftId = cashierShiftId;

    if (startDate || endDate) {
      const timestampQuery: Record<string, Date> = {};
      if (startDate) timestampQuery.$gte = new Date(startDate);
      if (endDate) timestampQuery.$lte = new Date(endDate);
      query.timestamp = timestampQuery;
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
      interface MachineResult { _id: string; origSerialNumber?: string; custom?: { name?: string } }
      const machines = await Machine.find({ _id: { $in: machineIds } }, { origSerialNumber: 1, 'custom.name': 1 }).lean() as unknown as MachineResult[];
      const machineMap = machines.reduce((acc, m) => {
        acc[String(m._id)] = m?.custom?.name || m?.origSerialNumber || String(m._id);
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

  } catch (error: unknown) {
    console.error('Error fetching payouts:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
