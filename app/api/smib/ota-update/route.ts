import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * POST /api/smib/ota-update
 * Trigger OTA firmware update for a single SMIB device
 * Process:
 * 1. Configure OTA URL on the SMIB
 * 2. Send OTA update command with firmware version
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { relayId, firmwareVersion } = await request.json();

    if (!relayId || !firmwareVersion) {
      return NextResponse.json(
        {
          success: false,
          error: 'RelayId and firmwareVersion are required',
        },
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

    // Step 1: Configure OTA URL on the SMIB
    // This tells the SMIB where to download firmwares from
    const baseUrl =
      request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || '';
    const otaURL = `${baseUrl}/api/firmwares/download/`;

    console.log(`🔧 [OTA UPDATE] Configuring OTA URL: ${otaURL}`);
    console.log(`📡 [OTA UPDATE] Firmware Version: ${firmwareVersion}`);

    try {
      // First, configure the OTA URL
      await mqttService.configureOTAUrl(relayId, otaURL);

      // Wait a moment for the configuration to be applied
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then send the OTA update command with the firmware version
      await mqttService.sendOTAUpdateCommand(relayId, firmwareVersion);

      console.log(`✅ [OTA UPDATE] Commands sent successfully to ${relayId}`);
    } catch (mqttError) {
      console.error('❌ Failed to send OTA update commands:', mqttError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send OTA update commands to SMIB',
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
          details: `OTA firmware update initiated for SMIB ${relayId} for machine ${machine.serialNumber || machine._id} to version ${firmwareVersion}`,
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
            firmwareVersion,
            otaURL,
            initiatedAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OTA update initiated successfully',
      relayId,
      firmwareVersion,
      otaURL,
    });
  } catch (error) {
    console.error('❌ Error in SMIB OTA update endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
