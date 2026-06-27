/**
 * CollectionReportEditCollectionModal Component (Unified)
 *
 * Master entry point for editing collection reports.
 * Automatically switches between Mobile and Desktop layouts based on screen size.
 *
 * Features:
 * - Unified responsive orchestration (Desktop vs Mobile layouts)
 * - Comprehensive state management via useCollectionReportEditModalData hook
 * - Safe-close logic (blocks close while machine edit is active)
 * - Batch SAS time updates
 * - Variation check integration with popover feedback
 * - Deep validation for physical vs digital reconciliations
 *
 * @param show - Whether the modal is visible
 * @param onClose - Callback to close the modal
 * @param reportId - ID of the collection report to edit
 * @param locations - List of available locations with their associated machines
 * @param onRefresh - Callback to refresh the main reports data
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { useEditCollectionModal } from '@/lib/hooks/collectionReport/useEditCollectionModal';
import { deleteMachineCollectionBatch } from '@/lib/helpers/collectionReport/editCollectionModalHelpers';
import {
  useMobileEditCollectionModal,
  type MobileModalState,
} from '@/lib/hooks/collectionReport/useMobileEditCollectionModal';
import {
  useVariationStreamCheck,
  type VariationCheckMachine,
} from '@/lib/hooks/collectionReport/useVariationStreamCheck';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { useWowAutoReport } from '@/lib/hooks/collectionReport/useWowAutoReport';
import { persistWowCollection } from '@/lib/helpers/collectionReport/wowAutoReportPersist';
import { useUserStore } from '@/lib/store/userStore';
import { isWowMachine } from '@/shared/utils/wowMachine';
import { VariationsConfirmationDialog } from '@/components/CMS/collectionReport/variations/VariationsConfirmationDialog';
import { VariationCheckPanel } from '@/components/CMS/collectionReport/variations/VariationCheckPanel';
import { ConfirmationDialog } from '@/components/shared/ui/ConfirmationDialog';
import { InfoConfirmationDialog } from '@/components/shared/ui/InfoConfirmationDialog';
import { ProcessingPhaseBar } from '@/components/shared/ui/ProcessingPhaseBar';
import type { ProcessingPhase } from '@/components/shared/ui/ProcessingPhaseBar';
import { MobileCollectionModalSkeleton } from '@/components/shared/ui/skeletons/MobileCollectionModalSkeleton';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useMachineOnlineStatus } from '@/lib/hooks/useMachineOnlineStatus';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type {
  CollectionReportLocationWithMachines,
  MachineVariationData,
} from '@/lib/types/api';

// Layouts
import DesktopEditLayout from './edit/DesktopEditLayout';
import MobileEditLayout from './edit/MobileEditLayout';

// Shape the edit submit/effect handlers build for the variation check.
type EditCheckMachine = {
  machineId: string;
  machineName?: string;
  metersIn?: number;
  metersOut?: number;
  prevMetersIn?: number;
  prevMetersOut?: number;
  movementGross?: number;
  storedSasGross?: number;
  sasStartTime?: string | Date | null;
  sasEndTime?: string | Date | null;
};

function toEditVCM(machines: EditCheckMachine[]): VariationCheckMachine[] {
  return machines.map(machine => ({
    machineId: machine.machineId,
    machineName: machine.machineName,
    metersIn: machine.metersIn ?? 0,
    metersOut: machine.metersOut ?? 0,
    prevIn: machine.prevMetersIn ?? 0,
    prevOut: machine.prevMetersOut ?? 0,
    movementGross: machine.movementGross,
    sasStartTime: machine.sasStartTime
      ? new Date(machine.sasStartTime).toISOString()
      : undefined,
    sasEndTime: machine.sasEndTime
      ? new Date(machine.sasEndTime).toISOString()
      : undefined,
  }));
}

/**
 * Adapter exposing the streaming variation check via the legacy-shaped API the edit
 * modal already consumes (checkVariations / variationsData / isChecking / …) plus the
 * fields the new VariationCheckPanel needs. `preCreateThenCheck` no longer pre-creates
 * meters — finalization handles that — it just runs the check.
 */
function useEditVariationAdapter() {
  const stream = useVariationStreamCheck();
  return {
    status: stream.status,
    done: stream.done,
    total: stream.total,
    currentMachineName: stream.currentMachineName,
    variationsData: stream.result,
    error: stream.error,
    isChecking: stream.status === 'checking',
    checkComplete: stream.status === 'done',
    isMinimized: false,
    hasVariations:
      stream.status === 'done' ? (stream.result?.hasVariations ?? false) : null,
    checkVariations: (locationId: string, machines: EditCheckMachine[]) =>
      stream.run(locationId, toEditVCM(machines)),
    // Extra trailing args (legacy pre-create payloads) are accepted and ignored —
    // finalization creates meters now, so there's no pre-create step.
    preCreateThenCheck: (
      locationId: string,
      machines: EditCheckMachine[],
      ...rest: unknown[]
    ) => {
      void rest;
      return stream.run(locationId, toEditVCM(machines));
    },
    cancel: stream.cancel,
    reset: stream.reset,
    toggleMinimize: () => {},
  };
}

type CollectionReportEditCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
  hasUnsavedEdits?: boolean;
};

// === Wrappers to isolate hook lifecycle ===

type WrapperProps = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
  /** Called whenever the machine-form open/closed state changes */
  onMachineEditingChange?: (editing: boolean) => void;
  /** Called whenever the submission processing state changes */
  onProcessingChange?: (processing: boolean) => void;
  /** True when there are unsaved changes (meter edits) */
  hasUnsavedEdits?: boolean;
  /** Ref to track if there are unsaved edits (set by hooks) */
  unsavedEditsRef?: React.MutableRefObject<boolean>;
  /** Ref to force close the modal (bypass unsaved changes check) */
  forceCloseRef?: React.MutableRefObject<boolean>;
};

function buildEditPhases(machineCount: number): ProcessingPhase[] {
  return [
    { key: 'validating', label: 'Validating report data', estimatedMs: 500 },
    { key: 'saving', label: 'Saving report changes', estimatedMs: 600 },
    {
      key: 'recalculating',
      label: 'Recalculating machine meters',
      estimatedMs: Math.max(800, machineCount * 40),
      detail: `${machineCount} machine${machineCount !== 1 ? 's' : ''}`,
    },
    { key: 'variation', label: 'Calculating variation', estimatedMs: 1000 },
    { key: 'activity', label: 'Recording activity', estimatedMs: 400 },
  ];
}

function DesktopEditWrapper({
  show,
  reportId,
  locations,
  onRefresh,
  onClose,
  onMachineEditingChange,
  onProcessingChange,
  unsavedEditsRef,
  forceCloseRef,
}: WrapperProps) {
  // Wrap onClose to set force close flag before calling (bypasses unsaved changes check)
  const handleCloseWithForce = useCallback(() => {
    forceCloseRef && (forceCloseRef.current = true);
    onClose();
  }, [forceCloseRef, onClose]);

  // ============================================================================
  // State & Hooks
  // ============================================================================
  const desktopHook = useEditCollectionModal({
    show,
    reportId,
    locations,
    onRefresh,
    onClose: handleCloseWithForce,
  });

  useEffect(() => {
    onProcessingChange?.(desktopHook.isProcessing);
  }, [desktopHook.isProcessing, onProcessingChange]);

  const editPhases = useMemo(
    () => buildEditPhases(desktopHook.collectedMachineEntries.length),
    [desktopHook.collectedMachineEntries.length]
  );

  // Lightweight highlight of the machine the WOW Auto Report is currently processing
  // (kept separate from selectedMachineId so it does NOT render the heavy form panel).
  const [desktopAutoHighlightId, setDesktopAutoHighlightId] = useState<
    string | null
  >(null);

  // Online/offline status for machines in the edit modal (Desktop)
  const desktopMachineIds = desktopHook.collectedMachineEntries.map(entry =>
    String(entry.machineId)
  );
  const desktopMachineStatusMap = useMachineOnlineStatus(desktopMachineIds);

  const variation = useEditVariationAdapter();
  const lastDesktopPreCreateRef = useRef<unknown[]>([]);
  const lastDesktopMachinesForCheckRef = useRef<EditCheckMachine[]>([]);

  const resetCollectionModalStore = useCollectionModalStore(
    state => state.resetState
  );
  // Atomic append to the shared store — used by WOW Auto Report to add each machine to the
  // collected list as it is scanned (avoids stale-state batching).
  const addCollectedMachineToStore = useCollectionModalStore(
    state => state.addCollectedMachine
  );
  const [variationsCollapsibleExpanded, setVariationsCollapsibleExpanded] =
    useState(false);
  const [showVariationPopover, setShowVariationPopover] = useState(false);
  const [showVariationsConfirmation, setShowVariationsConfirmation] =
    useState(false);
  const [showUpdateReportConfirmation, setShowUpdateReportConfirmation] =
    useState(false);

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

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await deleteMachineCollectionBatch(selectedIds);
      const updatedEntries = desktopHook.collectedMachineEntries.filter(
        entry => !selectedIds.includes(String(entry._id))
      );
      const updatedOriginals = desktopHook.originalCollections.filter(
        entry => !selectedIds.includes(String(entry._id))
      );
      desktopHook.setCollectedMachineEntries(updatedEntries);
      desktopHook.setOriginalCollections(updatedOriginals);
      desktopHook.setHasChanges(true);
      setSelectedIds([]);
      setShowBulkDeleteConfirmation(false);
      toast.success(`${selectedIds.length} machine(s) deleted successfully`);
    } catch (error) {
      console.error(
        '[BulkDelete] Error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      toast.error('Failed to delete some machines. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [
    selectedIds,
    desktopHook.collectedMachineEntries,
    desktopHook.originalCollections,
    desktopHook.setCollectedMachineEntries,
    desktopHook.setOriginalCollections,
    desktopHook.setHasChanges,
  ]);

  // ============================================================================
  // Effects
  // ============================================================================
  // Clear shared collection-modal store whenever this edit modal closes,
  // so opening the create/new collection modal afterwards starts with a clean slate.
  useEffect(() => {
    if (!show) {
      resetCollectionModalStore();
    }
  }, [show, resetCollectionModalStore]);

  // Sync desktop hook's hasUnsavedEdits up to parent via ref
  useEffect(() => {
    unsavedEditsRef && (unsavedEditsRef.current = desktopHook.hasUnsavedEdits);
  }, [desktopHook.hasUnsavedEdits, unsavedEditsRef]);

  // Notify outer component when a machine form opens/closes
  useEffect(() => {
    onMachineEditingChange?.(!!desktopHook.editingEntryId);
  }, [desktopHook.editingEntryId, onMachineEditingChange]);

  // Reset variation check when modal closes
  useEffect(() => {
    if (!show) {
      variation.reset();
    }
  }, [show, variation]);

  // Auto-check variations when collections are loaded
  const initialCheckPerformedRef = useRef(false);
  useEffect(() => {
    if (
      show &&
      !desktopHook.isLoadingCollections &&
      desktopHook.collectedMachineEntries.length > 0 &&
      !initialCheckPerformedRef.current
    ) {
      initialCheckPerformedRef.current = true;

      const runAutoCheck = async () => {
        // Pass storedSasGross from each collection's sasMeters.gross.
        // This lets the check-variations route use the stored value instead of
        // re-querying live Meters, which correctly handles offline SMIB machines
        // (where pre-offline SAS meters would otherwise double-count with the
        // supplemental meter and produce phantom variation).
        const machinesForCheck = desktopHook.collectedMachineEntries
          .filter(
            entry =>
              entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime
          )
          .map(entry => {
            const isOffline =
              entry.machineId &&
              desktopMachineStatusMap[entry.machineId] === false;
            return {
              machineId: entry.machineId,
              machineName:
                entry.machineCustomName ||
                entry.machineName ||
                entry.serialNumber ||
                entry.machineId,
              metersIn: entry.metersIn || 0,
              metersOut: entry.metersOut || 0,
              sasStartTime: entry.sasMeters?.sasStartTime ?? undefined,
              sasEndTime: entry.sasMeters?.sasEndTime ?? undefined,
              prevMetersIn: entry.prevIn || 0,
              prevMetersOut: entry.prevOut || 0,
              movementGross: entry.movement.gross,
              storedSasGross: isOffline ? entry.movement.gross : undefined,
            };
          });

        variation.checkVariations(
          desktopHook.selectedLocationId ?? '',
          machinesForCheck
        );
      };
      runAutoCheck();
    }
    if (!show) {
      initialCheckPerformedRef.current = false;
    }
  }, [
    show,
    desktopHook.isLoadingCollections,
    desktopHook.collectedMachineEntries.length,
    desktopHook.selectedLocationId,
  ]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleDesktopSubmit = async () => {
    try {
      if (desktopHook.editingEntryId) {
        toast.warning('Save or cancel your current machine edit first.');
        return;
      }
      if (
        desktopHook.collectedMachineEntries.length === 0 ||
        desktopHook.isProcessing
      )
        return;

      const locationId =
        desktopHook.selectedLocationId ||
        desktopHook.collectedMachineEntries[0]?.location ||
        '';

      setShowVariationPopover(true);

      // ── Build pre-create payloads (updates supplemental meters for offline/previously-offline machines) ──
      const desktopPreCreate = desktopHook.collectedMachineEntries.map(
        entry => ({
          machineId: entry.machineId,
          collectionId: String(entry._id),
          locationId,
          metersIn: entry.metersIn || 0,
          metersOut: entry.metersOut || 0,
          prevMetersIn: entry.prevIn || 0,
          prevMetersOut: entry.prevOut || 0,
          sasEndTime: entry.sasMeters?.sasEndTime,
          customName:
            entry.machineCustomName ||
            entry.machineName ||
            entry.serialNumber ||
            entry.machineId,
          ramClear: entry.ramClear,
          ramClearMetersIn:
            entry.ramClearMetersIn != null
              ? Number(entry.ramClearMetersIn)
              : undefined,
          ramClearMetersOut:
            entry.ramClearMetersOut != null
              ? Number(entry.ramClearMetersOut)
              : undefined,
        })
      );

      // ── Build variation-check machines ──
      // IMPORTANT: check-variations filters out meterSource='COLLECTION_REPORT' from its
      // live Meters query, so it can NEVER see the supplemental meter.
      // For offline SMIB machines: pass storedSasGross computed from current edited inputs.
      // For online machines: no storedSasGross — the backend queries live meters.
      const machinesForCheck = desktopHook.collectedMachineEntries
        .filter(
          entry => entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime
        )
        .map(entry => {
          const currentlyOffline =
            entry.machineId &&
            desktopMachineStatusMap[entry.machineId] === false;
          const useStoredSasGross = currentlyOffline;
          const movementGross = (entry as { movement?: { gross?: number } })
            .movement?.gross;
          // Compute fresh movement from current inputs for offline SMIB machines
          // (reflects edits, unlike entry.movement.gross)
          const freshMovementGross = useStoredSasGross
            ? (entry.metersIn || 0) -
              (entry.prevIn || 0) -
              ((entry.metersOut || 0) - (entry.prevOut || 0))
            : movementGross;

          console.log(
            `[handleDesktopSubmit] 🔎 machine=${entry.machineId} ` +
              `currentlyOffline=${currentlyOffline} useStoredSasGross=${useStoredSasGross} ` +
              `movementGross=${movementGross} ` +
              `freshMovementGross=${freshMovementGross} ` +
              `metersIn=${entry.metersIn} prevIn=${entry.prevIn} metersOut=${entry.metersOut} prevOut=${entry.prevOut} ` +
              `sasMeters.gross=${entry.sasMeters?.gross} meterId=${entry.meterId ?? 'none'} ` +
              `statusMapValue=${desktopMachineStatusMap[entry.machineId]}`
          );

          return {
            machineId: entry.machineId,
            machineName:
              entry.machineCustomName ||
              entry.machineName ||
              entry.serialNumber ||
              entry.machineId,
            metersIn: entry.metersIn || 0,
            metersOut: entry.metersOut || 0,
            sasStartTime: entry.sasMeters?.sasStartTime ?? undefined,
            sasEndTime: entry.sasMeters?.sasEndTime ?? undefined,
            prevMetersIn: entry.prevIn || 0,
            prevMetersOut: entry.prevOut || 0,
            movementGross: freshMovementGross,
            storedSasGross: useStoredSasGross
              ? (freshMovementGross ?? 0)
              : undefined,
          };
        });

      console.log(
        `[handleDesktopSubmit] 📤 preCreateThenCheck locationId=${locationId} ` +
          `preCreate=${desktopPreCreate.length} variationMachines=${machinesForCheck.length}`,
        machinesForCheck.map(m => ({
          id: m.machineId,
          storedSasGross: m.storedSasGross,
          movementGross: m.movementGross,
          metersIn: m.metersIn,
          prevMetersIn: m.prevMetersIn,
        }))
      );

      lastDesktopPreCreateRef.current = desktopPreCreate;
      lastDesktopMachinesForCheckRef.current = machinesForCheck;
      variation.preCreateThenCheck(
        locationId,
        machinesForCheck,
        desktopPreCreate
      );
    } catch (e) {
      console.error(
        '[handleDesktopSubmit] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      toast.error('Failed to submit. Please try again.');
    }
  };

  // ============================================================================
  // WOW Auto Report (developer-only, all-WOW locations)
  // ============================================================================
  const isDeveloper = (desktopHook.user?.roles ?? []).includes('developer');
  const isAllWowLocation =
    desktopHook.machinesOfSelectedLocation.length > 0 &&
    desktopHook.machinesOfSelectedLocation.every(machine =>
      isWowMachine(machine)
    );
  const uncollectedWowMachines = desktopHook.machinesOfSelectedLocation
    .filter(
      machine =>
        !desktopHook.collectedMachineEntries.some(
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

  const selectedLoc = useMemo(() => {
    return locations.find(
      l => String(l._id) === desktopHook.selectedLocationId
    );
  }, [locations, desktopHook.selectedLocationId]);

  const desktopWowStartTimeIso = useMemo(() => {
    if (!isAllWowLocation) return undefined;
    const times = desktopHook.machinesOfSelectedLocation
      .map(m =>
        m.collectionTime
          ? new Date(m.collectionTime as string | Date).getTime()
          : null
      )
      .filter((t): t is number => t !== null);
    if (times.length > 0) {
      return new Date(Math.min(...times)).toISOString();
    }
    if (selectedLoc?.previousCollectionTime) {
      return new Date(selectedLoc.previousCollectionTime).toISOString();
    }
    const collectionTimeDate =
      desktopHook.currentCollectionTime instanceof Date
        ? desktopHook.currentCollectionTime
        : new Date();
    return new Date(
      collectionTimeDate.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();
  }, [
    isAllWowLocation,
    desktopHook.machinesOfSelectedLocation,
    selectedLoc,
    desktopHook.currentCollectionTime,
  ]);

  const autoReport = useWowAutoReport({
    enabled: isDeveloper && isAllWowLocation,
    machines: uncollectedWowMachines,
    startOffset: desktopHook.collectedMachineEntries.length,
    startTimeIso: desktopWowStartTimeIso,
    onHighlight: setDesktopAutoHighlightId,
    persist: (machine, meters, ctx) => {
      const machineDoc = desktopHook.machinesOfSelectedLocation.find(
        m => String(m._id) === machine.id
      );
      return persistWowCollection(machine, meters, {
        locationId: desktopHook.selectedLocationId || '',
        locationReportId: reportId,
        collector: desktopHook.userId || '',
        collectionTime: ctx?.collectionTime,
        useMeterTimes: ctx?.useMeterTimes,
        machineName: machineDoc?.name,
        serialNumber: machineDoc?.serialNumber,
        machineCustomName: machineDoc?.custom?.name,
        previousCollectionTime: selectedLoc?.previousCollectionTime
          ? new Date(selectedLoc.previousCollectionTime)
          : undefined,
        gameDayOffset:
          ctx?.gameDayOffset !== undefined
            ? ctx.gameDayOffset
            : selectedLoc?.gameDayOffset,
      });
    },
    commit: entry => {
      addCollectedMachineToStore(entry);
      desktopHook.setHasChanges(true);
    },
    openSubmit: handleDesktopSubmit,
  });

  // Stop the auto-report run when the modal closes so background fetches don't
  // try to commit or open the submit dialog after unmount.
  const stopDesktopAutoReport = autoReport.stop;
  useEffect(() => {
    if (!show) stopDesktopAutoReport();
  }, [show, stopDesktopAutoReport]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {/* Desktop Header */}
      <DialogHeader className="flex-shrink-0 p-4 pb-0 md:p-6">
        <DialogTitle className="text-xl font-bold md:text-2xl">
          Edit Collection Report
        </DialogTitle>
        <DialogDescription>
          Modify collection data, meters, and financials for this report.
        </DialogDescription>
      </DialogHeader>

      <DesktopEditLayout
        {...desktopHook}
        locations={locations}
        onRefresh={onRefresh}
        isMinimized={variation.isMinimized}
        variationsData={variation.variationsData}
        checkComplete={variation.checkComplete}
        variationsCollapsibleExpanded={variationsCollapsibleExpanded}
        setVariationsCollapsibleExpanded={setVariationsCollapsibleExpanded}
        autoReport={autoReport}
        autoHighlightId={desktopAutoHighlightId}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onDeleteSelected={() => setShowBulkDeleteConfirmation(true)}
      />

      <DialogFooter className="flex flex-shrink-0 flex-col items-center gap-3 border-t border-gray-300 p-4 pt-2 md:p-6 md:pt-4">
        {desktopHook.isProcessing && (
          <div className="w-full max-w-sm">
            <ProcessingPhaseBar
              phases={editPhases}
              isActive={desktopHook.isProcessing}
              color="blue"
              serverPhase={desktopHook.currentEditPhase}
              progress={desktopHook.updateReportProgress ?? undefined}
              subStep={desktopHook.currentSubStep}
            />
          </div>
        )}
        <Button
          onClick={handleDesktopSubmit}
          disabled={
            !desktopHook.isUpdateReportEnabled || desktopHook.isProcessing
          }
          className={`w-auto bg-button px-8 py-3 text-base hover:bg-buttonActive ${
            !desktopHook.isUpdateReportEnabled || desktopHook.isProcessing
              ? 'cursor-not-allowed'
              : 'cursor-pointer'
          }`}
        >
          {desktopHook.isProcessing
            ? 'UPDATING REPORT...'
            : `SUBMIT FINAL REPORT (${desktopHook.collectedMachineEntries.length})`}
        </Button>
      </DialogFooter>

      {/* Variation Dialogs */}
      <VariationCheckPanel
        isOpen={showVariationPopover}
        status={variation.status}
        done={variation.done}
        total={variation.total}
        currentMachineName={variation.currentMachineName}
        result={variation.variationsData}
        error={variation.error}
        onConfirm={() => {
          setShowVariationPopover(false);
          const machinesWithSmib =
            variation.variationsData?.machines.filter(
              m => m.variation !== null
            ) || [];
          if (machinesWithSmib.length === 0 || !variation.hasVariations) {
            desktopHook.handleUpdateReport(
              variation.variationsData || undefined
            );
          } else {
            setShowVariationsConfirmation(true);
          }
        }}
        onCancel={() => {
          variation.cancel();
          setShowVariationPopover(false);
        }}
        onRetry={() => {
          const locationId =
            desktopHook.selectedLocationId ||
            desktopHook.collectedMachineEntries[0]?.location ||
            '';
          variation.checkVariations(
            locationId,
            lastDesktopMachinesForCheckRef.current
          );
        }}
      />

      <VariationsConfirmationDialog
        isOpen={showVariationsConfirmation}
        machineCount={
          variation.variationsData?.machines.filter(
            (m: MachineVariationData) => m.variation !== null
          ).length || 0
        }
        totalVariation={variation.variationsData?.totalVariation || 0}
        isLoading={desktopHook.isProcessing}
        onConfirm={async () => {
          await desktopHook.handleUpdateReport(
            variation.variationsData || undefined
          );
          setShowVariationsConfirmation(false);
        }}
        onCancel={() => setShowVariationsConfirmation(false)}
        progress={desktopHook.updateReportProgress ?? undefined}
        processingPhases={editPhases}
        currentServerPhase={desktopHook.currentEditPhase}
        subStep={desktopHook.currentSubStep}
      />

      {/* Update Report Confirmation Dialog (no-SMIB locations skip variation flow) */}
      <InfoConfirmationDialog
        isOpen={showUpdateReportConfirmation}
        onClose={() => setShowUpdateReportConfirmation(false)}
        onConfirm={() => {
          desktopHook.handleUpdateReport(undefined);
          setShowUpdateReportConfirmation(false);
        }}
        title="Confirm Update Report"
        message={`Are you sure you want to update this collection report for ${desktopHook.collectedMachineEntries.length} machine(s)?`}
        confirmText="Yes, Update Report"
        cancelText="Cancel"
        isLoading={desktopHook.isProcessing}
        processingPhases={editPhases}
        currentServerPhase={desktopHook.currentEditPhase}
        progress={desktopHook.updateReportProgress ?? undefined}
        subStep={desktopHook.currentSubStep}
      />

      {/* Shared Dialogs (Desktop side) */}
      <InfoConfirmationDialog
        isOpen={desktopHook.showViewMachineConfirmation}
        onClose={() => desktopHook.setShowViewMachineConfirmation(false)}
        onConfirm={() => {
          const id = desktopHook.selectedMachineId;
          if (id) window.open(`/cabinets/${id}`, '_blank');
          desktopHook.setShowViewMachineConfirmation(false);
        }}
        title="View Machine"
        message="Do you want to open this machine's details in a new tab?"
        confirmText="Yes, View Machine"
        cancelText="Cancel"
        isLoading={false}
      />

      {/* Machine Rollover/Ramclear Warning */}
      <InfoConfirmationDialog
        isOpen={desktopHook.showMachineRolloverWarning}
        onClose={desktopHook.handleCancelMachineRollover}
        onConfirm={desktopHook.handleConfirmMachineRollover}
        title="Rollover/Ramclear Warning"
        message="This machine has a meters value less than its previous value. This typically indicates a rollover or RAM clear situation. Are you sure you want to update this machine?"
        confirmText="Yes, Update Machine"
        cancelText="Cancel"
        isLoading={false}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={desktopHook.showDeleteConfirmation}
        onClose={() => desktopHook.setShowDeleteConfirmation(false)}
        onConfirm={desktopHook.confirmDeleteEntry}
        title="Confirm Delete"
        message="Are you sure you want to delete this collection entry from the report? The machine's meters will be reverted to their previous values."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={desktopHook.isProcessing}
        confirmButtonVariant="destructive"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showBulkDeleteConfirmation}
        onClose={() => {
          if (!isBulkDeleting) setShowBulkDeleteConfirmation(false);
        }}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.length} Machine(s)`}
        message={`Are you sure you want to delete ${selectedIds.length} collection entries? Each machine's meters will be reverted to their previous values.`}
        confirmText={`Yes, Delete ${selectedIds.length}`}
        cancelText="Cancel"
        isLoading={desktopHook.isProcessing || isBulkDeleting}
        confirmButtonVariant="destructive"
      />
    </>
  );
}

function MobileEditWrapper({
  show,
  reportId,
  locations,
  onRefresh,
  onClose,
  onMachineEditingChange,
  onProcessingChange,
  unsavedEditsRef,
  forceCloseRef,
}: WrapperProps) {
  // Wrap onClose to set force close flag before calling (bypasses unsaved changes check)
  const handleCloseWithForce = useCallback(() => {
    forceCloseRef && (forceCloseRef.current = true);
    onClose();
  }, [forceCloseRef, onClose]);

  // ============================================================================
  // State & Hooks
  // ============================================================================
  const mobileHook = useMobileEditCollectionModal({
    show,
    reportId,
    locations,
    onRefresh,
    onClose: handleCloseWithForce,
  });

  useEffect(() => {
    onProcessingChange?.(mobileHook.modalState.isProcessing);
  }, [mobileHook.modalState.isProcessing, onProcessingChange]);

  const mobileEditPhases = useMemo(
    () => buildEditPhases(mobileHook.collectedMachines.length),
    [mobileHook.collectedMachines.length]
  );

  // WOW Auto Report support: highlight state + atomic store append for per-item commit.
  const [mobileAutoHighlightId, setMobileAutoHighlightId] = useState<
    string | null
  >(null);
  const addMobileCollectedMachine = useCollectionModalStore(
    state => state.addCollectedMachine
  );

  // Online/offline status for machines in the edit modal
  const editMobileIds = mobileHook.availableMachines.map(machine =>
    String(machine._id)
  );
  const editMachineStatusMap = useMachineOnlineStatus(editMobileIds);

  // ============================================================================
  // Effects
  // ============================================================================
  // Sync mobile hook's hasUnsavedEdits up to parent via ref
  useEffect(() => {
    unsavedEditsRef &&
      (unsavedEditsRef.current = mobileHook.modalState.hasUnsavedEdits);
  }, [mobileHook.modalState.hasUnsavedEdits, unsavedEditsRef]);
  const variation = useEditVariationAdapter();
  const lastMobilePreCreateRef = useRef<unknown[]>([]);
  const lastMobileMachinesForCheckRef = useRef<EditCheckMachine[]>([]);

  const resetCollectionModalStore = useCollectionModalStore(
    state => state.resetState
  );
  const [showVariationPopover, setShowVariationPopover] = useState(false);
  const [showVariationsConfirmation, setShowVariationsConfirmation] =
    useState(false);
  const [showUpdateReportConfirmation, setShowUpdateReportConfirmation] =
    useState(false);

  // ============================================================================
  // Selection State (Bulk Delete - Mobile)
  // ============================================================================
  const [mobileSelectedIds, setMobileSelectedIds] = useState<string[]>([]);
  const [
    showMobileBulkDeleteConfirmation,
    setShowMobileBulkDeleteConfirmation,
  ] = useState(false);
  const [isMobileBulkDeleting, setIsMobileBulkDeleting] = useState(false);

  const handleMobileToggleSelect = useCallback((id: string) => {
    setMobileSelectedIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  }, []);

  const handleMobileBulkDelete = useCallback(async () => {
    if (mobileSelectedIds.length === 0) return;
    setIsMobileBulkDeleting(true);
    try {
      await deleteMachineCollectionBatch(mobileSelectedIds);
      setMobileSelectedIds([]);
      setShowMobileBulkDeleteConfirmation(false);
      mobileHook.setModalState((prev: MobileModalState) => {
        const newCollectedMachines = prev.collectedMachines.filter(
          entry => !mobileSelectedIds.includes(String(entry._id))
        );
        return {
          ...prev,
          collectedMachines: newCollectedMachines,
          originalCollections: prev.originalCollections.filter(
            entry => !mobileSelectedIds.includes(String(entry._id))
          ),
          lockedLocationId:
            newCollectedMachines.length === 0
              ? undefined
              : prev.lockedLocationId,
        };
      });
      toast.success(
        `${mobileSelectedIds.length} machine(s) deleted successfully`
      );
    } catch (error) {
      console.error(
        '[MobileBulkDelete] Error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      toast.error('Failed to delete some machines. Please try again.');
    } finally {
      setIsMobileBulkDeleting(false);
    }
  }, [mobileSelectedIds, mobileHook.setModalState]);

  // Clear shared collection-modal store whenever this edit modal closes,
  // so opening the create/new collection modal afterwards starts with a clean slate.
  useEffect(() => {
    if (!show) {
      resetCollectionModalStore();
    }
  }, [show, resetCollectionModalStore]);

  // Notify outer component when a machine form opens/closes
  useEffect(() => {
    onMachineEditingChange?.(!!mobileHook.modalState.editingEntryId);
  }, [mobileHook.modalState.editingEntryId, onMachineEditingChange]);

  // Reset variation check when modal closes
  useEffect(() => {
    if (!show) {
      variation.reset();
    }
  }, [show, variation]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleMobileSubmit = async () => {
    try {
      if (mobileHook.modalState.editingEntryId) {
        toast.warning('Save or cancel your current machine edit first.');
        return;
      }
      if (
        mobileHook.collectedMachines.length === 0 ||
        mobileHook.modalState.isProcessing
      )
        return;

      const locationId =
        mobileHook.lockedLocationId || mobileHook.selectedLocationId || '';

      setShowVariationPopover(true);

      // ── Build pre-create payloads ──
      const mobilePreCreate = mobileHook.collectedMachines.map(entry => ({
        machineId: entry.machineId,
        collectionId: String(entry._id),
        locationId,
        metersIn: entry.metersIn || 0,
        metersOut: entry.metersOut || 0,
        prevMetersIn: entry.prevIn || 0,
        prevMetersOut: entry.prevOut || 0,
        sasEndTime: entry.sasMeters?.sasEndTime,
        customName:
          entry.machineCustomName ||
          entry.machineName ||
          entry.serialNumber ||
          entry.machineId,
        ramClear: entry.ramClear,
        ramClearMetersIn:
          entry.ramClearMetersIn != null
            ? Number(entry.ramClearMetersIn)
            : undefined,
        ramClearMetersOut:
          entry.ramClearMetersOut != null
            ? Number(entry.ramClearMetersOut)
            : undefined,
      }));

      // ── Build variation-check machines ──
      // IMPORTANT: check-variations filters out meterSource='COLLECTION_REPORT' from its
      // live Meters query, so the supplemental meter is never visible via live query.
      // Offline SMIB machines: pass storedSasGross from current edited inputs.
      // Online machines: no storedSasGross — the backend queries live meters.
      const machinesForCheck = mobileHook.collectedMachines
        .filter(
          entry => entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime
        )
        .map(entry => {
          const currentlyOffline =
            entry.machineId && editMachineStatusMap[entry.machineId] === false;
          const useStoredSasGross = currentlyOffline;
          const movementGross = (entry as { movement?: { gross?: number } })
            .movement?.gross;
          const freshMovementGross = useStoredSasGross
            ? (entry.metersIn || 0) -
              (entry.prevIn || 0) -
              ((entry.metersOut || 0) - (entry.prevOut || 0))
            : movementGross;

          console.log(
            `[handleMobileSubmit] 🔎 machine=${entry.machineId} ` +
              `currentlyOffline=${currentlyOffline} useStoredSasGross=${useStoredSasGross} ` +
              `movementGross=${movementGross} ` +
              `freshMovementGross=${freshMovementGross} ` +
              `metersIn=${entry.metersIn} prevIn=${entry.prevIn} metersOut=${entry.metersOut} prevOut=${entry.prevOut} ` +
              `sasMeters.gross=${entry.sasMeters?.gross} meterId=${entry.meterId ?? 'none'} ` +
              `statusMapValue=${editMachineStatusMap[entry.machineId]}`
          );

          return {
            machineId: entry.machineId,
            machineName:
              entry.machineCustomName ||
              entry.machineName ||
              entry.serialNumber ||
              entry.machineId,
            metersIn: entry.metersIn || 0,
            metersOut: entry.metersOut || 0,
            sasStartTime: entry.sasMeters?.sasStartTime ?? undefined,
            sasEndTime: entry.sasMeters?.sasEndTime ?? undefined,
            prevMetersIn: entry.prevIn || 0,
            prevMetersOut: entry.prevOut || 0,
            movementGross: freshMovementGross,
            storedSasGross: useStoredSasGross
              ? (freshMovementGross ?? 0)
              : undefined,
          };
        });

      console.log(
        `[handleMobileSubmit] 📤 preCreateThenCheck locationId=${locationId} ` +
          `preCreate=${mobilePreCreate.length} variationMachines=${machinesForCheck.length}`,
        machinesForCheck.map(m => ({
          id: m.machineId,
          storedSasGross: m.storedSasGross,
          movementGross: m.movementGross,
          metersIn: m.metersIn,
          prevMetersIn: m.prevMetersIn,
        }))
      );

      lastMobilePreCreateRef.current = mobilePreCreate;
      lastMobileMachinesForCheckRef.current = machinesForCheck;
      variation.preCreateThenCheck(
        locationId,
        machinesForCheck,
        mobilePreCreate
      );
    } catch (e) {
      console.error(
        '[handleMobileSubmit] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      toast.error('Failed to submit. Please try again.');
    }
  };

  // ============================================================================
  // WOW Auto Report — Mobile (developer-only, all-WOW locations)
  // ============================================================================
  const mobileUser = useUserStore(state => state.user);
  const isMobileDeveloper = (mobileUser?.roles ?? []).includes('developer');
  const isMobileAllWowLocation =
    mobileHook.availableMachines.length > 0 &&
    mobileHook.availableMachines.every(machine => isWowMachine(machine));
  const uncollectedMobileWowMachines = mobileHook.availableMachines
    .filter(
      machine =>
        !mobileHook.collectedMachines.some(
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

  const selectedMobileLoc = useMemo(() => {
    return locations.find(l => String(l._id) === mobileHook.selectedLocationId);
  }, [locations, mobileHook.selectedLocationId]);

  const mobileWowStartTimeIso = useMemo(() => {
    if (!isMobileAllWowLocation) return undefined;
    const times = mobileHook.availableMachines
      .map(m =>
        m.collectionTime
          ? new Date(m.collectionTime as string | Date).getTime()
          : null
      )
      .filter((t): t is number => t !== null);
    if (times.length > 0) {
      return new Date(Math.min(...times)).toISOString();
    }
    if (selectedMobileLoc?.previousCollectionTime) {
      return new Date(selectedMobileLoc.previousCollectionTime).toISOString();
    }
    const collectionTimeDate =
      mobileHook.modalState.formData.collectionTime instanceof Date
        ? mobileHook.modalState.formData.collectionTime
        : new Date();
    return new Date(
      collectionTimeDate.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();
  }, [
    isMobileAllWowLocation,
    mobileHook.availableMachines,
    selectedMobileLoc,
    mobileHook.modalState.formData.collectionTime,
  ]);

  const mobileAutoReport = useWowAutoReport({
    enabled: isMobileDeveloper && isMobileAllWowLocation,
    machines: uncollectedMobileWowMachines,
    startOffset: mobileHook.collectedMachines.length,
    startTimeIso: mobileWowStartTimeIso,
    onHighlight: setMobileAutoHighlightId,
    persist: (machine, meters, ctx) => {
      const machineDoc = mobileHook.availableMachines.find(
        m => String(m._id) === machine.id
      );
      return persistWowCollection(machine, meters, {
        locationId:
          mobileHook.selectedLocationId || mobileHook.lockedLocationId || '',
        locationReportId: reportId,
        collector: mobileUser?._id || '',
        collectionTime: ctx?.collectionTime,
        useMeterTimes: ctx?.useMeterTimes,
        machineName: machineDoc?.name,
        serialNumber: machineDoc?.serialNumber,
        machineCustomName: machineDoc?.custom?.name,
        previousCollectionTime: selectedMobileLoc?.previousCollectionTime
          ? new Date(selectedMobileLoc.previousCollectionTime)
          : undefined,
        gameDayOffset:
          ctx?.gameDayOffset !== undefined
            ? ctx.gameDayOffset
            : selectedMobileLoc?.gameDayOffset,
      });
    },
    commit: entry => {
      addMobileCollectedMachine(entry);
    },
    openSubmit: handleMobileSubmit,
  });

  // Stop the auto-report run when the modal closes.
  const stopMobileAutoReport = mobileAutoReport.stop;
  useEffect(() => {
    if (!show) stopMobileAutoReport();
  }, [show, stopMobileAutoReport]);

  // Auto-check variations when collections are loaded
  const initialCheckPerformedRef = useRef(false);
  useEffect(() => {
    if (
      show &&
      !mobileHook.modalState.isLoadingCollections &&
      mobileHook.collectedMachines.length > 0 &&
      !initialCheckPerformedRef.current
    ) {
      initialCheckPerformedRef.current = true;

      const runAutoCheck = async () => {
        const locationId =
          mobileHook.lockedLocationId || mobileHook.selectedLocationId || '';

        const machinesForCheck = mobileHook.collectedMachines
          .filter(
            entry =>
              entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime
          )
          .map(entry => {
            const isOffline =
              entry.machineId &&
              editMachineStatusMap[entry.machineId] === false;
            return {
              machineId: entry.machineId,
              machineName:
                entry.machineCustomName ||
                entry.machineName ||
                entry.serialNumber ||
                entry.machineId,
              metersIn: entry.metersIn || 0,
              metersOut: entry.metersOut || 0,
              sasStartTime: entry.sasMeters?.sasStartTime ?? undefined,
              sasEndTime: entry.sasMeters?.sasEndTime ?? undefined,
              prevMetersIn: entry.prevIn || 0,
              prevMetersOut: entry.prevOut || 0,
              movementGross: (entry as { movement?: { gross?: number } })
                .movement?.gross,
              storedSasGross: isOffline
                ? ((entry as { movement?: { gross?: number } }).movement
                    ?.gross ?? 0)
                : undefined,
            };
          });

        variation.checkVariations(locationId, machinesForCheck);
      };
      runAutoCheck();
    }
    if (!show) {
      initialCheckPerformedRef.current = false;
    }
  }, [
    show,
    mobileHook.modalState.isLoadingCollections,
    mobileHook.collectedMachines.length,
    mobileHook.lockedLocationId,
    mobileHook.selectedLocationId,
  ]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      {/* Mobile Header */}
      {mobileHook.modalState.navigationStack.length === 0 && (
        <div className="sticky top-0 z-[100] border-b bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              Edit Collection Report
            </h2>
            {!mobileHook.modalState.isProcessing && (
              <DialogClose asChild>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            )}
          </div>
        </div>
      )}

      {mobileHook.modalState.isLoadingMachines ||
      mobileHook.modalState.isLoadingCollections ? (
        <MobileCollectionModalSkeleton />
      ) : (
        <MobileEditLayout
          {...(mobileHook as unknown as Parameters<typeof MobileEditLayout>[0])}
          onClose={onClose}
          handleStartSubmit={handleMobileSubmit}
          variationsData={variation.variationsData}
          hasChanges={mobileHook.hasUnsavedEdits}
          machineStatusMap={editMachineStatusMap}
          autoReport={mobileAutoReport}
          autoHighlightId={mobileAutoHighlightId}
          selectedIds={mobileSelectedIds}
          onToggleSelect={handleMobileToggleSelect}
          onDeleteSelected={() => setShowMobileBulkDeleteConfirmation(true)}
        />
      )}

      {/* Variation Dialogs */}
      <VariationCheckPanel
        isOpen={showVariationPopover}
        status={variation.status}
        done={variation.done}
        total={variation.total}
        currentMachineName={variation.currentMachineName}
        result={variation.variationsData}
        error={variation.error}
        onConfirm={() => {
          setShowVariationPopover(false);
          const machinesWithSmib =
            variation.variationsData?.machines.filter(
              m => m.variation !== null
            ) || [];
          if (machinesWithSmib.length === 0 || !variation.hasVariations) {
            mobileHook.updateCollectionReportHandler(
              variation.variationsData || undefined
            );
          } else {
            setShowVariationsConfirmation(true);
          }
        }}
        onCancel={() => {
          variation.cancel();
          setShowVariationPopover(false);
        }}
        onRetry={() => {
          const locationId =
            mobileHook.lockedLocationId || mobileHook.selectedLocationId || '';
          variation.checkVariations(
            locationId,
            lastMobileMachinesForCheckRef.current
          );
        }}
      />

      <VariationsConfirmationDialog
        isOpen={showVariationsConfirmation}
        machineCount={
          variation.variationsData?.machines.filter(
            (m: MachineVariationData) => m.variation !== null
          ).length || 0
        }
        totalVariation={variation.variationsData?.totalVariation || 0}
        isLoading={mobileHook.modalState.isProcessing}
        onConfirm={async () => {
          await mobileHook.updateCollectionReportHandler(
            variation.variationsData || undefined
          );
          setShowVariationsConfirmation(false);
        }}
        onCancel={() => setShowVariationsConfirmation(false)}
        processingPhases={mobileEditPhases}
        currentServerPhase={mobileHook.currentEditPhase}
        subStep={mobileHook.currentSubStep}
      />

      {/* Update Report Confirmation Dialog (no-SMIB locations skip variation flow) */}
      <InfoConfirmationDialog
        isOpen={showUpdateReportConfirmation}
        onClose={() => setShowUpdateReportConfirmation(false)}
        onConfirm={() => {
          mobileHook.updateCollectionReportHandler(undefined);
          setShowUpdateReportConfirmation(false);
        }}
        title="Confirm Update Report"
        message={`Are you sure you want to update this collection report for ${mobileHook.collectedMachines.length} machine(s)?`}
        confirmText="Yes, Update Report"
        cancelText="Cancel"
        isLoading={mobileHook.modalState.isProcessing}
        processingPhases={mobileEditPhases}
        currentServerPhase={mobileHook.currentEditPhase}
        subStep={mobileHook.currentSubStep}
      />

      {/* Shared Dialogs (Mobile side) */}
      <InfoConfirmationDialog
        isOpen={mobileHook.modalState.showViewMachineConfirmation}
        onClose={() =>
          mobileHook.setModalState((prev: MobileModalState) => ({
            ...prev,
            showViewMachineConfirmation: false,
          }))
        }
        onConfirm={() => {
          const id = mobileHook.modalState.selectedMachineData?._id;
          if (id) window.open(`/cabinets/${id}`, '_blank');
          mobileHook.setModalState((prev: MobileModalState) => ({
            ...prev,
            showViewMachineConfirmation: false,
          }));
        }}
        title="View Machine"
        message="Do you want to open this machine's details in a new tab?"
        confirmText="Yes, View Machine"
        cancelText="Cancel"
        isLoading={false}
      />

      {/* Delete Confirmation Dialog (Mobile) */}
      <ConfirmationDialog
        isOpen={mobileHook.showDeleteConfirmation}
        onClose={() => mobileHook.setShowDeleteConfirmation(false)}
        onConfirm={mobileHook.confirmDeleteEntry}
        title="Confirm Delete"
        message="Are you sure you want to delete this collection entry from the report? The machine's meters will be reverted to their previous values."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={mobileHook.modalState.isProcessing}
        confirmButtonVariant="destructive"
      />

      {/* Bulk Delete Confirmation Dialog (Mobile) */}
      <ConfirmationDialog
        isOpen={showMobileBulkDeleteConfirmation}
        onClose={() => {
          if (!isMobileBulkDeleting) setShowMobileBulkDeleteConfirmation(false);
        }}
        onConfirm={handleMobileBulkDelete}
        title={`Delete ${mobileSelectedIds.length} Machine(s)`}
        message={`Are you sure you want to delete ${mobileSelectedIds.length} collection entries? Each machine's meters will be reverted to their previous values.`}
        confirmText={`Yes, Delete ${mobileSelectedIds.length}`}
        cancelText="Cancel"
        isLoading={mobileHook.modalState.isProcessing || isMobileBulkDeleting}
        confirmButtonVariant="destructive"
      />
    </>
  );
}

export default function CollectionReportEditCollectionModal({
  show,
  onClose,
  reportId,
  locations = [],
  onRefresh,
}: CollectionReportEditCollectionModalProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const isMobile = useMediaQuery('(max-width: 768px)');

  // True while a machine edit form is open inside the modal
  const isMachineEditingRef = useRef(false);
  // True when there are unsaved meter changes
  const hasUnsavedEditsRef = useRef(false);
  // Force close bypasses unsaved changes check (used after successful save)
  const forceCloseRef = useRef(false);
  const handleMachineEditingChange = useCallback((editing: boolean) => {
    isMachineEditingRef.current = editing;
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================
  const [isProcessing, setIsProcessing] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleCloseAttempt = useCallback(() => {
    // Check if we're forcing close (after successful save)
    if (forceCloseRef.current) {
      forceCloseRef.current = false;
      onClose();
      return;
    }
    // Never close during processing — button is hidden/disabled too
    if (isProcessing) return;
    if (isMachineEditingRef.current) {
      toast.warning('Save or cancel your current machine edit first.');
      return;
    }
    // Block closing if there are unsaved changes (unless force close was triggered)
    if (hasUnsavedEditsRef.current) {
      toast.warning(
        'You have unsaved changes. Please submit the report first.'
      );
      return;
    }
    onClose();
  }, [onClose, isProcessing]);

  // ============================================================================
  // Render
  // ============================================================================
  if (!show) return null;

  return (
    <Dialog
      open={show}
      onOpenChange={isOpen => {
        if (!isOpen) handleCloseAttempt();
      }}
    >
      <DialogContent
        className={
          isMobile
            ? 'm-0 flex h-[100dvh] w-full max-w-full flex-col overflow-hidden border-none bg-gray-50 p-0 shadow-2xl'
            : 'flex h-auto max-h-[95vh] w-[98vw] max-w-[98vw] flex-col bg-container p-0 md:h-auto md:w-full md:max-w-6xl lg:max-w-7xl'
        }
        showCloseButton={!isMobile && !isProcessing}
        isMobileFullScreen={isMobile}
        onEscapeKeyDown={e => {
          if (isProcessing) {
            e.preventDefault();
            return;
          }
          if (isMachineEditingRef.current) {
            e.preventDefault();
            toast.warning('Save or cancel your current machine edit first.');
          }
        }}
        onInteractOutside={e => {
          if (isProcessing || isMachineEditingRef.current) e.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">Edit Collection Report</DialogTitle>

        {isMobile ? (
          <MobileEditWrapper
            show={show}
            reportId={reportId}
            locations={locations}
            onRefresh={onRefresh}
            onClose={handleCloseAttempt}
            onMachineEditingChange={handleMachineEditingChange}
            onProcessingChange={setIsProcessing}
            unsavedEditsRef={hasUnsavedEditsRef}
            forceCloseRef={forceCloseRef}
          />
        ) : (
          <DesktopEditWrapper
            show={show}
            reportId={reportId}
            locations={locations}
            onRefresh={onRefresh}
            onClose={handleCloseAttempt}
            onMachineEditingChange={handleMachineEditingChange}
            onProcessingChange={setIsProcessing}
            unsavedEditsRef={hasUnsavedEditsRef}
            forceCloseRef={forceCloseRef}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
