/**
 * Dashboard Scroll Custom Hook
 *
 * Provides a custom hook for managing dashboard scroll behavior and
 * floating refresh button visibility. It detects scroll position and
 * shows/hides the floating refresh button based on scroll threshold.
 *
 * Features:
 * - Tracks scroll position
 * - Controls floating refresh button visibility
 * - Configurable scroll threshold
 * - Proper cleanup of event listeners
 * - Reset functionality
 */

import { useState, useEffect, useCallback } from 'react';
import type { UseDashboardScrollReturn } from '@/lib/types/dashboardScroll';

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
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
