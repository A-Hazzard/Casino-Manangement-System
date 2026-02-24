import { SoftCountModel } from '@/app/api/lib/models/softCount';
import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import { generateMongoId } from '@/lib/utils/id';
import { NextResponse } from 'next/server';
import { updateVaultShiftInventory } from '../../../lib/helpers/vault/inventory';
import { connectDB } from '../../../lib/middleware/db';
import VaultShiftModel from '../../../lib/models/vaultShift';
import VaultTransactionModel from '../../../lib/models/vaultTransaction';

export async function POST(req: Request) {
  try {
    const { sessionId, locationId, vaultShiftId, userId } = await req.json();

    if (!sessionId || !locationId || !vaultShiftId) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    await connectDB();

    // 1. Get the Active Session
    const session = await VaultCollectionSession.findById(sessionId);
    if (!session || session.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Session not found or already completed' }, { status: 404 });
    }

    // 2. Validate Entries (allow empty for end-of-day sessions — location may have no machines)
    if (session.entries.length === 0 && !session.isEndOfDay) {
      return NextResponse.json({ success: false, error: 'Cannot finalize empty session' }, { status: 400 });
    }

    const newTransactions = [];
    const newSoftCounts = [];

    // 3. Create Transactions and Records
    for (const entry of session.entries) {
      const transactionId = await generateMongoId();
      
      const transaction = {
        _id: transactionId,
        locationId,
        vaultShiftId, // Attach to current Vault Shift
        type: 'soft_count',
        from: { type: 'machine', id: entry.machineId },
        to: { type: 'vault' },
        amount: entry.totalAmount,
        denominations: entry.denominations,
        performedBy: userId || session.startedBy,
        notes: session.type === 'soft_count' 
          ? `Soft count removal from Machine ${entry.machineName || entry.machineId}${entry.notes ? `: ${entry.notes}` : ''}`
          : `Collection from Machine ${entry.machineName || entry.machineId}${entry.notes ? `: ${entry.notes}` : ''}`,
        createdAt: new Date(),
        externalRef: sessionId
      };
      
      newTransactions.push(transaction);

      if (session.type === 'soft_count') {
        const softCountId = await generateMongoId();
        newSoftCounts.push({
          _id: softCountId,
          locationId,
          machineId: entry.machineId,
          countedAt: entry.collectedAt || new Date(),
          amount: entry.totalAmount,
          denominations: entry.denominations,
          countedBy: userId || session.startedBy,
          transactionId: transactionId,
          notes: entry.notes,
          isEndOfDay: entry.isEndOfDay || false,
        });
      }
    }

    await VaultTransactionModel.insertMany(newTransactions);
    
    if (newSoftCounts.length > 0) {
      await SoftCountModel.insertMany(newSoftCounts);
    }

    // 4. Update Vault Balance & Inventory
    const activeVaultShift = await VaultShiftModel.findById(vaultShiftId);
    if (!activeVaultShift || activeVaultShift.status !== 'active') {
        return NextResponse.json({ success: false, error: 'Active vault shift not found' }, { status: 400 });
    }

    const totalCollected = session.entries.reduce((sum: number, e: any) => sum + e.totalAmount, 0);
    const isAddition = true; // All collection sessions add money from machines to the vault

    // Update inventory machine-by-machine to ensure all denoms are tracked
    for (const entry of session.entries) {
        await updateVaultShiftInventory(activeVaultShift, entry.totalAmount, entry.denominations, isAddition);
    }
    
    // 5. Mark Session as Completed
    session.status = 'completed';
    session.completedAt = new Date();
    session.totalCollected = totalCollected;
    await session.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Collection finalized successfully',
      totalCollected 
    });

  } catch (error: any) {
    console.error('Finalize Collection Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
