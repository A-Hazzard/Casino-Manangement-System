/**
 * Machine Collection API
 *
 * POST /api/vault/machine-collections
 *
 * Records a machine cash collection, creating a MachineCollection record
 * and corresponding VaultTransaction.
 *
 * @module app/api/vault/machine-collections/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { updateVaultShiftInventory, validateDenominationTotal } from '@/app/api/lib/helpers/vault/inventory';
import { connectDB } from '@/app/api/lib/middleware/db';
import { MachineCollectionModel } from '@/app/api/lib/models/machineCollection';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import type { CreateMachineCollectionRequest } from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const vaultManagerId = userPayload._id as string;
    const username = (userPayload.username || userPayload.emailAddress) as string;
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasVMAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(role.toLowerCase())
    );
    if (!hasVMAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body: CreateMachineCollectionRequest = await request.json();
    const { machineId, machineName, amount, denominations, notes } = body;

    if (!machineId || !amount || !denominations) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Get active vault shift for location
    // ============================================================================
    const activeVaultShift = await VaultShiftModel.findOne({
      vaultManagerId,
      status: 'active',
    });

    if (!activeVaultShift) {
      return NextResponse.json(
        { success: false, error: 'No active vault shift found' },
        { status: 400 }
      );
    }

    const locationId = activeVaultShift.locationId;

    // ============================================================================
    // STEP 5: Create machine collection record
    // ============================================================================
    const collectionId = await generateMongoId();
    const now = new Date();

    const machineCollection = new MachineCollectionModel({
      _id: collectionId,
      locationId,
      machineId,
      machineName,
      collectedAt: now,
      amount,
      denominations,
      collectedBy: vaultManagerId,
      transactionId: '', // Will be set after transaction creation
      notes,
    });

    // ============================================================================
    // STEP 6.5: Validate Denomination Total
    // ============================================================================
    if (!validateDenominationTotal(amount, denominations)) {
      return NextResponse.json(
        { success: false, error: 'Denomination total does not match collection amount' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 6: Create vault transaction
    // ============================================================================
    const transactionId = await generateMongoId();
    machineCollection.transactionId = transactionId;

    const vaultTransaction = new VaultTransactionModel({
      _id: transactionId,
      locationId,
      timestamp: now,
      type: 'machine_collection',
      from: { type: 'machine', id: machineId },
      to: { type: 'vault' },
      amount,
      denominations,
      vaultBalanceBefore:
        activeVaultShift.closingBalance || activeVaultShift.openingBalance,
      vaultBalanceAfter:
        (activeVaultShift.closingBalance || activeVaultShift.openingBalance) +
        amount,
      vaultShiftId: activeVaultShift._id,
      performedBy: vaultManagerId,
      notes: `Machine collection from ${machineName || machineId}${notes ? `: ${notes}` : ''}`,
    });

    // ============================================================================
    // STEP 7: Save records
    // ============================================================================
    await machineCollection.save();
    await vaultTransaction.save();

    // ============================================================================
    // STEP 8: Update vault shift balance & inventory
    // ============================================================================
    await updateVaultShiftInventory(activeVaultShift, amount, denominations, true);

    // ============================================================================
    // STEP 9: Audit Activity
    // ============================================================================
    await logActivity({
      userId: vaultManagerId,
      username,
      action: 'create',
      details: `Recorded machine collection from ${machineName || machineId}: $${amount}`,
      metadata: {
        resource: 'vault',
        resourceId: locationId,
        machineId,
        transactionId,
      },
    });

    // ============================================================================
    // STEP 10: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      collection: machineCollection,
      transaction: vaultTransaction,
    });
  } catch (error) {
    console.error('Error creating machine collection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
