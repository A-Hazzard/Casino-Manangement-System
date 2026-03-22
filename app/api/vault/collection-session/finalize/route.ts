import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { SoftCountModel } from '@/app/api/lib/models/softCount';
import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';
import { updateVaultShiftInventory } from '../../../lib/helpers/vault/inventory';
import VaultShiftModel from '../../../lib/models/vaultShift';
import VaultTransactionModel from '../../../lib/models/vaultTransaction';

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user }) => {
    try {
      const { sessionId, locationId, vaultShiftId } = await request.json();
      if (!sessionId || !locationId || !vaultShiftId)
        return NextResponse.json(
          { success: false, error: 'Missing parameters' },
          { status: 400 }
        );

      const session = await VaultCollectionSession.findById(sessionId);
      if (!session || session.status !== 'active')
        return NextResponse.json(
          { success: false, error: 'Session not active' },
          { status: 404 }
        );
      if (session.entries.length === 0 && !session.isEndOfDay)
        return NextResponse.json(
          { success: false, error: 'Empty session' },
          { status: 400 }
        );

      const txs: Record<string, unknown>[] = [],
        scs: Record<string, unknown>[] = [];
      for (const entry of session.entries) {
        const txId = await generateMongoId();
        txs.push({
          _id: txId,
          locationId,
          vaultShiftId,
          type: 'soft_count',
          from: { type: 'machine', id: entry.machineId },
          to: { type: 'vault' },
          amount: entry.totalAmount,
          denominations: entry.denominations,
          performedBy: user._id || session.startedBy,
          notes: `${session.type === 'soft_count' ? 'Soft count' : 'Collection'} from Machine ${entry.machineName || entry.machineId}${entry.notes ? `: ${entry.notes}` : ''}`,
          createdAt: new Date(),
          externalRef: sessionId,
        });
        if (session.type === 'soft_count')
          scs.push({
            _id: await generateMongoId(),
            locationId,
            machineId: entry.machineId,
            countedAt: entry.collectedAt || new Date(),
            amount: entry.totalAmount,
            denominations: entry.denominations,
            countedBy: user._id || session.startedBy,
            transactionId: txId,
            notes: entry.notes,
            isEndOfDay: entry.isEndOfDay || false,
          });
      }

      await VaultTransactionModel.insertMany(txs);
      if (scs.length > 0) await SoftCountModel.insertMany(scs);

      const activeVaultShift = await VaultShiftModel.findById(vaultShiftId);
      if (!activeVaultShift || activeVaultShift.status !== 'active')
        return NextResponse.json(
          { success: false, error: 'Active vault shift not found' },
          { status: 400 }
        );

      for (const entry of session.entries)
        await updateVaultShiftInventory(
          activeVaultShift,
          entry.totalAmount,
          entry.denominations,
          true
        );

      session.status = 'completed';
      session.completedAt = new Date();
      session.totalCollected = session.entries.reduce(
        (sum: number, e: { totalAmount: number }) => sum + e.totalAmount,
        0
      );
      await session.save();

      return NextResponse.json({
        success: true,
        totalCollected: session.totalCollected,
      });
    } catch (e: unknown) {
      console.error('[FinalizeCollection] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
