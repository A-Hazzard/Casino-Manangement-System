import { useEffect, useState } from 'react';
import { useUserStore } from '@/lib/store/userStore';
import { fetchUserId } from '@/lib/helpers/user';
import axios from 'axios';
import type { UserAuthPayload } from '@/shared/types/auth';
import type { UseAuthReturn } from '@/lib/types/auth';

/**
 * Custom hook for authentication.
 *
 * Provides user authentication state and basic user information.
 *
 * @returns AuthState object with user data
 */
export function useAuth(): UseAuthReturn {
  // ============================================================================
  // State
  // ============================================================================
  const { user, setUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    const initializeAuth = async () => {
      if (!user) {
        try {
          const userId = await fetchUserId();
          if (userId) {
            const response = await axios.get(`/api/users/${userId}`);
            if (response.data.success) {
              const userData: UserAuthPayload = {
                _id: response.data.user._id,
                emailAddress: response.data.user.email,
                username: response.data.user.username || '',
                isEnabled: response.data.user.enabled,
                profile: response.data.user.profile || undefined,
              };
              setUser(userData);
            }
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [user, setUser]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    user: user as UserAuthPayload | null,
    isLoading,
    isAuthenticated: !!user && user.isEnabled,
  };
}

