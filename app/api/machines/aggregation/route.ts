/**
 * Machines Aggregation API Route
 *
 * This route handles aggregating machine data across multiple locations.
 * It supports:
 * - Time period filtering (today, week, month, custom dates)
 * - Licensee filtering
 * - Location filtering
 * - Search functionality
 * - Currency conversion (Admin/Developer only for "All Licensees")
 * - Gaming day offset calculations per location
 * - Pagination
 * - Optimized batch processing for performance
 *
 * @module app/api/machines/aggregation/route
 */

import {
    getUserAccessibleLicenseesFromToken,
    getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD } from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import { MachineAggregationMatchStage } from '@/shared/types/mongo';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for machine aggregation
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (locationId, search, licensee, timePeriod, currency, pagination)
 * 3. Validate timePeriod parameter
 * 4. Get user's accessible licensees and permissions
 * 5. Determine allowed location IDs
 * 6. Fetch locations with gameDayOffset
 * 7. Calculate gaming day ranges per location
 * 8. Aggregate machine metrics (optimized for 30d/7d vs Today/Yesterday)
 * 9. Apply search filter
 * 10. Apply currency conversion if needed
 * 11. Apply pagination
 * 12. Return aggregated machine data
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);

    // Get parameters from search params
    const locationIdsParam = searchParams.get('locationId') || searchParams.get('locationIds');
    const locationIdArray = locationIdsParam 
      ? locationIdsParam.split(',').filter(id => id && id !== 'all' && id !== 'null') 
      : [];
    
    console.warn('[API] Parsed location IDs:', locationIdArray);
    
    // Support multiple game types
    const gameTypesParam = searchParams.get('gameType') || searchParams.get('gameTypes');
    const selectedGameTypes = gameTypesParam 
      ? gameTypesParam.split(',').filter(type => type && type !== 'all' && type !== 'null') 
      : [];

    const searchTerm = searchParams.get('search')?.trim() || '';
    // Support both 'licensee' and 'licencee' spelling for backwards compatibility
    const licensee =
      searchParams.get('licensee') || searchParams.get('licencee');
    const timePeriod = searchParams.get('timePeriod');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';
    const rawOnlineStatus = searchParams.get('onlineStatus') || 'all';
    const onlineStatus = rawOnlineStatus.toLowerCase();

    // Pagination parameters
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam
      ? Math.max(1, parseInt(limitParam, 10))
      : undefined;

    // ============================================================================
    // STEP 3: Validate timePeriod parameter
    // ============================================================================
    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // ============================================================================
    // STEP 4: Get user's accessible licensees and permissions
    // ============================================================================
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }

    // ============================================================================
    // STEP 5: Determine allowed location IDs
    // ============================================================================
    // Get allowed location IDs (intersection of licensee + location permissions, respecting roles)
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      licensee || undefined,
      userLocationPermissions,
      userRoles
    );

    // DEBUG: Return debug info if ?debug=true
    const debug = searchParams.get('debug') === 'true';

    // If user has no accessible locations, return empty
    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      const response = { success: true, data: [] };
      if (debug) {
        return NextResponse.json({
          ...response,
          debug: {
            userAccessibleLicensees,
            userRoles,
            userLocationPermissions,
            licenseeParam: licensee,
            allowedLocationIds: 'EMPTY',
            reason: 'No accessible locations',
          },
        });
      }
      return NextResponse.json(response);
    }

    // ============================================================================
    // STEP 6: Fetch locations with gameDayOffset
    // ============================================================================
    // We'll calculate gaming day ranges per location instead of using a single range
    let timePeriodForGamingDay: string;
    let customStartDateForGamingDay: Date | undefined;
    let customEndDateForGamingDay: Date | undefined;

    if (timePeriod === 'Custom' && startDateParam && endDateParam) {
      timePeriodForGamingDay = 'Custom';
      // Parse dates - handle both date-only strings ("2025-12-07") and timezone-aware strings ("2025-12-07T10:00:00-04:00")
      // Check each date independently to determine its format
      // If the string includes 'T', it's already a full ISO string with time/timezone - parse directly
      // Otherwise, append time component for gaming day offset calculation
      if (startDateParam.includes('T')) {
        // Timezone-aware date string - parse directly (e.g., "2025-12-07T10:00:00-04:00")
        // new Date() correctly parses timezone-aware strings and converts to UTC internally
        customStartDateForGamingDay = new Date(startDateParam);
      } else {
        // Date-only string - append time for gaming day offset calculation
        customStartDateForGamingDay = new Date(
          startDateParam + 'T00:00:00.000Z'
        );
      }

      if (endDateParam.includes('T')) {
        // Timezone-aware date string - parse directly
        customEndDateForGamingDay = new Date(endDateParam);
      } else {
        // Date-only string - append time for gaming day offset calculation
        customEndDateForGamingDay = new Date(endDateParam + 'T00:00:00.000Z');
      }

      // Validate dates
      if (
        isNaN(customStartDateForGamingDay.getTime()) ||
        isNaN(customEndDateForGamingDay.getTime())
      ) {
        return NextResponse.json(
          { error: 'Invalid date parameters' },
          { status: 400 }
        );
      }
    } else {
      timePeriodForGamingDay = timePeriod;
    }

    // Build location match stage with access control
    const matchStage: MachineAggregationMatchStage = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    };

    // Apply location filter based on user permissions
    if (locationIdArray.length > 0) {
      // Specific locations requested - validate access
      const filteredLocationIds = locationIdArray.filter(locId => {
        const idStr = String(locId);
        return allowedLocationIds === 'all' || allowedLocationIds.some(id => String(id) === idStr);
      });

      if (filteredLocationIds.length === 0) {
        console.warn('[API] No locations after permission filtering');
        return NextResponse.json({ success: true, data: [] });
      }
      
      console.warn('[API] Filtered location IDs after permissions:', filteredLocationIds);
      matchStage._id = { $in: filteredLocationIds };
    } else if (allowedLocationIds !== 'all') {
      // Apply allowed locations filter
      matchStage._id = { $in: allowedLocationIds };
    }

    // Get all locations with their gameDayOffset
    const locations = await GamingLocations.find(matchStage).lean();
    
    console.warn('[API] Found locations:', locations.length, 'IDs:', locations.map(l => l._id));

    if (locations.length === 0) {
      console.warn('[API] No locations found in database');
      return NextResponse.json({ success: true, data: [] });
    }

    // ============================================================================
    // STEP 7: Calculate gaming day ranges per location
    // ============================================================================
    // Calculate gaming day ranges for each location
    // Always use gaming day offset logic (including for custom dates)
    const gamingDayRanges = getGamingDayRangesForLocations(
      locations.map((loc: Record<string, unknown>) => ({
        _id: (loc._id as { toString: () => string }).toString(),
        gameDayOffset: (loc.gameDayOffset as number) ?? 8, // Default to 8 AM Trinidad time
      })),
      timePeriodForGamingDay,
      customStartDateForGamingDay,
      customEndDateForGamingDay
    );

    // ============================================================================
    // STEP 8: Aggregate machine metrics (optimized for 30d/7d vs Today/Yesterday)
    // ============================================================================
    // 🚀 OPTIMIZED: For 30d periods, use single aggregation across all machines
    // For shorter periods, use parallel batch processing per location
    const allMachines: Array<Record<string, unknown>> = [];
    const useSingleAggregation = timePeriod === '30d' || timePeriod === '7d';

    if (useSingleAggregation) {
      // 🚀 SUPER OPTIMIZED: Single aggregation for ALL machines (much faster for 30d)
      // Get all machines for all locations
      const allLocationIds = locations.map(loc =>
        (loc._id as { toString: () => string }).toString()
      );
      
      // Build machine match query with online/offline filter
      const machineMatchQuery: Record<string, unknown> = {
        gamingLocation: { $in: allLocationIds },
        $and: [
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          },
        ],
      };

      // Apply game type filter if provided
      if (selectedGameTypes.length > 0) {
        console.warn(`[API] Filtering by game types: ${selectedGameTypes.join(', ')}`);
        (machineMatchQuery.$and as Array<Record<string, unknown>>).push({
          $or: [
            { game: { $in: selectedGameTypes } },
            {
              $and: [
                { $or: [{ game: null }, { game: '' }] },
                { gameType: { $in: selectedGameTypes } }
              ]
            }
          ]
        });
      }
      
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
            ],
          });
        }
      }
      
      const allLocationMachines = await Machine.find(machineMatchQuery).lean();
      
      console.warn('[API] Found machines:', allLocationMachines.length, 'for locations:', allLocationIds);
      if (allLocationMachines.length > 0) {
        const locationCounts = allLocationMachines.reduce((acc, m) => {
          const loc = String(m.gamingLocation);
          acc[loc] = (acc[loc] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.warn('[API] Machines per location:', locationCounts);
      }

      if (onlineStatus !== 'all') {
        console.warn('🔍 [API DEBUG] Filtering by onlineStatus:', onlineStatus);
        console.warn('🔍 [API DEBUG] threeMinutesAgo:', new Date(Date.now() - 3 * 60 * 1000).toISOString());
        console.warn('🔍 [API DEBUG] Query lastActivity constraint:', JSON.stringify(machineMatchQuery.lastActivity));
        console.warn('🔍 [API DEBUG] Found machines count:', allLocationMachines.length);
        if (allLocationMachines.length > 0) {
           const firstMachine = allLocationMachines[0];
           console.warn('🔍 [API DEBUG] First machine lastActivity:', firstMachine.lastActivity);
           console.warn('🔍 [API DEBUG] Is valid?', new Date(firstMachine.lastActivity as Date) >= new Date(Date.now() - 3 * 60 * 1000));
        }
      }

      if (allLocationMachines.length > 0) {
        // Create machine-to-location map
        const machineToLocation = new Map();
        allLocationMachines.forEach(machine => {
          const machineId = (
            machine._id as { toString: () => string }
          ).toString();
          machineToLocation.set(machineId, machine.gamingLocation);
        });

        // Single aggregation for ALL machines across ALL locations
        // Group by location to get gaming day ranges
        const locationRanges = new Map();
        locations.forEach(loc => {
          const locationId = (loc._id as { toString: () => string }).toString();
          const gameDayRange = gamingDayRanges.get(locationId);
          if (gameDayRange) {
            locationRanges.set(locationId, gameDayRange);
          }
        });

        // Since gaming day ranges differ per location, we MUST aggregate per location
        // to respect each location's specific gaming day offset per the gaming day offset system.
        // Group machines by location first
        const machinesByLocation = new Map<string, string[]>();
        allLocationMachines.forEach(machine => {
          const machineId = (
            machine._id as { toString: () => string }
          ).toString();
          const locationId = machineToLocation.get(machineId);
          if (locationId) {
            if (!machinesByLocation.has(locationId)) {
              machinesByLocation.set(locationId, []);
            }
            machinesByLocation.get(locationId)?.push(machineId);
          }
        });

        // Aggregate meters per location to respect gaming day ranges
        const allMetrics: Array<Record<string, unknown>> = [];

        // Process each location's machines with their specific gaming day range
        await Promise.all(
          Array.from(machinesByLocation.entries()).map(
            async ([locationId, machineIds]) => {
              const gameDayRange = locationRanges.get(locationId);
              if (!gameDayRange) return;

              const locationPipeline: PipelineStage[] = [
                {
                  $match: {
                    machine: { $in: machineIds },
                    readAt: {
                      $gte: gameDayRange.rangeStart,
                      $lte: gameDayRange.rangeEnd,
                    },
                  },
                },
                {
                  $project: {
                    machine: 1,
                    drop: '$movement.drop',
                    totalCancelledCredits: '$movement.totalCancelledCredits',
                    jackpot: '$movement.jackpot',
                    coinIn: 1,
                    coinOut: 1,
                    gamesPlayed: 1,
                    gamesWon: 1,
                    handPaidCancelledCredits: 1,
                  },
                },
                {
                  $group: {
                    _id: '$machine',
                    moneyIn: { $sum: '$drop' },
                    moneyOut: { $sum: '$totalCancelledCredits' },
                    jackpot: { $sum: '$jackpot' },
                    coinIn: { $last: '$coinIn' },
                    coinOut: { $last: '$coinOut' },
                    gamesPlayed: { $last: '$gamesPlayed' },
                    gamesWon: { $last: '$gamesWon' },
                    handPaidCancelledCredits: {
                      $last: '$handPaidCancelledCredits',
                    },
                    meterCount: { $sum: 1 },
                  },
                },
              ];

              // Use cursor for Meters aggregation
              const locationMetrics: Array<Record<string, unknown>> = [];
              const locationMetricsCursor = Meters.aggregate(locationPipeline, {
                allowDiskUse: true,
                maxTimeMS: 90000,
              }).cursor({ batchSize: 1000 });

              for await (const doc of locationMetricsCursor) {
                locationMetrics.push(doc);
              }

              allMetrics.push(...locationMetrics);
            }
          )
        );

        // Create metrics map
        const metricsMap = new Map();
        allMetrics.forEach(metrics => {
          metricsMap.set(metrics._id, metrics);
        });

        // Build machine objects
        allLocationMachines.forEach(machine => {
          const machineId = (
            machine._id as { toString: () => string }
          ).toString();
          const locationId = machineToLocation.get(machineId);
          const location = locations.find(
            loc =>
              (loc._id as { toString: () => string }).toString() === locationId
          );

          if (!location) return;

          const metrics = metricsMap.get(machineId) || {
            moneyIn: 0,
            moneyOut: 0,
            jackpot: 0,
            coinIn: 0,
            coinOut: 0,
            gamesPlayed: 0,
            gamesWon: 0,
            handPaidCancelledCredits: 0,
            meterCount: 0,
          };

          const moneyIn = metrics.moneyIn || 0;
          const moneyOut = metrics.moneyOut || 0;
          const jackpot = metrics.jackpot || 0;
          const gross = moneyIn - moneyOut;

          // Get serialNumber with fallback to custom.name
          const serialNumber = (machine.serialNumber as string)?.trim() || '';
          const customName =
            (
              (machine.custom as Record<string, unknown>)?.name as string
            )?.trim() || '';
          const finalSerialNumber = serialNumber || customName || '';

          allMachines.push({
            _id: machineId,
            locationId: locationId,
            locationName: (location.name as string) || '(No Location)',
            assetNumber: finalSerialNumber,
            serialNumber: finalSerialNumber,
            game: String(machine.game || machine.gameType || ''),
            installedGame: String(machine.game || machine.gameType || ''),
            denomination: machine.denomination || '',
            manufacturer: machine.manufacturer || '',
            model: machine.model || '',
            status: machine.status || 'unknown',
            isSasMachine: machine.isSasMachine || false,
            relayId: machine.relayId || '',
            smibBoard: machine.smibBoard || '',
            smbId: machine.relayId || machine.smibBoard || '',
            cabinetType: machine.cabinetType || '',
            assetStatus: machine.assetStatus || '',
            accountingDenomination:
              machine.gameConfig?.accountingDenomination || '1',
            collectionMultiplier: '1',
            isCronosMachine: false,
            createdAt: machine.createdAt,
            updatedAt: machine.updatedAt,
            lastOnline: (machine.lastActivity as Date | undefined) || null,
            lastActivity: (machine.lastActivity as Date | undefined) || null,
            // Calculate online status: machine is online if lastActivity is within last 3 minutes
            online: machine.lastActivity
              ? new Date(machine.lastActivity as Date) >
                new Date(Date.now() - 3 * 60 * 1000)
              : false,
            moneyIn,
            moneyOut,
            gross,
            jackpot: jackpot || 0,
            coinIn: metrics.coinIn || 0,
            coinOut: metrics.coinOut || 0,
            gamesPlayed: metrics.gamesPlayed || 0,
            gamesWon: metrics.gamesWon || 0,
            handPaidCancelledCredits: metrics.handPaidCancelledCredits || 0,
            meterCount: metrics.meterCount || 0,
            rel: location.rel,
            country: location.country,
          });
        });
      }
    } else {
      // Original parallel batch processing for Today/Yesterday (still fast)
      const BATCH_SIZE = 20;
      for (let i = 0; i < locations.length; i += BATCH_SIZE) {
        const batch = locations.slice(i, i + BATCH_SIZE);

        // 🚀 OPTIMIZED: Batch queries instead of N+1 per location
        // Step 1: Get all location IDs in batch
        const batchLocationIds = batch
          .map(loc => String(loc._id))
          .filter(id => gamingDayRanges.has(id));

        if (batchLocationIds.length === 0) continue;

        // Step 2: Get ALL machines for ALL locations in batch (1 query)
        // Build machine match query with online/offline filter
        const batchMachineMatchQuery: Record<string, unknown> = {
          gamingLocation: { $in: batchLocationIds },
          $and: [
            {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2025-01-01') } },
              ],
            },
          ],
        };

        // Apply game type filter if provided
        if (selectedGameTypes.length > 0) {
          console.warn(`[API Batch] Filtering by game types: ${selectedGameTypes.join(', ')}`);
          (batchMachineMatchQuery.$and as Array<Record<string, unknown>>).push({
            $or: [
              { game: { $in: selectedGameTypes } },
              {
                $and: [
                  { $or: [{ game: null }, { game: '' }] },
                  { gameType: { $in: selectedGameTypes } }
                ]
              }
            ]
          });
        }
        
        // Apply online/offline status filter at database level
        if (onlineStatus !== 'all') {
          const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
          if (onlineStatus === 'online') {
            batchMachineMatchQuery.lastActivity = { $gte: threeMinutesAgo };
          } else if (onlineStatus === 'offline') {
            const andArray = batchMachineMatchQuery.$and as Array<Record<string, unknown>>;
            andArray.push({
              $or: [
                { lastActivity: { $lt: threeMinutesAgo } },
                { lastActivity: { $exists: false } },
              ],
            });
          }
        }
        
        const batchAllMachines = await Machine.find(batchMachineMatchQuery).lean();

        if (batchAllMachines.length === 0) continue;

        // Step 3: Group machines by location
        const batchMachinesByLocation = new Map<
          string,
          Array<{ _id: string; [key: string]: unknown }>
        >();
        batchAllMachines.forEach(machine => {
          const locationId = machine.gamingLocation
            ? String(machine.gamingLocation)
            : null;
          if (locationId && batchLocationIds.includes(locationId)) {
            if (!batchMachinesByLocation.has(locationId)) {
              batchMachinesByLocation.set(locationId, []);
            }
            batchMachinesByLocation.get(locationId)!.push(
              machine as {
                _id: string;
                [key: string]: unknown;
              }
            );
          }
        });

        // Step 4: Get global date range for batch
        let batchGlobalStart = new Date();
        let batchGlobalEnd = new Date(0);
        batchLocationIds.forEach(locId => {
          const range = gamingDayRanges.get(locId);
          if (range) {
            if (range.rangeStart < batchGlobalStart)
              batchGlobalStart = range.rangeStart;
            if (range.rangeEnd > batchGlobalEnd)
              batchGlobalEnd = range.rangeEnd;
          }
        });

        // Step 5: Get ALL meters for ALL machines in batch, grouped by machine (1 query)
        const allBatchMachineIds = batchAllMachines.map(m => String(m._id));
        const batchMetersPipeline: PipelineStage[] = [
          {
            $match: {
              machine: { $in: allBatchMachineIds },
              ...(timePeriod !== 'All Time'
                ? {
                    readAt: {
                      $gte: batchGlobalStart,
                      $lte: batchGlobalEnd,
                    },
                  }
                : {}),
            },
          },
          {
            $lookup: {
              from: 'machines',
              localField: 'machine',
              foreignField: '_id',
              as: 'machineDetails',
            },
          },
          {
            $unwind: {
              path: '$machineDetails',
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $addFields: {
              locationId: {
                $toString: '$machineDetails.gamingLocation',
              },
            },
          },
          {
              $group: {
              _id: {
                machine: '$machine',
                locationId: '$locationId',
              },
              moneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
              moneyOut: {
                $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
              },
              jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
                coinIn: { $last: '$coinIn' },
                coinOut: { $last: '$coinOut' },
                gamesPlayed: { $last: '$gamesPlayed' },
                gamesWon: { $last: '$gamesWon' },
                handPaidCancelledCredits: {
                  $last: '$handPaidCancelledCredits',
                },
                meterCount: { $sum: 1 },
              minReadAt: { $min: '$readAt' },
              maxReadAt: { $max: '$readAt' },
              },
          },
        ];

            const batchMetricsAggregation =
          await Meters.aggregate(batchMetersPipeline).exec();

        // Step 6: Filter by gaming day ranges and group by machine
        const metricsByMachine = new Map<
          string,
          {
            moneyIn: number;
            moneyOut: number;
            jackpot: number;
            coinIn: number;
            coinOut: number;
            gamesPlayed: number;
            gamesWon: number;
            handPaidCancelledCredits: number;
            meterCount: number;
          }
        >();

        batchMetricsAggregation.forEach(agg => {
          const machineId = String(agg._id.machine);
          const locationId = String(agg._id.locationId);
          const gameDayRange = gamingDayRanges.get(locationId);
          if (!gameDayRange || timePeriod === 'All Time') {
            // Include all data if no date range or All Time
            metricsByMachine.set(machineId, {
              moneyIn: (agg.moneyIn as number) || 0,
              moneyOut: (agg.moneyOut as number) || 0,
              jackpot: (agg.jackpot as number) || 0,
              coinIn: (agg.coinIn as number) || 0,
              coinOut: (agg.coinOut as number) || 0,
              gamesPlayed: (agg.gamesPlayed as number) || 0,
              gamesWon: (agg.gamesWon as number) || 0,
              handPaidCancelledCredits:
                (agg.handPaidCancelledCredits as number) || 0,
              meterCount: (agg.meterCount as number) || 0,
            });
          } else {
            // Check if within gaming day range
            const minReadAt = new Date(agg.minReadAt as Date);
            const maxReadAt = new Date(agg.maxReadAt as Date);
            const hasValidReadAt =
              (minReadAt >= gameDayRange.rangeStart &&
                minReadAt <= gameDayRange.rangeEnd) ||
              (maxReadAt >= gameDayRange.rangeStart &&
                maxReadAt <= gameDayRange.rangeEnd) ||
              (minReadAt <= gameDayRange.rangeStart &&
                maxReadAt >= gameDayRange.rangeEnd);

            if (hasValidReadAt) {
              // Merge with existing metrics if machine appears in multiple locations
              const existing = metricsByMachine.get(machineId);
              if (existing) {
                existing.moneyIn += (agg.moneyIn as number) || 0;
                existing.moneyOut += (agg.moneyOut as number) || 0;
                existing.jackpot += (agg.jackpot as number) || 0;
                existing.meterCount += (agg.meterCount as number) || 0;
              } else {
                metricsByMachine.set(machineId, {
                  moneyIn: (agg.moneyIn as number) || 0,
                  moneyOut: (agg.moneyOut as number) || 0,
                  jackpot: (agg.jackpot as number) || 0,
                  coinIn: (agg.coinIn as number) || 0,
                  coinOut: (agg.coinOut as number) || 0,
                  gamesPlayed: (agg.gamesPlayed as number) || 0,
                  gamesWon: (agg.gamesWon as number) || 0,
                  handPaidCancelledCredits:
                    (agg.handPaidCancelledCredits as number) || 0,
                  meterCount: (agg.meterCount as number) || 0,
                });
              }
            }
          }
        });

        // Step 7: Build machine objects with metrics for each location
        const batchResults: unknown[] = [];
        batch.forEach(location => {
          const locationIdStr = String(location._id);
          const locationMachines =
            batchMachinesByLocation.get(locationIdStr) || [];

          if (locationMachines.length === 0) return;

          const locationResults = locationMachines.map(machine => {
            const machineId = String(machine._id);
            const metrics = metricsByMachine.get(machineId) || {
                moneyIn: 0,
                moneyOut: 0,
                jackpot: 0,
                coinIn: 0,
                coinOut: 0,
                gamesPlayed: 0,
                gamesWon: 0,
                handPaidCancelledCredits: 0,
                meterCount: 0,
              };

              const moneyIn = metrics.moneyIn || 0;
              const moneyOut = metrics.moneyOut || 0;
              const jackpot = metrics.jackpot || 0;
              const coinIn = metrics.coinIn || 0;
              const coinOut = metrics.coinOut || 0;
              const gamesPlayed = metrics.gamesPlayed || 0;
              const gamesWon = metrics.gamesWon || 0;
              const gross = moneyIn - moneyOut;

              // Get serialNumber with fallback to custom.name
            const serialNumber = (machine.serialNumber as string)?.trim() || '';
              const customName =
                (
                  (machine.custom as Record<string, unknown>)?.name as string
                )?.trim() || '';
              const finalSerialNumber = serialNumber || customName || '';

              return {
                _id: machineId,
                locationId: locationIdStr,
                locationName: (location.name as string) || '(No Location)',
                assetNumber: finalSerialNumber,
                serialNumber: finalSerialNumber,
                smbId: machine.relayId || '',
                relayId: machine.relayId || '',
                installedGame: String(machine.game || machine.gameType || ''),
                game: String(machine.game || machine.gameType || ''),
                manufacturer:
                machine.manufacturer || machine.manuf || 'Unknown Manufacturer',
                status: machine.assetStatus || '',
                assetStatus: machine.assetStatus || '',
                cabinetType: machine.cabinetType || '',
                accountingDenomination:
                ((machine.gameConfig as Record<string, unknown>)
                  ?.accountingDenomination as string) || '1',
                collectionMultiplier: '1',
                isCronosMachine: false,
              lastOnline: (machine.lastActivity as Date | undefined) || null,
              lastActivity: (machine.lastActivity as Date | undefined) || null,
                // Calculate online status: machine is online if lastActivity is within last 3 minutes
                online: machine.lastActivity
                ? new Date(machine.lastActivity as Date) >
                    new Date(Date.now() - 3 * 60 * 1000)
                  : false,
              createdAt: machine.createdAt as Date | undefined,
                timePeriod: timePeriod,
                moneyIn,
                moneyOut,
                cancelledCredits: moneyOut,
                jackpot,
                gross,
                coinIn,
                coinOut,
                gamesPlayed,
                gamesWon,
              };
            });
          batchResults.push(...locationResults);
        });

        // Add batch results to allMachines
        allMachines.push(...(batchResults as typeof allMachines));
      }
    }

    // ============================================================================
    // STEP 9: Apply search filter
    // ============================================================================
    // Apply search filter if provided (search by serial number, custom.name, relay ID, smib ID, or machine _id)
    let filteredMachines = allMachines;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredMachines = allMachines.filter(machine => {
        const machineRecord = machine as Record<string, unknown>;
        // Search in serialNumber (which already includes custom.name fallback)
        const matchesSerialNumber = (
          machineRecord.serialNumber as string | undefined
        )
          ?.toLowerCase()
          .includes(searchLower);
        const matchesRelayId = (machineRecord.relayId as string | undefined)
          ?.toLowerCase()
          .includes(searchLower);
        const matchesSmbId = (machineRecord.smbId as string | undefined)
          ?.toLowerCase()
          .includes(searchLower);
        // Search by _id (case-insensitive)
        const matchesId = (machineRecord._id as string | undefined)
          ?.toLowerCase()
          .includes(searchLower);
        // Also check custom.name directly if available
        const customName =
          (
            (machineRecord.custom as Record<string, unknown>)?.name ||
            (machineRecord.Custom as Record<string, unknown>)?.name
          )
            ?.toString()
            .toLowerCase() || '';
        const matchesCustomName = customName.includes(searchLower);

        return (
          matchesSerialNumber ||
          matchesRelayId ||
          matchesSmbId ||
          matchesId ||
          matchesCustomName
        );
      });
    }

    // ============================================================================
    // STEP 10: Apply currency conversion if needed
    // ============================================================================
    // Get current user's role to determine if currency conversion should apply
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const isAdminOrDev =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer');

    // Currency conversion ONLY for Admin/Developer when viewing "All Licensees"
    // Managers and other users ALWAYS see native currency (TTD for TTG, GYD for Cabana, etc.)
    if (isAdminOrDev && shouldApplyCurrencyConversion(licensee)) {
      // Get licensee details for currency mapping
      const db = await connectDB();
      if (!db) {
        return NextResponse.json(
          { error: 'DB connection failed' },
          { status: 500 }
        );
      }

      const { Licencee } = await import('@/app/api/lib/models/licencee');
      const licenseesData = await Licencee.find(
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          },
        { _id: 1, name: 1 }
        )
        .lean()
        .exec();

      // Create a map of licensee ID to name
      const licenseeIdToName = new Map<string, string>();
      licenseesData.forEach(lic => {
        licenseeIdToName.set(String(lic._id), lic.name);
      });

      // Get country details for currency mapping
      const { getCountryCurrency, getLicenseeCurrency, convertToUSD } =
        await import('@/lib/helpers/rates');
      const countriesData = await Countries.find({}).lean();
      const countryIdToName = new Map<string, string>();
      countriesData.forEach(country => {
        if (country._id && country.name) {
          countryIdToName.set(String(country._id), country.name);
        }
      });

      // Get location details for each machine to determine licensee
      const locationDetailsMap = new Map();
      for (const location of locations) {
        const locationIdStr = (
          location._id as { toString: () => string }
        ).toString();
        locationDetailsMap.set(locationIdStr, location);
      }

      // Convert each machine's financial data
      // Meter values are stored in the location's native currency
      // Convert from native currency to USD, then to display currency
      filteredMachines = filteredMachines.map(machine => {
        const locationDetails = locationDetailsMap.get(machine.locationId);
        const machineLicenseeId = locationDetails?.rel?.licencee as
          | string
          | undefined;

        let nativeCurrency: string = 'USD';

        if (!machineLicenseeId) {
          // Unassigned machines - determine currency from country
          const countryId = locationDetails?.country as string | undefined;
          const countryName = countryId
            ? countryIdToName.get(countryId.toString())
            : undefined;
          nativeCurrency = countryName
            ? getCountryCurrency(countryName)
            : 'USD';
        } else {
          // Get licensee's native currency
          const licenseeName =
            licenseeIdToName.get(machineLicenseeId.toString()) || 'Unknown';
          nativeCurrency = getLicenseeCurrency(licenseeName);
        }

        // Convert from native currency to USD, then to display currency
        const machineRecord = machine as Record<string, unknown>;
        const moneyInUSD = convertToUSD(
          (machineRecord.moneyIn as number) || 0,
          nativeCurrency
        );
        const moneyOutUSD = convertToUSD(
          (machineRecord.moneyOut as number) || 0,
          nativeCurrency
        );
        const cancelledCreditsUSD = convertToUSD(
          (machineRecord.cancelledCredits as number) || 0,
          nativeCurrency
        );
        const jackpotUSD = convertToUSD(
          (machineRecord.jackpot as number) || 0,
          nativeCurrency
        );
        const grossUSD = convertToUSD(
          (machineRecord.gross as number) || 0,
          nativeCurrency
        );
        const coinInUSD = convertToUSD(
          (machineRecord.coinIn as number) || 0,
          nativeCurrency
        );
        const coinOutUSD = convertToUSD(
          (machineRecord.coinOut as number) || 0,
          nativeCurrency
        );

        return {
          ...machine,
          moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
          moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
          cancelledCredits: convertFromUSD(
            cancelledCreditsUSD,
            displayCurrency
          ),
          jackpot: convertFromUSD(jackpotUSD, displayCurrency),
          gross: convertFromUSD(grossUSD, displayCurrency),
          coinIn: convertFromUSD(coinInUSD, displayCurrency),
          coinOut: convertFromUSD(coinOutUSD, displayCurrency),
        };
      });
    }

    // ============================================================================
    // STEP 10.5: Sort machines by moneyIn descending (default sort)
    // ============================================================================
    // Sort machines by moneyIn (highest first) so pagination returns top performers first
    // This ensures the first page shows machines with actual financial data
    filteredMachines.sort((a, b) => {
      const aRecord = a as Record<string, unknown>;
      const bRecord = b as Record<string, unknown>;
      return (
        ((bRecord.moneyIn as number) || 0) - ((aRecord.moneyIn as number) || 0)
      );
    });

    // ============================================================================
    // STEP 11: Apply pagination
    // ============================================================================
    type DebugInfo = {
      userAccessibleLicensees: string[] | 'all';
      userRoles: string[];
      userLocationPermissions: string[];
      licenseeParam: string | null | undefined;
      allowedLocationIds: string | string[];
      locationsFound: number;
      locationSample: Array<{ id: string; name: string; licensee?: string }>;
      machinesReturned: number;
      totalMachines?: number;
      timePeriod: string | undefined;
    }

    // Apply pagination if limit is provided
    const totalCount = filteredMachines.length;
    let paginatedMachines = filteredMachines;

    if (limit) {
      const skip = (page - 1) * limit;
      paginatedMachines = filteredMachines.slice(skip, skip + limit);
    }

    type ApiResponse = {
      success: boolean;
      data: typeof paginatedMachines;
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      debug?: DebugInfo;
    }

    // ============================================================================
    // STEP 12: Return aggregated machine data
    // ============================================================================
    const response: ApiResponse = {
      success: true,
      data: paginatedMachines,
    };

    // Add pagination info if limit is provided
    if (limit) {
      response.pagination = {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      };
    }

    // DEBUG: Add debug info if ?debug=true
    if (debug) {
      response.debug = {
        userAccessibleLicensees,
        userRoles,
        userLocationPermissions,
        licenseeParam: licensee,
        allowedLocationIds:
          allowedLocationIds === 'all'
            ? 'ALL'
            : allowedLocationIds?.slice(0, 10),
        locationsFound: locations.length,
        locationSample: locations.slice(0, 3).map(l => ({
          id: String(l._id),
          name: String(l.name),
          licensee: l.rel?.licencee ? String(l.rel.licencee) : undefined,
        })),
        machinesReturned: paginatedMachines.length,
        totalMachines: totalCount,
        timePeriod: timePeriodForGamingDay,
      };
    }

    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(`[Machines Aggregation API] Completed in ${duration}ms`);
    }
    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Aggregation failed';
    console.error(
      `[Machines Aggregation API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

