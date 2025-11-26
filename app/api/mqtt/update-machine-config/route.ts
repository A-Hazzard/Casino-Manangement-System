/**
 * Update Machine Config API Route
 *
 * This route handles updating machine SMIB configuration by relayId.
 * It supports:
 * - Finding machine by relayId
 * - Updating SMIB configuration and version
 * - Activity logging
 *
 * @module app/api/mqtt/update-machine-config/route
 */

import {
  calculateChanges,
  logActivity,
} from '@/app/api/lib/helpers/activityLogger';
import {
  buildMachineConfigUpdateFields,
  findMachineByRelayId,
  getLocationName,
  updateMachineConfiguration,
} from '@/app/api/lib/helpers/machineConfig';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for updating machine configuration
 *
 * Flow:
 * 1. Parse and validate request body
 * 2. Connect to database
 * 3. Find machine by relayId
 * 4. Get location for logging
 * 5. Build update fields
 * 6. Update machine configuration
 * 7. Log activity
 * 8. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request body
    // ============================================================================
    const body = await request.json();
    const { relayId, smibConfig, smibVersion } = body as {
      relayId?: string;
      smibConfig?: Record<string, unknown>;
      smibVersion?: Record<string, unknown>;
    };

    if (!relayId) {
      return NextResponse.json(
        { success: false, error: 'relayId is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Find machine by relayId
    // ============================================================================
    const machine = await findMachineByRelayId(relayId);
    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found with this relayId' },
        { status: 404 }
      );
    }

    // Type assertion for machine document
    const machineDoc = machine as Awaited<ReturnType<typeof findMachineByRelayId>> & {
      gamingLocation?: unknown;
      _id: { toString: () => string };
      serialNumber?: string;
      game?: string;
      smibConfig?: Record<string, unknown>;
      smibVersion?: Record<string, unknown>;
      toObject?: () => Record<string, unknown>;
    };

    // ============================================================================
    // STEP 4: Get location for logging
    // ============================================================================
    const locationName = await getLocationName(machineDoc.gamingLocation);

    // ============================================================================
    // STEP 5: Build update fields
    // ============================================================================
    const originalMachine = machineDoc.toObject 
      ? machineDoc.toObject() 
      : JSON.parse(JSON.stringify(machineDoc));
    const updateFields = buildMachineConfigUpdateFields(
      machineDoc,
      smibConfig,
      smibVersion
    );

    // ============================================================================
    // STEP 6: Update machine configuration
    // ============================================================================
    const updatedMachine = await updateMachineConfiguration(
      machineDoc._id.toString(),
      updateFields
    );

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: 'Failed to update machine' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 7: Log activity
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const changes = calculateChanges(originalMachine, updateFields);

        await logActivity({
          action: 'UPDATE',
          details: `Updated SMIB configuration for machine "${
            machineDoc.serialNumber || machineDoc.game || 'Unknown'
          }" (relayId: ${relayId})${
            locationName ? ` in location "${locationName}"` : ''
          }`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'machine',
            resourceId: machineDoc._id.toString(),
            resourceName: machineDoc.serialNumber || machineDoc.game || 'Unknown',
            relayId,
            changes,
            source: 'smib-management-tab',
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // ============================================================================
    // STEP 8: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[MQTT Update Machine Config API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      data: updatedMachine,
      machineId: updatedMachine 
        ? (updatedMachine as { _id: { toString: () => string } })._id.toString() 
        : machineDoc._id.toString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Update Machine Config API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

