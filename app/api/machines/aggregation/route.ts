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
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD } from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import { MachineAggregationMatchStage } from '@/shared/types/mongo';
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
    const locationId = searchParams.get('locationId');
    const searchTerm = searchParams.get('search')?.trim() || '';
    // Support both 'licensee' and 'licencee' spelling for backwards compatibility
    const licensee =
      searchParams.get('licensee') || searchParams.get('licencee');
    const timePeriod = searchParams.get('timePeriod');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

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
    if (Array.isArray((userPayload as { assignedLocations?: string[] })?.assignedLocations)) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] }).assignedLocations;
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
      // Parse dates - gaming day offset will be applied by getGamingDayRangeForPeriod
      customStartDateForGamingDay = new Date(startDateParam + 'T00:00:00.000Z');
      customEndDateForGamingDay = new Date(endDateParam + 'T00:00:00.000Z');
    } else {
      timePeriodForGamingDay = timePeriod;
    }

    // Build location match stage with access control
    const matchStage: MachineAggregationMatchStage = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    // Apply location filter based on user permissions
    if (locationId) {
      // Specific location requested - validate access
      if (
        allowedLocationIds !== 'all' &&
        !allowedLocationIds.includes(locationId)
      ) {
        return NextResponse.json({ success: true, data: [] });
      }
      matchStage._id = locationId;
    } else if (allowedLocationIds !== 'all') {
      // Apply allowed locations filter
      matchStage._id = { $in: allowedLocationIds };
    }

    // Get all locations with their gameDayOffset
    const locations = await GamingLocations.find(matchStage).lean();

    if (locations.length === 0) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allMachines: any[] = [];
    const useSingleAggregation = timePeriod === '30d' || timePeriod === '7d';

    if (useSingleAggregation) {
      // 🚀 SUPER OPTIMIZED: Single aggregation for ALL machines (much faster for 30d)
      // Get all machines for all locations
      const allLocationIds = locations.map(loc =>
        (loc._id as { toString: () => string }).toString()
      );
      const allLocationMachines = await Machine.find({
        gamingLocation: { $in: allLocationIds },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }).lean();

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allMetrics: any[] = [];

        // Process each location's machines with their specific gaming day range
        await Promise.all(
          Array.from(machinesByLocation.entries()).map(
            async ([locationId, machineIds]) => {
              const gameDayRange = locationRanges.get(locationId);
              if (!gameDayRange) return;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const locationPipeline: any[] = [
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

              const locationMetrics = await Meters.aggregate(locationPipeline, {
                allowDiskUse: true,
                maxTimeMS: 90000,
              });

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
            game: machine.game || '',
            installedGame: machine.game || '',
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
            lastOnline: machine.lastActivity,
            lastActivity: machine.lastActivity || null,
            // Calculate online status: machine is online if lastActivity is within last 3 minutes
            online: machine.lastActivity
              ? new Date(machine.lastActivity) >
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

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async location => {
            const locationIdStr = (
              location._id as { toString: () => string }
            ).toString();
            const gameDayRange = gamingDayRanges.get(locationIdStr);

            if (!gameDayRange) return [];

            // Get machines for this location
            const locationMachines = await Machine.find({
              gamingLocation: locationIdStr,
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
            }).lean();

            if (locationMachines.length === 0) return [];

            // Fetch all metrics for machines in this location (single aggregation)
            const machineIds = locationMachines.map(machine =>
              (machine._id as { toString: () => string }).toString()
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const batchPipeline: any[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const batchMatchStage: any = {
              machine: { $in: machineIds },
            };

            if (timePeriod !== 'All Time') {
              batchMatchStage.readAt = {
                $gte: gameDayRange.rangeStart,
                $lte: gameDayRange.rangeEnd,
              };
            }

            batchPipeline.push({ $match: batchMatchStage });
            batchPipeline.push({
              $group: {
                _id: '$machine',
                moneyIn: { $sum: '$movement.drop' },
                moneyOut: { $sum: '$movement.totalCancelledCredits' },
                jackpot: { $sum: '$movement.jackpot' },
                coinIn: { $last: '$coinIn' },
                coinOut: { $last: '$coinOut' },
                gamesPlayed: { $last: '$gamesPlayed' },
                gamesWon: { $last: '$gamesWon' },
                handPaidCancelledCredits: {
                  $last: '$handPaidCancelledCredits',
                },
                meterCount: { $sum: 1 },
              },
            });

            const batchMetricsAggregation =
              await Meters.aggregate(batchPipeline);

            // Create metrics map for fast lookup
            const metricsMap = new Map();
            batchMetricsAggregation.forEach(metrics => {
              metricsMap.set(metrics._id, metrics);
            });

            // Build machine objects with metrics
            return locationMachines.map(machine => {
              const machineId = (
                machine._id as { toString: () => string }
              ).toString();

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
              const coinIn = metrics.coinIn || 0;
              const coinOut = metrics.coinOut || 0;
              const gamesPlayed = metrics.gamesPlayed || 0;
              const gamesWon = metrics.gamesWon || 0;
              const gross = moneyIn - moneyOut;

              // Get serialNumber with fallback to custom.name
              const serialNumber =
                (machine.serialNumber as string)?.trim() || '';
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
                installedGame: machine.game || '',
                game: machine.game || '',
                manufacturer:
                  machine.manufacturer ||
                  machine.manuf ||
                  'Unknown Manufacturer',
                status: machine.assetStatus || '',
                assetStatus: machine.assetStatus || '',
                cabinetType: machine.cabinetType || '',
                accountingDenomination:
                  machine.gameConfig?.accountingDenomination || '1',
                collectionMultiplier: '1',
                isCronosMachine: false,
                lastOnline: machine.lastActivity,
                lastActivity: machine.lastActivity,
                // Calculate online status: machine is online if lastActivity is within last 3 minutes
                online: machine.lastActivity
                  ? new Date(machine.lastActivity) >
                    new Date(Date.now() - 3 * 60 * 1000)
                  : false,
                createdAt: machine.createdAt,
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
          })
        );

        // Flatten batch results and add to allMachines
        batchResults.forEach(machines => {
          allMachines.push(...machines);
        });
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
        // Search in serialNumber (which already includes custom.name fallback)
        const matchesSerialNumber = machine.serialNumber
          ?.toLowerCase()
          .includes(searchLower);
        const matchesRelayId = machine.relayId
          ?.toLowerCase()
          .includes(searchLower);
        const matchesSmbId = machine.smbId?.toLowerCase().includes(searchLower);
        // Search by _id (case-insensitive)
        const matchesId = machine._id?.toLowerCase().includes(searchLower);
        // Also check custom.name directly if available
        const machineRecord = machine as Record<string, unknown>;
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

      const licenseesData = await db
        .collection('licencees')
        .find(
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
          },
          { projection: { _id: 1, name: 1 } }
        )
        .toArray();

      // Create a map of licensee ID to name
      const licenseeIdToName = new Map<string, string>();
      licenseesData.forEach(lic => {
        licenseeIdToName.set(lic._id.toString(), lic.name);
      });

      // Get country details for currency mapping
      const { getCountryCurrency, getLicenseeCurrency, convertToUSD } =
        await import('@/lib/helpers/rates');
      const countriesData = await db.collection('countries').find({}).toArray();
      const countryIdToName = new Map<string, string>();
      countriesData.forEach(country => {
        countryIdToName.set(country._id.toString(), country.name);
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
        const moneyInUSD = convertToUSD(machine.moneyIn || 0, nativeCurrency);
        const moneyOutUSD = convertToUSD(machine.moneyOut || 0, nativeCurrency);
        const cancelledCreditsUSD = convertToUSD(
          machine.cancelledCredits || 0,
          nativeCurrency
        );
        const jackpotUSD = convertToUSD(machine.jackpot || 0, nativeCurrency);
        const grossUSD = convertToUSD(machine.gross || 0, nativeCurrency);
        const coinInUSD = convertToUSD(machine.coinIn || 0, nativeCurrency);
        const coinOutUSD = convertToUSD(machine.coinOut || 0, nativeCurrency);

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
    // STEP 11: Apply pagination
    // ============================================================================
    interface DebugInfo {
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

    interface ApiResponse {
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
