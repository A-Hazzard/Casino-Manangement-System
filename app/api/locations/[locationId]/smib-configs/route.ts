import { Machine } from '@/app/api/lib/models/machines';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';

/**
 * GET /api/locations/[locationId]/smib-configs
 * Retrieve all SMIB configurations for machines at a specific location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    await connectDB();

    // Find all machines at this location with SMIB configuration
    const machines = await Machine.find({
      gamingLocation: locationId,
      deletedAt: null,
      $or: [
        { relayId: { $exists: true, $ne: '' } },
        { smibBoard: { $exists: true, $ne: '' } },
      ],
    })
      .select('_id serialNumber game relayId smibBoard smibConfig lastActivity')
      .lean();

    if (machines.length === 0) {
      return NextResponse.json({
        success: true,
        configs: [],
        count: 0,
      });
    }

    // Transform data into LocationSmibConfig format
    const configs = machines.map(machine => {
      const relayId = (machine.relayId || machine.smibBoard || '').toString();
      const isOnline = machine.lastActivity
        ? new Date().getTime() - new Date(machine.lastActivity).getTime() <
          3 * 60 * 1000
        : false;

      return {
        relayId,
        machineId: String(machine._id),
        serialNumber: machine.serialNumber,
        isOnline,
        lastActivity: machine.lastActivity || null,
        config: machine.smibConfig || {},
      };
    });

    // Sort by online status (online first) then by relayId
    configs.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return a.relayId.localeCompare(b.relayId);
    });

    return NextResponse.json({
      success: true,
      configs,
      count: configs.length,
      summary: {
        total: configs.length,
        online: configs.filter(c => c.isOnline).length,
        offline: configs.filter(c => !c.isOnline).length,
      },
    });
  } catch (error) {
    console.error('❌ Error in location SMIB configs endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
