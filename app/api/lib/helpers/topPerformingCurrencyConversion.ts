/**
 * Top Performing Currency Conversion Helper
 *
 * This file contains helper functions for converting top performing metrics
 * between different currencies based on licensee and country settings.
 */

import {
    convertFromUSD,
    convertToUSD,
    getCountryCurrency,
    getLicenseeCurrency,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import { Db } from 'mongodb';

// Define the type for top performing items (matches the one in lib/types/index.ts)
export interface TopPerformingItem {
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
 * @param licencee - Licensee filter (if any)
 * @param db - MongoDB database instance
 * @returns Promise<TopPerformingItem[]>
 */
export async function convertTopPerformingCurrency(
  data: TopPerformingItem[],
  displayCurrency: CurrencyCode,
  licencee: string | undefined,
  db: Db
): Promise<TopPerformingItem[]> {
  // Always convert when this function is called
  // Each machine's native currency is determined by its location's licensee

  // Get currency mappings
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

  const licenseeIdToName = new Map<string, string>();
  licenseesData.forEach(lic => {
    licenseeIdToName.set(lic._id.toString(), lic.name);
  });

  const countriesData = await db.collection('countries').find({}).toArray();
  const countryIdToName = new Map<string, string>();
  countriesData.forEach(country => {
    countryIdToName.set(country._id.toString(), country.name);
  });

  // We need to fetch location details to know the licensee/country for each item
  // Collect all unique location IDs
  const locationIds = new Set<string>();
  data.forEach(item => {
    if (item.locationId) {
      locationIds.add(item.locationId);
    }
  });

  // Fetch location details
  console.log('[TopPerforming Currency] Converting', data.length, 'items to', displayCurrency);
  console.log('[TopPerforming Currency] Location IDs:', Array.from(locationIds));
  
  // Note: Database uses string IDs, not ObjectIds
  const locationsCollection = db.collection<{
    _id: string;
    rel?: { licencee?: string };
    country?: string;
  }>('gaminglocations');

  const locationsData = await locationsCollection
    .find(
      { _id: { $in: Array.from(locationIds) } },
      { projection: { _id: 1, 'rel.licencee': 1, country: 1 } }
    )
    .toArray();

  console.log('[TopPerforming Currency] Found', locationsData.length, 'locations');

  const locationDetails = new Map<string, { licenseeId?: string; countryId?: string }>();
  locationsData.forEach(loc => {
    locationDetails.set(loc._id.toString(), {
      licenseeId: loc.rel?.licencee,
      countryId: loc.country,
    });
  });

  // Convert each item's financial data
  return data.map(item => {
    let nativeCurrency: string = 'USD';

    if (item.locationId) {
      const details = locationDetails.get(item.locationId);
      if (details) {
        if (details.licenseeId) {
          // Get licensee's native currency
          const licenseeName = licenseeIdToName.get(details.licenseeId.toString()) || 'Unknown';
          nativeCurrency = getLicenseeCurrency(licenseeName);
        } else if (details.countryId) {
          // Unassigned locations - determine currency from country
          const countryName = countryIdToName.get(details.countryId.toString());
          nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';
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

    console.log(`[TopPerforming Currency] ${item.name}: ${item.totalDrop} ${nativeCurrency} -> ${converted.totalDrop} ${displayCurrency}`);

    return converted;
  });
}
