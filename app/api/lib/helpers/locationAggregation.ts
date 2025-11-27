import { convertResponseToTrinidadTime } from '@/app/api/lib/utils/timezone';
import { AggregatedLocation, LocationDateRange } from '@/lib/types/location';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { Db, Document } from 'mongodb';

/**
 * Aggregates and returns location metrics, including machine counts and online status, with optional filters.
 * Optimized for performance with reduced data processing and parallel execution.
 *
 * @param db - MongoDB database instance.
 * @param startDate - Start date for aggregation.
 * @param endDate - End date for aggregation.

 * @param licencee - (Optional) Licencee filter for locations.


 * @returns Promise resolving to an array of AggregatedLocation objects.
 */
export const getLocationsWithMetrics = async (
  db: Db,
  _dateRange: LocationDateRange,
  licencee?: string,
  page: number = 1,
  limit: number = 50,
  sasEvaluationOnly: boolean = false,
  basicList: boolean = false,
  selectedLocations?: string,
  timePeriod?: string,
  customStartDate?: Date,
  customEndDate?: Date,
  allowedLocationIds?: string[] | 'all'
): Promise<{ rows: AggregatedLocation[]; totalCount: number }> => {
  const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);

  // Build the base pipeline with location matching
  // Apply user location permissions if provided (takes precedence)
  const locationIdFilter: { _id?: { $in: string[] } } = {};

  // Debug logging
  console.log('🔍 [getLocationsWithMetrics] ========================================');
  if (allowedLocationIds === 'all') {
    console.log(
      '🔍 [getLocationsWithMetrics] allowedLocationIds is "all" - no location filtering will be applied'
    );
  } else if (allowedLocationIds !== undefined) {
    console.log(
      `🔍 [getLocationsWithMetrics] allowedLocationIds is array with ${allowedLocationIds.length} locations - filtering will be applied`
    );
    console.log('🔍 [getLocationsWithMetrics] Allowed location IDs (first 10):', allowedLocationIds.slice(0, 10));
  } else {
    console.log(
      '🔍 [getLocationsWithMetrics] allowedLocationIds is undefined - will check licensee filter'
    );
  }

  if (allowedLocationIds !== undefined && allowedLocationIds !== 'all') {
    // User has specific location permissions (from getUserLocationFilter)
    // This already includes licensee filtering if applicable
    if (allowedLocationIds.length === 0) {
      // No accessible locations
      console.warn('⚠️⚠️⚠️ [getLocationsWithMetrics] EMPTY allowedLocationIds - returning empty result ⚠️⚠️⚠️');
      return {
        rows: [],
        totalCount: 0,
      };
    }
    locationIdFilter._id = { $in: allowedLocationIds };
    console.log('🔍 [getLocationsWithMetrics] Applied location filter:', { _id: { $in: allowedLocationIds.slice(0, 5) } });
  } else if (licencee && licencee !== 'all') {
    // No user location permissions provided, but licensee filter is specified
    // Prefetch location ids for this licensee
    const locs = await db
      .collection('gaminglocations')
      .find(
        {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
          'rel.licencee': licencee,
        },
        {
          projection: { _id: 1 },
          // Add limit for performance
          limit: 1000,
        }
      )
      .toArray();
    const licenseeLocationIds = locs.map(l => l._id.toString());
    if (licenseeLocationIds.length > 0) {
      locationIdFilter._id = { $in: licenseeLocationIds };
    } else {
      // No locations for this licensee
      return {
        rows: [],
        totalCount: 0,
      };
    }
  }

  const basePipeline: Document[] = [
    {
      $match: {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
        ...locationIdFilter,
      },
    },
  ];

  // Filter by selected locations if provided (string matching only)
  if (selectedLocations) {
    const selectedLocationIdStrings: string[] = selectedLocations.split(',');

    // Direct _id matching since all IDs are stored as strings
    basePipeline.push({ $match: { _id: { $in: selectedLocationIdStrings } } });
  }

  // Add financial aggregation only if not basic list
  // NEW BEHAVIOR: Always load financial data unless it's a basic list
  // This means when no selectedLocations are provided, we load ALL locations with financial data
  if (!basicList) {
    // Execute the location pipeline first to get all matching locations
    console.log('🔍 [getLocationsWithMetrics] Executing location pipeline with filter:', JSON.stringify(basePipeline[0].$match, null, 2));
    const locations = await db
      .collection('gaminglocations')
      .aggregate(basePipeline)
      .toArray();

    console.log('🔍 [getLocationsWithMetrics] Pipeline returned locations:', {
      count: locations.length,
      firstFew: locations.slice(0, 5).map((loc: { _id?: string; name?: string }) => ({
        _id: String(loc._id),
        name: loc.name
      }))
    });

    // If no locations found, return empty result
    if (locations.length === 0) {
      console.warn('⚠️⚠️⚠️ [getLocationsWithMetrics] NO LOCATIONS FOUND - returning empty result ⚠️⚠️⚠️');
      return {
        rows: [],
        totalCount: 0,
      };
    }

    // Now aggregate meters for each location using gaming day ranges
    const locationsWithMetrics = await Promise.all(
      locations.map(async location => {
        const locationId = location._id.toString();
        const gameDayOffset = location.gameDayOffset ?? 8; // Default to 8 AM Trinidad time

        // Calculate gaming day range for this location
        const gamingDayRange = getGamingDayRangeForPeriod(
          timePeriod || 'Today',
          gameDayOffset,
          customStartDate,
          customEndDate
        );

        // First get all machines for this location
        // All _id fields are strings, not ObjectIds
        const locationIdStr = location._id.toString();
        const machinesForLocation = await db
          .collection('machines')
          .find(
            {
              gamingLocation: locationIdStr, // Use string, not ObjectId
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
            },
            { projection: { _id: 1 } }
          )
          .toArray();

        // Convert machine IDs to strings (meters.machine is stored as String, not ObjectId)
        const machineIds = machinesForLocation.map(m => m._id.toString());

        // Now aggregate meters for all machines in this location using gaming day range
        const metersAggregation = await db
          .collection('meters')
          .aggregate([
            {
              $match: {
                machine: { $in: machineIds }, // Match by machine IDs (as strings), not location
                readAt: {
                  $gte: gamingDayRange.rangeStart,
                  $lte: gamingDayRange.rangeEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
                totalMoneyOut: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
                totalGamesPlayed: {
                  $sum: { $ifNull: ['$movement.gamesPlayed', 0] },
                },
                totalCoinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
                totalCoinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
                totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
              },
            },
          ])
          .toArray();

        // Get machine data for this location
        const machineData = await db
          .collection('machines')
          .aggregate([
            {
              $match: {
                gamingLocation: locationIdStr, // Use string, not ObjectId
                $or: [
                  { deletedAt: null },
                  { deletedAt: { $lt: new Date('2020-01-01') } },
                ],
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                online: {
                  $sum: {
                    $cond: [{ $gte: ['$lastActivity', onlineThreshold] }, 1, 0],
                  },
                },
                sasMachines: { $sum: { $cond: ['$isSasMachine', 1, 0] } },
                nonSasMachines: {
                  $sum: { $cond: [{ $eq: ['$isSasMachine', false] }, 1, 0] },
                },
              },
            },
          ])
          .toArray();

        // Extract metrics from aggregation results
        const meterMetrics = metersAggregation[0] || {
          totalDrop: 0,
          totalMoneyOut: 0,
          totalGamesPlayed: 0,
          totalCoinIn: 0,
          totalCoinOut: 0,
          totalJackpot: 0,
        };

        const machineMetrics = machineData[0] || {
          total: 0,
          online: 0,
          sasMachines: 0,
          nonSasMachines: 0,
        };

        return {
          location: locationId,
          locationName: location.name || 'Unknown Location',
          moneyIn: meterMetrics.totalDrop,
          moneyOut: meterMetrics.totalMoneyOut,
          gross: meterMetrics.totalDrop - meterMetrics.totalMoneyOut,
          coinIn: meterMetrics.totalCoinIn,
          coinOut: meterMetrics.totalCoinOut,
          jackpot: meterMetrics.totalJackpot,
          totalMachines: machineMetrics.total,
          onlineMachines: machineMetrics.online,
          sasMachines: machineMetrics.sasMachines,
          nonSasMachines: machineMetrics.nonSasMachines,
          hasSasMachines: machineMetrics.sasMachines > 0,
          hasNonSasMachines: machineMetrics.nonSasMachines > 0,
          isLocalServer: location.isLocalServer || false,
          noSMIBLocation: machineMetrics.sasMachines === 0,
          hasSmib: machineMetrics.sasMachines > 0,
          gamesPlayed: meterMetrics.totalGamesPlayed,
          rel: location.rel, // Include for currency conversion
          country: location.country, // Include for currency conversion
        } as unknown as AggregatedLocation;
      })
    );

    // Filter by SAS evaluation if requested
    const filteredLocations = sasEvaluationOnly
      ? locationsWithMetrics.filter(
          loc => (loc as unknown as { sasMachines: number }).sasMachines > 0
        )
      : locationsWithMetrics;

    // Sort locations alphabetically by name
    const sortedLocations = filteredLocations.sort((a, b) =>
      (a as unknown as { locationName: string }).locationName.localeCompare(
        (b as unknown as { locationName: string }).locationName
      )
    );

    const allResults = sortedLocations;

    // For financial data, always return all results without pagination
    // This allows the frontend to have all data for filtering and sorting
    const totalCount = allResults.length;
    const outputRows = allResults; // Return all rows for financial data

    return {
      rows: convertResponseToTrinidadTime(outputRows),
      totalCount,
    };
  } else {
    // For basic list, just add the location field and get machine counts
    basePipeline.push({
      $addFields: {
        location: { $toString: '$_id' },
        // Set default values for financial fields
        moneyIn: 0,
        moneyOut: 0,
        coinIn: 0,
        coinOut: 0,
        jackpot: 0,
        gamesPlayed: 0,
      },
    });

    const locationPipeline = [
      ...basePipeline,
      // Sort locations alphabetically by name
      {
        $sort: { name: 1 },
      },
    ];

    // Execute the location-based aggregation with machine lookup
    const locationsWithMetrics = await db
      .collection('gaminglocations')
      .aggregate(
        [
          ...locationPipeline,
          // Add machine lookup to the same pipeline
          {
            $lookup: {
              from: 'machines',
              let: { locationId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$gamingLocation', '$$locationId'] },
                    $or: [
                      { deletedAt: null },
                      { deletedAt: { $lt: new Date('2020-01-01') } },
                    ],
                  },
                },
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    online: {
                      $sum: {
                        $cond: [
                          { $gte: ['$lastActivity', onlineThreshold] },
                          1,
                          0,
                        ],
                      },
                    },
                    sasMachines: { $sum: { $cond: ['$isSasMachine', 1, 0] } },
                    nonSasMachines: {
                      $sum: {
                        $cond: [{ $eq: ['$isSasMachine', false] }, 1, 0],
                      },
                    },
                  },
                },
              ],
              as: 'machineData',
            },
          },
          {
            $addFields: {
              totalMachines: {
                $ifNull: [{ $arrayElemAt: ['$machineData.total', 0] }, 0],
              },
              onlineMachines: {
                $ifNull: [{ $arrayElemAt: ['$machineData.online', 0] }, 0],
              },
              sasMachines: {
                $ifNull: [{ $arrayElemAt: ['$machineData.sasMachines', 0] }, 0],
              },
              nonSasMachines: {
                $ifNull: [
                  { $arrayElemAt: ['$machineData.nonSasMachines', 0] },
                  0,
                ],
              },
              gross: { $subtract: ['$moneyIn', '$moneyOut'] },
            },
          },
          // Add SAS evaluation filter if requested
          // For basic lists, we need to filter SAS locations after machine lookup
          // For detailed queries, we can filter after financial aggregation
          ...(sasEvaluationOnly
            ? [
                {
                  $match: {
                    sasMachines: { $gt: 0 },
                  },
                },
              ]
            : []),
        ],
        {
          allowDiskUse: true,
          maxTimeMS: 60000, // Increased to 60 seconds for complex aggregations
        }
      )
      .toArray();

    // Transform the aggregated data to the expected format
    const enhancedMetrics = locationsWithMetrics.map(location => {
      const locationId = location._id.toString();

      // Calculate metrics with proper fallbacks
      const moneyIn = location.moneyIn || 0;
      const moneyOut = location.moneyOut || 0;
      const gross = location.gross || moneyIn - moneyOut;

      // Additional meter fields
      const coinIn = location.coinIn || 0;
      const coinOut = location.coinOut || 0;
      const jackpot = location.jackpot || 0;

      // Machine counts with proper fallbacks
      const totalMachines = location.totalMachines || 0;
      const onlineMachines = location.onlineMachines || 0;
      const sasMachines = location.sasMachines || 0;
      const nonSasMachines = location.nonSasMachines || 0;
      const gamesPlayed = location.gamesPlayed || 0;

      // Determine if location has SAS machines
      const hasSasMachines = sasMachines > 0;
      const hasNonSasMachines = nonSasMachines > 0;

      return {
        location: locationId,
        locationName: location.name || 'Unknown Location',
        moneyIn,
        moneyOut,
        gross,
        coinIn,
        coinOut,
        jackpot,
        totalMachines,
        onlineMachines,
        sasMachines,
        nonSasMachines,
        hasSasMachines,
        hasNonSasMachines,
        isLocalServer: location.isLocalServer || false,
        // For backward compatibility
        noSMIBLocation: !hasSasMachines,
        hasSmib: hasSasMachines,
        gamesPlayed,
      } as unknown as AggregatedLocation;
    });

    const allResults = enhancedMetrics;

    // Decide whether to paginate. For basic lists (page-load dropdown) and for
    // explicit selectedLocations queries, return ALL rows without slicing.
    const shouldPaginate = !(basicList || selectedLocations);

    const totalCount = allResults.length;
    const startIndex = shouldPaginate ? (page - 1) * limit : 0;
    const endIndex = shouldPaginate ? startIndex + limit : totalCount;
    const outputRows = allResults.slice(startIndex, endIndex);

    return {
      rows: convertResponseToTrinidadTime(outputRows),
      totalCount,
    };
  }
};
