/**
 * Collection Report Detail Page
 *
 * Displays detailed information about a specific collection report with multiple views.
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

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// Layout components
import PageLayout from '@/components/layout/PageLayout';

// Skeleton components
import {
    CollectionReportSkeleton,
} from '@/components/ui/skeletons/CollectionReportDetailSkeletons';

// Hooks
import { useCollectionReportDetailsData } from '@/lib/hooks/collectionReport/useCollectionReportDetailsData';

// Components
import { CollectionIssueModal } from '@/components/collectionReport/CollectionIssueModal';
import LocationReportSummarySection from '@/components/collectionReport/details/LocationReportSummarySection';
import LocationReportCollectionsTable from '@/components/collectionReport/details/LocationReportCollectionsTable';
import LocationReportIssuesSection from '@/components/collectionReport/details/LocationReportIssuesSection';
import LocationReportLocationMetricsTab from '@/components/collectionReport/details/LocationReportLocationMetricsTab';
import LocationReportSasCompareTab from '@/components/collectionReport/details/LocationReportSasCompareTab';

// ============================================================================
// Page Components
// ============================================================================
/**
 * Collection Report Detail Page Content Component
 * Handles all state management and data fetching for the collection report detail page
 */
function CollectionReportPageContent() {
  const hook = useCollectionReportDetailsData();

  const {
    reportId,
    reportData,
    loading,
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
    setMachinePage,
    setSearchTerm,
    setShowFixReportConfirmation,
    setShowCollectionIssueModal,
    handleSort,
    handleTabChange,
    handleFixReportConfirm,
    handleFixReportClick,
  } = hook;

  // ============================================================================
  // Render Logic
  // ============================================================================
  if (loading) return <CollectionReportSkeleton />;

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

  if (!reportData) return null;

    return (
      <PageLayout
        headerProps={{
          containerPaddingMobile: 'px-4 py-8 lg:px-0 lg:py-0',
        disabled: loading,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
      <div className="flex w-full flex-col gap-6">
        {/* Summary Section */}
        <LocationReportSummarySection
          reportData={reportData}
          reportId={reportId}
          hasSasTimeIssues={hasSasTimeIssues}
          hasCollectionHistoryIssues={hasCollectionHistoryIssues}
          isFixingReport={isFixingReport}
          onFixReportClick={handleFixReportClick}
        />

        {/* Issues Alert Section */}
        <LocationReportIssuesSection
          hasSasTimeIssues={hasSasTimeIssues}
          hasCollectionHistoryIssues={hasCollectionHistoryIssues}
          sasTimeIssuesCount={sasTimeIssues.length}
          collectionHistoryMachinesCount={collectionHistoryMachines.length}
          onFixIssuesClick={handleFixReportClick}
        />

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Tabs Sidebar */}
          <div className="w-full shrink-0 lg:w-64">
            <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
              <TabButton label="Machine Metrics" />
              <TabButton label="Location Metrics" />
              <TabButton label="SAS Metrics Compare" />
            </div>
        </div>

          {/* Tab Content */}
          <div className="min-w-0 flex-1" ref={tabContentRef}>
            {activeTab === 'Machine Metrics' && (
              <LocationReportCollectionsTable
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
              <LocationReportLocationMetricsTab reportData={reportData} />
          )}

          {activeTab === 'SAS Metrics Compare' && (
              <LocationReportSasCompareTab
                metrics={reportData.machineMetrics || []}
                paginatedMetrics={paginatedMetricsData}
                currentPage={machinePage}
                totalPages={machineTotalPages}
                onPageChange={setMachinePage}
              />
          )}
        </div>
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
              This action will automatically synchronize collection history and SAS times to match the collection documents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFixReportConfirmation(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFixReportConfirm}>
              Fix All Issues
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedIssue && (
        <CollectionIssueModal
          isOpen={showCollectionIssueModal}
          onClose={() => setShowCollectionIssueModal(false)}
          issue={selectedIssue}
        />
      )}
    </PageLayout>
  );
}

/**
 * Main Collection Report Detail Page
 */
export default function LocationReportDetailPage() {
  return (
    <ProtectedRoute requiredPage="collection-report">
      <CollectionReportPageContent />
    </ProtectedRoute>
  );
}
