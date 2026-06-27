/**
 * Role Check Utilities
 *
 * Domain-specific permission helpers for role identification, sidebar visibility,
 * and machine/location management permissions.
 *
 * Features:
 * - Role level checks (hasAdminAccess, hasManagerAccess)
 * - Single-role detection (isCashierOnly, isVaultManagerOnly)
 * - Role presence checks (hasCmsAccess, hasCashierRole, hasVaultManagerRole)
 * - Primary role resolution (getUserPrimaryRole, getRoleDisplayName)
 * - Sidebar visibility (shouldShowCmsSidebar, shouldShowVaultSidebar, shouldShowCashierSidebar)
 * - Machine/location CRUD permissions (canEditMachines, canDeleteMachines, etc.)
 */

import {
  CMS_ACCESS_ROLES,
  HIGH_PRIORITY_ROLES,
  ROLE_PRIORITY,
  UserRole,
} from '@/lib/constants';

// ============================================================================
// Role Level Checks
// ============================================================================

export const hasAdminAccess = (userRoles: UserRole[]): boolean => {
  if (!Array.isArray(userRoles)) {
    console.error('[hasAdminAccess] userRoles is required');
    return false;
  }
  return (
    userRoles.includes('developer') ||
    userRoles.includes('owner') ||
    userRoles.includes('admin')
  );
};

export const hasManagerAccess = (userRoles: UserRole[]): boolean => {
  if (!Array.isArray(userRoles)) {
    console.error('[hasManagerAccess] userRoles is required');
    return false;
  }
  return HIGH_PRIORITY_ROLES.some((role: UserRole) => userRoles.includes(role));
};

// ============================================================================
// Role Display & Identification
// ============================================================================

export const getRoleDisplayName = (userRoles: UserRole[]): string => {
  const roleDisplayNames: Record<string, string> = {
    developer: 'Developer',
    owner: 'Owner',
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

export function getUserPrimaryRole(
  userRoles: UserRole[] | undefined
): UserRole | undefined {
  if (!userRoles || userRoles.length === 0) return undefined;

  for (const role of ROLE_PRIORITY) if (userRoles.includes(role)) return role;

  return undefined;
}

export function isCashierOnly(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.length === 1 && userRoles.includes('cashier');
}

export function isVaultManagerOnly(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.length === 1 && userRoles.includes('vault-manager');
}

export function hasCmsAccess(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  const normalizedUserRoles = userRoles.filter(
    (role): role is string => typeof role === 'string'
  );
  return CMS_ACCESS_ROLES.some(role => normalizedUserRoles.includes(role));
}

export function hasCashierRole(userRoles: UserRole[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes('cashier');
}

export function hasVaultManagerRole(
  userRoles: UserRole[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes('vault-manager');
}

// ============================================================================
// Sidebar Visibility
// ============================================================================

export function shouldShowCmsSidebar(
  userRoles: UserRole[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;

  const primaryRole = getUserPrimaryRole(userRoles);

  if (primaryRole && CMS_ACCESS_ROLES.includes(primaryRole)) {
    return true;
  }

  return false;
}

export function shouldShowVaultSidebar(
  userRoles: UserRole[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;

  const primaryRole = getUserPrimaryRole(userRoles);

  if (primaryRole === 'vault-manager') {
    return true;
  }

  if (primaryRole && CMS_ACCESS_ROLES.includes(primaryRole)) {
    return false;
  }

  return false;
}

export function shouldShowCashierSidebar(
  userRoles: UserRole[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;

  const primaryRole = getUserPrimaryRole(userRoles);

  if (primaryRole === 'cashier') {
    return true;
  }

  return false;
}

// ============================================================================
// Machine & Location Permissions
// ============================================================================

export const canEditMachines = (userRoles: UserRole[] | undefined): boolean => {
  if (!userRoles || userRoles.length === 0) return false;

  if (userRoles.includes('collector')) {
    return false;
  }

  return [
    'developer',
    'owner',
    'admin',
    'manager',
    'location admin',
    'technician',
  ].some(role => userRoles.includes(role as UserRole));
};

export const canDeleteMachines = (
  userRoles: UserRole[] | undefined
): boolean => {
  if (!userRoles || userRoles.length === 0) return false;

  if (userRoles.includes('collector') || userRoles.includes('technician')) {
    return false;
  }

  return ['developer', 'owner', 'admin', 'manager', 'location admin'].some(
    role => userRoles.includes(role as UserRole)
  );
};

export const canManageLocations = (
  userRoles: UserRole[] | undefined
): boolean => {
  if (!userRoles || userRoles.length === 0) return false;

  return ['developer', 'owner', 'admin', 'manager', 'location admin'].some(
    role => userRoles.includes(role as UserRole)
  );
};

export const canViewArchivedMachines = (
  userRoles: UserRole[] | undefined
): boolean => {
  if (!userRoles || userRoles.length === 0) return false;

  return ['developer', 'owner', 'admin', 'technician'].some(role =>
    userRoles.includes(role as UserRole)
  );
};

export const canPermanentlyDeleteMachines = (
  userRoles: UserRole[] | undefined
): boolean => {
  if (!userRoles || userRoles.length === 0) return false;

  return ['developer', 'owner', 'admin'].some(role =>
    userRoles.includes(role as UserRole)
  );
};

export const canPermanentlyDeleteLocations = (
  userRoles: UserRole[] | undefined
): boolean => {
  if (!userRoles || userRoles.length === 0) return false;

  return ['developer'].some(role => userRoles.includes(role as UserRole));
};
