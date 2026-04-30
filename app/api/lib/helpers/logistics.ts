/**
 * Logistics Helper Functions
 *
 * This module contains helper functions for logistics analytics.
 * It handles fetching and transforming movement request data.
 *
 * @module app/api/lib/helpers/logistics
 */

import type { MovementRequestStatus } from '@/shared/types/movement';
import type { LogisticsEntry } from '@/shared/types/reports';
import { MovementRequest } from '../models/movementrequests';
import type { MovementRequestDocument } from '@shared/types';

/**
 * Maps MovementRequestStatus to LogisticsEntry status
 *
 * @param status - Movement request status
 * @returns Logistics entry status
 */
function mapMovementStatusToLogisticsStatus(
  status: MovementRequestStatus
): 'pending' | 'completed' | 'in-progress' | 'cancelled' {
  if (!status) {
    console.error('[mapMovementStatusToLogisticsStatus] status is required');
    return 'pending';
  }
  switch (status) {
    case 'pending':
      return 'pending';
    case 'completed':
      return 'completed';
    default:
      return 'pending';
  }
}

/**
 * Builds query filters for logistics data
 *
 * @param searchTerm - Optional search term
 * @param statusFilter - Optional status filter
 * @returns Query filters object
 */
function buildLogisticsFilters(
  searchTerm?: string | null,
  statusFilter?: string | null
): Record<string, unknown> {
  if (statusFilter && typeof statusFilter !== 'string') {
    console.error('[buildLogisticsFilters] statusFilter must be a string');
    return {};
  }
  const filters: Record<string, unknown> = {};

  if (searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    filters.$or = [
      { cabinetIn: { $regex: lowerSearchTerm, $options: 'i' } },
      { locationFrom: { $regex: lowerSearchTerm, $options: 'i' } },
      { locationTo: { $regex: lowerSearchTerm, $options: 'i' } },
      { movedBy: { $regex: lowerSearchTerm, $options: 'i' } },
    ];
  }

  if (statusFilter && statusFilter !== 'all') {
    filters.status = statusFilter;
  }

  return filters;
}

/**
 * Transforms movement request data to logistics entry format
 *
 * @param logisticsData - Array of movement request documents
 * @returns Array of logistics entries
 */
function transformToLogisticsEntries(
  logisticsData: Array<{
    _id: unknown;
    cabinetIn?: string;
    locationFrom?: string;
    locationTo?: string;
    createdAt?: Date;
    status: MovementRequestStatus | undefined;
    createdBy?: string;
    reason?: string;
  }>
): LogisticsEntry[] {
  if (!Array.isArray(logisticsData)) {
    console.error('[transformToLogisticsEntries] logisticsData must be an array');
    return [];
  }
  return logisticsData.map(item => ({
    id: String(item._id),
    machineId: item.cabinetIn || String(item._id),
    machineName: item.cabinetIn || 'Unknown Machine',
    fromLocationName: item.locationFrom || '',
    toLocationName: item.locationTo || '',
    moveDate:
      item.createdAt?.toISOString() || new Date().toISOString(),
    status: mapMovementStatusToLogisticsStatus(item.status as MovementRequestStatus),
    movedBy: item.createdBy || 'Unknown',
    reason: item.reason || 'Movement request',
  }));
}

/**
 * Fetches logistics data
 *
 * @param searchTerm - Optional search term
 * @param statusFilter - Optional status filter
 * @returns Array of logistics entries
 */
export async function getLogisticsData(
  searchTerm?: string | null,
  statusFilter?: string | null
): Promise<LogisticsEntry[]> {
  if (searchTerm && typeof searchTerm !== 'string') {
    console.error('[getLogisticsData] searchTerm must be a string');
    return [];
  }
  const filters = buildLogisticsFilters(searchTerm, statusFilter);

  const logisticsData = await MovementRequest.find(filters)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<MovementRequestDocument[]>();

  return transformToLogisticsEntries(logisticsData as Parameters<typeof transformToLogisticsEntries>[0]);
}



