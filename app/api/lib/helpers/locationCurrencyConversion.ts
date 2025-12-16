/**
 * Location Currency Conversion Helper
 *
 * This file contains helper functions for converting location financial data
 * between different currencies based on licensee and country settings.
 */

import { Countries } from '@/app/api/lib/models/countries';
import { Licencee } from '@/app/api/lib/models/licencee';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenseeCurrency,
} from '@/lib/helpers/rates';
import type { AggregatedLocation } from '@/lib/types/location';
import type { CurrencyCode } from '@/shared/types/currency';

/**
 * Converts location financial data to display currency
 *
 * @param rows - Array of aggregated locations
 * @param displayCurrency - Target currency code
 * @param licencee - Licensee filter (if any)
 * @returns Promise<AggregatedLocation[]>
 */
export async function convertLocationCurrency(
  rows: AggregatedLocation[],
  displayCurrency: CurrencyCode,
  licencee: string | undefined
): Promise<AggregatedLocation[]> {
  if (!shouldApplyCurrencyConversion(licencee)) {
    return rows;
  }

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
      nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';
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
        case 'MembershipOnly':
          // Check both membershipEnabled and enableMembership fields for compatibility
          return (
            loc.membershipEnabled === true || loc.enableMembership === true
          );
        case 'MissingCoordinates':
          // Check if location has missing coordinates
          const geoCoords = loc.geoCoords;
          if (!geoCoords) return true;
          // Check for lat/lng format (using type assertion for entities.ts GeoCoordinates type)
          const geoCoordsWithLatLng = geoCoords as { lat?: number; lng?: number; latitude?: number; longitude?: number; longtitude?: number };
          const hasLat = geoCoordsWithLatLng.lat !== undefined && geoCoordsWithLatLng.lat !== null;
          const hasLng = geoCoordsWithLatLng.lng !== undefined && geoCoordsWithLatLng.lng !== null;
          // Check for latitude/longitude format
          const hasLatitude = geoCoordsWithLatLng.latitude !== undefined && geoCoordsWithLatLng.latitude !== null;
          const hasLongitude = geoCoordsWithLatLng.longitude !== undefined && geoCoordsWithLatLng.longitude !== null;
          const hasLongtitude = geoCoordsWithLatLng.longtitude !== undefined && geoCoordsWithLatLng.longtitude !== null;
          // Location has coords if it has (lat AND lng) OR (latitude AND (longitude OR longtitude))
          const hasValidCoords = (hasLat && hasLng) || (hasLatitude && (hasLongitude || hasLongtitude));
          return !hasValidCoords;
        case 'HasCoordinates':
          // Check if location has coordinates
          const geoCoordsForHas = loc.geoCoords;
          if (!geoCoordsForHas) return false;
          // Check for lat/lng format (using type assertion for entities.ts GeoCoordinates type)
          const geoCoordsForHasWithLatLng = geoCoordsForHas as { lat?: number; lng?: number; latitude?: number; longitude?: number; longtitude?: number };
          const hasLatForHas = geoCoordsForHasWithLatLng.lat !== undefined && geoCoordsForHasWithLatLng.lat !== null;
          const hasLngForHas = geoCoordsForHasWithLatLng.lng !== undefined && geoCoordsForHasWithLatLng.lng !== null;
          // Check for latitude/longitude format
          const hasLatitudeForHas = geoCoordsForHasWithLatLng.latitude !== undefined && geoCoordsForHasWithLatLng.latitude !== null;
          const hasLongitudeForHas = geoCoordsForHasWithLatLng.longitude !== undefined && geoCoordsForHasWithLatLng.longitude !== null;
          const hasLongtitudeForHas = geoCoordsForHasWithLatLng.longtitude !== undefined && geoCoordsForHasWithLatLng.longtitude !== null;
          // Location has coords if it has (lat AND lng) OR (latitude AND (longitude OR longtitude))
          return (hasLatForHas && hasLngForHas) || (hasLatitudeForHas && (hasLongitudeForHas || hasLongtitudeForHas));
        default:
          return true;
      }
    });
  });
}
