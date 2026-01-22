/**
 * Vault Authorization Helper Functions
 *
 * This file contains authorization checks for vault operations.
 * It supports:
 * - Checking if user can manage transactions
 * - Checking if user can edit float requests
 *
 * @module app/api/lib/helpers/vault/authorization
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenseeFilter';
import { HIGH_PRIORITY_ROLES } from '@/lib/constants/roles';

/**
 * Check if user can manage transactions for a location
 * @param user - User object with roles and assignedLocations
 * @param locationId - Location ID to check access for
 * @returns boolean indicating if user can manage transactions
 */
export async function canManageTransactions(
  user: {
    _id: string;
    roles?: string[];
    assignedLocations?: string[];
  },
  locationId: string
): Promise<boolean> {
  if (!user.roles || user.roles.length === 0) {
    return false;
  }

  // Normalize roles to lowercase for case-insensitive comparison
  const normalizedUserRoles = user.roles.map(role => role.toLowerCase());
  const normalizedHighPriorityRoles = HIGH_PRIORITY_ROLES.map(role =>
    role.toLowerCase()
  );

  // High-level roles (developer, admin, manager, location admin) can manage
  const hasHighLevelRole = normalizedHighPriorityRoles.some(role =>
    normalizedUserRoles.includes(role)
  );

  if (hasHighLevelRole) {
    return true;
  }

  // Vault managers can manage
  if (normalizedUserRoles.includes('vault-manager')) {
    return true;
  }

  // Check location access
  const allowedLocationIds = await getUserLocationFilter(
    [],
    undefined,
    user.assignedLocations || [],
    user.roles
  );

  if (allowedLocationIds === 'all') {
    return true;
  }

  return allowedLocationIds.includes(locationId);
}

/**
 * Check if user can edit a float request
 * @param user - User object with roles and assignedLocations
 * @param floatRequest - Float request document
 * @returns boolean indicating if user can edit the request
 */
export async function canEditFloatRequest(
  user: {
    _id: string;
    roles?: string[];
    assignedLocations?: string[];
  },
  floatRequest: {
    type: string;
    status: string;
    locationId: string;
  }
): Promise<boolean> {
  if (!user.roles || user.roles.length === 0) {
    return false;
  }

  // Normalize roles to lowercase
  const normalizedUserRoles = user.roles.map(role => role.toLowerCase());

  // Only vault managers can edit float requests
  if (!normalizedUserRoles.includes('vault-manager')) {
    return false;
  }

  // Can only edit FLOAT_DECREASE requests
  if (floatRequest.type !== 'FLOAT_DECREASE') {
    return false;
  }

  // Can only edit PENDING requests
  if (floatRequest.status !== 'PENDING') {
    return false;
  }

  // Check location access
  const allowedLocationIds = await getUserLocationFilter(
    [],
    undefined,
    user.assignedLocations || [],
    user.roles
  );

  if (allowedLocationIds === 'all') {
    return true;
  }

  return allowedLocationIds.includes(floatRequest.locationId);
}
