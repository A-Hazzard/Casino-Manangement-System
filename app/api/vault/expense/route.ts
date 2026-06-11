/**
 * Vault Expense API Route
 *
 * This route handles expense transaction creation (POST) and listing (GET).
 * It supports:
 * - Creating expense transactions with optional receipt attachment
 * - Listing expenses with location, date, and category filtering
 * - Machine detail resolution for repair expenses
 *
 * @module app/api/vault/expense/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import {
  checkVaultManagerPermission,
  uploadExpenseAttachment,
  resolveExpenseMachineDetails,
  buildExpenseQuery,
} from '@/app/api/lib/helpers/vault/expenseOperations';
import {
  updateVaultShiftInventory,
  validateDenominationTotal,
} from '@/app/api/lib/helpers/vault/inventory';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';
import type { Denomination } from '@shared/types/vault';
import type { VaultTransactionDocument } from '@shared/types';

/**
 * POST /api/vault/expense
 *
 * @body {FormData} category - Expense category (REQUIRED)
 * @body {FormData} amount - Total expense amount (REQUIRED)
 * @body {FormData} denominations - JSON string of denominations (REQUIRED)
 * @body {FormData} description - Description of expense
 * @body {FormData} date - ISO date string for transaction
 * @body {FormData} file - Binary receipt image/PDF
 * @body {FormData} bankDetails - JSON string of bank details
 * @body {FormData} expenseDetails - JSON string of additional expense metadata
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/expense';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles, db }) => {
    try {
      // ============================================================================
      // STEP 1: Check permissions
      // ============================================================================
      if (!checkVaultManagerPermission(userRoles)) {
        logRouteError(functionName, 'POST', '/api/vault/expense', 'Insufficient permissions', user);
        return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
      }

      // ============================================================================
      // STEP 2: Parse form data
      // ============================================================================
      const formData = await request.formData();
      const category = formData.get('category') as string;
      const amount = parseFloat(formData.get('amount') as string);
      const description = formData.get('description') as string;
      const dateStr = formData.get('date') as string;
      const denominationsStr = formData.get('denominations') as string;
      const file = formData.get('file') as File | null;

      if (!category || isNaN(amount)) {
        logRouteError(functionName, 'POST', '/api/vault/expense', 'Missing required fields', user);
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }

      let denominations: Denomination[] = [];
      if (denominationsStr) {
        try {
          denominations = JSON.parse(denominationsStr)
            .filter((denom: Denomination) => denom.quantity > 0)
            .map((denom: Denomination) => ({
              denomination: Number(denom.denomination) as Denomination['denomination'],
              quantity: Math.max(0, Number(denom.quantity)),
            }));
        } catch {
          console.error('[Expense POST] Denom parse error');
        }
      }

      // ============================================================================
      // STEP 3: Upload attachment (optional)
      // ============================================================================
      let attachmentId: unknown;
      let attachmentName: string | undefined;
      if (file && file.size > 0) {
        const uploadResult = await uploadExpenseAttachment(file, db, userPayload);
        if (!uploadResult) {
          logRouteError(functionName, 'POST', '/api/vault/expense', 'Upload failed', user);
          return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
        }
        attachmentId = uploadResult.attachmentId;
        attachmentName = uploadResult.attachmentName;
      }

      // ============================================================================
      // STEP 4: Validate vault shift and location access
      // ============================================================================
      const activeVaultShift = await VaultShiftModel.findOne({
        vaultManagerId: userPayload._id,
        status: 'active',
      });
      if (!activeVaultShift) {
        logRouteError(functionName, 'POST', '/api/vault/expense', 'No active vault shift', user);
        return NextResponse.json({ success: false, error: 'No active vault shift' }, { status: 400 });
      }

      const allowedLocs = await getUserLocationFilter(
        userPayload.assignedLicencees || [],
        undefined,
        userPayload.assignedLocations || [],
        userRoles
      );
      if (allowedLocs !== 'all' && !allowedLocs.includes(String(activeVaultShift.locationId))) {
        logRouteError(functionName, 'POST', '/api/vault/expense', 'Location access denied', user);
        return NextResponse.json({ success: false, error: 'Location access denied' }, { status: 403 });
      }

      // ============================================================================
      // STEP 5: Validate balance and denominations
      // ============================================================================
      const currentBal = activeVaultShift.closingBalance ?? activeVaultShift.openingBalance;
      if (currentBal < amount) {
        logRouteError(functionName, 'POST', '/api/vault/expense', 'Insufficient funds', user);
        return NextResponse.json({ success: false, error: 'Insufficient funds' }, { status: 400 });
      }
      if (!denominations?.length || !validateDenominationTotal(amount, denominations)) {
        logRouteError(functionName, 'POST', '/api/vault/expense', 'Invalid denominations', user);
        return NextResponse.json({ success: false, error: 'Invalid denominations' }, { status: 400 });
      }

      // ============================================================================
      // STEP 6: Process expense details and create transaction
      // ============================================================================
      let bankDetails: Record<string, unknown> | undefined;
      let expenseDetails: Record<string, unknown> | undefined;
      try {
        bankDetails = formData.get('bankDetails')
          ? JSON.parse(formData.get('bankDetails') as string)
          : undefined;
      } catch { /* ignore parse errors */ }
      try {
        expenseDetails = formData.get('expenseDetails')
          ? JSON.parse(formData.get('expenseDetails') as string)
          : undefined;
      } catch { /* ignore parse errors */ }

      if (expenseDetails?.isMachineRepair && Array.isArray(expenseDetails?.machineIds)) {
        expenseDetails.machineDetails = await resolveExpenseMachineDetails(
          expenseDetails.machineIds as string[]
        );
      }

      const transactionDoc = new VaultTransactionModel({
        _id: await generateMongoId(),
        locationId: activeVaultShift.locationId,
        timestamp: dateStr ? new Date(dateStr) : new Date(),
        type: 'expense',
        from: { type: 'vault' },
        to: { type: 'external', id: category },
        fromName: 'Vault',
        toName: category,
        amount,
        denominations,
        vaultBalanceBefore: currentBal,
        vaultBalanceAfter: currentBal - amount,
        vaultShiftId: activeVaultShift._id,
        performedBy: userPayload._id,
        performedByName: userPayload.username || '',
        notes: description ? `${category}: ${description}` : category,
        attachmentId,
        attachmentName,
        bankDetails,
        expenseDetails,
      });

      await transactionDoc.save();
      await updateVaultShiftInventory(activeVaultShift, amount, denominations, false);

      // ============================================================================
      // STEP 7: Log activity and return
      // ============================================================================
      await logActivity({
        userId: userPayload._id,
        username: userPayload.username,
        action: 'create',
        details: `Expense: ${category} - $${amount}`,
        metadata: {
          resource: 'vault',
          resourceId: activeVaultShift.locationId,
          transactionId: transactionDoc._id,
        },
      });

      const duration = Date.now() - startTime;
      logRouteCreate(functionName, 'POST', '/api/vault/expense', 1, user, duration);

      return NextResponse.json({ success: true, transaction: transactionDoc });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create expense';
      logRouteError(functionName, 'POST', '/api/vault/expense', errorMessage, user);
      console.error('[Expense POST] Error:', error);
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/vault/expense
 *
 * @param {string} locationId - ID of the location to filter by
 * @param {string} startDate - ISO date for range start
 * @param {string} endDate - ISO date for range end
 * @param {string} category - Specific expense category to filter by
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/expense';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Check permissions
      // ============================================================================
      if (!checkVaultManagerPermission(userRoles)) {
        logRouteError(functionName, 'GET', '/api/vault/expense', 'Insufficient permissions', user);
        return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
      }

      // ============================================================================
      // STEP 2: Build query with location filter
      // ============================================================================
      const { searchParams } = new URL(request.url);

      const allowedLocs = await getUserLocationFilter(
        userPayload.assignedLicencees || [],
        undefined,
        userPayload.assignedLocations || [],
        userRoles
      );

      const { query, error: queryError } = buildExpenseQuery(searchParams, allowedLocs);
      if (queryError) {
        logRouteError(functionName, 'GET', '/api/vault/expense', queryError, user);
        return NextResponse.json({ success: false, error: queryError }, { status: 403 });
      }

      // ============================================================================
      // STEP 3: Fetch expenses
      // ============================================================================
      const expenses = await VaultTransactionModel.find(query)
        .sort({ timestamp: -1 })
        .limit(500)
        .lean<VaultTransactionDocument[]>();

      // ============================================================================
      // STEP 4: Enrich machine details for repair expenses
      // ============================================================================
      const missingIds = new Set<string>();
      for (const expense of expenses) {
        const details = expense.expenseDetails as Record<string, unknown> | undefined;
        if (
          details?.isMachineRepair &&
          Array.isArray(details.machineIds) &&
          !Array.isArray(details.machineDetails)
        ) {
          for (const id of details.machineIds as string[]) {
            missingIds.add(id);
          }
        }
      }

      if (missingIds.size > 0) {
        const uniqueIds = Array.from(missingIds);
        const allDetails = await resolveExpenseMachineDetails(uniqueIds);
        const idToIndex = new Map<string, number>();
        uniqueIds.forEach((id, index) => idToIndex.set(id, index));

        for (const expense of expenses) {
          const details = expense.expenseDetails as Record<string, unknown> | undefined;
          if (
            details?.isMachineRepair &&
            Array.isArray(details.machineIds) &&
            !Array.isArray(details.machineDetails)
          ) {
            details.machineDetails = (details.machineIds as string[]).map(id => {
              const idx = idToIndex.get(id);
              return idx !== undefined
                ? allDetails[idx]
                : { identifier: id, game: 'N/A', gameType: 'N/A' };
            });
          }
        }
      }

      // ============================================================================
      // STEP 5: Clean up and return
      // ============================================================================
      for (const expense of expenses) {
        const details = expense.expenseDetails as Record<string, unknown> | undefined;
        if (details) delete details.machineIds;
      }

      const duration = Date.now() - startTime;
      logRouteFetch(functionName, 'GET', '/api/vault/expense', expenses.length, user, duration);

      return NextResponse.json({ success: true, expenses, count: expenses.length });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch expenses';
      logRouteError(functionName, 'GET', '/api/vault/expense', errorMessage, user);
      console.error('[Expense GET] Error:', error);
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  });
}
