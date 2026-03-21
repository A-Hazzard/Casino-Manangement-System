/**
 * Location Detail API Route
 *
 * This route handles fetching machines for a specific location.
 * It supports:
 * - Basic location details (no query params)
 * - Machine listing with financial metrics
 * - Time period filtering
 * - Search functionality
 * - Pagination
 * - Gaming day offset calculations
 * - Location-based access control
 *
 * @module app/api/locations/[locationId]/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { TimePeriod } from '@/app/api/lib/types';
import { LocationDocument, TransformedCabinet } from '@/lib/types/common';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';



/**
 * Main GET handler for fetching location details and machines
 *
 * Flow:
 * 1. Extract locationId from URL
 * 2. Check if basic location details requested (no query params)
 * 3. Connect to database
 * 4. Check user access to location
 * 5. Parse query parameters
 * 6. Validate timePeriod parameter
 * 7. Calculate gaming day range
 * 8. Build aggregation pipeline
 * 9. Execute aggregation with pagination
 * 10. Transform and return results
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Extract locationId from URL
    // ============================================================================
    const url = request.nextUrl;
    const locationId = url.pathname.split('/')[3];

    // ============================================================================
    // STEP 2: Check if basic location details requested (no query params or basicInfo/nameOnly)
    // ============================================================================
    const hasQueryParams = url.searchParams.toString().length > 0;
    const nameOnly = url.searchParams.get('nameOnly') === 'true';
    const basicInfo = url.searchParams.get('basicInfo') === 'true';

    // Handle nameOnly requests - returns just name and licencee for display purposes
    // This bypasses access control since it only returns non-sensitive display data
    if (nameOnly) {
      await connectDB();

      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const location = (await GamingLocations.findOne(
        { _id: locationId },
        {
          _id: 1,
          name: 1,
          'rel.licencee': 1,
        }
      ).lean()) as unknown as Pick<LocationDocument, '_id' | 'name' | 'rel'> | null;

      if (!location) {
        return NextResponse.json(
          { success: false, message: 'Location not found' },
          { status: 404 }
        );
      }

      // Handle licencee field - it's stored as string | null in the database
      // Convert to array format for consistent API response
      const licenceeId = location.rel?.licencee || location.rel?.licencee;
      const licenceeIdArray = licenceeId
        ? Array.isArray(licenceeId)
          ? licenceeId
          : [licenceeId]
        : [];

      // Look up licencee's includeJackpot setting
      let includeJackpot = false;
      if (licenceeIdArray.length > 0) {
        const { Licencee } = await import('@/app/api/lib/models/licencee');
        const licenceeDoc = await Licencee.findOne(
          { _id: licenceeIdArray[0] },
          { includeJackpot: 1 }
        ).lean() as Record<string, unknown> | null;
        includeJackpot = Boolean(licenceeDoc?.includeJackpot);
      }

      const locationData = location as { _id: unknown; name?: string };
      return NextResponse.json({
        success: true,
        location: {
          _id: locationData._id,
          name: locationData.name,
          licenceeId: licenceeIdArray,
          includeJackpot,
        },
      });
    }

    // Handle basicInfo requests - returns full location details but requires access control
    // This is used when basicInfo=true is provided as a query parameter
    if (basicInfo || !hasQueryParams) {
      // Return basic location details for edit modal
      await connectDB();

      // ============================================================================
      // STEP 4: Check user access to location
      // ============================================================================
      const user = await getUserFromServer();
      const roles = (user?.roles as string[]) || [];
      const isAdmin = roles.includes('admin') || roles.includes('developer');

      let hasAccess = false;
      if (isAdmin) {
        hasAccess = true;
      } else {
        hasAccess = await checkUserLocationAccess(locationId);
      }

      if (!hasAccess) {
        return NextResponse.json(
          {
            success: false,
            message: 'Unauthorized: You do not have access to this location',
          },
          { status: 403 }
        );
      }

      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const location = (await GamingLocations.findOne({ _id: locationId }).lean()) as unknown as LocationDocument | null;

      if (!location) {
        return NextResponse.json(
          { success: false, message: 'Location not found' },
          { status: 404 }
        );
      }

      // Look up licencee's includeJackpot setting
      const locObj = location;
      const licId = locObj?.rel?.licencee;
      const firstLicId = Array.isArray(licId) ? licId[0] : licId;
      let includeJackpot = false;
      if (firstLicId) {
        const licDoc = await Licencee.findOne(
          { _id: firstLicId },
          { includeJackpot: 1 }
        ).lean() as Record<string, unknown> | null;
        includeJackpot = Boolean(licDoc?.includeJackpot);
      }

      return NextResponse.json({
        success: true,
        location: { ...locObj, includeJackpot },
      });
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 5: Parse query parameters
    // ============================================================================
    const licencee = (url.searchParams.get('licencee'));
    const searchTerm = url.searchParams.get('search');
    const timePeriod = url.searchParams.get('timePeriod') as TimePeriod;
    const customStartDate = url.searchParams.get('startDate');
    const customEndDate = url.searchParams.get('endDate');


    const onlineStatus = url.searchParams.get('onlineStatus') || 'all';

    // Pagination parameters
    // When searching, limit may be undefined to fetch all results
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : undefined;
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = limit ? (page - 1) * limit : 0;

    // ============================================================================
    // STEP 6: Validate timePeriod parameter
    // ============================================================================
    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Check user access to location
    // ============================================================================
    // Re-check user for the main body of the handler if not already done
    const user = await getUserFromServer();
    const roles = (user?.roles as string[]) || [];
    const isAdmin = roles.includes('admin') || roles.includes('developer');
    const reviewerMult =
      roles.includes('reviewer') &&
      (user as { multiplier?: number | null })?.multiplier != null
        ? (user as { multiplier?: number | null }).multiplier!
        : null;

    let hasAccess = false;
    if (isAdmin) {
      hasAccess = true;
    } else {
      hasAccess = await checkUserLocationAccess(locationId);
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this location' },
        { status: 403 }
      );
    }

    // We'll calculate the gaming day range after we get the location's gameDayOffset
    let timePeriodForGamingDay: string;
    let customStartDateForGamingDay: Date | undefined;
    let customEndDateForGamingDay: Date | undefined;

    if (timePeriod === 'Custom' && customStartDate && customEndDate) {
      timePeriodForGamingDay = 'Custom';
      // Parse dates - check if they already include time components
      // If date includes 'T', it's already a full ISO string; otherwise it's date-only
      const startDateStr = customStartDate.includes('T')
        ? customStartDate
        : customStartDate + 'T00:00:00.000Z';
      const endDateStr = customEndDate.includes('T')
        ? customEndDate
        : customEndDate + 'T00:00:00.000Z';

      customStartDateForGamingDay = new Date(startDateStr);
      customEndDateForGamingDay = new Date(endDateStr);

      // Validate dates
      if (isNaN(customStartDateForGamingDay.getTime())) {
        return NextResponse.json(
          {
            error: `Invalid date values: startDate=${customStartDate}, endDate=${customEndDate}`,
          },
          { status: 400 }
        );
      }
      if (isNaN(customEndDateForGamingDay.getTime())) {
        return NextResponse.json(
          {
            error: `Invalid date values: startDate=${customStartDate}, endDate=${customEndDate}`,
          },
          { status: 400 }
        );
      }
    } else {
      timePeriodForGamingDay = timePeriod;
    }

    // First verify the location exists
    const locationCheck = (await GamingLocations.findOne({
      _id: locationId,
    }).lean()) as unknown as LocationDocument | null;

    if (!locationCheck) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // CRITICAL SECURITY CHECK: Verify the location belongs to the selected licencee (if provided)
    // Developers and Admins bypass this check to simplify cross-licencee navigation
    const hasSpecificLicencee =
      licencee && licencee !== '' && licencee !== 'all';

    if (!isAdmin && hasSpecificLicencee) {
      const locationLicenceeId = locationCheck.rel?.licencee || locationCheck.rel?.licencee;

      if (locationLicenceeId !== licencee && (!Array.isArray(locationLicenceeId) || !locationLicenceeId.includes(licencee))) {
        console.error(
          `Access denied: Location ${locationId} does not belong to licencee ${licencee}`
        );
        return NextResponse.json(
          { error: 'Access denied: Location not found for selected licencee' },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 7: Calculate gaming day range
    // ============================================================================
    // Calculate gaming day range for this location
    // Always use gaming day offset logic (including for custom dates)
    const gameDayOffset = locationCheck.gameDayOffset ?? 8; // Default to 8 AM Trinidad time
    const gamingDayRange = getGamingDayRangeForPeriod(
      timePeriodForGamingDay,
      gameDayOffset,
      customStartDateForGamingDay,
      customEndDateForGamingDay
    );

    // Fetch licencee includeJackpot setting
    const locationLicenceeId = locationCheck.rel?.licencee;
    let includeJackpotSetting = false;
    if (locationLicenceeId) {
      const licenceeDoc = (await Licencee.findOne(
        { _id: Array.isArray(locationLicenceeId) ? locationLicenceeId[0] : locationLicenceeId },
        { includeJackpot: 1 }
      ).lean()) as Record<string, unknown> | null;
      includeJackpotSetting = !!licenceeDoc?.includeJackpot;
    }

    // ============================================================================
    // STEP 8: Build aggregation pipeline (OPTIMIZED)
    // ============================================================================
    // 🚀 OPTIMIZED: Fetch machines first, then do single aggregation for all meters
    // This avoids N+1 query pattern from $lookup with nested pipeline

    // Build machine match query with online/offline filter
    const machineMatchQuery: Record<string, unknown> = {
      $and: [
        {
          gamingLocation: locationId, // Always a string in this project
        },
        {
          // Include machines that are not deleted OR have sentinel deletedAt date
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        },
      ],
    };

    // Apply online/offline status filter at database level
    if (onlineStatus !== 'all') {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      if (onlineStatus === 'online') {
        machineMatchQuery.lastActivity = { $gte: threeMinutesAgo };
      } else if (onlineStatus === 'offline') {
        const andArray = machineMatchQuery.$and as Array<Record<string, unknown>>;
        andArray.push({
          $or: [
            { lastActivity: { $lt: threeMinutesAgo } },
            { lastActivity: { $exists: false } },
            { lastActivity: null },
          ],
        });
      } else if (onlineStatus === 'never-online') {
        const andArray = machineMatchQuery.$and as Array<Record<string, unknown>>;
        andArray.push({
          $or: [
            { lastActivity: { $exists: false } },
            { lastActivity: null },
          ],
        });
      }
    }

    // First, fetch all machines for this location
    const machines = await Machine.find(machineMatchQuery,
      {
        _id: 1,
        serialNumber: 1,
        relayId: 1,
        smibBoard: 1,
        'custom.name': 1,
        lastActivity: 1,
        game: 1,
        manufacturer: 1,
        manuf: 1,
        cabinetType: 1,
        gameType: 1,
        isCronosMachine: 1,
        sasMeters: 1,
        collectorDenomination: 1,
        'gameConfig.accountingDenomination': 1,
      }
    )
      .lean()
      .exec();

    if (machines.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: limit || 0,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    // Apply search filter if provided
    let filteredMachines = machines;
    if (searchTerm) {
      filteredMachines = machines.filter(machine => {
        const serialNumber = (machine.serialNumber as string) || '';
        const relayId = (machine.relayId as string) || '';
        const smibBoard = (machine.smibBoard as string) || '';
        const customName =
          ((machine.custom as Record<string, unknown>)?.name as string) || '';
        const machineId = String(machine._id);

        return (
          serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          relayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          smibBoard.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machineId.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Get all machine IDs for meter aggregation
    const machineIds = filteredMachines.map(m => String(m._id));

    // 🚀 OPTIMIZED: Single aggregation for ALL meters (much faster than per-machine lookups)
    // Use cursor for Meters aggregation (even though grouped, still use cursor for consistency)
    const metersAggregation: Array<{
      _id: string;
      moneyIn: number;
      moneyOut: number;
      jackpot: number;
      gamesPlayed: number;
      gamesWon: number;
      gross: number;
    }> = [];
    const metersCursor = Meters.aggregate(
      [
        {
          $match: {
            $and: [
                  { location: locationId },
                  { machine: { $in: machineIds } }, // Already strings from mapped IDs
              {
                readAt: {
                  $gte: gamingDayRange.rangeStart,
                  $lte: gamingDayRange.rangeEnd,
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: '$machine',
            moneyIn: { $sum: '$movement.drop' },
            moneyOut: { $sum: '$movement.totalCancelledCredits' },
            jackpot: { $sum: '$movement.jackpot' },
            gamesPlayed: { $sum: '$movement.gamesPlayed' },
            gamesWon: { $sum: '$movement.gamesWon' },
          },
        },
        {
          $addFields: {
            gross: { $subtract: ['$moneyIn', '$moneyOut'] },
          },
        },
      ],
      {
        allowDiskUse: true,
        maxTimeMS: 60000,
      }
    ).cursor({ batchSize: 1000 });

    for await (const doc of metersCursor) {
      metersAggregation.push(doc as (typeof metersAggregation)[0]);
    }

    // Create metrics map for fast lookup
    const metricsMap = new Map();
    metersAggregation.forEach(metrics => {
      const machineId = String(metrics._id);
      metricsMap.set(machineId, metrics);
    });

    // Get location name for response
    const locationCheckData = locationCheck as { name?: string } | null;
    const locationName = locationCheckData?.name || 'Location';

    // ============================================================================
    // STEP 9: Build cabinet results by joining machines with metrics
    // ============================================================================
    // Build cabinet objects by joining machine data with meter metrics
    const cabinetsWithMeters = filteredMachines.map(machine => {
      const machineId = String(machine._id);
      const metrics = metricsMap.get(machineId) || {
        moneyIn: 0,
        moneyOut: 0,
        gross: 0,
        jackpot: 0,
        gamesPlayed: 0,
        gamesWon: 0,
      };

      const serialNumber = (machine.serialNumber as string)?.trim() || '';
      const customName =
        ((machine.custom as Record<string, unknown>)?.name as string)?.trim() ||
        '';
      const assetNumber = serialNumber || customName || '';

      const lastActivity = machine.lastActivity as Date | null;
      const online =
        lastActivity &&
        new Date(lastActivity) > new Date(Date.now() - 3 * 60 * 1000); // 3 minutes threshold

      const moneyIn = Number(metrics.moneyIn) || 0;
      const rawMoneyOut = Number(metrics.moneyOut) || 0;
      const jackpot = Number(metrics.jackpot) || 0;

      // Apply new Money Out logic: if includeJackpot is ENABLED (Low Gross), 
      // moneyOut = Net Cancelled + Jackpot (Total payout)
      // IF includeJackpot is DISABLED (High Gross), we keep as Net Payout
      const moneyOut = rawMoneyOut + (includeJackpotSetting ? jackpot : 0);

      const gross = moneyIn - moneyOut;

      return {
        _id: machineId,
        locationId: locationId,
        locationName: locationName,
        assetNumber: assetNumber,
        serialNumber: assetNumber,
        custom: machine.custom || {},
        relayId: (machine.relayId as string) || '',
        smibBoard: (machine.smibBoard as string) || '',
        smbId:
          (machine.smibBoard as string) || (machine.relayId as string) || '',
        lastActivity: lastActivity,
        lastOnline: lastActivity,
        game: (machine.game as string) || '',
        installedGame: (machine.game as string) || '',
        manufacturer:
          (machine.manufacturer as string) ||
          (machine.manuf as string) ||
          'Unknown Manufacturer',
        cabinetType: (machine.cabinetType as string) || '',
        assetStatus: (machine.assetStatus as string) || '',
        status: (machine.assetStatus as string) || '',
        gameType: (machine.gameType as string) || '',
        isCronosMachine: Boolean(machine.isCronosMachine),
        moneyIn,
        moneyOut,
        gross,
        jackpot,
        gamesPlayed: Number(metrics.gamesPlayed) || 0,
        gamesWon: Number(metrics.gamesWon) || 0,
        cancelledCredits: moneyOut,
        sasMeters: (machine.sasMeters as Record<string, unknown>) || null,
        online: Boolean(online),
        includeJackpot: includeJackpotSetting,
      };
    });

    // Apply relevance sorting if searching
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      cabinetsWithMeters.sort((a, b) => {
        const aSerial = (a.serialNumber || '').toLowerCase();
        const bSerial = (b.serialNumber || '').toLowerCase();

        const aStarts = aSerial.startsWith(searchLower);
        const bStarts = bSerial.startsWith(searchLower);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      });
    }

    // Apply pagination
    const totalCount = cabinetsWithMeters.length;
    const paginatedCabinets = limit
      ? cabinetsWithMeters.slice(skip, skip + limit)
      : cabinetsWithMeters;

    // ============================================================================
    // STEP 10: Transform and return results
    // ============================================================================
    // Transform the results to ensure proper data types
    const transformedCabinets: TransformedCabinet[] = paginatedCabinets.map(
      (cabinet: Record<string, unknown>) => {
        const includeJackpotInMo = Boolean(cabinet.includeJackpot);
        const moneyIn = Number(cabinet.moneyIn) || 0;
        const moneyOut = Number(cabinet.moneyOut) || 0;
        const jackpot = Number(cabinet.jackpot) || 0;
        const gross = Number(cabinet.gross) || 0;

        // Base transformed object with all required properties
        const transformedCabinet = {
          _id: cabinet._id?.toString() || '',
          locationId: cabinet.locationId?.toString() || '',
          locationName: (cabinet.locationName as string) || '',
          assetNumber: (cabinet.assetNumber as string) || '',
          serialNumber: (cabinet.serialNumber as string) || '',
          custom: (cabinet.custom as Record<string, unknown>) || {},
          relayId: (cabinet.relayId as string) || '',
          smibBoard: (cabinet.smibBoard as string) || '',
          smbId: (cabinet.smbId as string) || '',
          lastActivity: (cabinet.lastActivity as Date) || null,
          lastOnline: (cabinet.lastOnline as Date) || null,
          game: (cabinet.game as string) || '',
          installedGame: (cabinet.installedGame as string) || '',
          cabinetType: (cabinet.cabinetType as string) || '',
          assetStatus: (cabinet.assetStatus as string) || '',
          status: (cabinet.status as string) || '',
          gameType: (cabinet.gameType as string) || '',
          isCronosMachine: !!cabinet.isCronosMachine,
          moneyIn,
          moneyOut,
          jackpot,
          gross,
          netGross: includeJackpotInMo ? (gross - (jackpot || 0)) : undefined,
          gamesPlayed: Number(cabinet.gamesPlayed) || 0,
          gamesWon: Number(cabinet.gamesWon) || 0,
          cancelledCredits: moneyOut,
          sasMeters: (cabinet.sasMeters as Record<string, unknown>) || null,
          online: Boolean(cabinet.online),
          includeJackpot: Boolean(cabinet.includeJackpot),
          metersData: null,
        };

        // If reviewer, apply scaling and attach raw values
        if (reviewerMult !== null) {
          const scaledMI = moneyIn * reviewerMult;
          const scaledMO = moneyOut * reviewerMult;
          const scaledJP = jackpot * reviewerMult;
          const scaledGross = scaledMI - scaledMO;

          return {
            ...transformedCabinet,
            moneyIn: scaledMI,
            moneyOut: scaledMO,
            jackpot: scaledJP,
            gross: scaledGross,
            netGross: includeJackpotInMo ? (scaledGross - scaledJP) : undefined,
            cancelledCredits: scaledMO,
            _raw: {
              moneyIn,
              moneyOut,
              jackpot,
              gross,
            },
            _reviewerMultiplier: reviewerMult,
          };
        }

        return transformedCabinet;
      }
    );


    const totalPages = limit ? Math.ceil(totalCount / limit) : 1;

    return NextResponse.json({
      success: true,
      data: transformedCabinets,
      pagination: {
        page,
        limit: limit || totalCount, // Return totalCount as limit when fetching all
        total: totalCount,
        totalPages,
        hasNextPage: limit ? page < totalPages : false,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch location cabinets data';
    console.error(
      `[Locations API GET] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
