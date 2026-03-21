/**
 * Vault Expense API
 *
 * GET  /api/vault/expense - Fetch expense history
 * POST /api/vault/expense - Record a new expense
 *
 * Records a petty cash expense from the vault.
 * Creates a transaction and updates the vault balance.
 *
 * @module app/api/vault/expense/route */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { updateVaultShiftInventory, validateDenominationTotal } from '@/app/api/lib/helpers/vault/inventory';
import { connectDB } from '@/app/api/lib/middleware/db';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import type { Denomination } from '@/shared/types/vault';
import { Db, GridFSBucket } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import type { LocationDocument } from '@/lib/types/common';

/**
 * POST /api/vault/expense
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
    // STEP 2: Parse and validate request body (Multipart Form Data)
    // ============================================================================
    const formData = await request.formData();
    const category = formData.get('category') as string;
    const amountStr = formData.get('amount') as string;
    const description = formData.get('description') as string;
    const dateStr = formData.get('date') as string;
    const denominationsStr = formData.get('denominations') as string;
    const file = formData.get('file') as File | null;

    const amount = parseFloat(amountStr);
    let denominations: Denomination[] = [];

    // Parse denominations if provided
    if (denominationsStr) {
      try {
        const parsed = JSON.parse(denominationsStr);
        // Filter out zero quantities and ensure positive numbers
        denominations = parsed
          .filter((d: { quantity: number; denomination: number }) => d.quantity > 0)
          .map((d: { quantity: number; denomination: number }) => ({
            denomination: Number(d.denomination) as Denomination['denomination'],
            quantity: Math.max(0, Number(d.quantity)),
          }));

        // Validate total against amount (optional strict check, or just trust amount)
        // const denomTotal = denominations.reduce((sum, d) => sum + d.denomination * d.quantity, 0);
        // if (Math.abs(denomTotal - amount) > 0.01) {
        //   return NextResponse.json({ success: false, error: 'Amount mismatch with denominations' }, { status: 400 });
        // }
      } catch (e) {
        console.error('Error parsing denominations', e);
      }
    }

    if (!category || isNaN(amount)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    const db = await connectDB();

    // ============================================================================
    // STEP 3.5: Handle File Upload (if present)
    // ============================================================================
    let attachmentId = undefined;
    let attachmentName = undefined;

    if (file && file.size > 0) {
      try {
        const bucket = new GridFSBucket(db as unknown as Db, {
          bucketName: 'vault_attachments',
        });

        // Convert File to stream
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        // Upload file
        const uploadStream = bucket.openUploadStream(file.name, {
          metadata: {
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            uploadedAt: new Date(),
            uploadedBy: vaultManagerId,
            context: 'expense_receipt',
          },
        });

        attachmentId = uploadStream.id;
        attachmentName = file.name;

        await new Promise((resolve, reject) => {
          stream.pipe(uploadStream).on('error', reject).on('finish', resolve);
        });
      } catch (uploadError) {
        console.error('File upload failed:', uploadError);
        // We continue without attachment if upload fails, or fail the request?
        // Better to fail so user knows.
        return NextResponse.json(
          { success: false, error: 'Failed to upload attachment' },
          { status: 500 }
        );
      }
    }

    // ============================================================================
    // STEP 4: Get active vault shift and Update Inventory
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
    // STEP 5: Licencee/location filtering
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
    // STEP 6: Balance Validation & Inventory Update
    // ============================================================================
    const currentBalance =
      activeVaultShift.closingBalance ?? activeVaultShift.openingBalance;

    if (currentBalance < amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient vault funds. Current Balance: $${currentBalance.toFixed(2)}, Expense: $${amount.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // MANDATORY: Enforce denominations for expenses to keep inventory accurate
    if (!denominations || denominations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Denominations are required for recorded expenses' },
        { status: 400 }
      );
    }

    if (!validateDenominationTotal(amount, denominations)) {
      return NextResponse.json(
        { success: false, error: 'Denomination total does not match expense amount' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 7: Create transaction
    // ============================================================================
    const transactionId = await generateMongoId();
    const expenseDate = dateStr ? new Date(dateStr) : new Date();

    let bankDetails = undefined;
    if (formData.get('bankDetails')) {
      try { bankDetails = JSON.parse(formData.get('bankDetails') as string); } catch (e) { console.error("Error parsing bankDetails", e); }
    }
    let expenseDetails: Record<string, unknown> | undefined = undefined;
    if (formData.get('expenseDetails')) {
      try { expenseDetails = JSON.parse(formData.get('expenseDetails') as string); } catch (e) { console.error("Error parsing expenseDetails", e); }
    }

    if (expenseDetails?.isMachineRepair && (expenseDetails?.machineIds as string[] | undefined)?.length) {
      const machineIds = expenseDetails.machineIds as string[];
      const { Machine } = await import('@/app/api/lib/models/machines');
      const mList = await Machine.find({ _id: { $in: machineIds } }).lean();

      const machineDetails = machineIds.map((id: string) => {
        const m = mList.find((x: unknown) => {
          const mDoc = x as { _id: string; machineId?: string; serialNumber?: string; custom?: { name?: string }; game?: string; installedGame?: string; gameType?: string };
          return String(mDoc._id) === id || String(mDoc.machineId) === id || mDoc.serialNumber === id;
        }) as { _id: string; machineId?: string; serialNumber?: string; custom?: { name?: string }; game?: string; installedGame?: string; gameType?: string } | undefined;

        if (!m) return { identifier: id, game: 'N/A', gameType: 'N/A' };

        const serialNumberRaw = m.serialNumber?.trim() || '';
        const customName = m.custom?.name?.trim() || '';
        const game = m.game || m.installedGame || '';
        const gameType = m.gameType || '';
        const mainIdentifier = serialNumberRaw || customName || 'N/A';

        return {
          identifier: customName && customName !== mainIdentifier ? `${mainIdentifier} (${customName})` : mainIdentifier,
          game: game.trim(),
          gameType: gameType.trim()
        };
      });
      expenseDetails.machineDetails = machineDetails;
    }

    const vaultTransaction = new VaultTransactionModel({
      _id: transactionId,
      locationId: activeVaultShift.locationId,
      timestamp: expenseDate,
      type: 'expense',
      from: { type: 'vault' },
      to: { type: 'external', id: category },
      fromName: 'Vault',
      toName: category,
      amount,
      denominations: denominations, // Save actual denominations used
      vaultBalanceBefore:
        activeVaultShift.closingBalance || activeVaultShift.openingBalance,
      vaultBalanceAfter:
        (activeVaultShift.closingBalance || activeVaultShift.openingBalance) -
        amount,
      vaultShiftId: activeVaultShift._id,
      performedBy: vaultManagerId,
      performedByName: username,
      notes: description ? `Expense: ${category} - ${description}` : `Expense: ${category}`,
      attachmentId,
      attachmentName,
      bankDetails,
      expenseDetails,
    });

    // ============================================================================
    // STEP 8: Save and Update Balance & Inventory
    // ============================================================================
    await vaultTransaction.save();
    await updateVaultShiftInventory(activeVaultShift, amount, denominations, false);

    // STEP 9: Audit Activity
    await logActivity({
      userId: vaultManagerId,
      username,
      action: 'create',
      details: `Recorded expense: ${category} - $${amount}`,
      metadata: {
        resource: 'vault',
        resourceId: activeVaultShift.locationId,
        resourceName: 'Vault',
        transactionId,
        description,
      },
    });

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Expense API took ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      transaction: vaultTransaction,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error recording expense:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vault/expense
 *
 * Fetch expense history with optional filters
 * Query params: locationId, startDate, endDate, category
 */
export async function GET(request: NextRequest) {
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
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Location filtering
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      (userPayload?.assignedLicencees as string[]) || [],
      undefined,
      (userPayload?.assignedLocations as string[]) || [],
      (userPayload?.roles as string[]) || []
    );

    // ============================================================================
    // STEP 5: Build query
    // ============================================================================
    type ExpenseQuery = {
      type: string;
      locationId?: string | { $in: string[] };
      timestamp?: { $gte?: Date; $lte?: Date };
      'to.id'?: string;
    };

    const query: ExpenseQuery = { type: 'expense' };

    // Location filter
    if (locationId) {
      // Check if user has access to this specific location
      if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
        return NextResponse.json(
          { success: false, error: 'Access denied for this location' },
          { status: 403 }
        );
      }
      query.locationId = locationId;
    } else if (allowedLocationIds !== 'all') {
      // User can only see their allowed locations
      query.locationId = { $in: allowedLocationIds };
    }

    // Date filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Category filter
    if (category) {
      query['to.id'] = category;
    }

    // ============================================================================
    // STEP 6: Fetch expenses and aggregate machineNames for older records
    // ============================================================================
    const expenses = await VaultTransactionModel.find(query)
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();

    // collect all missing machine IDs
    const missingMachineIds = new Set<string>();
    interface MachineDetail { identifier: string; game: string; gameType: string }
    interface ExpenseDetails { isMachineRepair?: boolean; machineIds?: string[]; machineDetails?: MachineDetail[]; machineNames?: string[] }
    interface ExpenseItem { expenseDetails?: ExpenseDetails }

    expenses.forEach((expense: unknown) => {
      const e = expense as ExpenseItem;
      if (e.expenseDetails?.isMachineRepair && (e.expenseDetails.machineIds?.length ?? 0) > 0) {
        if (!e.expenseDetails.machineDetails || e.expenseDetails.machineDetails.length === 0) {
          e.expenseDetails.machineIds?.forEach((id: string) => missingMachineIds.add(id));
        }
      }
    });

    if (missingMachineIds.size > 0) {
      const { Machine } = await import('@/app/api/lib/models/machines');
      const mList = await Machine.find({ _id: { $in: Array.from(missingMachineIds) } }).lean();

      expenses.forEach((expense: unknown) => {
        const e = expense as ExpenseItem;
        if (e.expenseDetails?.isMachineRepair && (e.expenseDetails.machineIds?.length ?? 0) > 0) {
          if (!e.expenseDetails.machineDetails || e.expenseDetails.machineDetails.length === 0) {
            if (e.expenseDetails.machineIds) {
              e.expenseDetails.machineDetails = e.expenseDetails.machineIds.map((id: string) => {
                const m = mList.find((x: Record<string, unknown>) => String(x._id) === id || String(x.machineId) === id || (x.serialNumber as string) === id);
                if (!m) return { identifier: id, game: 'N/A', gameType: 'N/A' };

                const serialNumberRaw = m.serialNumber?.trim() || '';
                const customName = m.custom?.name?.trim() || '';
                const game = m.game || m.installedGame || '';
                const gameType = m.gameType || '';
                const mainIdentifier = serialNumberRaw || customName || 'N/A';

                return {
                  identifier: customName && customName !== mainIdentifier ? `${mainIdentifier} (${customName})` : mainIdentifier,
                  game: game.trim(),
                  gameType: gameType.trim()
                };
              });
              // For backward compatibility while frontend handles both, maybe we clean up old machineNames
              delete e.expenseDetails.machineNames;
            }
          }
        }
      });
    }

    // Remove machineIds from response
    expenses.forEach((expense: unknown) => {
      const e = expense as ExpenseItem;
      if (e.expenseDetails && e.expenseDetails.machineIds) {
        delete e.expenseDetails.machineIds;
      }
    });

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Expense GET API took ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      expenses,
      count: expenses.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching expenses:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
