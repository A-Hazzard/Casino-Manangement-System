/**
 * Administration Page Helpers
 *
 * Composes administration page utilities including user, licencee, and location
 * management operations from sub-modules. Also provides shared utility functions
 * for filtering, sorting, pagination, and test user detection.
 *
 * Features:
 * - User management (CRUD)
 * - Licencee management (CRUD, payment status)
 * - Location management (loading)
 * - Utility functions (test user filtering, search, sort, pagination)
 *
 * @module lib/helpers/administration/page
 */

import { licenceeManagement } from './licenceeManagement';
import { locationManagement } from './locationManagement';
import { userManagement } from './userManagement';
import { filterAndSortUsers } from './data';
import type { SortKey, User } from '@/lib/types/administration';
import type { Licencee } from '@/lib/types/common';

// ============================================================================
// Re-exports from sub-modules
// ============================================================================

export { userManagement } from './userManagement';
export { licenceeManagement } from './licenceeManagement';
export { locationManagement } from './locationManagement';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Checks if a user is a test account based on username, email, first name, or last name
 */
export function isTestUser(user: User): boolean {
  const testPattern = /^test/i;
  const username = user.username?.trim() || '';
  const email = (user.email || user.emailAddress || '').trim();
  const firstName = user.profile?.firstName?.trim() || '';
  const lastName = user.profile?.lastName?.trim() || '';

  return (
    testPattern.test(username) ||
    testPattern.test(email) ||
    testPattern.test(firstName) ||
    testPattern.test(lastName)
  );
}

/**
 * Filters out test users unless the current user is a developer
 */
export function filterTestUsers(
  users: User[],
  isDeveloper: boolean,
  isOwner: boolean = false
): User[] {
  if (isDeveloper || isOwner) {
    return users;
  }
  return users.filter(user => !isTestUser(user));
}

/**
 * Processes users by filtering test users then applying search and sort
 */
export function processUsers(
  allUsers: User[],
  searchValue: string,
  searchMode: 'username' | 'email' | '_id',
  sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null,
  isDeveloper: boolean = false,
  isOwner: boolean = false
): User[] {
  const filteredUsers = filterTestUsers(allUsers, isDeveloper, isOwner);
  return filterAndSortUsers(filteredUsers, searchValue, searchMode, sortConfig);
}

/**
 * Filters licencees based on search value
 */
export function filterLicencees(
  allLicencees: Licencee[],
  licenceeSearchValue: string
): Licencee[] {
  if (!licenceeSearchValue) return allLicencees;
  return allLicencees.filter(licencee =>
    licencee.name.toLowerCase().includes(licenceeSearchValue.toLowerCase())
  );
}

/**
 * Creates pagination data
 */
export function paginate<T>(items: T[], currentPage: number, itemsPerPage: number): {
  paginatedItems: T[];
  totalPages: number;
} {
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  return { paginatedItems, totalPages };
}

/**
 * Creates sort request handler
 */
export function createSortHandler(
  sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null,
  setSortConfig: (
    config: { key: SortKey; direction: 'ascending' | 'descending' } | null
  ) => void
): (key: SortKey) => void {
  return (key: SortKey): void => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
}

// ============================================================================
// Composed administrationUtils (backward-compatible)
// ============================================================================

export const administrationUtils = {
  userManagement,
  licenceeManagement,
  locationManagement,
  isTestUser,
  filterTestUsers,
  processUsers,
  filterLicencees,
  paginate,
  createSortHandler,
};
