/**
 * Vault Manager Direct Cashier Shift Open API
 * 
 * POST /api/vault/cashier-shift/direct-open
 * 
 * Allows a Vault Manager to directly open a shift for a cashier,
 * skipping the request/approval workflow.
 * 
 * @module app/api/vault/cashier-shift/direct-open/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { updateDenominationInventory, validateDenominations } from '@/lib/helpers/vault/calculations';
import { validateVaultBalance, validateVaultDenominations } from '@/lib/helpers/vault/validation';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authentication & Authorization
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const vmUserId = userPayload._id as string;
    const vmUsername = userPayload.username as string;
    const userRoles = (userPayload.roles as string[]) || [];

    const hasVaultAccess = userRoles.some((role: string) =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );

    if (!hasVaultAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // STEP 2: Parse and validate request
    const body = await request.json();
    const { locationId, cashierId, amount, denominations, notes } = body;

    if (!locationId || !cashierId || amount === undefined || !denominations) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: locationId, cashierId, amount, denominations',
        },
        { status: 400 }
      );
    }

    // STEP 3: Validate denominations
    const denominationValidation = validateDenominations(denominations);
    if (!denominationValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid denominations',
          details: denominationValidation.errors,
        },
        { status: 400 }
      );
    }

    if (denominationValidation.total !== amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Denomination total ($${denominationValidation.total}) does not match amount ($${amount})`,
        },
        { status: 400 }
      );
    }

    // STEP 4: Connect to database
    await connectDB();

    // STEP 5: Check for active Vault Shift
    const vaultShift = await VaultShiftModel.findOne({
      locationId,
      status: 'active',
    });

    if (!vaultShift) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active vault shift found. Please open the vault first.',
        },
        { status: 400 }
      );
    }

    if (!vaultShift.isReconciled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vault is not reconciled. You must perform the mandatory opening reconciliation before starting cashier shifts.',
        },
        { status: 403 }
      );
    }

    const currentVaultBalance = vaultShift.closingBalance !== undefined ? vaultShift.closingBalance : vaultShift.openingBalance;

    // STEP 6: Validate Vault Balance & Denominations (Money leaving vault)
    const balanceCheck = validateVaultBalance(amount, currentVaultBalance);
    if (!balanceCheck.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient vault funds. Vault Balance: $${currentVaultBalance}, Requested: $${amount}`,
        },
        { status: 400 }
      );
    }

    const denomCheck = validateVaultDenominations(denominations, vaultShift.currentDenominations || []);
    if (!denomCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vault does not have the specific denominations for this float.',
          details: denomCheck.insufficientDenominations,
        },
        { status: 400 }
      );
    }

    // STEP 7: Check if cashier already has an active or pending shift
    const existingShift = await CashierShiftModel.findOne({
      cashierId: cashierId,
      status: { $in: ['active', 'pending_start', 'pending_review'] },
    });

    if (existingShift) {
      return NextResponse.json(
        {
          success: false,
          error: `Cashier already has an active or pending shift (Status: ${existingShift.status})`,
        },
        { status: 409 }
      );
    }

    // STEP 8: Create records in a transaction block (logical)
    const shiftId = await generateMongoId();
    const requestId = await generateMongoId();
    const transactionId = await generateMongoId();
    const now = new Date();

    // 1. Create Cashier Shift (Active)
    const cashierShift = await CashierShiftModel.create({
      _id: shiftId,
      locationId,
      cashierId: cashierId,
      vaultShiftId: vaultShift._id,
      status: 'active',
      openedAt: now,
      openingBalance: amount,
      openingDenominations: denominations,
      currentBalance: amount,
      lastSyncedDenominations: denominations,
      payoutsTotal: 0,
      payoutsCount: 0,
      floatAdjustmentsTotal: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create Float Request (Approved)
    await FloatRequestModel.create({
      _id: requestId,
      locationId,
      cashierId: cashierId,
      cashierShiftId: shiftId,
      vaultShiftId: vaultShift._id,
      type: 'increase',
      requestedAmount: amount,
      requestedDenominations: denominations,
      approvedAmount: amount,
      approvedDenominations: denominations,
      requestNotes: notes || 'Direct shift open by Vault Manager',
      vmNotes: 'Automatically approved by VM during direct open',
      requestedAt: now,
      processedBy: vmUserId,
      processedAt: now,
      status: 'approved',
      transactionId,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Update Vault Balance & Denominations
    const vaultBalanceAfter = currentVaultBalance - amount;
    const vaultDenominationsAfter = updateDenominationInventory(
      vaultShift.currentDenominations || [],
      denominations,
      'subtract'
    );
    
    vaultShift.closingBalance = vaultBalanceAfter;
    vaultShift.currentDenominations = vaultDenominationsAfter;
    vaultShift.canClose = false; // Cannot close vault with an active cashier
    await vaultShift.save();

    // 4. Create Transaction Record
    await VaultTransactionModel.create({
      _id: transactionId,
      locationId,
      timestamp: now,
      type: 'cashier_shift_open',
      from: { type: 'vault' },
      to: { type: 'cashier', id: cashierId },
      amount,
      denominations,
      vaultBalanceBefore: currentVaultBalance,
      vaultBalanceAfter: vaultBalanceAfter,
      vaultShiftId: vaultShift._id,
      cashierShiftId: shiftId,
      performedBy: vmUserId,
      notes: notes || 'Shift opened directly by Vault Manager',
      createdAt: now,
    });

    // STEP 9: Audit Activity
    await logActivity({
      userId: vmUserId,
      username: vmUsername,
      action: 'create',
      details: `Directly opened cashier shift for ${cashierId} with float $${amount}`,
      metadata: {
        resource: 'cashier_shift',
        resourceId: shiftId,
        locationId,
        cashierId,
        amount,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Cashier shift opened successfully.',
        shift: cashierShift.toObject(),
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in direct shift open:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
