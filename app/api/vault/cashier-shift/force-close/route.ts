/**
 * Force Close Cashier Shift API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { calculateExpectedBalance } from '@/lib/helpers/vault/calculations';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/collection-session/finalize
 *
 * @body {string} sessionId - ID of the session to finalize (REQUIRED)
 * @body {string} locationId - ID of the location (REQUIRED)
 * @body {string} vaultShiftId - ID of the active vault shift (REQUIRED)
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: payload, userRoles }) => {
    try {
      const hasVMAccess = userRoles
        .map(r => String(r).toLowerCase())
        .some(role =>
          ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
        );
      if (!hasVMAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

      const {
        cashierId,
        shiftId,
        locationId,
        denominations,
        physicalCount,
        notes,
      } = await request.json();
      if (
        !locationId ||
        physicalCount === undefined ||
        (!cashierId && !shiftId)
      )
        return NextResponse.json(
          { success: false, error: 'Missing fields' },
          { status: 400 }
        );

      const activeStatuses = ['active', 'pending_start'];
      const cashierShift = shiftId
        ? await CashierShiftModel.findOne({
            _id: shiftId,
            status: { $in: activeStatuses },
          })
        : await CashierShiftModel.findOne({
            cashierId,
            locationId,
            status: { $in: activeStatuses },
          });
      if (!cashierShift)
        return NextResponse.json(
          { success: false, error: 'No active shift found' },
          { status: 404 }
        );

      const expected = calculateExpectedBalance(
        cashierShift.openingBalance,
        cashierShift.payoutsTotal,
        cashierShift.floatAdjustmentsTotal
      );
      const now = new Date(),
        discrepancy = physicalCount - expected;

      cashierShift.status = 'pending_review';
      cashierShift.closedAt = now;
      cashierShift.cashierEnteredBalance = physicalCount;
      cashierShift.cashierEnteredDenominations = denominations;
      cashierShift.expectedClosingBalance = expected;
      cashierShift.discrepancy = discrepancy;
      cashierShift.discrepancyResolved = false;
      cashierShift.vmReviewNotes = `Force closed by VM (${payload.username}). Notes: ${notes || 'No notes'}`;
      cashierShift.updatedAt = now;
      await cashierShift.save();

      const allShifts = await CashierShiftModel.find({
        vaultShiftId: cashierShift.vaultShiftId,
      });
      const hasBlocking = allShifts.some(
        s => s.status === 'active' || s.status === 'pending_review'
      );
      await VaultShiftModel.updateOne(
        { _id: cashierShift.vaultShiftId },
        { canClose: !hasBlocking }
      );

      await logActivity({
        userId: payload._id,
        username: payload.username as string,
        action: 'update',
        details: `Force closed shift for ${cashierId}. Phys: ${physicalCount}, Exp: ${expected}`,
        metadata: { resourceId: cashierShift._id, cashierId, notes },
      });

      return NextResponse.json({
        success: true,
        message: 'Shift force closed',
      });
    } catch (e: unknown) {
      console.error('[Cashier Force Close] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
