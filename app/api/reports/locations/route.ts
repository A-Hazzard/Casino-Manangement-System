/**
 * Locations Report API Route
 *
 * This route handles fetching location reports with financial metrics and filtering.
 * It supports:
 * - Time period filtering (today, week, month, custom dates)
 * - Licencee-based filtering
 * - Location search
 * - Currency conversion (Admin/Developer only for "All Licencees")
 * - Role-based access control
 * - Gaming day offset calculations
 * - Pagination
 * - Performance tracking
 *
 * @module app/api/reports/locations/route
 */

import {
  getUserAccessibleLicenceesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenceeFilter';
import { getMemberCountsPerLocation } from '@/app/api/lib/helpers/membershipAggregation';
import {
  applyLocationsCurrencyConversion,
  handleSummaryMode,
} from '@/app/api/lib/helpers/reports/locations';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { TimePeriod } from '@/app/api/lib/types';
import { getLicenceeCurrency } from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type {
  AggregatedLocation,
  GeoCoordinates,
} from '@/shared/types/entities';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching locations report
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database and authenticate user
 * 3. Determine accessible locations and display currency
 * 4. Build location match filters
 * 5. Fetch locations and calculate gaming day ranges
 * 6. Aggregate financial metrics per location (optimized via cursor)
 * 7. Apply post-aggregation filters and currency conversion
 * 8. Return paginated results with performance breakdown
 */
export async function GET(req: NextRequest) {
  const perfStart = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '7d';
    const licencee =
      searchParams.get('licencee') || undefined;
    const currencyParam = searchParams.get('currency') as CurrencyCode | null;
    let displayCurrency: CurrencyCode = currencyParam || 'USD';
    const searchTerm = searchParams.get('search')?.trim() || '';
    const machineTypeFilter = searchParams.get('machineTypeFilter');
    const onlineStatus = searchParams.get('onlineStatus')?.toLowerCase() || 'all';
    const specificLocations =
      searchParams.get('locations')?.split(',').filter(Boolean) || [];
    const showAllLocations = searchParams.get('showAllLocations') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = showAllLocations
      ? 10000
      : Math.min(parseInt(searchParams.get('limit') || '50'), 50);
    const skip = showAllLocations ? 0 : (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'gross';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    let customStartDate: Date | undefined, customEndDate: Date | undefined;
    if (timePeriod === 'Custom') {
      const start = searchParams.get('startDate');
      const end = searchParams.get('endDate');
      if (!start || !end)
        return NextResponse.json({ error: 'Missing dates' }, { status: 400 });
      customStartDate = new Date(start);
      customEndDate = new Date(end);
    }

    // ============================================================================
    // STEP 2: Connect to database and authenticate user
    // ============================================================================
    await connectDB();
    const userPayload = await getUserFromServer();
    if (!userPayload)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRoles = (userPayload.roles as string[]) || [];
    const userLocationPermissions =
      (userPayload as { assignedLocations?: string[] })?.assignedLocations ||
      [];
    const userAccessibleLicencees = await getUserAccessibleLicenceesFromToken();
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    // ============================================================================
    // STEP 3: Determine accessible locations and display currency
    // ============================================================================
    let resolvedLicencee =
      licencee && licencee !== 'all' ? licencee : undefined;
    if (
      !resolvedLicencee &&
      userAccessibleLicencees !== 'all' &&
      userAccessibleLicencees.length === 1
    ) {
      resolvedLicencee = userAccessibleLicencees[0];
    }

    if (!currencyParam && resolvedLicencee) {
      const licenceeDoc = await Licencee.findOne(
        { _id: resolvedLicencee },
        { name: 1 }
      ).lean();
      if (licenceeDoc && !Array.isArray(licenceeDoc) && licenceeDoc.name) {
        displayCurrency = getLicenceeCurrency(licenceeDoc.name);
      }
    }

    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicencees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 4: Build location match filters
    // ============================================================================
    const locationMatchStage: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    };

    if (allowedLocationIds !== 'all') {
      if (allowedLocationIds.length === 0)
        return createEmptyResponse(page, limit, displayCurrency);
      let intersection = allowedLocationIds;
      if (specificLocations.length > 0) {
        intersection = allowedLocationIds.filter(id =>
          specificLocations.includes(String(id))
        );
        if (intersection.length === 0)
          return createEmptyResponse(page, limit, displayCurrency);
      }
      locationMatchStage._id = { $in: intersection };
    } else if (specificLocations.length > 0) {
      locationMatchStage._id = { $in: specificLocations };
    }

    if (licencee && licencee !== 'all') {
      if (!locationMatchStage.$and) {
        locationMatchStage.$and = [];
      }
      (locationMatchStage.$and as Array<Record<string, unknown>>).push({
        $or: [
          { 'rel.licencee': licencee  }, { 'rel.licencee': licencee  }
        ]
      });
    }

    if (searchTerm) {
      const searchFilter = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { _id: searchTerm },
        ],
      };
      if (locationMatchStage.$and && Array.isArray(locationMatchStage.$and)) {
        locationMatchStage.$and.push(searchFilter);
      } else {
        locationMatchStage.$and = [searchFilter];
      }
    }

    // Exclude test locations for non-developer users to ensure consistent pagination
    if (!isAdminOrDev) {
      const testFilter = { name: { $not: /^test/i } };
      if (locationMatchStage.$and && Array.isArray(locationMatchStage.$and)) {
        locationMatchStage.$and.push(testFilter);
      } else {
        locationMatchStage.$and = [testFilter];
      }
    }

    // Apply machine type filters (SMIB, No SMIB, Local Server, Membership, Coordinates)
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
                  $or: [
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
                    {
                      'geoCoords.longitude': {
                        $exists: true,
                        $nin: [null, 0],
                      },
                    },
                    {
                      'geoCoords.longtitude': {
                        $exists: true,
                        $nin: [null, 0],
                      },
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
        const machineFilter = { $and: combinedFilters };
        if (locationMatchStage.$and && Array.isArray(locationMatchStage.$and)) {
          locationMatchStage.$and.push(machineFilter);
        } else {
          locationMatchStage.$and = [machineFilter];
        }
      }
    }

    // ============================================================================
    // STEP 5: Fetch locations and calculate gaming day ranges
    // ============================================================================
    const locations = await GamingLocations.find(locationMatchStage, {
      _id: 1,
      name: 1,
      gameDayOffset: 1,
      isLocalServer: 1,
      rel: 1,
      country: 1,
      membershipEnabled: 1,
      enableMembership: 1,
      noSMIBLocation: 1,
      geoCoords: 1,
    }).lean();

    if (searchParams.get('summary') === 'true') {
      return await handleSummaryMode(
        locations as unknown as Array<{
          _id: unknown;
          name: string;
          rel?: Record<string, unknown>;
          isLocalServer?: boolean;
          geoCoords?: unknown;
          membershipEnabled?: boolean;
          enableMembership?: boolean;
        }>,
        displayCurrency,
        perfStart
      );
    }

    // ============================================================================
    // STEP 6: Aggregate financial metrics per location (optimized via cursor)
    // ============================================================================
    const locationResults: AggregatedLocation[] = [];
    const allLocationIds = locations.map(loc => String(loc._id));

    // Get machines mapping
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
        relayId: 1,
        smibBoard: 1,
        assetNumber: 1,
        serialNumber: 1,
        lastCollectionAt: 1,
      }
    ).lean();

    const locationToMachines = new Map<string, Record<string, unknown>[]>();
    allMachinesData.forEach(m => {
      const locId = m.gamingLocation!;
      if (!locationToMachines.has(locId)) locationToMachines.set(locId, []);
      locationToMachines
        .get(locId)!
        .push(m as unknown as Record<string, unknown>);
    });

    // Calculate gaming day ranges for each location
    const locationRanges = getGamingDayRangesForLocations(
      locations.map(loc => ({
        _id: String(loc._id),
        gameDayOffset: loc.gameDayOffset ?? 8,
      })),
      timePeriod,
      customStartDate,
      customEndDate
    );

    // Global date range for initial aggregation
    let globalStart = new Date();
    let globalEnd = new Date(0);
    locationRanges.forEach(range => {
      if (range.rangeStart < globalStart) globalStart = range.rangeStart;
      if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
    });

    // Use aggregation to group by location AND hour to avoid inflation
    const metersCursor = Meters.aggregate([
      {
        $match: {
          location: { $in: allLocationIds },
          readAt: { $gte: globalStart, $lte: globalEnd },
        },
      },
      {
        $group: {
          _id: {
            location: '$location',
            // Truncate to hour for bucketed summation
            hour: { $dateTrunc: { date: '$readAt', unit: 'hour' } },
          },
          totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
          totalCancelledCredits: {
            $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
          },
        },
      },
    ])
      .allowDiskUse(true)
      .cursor({ batchSize: 1000 });

    const metricsMap = new Map<
      string,
      { totalDrop: number; totalCancelledCredits: number }
    >();

    for await (const doc of metersCursor) {
      const locId = String(doc._id.location);
      const bucketHour = new Date(doc._id.hour);
      const range = locationRanges.get(locId);

      if (!range) continue;

      // Only include buckets that are within this location's specific gaming day range
      // Meter readings are discrete events. Since we grouped by hour, we check if the hour
      // start time falls within the gaming day range.
      // NOTE: This handles different per-location offsets perfectly.
      const isWithinRange =
        bucketHour >= range.rangeStart && bucketHour <= range.rangeEnd;

      if (isWithinRange) {
        if (!metricsMap.has(locId)) {
          metricsMap.set(locId, { totalDrop: 0, totalCancelledCredits: 0 });
        }
        const current = metricsMap.get(locId)!;
        current.totalDrop += (doc.totalDrop as number) || 0;
        current.totalCancelledCredits +=
          (doc.totalCancelledCredits as number) || 0;
      }
    }

    // ============================================================================
    // STEP 6.5: Aggregate member counts per location
    // ============================================================================
    const memberCountMap = await getMemberCountsPerLocation(allLocationIds);

    // ============================================================================
    // STEP 7: Apply post-aggregation filters and currency conversion
    // ============================================================================
    for (const loc of locations) {
      const locId = String(loc._id);
      const machines = locationToMachines.get(locId) || [];
      const metrics = metricsMap.get(locId) || {
        totalDrop: 0,
        totalCancelledCredits: 0,
      };

      const totalMachines = machines.length;
      const threshold = Date.now() - 3 * 60 * 1000;
      const onlineMachines = machines.filter(m => {
        if (!m.lastActivity) return false;
        try {
          // Handle both Date objects and strings
          const activityDate = m.lastActivity instanceof Date
            ? m.lastActivity
            : new Date(String(m.lastActivity).replace(' ', 'T'));
          return activityDate.getTime() > threshold;
        } catch {
          return false;
        }
      }).length;
      const sasMachines = machines.filter(
        m => m.isSasMachine as boolean
      ).length;
      const hasSmib = machines.some(
        m =>
          (m.relayId as string | undefined)?.trim() ||
          (m.smibBoard as string | undefined)?.trim()
      );



      const membershipEnabled = Boolean(
        loc.membershipEnabled ||
        (loc as { enableMembership?: boolean }).enableMembership
      );

      locationResults.push({
        _id: locId,
        location: locId,
        locationName: loc.name,
        ...(membershipEnabled && { memberCount: memberCountMap.get(locId) || 0 }),
        isLocalServer: loc.isLocalServer || false,
        membershipEnabled,
        moneyIn: Math.round((metrics.totalDrop as number) * 100) / 100,
        moneyOut:
          Math.round((metrics.totalCancelledCredits as number) * 100) / 100,
        gross:
          Math.round(
            ((metrics.totalDrop as number) -
              (metrics.totalCancelledCredits as number)) *
            100
          ) / 100,
        totalMachines,
        onlineMachines,
        sasMachines,
        nonSasMachines: totalMachines - sasMachines,
        hasSasMachines: sasMachines > 0,
        hasNonSasMachines: totalMachines - sasMachines > 0,
        noSMIBLocation: loc.noSMIBLocation || !hasSmib,
        hasSmib,
        rel: loc.rel,
        country: loc.country,
        geoCoords: (loc as { geoCoords?: GeoCoordinates }).geoCoords,
        machines: machines.map(m => ({
          _id: (m._id as string).toString(),
          assetNumber: m.assetNumber as string,
          serialNumber: m.serialNumber as string,
          isSasMachine: m.isSasMachine as boolean,
          lastActivity: m.lastActivity
            ? new Date(m.lastActivity as string)
            : undefined,
        })),
        coinIn: 0,
        coinOut: 0,
        jackpot: 0,
        gamesPlayed: 0,
      });
    }

    // Apply online status filter to results
    let filteredResults = locationResults;
    if (onlineStatus !== 'all') {
      filteredResults = locationResults.filter(loc => {
        const isOnline = loc.onlineMachines > 0;

        if (onlineStatus === 'online') {
          return isOnline;
        }

        if (onlineStatus.startsWith('offline')) {
          return !isOnline && loc.totalMachines > 0;
        }

        if (onlineStatus === 'neveronline') {
          // Never Online: No machines have ever been active
          // For location level, this means all machines in the location have no lastActivity
          const machines = (loc as { machines?: Array<{ lastActivity?: string | Date | null }> }).machines || [];
          return (
            machines.length > 0 && machines.every(m => !m.lastActivity)
          );
        }

        return true;
      });
    }

    // Apply sorting
    if (onlineStatus === 'offlinelongest') {
      filteredResults.sort((a, b) => {
        const getLatestActivity = (loc: { machines?: Array<{ lastActivity?: string | Date | null }> }) => {
          const machines = loc.machines || [];
          if (machines.length === 0) return 0;
          const activities = machines.map(m => m.lastActivity ? new Date(m.lastActivity).getTime() : 0).filter(t => t > 0);
          return activities.length > 0 ? Math.max(...activities) : 0;
        };
        return getLatestActivity(a) - getLatestActivity(b);
      });
    } else if (onlineStatus === 'offlineshortest') {
      filteredResults.sort((a, b) => {
        const getLatestActivity = (loc: { machines?: Array<{ lastActivity?: string | Date | null }> }) => {
          const machines = loc.machines || [];
          if (machines.length === 0) return 0;
          const activities = machines.map(m => m.lastActivity ? new Date(m.lastActivity).getTime() : 0).filter(t => t > 0);
          return activities.length > 0 ? Math.max(...activities) : 0;
        };
        return getLatestActivity(b) - getLatestActivity(a);
      });
    } else {
      // General dynamic sorting
      filteredResults.sort((a, b) => {
        let valA = (a as Record<string, unknown>)[sortBy] ?? 0;
        let valB = (b as Record<string, unknown>)[sortBy] ?? 0;

        // Special handling for nested or string fields if necessary
        if (sortBy === 'locationName') {
          valA = (String(valA) || '').toLowerCase();
          valB = (String(valB) || '').toLowerCase();
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return sortOrder === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
      });
    }

    const paginated = filteredResults.slice(skip, skip + limit);
    const converted = await applyLocationsCurrencyConversion(
      paginated,
      licencee,
      displayCurrency,
      isAdminOrDev
    );

    // ============================================================================
    // STEP 8: Return paginated results
    // ============================================================================
    return NextResponse.json({
      data: converted,
      pagination: {
        page,
        limit,
        totalCount: filteredResults.length,
        totalPages: Math.ceil(filteredResults.length / limit),
        hasNextPage: page < Math.ceil(filteredResults.length / limit),
        hasPrevPage: page > 1,
      },
      currency: displayCurrency,
      converted: isAdminOrDev && (licencee === 'all' || !licencee),
      performance: { totalTime: Date.now() - perfStart },
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Internal server error';
    console.error('Reports Locations API Error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function createEmptyResponse(page: number, limit: number, currency: string) {
  return NextResponse.json({
    data: [],
    pagination: {
      page,
      limit,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    },
    currency,
    converted: false,
  });
}

