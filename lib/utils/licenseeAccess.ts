import type { UserAuthPayload } from '@/shared/types/auth';

/**
 * Determines if the licensee filter should be shown to the user
 * - Always show for admin/developer
 * - Show for non-admin users with multiple licensees (including location admins)
 * - Hide for non-admin users with single or no licensee
 * - Hide for location admins with single or no licensee
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

/**
 * Determines if user can access all licensees (admin only)
 */
export function canAccessAllLicensees(user: UserAuthPayload | null): boolean {
  if (!user) return false;
  const roles = user.roles || [];
  return roles.includes('admin') || roles.includes('developer');
}

/**
 * Gets the list of licensees the user can access
 * - Returns 'all' for admins
 * - Returns user's assigned licensees for non-admins
 */
export function getUserAccessibleLicensees(
  user: UserAuthPayload | null
): string[] | 'all' {
  if (!user) return [];

  if (canAccessAllLicensees(user)) {
    return 'all';
  }

  // Use only new field
  return Array.isArray(
    (user as { assignedLicensees?: string[] })?.assignedLicensees
  )
    ? (user as { assignedLicensees: string[] }).assignedLicensees
    : [];
}

/**
 * Filters licensee options based on user permissions
 */
export function getFilteredLicenseeOptions(
  allLicensees: Array<{ _id: string; name: string }>,
  user: UserAuthPayload | null
): Array<{ _id: string; name: string }> {
  if (!user) return [];

  if (canAccessAllLicensees(user)) {
    return allLicensees;
  }

  // Use only new field
  const userLicenseeIds = Array.isArray(
    (user as { assignedLicensees?: string[] })?.assignedLicensees
  )
    ? (user as { assignedLicensees: string[] }).assignedLicensees
    : [];
  return allLicensees.filter(licensee =>
    userLicenseeIds.includes(licensee._id)
  );
}

/**
 * Gets the default selected licensee for a user
 * - Empty string for admins (show all by default)
 * - First assigned licensee for non-admins with single licensee
 * - Empty string for non-admins with multiple licensees (let them choose)
 */
export function getDefaultSelectedLicensee(
  user: UserAuthPayload | null
): string {
  if (!user) return '';

  if (canAccessAllLicensees(user)) {
    return ''; // Show all for admins
  }

  // Use only new field
  const userLicensees = Array.isArray(
    (user as { assignedLicensees?: string[] })?.assignedLicensees
  )
    ? (user as { assignedLicensees: string[] }).assignedLicensees
    : [];
  return userLicensees.length === 1 ? userLicensees[0] : '';
}

/**
 * Checks if user can access a specific licensee
 */
export function canAccessLicensee(
  user: UserAuthPayload | null,
  licenseeId: string
): boolean {
  if (!user || !licenseeId) return false;

  if (canAccessAllLicensees(user)) {
    return true;
  }

  // Use only new field
  const userLicensees = Array.isArray(
    (user as { assignedLicensees?: string[] })?.assignedLicensees
  )
    ? (user as { assignedLicensees: string[] }).assignedLicensees
    : [];
  return userLicensees.includes(licenseeId);
}

/**
 * Determines if "No Licensee Assigned" message should be shown
 * - Never show for admins
 * - Show for non-admins with no licensees
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
 * Determines if "No Role Assigned" message should be shown
 * - Show for users with no roles
 */
export function shouldShowNoRoleMessage(user: UserAuthPayload | null): boolean {
  if (!user) return false;

  const roles = user.roles || [];
  return roles.length === 0;
}
