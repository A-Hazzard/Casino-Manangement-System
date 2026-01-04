'use client';

import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';

// Layout components
import PageLayout from '@/components/layout/PageLayout';

// Store
import { useDashBoardStore } from '@/lib/store/dashboardStore';

// Hooks
import { useMembersNavigation } from '@/lib/hooks/navigation';
import { useMembersTabContent } from '@/lib/hooks/data';

// Components
import MembersNavigation from '@/components/members/common/MembersNavigation';
import {
  MembersListTabSkeleton,
  MembersSummaryTabSkeleton,
} from '@/components/ui/skeletons/MembersSkeletons';
import { MembersHandlersProvider, useMembersHandlers } from '@/components/members/context/MembersHandlersContext';

// Tab Components
import MembersListTab from '@/components/members/tabs/MembersListTab';
import MembersSummaryTab from '@/components/members/tabs/MembersSummaryTab';

// Constants
import {
  MEMBERS_TABS_CONFIG,
  MEMBERS_ANIMATIONS,
} from '@/lib/constants/members';

// Types
import type { MembersView } from '@/shared/types/entities';

/**
 * Members Content Component
 * Main content component for the members page with tab navigation and layout.
 *
 * Features:
 * - Tab-based navigation (Members List, Summary)
 * - Licensee selection integration
 * - Tab content rendering with suspense
 * - Loading skeletons
 * - Framer Motion animations
 * - Access control
 * - Responsive layout
 */
function MembersPageContentInner() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { onRefresh, onNewMember, refreshing } = useMembersHandlers();

  // All authenticated users have access to members
  const hasAccess = true;
  const availableTabs = MEMBERS_TABS_CONFIG;
  const accessDeniedMessage = null;

  const { activeTab, handleTabClick } =
    useMembersNavigation(MEMBERS_TABS_CONFIG);

  // Tab content rendering
  const tabComponents: Record<MembersView, React.ReactElement> = {
    members: <MembersListTab />,
    'summary-report': <MembersSummaryTab selectedLicencee={selectedLicencee} />,
  };

  const { getTabAnimationProps, currentTabComponent } = useMembersTabContent({
    activeTab,
    animations: MEMBERS_ANIMATIONS,
    tabComponents,
  });

  // Show access denied message if user doesn't have access
  if (!hasAccess) {
    return (
      <>
        <PageLayout
          headerProps={{
            selectedLicencee,
            setSelectedLicencee,
            disabled: false,
          }}
          hideLicenceeFilter={true}
          showToaster={false}
        >
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Access Restricted
              </h2>
              <p className="text-gray-600">
                {accessDeniedMessage ||
                  "You don't have permission to access member data."}
              </p>
            </div>
          </div>
        </PageLayout>
      </>
    );
  }

  /**
   * Render the content for the active tab
   */
  const renderTabContent = () => {
    const animationProps = getTabAnimationProps();
    const { key, ...restProps } = animationProps;
    
    return (
      <AnimatePresence mode="wait">
        <motion.div key={key} {...restProps}>
          <Suspense
            fallback={
              /* Show appropriate skeleton based on active tab */
              activeTab === 'members' ? (
                <MembersListTabSkeleton />
              ) : (
                <MembersSummaryTabSkeleton />
              )
            }
          >
            {currentTabComponent}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: false,
        }}
        hideLicenceeFilter={true}
        hideCurrencyFilter={true}
        showToaster={false}
      >
        {/* Navigation */}
        <MembersNavigation
          availableTabs={availableTabs}
          activeTab={activeTab}
          onTabChange={handleTabClick}
          selectedLicencee={selectedLicencee}
          onRefresh={onRefresh}
          onNewMember={onNewMember}
          refreshing={refreshing}
        />

        {/* Main Content */}
        {renderTabContent()}
      </PageLayout>

      {/* Toast Notifications */}
      <Toaster richColors position="top-center" />
    </>
  );
}

export default function MembersPageContent() {
  return (
    <MembersHandlersProvider>
      <MembersPageContentInner />
    </MembersHandlersProvider>
  );
}
