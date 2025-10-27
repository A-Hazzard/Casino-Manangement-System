/**
 * Custom hook for managing administration section navigation and URL state
 * Handles section changes, URL synchronization, and navigation state
 */

import type { AdministrationSection } from '@/lib/constants/administration';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export const useAdministrationNavigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active section from URL search params, default to "users"
  const getActiveSectionFromURL = useCallback((): AdministrationSection => {
    const section = searchParams.get('section');
    console.log('🔄 [ADMIN HOOK] Getting section from URL:', section);
    if (section === 'licensees') return 'licensees';
    if (section === 'activity-logs') return 'activity-logs';
    return 'users';
  }, [searchParams]);

  const [activeSection, setActiveSection] = useState<AdministrationSection>(
    getActiveSectionFromURL()
  );

  // Handle section changes with URL updates
  const handleSectionChange = useCallback(
    (section: AdministrationSection) => {
      console.log(
        '🔄 [ADMIN HOOK] Changing section from',
        activeSection,
        'to',
        section
      );

      // Update state immediately for instant UI response
      setActiveSection(section);

      // Update URL
      const params = new URLSearchParams(searchParams.toString());
      if (section === 'users') {
        params.delete('section'); // Default section, no param needed
      } else {
        params.set('section', section);
      }

      const newURL = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      console.log('🔄 [ADMIN HOOK] Navigating to:', newURL);
      router.push(newURL, { scroll: false });
    },
    [activeSection, searchParams, pathname, router]
  );

  // Sync state with URL changes (only when searchParams change)
  useEffect(() => {
    const newSection = getActiveSectionFromURL();
    if (newSection !== activeSection) {
      console.log(
        '🔄 [ADMIN HOOK] URL changed, updating section from',
        activeSection,
        'to',
        newSection
      );
      setActiveSection(newSection);
    }
  }, [searchParams, activeSection, getActiveSectionFromURL]);

  return {
    activeSection,
    handleSectionChange,
  };
};
