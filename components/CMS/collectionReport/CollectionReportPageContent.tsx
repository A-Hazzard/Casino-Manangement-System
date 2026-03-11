/**
 * Collection Report Page Content Component
 *
 * Main content component that orchestrates all data fetching, state management,
 * and renders the collection report management interface.
 *
 * @module components/collectionReport/CollectionReportPageContent
 */
'use client';

import CollectionReportHeader from '@/components/CMS/collectionReport/CollectionReportHeader';
import CollectionReportNavigation from '@/components/CMS/collectionReport/CollectionReportNavigation';
import CollectionReportModals from '@/components/CMS/collectionReport/modals/CollectionReportModals';
import CollectionReportDesktopLayout from '@/components/CMS/collectionReport/tabs/collection/CollectionReportDesktopLayout';
import CollectionReportMobileLayout from '@/components/CMS/collectionReport/tabs/collection/CollectionReportMobileLayout';
import PageLayout from '@/components/shared/layout/PageLayout';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import { NoLicenceeAssigned } from '@/components/shared/ui/NoLicenceeAssigned';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { COLLECTION_TABS_CONFIG, UserRole } from '@/lib/constants';
import { useCollectionReportPageData } from '@/lib/hooks/collectionReport/useCollectionReportPageData';
import { useCollectorScheduleData } from '@/lib/hooks/collectionReport/useCollectorScheduleData';
import { useManagerScheduleData } from '@/lib/hooks/collectionReport/useManagerScheduleData';
import { useMonthlyReportData } from '@/lib/hooks/collectionReport/useMonthlyReportData';

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import {
    shouldShowLicenceeFilter,
    shouldShowNoLicenceeMessage,
} from '@/lib/utils/licencee';
import { hasManagerAccess } from '@/lib/utils/permissions';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';

// Specialized Tab UI Components (Dynamically Imported)
const MonthlyDesktop = dynamic(
  () =>
    import(
      '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyDesktop'
    ),
  { ssr: false }
);
const MonthlyMobile = dynamic(
  () =>
    import(
      '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyMobile'
    ),
  { ssr: false }
);
const CollectorDesktop = dynamic(
  () =>
    import(
      '@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorDesktop'
    ),
  { ssr: false }
);
const CollectorMobile = dynamic(
  () =>
    import(
      '@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorMobile'
    ),
  { ssr: false }
);
const ManagerDesktop = dynamic(
  () =>
    import(
      '@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerDesktop'
    ),
  { ssr: false }
);
const ManagerMobile = dynamic(
  () =>
    import(
      '@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerMobile'
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
    handleCreate,
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

  // Hide Monthly Report and Manager Schedule tabs from non-management roles (e.g. collector)
  const canSeeManagerTabs = hasManagerAccess((user?.roles || []) as UserRole[]);
  const visibleTabs = COLLECTION_TABS_CONFIG.filter(
    tab => tab.id === 'monthly' || tab.id === 'manager' ? canSeeManagerTabs : true
  );
  // If the active tab is restricted for this user, fall back to the default tab
  const effectiveTab = (activeTab === 'monthly' || activeTab === 'manager') && !canSeeManagerTabs
    ? 'collection' as const
    : activeTab;

  // If user has no licencee assigned, show the "No Licencee Assigned" message
  if (shouldShowNoLicenceeMessage(user)) {
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
        <NoLicenceeAssigned />
      </PageLayout>
    );
  }

  // Removed page-level skeleton - each section shows its own skeleton while loading

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <PageLayout
        headerProps={{ setSelectedLicencee, disabled: false }}
        hideLicenceeFilter={!shouldShowLicenceeFilter(user)}
        hideCurrencyFilter
        mainClassName="flex flex-col flex-1 w-full max-w-full p-4 md:p-6 overflow-x-hidden"
        showToaster
        onRefresh={handleRefresh}
        refreshing={refreshing}
      >
        {/* Page Header: Title and primary action buttons */}
        <CollectionReportHeader
          activeTab={effectiveTab}
          refreshing={refreshing}
          loading={loading}
          onRefresh={handleRefresh}
          onCreateDesktop={handleCreate}
          onCreateMobile={handleCreate}
        />

        {/* Multi-Tab Navigation Section */}
        <div className="mb-8 mt-8">
          <CollectionReportNavigation
            tabs={visibleTabs}
            activeView={effectiveTab}
            onChange={handleTabChange}
            isLoading={false}
          />
        </div>

        {/* Date Filter Integration (applicable to main collections tab) */}
        {effectiveTab === 'collection' && (
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
              key={effectiveTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {/* 1. Main Collection Reports Tab */}
              {effectiveTab === 'collection' && (
                <div className="tab-content-wrapper">
                  {/* Desktop Data Grid View */}
                  <div className="hidden md:block">
                    <CollectionReportDesktopLayout
                      loading={loading}
                      filteredReports={hook.paginatedReports || []}
                      desktopTableRef={desktopTableRef}
                      locations={locations}
                      selectedLocation={filters.selectedLocation}
                      onLocationChange={filters.setSelectedLocation}
                      search={hook.searchTerm}
                      onSearchChange={(value: string) => {
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
                      editableReportIds={hook.editableReportIds}
                    />
                  </div>

                  {/* Mobile Cards View */}
                  <div className="md:hidden">
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
                      editableReportIds={hook.editableReportIds}
                    />
                  </div>

                  {/* Shared Pagination Controls */}
                  {!loading &&
                    (hook.paginatedReports?.length > 0 ||
                      filters.filteredReports.length > 0) && (
                      <div className="mb-8 mt-4 flex w-full justify-center">
                        <PaginationControls
                          currentPage={hook.currentPage}
                          totalPages={hook.totalPages || 1}
                          totalCount={hook.totalReports}
                          limit={10}
                          setCurrentPage={setCurrentPage}
                        />
                      </div>
                    )}
                </div>
              )}

              {/* 2. Monthly Roll-up Reports Tab */}
              {effectiveTab === 'monthly' && (
                <div className="tab-content-wrapper">
                  <MonthlyDesktop {...monthlyHook} />
                  <div className="lg:hidden">
                    <MonthlyMobile {...monthlyHook} />
                  </div>
                </div>
              )}

              {/* 3. Collector Schedule Management Tab */}
              {effectiveTab === 'collector' && (
                <div className="tab-content-wrapper">
                  <CollectorDesktop {...collectorHook} />
                  <div className="lg:hidden">
                    <CollectorMobile {...collectorHook} />
                  </div>

                  {/* Pagination Controls */}
                  {!collectorHook.loadingCollectorSchedules &&
                    collectorHook.collectorSchedules.length > 0 && (
                      <div className="flex justify-center">
                        <PaginationControls
                          currentPage={collectorHook.currentPage}
                          totalPages={collectorHook.totalPages}
                          setCurrentPage={collectorHook.setCurrentPage}
                        />
                      </div>
                    )}
                </div>
              )}

              {/* 4. Manager Oversight Tab */}
              {effectiveTab === 'manager' && (
                <div className="tab-content-wrapper">
                  <ManagerDesktop {...managerHook} />
                  <div className="lg:hidden">
                    <ManagerMobile {...managerHook} />
                  </div>
                  
                  {/* Pagination Controls */}
                  {!managerHook.loadingSchedulers &&
                    managerHook.schedulers.length > 0 && (
                      <div className="flex justify-center">
                        <PaginationControls
                          currentPage={managerHook.currentPage}
                          totalPages={managerHook.totalPages}
                          setCurrentPage={managerHook.setCurrentPage}
                        />
                      </div>
                    )}
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
    </>
  );
}

