/**
 * Mobile Edit Collection Modal
 *
 * Mobile-optimized modal for editing collection reports.
 * Handles location selection, machine collection, and financial data entry.
 *
 * Features:
 * - Location selection (locked in edit mode)
 * - Machine list and selection
 * - Collection form with meters, RAM clear, and notes
 * - Collected machines list with edit/delete
 * - Financials form
 * - Report update functionality
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { MobileCollectionModalSkeleton } from '@/components/ui/skeletons/MobileCollectionModalSkeleton';
import { useMobileEditCollectionModal } from '@/lib/hooks/collectionReport/useMobileEditCollectionModal';
import type {
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
} from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collections';
import { toast } from 'sonner';
import MobileEditLocationSelector from './MobileEditLocationSelector';
import MobileEditMachineList from './MobileEditMachineList';
import { MobileFormPanel } from '@/components/collectionReport/forms/MobileFormPanel';
import { MobileCollectedListPanel } from '@/components/collectionReport/forms/MobileCollectedListPanel';

type MobileEditCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
};

export default function MobileEditCollectionModal({
  show,
  onClose,
  reportId,
  locations = [],
  onRefresh,
}: MobileEditCollectionModalProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const {
    modalState,
    setModalState,
    showUnsavedChangesWarning,
    setShowUnsavedChangesWarning,
    showDeleteConfirmation,
    showCreateReportConfirmation,
    selectedLocationId,
    selectedLocationName,
    lockedLocationId,
    availableMachines,
    collectedMachines,
    pushNavigation,
    transitions,
    sortMachinesAlphabetically,
    inputsEnabled,
    isAddMachineEnabled,
    isCreateReportsEnabled,
    addMachineToList,
    deleteMachineFromList,
    editMachineInList,
    updateCollectionReportHandler,
    updateAllDate,
    setUpdateAllDate,
  } = useMobileEditCollectionModal({
    show,
    reportId,
    locations,
    onRefresh,
    onClose,
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleOpenReport = () => {
    pushNavigation('main');
    setModalState(prev => ({
      ...prev,
      isFormVisible: true,
        isMachineListVisible: false,
        isCollectedListVisible: false,
    }));
  };

  const handleViewForm = () => {
    pushNavigation('main');
      setModalState(prev => ({
        ...prev,
      isFormVisible: true,
      isMachineListVisible: false,
        isCollectedListVisible: false,
      isViewingFinancialForm: true,
    }));
  };

  const handleViewCollectedMachines = () => {
    if (collectedMachines.length === 0) return;
    pushNavigation('main');
      setModalState(prev => ({
        ...prev,
        isCollectedListVisible: true,
        isMachineListVisible: false,
        isFormVisible: false,
      isViewingFinancialForm: false,
    }));
  };

  const handleMachineSelect = (machine: CollectionReportMachineSummary) => {
    transitions.selectMachine(machine);
  };

  const handleMachineUnselect = () => {
    setModalState(prev => ({
      ...prev,
          selectedMachine: null,
          selectedMachineData: null,
    }));
  };

  // ============================================================================
  // Computed Values (from hook)
  // ============================================================================
  // inputsEnabled, isAddMachineEnabled, isCreateReportsEnabled are provided by hook
  // addMachineToList, deleteMachineFromList, editMachineInList, updateCollectionReportHandler
  // getLocationIdFromMachine, fetchExistingCollections are all provided by hook

  // ============================================================================
  // Render
  // ============================================================================
  if (!show) return null;

  // Show skeleton loader while modal is loading
  if (modalState.isLoadingMachines || modalState.isLoadingCollections) {
    return <MobileCollectionModalSkeleton />;
  }

  return (
    <>
      <Dialog
        open={show}
        onOpenChange={isOpen => {
          // Prevent closing if confirmation dialogs are open
          if (
            !isOpen &&
            (showCreateReportConfirmation ||
              showDeleteConfirmation ||
              modalState.showViewMachineConfirmation ||
              showUnsavedChangesWarning)
          ) {
            return;
          }
          // Check for unsaved edits before closing
          if (!isOpen && modalState.hasUnsavedEdits) {
            setShowUnsavedChangesWarning(true);
            return;
          }
          // Check if user has unsaved machine data before closing
          if (
            !isOpen &&
            !modalState.editingEntryId &&
            (modalState.selectedMachineData ||
              modalState.formData.metersIn ||
              modalState.formData.metersOut ||
              modalState.formData.notes?.trim())
          ) {
            const enteredMetersIn = modalState.formData.metersIn
              ? Number(modalState.formData.metersIn)
              : 0;
            const enteredMetersOut = modalState.formData.metersOut
              ? Number(modalState.formData.metersOut)
              : 0;
            const hasNotes = modalState.formData.notes?.trim().length > 0;

            if (
              modalState.selectedMachineData ||
              enteredMetersIn !== 0 ||
              enteredMetersOut !== 0 ||
              hasNotes
            ) {
              toast.error(
                `You have unsaved machine data. Please add the machine to the list or cancel before closing.`,
                {
                  duration: 8000,
                  position: 'top-left',
                }
              );
              setShowUnsavedChangesWarning(true);
              return;
            }
          }
          if (!isOpen) {
            onClose();
          }
        }}
      >
        {/* Custom overlay with higher z-index */}
        {show && (
          <div className="fixed inset-0 z-[105] bg-black/80 backdrop-blur-sm" />
        )}
        <DialogPortal>
          <DialogContent
            className="left-[50%] top-[50%] z-[110] m-0 h-full max-w-full translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-t-xl border-none bg-white p-0 shadow-xl sm:max-w-[80%] md:h-[90vh] md:rounded-xl"
            style={{ zIndex: 110 }}
          >
            {/* DialogTitle for accessibility - hidden visually */}
            <DialogTitle className="sr-only">
              Edit Collection Report
            </DialogTitle>

            {/* Main Content Area - ONLY LOCATION SELECTION VISIBLE BY DEFAULT */}
            <div className="flex h-full flex-col overflow-hidden">
              {/* Header */}
              <div className="rounded-t-xl border-b bg-white p-4 md:rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Edit Collection Report</h2>
                </div>
              </div>

              {/* Summary Info - Show when location is selected */}
              {(lockedLocationId ||
                selectedLocationId ||
                modalState.selectedLocation) && (
                <div className="border-b bg-blue-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600">Location:</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalState.selectedLocationName ||
                          selectedLocationName ||
                          'N/A'}
                      </p>
                    </div>
                      <div className="text-right">
                      <p className="text-xs text-gray-600">Machines:</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {collectedMachines.length}
                        </p>
                      </div>
                  </div>
                </div>
              )}

              {/* Location Selector - ALWAYS VISIBLE */}
              <div className="flex flex-1 flex-col overflow-hidden p-4">
                <MobileEditLocationSelector
                  locations={locations}
                  selectedLocationId={
                        lockedLocationId ||
                        selectedLocationId ||
                    modalState.selectedLocation
                  }
                  lockedLocationId={lockedLocationId}
                  selectedLocationName={
                    modalState.selectedLocationName || selectedLocationName
                  }
                  isLoadingCollections={modalState.isLoadingCollections}
                  collectedMachinesCount={collectedMachines.length}
                  selectedMachine={modalState.selectedMachine}
                  onLocationChange={transitions.selectLocation}
                  onOpenReport={handleOpenReport}
                  onViewForm={handleViewForm}
                  onViewCollectedMachines={handleViewCollectedMachines}
                />

                    {/* Machines List - Show when isMachineListVisible is true */}
                    {modalState.isMachineListVisible && (
                  <MobileEditMachineList
                    locationName={(() => {
                              const locationIdToUse =
                                lockedLocationId ||
                                selectedLocationId ||
                                modalState.selectedLocation;
                              const location = locations.find(
                                l => String(l._id) === locationIdToUse
                              );
                              return (
                                location?.name ||
                                modalState.selectedLocationName ||
                                selectedLocationName
                              );
                            })()}
                    machines={availableMachines}
                    collectedMachines={collectedMachines}
                    searchTerm={modalState.searchTerm}
                    selectedMachine={modalState.selectedMachine}
                    isLoadingMachines={modalState.isLoadingMachines}
                    onSearchChange={value =>
                      setModalState(prev => ({ ...prev, searchTerm: value }))
                    }
                    onMachineSelect={handleMachineSelect}
                    onMachineUnselect={handleMachineUnselect}
                    onBack={() =>
                                        setModalState(prev => ({
                                          ...prev,
                                          isMachineListVisible: false,
                      }))
                    }
                    sortMachines={sortMachinesAlphabetically}
                  />
                )}

                {/* Form Panel - Show when isFormVisible is true */}
                {modalState.isFormVisible && (
                  <MobileFormPanel
                    isVisible={modalState.isFormVisible}
                    onBack={() => {
                      setModalState(prev => ({
                        ...prev,
                        isFormVisible: false,
                      }));
                    }}
                    onViewCollectedList={handleViewCollectedMachines}
                    selectedMachineData={modalState.selectedMachineData}
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
                    financials={modalState.financials}
                    collectedMachinesCount={collectedMachines.length}
                    isProcessing={modalState.isProcessing}
                    inputsEnabled={inputsEnabled}
                    isAddMachineEnabled={isAddMachineEnabled}
                    formatMachineDisplay={(machine) => {
                      return (
                        <span>
                          {machine.custom?.name || machine.serialNumber || String(machine._id)}
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
                      setModalState(prev => ({
                        ...prev,
                        financials: {
                          ...prev.financials,
                          [field]: value,
                        },
                      }));
                    }}
                    onAddMachine={addMachineToList}
                    autoFillRamClearMeters={(checked) => {
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
                    onCollectedAmountChange={(value) => {
                      setModalState(prev => ({
                        ...prev,
                        financials: {
                          ...prev.financials,
                          collectedAmount: value,
                        },
                      }));
                    }}
                  />
                )}

                {/* Collected List Panel - Show when isCollectedListVisible is true */}
                {modalState.isCollectedListVisible && (
                  <MobileCollectedListPanel
                    isVisible={modalState.isCollectedListVisible}
                    onBack={() => {
                      setModalState(prev => ({
                        ...prev,
                        isCollectedListVisible: false,
                      }));
                    }}
                    collectedMachines={collectedMachines}
                    searchTerm={modalState.collectedMachinesSearchTerm}
                    onSearchChange={(term) => {
                      setModalState(prev => ({
                        ...prev,
                        collectedMachinesSearchTerm: term,
                      }));
                    }}
                    isViewingFinancialForm={modalState.isViewingFinancialForm}
                    onToggleView={(isFinancial) => {
                      setModalState(prev => ({
                        ...prev,
                        isViewingFinancialForm: isFinancial,
                      }));
                    }}
                    financials={modalState.financials}
                    isProcessing={modalState.isProcessing}
                    isCreateReportsEnabled={isCreateReportsEnabled}
                    updateAllDate={updateAllDate}
                    onUpdateAllDate={setUpdateAllDate}
                    onApplyAllDates={async () => {
                      // Apply dates logic - would need to be implemented in hook
                      if (updateAllDate) {
                        // Update all collected machines with the date
                      }
                    }}
                    formatMachineDisplay={(machine) => {
                      const doc = machine as unknown as CollectionDocument;
                      const displayName =
                        doc.machineCustomName ||
                        doc.machineName ||
                        doc.machineId ||
                        doc.serialNumber ||
                        String(doc._id);
                      return <span>{displayName}</span>;
                    }}
                    formatDate={(date) => {
                      return new Date(date).toLocaleString();
                    }}
                    sortMachines={sortMachinesAlphabetically}
                    onEditMachine={editMachineInList}
                    onDeleteMachine={deleteMachineFromList}
                    onFinancialDataChange={(field, value) => {
                      setModalState(prev => ({
                        ...prev,
                        financials: {
                          ...prev.financials,
                          [field]: value,
                        },
                      }));
                    }}
                    onCreateReport={updateCollectionReportHandler}
                  />
                )}
                                    </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}
