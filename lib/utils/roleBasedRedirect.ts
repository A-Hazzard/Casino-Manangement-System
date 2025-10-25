/**
 * Role-based redirect utility
 * Determines the appropriate default redirect path based on user role
 */

import type { UserRole } from './permissions';

/**
 * Gets the default redirect path for a user based on their role
 * Maps each role to their first accessible page
 *
 * @param userRole - The user's primary role
 * @returns The appropriate redirect path
 */
export function getDefaultRedirectPath(userRole: UserRole): string {
  const roleRedirectMap: Record<UserRole, string> = {
    'evolution admin': '/',
    admin: '/',
    manager: '/',
    'location admin': '/locations',
    technician: '/cabinets', // machines page
    collector: '/collection-report', // collection report page
    'collector meters': '/collection-report', // collection report page
  };

  return roleRedirectMap[userRole] || '/cabinets'; // fallback to machines page
}

/**
 * Gets the default redirect path for multiple roles
 * Uses the highest priority role to determine redirect
 *
 * @param userRoles - Array of user roles
 * @returns The appropriate redirect path
 */
export function getDefaultRedirectPathFromRoles(userRoles: string[]): string {
  if (!userRoles || userRoles.length === 0) {
    return '/cabinets'; // fallback
  }

  // Role priority order (highest to lowest)
  const rolePriority: UserRole[] = [
    'evolution admin',
    'admin',
    'manager',
    'location admin',
    'technician',
    'collector',
    'collector meters',
  ];

  // Find the highest priority role the user has
  for (const role of rolePriority) {
    if (userRoles.includes(role)) {
      return getDefaultRedirectPath(role);
    }
  }

  // Fallback if no recognized roles
  return '/cabinets';
}

/**
 * Gets a user-friendly redirect message based on role
 * Used for display purposes in UI
 *
 * @param userRole - The user's primary role
 * @returns Human-readable redirect destination
 */
export function getRedirectDestinationName(userRole: UserRole): string {
  const destinationNames: Record<UserRole, string> = {
    'evolution admin': 'Dashboard',
    admin: 'Dashboard',
    manager: 'Dashboard',
    'location admin': 'Locations',
    technician: 'Machines',
    collector: 'Collection Report',
    'collector meters': 'Collection Report',
  };

  return destinationNames[userRole] || 'Machines';
}

/**
 * Gets a user-friendly redirect message for multiple roles
 *
 * @param userRoles - Array of user roles
 * @returns Human-readable redirect destination
 */
export function getRedirectDestinationNameFromRoles(
  userRoles: string[]
): string {
  if (!userRoles || userRoles.length === 0) {
    return 'Machines';
  }

  // Role priority order (highest to lowest)
  const rolePriority: UserRole[] = [
    'evolution admin',
    'admin',
    'manager',
    'location admin',
    'technician',
    'collector',
    'collector meters',
  ];

  // Find the highest priority role the user has
  for (const role of rolePriority) {
    if (userRoles.includes(role)) {
      return getRedirectDestinationName(role);
    }
  }

  return 'Machines';
}
