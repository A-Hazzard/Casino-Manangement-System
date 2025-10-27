import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * POST /api/smib/reset-meters
 * Reset meter data on non-SAS SMIB devices
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { relayId } = await request.json();

    if (!relayId) {
      return NextResponse.json(
        { success: false, error: 'RelayId is required' },
        { status: 400 }
      );
    }

    // Find the machine with this relayId
    const machine = await Machine.findOne({
      $or: [{ relayId }, { smibBoard: relayId }],
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found for this relayId' },
        { status: 404 }
      );
    }

    // Check if machine is non-SAS (comsMode 1 or 2)
    // Mode 0 = SAS, Mode 1 = Non-SAS, Mode 2 = IGT
    const comsMode = machine.smibConfig?.coms?.comsMode;
    if (comsMode === 0 || comsMode === undefined) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Reset meters is only available for non-SAS machines (comsMode 1 or 2)',
        },
        { status: 400 }
      );
    }

    // Send reset meters command via MQTT
    try {
      await mqttService.resetMeterData(relayId);
    } catch (mqttError) {
      console.error('❌ Failed to send reset meters command:', mqttError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send reset meters command to SMIB',
        },
        { status: 500 }
      );
    }

    // Log activity
    const currentUser = await getUserFromServer();
    const clientIP = getClientIP(request);

    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity({
          action: 'UPDATE',
          details: `Meters reset command sent to SMIB ${relayId} for machine ${machine.serialNumber || machine._id} (comsMode: ${comsMode})`,
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'machine',
            resourceId: machine._id.toString(),
            resourceName: machine.serialNumber || machine.game || machine._id,
            relayId,
            comsMode,
            resetAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reset meters command sent successfully',
      relayId,
    });
  } catch (error) {
    console.error('❌ Error in SMIB reset meters endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
