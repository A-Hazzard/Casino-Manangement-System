/**
 * SMIB Update Meters API Route
 *
 * This route handles sending the Update Meters command to a SMIB device.
 * It publishes a { typ: "exp", rly, mac, tkn, pyd: "0A" } payload via MQTT
 * to trigger the SMIB to push its current meter data.
 *
 * @module app/api/smib/update-meters/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Machine } from '@/app/api/lib/models/machines';
import { mqttService } from '@/app/api/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import {
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for sending the Update Meters command to a SMIB device
 *
 * @body {string} relayId - REQUIRED. The 12-char hex relay ID of the target SMIB
 *
 * Flow:
 * 1. Parse request body
 * 2. Validate relayId
 * 3. Find machine by relayId
 * 4. Send Update Meters command via MQTT
 * 5. Log activity
 * 6. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/smib/update-meters';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse request body
      // ============================================================================
      const { relayId } = await request.json();

      // ============================================================================
      // STEP 2: Validate relayId
      // ============================================================================
      if (!relayId) {
        logRouteError(
          functionName,
          'POST',
          '/api/smib/update-meters',
          'RelayId is required',
          user
        );
        return NextResponse.json(
          { success: false, error: 'RelayId is required' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Find machine by relayId
      // ============================================================================
      const machine = await Machine.findOne({
        $or: [{ relayId }, { smibBoard: relayId }],
      });

      if (!machine) {
        logRouteError(
          functionName,
          'POST',
          '/api/smib/update-meters',
          'Machine not found for this relayId',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Machine not found for this relayId' },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 4: Send Update Meters command via MQTT
      // ============================================================================
      try {
        await mqttService.sendUpdateMeters(relayId);
      } catch {
        logRouteError(
          functionName,
          'POST',
          '/api/smib/update-meters',
          'Failed to send Update Meters command to SMIB',
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to send Update Meters command to SMIB',
          },
          { status: 500 }
        );
      }

      // ============================================================================
      // STEP 5: Log activity
      // ============================================================================
      const currentUser = await getUserFromServer();
      const clientIP = getClientIP(request);

      if (currentUser && currentUser.emailAddress) {
        try {
          await logActivity({
            action: 'UPDATE',
            details: `Update Meters command sent to SMIB ${relayId} for machine ${machine.serialNumber || machine._id}`,
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
              sentAt: new Date().toISOString(),
            },
          });
        } catch (logError) {
          console.error('Failed to log activity:', logError);
        }
      }

      // ============================================================================
      // STEP 6: Return success response
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteCreate(
        functionName,
        'POST',
        '/api/smib/update-meters',
        1,
        user,
        duration
      );
      if (duration > 1000) {
        console.warn(`[SMIB Update Meters API] Completed in ${duration}ms`);
      }

      return NextResponse.json({
        success: true,
        message: 'Update Meters command sent successfully',
        relayId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      logRouteError(
        functionName,
        'POST',
        '/api/smib/update-meters',
        errorMessage,
        user
      );
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}
