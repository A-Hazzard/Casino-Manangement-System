/**
 * Cabinet Chart Operations
 *
 * Extracted business logic for the cabinet chart route.
 * Handles date range calculation, granularity resolution,
 * aggregation pipeline building, currency conversion, and data transformation.
 *
 * @module app/api/lib/helpers/cabinets/chartOperations
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Licencee } from '@/app/api/lib/models/licencee';
import { Meters } from '@/app/api/lib/models/meters';
import {
  convertFromUSD,
  convertToUSD,
  getCountryCurrency,
  getLicenceeCurrency,
} from '@/lib/helpers/rates';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type { LicenceeDocument } from '@shared/types';
import type { LocationDocument } from '@/lib/types/common';
import type { PipelineStage } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export type ChartBucket = {
  day?: string;
  time?: string;
  drop?: number;
  totalCancelledCredits?: number;
  gross?: number;
  month?: string;
};

export type ChartDateRange = {
  startDate: Date | undefined;
  endDate: Date | undefined;
};

export type DataSpanResult = {
  minDate: Date;
  maxDate: Date;
} | null;

export type GranularityConfig = {
  useHourly: boolean;
  useMinute: boolean;
  useMonthly: boolean;
  useWeekly: boolean;
  useDaily: boolean;
  resolvedGranularity: string;
};

// ============================================================================
// Date Range Calculation
// ============================================================================

/**
 * Calculates the chart date range from time period or custom date parameters.
 * Applies gaming day offset when computing date boundaries.
 *
 * @param {string | null} timePeriod - Time period preset ('Today', 'Yesterday', '7d', '30d', 'Custom', 'All Time')
 * @param {string | null} startDateParam - ISO date string for custom range start
 * @param {string | null} endDateParam - ISO date string for custom range end
 * @param {number} gameDayOffset - Hour offset for gaming day start (0-23)
 * @returns {ChartDateRange | { error: string }} Date range or error object
 */
export function calculateChartDateRange(
  timePeriod: string | null,
  startDateParam: string | null,
  endDateParam: string | null,
  gameDayOffset: number
): ChartDateRange | { error: string } {
  if (timePeriod === 'Custom' && startDateParam && endDateParam) {
    const customStart = new Date(startDateParam);
    const customEnd = new Date(endDateParam);

    if (isNaN(customStart.getTime()) || isNaN(customEnd.getTime())) {
      return { error: 'Invalid date parameters' };
    }

    const gamingDayRange = getGamingDayRangeForPeriod(
      'Custom',
      gameDayOffset,
      customStart,
      customEnd
    );

    return {
      startDate: gamingDayRange.rangeStart,
      endDate: gamingDayRange.rangeEnd,
    };
  }

  if (timePeriod === 'All Time') {
    return { startDate: undefined, endDate: undefined };
  }

  const timePeriodForGamingDay = timePeriod || 'Today';
  const gamingDayRange = getGamingDayRangeForPeriod(
    timePeriodForGamingDay,
    gameDayOffset
  );

  return {
    startDate: gamingDayRange.rangeStart,
    endDate: gamingDayRange.rangeEnd,
  };
}

// ============================================================================
// Data Span Detection (Quarterly / All Time)
// ============================================================================

/**
 * Detects the actual data span for Quarterly or All Time periods.
 * Queries the minimum and maximum meter timestamps for the machine.
 *
 * @param {string} machineId - Machine ID to query
 * @param {Date | undefined} startDate - Query start date
 * @param {Date | undefined} endDate - Query end date
 * @param {string | null} timePeriod - Time period preset
 * @returns {Promise<{ span: DataSpanResult; adjustedStartDate: Date | undefined; adjustedEndDate: Date | undefined }>}
 */
export async function detectChartDataSpan(
  machineId: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
  timePeriod: string | null
): Promise<{
  span: DataSpanResult;
  adjustedStartDate: Date | undefined;
  adjustedEndDate: Date | undefined;
}> {
  if (timePeriod !== 'Quarterly' && timePeriod !== 'All Time') {
    return { span: null, adjustedStartDate: startDate, adjustedEndDate: endDate };
  }

  const matchStage: Record<string, unknown> = { machine: machineId };
  if (timePeriod === 'Quarterly' && startDate && endDate) {
    matchStage.readAt = { $gte: startDate, $lte: endDate };
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
    const span: DataSpanResult = { minDate, maxDate };

    if (timePeriod === 'All Time') {
      return { span, adjustedStartDate: minDate, adjustedEndDate: maxDate };
    }
    return { span, adjustedStartDate: startDate, adjustedEndDate: endDate };
  }

  return { span: null, adjustedStartDate: startDate, adjustedEndDate: endDate };
}

// ============================================================================
// Granularity Resolution
// ============================================================================

/**
 * Resolves chart granularity (minute/hourly/daily/weekly/monthly) based on time period or manual override.
 *
 * @param {string | null} timePeriod - Time period preset
 * @param {Date | undefined} startDate - Query start date
 * @param {Date | undefined} endDate - Query end date
 * @param {string | null} manualGranularity - Manual granularity override
 * @returns {GranularityConfig} Granularity configuration object
 */
export function resolveChartGranularity(
  timePeriod: string | null,
  startDate: Date | undefined,
  endDate: Date | undefined,
  manualGranularity: string | null
): GranularityConfig {
  let useHourly = false;
  let useMinute = false;
  let useMonthly = false;
  let useWeekly = false;
  let useDaily = false;

  if (manualGranularity) {
    if (manualGranularity === 'minute') useMinute = true;
    else if (manualGranularity === 'hourly') useHourly = true;
    else if (manualGranularity === 'daily') useDaily = true;
    else if (manualGranularity === 'weekly') useWeekly = true;
    else if (manualGranularity === 'monthly') useMonthly = true;
  } else if (timePeriod === 'Today' || timePeriod === 'Yesterday') {
    useHourly = true;
  } else if (timePeriod === 'Custom' && startDate && endDate) {
    const diffInMs = endDate.getTime() - startDate.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    useHourly = diffInDays <= 1;
    useDaily = diffInDays > 1;
  } else {
    useDaily = true;
  }

  const resolvedGranularity = useMinute
    ? 'minute'
    : useHourly
      ? 'hourly'
      : useDaily
        ? 'daily'
        : useWeekly
          ? 'weekly'
          : useMonthly
            ? 'monthly'
            : 'yearly';

  return { useHourly, useMinute, useMonthly, useWeekly, useDaily, resolvedGranularity };
}

// ============================================================================
// Aggregation Pipeline Builder
// ============================================================================

/**
 * Builds a MongoDB aggregation pipeline for chart metrics.
 * Groups meter data by the resolved granularity with drop, cancelled credits, and gross.
 *
 * @param {string} machineId - Machine ID to aggregate
 * @param {Date | undefined} startDate - Query start date
 * @param {Date | undefined} endDate - Query end date
 * @param {GranularityConfig} config - Granularity configuration
 * @returns {PipelineStage[]} Aggregation pipeline stages
 */
export function buildChartAggregationPipeline(
  machineId: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
  config: GranularityConfig
): PipelineStage[] {
  const { useHourly, useMinute, useMonthly, useWeekly, useDaily } = config;
  const pipeline: PipelineStage[] = [];

  const matchStage: Record<string, unknown> = { machine: machineId };
  if (startDate && endDate) {
    matchStage.readAt = { $gte: startDate, $lte: endDate };
  }
  pipeline.push({ $match: matchStage });

  const groupId: Record<string, unknown> = {};

  if (useDaily) {
    groupId.day = {
      $dateToString: { date: '$readAt', format: '%Y-%m-%d', timezone: 'UTC' },
    };
  } else if (useWeekly) {
    groupId.day = {
      $dateToString: {
        date: {
          $subtract: [
            '$readAt',
            {
              $multiply: [
                {
                  $cond: {
                    if: { $eq: [{ $dayOfWeek: '$readAt' }, 1] },
                    then: 6,
                    else: { $subtract: [{ $dayOfWeek: '$readAt' }, 2] },
                  },
                },
                24 * 60 * 60 * 1000,
              ],
            },
          ],
        },
        format: '%Y-%m-%d',
        timezone: 'UTC',
      },
    };
    groupId.week = { $week: '$readAt' };
  } else if (useMonthly) {
    groupId.month = {
      $dateToString: { date: '$readAt', format: '%Y-%m', timezone: 'UTC' },
    };
  }

  if (useMinute || useHourly) {
    pipeline.push({
      $addFields: {
        day: {
          $dateToString: { date: '$readAt', format: '%Y-%m-%d', timezone: 'UTC' },
        },
        time: useMinute
          ? { $dateToString: { date: '$readAt', format: '%H:%M', timezone: 'UTC' } }
          : { $dateToString: { date: '$readAt', format: '%H:00', timezone: 'UTC' } },
      },
    });
  } else {
    const addFieldsStage: Record<string, unknown> = { time: '00:00' };

    if (useMonthly && groupId.month) {
      addFieldsStage.month = groupId.month;
      addFieldsStage.day = {
        $dateToString: { date: '$readAt', format: '%Y-%m-01', timezone: 'UTC' },
      };
    } else if (useWeekly && groupId.day) {
      addFieldsStage.day = groupId.day;
      addFieldsStage.week = groupId.week;
    } else if (useDaily && groupId.day) {
      addFieldsStage.day = groupId.day;
    } else {
      addFieldsStage.day = {
        $dateToString: { date: '$readAt', format: '%Y-%m-%d', timezone: 'UTC' },
      };
    }

    pipeline.push({ $addFields: addFieldsStage });
  }

  const groupStageId: Record<string, unknown> = { day: '$day', time: '$time' };
  if (useMonthly && groupId.month) {
    groupStageId.month = '$month';
  } else if (useWeekly && groupId.week) {
    groupStageId.week = '$week';
  }

  pipeline.push({
    $group: {
      _id: groupStageId,
      drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
      totalCancelledCredits: {
        $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
      },
      jackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
    },
  });

  const projectStage: Record<string, unknown> = {
    _id: 0,
    day: '$_id.day',
    time: '$_id.time',
    drop: 1,
    totalCancelledCredits: 1,
    gross: {
      $subtract: [{ $subtract: ['$drop', '$jackpot'] }, '$totalCancelledCredits'],
    },
  };

  if (useMonthly && groupId.month) {
    projectStage.month = '$_id.month';
  }

  pipeline.push({ $project: projectStage });
  pipeline.push({ $sort: { day: 1, time: 1 } });

  return pipeline;
}

// ============================================================================
// Currency Resolution & Conversion
// ============================================================================

/**
 * Resolves the native currency for a gaming location by checking licencee and country.
 *
 * @param {string | undefined} gamingLocationId - Gaming location ID
 * @returns {Promise<CurrencyCode>} Resolved currency code, defaults to USD
 */
export async function resolveChartNativeCurrency(
  gamingLocationId: string | undefined
): Promise<CurrencyCode> {
  if (!gamingLocationId) return 'USD';

  const location = await GamingLocations.findOne({ _id: gamingLocationId })
    .select('rel country')
    .lean<LocationDocument>();

  if (!location) return 'USD';

  const rel = location.rel as Record<string, unknown> | undefined;
  const licenceeId = rel?.licencee as string | string[] | undefined;
  const licenceeIdStr = Array.isArray(licenceeId) ? licenceeId[0] : licenceeId;

  if (licenceeIdStr) {
    try {
      const licenceeDoc = await Licencee.findOne({ _id: licenceeIdStr })
        .select('name')
        .lean<LicenceeDocument>();

      if (licenceeDoc?.name) {
        return getLicenceeCurrency(licenceeDoc.name);
      }
    } catch {
      console.warn('[resolveChartNativeCurrency] Failed to resolve licencee currency');
    }
  }

  if (location.country) {
    return getCountryCurrency(location.country);
  }

  return 'USD';
}

/**
 * Converts chart bucket financial values from native currency to display currency.
 * Returns unchanged data when currencies match.
 *
 * @param {ChartBucket[]} chartData - Chart data to convert
 * @param {CurrencyCode} nativeCurrency - Source currency code
 * @param {CurrencyCode} displayCurrency - Target currency code
 * @returns {ChartBucket[]} Converted chart data
 */
export function convertChartBuckets(
  chartData: ChartBucket[],
  nativeCurrency: CurrencyCode,
  displayCurrency: CurrencyCode
): ChartBucket[] {
  if (nativeCurrency === displayCurrency) return chartData;

  return chartData.map(item => {
    const dropUSD = convertToUSD(item.drop || 0, nativeCurrency);
    const cancelledUSD = convertToUSD(
      item.totalCancelledCredits || 0,
      nativeCurrency
    );
    const grossUSD = convertToUSD(item.gross || 0, nativeCurrency);

    return {
      ...item,
      drop: Math.round(convertFromUSD(dropUSD, displayCurrency) * 100) / 100,
      totalCancelledCredits:
        Math.round(convertFromUSD(cancelledUSD, displayCurrency) * 100) / 100,
      gross: Math.round(convertFromUSD(grossUSD, displayCurrency) * 100) / 100,
    };
  });
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transforms chart buckets ensuring all required fields have default values.
 *
 * @param {ChartBucket[]} chartData - Raw chart data
 * @returns {ChartBucket[]} Transformed chart data with defaults
 */
export function transformChartBuckets(chartData: ChartBucket[]): ChartBucket[] {
  return chartData.map(item => ({
    day: item.day,
    time: item.time || '',
    drop: item.drop || 0,
    totalCancelledCredits: item.totalCancelledCredits || 0,
    gross: item.gross || 0,
  }));
}
