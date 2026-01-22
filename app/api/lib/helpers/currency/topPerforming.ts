/**
 * Top Performing Currency Conversion Helper
 *
 * This file contains helper functions for converting top performing metrics
 * between different currencies based on licensee and country settings.
 */

import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenseeCurrency,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';

// Define the type for top performing items (matches the one in lib/types/index.ts)
export type TopPerformingItem = {
  name: string;
  locationId?: string;
  machineId?: string;
  totalDrop: number;
  totalCoinIn?: number;
  totalCoinOut?: number;
  totalCancelledCredits?: number;
  totalJackpot?: number;
  totalGamesPlayed: number;
  // Additional fields that might be present
  customName?: string;
  assetNumber?: string;
  game?: string;
  location?: string;
  color?: string;
}

/**
 * Converts top performing metrics to display currency
 *
 * @param data - Array of top performing items
 * @param displayCurrency - Target currency code
 * @returns Promise<TopPerformingItem[]>
 */
export async function convertTopPerformingCurrency(
  data: TopPerformingItem[],
  displayCurrency: CurrencyCode
): Promise<TopPerformingItem[]> {
  // Always convert when this function is called
  // Each machine's native currency is determined by its location's licensee

  // Get currency mappings
  const licenseesData = await Licencee.find(
    {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    },
    { _id: 1, name: 1 }
  ).lean();

  const licenseeIdToName = new Map<string, string>();
  licenseesData.forEach(lic => {
    if (lic._id && lic.name) {
      licenseeIdToName.set(String(lic._id), lic.name);
    }
  });

  const countriesData = await Countries.find({}).lean();
  const countryIdToName = new Map<string, string>();
  countriesData.forEach(country => {
    if (country._id && country.name) {
      countryIdToName.set(String(country._id), country.name);
    }
  });

  // We need to fetch location details to know the licensee/country for each item
  // Collect all unique location IDs
  const locationIds = new Set<string>();
  data.forEach(item => {
    if (item.locationId) {
      locationIds.add(item.locationId);
    }
  });

  // Fetch location details using Mongoose model
  const locationsData = await GamingLocations.find(
    { _id: { $in: Array.from(locationIds) } },
    { _id: 1, 'rel.licencee': 1, country: 1 }
  ).lean();

  const locationDetails = new Map<
    string,
    { licenseeId?: string; countryId?: string }
  >();
  locationsData.forEach(loc => {
    if (loc._id) {
      locationDetails.set(String(loc._id), {
        licenseeId: loc.rel?.licencee,
        countryId: loc.country,
      });
    }
  });

  // Convert each item's financial data
  return data.map(item => {
    let nativeCurrency: string = 'USD';

    if (item.locationId) {
      const details = locationDetails.get(item.locationId);
      if (details) {
        if (details.licenseeId) {
          // Get licensee's native currency
          const licenseeName =
            licenseeIdToName.get(details.licenseeId.toString()) || 'Unknown';
          nativeCurrency = getLicenseeCurrency(licenseeName);
        } else if (details.countryId) {
          // Unassigned locations - determine currency from country
          const countryName = countryIdToName.get(details.countryId.toString());
          nativeCurrency = countryName
            ? getCountryCurrency(countryName)
            : 'USD';
        }
      }
    }

    // Helper to convert value
    const convertValue = (val: number | undefined): number | undefined => {
      if (val === undefined) return undefined;
      const valUSD = convertToUSD(val, nativeCurrency);
      return convertFromUSD(valUSD, displayCurrency);
    };

    const converted = {
      ...item,
      totalDrop: convertValue(item.totalDrop) || 0,
      totalCoinIn: convertValue(item.totalCoinIn),
      totalCoinOut: convertValue(item.totalCoinOut),
      totalCancelledCredits: convertValue(item.totalCancelledCredits),
      totalJackpot: convertValue(item.totalJackpot),
    };

    return converted;
  });
}

