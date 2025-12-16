/**
 * Meters Report Helper Functions
 *
 * This module contains helper functions for the meters report API route.
 * It handles parameter parsing, validation, data fetching, aggregation,
 * transformation, and currency conversion.
 *
 * @module app/api/lib/helpers/metersReport
 */

import type { TimePeriod } from '@/app/api/lib/types';
import { getLicenseeCurrency } from '@/lib/helpers/rates';
import { getGamingDayRangesForLocations } from '@/lib/utils/gamingDayRange';
import type { CurrencyCode } from '@/shared/types/currency';
import type { Db } from 'mongodb';
import { GamingLocations } from '../models/gaminglocations';
import { Machine } from '../models/machines';
import { Meters } from '../models/meters';

/**
 * Request parameters for the meters report API
 */
export type MetersReportParams = {
  locations: string | null;
  timePeriod: TimePeriod;
  customStartDate: string | null;
  customEndDate: string | null;
  page: number;
  limit: number;
  search: string;
  licencee: string | null;
  currency: CurrencyCode | null;
  includeHourlyData: boolean;
  granularity?: 'hourly' | 'minute' | null;
};

/**
 * Parsed and validated request parameters
 */
export type ParsedMetersReportParams = {
  timePeriod: TimePeriod;
  customStartDate: Date | undefined;
  customEndDate: Date | undefined;
  page: number;
  limit: number;
  search: string;
  licencee: string | null;
  displayCurrency: CurrencyCode;
  includeHourlyData: boolean;
  requestedLocationList: string[];
  hourlyDataMachineIds?: string[]; // Optional: filter hourly data by specific machine IDs
  granularity?: 'hourly' | 'minute'; // Optional: granularity for chart data
};

/**
 * Location data with gaming day offset information
 */
export type LocationWithGamingDay = {
  _id: string;
  name: string;
  gameDayOffset: number;
  rel?: { licencee?: string };
  country?: string;
};

/**
 * Machine data from database
 */
export type MachineData = {
  _id: string;
  serialNumber?: string;
  custom?: { name?: string };
  gamingLocation: string;
  sasMeters?: unknown;
  lastActivity?: Date;
  game?: string;
};

/**
 * Meter aggregation result for a single machine
 */
export type MeterAggregationResult = {
  _id: string;
  drop: number;
  totalCancelledCredits: number;
  totalHandPaidCancelledCredits: number;
  coinIn: number;
  coinOut: number;
  totalWonCredits: number;
  gamesPlayed: number;
  jackpot: number;
  lastReadAt: Date;
};

/**
 * Transformed meter report data for a machine
 */
export type TransformedMeterData = {
  machineId: string;
  metersIn: number;
  metersOut: number;
  jackpot: number;
  billIn: number;
  voucherOut: number;
  attPaidCredits: number;
  gamesPlayed: number;
  location: string;
  locationId: string;
  createdAt: Date | undefined;
  machineDocumentId: string;
  customName?: string;
  serialNumber?: string;
  game?: string;
};

/**
 * Hourly chart data point
 */
export type HourlyChartData = {
  day: string;
  hour: string;
  gamesPlayed: number;
  coinIn: number;
  coinOut: number;
};

/**
 * Parse and validate request parameters from URL search params
 *
 * @param searchParams - URL search parameters
 * @returns Parsed and validated parameters
 * @throws Error if required parameters are missing or invalid
 */
export function parseMetersReportParams(
  searchParams: URLSearchParams
): ParsedMetersReportParams {
  const locations = searchParams.get('locations');
  const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || 'Today';
  const customStartDate = searchParams.get('startDate');
  const customEndDate = searchParams.get('endDate');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';
  const licencee = searchParams.get('licencee');
  const includeHourlyData = searchParams.get('includeHourlyData') === 'true';

  // Validate required parameters
  if (!locations) {
    throw new Error('Locations parameter is required');
  }

  // Validate custom date parameters if timePeriod is Custom
  if (timePeriod === 'Custom') {
    if (!customStartDate || !customEndDate) {
      throw new Error('Custom date range requires both startDate and endDate');
    }
  }

  // Determine display currency
  // - If currency param is provided, use it (for "All Licensees" mode)
  // - If viewing a specific licensee, use that licensee's native currency
  // - Otherwise default to USD
  let displayCurrency =
    (searchParams.get('currency') as CurrencyCode) || undefined;

  if (!displayCurrency && licencee && licencee !== 'all') {
    displayCurrency = getLicenseeCurrency(licencee);
  }

  displayCurrency = displayCurrency || 'USD';

  // Parse custom dates if provided
  let parsedCustomStart: Date | undefined;
  let parsedCustomEnd: Date | undefined;
  if (timePeriod === 'Custom' && customStartDate && customEndDate) {
    parsedCustomStart = new Date(customStartDate + 'T00:00:00.000Z');
    parsedCustomEnd = new Date(customEndDate + 'T00:00:00.000Z');
  }

  // Parse locations (comma-separated) from request
  const requestedLocationList = locations
    .split(',')
    .map(loc => loc.trim())
    .filter(loc => loc !== 'all' && loc !== '');

  // Parse machine IDs for hourly data filtering (comma-separated)
  const hourlyDataMachineIdsParam = searchParams.get('hourlyDataMachineIds');
  const hourlyDataMachineIds = hourlyDataMachineIdsParam
    ? hourlyDataMachineIdsParam
        .split(',')
        .map(id => id.trim())
        .filter(id => id !== '')
    : undefined;

  // Parse granularity parameter
  const granularityParam = searchParams.get('granularity');
  const granularity =
    granularityParam === 'minute' || granularityParam === 'hourly'
      ? granularityParam
    : undefined;

  return {
    timePeriod,
    customStartDate: parsedCustomStart,
    customEndDate: parsedCustomEnd,
    page,
    limit,
    search,
    licencee,
    displayCurrency,
    includeHourlyData,
    requestedLocationList,
    hourlyDataMachineIds,
    granularity,
  };
}

/**
 * Determine the final list of locations to query based on user role and permissions
 *
 * @param requestedLocationList - Locations requested by the user
 * @param allowedLocationIds - Location IDs the user is allowed to access
 * @param isLocationAdmin - Whether the user is a location admin
 * @returns Final list of location IDs to query
 */
export function determineLocationList(
  requestedLocationList: string[],
  allowedLocationIds: string[] | 'all',
  isLocationAdmin: boolean
): string[] {
  if (isLocationAdmin) {
    // Location admin: only use their assigned locations (ignore request parameter)
    if (allowedLocationIds === 'all') {
      return [];
    }
    return allowedLocationIds;
  }

  if (requestedLocationList.length > 0) {
    // Other roles: use requested locations, but filter by allowed locations
    if (allowedLocationIds === 'all') {
      return requestedLocationList;
    }
    // Intersect requested locations with allowed locations
    return requestedLocationList.filter(loc =>
      allowedLocationIds.includes(loc)
    );
  }

  // No locations requested, use all allowed locations
  if (allowedLocationIds !== 'all') {
    return allowedLocationIds;
  }

  return [];
}

/**
 * Fetch location data with gaming day offset information
 *
 * @param db - MongoDB database instance
 * @param locationIds - List of location IDs to fetch
 * @returns Array of location data with gaming day offsets
 */
export async function fetchLocationData(
  db: Db,
  locationIds: string[]
): Promise<LocationWithGamingDay[]> {
  if (locationIds.length === 0) {
    return [];
  }

  const locationsData = await GamingLocations.find(
      {
      _id: { $in: locationIds },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
    },
    { _id: 1, name: 1, gameDayOffset: 1, rel: 1, country: 1 }
    )
    .lean()
    .exec();

  return locationsData.map((loc: Record<string, unknown>) => ({
    _id: String(loc._id),
    name: (loc.name as string) || 'Unknown Location',
    gameDayOffset: (loc.gameDayOffset as number) ?? 8, // Default to 8 AM
    rel: (loc.rel as { licencee?: string }) || undefined,
    country: (loc.country as string) || undefined,
  }));
}

/**
 * Calculate gaming day date ranges for all locations
 *
 * @param locationsData - Location data with gaming day offsets
 * @param timePeriod - Time period to calculate ranges for
 * @param customStartDate - Custom start date (for Custom period)
 * @param customEndDate - Custom end date (for Custom period)
 * @returns Map of location ID to gaming day range, and overall query date range
 */
export function calculateGamingDayRanges(
  locationsData: LocationWithGamingDay[],
  timePeriod: TimePeriod,
  customStartDate?: Date,
  customEndDate?: Date
): {
  gamingDayRanges: Map<string, { rangeStart: Date; rangeEnd: Date }>;
  queryStartDate: Date;
  queryEndDate: Date;
} {
  const locationsListForGamingDay = locationsData.map(loc => ({
    _id: loc._id,
    gameDayOffset: loc.gameDayOffset,
  }));

  const gamingDayRanges = getGamingDayRangesForLocations(
    locationsListForGamingDay,
    timePeriod,
    customStartDate,
    customEndDate
  );

  // Get the earliest start and latest end across all locations
  const rangesArray = Array.from(gamingDayRanges.values());
  const queryStartDate = new Date(
    Math.min(...rangesArray.map(r => r.rangeStart.getTime()))
  );
  const queryEndDate = new Date(
    Math.max(...rangesArray.map(r => r.rangeEnd.getTime()))
  );

  return {
    gamingDayRanges,
    queryStartDate,
    queryEndDate,
  };
}

/**
 * Fetch machines data for the selected locations
 *
 * @param db - MongoDB database instance
 * @param locationList - List of location IDs to filter by
 * @param licencee - Optional licensee ID to filter by
 * @returns Array of machine data
 */
export async function fetchMachinesData(
  db: Db,
  locationList: string[],
  licencee: string | null
): Promise<MachineData[]> {
  // Build query filter for machines
  const machineMatchStage: Record<string, unknown> = {
    $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
  };

  // Add location filter if specific locations are selected
  if (locationList.length > 0) {
    machineMatchStage.gamingLocation = { $in: locationList };
  }

  // Get machines data for the selected locations
  let machinesData = await Machine.find(machineMatchStage, {
      _id: 1,
      serialNumber: 1,
      custom: 1, // Get entire custom object to access custom.name
      gamingLocation: 1,
      sasMeters: 1,
      lastActivity: 1,
      game: 1, // Include game field for display
    })
    .sort({ lastActivity: -1 })
    .lean()
    .exec();

  // Filter by licensee if provided
  if (licencee && licencee !== 'all') {
    const licenseeLocations = await GamingLocations.find(
      { 'rel.licencee': licencee },
      { _id: 1 }
    )
      .lean()
      .exec();

    const licenseeLocationIds = licenseeLocations.map(loc => String(loc._id));

    machinesData = machinesData.filter(machine =>
      licenseeLocationIds.includes(
        (machine as unknown as { gamingLocation: string }).gamingLocation
      )
    );
  }

  return machinesData.map((machine: Record<string, unknown>) => ({
    _id: (machine._id as string).toString(),
    serialNumber: (machine.serialNumber as string) || undefined,
    custom: (machine.custom as { name?: string }) || undefined,
    gamingLocation: (machine.gamingLocation as string) || '',
    sasMeters: machine.sasMeters,
    lastActivity: (machine.lastActivity as Date) || undefined,
  }));
}

/**
 * Get the LAST meter document for each machine within the gaming day range
 *
 * This aggregation:
 * 1. Matches meters within the date range
 * 2. Sorts by readAt descending (latest first)
 * 3. Groups by machine and uses $first to get the latest document's absolute values
 *
 * CRITICAL: We use $first (NOT $sum) to get the absolute values from the LAST meter document.
 * These are cumulative totals from the meter, not deltas - we want the final state
 * at the end of the gaming day.
 *
 * @param db - MongoDB database instance
 * @param machineIds - List of machine IDs to query
 * @param queryStartDate - Start date for the query range
 * @param queryEndDate - End date for the query range
 * @returns Map of machine ID to meter aggregation result
 */
export async function getLastMeterPerMachine(
  db: Db,
  machineIds: string[],
  queryStartDate: Date,
  queryEndDate: Date
): Promise<Map<string, MeterAggregationResult>> {
  // Use cursor for Meters aggregation
  const metersAggregation: Array<Record<string, unknown>> = [];
  const metersCursor = Meters.aggregate([
      {
        $match: {
          machine: { $in: machineIds },
          // Use $lt (not $lte) for end date because queryEndDate is the start of the next gaming day
          // and we want to exclude it (only include up to but not including that time)
          readAt: { $gte: queryStartDate, $lt: queryEndDate },
        },
      },
      // Sort by readAt descending to get the latest meter first
      // This ensures $first in the $group stage gets the most recent meter document
      {
        $sort: { readAt: -1 },
      },
      // Group by machine and take the first (latest) document's absolute values
      // CRITICAL: We use $first (NOT $sum) to get the absolute values from the LAST meter document
      // These are cumulative totals from the meter, not deltas - we want the final state
      // at the end of the gaming day
      {
        $group: {
          _id: '$machine',
          // Use top-level absolute values from the last meter document (NOT summing)
          drop: { $first: { $ifNull: ['$drop', 0] } },
          totalCancelledCredits: {
            $first: { $ifNull: ['$totalCancelledCredits', 0] },
          },
          totalHandPaidCancelledCredits: {
            $first: { $ifNull: ['$totalHandPaidCancelledCredits', 0] },
          },
          coinIn: { $first: { $ifNull: ['$coinIn', 0] } },
          coinOut: { $first: { $ifNull: ['$coinOut', 0] } },
          totalWonCredits: {
            $first: { $ifNull: ['$totalWonCredits', 0] },
          },
          gamesPlayed: { $first: { $ifNull: ['$gamesPlayed', 0] } },
          jackpot: { $first: { $ifNull: ['$jackpot', 0] } },
          lastReadAt: { $first: '$readAt' },
        },
      },
  ]).cursor({ batchSize: 1000 });

  for await (const doc of metersCursor) {
    metersAggregation.push(doc);
  }

  // Create a map for meter data lookup
  const metersMap = new Map<string, MeterAggregationResult>();
  metersAggregation.forEach((meter: Record<string, unknown>) => {
    metersMap.set(meter._id as string, {
      _id: meter._id as string,
      drop: (meter.drop as number) || 0,
      totalCancelledCredits: (meter.totalCancelledCredits as number) || 0,
      totalHandPaidCancelledCredits:
        (meter.totalHandPaidCancelledCredits as number) || 0,
      coinIn: (meter.coinIn as number) || 0,
      coinOut: (meter.coinOut as number) || 0,
      totalWonCredits: (meter.totalWonCredits as number) || 0,
      gamesPlayed: (meter.gamesPlayed as number) || 0,
      jackpot: (meter.jackpot as number) || 0,
      lastReadAt: (meter.lastReadAt as Date) || new Date(),
    });
  });

  return metersMap;
}

/**
 * Aggregate meters by hour or minute for chart visualization
 *
 * This aggregation sums movement fields (deltas) by hour or minute for chart display.
 * Unlike the main meter aggregation, this uses $sum to aggregate movement values.
 *
 * @param db - MongoDB database instance
 * @param machineIds - List of machine IDs to query
 * @param queryStartDate - Start date for the query range
 * @param queryEndDate - End date for the query range
 * @param granularity - 'hourly' to group by hour, 'minute' to group by minute
 * @returns Array of chart data points (hourly or minute-level)
 */
export async function getHourlyChartData(
  db: Db,
  machineIds: string[],
  queryStartDate: Date,
  queryEndDate: Date,
  granularity: 'hourly' | 'minute' = 'hourly'
): Promise<HourlyChartData[]> {
  // Determine time format based on granularity
  const timeFormat = granularity === 'minute' ? '%H:%M' : '%H:00';

  // Use cursor for Meters aggregation
  const hourlyAggregation: Array<Record<string, unknown>> = [];
  const hourlyCursor = Meters.aggregate([
      {
        $match: {
          machine: { $in: machineIds },
          // Use $lt (not $lte) for end date because queryEndDate is the start of the next gaming day
          // and we want to exclude it (only include up to but not including that time)
          readAt: { $gte: queryStartDate, $lt: queryEndDate },
        },
      },
      {
        $project: {
          machine: 1,
          readAt: 1,
          'movement.gamesPlayed': 1,
          'movement.coinIn': 1,
          'movement.coinOut': 1,
          // Also use top-level fields as fallback
          gamesPlayed: 1,
          coinIn: 1,
          coinOut: 1,
        },
      },
      {
        $addFields: {
          hour: {
            $dateToString: {
              format: timeFormat,
              date: '$readAt',
            },
          },
          day: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$readAt',
            },
          },
          gamesPlayedValue: {
            $ifNull: ['$movement.gamesPlayed', '$gamesPlayed', 0],
          },
          coinInValue: {
            $ifNull: ['$movement.coinIn', '$coinIn', 0],
          },
          coinOutValue: {
            $ifNull: ['$movement.coinOut', '$coinOut', 0],
          },
        },
      },
      {
        $group: {
          _id: {
            day: '$day',
            hour: '$hour',
          },
          gamesPlayed: { $sum: '$gamesPlayedValue' },
          coinIn: { $sum: '$coinInValue' },
          coinOut: { $sum: '$coinOutValue' },
        },
      },
      {
        $sort: {
          '_id.day': 1,
          '_id.hour': 1,
        },
      },
  ]).cursor({ batchSize: 1000 });

  for await (const doc of hourlyCursor) {
    hourlyAggregation.push(doc);
  }

  // Only return hours with actual data - filter out hours where all values are zero
  return hourlyAggregation
    .map((item: Record<string, unknown>) => {
      const gamesPlayed = (item.gamesPlayed as number) || 0;
      const coinIn = (item.coinIn as number) || 0;
      const coinOut = (item.coinOut as number) || 0;

      return {
        day: ((item._id as Record<string, unknown>).day as string) || '',
        hour: ((item._id as Record<string, unknown>).hour as string) || '',
        gamesPlayed,
        coinIn,
        coinOut,
      };
    })
    .filter(
      item => item.gamesPlayed > 0 || item.coinIn > 0 || item.coinOut > 0
    );
}

/**
 * Format machine ID for display
 *
 * Display logic:
 * - If custom.name and serialNumber are different, show custom.name (serialNumber)
 * - Otherwise, use serialNumber if available
 * - Otherwise, fall back to custom.name
 * - Final fallback: Machine {last 6 chars of _id}
 *
 * @param machine - Machine data object
 * @returns Formatted machine ID string
 */
export function formatMachineId(machine: MachineData): string {
  const serialNumber = machine.serialNumber?.trim() || '';
  const hasValidSerialNumber = serialNumber.length > 0;
  const customName = machine.custom?.name?.trim() || '';

  if (customName && hasValidSerialNumber && customName !== serialNumber) {
    return `${customName} (${serialNumber})`;
  }

  if (hasValidSerialNumber) {
    return serialNumber;
  }

  if (customName) {
    return customName;
  }

  // Final fallback
  return `Machine ${machine._id.slice(-6)}`;
}

/**
 * Validate and sanitize meter value
 *
 * @param value - Meter value to validate
 * @returns Validated number (0 if invalid or negative)
 */
export function validateMeterValue(value: unknown): number {
  const num = Number(value) || 0;
  return num >= 0 ? num : 0;
}

/**
 * Transform machine and meter data into report format
 *
 * @param machinesData - Array of machine data
 * @param metersMap - Map of machine ID to meter aggregation result
 * @param locationMap - Map of location ID to location name
 * @returns Array of transformed meter report data
 */
export function transformMeterData(
  machinesData: MachineData[],
  metersMap: Map<string, MeterAggregationResult>,
  locationMap: Map<string, string>
): TransformedMeterData[] {
  return machinesData.map(machine => {
    const locationName =
      locationMap.get(machine.gamingLocation) || 'Unknown Location';
    const machineId = formatMachineId(machine);
    const machineDocumentId = machine._id;

    // Get meter data for this machine
    const meterData = metersMap.get(machineDocumentId) || {
      _id: machineDocumentId,
      drop: 0,
      totalCancelledCredits: 0,
      totalHandPaidCancelledCredits: 0,
      coinIn: 0,
      coinOut: 0,
      totalWonCredits: 0,
      gamesPlayed: 0,
      jackpot: 0,
      lastReadAt: new Date(),
    };

    // Extract and validate meter values
    const metersIn = validateMeterValue(meterData.coinIn);
    const metersOut = validateMeterValue(meterData.totalWonCredits);
    const jackpot = validateMeterValue(meterData.jackpot);
    const billIn = validateMeterValue(meterData.drop);
    const totalCancelledCredits = validateMeterValue(
      meterData.totalCancelledCredits
    );
    const handPaidCredits = validateMeterValue(
      meterData.totalHandPaidCancelledCredits
    );
    const gamesPlayed = validateMeterValue(meterData.gamesPlayed);

    // Calculate voucher out (net cancelled credits)
    const voucherOut = validateMeterValue(
      totalCancelledCredits - handPaidCredits
    );

    return {
      machineId,
      metersIn,
      metersOut,
      jackpot,
      billIn,
      voucherOut,
      attPaidCredits: handPaidCredits,
      gamesPlayed,
      location: locationName,
      locationId: machine.gamingLocation,
      createdAt: meterData.lastReadAt || machine.lastActivity,
      machineDocumentId,
      game: machine.game || undefined,
      // Include raw fields for export logic
      customName: machine.custom?.name || undefined,
      serialNumber: machine.serialNumber?.trim() || undefined,
    };
  });
}

/**
 * Filter transformed data by search term
 *
 * Searches across:
 * - machineId (formatted display ID)
 * - location name
 * - serialNumber
 * - custom.name
 *
 * @param transformedData - Array of transformed meter data
 * @param machinesData - Original machine data for additional search fields
 * @param search - Search term (case-insensitive)
 * @returns Filtered array of transformed meter data
 */
export function filterMeterDataBySearch(
  transformedData: TransformedMeterData[],
  machinesData: MachineData[],
  search: string
): TransformedMeterData[] {
  if (!search) {
    return transformedData;
  }

  const searchLower = search.toLowerCase();

  return transformedData.filter(item => {
    // Get the original machine data for additional search fields
    const machineData = machinesData.find(
      m => m._id === item.machineDocumentId
    );

    const serialNumber = machineData?.serialNumber || '';
    const customName = machineData?.custom?.name?.trim() || '';

    return (
      item.machineId.toLowerCase().includes(searchLower) ||
      item.location.toLowerCase().includes(searchLower) ||
      serialNumber.toLowerCase().includes(searchLower) ||
      customName.toLowerCase().includes(searchLower)
    );
  });
}

/**
 * Paginate transformed data
 *
 * @param data - Array of data to paginate
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Paginated data and pagination metadata
 */
export function paginateMeterData(
  data: TransformedMeterData[],
  page: number,
  limit: number
): {
  paginatedData: TransformedMeterData[];
  totalCount: number;
  totalPages: number;
} {
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / limit);
  const skip = (page - 1) * limit;
  const paginatedData = data.slice(skip, skip + limit);

  return {
    paginatedData,
    totalCount,
    totalPages,
  };
}
