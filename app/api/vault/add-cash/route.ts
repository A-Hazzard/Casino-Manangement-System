/**
 * Add Cash to Vault API
 *
 * POST /api/vault/add-cash
 *
 * Adds cash to the vault from an external source (e.g. Bank Withdrawal).
 * Creates a transaction and updates the vault balance.
 *
 * @module app/api/vault/add-cash/route */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { updateVaultShiftInventory, validateDenominationTotal } from '@/app/api/lib/helpers/vault/inventory';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';
import type { LocationDocument } from '@/lib/types/common';

/**
 * POST /api/vault/add-cash
 *
 * Handler flow:
 * 1. Performance tracking and authentication
 * 2. Parse and validate request body
 * 3. Licencee/location filtering via vault shift
 * 4. Database connection
 * 5. Get active vault shift
 * 6. Create transaction and update balance
 * 7. Save and return response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
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
    const vaultManagerId = userPayload._id as string;
    const username = userPayload.username as string;
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasVMAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );
    if (!hasVMAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body = await request.json();
    const { source, amount, denominations, notes, bankDetails, machineIds } = body;

    if (!source || !amount || !denominations) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 5: Get active vault shift with location filtering
    // ============================================================================
    const activeVaultShift = await VaultShiftModel.findOne({
      vaultManagerId,
      status: 'active',
    });

    if (!activeVaultShift) {
      return NextResponse.json(
        { success: false, error: 'No active vault shift found' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 6: Licencee/location filtering
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicencees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(String(activeVaultShift.locationId))) {
      // Get location names for all parts to explain WHY
      const { GamingLocations } = await import('@/app/api/lib/models/gaminglocations');
      // Fetch names to provide detailed access error
      const attemptedLocPromise = GamingLocations.findOne(
        { _id: activeVaultShift.locationId },
        { name: 1 }
      ).lean() as unknown as Promise<Pick<LocationDocument, 'name'> | null>;

      const allowedLocsPromise = Array.isArray(allowedLocationIds)
        ? (GamingLocations.find(
            { _id: { $in: allowedLocationIds } },
            { name: 1 }
          ).lean() as unknown as Promise<Pick<LocationDocument, 'name'>[]>)
        : Promise.resolve([]);

      const [attemptedLocation, allowedLocations] = await Promise.all([
        attemptedLocPromise,
        allowedLocsPromise,
      ]);

      const attemptedName = attemptedLocation ? (attemptedLocation as Record<string, unknown>).name as string : 'Unknown';
      const allowedNames = (allowedLocations as Array<Record<string, unknown>>).map(l => l.name as string).join(', ') || 'None';
      const hasAssignment = (userPayload?.assignedLocations as string[] || []).length > 0;

      let reason = `Access denied for location "${attemptedName}" (${activeVaultShift.locationId}). `;
      if (!hasAssignment) {
        reason += "Analysis: Your user profile has NO assigned locations.";
      } else {
        reason += `Analysis: You are assigned to [${allowedNames}], but this vault shift belongs to [${attemptedName}].`;
      }

      return NextResponse.json({ success: false, error: reason }, { status: 403 });
    }

    // ============================================================================
    // STEP 5.5: Validate Denomination Total
    // ============================================================================
    if (!validateDenominationTotal(amount, denominations)) {
      return NextResponse.json(
        { success: false, error: 'Denomination total does not match amount' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 6: Create transaction
    // ============================================================================
    const transactionId = await generateMongoId();
    const now = new Date();

    const vaultTransaction = new VaultTransactionModel({
      _id: transactionId,
      locationId: activeVaultShift.locationId,
      timestamp: now,
      type: 'add_cash',
      from: { type: source === 'Machine' ? 'machine' : 'external', id: source === 'Machine' && machineIds?.length === 1 ? machineIds[0] : source },
      to: { type: 'vault' },
      fromName: source,
      toName: 'Vault',
      amount,
      denominations,
      vaultBalanceBefore:
        activeVaultShift.closingBalance || activeVaultShift.openingBalance,
      vaultBalanceAfter:
        (activeVaultShift.closingBalance || activeVaultShift.openingBalance) +
        amount,
      vaultShiftId: activeVaultShift._id,
      performedBy: vaultManagerId,
      performedByName: username,
      bankDetails,
      expenseDetails: machineIds?.length ? {
        machineIds,
        isMachineRepair: false,
        description: `Cash added from machine(s): ${machineIds.join(', ')}`
      } : undefined,
      notes: `Cash added from ${source}${notes ? `: ${notes}` : ''}`,
    });

    // ============================================================================
    // STEP 7: Save and Update Balance & Inventory
    // ============================================================================
    await vaultTransaction.save();
    await updateVaultShiftInventory(activeVaultShift, amount, denominations, true);

    // STEP 7: Audit Activity
    await logActivity({
      userId: vaultManagerId,
      username,
      action: 'create',
      details: `Added cash from ${source}: $${amount}`,
      metadata: {
        resource: 'vault',
        resourceId: activeVaultShift.locationId,
        resourceName: 'Vault',
        transactionId,
        source,
      },
    });

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Add cash API took ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      transaction: vaultTransaction,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error adding cash:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
