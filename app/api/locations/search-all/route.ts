/**
 * Locations Search All API Route
 *
 * This route handles searching all locations with financial metrics and currency conversion.
 * It supports:
 * - Location name and ID search
 * - Licensee filtering
 * - Role-based access control
 * - Currency conversion (Admin/Developer only for "All Licensees")
 * - Financial metrics aggregation
 * - Machine statistics
 *
 * @module app/api/locations/search-all/route
 */

import {
    getUserAccessibleLicenseesFromToken,
    getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { getMemberCountsPerLocation } from '@/app/api/lib/helpers/membershipAggregation';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD, convertToUSD } from '@/lib/helpers/rates';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { TimePeriod } from '@/shared/types/common';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

type LocationAggregationResult = {
  _id: string;
  name: string;
  address?: string;
  country?: string;
  rel?: Record<string, unknown>;
  profitShare?: number;
  geoCoords?: Record<string, unknown>;
  totalMachines: number;
  onlineMachines: number;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  isLocalServer: boolean;
  hasSmib: boolean;
  noSMIBLocation: boolean;
  membershipEnabled?: boolean;
  memberCount?: number;
};

/**
 * Main GET handler for searching all locations
 *
 * Flow:
 * 1. Parse query parameters (licensee, search, currency)
 * 2. Connect to database
 * 3. Get user's accessible licensees and permissions
 * 4. Apply location filtering based on permissions
 * 5. Build location match filter
 * 6. Fetch locations with aggregation (machines, financial data)
 * 7. Apply currency conversion if needed
 * 8. Return formatted location data
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get('licencee') || '';
    const search = searchParams.get('search')?.trim() || '';
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';
    const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || '30d';
    const customStartDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const customEndDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const machineTypeFilter = searchParams.get('machineTypeFilter');

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'DB connection failed' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Get user's accessible licensees and permissions
    // ============================================================================
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    // Use only new field
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
    // STEP 4: Apply location filtering based on permissions
    // ============================================================================
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // ============================================================================
    // STEP 5: Build location match filter
    // ============================================================================
    const locationMatch: {
      $and: Array<Record<string, unknown>>;
      [key: string]: unknown;
    } = {
      $and: [
        {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        },
      ],
    };

    if (search) {
      // Check if search looks like an _id (MongoDB ObjectId format or string ID)
      const isObjectIdFormat = /^[0-9a-fA-F]{24}$/.test(search.trim());
      if (isObjectIdFormat) {
        // Try to match _id first, then fall back to name search
        locationMatch.$and.push({
          $or: [
            { _id: search.trim() },
            { name: { $regex: search, $options: 'i' } },
          ],
        });
      } else {
        // Regular search - match name or _id (partial match)
        locationMatch.$and.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { _id: { $regex: search, $options: 'i' } },
          ],
        });
      }
    }
    if (licencee) {
      locationMatch.$and.push({ 'rel.licencee': licencee });
    }

    // Apply user location permissions filter
    if (allowedLocationIds !== 'all') {
      if (allowedLocationIds.length === 0) {
        // No accessible locations - return empty array
        return NextResponse.json([]);
      }
      locationMatch.$and.push({ _id: { $in: allowedLocationIds } });
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
        combinedFilters.forEach(filter => {
          locationMatch.$and.push(filter);
        });
      }
    }

    // ============================================================================
    // STEP 6: Fetch locations with aggregation (machines, financial data)
    // ============================================================================
    // First, get matching locations
    const matchingLocations = await GamingLocations.aggregate([
      { $match: locationMatch },
      {
        $lookup: {
          from: 'machines',
          let: { id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $eq: [
                        { $toString: '$gamingLocation' },
                        { $toString: '$$id' },
                      ],
                    },
                    { $eq: ['$gamingLocation', '$$id'] },
                  ],
                },
                $or: [
                  { deletedAt: null },
                  { deletedAt: { $lt: new Date('2025-01-01') } },
                ],
              },
            },
            {
              $group: {
                _id: null,
                totalMachines: { $sum: 1 },
                onlineMachines: {
                  $sum: {
                    $cond: [
                      {
                        $gt: [
                          '$lastActivity',
                          new Date(Date.now() - 24 * 60 * 60 * 1000),
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: 'machineStats',
        },
      },
    ]).exec();

    // ============================================================================
    // OPTIMIZED: Calculate financial metrics using batch queries instead of N+1
    // ============================================================================
    // Step 1: Calculate gaming day ranges for all locations
    const gamingDayRanges = new Map<
      string,
      { rangeStart: Date; rangeEnd: Date; gameDayOffset: number }
    >();
    matchingLocations.forEach(location => {
      const locationId = String(location._id);
      const gameDayOffset = location.gameDayOffset ?? 8;
      const gamingDayRange = getGamingDayRangeForPeriod(
        timePeriod,
        gameDayOffset,
        customStartDate,
        customEndDate
      );
      gamingDayRanges.set(locationId, {
        ...gamingDayRange,
        gameDayOffset,
      });
    });

    // Step 2: Get global date range for initial meter query
    let globalStart = new Date();
    let globalEnd = new Date(0);
    gamingDayRanges.forEach(range => {
      if (range.rangeStart < globalStart) globalStart = range.rangeStart;
      if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
    });

    // Step 3: Get ALL location IDs
    const allLocationIds = matchingLocations.map(loc => {
      // Ensure we get the string representation of the ID, handling both String and ObjectId
      const id = loc._id;
      return typeof id === 'object' && id !== null && 'toString' in id
        ? id.toString()
        : String(id);
    });

    // Step 4: Get ALL machines for ALL locations in one query
    const allMachines = await Machine.find(
      {
        $and: [
          {
            $or: [
              { gamingLocation: { $in: allLocationIds } },
              { gamingLocation: { $in: matchingLocations.map(l => l._id) } },
            ],
          },
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          },
        ],
      },
      { _id: 1, gamingLocation: 1 }
    )
      .lean()
      .exec();

    // Step 5: Group machines by location
    const machinesByLocation = new Map<string, string[]>();
    allMachines.forEach(machine => {
      const locationId = machine.gamingLocation
        ? String(machine.gamingLocation)
        : null;
      if (locationId && allLocationIds.includes(locationId)) {
        if (!machinesByLocation.has(locationId)) {
          machinesByLocation.set(locationId, []);
        }
        machinesByLocation.get(locationId)!.push(String(machine._id));
      }
    });

    // Step 6: Get ALL meters for ALL locations
    const metersByLocation = new Map<
      string,
      { totalMoneyIn: number; totalMoneyOut: number }
    >();

    if (allLocationIds.length > 0) {
      // Use aggregation to group by location AND hour to avoid inflation
      const cursor = Meters.aggregate([
        {
          $match: {
            location: { $in: allLocationIds },
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
              // Truncate to hour for bucketed summation
              hour: { $dateTrunc: { date: '$readAt', unit: 'hour' } },
            },
            totalMoneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalMoneyOut: {
              $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
            },
          },
        },
      ]).cursor({ batchSize: 1000 });

      for await (const doc of cursor) {
        const locationId = String(doc._id.location);
        const bucketHour = new Date(doc._id.hour);
        const gamingDayRange = gamingDayRanges.get(locationId);

        if (!gamingDayRange) continue;

        // Only include buckets that are within this location's specific gaming day range
        const isWithinRange =
          bucketHour >= gamingDayRange.rangeStart &&
          bucketHour <= gamingDayRange.rangeEnd;

        if (isWithinRange) {
          if (!metersByLocation.has(locationId)) {
            metersByLocation.set(locationId, {
              totalMoneyIn: 0,
              totalMoneyOut: 0,
            });
          }
          const current = metersByLocation.get(locationId)!;
          current.totalMoneyIn += (doc.totalMoneyIn as number) || 0;
          current.totalMoneyOut += (doc.totalMoneyOut as number) || 0;
        }
      }
    }

    const memberCountMap = await getMemberCountsPerLocation(allLocationIds);

    // Step 8: Combine results and create the initial AggregatedLocation objects
    const locations: LocationAggregationResult[] = matchingLocations.map(location => {
      const locationId = String(location._id);
      const financialData = metersByLocation.get(locationId) || {
        totalMoneyIn: 0,
        totalMoneyOut: 0,
      };

      const membershipEnabled = Boolean(
        location.membershipEnabled ||
          (location as { enableMembership?: boolean }).enableMembership
      );

      return {
        _id: locationId,
        name: location.name,
        address: location.address,
        country: location.country,
        rel: location.rel,
        profitShare: location.profitShare,
        geoCoords: location.geoCoords,
        totalMachines: location.machineStats?.[0]?.totalMachines || 0,
        onlineMachines: location.machineStats?.[0]?.onlineMachines || 0,
        moneyIn: financialData.totalMoneyIn || 0,
        moneyOut: financialData.totalMoneyOut || 0,
        gross: (financialData.totalMoneyIn || 0) - (financialData.totalMoneyOut || 0),
        isLocalServer: location.isLocalServer || false,
        hasSmib: location.hasSmib || false,
        noSMIBLocation: !(location.hasSmib || false),
        membershipEnabled,
        memberCount: memberCountMap.get(locationId) || 0,
      };
    });

    // ============================================================================
    // STEP 7: Apply currency conversion if needed
    // ============================================================================
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const isAdminOrDev =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer');

    // Apply currency conversion ONLY for Admin/Developer viewing "All Licensees"
    let finalLocations = locations;
    if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
      // Get licensee details for currency mapping
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

      // Get country details for currency mapping (for unassigned locations)
      const { getCountryCurrency } = await import('@/lib/helpers/rates');
      const countriesData = await Countries.find({}).lean();

      // Create a map of country ID to name
      const countryIdToName = new Map<string, string>();
      countriesData.forEach(country => {
        if (country._id && country.name) {
          countryIdToName.set(String(country._id), country.name);
        }
      });

      // Convert each location's financial data
      finalLocations = locations.map(loc => {
        const licenseeId = loc.rel?.licencee as string | undefined;

        if (!licenseeId) {
          // Unassigned locations - determine currency from country
          const countryId = loc.country as string | undefined;
          const countryName = countryId
            ? countryIdToName.get(countryId.toString())
            : undefined;
          const nativeCurrency = countryName
            ? getCountryCurrency(countryName)
            : 'USD';

          // Convert from country's native currency to display currency
          const moneyInUSD = convertToUSD(loc.moneyIn, nativeCurrency);
          const moneyOutUSD = convertToUSD(loc.moneyOut, nativeCurrency);
          const grossUSD = convertToUSD(loc.gross, nativeCurrency);

          return {
            ...loc,
            moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
            moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
            gross: convertFromUSD(grossUSD, displayCurrency),
          };
        }

        const licenseeName =
          licenseeIdToName.get(licenseeId.toString()) || 'Unknown';

        // Convert from licensee's native currency to USD, then to display currency
        const moneyInUSD = convertToUSD(loc.moneyIn, licenseeName);
        const moneyOutUSD = convertToUSD(loc.moneyOut, licenseeName);
        const grossUSD = convertToUSD(loc.gross, licenseeName);

        return {
          ...loc,
          moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
          moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
          gross: convertFromUSD(grossUSD, displayCurrency),
        };
      });
    }

    // ============================================================================
    // STEP 8: Return formatted location data
    // ============================================================================
    // Step 9: Return final results with unified property mapping
    const response = finalLocations.map((loc) => ({
      location: loc._id,
      locationName: loc.name || 'Unknown Location',
      country: loc.country,
      address: loc.address,
      rel: loc.rel,
      profitShare: loc.profitShare,
      geoCoords: loc.geoCoords,
      totalMachines: loc.totalMachines,
      onlineMachines: loc.onlineMachines,
      moneyIn: loc.moneyIn,
      moneyOut: loc.moneyOut,
      gross: loc.gross,
      isLocalServer: loc.isLocalServer,
      hasSmib: loc.hasSmib,
      noSMIBLocation: loc.noSMIBLocation,
      membershipEnabled: loc.membershipEnabled,
      memberCount: loc.memberCount,
    }));

    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(`[Locations Search All API] Completed in ${duration}ms`);
    }

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Locations Search All API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

