/**
 * Collection Report Queries Helper Functions
 *
 * Provides backend helper functions for querying collection reports and related
 * data, including fetching locations with machines, processing date ranges, and
 * applying role-based location filtering. It handles licensee filtering and
 * user permission checks for secure data access.
 *
 * Features:
 * - Fetches locations with machines for collection reports.
 * - Applies role-based location filtering (admin, manager, collector, technician).
 * - Processes date ranges for time period filtering.
 * - Handles licensee filtering with support for both spellings.
 * - Filters machines by deletion status and SMIB configuration.
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import type { TimePeriod } from '@/app/api/lib/types';
import { getLicenseeObjectId } from '@/lib/utils/licensee';
import { PipelineStage } from 'mongoose';

/**
 * Fetches locations with machines for collection reports
 *
 * @param rawLicenseeParam - Raw licensee parameter (supports both spellings)
 * @returns Promise<{ locations: unknown[] }>
 */
export async function fetchLocationsWithMachines(
  rawLicenseeParam?: string | null
): Promise<{ locations: unknown[] }> {
  const normalizedLicensee =
    rawLicenseeParam && rawLicenseeParam !== 'all'
      ? getLicenseeObjectId(rawLicenseeParam) || rawLicenseeParam
      : rawLicenseeParam;

  // Get current user and their permissions
  const user = await getUserFromServer();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const userRoles = (user.roles as string[]) || [];
  // Use only new field
  let userAccessibleLicensees: string[] = [];
  if (
    Array.isArray((user as { assignedLicensees?: string[] })?.assignedLicensees)
  ) {
    userAccessibleLicensees = (user as { assignedLicensees: string[] })
      .assignedLicensees;
  }
  // Use only new field
  let userLocationPermissions: string[] = [];
  if (
    Array.isArray((user as { assignedLocations?: string[] })?.assignedLocations)
  ) {
    userLocationPermissions = (user as { assignedLocations: string[] })
      .assignedLocations;
  }
  const isAdmin =
    userRoles.includes('admin') || userRoles.includes('developer');

  // Get user's accessible locations based on role and permissions
  const allowedLocationIds = await getUserLocationFilter(
    isAdmin ? 'all' : userAccessibleLicensees,
    normalizedLicensee || undefined,
    userLocationPermissions,
    userRoles
  );

  // If user has no access, return empty array
  if (allowedLocationIds !== 'all' && allowedLocationIds.length === 0) {
    return { locations: [] };
  }

  const matchCriteria: Record<string, unknown> = {
    $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
  };

  // Apply location filter based on user permissions
  if (allowedLocationIds !== 'all') {
    matchCriteria['_id'] = { $in: allowedLocationIds };
  }

  const locationsWithMachines = await GamingLocations.aggregate([
    {
      $match: matchCriteria,
    },
    {
      $project: {
        _id: 1,
        name: 1,
        previousCollectionTime: 1,
        profitShare: 1,
      },
    },
    {
      $lookup: {
        from: 'machines',
        localField: '_id',
        foreignField: 'gamingLocation',
        as: 'machines',
        pipeline: [
          {
            $match: {
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('1970-01-01') } },
              ],
            },
          },
          {
            $project: {
              _id: 1,
              serialNumber: 1,
              'custom.name': 1,
              smibBoard: 1,
              smbId: 1,
              game: 1,
              collectionMeters: 1,
              collectionTime: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        previousCollectionTime: 1,
        profitShare: 1,
        machines: {
          $map: {
            input: '$machines',
            as: 'machine',
            in: {
              _id: '$$machine._id',
              serialNumber: '$$machine.serialNumber',
              name: {
                $ifNull: [
                  '$$machine.custom.name',
                  {
                    $ifNull: ['$$machine.serialNumber', 'Unnamed Machine'],
                  },
                ],
              },
              game: '$$machine.game',
              smibBoard: '$$machine.smibBoard',
              smbId: '$$machine.smbId',
              collectionMeters: {
                $ifNull: [
                  '$$machine.collectionMeters',
                  { metersIn: 0, metersOut: 0 },
                ],
              },
              collectionTime: '$$machine.collectionTime',
            },
          },
        },
      },
    },
  ]);

  return { locations: locationsWithMachines };
}

/**
 * Calculates date range for a time period in Trinidad time
 *
 * @param timePeriod - The time period (Today, Yesterday, 7d, 30d, All Time, Custom)
 * @param startDateStr - Custom start date string (for Custom period)
 * @param endDateStr - Custom end date string (for Custom period)
 * @returns Promise<{ startDate?: Date; endDate?: Date }>
 */
export function calculateDateRangeForTimePeriod(
  timePeriod?: TimePeriod,
  startDateStr?: string | null,
  endDateStr?: string | null
): { startDate?: Date; endDate?: Date } {
  if (startDateStr && endDateStr && !timePeriod) {
    // Custom date range without timePeriod
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    return { startDate, endDate };
  }

  if (!timePeriod || timePeriod === 'Custom') {
    if (startDateStr && endDateStr) {
      // For custom date range, trust the provided ISO strings which now contain precise times
      // from the frontend (00:00:00 to 23:59:59 local time converted to UTC)
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      return { startDate, endDate };
    }
    return {};
  }

  const now = new Date();
  const trinidadNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  switch (timePeriod) {
    case 'Today': {
      const todayStart = new Date(trinidadNow);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(trinidadNow);
      todayEnd.setHours(23, 59, 59, 999);
      return {
        startDate: new Date(todayStart.getTime() + 4 * 60 * 60 * 1000),
        endDate: new Date(todayEnd.getTime() + 4 * 60 * 60 * 1000),
      };
    }

    case 'Yesterday': {
      const yesterdayStart = new Date(trinidadNow);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(trinidadNow);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return {
        startDate: new Date(yesterdayStart.getTime() + 4 * 60 * 60 * 1000),
        endDate: new Date(yesterdayEnd.getTime() + 4 * 60 * 60 * 1000),
      };
    }

    case '7d': {
      const sevenDaysStart = new Date(trinidadNow);
      sevenDaysStart.setDate(sevenDaysStart.getDate() - 6);
      sevenDaysStart.setHours(0, 0, 0, 0);
      const sevenDaysEnd = new Date(trinidadNow);
      sevenDaysEnd.setHours(23, 59, 59, 999);
      return {
        startDate: new Date(sevenDaysStart.getTime() + 4 * 60 * 60 * 1000),
        endDate: new Date(sevenDaysEnd.getTime() + 4 * 60 * 60 * 1000),
      };
    }

    case '30d': {
      const thirtyDaysStart = new Date(trinidadNow);
      thirtyDaysStart.setDate(thirtyDaysStart.getDate() - 29);
      thirtyDaysStart.setHours(0, 0, 0, 0);
      const thirtyDaysEnd = new Date(trinidadNow);
      thirtyDaysEnd.setHours(23, 59, 59, 999);
      return {
        startDate: new Date(thirtyDaysStart.getTime() + 4 * 60 * 60 * 1000),
        endDate: new Date(thirtyDaysEnd.getTime() + 4 * 60 * 60 * 1000),
      };
    }

    case 'All Time':
      return {};

    default: {
      const defaultStart = new Date(trinidadNow);
      defaultStart.setHours(0, 0, 0, 0);
      const defaultEnd = new Date(trinidadNow);
      defaultEnd.setHours(23, 59, 59, 999);
      return {
        startDate: new Date(defaultStart.getTime() + 4 * 60 * 60 * 1000),
        endDate: new Date(defaultEnd.getTime() + 4 * 60 * 60 * 1000),
      };
    }
  }
}

/**
 * Determines allowed location IDs based on user role and permissions
 *
 * @param userRoles - User roles array
 * @param userLicensees - User accessible licensees
 * @param userLocationPermissions - User location permissions
 * @returns Promise<string[] | 'all'>
 */
export async function determineAllowedLocationIds(
  userRoles: string[],
  userLicensees: string[],
  userLocationPermissions: string[]
): Promise<string[] | 'all'> {
  const isAdmin =
    userRoles.includes('admin') || userRoles.includes('developer');
  const isManager = userRoles.includes('manager');

  if (isAdmin) {
    return 'all';
  }

  if (isManager) {
    if (userLicensees.length === 0) {
      return [];
    }

    const db = await connectDB();
    if (!db) {
      throw new Error('Database connection failed');
    }

    const { GamingLocations } = await import('@/app/api/lib/models/gaminglocations');
    const managerLocations = await GamingLocations.find(
        {
          'rel.licencee': { $in: userLicensees },
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        },
      { _id: 1 }
      )
      .lean()
      .exec();

    return managerLocations.map(loc => String(loc._id));
  }

  // Collector/Technician - use ONLY their assigned location permissions
  return userLocationPermissions.length === 0 ? [] : userLocationPermissions;
}

/**
 * Gets location names from location IDs
 *
 * @param locationIds - Array of location IDs
 * @returns Promise<string[]>
 */
export async function getLocationNamesFromIds(
  locationIds: string[]
): Promise<string[]> {
  if (locationIds.length === 0) {
    return [];
  }

  const db = await connectDB();
  if (!db) {
    throw new Error('Database connection failed');
  }

  const { GamingLocations } = await import('@/app/api/lib/models/gaminglocations');
  const locations = await GamingLocations.find(
      {
      _id: { $in: locationIds },
      },
    { _id: 1, name: 1 }
    )
    .lean()
    .exec();

  return locations.map((loc) => String(loc.name));
}

/**
 * Aggregates the sum of totalDrop, totalCancelled, totalGross, and totalSasGross for all documents in the date range (and optional locationName filter).
 * @param startDate - Start date for filtering.
 * @param endDate - End date for filtering.
 * @param locationName - Optional location name to filter.
 * @param licencee - Optional licencee to filter.
 * @returns Promise<{ drop: string; cancelledCredits: string; gross: string; sasGross: string; }> Aggregated sums for the summary table.
 */
export async function getMonthlyCollectionReportSummary(
  startDate: Date,
  endDate: Date,
  locationFilter?: string | string[],
  licencee?: string
): Promise<{
  drop: string;
  cancelledCredits: string;
  gross: string;
  sasGross: string;
}> {
  const match: Record<string, unknown> = {
    timestamp: { $gte: startDate, $lte: endDate },
  };
  if (locationFilter) {
    if (Array.isArray(locationFilter)) {
      match.$or = [
        { location: { $in: locationFilter } },
        { locationName: { $in: locationFilter } }
      ];
    } else {
      match.$or = [
        { location: locationFilter },
        { locationName: { 
          $regex: new RegExp(
            `^${locationFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i'
          )
        } }
      ];
    }
  }

  let pipeline: PipelineStage[] = [];

  if (licencee) {
    // If licencee is specified, we need to join with gaminglocations to filter by licencee
    pipeline = [
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      { $unwind: '$locationDetails' },
      { $match: { 'locationDetails.rel.licencee': licencee, ...match } },
      {
        $group: {
          _id: null,
          drop: { $sum: '$totalDrop' },
          cancelledCredits: { $sum: '$totalCancelled' },
          gross: { $sum: '$totalGross' },
          sasGross: { $sum: '$totalSasGross' },
        },
      },
    ];
  } else {
    // No licencee filter, use simple aggregation
    pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          drop: { $sum: '$totalDrop' },
          cancelledCredits: { $sum: '$totalCancelled' },
          gross: { $sum: '$totalGross' },
          sasGross: { $sum: '$totalSasGross' },
        },
      },
    ];
  }

  const result = await CollectionReport.aggregate(pipeline);
  const agg = result[0] || {};
  const formatSmartDecimal = (value: number | undefined): string => {
    if (value === undefined) return '-';
    const hasDecimals = value % 1 !== 0;
    const decimalPart = value % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;
    return value.toFixed(hasSignificantDecimals ? 2 : 0);
  };

  return {
    drop: formatSmartDecimal(agg.drop),
    cancelledCredits: formatSmartDecimal(agg.cancelledCredits),
    gross: formatSmartDecimal(agg.gross),
    sasGross: formatSmartDecimal(agg.sasGross),
  };
}

/**
 * Aggregates by locationName, summing totalDrop, totalCancelled, totalGross, and totalSasGross for each locationName in the date range (and optional locationName filter).
 * @param startDate - Start date for filtering.
 * @param endDate - End date for filtering.
 * @param locationName - Optional location name to filter.
 * @param licencee - Optional licencee to filter.
 * @returns Promise<Array<{ location: string; drop: string; win: string; gross: string; sasGross: string }>> Aggregated data per location for the details table.
 */
export async function getMonthlyCollectionReportByLocation(
  startDate: Date,
  endDate: Date,
  locationFilter?: string | string[],
  licencee?: string
): Promise<
  Array<{
    location: string;
    drop: string;
    win: string;
    gross: string;
    sasGross: string;
  }>
> {
  const match: Record<string, unknown> = {
    timestamp: { $gte: startDate, $lte: endDate },
  };
  if (locationFilter) {
    if (Array.isArray(locationFilter)) {
      match.$or = [
        { location: { $in: locationFilter } },
        { locationName: { $in: locationFilter } }
      ];
    } else {
      match.$or = [
        { location: locationFilter },
        { locationName: { 
          $regex: new RegExp(
            `^${locationFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i'
          )
        } }
      ];
    }
  }

  let pipeline: PipelineStage[] = [];

  if (licencee) {
    // If licencee is specified, we need to join with gaminglocations to filter by licencee
    pipeline = [
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      { $unwind: '$locationDetails' },
      { $match: { 'locationDetails.rel.licencee': licencee, ...match } },
      {
        $group: {
          _id: '$locationName',
          drop: { $sum: '$totalDrop' },
          win: { $sum: '$totalCancelled' },
          gross: { $sum: '$totalGross' },
          sasGross: { $sum: '$totalSasGross' },
        },
      },
      { $sort: { _id: 1 } },
    ];
  } else {
    // No licencee filter, use simple aggregation
    pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$locationName',
          drop: { $sum: '$totalDrop' },
          win: { $sum: '$totalCancelled' },
          gross: { $sum: '$totalGross' },
          sasGross: { $sum: '$totalSasGross' },
        },
      },
      { $sort: { _id: 1 } },
    ];
  }

  const result = await CollectionReport.aggregate(pipeline);
  const finalResult = [...result];

  // If we have a specific location filter, ensure all filtered locations appear in the results
  if (locationFilter && locationFilter !== 'all') {
    const filterArray = Array.isArray(locationFilter) ? locationFilter : [locationFilter];
    
    // Fetch the names of the locations in the filter to ensure we show them accurately
    const filteredLocations = await GamingLocations.find({
      $or: [
        { _id: { $in: filterArray } },
        { name: { $in: filterArray } }
      ]
    }, { name: 1 }).lean();

    const existingNames = new Set(result.map(r => r._id));
    
    for (const loc of filteredLocations) {
      if (!existingNames.has(loc.name)) {
        finalResult.push({
          _id: loc.name,
          drop: undefined,
          win: undefined,
          gross: undefined,
          sasGross: undefined
        });
      }
    }
    
    // Re-sort if we added new items
    finalResult.sort((a, b) => (a._id || '').localeCompare(b._id || ''));
  }

  const formatSmartDecimal = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    const hasDecimals = value % 1 !== 0;
    const decimalPart = value % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.01;
    return value.toFixed(hasSignificantDecimals ? 2 : 0);
  };

  return finalResult.map(row => ({
    location: row._id || '-',
    drop: formatSmartDecimal(row.drop),
    win: formatSmartDecimal(row.win),
    gross: formatSmartDecimal(row.gross),
    sasGross: formatSmartDecimal(row.sasGross),
  }));
}

