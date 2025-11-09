import { UserRole, PageName, TabName } from './permissions';
import { fetchUserWithCache, CACHE_KEYS } from './userCache';

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
    const data = await fetchUserWithCache(
      CACHE_KEYS.CURRENT_USER,
      async () => {
        const response = await fetch('/api/auth/current-user', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated
            return null;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
      },
      5 * 60 * 1000 // 5 minute cache
    );

    if (data?.success && data?.user) {
      return {
        roles: data.user.roles || [],
        enabled: data.user.isEnabled !== false,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching user from database:', error);
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
    dashboard: ['developer', 'admin', 'manager'], // ✅ Removed 'location admin'
    machines: [
      'developer',
      'admin',
      'manager',
      'location admin',
      'technician',
      'collector',
      'collector meters',
    ],
    locations: ['developer', 'admin', 'manager', 'location admin'],
    'location-details': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'technician',
    ],
    members: ['developer'], // ✅ Restricted to developer only
    'member-details': ['developer'], // ✅ Restricted to developer only
    'collection-report': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'collector',
      'collector meters',
    ],
    reports: ['developer'], // ✅ Restricted to developer only
    sessions: ['developer'], // ✅ Restricted to developer only
    administration: ['developer', 'admin'],
  };

  const allowedRoles = pagePermissions[page] || [];
  return roles.some(role => allowedRoles.includes(role));
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
      users: ['developer', 'admin'],
      licensees: ['developer'],
      'activity-logs': ['developer'],
    },
    'collection-reports': {
      collection: [
        'developer',
        'admin',
        'manager',
        'location admin',
        'collector',
        'collector meters',
      ],
      monthly: ['developer', 'admin', 'manager', 'location admin'],
      'manager-schedules': ['developer', 'admin', 'manager'],
      'collector-schedules': [
        'developer',
        'admin',
        'manager',
        'location admin',
      ],
    },
    reports: {
      machines: [
        'developer',
        'admin',
        'manager',
        'location admin',
        'technician',
      ],
      locations: ['developer', 'admin', 'manager', 'location admin'],
      meters: [
        'developer',
        'admin',
        'manager',
        'location admin',
        'collector',
        'collector meters',
      ],
    },
  };

  const pageTabs = tabPermissions[page];
  if (!pageTabs) return false;

  const allowedRoles = pageTabs[tab] || [];
  return roles.some(role => allowedRoles.includes(role));
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
  return roles.includes('developer') || roles.includes('admin');
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
    'developer',
    'admin',
    'manager',
    'location admin',
    'technician',
    'collector',
    'collector meters',
  ];

  for (const role of rolePriority) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return null;
}
