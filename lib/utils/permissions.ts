/**
 * Role-Based Access Control (RBAC) Permission Utilities
 *
 * This module provides utility functions for checking user permissions
 * based on their roles in the Evolution One Casino Management System.
 *
 * Role Hierarchy (Highest to Lowest Priority):
 * 1. Evolution Admin - Full platform access
 * 2. Admin - High-level administrative functions
 * 3. Manager - Operational oversight
 * 4. Location Admin - Location-specific management
 * 5. Technician - Technical operations
 * 6. Collector - Collection operations
 * 7. Collector Meters - Meter-specific collections
 */

export type UserRole =
  | "evolution admin"
  | "admin"
  | "manager"
  | "location admin"
  | "technician"
  | "collector"
  | "collector meters";

export type PageName =
  | "dashboard"
  | "machines"
  | "locations"
  | "location-details"
  | "members"
  | "member-details"
  | "collection-report"
  | "reports"
  | "sessions"
  | "administration";

export type TabName =
  | "administration-users"
  | "administration-licensees"
  | "administration-activity-logs"
  | "collection-reports-monthly"
  | "collection-reports-manager-schedules"
  | "collection-reports-collector-schedules";

/**
 * Check if user has access to a specific page
 * @param userRoles - Array of user's roles
 * @param page - Page name to check access for
 * @returns boolean indicating if user has access
 */
export const hasPageAccess = (userRoles: string[], page: PageName): boolean => {
  const pagePermissions: Record<PageName, string[]> = {
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
    "member-details": [
      "evolution admin",
      "admin",
      "manager",
      "location admin",
      "technician",
    ],
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

  const requiredRoles = pagePermissions[page] || [];
  return requiredRoles.some((role) => userRoles.includes(role));
};

/**
 * Check if user has access to a specific tab within a page
 * @param userRoles - Array of user's roles
 * @param page - Page name
 * @param tab - Tab name
 * @returns boolean indicating if user has access
 */
export const hasTabAccess = (
  userRoles: string[],
  page: string,
  tab: string
): boolean => {
  const tabPermissions: Record<string, string[]> = {
    "administration-users": ["evolution admin", "admin"],
    "administration-licensees": ["evolution admin"],
    "administration-activity-logs": ["evolution admin"],
    "collection-reports-monthly": [
      "evolution admin",
      "admin",
      "manager",
      "location admin",
    ],
    "collection-reports-manager-schedules": [
      "evolution admin",
      "admin",
      "manager",
    ],
    "collection-reports-collector-schedules": [
      "evolution admin",
      "admin",
      "manager",
      "location admin",
    ],
  };

  const key = `${page}-${tab}`;
  const requiredRoles = tabPermissions[key] || [];
  return requiredRoles.some((role) => userRoles.includes(role));
};

/**
 * Check if user has the highest priority role (Evolution Admin)
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user is Evolution Admin
 */
export const isEvolutionAdmin = (userRoles: string[]): boolean => {
  return userRoles.includes("evolution admin");
};

/**
 * Check if user has admin-level access (Evolution Admin or Admin)
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has admin access
 */
export const hasAdminAccess = (userRoles: string[]): boolean => {
  return userRoles.includes("evolution admin") || userRoles.includes("admin");
};

/**
 * Check if user has manager-level access or higher
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has manager access
 */
export const hasManagerAccess = (userRoles: string[]): boolean => {
  return ["evolution admin", "admin", "manager"].some((role) =>
    userRoles.includes(role)
  );
};

/**
 * Check if user has location admin access or higher
 * @param userRoles - Array of user's roles
 * @returns boolean indicating if user has location admin access
 */
export const hasLocationAdminAccess = (userRoles: string[]): boolean => {
  return ["evolution admin", "admin", "manager", "location admin"].some(
    (role) => userRoles.includes(role)
  );
};

/**
 * Get user's highest priority role
 * @param userRoles - Array of user's roles
 * @returns string representing the highest priority role
 */
export const getHighestPriorityRole = (userRoles: string[]): string => {
  const roleHierarchy: UserRole[] = [
    "evolution admin",
    "admin",
    "manager",
    "location admin",
    "technician",
    "collector",
    "collector meters",
  ];

  for (const role of roleHierarchy) {
    if (userRoles.includes(role)) {
      return role;
    }
  }

  return "viewer"; // Default fallback
};

/**
 * Check if user can access a specific location
 * @param userRoles - Array of user's roles
 * @param userLocations - Array of location IDs user has access to
 * @param targetLocationId - Location ID to check access for
 * @returns boolean indicating if user can access the location
 */
export const canAccessLocation = (
  userRoles: string[],
  userLocations: string[],
  targetLocationId: string
): boolean => {
  // Evolution Admin and Admin can access all locations
  if (hasAdminAccess(userRoles)) {
    return true;
  }

  // Other roles can only access their assigned locations
  return userLocations.includes(targetLocationId);
};

/**
 * Get accessible licensees for a user based on their locations
 * @param userRoles - Array of user's roles
 * @param userLocations - Array of location IDs user has access to
 * @param allLicensees - Array of all available licensees
 * @returns Array of licensee IDs the user can access
 */
export const getAccessibleLicensees = (
  userRoles: string[],
  userLocations: string[],
  allLicensees: Array<{ id: string; locations: string[] }>
): string[] => {
  // Evolution Admin and Admin can access all licensees
  if (hasAdminAccess(userRoles)) {
    return allLicensees.map((l) => l.id);
  }

  // Other roles can only access licensees for their assigned locations
  const accessibleLicenseeIds = new Set<string>();

  for (const licensee of allLicensees) {
    const hasLocationAccess = licensee.locations.some((locationId) =>
      userLocations.includes(locationId)
    );

    if (hasLocationAccess) {
      accessibleLicenseeIds.add(licensee.id);
    }
  }

  return Array.from(accessibleLicenseeIds);
};

/**
 * Check if user should see navigation link for a page
 * @param userRoles - Array of user's roles
 * @param page - Page name
 * @returns boolean indicating if navigation link should be shown
 */
export const shouldShowNavigationLink = (
  userRoles: string[],
  page: PageName
): boolean => {
  // Special cases for direct link access
  if (page === "location-details" || page === "member-details") {
    return false; // These are accessed via direct links only
  }

  return hasPageAccess(userRoles, page);
};

/**
 * Get user's role display name
 * @param userRoles - Array of user's roles
 * @returns string representing the user's primary role for display
 */
export const getRoleDisplayName = (userRoles: string[]): string => {
  const roleDisplayNames: Record<string, string> = {
    "evolution admin": "Evolution Admin",
    admin: "Administrator",
    manager: "Manager",
    "location admin": "Location Admin",
    technician: "Technician",
    collector: "Collector",
    "collector meters": "Collector Meters",
  };

  const highestRole = getHighestPriorityRole(userRoles);
  return roleDisplayNames[highestRole] || "User";
};
