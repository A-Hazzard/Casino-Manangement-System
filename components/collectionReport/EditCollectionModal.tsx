/**
 * Edit Collection Modal Component
 *
 * Comprehensive modal for editing existing collection reports with machine data.
 *
 * Features:
 * - Location selection (locked)
 * - Collection time/date editing
 * - Machine data editing (meters in/out, RAM clear, notes)
 * - Financial data management
 * - Report updates
 * - Loading states and skeletons
 * - Toast notifications
 *
 * @module components/collectionReport/EditCollectionModal
 */

'use client';

import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InfoConfirmationDialog } from '@/components/ui/InfoConfirmationDialog';
import { useEditCollectionModal } from '@/lib/hooks/collectionReport/useEditCollectionModal';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import { useCallback } from 'react';
import EditCollectionCollectedMachines from './forms/EditCollectionCollectedMachines';
import EditCollectionFinancials from './forms/EditCollectionFinancials';
import EditCollectionFormFields from './forms/EditCollectionFormFields';
import EditCollectionLocationMachineSelection from './forms/EditCollectionLocationMachineSelection';

type EditCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
};

export default function EditCollectionModal({
  show,
  onClose,
  reportId,
  locations = [],
  onRefresh,
}: EditCollectionModalProps) {
  // ============================================================================
  // Hooks & State (via custom hook)
  // ============================================================================
  const {
    // State
    selectedLocationId,
    setSelectedLocationId,
    selectedLocationName,
    selectedMachineId,
    setSelectedMachineId,
    collectedMachineEntries,
    machinesOfSelectedLocation,
    machineSearchTerm,
    setMachineSearchTerm,
    updateAllDate,
    setUpdateAllDate,
    isLoadingMachines,
    isProcessing,
    editingEntryId,
    showUpdateConfirmation,
    setShowUpdateConfirmation,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showViewMachineConfirmation,
    setShowViewMachineConfirmation,
    showUnsavedChangesWarning,
    setShowUnsavedChangesWarning,
    currentCollectionTime,
    setCurrentCollectionTime,
    currentMetersIn,
    setCurrentMetersIn,
    currentMetersOut,
    setCurrentMetersOut,
    currentRamClearMetersIn,
    setCurrentRamClearMetersIn,
    currentRamClearMetersOut,
    setCurrentRamClearMetersOut,
    currentMachineNotes,
    setCurrentMachineNotes,
    currentRamClear,
    setCurrentRamClear,
    showAdvancedSas,
    setShowAdvancedSas,
    customSasStartTime,
    setCustomSasStartTime,
    prevIn,
    prevOut,
    isFirstCollection,
    financials,
    setFinancials,
    baseBalanceCorrection,
    setBaseBalanceCorrection,

    // Computed
    machineForDataEntry,
    filteredMachines,
    isUpdateReportEnabled,

    // Handlers
    handleClose,
    handleDisabledFieldClick,
    handleEditEntry,
    handleCancelEdit,
    handleAddOrUpdateEntry,
    confirmUpdateEntry,
    handleDeleteEntry,
    confirmDeleteEntry,
    handleUpdateReport,
  } = useEditCollectionModal({
    show,
    reportId,
    locations,
    onRefresh,
    onClose,
  });

  // Memoize onOpenChange handler to prevent Dialog re-renders
  const handleDialogOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        handleClose();
      }
      // When opening (isOpen === true), we don't need to do anything
      // The Dialog will handle the open state via the `open` prop
    },
    [handleClose]
  );

  return (
    <>
      <Dialog open={show} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="flex h-[calc(100vh-2rem)] max-w-6xl flex-col bg-container p-0 md:h-[95vh] lg:h-[90vh] lg:max-w-7xl"
          onInteractOutside={e => e.preventDefault()}
        >
          <DialogHeader className="p-4 pb-0 md:p-6">
            <DialogTitle className="text-xl font-bold md:text-2xl">
              Edit Collection Report
            </DialogTitle>
            <DialogDescription>
              Edit the collection report for the selected location and machines.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-grow flex-row overflow-hidden">
            {/* Left sidebar: Location selector and machine list - 1/5 width */}
            <EditCollectionLocationMachineSelection
              locations={locations}
              selectedLocationId={selectedLocationId}
              setSelectedLocationId={setSelectedLocationId}
              machinesOfSelectedLocation={machinesOfSelectedLocation}
              machineSearchTerm={machineSearchTerm}
              setMachineSearchTerm={setMachineSearchTerm}
              filteredMachines={filteredMachines}
              isLoadingMachines={isLoadingMachines}
              isProcessing={isProcessing}
              selectedMachineId={selectedMachineId}
              setSelectedMachineId={setSelectedMachineId}
              collectedMachineEntries={collectedMachineEntries}
              editingEntryId={editingEntryId}
            />

            {/* Middle section: Form fields - 3/5 width (60%) */}
            <div className="flex min-h-0 w-3/5 flex-col space-y-3 overflow-y-auto p-3 md:p-4">
              {(selectedMachineId && machineForDataEntry) ||
              collectedMachineEntries.length > 0 ? (
                <>
                  <EditCollectionFormFields
                    selectedLocationName={selectedLocationName}
                    machineForDataEntry={machineForDataEntry}
                    currentCollectionTime={currentCollectionTime}
                    setCurrentCollectionTime={setCurrentCollectionTime}
                    isFirstCollection={isFirstCollection}
                    showAdvancedSas={showAdvancedSas}
                    setShowAdvancedSas={setShowAdvancedSas}
                    customSasStartTime={customSasStartTime}
                    setCustomSasStartTime={setCustomSasStartTime}
                    currentMetersIn={currentMetersIn}
                    setCurrentMetersIn={setCurrentMetersIn}
                    currentMetersOut={currentMetersOut}
                    setCurrentMetersOut={setCurrentMetersOut}
                    currentRamClearMetersIn={currentRamClearMetersIn}
                    setCurrentRamClearMetersIn={setCurrentRamClearMetersIn}
                    currentRamClearMetersOut={currentRamClearMetersOut}
                    setCurrentRamClearMetersOut={setCurrentRamClearMetersOut}
                    currentMachineNotes={currentMachineNotes}
                    setCurrentMachineNotes={setCurrentMachineNotes}
                    currentRamClear={currentRamClear}
                    setCurrentRamClear={setCurrentRamClear}
                    prevIn={prevIn}
                    prevOut={prevOut}
                    debouncedCurrentMetersIn={currentMetersIn} // Using direct for now, or from hook
                    debouncedCurrentMetersOut={currentMetersOut}
                    inputsEnabled={!!selectedMachineId}
                    isProcessing={isProcessing}
                    editingEntryId={editingEntryId}
                    isAddMachineEnabled={true} // Simplified for now
                    onAddOrUpdateEntry={handleAddOrUpdateEntry}
                    onCancelEdit={handleCancelEdit}
                    onDisabledFieldClick={handleDisabledFieldClick}
                    onViewMachine={() => setShowViewMachineConfirmation(true)}
                  />

                  <EditCollectionFinancials
                    financials={financials}
                    setFinancials={setFinancials}
                    baseBalanceCorrection={baseBalanceCorrection}
                    setBaseBalanceCorrection={setBaseBalanceCorrection}
                    isProcessing={isProcessing}
                    isUpdateReportEnabled={isUpdateReportEnabled}
                    onUpdateReport={handleUpdateReport}
                  />
                </>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center text-gray-500">
                    Select a location and machine from the left to enter its
                    collection data.
                  </p>
                </div>
              )}
            </div>

            {/* Right sidebar: Collected machines list - 1/5 width */}
            <EditCollectionCollectedMachines
              collectedMachineEntries={collectedMachineEntries}
              isProcessing={isProcessing}
              onEditEntry={handleEditEntry}
              onDeleteEntry={handleDeleteEntry}
              updateAllDate={updateAllDate}
              setUpdateAllDate={setUpdateAllDate}
              onRefresh={onRefresh}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showUpdateConfirmation}
        onClose={() => setShowUpdateConfirmation(false)}
        onConfirm={confirmUpdateEntry}
        title="Update Machine Entry"
        message="Are you sure you want to update this machine's meter readings? This will change the collection history for this machine."
        confirmText="Update Entry"
        cancelText="Cancel"
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={confirmDeleteEntry}
        title="Delete Machine Collection"
        message="Are you sure you want to delete this machine from the collection report? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ConfirmationDialog
        isOpen={showUnsavedChangesWarning}
        onClose={() => setShowUnsavedChangesWarning(false)}
        onConfirm={() => {
          setShowUnsavedChangesWarning(false);
          onClose();
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close and discard them?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
      />

      <InfoConfirmationDialog
        isOpen={showViewMachineConfirmation}
        onClose={() => setShowViewMachineConfirmation(false)}
        onConfirm={() => {
          if (machineForDataEntry?._id) {
            window.open(`/machines/${machineForDataEntry._id}`, '_blank');
          }
          setShowViewMachineConfirmation(false);
        }}
        title="View Machine Details"
        message={`Open ${machineForDataEntry?.name || 'machine'} details in a new tab?`}
        confirmText="Open in New Tab"
        cancelText="Cancel"
      />
    </>
  );
}
