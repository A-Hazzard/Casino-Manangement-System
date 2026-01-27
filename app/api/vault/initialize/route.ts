/**
 * Vault Initialization API
 *
 * POST /api/vault/initialize
 *
 * Initialize vault for a new location (VM-1).
 * Sets the "Source of Truth" for a brand-new site.
 *
 * @module app/api/vault/initialize/route
 */

import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import type {
  InitializeVaultRequest,
  InitializeVaultResponse,
} from '@/shared/types/vault';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/initialize
 *
 * Initialize vault for new location
 */
export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authentication & Authorization
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = userPayload.userId;
    const userRoles = (userPayload?.roles as string[]) || [];

    // Check if user has vault-manager role
    const hasVaultAccess = userRoles.some((role: string) =>
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

    // STEP 2: Parse and validate request body
    const body: InitializeVaultRequest = await request.json();
    const { locationId, openingBalance, denominations, notes } = body;

    if (!locationId || openingBalance === undefined || !denominations) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: locationId, openingBalance, denominations',
        },
        { status: 400 }
      );
    }

    // STEP 3: Validate denominations
    const denominationValidation = validateDenominations(denominations);
    if (!denominationValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid denominations',
          details: denominationValidation.errors,
        },
        { status: 400 }
      );
    }

    // Check if denomination total matches opening balance
    if (denominationValidation.total !== openingBalance) {
      return NextResponse.json(
        {
          success: false,
          error: `Denomination total ($${denominationValidation.total}) does not match opening balance ($${openingBalance})`,
        },
        { status: 400 }
      );
    }

    // STEP 4: Connect to database
    await connectDB();

    // STEP 5: Check if vault already initialized for this location
    const existingVaultShift = await VaultShiftModel.findOne({
      locationId,
      status: 'active',
    });

    if (existingVaultShift) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Vault already initialized. An active vault shift exists for this location.',
        },
        { status: 409 }
      );
    }

    // STEP 6: Create vault shift
    const vaultShiftId = nanoid();
    const now = new Date();

    const vaultShift = await VaultShiftModel.create({
      _id: vaultShiftId,
      locationId,
      vaultManagerId: userId,
      status: 'active',
      openedAt: now,
      openingBalance,
      openingDenominations: denominations,
      reconciliations: [],
      canClose: true, // No cashiers yet, so can close
      createdAt: now,
      updatedAt: now,
    });

    // STEP 7: Create transaction record
    const transactionId = nanoid();
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
      performedBy: userId,
      notes: notes || 'Initial vault setup',
      isVoid: false,
      createdAt: now,
    });

    // STEP 8: Return success response
    const response: InitializeVaultResponse = {
      success: true,
      vaultShift: vaultShift.toObject(),
      transaction: transaction.toObject(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error initializing vault:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
