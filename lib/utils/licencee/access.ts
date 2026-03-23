/**
 * Licencee Access Utilities
 *
 * Utility functions for managing user access to licencees and determining
 * UI visibility for licencee-related features.
 *
 * Features:
 * - Licencee filter visibility determination
 * - Licencee access checking
 * - Licencee option filtering
 * - Default licencee selection
 * - "No Licencee Assigned" message visibility
 * - "No Role Assigned" message visibility
 */

import type { UserAuthPayload } from '@/shared/types/auth';

// ============================================================================
// Licencee Filter Visibility
// ============================================================================
/**
 * Determines if the licencee filter should be shown to the user.
 * - Always show for admin/developer
 * - Show for non-admin users with multiple licencees (including location admins)
 * - Hide for non-admin users with single or no licencee
 * - Hide for location admins with single or no licencee
 *
 * @param user - The user object.
 * @returns Boolean indicating if the licencee filter should be shown.
 */
export function shouldShowLicenceeFilter(
  user: UserAuthPayload | null
): boolean {
  if (!user) return false;

  const roles = user.roles || [];
  const isAdmin =
    roles.includes('admin') || roles.includes('developer');

  // Always show for admins
  if (isAdmin) return true;

  // For location admins, only show if they have multiple licencees
  // For other users, show if they have multiple licencees
  // Use only new field but fallback to old fields just in case
  const userLicencees = Array.isArray(
    (user as { assignedLicencees?: string[] })?.assignedLicencees
  )
    ? (user as { assignedLicencees: string[] }).assignedLicencees
    : Array.isArray((user as Record<string, unknown>)?.licencees)
    ? ((user as Record<string, unknown>).licencees as string[])
    : [];

  return userLicencees.length > 1;
}

// ============================================================================
// Licencee Access Functions
// ============================================================================
/**
 * Determines if the "No Licencee Assigned" message should be shown.
 *
 * @param user - The user object.
 * @returns Boolean indicating if the message should be shown.
 */
export function shouldShowNoLicenceeMessage(
  user: UserAuthPayload | null
): boolean {
  if (!user) return true;

  const roles = user.roles || [];
  // Never show for admins
  if (
    roles.includes('admin') ||
    roles.includes('developer')
  ) {
    return false;
  }

  // Show if user has no assigned licencees
  const userLicencees = user?.assignedLicencees

  return userLicencees?.length === 0;
}

/**
 * Determines if the "No Role Assigned" message should be shown.
 *
 * @param user - The user object.
 * @returns Boolean indicating if the message should be shown.
 */
export function shouldShowNoRoleMessage(user: UserAuthPayload | null): boolean {
  if (!user) return true;

  const roles = user.roles || [];
  return roles.length === 0;
}
