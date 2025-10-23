import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/userStore";
import { fetchUserId } from "@/lib/helpers/user";
import { fetchUserWithCache, CACHE_KEYS } from "@/lib/utils/userCache";
import axios from "axios";
import type { UserAuthPayload } from "@/shared/types/auth";

export function useAuth() {
  const { user, setUser, clearUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const validateAndInitializeAuth = async () => {
      if (!isInitialized) {
        try {
          const userId = await fetchUserId();

          // Get current user from store to avoid dependency issues
          const currentUser = useUserStore.getState().user;

          // If we have a user in localStorage but no userId from token, clear everything
          if (currentUser && !userId) {
            console.warn(
              "User in store but no valid token found, clearing auth state"
            );
            clearUser();
            return;
          }

          if (userId) {
            console.warn("Validating user existence in database:", userId);

            // Use cached user data to reduce API calls
            const userData = await fetchUserWithCache(
              `${CACHE_KEYS.CURRENT_USER}_${userId}`,
              async () => {
                const response = await axios.get(`/api/users/${userId}`);
                return response.data;
              },
              5 * 60 * 1000 // 5 minute cache
            );

            if (userData?.success && userData?.user) {
              const userPayload: UserAuthPayload = {
                _id: userData.user._id,
                emailAddress: userData.user.emailAddress,
                username: userData.user.username || "",
                isEnabled: userData.user.isEnabled,
                roles: userData.user.roles || [],
                profile: userData.user.profile || undefined,
              };
              console.warn(
                "User validated successfully:",
                userPayload.emailAddress
              );
              setUser(userPayload);
            } else {
              // User not found in database - clear all auth state
              console.warn("User not found in database, clearing auth state");
              clearUser();
              // Also clear localStorage and cookies
              if (typeof window !== "undefined") {
                localStorage.removeItem("user-auth-store");
                document.cookie =
                  "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie =
                  "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              }
            }
          } else {
            // No userId from token - clear user state if it exists
            if (currentUser) {
              console.warn(
                "No valid token but user in store, clearing auth state"
              );
              clearUser();
            }
          }
        } catch (error) {
          console.error("Failed to validate auth:", error);

          // Check if it's a 404 (user not found) or database mismatch error
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
              console.warn("User not found (404), clearing auth state");
            } else if (
              error.response?.data?.message?.includes(
                "Database context mismatch"
              )
            ) {
              console.warn("Database mismatch detected, clearing auth state");
            }
          }

          // Clear user state on any error
          clearUser();

          // Also clear localStorage and cookies on auth errors
          if (typeof window !== "undefined") {
            localStorage.removeItem("user-auth-store");
            document.cookie =
              "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie =
              "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          }
        } finally {
          // CRITICAL: Always set initialized and loading to false, even on error
          // This prevents the login page from getting stuck on skeleton loader
          setIsInitialized(true);
          setIsLoading(false);
        }
      }
    };

    validateAndInitializeAuth();
  }, [setUser, clearUser, isInitialized]); // Using getState() to access user without dependency

  return {
    user: user as UserAuthPayload | null,
    isLoading: isLoading || !isInitialized,
    isAuthenticated: !!user && user.isEnabled,
  };
}
