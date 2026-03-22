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
          denominations = JSON.parse(denominationsStr).filter((d: Denomination) => d.quantity > 0).map((d: Denomination) => ({ denomination: Number(d.denomination) as Denomination['denomination'], quantity: Math.max(0, Number(d.quantity)) }));
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
          const m = mList.find((x: Record<string, unknown>) => String(x._id) === id || String(x.machineId) === id || (x.serialNumber as string) === id) as Record<string, unknown> | undefined;
          if (!m) return { identifier: id, game: 'N/A', gameType: 'N/A' };
          const custom = m.custom as { name?: string } | undefined;
          const mainId = (m.serialNumber as string || '')?.trim() || custom?.name?.trim() || 'N/A';
          return { identifier: custom?.name ? `${mainId} (${custom.name})` : mainId, game: ((m.game as string || m.installedGame as string || '') as string).trim(), gameType: (m.gameType as string || '').trim() };
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
      expenses.forEach((e: LocalTransaction) => {
        if (e.expenseDetails?.isMachineRepair && e.expenseDetails.machineIds?.length && !e.expenseDetails.machineDetails?.length) {
          e.expenseDetails.machineIds.forEach((id: string) => missingIds.add(id));
        }
      });

      if (missingIds.size > 0) {
        const { Machine } = await import('@/app/api/lib/models/machines');
        const mList = await Machine.find({ _id: { $in: Array.from(missingIds) } }).lean();
        expenses.forEach((e: LocalTransaction) => {
          if (e.expenseDetails?.isMachineRepair && e.expenseDetails.machineIds?.length && !e.expenseDetails.machineDetails?.length) {
            e.expenseDetails.machineDetails = e.expenseDetails.machineIds.map((id: string) => {
              const m = mList.find((x: Record<string, unknown>) => String(x._id) === id || String(x.machineId) === id || (x.serialNumber as string) === id) as Record<string, unknown> | undefined;
              if (!m) return { identifier: id, game: 'N/A', gameType: 'N/A' };
              const custom = m.custom as { name?: string } | undefined;
              const mainId = (m.serialNumber as string || '')?.trim() || custom?.name?.trim() || 'N/A';
              return { identifier: custom?.name ? `${mainId} (${custom.name})` : mainId, game: ((m.game as string || m.installedGame as string || '') as string).trim(), gameType: (m.gameType as string || '').trim() };
            });
          }
        });
      }

      expenses.forEach((e: VaultTransaction) => { if (e.expenseDetails) delete e.expenseDetails.machineIds; });
      return NextResponse.json({ success: true, expenses, count: expenses.length });
    } catch (error: unknown) {
      console.error('[Expense GET] Error:', error);
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  });
}

