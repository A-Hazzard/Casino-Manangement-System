/**
 * Location Cabinet Detail API Route
 *
 * This route handles CRUD operations for a specific cabinet/machine within a location.
 * It supports:
 * - Fetching cabinet details
 * - Updating cabinet information
 * - Partially updating cabinet (PATCH for collection settings)
 * - Deleting cabinets (soft delete)
 * - Location-based access control
 *
 * @module app/api/locations/[locationId]/cabinets/[cabinetId]/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenseeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Collections } from '@/app/api/lib/models/collections';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching a specific cabinet
 *
 * Flow:
 * 1. Parse route parameters
 * 2. Connect to database
 * 3. Check user access to location
 * 4. Verify location exists
 * 5. Fetch cabinet from database
 * 6. Return cabinet data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters
    // ============================================================================
    const { locationId, cabinetId } = await params;

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Check user access to location
    // ============================================================================

    const hasAccess = await checkUserLocationAccess(locationId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: You do not have access to this location',
        },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 4: Verify location exists
    // ============================================================================
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

    // ============================================================================
    // STEP 5: Fetch cabinet from database
    // ============================================================================
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

    // ============================================================================
    // STEP 6: Return cabinet data
    // ============================================================================
    return NextResponse.json({
      success: true,
      data: cabinet,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch cabinet';
    console.error(
      `[Location Cabinet API GET] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating a cabinet
 *
 * Flow:
 * 1. Parse route parameters and request body
 * 2. Connect to database
 * 3. Check user access to location
 * 4. Verify location exists
 * 5. Get original cabinet data
 * 6. Build update fields from request data
 * 7. Update cabinet in database
 * 8. Update related collections if serial number or game changed
 * 9. Return updated cabinet
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  const startTime = Date.now();

  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    // Check if user has access to this location
    const hasAccess = await checkUserLocationAccess(locationId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: You do not have access to this location',
        },
        { status: 403 }
      );
    }

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
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const originalCabinet = await Machine.findOne({ _id: cabinetId });
    if (!originalCabinet) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 6: Build update fields from request data
    // ============================================================================
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
    if (data.collectionMeters !== undefined) {
      const metersUpdate: Record<string, number> = {};
      if (
        data.collectionMeters.metersIn !== undefined &&
        data.collectionMeters.metersIn !== ''
      ) {
        metersUpdate.metersIn = Number(data.collectionMeters.metersIn) || 0;
      }
      if (
        data.collectionMeters.metersOut !== undefined &&
        data.collectionMeters.metersOut !== ''
      ) {
        metersUpdate.metersOut = Number(data.collectionMeters.metersOut) || 0;
      }
      if (Object.keys(metersUpdate).length > 0) {
        updateFields.collectionMeters = metersUpdate;
      }
    }
    if (data.collectionTime !== undefined && data.collectionTime !== '') {
      const collectionTime = new Date(data.collectionTime);
      updateFields.collectionTime = collectionTime;
      if (originalCabinet.collectionTime) {
        updateFields.previousCollectionTime = originalCabinet.collectionTime;
      }
    }
    if (
      data.collectorDenomination !== undefined &&
      data.collectorDenomination !== ''
    ) {
      updateFields.collectorDenomination = Number(data.collectorDenomination);
    }

    // ============================================================================
    // STEP 7: Update cabinet in database
    // ============================================================================
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    const updatedMachine = await Machine.findOneAndUpdate(
      { _id: cabinetId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 8: Update related collections if serial number or game changed
    // ============================================================================
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

      } catch (collectionsError) {
        console.error(
          'Failed to update machine name in Collections:',
          collectionsError
        );
        // Don't fail the entire operation if Collections update fails
      }
    }

    // ============================================================================
    // STEP 9: Return updated cabinet
    // ============================================================================
    return NextResponse.json({
      success: true,
      data: updatedMachine,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update cabinet';
    console.error(
      `[Location Cabinet API PUT] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for partially updating a cabinet (collection settings)
 *
 * Flow:
 * 1. Parse route parameters and request body
 * 2. Connect to database
 * 3. Check user access to location
 * 4. Verify location exists
 * 5. Get original cabinet data
 * 6. Build update fields for collection settings
 * 7. Update cabinet in database
 * 8. Return updated cabinet
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  const startTime = Date.now();

  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    const hasAccess = await checkUserLocationAccess(locationId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: You do not have access to this location',
        },
        { status: 403 }
      );
    }

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

    const data = await request.json();

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const originalCabinet = await Machine.findOne({ _id: cabinetId });
    if (!originalCabinet) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

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

    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    const updatedMachine = await Machine.findOneAndUpdate(
      { _id: cabinetId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedMachine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMachine,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to update cabinet collection settings';
    console.error(
      `[Location Cabinet API PATCH] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for soft-deleting a cabinet
 *
 * Flow:
 * 1. Parse route parameters
 * 2. Connect to database
 * 3. Check user access to location
 * 4. Verify location exists
 * 5. Get cabinet data before deletion
 * 6. Soft delete cabinet (set deletedAt)
 * 7. Return success response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; cabinetId: string }> }
) {
  const startTime = Date.now();

  try {
    const { locationId, cabinetId } = await params;

    await connectDB();

    const hasAccess = await checkUserLocationAccess(locationId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: You do not have access to this location',
        },
        { status: 403 }
      );
    }

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

    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const cabinetToDelete = await Machine.findOne({ _id: cabinetId });
    if (!cabinetToDelete) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    await Machine.findOneAndUpdate(
      { _id: cabinetId },
      {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Cabinet deleted successfully',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete cabinet';
    console.error(
      `[Location Cabinet API DELETE] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
