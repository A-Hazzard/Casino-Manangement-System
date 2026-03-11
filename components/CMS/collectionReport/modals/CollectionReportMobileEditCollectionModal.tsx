/**
 * CollectionReportMobileEditCollectionModal Component
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

import CollectionReportMobileCollectedListPanel from '@/components/CMS/collectionReport/mobile/CollectionReportMobileCollectedListPanel';
import CollectionReportMobileFormPanel from '@/components/CMS/collectionReport/mobile/CollectionReportMobileFormPanel';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle
} from '@/components/shared/ui/dialog';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { MobileCollectionModalSkeleton } from '@/components/shared/ui/skeletons/MobileCollectionModalSkeleton';
import { useMobileEditCollectionModal } from '@/lib/hooks/collectionReport/useMobileEditCollectionModal';
import type {
    CollectionReportLocationWithMachines,
    CollectionReportMachineSummary,
} from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { Calculator, ClipboardList, Info, SendHorizontal, X } from 'lucide-react';

type CollectionReportMobileEditCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
};

export default function CollectionReportMobileEditCollectionModal({
  show,
  onClose,
  reportId,
  locations = [],
  onRefresh,
}: CollectionReportMobileEditCollectionModalProps) {


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
    popNavigation,
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
    baseBalanceCorrection,
    onBaseBalanceCorrectionChange,
    onCollectedAmountChange,
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
  const handleMachineSelect = (machine: CollectionReportMachineSummary) => {
    transitions.selectMachine(machine);
    pushNavigation('form');
  };

  const handleMachineUnselect = () => {
    setModalState(prev => ({
      ...prev,
      selectedMachine: null,
      selectedMachineData: null,
    }));
  };

  const handleViewCollectedMachines = () => {
    if (collectedMachines.length === 0) return;
    pushNavigation('main');
    setModalState(prev => ({
      ...prev,
      isCollectedListVisible: true,
      isViewingFinancialForm: false,
    }));
  };

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
          {/* DialogTitle for accessibility - hidden visually */}
          <DialogTitle className="sr-only">
            Edit Collection Report
          </DialogTitle>

          {/* Modern Sticky Header - Only show on home screen */}
          {modalState.navigationStack.length === 0 && (
            <div className="sticky top-0 z-[100] border-b bg-white px-5 py-4 shadow-sm md:rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Edit Collection Report</h2>
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
              
              {/* Summary Info - Show when location is selected */}
              {(lockedLocationId || selectedLocationId || modalState.selectedLocation) && (
                <div className="border-b bg-blue-50/50 px-6 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <p className="text-sm font-semibold text-gray-900">
                        {modalState.selectedLocationName || selectedLocationName || 'Location'}
                      </p>
                    </div>
                    <div className="rounded-full bg-green-100 px-3 py-1 text-right">
                      <p className="text-xs font-bold text-green-700">
                        {collectedMachines.length} Machine{collectedMachines.length !== 1 ? 's' : ''} Recorded
                      </p>
                    </div>
                  </div>

                  {/* Live Reconciliation Summary Card */}
                  <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                    <h5 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                      <Info className="h-3 w-3" />
                      Live Reconciliation Summary
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5 border-r border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Target</p>
                        <p className="text-sm font-black text-gray-900">${modalState.financials.amountToCollect || '0.00'}</p>
                      </div>
                      <div className="space-y-0.5 pl-2">
                         <p className="text-[9px] font-bold text-gray-400 uppercase">Actual</p>
                         <p className="text-sm font-black text-blue-600">${modalState.financials.collectedAmount || '0.00'}</p>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-gray-50 pt-3">
                      <div className="flex items-center justify-between">
                         <p className="text-[9px] font-bold text-gray-400 uppercase">Next Opening Balance</p>
                         <p className={`text-xs font-black ${Number(modalState.financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                           ${modalState.financials.previousBalance || '0.00'}
                         </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-6 bg-gray-50/20">
                <div className="space-y-3">
                  {/* View Form Button */}
                  {collectedMachines.length > 0 && (
                    <button
                      onClick={() => {
                        pushNavigation('main');
                        setModalState(prev => ({
                          ...prev,
                          isCollectedListVisible: true,
                          isViewingFinancialForm: true,
                        }));
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white transition-all hover:bg-blue-700 active:scale-95 shadow-md"
                    >
                      <Calculator className="h-5 w-5" />
                      View Amount to Collect/Taxes
                    </button>
                  )}

                  {/* View Collected Machines Button */}
                  <button
                    onClick={() => {
                      if (collectedMachines.length === 0) return;
                      pushNavigation('main');
                      setModalState(prev => ({
                        ...prev,
                        isCollectedListVisible: true,
                        isViewingFinancialForm: false,
                      }));
                    }}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-medium transition-all active:scale-95 shadow-md ${
                      collectedMachines.length === 0
                        ? 'cursor-not-allowed bg-gray-400 text-gray-200 shadow-none'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <ClipboardList className="h-5 w-5" />
                    View Recorded Machines ({collectedMachines.length})
                  </button>
                </div>

                {/* Machines List Section */}
                <div className="mt-8">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      Machines at {modalState.selectedLocationName || selectedLocationName}
                    </h3>
                  </div>

                  {/* Search bar */}
                  {availableMachines.length > 3 && (
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search machines..."
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

                  {/* Machine Cards Grid */}
                  <div className="grid grid-cols-1 gap-3 pb-8 sm:grid-cols-2 items-start">
                    {(() => {
                      const filteredMachines = availableMachines.filter(machine => {
                        if (!modalState.searchTerm.trim()) return true;
                        const term = modalState.searchTerm.toLowerCase();
                        return (
                          (machine.name || '').toLowerCase().includes(term) ||
                          (machine.serialNumber || '').toLowerCase().includes(term)
                        );
                      });

                      const sortedMachines = sortMachinesAlphabetically(filteredMachines);

                      return sortedMachines.map(machine => {
                        const isCollected = collectedMachines.some(
                          cm => cm.machineId === String(machine._id)
                        );
                        const isSelected = modalState.selectedMachine === String(machine._id);

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
                            <p className="break-words text-sm font-bold text-gray-900 line-clamp-2 min-h-[40px]">
                              {formatMachineDisplayNameWithBold(machine)}
                            </p>

                            <div className="mt-1 space-y-1 text-xs text-gray-600">
                              <p className="flex flex-col sm:flex-row sm:gap-2">
                                <span>Prev In: {machine.collectionMeters?.metersIn || 0}</span>
                                <span className="hidden sm:inline">|</span>
                                <span>Prev Out: {machine.collectionMeters?.metersOut || 0}</span>
                              </p>
                            </div>

                            {isCollected && (
                              <div className="mt-1 flex items-center text-xs font-semibold text-green-600">
                                <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                                Added to Collection
                              </div>
                            )}

                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => {
                                  if (isSelected) {
                                    handleMachineUnselect();
                                  } else {
                                    handleMachineSelect(machine);
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
                                {isCollected ? '✓ Collected' : isSelected ? 'Unselect' : 'Select'}
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Sticky Bottom Submit Button */}
                {collectedMachines.length > 0 && (
                  <div className="sticky bottom-0 mt-6 border-t bg-white/80 p-4 backdrop-blur-sm -mx-6 mb-[-1.5rem]">
                    <button
                      onClick={() => updateCollectionReportHandler()}
                      disabled={!isCreateReportsEnabled || modalState.isProcessing}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold shadow-lg transition-all active:scale-95 ${
                        isCreateReportsEnabled && !modalState.isProcessing
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-green-200'
                          : 'cursor-not-allowed bg-gray-400 text-gray-200'
                      }`}
                    >
                      <SendHorizontal className="h-5 w-5" />
                      UPDATE FINAL COLLECTION REPORT
                    </button>
                    <p className="mt-2 text-center text-[10px] text-gray-400 font-medium">
                      Finalize all {collectedMachines.length} machine readings.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Form Panel View */}
          {modalState.isFormVisible && (
            <CollectionReportMobileFormPanel
              isVisible={modalState.isFormVisible}
              onBack={() => {
                popNavigation();
                setModalState(prev => ({ ...prev, isFormVisible: false }));
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
              formatMachineDisplay={machine => (
                <span>{machine.custom?.name || machine.serialNumber || String(machine._id)}</span>
              )}
              onViewMachine={() => setModalState(prev => ({ ...prev, showViewMachineConfirmation: true }))}
              onFormDataChange={(field, value) => {
                setModalState(prev => ({
                  ...prev,
                  formData: { ...prev.formData, [field]: value },
                }));
              }}
              onFinancialDataChange={(field, value) => {
                setModalState(prev => ({
                  ...prev,
                  financials: { ...prev.financials, [field]: value },
                }));
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
              onCollectedAmountChange={onCollectedAmountChange}
              baseBalanceCorrection={baseBalanceCorrection}
              onBaseBalanceCorrectionChange={onBaseBalanceCorrectionChange}
            />
          )}

          {/* Collected List View */}
          {modalState.isCollectedListVisible && (
            <CollectionReportMobileCollectedListPanel
              isVisible={modalState.isCollectedListVisible}
              isEditing={true}
              onBack={() => {
                popNavigation();
                setModalState(prev => ({ ...prev, isCollectedListVisible: false }));
              }}
              collectedMachines={collectedMachines}
              searchTerm={modalState.collectedMachinesSearchTerm}
              onSearchChange={term => setModalState(prev => ({ ...prev, collectedMachinesSearchTerm: term }))}
              isViewingFinancialForm={modalState.isViewingFinancialForm}
              onToggleView={isFinancial => setModalState(prev => ({ ...prev, isViewingFinancialForm: isFinancial }))}
              financials={modalState.financials}
              isProcessing={modalState.isProcessing}
              isCreateReportsEnabled={isCreateReportsEnabled}
              updateAllDate={updateAllDate}
              onUpdateAllDate={setUpdateAllDate}
              onApplyAllDates={async () => {}}
              formatMachineDisplay={machine => {
                const doc = machine as unknown as CollectionDocument;
                return <span>{doc.machineCustomName || doc.machineName || doc.machineId || doc.serialNumber}</span>;
              }}
              formatDate={date => new Date(date).toLocaleString()}
              sortMachines={sortMachinesAlphabetically}
              onEditMachine={editMachineInList}
              onDeleteMachine={deleteMachineFromList}
              onFinancialDataChange={(field, value) => {
                setModalState(prev => ({
                  ...prev,
                  financials: { ...prev.financials, [field]: value },
                }));
              }}
              onCollectedAmountChange={onCollectedAmountChange}
              baseBalanceCorrection={baseBalanceCorrection}
              onBaseBalanceCorrectionChange={onBaseBalanceCorrectionChange}
              onCreateReport={updateCollectionReportHandler}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

