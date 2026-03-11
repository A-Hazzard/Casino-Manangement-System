/**
 * Vault Authorization Utilities
 *
 * Provides utility functions for checking VAULT application access permissions.
 */

import type { UserRole } from '@/lib/constants';

/**
 * Authorized roles for VAULT application access
 */
export const VAULT_AUTHORIZED_ROLES: UserRole[] = [
  'developer',
  'admin',
  'manager',
  'location admin',
  'vault-manager',
];

/**
 * High-level roles that see application selection screen
 */
export const HIGH_LEVEL_ROLES: UserRole[] = [
  'developer',
  'admin',
  'manager',
  'location admin',
];

/**
 * Check if user has access to VAULT application
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has VAULT access
 */
export function hasVaultAccess(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  // Normalize roles to lowercase for case-insensitive comparison
  const normalizedUserRoles = userRoles.map(role => role.toLowerCase());
  return normalizedUserRoles.some(role =>
    VAULT_AUTHORIZED_ROLES.some(
      authorizedRole => authorizedRole.toLowerCase() === role
    )
  );
}

/**
 * Check if user has cashier access
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has cashier access
 * 
 * CMS roles (developer, admin, manager, location admin) can also access cashier pages
 */
export function hasCashierAccess(userRoles: string[] | undefined): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  // Normalize roles to lowercase for case-insensitive comparison
  const normalizedUserRoles = userRoles.map(role => role.toLowerCase());
  // Check if user has cashier role
  if (normalizedUserRoles.includes('cashier')) return true;
  // CMS roles can also access cashier pages
  return normalizedUserRoles.some(role =>
    HIGH_LEVEL_ROLES.some(
      authorizedRole => authorizedRole.toLowerCase() === role
    )
  );
}

/**
 * Check if user has vault manager access
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has vault manager access
 */
export function hasVaultManagerAccess(
  userRoles: string[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes('vault-manager');
}

/**
 * Check if user should see application selection screen
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user should see selection screen
 */
export function shouldShowApplicationSelection(
  userRoles: string[] | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some(role => HIGH_LEVEL_ROLES.includes(role as UserRole));
}
