/**
 * Vault Initialization API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import type { VaultShiftDocument } from '@shared/types';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/initialize
 *
 * @body {string} locationId - ID of the location to initialize (REQUIRED)
 * @body {string} notes - Optional initialization notes
 * @body {number} openingBalance - Manual override for opening balance
 * @body {Array} denominations - Manual override for opening denominations
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/initialize';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Validate permissions
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
          '/api/vault/initialize',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Parse and validate input
      // ============================================================================
      const body = await request.json();
      const { locationId, notes } = body;
      let { openingBalance, denominations } = body;
      if (!locationId) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/initialize',
          'locationId required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'locationId required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Determine opening balance and denominations
      // ============================================================================
      if (openingBalance === undefined || !denominations?.length) {
        const lastClosed = await VaultShiftModel.findOne({
          locationId,
          status: 'closed',
        })
          .sort({ closedAt: -1 })
          .lean<VaultShiftDocument>();
        openingBalance = lastClosed?.closingBalance ?? 0;
        denominations = lastClosed?.closingDenominations ?? [];
      }

      // ============================================================================
      // STEP 4: Validate denominations
      // ============================================================================
      if (denominations.length > 0) {
        const validation = validateDenominations(denominations);
        if (!validation.valid) {
          logRouteError(
            functionName,
            'POST',
            '/api/vault/initialize',
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
        if (validation.total !== openingBalance) {
          logRouteError(
            functionName,
            'POST',
            '/api/vault/initialize',
            `Balance mismatch: $${validation.total} vs $${openingBalance}`,
            user
          );
          return NextResponse.json(
            {
              success: false,
              error: `Balance mismatch: $${validation.total} vs $${openingBalance}`,
            },
            { status: 400 }
          );
        }
      }

      // ============================================================================
      // STEP 5: Check for active vault shift
      // ============================================================================
      if (await VaultShiftModel.findOne({ locationId, status: 'active' })) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/initialize',
          'Active vault shift already exists',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Active vault shift already exists' },
          { status: 409 }
        );
      }

      // ============================================================================
      // STEP 6: Initialize vault shift and transaction
      // ============================================================================
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

      // ============================================================================
      // STEP 7: Log activity and return
      // ============================================================================
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

      const duration = Date.now() - startTime;
      logRouteCreate(
        functionName,
        'POST',
        '/api/vault/initialize',
        1,
        user,
        duration
      );

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
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to initialize vault';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/initialize',
        errorMessage,
        user
      );
      console.error('[Vault Initialize] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
