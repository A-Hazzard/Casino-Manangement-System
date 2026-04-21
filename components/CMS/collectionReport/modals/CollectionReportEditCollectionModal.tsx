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
    DialogClose
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { useEditCollectionModal } from '@/lib/hooks/collectionReport/useEditCollectionModal';
import { useMobileEditCollectionModal, type MobileModalState } from '@/lib/hooks/collectionReport/useMobileEditCollectionModal';
import { useCollectionReportVariationCheck } from '@/lib/hooks/collectionReport/useCollectionReportVariationCheck';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { VariationsConfirmationDialog } from '@/components/CMS/collectionReport/variations/VariationsConfirmationDialog';
import { VariationCheckPopover } from '@/components/CMS/collectionReport/variations/VariationCheckPopover';
import { InfoConfirmationDialog } from '@/components/shared/ui/InfoConfirmationDialog';
import { MobileCollectionModalSkeleton } from '@/components/shared/ui/skeletons/MobileCollectionModalSkeleton';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { CollectionReportLocationWithMachines, MachineVariationData } from '@/lib/types/api';

// Layouts
import DesktopEditLayout from './edit/DesktopEditLayout';
import MobileEditLayout from './edit/MobileEditLayout';

type CollectionReportEditCollectionModalProps = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
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
};

function DesktopEditWrapper({ show, reportId, locations, onRefresh, onClose, gameDayOffset, onMachineEditingChange }: WrapperProps) {
  const desktopHook = useEditCollectionModal({ show, reportId, locations, onRefresh, onClose });
  const variation = useCollectionReportVariationCheck();
  const [variationsCollapsibleExpanded, setVariationsCollapsibleExpanded] = useState(false);
  const [showVariationPopover, setShowVariationPopover] = useState(false);
  const [showVariationsConfirmation, setShowVariationsConfirmation] = useState(false);

  // Notify outer component when a machine form opens/closes
  useEffect(() => {
    onMachineEditingChange?.(!!desktopHook.editingEntryId);
  }, [desktopHook.editingEntryId, onMachineEditingChange]);

  // Auto-check variations when collections are loaded
  const initialCheckPerformedRef = useRef(false);
  useEffect(() => {
    if (show && !desktopHook.isLoadingCollections && desktopHook.collectedMachineEntries.length > 0 && !initialCheckPerformedRef.current) {
      initialCheckPerformedRef.current = true;
      const machinesForCheck = desktopHook.collectedMachineEntries.map(entry => ({
        machineId: entry.machineId,
        machineName: entry.machineCustomName || entry.machineName || entry.serialNumber || entry.machineId,
        metersIn: entry.metersIn || 0,
        metersOut: entry.metersOut || 0,
        sasStartTime: entry.sasMeters?.sasStartTime ? new Date(entry.sasMeters.sasStartTime).toISOString() : undefined,
        sasEndTime: entry.sasMeters?.sasEndTime ? new Date(entry.sasMeters.sasEndTime).toISOString() : undefined,
        prevMetersIn: entry.prevIn || 0,
        prevMetersOut: entry.prevOut || 0,
      }));
      variation.checkVariations(desktopHook.selectedLocationId ?? '', machinesForCheck);
    }
    if (!show) {
      initialCheckPerformedRef.current = false;
    }
  }, [show, desktopHook.isLoadingCollections, desktopHook.collectedMachineEntries.length, desktopHook.selectedLocationId]);

  const handleDesktopSubmit = () => {
    if (desktopHook.editingEntryId) {
      toast.warning('Save or cancel your current machine edit first.');
      return;
    }
    if (desktopHook.collectedMachineEntries.length === 0 || desktopHook.isProcessing) return;
    setShowVariationPopover(true);
    const machinesForCheck = desktopHook.collectedMachineEntries.map(entry => ({
      machineId: entry.machineId,
      machineName: entry.machineCustomName || entry.machineName || entry.serialNumber || entry.machineId,
      metersIn: entry.metersIn || 0,
      metersOut: entry.metersOut || 0,
      sasStartTime: entry.sasMeters?.sasStartTime ? new Date(entry.sasMeters.sasStartTime).toISOString() : undefined,
      sasEndTime: entry.sasMeters?.sasEndTime ? new Date(entry.sasMeters.sasEndTime).toISOString() : undefined,
      prevMetersIn: entry.prevIn || 0,
      prevMetersOut: entry.prevOut || 0,
    }));
    variation.checkVariations(desktopHook.selectedLocationId ?? '', machinesForCheck);
  };

  return (
    <>
      {/* Desktop Header */}
      <DialogHeader className="p-4 pb-0 md:p-6 flex-shrink-0">
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

      <DialogFooter className="flex justify-center border-t border-gray-300 p-4 pt-2 md:p-6 md:pt-4 flex-shrink-0">
        <Button
          onClick={handleDesktopSubmit}
          disabled={!desktopHook.isUpdateReportEnabled || desktopHook.isProcessing}
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
        onSubmit={() => {
          setShowVariationPopover(false);
          if (variation.hasVariations && variation.variationsData) {
            setShowVariationsConfirmation(true);
          } else {
            desktopHook.handleUpdateReport(variation.variationsData || undefined);
          }
        }}
        onRetry={() => {/* retry logic */}}
        onClose={() => setShowVariationPopover(false)}
      />

      <VariationsConfirmationDialog
        isOpen={showVariationsConfirmation}
        machineCount={variation.variationsData?.machines.filter((m: MachineVariationData) => typeof m.variation === 'number').length || 0}
        totalVariation={variation.variationsData?.totalVariation || 0}
        isLoading={desktopHook.isProcessing}
        onConfirm={() => {
          desktopHook.handleUpdateReport(variation.variationsData || undefined);
          setShowVariationsConfirmation(false);
        }}
        onCancel={() => setShowVariationsConfirmation(false)}
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
    </>
  );
}

function MobileEditWrapper({ show, reportId, locations, onRefresh, onClose, onMachineEditingChange }: WrapperProps) {
  const mobileHook = useMobileEditCollectionModal({ show, reportId, locations, onRefresh, onClose });
  const variation = useCollectionReportVariationCheck();
  const [showVariationPopover, setShowVariationPopover] = useState(false);
  const [showVariationsConfirmation, setShowVariationsConfirmation] = useState(false);

  // Notify outer component when a machine form opens/closes
  useEffect(() => {
    onMachineEditingChange?.(!!mobileHook.modalState.editingEntryId);
  }, [mobileHook.modalState.editingEntryId, onMachineEditingChange]);

  const handleMobileSubmit = () => {
    if (mobileHook.modalState.editingEntryId) {
      toast.warning('Save or cancel your current machine edit first.');
      return;
    }
    if (mobileHook.collectedMachines.length === 0 || mobileHook.modalState.isProcessing) return;
    setShowVariationPopover(true);
    const machinesForCheck = mobileHook.collectedMachines.map(entry => ({
      machineId: entry.machineId,
      machineName: entry.machineCustomName || entry.machineName || entry.serialNumber || entry.machineId,
      metersIn: entry.metersIn || 0,
      metersOut: entry.metersOut || 0,
      sasStartTime: entry.sasStartTime ? new Date(entry.sasStartTime).toISOString() : undefined,
      sasEndTime: entry.sasEndTime ? new Date(entry.sasEndTime).toISOString() : undefined,
      prevMetersIn: entry.prevIn || 0,
      prevMetersOut: entry.prevOut || 0,
    }));
    variation.checkVariations(mobileHook.lockedLocationId || mobileHook.selectedLocationId || '', machinesForCheck);
  };

  // Auto-check variations when collections are loaded
  const initialCheckPerformedRef = useRef(false);
  useEffect(() => {
    if (show && !mobileHook.modalState.isLoadingCollections && mobileHook.collectedMachines.length > 0 && !initialCheckPerformedRef.current) {
      initialCheckPerformedRef.current = true;
      const machinesForCheck = mobileHook.collectedMachines.map(entry => ({
        machineId: entry.machineId,
        machineName: entry.machineCustomName || entry.machineName || entry.serialNumber || entry.machineId,
        metersIn: entry.metersIn || 0,
        metersOut: entry.metersOut || 0,
        sasStartTime: entry.sasStartTime ? new Date(entry.sasStartTime).toISOString() : undefined,
        sasEndTime: entry.sasEndTime ? new Date(entry.sasEndTime).toISOString() : undefined,
        prevMetersIn: entry.prevIn || 0,
        prevMetersOut: entry.prevOut || 0,
      }));
      variation.checkVariations(mobileHook.lockedLocationId || mobileHook.selectedLocationId || '', machinesForCheck);
    }
    if (!show) {
      initialCheckPerformedRef.current = false;
    }
  }, [show, mobileHook.modalState.isLoadingCollections, mobileHook.collectedMachines.length, mobileHook.lockedLocationId, mobileHook.selectedLocationId]);

  return (
    <>
      {/* Mobile Header */}
      {mobileHook.modalState.navigationStack.length === 0 && (
        <div className="sticky top-0 z-[100] border-b bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Edit Collection Report</h2>
            <DialogClose asChild>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </DialogClose>
          </div>
        </div>
      )}

      {mobileHook.modalState.isLoadingMachines || mobileHook.modalState.isLoadingCollections ? (
        <MobileCollectionModalSkeleton />
      ) : (
        <MobileEditLayout
          {...mobileHook}
          handleStartSubmit={handleMobileSubmit}
          variationsData={variation.variationsData}
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
          if (variation.hasVariations && variation.variationsData) {
            setShowVariationsConfirmation(true);
          } else {
            mobileHook.updateCollectionReportHandler(variation.variationsData || undefined);
          }
        }}
        onRetry={() => {/* retry logic */}}
        onClose={() => setShowVariationPopover(false)}
      />

      <VariationsConfirmationDialog
        isOpen={showVariationsConfirmation}
        machineCount={variation.variationsData?.machines.filter((m: MachineVariationData) => typeof m.variation === 'number').length || 0}
        totalVariation={variation.variationsData?.totalVariation || 0}
        isLoading={mobileHook.modalState.isProcessing}
        onConfirm={() => {
          mobileHook.updateCollectionReportHandler(variation.variationsData || undefined);
          setShowVariationsConfirmation(false);
        }}
        onCancel={() => setShowVariationsConfirmation(false)}
      />

      {/* Shared Dialogs (Mobile side) */}
      <InfoConfirmationDialog
        isOpen={mobileHook.modalState.showViewMachineConfirmation}
        onClose={() => mobileHook.setModalState((prev: MobileModalState) => ({...prev, showViewMachineConfirmation: false}))}
        onConfirm={() => {
          const id = mobileHook.modalState.selectedMachineData?._id;
          if (id) window.open(`/cabinets/${id}`, '_blank');
          mobileHook.setModalState((prev: MobileModalState) => ({...prev, showViewMachineConfirmation: false}));
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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { gameDayOffset } = useDashBoardStore();

  // True while a machine edit form is open inside the modal
  const isMachineEditingRef = useRef(false);
  const handleMachineEditingChange = useCallback((editing: boolean) => {
    isMachineEditingRef.current = editing;
  }, []);

  const handleCloseAttempt = useCallback(() => {
    if (isMachineEditingRef.current) {
      toast.warning('Save or cancel your current machine edit first.');
      return;
    }
    onClose();
  }, [onClose]);

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={(isOpen) => { if (!isOpen) handleCloseAttempt(); }}>
      <DialogContent
        className={isMobile
          ? "m-0 flex h-[100dvh] w-full max-w-full flex-col overflow-hidden border-none bg-gray-50 p-0 shadow-2xl"
          : "flex h-[95vh] w-[98vw] max-w-[98vw] flex-col bg-container p-0 md:h-[90vh] md:w-full md:max-w-6xl lg:max-w-7xl"
        }
        showCloseButton={!isMobile}
        isMobileFullScreen={isMobile}
        onEscapeKeyDown={(e) => {
          if (isMachineEditingRef.current) {
            e.preventDefault();
            toast.warning('Save or cancel your current machine edit first.');
          }
        }}
        onInteractOutside={(e) => {
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
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
