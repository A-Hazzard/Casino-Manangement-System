/**
 * SMIB NVS Action API Route
 *
 * This route handles executing NVS clear actions on SAS SMIB devices.
 * It supports:
 * - clear_nvs: Clear all NVS
 * - clear_nvs_meters: Clear NVS meters
 * - clear_nvs_bv: Clear NVS bill validator
 * - clear_nvs_door: Clear NVS door
 * - Sending commands via MQTT
 * - Activity logging
 *
 * @module app/api/smib/nvs-action/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { mqttService } from '@/app/api/lib/services/mqttService';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for executing NVS actions
 *
 * Flow:
 * 1. Parse request body
 * 2. Validate relayId and action
 * 3. Connect to database
 * 4. Send appropriate NVS command via MQTT
 * 5. Log activity
 * 6. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse request body
    // ============================================================================
    const { relayId, action } = await request.json();

    // ============================================================================
    // STEP 2: Validate relayId and action
    // ============================================================================

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

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Send appropriate NVS command via MQTT
    // ============================================================================
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
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to send ${action} command to SMIB`,
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

    // ============================================================================
    // STEP 6: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[SMIB NVS Action API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      message: `${action} command sent successfully`,
      relayId,
      action,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[SMIB NVS Action API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

