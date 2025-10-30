'use client';

import { type ReactElement } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

// Layout components
import PageLayout from '@/components/layout/PageLayout';

// Store
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useReportsStore } from '@/lib/store/reportsStore';

// Hooks
import { useReportsNavigation } from '@/lib/hooks/navigation';
import { useReportsTabContent } from '@/lib/hooks/data';

// Components
import ReportsDateFilters from '@/components/reports/common/ReportsDateFilters';
import ReportsNavigation from '@/components/reports/common/ReportsNavigation';
import {
  LoadingOverlay,
  AuthLoadingState,
  AccessDeniedState,
} from '@/components/reports/common/ReportsLoadingStates';
import Image from 'next/image';
import { IMAGES } from '@/lib/constants/images';

// Tab components
import DashboardTab from '@/components/reports/tabs/DashboardTab';
import LocationsTabWithErrorHandling from '@/components/reports/tabs/LocationsTabWithErrorHandling';
import MachinesTab from '@/components/reports/tabs/MachinesTab';
import MetersTab from '@/components/reports/tabs/MetersTab';

// Constants
import {
  REPORTS_TABS_CONFIG,
  REPORTS_ANIMATIONS,
} from '@/lib/constants/reports';

// Types
import type { ReportView } from '@/lib/types/reports';

/**
 * Main content component for the reports page
 * Handles layout, navigation, and tab rendering
 */
export default function ReportsContent() {
  const { selectedLicencee } = useDashBoardStore();
  const { realTimeMetrics } = useReportsStore();

  // All authenticated users have access to reports
  const hasAccess = true;
  const availableTabs = REPORTS_TABS_CONFIG;
  const isLoading = false;

  const { activeView, handleTabChange } =
    useReportsNavigation(REPORTS_TABS_CONFIG);

  // Tab content rendering
  const tabComponents: Record<ReportView, ReactElement> = {
    dashboard: <DashboardTab />,
    locations: <LocationsTabWithErrorHandling />,
    machines: <MachinesTab />,
    meters: <MetersTab />,
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
    return <AuthLoadingState />;
  }

  // Show access denied if user has no available tabs
  if (!hasAccess) {
    return <AccessDeniedState />;
  }

  return (
    <PageLayout
      headerProps={{
        selectedLicencee,
        setSelectedLicencee: () => {},
        disabled: isLoading,
      }}
      showToaster={true}
      toasterPosition="top-right"
      toasterRichColors={true}
    >
      {/* Title and Icon */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
          Reports
        </h1>
        <Image
          src={IMAGES.reportsButtonNoBg}
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
        _isLoading={isLoading}
        realTimeMetrics={realTimeMetrics}
      />

      {/* Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} />

      {/* Tab Content */}
      {renderTabContent()}
    </PageLayout>
  );
}
