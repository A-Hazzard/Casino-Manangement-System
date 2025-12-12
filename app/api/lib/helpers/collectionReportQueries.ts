/**
 * Collection Report Queries Helper
 *
 * This file contains helper functions for querying collection reports,
 * including fetching locations with machines and processing date ranges.
 */

import { getLicenseeObjectId } from '@/lib/utils/licenseeMapping';
import { connectDB } from '../middleware/db';
import { GamingLocations } from '../models/gaminglocations';
import type { TimePeriod } from '../types';
import { getUserLocationFilter } from './licenseeFilter';
import { getUserFromServer } from './users';

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

    const { GamingLocations } = await import('../models/gaminglocations');
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

  const { GamingLocations } = await import('../models/gaminglocations');
  const locations = await GamingLocations.find(
      {
      _id: { $in: locationIds },
      },
    { _id: 1, name: 1 }
    )
    .lean()
    .exec();

  return locations.map(loc => String(loc.name));
}
