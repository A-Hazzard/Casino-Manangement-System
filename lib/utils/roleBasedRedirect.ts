/**
 * Role-Based Redirect Utilities
 *
 * Utility functions for determining appropriate redirect paths based on user roles.
 *
 * Features:
 * - Single role redirect path determination
 * - Multiple roles redirect path determination (priority-based)
 * - User-friendly destination name generation
 * - Role priority handling (admin/developer/manager > technician > location admin > collector)
 */

import { UserRole } from './permissions';
// ============================================================================
// Redirect Path Functions
// ============================================================================
/**
 * Gets the default redirect path for multiple roles.
 * Uses the highest priority role to determine redirect.
 *
 * Priority order:
 * 1. admin, developer, manager, location admin → dashboard (/)
 * 2. vault-manager → /vault/management
 * 3. cashier → /vault/cashier/payouts
 * 4. technician → cabinets (/cabinets)
 * 5. collector → collection reports (/collection-report)
 *
 * @param userRoles - Array of user roles.
 * @returns The appropriate redirect path.
 */
export function getDefaultRedirectPathFromRoles(userRoles: UserRole[]): string {
  if (!userRoles || userRoles.length === 0) return '/cabinets'; 

  // Priority 1: Developer always goes to Dashboard
  if (userRoles.includes('developer')) {
    return '/';
  }

  // Priority 2: Reviewer and Owner go to Locations as requested
  if (userRoles.includes('reviewer') || userRoles.includes('owner')) {
    return '/locations';
  }

  // Priority 3: If user has admin, manager, or location admin → dashboard
  // (If user has any of these roles, always redirect to dashboard, even with other roles)
  const dashboardRoles: UserRole[] = ['admin', 'manager', 'location admin'];
  const hasDashboardAccess = dashboardRoles.some(role =>
    userRoles.includes(role)
  );
  if (hasDashboardAccess) return '/';

  // Priority 2: If user has vault-manager → vault management
  if (userRoles.includes('vault-manager')) return '/vault/management';

  // Priority 3: If user has cashier → cashier payouts
  if (userRoles.includes('cashier')) return '/vault/cashier/payouts';

  // Priority 4: If user has technician → cabinets
  if (userRoles.includes('technician')) return '/cabinets';

  // Priority 5: If user only has collector → collection reports
  if (userRoles.includes('collector')) return '/collection-report';

  return '/cabinets'; // Fallback if no recognized roles
}

// ============================================================================
// Destination Name Functions
// ============================================================================
/**
 * Gets a user-friendly redirect message for multiple roles.
 * Uses the same priority logic as getDefaultRedirectPathFromRoles.
 *
 * @param userRoles - Array of user roles.
 * @returns Human-readable redirect destination.
 */
export function getRedirectDestinationNameFromRoles(
  userRoles: string[]
): string {
  if (!userRoles || userRoles.length === 0) return 'Machines';

  // Priority 1: Developer always goes to Dashboard
  if (userRoles.includes('developer')) {
    return 'Dashboard';
  }

  // Priority 2: Reviewer and Owner go to Locations
  if (userRoles.includes('reviewer') || userRoles.includes('owner')) {
    return 'Locations';
  }

  // Priority 3: If user has admin, manager, or location admin → Dashboard
  const dashboardRoles = ['admin', 'manager', 'location admin'];
  const hasDashboardAccess = dashboardRoles.some(role =>
    userRoles.includes(role)
  );
  if (hasDashboardAccess) {
    return 'Dashboard';
  }

  // Priority 2: If user has vault-manager → Vault Management
  if (userRoles.includes('vault-manager')) {
    return 'Vault Management';
  }

  // Priority 3: If user has cashier → Cashier Interface
  if (userRoles.includes('cashier')) {
    return 'Cashier Interface';
  }

  // Priority 4: If user has technician → Machines
  if (userRoles.includes('technician')) {
    return 'Machines';
  }

  // Priority 5: If user only has collector → Collection Report
  if (userRoles.includes('collector')) {
    return 'Collection Report';
  }

  return 'Machines';
}
