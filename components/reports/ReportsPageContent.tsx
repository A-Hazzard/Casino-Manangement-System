'use client';

import { type ReactElement, useMemo } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

// Layout components
import PageLayout from '@/components/layout/PageLayout';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { useReportsTabContent } from '@/lib/hooks/data';
import { useReportsNavigation } from '@/lib/hooks/navigation';
import ReportsDateFilters from '@/components/reports/ReportsDateFilters';
import {
  ReportsPageAccessDeniedState,
  ReportsPageAuthLoadingState,
  ReportsPageLoadingOverlay,
} from '@/components/reports/ReportsPageLoadingStates';
import ReportsNavigation from '@/components/reports/ReportsNavigation';
import { IMAGES } from '@/lib/constants/images';
import Image from 'next/image';
import ReportsLocationsTabWithErrorHandling from '@/components/reports/tabs/locations/ReportsLocationsTabWithErrorHandling';
import ReportsMachinesTab from '@/components/reports/tabs/machines/ReportsMachinesTab';
import ReportsMetersTab from '@/components/reports/tabs/meters/ReportsMetersTab';
import {
  REPORTS_ANIMATIONS,
  REPORTS_TABS_CONFIG,
} from '@/lib/constants/reports';
import type { ReportView } from '@/lib/types/reports';

/**
 * Reports Page Content Component
 * Main content component for the reports page with tab navigation and layout.
 *
 * Features:
 * - Tab-based navigation (Locations, Machines, Meters)
 * - Licensee selection integration
 * - Date filters
 * - Tab content rendering with suspense
 * - Loading states and overlays
 * - Access denied states
 * - Framer Motion animations
 * - Responsive layout
 */
export default function ReportsPageContent() {
  // ============================================================================
  // Hooks & State
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

  // Filter tabs based on user role
  // Developers: all tabs
  // Admins and Location Admins: meters and locations tabs
  // Others: only meters tab
  const availableTabs = useMemo(() => {
    if (isDeveloper) {
      return REPORTS_TABS_CONFIG; // Developers see all tabs
    }
    if (isAdmin || isLocationAdmin) {
      // Admins and Location Admins see meters and locations tabs
      return REPORTS_TABS_CONFIG.filter(
        tab => tab.id === 'meters' || tab.id === 'locations'
      );
    }
    // Others only see meters tab
    return REPORTS_TABS_CONFIG.filter(tab => tab.id === 'meters');
  }, [isDeveloper, isAdmin, isLocationAdmin]);

  // All authenticated users have access to reports
  const hasAccess = true;
  const isLoading = false;

  const { activeView, handleTabChange } = useReportsNavigation(availableTabs);

  // Tab content rendering
  const tabComponents: Record<ReportView, ReactElement> = {
    locations: <ReportsLocationsTabWithErrorHandling />,
    machines: <ReportsMachinesTab />,
    meters: <ReportsMetersTab />,
  };

  const { getTabAnimationProps, currentTabComponent } = useReportsTabContent({
    activeView,
    animations: REPORTS_ANIMATIONS,
    tabComponents,
  });

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

  // Show loading state while authentication is loading
  if (isLoading) {
    return <ReportsPageAuthLoadingState />;
  }

  // Show access denied if user has no available tabs
  if (!hasAccess) {
    return <ReportsPageAccessDeniedState />;
  }

  return (
    <PageLayout
      headerProps={{
        selectedLicencee,
        setSelectedLicencee,
        disabled: isLoading,
      }}
      showToaster={true}
      toasterPosition="top-right"
      toasterRichColors={true}
    >
      {/* Title and Icon */}
      <div className="mb-6 flex items-center gap-3">
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

      {/* Loading Overlay */}
      <ReportsPageLoadingOverlay isLoading={isLoading} />

      {/* Tab Content */}
      {renderTabContent()}
    </PageLayout>
  );
}
