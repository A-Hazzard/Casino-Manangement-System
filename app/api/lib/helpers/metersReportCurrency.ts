/**
 * Currency Conversion Helper for Meters Report
 *
 * This module handles currency conversion for the meters report when viewing
 * "All Licensees" mode as an Admin or Developer.
 *
 * @module app/api/lib/helpers/metersReportCurrency
 */

import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
} from '@/lib/helpers/rates';
import type { CurrencyCode } from '@/shared/types/currency';
import type { Db } from 'mongodb';
import { Countries } from '../models/countries';
import { Licencee } from '../models/licencee';
import type {
  LocationWithGamingDay,
  TransformedMeterData,
} from './metersReport';

/**
 * Location details for currency determination
 */
type LocationDetails = {
  licensee: string | null;
  country: string | null;
};

/**
 * Build maps for currency conversion lookup
 *
 * @param db - MongoDB database instance
 * @param locationsData - Location data with licensee and country info
 * @returns Maps for licensee-to-country and location-to-details lookup
 */
export async function buildCurrencyMaps(
  db: Db,
  locationsData: LocationWithGamingDay[]
): Promise<{
  licenseeMap: Map<string, string>;
  countryNameMap: Map<string, string>;
  locationDetailsMap: Map<string, LocationDetails>;
}> {
  // Fetch licensee mappings
  const allLicensees = await Licencee.find({}, { _id: 1, name: 1, country: 1 })
    .lean()
    .exec();

  const licenseeMap = new Map<string, string>();
  allLicensees.forEach((lic: Record<string, unknown>) => {
    licenseeMap.set(lic.name as string, lic.country as string);
  });

  // Fetch country names from country IDs
  const countryIds = locationsData
    .map(loc => loc.country)
    .filter((id): id is string => !!id);

  const countries = await Countries.find(
    { _id: { $in: countryIds } },
    { _id: 1, name: 1 }
  )
    .lean()
    .exec();

  const countryNameMap = new Map<string, string>();
  countries.forEach((country: Record<string, unknown>) => {
    countryNameMap.set(String(country._id), country.name as string);
  });

  // Build location details map
  const locationDetailsMap = new Map<string, LocationDetails>();
  locationsData.forEach(loc => {
    const countryId = loc.country;
    const countryName = countryId ? countryNameMap.get(countryId) : null;

    locationDetailsMap.set(loc._id, {
      licensee: loc.rel?.licencee || null,
      country: countryName || null,
    });
  });

  return {
    licenseeMap,
    countryNameMap,
    locationDetailsMap,
  };
}

/**
 * Determine the native currency for a location
 *
 * @param locationDetails - Location details with licensee and country info
 * @param licenseeMap - Map of licensee name to country ID
 * @returns Native currency code for the location
 */
function getNativeCurrencyForLocation(
  locationDetails: LocationDetails | undefined,
  licenseeMap: Map<string, string>
): CurrencyCode {
  if (!locationDetails) {
    return 'USD';
  }

  if (locationDetails.licensee) {
    const licenseeCountry = licenseeMap.get(locationDetails.licensee);
    if (licenseeCountry) {
      return getCountryCurrency(licenseeCountry);
    }
  }

  if (locationDetails.country) {
    return getCountryCurrency(locationDetails.country);
  }

  return 'USD';
}

/**
 * Convert financial fields from native currency to display currency
 *
 * @param item - Meter data item to convert
 * @param nativeCurrency - Native currency of the location
 * @param displayCurrency - Target display currency
 * @returns Converted meter data item
 */
function convertMeterDataCurrency(
  item: TransformedMeterData,
  nativeCurrency: CurrencyCode,
  displayCurrency: CurrencyCode
): TransformedMeterData {
  // Only convert if native currency differs from display currency
  if (nativeCurrency === displayCurrency) {
    return item;
  }

  const convertedItem = { ...item };

  // Convert financial fields: native → USD → displayCurrency
  const financialFields: Array<keyof TransformedMeterData> = [
    'billIn',
    'metersIn',
    'metersOut',
    'jackpot',
    'voucherOut',
    'attPaidCredits',
  ];

  financialFields.forEach(field => {
    const value = convertedItem[field];
    if (typeof value === 'number') {
      // Step 1: Convert from native currency to USD
      const usdValue = convertToUSD(value, nativeCurrency);
      // Step 2: Convert from USD to display currency
      (convertedItem as Record<string, unknown>)[field] = convertFromUSD(
        usdValue,
        displayCurrency
      );
    }
  });

  return convertedItem;
}

/**
 * Apply currency conversion to all meter data items
 *
 * @param data - Array of meter data items
 * @param locationDetailsMap - Map of location ID to location details
 * @param licenseeMap - Map of licensee name to country ID
 * @param displayCurrency - Target display currency
 * @returns Array of converted meter data items
 */
export function applyCurrencyConversion(
  data: TransformedMeterData[],
  locationDetailsMap: Map<string, LocationDetails>,
  licenseeMap: Map<string, string>,
  displayCurrency: CurrencyCode
): TransformedMeterData[] {
  return data.map(item => {
    const locationDetails = locationDetailsMap.get(item.locationId);
    const nativeCurrency = getNativeCurrencyForLocation(
      locationDetails,
      licenseeMap
    );

    return convertMeterDataCurrency(item, nativeCurrency, displayCurrency);
  });
}
