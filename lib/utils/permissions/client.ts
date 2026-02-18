/**
 * Role-Based Access Control (RBAC) Permission Utilities
 *
 * This module provides utility functions for checking user permissions
 * based on their roles in the Evolution One Casino Management System.
 *
 * Role Hierarchy (Highest to Lowest Priority):
 * 1. Developer - Full platform access
 * 2. Admin - High-level administrative functions
 * 3. Manager - Operational oversight
 * 4. Location Admin - Location-specific management
 * 5. Vault Manager - Vault management operations
 * 6. Cashier - Cashier operations
 * 7. Technician - Technical operations
 * 8. Collector - Collection operations
 */

import {
    CMS_ACCESS_ROLES,
    HIGH_PRIORITY_ROLES,
    ROLE_PRIORITY,
    UserRole,
} from '@/lib/constants';

export type PageName =
  | 'dashboard'
  | 'machines'
  | 'locations'
  | 'location-details'
  | 'members'
  | 'member-details'
  | 'collection-report'
  | 'reports'
  | 'sessions'
  | 'administration'
  | 'vault-management'
  | 'vault-cashier'
  | 'vault-role-selection';

/**
 * Check if user has access to a specific page
 * @param userRoles - Array of user's roles
 * @param page - Page name to check access for
 * @returns boolean indicating if user has access
 */
export const hasPageAccess = (
  userRoles: UserRole[],
  page: PageName
): boolean => {
  const pagePermissions: Record<PageName, UserRole[]> = {
    dashboard: ['developer', 'admin', 'manager', 'location admin'], // ✅ Location admin can access dashboard
    machines: ['developer', 'admin', 'manager', 'location admin', 'technician'],
    locations: ['developer', 'admin', 'manager', 'location admin'],
    'location-details': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'technician',
    ],
    members: ['developer', 'admin'], // ✅ Restricted to developer and admin
    'member-details': ['developer', 'admin'], // ✅ Restricted to developer and admin
    'collection-report': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'collector',
    ],
    reports: ['developer', 'admin', 'manager', 'location admin'], // ✅ Restricted to developer, admin, manager, and location admin
    sessions: ['developer', 'admin'], // ✅ Restricted to developer and admin
    administration: ['developer', 'admin', 'manager', 'location admin'],
    'vault-management': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'vault-manager',
    ],
    'vault-cashier': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'cashier',
    ],
    'vault-role-selection': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'vault-manager',
      'cashier',
    ],
  };

  const requiredRoles = pagePermissions[page] || [];
  return requiredRoles.some(role => userRoles.includes(role));
};

/**
 * Check if user has access to a specific tab within a page
 * @param userRoles - Array of user's roles
 * @param page - Page name
 * @param tab - Tab name
 * @returns boolean indicating if user has access
 */
export const hasTabAccess = (
  userRoles: UserRole[],
  page: string,
  tab: string
): boolean => {
  const tabPermissions: Record<string, UserRole[]> = {
    'administration-users': ['developer', 'admin', 'manager', 'location admin'],
    'administration-licensees': ['developer', 'admin'],
    'administration-countries': ['developer', 'admin'],
    'administration-activity-logs': [
      'developer',
      'admin',
      'manager',
      'location admin',
    ],
    'administration-feedback': ['developer', 'admin'],
    'collection-reports-monthly': [
      'developer',
      'admin',
      'manager',
      'location admin',
    ],
    'collection-reports-manager-schedules': ['developer', 'admin', 'manager'],
    'collection-reports-collector-schedules': [
      'developer',
      'admin',
      'manager',
      'location admin',
    ],
  };

  const key = `${page}-${tab}`;
  const requiredRoles = tabPermissions[key] || [];
  return requiredRoles.some(role => userRoles.includes(role));
};

/**
 * Check if user has admin-level access (Developer or Admin)
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has admin access
 */
export const hasAdminAccess = (userRoles: UserRole[]): boolean => {
  return userRoles.includes('developer') || userRoles.includes('admin');
};

/**
 * Check if user has manager-level access or higher
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has manager access
 */
export const hasManagerAccess = (userRoles: UserRole[]): boolean => {
  return HIGH_PRIORITY_ROLES.some((role: UserRole) => userRoles.includes(role));
};

/**
 * Check if user should see navigation link for a page
 * @param userRoles - Array of user's roles
 * @param page - Page name
 * @returns boolean indicating if navigation link should be shown
 */
export const shouldShowNavigationLink = (
  userRoles: UserRole[],
  page: PageName
): boolean => {
  // Special cases for direct link access
  if (page === 'location-details' || page === 'member-details') {
    return false; // These are accessed via direct links only
  }

  // Hide certain links (sessions, members) unless the user has
  // the highest-level role. This affects NAV/Sidebar visibility only and
  // does not change actual route access rules handled by hasPageAccess.
  if (page === 'sessions' || page === 'members') {
    return userRoles.includes('developer') || userRoles.includes('admin');
  }

  // Hide vault links unless the user has authorized roles
  if (page === 'vault-management') {
    return (
      userRoles.includes('developer') ||
      userRoles.includes('admin') ||
      userRoles.includes('manager') ||
      userRoles.includes('location admin') ||
      userRoles.includes('vault-manager')
    );
  }

  if (page === 'vault-cashier') {
    return (
      userRoles.includes('developer') ||
      userRoles.includes('admin') ||
      userRoles.includes('manager') ||
      userRoles.includes('location admin') ||
      userRoles.includes('cashier')
    );
  }

  if (page === 'vault-role-selection') {
    return false; // Accessed via role selection logic
  }

  return hasPageAccess(userRoles, page);
};

/**
 * Get user's role display name
 * @param userRoles - Array of user's roles
 * @returns string representing the user's primary role for display
 */
export const getRoleDisplayName = (userRoles: UserRole[]): string => {
  const roleDisplayNames: Record<string, string> = {
    developer: 'Developer',
    admin: 'Administrator',
    manager: 'Manager',
    'location admin': 'Location Admin',
    'vault-manager': 'Vault Manager',
    cashier: 'Cashier',
    technician: 'Technician',
    collector: 'Collector',
  };

  for (const role of ROLE_PRIORITY) {
    if (userRoles.includes(role)) {
      return roleDisplayNames[role] || 'User';
    }
  }

  return 'User';
};

/**
 * Get user's primary role based on priority
 * @param userRoles - Array of user's roles
 * @returns Highest priority role or undefined if no roles
 */
export function getUserPrimaryRole(
  userRoles: UserRole[] | undefined
): UserRole | undefined {
  if (!userRoles || userRoles.length === 0) return undefined;

  // Find the highest priority role
  for (const role of ROLE_PRIORITY) if (userRoles.includes(role)) return role;

  return undefined;
}

/**
 * Check if user has only cashier role
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has only cashier role
 */
export function isCashierOnly(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.length === 1 && userRoles.includes('cashier');
}

/**
 * Check if user has only vault-manager role
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has only vault-manager role
 */
export function isVaultManagerOnly(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.length === 1 && userRoles.includes('vault-manager');
}

/**
 * Check if user has CMS access roles
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has CMS access
 */
export function hasCmsAccess(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  // Normalize roles to lowercase for case-insensitive comparison
  const normalizedUserRoles = userRoles.map(role => role.toLowerCase());
  return CMS_ACCESS_ROLES.some(role =>
    normalizedUserRoles.includes(role.toLowerCase())
  );
}

/**
 * Check if user has cashier role (regardless of other roles)
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has cashier role
 */
export function hasCashierRole(userRoles: UserRole[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes('cashier');
}

/**
 * Check if user has vault-manager role (regardless of other roles)
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has vault-manager role
 */
export function hasVaultManagerRole(
  userRoles: UserRole[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes('vault-manager');
}

/**
 * Determine if CMS sidebar should be shown
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if CMS sidebar should show
 */
export function shouldShowCmsSidebar(
  userRoles: UserRole[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;

  const primaryRole = getUserPrimaryRole(userRoles);

  // CMS roles should show CMS sidebar
  if (primaryRole && CMS_ACCESS_ROLES.includes(primaryRole)) {
    return true;
  }

  return false;
}

/**
 * Determine if Vault sidebar should be shown
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if Vault sidebar should show
 */
export function shouldShowVaultSidebar(
  userRoles: UserRole[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;

  const primaryRole = getUserPrimaryRole(userRoles);

  // Vault manager should show vault sidebar
  if (primaryRole === 'vault-manager') {
    return true;
  }

  // CMS roles can also access vault (for Cash Desk and Vault Manager links)
  if (primaryRole && CMS_ACCESS_ROLES.includes(primaryRole)) {
    return false; // They use CMS sidebar with vault links
  }

  return false;
}

/**
 * Determine if Cashier sidebar should be shown
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if Cashier sidebar should show
 */
export function shouldShowCashierSidebar(
  userRoles: UserRole[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;

  const primaryRole = getUserPrimaryRole(userRoles);

  // Cashier should show cashier sidebar (or empty sidebar)
  if (primaryRole === 'cashier') {
    return true;
  }

  return false;
}
