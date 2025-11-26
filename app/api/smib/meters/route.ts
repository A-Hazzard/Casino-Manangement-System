/**
 * SMIB Meters API Route
 *
 * This route handles requesting meter data from a single SMIB device.
 * It supports:
 * - Requesting meters by relayId
 * - Finding machine by relayId
 * - Sending meter request via MQTT
 * - Activity logging
 *
 * Note: Uses POST instead of GET because:
 * - We're sending a command/action to the SMIB (triggering it to read meters)
 * - This modifies state (SMIB performs a meter read operation)
 * - Not idempotent (each request triggers a new meter read)
 * - Requires request body (relayId) which is more RESTful as POST
 * - The response comes via MQTT/SSE, not as the HTTP response
 *
 * @module app/api/smib/meters/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/app/api/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for requesting SMIB meters
 *
 * Flow:
 * 1. Parse request body
 * 2. Validate relayId
 * 3. Connect to database
 * 4. Find machine by relayId
 * 5. Check for MQTT callbacks
 * 6. Authenticate user
 * 7. Send meter request via MQTT
 * 8. Log activity
 * 9. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse request body
    // ============================================================================
    const { relayId } = await request.json();

    // ============================================================================
    // STEP 2: Validate relayId
    // ============================================================================

    if (!relayId) {
      return NextResponse.json(
        { success: false, error: 'RelayId is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Find machine by relayId
    // ============================================================================
    const machine = await Machine.findOne({
      $or: [{ relayId }, { smibBoard: relayId }],
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found for this relayId' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Check for MQTT callbacks
    // ============================================================================
    const hasCallbacks = mqttService.hasCallbacksForRelayId(relayId);

    if (!hasCallbacks) {
      console.warn(
        `No callbacks registered for relayId ${relayId} - response may be lost`
      );
    }

    // ============================================================================
    // STEP 6: Authenticate user
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (!currentUser || !currentUser._id || !currentUser.emailAddress) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to request meters' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 7: Send meter request via MQTT
    // ============================================================================
    try {
      await mqttService.requestMeterData(relayId);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send meter request to SMIB',
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 8: Log activity
    // ============================================================================
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
    }

    // ============================================================================
    // STEP 9: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[SMIB Meters API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      message: 'Meter request sent successfully',
      relayId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(`[SMIB Meters API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
