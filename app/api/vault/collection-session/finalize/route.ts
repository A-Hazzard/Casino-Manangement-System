import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import mongoose from 'mongoose';
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

    // 2. Validate Entries
    if (session.entries.length === 0) {
      return NextResponse.json({ success: false, error: 'Cannot finalize empty session' }, { status: 400 });
    }

    // 3. Create Transactions (One per machine for audit granularity)
    const transactions = session.entries.map((entry: any) => ({
      _id: new mongoose.Types.ObjectId().toHexString(),
      locationId,
      vaultShiftId, // Attach to current Vault Shift
      type: session.type === 'soft_count' ? 'soft_count' : 'machine_collection',
      from: session.type === 'soft_count' ? { type: 'vault' } : { type: 'machine', id: entry.machineId },
      to: session.type === 'soft_count' ? { type: 'external' } : { type: 'vault' },
      amount: entry.totalAmount,
      denominations: entry.denominations,
      performedBy: userId || session.startedBy,
      notes: session.type === 'soft_count' 
        ? `Soft count removal from Machine ${entry.machineName || entry.machineId}${entry.notes ? `: ${entry.notes}` : ''}`
        : `Collection from Machine ${entry.machineName || entry.machineId}${entry.notes ? `: ${entry.notes}` : ''}`,
      createdAt: new Date(),
      externalRef: sessionId
    }));

    await VaultTransactionModel.insertMany(transactions);

    // 4. Update Vault Balance & Inventory
    const activeVaultShift = await VaultShiftModel.findById(vaultShiftId);
    if (!activeVaultShift || activeVaultShift.status !== 'active') {
        return NextResponse.json({ success: false, error: 'Active vault shift not found' }, { status: 400 });
    }

    const totalCollected = session.entries.reduce((sum: number, e: any) => sum + e.totalAmount, 0);
    const isAddition = session.type !== 'soft_count';

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
