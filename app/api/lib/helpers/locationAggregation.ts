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

  if (allowedLocationIds !== undefined && allowedLocationIds !== 'all') {
    // User has specific location permissions (from getUserLocationFilter)
    if (allowedLocationIds.length === 0) {
      return { rows: [], totalCount: 0 };
    }
    locationIdFilter._id = { $in: allowedLocationIds };
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
  if (!basicList) {
    // Execute the location pipeline first to get all matching locations
    const locations = await db
      .collection('gaminglocations')
      .aggregate(basePipeline)
      .toArray();

    // If no locations found, return empty result
    if (locations.length === 0) {
      return { rows: [], totalCount: 0 };
    }

    // Now aggregate meters for each location using gaming day ranges
    // 🚀 OPTIMIZED: Use single aggregation for 7d/30d periods (much faster)
    // For shorter periods (Today/Yesterday/Custom), use batch processing
    const useSingleAggregation =
      timePeriod === '7d' ||
      timePeriod === '30d' ||
      timePeriod === 'last7days' ||
      timePeriod === 'last30days';

    const locationsWithMetrics: AggregatedLocation[] = [];

    if (useSingleAggregation) {
      // 🚀 SUPER OPTIMIZED: Single aggregation for ALL locations (much faster for 7d/30d)
      // Get global date range (earliest start, latest end)
      const gamingDayRanges = new Map<
        string,
        { rangeStart: Date; rangeEnd: Date }
      >();
      locations.forEach(location => {
        const locationId = location._id.toString();
        const gameDayOffset = location.gameDayOffset ?? 8;
        const gamingDayRange = getGamingDayRangeForPeriod(
          timePeriod || 'Today',
          gameDayOffset,
          customStartDate,
          customEndDate
        );
        gamingDayRanges.set(locationId, gamingDayRange);
      });

      let globalStart = new Date();
      let globalEnd = new Date(0);
      gamingDayRanges.forEach(range => {
        if (range.rangeStart < globalStart) globalStart = range.rangeStart;
        if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
      });

      // Get all location IDs
      const allLocationIds = locations.map(loc => loc._id.toString());

      // Get all machines for all locations
      const allMachinesData = await db
        .collection('machines')
        .find(
          {
            gamingLocation: { $in: allLocationIds },
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
          },
          {
            projection: {
              _id: 1,
              gamingLocation: 1,
              lastActivity: 1,
              isSasMachine: 1,
            },
          }
        )
        .toArray();

      // Create machine-to-location map and location-to-machines map
      const machineToLocation = new Map<string, string>();
      const locationToMachines = new Map<string, typeof allMachinesData>();
      allMachinesData.forEach(machine => {
        const machineId = machine._id.toString();
        const locationId = machine.gamingLocation?.toString();
        if (locationId) {
          machineToLocation.set(machineId, locationId);
          if (!locationToMachines.has(locationId)) {
            locationToMachines.set(locationId, []);
          }
          locationToMachines.get(locationId)!.push(machine);
        }
      });

      // Get all machine IDs
      const allMachineIds = allMachinesData.map(m => m._id.toString());

      if (allMachineIds.length > 0) {
        // Single aggregation for all meters
        const allMeters = await db
          .collection('meters')
          .aggregate([
            {
              $match: {
                machine: { $in: allMachineIds },
                readAt: {
                  $gte: globalStart,
                  $lte: globalEnd,
                },
              },
            },
            {
              $project: {
                machine: 1,
                readAt: 1,
                'movement.drop': 1,
                'movement.totalCancelledCredits': 1,
                'movement.gamesPlayed': 1,
                'movement.coinIn': 1,
                'movement.coinOut': 1,
                'movement.jackpot': 1,
              },
            },
          ])
          .toArray();

        // Group meters by location and filter by gaming day ranges (in memory)
        const locationMetricsMap = new Map<
          string,
          {
            moneyIn: number;
            moneyOut: number;
            gamesPlayed: number;
            coinIn: number;
            coinOut: number;
            jackpot: number;
          }
        >();

        allMeters.forEach((meter: Record<string, unknown>) => {
          const machineId = meter.machine as string;
          const locationId = machineToLocation.get(machineId);
          if (!locationId) return;

          const gamingDayRange = gamingDayRanges.get(locationId);
          if (!gamingDayRange) return;

          // Filter by gaming day range for this location
          const readAt = new Date(meter.readAt as Date);
          if (
            readAt < gamingDayRange.rangeStart ||
            readAt > gamingDayRange.rangeEnd
          ) {
            return; // Skip meters outside this location's gaming day range
          }

          if (!locationMetricsMap.has(locationId)) {
            locationMetricsMap.set(locationId, {
              moneyIn: 0,
              moneyOut: 0,
              gamesPlayed: 0,
              coinIn: 0,
              coinOut: 0,
              jackpot: 0,
            });
          }

          const metrics = locationMetricsMap.get(locationId)!;
          const movement = meter.movement as
            | Record<string, unknown>
            | undefined;
          metrics.moneyIn += (movement?.drop as number) || 0;
          metrics.moneyOut += (movement?.totalCancelledCredits as number) || 0;
          metrics.gamesPlayed += (movement?.gamesPlayed as number) || 0;
          metrics.coinIn += (movement?.coinIn as number) || 0;
          metrics.coinOut += (movement?.coinOut as number) || 0;
          metrics.jackpot += (movement?.jackpot as number) || 0;
        });

        // Build location results
        for (const location of locations) {
          const locationId = location._id.toString();
          const machines = locationToMachines.get(locationId) || [];
          const metrics = locationMetricsMap.get(locationId) || {
            moneyIn: 0,
            moneyOut: 0,
            gamesPlayed: 0,
            coinIn: 0,
            coinOut: 0,
            jackpot: 0,
          };

          // Calculate machine status metrics
          const totalMachines = machines.length;
          const onlineMachines = machines.filter(
            m => m.lastActivity && new Date(m.lastActivity) >= onlineThreshold
          ).length;
          const sasMachines = machines.filter(m => m.isSasMachine).length;
          const nonSasMachines = totalMachines - sasMachines;

          locationsWithMetrics.push({
            location: locationId,
            locationName: location.name || 'Unknown Location',
            moneyIn: metrics.moneyIn,
            moneyOut: metrics.moneyOut,
            gross: metrics.moneyIn - metrics.moneyOut,
            coinIn: metrics.coinIn,
            coinOut: metrics.coinOut,
            jackpot: metrics.jackpot,
            totalMachines,
            onlineMachines,
            sasMachines,
            nonSasMachines,
            hasSasMachines: sasMachines > 0,
            hasNonSasMachines: nonSasMachines > 0,
            isLocalServer: location.isLocalServer || false,
            noSMIBLocation: sasMachines === 0,
            hasSmib: sasMachines > 0,
            gamesPlayed: metrics.gamesPlayed,
            rel: location.rel,
            country: location.country,
            membershipEnabled: location.membershipEnabled || false,
          } as unknown as AggregatedLocation);
        }
      } else {
        // No machines found, return locations with zero metrics
        for (const location of locations) {
          const locationId = location._id.toString();
          locationsWithMetrics.push({
            location: locationId,
            locationName: location.name || 'Unknown Location',
            moneyIn: 0,
            moneyOut: 0,
            gross: 0,
            coinIn: 0,
            coinOut: 0,
            jackpot: 0,
            totalMachines: 0,
            onlineMachines: 0,
            sasMachines: 0,
            nonSasMachines: 0,
            hasSasMachines: false,
            hasNonSasMachines: false,
            isLocalServer: location.isLocalServer || false,
            noSMIBLocation: true,
            hasSmib: false,
            gamesPlayed: 0,
            rel: location.rel,
            country: location.country,
            membershipEnabled: location.membershipEnabled || false,
          } as unknown as AggregatedLocation);
        }
      }
      
      // ============================================================================
      // Add member counts for locations with membership enabled
      // ============================================================================
      const membershipEnabledLocations = locationsWithMetrics
        .filter(loc => loc.membershipEnabled)
        .map(loc => loc.location);
      
      if (membershipEnabledLocations.length > 0) {
        const { Member } = await import('@/app/api/lib/models/members');
        
        // Count members for each membership-enabled location
        const memberCounts = await Member.aggregate([
          {
            $match: {
              gamingLocation: { $in: membershipEnabledLocations },
              deletedAt: { $lt: new Date('2020-01-01') }, // Exclude deleted members
            },
          },
          {
            $group: {
              _id: '$gamingLocation',
              count: { $sum: 1 },
            },
          },
        ]);
        
        // Create a map of location ID to member count
        const memberCountMap = new Map<string, number>();
        memberCounts.forEach((item: { _id: string; count: number }) => {
          memberCountMap.set(item._id, item.count);
        });
        
        // Add member counts to locations
        locationsWithMetrics.forEach(loc => {
          if (loc.membershipEnabled) {
            loc.memberCount = memberCountMap.get(loc.location) || 0;
          }
        });
      }
    } else {
      // 🚀 OPTIMIZED: Process locations in batches to reduce database load
      // Instead of processing all locations in parallel (which can cause 300+ concurrent queries),
      // we process them in batches of 10 to maintain performance while reducing load
      const BATCH_SIZE = 10;

      for (let i = 0; i < locations.length; i += BATCH_SIZE) {
        const batch = locations.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async location => {
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
                    totalCoinOut: {
                      $sum: { $ifNull: ['$movement.coinOut', 0] },
                    },
                    totalJackpot: {
                      $sum: { $ifNull: ['$movement.jackpot', 0] },
                    },
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
              membershipEnabled: location.membershipEnabled || false,
            } as unknown as AggregatedLocation;
          })
        );

        locationsWithMetrics.push(...batchResults);
      }
      
      // ============================================================================
      // Add member counts for locations with membership enabled (batch processing)
      // ============================================================================
      const membershipEnabledLocations = locationsWithMetrics
        .filter(loc => loc.membershipEnabled)
        .map(loc => loc.location);
      
      if (membershipEnabledLocations.length > 0) {
        const { Member } = await import('@/app/api/lib/models/members');
        
        // Count members for each membership-enabled location
        const memberCounts = await Member.aggregate([
          {
            $match: {
              gamingLocation: { $in: membershipEnabledLocations },
              deletedAt: { $lt: new Date('2020-01-01') }, // Exclude deleted members
            },
          },
          {
            $group: {
              _id: '$gamingLocation',
              count: { $sum: 1 },
            },
          },
        ]);
        
        // Create a map of location ID to member count
        const memberCountMap = new Map<string, number>();
        memberCounts.forEach((item: { _id: string; count: number }) => {
          memberCountMap.set(item._id, item.count);
        });
        
        // Add member counts to locations
        locationsWithMetrics.forEach(loc => {
          if (loc.membershipEnabled) {
            loc.memberCount = memberCountMap.get(loc.location) || 0;
          }
        });
      }
    }

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
