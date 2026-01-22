/**
 * Location Trends Helper Functions
 *
 * This module contains helper functions for location trends analytics.
 * It handles aggregation pipelines, currency conversion, and data formatting
 * for location trend data.
 *
 * @module app/api/lib/helpers/locationTrends
 */

import { Countries } from '@/app/api/lib/models/countries';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
    convertFromUSD,
    convertToUSD,
    getCountryCurrency,
} from '@/lib/helpers/rates';
import { getDatesForTimePeriod } from '@/lib/utils/date';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { TimePeriod } from '@/shared/types';
import type { CurrencyCode } from '@/shared/types/currency';
// Note: Db type from mongodb not imported to avoid mongoose/mongodb version mismatch
import type { PipelineStage } from 'mongoose';

export type DailyTrendItem = {
  day: string;
  time?: string;
  location: string;
  handle: number;
  winLoss: number;
  jackpot: number;
  plays: number;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
};

export type LocationTrendData = {
  day: string;
  time?: string;
  [locationId: string]:
    | {
        handle: number;
        winLoss: number;
        jackpot: number;
        plays: number;
        drop: number;
        totalCancelledCredits: number;
        gross: number;
      }
    | string
    | undefined;
};

/**
 * Determine aggregation granularity for custom time ranges
 */
function determineAggregationGranularity(
  timePeriod: TimePeriod,
  startDate?: Date,
  endDate?: Date,
  startDateParam?: string | null,
  endDateParam?: string | null,
  manualGranularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
): {
  useHourly: boolean;
  useMinute: boolean;
  useMonthly: boolean;
  useYearly: boolean;
  useWeekly: boolean;
  useDaily: boolean;
} {
  // If granularity is manually specified, use it
  if (manualGranularity) {
    if (manualGranularity === 'minute') {
      return {
        useHourly: false,
        useMinute: true,
        useMonthly: false,
        useYearly: false,
        useWeekly: false,
        useDaily: false,
      };
    } else if (manualGranularity === 'hourly') {
      return {
        useHourly: true,
        useMinute: false,
        useMonthly: false,
        useYearly: false,
        useWeekly: false,
        useDaily: false,
      };
    } else if (manualGranularity === 'daily') {
      return {
        useHourly: false,
        useMinute: false,
        useMonthly: false,
        useYearly: false,
        useWeekly: false,
        useDaily: true,
      };
    } else if (manualGranularity === 'weekly') {
      return {
        useHourly: false,
        useMinute: false,
        useMonthly: false,
        useYearly: false,
        useWeekly: true,
        useDaily: false,
      };
    } else if (manualGranularity === 'monthly') {
      return {
        useHourly: false,
        useMinute: false,
        useMonthly: true,
        useYearly: false,
        useWeekly: false,
        useDaily: false,
      };
    }
  }

  if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
    // Default to hourly for Today/Yesterday (can be overridden by manualGranularity)
    return {
      useHourly: true,
      useMinute: false,
      useMonthly: false,
      useYearly: false,
      useWeekly: false,
      useDaily: false,
    };
  }

  if (timePeriod === 'Quarterly') {
    // Quarterly defaults to daily aggregation (can be overridden by manualGranularity)
    return {
      useHourly: false,
      useMinute: false,
      useMonthly: false,
      useYearly: false,
      useWeekly: false,
      useDaily: true,
    };
  }

  if (timePeriod === 'All Time') {
    // All Time defaults to daily aggregation (can be overridden by manualGranularity)
    return {
      useHourly: false,
      useMinute: false,
      useMonthly: false,
      useYearly: false,
      useWeekly: false,
      useDaily: true,
    };
  }

  if (timePeriod === 'Custom' && startDate && endDate) {
    // Check if date strings have time components (not date-only)
    const hasTimeComponents =
      startDateParam &&
      endDateParam &&
      (startDateParam.includes('T') || endDateParam.includes('T'));

    if (hasTimeComponents) {
      // Calculate time difference in days
      const diffInMs = endDate.getTime() - startDate.getTime();
      const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

      // For custom ranges with time inputs:
      // - Default to hourly for all ranges <= 1 day
      // - Use daily if > 1 day
      if (diffInDays <= 1) {
        return {
          useHourly: true,
          useMinute: false,
          useMonthly: false,
          useYearly: false,
          useWeekly: false,
          useDaily: false,
        };
      }
      // For ranges > 1 day, return daily (default)
    } else {
      // Date-only custom range: use hourly if <= 1 day (for gaming day offset)
      const diffInDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffInDays <= 1) {
        return {
          useHourly: true,
          useMinute: false,
          useMonthly: false,
          useYearly: false,
          useWeekly: false,
          useDaily: false,
        };
      }
    }
  }

  return {
    useHourly: false,
    useMinute: false,
    useMonthly: false,
    useYearly: false,
    useWeekly: false,
    useDaily: true,
  };
}

/**
 * Build aggregation pipeline for location trends
 */
function buildLocationTrendsPipeline(
  targetLocations: string[],
  queryStartDate: Date,
  queryEndDate: Date,
  licencee: string | null,
  shouldUseHourly: boolean,
  shouldUseMinute?: boolean,
  shouldUseMonthly?: boolean,
  shouldUseYearly?: boolean,
  shouldUseWeekly?: boolean,
  shouldUseDaily?: boolean,
  matchingMachineIds?: string[]
): PipelineStage[] {
  const matchStage: any = {
    readAt: { $gte: queryStartDate, $lte: queryEndDate },
    location: { $in: targetLocations },
  };

  if (matchingMachineIds) {
    matchStage.machine = { $in: matchingMachineIds };
  }

  const pipeline: PipelineStage[] = [
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    {
      $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
    },
  ];

  if (licencee && licencee !== 'all') {
    pipeline.push({
      $match: {
        'locationDetails.rel.licencee': licencee,
      },
    } as PipelineStage);
  }

  const groupId: Record<string, unknown> = {
    location: '$location',
  };

  if (shouldUseYearly) {
    // Yearly aggregation: format as YYYY
    groupId.day = {
      $dateToString: {
        format: '%Y',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  } else if (shouldUseMonthly) {
    // Monthly aggregation: format as YYYY-MM
    groupId.day = {
      $dateToString: {
        format: '%Y-%m',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  } else if (shouldUseWeekly) {
    // Weekly aggregation: group by week start (Monday)
    // Calculate the start of the week (Monday) for each date
    groupId.day = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: {
          $dateSubtract: {
            startDate: '$readAt',
            unit: 'day',
            amount: {
              $subtract: [
                {
                  $dayOfWeek: {
                    date: '$readAt',
                    timezone: 'UTC',
                  },
                },
                1, // Monday is day 1, so subtract 1 to get days to subtract
              ],
            },
          },
        },
        timezone: 'UTC',
      },
    };
  } else if (shouldUseDaily || (!shouldUseHourly && !shouldUseMinute)) {
    // Daily aggregation: format as YYYY-MM-DD (default if no other granularity specified)
    groupId.day = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  } else if (shouldUseMinute) {
    // Minute-level: format day as YYYY-MM-DD and time as HH:MM
    groupId.day = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
    groupId.time = {
      $dateToString: {
        format: '%H:%M',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  } else if (shouldUseHourly) {
    // Hourly: format day as YYYY-MM-DD and time as HH:00
    groupId.day = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
    groupId.time = {
      $dateToString: {
        format: '%H:00',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  } else {
    // Daily: format as YYYY-MM-DD
    groupId.day = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$readAt',
        timezone: 'UTC',
      },
    };
  }

  pipeline.push(
    {
      $group: {
        _id: groupId,
        handle: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
        winLoss: {
          $sum: {
            $subtract: [
              { $ifNull: ['$movement.coinIn', 0] },
              { $ifNull: ['$movement.coinOut', 0] },
            ],
          },
        },
        jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
        plays: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
        drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
        },
        gross: {
          $sum: {
            $subtract: [
              { $ifNull: ['$movement.drop', 0] },
              { $ifNull: ['$movement.totalCancelledCredits', 0] },
            ],
          },
        },
      },
    } as PipelineStage,
    { $sort: { '_id.day': 1, '_id.time': 1 } } as PipelineStage,
    {
      $project: {
        _id: 0,
        day: '$_id.day',
        time: '$_id.time',
        location: '$_id.location',
        handle: 1,
        winLoss: 1,
        jackpot: 1,
        plays: 1,
        drop: 1,
        totalCancelledCredits: 1,
        gross: 1,
      },
    } as PipelineStage
  );

  return pipeline;
}

/**
 * Get location currency mappings
 */
async function getLocationCurrencies(
  locationsData: Array<{
    _id: unknown;
    rel?: { licencee?: unknown };
    country?: unknown;
  }>
): Promise<Map<string, string>> {
  const licenseesData = await Licencee.find(
    {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    },
    { _id: 1, name: 1 }
  )
    .lean()
    .exec();

  const licenseeIdToName = new Map<string, string>();
  licenseesData.forEach(lic => {
    licenseeIdToName.set(String(lic._id), lic.name as string);
  });

  const countriesData = await Countries.find({}).lean();
  const countryIdToName = new Map<string, string>();
  countriesData.forEach(country => {
    if (country._id && country.name) {
      countryIdToName.set(String(country._id), country.name);
    }
  });

  const locationCurrencies = new Map<string, string>();
  locationsData.forEach(loc => {
    const locationLicenseeId = loc.rel?.licencee;
    if (locationLicenseeId) {
      const licenseeName =
        licenseeIdToName.get(locationLicenseeId.toString()) || 'Unknown';
      locationCurrencies.set(String(loc._id), licenseeName);
    } else {
      const countryId = loc.country;
      const countryName = countryId
        ? countryIdToName.get(countryId.toString())
        : undefined;
      const nativeCurrency = countryName
        ? getCountryCurrency(countryName)
        : 'USD';
      locationCurrencies.set(String(loc._id), nativeCurrency);
    }
  });

  return locationCurrencies;
}

/**
 * Apply currency conversion to daily trend items
 */
function convertDailyTrendItems(
  dailyData: DailyTrendItem[],
  locationCurrencies: Map<string, string>,
  displayCurrency: CurrencyCode
): DailyTrendItem[] {
  return dailyData.map(item => {
    const nativeCurrency = locationCurrencies.get(item.location) || 'USD';
    return {
      ...item,
      handle: convertFromUSD(
        convertToUSD(item.handle, nativeCurrency),
        displayCurrency
      ),
      winLoss: convertFromUSD(
        convertToUSD(item.winLoss, nativeCurrency),
        displayCurrency
      ),
      jackpot: convertFromUSD(
        convertToUSD(item.jackpot, nativeCurrency),
        displayCurrency
      ),
      drop: convertFromUSD(
        convertToUSD(item.drop, nativeCurrency),
        displayCurrency
      ),
      totalCancelledCredits: convertFromUSD(
        convertToUSD(item.totalCancelledCredits, nativeCurrency),
        displayCurrency
      ),
      gross: convertFromUSD(
        convertToUSD(item.gross, nativeCurrency),
        displayCurrency
      ),
    };
  });
}

/**
 * Format trends data for hourly aggregation
 */
function formatHourlyTrends(
  convertedData: DailyTrendItem[],
  targetLocations: string[],
  dayKey: string
): LocationTrendData[] {
  const trends: LocationTrendData[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const timeKey = `${hour.toString().padStart(2, '0')}:00`;
    const trendItem: LocationTrendData = {
      day: dayKey,
      time: timeKey,
    };

    targetLocations.forEach(locationId => {
      const locationData = convertedData.find(
        item =>
          item.location === locationId &&
          item.day === dayKey &&
          item.time === timeKey
      );
      trendItem[locationId] = {
        handle: locationData?.handle || 0,
        winLoss: locationData?.winLoss || 0,
        jackpot: locationData?.jackpot || 0,
        plays: locationData?.plays || 0,
        drop: locationData?.drop || 0,
        totalCancelledCredits: locationData?.totalCancelledCredits || 0,
        gross: locationData?.gross || 0,
      };
    });

    trends.push(trendItem);
  }
  return trends;
}

/**
 * Convert daily trend items to location trends format (for minute-level data)
 * This preserves the minute-level time data without filling missing hours
 */
function convertDailyTrendsToLocationTrends(
  convertedData: DailyTrendItem[],
  targetLocations: string[]
): LocationTrendData[] {
  // Group by day and time
  const trendsMap = new Map<string, LocationTrendData>();

  convertedData.forEach(item => {
    const key = `${item.day}_${item.time || ''}`;
    if (!trendsMap.has(key)) {
      trendsMap.set(key, {
        day: item.day,
        time: item.time,
      });
    }

    const trendItem = trendsMap.get(key)!;
    trendItem[item.location] = {
      handle: item.handle,
      winLoss: item.winLoss,
      jackpot: item.jackpot,
      plays: item.plays,
      drop: item.drop,
      totalCancelledCredits: item.totalCancelledCredits,
      gross: item.gross,
    };
  });

  // Initialize missing locations with zeros
  trendsMap.forEach(trendItem => {
    targetLocations.forEach(locationId => {
      if (!trendItem[locationId]) {
        trendItem[locationId] = {
          handle: 0,
          winLoss: 0,
          jackpot: 0,
          plays: 0,
          drop: 0,
          totalCancelledCredits: 0,
          gross: 0,
        };
      }
    });
  });

  return Array.from(trendsMap.values()).sort((a, b) => {
    if (a.day !== b.day) return a.day.localeCompare(b.day);
    return (a.time || '').localeCompare(b.time || '');
  });
}

/**
 * Format trends data for daily aggregation
 */
function formatDailyTrends(
  convertedData: DailyTrendItem[],
  targetLocations: string[],
  queryStartDate: Date,
  queryEndDate: Date
): LocationTrendData[] {
  const trends: LocationTrendData[] = [];
  const current = new Date(queryStartDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(queryEndDate);

  while (current <= end) {
    const dayKey = current.toISOString().split('T')[0];
    const trendItem: LocationTrendData = {
      day: dayKey,
    };

    targetLocations.forEach(locationId => {
      const locationData = convertedData.find(
        item => item.location === locationId && item.day === dayKey
      );
      trendItem[locationId] = {
        handle: locationData?.handle || 0,
        winLoss: locationData?.winLoss || 0,
        jackpot: locationData?.jackpot || 0,
        plays: locationData?.plays || 0,
        drop: locationData?.drop || 0,
        totalCancelledCredits: locationData?.totalCancelledCredits || 0,
        gross: locationData?.gross || 0,
      };
    });

    trends.push(trendItem);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return trends;
}

/**
 * Format trends data for weekly aggregation
 */
function formatWeeklyTrends(
  convertedData: DailyTrendItem[],
  targetLocations: string[],
  queryStartDate: Date,
  queryEndDate: Date
): LocationTrendData[] {
  const trends: LocationTrendData[] = [];

  // Align to the start of the week (Sunday) to match the pipeline's $dayOfWeek - 1 logic
  const current = new Date(queryStartDate);
  const dayOfWeek = current.getUTCDay(); // 0 is Sunday
  current.setUTCDate(current.getUTCDate() - dayOfWeek);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(queryEndDate);

  while (current <= end) {
    const dayKey = current.toISOString().split('T')[0];
    const trendItem: LocationTrendData = {
      day: dayKey,
    };

    targetLocations.forEach(locationId => {
      const locationData = convertedData.find(
        item => item.location === locationId && item.day === dayKey
      );
      trendItem[locationId] = {
        handle: locationData?.handle || 0,
        winLoss: locationData?.winLoss || 0,
        jackpot: locationData?.jackpot || 0,
        plays: locationData?.plays || 0,
        drop: locationData?.drop || 0,
        totalCancelledCredits: locationData?.totalCancelledCredits || 0,
        gross: locationData?.gross || 0,
      };
    });

    trends.push(trendItem);
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return trends;
}

/**
 * Format trends data for monthly aggregation
 */
function formatMonthlyTrends(
  convertedData: DailyTrendItem[],
  targetLocations: string[],
  queryStartDate: Date,
  queryEndDate: Date
): LocationTrendData[] {
  const trends: LocationTrendData[] = [];

  // Align to the start of the month
  const current = new Date(queryStartDate);
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(queryEndDate);

  while (current <= end) {
    const year = current.getUTCFullYear();
    const month = (current.getUTCMonth() + 1).toString().padStart(2, '0');
    const dayKey = `${year}-${month}`; // Matches pipeline's %Y-%m format

    const trendItem: LocationTrendData = {
      day: dayKey,
    };

    targetLocations.forEach(locationId => {
      const locationData = convertedData.find(
        item => item.location === locationId && item.day === dayKey
      );
      trendItem[locationId] = {
        handle: locationData?.handle || 0,
        winLoss: locationData?.winLoss || 0,
        jackpot: locationData?.jackpot || 0,
        plays: locationData?.plays || 0,
        drop: locationData?.drop || 0,
        totalCancelledCredits: locationData?.totalCancelledCredits || 0,
        gross: locationData?.gross || 0,
      };
    });

    trends.push(trendItem);
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return trends;
}

/**
 * Calculate totals by location
 */
function calculateLocationTotals(
  convertedData: DailyTrendItem[],
  targetLocations: string[]
): Record<
  string,
  {
    handle: number;
    winLoss: number;
    jackpot: number;
    plays: number;
    drop: number;
    totalCancelledCredits: number;
    gross: number;
  }
> {
  const totals: Record<
    string,
    {
      handle: number;
      winLoss: number;
      jackpot: number;
      plays: number;
      drop: number;
      totalCancelledCredits: number;
      gross: number;
    }
  > = {};

  targetLocations.forEach(locationId => {
    totals[locationId] = {
      handle: 0,
      winLoss: 0,
      jackpot: 0,
      plays: 0,
      drop: 0,
      totalCancelledCredits: 0,
      gross: 0,
    };
  });

  convertedData.forEach(item => {
    if (totals[item.location]) {
      totals[item.location].handle += item.handle;
      totals[item.location].winLoss += item.winLoss;
      totals[item.location].jackpot += item.jackpot;
      totals[item.location].plays += item.plays;
      totals[item.location].drop += item.drop;
      totals[item.location].totalCancelledCredits += item.totalCancelledCredits;
      totals[item.location].gross += item.gross;
    }
  });

  return totals;
}

/**
 * Get location trends data
 */
export async function getLocationTrends(
  locationIds: string,
  timePeriod: TimePeriod,
  licencee: string | null,
  startDateParam: string | null,
  endDateParam: string | null,
  displayCurrency: CurrencyCode,
  granularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly',
  status?: 'Online' | 'Offline' | 'All' | null,
  gameType?: string | null
): Promise<{
  locationIds: string[];
  timePeriod: TimePeriod;
  startDate: string;
  endDate: string;
  trends: LocationTrendData[];
  totals: Record<
    string,
    {
      handle: number;
      winLoss: number;
      jackpot: number;
      plays: number;
      drop: number;
      gross: number;
    }
  >;
  locations: string[];
  locationNames: Record<string, string>;
  currency: CurrencyCode;
  converted: boolean;
  isHourly: boolean;
  dataSpan?: {
    minDate: string;
    maxDate: string;
  };
}> {
  const targetLocations = locationIds.split(',').map(id => id.trim());

  // Get date range
  let startDate: Date | undefined, endDate: Date | undefined;
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
  } else {
    const dateRange = getDatesForTimePeriod(timePeriod);
    startDate = dateRange.startDate;
    endDate = dateRange.endDate;
  }

  if (!startDate || !endDate) {
    const now = new Date();
    endDate = now;
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Fetch locations to get their gaming day offsets
  // Handle case where targetLocations might be empty or invalid
  if (!targetLocations || targetLocations.length === 0) {
    throw new Error('No valid location IDs provided');
  }

  // Filter out empty strings and invalid IDs
  const validLocationIds = targetLocations.filter(id => id && id.trim() !== '');

  if (validLocationIds.length === 0) {
    throw new Error('No valid location IDs provided after filtering');
  }

  const locationsData = await GamingLocations.find(
    { _id: { $in: validLocationIds } },
    { _id: 1, name: 1, gameDayOffset: 1, rel: 1, country: 1 }
  )
    .lean()
    .exec();

  // If no locations found, return empty result instead of error
  if (!locationsData || locationsData.length === 0) {
    return {
      locationIds: validLocationIds,
      timePeriod,
      startDate: (startDate || new Date()).toISOString(),
      endDate: (endDate || new Date()).toISOString(),
      trends: [],
      totals: {},
      locations: validLocationIds,
      locationNames: {},
      currency: displayCurrency,
      converted: false,
      isHourly: false,
    };
  }

  const locationsList = locationsData.map(loc => ({
    _id: String(loc._id),
    gameDayOffset: loc.gameDayOffset ?? 8,
  }));

  const gamingDayRanges = getGamingDayRangesForLocations(
    locationsList,
    timePeriod,
    timePeriod === 'Custom' ? startDate : undefined,
    timePeriod === 'Custom' ? endDate : undefined
  );

  const firstLocationRange = gamingDayRanges.get(targetLocations[0]);
  let queryStartDate: Date = firstLocationRange?.rangeStart || startDate!;
  let queryEndDate: Date = firstLocationRange?.rangeEnd || endDate!;

  // For Quarterly and All Time, detect actual data span from Meters collection
  let actualDataSpan: { minDate: Date | null; maxDate: Date | null } | null =
    null;
  if (timePeriod === 'Quarterly' || timePeriod === 'All Time') {
    const matchStage: Record<string, unknown> = {
      location: { $in: validLocationIds },
    };

    // For Quarterly, only look for data within the 90-day range
    if (timePeriod === 'Quarterly') {
      matchStage.readAt = { $gte: queryStartDate, $lte: queryEndDate };
    }

    const dateRangeResult = await Meters.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          minDate: { $min: '$readAt' },
          maxDate: { $max: '$readAt' },
        },
      },
    ]).exec();

    if (
      dateRangeResult.length > 0 &&
      dateRangeResult[0].minDate &&
      dateRangeResult[0].maxDate
    ) {
      const minDate = dateRangeResult[0].minDate as Date;
      const maxDate = dateRangeResult[0].maxDate as Date;
      actualDataSpan = {
        minDate,
        maxDate,
      };
      // Update query dates ONLY for All Time to show full range
      if (timePeriod === 'All Time') {
        queryStartDate = minDate;
        queryEndDate = maxDate;
      }
    }
  }

  // Determine aggregation granularity (hourly, minute, monthly, yearly, weekly, or daily)
  const { useHourly, useMinute, useMonthly, useYearly, useWeekly, useDaily } =
    determineAggregationGranularity(
      timePeriod,
      startDate,
      endDate,
      startDateParam,
      endDateParam,
      granularity
    );

  // Filter machines if status or gameType provided
  let matchingMachineIds: string[] | undefined;
  if ((status && status !== 'All') || (gameType && gameType !== 'all')) {
    const machineQuery: any = { gamingLocation: { $in: targetLocations } };

    if (gameType && gameType !== 'all') {
      // Check both game and installedGame fields just in case, though schema says game
      machineQuery.$or = [{ game: gameType }, { installedGame: gameType }];
    }

    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === 'online') {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      machineQuery.lastActivity = { $gte: threeMinutesAgo };
    } else if (normalizedStatus === 'offline') {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      machineQuery.$or = [
        { lastActivity: { $lt: threeMinutesAgo } },
        { lastActivity: { $exists: false } },
        { lastActivity: null }
      ];
    }

    const matchingMachines = await Machine.find(machineQuery).select('_id').lean();
    matchingMachineIds = matchingMachines.map((m: any) => m._id.toString());

    
    // If filtering and no machines match, we still want to continue to the pipeline
    // The pipeline will match nothing (machine: { $in: [] }) and return 0 results
    // Then the formatting functions will fill in the zero-value intervals

  }

  // Build and execute pipeline
  const pipeline = buildLocationTrendsPipeline(
    targetLocations,
    queryStartDate,
    queryEndDate,
    licencee,
    useHourly,
    useMinute,
    useMonthly,
    useYearly,
    useWeekly,
    useDaily,
    matchingMachineIds
  );

  // Use cursor for Meters aggregation (even though grouped, still use cursor for consistency)
  const dailyData: DailyTrendItem[] = [];
  const dailyDataCursor = Meters.aggregate(pipeline).cursor({
    batchSize: 1000,
  });

  for await (const doc of dailyDataCursor) {
    dailyData.push(doc as DailyTrendItem);
  }

  // Create location names mapping
  const locationNames: Record<string, string> = {};
  locationsData.forEach(loc => {
    locationNames[String(loc._id)] = loc.name as string;
  });

  // Apply currency conversion if needed
  let convertedData = dailyData;
  if (shouldApplyCurrencyConversion(licencee)) {
    const locationCurrencies = await getLocationCurrencies(locationsData);
    convertedData = convertDailyTrendItems(
      dailyData,
      locationCurrencies,
      displayCurrency
    );
  }

  // Format trends data based on granularity
  const trends = useMinute
    ? // For minute-level, use data as-is (already has minute-level grouping from pipeline)
      convertDailyTrendsToLocationTrends(convertedData, targetLocations)
    : useHourly
      ? formatHourlyTrends(
          convertedData,
          targetLocations,
          convertedData[0]?.day || new Date().toISOString().split('T')[0]
        )
      : useMonthly
        ? formatMonthlyTrends(
            convertedData,
            targetLocations,
            queryStartDate,
            queryEndDate
          )
        : useWeekly
          ? formatWeeklyTrends(
              convertedData,
              targetLocations,
              queryStartDate,
              queryEndDate
            )
          : formatDailyTrends(
              convertedData,
              targetLocations,
              queryStartDate,
              queryEndDate
            );

  // Calculate totals
  const totals = calculateLocationTotals(convertedData, targetLocations);

  return {
    locationIds: targetLocations,
    timePeriod,
    startDate: queryStartDate.toISOString(),
    endDate: queryEndDate.toISOString(),
    trends,
    totals,
    locations: targetLocations,
    locationNames,
    currency: displayCurrency,
    converted: shouldApplyCurrencyConversion(licencee),
    isHourly: useHourly,
    dataSpan:
      actualDataSpan && actualDataSpan.minDate && actualDataSpan.maxDate
        ? {
            minDate: actualDataSpan.minDate.toISOString(),
            maxDate: actualDataSpan.maxDate.toISOString(),
          }
        : undefined,
  };
}
