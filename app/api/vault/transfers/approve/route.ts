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
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { InterLocationTransferModel } from '@/app/api/lib/models/interLocationTransfer';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { ApproveInterLocationTransferRequest } from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/transfers/approve
 *
 * @body {string} transferId - REQUIRED. ID of the transfer request to approve
 * @body {boolean} approved - REQUIRED. Whether to approve (true) or deny (false)
 * @body {string} notes - Optional approval notes
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/transfers/approve';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Authorization check
      // ============================================================================
      const vaultManagerId = userPayload._id as string;
      const hasVMAccess = userRoles.some(role =>
        ['developer', 'admin', 'manager'].includes(String(role).toLowerCase())
      );
      if (!hasVMAccess) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/transfers/approve',
          'Insufficient permissions',
          user
        );
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
        logRouteError(
          functionName,
          'POST',
          '/api/vault/transfers/approve',
          'Transfer ID is required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Transfer ID is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Find and validate transfer
      // ============================================================================
      const transfer = await InterLocationTransferModel.findOne({
        _id: transferId,
      });
      if (!transfer) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/transfers/approve',
          'Transfer not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Transfer not found' },
          { status: 404 }
        );
      }

      if (transfer.status !== 'pending') {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/transfers/approve',
          'Transfer is not in pending status',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Transfer is not in pending status' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 4: Update transfer status
      // ============================================================================
      const now = new Date();
      const transferDoc = transfer as unknown as Record<string, unknown>;
      transferDoc.status = approved ? 'approved' : 'cancelled';
      transferDoc.approvedBy = vaultManagerId;
      transferDoc.approvedAt = now;

      if (notes) {
        const currentNotes = (transferDoc.notes as string) || '';
        transferDoc.notes = currentNotes + (currentNotes ? '; ' : '') + notes;
      }

      // ============================================================================
      // STEP 5: If approved, create vault transactions
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
        const transactionId = await generateMongoId();
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
            ((activeVaultShift.closingBalance ||
              activeVaultShift.openingBalance) as number) +
            (transferDoc.amount as number),
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
      // STEP 6: Save transfer
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
          amount: transferDoc.amount,
        },
      });

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'POST',
        '/api/vault/transfers/approve',
        1,
        user,
        duration
      );
      if (duration > 1000) {
        console.warn(`[POST /api/vault/transfers/approve] slow: ${duration}ms`);
      }

      // ============================================================================
      // STEP 7: Return success response
      // ============================================================================
      return NextResponse.json({
        success: true,
        transfer,
        transaction,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to approve transfer';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/transfers/approve',
        errorMessage,
        user
      );
      console.error('[POST /api/vault/transfers/approve] Error:', errorMessage);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}
