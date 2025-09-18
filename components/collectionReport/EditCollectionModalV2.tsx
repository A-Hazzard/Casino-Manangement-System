"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Edit3 } from "lucide-react";
import axios from "axios";
import type { CollectionDocument } from "@/lib/types/collections";
import type {
  CollectionReportLocationWithMachines,
  CollectionReportData,
} from "@/lib/types/api";
import { updateCollectionReport } from "@/lib/helpers/collectionReport";
import { calculateMovement } from "@/lib/utils/movementCalculation";
import { validateMachineEntry } from "@/lib/helpers/collectionReportModal";
import { updateCollection } from "@/lib/helpers/collections";
import { updateMachineCollectionHistory } from "@/lib/helpers/cabinets";
import { useUserStore } from "@/lib/store/userStore";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/formatting";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
import { SimpleDateTimePicker } from "@/components/ui/simple-date-time-picker";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { LocationSelect } from "@/components/ui/custom-select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type EditCollectionModalV2Props = {
  show: boolean;
  onClose: () => void;
  reportId: string;
  locations: CollectionReportLocationWithMachines[];
  onRefresh: () => void;
};

async function fetchCollectionReportById(
  reportId: string
): Promise<CollectionReportData> {
  const res = await axios.get(`/api/collection-report/${reportId}`);
  return res.data;
}

async function fetchCollectionsByReportId(
  reportId: string
): Promise<CollectionDocument[]> {
  const res = await axios.get(`/api/collections?locationReportId=${reportId}`);
  return res.data;
}

async function updateMachineCollection(
  id: string,
  data: Partial<CollectionDocument>
): Promise<CollectionDocument> {
  // Update the collection document
  const updatedCollection = await updateCollection(id, data);

  // Also update the machine's collection history
  if (
    data.machineId &&
    (data.metersIn !== undefined || data.metersOut !== undefined)
  ) {
    const collectionHistoryEntry = {
      _id: id,
      metersIn: data.metersIn || 0,
      metersOut: data.metersOut || 0,
      prevMetersIn: data.prevIn || 0,
      prevMetersOut: data.prevOut || 0,
      timestamp: data.timestamp || new Date(),
      locationReportId: data.locationReportId || "",
    };

    console.warn("Updating machine collection history for edit:", {
      machineId: data.machineId,
      collectionHistoryEntry,
    });

    await updateMachineCollectionHistory(
      data.machineId,
      collectionHistoryEntry,
      "update",
      id
    );
  }

  return updatedCollection;
}

async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  // First get the collection to find the machineId
  const collection = await axios.get(`/api/collections?id=${id}`);
  const collectionData = collection.data;

  // Delete the collection document
  const res = await axios.delete(`/api/collections?id=${id}`);

  // Also delete from machine's collection history
  if (collectionData && collectionData.machineId) {
    console.warn("Deleting from machine collection history:", {
      machineId: collectionData.machineId,
      entryId: id,
    });

    await updateMachineCollectionHistory(
      collectionData.machineId,
      undefined, // No entry data needed for delete
      "delete",
      id
    );
  }

  return res.data;
}

export default function EditCollectionModalV2({
  show,
  onClose,
  reportId,
  locations = [],
  onRefresh,
}: EditCollectionModalV2Props) {
  const user = useUserStore((state) => state.user);
  const userId = user?._id;

  // State management with simpler approach
  const [reportData, setReportData] = useState<CollectionReportData | null>(
    null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedLocationName, setSelectedLocationName] = useState<string>("");
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [collectedMachineEntries, setCollectedMachineEntries] = useState<
    CollectionDocument[]
  >([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Custom close handler that checks for changes
  const handleClose = useCallback(() => {
    if (hasChanges && onRefresh) {
      onRefresh();
    }
    onClose();
  }, [hasChanges, onRefresh, onClose]);

  // Machine input state
  const [currentCollectionTime, setCurrentCollectionTime] = useState<Date>(
    new Date()
  );
  const [currentMetersIn, setCurrentMetersIn] = useState("");
  const [currentMetersOut, setCurrentMetersOut] = useState("");
  const [currentRamClearMetersIn, setCurrentRamClearMetersIn] = useState("");
  const [currentRamClearMetersOut, setCurrentRamClearMetersOut] = useState("");
  const [currentMachineNotes, setCurrentMachineNotes] = useState("");
  const [currentRamClear, setCurrentRamClear] = useState(false);

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);

  // Financial state
  const [financials, setFinancials] = useState({
    taxes: "",
    advance: "",
    variance: "",
    varianceReason: "",
    amountToCollect: "",
    collectedAmount: "",
    balanceCorrection: "0",
    balanceCorrectionReason: "",
    previousBalance: "0",
    reasonForShortagePayment: "",
  });

  // Base value typed by the user before entering collected amount
  const [baseBalanceCorrection, setBaseBalanceCorrection] = useState<string>("");

  // Derived state
  const selectedLocation = useMemo(
    () => locations.find((l) => String(l._id) === selectedLocationId),
    [locations, selectedLocationId]
  );

  const machinesOfSelectedLocation = useMemo(
    () => selectedLocation?.machines || [],
    [selectedLocation]
  );

  const machineForDataEntry = useMemo(
    () =>
      machinesOfSelectedLocation.find(
        (m) => String(m._id) === selectedMachineId
      ),
    [machinesOfSelectedLocation, selectedMachineId]
  );

  // Calculate amount to collect based on machine entries and financial inputs
  const calculateAmountToCollect = useCallback(() => {
    if (!collectedMachineEntries.length) {
      setFinancials((prev) => ({ ...prev, amountToCollect: "0" }));
      return;
    }

    // Calculate total movement data from all machine entries
    const totalMovementData = collectedMachineEntries.map((entry) => {
      const drop = (entry.metersIn || 0) - (entry.prevIn || 0);
      const cancelledCredits = (entry.metersOut || 0) - (entry.prevOut || 0);
      return {
        drop,
        cancelledCredits,
        gross: drop - cancelledCredits,
      };
    });

    // Sum up all movement data
    const reportTotalData = totalMovementData.reduce(
      (prev, current) => ({
        drop: prev.drop + current.drop,
        cancelledCredits: prev.cancelledCredits + current.cancelledCredits,
        gross: prev.gross + current.gross,
      }),
      { drop: 0, cancelledCredits: 0, gross: 0 }
    );

    // Get financial values
    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;
    const previousBalance = Number(financials.previousBalance) || 0;

    // Get profit share from selected location (default to 50% if not available)
    const profitShare = selectedLocation?.profitShare || 50;

    // Calculate partner profit: Math.floor((gross - variance - advance) * profitShare / 100) - taxes
    const partnerProfit =
      Math.floor(
        ((reportTotalData.gross - variance - advance) * profitShare) / 100
      ) - taxes;

    // Calculate amount to collect: gross - variance - advance - partnerProfit + previousBalance
    const amountToCollect =
      reportTotalData.gross -
      variance -
      advance -
      partnerProfit +
      previousBalance;

    setFinancials((prev) => ({
      ...prev,
      amountToCollect: amountToCollect.toString(),
    }));
  }, [
    collectedMachineEntries,
    financials.taxes,
    financials.variance,
    financials.advance,
    financials.previousBalance,
    selectedLocation?.profitShare,
  ]);

  // Auto-calculate amount to collect when relevant data changes
  useEffect(() => {
    calculateAmountToCollect();
  }, [calculateAmountToCollect]);

  // Update location name when location changes
  useEffect(() => {
    if (selectedLocation) {
      setSelectedLocationName(selectedLocation.name);
    } else {
      setSelectedLocationName("");
    }
  }, [selectedLocation]);

  // Load report data
  useEffect(() => {
    if (show && reportId) {
      fetchCollectionReportById(reportId)
        .then((data) => {
          setReportData(data);
          setFinancials({
            taxes: data.locationMetrics?.taxes?.toString() || "",
            advance: data.locationMetrics?.advance?.toString() || "",
            variance: data.locationMetrics?.variance?.toString() || "",
            varianceReason: data.locationMetrics?.varianceReason || "",
            amountToCollect:
              data.locationMetrics?.amountToCollect?.toString() || "",
            collectedAmount:
              data.locationMetrics?.collectedAmount?.toString() || "",
            balanceCorrection:
              data.locationMetrics?.balanceCorrection?.toString() || "",
            balanceCorrectionReason:
              data.locationMetrics?.correctionReason || "",
            previousBalance:
              data.locationMetrics?.previousBalanceOwed?.toString() || "",
            reasonForShortagePayment:
              data.locationMetrics?.reasonForShortage || "",
          });
        })
        .catch((error) => {
          console.error("Error loading report:", error);
          toast.error("Failed to load report data");
        });
    }
  }, [show, reportId]);

  // Load collections
  useEffect(() => {
    if (show && reportId) {
      setIsLoadingCollections(true);
      fetchCollectionsByReportId(reportId)
        .then((collections) => {
          setCollectedMachineEntries(collections);
          if (collections.length > 0) {
            const firstMachine = collections[0];
            if (firstMachine.location) {
              const matchingLocation = locations.find(
                (loc) => loc.name === firstMachine.location
              );
              if (matchingLocation) {
                setSelectedLocationId(String(matchingLocation._id));
                // Don't auto-select the machine - let user choose
                setSelectedMachineId("");
              }
            }
          }
        })
        .catch(() => setCollectedMachineEntries([]))
        .finally(() => setIsLoadingCollections(false));
    }
  }, [show, reportId, locations]);

  // Reset form when modal closes
  useEffect(() => {
    if (!show) {
      // Reset all state
      setReportData(null);
      setSelectedLocationId("");
      setSelectedLocationName("");
      setSelectedMachineId("");
      setCollectedMachineEntries([]);
      setEditingEntryId(null);
      setHasChanges(false);
      setCurrentCollectionTime(new Date());
      setCurrentMetersIn("");
      setCurrentMetersOut("");
      setCurrentMachineNotes("");
      setCurrentRamClear(false);
      setFinancials({
        taxes: "",
        advance: "",
        variance: "",
        varianceReason: "",
        amountToCollect: "",
        collectedAmount: "",
        balanceCorrection: "0",
        balanceCorrectionReason: "",
        previousBalance: "0",
        reasonForShortagePayment: "",
      });
      setBaseBalanceCorrection("");
    }
  }, [show]);

  // Real-time validation for meter inputs
  const validateMeterInputs = useCallback(() => {
    if (!machineForDataEntry || !currentMetersIn || !currentMetersOut) {
      return;
    }

    // Check if RAM Clear meters are missing (but don't return early)
    const ramClearMetersMissing =
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut);

    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      machineForDataEntry?.collectionMeters?.metersIn,
      machineForDataEntry?.collectionMeters?.metersOut,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
    );

    // Combine validation warnings with RAM Clear meters missing warning
    const allWarnings = [...(validation.warnings || [])];
    if (ramClearMetersMissing) {
      allWarnings.push(
        "Please enter last meters before Ram clear (or rollover)"
      );
    }

  }, [
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    userId,
    currentRamClear,
  ]);

  // Validate on input changes
  useEffect(() => {
    validateMeterInputs();
  }, [validateMeterInputs]);

  const confirmAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing || !selectedMachineId || !machineForDataEntry || !userId) {
      toast.error("Please select a machine and ensure you're logged in.");
      return;
    }

    // Use enhanced validation with RAM Clear support
    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      machineForDataEntry?.collectionMeters?.metersIn,
      machineForDataEntry?.collectionMeters?.metersOut,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
    );

    if (!validation.isValid) {
      toast.error(validation.error || "Validation failed");
      return;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach((warning) => {
        toast.warning(warning);
      });
    }

    setIsProcessing(true);

    try {
      const metersIn = Number(currentMetersIn);
      const metersOut = Number(currentMetersOut);

      // Calculate movement with RAM Clear support
      const previousMeters = {
        metersIn: machineForDataEntry?.collectionMeters?.metersIn || 0,
        metersOut: machineForDataEntry?.collectionMeters?.metersOut || 0,
      };
      const movement = calculateMovement(
        metersIn,
        metersOut,
        previousMeters,
        currentRamClear,
        undefined, // ramClearCoinIn (legacy)
        undefined, // ramClearCoinOut (legacy)
        currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
        currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
      );

      const entryData = {
        machineId: selectedMachineId,
        machineName: machineForDataEntry.name,
        machineCustomName: selectedMachineId,
        serialNumber: machineForDataEntry.serialNumber,
        timestamp: currentCollectionTime,
        metersIn,
        metersOut,
        prevIn: machineForDataEntry.collectionMeters?.metersIn || 0,
        prevOut: machineForDataEntry.collectionMeters?.metersOut || 0,
        softMetersIn: metersIn,
        softMetersOut: metersOut,
        notes: currentMachineNotes,
        ramClear: currentRamClear,
        ramClearMetersIn: currentRamClearMetersIn
          ? Number(currentRamClearMetersIn)
          : undefined,
        ramClearMetersOut: currentRamClearMetersOut
          ? Number(currentRamClearMetersOut)
          : undefined,
        useCustomTime: true,
        selectedDate: currentCollectionTime.toISOString().split("T")[0],
        timeHH: String(currentCollectionTime.getHours()).padStart(2, "0"),
        timeMM: String(currentCollectionTime.getMinutes()).padStart(2, "0"),
        isCompleted: false,
        collector: userId,
        location: selectedLocation?.name || "",
        locationReportId: reportId,
        movement: movement,
      };

      if (editingEntryId) {
        await updateMachineCollection(editingEntryId, entryData);
        toast.success("Machine updated!");
      } else {
        await axios.post("/api/collections", entryData);
        toast.success("Machine added!");
      }

      // Clear the collected machines list and refetch to show latest data
      setCollectedMachineEntries([]);
      setIsLoadingCollections(true);

      // Refetch collections for this report
      try {
        const updatedCollections = await fetchCollectionsByReportId(reportId);
        setCollectedMachineEntries(updatedCollections);
      } catch (error) {
        console.error("Error refetching collections after update:", error);
      } finally {
        setIsLoadingCollections(false);
      }

      setHasChanges(true);

      // Refresh machines data to show updated values
      if (onRefresh) {
        onRefresh();
      }

      // Clear editing state but keep form populated and machine selected
      setEditingEntryId(null);
      // Keep the machine selected and form populated so user can continue working
    } catch (error) {
      console.error("Failed to add/update machine:", error);
      toast.error("Failed to add/update machine. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    currentCollectionTime,
    currentMachineNotes,
    currentRamClear,
    userId,
    selectedLocation,
    reportId,
    editingEntryId,
    onRefresh,
  ]);

  const handleAddOrUpdateEntry = useCallback(() => {
    if (isProcessing || !selectedMachineId || !machineForDataEntry || !userId) {
      toast.error("Please select a machine and ensure you're logged in.");
      return;
    }

    // Check if RAM Clear meters are mandatory when RAM Clear is checked
    if (
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut)
    ) {
      toast.error(
        "RAM Clear Meters In and Out are required when RAM Clear is checked"
      );
      return;
    }

    // If updating an existing entry, show confirmation dialog
    if (editingEntryId) {
      setShowUpdateConfirmation(true);
      return;
    }

    // If adding a new entry, proceed directly
    confirmAddOrUpdateEntry();
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    userId,
    currentRamClear,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    editingEntryId,
    confirmAddOrUpdateEntry,
  ]);

  // Confirmation dialog handlers
  const confirmUpdateEntry = useCallback(() => {
    setShowUpdateConfirmation(false);
    confirmAddOrUpdateEntry();
  }, [confirmAddOrUpdateEntry]);

  const handleEditEntry = useCallback(
    (entryId: string) => {
      const entry = collectedMachineEntries.find((e) => e._id === entryId);
      if (entry) {
        setSelectedMachineId(entry.machineId);
        setCurrentCollectionTime(new Date(entry.timestamp));
        // Use movement values if available (for RAM Clear), otherwise use raw values
        const metersIn = entry.movement?.metersIn ?? entry.metersIn;
        const metersOut = entry.movement?.metersOut ?? entry.metersOut;
        setCurrentMetersIn(String(metersIn));
        setCurrentMetersOut(String(metersOut));
        setCurrentMachineNotes(entry.notes || "");
        setCurrentRamClear(entry.ramClear || false);
        // Set RAM Clear meters if they exist
        if (entry.ramClear) {
          setCurrentRamClearMetersIn(String(entry.ramClearMetersIn || 0));
          setCurrentRamClearMetersOut(String(entry.ramClearMetersOut || 0));
        }
        setEditingEntryId(entryId);

        // Show correct machine identifier in priority order
        const machineIdentifier =
          entry.serialNumber ||
          entry.machineName ||
          entry.machineCustomName ||
          entry.machineId;
        toast.info(
          `Editing ${machineIdentifier}. Make changes and click 'Update Entry'.`
        );
      }
    },
    [collectedMachineEntries]
  );

  const handleDeleteEntry = useCallback(
    (entryId: string) => {
      if (isProcessing) return;

      // Check if this is the last collection
      if (collectedMachineEntries.length === 1) {
        toast.error(
          "Cannot delete the last collection. A collection report must have at least one machine. Please add another machine before deleting this one.",
          {
            duration: 5000,
            position: "top-right",
          }
        );
        return;
      }

      setEntryToDelete(entryId);
      setShowDeleteConfirmation(true);
    },
    [isProcessing, collectedMachineEntries.length]
  );

  const confirmDeleteEntry = useCallback(async () => {
    if (!entryToDelete) return;

    setIsProcessing(true);
    try {
      await deleteMachineCollection(entryToDelete);
      toast.success("Machine deleted!");

      // Clear the collected machines list and refetch to show latest data
      setCollectedMachineEntries([]);
      setIsLoadingCollections(true);

      // Refetch collections for this report
      try {
        const updatedCollections = await fetchCollectionsByReportId(reportId);
        setCollectedMachineEntries(updatedCollections);
      } catch (error) {
        console.error("Error refetching collections after delete:", error);
      } finally {
        setIsLoadingCollections(false);
      }

      setHasChanges(true);

      // Refresh machines data to show updated values
      if (onRefresh) {
        onRefresh();
      }

      // Keep the machine selected and form populated so user can continue working

      // Close confirmation dialog
      setShowDeleteConfirmation(false);
      setEntryToDelete(null);
    } catch {
      toast.error("Failed to delete machine");
    } finally {
      setIsProcessing(false);
    }
  }, [entryToDelete, reportId, onRefresh]);

  const handleUpdateReport = useCallback(async () => {
    if (isProcessing || !userId || !reportData) {
      toast.error("Missing required data.");
      return;
    }

    // Check if there are any collections
    if (collectedMachineEntries.length === 0) {
      toast.error(
        "Cannot update report. At least one machine must be added to the collection report.",
        {
          duration: 5000,
          position: "top-right",
        }
      );
      return;
    }

    setIsProcessing(true);
    try {
      const updateData = {
        ...reportData,
        variance: Number(financials.variance) || 0,
        previousBalance: Number(financials.previousBalance) || 0,
        amountToCollect: Number(financials.amountToCollect) || 0,
        amountCollected: Number(financials.collectedAmount) || 0,
        taxes: Number(financials.taxes) || 0,
        advance: Number(financials.advance) || 0,
        varianceReason: financials.varianceReason,
        reasonShortagePayment: financials.reasonForShortagePayment,
        balanceCorrection: Number(financials.balanceCorrection) || 0,
        balanceCorrectionReas: financials.balanceCorrectionReason,
      };

      await updateCollectionReport(reportId, updateData);
      toast.success("Report updated successfully!");

      setHasChanges(true);
      handleClose();
    } catch (error) {
      console.error("Failed to update report:", error);
      toast.error("Failed to update report. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    userId,
    reportData,
    financials,
    reportId,
    handleClose,
    collectedMachineEntries,
  ]);

  const isUpdateReportEnabled = useMemo(() => {
    return (
      collectedMachineEntries.length > 0 &&
      financials.variance !== "" &&
      financials.advance !== "" &&
      financials.taxes !== "" &&
      financials.previousBalance !== "" &&
      financials.collectedAmount !== ""
    );
  }, [collectedMachineEntries, financials]);

  if (!show) return null;

  return (
    <>
      <Dialog
        open={show}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleClose();
          }
        }}
      >
      <DialogContent
        className="max-w-5xl h-[calc(100vh-2rem)] md:h-[90vh] p-0 flex flex-col bg-container"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 md:p-6 pb-0">
          <DialogTitle className="text-xl md:text-2xl font-bold">
            Edit Collection Report
          </DialogTitle>
        </DialogHeader>

            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
              {/* Mobile: Full width, Desktop: 1/4 width */}
              <div className="w-full lg:w-1/4 border-b lg:border-b-0 lg:border-r border-gray-300 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
                <LocationSelect
                  value={selectedLocationId}
                  onValueChange={setSelectedLocationId}
                  locations={locations.map((loc) => ({
                    _id: String(loc._id),
                    name: loc.name,
                  }))}
                  placeholder="Select Location"
                  disabled={isProcessing}
                  className="w-full"
                  emptyMessage="No locations found"
                />

                <div className="flex-grow space-y-2 min-h-[100px]">
                  {selectedLocationId ? (
                    machinesOfSelectedLocation.length > 0 ? (
                      machinesOfSelectedLocation.map((machine) => (
                        <Button
                          key={String(machine._id)}
                          variant={
                            selectedMachineId === machine._id
                              ? "secondary"
                              : collectedMachineEntries.find(
                                  (e) => e.machineId === machine._id
                                )
                              ? "default"
                              : "outline"
                          }
                          className={`w-full justify-start text-left h-auto py-2 px-3 whitespace-normal ${
                            collectedMachineEntries.find(
                              (e) => e.machineId === machine._id
                            ) && !editingEntryId
                              ? "opacity-60 cursor-not-allowed"
                              : ""
                          }`}
                          onClick={() => {
                            if (
                              collectedMachineEntries.find(
                                (e) => e.machineId === machine._id
                              ) &&
                              !editingEntryId
                            ) {
                              toast.info(
                                `${machine.name} is already in the list. Click edit on the right to modify.`
                              );
                              return;
                            }
                            setSelectedMachineId(String(machine._id));
                          }}
                          disabled={
                            isProcessing ||
                            (editingEntryId !== null &&
                              collectedMachineEntries.find(
                                (e) => e._id === editingEntryId
                              )?.machineId !== machine._id) ||
                            (collectedMachineEntries.find(
                              (e) => e.machineId === machine._id
                            ) &&
                              !editingEntryId)
                          }
                        >
                          {machine.name} ({getSerialNumberIdentifier(machine)})
                          {collectedMachineEntries.find(
                            (e) => e.machineId === machine._id
                          ) &&
                            !editingEntryId && (
                              <span className="ml-auto text-xs text-green-500">
                                (Added)
                              </span>
                            )}
                        </Button>
                      ))
                    ) : (
                      <p className="text-xs md:text-sm text-grayHighlight pt-2">
                        No machines for this location.
                      </p>
                    )
                  ) : (
                    <p className="text-xs md:text-sm text-grayHighlight pt-2">
                      Select a location to see machines.
                    </p>
                  )}
                </div>
              </div>

              {/* Mobile: Full width, Desktop: 2/4 width */}
              <div className="w-full lg:w-2/4 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
                {(selectedMachineId && machineForDataEntry) ||
                collectedMachineEntries.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-grayHighlight">
                        {selectedLocationName} (Prev. Collection:{" "}
                        {machineForDataEntry?.collectionTime
                          ? formatDate(machineForDataEntry.collectionTime)
                          : "N/A"}
                        )
                      </p>
                    </div>

                    <Button
                      variant="default"
                      className="w-full bg-lighterBlueHighlight text-primary-foreground"
                    >
                      {machineForDataEntry ? (
                        <>
                          {machineForDataEntry.name} (
                          {getSerialNumberIdentifier(machineForDataEntry)})
                        </>
                      ) : (
                        "Select a machine to edit"
                      )}
                    </Button>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-grayHighlight mb-2">
                        Collection Time:
                      </label>
                      <SimpleDateTimePicker
                        date={currentCollectionTime}
                        setDate={(date) => {
                          if (date) {
                            setCurrentCollectionTime(date);
                          }
                        }}
                        disabled={!machineForDataEntry || isProcessing}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Meters In:
                        </label>
                        <div>
                          <Input
                            type="text"
                            placeholder="0"
                            value={currentMetersIn}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                setCurrentMetersIn(val);
                              }
                            }}
                            disabled={!machineForDataEntry || isProcessing}
                          />
                        </div>
                        <p className="text-xs text-grayHighlight mt-1">
                          Prev In:{" "}
                          {machineForDataEntry?.collectionMeters?.metersIn ||
                            "N/A"}
                        </p>
                        {/* Regular Meters In Validation */}
                        {currentMetersIn && machineForDataEntry?.collectionMeters?.metersIn && 
                         Number(currentMetersIn) < Number(machineForDataEntry.collectionMeters.metersIn) && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-xs">
                              Warning: Meters In ({currentMetersIn}) should be higher than or equal to Previous Meters In ({machineForDataEntry.collectionMeters.metersIn})
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Meters Out:
                        </label>
                        <div>
                          <Input
                            type="text"
                            placeholder="0"
                            value={currentMetersOut}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                setCurrentMetersOut(val);
                              }
                            }}
                            disabled={!machineForDataEntry || isProcessing}
                          />
                        </div>
                        <p className="text-xs text-grayHighlight mt-1">
                          Prev Out:{" "}
                          {machineForDataEntry?.collectionMeters?.metersOut ||
                            "N/A"}
                        </p>
                        {/* Regular Meters Out Validation */}
                        {currentMetersOut && machineForDataEntry?.collectionMeters?.metersOut && 
                         Number(currentMetersOut) < Number(machineForDataEntry.collectionMeters.metersOut) && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-xs">
                              Warning: Meters Out ({currentMetersOut}) should be higher than or equal to Previous Meters Out ({machineForDataEntry.collectionMeters.metersOut})
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RAM Clear Meter Inputs - Only show when RAM Clear is checked */}
                    {currentRamClear && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 mb-3">
                          RAM Clear Meters (Before Rollover)
                        </h4>
                        <p className="text-xs text-blue-600 mb-3">
                          Please enter the last meter readings before the RAM
                          Clear occurred.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1">
                              RAM Clear Meters In:
                            </label>
                            <Input
                              type="text"
                              placeholder="0"
                              value={currentRamClearMetersIn}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                  setCurrentRamClearMetersIn(val);
                                }
                              }}
                              disabled={!machineForDataEntry || isProcessing}
                              className={`border-blue-300 focus:border-blue-500 ${
                                currentRamClearMetersIn && machineForDataEntry?.collectionMeters?.metersIn && 
                                Number(currentRamClearMetersIn) > Number(machineForDataEntry.collectionMeters.metersIn)
                                  ? "border-red-500 focus:border-red-500"
                                  : ""
                              }`}
                            />
                            {/* RAM Clear Meters In Validation */}
                            {currentRamClearMetersIn && machineForDataEntry?.collectionMeters?.metersIn && 
                             Number(currentRamClearMetersIn) > Number(machineForDataEntry.collectionMeters.metersIn) && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-600 text-xs">
                                  Warning: RAM Clear Meters In ({currentRamClearMetersIn}) should be lower than or equal to Previous Meters In ({machineForDataEntry.collectionMeters.metersIn})
                                </p>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1">
                              RAM Clear Meters Out:
                            </label>
                            <Input
                              type="text"
                              placeholder="0"
                              value={currentRamClearMetersOut}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                                  setCurrentRamClearMetersOut(val);
                                }
                              }}
                              disabled={!machineForDataEntry || isProcessing}
                              className={`border-blue-300 focus:border-blue-500 ${
                                currentRamClearMetersOut && machineForDataEntry?.collectionMeters?.metersOut && 
                                Number(currentRamClearMetersOut) > Number(machineForDataEntry.collectionMeters.metersOut)
                                  ? "border-red-500 focus:border-red-500"
                                  : ""
                              }`}
                            />
                            {/* RAM Clear Meters Out Validation */}
                            {currentRamClearMetersOut && machineForDataEntry?.collectionMeters?.metersOut && 
                             Number(currentRamClearMetersOut) > Number(machineForDataEntry.collectionMeters.metersOut) && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-600 text-xs">
                                  Warning: RAM Clear Meters Out ({currentRamClearMetersOut}) should be lower than or equal to Previous Meters Out ({machineForDataEntry.collectionMeters.metersOut})
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}


                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="ramClearCheckbox"
                        checked={currentRamClear}
                        onChange={(e) => {
                          setCurrentRamClear(e.target.checked);
                          if (!e.target.checked) {
                            // Clear RAM Clear meter fields when unchecked
                            setCurrentRamClearMetersIn("");
                            setCurrentRamClearMetersOut("");
                          }
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        disabled={!machineForDataEntry || isProcessing}
                      />
                      <label
                        htmlFor="ramClearCheckbox"
                        className="text-sm font-medium text-gray-700"
                      >
                        RAM Clear
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-grayHighlight mb-1 mt-2">
                        Notes (for this machine):
                      </label>
                      <div>
                        <Textarea
                          placeholder="Machine-specific notes..."
                          value={currentMachineNotes}
                          onChange={(e) =>
                            setCurrentMachineNotes(e.target.value)
                          }
                          className="min-h-[60px]"
                          disabled={!machineForDataEntry || isProcessing}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={
                        machineForDataEntry ? handleAddOrUpdateEntry : () => {}
                      }
                      className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!machineForDataEntry || isProcessing}
                    >
                      {isProcessing
                        ? "Processing..."
                        : editingEntryId
                        ? "Update Entry in List"
                        : "Add Machine to List"}
                    </Button>

                    <hr className="my-4 border-gray-300" />
                    <p className="text-lg font-semibold text-center text-gray-700">
                      Shared Financials for Report
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Taxes:
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.taxes}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d*$/.test(val) || val === "") {
                              setFinancials((prev) => ({
                                ...prev,
                                taxes: val,
                              }));
                            }
                          }}
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Advance:
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.advance}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d*$/.test(val) || val === "") {
                              setFinancials((prev) => ({
                                ...prev,
                                advance: val,
                              }));
                            }
                          }}
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Variance:
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.variance}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d*$/.test(val) || val === "") {
                              setFinancials((prev) => ({
                                ...prev,
                                variance: val,
                              }));
                            }
                          }}
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Variance Reason:
                        </label>
                        <Textarea
                          placeholder="Variance Reason"
                          value={financials.varianceReason}
                          onChange={(e) =>
                            setFinancials((prev) => ({
                              ...prev,
                              varianceReason: e.target.value,
                            }))
                          }
                          className="min-h-[40px]"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Amount To Collect:{" "}
                          <span className="text-xs text-gray-400">
                            (Auto-calculated)
                          </span>
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.amountToCollect}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Collected Amount:{" "}
                          <span className="text-xs text-gray-400">
                            (Optional)
                          </span>
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Input
                                  type="text"
                                  placeholder="0"
                                  value={financials.collectedAmount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^\d*\.?\d*$/.test(val) || val === "") {
                                      setFinancials((prev) => ({
                                        ...prev,
                                        collectedAmount: val,
                                      }));

                                      // Calculate previous balance and balance correction using setTimeout to avoid infinite loops
                                      setTimeout(() => {
                                        const amountCollected = Number(val) || 0;
                                        const amountToCollect = Number(financials.amountToCollect) || 0;
                                        
                                        // Previous balance = collected amount - amount to collect
                                        const previousBalance = amountCollected - amountToCollect;

                                        // Final correction = base entered first + collected amount
                                        const finalCorrection = (Number(baseBalanceCorrection) || 0) + amountCollected;

                                        setFinancials((prev) => ({
                                          ...prev,
                                          previousBalance: previousBalance.toString(),
                                          balanceCorrection: e.target.value === "" ? (baseBalanceCorrection || "0") : finalCorrection.toString(),
                                        }));
                                      }, 0);
                                    }
                                  }}
                                  disabled={isProcessing || (baseBalanceCorrection.trim() === "" && financials.balanceCorrection.trim() === "")}
                                />
                              </div>
                            </TooltipTrigger>
                            {isProcessing || (baseBalanceCorrection.trim() === "" && financials.balanceCorrection.trim() === "") ? (
                              <TooltipContent>
                                <p>
                                  {isProcessing
                                    ? "Please wait until processing completes."
                                    : "Enter a Balance Correction first, then the Collected Amount will unlock."}
                                </p>
                              </TooltipContent>
                            ) : null}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Balance Correction:{" "}
                          <span className="text-xs text-gray-400">
                            (Auto-sets to collected amount, editable)
                          </span>
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Input
                                  type="text"
                                  placeholder="0"
                                  value={financials.balanceCorrection}
                                  onChange={(e) => {
                                    const newBalanceCorrection = e.target.value;
                                    if (/^-?\d*\.?\d*$/.test(newBalanceCorrection) || newBalanceCorrection === "") {
                                      setFinancials((prev) => ({
                                        ...prev,
                                        balanceCorrection: newBalanceCorrection,
                                      }));
                                      setBaseBalanceCorrection(newBalanceCorrection);
                                    }
                                  }}
                                  className="bg-white border-gray-300 focus:border-primary"
                                  title="Balance correction amount (editable)"
                                  disabled={isProcessing || financials.collectedAmount.trim() !== ""}
                                />
                              </div>
                            </TooltipTrigger>
                            {isProcessing || financials.collectedAmount.trim() !== "" ? (
                              <TooltipContent>
                                <p>
                                  {isProcessing
                                    ? "Please wait until processing completes."
                                    : "Clear the Collected Amount to edit the Balance Correction."}
                                </p>
                              </TooltipContent>
                            ) : null}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Balance Correction Reason:
                        </label>
                        <Textarea
                          placeholder="Correction Reason"
                          value={financials.balanceCorrectionReason}
                          onChange={(e) =>
                            setFinancials((prev) => ({
                              ...prev,
                              balanceCorrectionReason: e.target.value,
                            }))
                          }
                          className="min-h-[40px]"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Previous Balance:
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.previousBalance}
                          className="bg-gray-100 border-gray-300 focus:border-primary cursor-not-allowed"
                          disabled={true}
                          title="Previous balance from last collection (read-only)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Reason For Shortage Payment:
                        </label>
                        <Textarea
                          placeholder="Shortage Reason"
                          value={financials.reasonForShortagePayment}
                          onChange={(e) =>
                            setFinancials((prev) => ({
                              ...prev,
                              reasonForShortagePayment: e.target.value,
                            }))
                          }
                          className="min-h-[40px]"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex items-center justify-center h-full">
                    <p className="text-grayHighlight text-base text-center">
                      Select a location and machine from the left to enter its
                      collection data.
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile: Full width, Desktop: 1/4 width */}
              <div className="w-full lg:w-1/4 border-t lg:border-t-0 lg:border-l border-gray-300 p-3 md:p-4 flex flex-col space-y-2 overflow-y-auto bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-700 mb-2 sticky top-0 bg-gray-50 py-1">
                  Collected Machines ({collectedMachineEntries.length})
                </h3>
                {isLoadingCollections ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="bg-white p-3 rounded-md shadow border border-gray-200 space-y-2"
                      >
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-6 w-6 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : collectedMachineEntries.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10">
                    No machines added to the list yet.
                  </p>
                ) : (
                  collectedMachineEntries.map((entry) => (
                    <div
                      key={entry._id}
                      className="bg-white p-3 rounded-md shadow border border-gray-200 space-y-1 relative"
                    >
                      <p className="font-semibold text-sm text-primary">
                        {entry.serialNumber ||
                          entry.machineName ||
                          entry.machineCustomName ||
                          entry.machineId}
                      </p>
                      <p className="text-xs text-gray-600">
                        Time: {formatDate(entry.timestamp)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Meters In:{" "}
                        {entry.ramClear
                          ? entry.movement?.metersIn || entry.metersIn
                          : entry.metersIn}{" "}
                        | Meters Out:{" "}
                        {entry.ramClear
                          ? entry.movement?.metersOut || entry.metersOut
                          : entry.metersOut}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-gray-600 italic">
                          Notes: {entry.notes}
                        </p>
                      )}
                      {entry.ramClear && (
                        <p className="text-xs text-red-600 font-semibold">
                          RAM Cleared
                        </p>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                          onClick={() => handleEditEntry(entry._id)}
                          disabled={isProcessing}
                        >
                          <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                          onClick={() => handleDeleteEntry(entry._id)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

        <DialogFooter className="p-4 md:p-6 pt-2 md:pt-4 flex justify-center border-t border-gray-300">
          <Button
            onClick={handleUpdateReport}
            className={`w-auto bg-button hover:bg-buttonActive text-base px-8 py-3 ${
              !isUpdateReportEnabled || isProcessing
                ? "cursor-not-allowed"
                : "cursor-pointer"
            }`}
            disabled={!isUpdateReportEnabled || isProcessing}
          >
            {isProcessing
              ? "UPDATING REPORT..."
              : collectedMachineEntries.length === 0
              ? "ADD MACHINES TO UPDATE REPORT"
              : "UPDATE REPORT"}
          </Button>
          {collectedMachineEntries.length === 0 && (
            <p className="text-sm text-red-600 text-center mt-2">
              At least one machine must be added to update the collection
              report
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <ConfirmationDialog
      isOpen={showDeleteConfirmation}
      onClose={() => {
        setShowDeleteConfirmation(false);
        setEntryToDelete(null);
      }}
      onConfirm={confirmDeleteEntry}
      title="Confirm Delete"
      message="Are you sure you want to delete this collection entry?"
      confirmText="Yes, Delete"
      cancelText="Cancel"
      isLoading={isProcessing}
    />

    {/* Update Confirmation Dialog */}
    <ConfirmationDialog
      isOpen={showUpdateConfirmation}
      onClose={() => setShowUpdateConfirmation(false)}
      onConfirm={confirmUpdateEntry}
      title="Confirm Update"
      message="Are you sure you want to update this collection entry?"
      confirmText="Yes, Update"
      cancelText="Cancel"
      isLoading={isProcessing}
    />
    </>
  );
}