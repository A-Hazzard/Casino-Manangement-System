/**
 * CollectionReportMobileNewCollectionModal Component
 *
 * Mobile-optimized modal for creating new collection reports.
 */

'use client';

import CollectionReportMobileCollectedListPanel from '@/components/collectionReport/mobile/CollectionReportMobileCollectedListPanel';
import CollectionReportMobileFormPanel from '@/components/collectionReport/mobile/CollectionReportMobileFormPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useMobileCollectionModal } from '@/lib/hooks/collectionReport/useMobileCollectionModal';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collections';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import CollectionReportMobileMachineList from '@/components/collectionReport/mobile/CollectionReportMobileMachineList';

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
  } = useMobileCollectionModal({
    show,
    locations,
    onRefresh,
    onClose,
  });

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="flex h-full w-full max-w-full flex-col p-0">
        <DialogHeader className="rounded-t-xl border-b bg-white p-4 md:rounded-t-xl">
          <DialogTitle className="text-xl font-bold">New Collection Report</DialogTitle>
        </DialogHeader>
        {modalState.navigationStack.length === 0 ? (
          <div className="flex h-full flex-col overflow-hidden">

            {/* Summary Info - Show when location is selected */}
            {(lockedLocationId || selectedLocation) && (
              <div className="border-b bg-blue-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Location:</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedLocationName || 'Not selected'}
                    </p>
                  </div>
                  {collectedMachines.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Machines Collected:</p>
                      <p className="text-sm font-semibold text-green-600">
                        {collectedMachines.length}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location Selector - ALWAYS VISIBLE */}
            <div className="flex flex-1 flex-col overflow-hidden p-4">
              {modalState.isLoadingCollections ? (
                <div className="space-y-4">
                  <div className="py-4 text-center">
                    <p className="font-medium text-blue-600">
                      Checking if any collection reports is in progress first
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Please wait while we check for incomplete collections
                    </p>
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <label className="mb-2 block text-sm font-medium">
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
                  {/* Open Report Button - Only show when a machine is selected */}
                  {selectedMachine && (
                    <button
                      onClick={() => {
                        pushNavigation('main');
                        setModalState(prev => ({
                          ...prev,
                          isFormVisible: true,
                        }));
                      }}
                      className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
                    >
                      Open Report
                    </button>
                  )}

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
                      className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700"
                    >
                      View Form ({collectedMachines.length}{' '}
                      machine{collectedMachines.length !== 1 ? 's' : ''})
                    </button>
                  )}

                  {/* View Collected Machines Button */}
                  <button
                    onClick={() => {
                      if (collectedMachines.length === 0) {
                        return; // Early return if no collections
                      }
                      pushNavigation('main');
                      setModalState(prev => ({
                        ...prev,
                        isCollectedListVisible: true,
                        isViewingFinancialForm: false, // Show machine list
                      }));
                    }}
                    className={`w-full rounded-lg py-3 font-medium ${
                      collectedMachines.length === 0
                        ? 'cursor-not-allowed bg-gray-400 text-gray-200'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    View Collected Machines ({collectedMachines.length})
                  </button>
                </div>
              )}

              {/* Machines List - Show when location is selected */}
              {(lockedLocationId || selectedLocation) && (
                <div className="mt-6 flex min-h-0 flex-1 flex-col">
                  <h3 className="mb-4 text-lg font-semibold">
                    Machines for{' '}
                    {(() => {
                      const locationIdToUse =
                        lockedLocationId || selectedLocation;
                      const location = locations.find(
                        l => String(l._id) === locationIdToUse
                      );
                      return (
                        location?.name ||
                        selectedLocationName ||
                        'Selected Location'
                      );
                    })()}
                  </h3>

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
                    className="min-h-0 flex-1 grid grid-cols-1 gap-3 overflow-y-auto pb-4 sm:grid-cols-2"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#d1d5db #f3f4f6',
                    }}
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
                              className={`rounded-lg border-2 p-4 transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 shadow-md'
                                  : isCollected
                                    ? 'border-green-300 bg-green-50 shadow-sm'
                                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              {/* Machine Name */}
                              <p className="break-words text-sm font-semibold text-primary">
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
                                      setModalState(prev => ({
                                        ...prev,
                                        isFormVisible: true,
                                        formData: {
                                          ...prev.formData,
                                          metersIn: '',
                                          metersOut: '',
                                          notes: '',
                                          ramClear: false,
                                        },
                                      }));
                                    }
                                  }}
                                  disabled={isCollected}
                                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                    isCollected
                                      ? 'cursor-not-allowed border border-green-300 bg-green-100 text-green-700'
                                      : isSelected
                                        ? 'border border-red-600 bg-red-600 text-white hover:bg-red-700'
                                        : 'border border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                >
                                  {isCollected
                                    ? '✓ Added'
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
              collectionTime: modalState.formData.collectionTime,
              metersIn: modalState.formData.metersIn,
              metersOut: modalState.formData.metersOut,
              ramClear: modalState.formData.ramClear,
              ramClearMetersIn: modalState.formData.ramClearMetersIn,
              ramClearMetersOut: modalState.formData.ramClearMetersOut,
              notes: modalState.formData.notes,
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
              setModalState(prev => ({
                ...prev,
                formData: {
                  ...prev.formData,
                  [field]: value,
                },
              }));
            }}
            onFinancialDataChange={(field, value) => {
              setStoreFinancials({ [field]: value });
            }}
            onAddMachine={addMachineToList}
            autoFillRamClearMeters={checked => {
              setModalState(prev => ({
                ...prev,
                formData: {
                  ...prev.formData,
                  ramClear: checked,
                  ramClearMetersIn: checked ? prev.formData.metersIn : '',
                  ramClearMetersOut: checked ? prev.formData.metersOut : '',
                },
              }));
            }}
            onCollectedAmountChange={value => {
              setStoreFinancials({ collectedAmount: value });
            }}
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
            onCreateReport={createCollectionReport}
          />
        )}

        {/* Delete Confirmation Dialog */}
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
      </DialogContent>
    </Dialog>
  );
}
