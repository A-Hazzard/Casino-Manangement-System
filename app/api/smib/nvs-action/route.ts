import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { mqttService } from '@/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * POST /api/smib/nvs-action
 * Execute NVS clear actions on SAS SMIB devices
 * Actions: clear_nvs, clear_nvs_meters, clear_nvs_bv, clear_nvs_door
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { relayId, action } = await request.json();

    if (!relayId) {
      return NextResponse.json(
        { success: false, error: 'RelayId is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = [
      'clear_nvs',
      'clear_nvs_meters',
      'clear_nvs_bv',
      'clear_nvs_door',
    ];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Send appropriate NVS command via MQTT
    try {
      switch (action) {
        case 'clear_nvs':
          await mqttService.sendClearNvs(relayId);
          break;
        case 'clear_nvs_meters':
          await mqttService.sendClearNvsMeters(relayId);
          break;
        case 'clear_nvs_bv':
          await mqttService.sendClearNvsBv(relayId);
          break;
        case 'clear_nvs_door':
          await mqttService.sendClearNvsDoor(relayId);
          break;
        default:
          throw new Error(`Unhandled action: ${action}`);
      }
    } catch (mqttError) {
      console.error(`❌ Failed to send ${action} command:`, mqttError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to send ${action} command to SMIB`,
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
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          action: 'update',
          details: `${action} command sent to SMIB ${relayId}`,
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            resource: 'machine',
            resourceId: relayId,
            resourceName: relayId,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            relayId,
            nvsAction: action,
            executedAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${action} command sent successfully`,
      relayId,
      action,
    });
  } catch (error) {
    console.error('❌ Error in SMIB NVS action endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
