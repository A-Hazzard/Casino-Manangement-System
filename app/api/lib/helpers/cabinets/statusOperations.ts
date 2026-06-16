/**
 * Cabinet Status Operations
 *
 * Extracted business logic for the cabinets/status route.
 * Handles pipeline building, status condition generation, and count queries.
 *
 * @module app/api/lib/helpers/cabinets/statusOperations
 */

import { Machine } from '@/app/api/lib/models/machines';
import type { PipelineStage } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export type StatusCounts = {
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
  criticalOffline: number;
  recentOffline: number;
};

// ============================================================================
// Base Pipeline Builder
// ============================================================================

/**
 * Creates the base aggregation pipeline with machine-location lookup.
 * Filters out soft-deleted machines and locations.
 *
 * @returns {PipelineStage[]} Base pipeline stages
 */
export function createBasePipeline(): PipelineStage[] {
  return [
    {
      $match: {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      },
    },
    {
      $lookup: {
        from: 'gaminglocations',
        let: { locId: '$gamingLocation' },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  { $toString: '$_id' },
                  { $ifNull: [{ $toString: '$$locId' }, ''] },
                ],
              },
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2025-01-01') } },
              ],
            },
          },
        ],
        as: 'locationDetails',
      },
    },
    {
      $unwind: { path: '$locationDetails', preserveNullAndEmptyArrays: true },
    },
    { $match: { locationDetails: { $ne: null } } },
  ];
}

// ============================================================================
// Filter Helpers
// ============================================================================

/**
 * Adds a text search filter to the aggregation pipeline.
 * Matches against location name, serial number, relayId, and custom name.
 *
 * @param {PipelineStage[]} pipeline - The aggregation pipeline to mutate
 * @param {string | null} search - Search query string
 */
export function addSearchFilter(
  pipeline: PipelineStage[],
  search: string | null
): void {
  if (!search) return;

  const isObjectIdFormat = /^[0-9a-fA-F]{24}$/.test(search);
  const searchRegex = { $regex: search, $options: 'i' };
  const searchConditions: Record<string, unknown>[] = [
    { 'locationDetails.name': searchRegex },
    { serialNumber: searchRegex },
    { relayId: searchRegex },
    { smibBoard: searchRegex },
    { 'custom.name': searchRegex },
    { 'Custom.name': searchRegex },
  ];

  if (isObjectIdFormat) {
    searchConditions.push({ 'locationDetails._id': search });
    try {
      const { ObjectId } = require('mongodb');
      searchConditions.push({ _id: new ObjectId(search) });
    } catch {
      // ignore ObjectId conversion errors
    }
  } else {
    searchConditions.push({ 'locationDetails._id': searchRegex });
  }

  pipeline.push({ $match: { $or: searchConditions } });
}

/**
 * Adds a licencee filter to the aggregation pipeline.
 *
 * @param {PipelineStage[]} pipeline - The aggregation pipeline to mutate
 * @param {string | undefined} effectiveLicencee - Licencee ID to filter by
 */
export function addLicenceeFilter(
  pipeline: PipelineStage[],
  effectiveLicencee: string | undefined
): void {
  if (!effectiveLicencee) return;

  pipeline.push({
    $match: {
      $or: [
        { 'locationDetails.rel.licencee': effectiveLicencee },
        { 'locationDetails.rel.licencee': effectiveLicencee },
      ],
    },
  });
}

/**
 * Adds location access control filter to the pipeline.
 * Returns false if the user has no access to the requested location.
 *
 * @param {PipelineStage[]} pipeline - The aggregation pipeline to mutate
 * @param {string | null} locationId - Specific location ID(s) to filter by
 * @param {string[] | 'all'} allowedLocationIds - User's accessible location IDs
 * @returns {boolean} True if the filter was applied successfully
 */
export function addLocationAccessFilter(
  pipeline: PipelineStage[],
  locationId: string | null,
  allowedLocationIds: string[] | 'all'
): boolean {
  if (locationId) {
    const locationIds = locationId.split(',').filter(id => id.trim() !== '');
    if (locationIds.length > 0) {
      if (allowedLocationIds !== 'all') {
        if (!Array.isArray(allowedLocationIds)) return false;
        const hasAccess = locationIds.every(id =>
          allowedLocationIds.includes(id)
        );
        if (!hasAccess) return false;
      }
      pipeline.push({
        $match: {
          gamingLocation:
            locationIds.length === 1 ? locationIds[0] : { $in: locationIds },
        },
      });
    }
    return true;
  }

  if (allowedLocationIds !== 'all') {
    if (
      !Array.isArray(allowedLocationIds) ||
      allowedLocationIds.length === 0
    ) {
      return false;
    }
    pipeline.push({
      $match: { gamingLocation: { $in: allowedLocationIds } },
    });
  }
  return true;
}

// ============================================================================
// Machine Type Filter Conditions (shared between machine pipeline and location count)
// ============================================================================

function buildMissingCoordinatesCondition(
  prefix: string
): Record<string, unknown> {
  return {
    $and: [
      {
        $or: [
          { [`${prefix}googleMapsIframe`]: { $exists: false } },
          { [`${prefix}googleMapsIframe`]: null },
          { [`${prefix}googleMapsIframe`]: '' },
        ],
      },
      {
        $or: [
          { [`${prefix}googleMapsLink`]: { $exists: false } },
          { [`${prefix}googleMapsLink`]: null },
          { [`${prefix}googleMapsLink`]: '' },
        ],
      },
      {
        $and: [
          {
            $or: [
              { [`${prefix}geoCoords.latitude`]: { $exists: false } },
              { [`${prefix}geoCoords.latitude`]: null },
              { [`${prefix}geoCoords.latitude`]: { $in: [0, '0', '0.0', ''] } },
              { [`${prefix}geoCoords.latitude`]: { $type: 'string' } },
            ],
          },
          {
            $or: [
              { [`${prefix}geoCoords.longitude`]: { $exists: false } },
              { [`${prefix}geoCoords.longitude`]: null },
              {
                [`${prefix}geoCoords.longitude`]: { $in: [0, '0', '0.0', ''] },
              },
              { [`${prefix}geoCoords.longitude`]: { $type: 'string' } },
            ],
          },
          {
            $or: [
              { [`${prefix}geoCoords.longtitude`]: { $exists: false } },
              { [`${prefix}geoCoords.longtitude`]: null },
              {
                [`${prefix}geoCoords.longtitude`]: { $in: [0, '0', '0.0', ''] },
              },
              { [`${prefix}geoCoords.longtitude`]: { $type: 'string' } },
            ],
          },
        ],
      },
    ],
  };
}

function buildHasCoordinatesCondition(
  prefix: string
): Record<string, unknown> {
  return {
    $or: [
      {
        [`${prefix}googleMapsIframe`]: {
          $exists: true,
          $nin: [null, ''],
        },
      },
      {
        [`${prefix}googleMapsLink`]: {
          $exists: true,
          $nin: [null, ''],
        },
      },
      {
        [`${prefix}geoCoords.latitude`]: {
          $exists: true,
          $nin: [null, 0, '0', '0.0', ''],
          $not: { $type: 'string' },
        },
      },
      {
        [`${prefix}geoCoords.longitude`]: {
          $exists: true,
          $nin: [null, 0, '0', '0.0', ''],
          $not: { $type: 'string' },
        },
      },
      {
        [`${prefix}geoCoords.longtitude`]: {
          $exists: true,
          $nin: [null, 0, '0', '0.0', ''],
          $not: { $type: 'string' },
        },
      },
    ],
  };
}

/**
 * Builds MongoDB conditions for machine type filtering.
 *
 * @param {string | null} machineTypeFilter - Comma-separated machine type filters
 * @param {string} prefix - Field prefix for conditions (e.g. 'locationDetails.')
 * @returns {Record<string, unknown>[]} Array of match conditions
 */
export function buildMachineTypeConditions(
  machineTypeFilter: string | null,
  prefix: string
): Record<string, unknown>[] {
  if (!machineTypeFilter) return [];

  const filters = machineTypeFilter.split(',').filter(f => f.trim() !== '');
  const conditions: Record<string, unknown>[] = [];

  for (const filter of filters) {
    switch (filter.trim()) {
      case 'LocalServersOnly':
        conditions.push({ [`${prefix}isLocalServer`]: true });
        break;
      case 'SMIBLocationsOnly':
        conditions.push({ [`${prefix}noSMIBLocation`]: { $ne: true } });
        break;
      case 'NoSMIBLocation':
        conditions.push({ [`${prefix}noSMIBLocation`]: true });
        break;
      case 'MembershipOnly':
        conditions.push({
          $or: [
            { [`${prefix}membershipEnabled`]: true },
            { [`${prefix}enableMembership`]: true },
          ],
        });
        break;
      case 'MissingCoordinates':
        conditions.push(buildMissingCoordinatesCondition(prefix));
        break;
      case 'HasCoordinates':
        conditions.push(buildHasCoordinatesCondition(prefix));
        break;
    }
  }

  return conditions;
}

/**
 * Adds machine type filter (SMIB, Membership, Local Server) to the pipeline.
 *
 * @param {PipelineStage[]} pipeline - The aggregation pipeline to mutate
 * @param {string | null} machineTypeFilter - Comma-separated machine type filters
 */
export function addMachineTypeFilter(
  pipeline: PipelineStage[],
  machineTypeFilter: string | null
): void {
  if (!machineTypeFilter) return;
  const conditions = buildMachineTypeConditions(
    machineTypeFilter,
    'locationDetails.'
  );
  if (conditions.length > 0) {
    pipeline.push({ $match: { $or: conditions } });
  }
}

// ============================================================================
// Online Status Filter
// ============================================================================

/**
 * Adds online/offline status filter to the pipeline.
 *
 * @param {PipelineStage[]} pipeline - The aggregation pipeline to mutate
 * @param {string | null} onlineStatus - 'online', 'offline', 'never-online', or null
 * @param {Date} threshold - Date threshold for online detection
 */
export function addOnlineStatusFilter(
  pipeline: PipelineStage[],
  onlineStatus: string | null,
  threshold: Date
): void {
  if (!onlineStatus || onlineStatus === 'all') return;

  if (onlineStatus === 'online') {
    pipeline.push({
      $match: {
        $or: [
          { 'locationDetails.aceEnabled': true },
          {
            $and: [
              { lastActivity: { $exists: true, $ne: null } },
              {
                $expr: {
                  $gte: [
                    {
                      $convert: {
                        input: '$lastActivity',
                        to: 'date',
                        onError: new Date(0),
                      },
                    },
                    threshold,
                  ],
                },
              },
            ],
          },
        ],
      },
    });
  } else if (onlineStatus === 'offline') {
    pipeline.push({
      $match: {
        'locationDetails.aceEnabled': { $ne: true },
        $or: [
          { lastActivity: { $exists: false } },
          { lastActivity: null },
          {
            $expr: {
              $lt: [
                {
                  $convert: {
                    input: '$lastActivity',
                    to: 'date',
                    onError: new Date(0),
                  },
                },
                threshold,
              ],
            },
          },
        ],
      },
    });
  } else if (
    onlineStatus === 'never-online' ||
    onlineStatus === 'neveronline'
  ) {
    pipeline.push({
      $match: {
        'locationDetails.aceEnabled': { $ne: true },
        $or: [
          { lastActivity: { $exists: false } },
          { lastActivity: null },
        ],
      },
    });
  }
}

// ============================================================================
// Game Type Filter
// ============================================================================

/**
 * Adds game type filter to the pipeline.
 *
 * @param {PipelineStage[]} pipeline - The aggregation pipeline to mutate
 * @param {string | null} gameType - Comma-separated game types to filter by
 */
export function addGameTypeFilter(
  pipeline: PipelineStage[],
  gameType: string | null
): void {
  if (!gameType) return;

  const types = gameType
    .split(',')
    .filter(t => t.trim() !== '' && t !== 'all');
  if (types.length === 0) return;

  pipeline.push({
    $match: {
      $or: [{ game: { $in: types } }, { installedGame: { $in: types } }],
    },
  });
}

// ============================================================================
// Status Counts
// ============================================================================

/**
 * Runs the aggregation and returns machine status counts.
 *
 * @param {PipelineStage[]} pipeline - Base aggregation pipeline
 * @param {Date} threshold - Online/offline threshold timestamp
 * @param {Date} fourHoursAgo - Timestamp for 4-hour offline window
 * @param {Date} twentyFourHoursAgo - Timestamp for 24-hour offline window
 * @returns {Promise<StatusCounts>} Object with total, online, offline, and critical counts
 */
export type CombinedStatusCounts = {
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
  criticalOffline: number;
  recentOffline: number;
  onlineLocations: number;
};

/**
 * Runs a unified single-pass aggregation to fetch all machine status counts and online locations.
 * This is highly optimized using $facet to avoid redundant table scans and lookups.
 *
 * @param {PipelineStage[]} pipeline - Base aggregation pipeline
 * @param {Date} threshold - Online/offline threshold timestamp
 * @param {Date} fourHoursAgo - Timestamp for 4-hour offline window
 * @param {Date} twentyFourHoursAgo - Timestamp for 24-hour offline window
 * @returns {Promise<CombinedStatusCounts>} Combined status counts
 */
export async function runStatusAndLocationCounts(
  pipeline: PipelineStage[],
  threshold: Date,
  fourHoursAgo: Date,
  twentyFourHoursAgo: Date
): Promise<CombinedStatusCounts> {
  const facetResult = await Machine.aggregate([
    ...pipeline,
    {
      $facet: {
        total: [{ $count: 'count' }],
        online: [
          {
            $match: {
              $or: [
                { 'locationDetails.aceEnabled': true },
                {
                  $and: [
                    { lastActivity: { $exists: true, $ne: null } },
                    {
                      $expr: {
                        $gte: [
                          {
                            $convert: {
                              input: '$lastActivity',
                              to: 'date',
                              onError: new Date(0),
                            },
                          },
                          threshold,
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          },
          { $count: 'count' },
        ],
        criticalOffline: [
          {
            $match: {
              'locationDetails.aceEnabled': { $ne: true },
              $or: [
                { lastActivity: { $exists: false } },
                { lastActivity: null },
                {
                  $expr: {
                    $lt: [
                      {
                        $convert: {
                          input: '$lastActivity',
                          to: 'date',
                          onError: new Date(0),
                        },
                      },
                      twentyFourHoursAgo,
                    ],
                  },
                },
              ],
            },
          },
          { $count: 'count' },
        ],
        recentOffline: [
          {
            $match: {
              'locationDetails.aceEnabled': { $ne: true },
              $and: [
                { lastActivity: { $exists: true, $ne: null } },
                {
                  $expr: {
                    $and: [
                      {
                        $gte: [
                          {
                            $convert: {
                              input: '$lastActivity',
                              to: 'date',
                              onError: new Date(0),
                            },
                          },
                          fourHoursAgo,
                        ],
                      },
                      {
                        $lt: [
                          {
                            $convert: {
                              input: '$lastActivity',
                              to: 'date',
                              onError: new Date(0),
                            },
                          },
                          threshold,
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
          { $count: 'count' },
        ],
        locationStatus: [
          {
            $group: {
              _id: '$gamingLocation',
              isOnline: {
                $max: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$locationDetails.aceEnabled', true] },
                        {
                          $and: [
                            { $gt: ['$lastActivity', null] },
                            {
                              $gte: [
                                {
                                  $convert: {
                                    input: '$lastActivity',
                                    to: 'date',
                                    onError: new Date(0),
                                  },
                                },
                                threshold,
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          {
            $group: {
              _id: null,
              totalLocations: { $sum: 1 },
              onlineLocations: { $sum: '$isOnline' },
            },
          },
        ],
      },
    },
  ]).exec();

  const data = facetResult[0];
  const totalMachines = data?.total?.[0]?.count || 0;
  const onlineMachines = data?.online?.[0]?.count || 0;
  const criticalOffline = data?.criticalOffline?.[0]?.count || 0;
  const recentOffline = data?.recentOffline?.[0]?.count || 0;
  const onlineLocations = data?.locationStatus?.[0]?.onlineLocations || 0;

  return {
    totalMachines,
    onlineMachines,
    offlineMachines: totalMachines - onlineMachines,
    criticalOffline,
    recentOffline,
    onlineLocations,
  };
}

// ============================================================================
// Location Count Filter Builder
// ============================================================================

/**
 * Builds a location count filter array from the same params used by the main pipeline.
 * Matches the filter logic of the primary pipeline for consistent counts.
 *
 * @param {string | null} search - Search query string
 * @param {string | undefined} effectiveLicencee - Licencee ID filter
 * @param {string | null} locationId - Specific location ID filter
 * @param {string[] | 'all'} allowedLocationIds - User's accessible location IDs
 * @param {string | null} machineTypeFilter - Machine type filter
 * @returns {Record<string, unknown>[]} Array of match conditions
 */
export function buildLocationCountFilter(
  search: string | null,
  effectiveLicencee: string | undefined,
  locationId: string | null,
  allowedLocationIds: string[] | 'all',
  machineTypeFilter: string | null
): Record<string, unknown>[] {
  const filter: Record<string, unknown>[] = [
    {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    },
  ];

  if (search) {
    filter.push({ name: { $regex: search, $options: 'i' } });
  }

  if (effectiveLicencee) {
    filter.push({ 'rel.licencee': effectiveLicencee });
  }

  if (locationId) {
    const specificIds = locationId.split(',').filter(id => id.trim() !== '');
    if (specificIds.length > 0) {
      filter.push({ _id: { $in: specificIds } });
    }
  } else if (
    allowedLocationIds !== 'all' &&
    Array.isArray(allowedLocationIds)
  ) {
    filter.push({ _id: { $in: allowedLocationIds } });
  }

  if (machineTypeFilter) {
    const typeConditions = buildMachineTypeConditions(machineTypeFilter, '');
    filter.push(...typeConditions);
  }

  return filter;
}
