/**
 * Transfer Approval API
 *
 * POST /api/vault/transfers/approve
 *
 * Approves or denies an inter-location transfer request.
 *
 * @module app/api/vault/transfers/approve/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { InterLocationTransferModel } from '@/app/api/lib/models/interLocationTransfer';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import type { ApproveInterLocationTransferRequest } from '@/shared/types/vault';
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
    const body: ApproveInterLocationTransferRequest = await request.json();
    const { transferId, approved, notes } = body;

    if (!transferId) {
      return NextResponse.json(
        { success: false, error: 'Transfer ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Find and validate transfer
    // ============================================================================
    const transfer = await InterLocationTransferModel.findById(transferId);
    if (!transfer) {
      return NextResponse.json(
        { success: false, error: 'Transfer not found' },
        { status: 404 }
      );
    }

    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Transfer is not in pending status' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Update transfer status
    // ============================================================================
    const now = new Date();
    const transferDoc = transfer as any; // Cast to avoid mongoose typing issues
    transferDoc.status = approved ? 'approved' : 'cancelled';
    transferDoc.approvedBy = vaultManagerId;
    transferDoc.approvedAt = now;

    if (notes) {
      const currentNotes = (transferDoc.notes as string) || '';
      transferDoc.notes = currentNotes + (currentNotes ? '; ' : '') + notes;
    }

    // ============================================================================
    // STEP 6: If approved, create vault transactions
    // ============================================================================
    let transaction;
    if (approved) {
      // Get active vault shift for the TO location
      const activeVaultShift = await VaultShiftModel.findOne({
        locationId: transferDoc.toLocationId,
        status: 'active',
      });

      if (!activeVaultShift) {
        return NextResponse.json(
          {
            success: false,
            error: 'No active vault shift found at destination location',
          },
          { status: 400 }
        );
      }

      // Create transaction for receiving location
      const transactionId = nanoid();
      transferDoc.transactionId = transactionId;
      transferDoc.completedAt = now;

      transaction = new VaultTransactionModel({
        _id: transactionId,
        locationId: transferDoc.toLocationId,
        timestamp: now,
        type: 'expense', // Inter-location transfer received
        from: { type: 'external' },
        to: { type: 'vault' },
        amount: transferDoc.amount,
        denominations: transferDoc.denominations,
        vaultBalanceBefore:
          activeVaultShift.closingBalance || activeVaultShift.openingBalance,
        vaultBalanceAfter:
          (activeVaultShift.closingBalance || activeVaultShift.openingBalance) +
          transferDoc.amount,
        vaultShiftId: activeVaultShift._id,
        performedBy: vaultManagerId,
        notes: `Inter-location transfer from ${transferDoc.fromLocationName}${notes ? `: ${notes}` : ''}`,
      });

      await transaction.save();

      // Update vault shift balance
      activeVaultShift.closingBalance = transaction.vaultBalanceAfter;
      await activeVaultShift.save();

      transferDoc.status = 'completed';
    }

    // ============================================================================
    // STEP 7: Save transfer
    // ============================================================================
    await transfer.save();

    // Audit Activity
    await logActivity({
      userId: vaultManagerId as string,
      username: userPayload.username as string,
      action: 'update',
      details: `${approved ? 'Approved' : 'Denied'} transfer from ${transferDoc.fromLocationId} to ${transferDoc.toLocationId}: $${transferDoc.amount}`,
      metadata: {
        resource: 'vault',
        resourceId: transferDoc.toLocationId,
        resourceName: 'Inter-Location Transfer',
        transferId: transferDoc._id,
        status: approved ? 'approved' : 'denied',
        amount: transferDoc.amount
      },
    });

    // ============================================================================
    // STEP 8: Return success response
    // ============================================================================
    return NextResponse.json({
      success: true,
      transfer,
      transaction,
    });
  } catch (error) {
    console.error('Error approving inter-location transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
