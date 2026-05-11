/**
 * Remove Cash from Vault API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import {
  updateVaultShiftInventory,
  validateDenominationTotal,
} from '@/app/api/lib/helpers/vault/inventory';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for removing cash from vault
 *
 * @body {string} reason - REQUIRED. Reason for the cash removal.
 * @body {number} amount - REQUIRED. Total amount to remove.
 * @body {Object} denominations - REQUIRED. Denomination breakdown of the removal.
 * @body {string} notes - Optional. Additional context.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/remove-cash';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVMAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
      );
      if (!hasVMAccess) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/remove-cash',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      const { reason, amount, denominations, notes } = await request.json();
      if (!reason || !amount || !denominations) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/remove-cash',
          'Missing required fields',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const activeVaultShift = await VaultShiftModel.findOne({
        vaultManagerId: userPayload._id,
        status: 'active',
      });
      if (!activeVaultShift) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/remove-cash',
          'No active vault shift found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'No active vault shift found' },
          { status: 400 }
        );
      }

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
        logRouteError(
          functionName,
          'POST',
          '/api/vault/remove-cash',
          `Access denied for location ${activeVaultShift.locationId}`,
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: `Access denied for location ${activeVaultShift.locationId}`,
          },
          { status: 403 }
        );
      }

      if (!validateDenominationTotal(amount, denominations)) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/remove-cash',
          'Denomination total mismatch',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Denomination total mismatch' },
          { status: 400 }
        );
      }

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

      const duration = Date.now() - startTime;
      logRouteCreate(
        functionName,
        'POST',
        '/api/vault/remove-cash',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        transaction: vaultTransaction,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to remove cash from vault';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/remove-cash',
        errorMessage,
        user
      );
      console.error('[Remove Cash API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
