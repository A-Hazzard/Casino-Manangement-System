import axios from 'axios';
import type {
  User,
  SortKey,
  ResourcePermissions,
} from '@/lib/types/administration';

/**
 * Fetches a list of users with full profile data.
 * @param licensee - (Optional) Licensee filter for users.
 * @param page - Page number (1-based, default: 1)
 * @param limit - Items per page (default: 50)
 * @param search - (Optional) Search term to filter users by username, email, or _id
 * @param searchMode - (Optional) Search mode: 'username', 'email', '_id', or 'all' (default: 'username', 'all' searches all fields)
 * @returns A promise that resolves to paginated users with pagination metadata.
 */
export const fetchUsers = async (
  licensee?: string,
  page: number = 1,
  limit: number = 50,
  search?: string,
  searchMode: 'username' | 'email' | '_id' | 'all' = 'username'
): Promise<{
  users: User[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const params: Record<string, string> = {};
  if (licensee && licensee !== 'all') {
    params.licensee = licensee;
  }
  if (search && search.trim()) {
    params.search = search.trim();
    params.searchMode = searchMode;
  }
  params.page = String(page);
  params.limit = String(limit);

  const response = await axios.get('/api/users', { params });
  return {
    users: response.data?.users || [],
    pagination:
      response.data?.pagination || {
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
    resourcePermissions: ResourcePermissions;
  }
) => {
  return axios.put('/api/users', user);
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
  resourcePermissions?: ResourcePermissions;
  rel?: {
    licencee?: string[];
  };
}) => {
  const response = await axios.post('/api/users', user);
  return response.data.user;
};
