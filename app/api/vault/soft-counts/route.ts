/**
 * Soft Count API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { getAttributionDate } from '@/app/api/lib/helpers/vault/gamingDay';
import {
  updateVaultShiftInventory,
  validateDenominationTotal,
} from '@/app/api/lib/helpers/vault/inventory';
import { SoftCountModel } from '@/app/api/lib/models/softCount';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for submitting a soft count
 *
 * @body {string} locationId - REQUIRED. Location where the soft count was performed.
 * @body {number} amount - REQUIRED. Total amount from the soft count.
 * @body {Object} denominations - REQUIRED. Denomination breakdown of the count.
 * @body {string} machineId - Optional. Specific machine ID for the soft count.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/soft-counts';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Validate permissions
      // ============================================================================
      const hasVMAccess = userRoles
        .map(r => String(r).toLowerCase())
        .some(role =>
          ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
        );
      if (!hasVMAccess) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/soft-counts',
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
      const { amount, denominations, notes, isEndOfDay } = await request.json();
      if (!amount || !denominations) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/soft-counts',
          'Missing required fields',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Validate vault shift
      // ============================================================================
      const activeVaultShift = await VaultShiftModel.findOne({
        vaultManagerId: userPayload._id,
        status: 'active',
      });

      if (!activeVaultShift) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/soft-counts',
          'No active vault shift',
          user
        );
        return NextResponse.json(
          { success: false, error: 'No active vault shift' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 4: Validate denomination total
      // ============================================================================
      if (!validateDenominationTotal(amount, denominations)) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/soft-counts',
          'Denomination mismatch',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Denomination mismatch' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 5: Create soft count and transaction
      // ============================================================================
      const scId = await generateMongoId(),
        txId = await generateMongoId();
      const attrDate = await getAttributionDate(
        activeVaultShift.openedAt,
        activeVaultShift.locationId
      );

      const softCount = new SoftCountModel({
        _id: scId,
        locationId: activeVaultShift.locationId,
        countedAt: attrDate,
        amount,
        denominations,
        countedBy: userPayload._id,
        transactionId: txId,
        notes,
        isEndOfDay: !!isEndOfDay,
      });

      const vaultTransaction = new VaultTransactionModel({
        _id: txId,
        locationId: activeVaultShift.locationId,
        timestamp: attrDate,
        type: 'soft_count',
        from: { type: 'vault' },
        to: { type: 'external' },
        amount,
        denominations,
        vaultBalanceBefore:
          activeVaultShift.closingBalance || activeVaultShift.openingBalance,
        vaultBalanceAfter:
          (activeVaultShift.closingBalance || activeVaultShift.openingBalance) -
          amount,
        vaultShiftId: activeVaultShift._id,
        performedBy: userPayload._id,
        notes: `Soft count removal${notes ? `: ${notes}` : ''}`,
      });

      await softCount.save();
      await vaultTransaction.save();
      await updateVaultShiftInventory(
        activeVaultShift,
        amount,
        denominations,
        false
      );

      // ============================================================================
      // STEP 6: Log activity and return response
      // ============================================================================
      await logActivity({
        userId: userPayload._id,
        username: userPayload.username || userPayload.emailAddress,
        action: 'create',
        details: `Recorded soft count removal: $${amount}`,
        metadata: {
          resource: 'vault',
          resourceId: activeVaultShift.locationId,
          transactionId: txId,
          notes,
        },
      });

      const duration = Date.now() - startTime;
      logRouteCreate(
        functionName,
        'POST',
        '/api/vault/soft-counts',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        softCount,
        transaction: vaultTransaction,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to record soft count';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/soft-counts',
        errorMessage,
        user
      );
      console.error(
        '[SoftCount POST] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
