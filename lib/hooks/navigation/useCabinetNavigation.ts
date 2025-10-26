/**
 * Custom hook for managing cabinet section navigation and URL state
 * Handles section changes, URL synchronization, and navigation state
 */

import type { CabinetSection } from '@/lib/constants/cabinets';
import {
    getActiveSectionFromURL,
    handleSectionChange as handleSectionChangeHelper,
} from '@/lib/helpers/cabinetsPage';
import type { UseCabinetNavigationReturn } from '@/lib/types/cabinets';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export const useCabinetNavigation = (): UseCabinetNavigationReturn => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active section from URL search params, default to "cabinets"
  const getActiveSectionFromURLLocal = useCallback((): CabinetSection => {
    const section = getActiveSectionFromURL(searchParams);
    console.warn('Getting active section from URL:', section);
    return section;
  }, [searchParams]);

  const [activeSection, setActiveSection] = useState<CabinetSection>(
    getActiveSectionFromURLLocal()
  );

  // Handle section changes with URL updates
  const handleSectionChange = useCallback(
    (section: CabinetSection) => {
      console.warn('Changing section from', activeSection, 'to', section);
      // Update state immediately for instant UI response
      setActiveSection(section);
      // Update URL asynchronously (don't block UI)
      setTimeout(() => {
        handleSectionChangeHelper(section, searchParams, pathname, router);
      }, 0);
    },
    [activeSection, searchParams, pathname, router]
  );

  // Sync state with URL changes
  useEffect(() => {
    const newSection = getActiveSectionFromURLLocal();
    if (newSection !== activeSection) {
      console.warn(
        'URL changed, updating active section from',
        activeSection,
        'to',
        newSection
      );
      setActiveSection(newSection);
    }
  }, [searchParams, activeSection, getActiveSectionFromURLLocal]);

  return {
    activeSection,
    handleSectionChange,
  };
};
