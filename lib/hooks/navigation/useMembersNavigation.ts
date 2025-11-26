import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '../auth';
import type { MembersView, MembersTab } from '@/shared/types/entities';

/**
 * Custom hook for managing members navigation logic
 * Handles URL state management, permission checking, and tab switching
 */
export function useMembersNavigation(membersTabsConfig: MembersTab[]) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  // Get current tab from URL or default to "members"
  const currentTab = searchParams?.get('tab') || 'members';
  const [activeTab, setActiveTab] = useState<MembersView>(
    (currentTab as MembersView) || 'members'
  );

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Update URL when tab changes
   */
  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as MembersView;
      setActiveTab(newTab);

      // Update URL with tab parameter - always include it
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', newTab);

      const newUrl = `${pathname}?${params.toString()}`;
      router.push(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Update active tab when URL changes
   */
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'summary-report' || tab === 'members') {
      setActiveTab(tab as MembersView);
    } else {
      // If tab is missing or invalid, set default and update URL
      setActiveTab('members');
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', 'members');
      const newUrl = `${pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  /**
   * All tabs are available for authenticated users
   */
  const availableTabs = useMemo(() => {
    if (!isAuthenticated || !user) return [];
    return membersTabsConfig;
  }, [isAuthenticated, user, membersTabsConfig]);

  /**
   * Handle tab click with permission check
   */
  const handleTabClick = useCallback(
    (tabId: string) => {
      const targetTab = availableTabs.find(tab => tab.id === tabId);
      if (!targetTab) {
        toast.error("You don't have permission to access this section");
        return;
      }
      handleTabChange(tabId);
    },
    [availableTabs, handleTabChange]
  );

  // ============================================================================
  // Return
  // ============================================================================
  return {
    activeTab,
    availableTabs,
    handleTabClick,
    handleTabChange,
  };
}
