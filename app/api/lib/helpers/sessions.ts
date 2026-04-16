/**
 * Session Query Helpers
 * Utilities for building MongoDB queries and aggregation pipelines for machine session data.
 */
import type { PipelineStage } from 'mongoose';

export type SessionGetParams = {
  search: string;
  dateFilter: string;
  startDateParam: string | null;
  endDateParam: string | null;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
  licencee: string;
};

/**
 * Builds the MongoDB $match query from session search and date filter params.
 *
 * @param params - Parsed query parameters from the request URL.
 * @returns A MongoDB query object for use in a $match stage.
 */
export function buildSessionMatchQuery(
  params: Pick<SessionGetParams, 'search' | 'dateFilter' | 'startDateParam' | 'endDateParam'>
): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (params.search) {
    query.$or = [
      { _id: { $regex: params.search, $options: 'i' } },
      { machineId: { $regex: params.search, $options: 'i' } },
      { memberId: { $regex: params.search, $options: 'i' } },
    ];
  }

  if (params.startDateParam && params.endDateParam) {
    query.startTime = {
      $gte: new Date(params.startDateParam),
      $lte: new Date(params.endDateParam),
    };
  } else if (params.dateFilter !== 'all') {
    const now = new Date();
    let startDate: Date;
    let endDate: Date | undefined;

    switch (params.dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      default:
        startDate = new Date(0);
    }

    query.startTime = endDate
      ? { $gte: startDate, $lte: endDate }
      : { $gte: startDate };
  }

  return query;
}

/**
 * Builds the base aggregation pipeline stages for session queries.
 * Includes machine, location, and licencee lookups with an optional licencee name filter.
 *
 * @param query - The initial $match query.
 * @param licencee - Optional licencee name to filter by.
 * @returns Array of aggregation pipeline stages.
 */
export function buildSessionBasePipeline(
  query: Record<string, unknown>,
  licencee: string
): PipelineStage[] {
  return [
    { $match: query },
    { $lookup: { from: 'machines', localField: 'machineId', foreignField: '_id', as: 'machine' } },
    { $unwind: { path: '$machine', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'gaminglocations', localField: 'machine.gamingLocation', foreignField: '_id', as: 'location' } },
    { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'licencees', localField: 'location.rel.licencee', foreignField: '_id', as: 'licencee' } },
    { $unwind: { path: '$licencee', preserveNullAndEmptyArrays: true } },
    ...(licencee && licencee !== 'All Licencees'
      ? [{ $match: { 'licencee.name': licencee } } as PipelineStage]
      : []),
  ];
}

/**
 * Builds the full aggregation pipeline for fetching paginated session results.
 * Adds member lookup, computed fields, sorting, pagination, and projection.
 *
 * @param basePipeline - The base pipeline stages from buildSessionBasePipeline.
 * @param params - Full query params including sort and pagination.
 * @returns Complete aggregation pipeline stages.
 */
export function buildSessionFullPipeline(
  basePipeline: PipelineStage[],
  params: Pick<SessionGetParams, 'sortBy' | 'sortOrder' | 'page' | 'limit' | 'search'>
): PipelineStage[] {
  const { sortBy, sortOrder, page, limit, search } = params;

  return [
    ...basePipeline,
    { $lookup: { from: 'members', localField: 'memberId', foreignField: '_id', as: 'member' } },
    { $unwind: { path: '$member', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        machineName: { $ifNull: ['$machine.custom.name', '$machine.serialNumber', 'Unknown'] },
        memberName: {
          $cond: {
            if: { $ne: ['$member', null] },
            then: {
              $concat: [
                { $ifNull: ['$member.profile.firstName', ''] },
                ' ',
                { $ifNull: ['$member.profile.lastName', ''] },
              ],
            },
            else: null,
          },
        },
        relevanceScore: search ? 1 : 0,
      },
    },
    { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        sessionId: '$_id',
        machineId: 1,
        machineName: 1,
        machineSerialNumber: '$machine.serialNumber',
        locationName: { $ifNull: ['$location.name', 'Unknown Location'] },
        memberId: 1,
        memberName: 1,
        startTime: 1,
        endTime: 1,
        gamesPlayed: 1,
        points: 1,
        status: { $cond: { if: { $eq: ['$endTime', null] }, then: 'active', else: 'completed' } },
        duration: {
          $cond: {
            if: { $and: [{ $ne: ['$startTime', null] }, { $ne: ['$endTime', null] }] },
            then: { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60000] },
            else: null,
          },
        },
      },
    },
  ];
}
