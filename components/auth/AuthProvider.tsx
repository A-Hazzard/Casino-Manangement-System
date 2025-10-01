"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUserStore } from "@/lib/store/userStore";

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider component that handles automatic token refresh
 * and prevents random logouts by managing authentication state
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();
  const hasInitialized = useRef(false);

  const { checkAndRefreshToken } = useAuth({
    refreshInterval: 10 * 60 * 1000, // Check every 10 minutes
    onTokenExpired: () => {
      // Only redirect to login if not already on login page or unauthorized page
      if (pathname !== "/login" && pathname !== "/unauthorized") {
        router.push("/login");
      }
    },
    onTokenRefreshed: () => {
      // Optionally show a subtle notification that session was extended
      if (process.env.NODE_ENV === "development") {
        console.warn("Token refreshed successfully");
      }
    },
  });

  // Check token validity when component mounts (if user is logged in)
  // But only do this once to prevent flickering
  useEffect(() => {
    if (user && !hasInitialized.current) {
      hasInitialized.current = true;
      checkAndRefreshToken();
    }
  }, [user, checkAndRefreshToken]);

  return <>{children}</>;
}
