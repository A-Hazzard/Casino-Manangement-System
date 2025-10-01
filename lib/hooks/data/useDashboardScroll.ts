/**
 * Custom hook for managing dashboard scroll behavior and floating refresh button
 * Handles scroll detection and floating button visibility
 */

import { useState, useEffect, useCallback } from "react";

interface UseDashboardScrollReturn {
  showFloatingRefresh: boolean;
  scrollThreshold: number;
  setScrollThreshold: (threshold: number) => void;
  resetScrollState: () => void;
}

export function useDashboardScroll(
  initialThreshold: number = 200
): UseDashboardScrollReturn {
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);
  const [scrollThreshold, setScrollThreshold] = useState(initialThreshold);

  // Handle scroll events to show/hide floating refresh button
  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    setShowFloatingRefresh(scrollTop > scrollThreshold);
  }, [scrollThreshold]);

  // Set up scroll event listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Reset scroll state
  const resetScrollState = useCallback(() => {
    setShowFloatingRefresh(false);
  }, []);

  return {
    showFloatingRefresh,
    scrollThreshold,
    setScrollThreshold,
    resetScrollState,
  };
}
