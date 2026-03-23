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

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Collections } from '@/app/api/lib/models/collections';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { LocationDocument, MachineDocument } from '@/lib/types/common';
import type { TimePeriod } from '@/shared/types/common';
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
  request: NextRequest
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and query params
    // ============================================================================
    const { pathname } = request.nextUrl;
    const parts = pathname.split('/');
    const cabinetId = parts[parts.length - 1];
    const locationId = parts[parts.length - 3];
    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get('timePeriod');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

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
    // STEP 4: Verify location exists and get settings
    // ============================================================================
    const location = (await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    }).lean()) as unknown as LocationDocument | null;

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found or has been deleted' },
        { status: 404 }
      );
    }
    const gameDayOffset = location.gameDayOffset ?? 8;

    // Fetch licencee's includeJackpot setting
    let includeJackpot = false;
    const licId = location.rel?.licencee;
    const firstLicId = Array.isArray(licId) ? licId[0] : licId;
    if (firstLicId) {
      const licDoc = await Licencee.findOne(
        { _id: firstLicId },
        { includeJackpot: 1 }
      ).lean() as { includeJackpot?: boolean } | null;
      includeJackpot = Boolean(licDoc?.includeJackpot);
    }

    // ============================================================================
    // STEP 5: Fetch cabinet from database
    // ============================================================================
    const cabinet = (await Machine.findOne({
      _id: cabinetId,
      gamingLocation: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    }).lean()) as MachineDocument | null;

    if (!cabinet) {
      return NextResponse.json(
        { success: false, error: 'Cabinet not found in this location' },
        { status: 404 }
      );
    }

    // Attach includeJackpot to the cabinet document for consistent data across routes
    (cabinet as Record<string, unknown>).includeJackpot = includeJackpot;

    // ============================================================================
    // STEP 6: Aggregate and calculate financial metrics if a time period is provided
    // ============================================================================
    if (timePeriod) {
      try {
        let startDate: Date;
        let endDate: Date;

        if (timePeriod === 'Custom' && startDateParam && endDateParam) {
          // Parse dates from parameters
          // If they don't contain 'T', they are date-only strings from the picker
          const customStart = new Date(startDateParam.includes('T') ? startDateParam : startDateParam + 'T00:00:00.000Z');
          const customEnd = new Date(endDateParam.includes('T') ? endDateParam : endDateParam + 'T00:00:00.000Z');

          if (!isNaN(customStart.getTime()) && !isNaN(customEnd.getTime())) {
            // Use getGamingDayRangeForPeriod for consistent range calculation
            const range = getGamingDayRangeForPeriod(
              'Custom',
              gameDayOffset,
              customStart,
              customEnd
            );
            startDate = range.rangeStart;
            endDate = range.rangeEnd;
          } else {
            throw new Error('Invalid custom date parameters');
          }
        } else {
          const range = getGamingDayRangeForPeriod(timePeriod as TimePeriod, gameDayOffset);
          startDate = range.rangeStart;
          endDate = range.rangeEnd;
        }

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const metricsResult = await Meters.aggregate([
            {
              $match: {
                $and: [
                  { location: locationId },
                  { machine: cabinetId },
                ],
                readAt: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: null,
                drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
                totalCancelledCredits: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
                jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
              },
            },
          ]).exec();

          if (metricsResult.length > 0) {
            const raw = metricsResult[0] as {
              drop: number;
              totalCancelledCredits: number;
              jackpot: number;
            };
            const moneyIn = raw.drop;
            const rawCancelled = raw.totalCancelledCredits;
            const jackpot = raw.jackpot;

            // Apply includeJackpot logic: if true, Money Out = Cancelled + Jackpot
            const moneyOut = rawCancelled + (includeJackpot ? jackpot : 0);
            const gross = moneyIn - moneyOut;
            const netGross = gross - jackpot;

            // Overlay computed metrics onto the cabinet document
            (cabinet as Record<string, unknown>).moneyIn = moneyIn;
            (cabinet as Record<string, unknown>).moneyOut = moneyOut;
            (cabinet as Record<string, unknown>).gross = gross;
            (cabinet as Record<string, unknown>).jackpot = jackpot;
            (cabinet as Record<string, unknown>).netGross = netGross;
          } else {
            // No meter readings in the range → zero out the metrics
            (cabinet as Record<string, unknown>).moneyIn = 0;
            (cabinet as Record<string, unknown>).moneyOut = 0;
            (cabinet as Record<string, unknown>).gross = 0;
            (cabinet as Record<string, unknown>).jackpot = 0;
            (cabinet as Record<string, unknown>).netGross = 0;
          }
        }
      } catch (metricsError) {
        // Non-fatal: log but still return the cabinet with raw all-time values
        console.error(
          '[Location Cabinet API GET] Failed to aggregate date-filtered metrics:',
          metricsError
        );
      }
    }

    // ============================================================================
    // STEP 7: Apply reviewer multiplier if applicable, then return cabinet data
    // ============================================================================
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const reviewerMult =
      currentUserRoles.includes('reviewer') &&
      (currentUser as { multiplier?: number | null })?.multiplier != null
        ? (currentUser as { multiplier?: number | null }).multiplier!
        : null;

    if (reviewerMult !== null) {
      const cab = cabinet as Record<string, unknown>;
      const mi = ((cab.moneyIn as number) || 0) * reviewerMult;
      const mo = ((cab.moneyOut as number) || 0) * reviewerMult;
      const jp = ((cab.jackpot as number) || 0) * reviewerMult;
      cab.moneyIn = mi;
      cab.moneyOut = mo;
      cab.jackpot = jp;
      cab.gross = mi - mo;
      cab.netGross = mi - mo - jp;
    }

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
  request: NextRequest
) {
  const startTime = Date.now();

  try {
    const { pathname } = request.nextUrl;
    const parts = pathname.split('/');
    const cabinetId = parts[parts.length - 1];
    const locationId = parts[parts.length - 3];

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

    // Check if user has permission to edit machines (admin, technician, developer)
    const { getUserFromServer } = await import('@/app/api/lib/helpers/users');
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: User not authenticated',
        },
        { status: 401 }
      );
    }

    const userRoles = (user.roles as string[])?.map(r => r.toLowerCase()) || [];
    const canEditMachines =
      userRoles.includes('admin') ||
      userRoles.includes('technician') ||
      userRoles.includes('developer');

    if (!canEditMachines) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Forbidden: Only admins, technicians, and developers can edit machines',
        },
        { status: 403 }
      );
    }

    // Verify location exists and is not deleted
    const location = (await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    }).lean()) as unknown as LocationDocument | null;
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

    // Handle SMIB board fields consistently
    const smibValue = data.smbId || data.smibBoard || data.relayId;
    if (smibValue !== undefined) {
      updateFields.relayId = smibValue;
      updateFields.smibBoard = smibValue;
      updateFields.smbId = smibValue;
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
    if (data.custom !== undefined) {
      if (data.custom && typeof data.custom === 'object' && data.custom.name !== undefined) {
        updateFields['custom.name'] = data.custom.name;
      }
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
  request: NextRequest
) {
  const startTime = Date.now();

  try {
    const { pathname } = request.nextUrl;
    const parts = pathname.split('/');
    const cabinetId = parts[parts.length - 1];
    const locationId = parts[parts.length - 3];

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

    const location = (await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    }).lean()) as unknown as LocationDocument | null;
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
    if (data.custom !== undefined) {
      if (data.custom && typeof data.custom === 'object' && data.custom.name !== undefined) {
        updateFields['custom.name'] = data.custom.name;
      }
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
  request: NextRequest
) {
  const startTime = Date.now();

  try {
    const { pathname } = request.nextUrl;
    const parts = pathname.split('/');
    const cabinetId = parts[parts.length - 1];
    const locationId = parts[parts.length - 3];

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

    // Check if user has permission to delete machines (admin, technician, developer)
    const { getUserFromServer } = await import('@/app/api/lib/helpers/users');
    const user = await getUserFromServer();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: User not authenticated',
        },
        { status: 401 }
      );
    }

    const userRoles = (user.roles as string[])?.map(r => r.toLowerCase()) || [];
    const canDeleteMachines =
      userRoles.includes('admin') ||
      userRoles.includes('technician') ||
      userRoles.includes('developer');

    if (!canDeleteMachines) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Forbidden: Only admins, technicians, and developers can delete machines',
        },
        { status: 403 }
      );
    }

    const location = (await GamingLocations.findOne({
      _id: locationId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    }).lean()) as unknown as LocationDocument | null;
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
