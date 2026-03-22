/**
 * Remove Cash from Vault API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import {
  updateVaultShiftInventory,
  validateDenominationTotal,
} from '@/app/api/lib/helpers/vault/inventory';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVMAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
      );
      if (!hasVMAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

      const { reason, amount, denominations, notes } = await request.json();
      if (!reason || !amount || !denominations)
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );

      const activeVaultShift = await VaultShiftModel.findOne({
        vaultManagerId: userPayload._id,
        status: 'active',
      });
      if (!activeVaultShift)
        return NextResponse.json(
          { success: false, error: 'No active vault shift found' },
          { status: 400 }
        );

      const allowedLocationIds = await getUserLocationFilter(
        userPayload.assignedLicencees || [],
        undefined,
        userPayload.assignedLocations || [],
        userRoles
      );

      if (
        allowedLocationIds !== 'all' &&
        !allowedLocationIds.includes(String(activeVaultShift.locationId))
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Access denied for location ${activeVaultShift.locationId}`,
          },
          { status: 403 }
        );
      }

      if (!validateDenominationTotal(amount, denominations))
        return NextResponse.json(
          { success: false, error: 'Denomination total mismatch' },
          { status: 400 }
        );

      const transactionId = await generateMongoId();
      const now = new Date();
      const before =
        activeVaultShift.closingBalance ?? activeVaultShift.openingBalance;

      const vaultTransaction = new VaultTransactionModel({
        _id: transactionId,
        locationId: activeVaultShift.locationId,
        timestamp: now,
        type: 'vault_close',
        from: { type: 'vault' },
        to: { type: 'external' },
        amount,
        denominations,
        vaultBalanceBefore: before,
        vaultBalanceAfter: before - amount,
        vaultShiftId: activeVaultShift._id,
        performedBy: userPayload._id,
        performedByName: userPayload.username || '',
        notes: notes
          ? `Reason: ${reason} - Notes: ${notes}`
          : `Reason: ${reason}`,
      });

      await vaultTransaction.save();
      await updateVaultShiftInventory(
        activeVaultShift,
        amount,
        denominations,
        false
      );

      await logActivity({
        userId: userPayload._id,
        username: userPayload.username,
        action: 'create',
        details: `Removed cash from vault ($${amount}) for: ${reason}`,
        metadata: {
          resource: 'vault',
          resourceId: activeVaultShift.locationId,
          transactionId,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        transaction: vaultTransaction,
      });
    } catch (error: unknown) {
      console.error('[Remove Cash API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
