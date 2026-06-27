/**
 * Role-Based Access Control (RBAC) Permission Utilities
 *
 * This module provides utility functions for checking user permissions
 * based on their roles in the Evolution One Casino Management System.
 *
 * Features:
 * - Page access checks (hasPageAccess, hasTabAccess)
 * - Navigation link visibility (shouldShowNavigationLink)
 * - Re-exports all role check utilities from roleChecks.ts
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

import { UserRole } from '@/lib/constants';

export { hasAdminAccess, hasManagerAccess } from './roleChecks';
export { getRoleDisplayName, getUserPrimaryRole } from './roleChecks';
export { isCashierOnly, isVaultManagerOnly, hasCmsAccess } from './roleChecks';
export { hasCashierRole, hasVaultManagerRole } from './roleChecks';
export { shouldShowCmsSidebar, shouldShowVaultSidebar, shouldShowCashierSidebar } from './roleChecks';
export { canEditMachines, canDeleteMachines, canManageLocations } from './roleChecks';
export { canViewArchivedMachines, canPermanentlyDeleteMachines, canPermanentlyDeleteLocations } from './roleChecks';

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

// ============================================================================
// Page & Tab Access Checks
// ============================================================================

export const hasPageAccess = (
  userRoles: UserRole[],
  page: PageName
): boolean => {
  if (!Array.isArray(userRoles)) {
    console.error('[hasPageAccess] userRoles is required');
    return false;
  }
  if (!page) {
    console.error('[hasPageAccess] page is required');
    return false;
  }
  const pagePermissions: Record<PageName, UserRole[]> = {
    dashboard: ['developer', 'owner', 'admin', 'manager', 'location admin'],
    machines: [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
      'technician',
      'reviewer',
      'collector',
      'vault-manager',
      'cashier',
    ],
    locations: [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
      'reviewer',
    ],
    'location-details': [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
      'technician',
      'reviewer',
    ],
    members: ['developer', 'owner', 'admin'],
    'member-details': ['developer', 'owner', 'admin'],
    'collection-report': [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
      'collector',
      'reviewer',
    ],
    reports: ['developer', 'owner', 'admin', 'manager', 'location admin'],
    sessions: ['developer'],
    administration: [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
    ],
    'vault-management': [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
      'vault-manager',
    ],
    'vault-cashier': [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
      'cashier',
    ],
    'vault-role-selection': [
      'developer',
      'owner',
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

export const hasTabAccess = (
  userRoles: UserRole[],
  page: string,
  tab: string
): boolean => {
  if (!Array.isArray(userRoles)) {
    console.error('[hasTabAccess] userRoles is required');
    return false;
  }
  if (!page) {
    console.error('[hasTabAccess] page is required');
    return false;
  }
  if (!tab) {
    console.error('[hasTabAccess] tab is required');
    return false;
  }
  const tabPermissions: Record<string, UserRole[]> = {
    'administration-users': [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
    ],
    'administration-licencees': ['developer', 'owner', 'admin'],
    'administration-countries': ['developer', 'owner', 'admin'],
    'administration-activity-logs': [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
    ],
    'administration-feedback': ['developer', 'owner', 'admin'],
    'collection-reports-monthly': [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
    ],
    'collection-reports-manager-schedules': [
      'developer',
      'owner',
      'admin',
      'manager',
    ],
    'collection-reports-collector-schedules': [
      'developer',
      'owner',
      'admin',
      'manager',
      'location admin',
    ],
  };

  const key = `${page}-${tab}`;
  const requiredRoles = tabPermissions[key] || [];
  return requiredRoles.some(role => userRoles.includes(role));
};

// ============================================================================
// Navigation Link Visibility
// ============================================================================

export const shouldShowNavigationLink = (
  userRoles: UserRole[],
  page: PageName
): boolean => {
  if (!Array.isArray(userRoles)) {
    console.error('[shouldShowNavigationLink] userRoles is required');
    return false;
  }
  if (!page) {
    console.error('[shouldShowNavigationLink] page is required');
    return false;
  }
  if (page === 'location-details' || page === 'member-details') {
    return false;
  }

  if (page === 'sessions') {
    return userRoles.includes('developer');
  }

  if (page === 'members') {
    return (
      userRoles.includes('developer') ||
      userRoles.includes('owner') ||
      userRoles.includes('admin')
    );
  }

  if (page === 'vault-management') {
    return (
      userRoles.includes('developer') ||
      userRoles.includes('owner') ||
      userRoles.includes('admin') ||
      userRoles.includes('manager') ||
      userRoles.includes('location admin') ||
      userRoles.includes('vault-manager')
    );
  }

  if (page === 'vault-cashier') {
    return (
      userRoles.includes('developer') ||
      userRoles.includes('owner') ||
      userRoles.includes('admin') ||
      userRoles.includes('manager') ||
      userRoles.includes('location admin') ||
      userRoles.includes('cashier')
    );
  }

  if (page === 'vault-role-selection') {
    return false;
  }

  return hasPageAccess(userRoles, page);
};
