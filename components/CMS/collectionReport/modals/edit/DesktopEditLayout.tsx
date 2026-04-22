import CollectionReportEditCollectedMachines from '@/components/CMS/collectionReport/forms/CollectionReportEditCollectedMachines';
import CollectionReportEditFinancials from '@/components/CMS/collectionReport/forms/CollectionReportEditFinancials';
import CollectionReportEditFormFields from '@/components/CMS/collectionReport/forms/CollectionReportEditFormFields';
import CollectionReportEditLocationMachineSelection from '@/components/CMS/collectionReport/forms/CollectionReportEditLocationMachineSelection';
import { VariationsCollapsibleSection } from '@/components/CMS/collectionReport/variations/VariationsCollapsibleSection';
import { Info } from 'lucide-react';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import type { CollectionReportLocationWithMachines, CollectionReportMachineSummary, VariationsCheckResponse, MachineVariationData } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';

type DesktopEditLayoutProps = {
  selectedLocationId: string | undefined;
  setSelectedLocationId: (id: string) => void;
  selectedLocationName: string;
  machinesOfSelectedLocation: CollectionReportMachineSummary[];
  machineSearchTerm: string;
  setMachineSearchTerm: (term: string) => void;
  filteredMachines: CollectionReportMachineSummary[];
  isLoadingLocations: boolean;
  isLoadingMachines: boolean;
  isProcessing: boolean;
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;
  collectedMachineEntries: CollectionDocument[];
  editingEntryId: string | null;
  machineForDataEntry: CollectionReportMachineSummary | undefined;
  currentCollectionTime: Date | null;
  setCurrentCollectionTime: (date: Date) => void;
  showAdvancedSas: boolean;
  setShowAdvancedSas: (show: boolean) => void;
  sasStartTime: Date | null;
  setSasStartTime: (val: Date | null) => void;
  sasEndTime: Date | null;
  setSasEndTime: (val: Date | null) => void;
  currentMetersIn: string;
  setCurrentMetersIn: (val: string) => void;
  currentMetersOut: string;
  setCurrentMetersOut: (val: string) => void;
  currentRamClearMetersIn: string;
  setCurrentRamClearMetersIn: (val: string) => void;
  currentRamClearMetersOut: string;
  setCurrentRamClearMetersOut: (val: string) => void;
  currentMachineNotes: string;
  setCurrentMachineNotes: (val: string) => void;
  currentRamClear: boolean;
  setCurrentRamClear: (val: boolean) => void;
  prevIn: string;
  setPrevIn: (val: string) => void;
  prevOut: string;
  setPrevOut: (val: string) => void;
  financials: {
    amountToCollect: string;
    balanceCorrection: string;
    collectedAmount: string;
    taxes: string;
    variance: string;
    advance: string;
    previousBalance: string;
    varianceReason: string;
    balanceCorrectionReason: string;
    reasonForShortagePayment: string;
  };
  setFinancials: (fin: Partial<DesktopEditLayoutProps["financials"]>) => void;
  baseBalanceCorrection: string;
  setBaseBalanceCorrection: (val: string) => void;
  calculateCarryover: (val: string, corr: string) => void;
  isMinimized: boolean;
  variationsData: VariationsCheckResponse | null;
  checkComplete: boolean;
  variationsCollapsibleExpanded: boolean;
  setVariationsCollapsibleExpanded: (exp: boolean) => void;
  handleEditEntry: (id: string) => void;
  handleDeleteEntry: (id: string) => void;
  handleCancelEdit: () => void;
  handleAddOrUpdateEntry: () => void;
  handleDisabledFieldClick: () => void;
  setShowViewMachineConfirmation: (show: boolean) => void;
  updateAllSasStartDate: Date | undefined;
  setUpdateAllSasStartDate: (date: Date | undefined) => void;
  updateAllSasEndDate: Date | undefined;
  setUpdateAllSasEndDate: (date: Date | undefined) => void;
  onRefresh: () => void;
  isUpdateReportEnabled: boolean;

  handleApplyAllDates: () => void;
  locations: CollectionReportLocationWithMachines[];
  gameDayOffset?: number;
};

export default function DesktopEditLayout(props: DesktopEditLayoutProps) {
  const {
    selectedLocationId,
    setSelectedLocationId,
    selectedLocationName,
    machinesOfSelectedLocation,
    machineSearchTerm,
    setMachineSearchTerm,
    filteredMachines,
    isLoadingLocations,
    isLoadingMachines,
    isProcessing,
    selectedMachineId,
    setSelectedMachineId,
    collectedMachineEntries,
    editingEntryId,
    machineForDataEntry,
    currentCollectionTime,
    setCurrentCollectionTime,
    showAdvancedSas,
    setShowAdvancedSas,
    sasStartTime,
    setSasStartTime,
    sasEndTime,
    setSasEndTime,
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
    prevIn,
    setPrevIn,
    prevOut,
    setPrevOut,
    financials,
    setFinancials,
    baseBalanceCorrection,
    setBaseBalanceCorrection,
    calculateCarryover,
    isMinimized,
    variationsData,
    checkComplete,
    variationsCollapsibleExpanded,
    setVariationsCollapsibleExpanded,
    handleEditEntry,
    handleDeleteEntry,
    handleCancelEdit,
    handleAddOrUpdateEntry,
    handleDisabledFieldClick,
    setShowViewMachineConfirmation,
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
    onRefresh,

    handleApplyAllDates,
    locations,
  } = props;

  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
      {/* Left sidebar: Location selector and machine list - 1/5 width */}
      <div className={`flex min-h-0 w-full flex-shrink-0 flex-col overflow-hidden md:w-1/5 border-r border-gray-200 ${isMobile && (selectedMachineId || collectedMachineEntries.length > 0) ? 'hidden md:flex' : 'flex'}`}>
        <CollectionReportEditLocationMachineSelection
          locations={locations}
          selectedLocationId={selectedLocationId ?? ''}
          setSelectedLocationId={setSelectedLocationId}
          machinesOfSelectedLocation={machinesOfSelectedLocation}
          machineSearchTerm={machineSearchTerm}
          setMachineSearchTerm={setMachineSearchTerm}
          filteredMachines={filteredMachines}
          isLoadingLocations={isLoadingLocations}
          isLoadingMachines={isLoadingMachines}
          isProcessing={isProcessing}
          selectedMachineId={selectedMachineId}
          setSelectedMachineId={setSelectedMachineId}
          collectedMachineEntries={collectedMachineEntries}
          editingEntryId={editingEntryId}
        />
      </div>

      {/* Middle section: Form fields - 3/5 width (60%) */}
      <div className={`flex min-h-0 w-full flex-1 flex-col space-y-3 overflow-y-auto p-3 md:w-3/5 md:p-4 border-gray-200 ${isMobile && !selectedMachineId ? 'hidden md:flex' : 'flex'}`}>
        {/* Variation summary when popover is minimized - MOVED TO TOP FOR VISIBILITY */}
        {isMinimized && variationsData && checkComplete && (
          <div className="mb-4">
            <VariationsCollapsibleSection
              machines={variationsData.machines}
              isExpanded={variationsCollapsibleExpanded}
              onExpandChange={setVariationsCollapsibleExpanded}
            />
          </div>
        )}

        {(selectedMachineId && machineForDataEntry) ||
        collectedMachineEntries.length > 0 ? (
          <>
            <CollectionReportEditFormFields
              selectedLocationName={selectedLocationName}
              machineForDataEntry={machineForDataEntry}
              currentCollectionTime={currentCollectionTime ?? new Date()}
              setCurrentCollectionTime={(date: Date) => {
                if (date) setCurrentCollectionTime(date);
              }}
              showAdvancedSas={showAdvancedSas}
              setShowAdvancedSas={setShowAdvancedSas}
              sasStartTime={sasStartTime}
              setSasStartTime={setSasStartTime}
              sasEndTime={sasEndTime}
              setSasEndTime={setSasEndTime}
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
              onPrevInChange={setPrevIn}
              onPrevOutChange={setPrevOut}
              debouncedCurrentMetersIn={currentMetersIn}
              debouncedCurrentMetersOut={currentMetersOut}
              inputsEnabled={!!selectedMachineId}
              isProcessing={isProcessing}
              editingEntryId={editingEntryId}
              isAddMachineEnabled={true}
              onAddOrUpdateEntry={handleAddOrUpdateEntry}
              onCancelEdit={handleCancelEdit}
              onDisabledFieldClick={() => handleDisabledFieldClick()}
              onViewMachine={() => setShowViewMachineConfirmation(true)}
            />

            <CollectionReportEditFinancials
              financials={financials}
              setFinancials={setFinancials}
              baseBalanceCorrection={baseBalanceCorrection}
              setBaseBalanceCorrection={setBaseBalanceCorrection}
              isProcessing={isProcessing}
              onCollectedAmountChange={(value: string) => {
                calculateCarryover(value, baseBalanceCorrection);
              }}
            />


            {/* Reconciliation Guide Note */}
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
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-gray-500">
              Select a location and machine from the left to enter its
              collection data.
            </p>
          </div>
        )}
      </div>

      {/* Right sidebar: Collected machines list - 1/5 width */}
      <div className={`flex min-h-0 w-full flex-shrink-0 flex-col overflow-hidden md:w-1/5 ${isMobile && (selectedMachineId || collectedMachineEntries.length === 0) ? 'hidden md:flex' : 'flex'}`}>
        <CollectionReportEditCollectedMachines
          collectedMachineEntries={collectedMachineEntries}
          isProcessing={isProcessing}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
          updateAllSasStartDate={updateAllSasStartDate}
          setUpdateAllSasStartDate={setUpdateAllSasStartDate}
          updateAllSasEndDate={updateAllSasEndDate}
          setUpdateAllSasEndDate={setUpdateAllSasEndDate}
          onRefresh={onRefresh}
          financials={financials}

          onApplyAllDates={handleApplyAllDates}
          variationMachineIds={variationsData?.machines.filter((m: MachineVariationData) => typeof m.variation === 'number' && Math.abs(m.variation) > 0.1).map((m: MachineVariationData) => m.machineId)}
        />
      </div>
    </div>
  );
}
