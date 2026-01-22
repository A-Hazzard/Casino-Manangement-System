import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { convertResponseToTrinidadTime } from '@/app/api/lib/utils/timezone';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { AggregatedLocation } from '@/shared/types';
import type { PipelineStage } from 'mongoose';
import { getMemberCountsPerLocation } from './membershipAggregation';

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
  licencee?: string,
  page: number = 1,
  limit: number = 50,
  sasEvaluationOnly: boolean = false,
  basicList: boolean = false,
  selectedLocations?: string,
  timePeriod?: string,
  customStartDate?: Date,
  customEndDate?: Date,
  allowedLocationIds?: string[] | 'all',
  machineTypeFilter?: string | null
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
  }
  // Note: Licensee filter is now applied directly in basePipeline instead of prefetching

  const basePipeline: PipelineStage[] = [
    {
      $match: {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
        ...locationIdFilter,
        // Apply licensee filter directly instead of prefetching location IDs
        ...(licencee && licencee !== 'all' && !locationIdFilter._id
          ? { 'rel.licencee': licencee }
          : {}),
      },
    },
  ];

  // Filter by selected locations if provided (string matching only)
  if (selectedLocations) {
    const selectedLocationIdStrings: string[] = selectedLocations.split(',');

    // Direct _id matching since all IDs are stored as strings
    basePipeline.push({ $match: { _id: { $in: selectedLocationIdStrings } } });
  }

  // Apply machine type filters (SMIB, No SMIB, Local Server, Membership, Models) at database level
  if (machineTypeFilter) {
    const filters = machineTypeFilter.split(',').filter(f => f.trim() !== '');

    // Group filters by logical categories to allow OR within category and AND across
    const connectionFilters: Record<string, unknown>[] = [];
    const featureFilters: Record<string, unknown>[] = [];
    const qualityFilters: Record<string, unknown>[] = [];

    filters.forEach(filter => {
      const f = filter.trim();
      switch (f) {
        // --- Connection Category ---
        case 'LocalServersOnly':
          connectionFilters.push({ isLocalServer: true });
          break;
        case 'SMIBLocationsOnly':
          connectionFilters.push({ noSMIBLocation: { $ne: true } });
          break;
        case 'NoSMIBLocation':
          connectionFilters.push({ noSMIBLocation: true });
          break;

        // --- Feature Category ---
        case 'MembershipOnly':
          // Check both membershipEnabled and enableMembership fields for compatibility
          featureFilters.push({
            $or: [{ membershipEnabled: true }, { enableMembership: true }],
          });
          break;

        // --- Quality Category ---
        case 'MissingCoordinates':
          qualityFilters.push({
            $or: [
              { geoCoords: { $exists: false } },
              { geoCoords: null },
              { 'geoCoords.latitude': { $exists: false } },
              { 'geoCoords.latitude': null },
              { 'geoCoords.latitude': 0 },
              {
                $and: [
                  { 'geoCoords.longitude': { $exists: false, $eq: null } },
                  { 'geoCoords.longtitude': { $exists: false, $eq: null } },
                ],
              },
            ],
          });
          break;
        case 'HasCoordinates':
          qualityFilters.push({
            $and: [
              { 'geoCoords.latitude': { $exists: true, $nin: [null, 0] } },
              {
                $or: [
                  { 'geoCoords.longitude': { $exists: true, $nin: [null, 0] } },
                  {
                    'geoCoords.longtitude': { $exists: true, $nin: [null, 0] },
                  },
                ],
              },
            ],
          });
          break;
      }
    });

    // Combine categories: (Conn1 OR Conn2) AND (Feat1) AND (Qual1 OR Qual2)
    const combinedFilters: Record<string, unknown>[] = [];
    if (connectionFilters.length > 0)
      combinedFilters.push({ $or: connectionFilters });
    if (featureFilters.length > 0)
      combinedFilters.push({ $or: featureFilters });
    if (qualityFilters.length > 0)
      combinedFilters.push({ $or: qualityFilters });

    if (combinedFilters.length > 0) {
      basePipeline.push({ $match: { $and: combinedFilters } });
    }
  }

  // Add financial aggregation only if not basic list
  if (!basicList) {
    // Execute the location pipeline first to get all matching locations
    const locations = await GamingLocations.aggregate(basePipeline).exec();

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
        const locationId = String(location._id);
        const gameDayOffset =
          (typeof location.gameDayOffset === 'number'
            ? location.gameDayOffset
            : undefined) ?? 8;
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
      const allLocationIds = locations.map(loc => String(loc._id));

      // Get all machines for all locations
      const allMachinesData = await Machine.find(
        {
          gamingLocation: { $in: allLocationIds },
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        },
        {
          _id: 1,
          gamingLocation: 1,
          lastActivity: 1,
          isSasMachine: 1,
        }
      )
        .lean()
        .exec();
      // Create machine-to-location map and location-to-machines map
      const machineToLocation = new Map<string, string>();
      const locationToMachines = new Map<string, typeof allMachinesData>();
      allMachinesData.forEach(machine => {
        const machineId = String(machine._id);
        const locationId = machine.gamingLocation
          ? String(machine.gamingLocation)
          : undefined;
        if (locationId) {
          machineToLocation.set(machineId, locationId);
          if (!locationToMachines.has(locationId)) {
            locationToMachines.set(locationId, []);
          }
          locationToMachines.get(locationId)!.push(machine);
        }
      });

      if (allLocationIds.length > 0) {
        // 🚀 PERFORMANCE OPTIMIZATION: Use location field directly from meters
        // Meters collection has a 'location' field, so we can skip the expensive $lookup to machines
        // This dramatically improves performance for 7d/30d periods (10-20x faster)
        // The index on { location: 1, readAt: 1 } makes this query very efficient

        // Build optimized aggregation pipeline that uses location field directly
        // Group by location AND hour to prevent data inflation from global date ranges
        const aggregationPipeline: PipelineStage[] = [
          {
            $match: {
              location: { $in: allLocationIds }, // Filter by location directly (uses index)
              readAt: {
                $gte: globalStart,
                $lte: globalEnd,
              },
            },
          },
          {
            $group: {
              _id: {
                location: '$location',
                hour: { $dateTrunc: { date: '$readAt', unit: 'hour' } },
              },
              totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              totalCancelledCredits: {
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
        ];

        const locationAggregations: Array<{
          _id: { location: string; hour: Date };
          totalDrop: number;
          totalCancelledCredits: number;
          totalGamesPlayed: number;
          totalCoinIn: number;
          totalCoinOut: number;
          totalJackpot: number;
        }> = [];
        const locationAggregationsCursor = Meters.aggregate(
          aggregationPipeline,
          {
            allowDiskUse: true,
            maxTimeMS: 120000,
          }
        ).cursor({ batchSize: 1000 });

        for await (const doc of locationAggregationsCursor) {
          locationAggregations.push(doc as (typeof locationAggregations)[0]);
        }

        // Initialize location metrics map
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

        // Process buckets and filter by each location's specific range
        for (const bucketAgg of locationAggregations) {
          const locationId = String(bucketAgg._id.location);
          const bucketHour = new Date(bucketAgg._id.hour);
          const gamingDayRange = gamingDayRanges.get(locationId);
          if (!gamingDayRange) continue;

          const isWithinRange =
            bucketHour >= gamingDayRange.rangeStart &&
            bucketHour <= gamingDayRange.rangeEnd;

          if (isWithinRange) {
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
            metrics.moneyIn += (bucketAgg.totalDrop as number) || 0;
            metrics.moneyOut +=
              (bucketAgg.totalCancelledCredits as number) || 0;
            metrics.gamesPlayed += (bucketAgg.totalGamesPlayed as number) || 0;
            metrics.coinIn += (bucketAgg.totalCoinIn as number) || 0;
            metrics.coinOut += (bucketAgg.totalCoinOut as number) || 0;
            metrics.jackpot += (bucketAgg.totalJackpot as number) || 0;
          }
        }

        // Build location results
        for (const location of locations) {
          const locationId = String(location._id);
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
          const locationId = String(location._id);
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
        const memberCountMap = await getMemberCountsPerLocation(membershipEnabledLocations);

        // Add member counts to locations
        locationsWithMetrics.forEach(loc => {
          if (loc.membershipEnabled) {
            loc.memberCount = memberCountMap.get(loc.location) || 0;
          }
        });
      }
    } else {
      // 🚀 OPTIMIZED: Process locations in batches using consolidated queries
      // Instead of N+1 queries per batch, we use 3 queries per batch regardless of batch size
      const BATCH_SIZE = 10;

      for (let i = 0; i < locations.length; i += BATCH_SIZE) {
        const batch = locations.slice(i, i + BATCH_SIZE);

        // Step 1: Calculate gaming day ranges for all locations in batch
        const batchGamingDayRanges = new Map<
          string,
          { rangeStart: Date; rangeEnd: Date }
        >();
        batch.forEach(location => {
          const locationId = String(location._id);
          const gameDayOffset =
            (typeof location.gameDayOffset === 'number'
              ? location.gameDayOffset
              : undefined) ?? 8;
          const gamingDayRange = getGamingDayRangeForPeriod(
            timePeriod || 'Today',
            gameDayOffset,
            customStartDate,
            customEndDate
          );
          batchGamingDayRanges.set(locationId, gamingDayRange);
        });

        // Step 2: Get global date range for batch
        let batchGlobalStart = new Date();
        let batchGlobalEnd = new Date(0);
        batchGamingDayRanges.forEach(range => {
          if (range.rangeStart < batchGlobalStart)
            batchGlobalStart = range.rangeStart;
          if (range.rangeEnd > batchGlobalEnd) batchGlobalEnd = range.rangeEnd;
        });

        // Step 3: Get ALL location IDs in batch
        const batchLocationIds = batch.map(loc => String(loc._id));

        // Step 4: Get ALL machines for ALL locations in batch (1 query)
        const batchAllMachines = await Machine.find(
          {
            gamingLocation: { $in: batchLocationIds },
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          },
          {
            _id: 1,
            gamingLocation: 1,
            lastActivity: 1,
            isSasMachine: 1,
          }
        )
          .lean()
          .exec();

        // Step 5: Group machines by location
        const batchMachinesByLocation = new Map<
          string,
          Array<{
            _id: string;
            lastActivity?: Date;
            isSasMachine?: boolean;
          }>
        >();
        const batchMachineIds: string[] = [];
        batchAllMachines.forEach(machine => {
          const locationId = machine.gamingLocation
            ? String(machine.gamingLocation)
            : null;
          if (locationId && batchLocationIds.includes(locationId)) {
            const machineId = String(machine._id);
            batchMachineIds.push(machineId);
            if (!batchMachinesByLocation.has(locationId)) {
              batchMachinesByLocation.set(locationId, []);
            }
            batchMachinesByLocation.get(locationId)!.push({
              _id: machineId,
              lastActivity: machine.lastActivity as Date | undefined,
              isSasMachine: machine.isSasMachine as boolean | undefined,
            });
          }
        });

        // Step 6: Get ALL meters for ALL machines in batch, grouped by location (1 query)
        const batchMetersByLocation = new Map<
          string,
          {
            totalDrop: number;
            totalMoneyOut: number;
            totalGamesPlayed: number;
            totalCoinIn: number;
            totalCoinOut: number;
            totalJackpot: number;
          }
        >();

        if (batchLocationIds.length > 0) {
          // 🚀 PERFORMANCE OPTIMIZATION: Use location field directly from meters
          // Group by location AND hour to prevent data inflation from batch global date ranges
          const batchMetersAggregation: Array<{
            _id: { location: string; hour: Date };
            totalDrop: number;
            totalMoneyOut: number;
            totalGamesPlayed: number;
            totalCoinIn: number;
            totalCoinOut: number;
            totalJackpot: number;
          }> = [];
          const batchMetersCursor = Meters.aggregate([
            {
              $match: {
                location: { $in: batchLocationIds }, // Filter by location directly (uses index)
                readAt: {
                  $gte: batchGlobalStart,
                  $lte: batchGlobalEnd,
                },
              },
            },
            {
              $group: {
                _id: {
                  location: '$location',
                  hour: { $dateTrunc: { date: '$readAt', unit: 'hour' } },
                },
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
          ]).cursor({ batchSize: 1000 });

          for await (const doc of batchMetersCursor) {
            batchMetersAggregation.push(
              doc as (typeof batchMetersAggregation)[0]
            );
          }

          // Step 7: Filter by gaming day ranges in memory
          batchMetersAggregation.forEach(agg => {
            const locationId = String(agg._id.location);
            const bucketHour = new Date(agg._id.hour);
            const gamingDayRange = batchGamingDayRanges.get(locationId);
            if (!gamingDayRange) return;

            // Check if the hour start falls within the location's specific gaming day range
            const isWithinRange =
              bucketHour >= gamingDayRange.rangeStart &&
              bucketHour <= gamingDayRange.rangeEnd;

            if (isWithinRange) {
              if (!batchMetersByLocation.has(locationId)) {
                batchMetersByLocation.set(locationId, {
                  totalDrop: 0,
                  totalMoneyOut: 0,
                  totalGamesPlayed: 0,
                  totalCoinIn: 0,
                  totalCoinOut: 0,
                  totalJackpot: 0,
                });
              }
              const current = batchMetersByLocation.get(locationId)!;
              current.totalDrop += (agg.totalDrop as number) || 0;
              current.totalMoneyOut += (agg.totalMoneyOut as number) || 0;
              current.totalGamesPlayed += (agg.totalGamesPlayed as number) || 0;
              current.totalCoinIn += (agg.totalCoinIn as number) || 0;
              current.totalCoinOut += (agg.totalCoinOut as number) || 0;
              current.totalJackpot += (agg.totalJackpot as number) || 0;
            }
          });
        }

        // Step 8: Combine results for batch
        const batchResults = batch.map(location => {
          const locationId = String(location._id);
          const machines = batchMachinesByLocation.get(locationId) || [];
          const meterMetrics = batchMetersByLocation.get(locationId) || {
            totalDrop: 0,
            totalMoneyOut: 0,
            totalGamesPlayed: 0,
            totalCoinIn: 0,
            totalCoinOut: 0,
            totalJackpot: 0,
          };

          // Calculate machine metrics
          const totalMachines = machines.length;
          const onlineMachines = machines.filter(
            m => m.lastActivity && new Date(m.lastActivity) >= onlineThreshold
          ).length;
          const sasMachines = machines.filter(m => m.isSasMachine).length;
          const nonSasMachines = totalMachines - sasMachines;

          return {
            location: locationId,
            locationName: location.name || 'Unknown Location',
            moneyIn: meterMetrics.totalDrop,
            moneyOut: meterMetrics.totalMoneyOut,
            gross: meterMetrics.totalDrop - meterMetrics.totalMoneyOut,
            coinIn: meterMetrics.totalCoinIn,
            coinOut: meterMetrics.totalCoinOut,
            jackpot: meterMetrics.totalJackpot,
            totalMachines,
            onlineMachines,
            sasMachines,
            nonSasMachines,
            hasSasMachines: sasMachines > 0,
            hasNonSasMachines: nonSasMachines > 0,
            isLocalServer: location.isLocalServer || false,
            noSMIBLocation: sasMachines === 0,
            hasSmib: sasMachines > 0,
            gamesPlayed: meterMetrics.totalGamesPlayed,
            rel: location.rel,
            country: location.country,
            membershipEnabled: location.membershipEnabled || false,
          } as unknown as AggregatedLocation;
        });

        locationsWithMetrics.push(...batchResults);
      }

      // ============================================================================
      // Add member counts for locations with membership enabled (batch processing)
      // ============================================================================
      const membershipEnabledLocations = locationsWithMetrics
        .filter(loc => loc.membershipEnabled)
        .map(loc => loc.location);

      if (membershipEnabledLocations.length > 0) {
        const memberCountMap = await getMemberCountsPerLocation(membershipEnabledLocations);

        // Add member counts to locations
        locationsWithMetrics.forEach(loc => {
          if (loc.membershipEnabled) {
            loc.memberCount = memberCountMap.get(loc.location) || 0;
          }
        });
      }
    }

    // ============================================================================
    // Mark NON-SMIB locations as offline if no collection report in past 3 months
    // ============================================================================
    const nonSmibLocations = locationsWithMetrics.filter(
      loc => loc.sasMachines === 0 || loc.noSMIBLocation
    );

    if (nonSmibLocations.length > 0) {
      const { CollectionReport } = await import(
        '@/app/api/lib/models/collectionReport'
      );

      // Calculate date 3 months ago
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Get collection reports for NON-SMIB locations in the past 3 months
      const nonSmibLocationIds = nonSmibLocations.map(loc => loc.location);
      const recentCollectionReports = await CollectionReport.find({
        location: { $in: nonSmibLocationIds },
        timestamp: { $gte: threeMonthsAgo },
        isEditing: { $ne: true }, // Exclude reports being edited
      })
        .select('location timestamp')
        .lean();

      // Create a set of location IDs that have recent collection reports
      const locationsWithRecentReports = new Set<string>();
      recentCollectionReports.forEach((report: { location: string }) => {
        locationsWithRecentReports.add(report.location);
      });

      // Mark locations without recent collection reports as offline
      // Also add flag to indicate missing collection report
      locationsWithMetrics.forEach(loc => {
        if (
          (loc.sasMachines === 0 || loc.noSMIBLocation) &&
          !locationsWithRecentReports.has(loc.location)
        ) {
          // No collection report in past 3 months - mark as offline
          loc.onlineMachines = 0;
          // Add flag for frontend to show warning icon
          (
            loc as { hasNoRecentCollectionReport?: boolean }
          ).hasNoRecentCollectionReport = true;
        }
      });
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

    const locationPipeline: PipelineStage[] = [
      ...basePipeline,
      // Sort locations alphabetically by name
      {
        $sort: { name: 1 },
      },
    ];

    // Execute the location-based aggregation with machine lookup
    const locationsWithMetrics = await GamingLocations.aggregate(
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
                    { deletedAt: { $lt: new Date('2025-01-01') } },
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
    ).exec();

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

    // ============================================================================
    // Mark NON-SMIB locations as offline if no collection report in past 3 months
    // ============================================================================
    const nonSmibLocations = enhancedMetrics.filter(
      loc => loc.sasMachines === 0 || loc.noSMIBLocation
    );

    if (nonSmibLocations.length > 0) {
      const { CollectionReport } = await import(
        '@/app/api/lib/models/collectionReport'
      );

      // Calculate date 3 months ago
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Get collection reports for NON-SMIB locations in the past 3 months
      const nonSmibLocationIds = nonSmibLocations.map(loc => loc.location);
      const recentCollectionReports = await CollectionReport.find({
        location: { $in: nonSmibLocationIds },
        timestamp: { $gte: threeMonthsAgo },
        isEditing: { $ne: true }, // Exclude reports being edited
      })
        .select('location timestamp')
        .lean();

      // Create a set of location IDs that have recent collection reports
      const locationsWithRecentReports = new Set<string>();
      recentCollectionReports.forEach((report: { location: string }) => {
        locationsWithRecentReports.add(report.location);
      });

      // Mark locations without recent collection reports as offline
      // Also add flag to indicate missing collection report
      enhancedMetrics.forEach(loc => {
        if (
          (loc.sasMachines === 0 || loc.noSMIBLocation) &&
          !locationsWithRecentReports.has(loc.location)
        ) {
          // No collection report in past 3 months - mark as offline
          loc.onlineMachines = 0;
          // Add flag for frontend to show warning icon
          (
            loc as { hasNoRecentCollectionReport?: boolean }
          ).hasNoRecentCollectionReport = true;
        }
      });
    }

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

