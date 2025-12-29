/**
 * Collection Reports Helper Functions
 *
 * This module contains helper functions for collection reports API routes.
 * It handles query building, role-based filtering, and data fetching.
 *
 * @module app/api/lib/helpers/collectionReports
 */

import { connectDB } from '../middleware/db';
import { GamingLocations } from '../models/gaminglocations';
import UserModel from '../models/user';

/**
 * User role and permission information
 */
type UserPermissions = {
  roles: string[];
  licensees: string[];
  locationPermissions: string[];
};

/**
 * Paginated collectors response
 */
export type PaginatedCollectors = {
  collectors: Array<{
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Fetches paginated collectors for a licensee
 *
 * @param page - Page number
 * @param limit - Items per page
 * @param licenceeId - Optional licensee ID to filter by
 * @returns Promise with paginated collectors
 */
export async function getCollectorsPaginated(
  page: number,
  limit: number,
  licenceeId?: string
): Promise<PaginatedCollectors> {
  const skip = (page - 1) * limit;

  // Build filter for collectors
  const filter: Record<string, unknown> = {
    roles: 'collector',
    isEnabled: true,
  };

  if (licenceeId) {
    filter.assignedLicensees = licenceeId;
  }

  // Fetch total count for pagination
  const total = await UserModel.countDocuments(filter);

  // Fetch paginated users
  const users = await UserModel.find(filter)
    .sort({ username: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const collectors = (users as Array<Record<string, unknown>>).map(user => ({
    id: String(user._id),
    username: String(user.username || ''),
    email: String(user.emailAddress || ''),
    firstName: String(
      (user.profile as Record<string, unknown>)?.firstName || ''
    ),
    lastName: String((user.profile as Record<string, unknown>)?.lastName || ''),
  }));

  return {
    collectors,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Collection reports query parameters
 */
export type CollectionReportsQueryParams = {
  locationReportId?: string | null;
  isEditing?: string | null;
  limit?: string | null;
  sortBy?: string;
  sortOrder?: string;
  search?: string | null;
};

/**
 * Builds location filter for collection reports based on user role and permissions
 *
 * @param userPermissions - User's roles, licensees, and location permissions
 * @returns Location IDs to filter by, or null if no filter should be applied
 */
export async function buildCollectionReportsLocationFilter(
  userPermissions: UserPermissions
): Promise<string[] | null> {
  const { roles, licensees, locationPermissions } = userPermissions;

  const isAdmin = roles.includes('admin') || roles.includes('developer');
  const isManager = roles.includes('manager');

  // Admin with no location restrictions - no filter
  if (isAdmin && locationPermissions.length === 0) {
    return null;
  }

  // Admin with location restrictions - filter by those locations
  if (isAdmin && locationPermissions.length > 0) {
    return locationPermissions;
  }

  // Manager - get ALL locations for their assigned licensees
  if (isManager) {
    if (licensees.length === 0) {
      return [];
    }

    const db = await connectDB();
    if (!db) {
      throw new Error('Database connection failed');
    }

    const managerLocations = await GamingLocations.find(
      {
        'rel.licencee': { $in: licensees },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      },
      { _id: 1 }
    )
      .lean()
      .exec();

    const managerLocationIds = managerLocations.map(loc => String(loc._id));

    return managerLocationIds.length === 0 ? [] : managerLocationIds;
  }

  // Collector/Technician - use ONLY their assigned location permissions
  if (locationPermissions.length === 0) {
    return [];
  }

  return locationPermissions;
}

/**
 * Builds MongoDB query for collection reports
 *
 * @param params - Query parameters from request
 * @param locationFilter - Location IDs to filter by (null means no filter)
 * @returns MongoDB query object
 */
export function buildCollectionReportsQuery(
  params: CollectionReportsQueryParams,
  locationFilter: string[] | null
): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (params.locationReportId) {
    query.locationReportId = params.locationReportId;
  }

  if (params.isEditing === 'true') {
    query.isEditing = true;
  }

  // Handle search parameter - search across multiple fields
  if (params.search && params.search.trim()) {
    const searchTerm = params.search.trim();

    // Build search query to check multiple fields in order:
    // 1. collector (user ID - primary field)
    // 2. locationReportId (report ID)
    // 3. _id (document ID)
    // 4. collectorName (LAST FALLBACK - display name only, deprecated for writes)
    query.$or = [
      { collector: { $regex: searchTerm, $options: 'i' } },
      { locationReportId: { $regex: searchTerm, $options: 'i' } },
      { _id: { $regex: searchTerm, $options: 'i' } },
      { collectorName: { $regex: searchTerm, $options: 'i' } }, // DEPRECATED: Last fallback for legacy data
    ];
  }

  if (locationFilter !== null) {
    if (locationFilter.length === 0) {
      // Empty array means user has no access - return impossible query
      query._id = { $in: [] };
    } else {
      query.location = { $in: locationFilter };
    }
  }

  return query;
}

/**
 * Extracts user permissions from user payload
 * Uses new fields (assignedLocations, assignedLicensees)
 *
 * @param userPayload - User payload from JWT token
 * @returns User permissions object
 */
export function extractUserPermissions(userPayload: {
  roles?: unknown;
  assignedLocations?: string[];
  assignedLicensees?: string[];
}): UserPermissions {
  const roles = Array.isArray(userPayload.roles)
    ? (userPayload.roles as string[])
    : [];

  // Use only new field
  let licensees: string[] = [];
  if (
    Array.isArray(userPayload.assignedLicensees) &&
    userPayload.assignedLicensees.length > 0
  ) {
    licensees = userPayload.assignedLicensees;
  }

  // Use only new field
  let locationPermissions: string[] = [];
  if (
    Array.isArray(userPayload.assignedLocations) &&
    userPayload.assignedLocations.length > 0
  ) {
    locationPermissions = userPayload.assignedLocations;
  }

  return {
    roles,
    licensees,
    locationPermissions,
  };
}
