"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Trash2, Edit3 } from "lucide-react";
import axios from "axios";
import type { CollectionDocument } from "@/lib/types/collections";
import type {
  CollectionReportLocationWithMachines,
  CollectionReportData,
} from "@/lib/types/api";
import {
  updateCollectionReport,
  calculateTotalAmountToCollect,
  calculateBalanceCorrection,
} from "@/lib/helpers/collectionReport";
import { calculateMovement } from "@/lib/utils/movementCalculation";
import { validateMachineEntry } from "@/lib/helpers/collectionReportModal";
import { updateCollection } from "@/lib/helpers/collections";
import { updateMachineCollectionHistory } from "@/lib/helpers/cabinets";
import { NewCollectionModalSkeleton } from "@/components/ui/skeletons/NewCollectionModalSkeleton";
import { useUserStore } from "@/lib/store/userStore";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/formatting";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
import { SimpleDateTimePicker } from "@/components/ui/simple-date-time-picker";

// Simple Select Component to avoid Radix UI issues - matches original styling
const SimpleSelect = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full bg-white border border-gray-300 text-gray-900 focus:ring-primary focus:border-primary px-3 py-2 rounded-md text-left flex items-center justify-between disabled:opacity-50 hover:border-gray-400"
      >
        <span>
          {options.find((opt) => opt.value === value)?.label || placeholder}
        </span>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.length > 0 ? (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 text-gray-700"
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="p-2 text-sm text-grayHighlight">
              No locations found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
  const [loadingReport, setLoadingReport] = useState(false);
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
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Financial state
  const [financials, setFinancials] = useState({
    taxes: "",
    advance: "",
    variance: "",
    varianceReason: "",
    amountToCollect: "",
    collectedAmount: "",
    balanceCorrection: "",
    balanceCorrectionReason: "",
    previousBalance: "",
    reasonForShortagePayment: "",
  });

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
    () => machinesOfSelectedLocation.find((m) => m._id === selectedMachineId),
    [machinesOfSelectedLocation, selectedMachineId]
  );

  // Update location name when location changes
  useEffect(() => {
    if (selectedLocation) {
      setSelectedLocationName(selectedLocation.name);
    } else {
      setSelectedLocationName("");
    }
  }, [selectedLocation]);

  const totalAmountToCollect = useMemo(() => {
    if (collectedMachineEntries.length === 0) return 0;
    return calculateTotalAmountToCollect(collectedMachineEntries);
  }, [collectedMachineEntries]);

  // Load report data
  useEffect(() => {
    if (show && reportId) {
      setLoadingReport(true);
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
        })
        .finally(() => setLoadingReport(false));
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

  // Auto-calculate amount to collect
  useEffect(() => {
    if (totalAmountToCollect > 0) {
      setFinancials((prev) => ({
        ...prev,
        amountToCollect: totalAmountToCollect.toString(),
      }));
    }
  }, [totalAmountToCollect]);

  // Auto-calculate balance correction
  useEffect(() => {
    const amountToCollect = Number(financials.amountToCollect) || 0;
    const collectedAmount = Number(financials.collectedAmount) || 0;

    if (amountToCollect !== 0 || collectedAmount !== 0) {
      const balanceCorrection = calculateBalanceCorrection(
        amountToCollect,
        collectedAmount
      );
      setFinancials((prev) => ({
        ...prev,
        balanceCorrection: balanceCorrection.toString(),
      }));
    }
  }, [financials.amountToCollect, financials.collectedAmount]);

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
        balanceCorrection: "",
        balanceCorrectionReason: "",
        previousBalance: "",
        reasonForShortagePayment: "",
      });
    }
  }, [show]);

  // Real-time validation for meter inputs
  const validateMeterInputs = useCallback(() => {
    if (!machineForDataEntry || !currentMetersIn || !currentMetersOut) {
      setValidationWarnings([]);
      return;
    }

    // Check if RAM Clear meters are missing (but don't return early)
    const ramClearMetersMissing = currentRamClear && (!currentRamClearMetersIn || !currentRamClearMetersOut);

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
      allWarnings.push("Please enter last meters before Ram clear (or rollover)");
    }
    
    setValidationWarnings(allWarnings);
  }, [selectedMachineId, machineForDataEntry, currentMetersIn, currentMetersOut, currentRamClearMetersIn, currentRamClearMetersOut, userId, currentRamClear]);

  // Validate on input changes
  useEffect(() => {
    validateMeterInputs();
  }, [validateMeterInputs]);

  const handleAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing || !selectedMachineId || !machineForDataEntry || !userId) {
      toast.error("Please select a machine and ensure you're logged in.");
      return;
    }

    // Check if RAM Clear meters are mandatory when RAM Clear is checked
    if (currentRamClear && (!currentRamClearMetersIn || !currentRamClearMetersOut)) {
      toast.error("RAM Clear Meters In and Out are required when RAM Clear is checked");
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
      validation.warnings.forEach(warning => {
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
        ramClearMetersIn: currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
        ramClearMetersOut: currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
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

      // Refresh collections
      const updatedCollections = await fetchCollectionsByReportId(reportId);
      setCollectedMachineEntries(updatedCollections);
      setHasChanges(true);
      
      // Refresh machines data to show updated values
      if (onRefresh) {
        onRefresh();
      }

      // Reset form
      setCurrentMetersIn("");
      setCurrentMetersOut("");
      setCurrentMachineNotes("");
      setCurrentRamClear(false);
      setEditingEntryId(null);
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

  const handleEditEntry = useCallback(
    (entryId: string) => {
      const entry = collectedMachineEntries.find((e) => e._id === entryId);
      if (entry) {
        setSelectedMachineId(entry.machineId);
        setCurrentCollectionTime(new Date(entry.timestamp));
        setCurrentMetersIn(String(entry.metersIn));
        setCurrentMetersOut(String(entry.metersOut));
        setCurrentMachineNotes(entry.notes || "");
        setCurrentRamClear(entry.ramClear || false);
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
    async (entryId: string) => {
      if (isProcessing) return;

      setIsProcessing(true);
      try {
        await deleteMachineCollection(entryId);
        toast.success("Machine deleted!");
        const updatedCollections = await fetchCollectionsByReportId(reportId);
        setCollectedMachineEntries(updatedCollections);
        setHasChanges(true);
        
        // Refresh machines data to show updated values
        if (onRefresh) {
          onRefresh();
        }
      } catch {
        toast.error("Failed to delete machine");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, reportId, onRefresh]
  );

  const handleUpdateReport = useCallback(async () => {
    if (isProcessing || !userId || !reportData) {
      toast.error("Missing required data.");
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
  }, [isProcessing, userId, reportData, financials, reportId, handleClose]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content - EXACT SAME LAYOUT AS ORIGINAL */}
      <div
        className="relative max-w-5xl w-full h-[calc(100vh-2rem)] md:h-[90vh] mx-4 bg-white rounded-lg shadow-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loadingReport ? (
          <NewCollectionModalSkeleton />
        ) : (
          <>
            <div className="p-4 md:p-6 pb-0 border-b">
              <h2 className="text-xl md:text-2xl font-bold">
                Edit Collection Report
              </h2>
              <p className="text-sm text-muted-foreground">
                Update machine collection data and financial information for
                this report.
              </p>
            </div>

            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
              {/* Mobile: Full width, Desktop: 1/4 width */}
              <div className="w-full lg:w-1/4 border-b lg:border-b-0 lg:border-r border-gray-300 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
                <SimpleSelect
                  value={selectedLocationId}
                  onChange={setSelectedLocationId}
                  options={locations.map((loc) => ({
                    value: String(loc._id),
                    label: loc.name,
                  }))}
                  placeholder="Select Location"
                  disabled={isProcessing}
                />

                <div className="relative">
                  <Input
                    placeholder="Search Locations..."
                    className="pr-10"
                    value=""
                    disabled
                    onChange={() => {}}
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grayHighlight" />
                </div>

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
                      </div>
                    </div>

                    {/* RAM Clear Meter Inputs - Only show when RAM Clear is checked */}
                    {currentRamClear && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 mb-3">
                          RAM Clear Meters (Before Rollover)
                        </h4>
                        <p className="text-xs text-blue-600 mb-3">
                          Please enter the last meter readings before the RAM Clear occurred.
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
                              className="border-blue-300 focus:border-blue-500"
                            />
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
                              className="border-blue-300 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RAM Clear Validation Warnings */}
                    {validationWarnings.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              RAM Clear Validation Warning
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              {validationWarnings.map((warning, index) => (
                                <p key={index} className="mb-1">{warning}</p>
                              ))}
                            </div>
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
                            }
                          }}
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grayHighlight mb-1">
                          Balance Correction:{" "}
                          <span className="text-xs text-gray-400">
                            (Auto-calculated)
                          </span>
                        </label>
                        <Input
                          type="text"
                          placeholder="0"
                          value={financials.balanceCorrection}
                          readOnly
                          className="bg-gray-100 cursor-not-allowed"
                        />
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
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d*$/.test(val) || val === "") {
                              setFinancials((prev) => ({
                                ...prev,
                                previousBalance: val,
                              }));
                            }
                          }}
                          disabled={isProcessing}
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
                        Meters In: {entry.ramClear ? entry.movement?.metersIn || entry.metersIn : entry.metersIn} | Meters Out:{" "}
                        {entry.ramClear ? entry.movement?.metersOut || entry.metersOut : entry.metersOut}
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

            <div className="p-4 md:p-6 pt-2 md:pt-4 flex justify-center border-t border-gray-300">
              <Button
                onClick={handleUpdateReport}
                className={`w-auto bg-button hover:bg-buttonActive text-base px-8 py-3 ${
                  !isUpdateReportEnabled || isProcessing
                    ? "cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                disabled={!isUpdateReportEnabled || isProcessing}
              >
                {isProcessing ? "UPDATING REPORT..." : "UPDATE REPORT"}
              </Button>
            </div>
          </>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}
