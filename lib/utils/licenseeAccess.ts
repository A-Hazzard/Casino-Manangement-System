/**
 * Licensee Access Utilities
 *
 * Utility functions for managing user access to licensees and determining
 * UI visibility for licensee-related features.
 *
 * Features:
 * - Licensee filter visibility determination
 * - Licensee access checking
 * - Licensee option filtering
 * - Default licensee selection
 * - "No Licensee Assigned" message visibility
 * - "No Role Assigned" message visibility
 */

import type { UserAuthPayload } from '@/shared/types/auth';

// ============================================================================
// Licensee Filter Visibility
// ============================================================================
/**
 * Determines if the licensee filter should be shown to the user.
 * - Always show for admin/developer
 * - Show for non-admin users with multiple licensees (including location admins)
 * - Hide for non-admin users with single or no licensee
 * - Hide for location admins with single or no licensee
 *
 * @param user - The user object.
 * @returns Boolean indicating if the licensee filter should be shown.
 */
export function shouldShowLicenseeFilter(
  user: UserAuthPayload | null
): boolean {
  if (!user) return false;

  const roles = user.roles || [];
  const normalizedRoles = roles.map(role =>
    typeof role === 'string' ? role.toLowerCase() : role
  );
  const isAdmin =
    normalizedRoles.includes('admin') || normalizedRoles.includes('developer');

  // Always show for admins
  if (isAdmin) return true;

  // For location admins, only show if they have multiple licensees
  // For other users, show if they have multiple licensees
  // Use only new field
  const userLicensees = Array.isArray(
    (user as { assignedLicensees?: string[] })?.assignedLicensees
  )
    ? (user as { assignedLicensees: string[] }).assignedLicensees
    : [];
  return userLicensees.length > 1;
}

// ============================================================================
// Licensee Access Functions
// ============================================================================
/**
 * Determines if user can access all licensees (admin only).
 *
 * @param user - The user object.
 * @returns Boolean indicating if the user can access all licensees.
 */
function canAccessAllLicensees(user: UserAuthPayload | null): boolean {
  if (!user) return false;
  const roles = user.roles || [];
  return roles.includes('admin') || roles.includes('developer');
}

// ============================================================================
// Message Visibility Functions
// ============================================================================
/**
 * Determines if "No Licensee Assigned" message should be shown.
 * - Never show for admins
 * - Show for non-admins with no licensees
 *
 * @param user - The user object.
 * @returns Boolean indicating if the message should be shown.
 */
export function shouldShowNoLicenseeMessage(
  user: UserAuthPayload | null
): boolean {
  if (!user) return false;

  if (canAccessAllLicensees(user)) {
    return false;
  }

  // Use only new field
  const userLicensees = Array.isArray(
    (user as { assignedLicensees?: string[] })?.assignedLicensees
  )
    ? (user as { assignedLicensees: string[] }).assignedLicensees
    : [];
  return userLicensees.length === 0;
}

/**
 * Determines if "No Role Assigned" message should be shown.
 * - Show for users with no roles
 *
 * @param user - The user object.
 * @returns Boolean indicating if the message should be shown.
 */
export function shouldShowNoRoleMessage(user: UserAuthPayload | null): boolean {
  if (!user) return false;

  const roles = user.roles || [];
  return roles.length === 0;
}
