import axios from "axios";
import type {
  User,
  SortKey,
  ResourcePermissions,
} from "@/lib/types/administration";

/**
 * Fetches a list of users with full profile data.
 * @returns A promise that resolves to an array of User objects with complete profile information.
 */
export const fetchUsers = async (): Promise<User[]> => {
  const response = await axios.get("/api/users");
  return response.data.users;
};

export const updateUser = async (
  user: Partial<User> & {
    password?: string;
    resourcePermissions: ResourcePermissions;
  }
) => {
  return axios.put("/api/users", user);
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
  searchMode: "username" | "email",
  sortConfig: { key: SortKey; direction: "ascending" | "descending" } | null
): User[] => {
  let processedUsers = [...users];
  if (searchValue) {
    const lowerSearchValue = searchValue.toLowerCase();
    processedUsers = processedUsers.filter((user) =>
      searchMode === "username"
        ? user.username.toLowerCase().includes(lowerSearchValue)
        : user.email.toLowerCase().includes(lowerSearchValue)
    );
  }
  if (sortConfig !== null && sortConfig.key) {
    const { key, direction } = sortConfig;
    processedUsers.sort((a, b) => {
      const valA = a[key!];
      const valB = b[key!];
      if (valA == null && valB != null)
        return direction === "ascending" ? -1 : 1;
      if (valA != null && valB == null)
        return direction === "ascending" ? 1 : -1;
      if (valA == null && valB == null) return 0;
      if (valA! < valB!) return direction === "ascending" ? -1 : 1;
      if (valA! > valB!) return direction === "ascending" ? 1 : -1;
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
}) => {
  const response = await axios.post("/api/users", user);
  return response.data.user;
};
