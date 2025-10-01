import React, { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, List } from "lucide-react";
import axios from "axios";
import type { CollectionDocument } from "@/lib/types/collections";
import type {
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
} from "@/lib/types/api";
import { LocationSelector } from "./LocationSelector";
import { MachineSelector } from "./MachineSelector";
import { MachineDataForm } from "./MachineDataForm";
import { CollectedMachinesList } from "./CollectedMachinesList";
import { MobileCollectionModalSkeleton } from "./MobileCollectionModalSkeleton";

type MobileModalView = "location" | "machines" | "form" | "list";

type Props = {
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
  locations,
  onRefresh,
}: Props) {
  const [currentView, setCurrentView] = useState<MobileModalView>("location");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState<string>("");
  const [machines, setMachines] = useState<CollectionReportMachineSummary[]>(
    []
  );
  const [selectedMachine, setSelectedMachine] =
    useState<CollectionReportMachineSummary | null>(null);
  const [collectedMachines, setCollectedMachines] = useState<
    CollectionDocument[]
  >([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const goBack = useCallback(() => {
    switch (currentView) {
      case "machines":
        setCurrentView("location");
        break;
      case "form":
        setCurrentView("machines");
        break;
      case "list":
        setCurrentView("machines");
        break;
      default:
        onClose();
    }
  }, [currentView, onClose]);

  const showBack = useMemo(() => currentView !== "location", [currentView]);

  const loadCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(
        `/api/collections?locationReportId=${reportId}&_t=${Date.now()}`
      );
      setCollectedMachines(res.data || []);
      // Seed location from first entry if available
      if (res.data?.length) {
        const first = res.data[0] as CollectionDocument;
        const loc = locations.find((l) => l.name === first.location);
        if (loc) {
          setSelectedLocationName(loc.name);
          const machinesRes = await axios.get(
            `/api/machines?locationId=${loc._id}&_t=${Date.now()}`
          );
          setMachines(machinesRes.data?.data || []);
          setCurrentView("machines");
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [reportId, locations]);

  const handleLocationSelect = useCallback(
    async (loc: { _id: string; name: string }) => {
      setSelectedLocationName(loc.name);
      setIsLoading(true);
      try {
        const res = await axios.get(`/api/machines?locationId=${loc._id}&_t=${Date.now()}`);
        setMachines(res.data?.data || []);
        setCurrentView("machines");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleMachineSelect = useCallback(
    (m: CollectionReportMachineSummary) => {
      setSelectedMachine(m);
      setIsEditing(false);
      setEditingEntryId(null);
      setCurrentView("form");
    },
    []
  );

  const handleEditMachine = useCallback(
    (entry: CollectionDocument) => {
      const m =
        machines.find((mm) => String(mm._id) === entry.machineId) || null;
      setSelectedMachine(m);
      setIsEditing(true);
      setEditingEntryId(entry._id);
      setCurrentView("form");
    },
    [machines]
  );

  const handleMachineAdded = useCallback((entry: CollectionDocument) => {
    setCollectedMachines((prev) => [...prev, entry]);
    setCurrentView("machines");
  }, []);

  const handleMachineUpdated = useCallback((entry: CollectionDocument) => {
    setCollectedMachines((prev) =>
      prev.map((c) => (c._id === entry._id ? entry : c))
    );
    setIsEditing(false);
    setEditingEntryId(null);
    setCurrentView("machines");
  }, []);

  const handleMachineDeleted = useCallback((id: string) => {
    setCollectedMachines((prev) => prev.filter((c) => c._id !== id));
  }, []);

  const handleClose = useCallback(() => {
    onRefresh();
    onClose();
  }, [onClose, onRefresh]);

  React.useEffect(() => {
    if (show) loadCollections();
  }, [show, loadCollections]);

  if (!show) return null;
  if (isLoading) return <MobileCollectionModalSkeleton />;

  return (
    <Dialog open={show} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="md:hidden max-w-full h-full max-h-full p-0 flex flex-col bg-container">
        <DialogHeader className="p-4 pb-2 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBack && (
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
                {currentView === "location"
                  ? "Select Location"
                  : currentView === "machines"
                  ? selectedLocationName || "Select Machine"
                  : currentView === "form"
                  ? isEditing
                    ? "Edit Machine"
                    : "Enter Data"
                  : "Collected Machines"}
              </DialogTitle>
            </div>
            {currentView !== "list" && collectedMachines.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView("list")}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                <span className="sm:hidden">{collectedMachines.length}</span>
                <span className="hidden sm:inline">List</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative">
          {currentView === "location" && (
            <LocationSelector
              locations={locations.map((loc) => ({
                _id: String(loc._id),
                name: loc.name,
                machines: loc.machines as unknown[],
              }))}
              onLocationSelect={handleLocationSelect}
              isLoading={isLoading}
            />
          )}

          {currentView === "machines" && (
            <MachineSelector
              location={{ name: selectedLocationName, machines }}
              collectedMachines={collectedMachines}
              onMachineSelect={handleMachineSelect}
              onEditMachine={handleEditMachine}
              onDeleteMachine={handleMachineDeleted}
              isLoading={isLoading}
            />
          )}

          {currentView === "form" && selectedMachine && (
            <MachineDataForm
              machine={selectedMachine}
              location={{ name: selectedLocationName }}
              isEditing={isEditing}
              editingEntry={
                isEditing
                  ? collectedMachines.find((c) => c._id === editingEntryId) ||
                    null
                  : null
              }
              onMachineAdded={handleMachineAdded}
              onMachineUpdated={handleMachineUpdated}
              onCancel={() => setCurrentView("machines")}
              isProcessing={false}
            />
          )}
        </div>

        {currentView === "list" && (
          <CollectedMachinesList
            collectedMachines={collectedMachines}
            onEditMachine={handleEditMachine}
            onDeleteMachine={handleMachineDeleted}
            onClose={() => setCurrentView("machines")}
            onCreateReport={() => onRefresh()}
            isProcessing={false}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
