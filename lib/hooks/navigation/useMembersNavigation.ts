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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  // Get current section from URL or default to "members"
  const currentSection = searchParams?.get('section') || 'members';
  const [activeTab, setActiveTab] = useState<MembersView>(
    (currentSection as MembersView) || 'members'
  );

  /**
   * Update URL when tab changes
   */
  const handleTabChange = useCallback(
    (value: string) => {
      const newSection = value as MembersView;
      setActiveTab(newSection);

      // Update URL with section parameter
      const params = new URLSearchParams(searchParams?.toString() || '');
      if (newSection === 'members') {
        params.delete('section'); // Remove section param for default
      } else {
        params.set('section', newSection);
      }

      const newUrl = `${pathname}?${params.toString()}`;
      router.push(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  /**
   * Update active tab when URL changes
   */
  useEffect(() => {
    const section = searchParams?.get('section');
    if (section === 'summary-report') {
      setActiveTab('summary-report');
    } else {
      setActiveTab('members');
    }
  }, [searchParams]);

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

  return {
    activeTab,
    availableTabs,
    handleTabClick,
    handleTabChange,
  };
}
