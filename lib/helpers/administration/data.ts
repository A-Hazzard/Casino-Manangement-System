/**
 * Administration Helper Functions
 *
 * Provides helper functions for user management operations including fetching,
 * creating, updating, and filtering users. It handles API communication for
 * administration features and includes utilities for user data processing.
 *
 * Features:
 * - Fetches users with filtering, searching, and pagination
 * - Creates new users
 * - Updates existing users
 * - Filters and sorts user data
 * - Supports role and status filtering
 * - Handles search across multiple fields
 */

import type {
  SortKey,
  User,
} from '@/lib/types/administration';
import axios from 'axios';

/**
 * Fetches a list of users with full profile data.
 * @param licensee - (Optional) Licensee filter for users.
 * @param page - Page number (1-based, default: 1)
 * @param limit - Items per page (default: 50)
 * @param search - (Optional) Search term to filter users by username, email, or _id
 * @param searchMode - (Optional) Search mode: 'username', 'email', '_id', or 'all' (default: 'username', 'all' searches all fields)
 * @param status - (Optional) Status filter: 'all', 'active', 'disabled', or 'deleted' (default: 'all')
 * @param role - (Optional) Role filter: 'all', 'developer', 'admin', 'manager', 'location admin', 'technician', 'collector' (default: 'all')
 * @returns A promise that resolves to paginated users with pagination metadata.
 */
export const fetchUsers = async (
  licensee?: string,
  page: number = 1,
  limit: number = 50,
  search?: string,
  searchMode: 'username' | 'email' | '_id' | 'all' = 'username',
  status: 'all' | 'active' | 'disabled' | 'deleted' = 'all',
  role?: string
): Promise<{
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const params: Record<string, string> = {};
  if (licensee && licensee !== 'all') {
    params.licensee = licensee;
  }
  if (search && search.trim()) {
    params.search = search.trim();
    params.searchMode = searchMode;
  }
  if (status && status !== 'all') {
    params.status = status;
  }
  if (role && role !== 'all') {
    params.role = role;
  }
  params.page = String(page);
  params.limit = String(limit);

  const response = await axios.get('/api/users', { params });
  return {
    users: response.data?.users || [],
    pagination: response.data?.pagination || {
      page: 1,
      limit,
      total: 0,
      totalPages: 0,
    },
  };
};

export const updateUser = async (
  user: Partial<User> & {
    password?: string;
  }
) => {
  if (!user._id) {
    throw new Error('User ID is required for update');
  }
  return axios.patch(`/api/users/${user._id}`, user);
};

/**
 * Filters and sorts an array of users based on search criteria and sort configuration.
 *
 * @param users - The array of User objects to process.
 * @param searchValue - The term to search for in usernames or emails.
 * @param searchMode - Specifies whether to search by 'username' or 'email'.
 * @param sortConfig - An object defining the key to sort by and the sort direction ('ascending' or 'descending'). Can be null if no sorting is applied.
 * @returns A new array containing the filtered and sorted users.
 */
export const filterAndSortUsers = (
  users: User[],
  searchValue: string,
  searchMode: 'username' | 'email' | '_id',
  sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null
): User[] => {
  let processedUsers = [...users];
  if (searchValue) {
    const lowerSearchValue = searchValue.toLowerCase();
    processedUsers = processedUsers.filter(user => {
      if (searchMode === 'username') {
        // Add null/undefined check for username
        const username = user.username || '';
        return username.toLowerCase().includes(lowerSearchValue);
      } else if (searchMode === 'email') {
        return (user.email || user.emailAddress || '')
          .toLowerCase()
          .includes(lowerSearchValue);
      } else if (searchMode === '_id') {
        // Search by _id (exact match or partial match)
        const userId = String(user._id || '').toLowerCase();
        return userId.includes(lowerSearchValue);
      }
      return false;
    });
  }
  if (sortConfig !== null && sortConfig.key) {
    const { key, direction } = sortConfig;
    processedUsers.sort((a, b) => {
      // Handle name field - sort by firstName first, then lastName
      if (key === 'name') {
        const firstNameA = (a.profile?.firstName || '').toLowerCase().trim();
        const firstNameB = (b.profile?.firstName || '').toLowerCase().trim();
        const lastNameA = (a.profile?.lastName || '').toLowerCase().trim();
        const lastNameB = (b.profile?.lastName || '').toLowerCase().trim();

        // First compare by firstName
        if (firstNameA < firstNameB) return direction === 'ascending' ? -1 : 1;
        if (firstNameA > firstNameB) return direction === 'ascending' ? 1 : -1;

        // If firstNames are equal, compare by lastName
        if (lastNameA < lastNameB) return direction === 'ascending' ? -1 : 1;
        if (lastNameA > lastNameB) return direction === 'ascending' ? 1 : -1;

        // If both are equal, maintain order
        return 0;
      }

      let valA: unknown = a[key!];
      let valB: unknown = b[key!];

      // Handle email field - check both email and emailAddress
      if (key === 'emailAddress') {
        valA = a.email || a.emailAddress;
        valB = b.email || b.emailAddress;
      }

      // Handle date fields
      if (key === 'lastLoginAt') {
        valA = valA ? new Date(valA as string | Date).getTime() : null;
        valB = valB ? new Date(valB as string | Date).getTime() : null;
      }

      // Handle string comparison (case-insensitive for text fields)
      if (typeof valA === 'string' && typeof valB === 'string') {
        const lowerA = valA.toLowerCase();
        const lowerB = valB.toLowerCase();
        if (lowerA < lowerB) return direction === 'ascending' ? -1 : 1;
        if (lowerA > lowerB) return direction === 'ascending' ? 1 : -1;
        return 0;
      }

      // Handle null/undefined values
      if (valA == null && valB != null)
        return direction === 'ascending' ? -1 : 1;
      if (valA != null && valB == null)
        return direction === 'ascending' ? 1 : -1;
      if (valA == null && valB == null) return 0;

      // Handle numeric and boolean comparison
      if (valA! < valB!) return direction === 'ascending' ? -1 : 1;
      if (valA! > valB!) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }
  return processedUsers;
};

export const createUser = async (user: {
  username: string;
  emailAddress: string;
  password: string;
  roles: string[];
  profile?: {
    firstName?: string;
    lastName?: string;
    gender?: string;
  };
  isEnabled?: boolean;
  profilePicture?: string | null;
  assignedLicensees?: string[];
  assignedLocations?: string[];
}) => {
  const response = await axios.post('/api/users', user);
  return response.data.user;
};

