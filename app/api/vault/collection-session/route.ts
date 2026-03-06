
import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import { NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';

/**
 * Vault Collection Session API
 * 
 * GET: Fetch active session for the current vault shift
 * POST: Create a new session or add an entry to an active session
 * DELETE: Remove an entry or cancel the session
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vaultShiftId = searchParams.get('vaultShiftId');
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');
    const type = searchParams.get('type') || 'soft_count';
    const isEndOfDay = searchParams.get('isEndOfDay') === 'true';

    if (!vaultShiftId || !locationId) {
      return NextResponse.json({ success: false, error: 'Vault Shift ID and Location ID required' }, { status: 400 });
    }

    await connectDB();

    interface SessionQuery {
      locationId: string;
      vaultShiftId: string;
      type: string;
      isEndOfDay: boolean;
      status?: string;
    }

    // Build query
    const query: SessionQuery = {
      locationId: locationId as string,
      vaultShiftId: vaultShiftId as string,
      type: type as string,
      isEndOfDay: isEndOfDay as boolean
    };

    // Only filter by status if explicitly provided, 
    // BUT for non-EOD soft counts, we default to only fetching active ones 
    // if no status is provided, to allow starting new sessions after completion.
    if (status) {
      query.status = status;
    } else if (!isEndOfDay) {
      query.status = 'active';
    }

    // Find session for this vault shift
    const session = await VaultCollectionSession.findOne(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, session });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error fetching collection session:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    interface SessionEntryData {
      machineId: string;
      machineName: string;
      source?: string;
      totalAmount?: number;
      denominations?: Array<{ denomination: number; quantity: number }>;
      meters?: Record<string, number>;
      expectedDrop?: number;
      variance?: number;
      notes?: string;
      isEndOfDay?: boolean;
      collectedAt?: Date | string;
    }

    interface CollectionSessionRequest {
      action: 'start' | 'addEntry' | 'removeEntry' | 'cancel';
      locationId: string;
      vaultShiftId: string;
      machineId?: string;
      entryData?: SessionEntryData;
      sessionId?: string;
      userId?: string;
      type?: string;
      isEndOfDay?: boolean;
    }

    const body = await req.json() as CollectionSessionRequest;
    const { action, locationId, vaultShiftId, machineId, entryData, sessionId, type = 'soft_count', isEndOfDay = false } = body;
    const userId = body.userId as string;

    if (!locationId || !vaultShiftId) {
      return NextResponse.json({ success: false, error: 'Location and Vault Shift ID required' }, { status: 400 });
    }

    await connectDB();

    let session;

    // 1. Start New Session
    if (action === 'start') {
      // Check for existing active session first
      const existing = await VaultCollectionSession.findOne({
        locationId,
        vaultShiftId,
        type,
        status: 'active',
        isEndOfDay
      });

      if (existing) {
        return NextResponse.json({ success: true, session: existing, message: 'Resumed existing session' });
      }

      session = await VaultCollectionSession.create({
        locationId,
        vaultShiftId,
        type,
        isEndOfDay,
        startedBy: userId || 'system',
        status: 'active',
        entries: [],
        totalCollected: 0
      });
    }

    // 2. Add Entry
    else if (action === 'addEntry') {
      if (!sessionId || !entryData) {
        return NextResponse.json({ success: false, error: 'Session ID and Entry Data required' }, { status: 400 });
      }

      session = await VaultCollectionSession.findById(sessionId);
      if (!session || session.status !== 'active') {
        return NextResponse.json({ success: false, error: 'Active session not found' }, { status: 404 });
      }

      // Check if machine already added
      const existingEntryIndex = session.entries.findIndex((e: { machineId: string }) => e.machineId === entryData.machineId);

      const newEntry = {
        machineId: entryData.machineId,
        machineName: entryData.machineName,
        source: entryData.source || 'manual',
        totalAmount: (entryData.totalAmount as number) || 0,
        denominations: entryData.denominations || [],
        meters: entryData.meters || {},
        expectedDrop: (entryData.expectedDrop as number) || 0,
        variance: (entryData.variance as number) || 0,
        notes: entryData.notes || '',
        isEndOfDay: entryData.isEndOfDay || false,
        collectedAt: entryData.collectedAt || new Date()
      };

      if (existingEntryIndex >= 0) {
        // Update existing entry
        session.entries[existingEntryIndex] = newEntry;
      } else {
        // Add new entry
        session.entries.push(newEntry);
      }

      // Recalculate total
      session.totalCollected = session.entries.reduce((sum: number, entry: { totalAmount?: number }) => sum + (entry.totalAmount || 0), 0);

      await session.save();
    }

    // 3. Remove Entry
    else if (action === 'removeEntry') {
      if (!sessionId || !machineId) {
        return NextResponse.json({ success: false, error: 'Session ID and Machine ID required' }, { status: 400 });
      }

      session = await VaultCollectionSession.findById(sessionId);
      if (!session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

      session.entries = session.entries.filter((e: { machineId: string }) => e.machineId !== machineId);

      // Recalculate total
      session.totalCollected = session.entries.reduce((sum: number, entry: { totalAmount?: number }) => sum + (entry.totalAmount || 0), 0);

      await session.save();
    }

    // 4. Cancel Session
    else if (action === 'cancel') {
      if (!sessionId) return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });

      session = await VaultCollectionSession.findByIdAndUpdate(
        sessionId,
        { status: 'cancelled' },
        { new: true }
      );
    }

    return NextResponse.json({ success: true, session });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in collection session API:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
