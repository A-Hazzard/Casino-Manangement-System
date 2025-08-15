"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";

// Layout components
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

// Store
import { useDashBoardStore } from "@/lib/store/dashboardStore";

// Hooks
import { useAuth } from "@/lib/hooks/useAuth";
import { useMembersNavigation } from "@/lib/hooks/useMembersNavigation";

// Components
import MembersNavigation from "@/components/members/common/MembersNavigation";

// Tab Components
import MembersListTab from "@/components/members/tabs/MembersListTab";
import MembersSummaryTab from "@/components/members/tabs/MembersSummaryTab";

// Constants
import { MEMBERS_TABS_CONFIG, MEMBERS_ANIMATIONS } from "@/lib/constants/members";

// Types
import type { MembersView } from "@/lib/types/members";

/**
 * Main content component for the members page
 * Handles layout, navigation, and tab rendering
 */
export default function MembersContent() {
  const pathname = usePathname();
  const { selectedLicencee } = useDashBoardStore();
  const { isAuthenticated } = useAuth();

  const {
    activeTab,
    availableTabs,
    handleTabClick,
  } = useMembersNavigation(MEMBERS_TABS_CONFIG);

  // Access denied if not authenticated or no available tabs
  if (!isAuthenticated || availableTabs.length === 0) {
    return (
      <>
        <Sidebar pathname={pathname} />
        <div className="w-full max-w-full min-h-screen bg-background flex overflow-hidden xl:w-full xl:mx-auto md:pl-36 transition-all duration-300">
          <main className="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4">
            <Header
              selectedLicencee={selectedLicencee}
              setSelectedLicencee={() => {}}
              disabled={false}
            />
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Access Restricted
                </h2>
                <p className="text-gray-600">
                  You don&apos;t have permission to access member data.
                </p>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  /**
   * Render the content for the active tab
   */
  const renderTabContent = () => {
    const tabComponents: Record<MembersView, React.ReactElement> = {
      members: <MembersListTab />,
      "summary-report": <MembersSummaryTab />,
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={MEMBERS_ANIMATIONS.tabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          <Suspense fallback={<div>Loading...</div>}>
            {tabComponents[activeTab]}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <>
      <Sidebar pathname={pathname} />
      <div className="w-full max-w-full min-h-screen bg-background flex overflow-hidden xl:w-full xl:mx-auto md:pl-36 transition-all duration-300">
        <main className="flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4">
          <Header
            selectedLicencee={selectedLicencee}
            setSelectedLicencee={() => {}}
            disabled={false}
          />
          
          {/* Navigation */}
          <MembersNavigation
            availableTabs={availableTabs}
            activeTab={activeTab}
            onTabChange={handleTabClick}
            selectedLicencee={selectedLicencee}
          />

          {/* Main Content */}
          {renderTabContent()}
        </main>
      </div>
      
      {/* Toast Notifications */}
      <Toaster richColors />
    </>
  );
}
