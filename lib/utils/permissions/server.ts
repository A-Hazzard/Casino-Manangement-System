/**
 * Database Permission Utilities
 *
 * Database-based permission utilities that query the database for current user data.
 *
 * Features:
 * - Page access checking
 * - Tab access checking
 * - Admin access checking
 * - Navigation link visibility
 * - Role priority determination
 */

import { UserRole } from '@/lib/constants';
import { useUserStore } from '@/lib/store/userStore';
import {
  CACHE_KEYS,
  fetchUserWithCache,
} from '@/lib/services/userCacheService';
import { PageName } from './client';

// ============================================================================
// Type Definitions
// ============================================================================
/**
 * Fetches current user data from database for permission checks
 */
type MinimalUserPayload = {
  roles: UserRole[];
  enabled: boolean;
};

// ============================================================================
// User Data Fetching Functions
// ============================================================================
/**
 * Get user data from store
 */
function getUserFromStore(): MinimalUserPayload | null {
  try {
    const { user } = useUserStore.getState();
    if (!user) return null;

    return {
      roles: (user.roles || []) as UserRole[],
      enabled: user.isEnabled !== false,
    };
  } catch (error) {
    console.error('Failed to read user store:', error);
    return null;
  }
}

async function getCurrentUserFromDb(): Promise<MinimalUserPayload | null> {
  const storeUser = getUserFromStore();
  if (storeUser && storeUser.roles.length > 0) {
    return storeUser;
  }

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

// ============================================================================
// Page Access Functions
// ============================================================================
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
    dashboard: ['developer', 'admin', 'manager', 'location admin'], // ✅ Location admin can access dashboard
    machines: [
      'developer',
      'admin',
      'manager',
      'location admin',
      'technician',
      'collector',
    ],
    locations: ['developer', 'admin', 'manager', 'location admin', 'collector'],
    'location-details': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'technician',
      'collector',
    ],
    members: ['developer', 'admin'],
    'member-details': ['developer', 'admin'],
    'collection-report': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'collector',
    ],
    reports: ['developer', 'admin', 'manager', 'location admin'], // ✅ Restricted to developer, admin, manager, and location admin
    sessions: ['developer', 'admin'],
    administration: ['developer', 'admin', 'manager', 'location admin'],
    'vault-management': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'vault-manager',
    ],
    'vault-cashier': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'cashier',
    ],
    'vault-role-selection': [
      'developer',
      'admin',
      'manager',
      'location admin',
      'vault-manager',
      'cashier',
    ],
  };

  const allowedRoles = pagePermissions[page] || [];
  return roles.some(role => allowedRoles.includes(role));
}

// ============================================================================
// Admin Access Functions
// ============================================================================
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

// ============================================================================
// Navigation Functions
// ============================================================================
/**
 * Check if user should show navigation link (database-based)
 */
export async function shouldShowNavigationLinkDb(
  page: PageName
): Promise<boolean> {
  return await hasPageAccessDb(page);
}
