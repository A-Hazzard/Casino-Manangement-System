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

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { MachineCollectionModel } from '@/app/api/lib/models/machineCollection';
import type { CreateMachineCollectionRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
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
    const vaultManagerId = userPayload.userId;
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasVMAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager'].includes(role.toLowerCase())
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
    const collectionId = nanoid();
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
    // STEP 6: Create vault transaction
    // ============================================================================
    const transactionId = nanoid();
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
    // STEP 8: Update vault shift balance
    // ============================================================================
    activeVaultShift.closingBalance = vaultTransaction.vaultBalanceAfter;
    await activeVaultShift.save();

    // ============================================================================
    // STEP 9: Return success response
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
