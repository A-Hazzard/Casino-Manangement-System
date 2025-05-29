import type { User, SortKey } from "@/lib/types/administration";

// Copied from app/administration/page.tsx - ensure this matches your User type definition
const mockUsersData: User[] = [
  {
    name: "Sadmin",
    username: "admin",
    email: "example1@example.com",
    enabled: true,
    roles: ["admin"],
    profilePicture: null,
  },
  {
    name: "App Reviewer",
    username: "reviewer",
    email: "example2@example.com",
    enabled: false,
    roles: ["reviewer"],
    profilePicture: null,
  },
  {
    name: "Manager T",
    username: "manager",
    email: "example3@example.com",
    enabled: true,
    roles: ["manager"],
    profilePicture: null,
  },
  {
    name: "TTG Collector 1",
    username: "collector 1",
    email: "example4@example.com",
    enabled: false,
    roles: ["collector"],
    profilePicture: null,
  },
  {
    name: "TTG Collector 2",
    username: "collector 2",
    email: "example5@example.com",
    enabled: true,
    roles: ["collector", "collectormeters"],
    profilePicture: null,
  },
];

/**
 * Fetches a list of users.
 * @returns A promise that resolves to an array of User objects.
 * @remarks This is currently a placeholder and returns mock data.
 *          Replace with actual API call in the future.
 */
export const fetchUsers = async (): Promise<User[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [...mockUsersData]; // Return a copy to prevent direct mutation if an API call would
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
  let processedUsers = [...users]; // Start with a copy to avoid mutating the original array

  // Apply search filter
  if (searchValue) {
    const lowerSearchValue = searchValue.toLowerCase();
    processedUsers = processedUsers.filter((user) =>
      searchMode === "username"
        ? user.username.toLowerCase().includes(lowerSearchValue)
        : user.email.toLowerCase().includes(lowerSearchValue)
    );
  }

  // Apply sorting
  if (sortConfig !== null && sortConfig.key) {
    const { key, direction } = sortConfig;
    processedUsers.sort((a, b) => {
      const valA = a[key!];
      const valB = b[key!];

      // Handle null/undefined values consistently
      if (valA == null && valB != null)
        return direction === "ascending" ? -1 : 1;
      if (valA != null && valB == null)
        return direction === "ascending" ? 1 : -1;
      if (valA == null && valB == null) return 0;

      // Perform comparison
      if (valA! < valB!) return direction === "ascending" ? -1 : 1;
      if (valA! > valB!) return direction === "ascending" ? 1 : -1;
      return 0;
    });
  }

  return processedUsers;
};
