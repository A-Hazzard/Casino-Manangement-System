import { useUserStore } from '@/lib/store/userStore';
import {
  CACHE_KEYS,
  fetchUserWithCache,
  userCache,
} from '@/lib/utils/userCache';
import type { UserAuthPayload } from '@/shared/types/auth';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';

type CurrentUserResponse = {
  success: boolean;
  user: {
    id: string;
    username: string;
    emailAddress: string;
    profile: UserAuthPayload['profile'];
    roles: string[];
    rel?: {
      licencee?: string[];
    };
    isEnabled: boolean;
    assignedLocations?: string[];
    assignedLicensees?: string[];
    createdAt: string;
    updatedAt: string;
    requiresProfileUpdate?: boolean;
    invalidProfileFields?: UserAuthPayload['invalidProfileFields'];
    invalidProfileReasons?: UserAuthPayload['invalidProfileReasons'];
  };
};

/**
 * Fetches current user data from API
 */
const fetchCurrentUser = async (): Promise<CurrentUserResponse> => {
  const data = await fetchUserWithCache<CurrentUserResponse | null>(
    CACHE_KEYS.CURRENT_USER,
    async () => {
      const response = await axios.get<CurrentUserResponse>(
        '/api/auth/current-user',
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    5 * 60 * 1000
  );

  if (!data) {
    throw new Error('Failed to load current user');
  }

  return data;
};

/**
 * React Query hook for current user
 * Automatically handles caching, deduplication, and synchronization
 * Updates the user store when data changes
 */
export function useCurrentUserQuery() {
  const { user: storeUser, setUser, clearUser } = useUserStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 401 errors (unauthorized) - this is expected when not logged in
      // @ts-expect-error - axios error structure
      if (error?.response?.status === 401) {
        return false;
      }
      // Retry once for other errors
      return failureCount < 1;
    },
    retryDelay: 1000,
  });

  // Sync React Query data with Zustand store
  useEffect(() => {
    if (data?.success && data?.user) {
      const dbUser = data.user;

      // Convert API response to UserAuthPayload format
      const userPayload: UserAuthPayload = {
        _id: dbUser.id,
        username: dbUser.username,
        emailAddress: dbUser.emailAddress,
        profile: dbUser.profile,
        roles: dbUser.roles,
        rel: dbUser.rel, // ✅ Include rel field
        isEnabled: dbUser.isEnabled,
        assignedLocations: dbUser.assignedLocations,
        assignedLicensees: dbUser.assignedLicensees,
        requiresProfileUpdate: dbUser.requiresProfileUpdate,
        invalidProfileFields: dbUser.invalidProfileFields,
        invalidProfileReasons: dbUser.invalidProfileReasons,
      };

      // Only update store if data has changed
      const hasChanged =
        JSON.stringify(storeUser) !== JSON.stringify(userPayload);

      if (hasChanged) {
        setUser(userPayload);

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ User store updated with assignedLicensees:', dbUser.assignedLicensees);
        }
      }

      userCache.set(
        CACHE_KEYS.CURRENT_USER,
        data,
        5 * 60 * 1000 // keep TTL aligned with query staleTime
      );
    }
  }, [data, setUser, storeUser]);

  // Handle authentication errors
  useEffect(() => {
    if (error) {
      // @ts-expect-error - axios error structure
      if (error?.response?.status === 401) {
        clearUser();
      }
    }
  }, [error, clearUser]);

  return {
    user: data?.user ?? null,
    isLoading,
    error: error ? 'Failed to fetch user data' : null,
    refetch,
    hasData: !!data?.success,
  };
}
