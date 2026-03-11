/**
 * Members Tab Content Custom Hook
 *
 * Provides a custom hook for managing members tab content rendering and state.
 * It handles tab switching, content rendering, animation states, and provides
 * utilities for tab management.
 *
 * Features:
 * - Tab animation management
 * - Tab component selection
 * - Transition state tracking
 * - Animation props generation
 */

import { useCallback, useMemo } from 'react';
import {
  UseMembersTabContentProps,
  UseMembersTabContentReturn,
  TabAnimationProps,
} from '@/lib/types/hooks';

export function useMembersTabContent({
  activeTab,
  animations,
  tabComponents,
}: UseMembersTabContentProps): UseMembersTabContentReturn {
  // ============================================================================
  // Methods
  // ============================================================================

  // Get animation props for current tab
  const getTabAnimationProps = useCallback((): TabAnimationProps => {
    return {
      key: activeTab,
      variants: animations.tabVariants,
      initial: 'initial',
      animate: 'animate',
      exit: 'exit',
      transition: { duration: 0.2 },
      className: 'h-full',
    };
  }, [activeTab, animations.tabVariants]);

  // Check if tab is transitioning (for loading states)
  const isTabTransitioning = useMemo(() => {
    // This could be enhanced with actual transition state tracking
    return false;
  }, []);

  // Get current tab component
  const currentTabComponent = useMemo(() => {
    return tabComponents[activeTab];
  }, [activeTab, tabComponents]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    getTabAnimationProps,
    isTabTransitioning,
    currentTabComponent,
  };
}

