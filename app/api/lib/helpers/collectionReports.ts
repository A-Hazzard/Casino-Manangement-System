/**
 * Collection Reports Helper Functions
 *
 * This module contains helper functions for collection reports API routes.
 * It handles query building, role-based filtering, and data fetching.
 *
 * @module app/api/lib/helpers/collectionReports
 */

import { connectDB } from '../middleware/db';

/**
 * User role and permission information
 */
export type UserPermissions = {
  roles: string[];
  licensees: string[];
  locationPermissions: string[];
};

/**
 * Collection reports query parameters
 */
export type CollectionReportsQueryParams = {
  locationReportId?: string | null;
  isEditing?: string | null;
  limit?: string | null;
  sortBy?: string;
  sortOrder?: string;
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

    const managerLocations = await db
      .collection('gaminglocations')
      .find(
        {
          'rel.licencee': { $in: licensees },
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
        { projection: { _id: 1 } }
      )
      .toArray();

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

  if (locationFilter !== null) {
    if (locationFilter.length === 0) {
      // Empty array means user has no access - return impossible query
      query._id = { $in: [] };
    } else {
      query.locationId = { $in: locationFilter };
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
  rel?: { licencee?: unknown };
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
