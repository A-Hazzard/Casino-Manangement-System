/**
 * SMIB Restart API Route
 *
 * This route handles restarting a single SMIB device.
 * It supports:
 * - Restarting SMIB by relayId
 * - Finding machine by relayId
 * - Sending restart command via MQTT
 * - Activity logging
 *
 * @module app/api/smib/restart/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/app/api/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for restarting a SMIB device
 *
 * Flow:
 * 1. Parse request body
 * 2. Validate relayId
 * 3. Connect to database
 * 4. Find machine by relayId
 * 5. Send restart command via MQTT
 * 6. Log activity
 * 7. Return success response
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

    if (!relayId) {
      return NextResponse.json(
        { success: false, error: 'RelayId is required' },
        { status: 400 }
      );
    }

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
    // STEP 5: Send restart command via MQTT
    // ============================================================================
    try {
      await mqttService.restartSmib(relayId);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send restart command to SMIB',
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 6: Log activity
    // ============================================================================
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

    // ============================================================================
    // STEP 7: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[SMIB Restart API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      message: 'Restart command sent successfully',
      relayId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[SMIB Restart API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

