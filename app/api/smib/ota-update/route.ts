/**
 * SMIB OTA Update API Route
 *
 * This route handles triggering OTA firmware updates for a single SMIB device.
 * It supports:
 * - Preparing firmware file from GridFS
 * - Building firmware URL from request headers
 * - Configuring OTA URL on SMIB
 * - Sending OTA update command via MQTT
 * - Updating firmwareUpdatedAt timestamp
 * - Activity logging
 *
 * @module app/api/smib/ota-update/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/app/api/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for triggering OTA update
 *
 * Flow:
 * 1. Parse request body
 * 2. Validate relayId and firmwareId
 * 3. Connect to database
 * 4. Prepare firmware file and get URL
 * 5. Build firmware URL from request headers
 * 6. Configure OTA URL on SMIB
 * 7. Send OTA update command
 * 8. Update firmwareUpdatedAt timestamp
 * 9. Log activity
 * 10. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse request body
    // ============================================================================
    const { relayId, firmwareId } = await request.json();

    // ============================================================================
    // STEP 2: Validate relayId and firmwareId
    // ============================================================================

    if (!relayId || !firmwareId) {
      return NextResponse.json(
        {
          success: false,
          error: 'RelayId and firmwareId are required',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Prepare firmware file and get URL
    // ============================================================================
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

    // ============================================================================
    // STEP 5: Build firmware URL from request headers
    // ============================================================================
    let host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';

    // If host is localhost, try to get the actual network IP
    if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      if (forwardedHost && !forwardedHost.includes('localhost')) {
        host = forwardedHost;
      } else {
        const networkIp = process.env.NETWORK_IP;
        if (networkIp) {
          host = `${networkIp}:3000`;
        }
      }
    }

    const baseUrl = `${protocol}://${host}`;
    const firmwareBinUrl = `${baseUrl}/firmwares/`;

    // ============================================================================
    // STEP 6: Configure OTA URL on SMIB
    // ============================================================================
    try {
      await mqttService.configureOTAUrl(relayId, firmwareBinUrl);

      // Wait for config to be applied
      await new Promise(resolve => setTimeout(resolve, 1000));

      // ============================================================================
      // STEP 7: Send OTA update command
      // ============================================================================
      await mqttService.sendOTAUpdateCommand(relayId, firmwareBinUrl);

      // ============================================================================
      // STEP 8: Update firmwareUpdatedAt timestamp
      // ============================================================================
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
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send OTA update commands to SMIB',
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 9: Log activity
    // ============================================================================
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
      }
    }

    // ============================================================================
    // STEP 10: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[SMIB OTA Update API] Completed in ${duration}ms`);
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
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[SMIB OTA Update API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
