/**
 * Location SMIB OTA Update API Route
 *
 * This route handles triggering OTA firmware updates for all SMIBs at a specific location.
 * It supports:
 * - OTA firmware updates for multiple SMIBs
 * - Firmware file preparation and URL generation
 * - Parallel batch processing
 * - Activity logging
 *
 * @module app/api/locations/[locationId]/smib-ota/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { mqttService } from '@/app/api/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for triggering OTA updates
 *
 * Flow:
 * 1. Parse route parameters and request body
 * 2. Validate relayIds and firmwareId
 * 3. Connect to database
 * 4. Prepare firmware file and get URL
 * 5. Build firmware URL from request headers
 * 6. Process OTA updates in batches
 * 7. Update machine firmwareUpdatedAt timestamps
 * 8. Log activity
 * 9. Return results
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and request body
    // ============================================================================
    const { locationId } = await params;
    const { relayIds, firmwareId } = await request.json();

    // ============================================================================
    // STEP 2: Validate relayIds and firmwareId
    // ============================================================================

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
    // STEP 6: Process OTA updates in batches
    // ============================================================================
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

            // ============================================================================
            // STEP 7: Update machine firmwareUpdatedAt timestamps
            // ============================================================================
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

    // ============================================================================
    // STEP 8: Log activity
    // ============================================================================
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
      }
    }

    // ============================================================================
    // STEP 9: Return results
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Location SMIB OTA API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: results.failed === 0,
      message: `OTA update commands sent to ${results.successful} SMIBs${results.failed > 0 ? ` (${results.failed} failed)` : ''}`,
      results,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Location SMIB OTA API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
