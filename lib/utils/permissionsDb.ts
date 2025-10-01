import { UserRole, PageName, TabName } from "./permissions";

/**
 * Database-based permission utilities
 * These functions query the database for current user data instead of using the store
 */

/**
 * Fetches current user data from database for permission checks
 */
async function getCurrentUserFromDb(): Promise<{
  roles: UserRole[];
  enabled: boolean;
} | null> {
  try {
    const response = await fetch("/api/auth/current-user", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // User not authenticated
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.user) {
      return {
        roles: data.user.roles || [],
        enabled: data.user.enabled !== false,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching user from database:", error);
    return null;
  }
}

/**
 * Check if user has access to a page (database-based)
 */
export async function hasPageAccessDb(page: PageName): Promise<boolean> {
  const userData = await getCurrentUserFromDb();

  if (!userData || !userData.enabled) {
    return false;
  }

  const { roles } = userData;

  // Page permissions mapping
  const pagePermissions: Record<PageName, UserRole[]> = {
    dashboard: ["evolution admin", "admin", "manager", "location admin"],
    machines: [
      "evolution admin",
      "admin",
      "manager",
      "location admin",
      "technician",
      "collector",
      "collector meters",
    ],
    locations: ["evolution admin", "admin", "manager", "location admin"],
    "location-details": [
      "evolution admin",
      "admin",
      "manager",
      "location admin",
      "technician",
    ],
    members: ["evolution admin", "admin", "manager"],
    "member-details": ["evolution admin", "admin", "manager", "location admin"],
    "collection-report": [
      "evolution admin",
      "admin",
      "manager",
      "location admin",
      "collector",
      "collector meters",
    ],
    reports: ["evolution admin", "admin", "manager", "location admin"],
    sessions: [
      "evolution admin",
      "admin",
      "manager",
      "location admin",
      "technician",
    ],
    administration: ["evolution admin", "admin"],
  };

  const allowedRoles = pagePermissions[page] || [];
  return roles.some((role) => allowedRoles.includes(role));
}

/**
 * Check if user has access to a specific tab (database-based)
 */
export async function hasTabAccessDb(
  page: PageName,
  tab: TabName
): Promise<boolean> {
  const userData = await getCurrentUserFromDb();

  if (!userData || !userData.enabled) {
    return false;
  }

  const { roles } = userData;

  // Tab permissions mapping
  const tabPermissions: Record<string, Record<string, UserRole[]>> = {
    administration: {
      users: ["evolution admin", "admin"],
      licensees: ["evolution admin"],
      "activity-logs": ["evolution admin"],
    },
    "collection-reports": {
      collection: [
        "evolution admin",
        "admin",
        "manager",
        "location admin",
        "collector",
        "collector meters",
      ],
      monthly: ["evolution admin", "admin", "manager", "location admin"],
      "manager-schedules": ["evolution admin", "admin", "manager"],
      "collector-schedules": [
        "evolution admin",
        "admin",
        "manager",
        "location admin",
      ],
    },
    reports: {
      machines: [
        "evolution admin",
        "admin",
        "manager",
        "location admin",
        "technician",
      ],
      locations: ["evolution admin", "admin", "manager", "location admin"],
      meters: [
        "evolution admin",
        "admin",
        "manager",
        "location admin",
        "collector",
        "collector meters",
      ],
    },
  };

  const pageTabs = tabPermissions[page];
  if (!pageTabs) return false;

  const allowedRoles = pageTabs[tab] || [];
  return roles.some((role) => allowedRoles.includes(role));
}

/**
 * Check if user has admin access (database-based)
 */
export async function hasAdminAccessDb(): Promise<boolean> {
  const userData = await getCurrentUserFromDb();

  if (!userData || !userData.enabled) {
    return false;
  }

  const { roles } = userData;
  return roles.includes("evolution admin") || roles.includes("admin");
}

/**
 * Check if user should show navigation link (database-based)
 */
export async function shouldShowNavigationLinkDb(
  page: PageName
): Promise<boolean> {
  return await hasPageAccessDb(page);
}

/**
 * Get user's highest priority role (database-based)
 */
export async function getHighestPriorityRoleDb(): Promise<UserRole | null> {
  const userData = await getCurrentUserFromDb();

  if (!userData || !userData.enabled) {
    return null;
  }

  const { roles } = userData;

  const rolePriority: UserRole[] = [
    "evolution admin",
    "admin",
    "manager",
    "location admin",
    "technician",
    "collector",
    "collector meters",
  ];

  for (const role of rolePriority) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return null;
}
