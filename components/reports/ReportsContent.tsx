"use client";

import { type ReactElement } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";

// Layout components

import Header from "@/components/layout/Header";

// Store
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useReportsStore } from "@/lib/store/reportsStore";

// Hooks
import { useAuth } from "@/lib/hooks/useAuth";
import { useReportsNavigation } from "@/lib/hooks/useReportsNavigation";

// Components
import ReportsDateFilters from "@/components/reports/common/ReportsDateFilters";
import ReportsNavigation from "@/components/reports/common/ReportsNavigation";
import {
  LoadingOverlay,
  AuthLoadingState,
  AccessDeniedState,
} from "@/components/reports/common/ReportsLoadingStates";
import Image from "next/image";
import { IMAGES } from "@/lib/constants/images";

// Tab components
import DashboardTab from "@/components/reports/tabs/DashboardTab";
import LocationsTab from "@/components/reports/tabs/LocationsTab";
import MachinesTab from "@/components/reports/tabs/MachinesTab";
import MetersTab from "@/components/reports/tabs/MetersTab";

// Constants
import {
  REPORTS_TABS_CONFIG,
  REPORTS_ANIMATIONS,
} from "@/lib/constants/reports";

// Types
import type { ReportView } from "@/lib/types/reports";

/**
 * Main content component for the reports page
 * Handles layout, navigation, and tab rendering
 */
export default function ReportsContent() {

  const { selectedLicencee } = useDashBoardStore();
  const { isLoading: authLoading } = useAuth();
  const { realTimeMetrics } = useReportsStore();

  const { activeView, availableTabs, isLoading, handleTabChange } =
    useReportsNavigation(REPORTS_TABS_CONFIG);

  /**
   * Render the content for the active tab
   */
  const renderTabContent = (): ReactElement => {
    const tabComponents: Record<ReportView, ReactElement> = {
      dashboard: <DashboardTab />,
      locations: <LocationsTab />,
      machines: <MachinesTab />,
      meters: <MetersTab />,
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          variants={REPORTS_ANIMATIONS.tabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="w-full h-full"
        >
          {tabComponents[activeView] || <DashboardTab />}
        </motion.div>
      </AnimatePresence>
    );
  };



  // Show loading state while authentication is loading
  if (authLoading) {
    return <AuthLoadingState />;
  }

  // Show access denied if user has no available tabs
  if (availableTabs.length === 0) {
    return <AccessDeniedState />;
  }

  return (
    <>

      <div className="w-full max-w-full min-h-screen bg-background flex overflow-hidden md:w-11/12 md:ml-20 transition-all duration-300">
        <main className="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={() => {}}
            disabled={isLoading}
          />

          {/* Title and Icon */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Reports
            </h1>
            <Image
              src={IMAGES.reportsButtonNoBg}
              alt="Reports Icon"
              width={32}
              height={32}
              className="w-6 h-6 sm:w-8 sm:h-8"
            />
          </div>

          {/* Date Filters */}
          <ReportsDateFilters />

          {/* Navigation */}
          <ReportsNavigation
            availableTabs={availableTabs}
            activeView={activeView}
            onTabChange={handleTabChange}
            isLoading={isLoading}
            realTimeMetrics={realTimeMetrics}
          />

          {/* Loading Overlay */}
          <LoadingOverlay isLoading={isLoading} />

          {/* Tab Content */}
          {renderTabContent()}
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </>
  );
}
