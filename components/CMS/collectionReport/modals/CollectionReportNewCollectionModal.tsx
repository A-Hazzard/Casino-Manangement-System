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
import { VariationCheckPanel } from '@/components/CMS/collectionReport/variations/VariationCheckPanel';
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
  deleteMachineCollectionBatch,
} from '@/lib/helpers/collectionReport/newCollectionModalHelpers';
import { useNewCollectionModal } from '@/lib/hooks/collectionReport/useNewCollectionModal';
import { useWowAutoReport } from '@/lib/hooks/collectionReport/useWowAutoReport';
import { persistWowCollection } from '@/lib/helpers/collectionReport/wowAutoReportPersist';
import {
  useVariationStreamCheck,
  type VariationCheckMachine,
} from '@/lib/hooks/collectionReport/useVariationStreamCheck';
import { useUserStore } from '@/lib/store/userStore';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useMachineOnlineStatus } from '@/lib/hooks/useMachineOnlineStatus';
import { isWowMachine } from '@/shared/utils/wowMachine';
import { formatDate } from '@/lib/utils/formatting';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Info } from 'lucide-react';
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
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const user = useUserStore(state => state.user);
  const userId = user?._id;

  // Variation checking — streaming per-machine check (matches the report detail page).
  const {
    status: variationStatus,
    done: checkDone,
    total: checkTotal,
    currentMachineName,
    result: variationResult,
    error: variationError,
    run: runVariationCheck,
    cancel: cancelVariationCheck,
    reset: resetVariationCheck,
  } = useVariationStreamCheck();

  // Adapters so the existing in-form consumers keep working unchanged.
  const checkComplete = variationStatus === 'done';
  const hasVariations =
    variationStatus === 'done' ? (variationResult?.hasVariations ?? false) : null;
  const variationsData = variationResult;
  // The new panel has no minimize concept; keep the flag for the legacy in-form block.
  const isMinimized = false;

  // Captures the last check inputs so the panel's Retry can replay them.
  const lastCheckArgsRef = useRef<{
    locationId: string;
    machines: VariationCheckMachine[];
  } | null>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');

  const [showVariationCheckPopover, setShowVariationCheckPopover] =
    useState(false);
  const [variationsCollapsibleExpanded, setVariationsCollapsibleExpanded] =
    useState(true);
  const [showVariationsConfirmation, setShowVariationsConfirmation] =
    useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================
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
    isLoadingTime,
    selectedLocationId,
    selectedLocationName,
    machinesOfSelectedLocation,
    machineSearchTerm,
    setMachineSearchTerm,
    lockedLocationId,
    selectedMachineId,
    setSelectedMachineId,
    currentCollectionTime,
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
    sasStartTime,
    setSasStartTime,
    sasEndTime,
    setSasEndTime,
    collectedMachineEntries,
    setCollectedMachineEntries,
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
    jackpot,
    includeJackpot,
    previousCollectionTime,
    isLoadingExistingCollections,
    filteredMachines,
    machineForDataEntry,
    inputsEnabled,
    isAddMachineEnabled,
    isMiddleReportWarning,
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
    setLockedLocation,
    setHasChanges,
    anyConfirmationOpen,
    updateAllSasStartDate,
    setUpdateAllSasStartDate,
    updateAllSasEndDate,
    setUpdateAllSasEndDate,
    handleApplyAllDates,
    sasUpdateProgress,
    createReportProgress,
    createPhases,
    currentCreatePhase,
    currentSubStep,
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

  const resolvedCollectionTime = useMemo(() => {
    if (collectedMachineEntries && collectedMachineEntries.length > 0) {
      const times = collectedMachineEntries
        .map(e => (e.timestamp ? new Date(e.timestamp).getTime() : 0))
        .filter(t => t > 0);
      if (times.length > 0) {
        return new Date(Math.max(...times));
      }
    }
    return currentCollectionTime;
  }, [collectedMachineEntries, currentCollectionTime]);

  // Online/offline status for machines in the selected location
  const availableMachineIds = machinesOfSelectedLocation.map(machine =>
    String(machine._id)
  );
  const machineStatusMap = useMachineOnlineStatus(availableMachineIds);

  // ============================================================================
  // Selection State (Bulk Delete)
  // ============================================================================
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirmation, setShowBulkDeleteConfirmation] =
    useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setShowBulkDeleteConfirmation(false);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await deleteMachineCollectionBatch(selectedIds);
      const updatedEntries = collectedMachineEntries.filter(
        entry => !selectedIds.includes(String(entry._id))
      );
      setCollectedMachineEntries(updatedEntries);
      clearSelection();
      toast.success(`${selectedIds.length} machine(s) deleted successfully`);
    } catch (error) {
      console.error('[BulkDelete] Error:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to delete some machines. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, collectedMachineEntries, setCollectedMachineEntries, clearSelection]);

  // ============================================================================
  // Effects
  // ============================================================================
  // Reset variation check when modal opens/closes
  useEffect(() => {
    if (!show) {
      resetVariationCheck();
    }
  }, [show, resetVariationCheck]);

  // Defensive: clear any stale shared collection-modal store state when the create
  // modal opens (e.g. machines/financials left over from a prior edit modal session).
  const resetCollectionModalStore = useCollectionModalStore(
    state => state.resetState
  );
  // Atomic append to the shared store — used by WOW Auto Report to add each machine to the
  // collected list as it is scanned (avoids stale-state batching).
  const addCollectedMachineToStore = useCollectionModalStore(
    state => state.addCollectedMachine
  );
  useEffect(() => {
    if (show) {
      resetCollectionModalStore();
    }
  }, [show, resetCollectionModalStore]);

  // Auto-fill notes for offline SMIB machines when selected
  useEffect(() => {
    if (selectedMachineId && machineForDataEntry && !editingEntryId) {
      const isKnown = selectedMachineId in machineStatusMap;
      if (isKnown && machineStatusMap[selectedMachineId] === false && !currentMachineNotes) {
        setCurrentMachineNotes('Machine was offline');
      }
    }
  }, [selectedMachineId, machineStatusMap, editingEntryId, machineForDataEntry, currentMachineNotes, setCurrentMachineNotes]);

  // ============================================================================
  // Submit handler (extracted so WOW Auto Report can trigger the same flow)
  // ============================================================================
  const handleDesktopCreateSubmit = useCallback(async () => {
    if (collectedMachineEntries.length === 0 || isProcessing) return;

    // Check if there's unsaved data (machine selected with form data but not added)
    const hasUnsavedData =
      selectedMachineId &&
      (currentMetersIn.trim() !== '' ||
        currentMetersOut.trim() !== '' ||
        currentMachineNotes.trim() !== '');

    if (hasUnsavedData) {
      toast.error(
        'You have unsaved machine data. Please click "Add Machine to List" or cancel the current machine entry before creating the report.',
        { duration: 6000, position: 'top-center' }
      );
      return;
    }

    const locationIdToUse =
      selectedLocationId ||
      lockedLocationId ||
      collectedMachineEntries[0]?.location ||
      '';

    // Check EVERY collected machine (WOW included). Offline non-SMIB machines have
    // no SAS data until finalization, so they surface as "no SAS data" (variation null),
    // and finalization (createManualMetersForEachMachine) creates their meters.
    const machinesForCheck: VariationCheckMachine[] =
      collectedMachineEntries.map(entry => ({
        machineId: entry.machineId,
        machineName:
          `${entry.serialNumber || ''} ${entry.machineCustomName || ''} (${entry.game || ''})`.trim() ||
          entry.machineId,
        metersIn: entry.metersIn || 0,
        metersOut: entry.metersOut || 0,
        prevIn: entry.prevIn || 0,
        prevOut: entry.prevOut || 0,
        movementGross: (entry as { movement?: { gross?: number } }).movement
          ?.gross,
        sasStartTime: entry.sasMeters?.sasStartTime
          ? new Date(entry.sasMeters.sasStartTime).toISOString()
          : undefined,
        sasEndTime: entry.sasMeters?.sasEndTime
          ? new Date(entry.sasMeters.sasEndTime).toISOString()
          : undefined,
      }));

    lastCheckArgsRef.current = {
      locationId: locationIdToUse,
      machines: machinesForCheck,
    };
    setShowVariationCheckPopover(true);
    runVariationCheck(locationIdToUse, machinesForCheck);
  }, [
    collectedMachineEntries,
    isProcessing,
    selectedMachineId,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    selectedLocationId,
    lockedLocationId,
    machinesOfSelectedLocation,
    setShowCreateReportConfirmation,
    runVariationCheck,
  ]);

  // ============================================================================
  // WOW Auto Report (developer-only, all-WOW locations)
  // ============================================================================
  const isDeveloper = (user?.roles ?? []).includes('developer');
  const isAllWowLocation =
    machinesOfSelectedLocation.length > 0 &&
    machinesOfSelectedLocation.every(machine => isWowMachine(machine));
  const uncollectedWowMachines = machinesOfSelectedLocation
    .filter(
      machine =>
        !collectedMachineEntries.some(
          entry => String(entry.machineId) === String(machine._id)
        )
    )
    .map(machine => ({
      id: String(machine._id),
      name:
        machine.custom?.name ||
        machine.serialNumber ||
        machine.name ||
        String(machine._id),
    }));

  const wowStartTimeIso = useMemo(() => {
    if (!isAllWowLocation) return undefined;
    const times = machinesOfSelectedLocation
      .map(m => (m.collectionTime ? new Date(m.collectionTime as string | Date).getTime() : null))
      .filter((t): t is number => t !== null);
    if (times.length > 0) {
      return new Date(Math.min(...times)).toISOString();
    }
    if (previousCollectionTime) {
      return new Date(previousCollectionTime).toISOString();
    }
    const collectionTimeDate = currentCollectionTime instanceof Date
      ? currentCollectionTime
      : new Date();
    return new Date(collectionTimeDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }, [isAllWowLocation, machinesOfSelectedLocation, previousCollectionTime, currentCollectionTime]);

  const [createAutoHighlightId, setCreateAutoHighlightId] = useState<
    string | null
  >(null);

  const autoReport = useWowAutoReport({
    enabled: isDeveloper && isAllWowLocation,
    machines: uncollectedWowMachines,
    startOffset: collectedMachineEntries.length,
    startTimeIso: wowStartTimeIso,
    onHighlight: setCreateAutoHighlightId,
    persist: (machine, meters, ctx) => {
      const machineDoc = machinesOfSelectedLocation.find(
        m => String(m._id) === machine.id
      );
      const loc = locations.find(
        l => String(l._id) === (selectedLocationId || lockedLocationId)
      );
      return persistWowCollection(machine, meters, {
        locationId: selectedLocationId || lockedLocationId || '',
        collector: userId || '',
        collectionTime: ctx?.collectionTime,
        useMeterTimes: ctx?.useMeterTimes,
        machineName: machineDoc?.name,
        serialNumber: machineDoc?.serialNumber,
        machineCustomName: machineDoc?.custom?.name,
        previousCollectionTime: previousCollectionTime
          ? new Date(previousCollectionTime)
          : undefined,
        gameDayOffset: ctx?.gameDayOffset !== undefined ? ctx.gameDayOffset : loc?.gameDayOffset,
      });
    },
    commit: entry => {
      addCollectedMachineToStore(entry);
      setLockedLocation(selectedLocationId || lockedLocationId || '');
      setHasChanges(true);
    },
    openSubmit: handleDesktopCreateSubmit,
  });

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {/* Main Container */}
      <Dialog
        open={show}
        onOpenChange={open => {
          if (!open && (isProcessing || anyConfirmationOpen)) return;
          if (!open && autoReport.isRunning) {
            toast.error('Auto report is in progress. Use the Cancel button to stop it first.', {
              position: 'top-center',
              duration: 3000,
            });
            return;
          }
          if (!open) {
            resetVariationCheck();
          }
          handleClose();
        }}
      >
        <DialogContent
          className="flex h-auto max-h-[95vh] w-[98vw] max-w-[98vw] flex-col bg-container p-0 md:h-auto md:w-full md:max-w-6xl lg:max-w-7xl"
          showCloseButton={!isProcessing && !autoReport.isRunning}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
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
            <div className="flex min-h-0 w-full flex-shrink-0 flex-col border-r border-gray-200 md:w-1/5">
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
                machineStatusMap={machineStatusMap}
                onLocationChange={handleLocationChange}
                onMachineSearchChange={setMachineSearchTerm}
                onMachineSelect={setSelectedMachineId}
                autoReport={autoReport}
                autoHighlightId={createAutoHighlightId}
              />
            </div>

            {/* Middle section: Form fields - 3/5 width (60%) */}
            <div
              className={`flex min-h-0 w-full flex-1 flex-col space-y-3 overflow-y-auto p-3 md:w-3/5 md:p-4 ${isMobile && !selectedMachineId && collectedMachineEntries.length === 0 ? 'hidden md:flex' : 'flex'}`}
            >
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
                    isLoadingTime={isLoadingTime}
                    isWow={isWowMachine(machineForDataEntry)}
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
                    isMiddleReportWarning={isMiddleReportWarning}
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
                        if (!currentRamClearMetersIn)
                          setCurrentRamClearMetersIn(prevIn);
                        if (!currentRamClearMetersOut)
                          setCurrentRamClearMetersOut(prevOut);
                      }
                    }}
                    jackpot={jackpot}
                    includeJackpot={includeJackpot}
                    onPrevInChange={setPrevIn}
                    onPrevOutChange={setPrevOut}
                    onDisabledFieldClick={handleDisabledFieldClick}
                    onAddEntry={handleAddEntry}
                    onCancelEdit={handleCancelEdit}
                    onAddOrUpdateEntry={handleAddOrUpdateEntry}
                    onViewMachine={() => setShowViewMachineConfirmation(true)}
                    machineIsOnline={
                      machineForDataEntry
                        ? machineStatusMap[String(machineForDataEntry._id)]
                        : undefined
                    }
                    machineHasRelay={!!machineForDataEntry?.relayId}
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
                            <p className="text-[9px] font-bold uppercase text-gray-500">
                              Target
                            </p>
                            <p className="text-sm font-black text-gray-900">
                              ${financials.amountToCollect || '0.00'}
                            </p>
                          </div>
                          <div className="space-y-0.5 border-r border-blue-100 pl-2">
                            <p className="text-[9px] font-bold uppercase text-gray-400">
                              Actual
                            </p>
                            <p className="text-sm font-black text-blue-600">
                              ${financials.collectedAmount || '0.00'}
                            </p>
                          </div>
                          <div className="space-y-0.5 pl-2">
                            <p className="text-[9px] font-bold uppercase text-gray-400">
                              Opening Balance
                            </p>
                            <p
                              className={`text-sm font-black ${Number(financials.previousBalance) < 0 ? 'text-red-600' : 'text-green-600'}`}
                            >
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
                    onFinancialsChange={updates => setFinancials(updates)}
                    onBaseBalanceCorrectionChange={setBaseBalanceCorrection}
                    onCollectedAmountChange={value => {
                      setFinancials({
                        collectedAmount: value,
                      });
                    }}
                  />

                  {/* Reconciliation Guide Note - PC Only version */}
                  <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-900">
                      <Info className="h-3 w-3" />
                      Reconciliation Guide:
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded border border-blue-50 bg-white/60 p-2.5">
                        <p className="mb-1 text-[9px] font-bold uppercase text-blue-600">
                          Target
                        </p>
                        <p className="text-pretty text-[10px] leading-relaxed text-gray-600">
                          Based on machines, profit share, plus Opening
                          Balance/Correction.
                        </p>
                      </div>
                      <div className="rounded border border-blue-50 bg-white/60 p-2.5">
                        <p className="mb-1 text-[9px] font-bold uppercase text-blue-600">
                          Collected
                        </p>
                        <p className="text-pretty text-[10px] leading-relaxed text-gray-600">
                          The physical cash retrieved. This field unlocks after
                          setting Correction.
                        </p>
                      </div>
                      <div className="rounded border border-blue-50 bg-white/60 p-2.5">
                        <p className="mb-1 text-[9px] font-bold uppercase text-blue-600">
                          Carryover
                        </p>
                        <p className="text-pretty text-[10px] leading-relaxed text-gray-600">
                          Collected minus Target. This value starts the next
                          collection cycle.
                        </p>
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
            <div
              className={`flex min-h-0 w-full flex-shrink-0 flex-col border-l border-gray-200 md:w-1/5 ${isMobile && collectedMachineEntries.length === 0 ? 'hidden md:flex' : 'flex'}`}
            >
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
                sasUpdateProgress={sasUpdateProgress}
                variationMachineIds={variationsData?.machines
                  .filter(
                    machine => machine.variation !== null && machine.variation !== 0
                  )
                  .map(machine => machine.machineId)}
                includeJackpotMap={useMemo(() => {
                  const map: Record<string, boolean> = {};
                  machinesOfSelectedLocation.forEach(machine => {
                    map[String(machine._id)] = machine.includeJackpot ?? false;
                  });
                  return map;
                }, [machinesOfSelectedLocation])}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onDeleteSelected={() => setShowBulkDeleteConfirmation(true)}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-center border-t border-gray-300 p-4 pt-2 md:p-6 md:pt-4">
            <Button
              onClick={handleDesktopCreateSubmit}
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

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showBulkDeleteConfirmation}
        onClose={() => { if (!isBulkDeleting) setShowBulkDeleteConfirmation(false); }}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.length} Machine(s)`}
        message={`Are you sure you want to delete ${selectedIds.length} collection entries? Each machine's meters will be reverted to their previous values.`}
        confirmText={`Yes, Delete ${selectedIds.length}`}
        cancelText="Cancel"
        isLoading={isProcessing || isBulkDeleting}
        confirmButtonVariant="destructive"
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
          resolvedCollectionTime
            ? formatDate(resolvedCollectionTime)
            : 'Not set'
        }. Do you want to proceed?`}
        confirmText="Yes, Create Report"
        cancelText="Cancel"
        isLoading={isProcessing}
        progress={createReportProgress ?? undefined}
        processingPhases={createPhases}
        currentServerPhase={currentCreatePhase}
        subStep={currentSubStep}
      />
      {/* Variation Check Panel — streaming per-machine check (matches detail page) */}
      <VariationCheckPanel
        isOpen={showVariationCheckPopover}
        status={variationStatus}
        done={checkDone}
        total={checkTotal}
        currentMachineName={currentMachineName}
        result={variationResult}
        error={variationError}
        onConfirm={() => {
          setShowVariationCheckPopover(false);
          const hasSmibMachines =
            (variationsData?.machines.filter(m => m.variation !== null) || [])
              .length > 0;
          if (!hasSmibMachines || !hasVariations) {
            setShowCreateReportConfirmation(true);
          } else {
            setShowVariationsConfirmation(true);
          }
        }}
        onCancel={() => {
          cancelVariationCheck();
          setShowVariationCheckPopover(false);
        }}
        onRetry={() => {
          const args = lastCheckArgsRef.current;
          if (args) runVariationCheck(args.locationId, args.machines);
        }}
      />

      {/* Variations Confirmation Dialog (submit with variations) */}
      <VariationsConfirmationDialog
        isOpen={showVariationsConfirmation}
        machineCount={
          variationsData?.machines.filter(
            m => m.variation !== null && m.variation !== 0
          ).length || 0
        }
        totalVariation={variationsData?.totalVariation || 0}
        isLoading={isProcessing}
        onConfirm={async () => {
          // Keep the dialog open so the ProcessingPhaseBar is visible,
          // then close it once creation finishes.
          await confirmCreateReports(variationsData);
          setShowVariationsConfirmation(false);
        }}
        onCancel={() => {
          setShowVariationsConfirmation(false);
        }}
        progress={createReportProgress ?? undefined}
        processingPhases={createPhases}
        currentServerPhase={currentCreatePhase}
        subStep={currentSubStep}
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
