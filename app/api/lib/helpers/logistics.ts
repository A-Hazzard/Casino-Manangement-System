/**
 * Logistics Helper Functions
 *
 * This module contains helper functions for logistics analytics.
 * It handles fetching and transforming movement request data.
 *
 * @module app/api/lib/helpers/logistics
 */

import type { LogisticsEntry } from '@/lib/types/reports';
import { MovementRequest } from '../models/movementrequests';
import type { MovementRequestStatus } from '@/lib/types/movementRequests';

/**
 * Maps MovementRequestStatus to LogisticsEntry status
 *
 * @param status - Movement request status
 * @returns Logistics entry status
 */
function mapMovementStatusToLogisticsStatus(
  status: MovementRequestStatus
): 'pending' | 'completed' | 'in-progress' | 'cancelled' {
  switch (status) {
    case 'approved':
      return 'completed';
    case 'rejected':
      return 'cancelled';
    case 'in progress':
      return 'in-progress';
    case 'pending':
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
    status: MovementRequestStatus;
    createdBy?: string;
    reason?: string;
  }>
): LogisticsEntry[] {
  return logisticsData.map(item => ({
    id: String(item._id),
    machineId: item.cabinetIn || String(item._id),
    machineName: item.cabinetIn || 'Unknown Machine',
    fromLocationName: item.locationFrom || '',
    toLocationName: item.locationTo || '',
    moveDate:
      item.createdAt?.toISOString() || new Date().toISOString(),
    status: mapMovementStatusToLogisticsStatus(item.status),
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
  const filters = buildLogisticsFilters(searchTerm, statusFilter);

  const logisticsData = await MovementRequest.find(filters)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return transformToLogisticsEntries(logisticsData);
}

