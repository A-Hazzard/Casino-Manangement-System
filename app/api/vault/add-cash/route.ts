/**
 * Add Cash to Vault API
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

/**
 * POST /api/vault/add-cash
 *
 * @body {string} source - Source of funds ('Bank', 'Machine', etc.)
 * @body {number} amount - Total amount being added
 * @body {Array} denominations - Denomination breakdown
 * @body {string} notes - Optional transaction notes
 * @body {Object} bankDetails - Details if source is bank
 * @body {Array} machineIds - IDs if source is machine(s)
 */
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

      const { source, amount, denominations, notes, bankDetails, machineIds } =
        await request.json();
      if (!source || !amount || !denominations)
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
        type: 'add_cash',
        from: {
          type: source === 'Machine' ? 'machine' : 'external',
          id:
            source === 'Machine' && machineIds?.length === 1
              ? machineIds[0]
              : source,
        },
        to: { type: 'vault' },
        fromName: source,
        toName: 'Vault',
        amount,
        denominations,
        vaultBalanceBefore: before,
        vaultBalanceAfter: before + amount,
        vaultShiftId: activeVaultShift._id,
        performedBy: userPayload._id,
        performedByName: userPayload.username || '',
        bankDetails,
        expenseDetails: machineIds?.length
          ? {
              machineIds,
              isMachineRepair: false,
              description: `Cash from machines: ${machineIds.join(', ')}`,
            }
          : undefined,
        notes: `Cash from ${source}${notes ? `: ${notes}` : ''}`,
      });

      await vaultTransaction.save();
      await updateVaultShiftInventory(
        activeVaultShift,
        amount,
        denominations,
        true
      );

      await logActivity({
        userId: userPayload._id,
        username: userPayload.username,
        action: 'create',
        details: `Added cash from ${source}: $${amount}`,
        metadata: {
          resource: 'vault',
          resourceId: activeVaultShift.locationId,
          transactionId,
          source,
        },
      });

      return NextResponse.json({
        success: true,
        transaction: vaultTransaction,
      });
    } catch (error: unknown) {
      console.error('[Add Cash API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
