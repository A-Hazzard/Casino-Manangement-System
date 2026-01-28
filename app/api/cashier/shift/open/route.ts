/**
 * Cashier Shift Open API
 * 
 * POST /api/cashier/shift/open
 * 
 * Initiate opening of a cashier shift.
 * Creates a shift with 'pending_start' status and a corresponding float request.
 * The shift becomes 'active' only after VM approval.
 * 
 * @module app/api/cashier/shift/open/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import type { OpenCashierShiftRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
  
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
    const userRoles = (userPayload.roles as string[]) || [];

    const hasCashierAccess = userRoles.some((role: string) =>
      ['developer', 'admin', 'manager', 'cashier'].includes(
        role.toLowerCase()
      )
    );

    if (!hasCashierAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // STEP 2: Parse and validate request
    const body: OpenCashierShiftRequest = await request.json();
    const { locationId, requestedFloat, denominations } = body;

    if (!locationId || requestedFloat === undefined || !denominations) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: locationId, requestedFloat, denominations',
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

    if (denominationValidation.total !== requestedFloat) {
      return NextResponse.json(
        {
          success: false,
          error: `Denomination total ($${denominationValidation.total}) does not match requested float ($${requestedFloat})`,
        },
        { status: 400 }
      );
    }

    // STEP 4: Connect to database
    await connectDB();

    // STEP 5: Check for active Vault Shift
    const vaultShift = await VaultShiftModel.findOne({
      locationId,
      status: 'active',
    });

    if (!vaultShift) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active vault shift found. Please ask a Vault Manager to open the vault.',
        },
        { status: 400 }
      );
    }

    // STEP 6: Check if cashier already has an active or pending shift
    const existingShift = await CashierShiftModel.findOne({
      cashierId: userId,
      status: { $in: ['active', 'pending_start', 'pending_review'] },
    });

    if (existingShift) {
      return NextResponse.json(
        {
          success: false,
          error: `You already have a shift with status: ${existingShift.status}`,
        },
        { status: 409 }
      );
    }

    // STEP 7: Create Cashier Shift (Pending Start)
    const shiftId = nanoid();
    const now = new Date();

    const cashierShift = await CashierShiftModel.create({
      _id: shiftId,
      locationId,
      cashierId: userId,
      vaultShiftId: vaultShift._id,
      status: 'pending_start',
      openedAt: now,
      openingBalance: requestedFloat,
      openingDenominations: denominations,
      payoutsTotal: 0,
      payoutsCount: 0,
      floatAdjustmentsTotal: 0,
      createdAt: now,
      updatedAt: now,
    });

    // STEP 8: Create Float Request
    const requestId = nanoid();
    const floatRequest = await FloatRequestModel.create({
      _id: requestId,
      locationId,
      cashierId: userId,
      cashierShiftId: shiftId,
      vaultShiftId: vaultShift._id,
      type: 'increase', // Initial float is essentially an increase from 0
      requestedAmount: requestedFloat,
      requestedDenominations: denominations,
      requestNotes: 'Initial shift float',
      requestedAt: now,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // TODO: Create notification for Vault Manager

    return NextResponse.json(
      {
        success: true,
        message: 'Shift request submitted. Waiting for Vault Manager approval.',
        shift: cashierShift.toObject(),
        floatRequest: floatRequest.toObject(),
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error opening cashier shift:', error);
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
