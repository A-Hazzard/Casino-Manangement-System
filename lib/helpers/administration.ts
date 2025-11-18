import axios from 'axios';
import type {
  User,
  SortKey,
  ResourcePermissions,
} from '@/lib/types/administration';

/**
 * Fetches a list of users with full profile data.
 * @param licensee - (Optional) Licensee filter for users.
 * @returns A promise that resolves to an array of User objects with complete profile information.
 */
export const fetchUsers = async (licensee?: string): Promise<User[]> => {
  const params: Record<string, string> = {};
  if (licensee && licensee !== 'all') {
    params.licensee = licensee;
  }

  const response = await axios.get('/api/users', { params });
  return response.data?.users || [];
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
  searchMode: 'username' | 'email',
  sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null
): User[] => {
  let processedUsers = [...users];
  if (searchValue) {
    const lowerSearchValue = searchValue.toLowerCase();
    processedUsers = processedUsers.filter(user =>
      searchMode === 'username'
        ? user.username.toLowerCase().includes(lowerSearchValue)
        : (user.email || user.emailAddress || '')
            .toLowerCase()
            .includes(lowerSearchValue)
    );
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
