import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';

/**
 * GET /api/mqtt/discover-smibs
 * Discover all SMIB devices from database
 * Returns list of all machines with relayId configured
 */
export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    // Find all machines that have a relayId (SMIB devices)
    const machines = await Machine.find({
      $or: [
        { relayId: { $exists: true, $nin: [null, ''] } },
        { smibBoard: { $exists: true, $nin: [null, ''] } }
      ]
    })
      .select('_id relayId smibBoard serialNumber game gamingLocation')
      .lean();

    // Get location data for each machine
    const locationIds = [...new Set(machines.map(m => m.gamingLocation).filter(Boolean))];
    const locations = await GamingLocations.find({
      _id: { $in: locationIds }
    })
      .select('_id name')
      .lean();

    const locationMap = new Map(
      locations.map(loc => [(loc._id as unknown as { toString: () => string }).toString(), loc.name as string])
    );

    // Build SMIB device list
    const smibs = machines.map(machine => ({
      relayId: machine.relayId || machine.smibBoard || '',
      machineId: (machine._id as unknown as { toString: () => string }).toString(),
      serialNumber: machine.serialNumber || undefined,
      game: machine.game || undefined,
      locationName: machine.gamingLocation 
        ? locationMap.get((machine.gamingLocation as unknown as { toString: () => string }).toString()) || undefined
        : undefined,
      locationId: (machine.gamingLocation as unknown as { toString: () => string })?.toString() || undefined,
    })).filter(smib => smib.relayId); // Only include machines with valid relayId

    console.log(`✅ [DISCOVER SMIBS] Found ${smibs.length} SMIB devices`);

    return NextResponse.json({
      success: true,
      smibs,
      count: smibs.length,
    });
  } catch (error) {
    console.error('❌ [DISCOVER SMIBS] Error discovering SMIBs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        smibs: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

