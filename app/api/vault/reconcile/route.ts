/**
 * Vault Reconciliation API
 *
 * POST /api/vault/reconcile
 *
 * Reconcile vault balance (VM-1).
 * Allows periodic "Reconcile Vault" operations to adjust system totals
 * to match physical counts, with mandatory comment for audit purposes.
 *
 * @module app/api/vault/reconcile/route */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import type { ReconcileVaultRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/reconcile
 *
 * Handler flow:
 * 1. Performance tracking and authentication
 * 2. Parse and validate request body
 * 3. Licensee/location filtering via vault shift
 * 4. Database connection
 * 5. Get and validate vault shift
 * 6. Calculate current balance
 * 7. Add reconciliation to vault shift
 * 8. Create transaction record
 * 9. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // ============================================================================
    // STEP 1: Authentication & Performance Tracking
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = userPayload._id as string;
    const username = userPayload.username as string;
    const userRoles = (userPayload?.roles as string[]) || [];

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

    // ============================================================================
    // STEP 2: Parse and validate request
    // ============================================================================
    const body: ReconcileVaultRequest = await request.json();
    const { vaultShiftId, newBalance, denominations, reason, comment } = body;

    if (
      !vaultShiftId ||
      newBalance === undefined ||
      !denominations ||
      !reason ||
      !comment
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: vaultShiftId, newBalance, denominations, reason, comment',
        },
        { status: 400 }
      );
    }

    // Mandatory comment for audit (VM-1)
    if (comment.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Comment must be at least 10 characters for audit purposes',
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

    if (denominationValidation.total !== newBalance) {
      return NextResponse.json(
        {
          success: false,
          error: `Denomination total ($${denominationValidation.total}) does not match new balance ($${newBalance})`,
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 5: Get vault shift and validate location access
    // ============================================================================
    const vaultShift = await VaultShiftModel.findOne({ _id: vaultShiftId });

    if (!vaultShift) {
      return NextResponse.json(
        { success: false, error: 'Vault shift not found' },
        { status: 404 }
      );
    }

    if (vaultShift.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Cannot reconcile a closed vault shift' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 6: Licensee/location filtering
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicensees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    if (
      allowedLocationIds !== 'all' &&
      !allowedLocationIds.includes(vaultShift.locationId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied for this vault location' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 7: Calculate current balance (from last reconciliation or opening)
    // ============================================================================
    const previousBalance =
      vaultShift.reconciliations.length > 0
        ? vaultShift.reconciliations[vaultShift.reconciliations.length - 1]
            .newBalance
        : vaultShift.openingBalance;

    // ============================================================================
    // STEP 8: Add reconciliation to vault shift
    // ============================================================================
    const now = new Date();
    vaultShift.reconciliations.push({
      timestamp: now,
      previousBalance,
      newBalance,
      denominations,
      reason,
      comment,
    });

    
    // Update live state
    vaultShift.currentDenominations = denominations;
    vaultShift.closingBalance = newBalance;

    vaultShift.updatedAt = now;
    await vaultShift.save();

    // ============================================================================
    // STEP 9: Create transaction record
    // ============================================================================
    const transactionId = nanoid();
    const adjustmentAmount = newBalance - previousBalance;

    const transaction = await VaultTransactionModel.create({
      _id: transactionId,
      locationId: vaultShift.locationId,
      timestamp: now,
      type: 'vault_reconciliation',
      from: adjustmentAmount >= 0 ? { type: 'external' } : { type: 'vault' },
      to: adjustmentAmount >= 0 ? { type: 'vault' } : { type: 'external' },
      amount: Math.abs(adjustmentAmount),
      denominations,
      vaultBalanceBefore: previousBalance,
      vaultBalanceAfter: newBalance,
      vaultShiftId,
      performedBy: userId,
      notes: reason,
      auditComment: comment, // Mandatory for reconciliations
      isVoid: false,
      createdAt: now,
    });

    // ============================================================================
    // STEP 10: Performance tracking and return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    // STEP 10: Audit Activity
    await logActivity({
      userId,
      username,
      action: 'update',
      details: `Reconciled vault balance. New Balance: $${newBalance} (Adjustment: $${adjustmentAmount})`,
      metadata: {
        resource: 'vault',
        resourceId: vaultShift.locationId,
        resourceName: 'Vault',
        transactionId,
        shiftId: vaultShift._id.toString(),
        reason,
        comment,
      },
    });

    if (duration > 1000) {
      console.warn(`Vault reconcile API took ${duration}ms`);
    }

    return NextResponse.json(
      {
        success: true,
        vaultShift: vaultShift.toObject(),
        transaction: transaction.toObject(),
        adjustment: adjustmentAmount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error reconciling vault:', error);
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
