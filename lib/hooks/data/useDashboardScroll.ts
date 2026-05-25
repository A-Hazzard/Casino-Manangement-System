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

import { useState, useEffect } from 'react';
import type { UseDashboardScrollReturn } from '@/lib/types/dashboard';

export function useDashboardScroll(
  initialThreshold: number = 200
): UseDashboardScrollReturn {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);
  const [scrollThreshold, setScrollThreshold] = useState(initialThreshold);

  // ============================================================================
  // Handlers
  // ============================================================================

  // Handle scroll events to show/hide floating refresh button
  const handleScroll = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    setShowFloatingRefresh(scrollTop > scrollThreshold);
  };

  // ============================================================================
  // Effects
  // ============================================================================

  // Set up scroll event listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Reset scroll state — also a handler
  const resetScrollState = () => {
    setShowFloatingRefresh(false);
  };

  return {
    showFloatingRefresh,
    scrollThreshold,
    setScrollThreshold,
    resetScrollState,
  };
}
