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

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
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
import CollectionReportV2Filters from '@/components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2Filters';
import CollectionReportV2StartSessionDialog from '@/components/CMS/collectionReport/tabs/collection-v2/CollectionReportV2StartSessionDialog';
import CollectionReportV2DeleteSessionModal from '@/components/CMS/collectionReport/modals/CollectionReportV2DeleteSessionModal';
import CollectionReportV2EditSessionModal from '@/components/CMS/collectionReport/modals/CollectionReportV2EditSessionModal';
import CollectionReportV2WizardModal from '@/components/CMS/collectionReport/modals/CollectionReportV2WizardModal';

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
  // State & Hooks
  // ============================================================================
  const hook = useCollectionReportPageData();
  const { user } = useUserStore();
  const { setSelectedLicencee, selectedLicencee } = useDashBoardStore();

  const desktopTableRef = useRef<HTMLDivElement | null>(null);
  const mobileCardsRef = useRef<HTMLDivElement | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showV2StartSession, setShowV2StartSession] = useState(false);
  const [v2DeleteConfirm, setV2DeleteConfirm] = useState<string | null>(null);
  const [v2EditSessionId, setV2EditSessionId] = useState<string | null>(null);
  const [v2WizardSessionId, setV2WizardSessionId] = useState<string | null>(
    null
  );

  const router = useRouter();
  const searchParams = useSearchParams();

  // ============================================================================
  // Effects
  // ============================================================================
  // On mount + whenever the URL changes, mirror ?view= into local state.
  useEffect(() => {
    const viewParam = searchParams?.get('view') ?? null;
    setV2EditSessionId(prev => (prev === viewParam ? prev : viewParam));
  }, [searchParams]);

  // ============================================================================
  // Handlers
  // ============================================================================
  // Open a session in view-mode AND push the URL so it's shareable.
  const openV2View = useCallback(
    (sessionId: string) => {
      setV2EditSessionId(sessionId);
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('view', sessionId);
      router.push(`/collection-report?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Close the view modal AND strip ?view= from the URL.
  const closeV2View = useCallback(() => {
    setV2EditSessionId(null);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('view');
    const query = params.toString();
    router.push(query ? `/collection-report?${query}` : '/collection-report', {
      scroll: false,
    });
  }, [router, searchParams]);

  // ============================================================================
  // Computed & Additional Hooks
  // ============================================================================
  // Destructure hook for better readability
  const {
    activeTab,
    loading,
    refreshing,
    allReports,
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
  const v2Hook = useCollectionReportV2Data(selectedLicencee, locations);

  // ============================================================================
  // Role-Based Visibility Computations
  // ============================================================================

  const userRoles = (user?.roles || []) as UserRole[];
  const canSeeManagerTabs = hasManagerAccess(userRoles);
  const isDeveloper = userRoles.includes('developer');
  const canManageV2 = isDeveloper || userRoles.includes('admin');
  // Only these roles may view and restore archived V2 sessions.
  // location admin sees only their assigned locations (enforced by the API).
  const canViewArchivedV2 =
    userRoles.includes('developer') ||
    userRoles.includes('owner') ||
    userRoles.includes('admin') ||
    userRoles.includes('location admin');

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

  // Wrapped refresh that calls correct hook based on active tab
  const handleRefreshAll = () => {
    if (effectiveTab === 'collection') {
      handleRefresh();
    } else if (effectiveTab === 'collection-v2') {
      v2Hook.onRefresh();
    } else if (effectiveTab === 'monthly') {
      monthlyHook.onApplyDateRange();
    } else if (effectiveTab === 'collector') {
      collectorHook.onRefresh();
    } else if (effectiveTab === 'manager') {
      managerHook.onRefresh();
    }
  };

  const activeRefreshing =
    effectiveTab === 'collection'
      ? refreshing
      : effectiveTab === 'collection-v2'
        ? v2Hook.isRefreshing
        : effectiveTab === 'monthly'
          ? monthlyHook.monthlyLoading
          : effectiveTab === 'collector'
            ? collectorHook.loadingCollectorSchedules
            : effectiveTab === 'manager'
              ? managerHook.loadingSchedulers
              : false;

  // ============================================================================
  // Render
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

  return (
    <>
      <PageLayout
        headerProps={{ setSelectedLicencee, disabled: false }}
        hideLicenceeFilter={!shouldShowLicenceeFilter(user)}
        hideCurrencyFilter
        mainClassName="flex flex-col flex-1 w-full max-w-full p-4 md:p-6 overflow-x-hidden"
        showToaster
        onRefresh={handleRefreshAll}
        refreshing={activeRefreshing}
      >
        {/* Header Section */}
        <CollectionReportHeader
          activeTab={effectiveTab}
          refreshing={activeRefreshing}
          onRefresh={handleRefreshAll}
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
        <div className="mb-4 mt-4">
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
          <div className="mb-2 flex flex-col gap-y-4">
            <DateFilters hideAllTime={false} customRangeGoLabel="Get Reports" />
            {effectiveTab === 'collection-v2' && (
              <CollectionReportV2Filters
                search={v2Hook.searchTerm}
                onSearchChange={v2Hook.setSearchTerm}
                searchType={v2Hook.searchType}
                onSearchTypeChange={v2Hook.setSearchType}
                locations={locations}
                selectedLocation={filters.selectedLocation}
                onLocationChange={filters.setSelectedLocation}
                onClearFilters={filters.clearFilters}
                showArchived={canViewArchivedV2 ? v2Hook.showArchived : false}
                onShowArchivedChange={
                  canViewArchivedV2 ? v2Hook.setShowArchived : undefined
                }
                canViewArchived={canViewArchivedV2}
              />
            )}
          </div>
        )}

        {/* Main Tab Content Section */}
        <div className="mt-0 flex-1 overflow-x-hidden overflow-y-visible">
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
                      searchType={hook.searchType}
                      onSearchTypeChange={hook.setSearchType}
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
                      searchType={hook.searchType}
                      onSearchTypeChange={hook.setSearchType}
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
                  <div className="hidden md:block">
                    <CollectionReportV2Desktop
                      sessions={v2Hook.sessions}
                      loading={v2Hook.loading}
                      isRefreshing={v2Hook.isRefreshing}
                      canManage={canManageV2}
                      showArchived={v2Hook.showArchived}
                      onViewSession={sessionId => openV2View(sessionId)}
                      onEditSession={sessionId =>
                        setV2WizardSessionId(sessionId)
                      }
                      onSubmitSession={async sessionId => {
                        try {
                          await axios.patch(
                            `/api/collection-reports-v2/sessions/${sessionId}/submit`
                          );
                          v2Hook.onRefresh();
                        } catch (error) {
                          console.error(
                            '[CollectionReportPageContent] Failed to submit session:',
                            error instanceof Error
                              ? error.message
                              : 'Unknown error'
                          );
                        }
                      }}
                      onDeleteSession={sessionId => {
                        setV2DeleteConfirm(sessionId);
                      }}
                      onRestoreSession={async sessionId => {
                        try {
                          await axios.patch(
                            `/api/collection-reports-v2/sessions/${sessionId}`,
                            { action: 'restore' }
                          );
                          v2Hook.onRefresh();
                        } catch (error) {
                          console.error(
                            '[CollectionReportPageContent] Failed to restore session:',
                            error instanceof Error
                              ? error.message
                              : 'Unknown error'
                          );
                        }
                      }}
                      onPermanentDeleteSession={async sessionId => {
                        try {
                          await axios.delete(
                            `/api/collection-reports-v2/sessions/${sessionId}`
                          );
                          v2Hook.onRefresh();
                        } catch (error) {
                          console.error(
                            '[CollectionReportPageContent] Failed to permanently delete session:',
                            error instanceof Error
                              ? error.message
                              : 'Unknown error'
                          );
                        }
                      }}
                      sortField={v2Hook.sortField}
                      sortDirection={v2Hook.sortDirection}
                      onSort={v2Hook.handleSort}
                    />
                  </div>

                  <div className="md:hidden">
                    <CollectionReportV2Mobile
                      sessions={v2Hook.sessions}
                      loading={v2Hook.loading}
                      isRefreshing={v2Hook.isRefreshing}
                      canManage={canManageV2}
                      showArchived={v2Hook.showArchived}
                      onViewSession={sessionId => openV2View(sessionId)}
                      onEditSession={sessionId =>
                        setV2WizardSessionId(sessionId)
                      }
                      onSubmitSession={async sessionId => {
                        try {
                          await axios.patch(
                            `/api/collection-reports-v2/sessions/${sessionId}/submit`
                          );
                          v2Hook.onRefresh();
                        } catch (error) {
                          console.error(
                            '[CollectionReportPageContent] Failed to submit session:',
                            error instanceof Error
                              ? error.message
                              : 'Unknown error'
                          );
                        }
                      }}
                      onDeleteSession={sessionId => {
                        setV2DeleteConfirm(sessionId);
                      }}
                      onRestoreSession={async sessionId => {
                        try {
                          await axios.patch(
                            `/api/collection-reports-v2/sessions/${sessionId}`,
                            { action: 'restore' }
                          );
                          v2Hook.onRefresh();
                        } catch (error) {
                          console.error(
                            '[CollectionReportPageContent] Failed to restore session:',
                            error instanceof Error
                              ? error.message
                              : 'Unknown error'
                          );
                        }
                      }}
                      onPermanentDeleteSession={async sessionId => {
                        try {
                          await axios.delete(
                            `/api/collection-reports-v2/sessions/${sessionId}`
                          );
                          v2Hook.onRefresh();
                        } catch (error) {
                          console.error(
                            '[CollectionReportPageContent] Failed to permanently delete session:',
                            error instanceof Error
                              ? error.message
                              : 'Unknown error'
                          );
                        }
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
        reportToDelete={hook.reportToDelete}
        allReports={allReports}
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
          onSessionCreated={sessionId => {
            setV2WizardSessionId(sessionId);
            v2Hook.onRefresh();
          }}
        />
      )}

      <CollectionReportV2DeleteSessionModal
        isOpen={!!v2DeleteConfirm}
        sessionId={v2DeleteConfirm ?? ''}
        onClose={() => setV2DeleteConfirm(null)}
        onArchive={async sessionId => {
          await axios.delete(
            `/api/collection-reports-v2/sessions/${sessionId}?action=archive`
          );
          v2Hook.onRefresh();
        }}
        onDelete={async sessionId => {
          await axios.delete(
            `/api/collection-reports-v2/sessions/${sessionId}`
          );
          v2Hook.onRefresh();
        }}
      />

      <CollectionReportV2EditSessionModal
        isOpen={!!v2EditSessionId}
        sessionId={v2EditSessionId ?? ''}
        onClose={closeV2View}
        onEdit={sessionId => {
          closeV2View();
          setV2WizardSessionId(sessionId);
        }}
      />

      <CollectionReportV2WizardModal
        isOpen={!!v2WizardSessionId}
        sessionId={v2WizardSessionId ?? ''}
        onClose={() => {
          setV2WizardSessionId(null);
          v2Hook.onRefresh();
        }}
      />
    </>
  );
};

export default CollectionReportPageContent;
