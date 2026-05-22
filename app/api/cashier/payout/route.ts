/**
 * POST /api/cashier/payout — Process a ticket redemption or hand-pay payout.
 *
 * Called when a cashier redeems a TITO ticket or processes a machine hand-pay.
 * Validates that the cashier has sufficient float balance, creates a payout record
 * and a corresponding vault transaction, and decrements the shift's running balance.
 * Requires the vault shift to be reconciled before any payout can proceed.
 *
 * Body fields:
 * @param {string} cashierShiftId - Required. The ID of the cashier's active shift.
 * @param {string} type - Required. Payout type: 'ticket' or 'hand_pay'.
 * @param {number} amount - Required. Payout amount; must be > 0 and ≤ current float balance.
 * @param {string} [ticketNumber] - Conditional. Required when type is 'ticket'.
 * @param {string} [printedAt] - Optional. ISO timestamp when the ticket was printed; stored for audit.
 * @param {string} [machineId] - Conditional. Required when type is 'hand_pay'; used to look up
 *   machine serial number.
 * @param {string} [reason] - Optional. Description of the hand-pay reason; stored for audit.
 * @param {string} [notes] - Optional. Free-text notes attached to the payout record.
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
 * @param {string} [cashierShiftId] - Optional. Filter payouts to a specific shift.
 * @param {string} [cashierId] - Optional. VM only — filter by a specific cashier's user ID.
 * @param {number} [limit] - Optional. Maximum records to return. Defaults to 20.
 * @param {string} [startDate] - Optional. ISO date string lower bound on payout timestamp.
 * @param {string} [endDate] - Optional. ISO date string upper bound on payout timestamp.
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
import {
  logRouteFetch,
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { generateMongoId } from '@/lib/utils/id';
import type { GamingMachine, PayoutDocument } from '@shared/types';
import type { CreatePayoutRequest } from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/cashier/payout';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      logRouteError(
        functionName,
        'POST',
        '/api/cashier/payout',
        'Unauthorized',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = userPayload._id as string;

    // ============================================================================
    // STEP 2: Parse Request
    // ============================================================================
    const body: CreatePayoutRequest = await request.json();
    const {
      cashierShiftId,
      type,
      amount,
      ticketNumber,
      printedAt,
      machineId,
      reason,
      notes,
    } = body;

    // Validate
    if (!cashierShiftId || !amount || amount <= 0) {
      logRouteError(
        functionName,
        'POST',
        '/api/cashier/payout',
        'Invalid payout data',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Invalid payout data' },
        { status: 400 }
      );
    }

    if (type === 'ticket' && !ticketNumber) {
      logRouteError(
        functionName,
        'POST',
        '/api/cashier/payout',
        'Ticket number required',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Ticket number required' },
        { status: 400 }
      );
    }

    if (type === 'hand_pay' && !machineId) {
      logRouteError(
        functionName,
        'POST',
        '/api/cashier/payout',
        'Machine identification required for Hand Pay',
        user
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Machine identification required for Hand Pay',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: DB Connection & Shift Check
    // ============================================================================
    await connectDB();
    const shift = await CashierShiftModel.findOne({
      _id: cashierShiftId,
      cashierId: userId,
      status: 'active',
    });

    if (!shift) {
      logRouteError(
        functionName,
        'POST',
        '/api/cashier/payout',
        `Active cashier shift not found: ${cashierShiftId}`,
        user
      );
      return NextResponse.json(
        { success: false, error: 'Active cashier shift not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Check if Vault is reconciled
    // ============================================================================
    const vaultShift = await VaultShiftModel.findOne({
      _id: shift.vaultShiftId,
      status: 'active',
    });

    if (!vaultShift?.isReconciled) {
      logRouteError(
        functionName,
        'POST',
        '/api/cashier/payout',
        'Vault is not reconciled',
        user
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'Vault is not reconciled. Operation blocked until Vault Manager performs reconciliation.',
        },
        { status: 403 }
      );
    }

    // Check Balance using live tracking
    const currentBalance = shift.currentBalance || 0;

    if (currentBalance < amount) {
      logRouteError(
        functionName,
        'POST',
        '/api/cashier/payout',
        'Insufficient funds for payout',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Insufficient funds for payout' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Fetch Machine Serial if Hand Pay
    // ============================================================================
    let machineSerialNumber = '';
    if (type === 'hand_pay' && machineId) {
      const machine = await Machine.findOne(
        { _id: machineId },
        { origSerialNumber: 1, 'custom.name': 1 }
      ).lean<GamingMachine>();
      machineSerialNumber =
        machine?.custom?.name || machine?.origSerialNumber || machineId;
    }

    // ============================================================================
    // STEP 6: Process Payout
    // ============================================================================
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
      createdAt: now,
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
      notes:
        type === 'hand_pay'
          ? `Payout (Hand Pay - ${machineSerialNumber})`
          : `Payout (Ticket Redemption - ${ticketNumber})`,
      isVoid: false,
      createdAt: now,
    });

    // ============================================================================
    // STEP 7: Update Shift
    // ============================================================================
    shift.currentBalance -= amount;
    shift.payoutsTotal += amount;
    shift.payoutsCount += 1;
    await shift.save();

    const duration = Date.now() - startTime;
    logRouteCreate(
      functionName,
      'POST',
      '/api/cashier/payout',
      1,
      user,
      duration
    );
    return NextResponse.json(
      {
        success: true,
        payout: payout.toObject(),
        newBalance: shift.currentBalance,
      },
      { status: 201 }
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    logRouteError(
      functionName,
      'POST',
      '/api/cashier/payout',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/cashier/payout';
  const user = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      logRouteError(
        functionName,
        'GET',
        '/api/cashier/payout',
        'Unauthorized',
        user
      );
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

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const cashierShiftId = searchParams.get('cashierShiftId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // ============================================================================
    // STEP 3: Build Query
    // ============================================================================
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

    // ============================================================================
    // STEP 4: Fetch Payouts
    // ============================================================================
    const payouts = await PayoutModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean<PayoutDocument[]>();

    // Backward compatibility: Populate machineSerialNumber if missing
    const handPayPayouts = payouts.filter(
      p => p.type === 'hand_pay' && !p.machineSerialNumber && p.machineId
    );
    if (handPayPayouts.length > 0) {
      const machineIds = [...new Set(handPayPayouts.map(p => p.machineId))];
      const machines = await Machine.find(
        { _id: { $in: machineIds } },
        { origSerialNumber: 1, 'custom.name': 1 }
      ).lean<GamingMachine[]>();
      const machineMap = machines.reduce(
        (acc, m) => {
          acc[String(m._id)] =
            m?.custom?.name || m?.origSerialNumber || String(m._id);
          return acc;
        },
        {} as Record<string, string>
      );

      payouts.forEach(p => {
        if (p.type === 'hand_pay' && !p.machineSerialNumber && p.machineId) {
          p.machineSerialNumber = machineMap[p.machineId] || p.machineId;
        }
      });
    }

    const duration = Date.now() - startTime;
    logRouteFetch(
      functionName,
      'GET',
      '/api/cashier/payout',
      payouts.length,
      user,
      duration
    );
    return NextResponse.json({
      success: true,
      payouts,
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    logRouteError(
      functionName,
      'GET',
      '/api/cashier/payout',
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
