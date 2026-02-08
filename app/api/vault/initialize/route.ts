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

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import { generateMongoId } from '@/lib/utils/id';
import type {
  InitializeVaultRequest,
  VaultShift
} from '@/shared/types/vault';
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

    const userId = userPayload._id as string;
    const username = userPayload.username as string;
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
    const { locationId, notes } = body;
    let { openingBalance, denominations } = body;

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'locationId is required' },
        { status: 400 }
      );
    }

    // STEP 3: Handle Automatic Initialization (if denominations/balance missing)
    await connectDB();
    
    if (openingBalance === undefined || !denominations || denominations.length === 0) {
      const lastClosedShift = await VaultShiftModel.findOne({
        locationId,
        status: 'closed'
      }).sort({ closedAt: -1 }).lean<VaultShift | null>();

      if (lastClosedShift) {
        openingBalance = lastClosedShift.closingBalance || 0;
        denominations = lastClosedShift.closingDenominations || [];
      } else {
        // Brand new location with no previous shifts
        openingBalance = 0;
        denominations = [];
      }
    }

    // STEP 4: Validate denominations (only if not a zero-balance start for a brand new location)
    if (denominations.length > 0) {
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

      if (denominationValidation.total !== openingBalance) {
        return NextResponse.json(
          {
            success: false,
            error: `Denomination total ($${denominationValidation.total}) does not match opening balance ($${openingBalance})`,
          },
          { status: 400 }
        );
      }
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
    const vaultShiftId = await generateMongoId();
    const now = new Date();

    const vaultShift = await VaultShiftModel.create({
      _id: vaultShiftId,
      locationId,
      vaultManagerId: userId,
      status: 'active',
      openedAt: now,
      openingBalance,
      openingDenominations: denominations,
      currentDenominations: denominations,
      reconciliations: [],
      canClose: true, // No cashiers yet, so can close
      createdAt: now,
      updatedAt: now,
    });

    // STEP 7: Create transaction record
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
      performedBy: userId,
      notes: notes || 'Initial vault setup',
      isVoid: false,
      createdAt: now,
    });

    // STEP 8: Audit Activity
    const logId = await logActivity({
      userId,
      username,
      action: 'create',
      details: `Initialized vault for location ${locationId} with balance $${openingBalance}`,
      metadata: {
        resource: 'location',
        resourceId: locationId,
        resourceName: 'Vault',
        vaultShiftId,
        transactionId,
      },
    });

    // STEP 9: Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Vault initialized successfully.',
        vaultShift: vaultShift.toObject(),
        transaction: transaction.toObject(),
        logId
      },
      { status: 201 }
    );
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
