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
import axios from 'axios';

// === Internal Components ===
import CollectionReportHeader from '@/components/CMS/collectionReport/CollectionReportHeader';
import CollectionReportNavigation from '@/components/CMS/collectionReport/CollectionReportNavigation';
import CollectionReportModals from '@/components/CMS/collectionReport/modals/CollectionReportModals';
import ScheduleDeleteDialog from '@/components/CMS/collectionReport/modals/ScheduleDeleteDialog';
import ScheduleEditModal from '@/components/CMS/collectionReport/modals/ScheduleEditModal';
import CollectionReportDesktopLayout from '@/components/CMS/collectionReport/tabs/collection/CollectionReportDesktopLayout';
import CollectionReportMobileLayout from '@/components/CMS/collectionReport/tabs/collection/CollectionReportMobileLayout';
import CollectionReportV2Desktop from '@/components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2Desktop';
import CollectionReportV2Mobile from '@/components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2Mobile';
import CollectionReportV2StartSessionDialog from '@/components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2StartSessionDialog';

// === Shared Components ===
import PageLayout from '@/components/shared/layout/PageLayout';
import DateFilters from '@/components/shared/ui/common/DateFilters';
import { NoLicenceeAssigned } from '@/components/shared/ui/NoLicenceeAssigned';
import PaginationControls from '@/components/shared/ui/PaginationControls';

// === Hooks & Store ===
import { COLLECTION_TABS_CONFIG, UserRole } from '@/lib/constants';
import { useCollectionReportPageData } from '@/lib/hooks/collectionReport/useCollectionReportPageData';
import { useCollectionReportV2Data } from '@/lib/hooks/collectionReport/useCollectionReportV2Data';
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
const MonthlyDesktop = dynamic(
  () =>
    import('@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyDesktop'),
  { ssr: false }
);
const MonthlyMobile = dynamic(
  () =>
    import('@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyMobile'),
  { ssr: false }
);
const CollectorDesktop = dynamic(
  () =>
    import('@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorDesktop'),
  { ssr: false }
);
const CollectorMobile = dynamic(
  () =>
    import('@/components/CMS/collectionReport/tabs/collector/CollectionReportCollectorMobile'),
  { ssr: false }
);
const ManagerDesktop = dynamic(
  () =>
    import('@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerDesktop'),
  { ssr: false }
);
const ManagerMobile = dynamic(
  () =>
    import('@/components/CMS/collectionReport/tabs/manager/CollectionReportManagerMobile'),
  { ssr: false }
);

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
  const [showV2StartSession, setShowV2StartSession] = useState(false);
  const [v2DeleteConfirm, setV2DeleteConfirm] = useState<string | null>(null);
  const [v2Deleting, setV2Deleting] = useState(false);
  const [v2GroupByLocation, setV2GroupByLocation] = useState(false);

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
    isDeleting,
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
  const v2Hook = useCollectionReportV2Data(selectedLicencee, locations);

  // ============================================================================
  // Role-Based Visibility Computations
  // ============================================================================

  const userRoles = (user?.roles || []) as UserRole[];
  const canSeeManagerTabs = hasManagerAccess(userRoles);
  const isDeveloper = userRoles.includes('developer');

  const visibleTabs = COLLECTION_TABS_CONFIG.filter(tab => {
    if (tab.id === 'monthly' || tab.id === 'manager') return canSeeManagerTabs;
    if (tab.id === 'collection-v2') return isDeveloper;
    return true;
  });

  // Role-based active tab fallback
  const effectiveTab =
    (activeTab === 'monthly' || activeTab === 'manager') && !canSeeManagerTabs
      ? ('collection' as const)
      : activeTab === 'collection-v2' && !isDeveloper
        ? ('collection' as const)
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
          onCreateDesktop={() => {
            if (effectiveTab === 'collection-v2') {
              setShowV2StartSession(true);
            } else {
              handleCreate();
            }
          }}
          onCreateMobile={() => {
            if (effectiveTab === 'collection-v2') {
              setShowV2StartSession(true);
            } else {
              handleCreate();
            }
          }}
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
        {(effectiveTab === 'collection' ||
          effectiveTab === 'collection-v2') && (
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

                  {/* Pagination Section */}
                  {(hook.paginatedReports?.length > 0 ||
                    filters.filteredReports.length > 0) && (
                    <div className="mb-8 mt-4 flex w-full justify-center">
                      <PaginationControls
                        currentPage={hook.currentPage}
                        totalPages={hook.totalPages || 1}
                        totalCount={
                          filters.selectedLocation !== 'all' ||
                          filters.showUncollectedOnly ||
                          filters.selectedFilters.length > 0
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

              {/* === COLLECTION REPORT V2 TAB (Developer only) === */}
              {effectiveTab === 'collection-v2' && (
                <div className="tab-content-wrapper">
                  {/* V2 Location Filter & Group Toggle */}
                  {v2Hook.locations.length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Location
                        </label>
                        <select
                          value={v2Hook.selectedLocation}
                          onChange={e =>
                            v2Hook.setSelectedLocation(e.target.value)
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="all">All Locations</option>
                          {v2Hook.locations.map(loc => (
                            <option key={String(loc._id)} value={String(loc._id)}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setV2GroupByLocation(prev => !prev)
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          v2GroupByLocation
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {v2GroupByLocation
                          ? 'Grouped by Location'
                          : 'Group by Location'}
                      </button>
                    </div>
                  )}
                  <div className="hidden md:block">
                    <CollectionReportV2Desktop
                      sessions={v2Hook.sessions}
                      loading={v2Hook.loading}
                      groupByLocation={v2GroupByLocation}
                      onViewSession={sessionId => {
                        window.location.href = `/collection-report/report/session/${sessionId}`;
                      }}
                      onSubmitSession={async sessionId => {
                        try {
                          await axios.patch(
                            `/api/collection-reports-v2/sessions/${sessionId}/submit`
                          );
                          v2Hook.onRefresh();
                        } catch (error) {
                          console.error('Failed to submit session:', error);
                        }
                      }}
                      onDeleteSession={sessionId => {
                        setV2DeleteConfirm(sessionId);
                      }}
                    />
                  </div>

                  <div className="md:hidden">
                    <CollectionReportV2Mobile
                      sessions={v2Hook.sessions}
                      loading={v2Hook.loading}
                      groupByLocation={v2GroupByLocation}
                      onViewSession={sessionId => {
                        window.location.href = `/collection-report/report/session/${sessionId}`;
                      }}
                      onSubmitSession={async sessionId => {
                        try {
                          await axios.patch(
                            `/api/collection-reports-v2/sessions/${sessionId}/submit`
                          );
                          v2Hook.onRefresh();
                        } catch (error) {
                          console.error('Failed to submit session:', error);
                        }
                      }}
                      onDeleteSession={sessionId => {
                        setV2DeleteConfirm(sessionId);
                      }}
                    />
                  </div>

                  {v2Hook.sessions.length > 0 && (
                    <div className="mb-8 mt-4 flex w-full justify-center">
                      <PaginationControls
                        currentPage={v2Hook.currentPage}
                        totalPages={v2Hook.totalPages}
                        setCurrentPage={v2Hook.setCurrentPage}
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
        isDeleting={isDeleting}
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

      {showV2StartSession && (
        <CollectionReportV2StartSessionDialog
          locations={locations}
          onClose={() => setShowV2StartSession(false)}
        />
      )}

      {v2DeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Delete Session
            </h3>
            <p className="mb-6 text-sm text-gray-600">
              Are you sure you want to delete this in-progress session? This
              will remove all captured data permanently.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setV2DeleteConfirm(null)}
                disabled={v2Deleting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setV2Deleting(true);
                  try {
                    await axios.delete(
                      `/api/collection-reports-v2/sessions/${v2DeleteConfirm}`
                    );
                    setV2DeleteConfirm(null);
                    v2Hook.onRefresh();
                  } catch (error) {
                    console.error('Failed to delete session:', error);
                  } finally {
                    setV2Deleting(false);
                  }
                }}
                disabled={v2Deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {v2Deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CollectionReportPageContent;
