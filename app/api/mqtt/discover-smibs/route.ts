import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { NextRequest, NextResponse } from 'next/server';
import { differenceInMinutes } from 'date-fns';
import { connectDB } from '../../lib/middleware/db';

type LeanMachine = {
  _id: unknown;
  relayId?: string | null;
  smibBoard?: string | null;
  serialNumber?: string | null;
  game?: string | null;
  gamingLocation?: unknown;
  lastActivity?: Date | string | null;
  updatedAt?: Date | string | null;
};

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
        { smibBoard: { $exists: true, $nin: [null, ''] } },
      ],
    })
      .select(
        '_id relayId smibBoard serialNumber game gamingLocation lastActivity updatedAt'
      )
      .lean<LeanMachine[]>();

    // Get location data for each machine
    const locationIds = [
      ...new Set(machines.map(m => m.gamingLocation).filter(Boolean)),
    ];
    const locations = await GamingLocations.find({
      _id: { $in: locationIds },
    })
      .select('_id name')
      .lean();

    const locationMap = new Map(
      locations.map(loc => [
        (loc._id as unknown as { toString: () => string }).toString(),
        loc.name as string,
      ])
    );

    // Build SMIB device list - include SMIBs without locations
    const smibs = machines
      .map(machine => {
        const locationIdStr = machine.gamingLocation
          ? (
              machine.gamingLocation as unknown as { toString: () => string }
            ).toString()
          : null;

        const lastActivityValue = machine.lastActivity ?? machine.updatedAt ?? null;
        const lastActivityDate =
          lastActivityValue instanceof Date
            ? lastActivityValue
            : typeof lastActivityValue === 'string'
              ? new Date(lastActivityValue)
              : null;
        const hasValidLastActivity =
          !!lastActivityDate && !Number.isNaN(lastActivityDate.getTime());
        const isOnline =
          hasValidLastActivity &&
          differenceInMinutes(new Date(), lastActivityDate) <= 3;

        return {
          relayId: machine.relayId || machine.smibBoard || '',
          machineId: (
            machine._id as unknown as { toString: () => string }
          ).toString(),
          serialNumber: machine.serialNumber || undefined,
          game: machine.game || undefined,
          locationName: locationIdStr
            ? locationMap.get(locationIdStr) || 'Unknown Location'
            : 'No Location Assigned',
          locationId: locationIdStr || 'unassigned',
          online: isOnline,
          lastSeen:
            hasValidLastActivity && lastActivityDate
              ? lastActivityDate.toISOString()
              : null,
        };
      })
      .filter(smib => smib.relayId); // Only include machines with valid relayId

    const onlineCount = smibs.filter(smib => smib.online).length;
    console.log(
      `✅ [DISCOVER SMIBS] Found ${smibs.length} SMIB devices (${onlineCount} online)`
    );

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
