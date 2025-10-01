import { useEffect, useCallback, useRef } from "react";
import { useUserStore } from "@/lib/store/userStore";
import { toast } from "sonner";

interface TokenRefreshOptions {
  refreshInterval?: number; // Default 10 minutes (check every 10 min for 15 min tokens)
  onTokenExpired?: () => void;
  onTokenRefreshed?: () => void;
}

/**
 * Custom hook for automatic token refresh and authentication management
 * Prevents random logouts by automatically refreshing tokens before they expire
 */
export function useAuth(options: TokenRefreshOptions = {}) {
  const { user, clearUser } = useUserStore();
  const {
    refreshInterval = 10 * 60 * 1000, // 10 minutes
    onTokenExpired,
    onTokenRefreshed,
  } = options;

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  /**
   * Attempt to refresh the access token using the refresh token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      return false; // Already refreshing
    }

    try {
      isRefreshingRef.current = true;

      // Get refresh token from cookies (it's httpOnly, so we need to call our API)
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: "auto" }), // Server will get refresh token from cookies
      });

      if (response.ok) {
        onTokenRefreshed?.();
        return true;
      } else {
        // Refresh token is invalid or expired
        const errorData = await response.json();
        console.warn("Token refresh failed:", errorData.message);
        return false;
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onTokenRefreshed]);

  /**
   * Check if the current token is valid and refresh if needed
   */
  const checkAndRefreshToken = useCallback(async (): Promise<boolean> => {
    try {
      // Check if we have a valid token by calling the token endpoint
      const response = await fetch("/api/auth/token");

      if (response.ok) {
        // Token is still valid
        return true;
      } else if (response.status === 401) {
        // Token is expired, try to refresh
        const refreshSuccess = await refreshToken();

        if (!refreshSuccess) {
          // Refresh failed, user needs to login again
          if (process.env.NODE_ENV === "development") {
            console.warn("Token refresh failed, logging out user");
          }
          toast.error("Your session has expired. Please log in again.");
          clearUser();
          onTokenExpired?.();
          return false;
        }

        return true;
      } else {
        // Other error
        console.error("Token check failed with status:", response.status);
        return false;
      }
    } catch (error) {
      console.error("Token check error:", error);
      return false;
    }
  }, [refreshToken, clearUser, onTokenExpired]);

  /**
   * Set up automatic token refresh interval
   */
  const startTokenRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearInterval(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setInterval(async () => {
      if (user) {
        // Only check if user is logged in
        await checkAndRefreshToken();
      }
    }, refreshInterval);
  }, [user, checkAndRefreshToken, refreshInterval]);

  /**
   * Stop automatic token refresh
   */
  const stopTokenRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearInterval(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Set up automatic token refresh when user is logged in
  useEffect(() => {
    if (user) {
      // Start the refresh interval
      startTokenRefresh();

      // Also check immediately when user is set
      checkAndRefreshToken();
    } else {
      // Stop refresh when user is logged out
      stopTokenRefresh();
    }

    return () => {
      stopTokenRefresh();
    };
  }, [user, startTokenRefresh, stopTokenRefresh, checkAndRefreshToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTokenRefresh();
    };
  }, [stopTokenRefresh]);

  return {
    refreshToken,
    checkAndRefreshToken,
    startTokenRefresh,
    stopTokenRefresh,
    isRefreshing: isRefreshingRef.current,
  };
}
