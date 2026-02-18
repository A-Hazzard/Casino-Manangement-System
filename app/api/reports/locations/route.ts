/**
 * Locations Report API Route
 *
 * This route handles fetching location reports with financial metrics and filtering.
 * It supports:
 * - Time period filtering (today, week, month, custom dates)
 * - Licensee-based filtering
 * - Location search
 * - Currency conversion (Admin/Developer only for "All Licensees")
 * - Role-based access control
 * - Gaming day offset calculations
 * - Pagination
 * - Performance tracking
 *
 * @module app/api/reports/locations/route
 */

import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
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
import { getLicenseeCurrency } from '@/lib/helpers/rates';
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
      searchParams.get('licensee') || searchParams.get('licencee') || undefined;
    const currencyParam = searchParams.get('currency') as CurrencyCode | null;
    let displayCurrency: CurrencyCode = currencyParam || 'USD';
    const searchTerm = searchParams.get('search')?.trim() || '';
    const machineTypeFilter = searchParams.get('machineTypeFilter');
    const specificLocations =
      searchParams.get('locations')?.split(',').filter(Boolean) || [];
    const showAllLocations = searchParams.get('showAllLocations') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = showAllLocations
      ? 10000
      : Math.min(parseInt(searchParams.get('limit') || '50'), 50);
    const skip = showAllLocations ? 0 : (page - 1) * limit;

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
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const isAdminOrDev =
      userRoles.includes('admin') || userRoles.includes('developer');

    // ============================================================================
    // STEP 3: Determine accessible locations and display currency
    // ============================================================================
    let resolvedLicensee =
      licencee && licencee !== 'all' ? licencee : undefined;
    if (
      !resolvedLicensee &&
      userAccessibleLicensees !== 'all' &&
      userAccessibleLicensees.length === 1
    ) {
      resolvedLicensee = userAccessibleLicensees[0];
    }

    if (!currencyParam && resolvedLicensee) {
      const licenseeDoc = await Licencee.findOne(
        { _id: resolvedLicensee },
        { name: 1 }
      ).lean();
      if (licenseeDoc && !Array.isArray(licenseeDoc) && licenseeDoc.name) {
        displayCurrency = getLicenseeCurrency(licenseeDoc.name);
      }
    }

    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
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
      locationMatchStage['rel.licencee'] = licencee;
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
      const onlineMachines = machines.filter(
        m =>
          m.lastActivity &&
          new Date(m.lastActivity as string) >
            new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length;
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

    locationResults.sort((a, b) => b.gross - a.gross);
    const paginated = locationResults.slice(skip, skip + limit);
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
        totalCount: locationResults.length,
        totalPages: Math.ceil(locationResults.length / limit),
        hasNextPage: page < Math.ceil(locationResults.length / limit),
        hasPrevPage: page > 1,
      },
      currency: displayCurrency,
      converted: isAdminOrDev && (licencee === 'all' || !licencee),
      performance: { totalTime: Date.now() - perfStart },
    });
  } catch (err) {
    console.error('Reports Locations API Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

