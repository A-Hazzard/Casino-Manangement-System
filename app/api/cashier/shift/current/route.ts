/**
 * Current Cashier Shift API
 * 
 * GET /api/cashier/shift/current
 * 
 * Retrieve the current active or pending shift for the logged-in cashier.
 * Used to populate the cashier dashboard.
 * 
 * @module app/api/cashier/shift/current/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { calculateExpectedBalance } from '@/lib/helpers/vault/calculations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
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

    // STEP 2: Find latest relevant shift
    await connectDB();
    
    // We look for any shift that is NOT closed, or closed very recently?
    // Mainly active, pending_start, pending_review.
    const shift = await CashierShiftModel.findOne({
      cashierId: userId,
      status: { $in: ['active', 'pending_start', 'pending_review'] },
    }).sort({ createdAt: -1 });

    // STEP 3: Check for active vault shift at user's location
    const locationId = (userPayload.assignedLocations as string[])?.[0];
    let hasActiveVaultShift = false;
    let isVaultReconciled = false;
    if (locationId) {
      const activeVaultShift = await VaultShiftModel.findOne({
        locationId,
        status: 'active',
      });
      hasActiveVaultShift = !!activeVaultShift;
      isVaultReconciled = activeVaultShift?.isReconciled || false;
    }

    if (!shift) {
      return NextResponse.json({
        success: true,
        shift: null,
        hasActiveVaultShift,
        isVaultReconciled,
      });
    }

    // STEP 4: Get current balance tracking
    let currentBalance = 0;
    if (shift.status === 'active') {
      currentBalance = shift.currentBalance || calculateExpectedBalance(
        shift.openingBalance,
        shift.payoutsTotal,
        shift.floatAdjustmentsTotal
      );
    }
    
    // STEP 5: Check for pending float movements (dual-approval flow)
    const pendingVmApproval = await FloatRequestModel.findOne({
        cashierId: userId,
        status: 'approved_vm',
    }).sort({ updatedAt: -1 });

    const pendingRequest = await FloatRequestModel.findOne({
        cashierId: userId,
        status: 'pending',
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      shift: shift.toObject(),
      currentBalance, // Only relevant for active shifts
      status: shift.status,
      hasActiveVaultShift,
      isVaultReconciled,
      pendingVmApproval: pendingVmApproval ? pendingVmApproval.toObject() : null,
      pendingRequest: pendingRequest ? pendingRequest.toObject() : null,
    });

  } catch (error) {
    console.error('Error fetching current shift:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
