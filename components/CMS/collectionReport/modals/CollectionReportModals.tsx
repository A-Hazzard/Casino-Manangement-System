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
import { ConfirmationDialog } from '@/components/shared/ui/ConfirmationDialog';
import ErrorBoundary from '@/components/shared/ui/errors/ErrorBoundary';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';

type CollectionReportModalsProps = {
  showNewCollectionMobile: boolean;
  showNewCollectionDesktop: boolean;
  showEditMobile: boolean;
  showEditDesktop: boolean;
  editingReportId: string | null;
  showDeleteConfirm: boolean;
  locationsWithMachines: CollectionReportLocationWithMachines[];
  onCloseNewMobile: () => void;
  onCloseNewDesktop: () => void;
  onCloseEdit: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
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
  locationsWithMachines,
  onCloseNewMobile,
  onCloseNewDesktop,
  onCloseEdit,
  onCloseDelete,
  onConfirmDelete,
  onRefresh,
  onRefreshLocations,
}: CollectionReportModalsProps) {
  return (
    <>
      <CollectionReportMobileNewCollectionModal
        show={showNewCollectionMobile}
        onClose={onCloseNewMobile}
        locations={locationsWithMachines}
        onRefresh={onRefresh}
        onRefreshLocations={onRefreshLocations}
      />

      <CollectionReportNewCollectionModal
        show={showNewCollectionDesktop}
        onClose={onCloseNewDesktop}
        locations={locationsWithMachines}
        onRefresh={onRefresh}
        onRefreshLocations={onRefreshLocations}
      />

      {editingReportId && (
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

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this collection report? This will also delete all associated collections, remove them from machine history, and revert collection meters to their previous values. This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={false}
      />
    </>
  );
}

