/**
 * Dashboard Scroll Types
 * Types for dashboard scroll behavior and floating refresh button.
 *
 * Controls visibility of floating refresh button based on scroll position
 * and provides scroll state management.
 */
export type UseDashboardScrollReturn = {
  showFloatingRefresh: boolean;
  scrollThreshold: number;
  setScrollThreshold: (threshold: number) => void;
  resetScrollState: () => void;
};

