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
    developer: '/',
    admin: '/',
    manager: '/',
    'location admin': '/collection-report', // Updated: location admin redirects to collection reports
    technician: '/cabinets', // machines page
    collector: '/collection-report', // collection report page
  };

  return roleRedirectMap[userRole] || '/cabinets'; // fallback to machines page
}

/**
 * Gets the default redirect path for multiple roles
 * Uses the highest priority role to determine redirect
 *
 * Priority order:
 * 1. admin, developer, manager, administration → dashboard (/)
 * 2. technician → cabinets (/cabinets)
 * 3. location admin → collection reports (/collection-report)
 * 4. collector → collection reports (/collection-report)
 *
 * @param userRoles - Array of user roles
 * @returns The appropriate redirect path
 */
export function getDefaultRedirectPathFromRoles(userRoles: string[]): string {
  if (!userRoles || userRoles.length === 0) {
    return '/cabinets'; // fallback
  }

  // Priority 1: If user has admin, developer, manager, or administration → dashboard
  // (If user has any of these 4 roles, always redirect to dashboard, even with other roles)
  const highPriorityRoles = ['admin', 'developer', 'manager', 'administration'];
  const hasHighPriorityRole = highPriorityRoles.some(role =>
    userRoles.includes(role)
  );
  if (hasHighPriorityRole) {
    return '/'; // Dashboard
  }

  // Priority 2: If user has technician → cabinets
  if (userRoles.includes('technician')) {
    return '/cabinets';
  }

  // Priority 3: If user has location admin → collection reports
  if (userRoles.includes('location admin')) {
    return '/collection-report';
  }

  // Priority 4: If user only has collector → collection reports
  if (userRoles.includes('collector')) {
    return '/collection-report';
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
    developer: 'Dashboard',
    admin: 'Dashboard',
    manager: 'Dashboard',
    'location admin': 'Collection Report', // Updated: location admin redirects to collection reports
    technician: 'Machines',
    collector: 'Collection Report',
  };

  return destinationNames[userRole] || 'Machines';
}

/**
 * Gets a user-friendly redirect message for multiple roles
 * Uses the same priority logic as getDefaultRedirectPathFromRoles
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

  // Priority 1: If user has admin, developer, manager, or administration → Dashboard
  const highPriorityRoles = ['admin', 'developer', 'manager', 'administration'];
  const hasHighPriorityRole = highPriorityRoles.some(role =>
    userRoles.includes(role)
  );
  if (hasHighPriorityRole) {
    return 'Dashboard';
  }

  // Priority 2: If user has technician → Machines
  if (userRoles.includes('technician')) {
    return 'Machines';
  }

  // Priority 3: If user has location admin → Collection Report
  if (userRoles.includes('location admin')) {
    return 'Collection Report';
  }

  // Priority 4: If user only has collector → Collection Report
  if (userRoles.includes('collector')) {
    return 'Collection Report';
  }

  return 'Machines';
}
