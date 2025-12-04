/**
 * Machine Hourly Helper Functions
 *
 * This module contains helper functions for machine hourly analytics.
 * It handles aggregation pipelines, currency conversion, and data formatting
 * for hourly machine trend data.
 *
 * @module app/api/lib/helpers/machineHourly
 */

import { Countries } from '@/app/api/lib/models/countries';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
} from '@/lib/helpers/rates';
import { getDatesForTimePeriod } from '@/lib/utils/dates';
import type { TimePeriod } from '@/shared/types';
import type { StackedData } from '@/shared/types/analytics';
import type { CurrencyCode } from '@/shared/types/currency';
import type { Db } from 'mongodb';
import type { PipelineStage } from 'mongoose';

export type HourlyDataItem = {
  hour: number;
  machine: string;
  location: string;
  handle: number;
  winLoss: number;
  jackpot: number;
  plays: number;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
};

/**
 * Build aggregation pipeline for machine hourly data
 */
function buildMachineHourlyPipeline(
  startDate: Date,
  endDate: Date,
  targetLocations: string[],
  targetMachines: string[],
  licencee: string | null
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        readAt: { $gte: startDate, $lte: endDate },
        ...(targetLocations.length > 0 && {
          location: { $in: targetLocations },
        }),
        ...(targetMachines.length > 0 && {
          machine: { $in: targetMachines },
        }),
      },
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

  pipeline.push(
    {
      $group: {
        _id: {
          hour: { $hour: '$readAt' },
          machine: '$machine',
          location: '$location',
        },
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
    { $sort: { '_id.hour': 1, '_id.machine': 1 } } as PipelineStage,
    {
      $project: {
        _id: 0,
        hour: '$_id.hour',
        machine: '$_id.machine',
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
 * Group hourly data by location
 */
function groupHourlyDataByLocation(
  hourlyData: HourlyDataItem[]
): Record<string, HourlyDataItem[]> {
  const locationHourlyData: Record<string, HourlyDataItem[]> = {};
  hourlyData.forEach(item => {
    const locationKey = item.location;
    if (!locationHourlyData[locationKey]) {
      locationHourlyData[locationKey] = [];
    }
    locationHourlyData[locationKey].push(item);
  });
  return locationHourlyData;
}

/**
 * Format hourly trends into 24-hour array with stacked data
 */
function formatHourlyTrends(
  hourlyData: HourlyDataItem[],
  locationHourlyData: Record<string, HourlyDataItem[]>
): StackedData[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const hourData = hourlyData.filter(item => item.hour === hour);
    const stackedData: StackedData = {
      hour: `${hour.toString().padStart(2, '0')}:00`,
    };

    Object.keys(locationHourlyData).forEach(locationKey => {
      const locationHourData = hourData.filter(
        item => item.location === locationKey
      );

      const totalHandle = locationHourData.reduce(
        (sum, item) => sum + item.handle,
        0
      );
      const totalWinLoss = locationHourData.reduce(
        (sum, item) => sum + item.winLoss,
        0
      );
      const totalJackpot = locationHourData.reduce(
        (sum, item) => sum + item.jackpot,
        0
      );
      const totalPlays = locationHourData.reduce(
        (sum, item) => sum + item.plays,
        0
      );

      stackedData[locationKey] = {
        handle: Math.round(totalHandle),
        winLoss: Math.round(totalWinLoss),
        jackpot: Math.round(totalJackpot),
        plays: Math.round(totalPlays),
      };
    });

    return stackedData;
  });
}

/**
 * Calculate totals from hourly trends
 */
function calculateHourlyTotals(
  hourlyTrends: StackedData[]
): Record<
  string,
  { handle: number; winLoss: number; jackpot: number; plays: number }
> {
  return hourlyTrends.reduce(
    (acc, item) => {
      Object.keys(item).forEach(key => {
        if (key !== 'hour' && typeof item[key] === 'object') {
          if (!acc[key])
            acc[key] = { handle: 0, winLoss: 0, jackpot: 0, plays: 0 };
          acc[key].handle += item[key].handle;
          acc[key].winLoss += item[key].winLoss;
          acc[key].jackpot += item[key].jackpot;
          acc[key].plays += item[key].plays;
        }
      });
      return acc;
    },
    {} as Record<
      string,
      { handle: number; winLoss: number; jackpot: number; plays: number }
    >
  );
}

/**
 * Get location currency mappings
 */
async function getLocationCurrenciesForMachineHourly(
  db: Db,
  locationsData: Array<{
    _id: unknown;
    rel?: { licencee?: unknown };
    country?: unknown;
  }>
): Promise<Map<string, string>> {
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
      locationCurrencies.set(
        (loc._id as { toString: () => string }).toString(),
        licenseeName
      );
    } else {
      const countryId = loc.country;
      const countryName = countryId
        ? countryIdToName.get(countryId.toString())
        : undefined;
      const nativeCurrency = countryName
        ? getCountryCurrency(countryName)
        : 'USD';
      locationCurrencies.set(
        (loc._id as { toString: () => string }).toString(),
        nativeCurrency
      );
    }
  });

  return locationCurrencies;
}

/**
 * Apply currency conversion to hourly trends
 */
function convertHourlyTrendsCurrency(
  hourlyTrends: StackedData[],
  locationCurrencies: Map<string, string>,
  displayCurrency: CurrencyCode
): StackedData[] {
  return hourlyTrends.map(hourData => {
    const converted: StackedData = { hour: hourData.hour };
    Object.keys(hourData).forEach(key => {
      if (key !== 'hour' && typeof hourData[key] === 'object') {
        const data = hourData[key] as {
          handle: number;
          winLoss: number;
          jackpot: number;
          plays: number;
        };
        const nativeCurrency = locationCurrencies.get(key) || 'USD';
        converted[key] = {
          handle: convertFromUSD(
            convertToUSD(data.handle, nativeCurrency),
            displayCurrency
          ),
          winLoss: convertFromUSD(
            convertToUSD(data.winLoss, nativeCurrency),
            displayCurrency
          ),
          jackpot: convertFromUSD(
            convertToUSD(data.jackpot, nativeCurrency),
            displayCurrency
          ),
          plays: data.plays, // plays is not a currency value
        };
      }
    });
    return converted;
  });
}

/**
 * Apply currency conversion to totals
 */
function convertTotalsCurrency(
  totals: Record<
    string,
    { handle: number; winLoss: number; jackpot: number; plays: number }
  >,
  locationCurrencies: Map<string, string>,
  displayCurrency: CurrencyCode
): Record<
  string,
  { handle: number; winLoss: number; jackpot: number; plays: number }
> {
  const convertedTotals: Record<
    string,
    { handle: number; winLoss: number; jackpot: number; plays: number }
  > = {};
  Object.keys(totals).forEach(locationId => {
    const nativeCurrency = locationCurrencies.get(locationId) || 'USD';
    convertedTotals[locationId] = {
      handle: convertFromUSD(
        convertToUSD(totals[locationId].handle, nativeCurrency),
        displayCurrency
      ),
      winLoss: convertFromUSD(
        convertToUSD(totals[locationId].winLoss, nativeCurrency),
        displayCurrency
      ),
      jackpot: convertFromUSD(
        convertToUSD(totals[locationId].jackpot, nativeCurrency),
        displayCurrency
      ),
      plays: totals[locationId].plays, // plays is not a currency value
    };
  });
  return convertedTotals;
}

/**
 * Get machine hourly data
 */
export async function getMachineHourlyData(
  db: Db,
  locationIds: string | null,
  machineIds: string | null,
  timePeriod: TimePeriod,
  licencee: string | null,
  startDateParam: string | null,
  endDateParam: string | null,
  displayCurrency: CurrencyCode
): Promise<{
  locationIds: string[];
  machineIds: string[];
  timePeriod: TimePeriod;
  startDate: string;
  endDate: string;
  hourlyTrends: StackedData[];
  totals: Record<
    string,
    { handle: number; winLoss: number; jackpot: number; plays: number }
  >;
  locations: string[];
  locationNames: Record<string, string>;
  currency: CurrencyCode;
  converted: boolean;
}> {
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

  const targetLocations = locationIds
    ? locationIds.split(',').map(id => id.trim())
    : [];
  const targetMachines = machineIds
    ? machineIds.split(',').map(id => id.trim())
    : [];

  // Build and execute pipeline
  const pipeline = buildMachineHourlyPipeline(
    startDate,
    endDate,
    targetLocations,
    targetMachines,
    licencee
  );

  const hourlyData = (await db
    .collection('meters')
    .aggregate(pipeline)
    .toArray()) as HourlyDataItem[];

  // Group data by location
  const locationHourlyData = groupHourlyDataByLocation(hourlyData);

  // Format hourly trends
  const hourlyTrends = formatHourlyTrends(hourlyData, locationHourlyData);

  // Calculate totals
  const totals = calculateHourlyTotals(hourlyTrends);

  // Fetch location names
  const locationStringIds = Object.keys(locationHourlyData);
  const locationsData = await db
    .collection('gaminglocations')
    .find({ _id: { $in: locationStringIds } } as never, {
      projection: { _id: 1, name: 1, rel: 1, country: 1 },
    })
    .toArray();

  const locationNames: Record<string, string> = {};
  locationsData.forEach(loc => {
    const locationId = String(loc._id);
    locationNames[locationId] = loc.name as string;
  });

  // Apply currency conversion if needed
  let convertedHourlyTrends = hourlyTrends;
  let convertedTotals = totals;

  if (shouldApplyCurrencyConversion(licencee)) {
    const locationCurrencies = await getLocationCurrenciesForMachineHourly(
      db,
      locationsData
    );
    convertedHourlyTrends = convertHourlyTrendsCurrency(
      hourlyTrends,
      locationCurrencies,
      displayCurrency
    );
    convertedTotals = convertTotalsCurrency(
      totals,
      locationCurrencies,
      displayCurrency
    );
  }

  return {
    locationIds: targetLocations,
    machineIds: targetMachines,
    timePeriod,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    hourlyTrends: convertedHourlyTrends,
    totals: convertedTotals,
    locations: Object.keys(locationHourlyData),
    locationNames,
    currency: displayCurrency,
    converted: shouldApplyCurrencyConversion(licencee),
  };
}
