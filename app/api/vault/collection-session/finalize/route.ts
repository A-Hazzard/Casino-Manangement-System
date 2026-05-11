import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { SoftCountModel } from '@/app/api/lib/models/softCount';
import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';
import { updateVaultShiftInventory } from '../../../lib/helpers/vault/inventory';
import VaultShiftModel from '../../../lib/models/vaultShift';
import VaultTransactionModel from '../../../lib/models/vaultTransaction';

/**
 * POST /api/vault/collection-session/finalize
 *
 * @body {string} sessionId - ID of the session to finalize (REQUIRED)
 * @body {string} locationId - ID of the location (REQUIRED)
 * @body {string} vaultShiftId - ID of the active vault shift (REQUIRED)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/collection-session/finalize';
  const logUser = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user }) => {
    try {
      const { sessionId, locationId, vaultShiftId } = await request.json();
      if (!sessionId || !locationId || !vaultShiftId) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/collection-session/finalize',
          'Missing parameters',
          logUser
        );
        return NextResponse.json(
          { success: false, error: 'Missing parameters' },
          { status: 400 }
        );
      }

      const session = await VaultCollectionSession.findOne({ _id: sessionId });
      if (!session || session.status !== 'active') {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/collection-session/finalize',
          'Session not active',
          logUser
        );
        return NextResponse.json(
          { success: false, error: 'Session not active' },
          { status: 404 }
        );
      }
      if (session.entries.length === 0 && !session.isEndOfDay) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/collection-session/finalize',
          'Empty session',
          logUser
        );
        return NextResponse.json(
          { success: false, error: 'Empty session' },
          { status: 400 }
        );
      }

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

      const txsResult = await VaultTransactionModel.insertMany(txs);
      if (txsResult.length !== txs.length) {
        console.error(
          `[collection-session/finalize] Only ${txsResult.length}/${txs.length} transactions inserted`
        );
      }
      if (scs.length > 0) {
        const scsResult = await SoftCountModel.insertMany(scs);
        if (scsResult.length !== scs.length) {
          console.error(
            `[collection-session/finalize] Only ${scsResult.length}/${scs.length} soft counts inserted`
          );
        }
      }

      const activeVaultShift = await VaultShiftModel.findOne({
        _id: vaultShiftId,
      });
      if (!activeVaultShift || activeVaultShift.status !== 'active') {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/collection-session/finalize',
          'Active vault shift not found',
          logUser
        );
        return NextResponse.json(
          { success: false, error: 'Active vault shift not found' },
          { status: 400 }
        );
      }

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

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'POST',
        '/api/vault/collection-session/finalize',
        1,
        logUser,
        duration
      );

      return NextResponse.json({
        success: true,
        totalCollected: session.totalCollected,
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : 'Failed to finalize collection session';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/collection-session/finalize',
        errorMessage,
        logUser
      );
      console.error(
        '[FinalizeCollection] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
