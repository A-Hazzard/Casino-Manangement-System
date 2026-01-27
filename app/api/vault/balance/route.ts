/**
 * Get Vault Balance API
 *
 * GET /api/vault/balance
 *
 * Retrieves the current balance and status of the vault for a given location.
 *
 * @module app/api/vault/balance/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import type {
  VaultBalance,
  VaultShift,
  VaultTransaction,
} from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasVaultAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );
    if (!hasVaultAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'locationId is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Fetch active vault shift and latest transaction
    // ============================================================================
    await connectDB();
    const activeShift = await VaultShiftModel.findOne({
      locationId,
      status: 'active',
    }).lean<VaultShift | null>();

    if (!activeShift) {
      const response: VaultBalance = {
        balance: 0,
        denominations: [],
        activeShiftId: undefined,
        lastReconciliation: undefined,
      };
      return NextResponse.json({ success: true, data: response });
    }

    const lastTransaction = await VaultTransactionModel.findOne({
      vaultShiftId: activeShift._id,
    })
      .sort({ timestamp: -1 })
      .lean<VaultTransaction | null>();

    const lastReconciliation =
      activeShift.reconciliations?.length > 0
        ? activeShift.reconciliations[activeShift.reconciliations.length - 1]
            .timestamp
        : undefined;

    // ============================================================================
    // STEP 4: Construct and return response
    // ============================================================================
    const response: VaultBalance = {
      balance: lastTransaction?.vaultBalanceAfter ?? activeShift.openingBalance,
      denominations:
        lastTransaction?.denominations ?? activeShift.openingDenominations,
      activeShiftId: activeShift._id,
      lastReconciliation,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching vault balance:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
