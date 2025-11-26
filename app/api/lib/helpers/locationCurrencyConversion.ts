/**
 * Location Currency Conversion Helper
 *
 * This file contains helper functions for converting location financial data
 * between different currencies based on licensee and country settings.
 */

import type { CurrencyCode } from '@/shared/types/currency';
import type { AggregatedLocation } from '@/lib/types/location';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD, convertToUSD, getCountryCurrency, getLicenseeCurrency } from '@/lib/helpers/rates';
import { Db } from 'mongodb';

/**
 * Converts location financial data to display currency
 *
 * @param rows - Array of aggregated locations
 * @param displayCurrency - Target currency code
 * @param licencee - Licensee filter (if any)
 * @param db - MongoDB database instance
 * @returns Promise<AggregatedLocation[]>
 */
export async function convertLocationCurrency(
  rows: AggregatedLocation[],
  displayCurrency: CurrencyCode,
  licencee: string | undefined,
  db: Db
): Promise<AggregatedLocation[]> {
  if (!shouldApplyCurrencyConversion(licencee)) {
    return rows;
  }

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

  // Convert each location's financial data
  // Meter values are stored in the location's native currency
  // Convert from native currency to USD, then to display currency
  return rows.map(location => {
    const locationLicenseeId = location.rel?.licencee as string | undefined;

    let nativeCurrency: string = 'USD';

    if (!locationLicenseeId) {
      // Unassigned locations - determine currency from country
      const countryId = location.country as string | undefined;
      const countryName = countryId
        ? countryIdToName.get(countryId.toString())
        : undefined;
      nativeCurrency = countryName
        ? getCountryCurrency(countryName)
        : 'USD';
    } else {
      // Get licensee's native currency
      const licenseeName =
        licenseeIdToName.get(locationLicenseeId.toString()) || 'Unknown';
      nativeCurrency = getLicenseeCurrency(licenseeName);
    }

    // Convert from native currency to USD, then to display currency
    const moneyInUSD = convertToUSD(location.moneyIn || 0, nativeCurrency);
    const moneyOutUSD = convertToUSD(location.moneyOut || 0, nativeCurrency);
    const totalDropUSD = convertToUSD(location.totalDrop || 0, nativeCurrency);
    const grossUSD = convertToUSD(location.gross || 0, nativeCurrency);

    return {
      ...location,
      moneyIn: convertFromUSD(moneyInUSD, displayCurrency),
      moneyOut: convertFromUSD(moneyOutUSD, displayCurrency),
      totalDrop: convertFromUSD(totalDropUSD, displayCurrency),
      gross: convertFromUSD(grossUSD, displayCurrency),
    };
  });
}

/**
 * Applies machine type filters to location rows
 *
 * @param rows - Array of aggregated locations
 * @param machineTypeFilter - Filter string (comma-separated)
 * @returns AggregatedLocation[]
 */
export function applyMachineTypeFilter(
  rows: AggregatedLocation[],
  machineTypeFilter: string | null
): AggregatedLocation[] {
  if (!machineTypeFilter) {
    return rows;
  }

  // Handle comma-separated multiple filters
  const filters = machineTypeFilter.split(',').filter(f => f.trim() !== '');

  return rows.filter(loc => {
    // Apply AND logic - location must match ALL selected filters
    return filters.every(filter => {
      switch (filter.trim()) {
        case 'LocalServersOnly':
          return loc.isLocalServer === true;
        case 'SMIBLocationsOnly':
          return loc.noSMIBLocation === false;
        case 'NoSMIBLocation':
          return loc.noSMIBLocation === true;
        default:
          return true;
      }
    });
  });
}

