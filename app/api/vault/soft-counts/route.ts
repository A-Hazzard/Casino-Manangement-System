/**
 * Soft Count API
 *
 * POST /api/vault/soft-counts
 *
 * Records a soft count (mid-day cash removal), creating a SoftCount record
 * and corresponding VaultTransaction.
 *
 * @module app/api/vault/soft-counts/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { SoftCountModel } from '@/app/api/lib/models/softCount';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import type { CreateSoftCountRequest } from '@/shared/types/vault';
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
    const body: CreateSoftCountRequest = await request.json();
    const { amount, denominations, notes } = body;

    if (!amount || !denominations) {
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
    // STEP 5: Create soft count record
    // ============================================================================
    const softCountId = nanoid();
    const now = new Date();

    const softCount = new SoftCountModel({
      _id: softCountId,
      locationId,
      countedAt: now,
      amount,
      denominations,
      countedBy: vaultManagerId,
      transactionId: '', // Will be set after transaction creation
      notes,
    });

    // ============================================================================
    // STEP 6: Create vault transaction
    // ============================================================================
    const transactionId = nanoid();
    softCount.transactionId = transactionId;

    const vaultTransaction = new VaultTransactionModel({
      _id: transactionId,
      locationId,
      timestamp: now,
      type: 'soft_count',
      from: { type: 'vault' },
      to: { type: 'external' }, // Removed from vault
      amount,
      denominations,
      vaultBalanceBefore:
        activeVaultShift.closingBalance || activeVaultShift.openingBalance,
      vaultBalanceAfter:
        (activeVaultShift.closingBalance || activeVaultShift.openingBalance) -
        amount,
      vaultShiftId: activeVaultShift._id,
      performedBy: vaultManagerId,
      notes: `Soft count removal${notes ? `: ${notes}` : ''}`,
    });

    // ============================================================================
    // STEP 7: Save records
    // ============================================================================
    await softCount.save();
    await vaultTransaction.save();

    // ============================================================================
    // STEP 8: Update vault shift balance
    // ============================================================================
    activeVaultShift.closingBalance = vaultTransaction.vaultBalanceAfter;
    await activeVaultShift.save();

    // ============================================================================
    // STEP 9: Audit Activity
    // ============================================================================
    await logActivity({
      userId: vaultManagerId,
      username,
      action: 'create',
      details: `Recorded soft count removal: $${amount}`,
      metadata: {
        resource: 'vault',
        resourceId: locationId,
        transactionId,
        notes,
      },
    });

    // ============================================================================
    // STEP 10: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      softCount,
      transaction: vaultTransaction,
    });
  } catch (error) {
    console.error('Error creating soft count:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
