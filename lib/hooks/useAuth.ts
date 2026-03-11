import { useCurrentUserQuery } from './useCurrentUserQuery';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Hook to get authentication state
 * Uses React Query for efficient data fetching and caching
 */
export function useAuth() {
  const { user } = useUserStore();
  const { isLoading } = useCurrentUserQuery();

  return {
    user,
    isLoading,
    isAuthenticated: !!user && user.isEnabled,
  };
}

