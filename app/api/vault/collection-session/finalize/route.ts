import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';
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
      type: 'machine_collection',
      from: { type: 'machine', id: entry.machineId },
      to: { type: 'vault' },
      amount: entry.totalAmount,
      denominations: entry.denominations,
      performedBy: userId || session.startedBy,
      notes: `Collection from Machine ${entry.machineName || entry.machineId}`,
      createdAt: new Date(),
      // Link to this specific session if needed? Or just generic
      externalRef: sessionId // Optional, hypothetical field
    }));

    await VaultTransactionModel.insertMany(transactions);

    // 4. Update Vault Balance (Add total collected)
    const totalCollected = session.entries.reduce((sum: number, e: any) => sum + e.totalAmount, 0);

    // Fetch current Vault Shift to update closing stats (if tracked live)
    // Or just let transactions define the balance. 
    // Usually we update a cached 'currentBalance' somewhere if performance is key.
    
    // For now, let's assume balance is derived from transactions, or updated on Shift Close.
    
    // 5. Mark Session as Completed
    session.status = 'completed';
    session.completedAt = new Date();
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
