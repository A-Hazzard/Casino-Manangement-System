/**
 * Cashier Shift Open API
 *
 * POST /api/cashier/shift/open
 *
 * Creates a float request to initiate opening a cashier shift.
 * The shift itself is not created until a Vault Manager approves the float request.
 *
 * @module app/api/cashier/shift/open/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import type { OpenCashierShiftRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cashier/shift/open
 *
 * Request to open a cashier shift by creating a float request.
 */
export async function POST(request: NextRequest) {
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
    const userId = userPayload.userId;
    const userRoles = (userPayload?.roles as string[]) || [];

    const hasCashierAccess = userRoles.some((role: string) =>
      ['developer', 'admin', 'manager', 'cashier'].includes(role.toLowerCase())
    );

    if (!hasCashierAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body: OpenCashierShiftRequest = await request.json();
    const { locationId, requestedFloat, denominations } = body;

    if (!locationId || requestedFloat === undefined || !denominations) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: locationId, requestedFloat, denominations',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Validate denominations
    // ============================================================================
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

    if (denominationValidation.total !== requestedFloat) {
      return NextResponse.json(
        {
          success: false,
          error: `Denomination total ($${denominationValidation.total}) does not match requested float ($${requestedFloat})`,
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Connect to DB and check for active shifts
    // ============================================================================
    await connectDB();

    const activeVaultShift = await VaultShiftModel.findOne({
      locationId,
      status: 'active',
    });

    if (!activeVaultShift) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No active vault shift found for this location. Cannot open a cashier shift.',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Create float request
    // ============================================================================
    const now = new Date();
    const floatRequest = await FloatRequestModel.create({
      _id: nanoid(),
      locationId,
      cashierId: userId,
      vaultShiftId: activeVaultShift._id,
      type: 'increase', // Opening a shift is always an increase
      requestedAmount: requestedFloat,
      requestedDenominations: denominations,
      requestedAt: now,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // ============================================================================
    // STEP 6: Return success response (pending approval)
    // ============================================================================
    return NextResponse.json(
      {
        success: true,
        status: 'pending_approval',
        message:
          'Float request submitted. Waiting for manager approval to open shift.',
        floatRequest: floatRequest.toObject(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error requesting to open cashier shift:', error);
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
