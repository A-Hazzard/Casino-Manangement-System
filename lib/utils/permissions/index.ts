/**
 * Permission Utilities
 *
 * Central export point for permission checking utilities.
 *
 * Features:
 * - Client-side permission checks (hasPageAccess, hasAdminAccess)
 * - Server-side database permission checks (hasPageAccessDb, hasAdminAccessDb)
 * - User role and page name types
 * - Sidebar visibility helpers
 * - Machine/location CRUD permissions
 */

// Re-export types from client
export type { PageName } from './client';
export type { UserRole } from '@/lib/constants';

// Client-side permission utilities
export {
  hasPageAccess,
  hasTabAccess,
  shouldShowNavigationLink,
} from './client';

// Role check utilities
export {
  hasAdminAccess,
  hasManagerAccess,
  getRoleDisplayName,
  getUserPrimaryRole,
  isCashierOnly,
  isVaultManagerOnly,
  hasCmsAccess,
  hasCashierRole,
  hasVaultManagerRole,
  shouldShowCmsSidebar,
  shouldShowVaultSidebar,
  shouldShowCashierSidebar,
  canEditMachines,
  canDeleteMachines,
  canManageLocations,
  canViewArchivedMachines,
  canPermanentlyDeleteMachines,
  canPermanentlyDeleteLocations,
} from './client';

// Server-side permission utilities
export {
  hasPageAccessDb,
  hasAdminAccessDb,
  shouldShowNavigationLinkDb,
} from './server';
