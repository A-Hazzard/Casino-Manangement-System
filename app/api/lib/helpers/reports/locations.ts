/**
 * Locations Report Helper Functions
 *
 * This module contains helper functions for the locations report API route.
 * It handles processing aggregated location data and currency conversion.
 *
 * @module app/api/lib/helpers/locationsReport
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { Countries } from '@/app/api/lib/models/countries';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenceeCurrency,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import type { AggregatedLocation } from '@/shared/types/entities';
import type { LocationDocument } from '@/lib/types/common';
import { NextResponse } from 'next/server';

/**
 * Applies currency conversion to a list of aggregated locations.
 * 
 * Determines the native currency for each location based on its licencee or country,
 * then converts financial figures (moneyIn, moneyOut, gross) to the display currency.
 * 
 * @param {AggregatedLocation[]} paginatedData - The list of location data to convert
 * @param {string | undefined} licencee - The licencee filter from request
 * @param {CurrencyCode} displayCurrency - The target currency code
 * @param {boolean} isAdminOrDev - Whether the user has admin/dev privileges
 * @returns {Promise<AggregatedLocation[]>} The converted location data
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

    // Get licencee details for currency mapping
    const licenceesData = await Licencee.find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    })
      .select('_id name')
      .lean();

    // Create a map of licencee ID to name
    const licenceeIdToName = new Map<string, string>();
    licenceesData.forEach((licenceeData: { _id: unknown; name?: string }) => {
      if (licenceeData._id && licenceeData.name) {
        licenceeIdToName.set(String(licenceeData._id), licenceeData.name);
      }
    });

    // Get country details for currency mapping
    const countriesData = await Countries.find({}).lean();
    const countryIdToName = new Map<string, string>();
    countriesData.forEach((countryData: { _id: unknown; name?: string }) => {
      if (countryData._id && countryData.name) {
        countryIdToName.set(String(countryData._id), countryData.name);
      }
    });

    // Convert each location's financial data
    return paginatedData.map(location => {
      const locationLicenceeId = location.rel?.licencee as string | undefined;
      let nativeCurrency: CurrencyCode = 'USD';

      if (!locationLicenceeId) {
        const countryId = location.country as string | undefined;
        const countryName = countryId ? countryIdToName.get(countryId.toString()) : undefined;
        nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';
      } else {
        const licenceeName = licenceeIdToName.get(locationLicenceeId.toString()) || 'Unknown';
        if (!licenceeName || licenceeName === 'Unknown') {
          const countryId = location.country as string | undefined;
          const countryName = countryId ? countryIdToName.get(countryId.toString()) : undefined;
          nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';
        } else {
          nativeCurrency = getLicenceeCurrency(licenceeName);
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
 * Handles the summary mode for locations (used for dropdowns and quick lists).
 * 
 * Aggregates machine counts (total, SAS, online) for each provided location.
 * aceEnabled locations have their online machine count forced to match total machines.
 * 
 * @param {LocationDocument[]} locations - The list of raw location documents
 * @param {string} displayCurrency - The currency to report in the response
 * @param {number} perfStart - Performance hook timestamp
 * @returns {Promise<NextResponse>} Standard report response with summary data
 */
export async function handleSummaryMode(
  locations: LocationDocument[],
  displayCurrency: string,
  perfStart: number
) {
  const allLocationIds = locations.map(loc => String(loc._id));
  // Build a set of aceEnabled location IDs so online count can be overridden after aggregation
  const aceEnabledLocIds = new Set(
    locations.filter(loc => loc.aceEnabled === true).map(loc => String(loc._id))
  );
  const machineCounts = await Machine.aggregate([
    { $match: { gamingLocation: { $in: allLocationIds }, deletedAt: { $in: [null, new Date(-1)] } } },
    {
      $group: {
        _id: '$gamingLocation',
        totalMachines: { $sum: 1 },
        sasMachines: { $sum: { $cond: [{ $eq: ['$isSasMachine', true] }, 1, 0] } },
        onlineMachines: { $sum: { $cond: [{ $gt: ['$lastActivity', new Date(Date.now() - 3 * 60 * 1000)] }, 1, 0] } },
      }
    },
  ]);

  const countsMap = new Map(machineCounts.map(c => [c._id, c]));
  const summaryResults = locations.map(loc => {
    const locId = String(loc._id);
    const counts = countsMap.get(locId) || { totalMachines: 0, sasMachines: 0, onlineMachines: 0 };
    // aceEnabled locations treat all their machines as online
    const onlineMachines = aceEnabledLocIds.has(locId) ? counts.totalMachines : counts.onlineMachines;
    return {
      _id: locId, location: locId, locationName: loc.name,
      totalMachines: counts.totalMachines, sasMachines: counts.sasMachines,
      onlineMachines, moneyIn: 0, moneyOut: 0, gross: 0,
      rel: loc.rel, isLocalServer: loc.isLocalServer, geoCoords: loc.geoCoords,
      membershipEnabled: loc.membershipEnabled || loc.enableMembership || false,
      aceEnabled: loc.aceEnabled || false,
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



