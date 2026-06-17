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
import { checkLocationNoSMIB } from '@/lib/helpers/collectionReport/fetching';
import {
  useMobileEditCollectionModal,
  type MobileModalState,
} from '@/lib/hooks/collectionReport/useMobileEditCollectionModal';
import {
  useCollectionReportVariationCheck,
  type CheckVariationsMachine,
  type PreCreateMeterPayload,
} from '@/lib/hooks/collectionReport/useCollectionReportVariationCheck';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { VariationsConfirmationDialog } from '@/components/CMS/collectionReport/variations/VariationsConfirmationDialog';
import { VariationCheckPopover } from '@/components/CMS/collectionReport/variations/VariationCheckPopover';
import { InfoConfirmationDialog } from '@/components/shared/ui/InfoConfirmationDialog';
import { MobileCollectionModalSkeleton } from '@/components/shared/ui/skeletons/MobileCollectionModalSkeleton';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useCollectionModalStore } from '@/lib/store/collectionModalStore';
import { useMachineOnlineStatus } from '@/lib/hooks/useMachineOnlineStatus';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type {
  CollectionReportLocationWithMachines,
  MachineVariationData,
} from '@/lib/types/api';

// Layouts
import DesktopEditLayout from './edit/DesktopEditLayout';
import MobileEditLayout from './edit/MobileEditLayout';

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
  gameDayOffset?: number;
  /** Called whenever the machine-form open/closed state changes */
  onMachineEditingChange?: (editing: boolean) => void;
  /** True when there are unsaved changes (meter edits) */
  hasUnsavedEdits?: boolean;
  /** Ref to track if there are unsaved edits (set by hooks) */
  unsavedEditsRef?: React.MutableRefObject<boolean>;
  /** Ref to force close the modal (bypass unsaved changes check) */
  forceCloseRef?: React.MutableRefObject<boolean>;
};

function DesktopEditWrapper({
  show,
  reportId,
  locations,
  onRefresh,
  onClose,
  gameDayOffset,
  onMachineEditingChange,
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

  // Online/offline status for machines in the edit modal (Desktop)
  const desktopMachineIds = desktopHook.collectedMachineEntries.map(entry => String(entry.machineId));
  const desktopMachineStatusMap = useMachineOnlineStatus(desktopMachineIds);

  const variation = useCollectionReportVariationCheck();
  const lastDesktopPreCreateRef = useRef<PreCreateMeterPayload[]>([]);
  const lastDesktopMachinesForCheckRef = useRef<CheckVariationsMachine[]>([]);

  const resetCollectionModalStore = useCollectionModalStore(
    state => state.resetState
  );
  const [variationsCollapsibleExpanded, setVariationsCollapsibleExpanded] =
    useState(false);
  const [showVariationPopover, setShowVariationPopover] = useState(false);
  const [showVariationsConfirmation, setShowVariationsConfirmation] =
    useState(false);
  const [showUpdateReportConfirmation, setShowUpdateReportConfirmation] =
    useState(false);

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
        // Query gaminglocations to check noSMIBLocation; skip the variation check if true.
        const isNoSmib = await checkLocationNoSMIB(
          desktopHook.selectedLocationId ?? ''
        );
        if (isNoSmib) return;

        // Pass storedSasGross from each collection's sasMeters.gross.
        // This lets the check-variations route use the stored value instead of
        // re-querying live Meters, which correctly handles offline SMIB machines
        // (where pre-offline SAS meters would otherwise double-count with the
        // supplemental meter and produce phantom variation).
        const machinesForCheck = desktopHook.collectedMachineEntries
          .filter(entry => entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime)
          .map(entry => {
            const isOffline =
              entry.machineId && desktopMachineStatusMap[entry.machineId] === false;
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

      // Query gaminglocations directly to check noSMIBLocation flag.
      // If true, skip the /api/collection-reports/check-variations request entirely
      // and show the standard "Are you sure?" update confirmation instead.
      const isNoSmib = await checkLocationNoSMIB(locationId);
      if (isNoSmib) {
        setShowUpdateReportConfirmation(true);
        return;
      }

      setShowVariationPopover(true);

      // ── Build pre-create payloads (updates supplemental meters for offline/previously-offline machines) ──
      const desktopPreCreate = desktopHook.collectedMachineEntries.map(entry => ({
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
          entry.ramClearMetersIn != null ? Number(entry.ramClearMetersIn) : undefined,
        ramClearMetersOut:
          entry.ramClearMetersOut != null ? Number(entry.ramClearMetersOut) : undefined,
      }));

      // ── Build variation-check machines ──
      // IMPORTANT: check-variations filters out meterSource='COLLECTION_REPORT' from its
      // live Meters query, so it can NEVER see the supplemental meter.
      // For offline SMIB machines: pass storedSasGross computed from current edited inputs.
      // For online machines: no storedSasGross — the backend queries live meters.
      const machinesForCheck = desktopHook.collectedMachineEntries
        .filter(entry => entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime)
        .map(entry => {
          const currentlyOffline =
            entry.machineId && desktopMachineStatusMap[entry.machineId] === false;
          const useStoredSasGross = currentlyOffline;
          const movementGross = (entry as { movement?: { gross?: number } }).movement?.gross;
          // Compute fresh movement from current inputs for offline SMIB machines
          // (reflects edits, unlike entry.movement.gross)
          const freshMovementGross = useStoredSasGross
            ? (entry.metersIn || 0) - (entry.prevIn || 0) - ((entry.metersOut || 0) - (entry.prevOut || 0))
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
            storedSasGross: useStoredSasGross ? (freshMovementGross ?? 0) : undefined,
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
      variation.preCreateThenCheck(locationId, machinesForCheck, desktopPreCreate);
    } catch (e) {
      console.error('[handleDesktopSubmit] Error:', e instanceof Error ? e.message : 'Unknown error');
      toast.error('Failed to submit. Please try again.');
    }
  };

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
        gameDayOffset={gameDayOffset}
      />

      <DialogFooter className="flex flex-shrink-0 justify-center border-t border-gray-300 p-4 pt-2 md:p-6 md:pt-4">
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
      <VariationCheckPopover
        isOpen={showVariationPopover && !variation.isMinimized}
        isChecking={variation.isChecking}
        hasVariations={variation.hasVariations}
        error={variation.error}
        variationsData={variation.variationsData}
        onMinimize={() => {
          variation.toggleMinimize();
          setVariationsCollapsibleExpanded(true);
        }}
        onRetry={() => {
          const locationId =
            desktopHook.selectedLocationId ||
            desktopHook.collectedMachineEntries[0]?.location ||
            '';
          variation.preCreateThenCheck(
            locationId,
            lastDesktopMachinesForCheckRef.current,
            lastDesktopPreCreateRef.current
          );
        }}
        onSubmit={() => {
          setShowVariationPopover(false);
          // Filter out machines with "No SMIB" (no relayId)
          const machinesWithSmib =
            variation.variationsData?.machines.filter(
              m => m.variation !== null
            ) || [];

          // If no machines have SMIB or no variations, skip variation confirmation and go straight to update
          if (machinesWithSmib.length === 0 || !variation.hasVariations) {
            desktopHook.handleUpdateReport(
              variation.variationsData || undefined
            );
          } else {
            // Show variations confirmation only if there are actual variations with SMIB machines
            setShowVariationsConfirmation(true);
          }
        }}
        onClose={() => {
          setShowVariationPopover(false);
          variation.reset();
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
        onConfirm={() => {
          desktopHook.handleUpdateReport(variation.variationsData || undefined);
          setShowVariationsConfirmation(false);
        }}
        onCancel={() => setShowVariationsConfirmation(false)}
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

  // Online/offline status for machines in the edit modal
  const editMobileIds = mobileHook.availableMachines.map(machine => String(machine._id));
  const editMachineStatusMap = useMachineOnlineStatus(editMobileIds);

  // ============================================================================
  // Effects
  // ============================================================================
  // Sync mobile hook's hasUnsavedEdits up to parent via ref
  useEffect(() => {
    unsavedEditsRef &&
      (unsavedEditsRef.current = mobileHook.modalState.hasUnsavedEdits);
  }, [mobileHook.modalState.hasUnsavedEdits, unsavedEditsRef]);
  const variation = useCollectionReportVariationCheck();
  const lastMobilePreCreateRef = useRef<PreCreateMeterPayload[]>([]);
  const lastMobileMachinesForCheckRef = useRef<CheckVariationsMachine[]>([]);

  const resetCollectionModalStore = useCollectionModalStore(
    state => state.resetState
  );
  const [showVariationPopover, setShowVariationPopover] = useState(false);
  const [showVariationsConfirmation, setShowVariationsConfirmation] =
    useState(false);
  const [showUpdateReportConfirmation, setShowUpdateReportConfirmation] =
    useState(false);

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

      // Query gaminglocations directly to check noSMIBLocation flag.
      // If true, skip the /api/collection-reports/check-variations request entirely
      // and show the standard "Are you sure?" update confirmation instead.
      const isNoSmib = await checkLocationNoSMIB(locationId);
      if (isNoSmib) {
        setShowUpdateReportConfirmation(true);
        return;
      }

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
          entry.ramClearMetersIn != null ? Number(entry.ramClearMetersIn) : undefined,
        ramClearMetersOut:
          entry.ramClearMetersOut != null ? Number(entry.ramClearMetersOut) : undefined,
      }));

      // ── Build variation-check machines ──
      // IMPORTANT: check-variations filters out meterSource='COLLECTION_REPORT' from its
      // live Meters query, so the supplemental meter is never visible via live query.
      // Offline SMIB machines: pass storedSasGross from current edited inputs.
      // Online machines: no storedSasGross — the backend queries live meters.
      const machinesForCheck = mobileHook.collectedMachines
        .filter(entry => entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime)
        .map(entry => {
          const currentlyOffline =
            entry.machineId && editMachineStatusMap[entry.machineId] === false;
          const useStoredSasGross = currentlyOffline;
          const movementGross = (entry as { movement?: { gross?: number } }).movement?.gross;
          const freshMovementGross = useStoredSasGross
            ? (entry.metersIn || 0) - (entry.prevIn || 0) - ((entry.metersOut || 0) - (entry.prevOut || 0))
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
            storedSasGross: useStoredSasGross ? (freshMovementGross ?? 0) : undefined,
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
      variation.preCreateThenCheck(locationId, machinesForCheck, mobilePreCreate);
    } catch (e) {
      console.error('[handleMobileSubmit] Error:', e instanceof Error ? e.message : 'Unknown error');
      toast.error('Failed to submit. Please try again.');
    }
  };

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
        // Query gaminglocations to check noSMIBLocation; skip the variation check if true.
        const isNoSmib = await checkLocationNoSMIB(locationId);
        if (isNoSmib) return;

        const machinesForCheck = mobileHook.collectedMachines
          .filter(entry => entry.sasMeters?.sasStartTime && entry.sasMeters?.sasEndTime)
          .map(entry => {
            const isOffline =
              entry.machineId && editMachineStatusMap[entry.machineId] === false;
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
              movementGross: (entry as { movement?: { gross?: number } }).movement?.gross,
              storedSasGross: isOffline
                ? (entry as { movement?: { gross?: number } }).movement?.gross ?? 0
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
          {...mobileHook}
          onClose={onClose}
          handleStartSubmit={handleMobileSubmit}
          variationsData={variation.variationsData}
          hasChanges={mobileHook.hasUnsavedEdits}
          machineStatusMap={editMachineStatusMap}
        />
      )}

      {/* Variation Dialogs */}
      <VariationCheckPopover
        isOpen={showVariationPopover && !variation.isMinimized}
        isChecking={variation.isChecking}
        hasVariations={variation.hasVariations}
        error={variation.error}
        variationsData={variation.variationsData}
        onMinimize={() => {
          variation.toggleMinimize();
          mobileHook.handleViewCollectedMachines();
        }}
        onSubmit={() => {
          setShowVariationPopover(false);
          // Filter out machines with "No SMIB" (no relayId)
          const machinesWithSmib =
            variation.variationsData?.machines.filter(
              m => m.variation !== null
            ) || [];

          // If no machines have SMIB or no variations, skip variation confirmation and go straight to update
          if (machinesWithSmib.length === 0 || !variation.hasVariations) {
            mobileHook.updateCollectionReportHandler(
              variation.variationsData || undefined
            );
          } else {
            // Show variations confirmation only if there are actual variations with SMIB machines
            setShowVariationsConfirmation(true);
          }
        }}
        onRetry={() => {
          const locationId =
            mobileHook.lockedLocationId || mobileHook.selectedLocationId || '';
          variation.preCreateThenCheck(
            locationId,
            lastMobileMachinesForCheckRef.current,
            lastMobilePreCreateRef.current
          );
        }}
        onClose={() => {
          setShowVariationPopover(false);
          variation.reset();
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
        onConfirm={() => {
          mobileHook.updateCollectionReportHandler(
            variation.variationsData || undefined
          );
          setShowVariationsConfirmation(false);
        }}
        onCancel={() => setShowVariationsConfirmation(false)}
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
  const { gameDayOffset } = useDashBoardStore();

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
  // Update parent about unsaved changes state (for potential external tracking)
  useEffect(() => {
    // Parent can read this ref if needed
  }, [hasUnsavedEditsRef.current]);

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
  }, [onClose]);

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
        showCloseButton={!isMobile}
        isMobileFullScreen={isMobile}
        onEscapeKeyDown={e => {
          if (isMachineEditingRef.current) {
            e.preventDefault();
            toast.warning('Save or cancel your current machine edit first.');
          }
        }}
        onInteractOutside={e => {
          if (isMachineEditingRef.current) e.preventDefault();
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
            gameDayOffset={gameDayOffset}
            onMachineEditingChange={handleMachineEditingChange}
            unsavedEditsRef={hasUnsavedEditsRef}
            forceCloseRef={forceCloseRef}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
