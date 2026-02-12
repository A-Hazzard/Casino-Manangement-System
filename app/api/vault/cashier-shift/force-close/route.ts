/**
 * Force Close Cashier Shift API
 * 
 * POST /api/vault/cashier-shift/force-close
 * 
 * Allows a Vault Manager to end an active cashier shift.
 * This moves the shift to "pending_review" for resolution.
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { calculateExpectedBalance } from '@/lib/helpers/vault/calculations';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Authentication & Authorization
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userPayload._id as string;
    const username = userPayload.username as string;
    const userRoles = (userPayload?.roles as string[]) || [];

    const hasVMAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(role.toLowerCase())
    );

    if (!hasVMAccess) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { cashierId, locationId, denominations, physicalCount, notes } = await request.json();

    if (!cashierId || !locationId || !denominations || physicalCount === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Find active shift for this cashier
    const cashierShift = await CashierShiftModel.findOne({ 
      cashierId, 
      locationId,
      status: 'active'
    });

    if (!cashierShift) {
      return NextResponse.json({ success: false, error: 'No active shift found for this cashier' }, { status: 404 });
    }

    const expectedBalance = calculateExpectedBalance(
      cashierShift.openingBalance,
      cashierShift.payoutsTotal,
      cashierShift.floatAdjustmentsTotal
    );

    const now = new Date();
    const discrepancy = physicalCount - expectedBalance;

    // Move to pending_review so VM can resolve it from dashboard
    cashierShift.status = 'pending_review';
    cashierShift.closedAt = now;
    cashierShift.cashierEnteredBalance = physicalCount;
    cashierShift.cashierEnteredDenominations = denominations;
    cashierShift.expectedClosingBalance = expectedBalance;
    cashierShift.discrepancy = discrepancy;
    cashierShift.discrepancyResolved = false;
    cashierShift.vmReviewNotes = `Force closed by VM (${username}). Notes: ${notes || 'No notes'}`;
    cashierShift.updatedAt = now;

    await cashierShift.save();

    // Update vault shift canClose status
    const allShifts = await CashierShiftModel.find({ vaultShiftId: cashierShift.vaultShiftId });
    const hasActiveOrPending = allShifts.some(s => s.status === 'active' || s.status === 'pending_review');
    await VaultShiftModel.updateOne(
      { _id: cashierShift.vaultShiftId },
      { canClose: !hasActiveOrPending }
    );

    // Audit
    await logActivity({
      userId,
      username,
      action: 'update',
      details: `Force closed shift for cashier ${cashierId}. Physical: ${physicalCount}, Expected: ${expectedBalance}`,
      metadata: {
        resource: 'cashier_shift',
        resourceId: cashierShift._id,
        cashierId,
        forceClosedBy: userId,
        notes
      }
    });

    return NextResponse.json({ success: true, message: 'Shift force closed successfully' });
  } catch (error) {
    console.error('Error force closing cashier shift:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
