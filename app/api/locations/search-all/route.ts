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
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD, convertToUSD } from '@/lib/helpers/rates';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { TimePeriod } from '@/shared/types/common';
import type { CurrencyCode } from '@/shared/types/currency';
import { Countries } from '@/app/api/lib/models/countries';
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
            { deletedAt: { $lt: new Date('2020-01-01') } },
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

    // ============================================================================
    // STEP 6: Fetch locations with aggregation (machines, financial data)
    // ============================================================================
    // First, get matching locations
    const matchingLocations = await db
      .collection('gaminglocations')
      .aggregate([
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
                    { deletedAt: { $lt: new Date('2020-01-01') } },
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
                            new Date(Date.now() - 3 * 60 * 1000),
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
      ])
      .toArray();

    // Now calculate financial metrics for each location using gaming day ranges
    const locations = await Promise.all(
      matchingLocations.map(async location => {
        const locationId = location._id.toString();
        const gameDayOffset = location.gameDayOffset ?? 8;

        // Calculate gaming day range for this location
        const gamingDayRange = getGamingDayRangeForPeriod(
          timePeriod,
          gameDayOffset,
          customStartDate,
          customEndDate
        );

        // Get all machines for this location
        const machinesForLocation = await db
          .collection('machines')
          .find(
            {
              $and: [
                {
                  $or: [
                    { gamingLocation: locationId },
                    { gamingLocation: location._id },
                  ],
                },
                {
                  $or: [
                    { deletedAt: null },
                    { deletedAt: { $lt: new Date('2020-01-01') } },
                  ],
                },
              ],
            },
            { projection: { _id: 1 } }
          )
          .toArray();

        const machineIds = machinesForLocation.map(m => m._id.toString());

        // Aggregate meters for all machines in this location using gaming day range
        const metersAggregation = await db
          .collection('meters')
          .aggregate([
            {
              $match: {
                machine: { $in: machineIds },
                readAt: {
                  $gte: gamingDayRange.rangeStart,
                  $lte: gamingDayRange.rangeEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                totalMoneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
                totalMoneyOut: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
              },
            },
          ])
          .toArray();

        const financialData = metersAggregation[0] || {
          totalMoneyIn: 0,
          totalMoneyOut: 0,
        };

        return {
          ...location,
          totalMachines: location.machineStats?.[0]?.totalMachines || 0,
          onlineMachines: location.machineStats?.[0]?.onlineMachines || 0,
          moneyIn: financialData.totalMoneyIn || 0,
          moneyOut: financialData.totalMoneyOut || 0,
          gross:
            (financialData.totalMoneyIn || 0) -
            (financialData.totalMoneyOut || 0),
        };
      })
    );
    // Format locations for response
    const formattedLocations = (locations as LocationAggregationResult[]).map(
      loc => ({
        _id: loc._id,
        name: loc.name,
        address: loc.address,
        country: loc.country,
        rel: loc.rel,
        profitShare: loc.profitShare,
        geoCoords: loc.geoCoords,
        totalMachines: loc.totalMachines || 0,
        onlineMachines: loc.onlineMachines || 0,
        moneyIn: loc.moneyIn || 0,
        moneyOut: loc.moneyOut || 0,
        gross: loc.gross || 0,
        isLocalServer: loc.isLocalServer || false,
        hasSmib: loc.hasSmib || false,
        noSMIBLocation: !(loc.hasSmib || false),
      })
    ) as LocationAggregationResult[];

    // ============================================================================
    // STEP 7: Apply currency conversion if needed
    // ============================================================================
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const isAdminOrDev =
      currentUserRoles.includes('admin') ||
      currentUserRoles.includes('developer');

    // Apply currency conversion ONLY for Admin/Developer viewing "All Licensees"
    let finalLocations = formattedLocations;
    if (isAdminOrDev && shouldApplyCurrencyConversion(licencee)) {
      // Get licensee details for currency mapping
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
      finalLocations = formattedLocations.map(loc => {
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
    const response = finalLocations.map((loc: LocationAggregationResult) => ({
      location: loc._id.toString(),
      locationName: loc.name || 'Unknown Location',
      country: loc.country,
      address: loc.address,
      rel: loc.rel,
      profitShare: loc.profitShare,
      geoCoords: loc.geoCoords,
      totalMachines: loc.totalMachines || 0,
      onlineMachines: loc.onlineMachines || 0,
      moneyIn: loc.moneyIn || 0,
      moneyOut: loc.moneyOut || 0,
      gross: loc.gross || 0,
      isLocalServer: loc.isLocalServer || false,
      hasSmib: loc.hasSmib || false,
      noSMIBLocation: loc.noSMIBLocation || false,
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
