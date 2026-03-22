/**
 * Soft Count API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
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

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const hasVMAccess = userRoles
        .map(r => String(r).toLowerCase())
        .some(role =>
          ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
        );
      if (!hasVMAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

      const { amount, denominations, notes, isEndOfDay } = await request.json();
      if (!amount || !denominations)
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
          { success: false, error: 'No active vault shift' },
          { status: 400 }
        );

      if (!validateDenominationTotal(amount, denominations))
        return NextResponse.json(
          { success: false, error: 'Denomination mismatch' },
          { status: 400 }
        );

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

      return NextResponse.json({
        success: true,
        softCount,
        transaction: vaultTransaction,
      });
    } catch (e: unknown) {
      console.error('[SoftCount POST] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
