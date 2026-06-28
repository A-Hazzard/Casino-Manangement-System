'use client';

import { type ReactElement, useCallback, useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

// Layout components
import ReportsDateFilters from '@/components/CMS/reports/ReportsDateFilters';
import ReportsNavigation from '@/components/CMS/reports/ReportsNavigation';
import ReportsLocationsTabWithErrorHandling from '@/components/CMS/reports/tabs/locations/ReportsLocationsTabWithErrorHandling';
import ReportsMachinesTab from '@/components/CMS/reports/tabs/machines/ReportsMachinesTab';
import ReportsMetersTab from '@/components/CMS/reports/tabs/meters/ReportsMetersTab';
import PageLayout from '@/components/shared/layout/PageLayout';
import { useRegisterRefresh } from '@/lib/contexts/RefreshContext';
import {
  IMAGES,
  REPORTS_ANIMATIONS,
  REPORTS_TABS_CONFIG,
} from '@/lib/constants';
import { useReportsTabContent } from '@/lib/hooks/data';
import { useReportsNavigation } from '@/lib/hooks/navigation';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import type { ReportView } from '@/shared/types/reports';
import Image from 'next/image';

/**
 * Reports Page Content Component
 * Main content component for the reports page with tab navigation and layout.
 *
 * Features:
 * - Tab-based navigation (Locations, Machines, Meters)
 * - Licencee selection integration
 * - Date filters
 * - Tab content rendering with suspense
 * - Loading states and overlays
 * - Access denied states
 * - Framer Motion animations
 * - Responsive layout
 */
export default function ReportsPageContent() {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { user } = useUserStore();

  // Check user roles
  const userRoles = useMemo(() => {
    const roles = user?.roles || [];
    return roles.map(role =>
      typeof role === 'string' ? role.toLowerCase() : ''
    );
  }, [user?.roles]);

  const isDeveloper = useMemo(() => {
    return userRoles.includes('developer');
  }, [userRoles]);

  const isAdmin = useMemo(() => {
    return userRoles.includes('admin');
  }, [userRoles]);

  const isLocationAdmin = useMemo(() => {
    return userRoles.includes('location admin');
  }, [userRoles]);

  const isOwner = useMemo(() => {
    return userRoles.includes('owner');
  }, [userRoles]);

  // Filter tabs based on maintenance state and user role
  // Developers: all tabs (minus maintenance)
  // Admins, Owners, and Location Admins: meters and locations tabs (minus maintenance)
  // Others: only meters tab (minus maintenance)
  const availableTabs = useMemo(() => {
    const notUnderMaintenance = (tab: (typeof REPORTS_TABS_CONFIG)[number]) =>
      tab.available !== false;

    if (isDeveloper) {
      return REPORTS_TABS_CONFIG.filter(notUnderMaintenance);
    }
    if (isAdmin || isLocationAdmin || isOwner) {
      return REPORTS_TABS_CONFIG.filter(
        tab =>
          notUnderMaintenance(tab) &&
          (tab.id === 'meters' || tab.id === 'locations')
      );
    }
    // Others only see meters tab
    return REPORTS_TABS_CONFIG.filter(
      tab => notUnderMaintenance(tab) && tab.id === 'meters'
    );
  }, [isDeveloper, isAdmin, isLocationAdmin, isOwner]);

  const { activeView, handleTabChange } = useReportsNavigation(availableTabs);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Dispatch a custom event that tabs can listen to
    window.dispatchEvent(new CustomEvent('refreshReports'));
    // Simulate a brief loading state for the button animation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  useRegisterRefresh(handleRefresh, refreshing);

  // ============================================================================
  // Computed
  // ============================================================================
  // Tab content rendering
  const tabComponents: Record<ReportView, ReactElement> = {
    locations: <ReportsLocationsTabWithErrorHandling />,
    machines: <ReportsMachinesTab />,
    meters: <ReportsMetersTab />,
    'sas-evaluation': (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-xl font-semibold text-gray-500">SAS Evaluation</h3>
        <p className="mt-2 text-gray-400">This report view is coming soon.</p>
      </div>
    ),
    'revenue-analysis': (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-xl font-semibold text-gray-500">
          Revenue Analysis
        </h3>
        <p className="mt-2 text-gray-400">This report view is coming soon.</p>
      </div>
    ),
    Cabinets: (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-xl font-semibold text-gray-500">
          Cabinets Overview
        </h3>
        <p className="mt-2 text-gray-400">This report view is coming soon.</p>
      </div>
    ),
    overview: (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-xl font-semibold text-gray-500">
          Reports Overview
        </h3>
        <p className="mt-2 text-gray-400">This report view is coming soon.</p>
      </div>
    ),
  };

  const { getTabAnimationProps, currentTabComponent } = useReportsTabContent({
    activeView,
    animations: REPORTS_ANIMATIONS,
    tabComponents,
  });

  // ============================================================================
  // Render Helper Functions
  // ============================================================================
  /**
   * Render the content for the active tab
   */
  const renderTabContent = (): ReactElement => {
    const animationProps = getTabAnimationProps();
    const { key, ...restProps } = animationProps;

    return (
      <AnimatePresence mode="wait">
        <motion.div key={key} {...restProps}>
          {currentTabComponent}
        </motion.div>
      </AnimatePresence>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout
      headerProps={{
        selectedLicencee,
        setSelectedLicencee,
        disabled: refreshing,
      }}
      showToaster={true}
      toasterPosition="top-right"
      toasterRichColors={true}
    >
      {/* Title and Icon */}
      <div className="mb-4 flex items-center gap-3 md:mb-6">
        <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
          Reports
        </h1>
        <Image
          src={IMAGES.details}
          alt="Reports Icon"
          width={32}
          height={32}
          className="h-6 w-6 sm:h-8 sm:w-8"
        />
      </div>

      {/* Date Filters */}
      <ReportsDateFilters />

      {/* Navigation */}
      <ReportsNavigation
        availableTabs={availableTabs}
        activeView={activeView}
        onTabChange={handleTabChange}
      />

      {/* Tab Content */}
      {renderTabContent()}
    </PageLayout>
  );
}
