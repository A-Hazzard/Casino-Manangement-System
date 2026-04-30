/**
 * Location SMIB Meters API Route
 *
 * This route handles requesting meter data from all SMIBs at a specific location.
 * It supports:
 * - Requesting meters from multiple SMIBs in parallel batches
 * - Finding machines by location
 * - Activity logging
 *
 * @module app/api/locations/[locationId]/smib-meters/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/app/api/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/locations/[locationId]/smib-meters
 *
 * Requests current meter readings from all SMIBs at a location via MQTT. Called
 * when a user triggers a location-wide meter poll; the SMIBs respond asynchronously
 * over MQTT and their readings are stored by the MQTT listener.
 *
 * URL params:
 * @param locationId {string} Required (path). The location whose SMIB meters to request.
 *
 * Body fields:
 * (none — machines are resolved from the locationId path parameter)
 */
export async function POST(
  request: NextRequest
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters
    // ============================================================================
    const { pathname } = request.nextUrl;
    const locationId = pathname.split('/').at(-2);

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find machines at location with SMIBs
    // ============================================================================

    const machines = await Machine.find({
      gamingLocation: locationId,
      deletedAt: null,
      $or: [
        { relayId: { $exists: true, $ne: '' } },
        { smibBoard: { $exists: true, $ne: '' } },
      ],
    }).select('_id serialNumber game relayId smibBoard');

    if (machines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No machines with SMIBs found at this location',
        },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Process meter requests in batches
    // ============================================================================
    const results = {
      total: machines.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ relayId: string; error: string }>,
    };

    // Process in batches of 10 for parallel execution
    const BATCH_SIZE = 10;
    for (let machineIndex = 0; machineIndex < machines.length; machineIndex += BATCH_SIZE) {
      const batch = machines.slice(machineIndex, machineIndex + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async machine => {
          const relayId = machine.relayId || machine.smibBoard;
          if (!relayId) return;

          try {
            await mqttService.requestMeterData(relayId);
            results.successful++;
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
    // STEP 5: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser._id && currentUser.emailAddress) {
      const clientIP = getClientIP(request);
      try {
        await logActivity({
          action: 'VIEW',
          details: `Location-wide SMIB meters request: ${results.successful} successful, ${results.failed} failed`,
          ipAddress: clientIP || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          userId: currentUser._id as string,
          username:
            (currentUser.emailAddress as string) ||
            (currentUser.username as string) ||
            'unknown',
          metadata: {
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'location',
            resourceId: locationId,
            resourceName: 'Location SMIBs',
            locationId,
            total: results.total,
            successful: results.successful,
            failed: results.failed,
            requestedAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 6: Return results
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Location SMIB Meters API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: results.failed === 0,
      message: `Meter requests sent to ${results.successful} SMIBs${results.failed > 0 ? ` (${results.failed} failed)` : ''}`,
      results,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Location SMIB Meters API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
