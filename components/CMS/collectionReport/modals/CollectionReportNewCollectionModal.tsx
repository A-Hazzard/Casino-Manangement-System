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
 * @param show - Whether the modal is visible
 * @param onClose - Callback to close the modal
 * @param locations - List of available locations with their associated machines
 * @param onRefresh - Callback to refresh the main reports data
 * @param onRefreshLocations - Callback to refresh the locations list data
 * @param onSuccess - Callback when collection is successfully created
 */

import CollectionReportNewCollectionCollectedMachines from '@/components/CMS/collectionReport/forms/CollectionReportNewCollectionCollectedMachines';
import CollectionReportNewCollectionFinancials from '@/components/CMS/collectionReport/forms/CollectionReportNewCollectionFinancials';
import CollectionReportNewCollectionFormFields from '@/components/CMS/collectionReport/forms/CollectionReportNewCollectionFormFields';
import CollectionReportNewCollectionLocationMachineSelection from '@/components/CMS/collectionReport/forms/CollectionReportNewCollectionLocationMachineSelection';
import { VariationCheckPopover } from '@/components/CMS/collectionReport/variations/VariationCheckPopover';
import { VariationsListDisplay } from '@/components/CMS/collectionReport/variations/VariationsListDisplay';
import { VariationsCollapsibleSection } from '@/components/CMS/collectionReport/variations/VariationsCollapsibleSection';
import { VariationsConfirmationDialog } from '@/components/CMS/collectionReport/variations/VariationsConfirmationDialog';
import { Button } from '@/components/shared/ui/button';
import { ConfirmationDialog } from '@/components/shared/ui/ConfirmationDialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { InfoConfirmationDialog } from '@/components/shared/ui/InfoConfirmationDialog';
import {
    getUserDisplayName,
    logActivity,
} from '@/lib/helpers/collectionReport/newCollectionModalHelpers';
import { useNewCollectionModal } from '@/lib/hooks/collectionReport/useNewCollectionModal';
import { useCollectionReportVariationCheck, type CheckVariationsMachine } from '@/lib/hooks/collectionReport/useCollectionReportVariationCheck';
import { useUserStore } from '@/lib/store/userStore';
import { formatDate } from '@/lib/utils/formatting';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionReportNewCollectionModalProps } from '@/lib/types/components';

export default function CollectionReportNewCollectionModal({
  show,
  onClose,
  locations: propLocations = [],
  onRefresh,
  onRefreshLocations,
  onSuccess,
}: CollectionReportNewCollectionModalProps) {
  const user = useUserStore(state => state.user);
  const userId = user?._id;

  // Variation checking state
  const {
    isChecking,
    checkComplete,
    hasVariations,
    variationsData,
    error: variationError,
    isMinimized,
    checkVariations,
    toggleMinimize,
    reset: resetVariationCheck,
  } = useCollectionReportVariationCheck();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [showVariationCheckPopover, setShowVariationCheckPopover] = useState(false);
  const [variationsCollapsibleExpanded, setVariationsCollapsibleExpanded] = useState(true);
  const [showVariationsConfirmation, setShowVariationsConfirmation] = useState(false);

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
    locations,
    isLoadingLocations,
    isLoadingMachines,
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
    sasStartTime,
    setSasStartTime,
    sasEndTime,
    setSasEndTime,
    collectedMachineEntries,
    isProcessing,
    editingEntryId,
    showUpdateConfirmation,
    setShowUpdateConfirmation,
    showMachineRolloverWarning,
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
    setPrevIn,
    prevOut,
    setPrevOut,
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
    anyConfirmationOpen,
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
    handleApplyAllDates,
  } = useNewCollectionModal({
    show,
    locations: propLocations,
    userId,
    onRefresh,
    onRefreshLocations,
    onSuccess,
    onClose,
    logActivityCallback,
  });

  return (
    <>
    {/* Main Container */}
      <Dialog 
        open={show} 
        onOpenChange={(open) => {
          if (!open && anyConfirmationOpen) return;
          handleClose();
        }}
      >
        <DialogContent 
          className="flex h-[95vh] w-[98vw] max-w-[98vw] flex-col bg-container p-0 md:h-[90vh] md:w-full md:max-w-6xl lg:max-w-7xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Top Left Of the Container */}
          <DialogHeader className="p-4 pb-0 md:p-6">
            <DialogTitle className="text-xl font-bold md:text-2xl">
              Collection Report Form
            </DialogTitle>
            <DialogDescription>
              Create a new collection report for the selected location and
              machines.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
            {/* Left sidebar: Location selector and machine list - 1/5 width */}
            <div className="flex min-h-0 w-full flex-shrink-0 flex-col md:w-1/5 border-r border-gray-200">
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
                isLoadingLocations={isLoadingLocations}
                isLoadingMachines={isLoadingMachines}
                isLoadingExistingCollections={isLoadingExistingCollections}
                isProcessing={isProcessing}
                onLocationChange={handleLocationChange}
                onMachineSearchChange={setMachineSearchTerm}
                onMachineSelect={setSelectedMachineId}
              />
            </div>

            {/* Middle section: Form fields - 3/5 width (60%) */}
            <div className={`flex min-h-0 w-full flex-1 flex-col space-y-3 overflow-y-auto p-3 md:w-3/5 md:p-4 ${isMobile && !selectedMachineId && collectedMachineEntries.length === 0 ? 'hidden md:flex' : 'flex'}`}>

              {(selectedMachineId && machineForDataEntry) ||
              collectedMachineEntries.length > 0 ? (
                <>
                  <CollectionReportNewCollectionFormFields
                    selectedLocationName={selectedLocationName}
                    currentCollectionTime={currentCollectionTime}
                    previousCollectionTime={
                      previousCollectionTime
                        ? typeof previousCollectionTime === 'string'
                          ? new Date(previousCollectionTime)
                          : previousCollectionTime
                        : null
                    }
                    machineForDataEntry={machineForDataEntry || null}
                    showAdvancedSas={showAdvancedSas}
                    sasStartTime={sasStartTime}
                    sasEndTime={sasEndTime}
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
                    onSasStartTimeChange={setSasStartTime}
                    onSasEndTimeChange={setSasEndTime}
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
                        setCurrentRamClearMetersIn(currentMetersIn);
                        setCurrentRamClearMetersOut(currentMetersOut);
                      }
                    }}
                    onPrevInChange={setPrevIn}
                    onPrevOutChange={setPrevOut}
                    onDisabledFieldClick={handleDisabledFieldClick}
                    onAddEntry={handleAddEntry}
                    onCancelEdit={handleCancelEdit}
                    onAddOrUpdateEntry={handleAddOrUpdateEntry}
                    onViewMachine={() => setShowViewMachineConfirmation(true)}
                  />

                  {/* Variations/Reconciliation section when minimized - Centered between form and financials */}
                  {isMinimized && (
                    <div className="my-3 space-y-3">
                      {variationsData && checkComplete && (
                        <VariationsCollapsibleSection
                          machines={variationsData.machines}
                          isExpanded={variationsCollapsibleExpanded}
                          onExpandChange={setVariationsCollapsibleExpanded}
                        />
                      )}

                      {/* Live Reconciliation Summary - Compact view for middle section */}
                      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-600" />
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                            Live Reconciliation Summary
                          </h5>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-0.5 border-r border-blue-100">
                            <p className="text-[9px] font-bold uppercase text-gray-500">Target</p>
                            <p className="text-sm font-black text-gray-900">${financials.amountToCollect || '0.00'}</p>
                          </div>
                          <div className="space-y-0.5 border-r border-blue-100 pl-2">
                            <p className="text-[9px] font-bold uppercase text-gray-400">Actual</p>
                            <p className="text-sm font-black text-blue-600">${financials.collectedAmount || '0.00'}</p>
                          </div>
                          <div className="space-y-0.5 pl-2">
                            <p className="text-[9px] font-bold uppercase text-gray-400">Opening Balance</p>
                            <p className={`text-sm font-black ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ${financials.previousBalance || '0.00'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <CollectionReportNewCollectionFinancials
                    financials={financials}
                    baseBalanceCorrection={baseBalanceCorrection}
                    isProcessing={isProcessing}
                    onFinancialsChange={updates =>
                      setFinancials(updates)
                    }
                    onBaseBalanceCorrectionChange={setBaseBalanceCorrection}
                    onCollectedAmountChange={value => {
                      setFinancials({
                        collectedAmount: value,
                      });
                    }}
                  />
                  
                  {/* Reconciliation Guide Note - PC Only version */}
                  <div className="mt-4 rounded-lg bg-blue-50/50 p-4 border border-blue-100">
                    <p className="text-[11px] font-bold text-blue-900 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                      <Info className="h-3 w-3" />
                      Reconciliation Guide:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/60 p-2.5 rounded border border-blue-50">
                        <p className="text-[9px] font-bold text-blue-600 uppercase mb-1">Target</p>
                        <p className="text-[10px] text-gray-600 leading-relaxed text-pretty">Based on machines, profit share, plus Opening Balance/Correction.</p>
                      </div>
                      <div className="bg-white/60 p-2.5 rounded border border-blue-50">
                        <p className="text-[9px] font-bold text-blue-600 uppercase mb-1">Collected</p>
                        <p className="text-[10px] text-gray-600 leading-relaxed text-pretty">The physical cash retrieved. This field unlocks after setting Correction.</p>
                      </div>
                      <div className="bg-white/60 p-2.5 rounded border border-blue-50">
                        <p className="text-[9px] font-bold text-blue-600 uppercase mb-1">Carryover</p>
                        <p className="text-[10px] text-gray-600 leading-relaxed text-pretty">Collected minus Target. This value starts the next collection cycle.</p>
                      </div>
                    </div>
                  </div>
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
            <div className={`flex min-h-0 w-full flex-shrink-0 flex-col md:w-1/5 border-l border-gray-200 ${isMobile && collectedMachineEntries.length === 0 ? 'hidden md:flex' : 'flex'}`}>
              <CollectionReportNewCollectionCollectedMachines
                collectedMachineEntries={collectedMachineEntries}
                isProcessing={isProcessing}
                onEditEntry={handleEditCollectedEntry}
                onDeleteEntry={handleDeleteCollectedEntry}
                updateAllSasStartDate={updateAllSasStartDate}
                setUpdateAllSasStartDate={setUpdateAllSasStartDate}
                updateAllSasEndDate={updateAllSasEndDate}
                setUpdateAllSasEndDate={setUpdateAllSasEndDate}
                onApplyAllDates={handleApplyAllDates}
                variationMachineIds={variationsData?.machines.filter(m => typeof m.variation === 'number' && m.variation !== 0).map(m => m.machineId)}
              />
            </div>
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

                // ALWAYS start a fresh variation check before creating report
                // This ensures any last-minute machine edits are accounted for
                setShowVariationCheckPopover(true);

                const machinesForCheck: CheckVariationsMachine[] = collectedMachineEntries.map(entry => ({
                  machineId: entry.machineId,
                  machineName: `${entry.serialNumber || ''} ${entry.machineCustomName || ''} (${entry.game || ''})`.trim() || entry.machineId,
                  metersIn: entry.metersIn || 0,
                  metersOut: entry.metersOut || 0,
                  sasStartTime: entry.sasMeters?.sasStartTime || undefined,
                  sasEndTime: entry.sasMeters?.sasEndTime || undefined,
                  prevMetersIn: entry.prevIn || 0,
                  prevMetersOut: entry.prevOut || 0,
                  // Pass movementGross to override meter gross calculation
                  // This ensures variation = 0 when properly calculated from meter readings
                  movementGross: (entry as { movement?: { gross?: number } }).movement?.gross,
                }));

                // Get locationId from store state, fallback to first entry's location field
                const locationIdToUse =
                  selectedLocationId ||
                  lockedLocationId ||
                  collectedMachineEntries[0]?.location ||
                  '';

                checkVariations(locationIdToUse, machinesForCheck);
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











      

      {/* Machine Rollover/Ramclear Warning */}
      <InfoConfirmationDialog
        isOpen={showMachineRolloverWarning}
        onClose={handleCancelMachineRollover}
        onConfirm={handleConfirmMachineRollover}
        title="Rollover/Ramclear Warning"
        message="This machine has a meters value less than its previous value. This typically indicates a rollover or RAM clear situation. Are you sure you want to add this machine?"
        confirmText="Yes, Add Machine"
        cancelText="Cancel"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
        }}
        onConfirm={confirmDeleteEntry}
        title="Confirm Delete"
        message="Are you sure you want to delete this collection entry from the current batch?"
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isProcessing}
        confirmButtonVariant="destructive"
        footerMessage="This action will remove the machine from the current report batch."
      />

      <ConfirmationDialog
        isOpen={showUpdateConfirmation}
        onClose={() => setShowUpdateConfirmation(false)}
        onConfirm={confirmUpdateEntry}
        title="Confirm Update"
        message="Are you sure you want to update the meter readings for this machine?"
        confirmText="Yes, Update"
        cancelText="Cancel"
        isLoading={isProcessing}
        confirmButtonVariant="default"
        showFooterWarning={false}
      />

      {/* Create Report Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={showCreateReportConfirmation}
        onClose={() => setShowCreateReportConfirmation(false)}
        onConfirm={() => confirmCreateReports(variationsData)}
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
      {/* Variation Check Popover */}
      <VariationCheckPopover
        isOpen={showVariationCheckPopover && !isMinimized}
        isChecking={isChecking}
        hasVariations={hasVariations}
        error={variationError}
        variationsData={variationsData}
        onMinimize={() => {
          toggleMinimize();
        }}
        onSubmit={() => {
          setShowVariationCheckPopover(false);
          // If variations exist, show confirmation dialog; otherwise, show creation confirmation
          if (hasVariations && variationsData) {
            setShowVariationsConfirmation(true);
          } else {
            setShowCreateReportConfirmation(true);
          }
        }}
        onRetry={() => {
          const machinesForCheck: CheckVariationsMachine[] = collectedMachineEntries.map(entry => ({
            machineId: entry.machineId,
            machineName: `${entry.serialNumber || ''} ${entry.machineCustomName || ''} (${entry.game || ''})`.trim() || entry.machineId,
            metersIn: entry.metersIn || 0,
            metersOut: entry.metersOut || 0,
            sasStartTime: entry.sasMeters?.sasStartTime || undefined,
            sasEndTime: entry.sasMeters?.sasEndTime || undefined,
            prevMetersIn: entry.prevIn || 0,
            prevMetersOut: entry.prevOut || 0,
          }));
          const locationIdToUse =
            selectedLocationId ||
            lockedLocationId ||
            collectedMachineEntries[0]?.location ||
            '';
          checkVariations(locationIdToUse, machinesForCheck);
        }}
        onClose={() => {
          setShowVariationCheckPopover(false);
          // If no variations or error, reset. If there ARE variations, keep them highlighted.
          if (!hasVariations || variationError) {
            resetVariationCheck();
          }
        }}
      />

      {/* Variations with Detail Display */}
      {showVariationCheckPopover && !isChecking && hasVariations && variationsData && isMinimized && (
        createPortal(
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-[100005] flex justify-center p-4 bg-black/60 ${isMobile ? 'items-center' : 'items-end md:pb-24'} pointer-events-auto`}
          >
            <div className={`w-full ${isMobile ? 'max-w-lg rounded-2xl' : 'max-w-6xl rounded-t-xl'} bg-white p-6 shadow-2xl ${isMobile ? 'max-h-[85vh]' : 'max-h-[75vh]'} overflow-y-auto border-t-8 border-amber-500 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.4)]`}>
              <div className="mb-6 flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Machine Variation Analysis</h3>
                  <p className="text-sm text-gray-500 mt-1">Detailed comparison between Sas data and manual meter entry</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleMinimize}
                  className="hover:bg-amber-50 border-amber-200 font-bold"
                >
                  Close
                </Button>
              </div>
              <VariationsListDisplay machines={variationsData.machines} isCompact={isMobile} />
              
              {isMobile && (
                 <div className="mt-8">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setShowVariationCheckPopover(false);
                        setShowVariationsConfirmation(true);
                      }}
                    >
                      Finalize with {variationsData.machines.filter(m => typeof m.variation === 'number').length} variations
                    </Button>
                 </div>
              )}
            </div>
          </motion.div>,
          document.body
        )
      )}

      {/* Variations Confirmation Dialog (submit with variations) */}
      <VariationsConfirmationDialog
        isOpen={showVariationsConfirmation}
        machineCount={variationsData?.machines.filter(m => typeof m.variation === 'number' && m.variation !== 0).length || 0}
        totalVariation={variationsData?.totalVariation || 0}
        isLoading={isProcessing}
        onConfirm={() => {
          // Call creation BEFORE closing confirmation to ensure state is definitely present
          confirmCreateReports(variationsData);
          setShowVariationsConfirmation(false);
        }}
        onCancel={() => {
          setShowVariationsConfirmation(false);
        }}
      />

      {/* View Machine Confirmation Dialog */}
      <InfoConfirmationDialog
        isOpen={showViewMachineConfirmation}
        onClose={() => setShowViewMachineConfirmation(false)}
        onConfirm={() => {
          if (selectedMachineId) {
            const machineUrl = `/cabinets/${selectedMachineId}`;
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

