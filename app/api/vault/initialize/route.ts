/**
 * Vault Initialization API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
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

      const body = await request.json();
      const { locationId, notes } = body;
      let { openingBalance, denominations } = body;
      if (!locationId)
        return NextResponse.json(
          { success: false, error: 'locationId required' },
          { status: 400 }
        );

      if (openingBalance === undefined || !denominations?.length) {
        const lastClosed = (await VaultShiftModel.findOne({
          locationId,
          status: 'closed',
        })
          .sort({ closedAt: -1 })
          .lean()) as unknown as {
          closingBalance?: number;
          closingDenominations?: Array<{ value: number; count: number }>;
        } | null;
        openingBalance = lastClosed?.closingBalance ?? 0;
        denominations = lastClosed?.closingDenominations ?? [];
      }

      if (denominations.length > 0) {
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
        if (validation.total !== openingBalance)
          return NextResponse.json(
            {
              success: false,
              error: `Balance mismatch: $${validation.total} vs $${openingBalance}`,
            },
            { status: 400 }
          );
      }

      if (await VaultShiftModel.findOne({ locationId, status: 'active' })) {
        return NextResponse.json(
          { success: false, error: 'Active vault shift already exists' },
          { status: 409 }
        );
      }

      const vaultShiftId = await generateMongoId();
      const now = new Date();
      const vaultShift = await VaultShiftModel.create({
        _id: vaultShiftId,
        locationId,
        vaultManagerId: userPayload._id,
        status: 'active',
        openedAt: now,
        openingBalance,
        openingDenominations: denominations,
        currentDenominations: denominations,
        reconciliations: [],
        canClose: true,
        createdAt: now,
        updatedAt: now,
      });

      const transactionId = await generateMongoId();
      const transaction = await VaultTransactionModel.create({
        _id: transactionId,
        locationId,
        timestamp: now,
        type: 'vault_open',
        from: { type: 'external' },
        to: { type: 'vault' },
        amount: openingBalance,
        denominations,
        vaultBalanceBefore: 0,
        vaultBalanceAfter: openingBalance,
        vaultShiftId,
        performedBy: userPayload._id,
        notes: notes || 'Initial vault setup',
        isVoid: false,
        createdAt: now,
      });

      await logActivity({
        userId: userPayload._id,
        username: userPayload.username || userPayload.emailAddress,
        action: 'create',
        details: `Initialized vault for location ${locationId} ($${openingBalance})`,
        metadata: {
          resource: 'location',
          resourceId: locationId,
          vaultShiftId,
          transactionId,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Vault initialized',
          vaultShift: vaultShift.toObject(),
          transaction: transaction.toObject(),
        },
        { status: 201 }
      );
    } catch (error: unknown) {
      console.error('[Vault Initialize] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
