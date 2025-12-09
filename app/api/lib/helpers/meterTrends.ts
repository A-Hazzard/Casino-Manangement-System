/**
 * Meter Trends Helper Functions
 *
 * This module contains helper functions for meter trends API routes.
 * It handles aggregation pipelines for location-based meter trends with currency conversion.
 *
 * @module app/api/lib/helpers/meterTrends
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
} from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import type { PipelineStage } from 'mongoose';
import { getUserLocationFilter } from './licenseeFilter';

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
 * Determines aggregation granularity for custom time ranges
 *
 * @param timePeriod - Time period string
 * @param customStartDate - Optional custom start date
 * @param customEndDate - Optional custom end date
 * @param startDateParam - Optional start date string (to detect time components)
 * @param endDateParam - Optional end date string (to detect time components)
 * @returns Object with useHourly, useMinute flags
 */
export function determineAggregationGranularity(
  timePeriod: string,
  customStartDate?: Date,
  customEndDate?: Date,
  startDateParam?: string | null,
  endDateParam?: string | null,
  manualGranularity?: 'hourly' | 'minute'
): { useHourly: boolean; useMinute: boolean } {
  // If manual granularity is specified, use it (but only for Today/Yesterday or appropriate custom ranges)
  if (manualGranularity) {
    if (manualGranularity === 'minute') {
      return { useHourly: false, useMinute: true };
    } else if (manualGranularity === 'hourly') {
      return { useHourly: true, useMinute: false };
    }
  }

  if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
    // Default to minute-level for Today/Yesterday unless overridden
    return { useHourly: false, useMinute: true };
  }

  if (timePeriod === 'Custom' && customStartDate && customEndDate) {
    // Check if date strings have time components (not date-only)
    const hasTimeComponents =
      startDateParam &&
      endDateParam &&
      (startDateParam.includes('T') || endDateParam.includes('T'));

    if (hasTimeComponents) {
      // Calculate time difference in hours and days
      const diffInMs = customEndDate.getTime() - customStartDate.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

      // For custom ranges with time inputs:
      // - Use minute-level if range <= 10 hours (as per user requirement)
      // - Use hourly if > 10 hours but <= 1 day
      // - Use daily if > 1 day
      if (diffInHours <= 10 && diffInDays <= 1) {
        return { useHourly: false, useMinute: true };
      } else if (diffInDays <= 1) {
        return { useHourly: true, useMinute: false };
      }
      // For ranges > 1 day, return daily (default)
    } else {
      // Date-only custom range: use hourly if <= 1 day (for gaming day offset)
      const diffInDays = Math.ceil(
        (customEndDate.getTime() - customStartDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (diffInDays <= 1) {
        return { useHourly: true, useMinute: false };
      }
    }
  }

  return { useHourly: false, useMinute: false };
}

/**
 * Determines if hourly aggregation should be used (legacy function for backward compatibility)
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
  const { useHourly } = determineAggregationGranularity(
    timePeriod,
    customStartDate,
    customEndDate
  );
  return useHourly;
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
  shouldUseHourly: boolean,
  shouldUseMinute?: boolean
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
        time: shouldUseMinute
          ? {
              // Minute-level: format as HH:MM
              $dateToString: {
                date: '$readAt',
                format: '%H:%M',
                timezone: 'UTC',
              },
            }
          : shouldUseHourly
            ? {
                // Hourly: format as HH:00
                $dateToString: {
                  date: '$readAt',
                  format: '%H:00',
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
 * Processes location metrics using single aggregation (optimized for 7d/30d)
 *
 * @param db - Database connection
 * @param locations - Array of location data
 * @param machinesByLocation - Map of location ID to machine IDs
 * @param gamingDayRanges - Map of location ID to gaming day range
 * @param shouldUseHourly - Whether to use hourly aggregation
 * @returns Array of meter trend metrics
 */
async function processLocationMetricsSingleAggregation(
  db: Db,
  locations: LocationData[],
  machinesByLocation: Map<string, string[]>,
  gamingDayRanges: Map<string, { rangeStart: Date; rangeEnd: Date }>,
  shouldUseHourly: boolean,
  shouldUseMinute?: boolean
): Promise<MeterTrendMetric[]> {
  console.log(
    `[processLocationMetricsSingleAggregation] Processing ${locations.length} locations with single aggregation`
  );

  // Get global date range (earliest start, latest end) for initial query
  let globalStart = new Date();
  let globalEnd = new Date(0);
  gamingDayRanges.forEach(range => {
    if (range.rangeStart < globalStart) globalStart = range.rangeStart;
    if (range.rangeEnd > globalEnd) globalEnd = range.rangeEnd;
  });

  // Get all machine IDs across all locations
  const allMachineIds: string[] = [];
  const machineToLocation = new Map<string, string>();

  machinesByLocation.forEach((machineIds, locationId) => {
    machineIds.forEach(machineId => {
      allMachineIds.push(machineId);
      machineToLocation.set(machineId, locationId);
    });
  });

  if (allMachineIds.length === 0) {
    return [];
  }

  // Single aggregation for all machines - group by machine, day, and time
  // We'll filter by gaming day ranges per location after grouping
  const pipeline: PipelineStage[] = [
    {
      $match: {
        machine: { $in: allMachineIds },
        readAt: {
          $gte: globalStart,
          $lte: globalEnd,
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
        time: shouldUseMinute
          ? {
              // Minute-level: format as HH:MM
              $dateToString: {
                date: '$readAt',
                format: '%H:%M',
                timezone: 'UTC',
              },
            }
          : shouldUseHourly
            ? {
                // Hourly: format as HH:00
                $dateToString: {
                  date: '$readAt',
                  format: '%H:00',
                  timezone: 'UTC',
                },
              }
            : '00:00',
      },
    },
    {
      $group: {
        _id: {
          machine: '$machine',
          day: '$day',
          time: '$time',
        },
        totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
        },
        totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
        totalGamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
        minReadAt: { $min: '$readAt' }, // Keep for filtering by gaming day range
        maxReadAt: { $max: '$readAt' }, // Keep for filtering by gaming day range
      },
    },
    {
      $project: {
        _id: 0,
        machine: '$_id.machine',
        day: '$_id.day',
        time: '$_id.time',
        drop: '$totalDrop',
        totalCancelledCredits: '$totalCancelledCredits',
        gross: {
          $subtract: [
            { $subtract: ['$totalDrop', '$totalJackpot'] },
            '$totalCancelledCredits',
          ],
        },
        gamesPlayed: '$totalGamesPlayed',
        jackpot: '$totalJackpot',
        minReadAt: 1,
        maxReadAt: 1,
      },
    },
  ];

  const allMetrics = await db
    .collection('meters')
    .aggregate(pipeline, {
      allowDiskUse: true,
      hint: { machine: 1, readAt: 1 },
    })
    .toArray();

  // Filter by gaming day ranges per location and group by location/day/time
  // Since we grouped by machine/day/time, we need to check if the day falls within
  // the gaming day range for that location
  const locationMetricsMap = new Map<string, MeterTrendMetric>();

  for (const metric of allMetrics) {
    const machineId = metric.machine;
    const locationId = machineToLocation.get(machineId);
    if (!locationId) continue;

    const gamingDayRange = gamingDayRanges.get(locationId);
    if (!gamingDayRange) continue;

    // Check if the day falls within the gaming day range
    // We check both minReadAt and maxReadAt to handle cases where the day spans boundaries
    const minReadAt = new Date(metric.minReadAt);
    const maxReadAt = new Date(metric.maxReadAt);

    // Check if any part of this day/time group falls within the gaming day range
    // The day is included if minReadAt or maxReadAt falls within the range, or if the range spans the group
    const isInRange =
      (minReadAt >= gamingDayRange.rangeStart &&
        minReadAt <= gamingDayRange.rangeEnd) ||
      (maxReadAt >= gamingDayRange.rangeStart &&
        maxReadAt <= gamingDayRange.rangeEnd) ||
      (minReadAt <= gamingDayRange.rangeStart &&
        maxReadAt >= gamingDayRange.rangeEnd);

    if (!isInRange) {
      continue;
    }

    const location = locations.find(loc => String(loc._id) === locationId);
    if (!location) continue;

    // Group by location/day/time
    const key = `${locationId}_${metric.day}_${metric.time}`;
    const existing = locationMetricsMap.get(key);

    if (existing) {
      existing.drop += metric.drop || 0;
      existing.totalCancelledCredits += metric.totalCancelledCredits || 0;
      existing.gross += metric.gross || 0;
      existing.gamesPlayed += metric.gamesPlayed || 0;
      existing.jackpot += metric.jackpot || 0;
    } else {
      locationMetricsMap.set(key, {
        day: metric.day,
        time: metric.time,
        drop: metric.drop || 0,
        totalCancelledCredits: metric.totalCancelledCredits || 0,
        gross: metric.gross || 0,
        gamesPlayed: metric.gamesPlayed || 0,
        jackpot: metric.jackpot || 0,
        licencee:
          typeof location.rel?.licencee === 'string'
            ? location.rel.licencee
            : Array.isArray(location.rel?.licencee)
              ? (location.rel?.licencee?.[0]?.toString() ?? null)
              : null,
        country: location.country ? String(location.country) : null,
        location: locationId,
        geoCoords: location.geoCoords ?? null,
      });
    }
  }

  return Array.from(locationMetricsMap.values());
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
  gamingDayRanges: Map<string, { rangeStart: Date; rangeEnd: Date }>,
  shouldUseHourly: boolean,
  shouldUseMinute?: boolean,
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
          shouldUseHourly,
          shouldUseMinute
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

        // Check aggregation results directly without preflight read

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
                ? (location.rel?.licencee?.[0]?.toString() ?? null)
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
      const convertedCancelled = convertFromUSD(cancelledUSD, displayCurrency);
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
    granularity?: 'hourly' | 'minute';
  },
  accessibleLicensees: string[] | 'all',
  userRoles: string[],
  userLocationPermissions: string[]
): Promise<AggregatedMetric[]> {
  const {
    timePeriod,
    licencee,
    startDate,
    endDate,
    displayCurrency,
    granularity,
  } = params;

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

  const locationQuery: Record<string, unknown> = {
    $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
  };

  if (licencee) {
    locationQuery['rel.licencee'] = licencee;
  }

  let locations = await GamingLocations.find(locationQuery, {
    _id: 1,
    gameDayOffset: 1,
    country: 1,
    geoCoords: 1,
    rel: 1,
  }).lean();

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
      const allowedSet = new Set(allowedLocationIds.map(id => id.toString()));
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

  // Determine aggregation granularity (hourly, minute, or daily)
  // If granularity is manually specified, override the automatic detection
  const { useHourly, useMinute } = determineAggregationGranularity(
    timePeriod,
    customStartDate,
    customEndDate,
    startDate,
    endDate,
    granularity // Pass manual granularity to override defaults
  );

  const locationIds = locations.map(location => String(location._id));
  const machineDocs = await Machine.find(
    {
      gamingLocation: { $in: locationIds },
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    },
    { _id: 1, gamingLocation: 1 }
  ).lean();
  const machinesByLocation = buildMachinesByLocationMap(machineDocs);

  // 🚀 OPTIMIZED: Use single aggregation for 7d/30d periods (much faster)
  const useSingleAggregation = timePeriod === '7d' || timePeriod === '30d';

  const metricsPerLocation = useSingleAggregation
    ? await processLocationMetricsSingleAggregation(
        db,
        locations as LocationData[],
        machinesByLocation,
        gamingDayRanges,
        useHourly,
        useMinute
      )
    : await processLocationMetricsBatches(
        db,
        locations as LocationData[],
        machinesByLocation,
        gamingDayRanges,
        useHourly,
        useMinute
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
