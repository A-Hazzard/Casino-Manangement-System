/**
 * New Collection Modal Component
 * Comprehensive modal for creating new collection reports with machine data entry.
 *
 * Features:
 * - Location selection
 * - Collection time/date picker
 * - Machine selection and data entry
 * - Meter readings (meters in/out, previous meters)
 * - Movement calculations
 * - SAS time override functionality
 * - Machine validation
 * - Collection report creation
 * - Machine collection history updates
 * - Debounced search and validation
 * - Loading states and skeletons
 * - Toast notifications
 * - Tooltips for guidance
 *
 * @param open - Whether the modal is visible
 * @param onClose - Callback to close the modal
 * @param onSuccess - Callback when collection is successfully created
 */
import CollectionReportNewCollectionCollectedMachines from '@/components/collectionReport/forms/CollectionReportNewCollectionCollectedMachines';
import CollectionReportNewCollectionFinancials from '@/components/collectionReport/forms/CollectionReportNewCollectionFinancials';
import CollectionReportNewCollectionFormFields from '@/components/collectionReport/forms/CollectionReportNewCollectionFormFields';
import CollectionReportNewCollectionLocationMachineSelection from '@/components/collectionReport/forms/CollectionReportNewCollectionLocationMachineSelection';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InfoConfirmationDialog } from '@/components/ui/InfoConfirmationDialog';
import {
  getUserDisplayName,
  logActivity,
} from '@/lib/helpers/collectionReport/newCollectionModalHelpers';
import { useNewCollectionModal } from '@/lib/hooks/collectionReport/useNewCollectionModal';
import { useUserStore } from '@/lib/store/userStore';
import { formatDate } from '@/lib/utils/formatting';
import { useCallback } from 'react';
import { toast } from 'sonner';

import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionReportNewCollectionModalProps } from '@/lib/types/componentProps';

export default function CollectionReportNewCollectionModal({
  show,
  onClose,
  locations = [],
  onRefresh,
  onRefreshLocations,
  onSuccess,
}: CollectionReportNewCollectionModalProps) {
  const user = useUserStore(state => state.user);
  const userId = user?._id;

  // Helper function to get proper user display name for activity logging
  const getUserDisplayNameCallback = useCallback(() => {
    if (!user) return 'Unknown User';
    return getUserDisplayName({
      profile: user.profile,
      username: user.username,
      emailAddress: user.emailAddress,
    });
  }, [user]);

  // Activity logging function wrapper
  const logActivityCallback = useCallback(
    async (
      action: string,
      resource: string,
      resourceId: string,
      resourceName: string,
      details: string,
      previousData?: Record<string, unknown> | null,
      newData?: Record<string, unknown> | null
    ) => {
      await logActivity(
        action,
        resource,
        resourceId,
        resourceName,
        details,
        user?._id,
        getUserDisplayNameCallback(),
        previousData,
        newData
      );
    },
    [user, getUserDisplayNameCallback]
  );

  const {
    selectedLocationId,
    selectedLocationName,
    machinesOfSelectedLocation,
    machineSearchTerm,
    setMachineSearchTerm,
    lockedLocationId,
    selectedMachineId,
    setSelectedMachineId,
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
    isFirstCollection,
    collectedMachineEntries,
    isProcessing,
    editingEntryId,
    showUpdateConfirmation,
    setShowUpdateConfirmation,
    showMachineRolloverWarning,
    setShowMachineRolloverWarning,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showViewMachineConfirmation,
    setShowViewMachineConfirmation,
    showCreateReportConfirmation,
    setShowCreateReportConfirmation,
    financials,
    setFinancials,
    baseBalanceCorrection,
    setBaseBalanceCorrection,
    prevIn,
    prevOut,
    previousCollectionTime,
    isLoadingExistingCollections,
    filteredMachines,
    machineForDataEntry,
    inputsEnabled,
    isAddMachineEnabled,
    debouncedCurrentMetersIn,
    debouncedCurrentMetersOut,
    debouncedCurrentRamClearMetersIn,
    debouncedCurrentRamClearMetersOut,
    handleLocationChange,
    handleClose,
    handleDisabledFieldClick,
    handleAddOrUpdateEntry,
    handleEditCollectedEntry,
    handleDeleteCollectedEntry,
    confirmUpdateEntry,
    confirmDeleteEntry,
    confirmCreateReports,
    handleConfirmMachineRollover,
    handleCancelMachineRollover,
    handleCancelEdit,
    handleAddEntry,
  } = useNewCollectionModal({
    show,
    locations,
    userId,
    onRefresh,
    onRefreshLocations,
    onSuccess,
    onClose,
    logActivityCallback,
  });

  return (
    <>
      <Dialog open={show} onOpenChange={handleClose}>
        <DialogContent className="flex h-[calc(100vh-2rem)] max-w-6xl flex-col bg-container p-0 md:h-[95vh] lg:h-[90vh] lg:max-w-7xl">
          <DialogHeader className="p-4 pb-0 md:p-6">
            <DialogTitle className="text-xl font-bold md:text-2xl">
              New Collection Report Batch
            </DialogTitle>
            <DialogDescription>
              Create a new collection report for the selected location and
              machines.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-grow flex-row overflow-hidden">
            {/* Left sidebar: Location selector and machine list - 1/5 width */}
            <CollectionReportNewCollectionLocationMachineSelection
              locations={locations.map(
                (loc: CollectionReportLocationWithMachines) => ({
                  _id: String(loc._id),
                  name: loc.name,
                })
              )}
              selectedLocationId={selectedLocationId}
              lockedLocationId={lockedLocationId}
              machinesOfSelectedLocation={machinesOfSelectedLocation}
              machineSearchTerm={machineSearchTerm}
              filteredMachines={filteredMachines}
              selectedMachineId={selectedMachineId}
              collectedMachineEntries={collectedMachineEntries}
              editingEntryId={editingEntryId}
              isLoadingExistingCollections={isLoadingExistingCollections}
              isProcessing={isProcessing}
              onLocationChange={handleLocationChange}
              onMachineSearchChange={setMachineSearchTerm}
              onMachineSelect={setSelectedMachineId}
            />

            {/* Middle section: Form fields - 3/5 width (60%) */}
            <div className="flex min-h-0 w-3/5 flex-col space-y-3 overflow-y-auto p-3 md:p-4">
              {(selectedMachineId && machineForDataEntry) ||
              collectedMachineEntries.length > 0 ? (
                <>
                  <CollectionReportNewCollectionFormFields
                    selectedLocationName={selectedLocationName}
                    previousCollectionTime={
                      previousCollectionTime
                        ? typeof previousCollectionTime === 'string'
                          ? new Date(previousCollectionTime)
                          : previousCollectionTime
                        : null
                    }
                    machineForDataEntry={machineForDataEntry || null}
                    currentCollectionTime={currentCollectionTime}
                    isFirstCollection={isFirstCollection}
                    showAdvancedSas={showAdvancedSas}
                    customSasStartTime={customSasStartTime}
                    currentMetersIn={currentMetersIn}
                    currentMetersOut={currentMetersOut}
                    currentRamClearMetersIn={currentRamClearMetersIn}
                    currentRamClearMetersOut={currentRamClearMetersOut}
                    currentMachineNotes={currentMachineNotes}
                    currentRamClear={currentRamClear}
                    prevIn={prevIn}
                    prevOut={prevOut}
                    debouncedCurrentMetersIn={debouncedCurrentMetersIn}
                    debouncedCurrentMetersOut={debouncedCurrentMetersOut}
                    debouncedCurrentRamClearMetersIn={
                      debouncedCurrentRamClearMetersIn
                    }
                    debouncedCurrentRamClearMetersOut={
                      debouncedCurrentRamClearMetersOut
                    }
                    inputsEnabled={inputsEnabled}
                    isProcessing={isProcessing}
                    editingEntryId={editingEntryId}
                    isAddMachineEnabled={isAddMachineEnabled}
                    onCollectionTimeChange={setCurrentCollectionTime}
                    onAdvancedSasToggle={() => setShowAdvancedSas(p => !p)}
                    onCustomSasStartTimeChange={setCustomSasStartTime}
                    onMetersInChange={setCurrentMetersIn}
                    onMetersOutChange={setCurrentMetersOut}
                    onRamClearMetersInChange={setCurrentRamClearMetersIn}
                    onRamClearMetersOutChange={setCurrentRamClearMetersOut}
                    onMachineNotesChange={setCurrentMachineNotes}
                    onRamClearChange={checked => {
                      setCurrentRamClear(checked);
                      if (!checked) {
                        setCurrentRamClearMetersIn('');
                        setCurrentRamClearMetersOut('');
                      } else {
                        if (prevIn !== null) {
                          setCurrentRamClearMetersIn(prevIn.toString());
                        }
                        if (prevOut !== null) {
                          setCurrentRamClearMetersOut(prevOut.toString());
                        }
                      }
                    }}
                    onDisabledFieldClick={handleDisabledFieldClick}
                    onAddEntry={handleAddEntry}
                    onCancelEdit={handleCancelEdit}
                    onAddOrUpdateEntry={handleAddOrUpdateEntry}
                    onViewMachine={() => setShowViewMachineConfirmation(true)}
                  />

                  <CollectionReportNewCollectionFinancials
                    financials={financials}
                    baseBalanceCorrection={baseBalanceCorrection}
                    isProcessing={isProcessing}
                    onFinancialsChange={updates =>
                      setFinancials(prev => ({ ...prev, ...updates }))
                    }
                    onBaseBalanceCorrectionChange={setBaseBalanceCorrection}
                    onCollectedAmountChange={value => {
                      setFinancials(prev => ({
                        ...prev,
                        collectedAmount: value,
                      }));
                      // Trigger manual calculations
                      setTimeout(() => {
                        const amountCollected = Number(value) || 0;
                        const amountToCollect =
                          Number(financials.amountToCollect) || 0;

                        // Only calculate previous balance if collected amount is 0 or more
                        let previousBalance = financials.previousBalance; // Keep existing value
                        if (value !== '' && amountCollected >= 0) {
                          // Calculate previous balance: collectedAmount - amount To Collect
                          previousBalance = (
                            amountCollected - amountToCollect
                          ).toString();
                        }

                        // Final correction = base entered first + collected amount
                        const finalCorrection =
                          (Number(baseBalanceCorrection) || 0) +
                          amountCollected;

                        setFinancials(prev => ({
                          ...prev,
                          previousBalance: previousBalance,
                          balanceCorrection:
                            value === ''
                              ? baseBalanceCorrection || '0'
                              : finalCorrection.toString(),
                        }));
                      }, 0);
                    }}
                  />
                </>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                      No machine selected
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select a machine from the left sidebar to enter data.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar: Collected machines list - 1/5 width */}
            <CollectionReportNewCollectionCollectedMachines
              collectedMachineEntries={collectedMachineEntries}
              isProcessing={isProcessing}
              onEditEntry={handleEditCollectedEntry}
              onDeleteEntry={handleDeleteCollectedEntry}
            />
          </div>

          <DialogFooter className="flex justify-center border-t border-gray-300 p-4 pt-2 md:p-6 md:pt-4">
            <Button
              onClick={() => {
                console.warn('🚀 Create Report button clicked:', {
                  isProcessing,
                  collectedMachineEntriesCount: collectedMachineEntries.length,
                  currentCollectionTime: currentCollectionTime,
                });
                if (collectedMachineEntries.length === 0 || isProcessing)
                  return;

                // Check if there's unsaved data (machine selected with form data but not added)
                const hasUnsavedData =
                  selectedMachineId &&
                  (currentMetersIn.trim() !== '' ||
                    currentMetersOut.trim() !== '' ||
                    currentMachineNotes.trim() !== '');

                if (hasUnsavedData) {
                  toast.error(
                    'You have unsaved machine data. Please click "Add Machine to List" or cancel the current machine entry before creating the report.',
                    {
                      duration: 6000,
                      position: 'top-center',
                    }
                  );
                  return;
                }

                // Show confirmation dialog
                setShowCreateReportConfirmation(true);
              }}
              className={`w-auto bg-button px-8 py-3 text-base hover:bg-buttonActive ${
                collectedMachineEntries.length === 0 || isProcessing
                  ? 'cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
              disabled={collectedMachineEntries.length === 0 || isProcessing}
            >
              {isProcessing
                ? 'CREATING REPORTS...'
                : `CREATE REPORT(S) (${collectedMachineEntries.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Machine Rollover/Ramclear Warning Modal */}
      <Dialog
        open={showMachineRolloverWarning}
        onOpenChange={setShowMachineRolloverWarning}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-red-600">
              ⚠️ Rollover/Ramclear Warning
            </DialogTitle>
            <DialogDescription>
              This machine has detected a rollover or ramclear event. Proceed
              with caution.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-gray-700">
              This machine has <strong>metersIn</strong> value less than its{' '}
              <strong>previous metersIn</strong> value.
            </p>
            <p className="mb-4 text-gray-700">
              This typically indicates a <strong>rollover</strong> or{' '}
              <strong>ramclear</strong> situation.
            </p>
            <p className="font-medium text-gray-700">
              Are you sure you want to add this machine with rollover/ramclear?
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelMachineRollover}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMachineRollover}
              className="flex-1 bg-red-600 text-white hover:bg-red-700"
            >
              Yes, Add Machine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
        }}
        onConfirm={confirmDeleteEntry}
        title="Confirm Delete"
        message="Are you sure you want to delete this collection entry?"
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isProcessing}
      />

      {/* Update Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showUpdateConfirmation}
        onClose={() => setShowUpdateConfirmation(false)}
        onConfirm={confirmUpdateEntry}
        title="Confirm Update"
        message="Are you sure you want to update this collection entry?"
        confirmText="Yes, Update"
        cancelText="Cancel"
        isLoading={isProcessing}
      />

      {/* Create Report Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={showCreateReportConfirmation}
        onClose={() => setShowCreateReportConfirmation(false)}
        onConfirm={confirmCreateReports}
        title="Confirm Collection Report"
        message={`You are about to create a collection report for ${
          collectedMachineEntries.length
        } machine(s) with collection time: ${
          currentCollectionTime ? formatDate(currentCollectionTime) : 'Not set'
        }. Do you want to proceed?`}
        confirmText="Yes, Create Report"
        cancelText="Cancel"
        isLoading={isProcessing}
      />

      {/* View Machine Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={showViewMachineConfirmation}
        onClose={() => setShowViewMachineConfirmation(false)}
        onConfirm={() => {
          if (selectedMachineId) {
            const machineUrl = `/machines/${selectedMachineId}`;
            window.open(machineUrl, '_blank');
          }
          setShowViewMachineConfirmation(false);
        }}
        title="View Machine"
        message="Do you want to open this machine's details in a new tab?"
        confirmText="Yes, View Machine"
        cancelText="Cancel"
        isLoading={false}
      />
    </>
  );
}
