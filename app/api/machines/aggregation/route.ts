import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import { MachineAggregationMatchStage } from '@/shared/types/mongo';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD, convertToUSD } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { getUserAccessibleLicenseesFromToken, getUserLocationFilter } from '../../lib/helpers/licenseeFilter';
import { getUserFromServer } from '../../lib/helpers/users';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // Get parameters from search params
    const locationId = searchParams.get('locationId');
    const searchTerm = searchParams.get('search')?.trim() || '';
    // Support both 'licensee' and 'licencee' spelling for backwards compatibility
    const licensee = searchParams.get('licensee') || searchParams.get('licencee');
    const timePeriod = searchParams.get('timePeriod');
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Get user's accessible licensees, roles, and location permissions
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    const userLocationPermissions = 
      (userPayload?.resourcePermissions as { 'gaming-locations'?: { resources?: string[] } })?.['gaming-locations']?.resources || [];

    console.log('[MACHINES AGGREGATION] User accessible licensees:', userAccessibleLicensees);
    console.log('[MACHINES AGGREGATION] User roles:', userRoles);
    console.log('[MACHINES AGGREGATION] User location permissions:', userLocationPermissions);
    console.log('[MACHINES AGGREGATION] Licensee filter:', licensee);

    // Get allowed location IDs (intersection of licensee + location permissions, respecting roles)
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      licensee || undefined,
      userLocationPermissions,
      userRoles
    );

    console.log('[MACHINES AGGREGATION] Allowed location IDs:', allowedLocationIds);

    // DEBUG: Return debug info if ?debug=true
    const debug = searchParams.get('debug') === 'true';

    // If user has no accessible locations, return empty
    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      console.log('[MACHINES AGGREGATION] No accessible locations - returning empty array');
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
            reason: 'No accessible locations'
          }
        });
      }
      return NextResponse.json(response);
    }

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
      if (allowedLocationIds !== 'all' && !allowedLocationIds.includes(locationId)) {
        console.log('[MACHINES AGGREGATION] User does not have access to location:', locationId);
        return NextResponse.json({ success: true, data: [] });
      }
      matchStage._id = locationId;
    } else if (allowedLocationIds !== 'all') {
      // Apply allowed locations filter
      matchStage._id = { $in: allowedLocationIds };
    }

    console.log('[MACHINES AGGREGATION] Location match stage:', matchStage);

    // Get all locations with their gameDayOffset
    const locations = await GamingLocations.find(matchStage).lean();

    console.log('[MACHINES AGGREGATION] Found locations:', locations.length);

    if (locations.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

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

    // 🚀 OPTIMIZED: For 30d periods, use single aggregation across all machines
    // For shorter periods, use parallel batch processing per location
    const allMachines: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const useSingleAggregation = timePeriod === '30d' || timePeriod === '7d';

    console.log(`[MACHINES AGGREGATION] Processing ${locations.length} locations${useSingleAggregation ? ' with single aggregation' : ' in batches'}`);
    const startTime = Date.now();

    if (useSingleAggregation) {
      // 🚀 SUPER OPTIMIZED: Single aggregation for ALL machines (much faster for 30d)
      // Get all machines for all locations
      const allLocationIds = locations.map(loc => (loc._id as { toString: () => string }).toString());
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
          const machineId = (machine._id as { toString: () => string }).toString();
          machineToLocation.set(machineId, machine.gamingLocation);
        });

        // Get ALL machine IDs
        const allMachineIds = allLocationMachines.map(machine =>
          (machine._id as { toString: () => string }).toString()
        );

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

        // Since gaming day ranges might differ per location, we need to aggregate per machine
        // But we can do it in ONE query by using $facet or by finding the overall min/max range
        // For simplicity, let's use the earliest start and latest end across all locations
        let globalStart = new Date();
        let globalEnd = new Date(0);
        locationRanges.forEach(range => {
          if (range.rangeStart < globalStart) globalStart = range.rangeStart;
          if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const singlePipeline: any[] = [
          {
            $match: {
              machine: { $in: allMachineIds },
              readAt: {
                $gte: globalStart,
                $lte: globalEnd,
              },
            },
          },
          // 🚀 OPTIMIZATION: Project only needed fields BEFORE grouping (reduces memory usage)
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
              handPaidCancelledCredits: { $last: '$handPaidCancelledCredits' },
              meterCount: { $sum: 1 },
            },
          },
        ];

        // 🚀 OPTIMIZATION: Execute aggregation with performance options
        const allMetrics = await Meters.aggregate(singlePipeline, {
          allowDiskUse: true,
          maxTimeMS: 90000,
        });

        // Create metrics map
        const metricsMap = new Map();
        allMetrics.forEach(metrics => {
          metricsMap.set(metrics._id, metrics);
        });

        // Build machine objects
        allLocationMachines.forEach(machine => {
          const machineId = (machine._id as { toString: () => string }).toString();
          const locationId = machineToLocation.get(machineId);
          const location = locations.find(loc => 
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

          allMachines.push({
            _id: machineId,
            locationId: locationId,
            locationName: (location.name as string) || '(No Location)',
            assetNumber: machine.serialNumber || '',
            serialNumber: machine.serialNumber || '',
            game: machine.game || '',
            installedGame: machine.game || '',
            denomination: machine.denomination || '',
            manufacturer: machine.manufacturer || '',
            model: machine.model || '',
            status: machine.status || 'unknown',
            isSasMachine: machine.isSasMachine || false,
            lastActivity: machine.lastActivity || null,
            // Calculate online status: machine is online if lastActivity is within last 3 minutes
            online: machine.lastActivity 
              ? new Date(machine.lastActivity) > new Date(Date.now() - 3 * 60 * 1000)
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
        batch.map(async (location) => {
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
              handPaidCancelledCredits: { $last: '$handPaidCancelledCredits' },
              meterCount: { $sum: 1 },
            },
          });

          const batchMetricsAggregation = await Meters.aggregate(batchPipeline);

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

            return {
              _id: machineId,
              locationId: locationIdStr,
              locationName: (location.name as string) || '(No Location)',
              assetNumber: machine.serialNumber || '',
              serialNumber: machine.serialNumber || '',
              smbId: machine.relayId || '',
              relayId: machine.relayId || '',
              installedGame: machine.game || '',
              game: machine.game || '',
              manufacturer:
                machine.manufacturer || machine.manuf || 'Unknown Manufacturer',
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
                ? new Date(machine.lastActivity) > new Date(Date.now() - 3 * 60 * 1000)
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

    const queryTime = Date.now() - startTime;
    console.log(`[MACHINES AGGREGATION] ⚡ Processed ${locations.length} locations in ${queryTime}ms (${(queryTime / 1000).toFixed(2)}s)`);

    // Apply search filter if provided (search by serial number, relay ID, smib ID, or machine _id)
    let filteredMachines = allMachines;
    if (searchTerm) {
      filteredMachines = allMachines.filter(
        machine =>
          machine.serialNumber
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          machine.relayId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine.smbId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine._id === searchTerm // Exact match for _id
      );
    }

    // Get current user's role to determine if currency conversion should apply
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const isAdminOrDev = currentUserRoles.includes('admin') || currentUserRoles.includes('developer');
    
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
      const { getCountryCurrency } = await import('@/lib/helpers/rates');
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
      filteredMachines = filteredMachines.map(machine => {
        // Get licensee from the machine's location
        const locationDetails = locationDetailsMap.get(machine.locationId);
        const machineLicenseeId = locationDetails?.rel?.licencee as
          | string
          | undefined;

        if (!machineLicenseeId) {
          // Unassigned machines - determine currency from country
          const countryId = locationDetails?.country as string | undefined;
          const countryName = countryId
            ? countryIdToName.get(countryId.toString())
            : undefined;
          const nativeCurrency = countryName
            ? getCountryCurrency(countryName)
            : 'USD';

          // Convert from country's native currency to display currency
          const moneyInUSD = convertToUSD(machine.moneyIn || 0, nativeCurrency);
          const moneyOutUSD = convertToUSD(machine.moneyOut || 0, nativeCurrency);
          const cancelledCreditsUSD = convertToUSD(machine.cancelledCredits || 0, nativeCurrency);
          const jackpotUSD = convertToUSD(machine.jackpot || 0, nativeCurrency);
          const grossUSD = convertToUSD(machine.gross || 0, nativeCurrency);
          const coinInUSD = convertToUSD(machine.coinIn || 0, nativeCurrency);
          const coinOutUSD = convertToUSD(machine.coinOut || 0, nativeCurrency);

          return {
            ...machine,
            moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
            moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
            cancelledCredits: convertFromUSD(cancelledCreditsUSD, displayCurrency),
            jackpot: convertFromUSD(jackpotUSD, displayCurrency),
            gross: convertFromUSD(grossUSD, displayCurrency),
            coinIn: convertFromUSD(coinInUSD, displayCurrency),
            coinOut: convertFromUSD(coinOutUSD, displayCurrency),
          };
        }

        const licenseeName =
          licenseeIdToName.get(machineLicenseeId.toString()) || 'Unknown';

        // Convert from licensee's native currency to USD, then to display currency
        const moneyInUSD = convertToUSD(machine.moneyIn || 0, licenseeName);
        const moneyOutUSD = convertToUSD(machine.moneyOut || 0, licenseeName);
        const cancelledCreditsUSD = convertToUSD(
          machine.cancelledCredits || 0,
          licenseeName
        );
        const jackpotUSD = convertToUSD(machine.jackpot || 0, licenseeName);
        const grossUSD = convertToUSD(machine.gross || 0, licenseeName);
        const coinInUSD = convertToUSD(machine.coinIn || 0, licenseeName);
        const coinOutUSD = convertToUSD(machine.coinOut || 0, licenseeName);

        return {
          ...machine,
          moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
          moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
          cancelledCredits: convertFromUSD(cancelledCreditsUSD, displayCurrency),
          jackpot: convertFromUSD(jackpotUSD, displayCurrency),
          gross: convertFromUSD(grossUSD, displayCurrency),
          coinIn: convertFromUSD(coinInUSD, displayCurrency),
          coinOut: convertFromUSD(coinOutUSD, displayCurrency),
        };
      });
    }

    interface DebugInfo {
      userAccessibleLicensees: string[] | 'all';
      userRoles: string[];
      userLocationPermissions: string[];
      licenseeParam: string | null | undefined;
      allowedLocationIds: string | string[];
      locationsFound: number;
      locationSample: Array<{ id: string; name: string; licensee?: string }>;
      machinesReturned: number;
      timePeriod: string | undefined;
    }

    interface ApiResponse {
      success: boolean;
      data: typeof filteredMachines;
      debug?: DebugInfo;
    }

    const response: ApiResponse = { success: true, data: filteredMachines };
    
    // DEBUG: Add debug info if ?debug=true
    if (debug) {
      response.debug = {
        userAccessibleLicensees,
        userRoles,
        userLocationPermissions,
        licenseeParam: licensee,
        allowedLocationIds: allowedLocationIds === 'all' ? 'ALL' : allowedLocationIds?.slice(0, 10),
        locationsFound: locations.length,
        locationSample: locations.slice(0, 3).map((l) => ({ 
          id: String(l._id), 
          name: String(l.name), 
          licensee: l.rel?.licencee ? String(l.rel.licencee) : undefined 
        })),
        machinesReturned: filteredMachines.length,
        timePeriod: timePeriodForGamingDay
      };
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in machineAggregation route:', error);
    return NextResponse.json(
      { success: false, error: 'Aggregation failed', details: String(error) },
      { status: 500 }
    );
  }
}
