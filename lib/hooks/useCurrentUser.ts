import { useEffect, useState, useCallback, useRef } from 'react';
import { useUserStore } from '@/lib/store/userStore';
import axios from 'axios';
import type { CurrentUserData, UseCurrentUserReturn } from '@/lib/types/user';
import { fetchUserWithCache, CACHE_KEYS } from '@/lib/utils/userCache';

/**
 * Hook to fetch current user data from database and detect changes
 * Automatically updates the user store when changes are detected
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const { user, setUser, clearUser } = useUserStore();
  const [currentUser, setCurrentUser] = useState<CurrentUserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchCurrentUser = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const cachedData = await fetchUserWithCache(
        CACHE_KEYS.CURRENT_USER,
        async () => {
          const response = await axios.get('/api/auth/current-user', {
            withCredentials: true, // Include cookies for authentication
          });
          return response.data;
        },
        2 * 60 * 1000 // 2 minutes cache
      );

      if (!cachedData) {
        setError('Failed to fetch user data');
        hasFetchedRef.current = false;
        return;
      }

      const response = { data: cachedData };

      if (response.data.success) {
        const dbUser = response.data.user;
        setCurrentUser(dbUser);

        // If no user in store, set the user from database
        if (!user) {
          setUser({
            _id: dbUser.id,
            username: dbUser.username,
            emailAddress: dbUser.emailAddress,
            profile: dbUser.profile,
            roles: dbUser.roles,
            isEnabled: dbUser.enabled,
            resourcePermissions: dbUser.resourcePermissions,
          });
          setHasChanges(false);
        } else {
          // Compare with current store data to detect changes
          const hasRoleChanges =
            JSON.stringify(user.roles) !== JSON.stringify(dbUser.roles);
          const hasProfileChanges =
            JSON.stringify(user.profile) !== JSON.stringify(dbUser.profile);
          const hasPermissionChanges =
            JSON.stringify(user.resourcePermissions) !==
            JSON.stringify(dbUser.resourcePermissions);
          const hasEnabledChanges = user.isEnabled !== dbUser.enabled;

          const hasAnyChanges =
            hasRoleChanges ||
            hasProfileChanges ||
            hasPermissionChanges ||
            hasEnabledChanges;
          setHasChanges(hasAnyChanges);

          if (hasAnyChanges) {
            // Update the user store with fresh data from database
            setUser({
              ...user,
              roles: dbUser.roles,
              profile: dbUser.profile,
              resourcePermissions: dbUser.resourcePermissions,
              isEnabled: dbUser.enabled,
            });

            // Log the changes for debugging
            if (process.env.NODE_ENV === 'development') {
              console.warn('User data updated from database:', {
                roleChanges: hasRoleChanges,
                profileChanges: hasProfileChanges,
                permissionChanges: hasPermissionChanges,
                enabledChanges: hasEnabledChanges,
                newRoles: dbUser.roles,
                newProfile: dbUser.profile,
              });
            }
          }
        }
      } else {
        setError('Failed to fetch user data');
      }
    } catch (error: unknown) {
      console.error('Error fetching current user:', error);
      hasFetchedRef.current = false;

      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status === 401
      ) {
        // Token expired or invalid, clear user
        clearUser();
        setError('Session expired');
      } else if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ECONNABORTED'
      ) {
        setError('Request timeout');
      } else {
        setError('Failed to fetch user data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, setUser, clearUser]);

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Fetch user data when component mounts
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    currentUser,
    isLoading,
    error,
    refreshUser,
    hasChanges,
  };
}
