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
  CollectionReportMachineSummary,
} from "@/lib/types/api";
import { updateCollectionReport } from "@/lib/helpers/collectionReport";
import { updateCollection } from "@/lib/helpers/collections";
// import { calculateMovement } from "@/lib/utils/movementCalculation";
import { validateMachineEntry } from "@/lib/helpers/collectionReportModal";
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

type EditCollectionModalProps = {
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
  // Add cache-busting parameter to ensure fresh data
  const res = await axios.get(
    `/api/collections?locationReportId=${reportId}&_t=${Date.now()}`
  );
  console.warn("🔍 fetchCollectionsByReportId result:", {
    reportId,
    collectionsCount: res.data.length,
    collections: res.data,
  });
  return res.data;
}

async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  // First get the collection to find the machineId and previous values
  const collection = await axios.get(`/api/collections?id=${id}`);
  const collectionData = collection.data;

  console.warn("🔄 Deleting collection with reversion data:", {
    collectionId: id,
    machineId: collectionData.machineId,
    prevIn: collectionData.prevIn,
    prevOut: collectionData.prevOut,
    metersIn: collectionData.metersIn,
    metersOut: collectionData.metersOut,
  });

  // Delete the collection document (this will also revert machine collectionMeters)
  const res = await axios.delete(`/api/collections?id=${id}`);

  // Also delete from machine's collection history
  if (collectionData && collectionData.machineId) {
    console.warn("🔄 Deleting from machine collection history:", {
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

export default function EditCollectionModal({
  show,
  onClose,
  reportId,
  locations = [],
  onRefresh,
}: EditCollectionModalProps) {
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
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Edit functionality state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);

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
  const [prevIn, setPrevIn] = useState<number | null>(null);
  const [prevOut, setPrevOut] = useState<number | null>(null);

  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

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
  const [baseBalanceCorrection, setBaseBalanceCorrection] =
    useState<string>("");

  // Derived state
  const selectedLocation = useMemo(
    () => locations.find((l) => String(l._id) === selectedLocationId),
    [locations, selectedLocationId]
  );

  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);

  // Always fetch fresh machine data when location changes
  useEffect(() => {
    if (selectedLocationId) {
      console.warn(
        "🔄 ALWAYS fetching fresh machines for location from API:",
        selectedLocationId
      );

      const fetchMachinesForLocation = async () => {
        try {
          // Add cache-busting parameter to ensure fresh machine data
          const response = await axios.get(
            `/api/machines?locationId=${selectedLocationId}&_t=${Date.now()}`
          );
          if (response.data?.success && response.data?.data) {
            console.warn(
              "🔄 Fresh machines fetched from API:",
              response.data.data.length,
              "machines"
            );
            console.warn(
              "🔄 Machine meter data:",
              response.data.data.map((m: CollectionReportMachineSummary) => ({
                name: m.name,
                serialNumber: m.serialNumber,
                collectionMeters: m.collectionMeters,
              }))
            );
            setMachinesOfSelectedLocation(response.data.data);
          } else {
            console.warn("🔄 No machines found in API response");
            setMachinesOfSelectedLocation([]);
          }
        } catch (error) {
          console.error("Error fetching machines for location:", error);
          setMachinesOfSelectedLocation([]);
        }
      };

      fetchMachinesForLocation();
    } else {
      setMachinesOfSelectedLocation([]);
    }
  }, [selectedLocationId]);

  const machineForDataEntry = useMemo(
    () =>
      machinesOfSelectedLocation.find(
        (m) => String(m._id) === selectedMachineId
      ),
    [machinesOfSelectedLocation, selectedMachineId]
  );

  // Function to handle clicks on disabled input fields
  const handleDisabledFieldClick = useCallback(() => {
    if (!machineForDataEntry) {
      toast.warning("Please select a machine first", {
        duration: 3000,
        position: "top-right",
      });
    }
  }, [machineForDataEntry]);

  // Calculate amount to collect based on machine entries and financial inputs
  const calculateAmountToCollect = useCallback(() => {
    console.warn(
      "🔄 Calculating amount to collect with entries:",
      collectedMachineEntries.length
    );

    if (!collectedMachineEntries.length) {
      console.warn("🔄 No machine entries, setting amount to collect to 0");
      setFinancials((prev) => ({ ...prev, amountToCollect: "0" }));
      return;
    }

    // Calculate total movement data from all machine entries
    const totalMovementData = collectedMachineEntries.map((entry) => {
      const drop = (entry.metersIn || 0) - (entry.prevIn || 0);
      const cancelledCredits = (entry.metersOut || 0) - (entry.prevOut || 0);
      const gross = drop - cancelledCredits;
      console.warn("🔄 Machine movement calculation:", {
        machineId: entry.machineId,
        metersIn: entry.metersIn,
        prevIn: entry.prevIn,
        metersOut: entry.metersOut,
        prevOut: entry.prevOut,
        drop,
        cancelledCredits,
        gross,
      });
      return {
        drop,
        cancelledCredits,
        gross,
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

    console.warn("🔄 Total movement data:", reportTotalData);

    // Get financial values
    const taxes = Number(financials.taxes) || 0;
    const variance = Number(financials.variance) || 0;
    const advance = Number(financials.advance) || 0;

    // Use the location's previous balance, not the calculated one
    const locationPreviousBalance = selectedLocation?.collectionBalance || 0;

    // Get profit share from selected location (default to 50% if not available)
    const profitShare = selectedLocation?.profitShare || 50;

    console.warn("🔄 Financial inputs:", {
      taxes,
      variance,
      advance,
      locationPreviousBalance,
      profitShare,
    });

    // Calculate partner profit: Math.floor((gross - variance - advance) * profitShare / 100) - taxes
    const partnerProfit =
      Math.floor(
        ((reportTotalData.gross - variance - advance) * profitShare) / 100
      ) - taxes;

    // Calculate amount to collect: gross - variance - advance - partnerProfit + locationPreviousBalance
    const amountToCollect =
      reportTotalData.gross -
      variance -
      advance -
      partnerProfit +
      locationPreviousBalance;

    console.warn("🔄 Final calculation:", {
      gross: reportTotalData.gross,
      variance,
      advance,
      partnerProfit,
      locationPreviousBalance,
      amountToCollect,
    });

    setFinancials((prev) => ({
      ...prev,
      amountToCollect: amountToCollect.toString(),
    }));
  }, [
    collectedMachineEntries,
    financials.taxes,
    financials.variance,
    financials.advance,
    selectedLocation?.collectionBalance,
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

  // Load collections with fresh data fetching
  useEffect(() => {
    if (show && reportId) {
      console.warn(
        "🔄 EditCollectionModal opened - fetching fresh collections data for report:",
        reportId
      );
      setIsLoadingCollections(true);
      fetchCollectionsByReportId(reportId)
        .then((collections) => {
          console.warn(
            "🔄 Fresh collections fetched:",
            collections.length,
            "collections"
          );
          setCollectedMachineEntries(collections);
          if (collections.length > 0) {
            const firstMachine = collections[0];
            if (firstMachine.location) {
              const matchingLocation = locations.find(
                (loc) => loc.name === firstMachine.location
              );
              if (matchingLocation) {
                console.warn(
                  "🔄 Auto-selecting location:",
                  matchingLocation.name
                );
                setSelectedLocationId(String(matchingLocation._id));
                // Don't auto-select the machine - let user choose
                setSelectedMachineId("");
              }
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching collections:", error);
          setCollectedMachineEntries([]);
        })
        .finally(() => setIsLoadingCollections(false));
    }
  }, [show, reportId, locations]);

  // Always fetch fresh machine data when modal opens to ensure latest meter values
  useEffect(() => {
    if (show && locations.length > 0) {
      console.warn(
        "🔄 EditCollectionModal opened - ensuring fresh machine data is available"
      );

      // Trigger a refresh of the parent component's data if onRefresh is available
      if (onRefresh) {
        console.warn(
          "🔄 Triggering parent data refresh to ensure fresh locations and machines data"
        );
        onRefresh();
      }
    }
  }, [show, onRefresh, locations.length]);

  // Reset form when modal closes
  useEffect(() => {
    if (!show) {
      // Reset all state
      setReportData(null);
      setSelectedLocationId("");
      setSelectedLocationName("");
      setSelectedMachineId("");
      setCollectedMachineEntries([]);
      setHasChanges(false);
      setCurrentCollectionTime(new Date());
      setCurrentMetersIn("");
      setCurrentMetersOut("");
      setCurrentMachineNotes("");
      setCurrentRamClear(false);
      setEditingEntryId(null);
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
    console.warn("🔄 Validating meter inputs:", {
      hasMachine: !!machineForDataEntry,
      metersIn: currentMetersIn,
      metersOut: currentMetersOut,
      ramClear: currentRamClear,
      ramClearMetersIn: currentRamClearMetersIn,
      ramClearMetersOut: currentRamClearMetersOut,
    });

    if (!machineForDataEntry || !currentMetersIn || !currentMetersOut) {
      console.warn("🔄 Validation skipped - missing required data");
      return;
    }

    // Check if RAM Clear meters are missing (but don't return early)
    const ramClearMetersMissing =
      currentRamClear &&
      (!currentRamClearMetersIn || !currentRamClearMetersOut);

    console.warn("🔄 RAM Clear meters missing:", ramClearMetersMissing);

    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      prevIn || 0,
      prevOut || 0,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined
    );

    console.warn("🔄 Validation result:", {
      isValid: validation.isValid,
      error: validation.error,
      warnings: validation.warnings,
    });

    // Combine validation warnings with RAM Clear meters missing warning
    const allWarnings = [...(validation.warnings || [])];
    if (ramClearMetersMissing) {
      allWarnings.push(
        "Please enter last meters before Ram clear (or rollover)"
      );
    }

    if (allWarnings.length > 0) {
      console.warn("🔄 All warnings:", allWarnings);
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
    prevIn,
    prevOut,
  ]);

  // Validate on input changes
  useEffect(() => {
    validateMeterInputs();
  }, [validateMeterInputs]);

  // Set prevIn/prevOut values when machineForDataEntry changes (for new entries)
  useEffect(() => {
    if (machineForDataEntry && !editingEntryId) {
      console.warn(
        "🔍 Setting prevIn/prevOut from machineForDataEntry for new entry:",
        {
          machineId: machineForDataEntry._id,
          collectionMeters: machineForDataEntry.collectionMeters,
        }
      );

      if (machineForDataEntry.collectionMeters) {
        const metersIn = machineForDataEntry.collectionMeters.metersIn || 0;
        const metersOut = machineForDataEntry.collectionMeters.metersOut || 0;
        console.warn("🔍 Setting prevIn/prevOut from collectionMeters:", {
          metersIn,
          metersOut,
          originalMetersIn: machineForDataEntry.collectionMeters.metersIn,
          originalMetersOut: machineForDataEntry.collectionMeters.metersOut,
        });
        setPrevIn(metersIn);
        setPrevOut(metersOut);
      } else {
        console.warn(
          "🔍 No collectionMeters found, setting prevIn/prevOut to 0"
        );
        setPrevIn(0);
        setPrevOut(0);
      }
    }
  }, [machineForDataEntry, editingEntryId]);

  const handleEditCollectedEntry = useCallback(
    async (entryId: string) => {
      if (isProcessing) return;

      const entryToEdit = collectedMachineEntries.find(
        (e) => e._id === entryId
      );
      if (entryToEdit) {
        // Set editing state
        setEditingEntryId(entryId);

        // Set the selected machine ID
        setSelectedMachineId(entryToEdit.machineId);

        // Populate form fields with existing data
        setCurrentMetersIn(entryToEdit.metersIn.toString());
        setCurrentMetersOut(entryToEdit.metersOut.toString());
        setCurrentMachineNotes(entryToEdit.notes || "");
        setCurrentRamClear(entryToEdit.ramClear || false);
        setCurrentRamClearMetersIn(
          entryToEdit.ramClearMetersIn?.toString() || ""
        );
        setCurrentRamClearMetersOut(
          entryToEdit.ramClearMetersOut?.toString() || ""
        );

        // Set the collection time
        if (entryToEdit.timestamp) {
          setCurrentCollectionTime(new Date(entryToEdit.timestamp));
        }

        // Set previous values for display
        setPrevIn(entryToEdit.prevIn || 0);
        setPrevOut(entryToEdit.prevOut || 0);

        toast.info(
          "Edit mode activated. Make your changes and click 'Update Entry in List'."
        );
      }
    },
    [isProcessing, collectedMachineEntries]
  );

  const handleCancelEdit = useCallback(() => {
    // Reset editing state
    setEditingEntryId(null);

    // Clear all input fields
    setCurrentMetersIn("");
    setCurrentMetersOut("");
    setCurrentMachineNotes("");
    setCurrentRamClear(false);
    setCurrentRamClearMetersIn("");
    setCurrentRamClearMetersOut("");
    setCurrentCollectionTime(new Date());

    // Reset prev values
    setPrevIn(null);
    setPrevOut(null);

    toast.info("Edit cancelled");
  }, []);

  const confirmAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return;

    // Validation logic here (same as existing validation)
    const validation = validateMachineEntry(
      selectedMachineId,
      machineForDataEntry,
      currentMetersIn,
      currentMetersOut,
      userId,
      currentRamClear,
      prevIn || 0,
      prevOut || 0,
      currentRamClearMetersIn ? Number(currentRamClearMetersIn) : undefined,
      currentRamClearMetersOut ? Number(currentRamClearMetersOut) : undefined,
      !!editingEntryId
    );

    if (!validation.isValid) {
      toast.error(validation.error || "Validation failed");
      return;
    }

    setIsProcessing(true);

    try {
      if (editingEntryId) {
        // Update existing collection
        const result = await updateCollection(editingEntryId, {
          metersIn: Number(currentMetersIn),
          metersOut: Number(currentMetersOut),
          notes: currentMachineNotes,
          ramClear: currentRamClear,
          ramClearMetersIn: currentRamClearMetersIn
            ? Number(currentRamClearMetersIn)
            : undefined,
          ramClearMetersOut: currentRamClearMetersOut
            ? Number(currentRamClearMetersOut)
            : undefined,
          timestamp: currentCollectionTime,
          prevIn: prevIn || 0,
          prevOut: prevOut || 0,
        });

        // Update local state
        setCollectedMachineEntries((prev) =>
          prev.map((entry) =>
            entry._id === editingEntryId ? { ...entry, ...result } : entry
          )
        );

        toast.success("Machine updated!");
        setEditingEntryId(null);
      } else {
        // Add new collection to the list
        const newEntry: CollectionDocument = {
          _id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique temporary ID
          machineId: selectedMachineId,
          machineName: machineForDataEntry?.name || "",
          serialNumber: machineForDataEntry?.serialNumber || "",
          machineCustomName: machineForDataEntry?.custom?.name || "",
          metersIn: Number(currentMetersIn),
          metersOut: Number(currentMetersOut),
          prevIn: prevIn || 0,
          prevOut: prevOut || 0,
          notes: currentMachineNotes,
          ramClear: currentRamClear,
          ramClearMetersIn: currentRamClearMetersIn
            ? Number(currentRamClearMetersIn)
            : undefined,
          ramClearMetersOut: currentRamClearMetersOut
            ? Number(currentRamClearMetersOut)
            : undefined,
          timestamp: currentCollectionTime,
          location: selectedLocationName,
          locationReportId: reportId,
          collector: userId || "",
          isCompleted: false,
          softMetersIn: 0,
          softMetersOut: 0,
          sasMeters: {
            machine: selectedMachineId,
            drop: 0,
            totalCancelledCredits: 0,
            gross: 0,
            gamesPlayed: 0,
            jackpot: 0,
            sasStartTime: "",
            sasEndTime: "",
          },
          movement: {
            metersIn: Number(currentMetersIn),
            metersOut: Number(currentMetersOut),
            gross:
              Number(currentMetersIn) -
              (prevIn || 0) -
              (Number(currentMetersOut) - (prevOut || 0)),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
        };

        // Save to database first
        try {
          const response = await axios.post("/api/collections", {
            machineId: selectedMachineId,
            machineName: machineForDataEntry?.name || "",
            serialNumber: machineForDataEntry?.serialNumber || "",
            machineCustomName: machineForDataEntry?.custom?.name || "",
            metersIn: Number(currentMetersIn),
            metersOut: Number(currentMetersOut),
            prevIn: prevIn || 0,
            prevOut: prevOut || 0,
            notes: currentMachineNotes,
            ramClear: currentRamClear,
            ramClearMetersIn: currentRamClearMetersIn
              ? Number(currentRamClearMetersIn)
              : undefined,
            ramClearMetersOut: currentRamClearMetersOut
              ? Number(currentRamClearMetersOut)
              : undefined,
            timestamp: currentCollectionTime,
            location: selectedLocationName,
            locationReportId: reportId,
            collector: userId || "",
            isCompleted: false,
            softMetersIn: 0,
            softMetersOut: 0,
            sasMeters: {
              machine: selectedMachineId,
              drop: 0,
              totalCancelledCredits: 0,
              gross: 0,
              gamesPlayed: 0,
              jackpot: 0,
              sasStartTime: "",
              sasEndTime: "",
            },
            movement: {
              metersIn: Number(currentMetersIn),
              metersOut: Number(currentMetersOut),
              gross:
                Number(currentMetersIn) -
                (prevIn || 0) -
                (Number(currentMetersOut) - (prevOut || 0)),
            },
          });

          // Add to local state with the real ID from database
          const savedEntry = { ...newEntry, _id: response.data._id };
          setCollectedMachineEntries((prev) => [...prev, savedEntry]);

          // Reset form fields
          setCurrentMetersIn("");
          setCurrentMetersOut("");
          setCurrentMachineNotes("");
          setCurrentRamClear(false);
          setCurrentRamClearMetersIn("");
          setCurrentRamClearMetersOut("");
          setPrevIn(null);
          setPrevOut(null);
          setSelectedMachineId("");

          toast.success(
            "Machine added to collection list and saved to database!"
          );
        } catch (error) {
          console.error("Error saving collection to database:", error);
          toast.error("Failed to save machine to database. Please try again.");
        }
      }
    } catch {
      toast.error("Failed to update machine. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentMachineNotes,
    currentRamClear,
    currentRamClearMetersIn,
    currentRamClearMetersOut,
    currentCollectionTime,
    editingEntryId,
    prevIn,
    prevOut,
    userId,
    reportId,
    selectedLocationName,
  ]);

  const confirmUpdateEntry = useCallback(() => {
    setShowUpdateConfirmation(false);
    confirmAddOrUpdateEntry();
  }, [confirmAddOrUpdateEntry]);

  const handleAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return;

    // If updating an existing entry, show confirmation dialog
    if (editingEntryId) {
      setShowUpdateConfirmation(true);
      return;
    }

    // If adding a new entry, proceed directly
    if (machineForDataEntry) {
      confirmAddOrUpdateEntry();
    }
  }, [
    isProcessing,
    editingEntryId,
    machineForDataEntry,
    confirmAddOrUpdateEntry,
  ]);

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

      // Remove the deleted entry from local state immediately
      setCollectedMachineEntries((prev) =>
        prev.filter((entry) => entry._id !== entryToDelete)
      );

      // Refetch collections to ensure data consistency
      setIsLoadingCollections(true);
      try {
        const updatedCollections = await fetchCollectionsByReportId(reportId);
        setCollectedMachineEntries(updatedCollections);
      } catch (error) {
        console.error("Error refetching collections after delete:", error);
      } finally {
        setIsLoadingCollections(false);
      }

      setHasChanges(true);

      // Refresh machines data to show updated values (including reverted collectionMeters)
      if (onRefresh) {
        console.warn(
          "🔄 Triggering parent refresh to get updated machine data after deletion"
        );
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
                          )
                            ? "opacity-60 cursor-not-allowed"
                            : ""
                        }`}
                        onClick={() => {
                          if (
                            collectedMachineEntries.find(
                              (e) => e.machineId === machine._id
                            )
                          ) {
                            toast.info(
                              `${machine.name} is already in the list. Click edit on the right to modify.`
                            );
                            return;
                          }
                          setSelectedMachineId(String(machine._id));

                          // Set prevIn/prevOut from machine's collectionMeters
                          if (machine.collectionMeters) {
                            console.warn(
                              "🔍 Setting prevIn/prevOut from selected machine:",
                              {
                                machineId: machine._id,
                                metersIn: machine.collectionMeters.metersIn,
                                metersOut: machine.collectionMeters.metersOut,
                              }
                            );
                            setPrevIn(machine.collectionMeters.metersIn || 0);
                            setPrevOut(machine.collectionMeters.metersOut || 0);
                          } else {
                            console.warn(
                              "🔍 No collectionMeters found for selected machine, setting to 0"
                            );
                            setPrevIn(0);
                            setPrevOut(0);
                          }
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
                        Prev In: {prevIn !== null ? prevIn : "N/A"}
                      </p>
                      {/* Regular Meters In Validation */}
                      {currentMetersIn &&
                        prevIn &&
                        Number(currentMetersIn) < Number(prevIn) && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-xs">
                              Warning: Meters In ({currentMetersIn}) should be
                              higher than or equal to Previous Meters In (
                              {prevIn})
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
                        Prev Out: {prevOut !== null ? prevOut : "N/A"}
                      </p>
                      {/* Regular Meters Out Validation */}
                      {currentMetersOut &&
                        prevOut &&
                        Number(currentMetersOut) < Number(prevOut) && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-xs">
                              Warning: Meters Out ({currentMetersOut}) should be
                              higher than or equal to Previous Meters Out (
                              {prevOut})
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
                              currentRamClearMetersIn &&
                              prevIn &&
                              Number(currentRamClearMetersIn) > Number(prevIn)
                                ? "border-red-500 focus:border-red-500"
                                : ""
                            }`}
                          />
                          {/* RAM Clear Meters In Validation */}
                          {currentRamClearMetersIn &&
                            prevIn &&
                            Number(currentRamClearMetersIn) >
                              Number(prevIn) && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-600 text-xs">
                                  Warning: RAM Clear Meters In (
                                  {currentRamClearMetersIn}) should be lower
                                  than or equal to Previous Meters In ({prevIn})
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
                              currentRamClearMetersOut &&
                              prevOut &&
                              Number(currentRamClearMetersOut) > Number(prevOut)
                                ? "border-red-500 focus:border-red-500"
                                : ""
                            }`}
                          />
                          {/* RAM Clear Meters Out Validation */}
                          {currentRamClearMetersOut &&
                            prevOut &&
                            Number(currentRamClearMetersOut) >
                              Number(prevOut) && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-600 text-xs">
                                  Warning: RAM Clear Meters Out (
                                  {currentRamClearMetersOut}) should be lower
                                  than or equal to Previous Meters Out (
                                  {prevOut})
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
                        onChange={(e) => setCurrentMachineNotes(e.target.value)}
                        className="min-h-[60px]"
                        disabled={!machineForDataEntry || isProcessing}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {editingEntryId ? (
                      <>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                          disabled={isProcessing}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (editingEntryId || machineForDataEntry) {
                              handleAddOrUpdateEntry();
                            } else {
                              handleDisabledFieldClick();
                            }
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={
                            (!machineForDataEntry && !editingEntryId) ||
                            isProcessing
                          }
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Update Entry in List"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={
                          machineForDataEntry
                            ? handleAddOrUpdateEntry
                            : () => {}
                        }
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={!machineForDataEntry || isProcessing}
                      >
                        {isProcessing ? "Processing..." : "Add Machine to List"}
                      </Button>
                    )}
                  </div>

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
                                      const amountToCollect =
                                        Number(financials.amountToCollect) || 0;

                                      // Previous balance = collected amount - amount to collect
                                      const previousBalance =
                                        amountCollected - amountToCollect;

                                      // Final correction = base entered first + collected amount
                                      const finalCorrection =
                                        (Number(baseBalanceCorrection) || 0) +
                                        amountCollected;

                                      setFinancials((prev) => ({
                                        ...prev,
                                        previousBalance:
                                          previousBalance.toString(),
                                        balanceCorrection:
                                          e.target.value === ""
                                            ? baseBalanceCorrection || "0"
                                            : finalCorrection.toString(),
                                      }));
                                    }, 0);
                                  }
                                }}
                                disabled={
                                  isProcessing ||
                                  (baseBalanceCorrection.trim() === "" &&
                                    financials.balanceCorrection.trim() === "")
                                }
                              />
                            </div>
                          </TooltipTrigger>
                          {isProcessing ||
                          (baseBalanceCorrection.trim() === "" &&
                            financials.balanceCorrection.trim() === "") ? (
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
                        <span className="text-xs text-gray-400"></span>
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
                                  if (
                                    /^-?\d*\.?\d*$/.test(
                                      newBalanceCorrection
                                    ) ||
                                    newBalanceCorrection === ""
                                  ) {
                                    setFinancials((prev) => ({
                                      ...prev,
                                      balanceCorrection: newBalanceCorrection,
                                    }));
                                    setBaseBalanceCorrection(
                                      newBalanceCorrection
                                    );
                                  }
                                }}
                                className="bg-white border-gray-300 focus:border-primary"
                                title="Balance correction amount (editable)"
                                disabled={
                                  isProcessing ||
                                  financials.collectedAmount.trim() !== ""
                                }
                              />
                            </div>
                          </TooltipTrigger>
                          {isProcessing ||
                          financials.collectedAmount.trim() !== "" ? (
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
                        onClick={() => handleEditCollectedEntry(entry._id)}
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
