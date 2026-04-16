'use client';

import { ReactElement, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';

// Layout components
import PageLayout from '@/components/shared/layout/PageLayout';

// Store
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';

// Hooks
import { useMembersTabContent } from '@/lib/hooks/data';
import { useMembersNavigation } from '@/lib/hooks/navigation';

// Components
import MembersNavigation from '@/components/CMS/members/common/MembersNavigation';
import { MembersHandlersProvider, useMembersHandlers } from '@/components/CMS/members/context/MembersHandlersContext';
import {
    MembersListTabSkeleton,
    MembersSummaryTabSkeleton,
} from '@/components/shared/ui/skeletons/MembersSkeletons';

// Tab Components
import MembersListTab from '@/components/CMS/members/tabs/MembersListTab';
import MembersSummaryTab from '@/components/CMS/members/tabs/MembersSummaryTab';
import MembersActivityLogTab from '@/components/CMS/members/tabs/MembersActivityLogTab';

// Constants
import {
    MEMBERS_ANIMATIONS,
    MEMBERS_TABS_CONFIG,
} from '@/lib/constants';

// Types
import type { MembersView } from '@/shared/types/entities';

/**
 * Members Content Component
 * Main content component for the members page with tab navigation and layout.
 */
function MembersPageContentInner() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const { onRefresh, onNewMember, refreshing } = useMembersHandlers();
  const { user } = useUserStore();

  const isManagement = !!(
    user?.roles &&
    (user.roles.includes('developer') || user.roles.includes('admin') || user.roles.includes('owner'))
  );

  // Filter tabs - apply maintenance state first, then role-based access
  const availableTabs = MEMBERS_TABS_CONFIG.filter(tab => {
    if (tab.available === false) return false;
    if (tab.id === 'activity-log') return isManagement;
    return true;
  });

  const { activeTab, handleTabClick } = useMembersNavigation(availableTabs);

  // Tab content rendering
  const tabComponents: Record<MembersView, ReactElement> = {
    members: <MembersListTab />,
    'summary-report': <MembersSummaryTab selectedLicencee={selectedLicencee} />,
    'activity-log': <MembersActivityLogTab />,
  };

  const { getTabAnimationProps, currentTabComponent } = useMembersTabContent({
    activeTab,
    animations: MEMBERS_ANIMATIONS,
    tabComponents,
  });

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
              ) : activeTab === 'summary-report' ? (
                <MembersSummaryTabSkeleton />
              ) : (
                <div className="flex h-64 items-center justify-center bg-white/50 animate-pulse rounded-lg mt-6">
                  <span className="text-gray-500 font-medium">Loading Activity Log...</span>
                </div>
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
        onRefresh={onRefresh}
        refreshing={refreshing}
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
