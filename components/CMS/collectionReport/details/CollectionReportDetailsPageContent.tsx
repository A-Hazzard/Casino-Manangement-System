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

import CollectionReportDetailsCollectionsTable from '@/components/CMS/collectionReport/details/CollectionReportDetailsCollectionsTable';
import CollectionReportDetailsLocationMetricsTab from '@/components/CMS/collectionReport/details/CollectionReportDetailsLocationMetricsTab';
import CollectionReportDetailsSasCompareTab from '@/components/CMS/collectionReport/details/CollectionReportDetailsSasCompareTab';
import { CollectionReportIssueModal } from '@/components/CMS/collectionReport/modals/CollectionReportIssueModal';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import NotFoundError from '@/components/shared/ui/errors/NotFoundError';
import UnauthorizedError from '@/components/shared/ui/errors/UnauthorizedError';
import { CollectionReportSkeleton } from '@/components/shared/ui/skeletons/CollectionReportDetailSkeletons';
import {
    animateDesktopTabTransition,
    calculateLocationTotal,
} from '@/lib/helpers/collectionReport';
import { useCollectionReportDetailsData } from '@/lib/hooks/collectionReport/useCollectionReportDetailsData';
import { useUserStore } from '@/lib/store/userStore';
import { formatCurrency } from '@/lib/utils/currency';
import { ArrowLeft, RefreshCw, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Collection Report Details Page Content Component
 */
export default function CollectionReportDetailsPageContent() {
  const hook = useCollectionReportDetailsData();
  const { user } = useUserStore();

  const {
    reportData,
    loading,
    error,
    activeTab,
    searchTerm,
    sortField,
    sortDirection,
    showFixReportConfirmation,
    isFixingReport,
    hasSasTimeIssues,
    hasCollectionHistoryIssues,
    sasTimeIssues,
    showCollectionIssueModal,
    selectedIssue,
    collectionHistoryMachines,
    paginatedMetricsData,
    machineTotalPages,
    machinePage,
    tabContentRef,
    collections,
    setMachinePage,
    setSearchTerm,
    setShowFixReportConfirmation,
    setShowCollectionIssueModal,
    handleSort,
    handleTabChange,
    handleRefresh,
    handleFixReportConfirm,
    handleFixReportClick,
    handleIssueClick,
  } = hook;

  // ============================================================================
  // Effects
  // ============================================================================
  // Animate tab transitions on desktop
  useEffect(() => {
    animateDesktopTabTransition(tabContentRef);
  }, [activeTab, tabContentRef]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const isDeveloper = (user?.roles || []).includes('developer');

  const locationTotal = reportData ? calculateLocationTotal(collections) : 0;
  const textColorClass = locationTotal < 0 ? 'text-red-600' : 'text-green-600';

  // Group SAS issues by machine name
  const sasIssuesByMachine = sasTimeIssues.reduce(
    (acc, issue) => {
      const machineName = issue.machineName || 'Unknown';
      if (!acc[machineName]) {
        acc[machineName] = [];
      }
      acc[machineName].push(issue);
      return acc;
    },
    {} as Record<string, typeof sasTimeIssues>
  );

  // ============================================================================
  // Render Logic
  // ============================================================================
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
    <PageLayout
      headerProps={{
        containerPaddingMobile: 'px-4 py-8 lg:px-0 lg:py-0',
        disabled: loading,
      }}
      pageTitle=""
      hideOptions={true}
      hideLicenceeFilter={true}
      mainClassName="flex flex-col flex-1 w-full max-w-full"
      showToaster={false}
      onRefresh={handleRefresh}
      refreshing={loading}
    >
      {/* Header Section (Desktop Only): Back button, title, and Fix Report button */}
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
          <div className="flex items-center gap-2">
            {/* Fix Report Button - Developer Only */}
            {isDeveloper &&
              (hasSasTimeIssues || hasCollectionHistoryIssues) && (
                <Button
                  onClick={handleFixReportClick}
                  disabled={loading || isFixingReport}
                  variant="outline"
                  className="flex items-center gap-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                >
                  {isFixingReport ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Fixing Report...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Fix Report
                    </>
                  )}
                </Button>
              )}
          </div>
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
              Report ID: {reportData.reportId}
            </p>
            <p className={`text-lg font-semibold`}>
              Collection Report Machine Total Gross:{' '}
              <span className={textColorClass}>
                {formatCurrency(locationTotal)}
              </span>
            </p>
          </div>

          {/* Mobile Fix Report Button */}
          {isDeveloper && (hasSasTimeIssues || hasCollectionHistoryIssues) && (
            <div className="mt-4 flex justify-center px-4 lg:hidden">
              <Button
                onClick={handleFixReportClick}
                disabled={loading || isFixingReport}
                variant="outline"
                className="flex items-center gap-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
              >
                {isFixingReport ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Fixing Report...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Fix Report
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Warning Banner: Issue detection display (Developer Only) */}
      {isDeveloper && (hasSasTimeIssues || hasCollectionHistoryIssues) && (
        <div className="mx-2 mb-6 lg:mx-6">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  {hasSasTimeIssues && hasCollectionHistoryIssues
                    ? 'Multiple Issues Detected'
                    : hasSasTimeIssues
                      ? 'SAS Time Issues Detected'
                      : 'Collection History Issues Detected'}
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  {hasSasTimeIssues && (
                    <div className="mb-2">
                      <p className="font-medium">SAS Time Issues:</p>
                      <ul className="ml-4 mt-1 list-disc space-y-1">
                        {Object.entries(sasIssuesByMachine).map(
                          ([machineName, issues]) => (
                            <li key={machineName}>
                              <button
                                onClick={() => handleIssueClick(issues[0])}
                                className="text-left text-yellow-800 underline hover:text-yellow-900"
                              >
                                {machineName} ({issues.length} issue
                                {issues.length > 1 ? 's' : ''})
                              </button>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                  {hasCollectionHistoryIssues && (
                    <div>
                      <p className="font-medium">Collection History Issues:</p>
                      <ul className="ml-4 mt-1 list-disc space-y-1">
                        {collectionHistoryMachines.map(machineName => (
                          <li key={machineName}>{machineName}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-3 text-xs">
                    Use the &quot;Fix Report&quot; button above to automatically
                    resolve these issues.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Content Section: Sidebar navigation (1/4 width) and main content (3/4 width) */}
      <div className="hidden px-2 pb-6 lg:flex lg:flex-row lg:space-x-6 lg:px-6">
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

      {/* Modals */}
      <Dialog
        open={showFixReportConfirmation}
        onOpenChange={setShowFixReportConfirmation}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report Issues?</DialogTitle>
            <DialogDescription>
              This action will automatically synchronize collection history and
              SAS times to match the collection documents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFixReportConfirmation(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFixReportConfirm}>
              Fix All Issues
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedIssue && (
        <CollectionReportIssueModal
          isOpen={showCollectionIssueModal}
          onClose={() => setShowCollectionIssueModal(false)}
          issue={selectedIssue}
        />
      )}
    </PageLayout>
  );
}

