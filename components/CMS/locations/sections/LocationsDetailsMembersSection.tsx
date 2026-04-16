'use client';

import { Suspense, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMembersHandlers } from '@/components/CMS/members/context/MembersHandlersContext';
import MembersNavigation from '@/components/CMS/members/common/MembersNavigation';
import MembersListTab from '@/components/CMS/members/tabs/MembersListTab';
import MembersSummaryTab from '@/components/CMS/members/tabs/MembersSummaryTab';
import {
  MembersListTabSkeleton,
  MembersSummaryTabSkeleton,
} from '@/components/shared/ui/skeletons/MembersSkeletons';
import { MEMBERS_TABS_CONFIG } from '@/lib/constants';

type LocationsDetailsMembersSectionProps = {
  locationId: string;
  locationName: string;
  selectedLicencee: string | null;
  activeTab: string;
  handleTabClick: (tabId: string) => void;
  onRefreshReady?: (refreshHandler: (() => void) | undefined) => void;
};

/**
 * Locations Details Members Section Component
 * Handles the display of members-related tabs within the location details page.
 */
export default function LocationsDetailsMembersSection({
  locationId,
  locationName,
  selectedLicencee,
  activeTab,
  handleTabClick,
  onRefreshReady,
}: LocationsDetailsMembersSectionProps) {
  const { onRefresh, onNewMember, refreshing } = useMembersHandlers();

  // Expose refresh handler to parent component
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(onRefresh);
    }
  }, [onRefresh, onRefreshReady]);

  return (
    <div className="w-full">
      {/* Members Navigation */}
      <MembersNavigation
        availableTabs={MEMBERS_TABS_CONFIG}
        activeTab={activeTab as 'members' | 'summary-report'}
        onTabChange={handleTabClick}
        selectedLicencee={selectedLicencee || undefined}
        onRefresh={onRefresh}
        onNewMember={onNewMember}
        refreshing={refreshing}
        locationName={locationName}
      />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Suspense
            fallback={
              activeTab === 'members' ? (
                <MembersListTabSkeleton />
              ) : (
                <MembersSummaryTabSkeleton />
              )
            }
          >
            {activeTab === 'members' ? (
              <MembersListTab forcedLocationId={locationId} />
            ) : (
              <MembersSummaryTab 
                selectedLicencee={selectedLicencee || ''} 
                forcedLocationId={locationId}
              />
            )}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
