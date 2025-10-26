import {
    calculateChanges,
    logActivity,
} from '@/app/api/lib/helpers/activityLogger';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * POST /api/mqtt/update-machine-config
 * Update machine configuration by relayId
 * Used by SMIB Management to update database after MQTT update
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { relayId, smibConfig, smibVersion } = body;

    console.log('🔧 [UPDATE MACHINE CONFIG] Request:', {
      relayId,
      hasSmibConfig: !!smibConfig,
      hasSmibVersion: !!smibVersion,
    });

    if (!relayId) {
      return NextResponse.json(
        { success: false, error: 'relayId is required' },
        { status: 400 }
      );
    }

    // Find machine by relayId
    const machine = await Machine.findOne({
      $or: [{ relayId }, { smibBoard: relayId }],
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found with this relayId' },
        { status: 404 }
      );
    }

    // Get location for logging
    const location = machine.gamingLocation
      ? await GamingLocations.findById(machine.gamingLocation)
      : null;

    // Store original data for change tracking
    const originalMachine = machine.toObject();

    // Build update object
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Update SMIB configuration if provided
    if (smibConfig !== undefined) {
      updateFields.smibConfig = {
        ...machine.smibConfig,
        ...smibConfig,
      };
    }

    // Update SMIB version if provided
    if (smibVersion !== undefined) {
      updateFields.smibVersion = {
        ...machine.smibVersion,
        ...smibVersion,
      };
    }

    // Update the machine
    const updatedMachine = await Machine.findByIdAndUpdate(
      machine._id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: 'Failed to update machine' },
        { status: 500 }
      );
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const changes = calculateChanges(originalMachine, updateFields);

        await logActivity({
          action: 'UPDATE',
          details: `Updated SMIB configuration for machine "${
            machine.serialNumber || machine.game
          }" (relayId: ${relayId})${
            location ? ` in location "${location.name}"` : ''
          }`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'machine',
            resourceId: machine._id.toString(),
            resourceName: machine.serialNumber || machine.game,
            relayId,
            changes,
            source: 'smib-management-tab',
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    console.log(
      `✅ [UPDATE MACHINE CONFIG] Successfully updated machine ${machine._id} via relayId ${relayId}`
    );

    return NextResponse.json({
      success: true,
      data: updatedMachine,
      machineId: updatedMachine._id.toString(),
    });
  } catch (error) {
    console.error('❌ [UPDATE MACHINE CONFIG] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

