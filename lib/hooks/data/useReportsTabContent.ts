/**
 * Custom hook for managing reports tab content rendering and state
 * Handles tab switching, content rendering, and animation states
 */

import { useCallback, useMemo } from 'react';
import {
  UseReportsTabContentProps,
  UseReportsTabContentReturn,
  TabAnimationProps,
} from '@/lib/types/hooks';

export function useReportsTabContent({
  activeView,
  animations,
  tabComponents,
}: UseReportsTabContentProps): UseReportsTabContentReturn {
  // ============================================================================
  // Methods
  // ============================================================================

  // Get animation props for current tab
  const getTabAnimationProps = useCallback((): TabAnimationProps => {
    return {
      key: activeView,
      variants: animations.tabVariants,
      initial: 'initial',
      animate: 'animate',
      exit: 'exit',
      transition: { duration: 0.2 },
      className: 'w-full h-full',
    };
  }, [activeView, animations.tabVariants]);

  // Check if tab is transitioning (for loading states)
  const isTabTransitioning = useMemo(() => {
    // This could be enhanced with actual transition state tracking
    return false;
  }, []);

  // Get current tab component
  const currentTabComponent = useMemo(() => {
    return tabComponents[activeView] || tabComponents.locations;
  }, [activeView, tabComponents]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    getTabAnimationProps,
    isTabTransitioning,
    currentTabComponent,
  };
}
