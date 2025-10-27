import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * POST /api/smib/restart
 * Restart a single SMIB device
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

    // Send restart command via MQTT
    try {
      await mqttService.restartSmib(relayId);
    } catch (mqttError) {
      console.error('❌ Failed to send SMIB restart command:', mqttError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send restart command to SMIB',
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
          details: `Restart command sent to SMIB ${relayId} for machine ${machine.serialNumber || machine._id}`,
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
            restartedAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Restart command sent successfully',
      relayId,
    });
  } catch (error) {
    console.error('❌ Error in SMIB restart endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
