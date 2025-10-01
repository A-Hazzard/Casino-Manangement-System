"use client";

import { useEffect, useRef, useCallback } from "react";
import axios from "axios";

/**
 * Hook to monitor user activity and refresh authentication token
 * Prevents session expiration while user is actively using the application
 * 
 * @param enabled - Whether to enable activity monitoring (default: true)
 * @param refreshInterval - Interval to check for activity and refresh token (default: 5 minutes)
 */
export function useActivityMonitor(
  enabled: boolean = true,
  refreshInterval: number = 5 * 60 * 1000 // 5 minutes
) {
  const lastActivityRef = useRef<number>(Date.now());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Refresh authentication token if user has been active
  const refreshToken = useCallback(async () => {
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    
    // Only refresh if user was active in the last 5 minutes
    if (timeSinceLastActivity < refreshInterval) {
      try {
        const response = await axios.post("/api/auth/refresh-token");
        if (response.data?.success) {
          if (process.env.NODE_ENV === "development") {
            console.warn("✅ Token refreshed due to user activity");
          }
        }
      } catch (error) {
        // Silently fail - don't log out user, just skip this refresh
        // The middleware will handle actual token expiration
        if (process.env.NODE_ENV === "development") {
          console.warn("Token refresh skipped (will retry next interval):", error);
        }
      }
    }
  }, [refreshInterval]);

  useEffect(() => {
    if (!enabled) return;

    // Activity event listeners
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // Throttle activity updates to avoid excessive calls
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledUpdateActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          updateActivity();
          throttleTimeout = null;
        }, 1000); // Throttle to once per second
      }
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, throttledUpdateActivity, { passive: true });
    });

    // Set up periodic token refresh check
    refreshTimerRef.current = setInterval(refreshToken, refreshInterval);

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, throttledUpdateActivity);
      });

      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }

      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [enabled, refreshInterval, updateActivity, refreshToken]);

  return { lastActivity: lastActivityRef.current };
}

