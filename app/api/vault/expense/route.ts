/**
 * Vault Expense API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { updateVaultShiftInventory, validateDenominationTotal } from '@/app/api/lib/helpers/vault/inventory';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
import { GridFSBucket, type Db } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { Denomination, VaultTransaction } from '@/shared/types/vault';

/**
 * POST /api/vault/expense
 *
 * @body {FormData} category - Expense category (REQUIRED)
 * @body {FormData} amount - Total expense amount (REQUIRED)
 * @body {FormData} description - Description of expense
 * @body {FormData} date - ISO date string for transaction
 * @body {FormData} denominations - JSON string of denominations (REQUIRED)
 * @body {FormData} file - Binary receipt image/PDF
 * @body {FormData} bankDetails - JSON string of bank details
 * @body {FormData} expenseDetails - JSON string of additional expense metadata
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles, db }) => {
    try {
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVMAccess = normalizedRoles.some(role => ['developer', 'admin', 'manager', 'vault-manager'].includes(role));
      if (!hasVMAccess) return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });

      const formData = await request.formData();
      const category = formData.get('category') as string;
      const amount = parseFloat(formData.get('amount') as string);
      const description = formData.get('description') as string;
      const dateStr = formData.get('date') as string;
      const denominationsStr = formData.get('denominations') as string;
      const file = formData.get('file') as File | null;

      if (!category || isNaN(amount)) return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });

      let denominations: Denomination[] = [];
      if (denominationsStr) {
        try {
          denominations = JSON.parse(denominationsStr).filter((denom: Denomination) => denom.quantity > 0).map((denom: Denomination) => ({ denomination: Number(denom.denomination) as Denomination['denomination'], quantity: Math.max(0, Number(denom.quantity)) }));
        } catch { console.error('Denom parse error'); }
      }

      let attachmentId, attachmentName;
      if (file && file.size > 0) {
        try {
          const bucket = new GridFSBucket(db as unknown as Db, { bucketName: 'vault_attachments' });
          const buffer = Buffer.from(await file.arrayBuffer());
          const uploadStream = bucket.openUploadStream(file.name, { metadata: { originalName: file.name, mimeType: file.type, size: file.size, uploadedAt: new Date(), uploadedBy: userPayload._id, context: 'expense_receipt' } });
          attachmentId = uploadStream.id; attachmentName = file.name;
          await new Promise((res, rej) => { Readable.from(buffer).pipe(uploadStream).on('error', rej).on('finish', res); });

        } catch { return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 }); }
      }

      const activeVaultShift = await VaultShiftModel.findOne({ vaultManagerId: userPayload._id, status: 'active' });
      if (!activeVaultShift) return NextResponse.json({ success: false, error: 'No active vault shift' }, { status: 400 });

      const allowedLocs = await getUserLocationFilter(userPayload.assignedLicencees || [], undefined, userPayload.assignedLocations || [], userRoles);

      if (allowedLocs !== 'all' && !allowedLocs.includes(String(activeVaultShift.locationId))) return NextResponse.json({ success: false, error: 'Location access denied' }, { status: 403 });

      const currentBal = activeVaultShift.closingBalance ?? activeVaultShift.openingBalance;
      if (currentBal < amount) return NextResponse.json({ success: false, error: 'Insufficient funds' }, { status: 400 });
      if (!denominations?.length || !validateDenominationTotal(amount, denominations)) return NextResponse.json({ success: false, error: 'Invalid denominations' }, { status: 400 });

      let bankDetails, expenseDetails;
      try { bankDetails = formData.get('bankDetails') ? JSON.parse(formData.get('bankDetails') as string) : undefined; } catch {}
      try { expenseDetails = formData.get('expenseDetails') ? JSON.parse(formData.get('expenseDetails') as string) : undefined; } catch {}

      if (expenseDetails?.isMachineRepair && expenseDetails?.machineIds?.length) {
        const { Machine } = await import('@/app/api/lib/models/machines');
        const mList = await Machine.find({ _id: { $in: expenseDetails.machineIds } }).lean();
        expenseDetails.machineDetails = expenseDetails.machineIds.map((id: string) => {
          const machineItem = mList.find((x: Record<string, unknown>) => String(x._id) === id || String(x.machineId) === id || (x.serialNumber as string) === id) as Record<string, unknown> | undefined;
          if (!machineItem) return { identifier: id, game: 'N/A', gameType: 'N/A' };
          const custom = machineItem.custom as { name?: string } | undefined;
          const mainId = (machineItem.serialNumber as string || '')?.trim() || custom?.name?.trim() || 'N/A';
          return { identifier: custom?.name ? `${mainId} (${custom.name})` : mainId, game: ((machineItem.game as string || machineItem.installedGame as string || '') as string).trim(), gameType: (machineItem.gameType as string || '').trim() };
        });
      }

      const tx = new VaultTransactionModel({
        _id: await generateMongoId(), locationId: activeVaultShift.locationId, timestamp: dateStr ? new Date(dateStr) : new Date(), type: 'expense',
        from: { type: 'vault' }, to: { type: 'external', id: category }, fromName: 'Vault', toName: category, amount, denominations,
        vaultBalanceBefore: currentBal, vaultBalanceAfter: currentBal - amount, vaultShiftId: activeVaultShift._id,
        performedBy: userPayload._id, performedByName: userPayload.username || '', notes: description ? `${category}: ${description}` : category,
        attachmentId, attachmentName, bankDetails, expenseDetails
      });

      await tx.save();
      await updateVaultShiftInventory(activeVaultShift, amount, denominations, false);

      await logActivity({ userId: userPayload._id, username: userPayload.username, action: 'create', details: `Expense: ${category} - $${amount}`, metadata: { resource: 'vault', resourceId: activeVaultShift.locationId, transactionId: tx._id } });

      return NextResponse.json({ success: true, transaction: tx });
    } catch (error: unknown) {
      console.error('[Expense POST] Error:', error);
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  });
}

/**
 * Main GET handler for vault expenses
 *
 * @param {string} locationId - ID of the location to filter by
 * @param {string} startDate - ISO date for range start
 * @param {string} endDate - ISO date for range end
 * @param {string} category - Specific expense category to filter by
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVMAccess = normalizedRoles.some(role => ['developer', 'admin', 'manager', 'vault-manager'].includes(role));
      if (!hasVMAccess) return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });

      const { searchParams } = new URL(request.url);
      const locId = searchParams.get('locationId');
      const start = searchParams.get('startDate');
      const end = searchParams.get('endDate');
      const cat = searchParams.get('category');

      const allowedLocs = await getUserLocationFilter(userPayload.assignedLicencees || [], undefined, userPayload.assignedLocations || [], userRoles);


      const query: Record<string, unknown> = { type: 'expense' };
      if (locId) {
        if (allowedLocs !== 'all' && !allowedLocs.includes(locId)) return NextResponse.json({ success: false, error: 'Location access denied' }, { status: 403 });
        query.locationId = locId;
      } else if (allowedLocs !== 'all') {
        query.locationId = { $in: allowedLocs };
      }

      if (start || end) {
        const timestampQuery: { $gte?: Date; $lte?: Date } = {};
        if (start) timestampQuery.$gte = new Date(start);
        if (end) timestampQuery.$lte = new Date(end);
        query.timestamp = timestampQuery;
      }
      if (cat) query['to.id'] = cat;

      type LocalTransaction = Omit<VaultTransaction, 'expenseDetails'> & {
        expenseDetails?: VaultTransaction['expenseDetails'] & {
          machineDetails?: unknown[];
        }
      };
      
      const expenses = await VaultTransactionModel.find(query).sort({ timestamp: -1 }).limit(500).lean() as unknown as LocalTransaction[];

      const missingIds = new Set<string>();
      expenses.forEach((expenseItem: LocalTransaction) => {
        if (expenseItem.expenseDetails?.isMachineRepair && expenseItem.expenseDetails.machineIds?.length && !expenseItem.expenseDetails.machineDetails?.length) {
          expenseItem.expenseDetails.machineIds.forEach((id: string) => missingIds.add(id));
        }
      });

      if (missingIds.size > 0) {
        const { Machine } = await import('@/app/api/lib/models/machines');
        const mList = await Machine.find({ _id: { $in: Array.from(missingIds) } }).lean();
        expenses.forEach((expense: LocalTransaction) => {
          if (expense.expenseDetails?.isMachineRepair && expense.expenseDetails.machineIds?.length && !expense.expenseDetails.machineDetails?.length) {
            expense.expenseDetails.machineDetails = expense.expenseDetails.machineIds.map((id: string) => {
              const machineItem = mList.find((x: Record<string, unknown>) => String(x._id) === id || String(x.machineId) === id || (x.serialNumber as string) === id) as Record<string, unknown> | undefined;
              if (!machineItem) return { identifier: id, game: 'N/A', gameType: 'N/A' };
              const custom = machineItem.custom as { name?: string } | undefined;
              const mainId = (machineItem.serialNumber as string || '')?.trim() || custom?.name?.trim() || 'N/A';
              return { identifier: custom?.name ? `${mainId} (${custom.name})` : mainId, game: ((machineItem.game as string || machineItem.installedGame as string || '') as string).trim(), gameType: (machineItem.gameType as string || '').trim() };
            });
          }
        });
      }

      expenses.forEach((expense: VaultTransaction) => { if (expense.expenseDetails) delete expense.expenseDetails.machineIds; });
      return NextResponse.json({ success: true, expenses, count: expenses.length });
    } catch (error: unknown) {
      console.error('[Expense GET] Error:', error);
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  });
}

