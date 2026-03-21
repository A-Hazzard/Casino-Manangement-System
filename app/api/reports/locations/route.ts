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
import type { LocationDocument } from '@/lib/types/common';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { TimePeriod } from '@/app/api/lib/types';
import { getLicenceeCurrency } from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type {
  AggregatedLocation,
} from '@/shared/types/entities';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching locations report
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
    const reviewerMult =
      userRoles.includes('reviewer') &&
      (userPayload as { multiplier?: number | null })?.multiplier != null
        ? (userPayload as { multiplier?: number | null }).multiplier!
        : null;

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
    const showArchived = searchParams.get('archived') === 'true';
    const locationMatchStage: Record<string, unknown> = showArchived
      ? { deletedAt: { $gte: new Date('2025-01-01') } }
      : {
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
          { 'rel.licencee': licencee }
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

    // Exclude test locations for non-developer users
    if (!isAdminOrDev) {
      const testFilter = { name: { $not: /^test/i } };
      if (locationMatchStage.$and && Array.isArray(locationMatchStage.$and)) {
        locationMatchStage.$and.push(testFilter);
      } else {
        locationMatchStage.$and = [testFilter];
      }
    }

    // Apply machine type filters
    if (machineTypeFilter) {
      const filters = machineTypeFilter.split(',').filter(f => f.trim() !== '');
      const connectionFilters: Record<string, unknown>[] = [];
      const featureFilters: Record<string, unknown>[] = [];
      const qualityFilters: Record<string, unknown>[] = [];

      filters.forEach(filter => {
        const f = filter.trim();
        switch (f) {
          case 'LocalServersOnly': connectionFilters.push({ isLocalServer: true }); break;
          case 'SMIBLocationsOnly': connectionFilters.push({ noSMIBLocation: { $ne: true } }); break;
          case 'NoSMIBLocation': connectionFilters.push({ noSMIBLocation: true }); break;
          case 'MembershipOnly': featureFilters.push({ $or: [{ membershipEnabled: true }, { enableMembership: true }] }); break;
          case 'MissingCoordinates': qualityFilters.push({ $or: [
            { 'geoCoords.latitude': { $exists: false } },
            { 'geoCoords.latitude': null },
            { 'geoCoords.latitude': 0 },
            { $or: [
              { 'geoCoords.longitude': { $exists: false, $eq: null } },
              { 'geoCoords.longtitude': { $exists: false, $eq: null } }
            ]}
          ]}); break;
          case 'HasCoordinates': qualityFilters.push({ $and: [
            { 'geoCoords.latitude': { $exists: true, $nin: [null, 0] } },
            { $or: [
              { 'geoCoords.longitude': { $exists: true, $nin: [null, 0] } },
              { 'geoCoords.longtitude': { $exists: true, $nin: [null, 0] } }
            ]}
          ]}); break;
        }
      });

      const combinedFilters: Record<string, unknown>[] = [];
      if (connectionFilters.length > 0) combinedFilters.push({ $or: connectionFilters });
      if (featureFilters.length > 0) combinedFilters.push({ $or: featureFilters });
      if (qualityFilters.length > 0) combinedFilters.push({ $or: qualityFilters });

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
    const locations = (await GamingLocations.find(locationMatchStage, {
      _id: 1, name: 1, gameDayOffset: 1, isLocalServer: 1, rel: 1, country: 1,
      membershipEnabled: 1, enableMembership: 1, noSMIBLocation: 1, geoCoords: 1, deletedAt: 1
    }).lean()) as unknown as Pick<LocationDocument, '_id' | 'name' | 'gameDayOffset' | 'isLocalServer' | 'rel' | 'country' | 'membershipEnabled' | 'enableMembership' | 'noSMIBLocation' | 'geoCoords' | 'deletedAt'>[];

    const licenceeIds = Array.from(new Set(locations.map(loc => loc.rel?.licencee).filter(Boolean)));
    const licencees = await Licencee.find({ _id: { $in: licenceeIds } }).lean();
    const licenceeIncludeJackpotMap = new Map(licencees.map(l => [String(l._id), !!l.includeJackpot]));

    if (searchParams.get('summary') === 'true') {
      return await handleSummaryMode(locations, displayCurrency, perfStart);
    }

    // ============================================================================
    // STEP 6: Aggregate financial metrics per location
    // ============================================================================
    const allLocationIds = locations.map(loc => String(loc._id));
    const allMachinesData = await Machine.find(
      { gamingLocation: { $in: allLocationIds }, $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }] },
      { _id: 1, gamingLocation: 1, lastActivity: 1, isSasMachine: 1, relayId: 1, smibBoard: 1, assetNumber: 1, serialNumber: 1, collectorDenomination: 1, 'gameConfig.accountingDenomination': 1 }
    ).lean();

    const locationToMachines = new Map<string, Record<string, unknown>[]>();

    allMachinesData.forEach(m => {
      const locId = String(m.gamingLocation!);
      if (!locationToMachines.has(locId)) locationToMachines.set(locId, []);
      locationToMachines.get(locId)!.push(m as Record<string, unknown>);
    });

    const locationRanges = getGamingDayRangesForLocations(
      locations.map(loc => ({ _id: String(loc._id), gameDayOffset: loc.gameDayOffset ?? 8 })),
      timePeriod, customStartDate, customEndDate
    );

    let globalStart = new Date();
    let globalEnd = new Date(0);
    locationRanges.forEach(range => {
      if (range.rangeStart < globalStart) globalStart = range.rangeStart;
      if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
    });

    const metersCursor = Meters.aggregate([
      { $match: { location: { $in: allLocationIds }, readAt: { $gte: globalStart, $lte: globalEnd } } },
      { $group: {
        _id: { machine: '$machine', location: '$location', hour: { $dateTrunc: { date: '$readAt', unit: 'hour' } } },
        totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        totalCancelledCredits: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
        totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
      }},
    ]).allowDiskUse(true).cursor({ batchSize: 1000 });

    const metricsMap = new Map<string, { totalDrop: number; totalCancelledCredits: number; totalJackpot: number }>();

    for await (const doc of metersCursor) {
      const locId = String(doc._id.location);
      const bucketHour = new Date(doc._id.hour);
      const range = locationRanges.get(locId);

      if (range && bucketHour >= range.rangeStart && bucketHour <= range.rangeEnd) {
        if (!metricsMap.has(locId)) metricsMap.set(locId, { totalDrop: 0, totalCancelledCredits: 0, totalJackpot: 0 });
        const current = metricsMap.get(locId)!;
        current.totalDrop += (doc.totalDrop || 0);
        current.totalCancelledCredits += (doc.totalCancelledCredits || 0);
        current.totalJackpot += (doc.totalJackpot || 0);
      }
    }

    const memberCountMap = await getMemberCountsPerLocation(allLocationIds);
    const locationResults: AggregatedLocation[] = [];

    // ============================================================================
    // STEP 7: Transform and Filter
    // ============================================================================
    for (const loc of locations) {
      const locId = String(loc._id);
      const machines = locationToMachines.get(locId) || [];
      const metrics = metricsMap.get(locId) || { totalDrop: 0, totalCancelledCredits: 0, totalJackpot: 0 };

      const totalMachines = machines.length;
      const threshold = Date.now() - 3 * 60 * 1000;
      const onlineMachines = machines.filter(m => {
        if (!m.lastActivity) return false;
        const activityDate = m.lastActivity instanceof Date ? m.lastActivity : new Date(String(m.lastActivity).replace(' ', 'T'));
        return activityDate.getTime() > threshold;
      }).length;

      const includeJackpot = licenceeIncludeJackpotMap.get(String(loc.rel?.licencee)) || false;
      const rawDrop = metrics.totalDrop || 0;
      const rawCancelled = metrics.totalCancelledCredits || 0;
      const rawJackpot = metrics.totalJackpot || 0;

      const moneyOutValue = rawCancelled + (includeJackpot ? rawJackpot : 0);
      const moneyIn = Math.round(rawDrop * 100) / 100;
      const moneyOut = Math.round(moneyOutValue * 100) / 100;
      const jackpot = Math.round(rawJackpot * 100) / 100;
      const gross = Math.round((moneyIn - moneyOut) * 100) / 100;

      locationResults.push({
        _id: locId,
        location: locId,
        locationName: loc.name,
        includeJackpot,
        moneyIn,
        moneyOut,
        gross,
        jackpot,
        totalMachines,
        onlineMachines,
        sasMachines: machines.filter(m => m.isSasMachine).length,
        nonSasMachines: machines.filter(m => !m.isSasMachine).length,
        hasSasMachines: machines.some(m => m.isSasMachine),
        hasNonSasMachines: machines.some(m => !m.isSasMachine),
        noSMIBLocation: loc.noSMIBLocation || !machines.some(m => (m.relayId as string)?.trim() || (m.smibBoard as string)?.trim()),
        hasSmib: machines.some(m => (m.relayId as string)?.trim() || (m.smibBoard as string)?.trim()),
        rel: loc.rel,
        isLocalServer: Boolean(loc.isLocalServer),
        country: loc.country,
        geoCoords: loc.geoCoords,
        deletedAt: loc.deletedAt,
        membershipEnabled: !!(loc.membershipEnabled || loc.enableMembership),
        memberCount: memberCountMap.get(locId) || 0,
        machines: machines.map(m => ({
          _id: String(m._id),
          assetNumber: m.assetNumber as string,
          serialNumber: m.serialNumber as string,
          isSasMachine: !!m.isSasMachine,
          lastActivity: m.lastActivity ? new Date(m.lastActivity as Date) : undefined,
        })),
        coinIn: 0, coinOut: 0, gamesPlayed: 0
      });
    }

    // Filtering & Sorting
    let filteredResults = locationResults;
    if (onlineStatus !== 'all') {
      filteredResults = locationResults.filter(loc => {
        const isOnline = loc.onlineMachines > 0;
        if (onlineStatus === 'online') return isOnline;
        if (onlineStatus.startsWith('offline')) return !isOnline && loc.totalMachines > 0;
        if (onlineStatus === 'neveronline') return (loc.machines?.length || 0) > 0 && loc.machines?.every(m => !m.lastActivity);
        return true;
      });
    }

    // Sort result
    filteredResults.sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortBy] ?? 0;
      const valB = (b as Record<string, unknown>)[sortBy] ?? 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });

    const paginated = filteredResults.slice(skip, skip + limit);
    let converted = await applyLocationsCurrencyConversion(paginated, licencee, displayCurrency, isAdminOrDev);

    // Reviewer Multiplier Logic
    if (reviewerMult !== null) {
      converted = converted.map(loc => {
        const rawMi = loc.moneyIn || 0;
        const rawMo = loc.moneyOut || 0;
        const rawJp = loc.jackpot || 0;
        const includeJackpot = loc.includeJackpot === true;

        const mi = rawMi * reviewerMult;
        const mo = rawMo * reviewerMult; 
        const jp = rawJp * reviewerMult;

        const gross = mi - mo;
        const netGross = includeJackpot ? (mi - mo) : (mi - mo - jp);

        return {
          ...loc,
          moneyIn: mi,
          moneyOut: mo,
          jackpot: jp,
          gross,
          netGross,
          _raw: {
            moneyIn: rawMi,
            moneyOut: rawMo,
            jackpot: rawJp,
            gross: rawMi - rawMo,
          },
          _reviewerMultiplier: reviewerMult,
        };
      });
    }

    return NextResponse.json({
      data: converted,
      pagination: {
        page, limit, totalCount: filteredResults.length,
        totalPages: Math.ceil(filteredResults.length / limit),
        hasNextPage: page < Math.ceil(filteredResults.length / limit),
        hasPrevPage: page > 1,
      },
      currency: displayCurrency,
      converted: isAdminOrDev && (licencee === 'all' || !licencee),
      performance: { totalTime: Date.now() - perfStart },
    });
  } catch (err: unknown) {
    console.error('Reports Locations API Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}

function createEmptyResponse(page: number, limit: number, currency: string) {
  return NextResponse.json({
    data: [],
    pagination: { page, limit, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    currency, converted: false,
  });
}
