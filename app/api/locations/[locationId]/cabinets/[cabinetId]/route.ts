import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Collections } from '@/app/api/lib/models/collections';

import {
  logActivity,
  calculateChanges,
} from '@/app/api/lib/helpers/activityLogger';

import { getUserFromServer } from '../../../../lib/helpers/users';
import { getClientIP } from '@/lib/utils/ipAddress';

/**
 * GET /api/locations/[locationId]/cabinets/[cabinetId]
 * Get a specific cabinet by ID within a location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    // Verify location exists and is not deleted
    const location = await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found or has been deleted' },
        { status: 404 }
      );
    }

    // Fetch the specific cabinet
    const cabinet = await Machine.findOne({
      _id: cabinetId,
      gamingLocation: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });

    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cabinet,
    });
  } catch (error) {
    console.error('Error fetching cabinet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cabinet' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/locations/[locationId]/cabinets/[cabinetId]
 * Update a specific cabinet by ID within a location
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    // Verify location exists and is not deleted
    const location = await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found or has been deleted' },
        { status: 404 }
      );
    }

    // Parse the request data
    const data = await request.json();
    // console.log(
    //   "Received cabinet update request:",
    //   JSON.stringify(data, null, 2)
    // );
    // console.log("gameType in request:", data.gameType);

    // Get original cabinet data for change tracking
    const originalCabinet = await Machine.findById(cabinetId);
    if (!originalCabinet) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Build update object with only the fields that are provided and not empty
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only include fields that are provided and not empty
    if (data.assetNumber !== undefined && data.assetNumber !== '') {
      updateFields.serialNumber = data.assetNumber;
    }
    if (data.installedGame !== undefined && data.installedGame !== '') {
      updateFields.game = data.installedGame;
    }

    // console.log("Processing gameType field:", data.gameType);
    // console.log(
    //   "Will update gameType:",
    //   data.gameType !== undefined && data.gameType !== ""
    // );
    if (data.gameType !== undefined && data.gameType !== '') {
      updateFields.gameType = data.gameType;
      // console.log("Added gameType to updateFields:", updateFields.gameType);
    }
    if (data.manufacturer !== undefined && data.manufacturer !== '') {
      updateFields.manufacturer = data.manufacturer;
      updateFields.manuf = data.manufacturer;
    }

    if (data.smbId !== undefined && data.smbId !== '') {
      updateFields.relayId = data.smbId;
    }
    if (data.status !== undefined && data.status !== '') {
      updateFields.assetStatus = data.status;
    }
    if (data.cabinetType !== undefined && data.cabinetType !== '') {
      updateFields.cabinetType = data.cabinetType;
    }
    if (
      data.accountingDenomination !== undefined &&
      data.accountingDenomination !== ''
    ) {
      updateFields['gameConfig.accountingDenomination'] = Number(
        data.accountingDenomination
      );
    }
    if (
      data.collectionMultiplier !== undefined &&
      data.collectionMultiplier !== ''
    ) {
      updateFields.collectionMultiplier = data.collectionMultiplier;
    }
    if (data.isCronosMachine !== undefined) {
      updateFields.isCronosMachine = data.isCronosMachine;
    }
    if (data.location !== undefined && data.location !== '') {
      updateFields.gamingLocation = data.location;
    }

    // Update the machine with only the fields that were provided
    // console.log("Update fields being sent to DB:", updateFields);
    // console.log("gameType in updateFields:", updateFields.gameType);

    const updatedMachine = await Machine.findByIdAndUpdate(
      cabinetId,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // If serial number was updated, also update it in Collections
    if (
      data.assetNumber !== undefined &&
      data.assetNumber !== '' &&
      data.assetNumber !== originalCabinet.serialNumber
    ) {
      try {
        await Collections.updateMany(
          { machineId: cabinetId },
          { $set: { serialNumber: data.assetNumber } }
        );

        console.warn(
          `Updated serial number in Collections for machine ${cabinetId} from "${originalCabinet.serialNumber}" to "${data.assetNumber}"`
        );
      } catch (collectionsError) {
        console.error(
          'Failed to update serial number in Collections:',
          collectionsError
        );
        // Don't fail the entire operation if Collections update fails
      }
    }

    // If game name was updated, also update it in Collections
    if (
      data.installedGame !== undefined &&
      data.installedGame !== '' &&
      data.installedGame !== originalCabinet.game
    ) {
      try {
        await Collections.updateMany(
          { machineId: cabinetId },
          { $set: { machineName: data.installedGame } }
        );

        console.warn(
          `Updated machine name in Collections for machine ${cabinetId} from "${originalCabinet.game}" to "${data.installedGame}"`
        );
      } catch (collectionsError) {
        console.error(
          'Failed to update machine name in Collections:',
          collectionsError
        );
        // Don't fail the entire operation if Collections update fails
      }
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const changes = calculateChanges(
          originalCabinet.toObject(),
          updateFields
        );

        await logActivity({
          action: 'UPDATE',
          details: `Updated cabinet "${
            originalCabinet.serialNumber || originalCabinet.game
          }" in location "${location.name}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'machine',
            resourceId: cabinetId,
            resourceName: originalCabinet.serialNumber || originalCabinet.game,
            changes: changes,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    // console.log("Sending response to frontend:", {
    //   success: true,
    //   data: updatedMachine,
    // });
    // console.log("Response gameType:", updatedMachine?.gameType);

    return NextResponse.json({
      success: true,
      data: updatedMachine,
    });
  } catch (error) {
    console.error('Error updating cabinet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cabinet' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/locations/[locationId]/cabinets/[cabinetId]
 * Partially update a specific cabinet by ID within a location (for collection settings)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    // Verify location exists and is not deleted
    const location = await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found or has been deleted' },
        { status: 404 }
      );
    }

    // Parse the request data
    const data = await request.json();
    // console.log(
    //   "Received cabinet update request:",
    //   JSON.stringify(data, null, 2)
    // );
    // console.log("gameType in request:", data.gameType);

    // Get original cabinet data for change tracking
    const originalCabinet = await Machine.findById(cabinetId);
    if (!originalCabinet) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Build update object for collection settings
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Handle collection settings fields
    if (data.collectionMeters !== undefined) {
      updateFields.collectionMeters = data.collectionMeters;
    }
    if (data.collectionTime !== undefined) {
      updateFields.collectionTime = data.collectionTime;
    }
    if (data.collectorDenomination !== undefined) {
      updateFields.collectorDenomination = data.collectorDenomination;
    }

    // Handle SMIB configuration updates
    if (data.smibConfig !== undefined) {
      updateFields.smibConfig = data.smibConfig;
    }
    if (data.smibVersion !== undefined) {
      updateFields.smibVersion = data.smibVersion;
    }

    // Update the machine with only the fields that were provided
    const updatedMachine = await Machine.findByIdAndUpdate(
      cabinetId,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const changes = calculateChanges(
          originalCabinet.toObject(),
          updateFields
        );

        await logActivity({
          action: 'UPDATE',
          details: `Updated collection settings for cabinet "${
            originalCabinet.serialNumber || originalCabinet.game
          }" in location "${location.name}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'machine',
            resourceId: cabinetId,
            resourceName: originalCabinet.serialNumber || originalCabinet.game,
            changes: changes,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedMachine,
    });
  } catch (error) {
    console.error('Error updating cabinet collection settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cabinet collection settings' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[locationId]/cabinets/[cabinetId]
 * Delete a specific cabinet by ID within a location
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    // Verify location exists and is not deleted
    const location = await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found or has been deleted' },
        { status: 404 }
      );
    }

    // Get cabinet data before deletion for logging
    const cabinetToDelete = await Machine.findById(cabinetId);
    if (!cabinetToDelete) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Soft delete the machine by setting deletedAt
    await Machine.findByIdAndUpdate(
      cabinetId,
      {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser && currentUser.emailAddress) {
      try {
        const deleteChanges = [
          {
            field: 'serialNumber',
            oldValue: cabinetToDelete.serialNumber,
            newValue: null,
          },
          { field: 'game', oldValue: cabinetToDelete.game, newValue: null },
          {
            field: 'cabinetType',
            oldValue: cabinetToDelete.cabinetType,
            newValue: null,
          },
          {
            field: 'assetStatus',
            oldValue: cabinetToDelete.assetStatus,
            newValue: null,
          },
          {
            field: 'gamingLocation',
            oldValue: cabinetToDelete.gamingLocation,
            newValue: null,
          },
        ];

        await logActivity({
          action: 'DELETE',
          details: `Deleted cabinet "${
            cabinetToDelete.serialNumber || cabinetToDelete.game
          }" from location "${location.name}"`,
          ipAddress: getClientIP(request) || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          metadata: {
            userId: currentUser._id as string,
            userEmail: currentUser.emailAddress as string,
            userRole: (currentUser.roles as string[])?.[0] || 'user',
            resource: 'machine',
            resourceId: cabinetId,
            resourceName: cabinetToDelete.serialNumber || cabinetToDelete.game,
            changes: deleteChanges,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cabinet deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting cabinet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete cabinet' },
      { status: 500 }
    );
  }
}
