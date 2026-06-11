import CollectionReportMobileCollectedListPanel from '@/components/CMS/collectionReport/mobile/CollectionReportMobileCollectedListPanel';
import CollectionReportMobileFormPanel from '@/components/CMS/collectionReport/mobile/CollectionReportMobileFormPanel';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import MachineOnlineStatusDot from '@/components/ui/MachineOnlineStatusDot';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import { formatDateWithOrdinal } from '@/lib/utils/date/formatting';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { Calculator, ClipboardList } from 'lucide-react';
import { useEffect } from 'react';
import { MobileModalState } from '@/lib/hooks/collectionReport/useMobileEditCollectionModal';
import {
  MachineVariationData,
  VariationsCheckResponse,
} from '@/lib/hooks/collectionReport/useCollectionReportVariationCheck';
import { toast } from 'sonner';

type MobileEditLayoutProps = {
  modalState: MobileModalState;
  setModalState: (
    updater: (prev: MobileModalState) => MobileModalState
  ) => void;
  collectedMachines: CollectionDocument[];
  availableMachines: CollectionReportMachineSummary[];
  lockedLocationId: string | undefined;
  selectedLocationId: string | undefined;
  selectedLocationName: string;
  pushNavigation: (view: string) => void;
  popNavigation: (toView?: string) => void;
  handleViewCollectedMachines: () => void;
  onFormDataChange: (updates: Partial<MobileModalState['formData']>) => void;
  onCollectedAmountChange: (val: string) => void;
  baseBalanceCorrection: string;
  onBaseBalanceCorrectionChange: (val: string) => void;
  addMachineToList: () => void;
  editMachineInList: (entry: CollectionDocument) => void;
  deleteMachineFromList: (id: string) => void;
  handleStartSubmit: () => void;
  updateAllSasStartDate: Date | undefined;
  setUpdateAllSasStartDate: (d: Date | undefined) => void;
  updateAllSasEndDate: Date | undefined;
  setUpdateAllSasEndDate: (d: Date | undefined) => void;
  handleApplyAllDates: () => void;
  sasUpdateProgress?: { completed: number; total: number } | null;
  variationsData: VariationsCheckResponse | null;
  transitions: {
    selectMachine: (machine: CollectionReportMachineSummary) => void;
  };
  sortMachinesAlphabetically: (
    machines: CollectionDocument[]
  ) => CollectionDocument[];
  isCreateReportsEnabled: boolean;
  inputsEnabled: boolean;
  isAddMachineEnabled: boolean;
  hasChanges?: boolean;
  newMachineIds?: string[];
  gameDayOffset?: number;
  machineStatusMap?: Record<string, boolean>;
};

export default function MobileEditLayout(props: MobileEditLayoutProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const {
    modalState,
    setModalState,
    collectedMachines,
    availableMachines,
    selectedLocationName,
    pushNavigation,
    popNavigation,
    handleViewCollectedMachines,
    transitions,
    sortMachinesAlphabetically,
    inputsEnabled,
    isAddMachineEnabled,
    hasChanges,
    newMachineIds,
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
    handleApplyAllDates,
    sasUpdateProgress,
    onFormDataChange,
    onCollectedAmountChange,
    baseBalanceCorrection,
    onBaseBalanceCorrectionChange,
    handleStartSubmit,
    editMachineInList,
    deleteMachineFromList,
    addMachineToList,
    variationsData,
  } = props;
  const machineStatusMap = props.machineStatusMap ?? {};

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleMachineSelect = (machine: CollectionReportMachineSummary) => {
    // Check if machine is already collected in this report
    const isAlreadyCollected = collectedMachines.some(
      collected => String(collected.machineId) === String(machine._id)
    );
    if (isAlreadyCollected) {
      toast.warning(
        'This machine has already been recorded in this collection report.'
      );
      return;
    }
    transitions.selectMachine(machine);
    pushNavigation('form');
  };

  /* handleMachineUnselect removed as it is unused */

  // ============================================================================
  // Effects
  // ============================================================================

  // Auto-fill notes for offline SMIB machines when a new machine is selected
  useEffect(() => {
    const selectedMachine = modalState.selectedMachineData;
    const machineId = selectedMachine?._id ? String(selectedMachine._id) : null;
    const isEditing = modalState.editingEntryId;
    const currentNotes = modalState.formData?.notes;

    if (machineId && !isEditing) {
      const isKnown = machineId in machineStatusMap;
      if (isKnown && machineStatusMap[machineId] === false && !currentNotes) {
        onFormDataChange({ notes: 'Machine was offline' });
      }
    }
  }, [modalState.selectedMachineData, modalState.editingEntryId, modalState.formData?.notes, machineStatusMap, onFormDataChange]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* Search Header */}
      {!modalState.isFormVisible && !modalState.isCollectedListVisible && (
        <div className="flex-shrink-0 space-y-3 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-900">Add Collection</h2>
            <p className="text-sm text-gray-500">
              {selectedLocationName ?? 'Select a machine to record its counts.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search machines..."
                value={modalState.searchTerm}
                onChange={e =>
                  setModalState((prev: MobileModalState) => ({
                    ...prev,
                    searchTerm: e.target.value,
                  }))
                }
                className="w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-3 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Calculator className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            <button
              onClick={handleViewCollectedMachines}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-transform active:scale-95"
            >
              <ClipboardList className="h-5 w-5" />
              {collectedMachines.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {collectedMachines.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Machine Selection Grid */}
      {!modalState.isFormVisible && !modalState.isCollectedListVisible && (
        <div className="flex-1 overflow-y-auto px-4 pb-20">
          {availableMachines.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <div className="mb-2 rounded-full bg-gray-100 p-3">
                <Calculator className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                No machines found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pt-2">
              {availableMachines.map(
                (machine: CollectionReportMachineSummary) => {
                  const isCollected = collectedMachines.some(
                    col => String(col.machineId) === String(machine._id)
                  );

                  return (
                    <button
                      key={String(machine._id)}
                      onClick={() => handleMachineSelect(machine)}
                      className={`relative flex items-center justify-between rounded-xl border p-4 text-left transition-all active:scale-[0.98] ${
                        isCollected
                          ? 'border-green-200 bg-green-50/50 shadow-sm shadow-green-100/50'
                          : 'border-gray-200 bg-white shadow-sm hover:border-blue-300 active:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {formatMachineDisplayNameWithBold({
                            ...machine,
                            serialNumber: getSerialNumberIdentifier(machine),
                          })}
                        </p>
                        {machine.relayId && (
                          <MachineOnlineStatusDot
                            isOnline={machineStatusMap[String(machine._id)]}
                          />
                        )}
                        <p className="text-[11px] font-medium uppercase tracking-tight text-gray-400">
                          {machine.game || 'Machine'}
                        </p>
                      </div>
                      {isCollected ? (
                        <div className="flex h-6 items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-green-700">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                          Collected
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                          <Calculator className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>
      )}

      {/* Form View Overlay */}
      {modalState.isFormVisible && (
        <CollectionReportMobileFormPanel
          isVisible={modalState.isFormVisible}
          onBack={() => {
            popNavigation();
            setModalState((prev: MobileModalState) => ({
              ...prev,
              isFormVisible: false,
            }));
          }}
          onViewCollectedList={handleViewCollectedMachines}
          selectedMachineData={modalState.selectedMachineData}
          editingEntryId={modalState.editingEntryId}
          formData={modalState.formData}
          financials={modalState.financials}
          collectedMachinesCount={collectedMachines.length}
          isProcessing={modalState.isProcessing}
          inputsEnabled={inputsEnabled}
          isAddMachineEnabled={isAddMachineEnabled}
          formatMachineDisplay={machine =>
            formatMachineDisplayNameWithBold({
              ...machine,
              serialNumber: getSerialNumberIdentifier(machine),
            })
          }
          onViewMachine={() =>
            setModalState((prev: MobileModalState) => ({
              ...prev,
              showViewMachineConfirmation: true,
            }))
          }
          onFormDataChange={(
            field: string,
            value: string | boolean | Date | null
          ) => {
            onFormDataChange({ [field]: value });
          }}
          onFinancialDataChange={(field: string, value: string) => {
            setModalState((prev: MobileModalState) => ({
              ...prev,
              financials: { ...prev.financials, [field]: value },
            }));
          }}
          onAddMachine={addMachineToList}
          autoFillRamClearMeters={checked => {
            setModalState((prev: MobileModalState) => ({
              ...prev,
              formData: {
                ...prev.formData,
                ramClear: checked,
                ramClearMetersIn: checked
                  ? prev.formData.ramClearMetersIn || prev.formData.prevIn
                  : '',
                ramClearMetersOut: checked
                  ? prev.formData.ramClearMetersOut || prev.formData.prevOut
                  : '',
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
            setModalState((prev: MobileModalState) => ({
              ...prev,
              isCollectedListVisible: false,
            }));
          }}
          collectedMachines={collectedMachines}
          searchTerm={modalState.collectedMachinesSearchTerm}
          onSearchChange={term =>
            setModalState((prev: MobileModalState) => ({
              ...prev,
              collectedMachinesSearchTerm: term,
            }))
          }
          isViewingFinancialForm={modalState.isViewingFinancialForm}
          onToggleView={isFinancial =>
            setModalState((prev: MobileModalState) => ({
              ...prev,
              isViewingFinancialForm: isFinancial,
            }))
          }
          financials={modalState.financials}
          isProcessing={modalState.isProcessing}
          updateAllSasStartDate={updateAllSasStartDate}
          onUpdateAllSasStartDate={setUpdateAllSasStartDate}
          updateAllSasEndDate={updateAllSasEndDate}
          onUpdateAllSasEndDate={setUpdateAllSasEndDate}
          onApplyAllDates={handleApplyAllDates}
          sasUpdateProgress={sasUpdateProgress}
          variationMachineIds={variationsData?.machines
            .filter(
              (variation: MachineVariationData) =>
                typeof variation.variation === 'number' && Math.abs(variation.variation) > 0.1
            )
            .map((variation: MachineVariationData) => variation.machineId)}
          formatMachineDisplay={machine => {
            const doc = machine as unknown as CollectionDocument;
            return (
              <span>
                {doc.machineCustomName ||
                  doc.machineName ||
                  doc.machineId ||
                  doc.serialNumber}
              </span>
            );
          }}
          formatDate={date => formatDateWithOrdinal(date)}
          sortMachines={sortMachinesAlphabetically}
          onEditMachine={machine => editMachineInList(machine)}
          onDeleteMachine={deleteMachineFromList}
          onFinancialDataChange={(field: string, value: string) => {
            setModalState((prev: MobileModalState) => ({
              ...prev,
              financials: { ...prev.financials, [field]: value },
            }));
          }}
          onCollectedAmountChange={onCollectedAmountChange}
          baseBalanceCorrection={baseBalanceCorrection}
          onBaseBalanceCorrectionChange={onBaseBalanceCorrectionChange}
          onCreateReport={handleStartSubmit}
          hasChanges={hasChanges}
          newMachineIds={newMachineIds}
        />
      )}
    </div>
  );
}
