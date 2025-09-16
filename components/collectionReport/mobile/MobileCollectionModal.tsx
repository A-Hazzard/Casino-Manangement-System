import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, List } from "lucide-react";
import type { NewCollectionModalProps } from "@/lib/types/componentProps";
import type { CollectionDocument } from "@/lib/types/collections";
import type { CollectionReportMachineSummary } from "@/lib/types/api";
import { LocationSelector } from "./LocationSelector";
import { MachineSelector } from "./MachineSelector";
import { MachineDataForm } from "./MachineDataForm";
import { CollectedMachinesList } from "./CollectedMachinesList";
import { MobileCollectionModalSkeleton } from "./MobileCollectionModalSkeleton";

type MobileModalView = "location" | "machines" | "form" | "list";

type MobileLocation = {
  _id: string;
  name: string;
  machines?: CollectionReportMachineSummary[];
  address?: string;
  profitShare?: number;
};

type MobileModalState = {
  currentView: MobileModalView;
  selectedLocation: MobileLocation | null;
  selectedMachine: CollectionReportMachineSummary | null;
  collectedMachines: CollectionDocument[];
  showListPanel: boolean;
  isEditing: boolean;
  editingEntryId: string | null;
};

export default function MobileCollectionModal({
  show,
  onClose,
  locations = [],
}: NewCollectionModalProps) {
  const [modalState, setModalState] = useState<MobileModalState>({
    currentView: "location",
    selectedLocation: null,
    selectedMachine: null,
    collectedMachines: [],
    showListPanel: false,
    isEditing: false,
    editingEntryId: null,
  });

  const [isLoading] = useState(false);
  const [isProcessing] = useState(false);

  // Navigation handlers
  const navigateToView = useCallback((view: MobileModalView) => {
    setModalState((prev) => ({ ...prev, currentView: view }));
  }, []);

  const goBack = useCallback(() => {
    switch (modalState.currentView) {
      case "machines":
        navigateToView("location");
        break;
      case "form":
        navigateToView("machines");
        break;
      case "list":
        setModalState((prev) => ({ ...prev, showListPanel: false }));
        break;
      default:
        onClose();
    }
  }, [modalState.currentView, navigateToView, onClose]);

  const handleLocationSelect = useCallback(
    (location: {
      _id: string;
      name: string;
      address?: string;
      profitShare?: number;
      machines?: unknown[];
    }) => {
      const normalized: MobileLocation = {
        _id: String(location._id),
        name: location.name,
        machines: (location.machines || []) as CollectionReportMachineSummary[],
        address: location.address,
        profitShare: location.profitShare,
      };
      setModalState((prev) => ({
        ...prev,
        selectedLocation: normalized,
        currentView: "machines",
      }));
    },
    []
  );

  const handleMachineSelect = useCallback(
    (machine: CollectionReportMachineSummary) => {
      setModalState((prev) => ({
        ...prev,
        selectedMachine: machine,
        currentView: "form",
      }));
    },
    []
  );

  const handleMachineAdded = useCallback((machine: CollectionDocument) => {
    setModalState((prev) => ({
      ...prev,
      collectedMachines: [...prev.collectedMachines, machine],
      currentView: "machines",
      selectedMachine: null,
    }));
  }, []);

  const handleMachineUpdated = useCallback(
    (updatedMachine: CollectionDocument) => {
      setModalState((prev) => ({
        ...prev,
        collectedMachines: prev.collectedMachines.map((m) =>
          m._id === updatedMachine._id ? updatedMachine : m
        ),
        currentView: "machines",
        selectedMachine: null,
        isEditing: false,
        editingEntryId: null,
      }));
    },
    []
  );

  const handleMachineDeleted = useCallback((machineId: string) => {
    setModalState((prev) => ({
      ...prev,
      collectedMachines: prev.collectedMachines.filter(
        (m) => m._id !== machineId
      ),
    }));
  }, []);

  const handleEditMachine = useCallback((machine: CollectionDocument) => {
    setModalState((prev) => ({
      ...prev,
      selectedMachine:
        prev.selectedLocation?.machines?.find(
          (m: CollectionReportMachineSummary) => m._id === machine.machineId
        ) || null,
      currentView: "form",
      isEditing: true,
      editingEntryId: machine._id,
    }));
  }, []);

  const toggleListPanel = useCallback(() => {
    setModalState((prev) => ({ ...prev, showListPanel: !prev.showListPanel }));
  }, []);

  const handleClose = useCallback(() => {
    // Reset state
    setModalState({
      currentView: "location",
      selectedLocation: null,
      selectedMachine: null,
      collectedMachines: [],
      showListPanel: false,
      isEditing: false,
      editingEntryId: null,
    });
    onClose();
  }, [onClose]);

  // Get current view title
  const getViewTitle = useCallback(() => {
    switch (modalState.currentView) {
      case "location":
        return "Select Location";
      case "machines":
        return modalState.selectedLocation?.name || "Select Machine";
      case "form":
        return modalState.selectedMachine?.name || "Enter Data";
      case "list":
        return "Collected Machines";
      default:
        return "Collection Report";
    }
  }, [
    modalState.currentView,
    modalState.selectedLocation,
    modalState.selectedMachine,
  ]);

  // Check if back button should be shown
  const showBackButton = useCallback(() => {
    return modalState.currentView !== "location" || modalState.showListPanel;
  }, [modalState.currentView, modalState.showListPanel]);

  if (!show) {
    return null;
  }

  if (isLoading) {
    return <MobileCollectionModalSkeleton />;
  }

  return (
    <Dialog open={show} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="md:hidden max-w-full h-full max-h-full p-0 flex flex-col bg-container">
        {/* Mobile Header */}
        <DialogHeader className="p-4 pb-2 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBackButton() && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goBack}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle className="text-lg font-semibold">
                {getViewTitle()}
              </DialogTitle>
            </div>

            {/* List Toggle Button - Show when machines are collected */}
            {modalState.collectedMachines.length > 0 &&
              modalState.currentView !== "list" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleListPanel}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                  <span className="sm:hidden">
                    {modalState.collectedMachines.length}
                  </span>
                </Button>
              )}
          </div>
        </DialogHeader>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden relative">
          {/* Location Selector View */}
          {modalState.currentView === "location" && (
            <LocationSelector
              locations={locations.map((loc) => ({
                _id: String(loc._id),
                name: loc.name,
                address: undefined,
                profitShare: loc.profitShare,
                machines: loc.machines as unknown[],
              }))}
              onLocationSelect={handleLocationSelect}
              isLoading={isLoading}
            />
          )}

          {/* Machine Selector View */}
          {modalState.currentView === "machines" &&
            modalState.selectedLocation && (
              <MachineSelector
                location={modalState.selectedLocation}
                collectedMachines={modalState.collectedMachines}
                onMachineSelect={handleMachineSelect}
                onEditMachine={handleEditMachine}
                onDeleteMachine={handleMachineDeleted}
                isLoading={isLoading}
              />
            )}

          {/* Machine Data Form View */}
          {modalState.currentView === "form" && modalState.selectedMachine && (
            <MachineDataForm
              machine={modalState.selectedMachine}
              location={{ name: modalState.selectedLocation?.name || "" }}
              isEditing={modalState.isEditing}
              editingEntry={
                modalState.isEditing
                  ? modalState.collectedMachines.find(
                      (m) => m._id === modalState.editingEntryId
                    )
                  : null
              }
              onMachineAdded={handleMachineAdded}
              onMachineUpdated={handleMachineUpdated}
              onCancel={() => navigateToView("machines")}
              isProcessing={isProcessing}
            />
          )}
        </div>

        {/* Slide-up List Panel */}
        {modalState.showListPanel && (
          <CollectedMachinesList
            collectedMachines={modalState.collectedMachines}
            onEditMachine={handleEditMachine}
            onDeleteMachine={handleMachineDeleted}
            onClose={() =>
              setModalState((prev) => ({ ...prev, showListPanel: false }))
            }
            onCreateReport={() => {
              // TODO: Implement create report functionality
              console.warn(
                "Create report with machines:",
                modalState.collectedMachines
              );
            }}
            isProcessing={isProcessing}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
