/**
 * CollectionReportModals Component
 *
 * A centralized orchestration component that manages the visibility and lifecycle of all collection-related modals.
 *
 * Features:
 * - Managed visibility for New Report modals (Context-aware Mobile/Desktop switching)
 * - Managed visibility for Edit Report flows
 * - Centralized deletion handling for reports and schedules
 * - Automated refresh triggers for parent data on successful operations
 * - Standardized error handling for complex form states
 *
 * @param showNewCollectionMobile - Visibility state for mobile creation flow
 * @param showNewCollectionDesktop - Visibility state for desktop creation flow
 * @param showEditMobile - Visibility state for mobile editing flow
 * @param showEditDesktop - Visibility state for desktop editing flow
 * @param showDeleteDialog - Visibility state for report deletion confirmation
 * @param showDeleteScheduleDialog - Visibility state for schedule deletion confirmation
 * @param showEditScheduleModal - Visibility state for schedule edit form
 * @param reportToDelete - Metadata of the report targeted for deletion
 * @param scheduleToDelete - Metadata of the schedule targeted for deletion
 * @param scheduleToEdit - Metadata of the schedule being modified
 * @param locations - Shared location/machine data for creation/editing
 * @param isProcessing - Global loading state for modal actions
 * @param onCloseModals - Master callback to close all active modals
 * @param onDeleteReport - Final execution callback for report deletion
 * @param onDeleteSchedule - Final execution callback for schedule deletion
 * @param onRefresh - Data refresh callback after operations
 * @param onRefreshLocations - Location-specific refresh callback
 */

'use client';

import CollectionReportEditCollectionModal from '@/components/CMS/collectionReport/modals/CollectionReportEditCollectionModal';
import CollectionReportNewCollectionModal from '@/components/CMS/collectionReport/modals/CollectionReportNewCollectionModal';
import CollectionReportMobileNewCollectionModal from '@/components/CMS/collectionReport/modals/CollectionReportMobileNewCollectionModal';
import CollectionReportV1DeleteModal from '@/components/CMS/collectionReport/modals/CollectionReportV1DeleteModal';
import ErrorBoundary from '@/components/shared/ui/errors/ErrorBoundary';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionReportRow } from '@/lib/types/components';

type CollectionReportModalsProps = {
  showNewCollectionMobile: boolean;
  showNewCollectionDesktop: boolean;
  showEditMobile: boolean;
  showEditDesktop: boolean;
  editingReportId: string | null;
  showDeleteConfirm: boolean;
  reportToDelete: string | null;
  isArchived?: boolean;
  allReports: CollectionReportRow[];
  locationsWithMachines: CollectionReportLocationWithMachines[];
  onCloseNewMobile: () => void;
  onCloseNewDesktop: () => void;
  onCloseEdit: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: (archive?: boolean) => Promise<void>;
  onRefresh: () => void;
  onRefreshLocations: () => void;
};

export default function CollectionReportModals({
  showNewCollectionMobile,
  showNewCollectionDesktop,
  showEditMobile,
  showEditDesktop,
  editingReportId,
  showDeleteConfirm,
  reportToDelete,
  isArchived = false,
  allReports,
  locationsWithMachines,
  onCloseNewMobile,
  onCloseNewDesktop,
  onCloseEdit,
  onCloseDelete,
  onConfirmDelete,
  onRefresh,
  onRefreshLocations,
}: CollectionReportModalsProps) {
  // ============================================================================
  // Computed
  // ============================================================================
  // Only render one modal at a time to prevent shared store state conflicts
  // Edit modal takes priority over new collection modal
  const showNewCollection =
    !editingReportId && (showNewCollectionMobile || showNewCollectionDesktop);
  const showEdit = !!editingReportId;

  const report = allReports.find(
    r => r.locationReportId === reportToDelete || r._id === reportToDelete
  );
  const locationName = report ? report.location : 'Report';

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {showNewCollection && showNewCollectionMobile && (
        <CollectionReportMobileNewCollectionModal
          show={showNewCollectionMobile}
          onClose={onCloseNewMobile}
          locations={locationsWithMachines}
          onRefresh={onRefresh}
          onRefreshLocations={onRefreshLocations}
        />
      )}

      {showNewCollection && showNewCollectionDesktop && (
        <CollectionReportNewCollectionModal
          show={showNewCollectionDesktop}
          onClose={onCloseNewDesktop}
          locations={locationsWithMachines}
          onRefresh={onRefresh}
          onRefreshLocations={onRefreshLocations}
        />
      )}

      {showEdit && (
        <ErrorBoundary>
          <CollectionReportEditCollectionModal
            show={showEditMobile || showEditDesktop}
            onClose={onCloseEdit}
            reportId={editingReportId}
            locations={locationsWithMachines}
            onRefresh={onRefresh}
          />
        </ErrorBoundary>
      )}

      <CollectionReportV1DeleteModal
        isOpen={showDeleteConfirm}
        reportId={reportToDelete || ''}
        locationName={locationName}
        isArchived={isArchived}
        onClose={onCloseDelete}
        onArchive={async () => {
          await onConfirmDelete(true);
        }}
        onDelete={async () => {
          await onConfirmDelete(false);
        }}
      />
    </>
  );
}
