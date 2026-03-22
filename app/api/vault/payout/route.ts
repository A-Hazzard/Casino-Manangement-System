/**
 * Payout Creation API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import PayoutModel from '@/app/api/lib/models/payout';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: payload, userRoles }) => {
    try {
      const hasCashierAccess = userRoles
        .map(r => String(r).toLowerCase())
        .some(role =>
          ['developer', 'admin', 'manager', 'cashier'].includes(role)
        );
      if (!hasCashierAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

      const body = await request.json();
      const {
        cashierShiftId,
        type,
        amount,
        notes,
        ticketNumber,
        printedAt,
        machineId,
        reason,
      } = body;
      if (!cashierShiftId || !type || amount === undefined)
        return NextResponse.json(
          { success: false, error: 'Missing fields' },
          { status: 400 }
        );
      if (amount <= 0)
        return NextResponse.json(
          { success: false, error: 'Amount must be positive' },
          { status: 400 }
        );

      const cashierShift = await CashierShiftModel.findOne({
        _id: cashierShiftId,
        status: 'active',
      });
      if (!cashierShift)
        return NextResponse.json(
          { success: false, error: 'No active cashier shift' },
          { status: 404 }
        );
      if (cashierShift.cashierId !== payload._id)
        return NextResponse.json(
          { success: false, error: 'Shift ownership mismatch' },
          { status: 403 }
        );

      const allowedLocIds = await getUserLocationFilter(
        payload.assignedLicencees || [],
        undefined,
        payload.assignedLocations || [],
        userRoles
      );
      if (
        allowedLocIds !== 'all' &&
        !allowedLocIds.includes(cashierShift.locationId)
      )
        return NextResponse.json(
          { success: false, error: 'Access denied for this location' },
          { status: 403 }
        );

      const currentBal = cashierShift.currentBalance || 0;
      if (currentBal < amount)
        return NextResponse.json(
          { success: false, error: 'Insufficient float' },
          { status: 400 }
        );

      const now = new Date(),
        pId = await generateMongoId(),
        txId = await generateMongoId();
      const payoutData: Record<string, unknown> = {
        _id: pId,
        locationId: cashierShift.locationId,
        cashierId: payload._id,
        cashierShiftId,
        type,
        amount,
        validated: true,
        timestamp: now,
        cashierFloatBefore: currentBal,
        cashierFloatAfter: currentBal - amount,
        transactionId: txId,
        notes,
        createdAt: now,
      };

      if (type === 'ticket') {
        payoutData.ticketNumber = ticketNumber;
        if (printedAt) payoutData.printedAt = new Date(printedAt);
      } else if (type === 'hand_pay') {
        payoutData.machineId = machineId;
        payoutData.reason = reason;
      }

      const payout = await PayoutModel.create(payoutData);
      const transaction = await VaultTransactionModel.create({
        _id: txId,
        locationId: cashierShift.locationId,
        timestamp: now,
        type: 'payout',
        from: { type: 'cashier', id: payload._id },
        to: { type: 'external' },
        amount,
        denominations: [],
        vaultShiftId: cashierShift.vaultShiftId,
        cashierShiftId,
        payoutId: pId,
        performedBy: payload._id,
        notes: `Payout: ${type}`,
        isVoid: false,
        createdAt: now,
      });

      cashierShift.payoutsTotal += amount;
      cashierShift.payoutsCount += 1;
      cashierShift.currentBalance -= amount;
      await cashierShift.save();

      await logActivity({
        userId: payload._id,
        username: payload.username,
        action: 'create',
        details: `Processed ${type} payout: $${amount}`,
        metadata: {
          resourceId: machineId || cashierShift.locationId,
          payoutId: pId,
          transactionId: txId,
          cashierShiftId,
        },
      });

      return NextResponse.json(
        {
          success: true,
          payout: payout.toObject(),
          transaction: transaction.toObject(),
        },
        { status: 201 }
      );
    } catch (e: unknown) {
      console.error('[Payout Create] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
