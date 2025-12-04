/**
 * Analytics Helper Functions
 *
 * This module contains helper functions for analytics API routes.
 * It handles aggregation pipelines, data fetching, and analytics calculations.
 *
 * @module app/api/lib/helpers/analytics
 */

import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import { Countries } from '@/app/api/lib/models/countries';
import { shouldApplyCurrencyConversion } from '@/lib/helpers/currencyConversion';
import { convertFromUSD } from '@/lib/helpers/rates';
import type { MachineAnalytics } from '@/lib/types/reports';
import type { CurrencyCode } from '@/shared/types/currency';
import { subDays } from 'date-fns';
import type { PipelineStage } from 'mongoose';
import mongoose from 'mongoose';
import { connectDB } from '../middleware/db';

/**
 * Get top performing locations for a given licensee
 */
export async function getTopLocations(
  licensee: string,
  startDate?: Date,
  endDate?: Date
) {
  // First get all locations for the licensee
  const locations = await Machine.aggregate([
    // Stage 1: Join machines with gaming locations to get location details
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },

    // Stage 2: Flatten the location details array (each machine now has location info)
    {
      $unwind: '$locationDetails',
    },

    // Stage 3: Filter machines by licensee to get only relevant locations
    {
      $match: {
        'locationDetails.rel.licencee': licensee,
      },
    },

    // Stage 4: Group by location to aggregate machine statistics
    {
      $group: {
        _id: '$gamingLocation',
        locationInfo: { $first: '$locationDetails' },
        machineCount: { $sum: 1 },
        onlineMachines: {
          $sum: {
            $cond: [{ $eq: ['$assetStatus', 'active'] }, 1, 0],
          },
        },
        sasMachines: {
          $sum: {
            $cond: ['$isSasMachine', 1, 0],
          },
        },
      },
    },
  ]);

  // Now get financial metrics for each location using meters collection
  const topLocationsWithMetrics = await Promise.all(
    locations.map(async location => {
      const locationId = location._id.toString();

      // Get financial metrics from meters collection with date filtering
      const matchStage: Record<string, unknown> = {
        location: locationId,
      };

      // Add date filtering if provided
      if (startDate && endDate) {
        matchStage.readAt = { $gte: startDate, $lte: endDate };
      }

      const metersAggregation =
        (await Machine.db?.db
          ?.collection('meters')
          ?.aggregate([
            // Stage 1: Filter meter records by location and date range
            {
              $match: matchStage,
            },

            // Stage 2: Aggregate financial metrics for this location
            {
              $group: {
                _id: null,
                totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
                totalCancelledCredits: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
              },
            },
          ])
          ?.toArray()) || [];

      const financialMetrics = metersAggregation[0] || {
        totalDrop: 0,
        totalCancelledCredits: 0,
      };
      const gross =
        financialMetrics.totalDrop - financialMetrics.totalCancelledCredits;

      return {
        id: locationId,
        name: location.locationInfo.name,
        totalDrop: financialMetrics.totalDrop,
        cancelledCredits: financialMetrics.totalCancelledCredits,
        gross: gross,
        machineCount: location.machineCount,
        onlineMachines: location.onlineMachines,
        sasMachines: location.sasMachines,
        coordinates:
          location.locationInfo.geoCoords?.latitude &&
          location.locationInfo.geoCoords?.longitude
            ? [
                location.locationInfo.geoCoords.longitude,
                location.locationInfo.geoCoords.latitude,
              ]
            : null,
        trend: gross >= 10000 ? 'up' : 'down',
        trendPercentage: Math.abs(Math.random() * 10),
      };
    })
  );

  // Sort by gross and return top 5
  return topLocationsWithMetrics.sort((a, b) => b.gross - a.gross).slice(0, 5);
}

/**
 * Get machine statistics for a given licensee
 */
export async function getMachineStats(licensee: string) {
  const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);
  const matchStage =
    licensee && licensee.toLowerCase() !== 'all'
      ? { 'locationDetails.rel.licencee': licensee }
      : {};

  const statsPipeline = [
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    {
      $unwind: '$locationDetails',
    },
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: null,
        totalMachines: { $sum: 1 },
        onlineMachines: {
          $sum: {
            $cond: [{ $gt: ['$lastActivity', onlineThreshold] }, 1, 0],
          },
        },
        sasMachines: {
          $sum: {
            $cond: ['$isSasMachine', 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ];

  const statsResult = await Machine.aggregate(statsPipeline);
  const machineStats = statsResult[0] || {
    totalMachines: 0,
    onlineMachines: 0,
    sasMachines: 0,
  };

  // Get financial metrics from meters collection for the licensee
  const financialMetrics =
    (await Machine.db?.db
      ?.collection('meters')
      ?.aggregate([
        {
          $lookup: {
            from: 'machines',
            localField: 'machine',
            foreignField: '_id',
            as: 'machineInfo',
          },
        },
        {
          $unwind: '$machineInfo',
        },
        {
          $lookup: {
            from: 'gaminglocations',
            localField: 'machineInfo.gamingLocation',
            foreignField: '_id',
            as: 'locationInfo',
          },
        },
        {
          $unwind: '$locationInfo',
        },
        {
          $match: {
            'locationInfo.rel.licencee': licensee,
          },
        },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCancelledCredits: {
              $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
            },
          },
        },
      ])
      ?.toArray()) || [];

  const financial = financialMetrics[0] || {
    totalDrop: 0,
    totalCancelledCredits: 0,
  };
  const totalGross = financial.totalDrop - financial.totalCancelledCredits;

  return {
    ...machineStats,
    totalDrop: financial.totalDrop,
    totalCancelledCredits: financial.totalCancelledCredits,
    totalGross: totalGross,
  };
}

/**
 * Builds aggregation pipeline for machine analytics
 *
 * @param allowedLocationIds - Location IDs to filter by, or 'all' for no filter
 * @param selectedLocation - Optional specific location to filter by
 * @param selectedLicensee - Optional licensee to filter by
 * @param limit - Optional limit for results
 * @returns Aggregation pipeline stages
 */
export function buildMachineAnalyticsPipeline(
  allowedLocationIds: string[] | 'all',
  selectedLocation?: string,
  selectedLicensee?: string,
  limit?: number
): PipelineStage[] {
  const pipeline: PipelineStage[] = [];

  // Stage 1: Filter machines by allowed locations (supports legacy field names)
  if (allowedLocationIds !== 'all') {
    pipeline.push({
      $match: {
        $or: [
          { locationId: { $in: allowedLocationIds } },
          { gamingLocation: { $in: allowedLocationIds } },
        ],
      },
    } as PipelineStage);
  }

  // Stage 1b: Optional specific location filter
  if (selectedLocation) {
    pipeline.push({
      $match: {
        $or: [
          { locationId: selectedLocation },
          { gamingLocation: selectedLocation },
        ],
      },
    } as PipelineStage);
  }

  // Stage 2: Join machines with locations to get location details
  pipeline.push({
    $lookup: {
      from: 'gaminglocations',
      localField: 'locationId',
      foreignField: '_id',
      as: 'locationDetails',
    },
  });

  // Stage 3: Flatten the location details array
  pipeline.push({
    $unwind: '$locationDetails',
  });

  // Stage 4: Filter by licensee if provided
  if (selectedLicensee) {
    pipeline.push({
      $match: {
        'locationDetails.rel.licencee': selectedLicensee,
      },
    } as PipelineStage);
  }

  // Stage 5: Project only the fields needed for analytics
  pipeline.push({
    $project: {
      _id: 1,
      name: 1,
      locationName: '$locationDetails.name',
      totalDrop: 1,
      gross: 1,
      isOnline: 1,
      hasSas: 1,
    },
  });

  // Stage 6: Sort machines by total drop in descending order
  pipeline.push({
    $sort: {
      totalDrop: -1,
    },
  });

  // Stage 7: Apply limit if specified
  if (limit) {
    pipeline.push({ $limit: limit });
  }

  return pipeline;
}

/**
 * Fetches machine analytics data
 *
 * @param allowedLocationIds - Location IDs to filter by, or 'all' for no filter
 * @param selectedLocation - Optional specific location to filter by
 * @param selectedLicensee - Optional licensee to filter by
 * @param limit - Optional limit for results
 * @returns Array of machine analytics data
 */
export async function getMachineAnalytics(
  allowedLocationIds: string[] | 'all',
  selectedLocation?: string,
  selectedLicensee?: string,
  limit?: number
): Promise<MachineAnalytics[]> {
  const pipeline = buildMachineAnalyticsPipeline(
    allowedLocationIds,
    selectedLocation,
    selectedLicensee,
    limit
  );

  return await Machine.aggregate(pipeline);
}

/**
 * Machine statistics query parameters
 */
export type MachineStatsParams = {
  licensee?: string | null;
};

/**
 * Machine statistics result
 */
export type MachineStatsResult = {
  stats: {
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
    totalMachines: number;
    onlineMachines: number;
    sasMachines: number;
  };
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
};

/**
 * Builds machine match stage for statistics query
 *
 * @param allowedLocationIds - Location IDs to filter by, or 'all' for no filter
 * @returns MongoDB match stage object
 */
function buildMachineStatsMatchStage(
  allowedLocationIds: string[] | 'all'
): Record<string, unknown> {
  const matchStage: Record<string, unknown> = {
    $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
  };

  if (allowedLocationIds !== 'all') {
    matchStage.gamingLocation = { $in: allowedLocationIds };
  }

  return matchStage;
}

/**
 * Fetches machine statistics for analytics
 *
 * @param allowedLocationIds - Location IDs to filter by, or 'all' for no filter
 * @returns Machine statistics result
 */
export async function getMachineStatsForAnalytics(
  allowedLocationIds: string[] | 'all'
): Promise<MachineStatsResult> {
  const db = await connectDB();
  if (!db) {
    throw new Error('Database connection failed');
  }

  const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);
  const machineMatchStage = buildMachineStatsMatchStage(allowedLocationIds);

  // Count totals and online in parallel
  const [totalMachines, onlineMachines, sasMachines, financialTotals] =
    await Promise.all([
      Machine.countDocuments({
        ...machineMatchStage,
        lastActivity: { $exists: true },
      }),
      Machine.countDocuments({
        ...machineMatchStage,
        lastActivity: { $gte: onlineThreshold },
      }),
      Machine.countDocuments({
        ...machineMatchStage,
        isSasMachine: true,
      }),
      Machine.aggregate([
          { $match: machineMatchStage },
          {
            $group: {
              _id: null,
              totalDrop: { $sum: { $ifNull: ['$sasMeters.drop', 0] } },
              totalCancelledCredits: {
                $sum: { $ifNull: ['$sasMeters.totalCancelledCredits', 0] },
              },
              totalGross: {
                $sum: {
                  $subtract: [
                    { $ifNull: ['$sasMeters.drop', 0] },
                    { $ifNull: ['$sasMeters.totalCancelledCredits', 0] },
                  ],
                },
              },
            },
          },
        ]),
    ]);

  const financials = financialTotals[0] || {
    totalDrop: 0,
    totalCancelledCredits: 0,
    totalGross: 0,
  };

  const stats = {
    totalDrop: financials.totalDrop,
    totalCancelledCredits: financials.totalCancelledCredits,
    totalGross: financials.totalGross,
    totalMachines,
    onlineMachines,
    sasMachines,
  };

  return {
    stats,
    totalMachines: stats.totalMachines,
    onlineMachines: stats.onlineMachines,
    offlineMachines: stats.totalMachines - stats.onlineMachines,
  };
}

/**
 * Dashboard analytics query parameters
 */
export type DashboardAnalyticsParams = {
  licensee: string;
  displayCurrency?: string;
};

/**
 * Dashboard analytics result
 */
export type DashboardAnalyticsResult = {
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
  totalMachines: number;
  onlineMachines: number;
  sasMachines: number;
};

/**
 * Builds aggregation pipeline for dashboard analytics
 *
 * @param licensee - Licensee ID to filter by
 * @returns Aggregation pipeline stages
 */
function buildDashboardAnalyticsPipeline(licensee: string): PipelineStage[] {
  return [
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    {
      $unwind: '$locationDetails',
    },
    {
      $match: {
        'locationDetails.rel.licencee': licensee,
      },
    },
    {
      $group: {
        _id: null,
        totalDrop: { $sum: { $ifNull: ['$sasMeters.drop', 0] } },
        totalCancelledCredits: {
          $sum: { $ifNull: ['$sasMeters.totalCancelledCredits', 0] },
        },
        totalGross: {
          $sum: {
            $subtract: [
              { $ifNull: ['$sasMeters.drop', 0] },
              { $ifNull: ['$sasMeters.totalCancelledCredits', 0] },
            ],
          },
        },
        totalMachines: { $sum: 1 },
        onlineMachines: {
          $sum: {
            $cond: [{ $eq: ['$assetStatus', 'active'] }, 1, 0],
          },
        },
        sasMachines: {
          $sum: {
            $cond: ['$isSasMachine', 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ];
}

/**
 * Fetches dashboard analytics data
 *
 * @param licensee - Licensee ID to filter by
 * @returns Dashboard analytics result
 */
export async function getDashboardAnalytics(
  licensee: string
): Promise<DashboardAnalyticsResult> {
  const pipeline = buildDashboardAnalyticsPipeline(licensee);
  const statsResult = await Machine.aggregate(pipeline);

  return (
    statsResult[0] || {
      totalDrop: 0,
      totalCancelledCredits: 0,
      totalGross: 0,
      totalMachines: 0,
      onlineMachines: 0,
      sasMachines: 0,
    }
  );
}

/**
 * Build aggregation pipeline for charts data
 *
 * @param licenseeId - Licensee ObjectId
 * @param startDate - Start date for filtering
 * @param endDate - End date for filtering
 * @returns MongoDB aggregation pipeline stages
 */
function buildChartsPipeline(
  licenseeId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
): PipelineStage[] {
  return [
    // Stage 1: Filter meter records by date range
    {
      $match: {
        readAt: { $gte: startDate, $lte: endDate },
      },
    },
    // Stage 2: Join meters with machines to get machine details
    {
      $lookup: {
        from: 'machines',
        localField: 'machine',
        foreignField: '_id',
        as: 'machineDetails',
      },
    },
    // Stage 3: Flatten the machine details array
    {
      $unwind: '$machineDetails',
    },
    // Stage 4: Join with gaming locations to get location details
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'machineDetails.gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    // Stage 5: Flatten the location details array
    {
      $unwind: '$locationDetails',
    },
    // Stage 6: Filter by licensee
    {
      $match: {
        'locationDetails.licensee': licenseeId,
      },
    },
    // Stage 7: Group by date to aggregate daily financial metrics
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$readAt' } },
        totalDrop: { $sum: { $ifNull: ['$drop', 0] } },
        cancelledCredits: {
          $sum: { $ifNull: ['$totalCancelledCredits', 0] },
        },
        gross: {
          $sum: {
            $subtract: [
              { $ifNull: ['$drop', 0] },
              { $ifNull: ['$totalCancelledCredits', 0] },
            ],
          },
        },
      },
    },
    // Stage 8: Sort by date for chronological order
    {
      $sort: { _id: 1 },
    },
    // Stage 9: Project final chart data structure
    {
      $project: {
        _id: 0,
        date: '$_id',
        totalDrop: '$totalDrop',
        cancelledCredits: '$cancelledCredits',
        gross: '$gross',
      },
    },
  ];
}

/**
 * Apply currency conversion to chart series data
 *
 * @param series - Chart series data
 * @param licensee - Licensee identifier
 * @param displayCurrency - Target currency code
 * @returns Converted series data
 */
function applyChartsCurrencyConversion(
  series: Array<Record<string, unknown>>,
  licensee: string | null,
  displayCurrency: CurrencyCode
): Array<Record<string, unknown>> {
  if (!shouldApplyCurrencyConversion(licensee)) {
    return series;
  }

  console.warn(
    '🔍 ANALYTICS CHARTS - Applying currency conversion for All Licensee mode'
  );

  const financialFields = ['totalDrop', 'cancelledCredits', 'gross'];
  return series.map(item => {
    const convertedItem = { ...item };
    financialFields.forEach(field => {
      if (typeof item[field] === 'number') {
        (convertedItem as Record<string, unknown>)[field] = convertFromUSD(
          item[field] as number,
          displayCurrency
        );
      }
    });
    return convertedItem;
  });
}

/**
 * Get charts data for analytics
 *
 * @param licensee - Licensee identifier
 * @param period - Time period ('last7days' or 'last30days')
 * @param displayCurrency - Display currency code
 * @returns Chart series data with currency conversion applied
 */
export async function getChartsData(
  licensee: string,
  period: 'last7days' | 'last30days',
  displayCurrency: CurrencyCode
): Promise<{
  series: Array<Record<string, unknown>>;
  currency: CurrencyCode;
  converted: boolean;
}> {
  const endDate = new Date();
  const startDate =
    period === 'last7days' ? subDays(endDate, 7) : subDays(endDate, 30);
  const licenseeId = new mongoose.Types.ObjectId(licensee);

  const chartsPipeline = buildChartsPipeline(licenseeId, startDate, endDate);
  const series = await Meters.aggregate(chartsPipeline);

  const convertedSeries = applyChartsCurrencyConversion(
    series,
    licensee,
    displayCurrency
  );

  return {
    series: convertedSeries,
    currency: displayCurrency,
    converted: shouldApplyCurrencyConversion(licensee),
  };
}

/**
 * Get top locations analytics data with financial metrics
 *
 * @param db - Database connection
 * @param licensee - Licensee ID to filter by
 * @param displayCurrency - Display currency code
 * @returns Top locations with financial metrics and currency conversion
 */
export async function getTopLocationsAnalytics(
  db: NonNullable<Awaited<ReturnType<typeof connectDB>>>,
  licensee: string,
  displayCurrency: CurrencyCode
): Promise<{
  topLocations: Array<{
    id: string;
    name: string;
    totalDrop: number;
    cancelledCredits: number;
    gross: number;
    machineCount: number;
    onlineMachines: number;
    sasMachines: number;
    rel?: unknown;
    country?: unknown;
    coordinates: [number, number] | null;
    trend: string;
    trendPercentage: number;
  }>;
  currency: CurrencyCode;
  converted: boolean;
}> {
  const locationsPipeline: PipelineStage[] = [
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'gamingLocation',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    {
      $unwind: '$locationDetails',
    },
    {
      $match: {
        'locationDetails.rel.licencee': licensee,
      },
    },
    {
      $group: {
        _id: '$gamingLocation',
        machineCount: { $sum: 1 },
        onlineMachines: {
          $sum: {
            $cond: [{ $eq: ['$assetStatus', 'active'] }, 1, 0],
          },
        },
        sasMachines: {
          $sum: {
            $cond: ['$isSasMachine', 1, 0],
          },
        },
        locationInfo: { $first: '$locationDetails' },
      },
    },
    { $sort: { gross: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        id: '$_id',
        name: '$locationInfo.name',
        totalDrop: '$totalDrop',
        cancelledCredits: '$cancelledCredits',
        gross: '$gross',
        machineCount: '$machineCount',
        onlineMachines: '$onlineMachines',
        sasMachines: '$sasMachines',
        coordinates: {
          $cond: {
            if: {
              $and: [
                { $ifNull: ['$locationInfo.geoCoords.latitude', false] },
                { $ifNull: ['$locationInfo.geoCoords.longitude', false] },
              ],
            },
            then: [
              '$locationInfo.geoCoords.longitude',
              '$locationInfo.geoCoords.latitude',
            ],
            else: null,
          },
        },
        trend: { $cond: [{ $gte: ['$gross', 10000] }, 'up', 'down'] },
        trendPercentage: { $abs: { $multiply: [{ $rand: {} }, 10] } },
      },
    },
  ];

  const topLocations = await Machine.aggregate(locationsPipeline);

  let topLocationsWithMetrics = await Promise.all(
    topLocations.map(async location => {
      const locationId = location.id?.toString() || location._id?.toString();

      const metersAggregation = await db
        .collection('meters')
        .aggregate([
          {
            $match: {
              location: locationId,
            },
          },
          {
            $group: {
              _id: null,
              totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              totalCancelledCredits: {
                $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
              },
            },
          },
        ])
        .toArray();

      const financialMetrics = metersAggregation[0] || {
        totalDrop: 0,
        totalCancelledCredits: 0,
      };
      const gross =
        financialMetrics.totalDrop - financialMetrics.totalCancelledCredits;

      return {
        id: locationId,
        name: location.locationInfo?.name || location.name,
        totalDrop: financialMetrics.totalDrop,
        cancelledCredits: financialMetrics.totalCancelledCredits,
        gross: gross,
        machineCount: location.machineCount,
        onlineMachines: location.onlineMachines,
        sasMachines: location.sasMachines,
        rel: location.locationInfo?.rel,
        country: location.locationInfo?.country,
        coordinates:
          location.locationInfo?.geoCoords?.latitude &&
          location.locationInfo?.geoCoords?.longitude
            ? ([
                location.locationInfo.geoCoords.longitude,
                location.locationInfo.geoCoords.latitude,
              ] as [number, number])
            : null,
        trend: gross >= 10000 ? 'up' : 'down',
        trendPercentage: Math.abs(Math.random() * 10),
      };
    })
  );

  if (shouldApplyCurrencyConversion(licensee)) {
    const { convertToUSD, getCountryCurrency } = await import(
      '@/lib/helpers/rates'
    );

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

    topLocationsWithMetrics = topLocationsWithMetrics.map(location => {
      const licenseeId = location.rel?.licencee;
      let nativeCurrency: string = 'USD';

      if (licenseeId) {
        const licenseeName = licenseeIdToName.get(licenseeId.toString());
        nativeCurrency = licenseeName || 'USD';
      } else if (location.country) {
        const countryName = countryIdToName.get(location.country.toString());
        nativeCurrency = countryName ? getCountryCurrency(countryName) : 'USD';
      }

      const totalDropUSD = convertToUSD(location.totalDrop, nativeCurrency);
      const grossUSD = convertToUSD(location.gross, nativeCurrency);
      const cancelledCreditsUSD = convertToUSD(
        location.cancelledCredits || 0,
        nativeCurrency
      );

      return {
        ...location,
        totalDrop: convertFromUSD(totalDropUSD, displayCurrency),
        cancelledCredits: convertFromUSD(cancelledCreditsUSD, displayCurrency),
        gross: convertFromUSD(grossUSD, displayCurrency),
      };
    });
  }

  return {
    topLocations: topLocationsWithMetrics,
    currency: displayCurrency,
    converted: shouldApplyCurrencyConversion(licensee),
  };
}
