/**
 * Collection Report Page
 *
 * Main page for managing collection reports with multiple views and filtering.
 */

'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { CollectionReportPageSkeleton } from '@/components/ui/skeletons/CollectionReportPageSkeleton';
import { COLLECTION_TABS_CONFIG } from '@/lib/constants/collection';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import {
    shouldShowLicenseeFilter,
    shouldShowNoLicenseeMessage,
} from '@/lib/utils/licenseeAccess';
import dynamic from 'next/dynamic';
import { Suspense, useRef, useState } from 'react';

// Hooks
import { useCollectionReportPageData } from '@/lib/hooks/collectionReport/useCollectionReportPageData';

// Components
import CollectionNavigation from '@/components/collectionReport/CollectionNavigation';
import CollectionReportHeader from '@/components/collectionReport/CollectionReportHeader';
import CollectionReportModals from '@/components/collectionReport/CollectionReportModals';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import PaginationControls from '@/components/ui/PaginationControls';

// Dynamic UI Imports
const CollectionDesktopUI = dynamic(
  () => import('@/components/collectionReport/CollectionDesktopUI'),
  { ssr: false }
);
const CollectionMobileUI = dynamic(
  () => import('@/components/collectionReport/CollectionMobileUI'),
  { ssr: false }
);

const MotionDiv = dynamic(
  () => import('framer-motion').then(mod => mod.motion.div),
  { ssr: false }
);
const AnimatePresence = dynamic(
  () => import('framer-motion').then(mod => mod.AnimatePresence),
  { ssr: false }
);

/**
 * Collection Report Page Content Component
 */
function CollectionReportContent() {
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

  return (
    <>
      <PageLayout
        headerProps={{ setSelectedLicencee, disabled: false }}
        hideLicenceeFilter={!shouldShowLicenseeFilter(user)}
        hideCurrencyFilter
        mainClassName="flex flex-col flex-1 w-full max-w-full p-4 md:p-6 overflow-x-hidden"
        showToaster
      >
        <CollectionReportHeader
          activeTab={activeTab}
          refreshing={refreshing}
          loading={loading}
          onRefresh={handleRefresh}
          onCreateDesktop={() => setShowNewCollectionDesktop(true)}
          onCreateMobile={() => setShowNewCollectionMobile(true)}
        />

        <div className="mb-8 mt-8">
          <CollectionNavigation
            tabs={COLLECTION_TABS_CONFIG}
            activeView={activeTab}
            onChange={handleTabChange}
            isLoading={false}
          />
        </div>

        {activeTab !== 'monthly' && (
          <div className="mb-6">
            <DashboardDateFilters
              hideAllTime={false}
              onCustomRangeGo={handleRefresh}
            />
          </div>
        )}

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
              {activeTab === 'collection' && (
                <div className="tab-content-wrapper">
                  {/* Desktop UI - hidden on mobile */}
                  <div className="hidden lg:block">
                    <CollectionDesktopUI
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
                      editableReportIds={new Set()} // Will be populated in hook if needed
                    />
                  </div>

                  {/* Mobile UI - hidden on desktop */}
                  <div className="lg:hidden">
                    <CollectionMobileUI
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
                      editableReportIds={new Set()} // Will be populated in hook if needed
                    />
                  </div>

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
              {/* Other tabs follow similar pattern - keeping it lean for initial refactor */}
            </MotionDiv>
          </AnimatePresence>
        </div>
      </PageLayout>

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

export default function CollectionReportPage() {
  return (
    <ProtectedRoute requiredPage="collection-report">
      <Suspense fallback={<CollectionReportPageSkeleton />}>
        <CollectionReportContent />
      </Suspense>
    </ProtectedRoute>
  );
}
