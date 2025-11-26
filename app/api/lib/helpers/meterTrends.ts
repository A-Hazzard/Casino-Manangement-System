/**
 * Meter Trends Helper Functions
 *
 * This module contains helper functions for meter trends API routes.
 * It handles aggregation pipelines for location-based meter trends with currency conversion.
 *
 * @module app/api/lib/helpers/meterTrends
 */

import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
} from '@/lib/helpers/rates';
import { getUserLocationFilter } from './licenseeFilter';
import type { CurrencyCode } from '@/shared/types/currency';
import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import type { PipelineStage } from 'mongoose';

/**
 * Meter trend metric item
 */
export type MeterTrendMetric = {
  day: string;
  time: string;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  gamesPlayed: number;
  jackpot: number;
  licencee?: string | null;
  country?: string | null;
  location?: string;
  geoCoords?: Record<string, unknown> | null;
};

/**
 * Aggregated metric item
 */
export type AggregatedMetric = {
  day: string;
  time: string;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  gamesPlayed: number;
  jackpot: number;
};

/**
 * Location data for meter trends
 */
type LocationData = {
  _id: unknown;
  gameDayOffset?: number;
  country?: unknown;
  geoCoords?: Record<string, unknown>;
  rel?: { licencee?: unknown };
};

/**
 * Validates custom date range
 *
 * @param timePeriod - Time period string
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Validation error message or null if valid
 */
export function validateCustomDateRange(
  timePeriod: string,
  startDate?: string | null,
  endDate?: string | null
): string | null {
  if (timePeriod === 'Custom') {
    if (!startDate || !endDate) {
      return 'Custom startDate and endDate are required';
    }

    const customStartDate = new Date(startDate);
    const customEndDate = new Date(endDate);
    if (
      Number.isNaN(customStartDate.getTime()) ||
      Number.isNaN(customEndDate.getTime())
    ) {
      return 'Invalid custom date range.';
    }
  }

  return null;
}

/**
 * Determines if hourly aggregation should be used
 *
 * @param timePeriod - Time period string
 * @param customStartDate - Optional custom start date
 * @param customEndDate - Optional custom end date
 * @returns True if hourly aggregation should be used
 */
export function shouldUseHourlyAggregation(
  timePeriod: string,
  customStartDate?: Date,
  customEndDate?: Date
): boolean {
  if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
    return true;
  }

  if (
    timePeriod === 'Custom' &&
    customStartDate &&
    customEndDate &&
    Math.ceil(
      (customEndDate.getTime() - customStartDate.getTime()) /
        (1000 * 60 * 60 * 24)
    ) <= 1
  ) {
    return true;
  }

  return false;
}

/**
 * Filters locations based on user permissions
 *
 * @param locations - Array of location data
 * @param licencee - Optional licensee filter
 * @param isAdmin - Whether user is admin
 * @param isManager - Whether user is manager
 * @param userLocationPermissions - User's location permissions
 * @returns Filtered locations array
 */
export function filterLocationsByPermissions(
  locations: LocationData[],
  licencee: string | null,
  isAdmin: boolean,
  isManager: boolean,
  userLocationPermissions: string[]
): LocationData[] {
  if (licencee) {
    if (!isAdmin && !isManager) {
      if (userLocationPermissions.length === 0) {
        return [];
      }
      const permissionSet = new Set(
        userLocationPermissions.map(id => id.toString())
      );
      return locations.filter(location =>
        permissionSet.has(String(location._id))
      );
    }
  }

  return locations;
}

/**
 * Builds machines by location map
 *
 * @param machineDocs - Array of machine documents
 * @returns Map of location ID to machine IDs
 */
export function buildMachinesByLocationMap(
  machineDocs: Array<{ _id: unknown; gamingLocation?: unknown }>
): Map<string, string[]> {
  const machinesByLocation = new Map<string, string[]>();

  for (const machine of machineDocs) {
    const locId =
      typeof machine.gamingLocation === 'string'
        ? machine.gamingLocation
        : machine.gamingLocation?.toString();
    if (!locId) continue;

    if (!machinesByLocation.has(locId)) {
      machinesByLocation.set(locId, []);
    }
    machinesByLocation.get(locId)!.push(String(machine._id));
  }

  return machinesByLocation;
}

/**
 * Builds aggregation pipeline for location metrics
 *
 * @param machineIds - Array of machine IDs
 * @param rangeStart - Range start date
 * @param rangeEnd - Range end date
 * @param shouldUseHourly - Whether to use hourly aggregation
 * @returns Aggregation pipeline stages
 */
export function buildLocationMetricsPipeline(
  machineIds: string[],
  rangeStart: Date,
  rangeEnd: Date,
  shouldUseHourly: boolean
): PipelineStage[] {
  return [
    {
      $match: {
        machine: { $in: machineIds },
        readAt: {
          $gte: rangeStart,
          $lte: rangeEnd,
        },
      },
    },
    {
      $addFields: {
        day: {
          $dateToString: {
            date: '$readAt',
            format: '%Y-%m-%d',
            timezone: 'UTC',
          },
        },
        time: shouldUseHourly
          ? {
              $dateToString: {
                date: '$readAt',
                format: '%H:%M',
                timezone: 'UTC',
              },
            }
          : '00:00',
      },
    },
    {
      $group: {
        _id: {
          day: '$day',
          time: '$time',
        },
        totalDrop: { $sum: '$movement.drop' },
        totalCancelledCredits: {
          $sum: '$movement.totalCancelledCredits',
        },
        totalJackpot: { $sum: '$movement.jackpot' },
        totalGamesPlayed: { $sum: '$movement.gamesPlayed' },
      },
    },
    {
      $project: {
        _id: 0,
        day: '$_id.day',
        time: '$_id.time',
        drop: { $ifNull: ['$totalDrop', 0] },
        totalCancelledCredits: {
          $ifNull: ['$totalCancelledCredits', 0],
        },
        gross: {
          $subtract: [
            {
              $subtract: [
                { $ifNull: ['$totalDrop', 0] },
                { $ifNull: ['$totalJackpot', 0] },
              ],
            },
            { $ifNull: ['$totalCancelledCredits', 0] },
          ],
        },
        gamesPlayed: { $ifNull: ['$totalGamesPlayed', 0] },
        jackpot: { $ifNull: ['$totalJackpot', 0] },
      },
    },
    { $sort: { day: 1, time: 1 } },
  ];
}

/**
 * Processes location metrics in batches
 *
 * @param db - Database connection
 * @param locations - Array of location data
 * @param machinesByLocation - Map of location ID to machine IDs
 * @param gamingDayRanges - Map of location ID to gaming day range
 * @param shouldUseHourly - Whether to use hourly aggregation
 * @param batchSize - Batch size for processing
 * @returns Array of meter trend metrics
 */
export async function processLocationMetricsBatches(
  db: Db,
  locations: LocationData[],
  machinesByLocation: Map<string, string[]>,
  gamingDayRanges: Map<
    string,
    { rangeStart: Date; rangeEnd: Date }
  >,
  shouldUseHourly: boolean,
  batchSize: number = 20
): Promise<MeterTrendMetric[]> {
  const metricsPerLocation: MeterTrendMetric[] = [];

  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async location => {
        const locationId = String(location._id);
        const machineIds = machinesByLocation.get(locationId);
        if (!machineIds || machineIds.length === 0) {
          return [];
        }

        const range = gamingDayRanges.get(locationId);
        if (!range) {
          return [];
        }

        const pipeline = buildLocationMetricsPipeline(
          machineIds,
          range.rangeStart,
          range.rangeEnd,
          shouldUseHourly
        );

        type PipelineMetric = {
          day: string;
          time: string;
          drop: number;
          totalCancelledCredits: number;
          gross: number;
          gamesPlayed: number;
          jackpot: number;
        };

        const results = await db
          .collection('meters')
          .aggregate<PipelineMetric>(pipeline, {
            allowDiskUse: true,
            hint: { machine: 1, readAt: 1 },
          })
          .toArray();

        return results.map(metric => ({
          ...metric,
          licencee:
            typeof location.rel?.licencee === 'string'
              ? location.rel.licencee
              : Array.isArray(location.rel?.licencee)
                ? location.rel?.licencee?.[0]?.toString() ?? null
                : null,
          country: location.country ? String(location.country) : null,
          location: locationId,
          geoCoords: location.geoCoords ?? null,
        }));
      })
    );

    metricsPerLocation.push(...batchResults.flat());
  }

  return metricsPerLocation;
}

/**
 * Loads licensee and country metadata for currency conversion
 *
 * @param db - Database connection
 * @param metricsPerLocation - Array of meter trend metrics
 * @returns Maps of licensee ID to name and country ID to name
 */
export async function loadCurrencyMetadata(
  db: Db,
  metricsPerLocation: MeterTrendMetric[]
): Promise<{
  licenseeIdToName: Map<string, string>;
  countryIdToName: Map<string, string>;
}> {
  const licenseeIdToName = new Map<string, string>();
  const countryIdToName = new Map<string, string>();

  const licenceeIds = Array.from(
    new Set(
      metricsPerLocation
        .map(metric => metric.licencee)
        .filter((id): id is string => Boolean(id))
    )
  );

  if (licenceeIds.length > 0) {
    const licenseeDocs = await db
      .collection('licencees')
      .find(
        {
          _id: {
            $in: licenceeIds
              .map(id => {
                try {
                  return new ObjectId(id);
                } catch {
                  return null;
                }
              })
              .filter((id): id is ObjectId => id !== null),
          },
        },
        { projection: { name: 1 } }
      )
      .toArray();

    licenseeDocs.forEach(doc => {
      licenseeIdToName.set(String(doc._id), doc.name);
    });
  }

  const countryIds = Array.from(
    new Set(
      metricsPerLocation
        .map(metric => metric.country)
        .filter((id): id is string => Boolean(id))
    )
  );

  if (countryIds.length > 0) {
    const countryDocs = await db
      .collection('countries')
      .find(
        {
          _id: {
            $in: countryIds
              .map(id => {
                try {
                  return new ObjectId(id);
                } catch {
                  return null;
                }
              })
              .filter((id): id is ObjectId => id !== null),
          },
        },
        { projection: { name: 1 } }
      )
      .toArray();

    countryDocs.forEach(doc => {
      countryIdToName.set(String(doc._id), doc.name);
    });
  }

  return { licenseeIdToName, countryIdToName };
}

/**
 * Aggregates metrics with currency conversion
 *
 * @param metricsPerLocation - Array of meter trend metrics
 * @param shouldConvert - Whether to apply currency conversion
 * @param displayCurrency - Display currency code
 * @param licenseeIdToName - Map of licensee ID to name
 * @param countryIdToName - Map of country ID to name
 * @returns Array of aggregated metrics
 */
export function aggregateMetricsWithConversion(
  metricsPerLocation: MeterTrendMetric[],
  shouldConvert: boolean,
  displayCurrency: CurrencyCode,
  licenseeIdToName: Map<string, string>,
  countryIdToName: Map<string, string>
): AggregatedMetric[] {
  const aggregatedMap = new Map<string, AggregatedMetric>();

  const accumulator = (
    key: string,
    day: string,
    time: string,
    dropValue: number,
    cancelledValue: number,
    grossValue: number,
    gamesPlayedValue: number,
    jackpotValue: number
  ) => {
    const existing = aggregatedMap.get(key);
    if (existing) {
      existing.drop += dropValue;
      existing.totalCancelledCredits += cancelledValue;
      existing.gross += grossValue;
      existing.gamesPlayed += gamesPlayedValue;
      existing.jackpot += jackpotValue;
    } else {
      aggregatedMap.set(key, {
        day,
        time,
        drop: dropValue,
        totalCancelledCredits: cancelledValue,
        gross: grossValue,
        gamesPlayed: gamesPlayedValue,
        jackpot: jackpotValue,
      });
    }
  };

  for (const metric of metricsPerLocation) {
    const day = metric.day;
    const time = metric.time ?? '00:00';
    const key = `${day}__${time}`;
    const gamesPlayedValue = Number(metric.gamesPlayed ?? 0);

    if (shouldConvert) {
      let nativeCurrency = 'USD';
      if (metric.licencee) {
        nativeCurrency =
          licenseeIdToName.get(metric.licencee) || metric.licencee || 'USD';
      } else if (metric.country) {
        const countryName = countryIdToName.get(metric.country);
        nativeCurrency = countryName
          ? getCountryCurrency(countryName) || 'USD'
          : 'USD';
      }

      const dropUSD = convertToUSD(Number(metric.drop) || 0, nativeCurrency);
      const cancelledUSD = convertToUSD(
        Number(metric.totalCancelledCredits) || 0,
        nativeCurrency
      );
      const grossUSD = convertToUSD(Number(metric.gross) || 0, nativeCurrency);
      const jackpotUSD = convertToUSD(
        Number(metric.jackpot) || 0,
        nativeCurrency
      );

      const convertedDrop = convertFromUSD(dropUSD, displayCurrency);
      const convertedCancelled = convertFromUSD(
        cancelledUSD,
        displayCurrency
      );
      const convertedGross = convertFromUSD(grossUSD, displayCurrency);
      const convertedJackpot = convertFromUSD(jackpotUSD, displayCurrency);

      accumulator(
        key,
        day,
        time,
        convertedDrop,
        convertedCancelled,
        convertedGross,
        gamesPlayedValue,
        convertedJackpot
      );
    } else {
      accumulator(
        key,
        day,
        time,
        Number(metric.drop) || 0,
        Number(metric.totalCancelledCredits) || 0,
        Number(metric.gross) || 0,
        gamesPlayedValue,
        Number(metric.jackpot) || 0
      );
    }
  }

  return Array.from(aggregatedMap.values()).sort((a, b) => {
    if (a.day === b.day) {
      return a.time.localeCompare(b.time);
    }
    return a.day.localeCompare(b.day);
  });
}

/**
 * Fetches meter trends data
 *
 * @param db - Database connection
 * @param params - Request parameters
 * @param accessibleLicensees - User's accessible licensees
 * @param userRoles - User roles
 * @param userLocationPermissions - User's location permissions
 * @returns Array of aggregated metrics
 */
export async function getMeterTrends(
  db: Db,
  params: {
    timePeriod: string;
    licencee: string;
    startDate?: string | null;
    endDate?: string | null;
    displayCurrency: CurrencyCode;
  },
  accessibleLicensees: string[] | 'all',
  userRoles: string[],
  userLocationPermissions: string[]
): Promise<AggregatedMetric[]> {
  const { timePeriod, licencee, startDate, endDate, displayCurrency } = params;

  const isAdminOrDev =
    userRoles.includes('admin') || userRoles.includes('developer');
  const shouldConvert =
    isAdminOrDev && shouldApplyCurrencyConversion(licencee || 'all');

  let customStartDate: Date | undefined;
  let customEndDate: Date | undefined;

  if (timePeriod === 'Custom') {
    if (startDate && endDate) {
      customStartDate = new Date(startDate);
      customEndDate = new Date(endDate);
    }
  }

  const locationsCollection = db.collection('gaminglocations');
  const locationQuery: Record<string, unknown> = {
    $or: [
      { deletedAt: null },
      { deletedAt: { $lt: new Date('2020-01-01') } },
    ],
  };

  if (licencee) {
    locationQuery['rel.licencee'] = licencee;
  }

  let locations = await locationsCollection
    .find(locationQuery, {
      projection: {
        _id: 1,
        gameDayOffset: 1,
        country: 1,
        geoCoords: 1,
        rel: 1,
      },
    })
    .toArray();

  const isManager = userRoles.includes('manager');
  const isAdmin =
    accessibleLicensees === 'all' ||
    userRoles.includes('admin') ||
    userRoles.includes('developer');

  if (licencee) {
    const filteredLocations = filterLocationsByPermissions(
      locations as LocationData[],
      licencee,
      isAdmin,
      isManager,
      userLocationPermissions
    );
    locations = filteredLocations as typeof locations;
    } else {
      const allowedLocationIds = await getUserLocationFilter(
      accessibleLicensees,
      undefined,
      userLocationPermissions,
      userRoles
    );

    if (allowedLocationIds === 'all') {
      // no filtering
    } else if (allowedLocationIds.length === 0) {
      return [];
    } else {
      const allowedSet = new Set(
        allowedLocationIds.map(id => id.toString())
      );
      locations = locations.filter(location =>
        allowedSet.has(String(location._id))
      );
    }
  }

  if (locations.length === 0) {
    return [];
  }

  const locationRangeInput = locations.map(location => ({
    _id: String(location._id),
    gameDayOffset: (location as LocationData).gameDayOffset ?? 8,
  }));

  const gamingDayRanges = getGamingDayRangesForLocations(
    locationRangeInput,
    timePeriod,
    customStartDate,
    customEndDate
  );

  const shouldUseHourly = shouldUseHourlyAggregation(
    timePeriod,
    customStartDate,
    customEndDate
  );

  const locationIds = locations.map(location => String(location._id));
  const machineDocs = await db
    .collection('machines')
    .find(
      {
        gamingLocation: { $in: locationIds },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      },
      { projection: { _id: 1, gamingLocation: 1 } }
    )
    .toArray();

  const machinesByLocation = buildMachinesByLocationMap(machineDocs);

  const metricsPerLocation = await processLocationMetricsBatches(
    db,
    locations as LocationData[],
    machinesByLocation,
    gamingDayRanges,
    shouldUseHourly
  );

  if (metricsPerLocation.length === 0) {
    return [];
  }

  let licenseeIdToName = new Map<string, string>();
  let countryIdToName = new Map<string, string>();

  if (shouldConvert) {
    const metadata = await loadCurrencyMetadata(db, metricsPerLocation);
    licenseeIdToName = metadata.licenseeIdToName;
    countryIdToName = metadata.countryIdToName;
  }

  return aggregateMetricsWithConversion(
    metricsPerLocation,
    shouldConvert,
    displayCurrency,
    licenseeIdToName,
    countryIdToName
  );
}

