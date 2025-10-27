import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * POST /api/smib/ota-update
 * Trigger OTA firmware update for a single SMIB device
 * Process:
 * 1. Download firmware from GridFS to /public/firmwares/
 * 2. Configure OTA URL on SMIB with full file URL
 * 3. Send OTA update command
 * 4. Update firmwareUpdatedAt timestamp
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { relayId, firmwareId } = await request.json();

    if (!relayId || !firmwareId) {
      return NextResponse.json(
        {
          success: false,
          error: 'RelayId and firmwareId are required',
        },
        { status: 400 }
      );
    }

    console.log(`🔧 [OTA UPDATE] Initiating OTA for SMIB: ${relayId}`);
    console.log(`🔧 [OTA UPDATE] Firmware ID: ${firmwareId}`);

    // Step 1: Call serve endpoint to download firmware to /public/firmwares/
    const serveResponse = await axios.get(
      `${request.headers.get('origin') || 'http://localhost:3000'}/api/firmwares/${firmwareId}/serve`
    );

    if (!serveResponse.data.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to prepare firmware file' },
        { status: 500 }
      );
    }

    const { fileName } = serveResponse.data;

    // Step 2: Build the full firmware binary URL from request headers
    let host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';

    // If host is localhost, try to get the actual network IP
    if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
      // Try x-forwarded-host first (set by reverse proxies)
      const forwardedHost = request.headers.get('x-forwarded-host');
      if (forwardedHost && !forwardedHost.includes('localhost')) {
        host = forwardedHost;
      } else {
        // Fallback: Get local network IP from environment or config
        // This should be set in .env as NETWORK_IP for development
        const networkIp = process.env.NETWORK_IP;
        if (networkIp) {
          host = `${networkIp}:3000`;
        }
        // If no NETWORK_IP set, keep localhost but warn
        else {
          console.warn(
            '⚠️ [OTA UPDATE] Using localhost - SMIB may not be able to reach this URL!'
          );
          console.warn(
            '⚠️ [OTA UPDATE] Set NETWORK_IP in .env to your local IP (e.g., NETWORK_IP=192.168.1.100)'
          );
        }
      }
    }

    const baseUrl = `${protocol}://${host}`;
    // Send /firmwares/ URL to SMIB (Next.js static file serving)
    const firmwareBinUrl = `${baseUrl}/firmwares/`;
    console.log(`📡 [OTA UPDATE] File Name: ${fileName}`);
    console.log(`📡 [OTA UPDATE] Base URL: ${baseUrl}`);
    console.log(`📡 [OTA UPDATE] Firmware Binary URL: ${firmwareBinUrl}`);
    console.log(`📡 [OTA UPDATE] SMIB will append: ?&relayId=${relayId}`);

    try {
      // Step 3: Configure OTA URL on SMIB
      await mqttService.configureOTAUrl(relayId, firmwareBinUrl);

      // Wait for config to be applied
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Send OTA update command
      await mqttService.sendOTAUpdateCommand(relayId, firmwareBinUrl);

      console.log(`✅ [OTA UPDATE] Commands sent successfully to ${relayId}`);

      // Step 5: Update firmwareUpdatedAt timestamp
      await Machine.updateOne(
        {
          $or: [{ relayId }, { smibBoard: relayId }],
        },
        {
          $set: {
            'smibConfig.ota.firmwareUpdatedAt': new Date(),
          },
        }
      );

      console.log(`✅ [OTA UPDATE] Updated firmwareUpdatedAt timestamp`);
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

    // Log activity with proper user information and changes
    const currentUser = await getUserFromServer();
    const clientIP = getClientIP(request);

    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity({
          action: 'UPDATE',
          details: `OTA firmware update initiated for SMIB ${relayId} - File: ${fileName}`,
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          metadata: {
            resource: 'smib',
            resourceId: relayId,
            resourceName: relayId,
            relayId,
            firmwareId,
            fileName,
            firmwareBinUrl,
            initiatedAt: new Date().toISOString(),
            changes: [
              {
                field: 'firmware',
                oldValue: 'Previous firmware',
                newValue: fileName,
              },
              {
                field: 'otaURL',
                oldValue: 'Previous OTA URL',
                newValue: firmwareBinUrl,
              },
            ],
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
        // Don't fail the request if logging fails, but ensure we always log
        console.warn(
          '⚠️ Activity logging failed but continuing with OTA update'
        );
      }
    } else {
      console.error('❌ No authenticated user found for activity logging');
      // Still proceed with the OTA update but log the error
      console.warn('⚠️ Proceeding with OTA update without activity logging');
    }

    return NextResponse.json({
      success: true,
      message:
        'OTA update initiated successfully. This process may take several minutes.',
      relayId,
      firmwareId,
      fileName,
      firmwareBinUrl,
    });
  } catch (error) {
    console.error('❌ Error in SMIB OTA update endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
