import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../../lib/helpers/users';
import { connectDB } from '../../../lib/middleware/db';

/**
 * POST /api/locations/[locationId]/smib-ota
 * Trigger OTA firmware update for all SMIBs at a specific location
 * Uses relayIds from frontend (MQTT discovery), downloads firmware to /public/firmwares/
 * Processes in parallel batches of 10 for efficiency
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    const { relayIds, firmwareId } = await request.json();

    if (!relayIds || relayIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'relayIds array is required' },
        { status: 400 }
      );
    }

    if (!firmwareId) {
      return NextResponse.json(
        { success: false, error: 'firmwareId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    console.log(
      `🔧 [LOCATION OTA] Initiating OTA for ${relayIds.length} SMIBs at location ${locationId}`
    );

    // Step 1: Download firmware to /public/firmwares/
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

    // Step 2: Build full firmware URL from request headers
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
        } else {
          console.warn(
            '⚠️ [LOCATION OTA] Using localhost - SMIBs may not be able to reach this URL!'
          );
          console.warn(
            '⚠️ [LOCATION OTA] Set NETWORK_IP in .env to your local IP (e.g., NETWORK_IP=192.168.1.100)'
          );
        }
      }
    }

    const baseUrl = `${protocol}://${host}`;
    // Send /firmwares/ URL to SMIB (Next.js static file serving)
    const firmwareBinUrl = `${baseUrl}/firmwares/`;
    // const firmwareBinUrl = `${baseUrl}/firmwares/${fileName}`;

    console.log(`📡 [LOCATION OTA] Firmware Binary URL: ${firmwareBinUrl}`);
    console.log(`📡 [LOCATION OTA] Each SMIB will append: ?&relayId=<SMIB-ID>`);

    // Remove duplicates
    const uniqueRelayIds = Array.from(new Set(relayIds)) as string[];

    const results = {
      total: uniqueRelayIds.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ relayId: string; error: string }>,
    };

    // Process in batches of 10 for parallel execution
    const BATCH_SIZE = 10;
    for (let i = 0; i < uniqueRelayIds.length; i += BATCH_SIZE) {
      const batch = uniqueRelayIds.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (relayId: string) => {
          try {
            // Configure OTA URL
            await mqttService.configureOTAUrl(relayId, firmwareBinUrl);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Send OTA update command
            await mqttService.sendOTAUpdateCommand(relayId, firmwareBinUrl);

            results.successful++;

            // Update firmwareUpdatedAt for this SMIB
            await Machine.updateOne(
              { $or: [{ relayId }, { smibBoard: relayId }] },
              { $set: { 'smibConfig.ota.firmwareUpdatedAt': new Date() } }
            );
          } catch (error) {
            results.failed++;
            results.errors.push({
              relayId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );
    }

    // Log activity with proper user information and changes
    const currentUser = await getUserFromServer();
    const clientIP = getClientIP(request);

    if (currentUser && currentUser.emailAddress) {
      try {
        await logActivity({
          action: 'UPDATE',
          details: `Location-wide SMIB OTA update - File: ${fileName}: ${results.successful} successful, ${results.failed} failed`,
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username: currentUser.emailAddress as string,
          metadata: {
            resource: 'location',
            resourceId: locationId,
            resourceName: 'Location SMIBs',
            locationId,
            firmwareId,
            fileName,
            firmwareBinUrl,
            total: results.total,
            successful: results.successful,
            failed: results.failed,
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
              {
                field: 'affectedSMIBs',
                oldValue: '0',
                newValue: results.successful.toString(),
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
      success: results.failed === 0,
      message: `OTA update commands sent to ${results.successful} SMIBs${results.failed > 0 ? ` (${results.failed} failed)` : ''}`,
      results,
    });
  } catch (error) {
    console.error('❌ Error in location SMIB OTA endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
