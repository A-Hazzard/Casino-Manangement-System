/**
 * Vault Reconciliation API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: payload, userRoles }) => {
    try {
      const hasVaultAccess = userRoles
        .map(r => String(r).toLowerCase())
        .some(role =>
          ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
        );
      if (!hasVaultAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

      const { vaultShiftId, newBalance, denominations, reason, comment } =
        await request.json();
      const finalDesc = (reason || comment || '').trim();

      const validation = validateDenominations(denominations);
      if (!validation.valid)
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid denominations',
            details: validation.errors,
          },
          { status: 400 }
        );
      if (validation.total !== newBalance)
        return NextResponse.json(
          {
            success: false,
            error: `Balance mismatch: $${validation.total} vs $${newBalance}`,
          },
          { status: 400 }
        );

      const vaultShift = await VaultShiftModel.findOne({ _id: vaultShiftId });
      if (!vaultShift)
        return NextResponse.json(
          { success: false, error: 'Vault shift not found' },
          { status: 404 }
        );
      if (vaultShift.status === 'closed')
        return NextResponse.json(
          { success: false, error: 'Cannot reconcile closed shift' },
          { status: 400 }
        );

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
        return NextResponse.json(
          { success: false, error: 'Access denied for this location vault' },
          { status: 403 }
        );
      }

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

      return NextResponse.json({
        success: true,
        vaultShift: vaultShift.toObject(),
        transaction: transaction.toObject(),
        adjustment: adj,
      });
    } catch (e: unknown) {
      console.error('[Vault Reconcile] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
