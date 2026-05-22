/**
 * Vault Reconciliation API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  logRouteError,
  extractUserFromRequest,
  logRouteUpdate,
} from '@/app/api/lib/utils/routeLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';
import VaultShiftModel from '../../lib/models/vaultShift';

/**
 * Main POST handler for vault reconciliation
 *
 * @body {string} vaultShiftId - REQUIRED. The ID of the shift being reconciled.
 * @body {number} newBalance - REQUIRED. The counted balance to set.
 * @body {Object} denominations - REQUIRED. Denomination counts for the new balance.
 * @body {string} reason - REQUIRED. Reason for the adjustment.
 * @body {string} comment - Optional. Additional details.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/reconcile';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: payload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Check permissions
      // ============================================================================
      const hasVaultAccess = userRoles
        .map(r => String(r).toLowerCase())
        .some(role =>
          ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
        );
      if (!hasVaultAccess) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/reconcile',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Parse and validate body
      // ============================================================================
      const { vaultShiftId, newBalance, denominations, reason, comment } =
        await request.json();
      const finalDesc = (reason || comment || '').trim();

      // ============================================================================
      // STEP 3: Validate denominations
      // ============================================================================
      const validation = validateDenominations(denominations);
      if (!validation.valid) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/reconcile',
          'Invalid denominations',
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid denominations',
            details: validation.errors,
          },
          { status: 400 }
        );
      }
      if (validation.total !== newBalance) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/reconcile',
          `Balance mismatch: $${validation.total} vs $${newBalance}`,
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: `Balance mismatch: $${validation.total} vs $${newBalance}`,
          },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 4: Validate vault shift
      // ============================================================================
      const vaultShift = await VaultShiftModel.findOne({ _id: vaultShiftId });
      if (!vaultShift) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/reconcile',
          'Vault shift not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Vault shift not found' },
          { status: 404 }
        );
      }
      if (vaultShift.status === 'closed') {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/reconcile',
          'Cannot reconcile closed shift',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Cannot reconcile closed shift' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 5: Validate location access
      // ============================================================================
      const allowedLocIds = await getUserLocationFilter(
        payload.assignedLicencees || [],
        undefined,
        payload.assignedLocations || [],
        userRoles
      );
      if (
        allowedLocIds !== 'all' &&
        !allowedLocIds.includes(String(vaultShift.locationId))
      ) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/reconcile',
          'Access denied for this location vault',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Access denied for this location vault' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 6: Update vault shift
      // ============================================================================
      const prevBalance =
        vaultShift.reconciliations.length > 0
          ? vaultShift.reconciliations[vaultShift.reconciliations.length - 1]
              .newBalance
          : vaultShift.openingBalance;
      const now = new Date();
      vaultShift.reconciliations.push({
        timestamp: now,
        previousBalance: prevBalance,
        newBalance,
        denominations,
        reason: finalDesc,
        comment: finalDesc,
      });
      vaultShift.currentDenominations = denominations;
      vaultShift.closingBalance = newBalance;
      vaultShift.isReconciled = true;
      vaultShift.updatedAt = now;
      await vaultShift.save();

      // ============================================================================
      // STEP 7: Create transaction and log activity
      // ============================================================================
      const txId = await generateMongoId(),
        adj = newBalance - prevBalance;
      const transaction = await VaultTransactionModel.create({
        _id: txId,
        locationId: vaultShift.locationId,
        timestamp: now,
        type: 'vault_reconciliation',
        from: adj >= 0 ? { type: 'external' } : { type: 'vault' },
        to: adj >= 0 ? { type: 'vault' } : { type: 'external' },
        amount: Math.abs(adj),
        denominations,
        vaultBalanceBefore: prevBalance,
        vaultBalanceAfter: newBalance,
        vaultShiftId,
        performedBy: payload._id,
        performedByName: payload.username || '',
        notes: finalDesc,
        auditComment: finalDesc,
        isVoid: false,
        createdAt: now,
      });

      await logActivity({
        userId: payload._id,
        username: payload.username,
        action: 'update',
        details: `Reconciled vault balance. New: $${newBalance} (Adj: $${adj})`,
        metadata: {
          resource: 'vault',
          resourceId: vaultShift.locationId,
          transactionId: txId,
          shiftId: vaultShift._id.toString(),
          reason: finalDesc,
        },
      });

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'POST',
        '/api/vault/reconcile',
        1,
        user,
        duration
      );

      // ============================================================================
      // STEP 8: Return response
      // ============================================================================
      return NextResponse.json({
        success: true,
        vaultShift: vaultShift.toObject(),
        transaction: transaction.toObject(),
        adjustment: adj,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to reconcile vault';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/reconcile',
        errorMessage,
        user
      );
      console.error(
        '[Vault Reconcile] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
