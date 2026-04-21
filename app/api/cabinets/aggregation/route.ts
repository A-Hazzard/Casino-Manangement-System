/**
 * Cabinets Aggregation API Route
 *
 * This route handles aggregating machine data across multiple locations.
 * It supports:
 * - Time period filtering (today, week, month, custom dates)
 * - Licencee filtering
 * - Location filtering
 * - Search functionality
 * - Currency conversion (Admin/Developer only for "All Licencees")
 * - Gaming day offset calculations per location
 * - Pagination
 * - Optimized batch processing for performance
 *
 * @module app/api/cabinets/aggregation/route
 */

import { getUserAccessibleLicenceesFromToken, getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import { connectDB } from '@/app/api/lib/middleware/db';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD } from '@/lib/helpers/rates';
import type { LocationDocument } from '@/lib/types/common';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import { MachineAggregationMatchStage } from '@/shared/types/mongo';
import { formatDistanceToNow } from 'date-fns';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
/**
 * Main GET handler for Cabinet Aggregation
 *
 * @param {string} locationId - Comma-separated location IDs to filter by
 * @param {string} gameType - Comma-separated game types to filter by
 * @param {string} search - Search query for serial, name, or SMIB
 * @param {string} licencee - Filter machines by licencee name
 * @param {string} timePeriod - Time range preset ('Today', 'Yesterday', '7d', '30d', 'Custom', 'LastHour')
 * @param {string} currency - Target currency code for values (e.g., 'USD', 'GYD')
 * @param {string} onlineStatus - Filter by status ('online', 'offline', 'never-online', 'archived')
 * @param {string} smibStatus - Filter by SMIB presence ('smib', 'no-smib')
 * @param {string} membership - Filter by membership status ('enabled', 'disabled')
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 * @param {string} startDate - ISO date for custom range start
 * @param {string} endDate - ISO date for custom range end
 * @param {boolean} debug - Enabled detailed metadata in response
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (locationId, search, licencee, timePeriod, currency, pagination)
 * 3. Validate timePeriod parameter
 * 4. Get user's accessible licencees and permissions
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
  return withApiAuth(req, async ({ user: userPayload, userRoles, isAdminOrDev }) => {
    const startTime = Date.now();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);

    // Get parameters from search params
    const locationIdsParam = searchParams.get('locationId') || searchParams.get('locationIds');
    const locationIdArray = locationIdsParam
      ? locationIdsParam.split(',').filter(id => id && id !== 'all' && id !== 'null')
      : [];

    // Support multiple game types
    const gameTypesParam = searchParams.get('gameType') || searchParams.get('gameTypes');
    const selectedGameTypes = gameTypesParam
      ? gameTypesParam.split(',').filter(type => type && type !== 'all' && type !== 'null')
      : [];

    const searchTerm = searchParams.get('search')?.trim() || '';
    const licencee = searchParams.get('licencee');
    let timePeriod = searchParams.get('timePeriod');
    const displayCurrency = (searchParams.get('currency') as CurrencyCode) || 'USD';
    const rawOnlineStatus = searchParams.get('onlineStatus') || 'all';
    const onlineStatus = rawOnlineStatus.toLowerCase();
    const rawSmibStatus = searchParams.get('smibStatus') || 'all';
    const smibStatus = rawSmibStatus.toLowerCase();
    const membership = searchParams.get('membership')?.toLowerCase() || 'all';

    // Pagination parameters
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;

    // ============================================================================
    // STEP 3: Validate timePeriod parameter
    // ============================================================================
    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
        { status: 400 }
      );
    }
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // ============================================================================
    // STEP 4: Get user's accessible licencees and permissions
    // ============================================================================
    const userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
    let userLocationPermissions: string[] = [];
    if (Array.isArray((userPayload as { assignedLocations?: string[] })?.assignedLocations)) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] }).assignedLocations;
    }

    // Get allowed location IDs (intersection of licencee + location permissions, respecting roles)
    let allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicencees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // CRITICAL: For Admins and Developers, if specific locations are requested,
    // we bypass the restrictive allowedLocationIds check (which might be filtered by a stale licencee UI tag)
    // to ensure they can see the data for the location they are specifically viewing.
    const isAdmin = userRoles.map(r => r?.toLowerCase?.() ?? r).some(r => r === 'admin' || r === 'developer' || r === 'owner');
    if (isAdmin && locationIdArray.length > 0) {
      allowedLocationIds = 'all';
    }

    // ============================================================================
    // STEP 4.5: Technician Restriction - Force last hour meter data
    // ============================================================================
    const userRolesLower = userRoles.map(r => r?.toLowerCase?.() ?? String(r).toLowerCase());
    const isOnlyTechnician = userRolesLower.includes('technician') && !userRolesLower.some(r => ['admin', 'developer', 'manager', 'location admin', 'owner'].includes(r));
    if (isOnlyTechnician && !isAdmin) {
      console.warn('[Cabinet Aggregation API] Applying technician restriction: forcing LastHour timePeriod');
      timePeriod = 'LastHour';
    }

    // DEBUG: Return debug info if ?debug=true
    const debug = searchParams.get('debug') === 'true';

    // If user has no accessible locations, return empty
    if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
      const response = { success: true, data: [] };
      if (debug) {
        return NextResponse.json({
          ...response,
          debug: {
            userAccessibleLicencees,
            userRoles,
            userLocationPermissions,
            licenceeParam: licencee,
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

    const isArchivedRequested = onlineStatus === 'archived';
    const deletedFilter: Record<string, unknown> = isArchivedRequested
      ? { deletedAt: { $ne: null, $gte: new Date('2025-01-01') } }
      : {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      };

    // Build location match stage with access control
    // If archived is requested, we need to fetch all locations (both active and archived)
    // to find archived machines within them.
    const matchStage: MachineAggregationMatchStage = isArchivedRequested
      ? {}
      : {
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
        return allowedLocationIds === 'all' || allowedLocationIds.some((id: string) => String(id) === idStr);
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

  // Apply membership filter
  if (membership === 'enabled') {
    matchStage.membershipEnabled = true;
  } else if (membership === 'disabled') {
    matchStage.membershipEnabled = false;
  }

  // Get all locations with their gameDayOffset
  const locations = (await GamingLocations.find(matchStage).lean()) as unknown as LocationDocument[];
  console.warn(`[API] Found ${locations.length} locations`);

  if (locations.length === 0) {
    console.warn('[API] No locations found in database');
    return NextResponse.json({ success: true, data: [] });
  }

    // Fetch licencee settings for all locations in the query.
    // rel?.licencee is string[] per the schema — flatten to individual IDs.
    const rawLicenceeRels = locations.map(loc => loc.rel?.licencee).filter(Boolean);
    const licenceeIds = Array.from(new Set(
      rawLicenceeRels.flatMap(rel => Array.isArray(rel) ? rel : [rel as string])
    ));
    const licencees = await Licencee.find({ _id: { $in: licenceeIds } }).lean();
    const licenceeIncludeJackpotMap = new Map(licencees.map(l => [String(l._id), !!l.includeJackpot]));

    // ============================================================================
    // STEP 7: Calculate gaming day ranges per location
    // ============================================================================
    // Calculate gaming day ranges for each location
    // Always use gaming day offset logic (including for custom dates)
    const gamingDayRanges = getGamingDayRangesForLocations(
      locations.map((loc) => {
        const locRecord = loc as Record<string, unknown>;
        const rel = locRecord.rel as Record<string, unknown> | undefined;
        return {
          _id: String(locRecord._id),
          gameDayOffset: (locRecord.gameDayOffset as number) ?? 8, // Default to 8 AM Trinidad time
          includeJackpot: (() => {
            const licId = Array.isArray(rel?.licencee) ? rel?.licencee[0] : rel?.licencee;
            return licId ? (licenceeIncludeJackpotMap.get(String(licId)) || false) : false;
          })(),
        };
      }),
      timePeriodForGamingDay,
      customStartDateForGamingDay,
      customEndDateForGamingDay
    );

    // ============================================================================
    // STEP 8: Aggregate machine metrics (optimized for 30d/7d vs Today/Yesterday)
    // ============================================================================
    // 🚀 OPTIMIZED: For 30d periods, use single aggregation across all machines
    // For shorter periods, use parallel batch processing per location
    let allMachines: Array<Record<string, unknown>> = [];
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
          deletedFilter,
        ],
      };

      // Apply search filter at database level if provided
      if (searchTerm) {
        const searchRegex = { $regex: searchTerm, $options: 'i' };
        (machineMatchQuery.$and as Array<Record<string, unknown>>).push({
          $or: [
            { serialNumber: searchRegex },
            { 'custom.name': searchRegex },
            { 'Custom.name': searchRegex },
            { relayId: searchRegex },
            { smibBoard: searchRegex },
            { _id: searchRegex }
          ]
        });
      }

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
      // aceEnabled locations always count as online regardless of lastActivity
      if (onlineStatus !== 'all') {
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
        const aceEnabledLocIds = locations
          .filter(loc => (loc as Record<string, unknown>).aceEnabled === true)
          .map(loc => String(loc._id));
        if (onlineStatus === 'online') {
          const andArray = machineMatchQuery.$and as Array<Record<string, unknown>>;
          const onlineConds: Array<Record<string, unknown>> = [
            { lastActivity: { $gte: threeMinutesAgo } },
          ];
          if (aceEnabledLocIds.length > 0) {
            onlineConds.push({ gamingLocation: { $in: aceEnabledLocIds } });
          }
          andArray.push({ $or: onlineConds });
        } else if (onlineStatus === 'offline') {
          const andArray = machineMatchQuery.$and as Array<Record<string, unknown>>;
          andArray.push({
            $or: [
              { lastActivity: { $lt: threeMinutesAgo } },
              { lastActivity: { $exists: false } },
              { lastActivity: null },
            ],
          });
          if (aceEnabledLocIds.length > 0) {
            andArray.push({ gamingLocation: { $nin: aceEnabledLocIds } });
          }
        } else if (onlineStatus === 'never-online') {
          const andArray = machineMatchQuery.$and as Array<Record<string, unknown>>;
          andArray.push({
            $or: [
              { lastActivity: { $exists: false } },
              { lastActivity: null },
            ],
          });
          if (aceEnabledLocIds.length > 0) {
            andArray.push({ gamingLocation: { $nin: aceEnabledLocIds } });
          }
        }
      }

      // Apply smibStatus filter at database level
      if (smibStatus !== 'all') {
        const andArray = machineMatchQuery.$and as Array<Record<string, unknown>>;
        if (smibStatus === 'smib') {
          andArray.push({
            $or: [
              { relayId: { $ne: '', $exists: true, $not: /^\s*$/ } },
              { smibBoard: { $ne: '', $exists: true, $not: /^\s*$/ } }
            ]
          });
        } else if (smibStatus === 'no-smib') {
          andArray.push({
            $and: [
              { $or: [{ relayId: '' }, { relayId: null }, { relayId: { $exists: false } }, { relayId: /^\s*$/ }] },
              { $or: [{ smibBoard: '' }, { smibBoard: null }, { smibBoard: { $exists: false } }, { smibBoard: /^\s*$/ }] }
            ]
          });
        }
      }

      console.warn(`[API] Finding machines with smibStatus: ${smibStatus}`);
      const allLocationMachines = await Machine.find(machineMatchQuery).lean();
      console.warn(`[API] Found ${allLocationMachines.length} machines matching SMIB/GameType filters`);

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
            gross: 0, // Add gross to default metrics
          };

          const licenceeId7d = Array.isArray(location.rel?.licencee) ? location.rel.licencee[0] : location.rel?.licencee;
          const includeJackpot = licenceeId7d ? (licenceeIncludeJackpotMap.get(String(licenceeId7d)) || false) : false;

          const moneyIn = (metrics.moneyIn || 0);
          const rawMoneyOut = (metrics.moneyOut || 0);
          const jackpot = (metrics.jackpot || 0);

          // rawMoneyOut (movement.totalCancelledCredits) is the base cancelled credits without jackpot.
          // Add jackpot only when includeJackpot=true for this licencee.
          const moneyOut = rawMoneyOut + (includeJackpot ? jackpot : 0);
          const gross = moneyIn - moneyOut;
          const netGross = moneyIn - rawMoneyOut - jackpot;

          // Get serialNumber with fallback to custom.name
          const machineData = machine as { serialNumber?: string | number; custom?: { name?: string | number }; Custom?: { name?: string | number } };
          const serialNumber = String(machineData.serialNumber || '').trim();
          const customName = String(machineData.custom?.name || machineData.Custom?.name || '').trim();
          const finalSerialNumber = serialNumber || customName || '';
      
          allMachines.push({
            _id: machineId,
            locationId: locationId,
            locationName: (location.name as string) || '(No Location)',
            assetNumber: finalSerialNumber,
            serialNumber: finalSerialNumber,
            custom: machineData.custom || machineData.Custom || {},
            game: String(machine.game || machine.gameType || ''),
            installedGame: String(machine.game || machine.gameType || ''),
            denomination: machine.denomination || '',
            manufacturer: machine.manufacturer || '',
            model: machine.model || '',
            status: machine.status || 'unknown',
            isSasMachine: machine.isSasMachine || false,
            aceEnabled: location.aceEnabled === true,
            relayId: machine.relayId || '',
            smibBoard: machine.smibBoard || '',
            smbId: machine.relayId || machine.smibBoard || '',
            cabinetType: machine.cabinetType || '',
            assetStatus: machine.assetStatus || '',
            accountingDenomination:
              machine.gameConfig?.accountingDenomination || '1',
            collectorDenomination: machine.collectorDenomination || 1,
            collectionMultiplier: String(machine.collectorDenomination || 1),
            isCronosMachine: false,
            createdAt: machine.createdAt,
            updatedAt: machine.updatedAt,
            lastOnline: (machine.lastActivity as Date | undefined) || null,
            lastActivity: (machine.lastActivity as Date | undefined) || null,
            // Calculate online status: machine is online if aceEnabled or lastActivity within last 3 minutes
            online: location.aceEnabled === true || (machine.lastActivity
              ? new Date(machine.lastActivity as Date) >
              new Date(Date.now() - 3 * 60 * 1000)
              : false),
            moneyIn,
            moneyOut,
            cancelledCredits: rawMoneyOut, // raw base (no jackpot) — used by currency converter
            gross,
            netGross,
            jackpot: jackpot || 0,
            coinIn: metrics.coinIn || 0,
            coinOut: metrics.coinOut || 0,
            gamesPlayed: metrics.gamesPlayed || 0,
            gamesWon: metrics.gamesWon || 0,
            includeJackpot,
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
            deletedFilter,
          ],
        };

        // Apply search filter at database level if provided
        if (searchTerm) {
          const searchRegex = { $regex: searchTerm, $options: 'i' };
          (batchMachineMatchQuery.$and as Array<Record<string, unknown>>).push({
            $or: [
              { serialNumber: searchRegex },
              { 'custom.name': searchRegex },
              { 'Custom.name': searchRegex },
              { relayId: searchRegex },
              { smibBoard: searchRegex },
              { _id: searchRegex }
            ]
          });
        }

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
        // aceEnabled locations always count as online regardless of lastActivity
        if (onlineStatus !== 'all') {
          const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
          const batchAceEnabledLocIds = batch
            .filter(loc => (loc as Record<string, unknown>).aceEnabled === true)
            .map(loc => String(loc._id));
          if (onlineStatus === 'online') {
            const andArray = batchMachineMatchQuery.$and as Array<Record<string, unknown>>;
            const onlineConds: Array<Record<string, unknown>> = [
              { lastActivity: { $gte: threeMinutesAgo } },
            ];
            if (batchAceEnabledLocIds.length > 0) {
              onlineConds.push({ gamingLocation: { $in: batchAceEnabledLocIds } });
            }
            andArray.push({ $or: onlineConds });
          } else if (onlineStatus === 'offline') {
            const andArray = batchMachineMatchQuery.$and as Array<Record<string, unknown>>;
            andArray.push({
              $or: [
                { lastActivity: { $lt: threeMinutesAgo } },
                { lastActivity: { $exists: false } },
                { lastActivity: null },
              ],
            });
            if (batchAceEnabledLocIds.length > 0) {
              andArray.push({ gamingLocation: { $nin: batchAceEnabledLocIds } });
            }
          } else if (onlineStatus === 'never-online') {
            const andArray = batchMachineMatchQuery.$and as Array<Record<string, unknown>>;
            andArray.push({
              $or: [
                { lastActivity: { $exists: false } },
                { lastActivity: null },
              ],
            });
            if (batchAceEnabledLocIds.length > 0) {
              andArray.push({ gamingLocation: { $nin: batchAceEnabledLocIds } });
            }
          }
        }

        // Apply smibStatus filter at database level
        if (smibStatus !== 'all') {
          const andArray = batchMachineMatchQuery.$and as Array<Record<string, unknown>>;
          if (smibStatus === 'smib') {
            andArray.push({
              $or: [
                { relayId: { $ne: '', $exists: true, $not: /^\s*$/ } },
                { smibBoard: { $ne: '', $exists: true, $not: /^\s*$/ } }
              ]
            });
          } else if (smibStatus === 'no-smib') {
            andArray.push({
              $and: [
                { $or: [{ relayId: '' }, { relayId: null }, { relayId: { $exists: false } }, { relayId: /^\s*$/ }] },
                { $or: [{ smibBoard: '' }, { smibBoard: null }, { smibBoard: { $exists: false } }, { smibBoard: /^\s*$/ }] }
              ]
            });
          }
        }

        console.warn(`[API] [Batch] Finding machines for ${batchLocationIds.length} locations with smibStatus: ${smibStatus}`);
        const batchAllMachines = await Machine.find(batchMachineMatchQuery).lean();
        console.warn(`[API] [Batch] Found ${batchAllMachines.length} machines`);

        if (batchAllMachines.length === 0) {
          console.warn(`[API] [Batch] No machines found for these locations, skipping metrics aggregation`);
          continue;
        }

        // Step 3: Group machines by location
        const batchMachinesByLocation = new Map<
          string,
          typeof batchAllMachines
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
              machine
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
        // 🚀 OPTIMIZED: No $lookup — we already have machine→location mapping in batchMachinesByLocation.
        // Doing the join in JS is far cheaper than a $lookup across two large collections.
        const machineToLocationMap = new Map<string, string>();
        batchAllMachines.forEach(machine => {
          const machineId = String(machine._id);
          const locId = machine.gamingLocation ? String(machine.gamingLocation) : null;
          if (locId) machineToLocationMap.set(machineId, locId);
        });

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
            $group: {
              _id: '$machine',
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
          await Meters.aggregate(batchMetersPipeline, { maxTimeMS: 90000 }).exec();

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
          const machineId = String(agg._id);
          const locationId = machineToLocationMap.get(machineId);
          const gameDayRange = locationId ? gamingDayRanges.get(locationId) : undefined;
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

            const licenceeIdBatch = Array.isArray(location.rel?.licencee) ? location.rel.licencee[0] : location.rel?.licencee;
            const includeJackpot = licenceeIdBatch ? (licenceeIncludeJackpotMap.get(String(licenceeIdBatch)) || false) : false;

            const moneyIn = (metrics.moneyIn || 0);
            const rawMoneyOut = (metrics.moneyOut || 0);
            const jackpot = (metrics.jackpot || 0);

            // rawMoneyOut (movement.totalCancelledCredits) is the base cancelled credits without jackpot.
            // Add jackpot only when includeJackpot=true for this licencee.
            const moneyOut = rawMoneyOut + (includeJackpot ? jackpot : 0);

            const coinIn = (metrics.coinIn || 0);
            const coinOut = (metrics.coinOut || 0);
            const gamesPlayed = metrics.gamesPlayed || 0;
            const gamesWon = metrics.gamesWon || 0;
            const gross = moneyIn - moneyOut;
            const netGross = moneyIn - rawMoneyOut - jackpot; // True profit (always subtracts jackpot)

            // Get serialNumber with fallback to custom.name
            const machineRecord = machine as Record<string, unknown>;
            const serialNumber = String(machineRecord.serialNumber || '').trim();
            const customData = (machine.custom || machine.Custom || {}) as Record<string, unknown>;
            const customName = String(customData.name || '').trim();
            const finalSerialNumber = serialNumber || customName || '';

            return {
              _id: machineId,
              locationId: locationIdStr,
              locationName: (location.name as string) || '(No Location)',
              assetNumber: finalSerialNumber,
              serialNumber: finalSerialNumber,
              custom: customData,
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
              collectorDenomination: (machine.collectorDenomination as number) || 1,
              collectionMultiplier: String(machine.collectorDenomination || 1),
              isCronosMachine: false,
              lastOnline: (machine.lastActivity as Date | undefined) || null,
              lastActivity: (machine.lastActivity as Date | undefined) || null,
              // Calculate online status: machine is online if lastActivity is within last 3 minutes
              // or if the location has aceEnabled: true
              online: (location.aceEnabled === true) || (machine.lastActivity
                ? new Date(machine.lastActivity as Date) >
                new Date(Date.now() - 3 * 60 * 1000)
                : false),
              aceEnabled: location.aceEnabled === true,
              createdAt: machine.createdAt as Date | undefined,
              deletedAt: machine.deletedAt as Date | undefined,
              timePeriod: timePeriod,
              moneyIn,
              moneyOut,
              cancelledCredits: rawMoneyOut, // raw base (no jackpot) — used by currency converter
              gross,
              netGross,
              jackpot,
              coinIn,
              coinOut,
              gamesPlayed,
              gamesWon,
              includeJackpot,
            };
          });
          batchResults.push(...locationResults);
        });

        // Add batch results to allMachines
        allMachines.push(...(batchResults as typeof allMachines));
      }
    }

    // ============================================================================
    // STEP 8.5: Refine Offline Status Filter and Calculate Labels
    // ============================================================================
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // Process all machines to add offline labels and apply refined filtering if needed
    let refinedMachines = allMachines.map(machine => {
      const lastActivityStr = (machine as Record<string, unknown>).lastActivity;
      const lastActivity = lastActivityStr ? new Date(lastActivityStr as string | Date) : null;
      const aceEnabled = (machine as Record<string, unknown>).aceEnabled === true;
      const isOnline = aceEnabled || (lastActivity && lastActivity > threeMinutesAgo);

      let offlineTimeLabel: string | undefined = undefined;
      let actualOfflineTime: string | undefined = undefined;

      if (!isOnline && lastActivity) {
        const actualDuration = formatDistanceToNow(lastActivity, { addSuffix: true });
        actualOfflineTime = actualDuration;

        const locationId = (machine as Record<string, unknown>).locationId;
        const range = gamingDayRanges.get(String(locationId));

        if (range) {
          // If it went offline BEFORE the range start, we clamp the label for 7d/30d/Custom
          if (lastActivity < range.rangeStart && (timePeriod === '7d' || timePeriod === '30d' || timePeriod === 'Custom' || timePeriod === 'last7days' || timePeriod === 'last30days')) {
            const days = (timePeriod === '7d' || timePeriod === 'last7days') ? '7' : (timePeriod === '30d' || timePeriod === 'last30days') ? '30' : undefined;
            if (days) {
              offlineTimeLabel = `within the last ${days} days`;
            } else {
              // For Custom, use distance to rangeStart? 
              // Let's just say "within the selected period"
              const diffMs = range.rangeEnd.getTime() - range.rangeStart.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              offlineTimeLabel = `within the last ${diffDays} days`;
            }
          } else {
            offlineTimeLabel = actualDuration;
          }
        }
      } else if (!isOnline && !lastActivity) {
        actualOfflineTime = 'Never';
        offlineTimeLabel = 'Never';
      }

      return {
        ...machine,
        online: isOnline,
        offlineTimeLabel,
        actualOfflineTime
      };
    });

    // Apply strict filtering for 'offline' status if requested
    if (onlineStatus.startsWith('offline')) {
      refinedMachines = refinedMachines.filter(machine => {
        const lastActivityStr = (machine as Record<string, unknown>).lastActivity;
        const lastActivity = lastActivityStr ? new Date(lastActivityStr as string | Date) : null;
        const aceEnabled = (machine as Record<string, unknown>).aceEnabled === true;
        const isOnline = aceEnabled || (lastActivity && lastActivity > threeMinutesAgo);
        (machine as Record<string, unknown>).online = isOnline; // Sync the field for filtering below

        // 1. Must be currently offline
        if (isOnline) return false;

        // 2. Apply period-based rules
        const locationId = (machine as Record<string, unknown>).locationId;
        const range = gamingDayRanges.get(String(locationId));
        if (!range) return true;

        if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
          // Strict: Only show if it went offline DURING this gaming day
          if (!lastActivity) return false; // Never online isn't "offline today"
          return lastActivity >= range.rangeStart && lastActivity <= range.rangeEnd;
        } else {
          // Less strict for 7d/30d/Custom: Show if offline at the end of the period (including long-term)
          return !lastActivity || lastActivity <= range.rangeEnd;
        }
      });
    }

    // Update allMachines for the next steps
    allMachines = refinedMachines;

    // ============================================================================
    // STEP 9: Search filter applied at DB level
    // ============================================================================
    // Search is now applied at the database level in Machine.find() for better performance
    let filteredMachines = allMachines;

    // ============================================================================
    // STEP 10: Apply currency conversion if needed
    // ============================================================================
    // Currency conversion ONLY for Admin/Developer when viewing "All Licencees"
    // Managers and other users ALWAYS see native currency (TTD for TTG, GYD for Cabana, etc.)
    if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
      // Get licencee details for currency mapping
      const db = await connectDB();
      if (!db) {
        return NextResponse.json(
          { error: 'DB connection failed' },
          { status: 500 }
        );
      }

      const { Licencee } = await import('@/app/api/lib/models/licencee');
      const licenceesData = await Licencee.find(
        {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        },
        { _id: 1, name: 1, includeJackpot: 1 }
      )
        .lean()
        .exec();

      // Create maps of licencee ID to name and includeJackpot
      const licenceeIdToName = new Map<string, string>();
      const licenceeIdToIncludeJackpot = new Map<string, boolean>();
      licenceesData.forEach(lic => {
        const licRecord = lic as Record<string, unknown>;
        licenceeIdToName.set(String(licRecord._id), licRecord.name as string);
        licenceeIdToIncludeJackpot.set(String(licRecord._id), Boolean(licRecord.includeJackpot));
      });

      // Get country details for currency mapping
      const { getCountryCurrency, getLicenceeCurrency, convertToUSD } =
        await import('@/lib/helpers/rates');
      const countriesData = await Countries.find({}).lean();
      const countryIdToName = new Map<string, string>();
      countriesData.forEach(country => {
        if (country._id && country.name) {
          countryIdToName.set(String(country._id), country.name);
        }
      });

      // Get location details for each machine to determine licencee
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
        const machineLicenceeId = (locationDetails?.rel?.licencee || (locationDetails?.rel as Record<string, unknown>)?.licencee) as
          | string
          | undefined;

        let nativeCurrency: string = 'USD';

        if (!machineLicenceeId) {
          // Unassigned machines - determine currency from country
          const countryId = locationDetails?.country as string | undefined;
          const countryName = countryId
            ? countryIdToName.get(countryId.toString())
            : undefined;
          nativeCurrency = countryName
            ? getCountryCurrency(countryName)
            : 'USD';
        } else {
          // Get licencee's native currency
          const licenceeName =
            licenceeIdToName.get(machineLicenceeId.toString()) || 'Unknown';
          nativeCurrency = getLicenceeCurrency(licenceeName);
        }

        // Convert from native currency to USD, then to display currency
        const machineRecord = machine as Record<string, unknown>;
        const moneyInUSD = convertToUSD(
          (machineRecord.moneyIn as number) || 0,
          nativeCurrency
        );
        // Use cancelledCredits (rawMoneyOut = base only, no jackpot) as the conversion base.
        // moneyOut is re-derived below by conditionally adding jackpot.
        const cancelledCreditsUSD = convertToUSD(
          (machineRecord.cancelledCredits as number) || 0,
          nativeCurrency
        );
        const jackpotUSD = convertToUSD(
          (machineRecord.jackpot as number) || 0,
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

        const moneyIn = convertFromUSD(moneyInUSD, displayCurrency);
        // machine.moneyOut coming in already conditionally includes jackpot (set in batch/sequential step).
        // machine.cancelledCredits = rawMoneyOut (base only, no jackpot).
        // Re-derive moneyOut from the base so we don't double-add jackpot.
        const baseMoneyOut = convertFromUSD(cancelledCreditsUSD, displayCurrency); // raw base, no jackpot
        const jackpot = convertFromUSD(jackpotUSD, displayCurrency);
        const includeJackpot = (machineLicenceeId && licenceeIdToIncludeJackpot.get(machineLicenceeId.toString())) || false;

        // moneyOut = base + jackpot (if includeJackpot) — same pattern as batch/sequential
        const moneyOut = baseMoneyOut + (includeJackpot ? jackpot : 0);
        const gross = moneyIn - moneyOut;
        const netGross = moneyIn - baseMoneyOut - jackpot;

        return {
          ...machine,
          moneyIn,
          moneyOut,
          cancelledCredits: convertFromUSD(
            cancelledCreditsUSD,
            displayCurrency
          ),
          jackpot,
          gross,
          netGross,
          coinIn: convertFromUSD(coinInUSD, displayCurrency),
          coinOut: convertFromUSD(coinOutUSD, displayCurrency),
          includeJackpot,
        };
      });
    }

    // ============================================================================
    // STEP 10.5: Apply reviewer multiplier
    // ============================================================================
    const reviewerMult = (userPayload as { multiplier?: number | null })?.multiplier ?? null;
    if (reviewerMult !== null) {
      const mult = 1 - reviewerMult;
      filteredMachines = filteredMachines.map(machine => {
        const m = machine as Record<string, unknown>;
        const moneyIn = ((m.moneyIn as number) || 0) * mult;
        const moneyOut = ((m.moneyOut as number) || 0) * mult;
        const jackpot = ((m.jackpot as number) || 0) * mult;
        const cancelledCredits = ((m.cancelledCredits as number) || 0) * mult;
        return {
          ...machine,
          moneyIn,
          moneyOut,
          jackpot,
          cancelledCredits,
          gross: moneyIn - moneyOut,
          netGross: moneyIn - cancelledCredits - jackpot,
        };
      });
    }

    // ============================================================================
    // STEP 10.6: Dynamic machine sorting
    // ============================================================================
    const sortBy = searchParams.get('sortBy') || 'moneyIn';
    const sortOrderRaw = searchParams.get('sortOrder') || 'desc';
    const sortOrder = sortOrderRaw.toLowerCase() === 'asc' ? 1 : -1;

    filteredMachines.sort((a, b) => {
      const aRecord = a as Record<string, unknown>;
      const bRecord = b as Record<string, unknown>;

      // If searching, relevance (starts with) takes TOP priority
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const aSerial = String(aRecord.serialNumber || '').toLowerCase();
        const bSerial = String(bRecord.serialNumber || '').toLowerCase();
        const aName = String((aRecord.custom as { name?: string })?.name || '').toLowerCase();
        const bName = String((bRecord.custom as { name?: string })?.name || '').toLowerCase();

        const aStarts = aSerial.startsWith(searchLower) || aName.startsWith(searchLower);
        const bStarts = bSerial.startsWith(searchLower) || bName.startsWith(searchLower);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }

      // Secondary sort: user-selected sortBy field
      let valA = aRecord[sortBy];
      let valB = bRecord[sortBy];

      // Handle missing values
      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 1
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortOrder === 1 ? numA - numB : numB - numA;
      }

      return 0;
    });

    // ============================================================================
    // STEP 11: Apply pagination
    // ============================================================================
    type DebugInfo = {
      userAccessibleLicencees: string[] | 'all';
      userRoles: string[];
      userLocationPermissions: string[];
      licenceeParam: string | null | undefined;
      allowedLocationIds: string | string[];
      locationsFound: number;
      locationSample: Array<{ id: string; name: string; licencee?: string }>;
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
        userAccessibleLicencees,
        userRoles,
        userLocationPermissions,
        licenceeParam: licencee,
        allowedLocationIds:
          allowedLocationIds === 'all'
            ? 'ALL'
            : (allowedLocationIds as string[])?.slice(0, 10),
        locationsFound: locations.length,
        locationSample: locations.slice(0, 3).map(l => ({
          id: String(l._id),
          name: String(l.name),
          licencee: l.rel?.licencee ? String(l.rel.licencee) : undefined,
        })),
        machinesReturned: paginatedMachines.length,
        totalMachines: totalCount,
        timePeriod: timePeriodForGamingDay,
      };
    }

    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(`[Cabinets Aggregation API] Completed in ${duration}ms`);
    }
    return NextResponse.json(response);
  });
}


