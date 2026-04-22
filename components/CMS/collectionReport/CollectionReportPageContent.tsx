/**
 * Collection Report Page Content Component
 *
 * Main content component that orchestrates all data fetching, state management,
 * and renders the collection report management interface.
 *
 * Features:
 * - Multi-tab interface (Collection, Monthly, Collector Schedule, Manager Schedule)
 * - Animated tab transitions
 * - Responsive layout management
 * - Centralized modal management
 * - Role-based access control for tab visibility
 */

'use client';

import { FC, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';

// === Internal Components ===
import CollectionReportHeader from '@/components/CMS/collectionReport/CollectionReportHeader';
import CollectionReportNavigation from '@/components/CMS/collectionReport/CollectionReportNavigation';
import CollectionReportModals from '@/components/CMS/collectionReport/modals/CollectionReportModals';
import ScheduleDeleteDialog from '@/components/CMS/collectionReport/modals/ScheduleDeleteDialog';
import ScheduleEditModal from '@/components/CMS/collectionReport/modals/ScheduleEditModal';
import CollectionReportDesktopLayout from '@/components/CMS/collectionReport/tabs/collection/CollectionReportDesktopLayout';
import CollectionReportMobileLayout from '@/components/CMS/collectionReport/tabs/collection/CollectionReportMobileLayout';

// === Shared Components ===
import PageLayout from '@/components/shared/layout/PageLayout';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import { NoLicenceeAssigned } from '@/components/shared/ui/NoLicenceeAssigned';
import PaginationControls from '@/components/shared/ui/PaginationControls';

// === Hooks & Store ===
import { COLLECTION_TABS_CONFIG, UserRole } from '@/lib/constants';
import { useCollectionReportPageData } from '@/lib/hooks/collectionReport/useCollectionReportPageData';
import { useCollectorScheduleData } from '@/lib/hooks/collectionReport/useCollectorScheduleData';
import { useManagerScheduleData } from '@/lib/hooks/collectionReport/useManagerScheduleData';
import { useMonthlyReportData } from '@/lib/hooks/collectionReport/useMonthlyReportData';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';

// === Utilities ===
import {
    shouldShowLicenceeFilter,
    shouldShowNoLicenceeMessage,
} from '@/lib/utils/licencee';
import { hasManagerAccess } from '@/lib/utils/permissions';

// === Specialized Tab UI Components (Dynamically Imported) ===
const MonthlyDesktop = dynamic(() => import('@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyDesktop'), { ssr: false });
const MonthlyMobile = dynamic(() => import('@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyMobile'), { ssr: false });
const CollectorDesktop = dynamic(() => import('@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorDesktop'), { ssr: false });
const CollectorMobile = dynamic(() => import('@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorMobile'), { ssr: false });
const ManagerDesktop = dynamic(() => import('@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerDesktop'), { ssr: false });
const ManagerMobile = dynamic(() => import('@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerMobile'), { ssr: false });

const MotionDiv = motion.div;

const CollectionReportPageContent: FC = () => {
  // ============================================================================
  // Global Page State & Navigation
  // ============================================================================
  const hook = useCollectionReportPageData();
  const { user } = useUserStore();
  const { setSelectedLicencee, selectedLicencee } = useDashBoardStore();

  const desktopTableRef = useRef<HTMLDivElement | null>(null);
  const mobileCardsRef = useRef<HTMLDivElement | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Destructure hook for better readability
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
  const monthlyHook = useMonthlyReportData(selectedLicencee, activeTab);
  const collectorHook = useCollectorScheduleData(selectedLicencee, locations);
  const managerHook = useManagerScheduleData(
    selectedLicencee,
    locations,
    collectorHook.collectors
  );

  // ============================================================================
  // Role-Based Visibility Computations
  // ============================================================================
  
  // Hide Monthly Report and Manager Schedule tabs from non-management roles
  const canSeeManagerTabs = hasManagerAccess((user?.roles || []) as UserRole[]);
  const visibleTabs = COLLECTION_TABS_CONFIG.filter(
    tab => tab.id === 'monthly' || tab.id === 'manager' ? canSeeManagerTabs : true
  );

  // Role-based active tab fallback
  const effectiveTab = (activeTab === 'monthly' || activeTab === 'manager') && !canSeeManagerTabs
    ? 'collection' as const
    : activeTab;

  // ============================================================================
  // Early Returns: Authentication & Tenancy Checks
  // ============================================================================
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

  // ============================================================================
  // Main App Filter Coordination
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
        {/* Header Section */}
        <CollectionReportHeader
          activeTab={effectiveTab}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onCreateDesktop={handleCreate}
          onCreateMobile={handleCreate}
        />

        {/* Navigation Section */}
        <div className="mb-8 mt-8">
          <CollectionReportNavigation
            tabs={visibleTabs}
            activeView={effectiveTab}
            onChange={handleTabChange}
            isLoading={false}
          />
        </div>

        {/* Global Filters Section */}
        {effectiveTab === 'collection' && (
          <div className="mb-6">
            <DateFilters hideAllTime={false} customRangeGoLabel="Get Reports" />
          </div>
        )}

        {/* Main Tab Content Section */}
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
              {/* === COLLECTION TAB === */}
              {effectiveTab === 'collection' && (
                <div className="tab-content-wrapper">
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
                      onShowUncollectedOnlyChange={filters.setShowUncollectedOnly}
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
                      onShowUncollectedOnlyChange={filters.setShowUncollectedOnly}
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

                  {/* Pagination Section */}
                  {(hook.paginatedReports?.length > 0 || filters.filteredReports.length > 0) && (
                    <div className="mb-8 mt-4 flex w-full justify-center">
                      <PaginationControls
                          currentPage={hook.currentPage}
                          totalPages={hook.totalPages || 1}
                          totalCount={
                            filters.selectedLocation !== 'all' || filters.showUncollectedOnly || filters.selectedFilters.length > 0
                              ? filters.filteredReports.length
                              : hook.totalReports
                          }
                          setCurrentPage={setCurrentPage}
                        />
                      </div>
                    )}
                </div>
              )}

              {/* === MONTHLY TAB === */}
              {effectiveTab === 'monthly' && (
                <div className="tab-content-wrapper">
                  <MonthlyDesktop {...monthlyHook} />
                  <div className="lg:hidden">
                    <MonthlyMobile {...monthlyHook} />
                  </div>
                </div>
              )}

              {/* === COLLECTOR TAB === */}
              {effectiveTab === 'collector' && (
                <div className="tab-content-wrapper">
                  <CollectorDesktop
                    {...collectorHook}
                    onEdit={collectorHook.onEdit}
                    onDelete={collectorHook.onDelete}
                    showActions={collectorHook.canManage}
                  />
                  <div className="lg:hidden">
                    <CollectorMobile
                      {...collectorHook}
                      onEdit={collectorHook.onEdit}
                      onDelete={collectorHook.onDelete}
                      showActions={collectorHook.canManage}
                    />
                  </div>

                  {collectorHook.collectorSchedules.length > 0 && (
                    <div className="mt-6 flex justify-center">
                      <PaginationControls
                          currentPage={collectorHook.currentPage}
                          totalPages={collectorHook.totalPages}
                          setCurrentPage={collectorHook.setCurrentPage}
                        />
                      </div>
                    )}
                </div>
              )}

              {/* === MANAGER TAB === */}
              {effectiveTab === 'manager' && (
                <div className="tab-content-wrapper">
                  <ManagerDesktop
                    {...managerHook}
                    onEdit={managerHook.onEdit}
                    onDelete={managerHook.onDelete}
                    showActions={managerHook.canManage}
                  />
                  <div className="lg:hidden">
                    <ManagerMobile
                      {...managerHook}
                      onEdit={managerHook.onEdit}
                      onDelete={managerHook.onDelete}
                      showActions={managerHook.canManage}
                    />
                  </div>
                  
                  {managerHook.schedulers.length > 0 && (
                    <div className="mt-6 flex justify-center">
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

      {/* Modal Section: Manager & Collector Dialogs */}
      <ScheduleEditModal
        open={!!managerHook.editingRow}
        onClose={managerHook.onEditClose}
        onSave={managerHook.onEditSave}
        initialData={
          managerHook.editingRow
            ? {
                collectorName: managerHook.editingRow.collectorName,
                locationName: managerHook.editingRow.locationName,
                startTime: managerHook.editingRow.rawStartTime,
                endTime: managerHook.editingRow.rawEndTime,
                status: managerHook.editingRow.status,
              }
            : null
        }
        saving={managerHook.saving}
      />

      <ScheduleDeleteDialog
        open={!!managerHook.deletingRow}
        onClose={managerHook.onDeleteClose}
        onConfirm={managerHook.onDeleteConfirm}
        collectorName={managerHook.deletingRow?.collectorName ?? ''}
        locationName={managerHook.deletingRow?.locationName ?? ''}
        deleting={managerHook.deleting}
      />

      <ScheduleEditModal
        open={!!collectorHook.editingSchedule}
        onClose={collectorHook.onEditClose}
        onSave={collectorHook.onEditSave}
        initialData={
          collectorHook.editingSchedule
            ? {
                collectorName:
                  collectorHook.editingSchedule.collectorName ||
                  collectorHook.editingSchedule.collector ||
                  '',
                locationName:
                  collectorHook.editingSchedule.locationName ||
                  String(collectorHook.editingSchedule.location ?? ''),
                startTime: String(collectorHook.editingSchedule.startTime),
                endTime: String(collectorHook.editingSchedule.endTime),
                status: collectorHook.editingSchedule.status,
              }
            : null
        }
        saving={collectorHook.saving}
      />

      <ScheduleDeleteDialog
        open={!!collectorHook.deletingSchedule}
        onClose={collectorHook.onDeleteClose}
        onConfirm={collectorHook.onDeleteConfirm}
        collectorName={
          collectorHook.deletingSchedule?.collectorName ||
          collectorHook.deletingSchedule?.collector ||
          ''
        }
        locationName={
          collectorHook.deletingSchedule?.locationName ||
          String(collectorHook.deletingSchedule?.location ?? '')
        }
        deleting={collectorHook.deleting}
      />

      {/* Global Modals: Collection Operations */}
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
};

export default CollectionReportPageContent;

