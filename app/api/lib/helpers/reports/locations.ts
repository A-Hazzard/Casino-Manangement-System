/**
 * Locations Report Helper Functions
 *
 * This module contains helper functions for the locations report API route.
 * It handles processing aggregated location data and currency conversion.
 *
 * @module app/api/lib/helpers/locationsReport
 */

import { Licencee } from '@/app/api/lib/models/licencee';
import { Countries } from '@/app/api/lib/models/countries';
import { Machine } from '@/app/api/lib/models/machines';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenseeCurrency,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import type { AggregatedLocation } from '@/shared/types/entities';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextResponse } from 'next/server';

/**
 * Applies currency conversion to a list of aggregated locations
 */
export async function applyLocationsCurrencyConversion(
  paginatedData: AggregatedLocation[],
  licencee: string | undefined,
  displayCurrency: CurrencyCode,
  isAdminOrDev: boolean
): Promise<AggregatedLocation[]> {
  if (!isAdminOrDev || !shouldApplyCurrencyConversion(licencee)) {
    return paginatedData;
  }

  try {
    await connectDB();
    
    // Get licensee details for currency mapping
    const licenseesData = await Licencee.find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    })
      .select('_id name')
      .lean();

    // Create a map of licensee ID to name
    const licenseeIdToName = new Map<string, string>();
    licenseesData.forEach((lic: { _id: unknown; name?: string }) => {
      if (lic._id && lic.name) {
        licenseeIdToName.set(String(lic._id), lic.name);
      }
    });

    // Get country details for currency mapping
    const countriesData = await Countries.find({}).lean();
    const countryIdToName = new Map<string, string>();
    countriesData.forEach((country: { _id: unknown; name?: string }) => {
      if (country._id && country.name) {
        countryIdToName.set(String(country._id), country.name);
      }
    });

    // Convert each location's financial data
    return paginatedData.map(location => {
      const locationLicenseeId = location.rel?.licencee as string | undefined;
      let nativeCurrency: CurrencyCode = 'USD';

      if (!locationLicenseeId) {
        const countryId = location.country as string | undefined;
        const countryName = countryId ? countryIdToName.get(countryId.toString()) : undefined;
        nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';
      } else {
        const licenseeName = licenseeIdToName.get(locationLicenseeId.toString()) || 'Unknown';
        if (!licenseeName || licenseeName === 'Unknown') {
          const countryId = location.country as string | undefined;
          const countryName = countryId ? countryIdToName.get(countryId.toString()) : undefined;
          nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';
        } else {
          nativeCurrency = getLicenseeCurrency(licenseeName);
        }
      }

      if (nativeCurrency === displayCurrency) {
        return location;
      }

      const convertedLocation = { ...location };
      const convert = (val: number) => 
        Math.round(convertFromUSD(convertToUSD(val, nativeCurrency), displayCurrency) * 100) / 100;

      if (typeof location.moneyIn === 'number') convertedLocation.moneyIn = convert(location.moneyIn);
      if (typeof location.moneyOut === 'number') convertedLocation.moneyOut = convert(location.moneyOut);
      if (typeof location.gross === 'number') convertedLocation.gross = convert(location.gross);

      return convertedLocation;
    });
  } catch (error) {
    console.error(`❌ Currency conversion failed:`, error);
    return paginatedData;
  }
}

/**
 * Handles the summary mode for locations (used for dropdowns and quick lists)
 */
export async function handleSummaryMode(
  locations: Array<{
    _id: unknown;
    name: string;
    rel?: Record<string, unknown>;
    isLocalServer?: boolean;
    geoCoords?: unknown;
    membershipEnabled?: boolean;
    enableMembership?: boolean;
  }>,
  displayCurrency: string,
  perfStart: number
) {
  const allLocationIds = locations.map(loc => String(loc._id));
  const machineCounts = await Machine.aggregate([
    { $match: { gamingLocation: { $in: allLocationIds }, deletedAt: { $in: [null, new Date(-1)] } } },
    { $group: {
      _id: '$gamingLocation',
      totalMachines: { $sum: 1 },
      sasMachines: { $sum: { $cond: [{ $eq: ['$isSasMachine', true] }, 1, 0] } },
      onlineMachines: { $sum: { $cond: [{ $gt: ['$lastActivity', new Date(Date.now() - 24 * 60 * 60 * 1000)] }, 1, 0] } },
    }},
  ]);

  const countsMap = new Map(machineCounts.map(c => [c._id, c]));
  const summaryResults = locations.map(loc => {
    const counts = countsMap.get(String(loc._id)) || { totalMachines: 0, sasMachines: 0, onlineMachines: 0 };
    return {
      _id: String(loc._id), location: String(loc._id), locationName: loc.name,
      totalMachines: counts.totalMachines, sasMachines: counts.sasMachines,
      onlineMachines: counts.onlineMachines, moneyIn: 0, moneyOut: 0, gross: 0,
      rel: loc.rel, isLocalServer: loc.isLocalServer, geoCoords: loc.geoCoords,
      membershipEnabled: loc.membershipEnabled || loc.enableMembership || false,
    };
  });

  return NextResponse.json({
    data: summaryResults,
    pagination: { 
      page: 1, 
      limit: locations.length, 
      totalCount: locations.length, 
      totalPages: 1, 
      hasNextPage: false, 
      hasPrevPage: false 
    },
    currency: displayCurrency,
    converted: false,
    performance: { totalTime: Date.now() - perfStart, mode: 'summary' },
  });
}



