import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * POST /api/smib/meters
 * Request meter data from a single SMIB device
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

    // Enforce user presence for logging and operation
    const currentUser = await getUserFromServer();
    if (!currentUser || !currentUser._id || !currentUser.emailAddress) {
      console.error('❌ Activity logging failed: Missing user information');
      return NextResponse.json(
        { success: false, error: 'Authentication required to request meters' },
        { status: 401 }
      );
    }

    // Send get meters command via MQTT
    try {
      await mqttService.requestMeterData(relayId);
    } catch (mqttError) {
      console.error('❌ Failed to request meter data:', mqttError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send meter request to SMIB',
        },
        { status: 500 }
      );
    }

    // Log activity (optional - don't fail the request if logging fails)
    const clientIP = getClientIP(request);
    try {
      await logActivity({
        action: 'VIEW',
        details: `Meter data requested from SMIB ${relayId} for machine ${machine.serialNumber || machine._id}`,
        ipAddress: clientIP || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        userId: currentUser._id as string,
        username: currentUser.username as string,
        metadata: {
          userRole: (currentUser.roles as string[])?.[0] || 'user',
          resource: 'machine',
          resourceId: machine._id.toString(),
          resourceName: machine.serialNumber || machine.game || machine._id,
          relayId,
          requestedAt: new Date().toISOString(),
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Don't fail the request if logging fails - just continue
    }

    return NextResponse.json({
      success: true,
      message: 'Meter request sent successfully',
      relayId,
    });
  } catch (error) {
    console.error('❌ Error in SMIB meters endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
