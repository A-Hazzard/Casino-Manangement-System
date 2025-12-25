/**
 * CollectionReportModals Component
 *
 * Orchestrates all modals for the collection report page.
 *
 * Features:
 * - New Report modals (Mobile & Desktop)
 * - Edit Report modals (Mobile & Desktop)
 * - Delete Confirmation dialog
 * - Error boundary protection for complex edit modals
 */

'use client';

import EditCollectionModal from '@/components/collectionReport/EditCollectionModal';
import NewCollectionModal from '@/components/collectionReport/NewCollectionModal';
import MobileCollectionModal from '@/components/collectionReport/mobile/MobileCollectionModal';
import MobileEditCollectionModal from '@/components/collectionReport/mobile/MobileEditCollectionModal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import ErrorBoundary from '@/components/ui/errors/ErrorBoundary';
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
      <MobileCollectionModal
        show={showNewCollectionMobile}
        onClose={onCloseNewMobile}
        locations={locationsWithMachines}
        onRefresh={onRefresh}
        onRefreshLocations={onRefreshLocations}
      />

      <NewCollectionModal
        show={showNewCollectionDesktop}
        onClose={onCloseNewDesktop}
        locations={locationsWithMachines}
        onRefresh={onRefresh}
        onRefreshLocations={onRefreshLocations}
      />

      {editingReportId && (
        <MobileEditCollectionModal
          show={showEditMobile}
          onClose={onCloseEdit}
          locations={locationsWithMachines}
          onRefresh={onRefresh}
          reportId={editingReportId}
        />
      )}

      {editingReportId && (
        <ErrorBoundary>
          <EditCollectionModal
            show={showEditDesktop}
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
