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
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { getClientIP } from '@/lib/utils/ipAddress';
import {
  logRouteError,
  logRouteUpdate,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for updating machine configuration
 *
 * @body {string} relayId - REQUIRED. The unique relay ID of the machine.
 * @body {Object} smibConfig - REQUIRED. The new SMIB configuration object.
 * @body {string} smibVersion - Optional. The new SMIB firmware version.
 *
 * Flow:
 * 1. Parse and validate request body
 * 2. Find machine by relayId
 * 3. Get location for logging
 * 4. Build update fields
 * 5. Update machine configuration
 * 6. Log activity
 * 7. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/mqtt/update-machine-config';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
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
      // STEP 2: Find machine by relayId
      // ============================================================================
      const machine = await findMachineByRelayId(relayId);
      if (!machine) {
        return NextResponse.json(
          { success: false, error: 'Machine not found with this relayId' },
          { status: 404 }
        );
      }

      // Type assertion for machine document
      const machineDoc = machine as Awaited<
        ReturnType<typeof findMachineByRelayId>
      > & {
        gamingLocation?: unknown;
        _id: { toString: () => string };
        serialNumber?: string;
        game?: string;
        smibConfig?: Record<string, unknown>;
        smibVersion?: Record<string, unknown>;
        toObject?: () => Record<string, unknown>;
      };

      // ============================================================================
      // STEP 3: Get location for logging
      // ============================================================================
      const locationName = await getLocationName(machineDoc.gamingLocation);

      // ============================================================================
      // STEP 4: Build update fields
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
      // STEP 5: Update machine configuration
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
      // STEP 6: Log activity
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
              resourceName:
                machineDoc.serialNumber || machineDoc.game || 'Unknown',
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
      // STEP 7: Return success response
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'POST',
        '/api/mqtt/update-machine-config',
        1,
        user,
        duration
      );
      if (duration > 1000) {
        console.warn(`[Update Machine Config API] Completed in ${duration}ms`);
      }

      return NextResponse.json({
        success: true,
        data: updatedMachine,
        machineId: updatedMachine
          ? (updatedMachine as { _id: { toString: () => string } })._id.toString()
          : machineDoc._id.toString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logRouteError(
        functionName,
        'POST',
        '/api/mqtt/update-machine-config',
        errorMessage,
        user
      );
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  });
}
