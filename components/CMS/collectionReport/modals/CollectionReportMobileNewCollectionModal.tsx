/**
 * CollectionReportMobileNewCollectionModal Component
 *
 * Mobile-optimized modal for creating new collection reports.
 */

'use client';

import CollectionReportMobileCollectedListPanel from '@/components/CMS/collectionReport/mobile/CollectionReportMobileCollectedListPanel';
import CollectionReportMobileFormPanel from '@/components/CMS/collectionReport/mobile/CollectionReportMobileFormPanel';
import CollectionReportMobileMachineList from '@/components/CMS/collectionReport/mobile/CollectionReportMobileMachineList';
import LocationSingleSelect from '@/components/shared/ui/common/LocationSingleSelect';
import { ConfirmationDialog } from '@/components/shared/ui/ConfirmationDialog';
import { InfoConfirmationDialog } from '@/components/shared/ui/InfoConfirmationDialog';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle
} from '@/components/shared/ui/dialog';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { useMobileCollectionModal } from '@/lib/hooks/collectionReport/useMobileCollectionModal';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { Calculator, ClipboardList, Info, SendHorizontal, X } from 'lucide-react';

type CollectionReportMobileNewCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
  onRefreshLocations?: () => void;
};

export default function CollectionReportMobileNewCollectionModal({
  show,
  onClose,
  locations = [],
  onRefresh,
}: CollectionReportMobileNewCollectionModalProps) {
  const {
    modalState,
    setModalState,
    selectedLocation,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    selectedMachine,
    selectedMachineData,
    financials,
    pushNavigation,
    popNavigation,
    handleLocationChange,
    handleViewCollectedMachines,
    addMachineToList,
    editMachineInList,
    deleteMachineFromList,
    createCollectionReport,
    inputsEnabled,
    isAddMachineEnabled,
    isCreateReportsEnabled,
    sortMachinesAlphabetically,
    setStoreFinancials,
    setStoreSelectedMachine,
    setStoreSelectedMachineData,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    showUnsavedChangesWarning,
    setShowUnsavedChangesWarning,
    showCreateReportConfirmation,
    setShowCreateReportConfirmation,
    baseBalanceCorrection,
    onBaseBalanceCorrectionChange,
    storeFormData,
    setStoreFormData,
  } = useMobileCollectionModal({
    show,
    locations,
    onRefresh,
    onClose,
  });

  return (
    <>
    <Dialog 
      open={show} 
      onOpenChange={(isOpen) => {
        // Prevent closing if confirmation dialogs are open
        if (!isOpen && (showCreateReportConfirmation || showDeleteConfirmation || modalState.showViewMachineConfirmation || showUnsavedChangesWarning)) {
          return;
        }

        // Check for unsaved changes before closing
        if (!isOpen && (collectedMachines.length > 0 || selectedMachineData || storeFormData.metersIn || storeFormData.metersOut || storeFormData.notes)) {
           setShowUnsavedChangesWarning(true);
           return;
        }

        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent 
        className="m-0 flex h-[100dvh] w-full max-w-full flex-col overflow-hidden border-none bg-gray-50 p-0 shadow-2xl md:inset-auto md:left-[50%] md:top-[50%] md:h-[90vh] md:w-[95vw] md:max-w-6xl md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
        isMobileFullScreen={true}
      >
        <DialogTitle className="sr-only">New Collection Report</DialogTitle>
        
        {/* Modern Sticky Header - Only show on home screen */}
        {modalState.navigationStack.length === 0 && (
          <div className="sticky top-0 z-[100] border-b bg-white px-5 py-4 shadow-sm md:rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">New Collection Report</h2>
              <DialogClose asChild>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>
          </div>
        )}

        {modalState.navigationStack.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white mobile-collection-scrollbar">

            {/* Summary Info - Show when location is selected and we have machines */}
            {(lockedLocationId || selectedLocation) && collectedMachines.length > 0 && (
              <div className="border-b bg-blue-50/50 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedLocationName || 'Location'}
                    </p>
                  </div>
                  <div className="rounded-full bg-green-100 px-3 py-1 text-right">
                    <p className="text-xs font-bold text-green-700">
                      {collectedMachines.length} Machine{collectedMachines.length !== 1 ? 's' : ''} Recorded
                    </p>
                  </div>
                </div>

                {/* Live Reconciliation Summary */}
                <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                  <h5 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                    <Info className="h-3 w-3" />
                    Live Reconciliation Summary
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5 border-r border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Target</p>
                      <p className="text-sm font-black text-gray-900">${financials.amountToCollect || '0.00'}</p>
                    </div>
                    <div className="space-y-0.5 pl-2">
                       <p className="text-[9px] font-bold text-gray-400 uppercase">Actual</p>
                       <p className="text-sm font-black text-blue-600">${financials.collectedAmount || '0.00'}</p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-gray-50 pt-3">
                    <div className="flex items-center justify-between">
                       <p className="text-[9px] font-bold text-gray-400 uppercase">Next Opening Balance</p>
                       <p className={`text-xs font-black ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                         ${financials.previousBalance || '0.00'}
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Location Selector - ALWAYS VISIBLE */}
            <div className="p-6 bg-gray-50/20">
              {modalState.isLoadingCollections ? (
                <div className="space-y-6 flex flex-col items-center justify-center py-10">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="font-semibold text-gray-900">
                      Checking status...
                    </p>
                    <p className="mt-2 text-sm text-gray-500 max-w-[200px] mx-auto">
                      Checking for any in-progress collection reports
                    </p>
                  </div>
                  <Skeleton className="h-12 w-full max-w-sm rounded-xl" />
                </div>
              ) : (
                <>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Select Location
                  </label>
                  <div
                    className={
                      modalState.isProcessing ||
                      lockedLocationId !== undefined ||
                      collectedMachines.length > 0 ||
                      modalState.isLoadingCollections
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  >
                    <LocationSingleSelect
                      locations={locations.map(loc => ({
                        id: String(loc._id),
                        name: loc.name,
                        sasEnabled: false,
                      }))}
                      selectedLocation={
                        lockedLocationId || selectedLocation || ''
                      }
                      onSelectionChange={handleLocationChange}
                      placeholder="Choose a location..."
                      includeAllOption={false}
                    />
                  </div>
                </>
              )}

              {/* Action Buttons - Only show when location is selected */}
              {(lockedLocationId || selectedLocation) && (
                <div className="mt-6 space-y-3">
                  {/* View Form Button - Show when there are collected machines */}
                  {collectedMachines.length > 0 && (
                    <button
                      onClick={() => {
                        pushNavigation('main');
                        setModalState(prev => ({
                          ...prev,
                          isCollectedListVisible: true,
                          isViewingFinancialForm: true, // Show financial form
                        }));
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white transition-all hover:bg-blue-700 active:scale-95 shadow-md"
                    >
                      <Calculator className="h-5 w-5" />
                      View Amount to Collect/Taxes
                    </button>
                  )}

                  {/* View Collected Machines Button - only show when >=1 machine */}
                  {collectedMachines.length >= 1 && (
                    <button
                      onClick={() => {
                        pushNavigation('main');
                        setModalState(prev => ({
                          ...prev,
                          isCollectedListVisible: true,
                          isViewingFinancialForm: false,
                        }));
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-medium text-white shadow-md transition-all hover:bg-green-700 active:scale-95"
                    >
                      <ClipboardList className="h-5 w-5" />
                      View Recorded Machines ({collectedMachines.length})
                    </button>
                  )}
                </div>
              )}

              {/* Machines List - Show when location is selected */}
              {(lockedLocationId || selectedLocation) && (
                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedLocationName ? `Machines at ${selectedLocationName}` : 'Available Machines'}
                    </h3>
                  </div>

                  {/* Search bar for machines */}
                  {availableMachines.length > 3 && (
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search machines by name or serial number..."
                        value={modalState.searchTerm}
                        onChange={e =>
                          setModalState(prev => ({
                            ...prev,
                            searchTerm: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Machine Cards Container - 2x2 Grid */}
                  <div
                    className="grid grid-cols-1 gap-3 pb-8 sm:grid-cols-2 items-start"
                  >
                    {modalState.isLoadingMachines ? (
                      [1, 2, 3, 4, 5, 6].map(i => (
                        <div
                          key={i}
                          className="animate-pulse rounded-lg border bg-gray-50 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="mb-2 h-4 w-3/4 rounded bg-gray-300"></div>
                              <div className="h-3 w-1/2 rounded bg-gray-300"></div>
                            </div>
                            <div className="h-8 w-16 rounded bg-gray-300"></div>
                          </div>
                        </div>
                      ))
                    ) : availableMachines.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <p>No machines found for this location.</p>
                      </div>
                    ) : (
                      (() => {
                        // Filter machines
                        const filteredMachines = availableMachines.filter(
                          machine => {
                            if (!modalState.searchTerm.trim()) return true;
                            const searchTerm =
                              modalState.searchTerm.toLowerCase();
                            const machineName = (
                              machine.name || ''
                            ).toLowerCase();
                            const serialNumber = (
                              machine.serialNumber || ''
                            ).toLowerCase();
                            return (
                              machineName.includes(searchTerm) ||
                              serialNumber.includes(searchTerm)
                            );
                          }
                        );

                        // Sort machines
                        const sortedMachines =
                          sortMachinesAlphabetically(filteredMachines);

                        return sortedMachines.map(machine => {
                          const isCollected = collectedMachines.some(
                            cm => cm.machineId === String(machine._id)
                          );
                          const isSelected =
                            selectedMachine === String(machine._id);

                          return (
                            <div
                              key={String(machine._id)}
                              className={`rounded-2xl border p-4 transition-all duration-200 ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/10 shadow-md'
                                  : isCollected
                                    ? 'border-green-200 bg-green-50/50 opacity-90'
                                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg'
                              }`}
                            >
                              {/* Machine Name */}
                              <p className="break-words text-sm font-bold text-gray-900 line-clamp-2 min-h-[40px]">
                                {formatMachineDisplayNameWithBold(machine)}
                              </p>

                              {/* Previous Meters Display */}
                              <div className="mt-1 space-y-1 text-xs text-gray-600">
                                <p className="flex flex-col sm:flex-row sm:gap-2">
                                  <span>
                                    Prev In:{' '}
                                    {machine.collectionMeters?.metersIn || 0}
                                  </span>
                                  <span className="hidden sm:inline">|</span>
                                  <span>
                                    Prev Out:{' '}
                                    {machine.collectionMeters?.metersOut || 0}
                                  </span>
                                </p>
                              </div>

                              {/* Status Indicators */}
                              {isCollected && (
                                <div className="mt-1 flex items-center">
                                  <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                                  <p className="text-xs font-semibold text-green-600">
                                    Added to Collection
                                  </p>
                                </div>
                              )}

                              {isSelected && (
                                <div className="mt-1 flex items-center">
                                  <div className="mr-2 h-2 w-2 rounded-full bg-blue-500"></div>
                                  <p className="text-xs font-semibold text-blue-600">
                                    Selected
                                  </p>
                                </div>
                              )}

                              {/* Action Button */}
                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => {
                                    if (isSelected) {
                                      // Unselect the machine
                                      setStoreSelectedMachine(undefined);
                                      setStoreSelectedMachineData(null);
                                    } else {
                                      // Select the machine
                                      setStoreSelectedMachine(String(machine._id));
                                      setStoreSelectedMachineData(machine);
                                      setStoreFormData({
                                        metersIn: '',
                                        metersOut: '',
                                        notes: '',
                                        ramClear: false,
                                        ramClearMetersIn: '',
                                        ramClearMetersOut: '',
                                      });
                                      setModalState(prev => ({
                                        ...prev,
                                        isFormVisible: true,
                                      }));
                                    }
                                  }}
                                  disabled={isCollected}
                                  className={`rounded-full px-5 py-2.5 text-sm font-bold shadow-sm transition-all active:scale-95 ${
                                    isCollected
                                      ? 'cursor-not-allowed bg-green-100 text-green-700'
                                      : isSelected
                                        ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                                  }`}
                                >
                                  {isCollected
                                    ? '✓ Collected'
                                    : isSelected
                                      ? 'Unselect'
                                      : 'Select'}
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* Home Screen Submit Button - Allow submission from machine list */}
              {collectedMachines.length > 0 && (
                <div className="sticky bottom-0 mt-4 border-t bg-white/90 p-3 backdrop-blur-sm">
                  <button
                    onClick={() => setShowCreateReportConfirmation(true)}
                    disabled={!isCreateReportsEnabled || modalState.isProcessing}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold shadow-md transition-all active:scale-95 ${
                      isCreateReportsEnabled && !modalState.isProcessing
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-green-200'
                        : 'cursor-not-allowed bg-gray-400 text-gray-200'
                    }`}
                  >
                    <SendHorizontal className="h-3.5 w-3.5" />
                    SUBMIT FINAL REPORT ({collectedMachines.length} machines)
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : modalState.navigationStack[
            modalState.navigationStack.length - 1
          ] === 'machine-list' ? (
          <CollectionReportMobileMachineList
            machines={availableMachines}
            collectedMachines={collectedMachines}
            searchTerm={modalState.searchTerm}
            selectedMachine={selectedMachine ?? null}
            isLoadingMachines={modalState.isLoadingMachines}
            onSearchChange={val =>
              setModalState(prev => ({ ...prev, searchTerm: val }))
            }
            onMachineSelect={() => {
              // handle select
              pushNavigation('form');
            }}
            onBack={popNavigation}
          />
        ) : null}

        {/* Form Panel - Show when isFormVisible is true */}
        {modalState.isFormVisible && (
          <CollectionReportMobileFormPanel
            isVisible={modalState.isFormVisible}
            onBack={() => {
              popNavigation();
            }}
            onViewCollectedList={handleViewCollectedMachines}
            selectedMachineData={selectedMachineData ?? null}
            editingEntryId={modalState.editingEntryId}
            formData={{
              collectionTime: storeFormData.collectionTime,
              metersIn: storeFormData.metersIn,
              metersOut: storeFormData.metersOut,
              ramClear: storeFormData.ramClear,
              ramClearMetersIn: storeFormData.ramClearMetersIn,
              ramClearMetersOut: storeFormData.ramClearMetersOut,
              notes: storeFormData.notes,
            }}
            financials={financials}
            collectedMachinesCount={collectedMachines.length}
            isProcessing={modalState.isProcessing}
            inputsEnabled={inputsEnabled}
            isAddMachineEnabled={isAddMachineEnabled}
            formatMachineDisplay={machine => {
              return (
                <span>
                  {machine.custom?.name ||
                    machine.serialNumber ||
                    String(machine._id)}
                </span>
              );
            }}
            onViewMachine={() => {
              setModalState(prev => ({
                ...prev,
                showViewMachineConfirmation: true,
              }));
            }}
            onFormDataChange={(field, value) => {
              setStoreFormData({
                [field]: value,
              });
            }}
            onFinancialDataChange={(field, value) => {
              setStoreFinancials({ [field]: value });
            }}
            onAddMachine={addMachineToList}
            autoFillRamClearMeters={checked => {
              setStoreFormData({
                ramClear: checked,
                ramClearMetersIn: checked ? storeFormData.metersIn : '',
                ramClearMetersOut: checked ? storeFormData.metersOut : '',
              });
            }}
            onCollectedAmountChange={value => {
              setStoreFinancials({ collectedAmount: value });
            }}
            baseBalanceCorrection={baseBalanceCorrection}
            onBaseBalanceCorrectionChange={onBaseBalanceCorrectionChange}
          />
        )}

        {/* Collected List Panel - Show when isCollectedListVisible is true */}
        {modalState.isCollectedListVisible && (
          <CollectionReportMobileCollectedListPanel
            isVisible={modalState.isCollectedListVisible}
            onBack={() => {
              popNavigation();
            }}
            collectedMachines={collectedMachines}
            searchTerm={modalState.collectedMachinesSearchTerm}
            onSearchChange={term => {
              setModalState(prev => ({
                ...prev,
                collectedMachinesSearchTerm: term,
              }));
            }}
            isViewingFinancialForm={modalState.isViewingFinancialForm}
            onToggleView={isFinancial => {
              setModalState(prev => ({
                ...prev,
                isViewingFinancialForm: isFinancial,
              }));
            }}
            financials={financials}
            isProcessing={modalState.isProcessing}
            isCreateReportsEnabled={isCreateReportsEnabled}
            updateAllDate={undefined}
            onUpdateAllDate={() => {
              // Not implemented yet for new collection
            }}
            onApplyAllDates={async () => {
              // Not implemented yet for new collection
            }}
            formatMachineDisplay={machine => {
              // Type assertion needed because formatMachineDisplay type definition
              // doesn't match CollectionDocument, but that's what we pass
              const doc = machine as unknown as CollectionDocument;
              const displayName =
                doc.machineCustomName ||
                doc.machineName ||
                doc.machineId ||
                doc.serialNumber ||
                String(doc._id);
              return <span>{displayName}</span>;
            }}
            formatDate={date => {
              return new Date(date).toLocaleString();
            }}
            sortMachines={sortMachinesAlphabetically}
            onEditMachine={editMachineInList}
            onDeleteMachine={machineId => {
              // Set confirmation state and delete
              setShowDeleteConfirmation(true);
              // Store the machine ID to delete in modalState for confirmation
              setModalState(prev => ({
                ...prev,
                editingEntryId: machineId, // Reuse editingEntryId to store delete target
              }));
            }}
            onFinancialDataChange={(field, value) => {
              setStoreFinancials({ [field]: value });
            }}
            onCollectedAmountChange={value => {
              setStoreFinancials({ collectedAmount: value });
            }}
            baseBalanceCorrection={baseBalanceCorrection}
            onBaseBalanceCorrectionChange={onBaseBalanceCorrectionChange}
            onCreateReport={() => setShowCreateReportConfirmation(true)}
          />
        )}
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog - Rendered outside Dialog to avoid z-index stacking context issues */}
    <ConfirmationDialog
      isOpen={showDeleteConfirmation}
      onClose={() => {
        setShowDeleteConfirmation(false);
        setModalState(prev => ({
          ...prev,
          editingEntryId: null, // Clear delete target
        }));
      }}
      onConfirm={() => {
        if (modalState.editingEntryId) {
          deleteMachineFromList(modalState.editingEntryId);
          setShowDeleteConfirmation(false);
          setModalState(prev => ({
            ...prev,
            editingEntryId: null, // Clear delete target
          }));
        }
      }}
      title="Confirm Delete"
      message="Are you sure you want to delete this collection entry?"
      confirmText="Yes, Delete"
      cancelText="Cancel"
      isLoading={modalState.isProcessing}
    />

    {/* Unsaved Changes Confirmation Dialog */}
    <ConfirmationDialog
      isOpen={showUnsavedChangesWarning}
      onClose={() => setShowUnsavedChangesWarning(false)}
      onConfirm={() => {
        setShowUnsavedChangesWarning(false);
        onClose();
      }}
      title="Unsaved Changes"
      message="You have unsaved changes or machines added to your report. Are you sure you want to close and discard everything?"
      confirmText="Discard and Close"
      cancelText="Keep Editing"
    />

    {/* Create Report Confirmation Dialog */}
    <ConfirmationDialog
      isOpen={showCreateReportConfirmation}
      onClose={() => setShowCreateReportConfirmation(false)}
      onConfirm={() => {
        setShowCreateReportConfirmation(false);
        createCollectionReport();
      }}
      title="Confirm Collection Report"
      message="Are you sure you want to create this collection report batch? This will update machine history and meter readings."
      confirmText="Yes, Create Report"
      cancelText="Cancel"
      isLoading={modalState.isProcessing}
    />

    {/* View Machine Confirmation Dialog */}
    <InfoConfirmationDialog
      isOpen={modalState.showViewMachineConfirmation}
      onClose={() => setModalState(prev => ({ ...prev, showViewMachineConfirmation: false }))}
      onConfirm={() => {
        if (selectedMachineData?._id) {
          window.open(`/cabinets/${selectedMachineData._id}`, '_blank');
        }
        setModalState(prev => ({ ...prev, showViewMachineConfirmation: false }));
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

