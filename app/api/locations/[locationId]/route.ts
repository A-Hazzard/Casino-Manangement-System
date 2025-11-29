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
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { TimePeriod } from '@/app/api/lib/types';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenseeCurrency,
} from '@/lib/helpers/rates';
import { TransformedCabinet } from '@/lib/types/mongo';
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
    // STEP 2: Check if basic location details requested (no query params)
    // ============================================================================
    const hasQueryParams = url.searchParams.toString().length > 0;
    const nameOnly = url.searchParams.get('nameOnly') === 'true';

    // Handle nameOnly requests - returns just name and licensee for display purposes
    // This bypasses access control since it only returns non-sensitive display data
    if (nameOnly) {
      await connectDB();

      // CRITICAL: Use findOne with _id instead of findById (repo rule)
      const location = await GamingLocations.findOne({ _id: locationId }, {
        _id: 1,
        name: 1,
        'rel.licencee': 1,
      });

      if (!location) {
        return NextResponse.json(
          { success: false, message: 'Location not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        location: {
          _id: location._id,
          name: location.name,
          licenseeId: location.rel?.licencee,
        },
      });
    }

    if (!hasQueryParams) {
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
      // Parse dates - gaming day offset will be applied by getGamingDayRangeForPeriod
      customStartDateForGamingDay = new Date(
        customStartDate + 'T00:00:00.000Z'
      );
      customEndDateForGamingDay = new Date(customEndDate + 'T00:00:00.000Z');
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
    // STEP 8: Build aggregation pipeline
    // ============================================================================
    // Build aggregation pipeline based on your MongoDB compass query
    const aggregationPipeline: Record<string, unknown>[] = [
      // Match the specific location (similar to your $match: { name: "Big Shot" })
      {
        $match: { _id: { $in: [locationId, locationIdObj] } },
      },
      // Lookup machines for this location (include deleted machines with sentinel date)
      // CRITICAL: gamingLocation is stored as String, not ObjectId
      {
        $lookup: {
          from: 'machines',
          let: {
            locationIdStr: { $toString: '$_id' },
            locationIdObj: '$_id',
          },
          pipeline: [
            {
              $match: {
                $and: [
                  {
                    $expr: {
                      $or: [
                        {
                          $eq: [
                            { $toString: '$gamingLocation' },
                            '$$locationIdStr',
                          ],
                        }, // String match
                        { $eq: ['$gamingLocation', '$$locationIdObj'] }, // ObjectId match (if stored as ObjectId)
                      ],
                    },
                  },
                  {
                    // Include machines that are not deleted OR have sentinel deletedAt date
                    $or: [
                      { deletedAt: null },
                      { deletedAt: { $lt: new Date('2020-01-01') } },
                    ],
                  },
                ],
              },
            },
          ],
          as: 'machines',
        },
      },
      // Unwind machines to get individual machine documents
      {
        $unwind: {
          path: '$machines',
          preserveNullAndEmptyArrays: false, // Only return locations that have machines
        },
      },
    ];

    // Add search filter if provided (search by serial number, relay ID, smib board, custom.name, or machine _id)
    if (searchTerm) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { 'machines.serialNumber': { $regex: searchTerm, $options: 'i' } },
            { 'machines.relayId': { $regex: searchTerm, $options: 'i' } },
            { 'machines.smibBoard': { $regex: searchTerm, $options: 'i' } },
            { 'machines.custom.name': { $regex: searchTerm, $options: 'i' } },
            // Search by _id (case-insensitive partial match)
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$machines._id' },
                  regex: searchTerm,
                  options: 'i',
                },
              },
            },
          ],
        },
      });
    }

    // Add meter data lookup using gaming day range
    // IMPORTANT: Meters are CUMULATIVE, so we calculate last - first, NOT sum
    aggregationPipeline.push({
      $lookup: {
        from: 'meters',
        let: {
          machineIdStr: { $toString: '$machines._id' },
          machineIdObj: '$machines._id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: [{ $toString: '$machine' }, '$$machineIdStr'] }, // String match
                  { $eq: ['$machine', '$$machineIdObj'] }, // ObjectId match (if stored as ObjectId)
                ],
              },
              // Use the calculated gaming day range for this location
              readAt: {
                $gte: gamingDayRange.rangeStart,
                $lte: gamingDayRange.rangeEnd,
              },
            },
          },
          {
            $group: {
              _id: null,
              // Use sum of deltas to match locations list API and MongoDB Compass results
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
        as: 'metersData',
      },
    });

    // Project the final structure (similar to your $project)
    aggregationPipeline.push({
      $project: {
        _id: '$machines._id',
        locationId: '$_id',
        locationName: '$name',
        assetNumber: {
          $ifNull: [
            {
              $cond: [
                {
                  $eq: [{ $trim: { input: '$machines.serialNumber' } }, ''],
                },
                null,
                '$machines.serialNumber',
              ],
            },
            '$machines.custom.name',
          ],
        },
        serialNumber: {
          $ifNull: [
            {
              $cond: [
                {
                  $eq: [{ $trim: { input: '$machines.serialNumber' } }, ''],
                },
                null,
                '$machines.serialNumber',
              ],
            },
            '$machines.custom.name',
          ],
        },
        relayId: '$machines.relayId',
        smibBoard: '$machines.smibBoard',
        smbId: {
          $ifNull: [
            '$machines.smibBoard',
            { $ifNull: ['$machines.relayId', ''] },
          ],
        },
        lastActivity: '$machines.lastActivity',
        lastOnline: '$machines.lastActivity',
        game: '$machines.game',
        installedGame: '$machines.game',
        manufacturer: {
          $ifNull: [
            '$machines.manufacturer',
            '$machines.manuf',
            'Unknown Manufacturer',
          ],
        },
        cabinetType: '$machines.cabinetType',
        assetStatus: '$machines.assetStatus',
        status: '$machines.assetStatus',
        gameType: '$machines.gameType',
        isCronosMachine: '$machines.isCronosMachine',
        // Use aggregated meter data with proper fallbacks (exactly like your query)
        moneyIn: { $ifNull: [{ $arrayElemAt: ['$metersData.moneyIn', 0] }, 0] },
        moneyOut: {
          $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0],
        },
        jackpot: { $ifNull: [{ $arrayElemAt: ['$metersData.jackpot', 0] }, 0] },
        gross: { $ifNull: [{ $arrayElemAt: ['$metersData.gross', 0] }, 0] },
        gamesPlayed: {
          $ifNull: [{ $arrayElemAt: ['$metersData.gamesPlayed', 0] }, 0],
        },
        gamesWon: {
          $ifNull: [{ $arrayElemAt: ['$metersData.gamesWon', 0] }, 0],
        },
        cancelledCredits: {
          $ifNull: [{ $arrayElemAt: ['$metersData.moneyOut', 0] }, 0],
        },
        sasMeters: '$machines.sasMeters',
        // Calculate online status (3 minutes threshold)
        online: {
          $cond: [
            {
              $and: [
                { $ne: ['$machines.lastActivity', null] },
                {
                  $gte: [
                    '$machines.lastActivity',
                    { $subtract: [new Date(), 3 * 60 * 1000] },
                  ],
                },
              ],
            },
            true,
            false,
          ],
        },
      },
    });

    // ============================================================================
    // STEP 9: Execute aggregation with pagination
    // ============================================================================
    // First, get total count for pagination metadata
    const countPipeline = [...aggregationPipeline, { $count: 'total' }];
    const countResult = await db
      .collection('gaminglocations')
      .aggregate(countPipeline, {
        allowDiskUse: true,
        maxTimeMS: 60000,
      })
      .toArray();
    const totalCount = countResult[0]?.total || 0;

    // Add pagination stages to the aggregation pipeline
    // When limit is undefined (search mode), fetch all results
    const paginatedPipeline = [
      ...aggregationPipeline,
      ...(skip > 0 ? [{ $skip: skip }] : []),
      ...(limit ? [{ $limit: limit }] : []),
    ];

    // Execute the aggregation with pagination
    const cabinetsWithMeters = await db
      .collection('gaminglocations')
      .aggregate(paginatedPipeline, {
        allowDiskUse: true,
        maxTimeMS: 60000,
      })
      .toArray();

    // ============================================================================
    // STEP 10: Transform and return results
    // ============================================================================
    // Get location info for currency conversion
    // CRITICAL: Use findOne with _id (String IDs, not ObjectId)
    const location = await db
      .collection('gaminglocations')
      .findOne({ _id: locationId } as Record<string, unknown>, {
        projection: { 'rel.licencee': 1, country: 1 },
      });

    // Get licensee and country info for currency conversion
    let nativeCurrency: CurrencyCode = 'USD';
    if (location) {
      const locationLicenseeId = location.rel?.licencee as string | undefined;
      if (!locationLicenseeId) {
        // Unassigned locations - determine currency from country
        const countryId = location.country as string | undefined;
        if (countryId) {
          // CRITICAL: Use findOne with _id (String IDs, not ObjectId)
          const country = await db
            .collection('countries')
            .findOne({ _id: countryId } as Record<string, unknown>, {
              projection: { name: 1 },
            });
          if (country?.name) {
            nativeCurrency = getCountryCurrency(country.name);
          }
        }
      } else {
        // Get licensee's native currency
        // CRITICAL: Use findOne with _id (String IDs, not ObjectId)
        const licensee = await db
          .collection('licencees')
          .findOne({ _id: locationLicenseeId } as Record<string, unknown>, {
            projection: { name: 1 },
          });
        if (licensee?.name) {
          nativeCurrency = getLicenseeCurrency(licensee.name);
        }
      }
    }

    // Check if currency conversion should be applied
    // For location details we ALWAYS convert cabinet-level financials into the
    // currently selected display currency when a currency is provided, so that
    // the cards, table rows, and cabinet drill‑downs all match.
    const shouldConvert = Boolean(displayCurrency);

    // Transform the results to ensure proper data types
    const transformedCabinets: TransformedCabinet[] = cabinetsWithMeters.map(
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
