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

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenseeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { TimePeriod } from '@/app/api/lib/types';
import {
    convertFromUSD,
    convertToUSD,
    getCountryCurrency,
    getLicenseeCurrency,
} from '@/lib/helpers/rates';
import { TransformedCabinet } from '@/lib/types/common';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper function to safely convert an ID to ObjectId if possible
 */
function safeObjectId(id: string): string | mongoose.Types.ObjectId {
  if (!id) return id;
  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }
  } catch (err) {
    console.error(`Failed to convert ID to ObjectId: ${id}`, err);
  }
  return id;
}

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

    // Handle nameOnly requests - returns just name and licensee for display purposes
    // This bypasses access control since it only returns non-sensitive display data
    if (nameOnly) {
      await connectDB();

      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const location = await GamingLocations.findOne(
        { _id: locationId },
        {
          _id: 1,
          name: 1,
          'rel.licencee': 1,
        }
      );

      if (!location) {
        return NextResponse.json(
          { success: false, message: 'Location not found' },
          { status: 404 }
        );
      }

      // Handle licensee field - it's stored as string | null in the database
      // Convert to array format for consistent API response
      const licenseeId = location.rel?.licencee;
      const licenseeIdArray = licenseeId
        ? Array.isArray(licenseeId)
          ? licenseeId
          : [licenseeId]
        : [];

      const locationData = location as { _id: unknown; name?: string };
      return NextResponse.json({
        success: true,
        location: {
          _id: locationData._id,
          name: locationData.name,
          licenseeId: licenseeIdArray,
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
      const hasAccess = await checkUserLocationAccess(locationId);
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
      const location = await GamingLocations.findOne({ _id: locationId });

      if (!location) {
        return NextResponse.json(
          { success: false, message: 'Location not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        location: location,
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
    const licencee = url.searchParams.get('licencee');
    const searchTerm = url.searchParams.get('search');
    const timePeriod = url.searchParams.get('timePeriod') as TimePeriod;
    const customStartDate = url.searchParams.get('startDate');
    const customEndDate = url.searchParams.get('endDate');
    const displayCurrency =
      (url.searchParams.get('currency') as CurrencyCode) || 'USD';

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
    const hasAccess = await checkUserLocationAccess(locationId);
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

    // Convert locationId to ObjectId for proper matching
    const locationIdObj = safeObjectId(locationId);

    // First verify the location exists
    const locationCheck = await GamingLocations.findOne({
      _id: { $in: [locationId, locationIdObj] },
    });

    if (!locationCheck) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // CRITICAL SECURITY CHECK: Verify the location belongs to the selected licensee (if provided)
    if (licencee && locationCheck.rel?.licencee !== licencee) {
      console.error(
        `Access denied: Location ${locationId} does not belong to licensee ${licencee}`
      );
      return NextResponse.json(
        { error: 'Access denied: Location not found for selected licensee' },
        { status: 403 }
      );
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

    // ============================================================================
    // STEP 8: Build aggregation pipeline (OPTIMIZED)
    // ============================================================================
    // 🚀 OPTIMIZED: Fetch machines first, then do single aggregation for all meters
    // This avoids N+1 query pattern from $lookup with nested pipeline

    // Build machine match query with online/offline filter
    const machineMatchQuery: Record<string, unknown> = {
      $and: [
        {
          $or: [
            { gamingLocation: locationId }, // String match
            { gamingLocation: locationIdObj }, // ObjectId match
          ],
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
        assetStatus: 1,
        gameType: 1,
        isCronosMachine: 1,
        sasMeters: 1,
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
            $or: [
              { machine: { $in: machineIds } }, // String match
              {
                machine: {
                  $in: filteredMachines.map(m => m._id),
                },
              }, // ObjectId match
            ],
            readAt: {
              $gte: gamingDayRange.rangeStart,
              $lte: gamingDayRange.rangeEnd,
            },
          },
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

      return {
        _id: machineId,
        locationId: locationId,
        locationName: locationName,
        assetNumber: assetNumber,
        serialNumber: assetNumber,
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
        moneyIn: Number(metrics.moneyIn) || 0,
        moneyOut: Number(metrics.moneyOut) || 0,
        gross: Number(metrics.gross) || 0,
        jackpot: Number(metrics.jackpot) || 0,
        gamesPlayed: Number(metrics.gamesPlayed) || 0,
        gamesWon: Number(metrics.gamesWon) || 0,
        cancelledCredits: Number(metrics.moneyOut) || 0,
        sasMeters: (machine.sasMeters as Record<string, unknown>) || null,
        online: Boolean(online),
      };
    });

    // Apply pagination
    const totalCount = cabinetsWithMeters.length;
    const paginatedCabinets = limit
      ? cabinetsWithMeters.slice(skip, skip + limit)
      : cabinetsWithMeters;

    // ============================================================================
    // STEP 10: Transform and return results
    // ============================================================================
    // Get location info for currency conversion
    // CRITICAL: Use findOne with _id (String IDs, not ObjectId)
    const location = await GamingLocations.findOne(
      { _id: locationId },
      { 'rel.licencee': 1, country: 1 }
    )
      .lean()
      .exec();

    // Get licensee and country info for currency conversion
    let nativeCurrency: CurrencyCode = 'USD';
    if (location) {
      const locationData = location as {
        rel?: { licencee?: string };
        country?: string;
      };
      const locationLicenseeId = locationData.rel?.licencee as
        | string
        | undefined;
      if (!locationLicenseeId) {
        // Unassigned locations - determine currency from country
        const countryId = locationData.country as string | undefined;
        if (countryId) {
          // CRITICAL: Use findOne with _id (String IDs, not ObjectId)
          const country = await Countries.findOne(
            { _id: countryId },
            { name: 1 }
          )
            .lean()
            .exec();
          const countryData = country as { name?: string } | null;
          if (countryData?.name) {
            nativeCurrency = getCountryCurrency(countryData.name);
          }
        }
      } else {
        // Get licensee's native currency
        // CRITICAL: Use findOne with _id (String IDs, not ObjectId)
        const licensee = await Licencee.findOne(
          { _id: locationLicenseeId },
          { name: 1 }
        )
          .lean()
          .exec();
        const licenseeData = licensee as { name?: string } | null;
        if (licenseeData?.name) {
          nativeCurrency = getLicenseeCurrency(licenseeData.name);
        }
      }
    }

    // Check if currency conversion should be applied
    // For location details we ALWAYS convert cabinet-level financials into the
    // currently selected display currency when a currency is provided, so that
    // the cards, table rows, and cabinet drill‑downs all match.
    const shouldConvert = Boolean(displayCurrency);

    // Transform the results to ensure proper data types
    const transformedCabinets: TransformedCabinet[] = paginatedCabinets.map(
      (cabinet: Record<string, unknown>) => {
        let moneyIn = Number(cabinet.moneyIn) || 0;
        let moneyOut = Number(cabinet.moneyOut) || 0;
        let gross = Number(cabinet.gross) || 0;
        let jackpot = Number(cabinet.jackpot) || 0;

        // Apply currency conversion if needed
        if (shouldConvert && nativeCurrency !== displayCurrency) {
          const moneyInUSD = convertToUSD(moneyIn, nativeCurrency);
          const moneyOutUSD = convertToUSD(moneyOut, nativeCurrency);
          const grossUSD = convertToUSD(gross, nativeCurrency);
          const jackpotUSD = convertToUSD(jackpot, nativeCurrency);

          moneyIn = convertFromUSD(moneyInUSD, displayCurrency);
          moneyOut = convertFromUSD(moneyOutUSD, displayCurrency);
          gross = convertFromUSD(grossUSD, displayCurrency);
          jackpot = convertFromUSD(jackpotUSD, displayCurrency);
        }

        return {
          _id: cabinet._id?.toString() || '',
          locationId: cabinet.locationId?.toString() || '',
          locationName: (cabinet.locationName as string) || '',
          assetNumber: (cabinet.assetNumber as string) || '',
          serialNumber: (cabinet.serialNumber as string) || '',
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
          isCronosMachine: cabinet.isCronosMachine || false,
          // Ensure all numeric fields are properly typed (with currency conversion applied)
          moneyIn,
          moneyOut,
          jackpot,
          gross,
          gamesPlayed: Number(cabinet.gamesPlayed) || 0,
          gamesWon: Number(cabinet.gamesWon) || 0,
          cancelledCredits: moneyOut, // Use converted moneyOut
          sasMeters: (cabinet.sasMeters as Record<string, unknown>) || null,
          online: Boolean(cabinet.online),
          // Add any missing fields that might be expected
          metersData: null, // This was in the original structure
        };
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
