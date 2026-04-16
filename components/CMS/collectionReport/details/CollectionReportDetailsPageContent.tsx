/**
 * Collection Report Details Page Content Component
 *
 * Handles all state management and data fetching for the collection report detail page.
 *
 * Features:
 * - Machine Metrics tab: View individual machine collection data
 * - Location Metrics tab: View location-level aggregated metrics
 * - SAS Metrics Compare tab: Compare SAS times and metrics
 * - Issue detection and fixing
 * - Search and filter capabilities
 * - Pagination
 * - Responsive design for mobile and desktop
 */

'use client';

import { CollectionReportDetailsCollectionsTable } from '@/components/CMS/collectionReport/details/CollectionReportDetailsCollectionsTable';
import CollectionReportDetailsLocationMetricsTab from '@/components/CMS/collectionReport/details/CollectionReportDetailsLocationMetricsTab';
import CollectionReportDetailsSasCompareTab from '@/components/CMS/collectionReport/details/CollectionReportDetailsSasCompareTab';
import CollectionReportEditCollectionModal from '@/components/CMS/collectionReport/modals/CollectionReportEditCollectionModal';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import NotFoundError from '@/components/shared/ui/errors/NotFoundError';
import UnauthorizedError from '@/components/shared/ui/errors/UnauthorizedError';
import { CollectionReportSkeleton } from '@/components/shared/ui/skeletons/CollectionReportDetailSkeletons';
import {
    animateDesktopTabTransition,
    calculateLocationTotal,
} from '@/lib/helpers/collectionReport';
import { getLocationsWithMachines } from '@/lib/helpers/collectionReport/fetching';
import { useCollectionReportDetailsData } from '@/lib/hooks/collectionReport/useCollectionReportDetailsData';
import { useUserStore } from '@/lib/store/userStore';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import { formatCurrency } from '@/lib/utils/currency';
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export default function CollectionReportDetailsPageContent() {
  const hook = useCollectionReportDetailsData();
  const user = useUserStore(state => state.user);

  // Only developer, owner and admin can edit
  const canEdit = !!(user?.roles && (user.roles.includes('developer') || user.roles.includes('admin') || user.roles.includes('owner')));

  const [showEditModal, setShowEditModal] = useState(false);
  const [editLocations, setEditLocations] = useState<CollectionReportLocationWithMachines[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // ============================================================================
  // Table Interaction & Edit Handlers
  // ============================================================================
  const handleOpenEdit = useCallback(async () => {
    if (loadingLocations) return;
    setLoadingLocations(true);
    try {
      const locs = await getLocationsWithMachines();
      setEditLocations(locs);
    } catch {
      // fall back to empty — the modal will still load its own data
      setEditLocations([]);
    } finally {
      setLoadingLocations(false);
    }
    setShowEditModal(true);
  }, [loadingLocations]);

  const {
    reportData,
    loading,
    error,
    activeTab,
    searchTerm,
    sortField,
    sortDirection,
    paginatedMetricsData,
    machineTotalPages,
    machinePage,
    tabContentRef,
    collections,
    setMachinePage,
    setSearchTerm,
    handleSort,
    handleTabChange,
    handleRefresh,
  } = hook;

  // ============================================================================
  // Tab Transition Effects
  // ============================================================================
  // Animate tab transitions on desktop
  useEffect(() => {
    animateDesktopTabTransition(tabContentRef);
  }, [activeTab, tabContentRef]);

  // ============================================================================
  // Report Financial Calculations
  // ============================================================================
  const locationTotal = reportData ? calculateLocationTotal(collections) : 0;
  //red = negative values, green = positive values
  const textColorClass = locationTotal < 0 ? 'text-red-600' : 'text-green-600'; 
  if (loading) return <CollectionReportSkeleton />;

  // Handle error states
  if (error === 'UNAUTHORIZED') {
    return (
      <UnauthorizedError
        title="Access Denied"
        message="You are not authorized to view this collection report."
        resourceType="report"
        customBackText="Back to Collection Reports"
        customBackHref="/collection-report"
      />
    );
  }

  if (error || !reportData) {
    return (
      <NotFoundError
        title="Collection Report Not Found"
        message={
          error && error !== 'UNAUTHORIZED'
            ? error
            : 'The requested collection report could not be found.'
        }
        resourceType="report"
        showRetry={false}
        customBackText="Back to Collection Reports"
        customBackHref="/collection-report"
      />
    );
  }

  const TabButton = ({
    label,
  }: {
    label: 'Machine Metrics' | 'Location Metrics' | 'SAS Metrics Compare';
  }) => (
    <button
      onClick={() => !loading && handleTabChange(label)}
      disabled={loading}
      className={`w-full rounded-md px-4 py-3 text-left text-sm font-medium transition-colors ${
        activeTab === label
          ? 'bg-buttonActive text-white'
          : 'text-gray-700 hover:bg-gray-100'
      } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <>
    <PageLayout
      headerProps={{
        containerPaddingMobile: 'px-4 py-8 lg:px-0 lg:py-0',
        disabled: loading,
      }}
      
      hideOptions={true}
      hideLicenceeFilter={true}
      mainClassName="flex flex-col flex-1 w-full max-w-full"
      showToaster={false}
      onRefresh={handleRefresh}
      refreshing={loading}
    >
      {/* Header Section (Desktop Only): Back button, title */}
      <div className="hidden px-2 pt-6 lg:block lg:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/collection-report">
              <Button
                variant="ghost"
                className="rounded-full border border-gray-200 p-2 hover:bg-gray-100"
              >
                <ArrowLeft size={18} className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Collection Report Details</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh Report Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {canEdit && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleOpenEdit}
                disabled={loadingLocations}
              >
                <Pencil size={16} />
                {loadingLocations ? 'Loading…' : 'Edit Report'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Back Button & Actions */}
      <div className="flex items-center justify-between px-2 pt-4 lg:hidden">
        <Link href="/collection-report" className="inline-block">
          <Button
            variant="ghost"
            className="rounded-full border border-gray-200 p-2 hover:bg-gray-100"
          >
            <ArrowLeft size={18} className="h-5 w-5" />
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh Report Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-9 px-3"
              onClick={handleOpenEdit}
              disabled={loadingLocations}
            >
              <Pencil size={14} />
              <span className="text-xs font-semibold">{loadingLocations ? 'Loading…' : 'Edit Report'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Report Header Section: Location name, report ID, and financial summary */}
      <div className="px-2 pb-6 pt-2 lg:px-6 lg:pt-4">
        <div className="rounded-lg bg-white py-4 shadow lg:border-t-4 lg:border-lighterBlueHighlight lg:bg-container lg:py-8">
          <div className="px-4 py-2 text-center lg:py-4">
            <div className="mb-2 text-xs text-gray-500 lg:hidden">
              COLLECTION REPORT
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-800 lg:text-4xl">
              {reportData.locationName}
            </h1>
            <p className="mb-4 text-sm text-gray-600 lg:text-base">
              {/* TODO Change to Compound field later to a more understandable report ID rather than using _id*/}
              Report ID: {reportData.reportId} 
            </p>
            <p className={`text-lg font-semibold`}>
              Collection Report Machine Total Gross:{' '}
              <span className={textColorClass}>
                {formatCurrency(locationTotal)}
              </span>
            </p>
          </div>


        </div>
      </div>



      {/* Desktop Content Section: Sidebar navigation (1/4 width) and main content (3/4 width) */}
      <div className="hidden px-2 pb-6 lg:flex lg:flex-row lg:space-x-6 lg:px-6">
        {/* Sidebar */}
        <div className="mb-6 lg:mb-0 lg:w-1/4">
          <div className="space-y-2 rounded-lg bg-white p-3 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Report Sections
            </h3>
            <div className="space-y-2">
              <TabButton label="Machine Metrics" />
              <TabButton label="Location Metrics" />
              <TabButton label="SAS Metrics Compare" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4" ref={tabContentRef}>
          {activeTab === 'Machine Metrics' && (
            <CollectionReportDetailsCollectionsTable
              metrics={reportData.machineMetrics || []}
              paginatedMetrics={paginatedMetricsData}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={machinePage}
              totalPages={machineTotalPages}
              onPageChange={setMachinePage}
              useNetGross={reportData.useNetGross || false}
            />
          )}

          {activeTab === 'Location Metrics' && (
            <CollectionReportDetailsLocationMetricsTab
              reportData={reportData}
            />
          )}

          {activeTab === 'SAS Metrics Compare' && (
            <CollectionReportDetailsSasCompareTab reportData={reportData} />
          )}
        </div>
      </div>

      {/* Mobile Content Section: Select dropdown and content */}
      <div className="px-2 pb-6 lg:hidden">
        {/* Mobile Navigation Select */}
        <div className="mb-6">
          <select
            value={activeTab}
            onChange={e => handleTabChange(e.target.value as typeof activeTab)}
            className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
            disabled={loading}
          >
            <option value="Machine Metrics">Machine Metrics</option>
            <option value="Location Metrics">Location Metrics</option>
            <option value="SAS Metrics Compare">SAS Metrics Compare</option>
          </select>
        </div>

        {/* Mobile Content */}
        <div className="space-y-4">
          {activeTab === 'Machine Metrics' && (
            <CollectionReportDetailsCollectionsTable
              metrics={reportData.machineMetrics || []}
              paginatedMetrics={paginatedMetricsData}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={machinePage}
              totalPages={machineTotalPages}
              onPageChange={setMachinePage}
              useNetGross={reportData.useNetGross || false}
            />
          )}

          {activeTab === 'Location Metrics' && (
            <CollectionReportDetailsLocationMetricsTab
              reportData={reportData}
            />
          )}

          {activeTab === 'SAS Metrics Compare' && (
            <CollectionReportDetailsSasCompareTab reportData={reportData} />
          )}
        </div>
      </div>




    </PageLayout>

    {/* Edit Collection Report Modal — developer / admin only */}
    {canEdit && showEditModal && reportData && (
      <CollectionReportEditCollectionModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        reportId={reportData.reportId}
        locations={editLocations}
        onRefresh={handleRefresh}
      />
    )}
  </>
  );
}

