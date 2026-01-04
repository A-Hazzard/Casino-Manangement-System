/**
 * Collection Report Page Content Component
 *
 * Main content component that orchestrates all data fetching, state management,
 * and renders the collection report management interface.
 *
 * @module components/collectionReport/CollectionReportPageContent
 */
'use client';

import CollectionReportHeader from '@/components/collectionReport/CollectionReportHeader';
import CollectionReportNavigation from '@/components/collectionReport/CollectionReportNavigation';
import CollectionReportModals from '@/components/collectionReport/modals/CollectionReportModals';
import CollectionReportDesktopLayout from '@/components/collectionReport/tabs/collection/CollectionReportDesktopLayout';
import CollectionReportMobileLayout from '@/components/collectionReport/tabs/collection/CollectionReportMobileLayout';
import PageLayout from '@/components/layout/PageLayout';
import DateFilters from '@/components/ui/common/DateFilters';
import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import PaginationControls from '@/components/ui/PaginationControls';
import { COLLECTION_TABS_CONFIG } from '@/lib/constants/collection';
import { useCollectionReportPageData } from '@/lib/hooks/collectionReport/useCollectionReportPageData';
import { useCollectorScheduleData } from '@/lib/hooks/collectionReport/useCollectorScheduleData';
import { useManagerScheduleData } from '@/lib/hooks/collectionReport/useManagerScheduleData';
import { useMonthlyReportData } from '@/lib/hooks/collectionReport/useMonthlyReportData';
import { useDashboardScroll } from '@/lib/hooks/data';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import {
  shouldShowLicenseeFilter,
  shouldShowNoLicenseeMessage,
} from '@/lib/utils/licenseeAccess';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';

// Specialized Tab UI Components (Dynamically Imported)
const MonthlyDesktop = dynamic(
  () =>
    import(
      '@/components/collectionReport/tabs/monthly/CollectionReportMonthlyDesktop'
    ),
  { ssr: false }
);
const MonthlyMobile = dynamic(
  () =>
    import(
      '@/components/collectionReport/tabs/monthly/CollectionReportMonthlyMobile'
    ),
  { ssr: false }
);
const CollectorDesktop = dynamic(
  () =>
    import(
      '@/components/collectionReport/tabs/collector/CollectionReportCollectorDesktop'
    ),
  { ssr: false }
);
const CollectorMobile = dynamic(
  () =>
    import(
      '@/components/collectionReport/tabs/collector/CollectionReportCollectorMobile'
    ),
  { ssr: false }
);
const ManagerDesktop = dynamic(
  () =>
    import(
      '@/components/collectionReport/tabs/manager/CollectionReportManagerDesktop'
    ),
  { ssr: false }
);
const ManagerMobile = dynamic(
  () =>
    import(
      '@/components/collectionReport/tabs/manager/CollectionReportManagerMobile'
    ),
  { ssr: false }
);

// Animation Components
// Note: framer-motion v12+ supports SSR, so we can use regular imports
// If you encounter hydration issues, revert to dynamic imports with ssr: false
import { AnimatePresence, motion } from 'framer-motion';
const MotionDiv = motion.div;

export default function CollectionReportPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const hook = useCollectionReportPageData();
  const { user } = useUserStore();
  const { setSelectedLicencee, selectedLicencee } = useDashBoardStore();
  const { showFloatingRefresh } = useDashboardScroll();

  const desktopTableRef = useRef<HTMLDivElement | null>(null);
  const mobileCardsRef = useRef<HTMLDivElement | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const {
    activeTab,
    loading,
    refreshing,
    locations,
    locationsWithMachines,
    showNewCollectionMobile,
    showNewCollectionDesktop,
    showEditMobile,
    showEditDesktop,
    editingReportId,
    showDeleteConfirmation,
    filters,
    handleTabChange,
    handleRefresh,
    handleEdit,
    handleDelete,
    confirmDelete,
    setSearchTerm,
    setCurrentPage,
    setShowNewCollectionMobile,
    setShowNewCollectionDesktop,
    setShowEditMobile,
    setShowEditDesktop,
    setEditingReportId,
    onRefreshLocations,
  } = hook;

  // Initialize specialized hooks for secondary tabs
  const monthlyHook = useMonthlyReportData(selectedLicencee);
  const collectorHook = useCollectorScheduleData(selectedLicencee, locations);
  const managerHook = useManagerScheduleData(
    selectedLicencee,
    locations,
    collectorHook.collectors
  );

  // ============================================================================
  // Permission Checks
  // ============================================================================

  // If user has no licensee assigned, show the "No Licensee Assigned" message
  if (shouldShowNoLicenseeMessage(user)) {
    return (
      <PageLayout
        headerProps={{ setSelectedLicencee }}
        pageTitle="Collection Reports"
        hideOptions
        hideLicenceeFilter
        hideCurrencyFilter
        mainClassName="flex flex-col flex-1 p-4 md:p-6"
        showToaster
      >
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <PageLayout
        headerProps={{ setSelectedLicencee, disabled: false }}
        hideLicenceeFilter={!shouldShowLicenseeFilter(user)}
        hideCurrencyFilter
        mainClassName="flex flex-col flex-1 w-full max-w-full p-4 md:p-6 overflow-x-hidden"
        showToaster
      >
        {/* Page Header: Title and primary action buttons */}
        <CollectionReportHeader
          activeTab={activeTab}
          refreshing={refreshing}
          loading={loading}
          onRefresh={handleRefresh}
          onCreateDesktop={() => setShowNewCollectionDesktop(true)}
          onCreateMobile={() => setShowNewCollectionMobile(true)}
        />

        {/* Multi-Tab Navigation Section */}
        <div className="mb-8 mt-8">
          <CollectionReportNavigation
            tabs={COLLECTION_TABS_CONFIG}
            activeView={activeTab}
            onChange={handleTabChange}
            isLoading={false}
          />
        </div>

        {/* Date Filter Integration (applicable to main collections tab) */}
        {activeTab === 'collection' && (
          <div className="mb-6">
            <DateFilters hideAllTime={false} onCustomRangeGo={handleRefresh} />
          </div>
        )}

        {/* ============================================================================
           Tab Content Area: Animated transition between views
           ============================================================================ */}
        <div className="mt-6 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {/* 1. Main Collection Reports Tab */}
              {activeTab === 'collection' && (
                <div className="tab-content-wrapper">
                  {/* Desktop Data Grid View */}
                  <div className="hidden lg:block">
                    <CollectionReportDesktopLayout
                      loading={loading}
                      filteredReports={hook.paginatedReports || []}
                      desktopTableRef={desktopTableRef}
                      locations={locations}
                      selectedLocation={filters.selectedLocation}
                      onLocationChange={filters.setSelectedLocation}
                      search={hook.searchTerm}
                      onSearchChange={value => {
                        setSearchTerm(value);
                        setIsSearching(value.length > 0);
                      }}
                      onSearchSubmit={() => {}}
                      showUncollectedOnly={filters.showUncollectedOnly}
                      onShowUncollectedOnlyChange={
                        filters.setShowUncollectedOnly
                      }
                      selectedFilters={filters.selectedFilters}
                      onFilterChange={filters.handleFilterChange}
                      onClearFilters={filters.clearFilters}
                      isSearching={isSearching}
                      reportIssues={undefined}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      sortField={filters.sortField}
                      sortDirection={filters.sortDirection}
                      onSort={filters.handleSort}
                      selectedLicencee={selectedLicencee}
                      editableReportIds={new Set()}
                    />
                  </div>

                  {/* Mobile Cards View */}
                  <div className="lg:hidden">
                    <CollectionReportMobileLayout
                      loading={loading}
                      filteredReports={hook.paginatedReports || []}
                      mobileCardsRef={mobileCardsRef}
                      reportIssues={undefined}
                      locations={locations}
                      selectedLocation={filters.selectedLocation}
                      onLocationChange={filters.setSelectedLocation}
                      search={hook.searchTerm}
                      onSearchChange={value => {
                        setSearchTerm(value);
                        setIsSearching(value.length > 0);
                      }}
                      onSearchSubmit={() => {}}
                      showUncollectedOnly={filters.showUncollectedOnly}
                      onShowUncollectedOnlyChange={
                        filters.setShowUncollectedOnly
                      }
                      selectedFilters={filters.selectedFilters}
                      onFilterChange={filters.handleFilterChange}
                      onClearFilters={filters.clearFilters}
                      isSearching={isSearching}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      selectedLicencee={selectedLicencee}
                      editableReportIds={new Set()}
                    />
                  </div>

                  {/* Shared Pagination Controls */}
                  {!loading &&
                    (hook.paginatedReports?.length > 0 ||
                      filters.filteredReports.length > 0) && (
                      <PaginationControls
                        currentPage={hook.currentPage}
                        totalPages={hook.totalPages || 1}
                        setCurrentPage={setCurrentPage}
                      />
                    )}
                </div>
              )}

              {/* 2. Monthly Roll-up Reports Tab */}
              {activeTab === 'monthly' && (
                <div className="tab-content-wrapper">
                  <MonthlyDesktop {...monthlyHook} />
                  <div className="lg:hidden">
                    <MonthlyMobile {...monthlyHook} />
                  </div>
                </div>
              )}

              {/* 3. Collector Schedule Management Tab */}
              {activeTab === 'collector' && (
                <div className="tab-content-wrapper">
                  <CollectorDesktop {...collectorHook} />
                  <div className="lg:hidden">
                    <CollectorMobile {...collectorHook} />
                  </div>
                </div>
              )}

              {/* 4. Manager Oversight Tab */}
              {activeTab === 'manager' && (
                <div className="tab-content-wrapper">
                  <ManagerDesktop {...managerHook} />
                  <div className="lg:hidden">
                    <ManagerMobile {...managerHook} />
                  </div>
                </div>
              )}
            </MotionDiv>
          </AnimatePresence>
        </div>
      </PageLayout>

      {/* Global Modals for create/edit/delete operations */}
      <CollectionReportModals
        showNewCollectionMobile={showNewCollectionMobile}
        showNewCollectionDesktop={showNewCollectionDesktop}
        showEditMobile={showEditMobile}
        showEditDesktop={showEditDesktop}
        editingReportId={editingReportId}
        showDeleteConfirm={showDeleteConfirmation}
        locationsWithMachines={locationsWithMachines}
        onCloseNewMobile={() => setShowNewCollectionMobile(false)}
        onCloseNewDesktop={() => setShowNewCollectionDesktop(false)}
        onCloseEdit={() => {
          setShowEditMobile(false);
          setShowEditDesktop(false);
          setEditingReportId(null);
        }}
        onCloseDelete={() => hook.setShowDeleteConfirmation(false)}
        onConfirmDelete={confirmDelete}
        onRefresh={handleRefresh}
        onRefreshLocations={onRefreshLocations}
      />

      {/* Responsive Floating Refresh Toggle */}
      <FloatingActionButtons
        showRefresh={showFloatingRefresh}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </>
  );
}
