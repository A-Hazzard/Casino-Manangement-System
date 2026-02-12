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

    if (!vaultShiftId || !locationId) {
      return NextResponse.json({ success: false, error: 'Vault Shift ID and Location ID required' }, { status: 400 });
    }

    await connectDB();

    // Find active session for this vault shift
    const session = await VaultCollectionSession.findOne({
      locationId,
      vaultShiftId,
      status: 'active'
    }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('Error fetching collection session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, locationId, vaultShiftId, machineId, entryData, sessionId } = body;

    // Get current user (simple mock for now, replace with actual auth)
    // In a real app, use getServerSession(authOptions)
    // const session = await getServerSession(authOptions);
    // const userId = session?.user?.id; 
    
    // For now, require userId in body or mock it if safe (assuming protected route)
    const userId = body.userId; 

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
        status: 'active'
      });

      if (existing) {
        return NextResponse.json({ success: true, session: existing, message: 'Resumed existing session' });
      }

      session = await VaultCollectionSession.create({
        locationId,
        vaultShiftId,
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
      const existingEntryIndex = session.entries.findIndex((e: any) => e.machineId === entryData.machineId);
      
      if (existingEntryIndex >= 0) {
        // Update existing entry
        session.entries[existingEntryIndex] = entryData;
      } else {
        // Add new entry
        session.entries.push(entryData);
      }
      
      // Recalculate total
      session.totalCollected = session.entries.reduce((sum: number, entry: any) => sum + (entry.totalAmount || 0), 0);
      
      await session.save();
    }

    // 3. Remove Entry
    else if (action === 'removeEntry') {
        if (!sessionId || !machineId) {
            return NextResponse.json({ success: false, error: 'Session ID and Machine ID required' }, { status: 400 });
        }

        session = await VaultCollectionSession.findById(sessionId);
        if (!session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

        session.entries = session.entries.filter((e: any) => e.machineId !== machineId);
        
        // Recalculate total
        session.totalCollected = session.entries.reduce((sum: number, entry: any) => sum + (entry.totalAmount || 0), 0);
        
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
  } catch (error: any) {
    console.error('Error in collection session API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
