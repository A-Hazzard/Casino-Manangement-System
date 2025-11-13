import { connectDB } from '@/app/api/lib/middleware/db';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD, convertToUSD } from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromServer } from '../../lib/helpers/users';
import { getUserAccessibleLicenseesFromToken, getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get('licencee') || '';
    const search = searchParams.get('search')?.trim() || '';
    const displayCurrency =
      (searchParams.get('currency') as CurrencyCode) || 'USD';

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'DB connection failed' },
        { status: 500 }
      );
    }

    // Get user's accessible licensees, roles, and location permissions from JWT token
    const userAccessibleLicensees = await getUserAccessibleLicenseesFromToken();
    
    // Get user's roles and location permissions
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    const userLocationPermissions = 
      (userPayload?.resourcePermissions as { 'gaming-locations'?: { resources?: string[] } })?.['gaming-locations']?.resources || [];

    // Apply location filtering based on licensee + location permissions
    const allowedLocationIds = await getUserLocationFilter(
      userAccessibleLicensees,
      licencee || undefined,
      userLocationPermissions,
      userRoles
    );

    // Build location matching - apply user location permissions
    const locationMatch: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    if (search) {
      locationMatch.name = { $regex: search, $options: 'i' };
    }
    if (licencee) {
      locationMatch['rel.licencee'] = licencee;
    }

    // Apply user location permissions filter
    if (allowedLocationIds !== 'all') {
      if (allowedLocationIds.length === 0) {
        // No accessible locations - return empty array
        return NextResponse.json([]);
      }
      locationMatch._id = { $in: allowedLocationIds };
    }

    // Get all locations that match the criteria with financial data
    let locations = (await db
      .collection('gaminglocations')
      .aggregate([
        // Stage 1: Filter locations by deletion status, search term, and licencee
        { $match: locationMatch },
        // Stage 2: Lookup machine statistics for each location
        {
          $lookup: {
            from: 'machines',
            let: { id: '$_id' },
            pipeline: [
              // Stage 2a: Match machines for this location (excluding deleted ones)
              {
                $match: {
                  $expr: { $eq: ['$gamingLocation', '$$id'] },
                  $or: [
                    { deletedAt: null },
                    { deletedAt: { $lt: new Date('2020-01-01') } },
                  ],
                },
              },
              // Stage 2b: Group machines to calculate counts and online status
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
        // Stage 3: Lookup financial data from meters (last 30 days by default)
        {
          $lookup: {
            from: 'meters',
            let: { locationId: { $toString: '$_id' } },
            pipeline: [
              // Stage 3a: Match meter records for this location within date range
              {
                $match: {
                  $expr: { $eq: ['$location', '$$locationId'] },
                  createdAt: {
                    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    $lte: new Date(),
                  },
                },
              },
              // Stage 3b: Group meter records to calculate financial totals
              {
                $group: {
                  _id: null,
                  totalMoneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
                  totalMoneyOut: {
                    $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                  },
                },
              },
            ],
            as: 'financialData',
          },
        },
        // Stage 4: Add computed fields for machine statistics and financial data
        {
          $addFields: {
            totalMachines: {
              $ifNull: [
                { $arrayElemAt: ['$machineStats.totalMachines', 0] },
                0,
              ],
            },
            onlineMachines: {
              $ifNull: [
                { $arrayElemAt: ['$machineStats.onlineMachines', 0] },
                0,
              ],
            },
            moneyIn: {
              $ifNull: [
                { $arrayElemAt: ['$financialData.totalMoneyIn', 0] },
                0,
              ],
            },
            moneyOut: {
              $ifNull: [
                { $arrayElemAt: ['$financialData.totalMoneyOut', 0] },
                0,
              ],
            },
            isLocalServer: { $ifNull: ['$isLocalServer', false] },
            hasSmib: { $ifNull: ['$hasSmib', false] },
            noSMIBLocation: { $not: ['$hasSmib'] },
          },
        },
        // Stage 5: Calculate gross revenue (money in minus money out)
        {
          $addFields: {
            gross: { $subtract: ['$moneyIn', '$moneyOut'] },
          },
        },
        // Stage 6: Project final fields for location response
        {
          $project: {
            _id: 1,
            name: 1,
            address: 1,
            country: 1,
            rel: 1,
            profitShare: 1,
            geoCoords: 1,
            totalMachines: 1,
            onlineMachines: 1,
            moneyIn: 1,
            moneyOut: 1,
            gross: 1,
            isLocalServer: 1,
            hasSmib: 1,
            noSMIBLocation: 1,
          },
        },
      ])
      .toArray()) as LocationAggregationResult[];

    // Get current user's role to determine if currency conversion should apply
    const currentUser = await getUserFromServer();
    const currentUserRoles = (currentUser?.roles as string[]) || [];
    const isAdminOrDev = currentUserRoles.includes('admin') || currentUserRoles.includes('developer');
    
    // Apply currency conversion ONLY for Admin/Developer viewing "All Licensees"
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
      const countriesData = await db.collection('countries').find({}).toArray();

      // Create a map of country ID to name
      const countryIdToName = new Map<string, string>();
      countriesData.forEach(country => {
        countryIdToName.set(country._id.toString(), country.name);
      });

      // Convert each location's financial data
      locations = locations.map(loc => {
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

    // Transform the data to match the expected format
    const response = locations.map((loc: LocationAggregationResult) => ({
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

    return NextResponse.json(response);
  } catch (error) {
    console.error('🔥 Search All Locations API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
