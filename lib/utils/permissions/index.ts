/**
 * Permission Utilities
 *
 * Central export point for permission checking utilities.
 *
 * Features:
 * - Client-side permission checks (hasPageAccess, hasAdminAccess)
 * - Server-side database permission checks (hasPageAccessDb, hasAdminAccessDb)
 * - User role and page name types
 */

// Re-export types from client
export type { PageName } from './client';
export type { UserRole } from '@/lib/constants';

// Client-side permission utilities
export {
  hasPageAccess,
  hasTabAccess,
  hasAdminAccess,
  hasManagerAccess,
  shouldShowNavigationLink,
  getRoleDisplayName,
} from './client';

// Server-side permission utilities
export {
  hasPageAccessDb,
  hasAdminAccessDb,
  shouldShowNavigationLinkDb,
} from './server';
