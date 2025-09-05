import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Trash2, Edit3 } from "lucide-react";
import axios from "axios";
import type {
  CollectionReportMachineEntry,
  CollectionDocument,
} from "@/lib/types/collections";
import type { NewCollectionModalProps } from "@/lib/types/componentProps";
import type {
  CollectionReportMachineSummary,
  CreateCollectionReportPayload,
} from "@/lib/types/api";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { 
  createCollectionReport,
  calculateSasMetrics,
  calculateMovement,
  calculateTotalAmountToCollect,
  calculateBalanceCorrection
} from "@/lib/helpers/collectionReport";
import { useUserStore } from "@/lib/store/userStore";
import { v4 as uuidv4 } from "uuid";
import { validateCollectionReportPayload } from "@/lib/utils/validation";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/formatting";
import { createActivityLogger } from "@/lib/helpers/activityLogger";

async function fetchInProgressCollections(
  collector: string
): Promise<CollectionDocument[]> {
  const res = await axios.get(
    `/api/collections?collector=${collector}&isCompleted=false`
  );
  return res.data;
}

async function addMachineCollection(
  data: Partial<CollectionDocument>
): Promise<CollectionDocument> {
  const res = await axios.post("/api/collections", data);
  // The API returns { success: true, data: created, calculations: {...} }
  return res.data.data;
}

async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  const res = await axios.delete(`/api/collections?id=${id}`);
  return res.data;
}

async function updateCollectionsWithReportId(
  collections: CollectionDocument[],
  reportId: string
): Promise<void> {
  // Update each collection with the correct locationReportId
  const updatePromises = collections.map(async (collection) => {
    try {
      await axios.patch(`/api/collections?id=${collection._id}`, {
        locationReportId: reportId,
      });
    } catch (error) {
      console.error(`Failed to update collection ${collection._id}:`, error);
      throw error;
    }
  });

  await Promise.all(updatePromises);
}

export default function NewCollectionModal({
  show,
  onClose,
  locations = [],
  onRefresh,
}: NewCollectionModalProps) {
  const hasResetRef = useRef(false);
  const user = useUserStore((state) => state.user);
  const userId = user?._id;
  const collectionLogger = useMemo(() => createActivityLogger("session"), []);

  // Function to generate collector name from user profile
  const getCollectorName = useCallback(() => {
    if (!user) return "Unknown Collector";

    // Check if user has profile with firstName and lastName
    const userWithProfile = user as typeof user & {
      profile?: { firstName?: string; lastName?: string };
      username?: string;
    };

    if (
      userWithProfile.profile?.firstName &&
      userWithProfile.profile?.lastName
    ) {
      return `${userWithProfile.profile.firstName} ${userWithProfile.profile.lastName}`;
    }

    // Fallback to username if available
    if (userWithProfile.username) {
      return userWithProfile.username;
    }

    // Final fallback to email
    return user.emailAddress || "Unknown Collector";
  }, [user]);

  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >(undefined);
  const [selectedLocationName, setSelectedLocationName] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState("");
  const [machinesOfSelectedLocation, setMachinesOfSelectedLocation] = useState<
    CollectionReportMachineSummary[]
  >([]);

  const [selectedMachineId, setSelectedMachineId] = useState<
    string | undefined
  >(undefined);

  const [currentCollectionTime, setCurrentCollectionTime] = useState<
    Date | undefined
  >(new Date());
  const [currentMetersIn, setCurrentMetersIn] = useState("");
  const [currentMetersOut, setCurrentMetersOut] = useState("");
  const [currentMachineNotes, setCurrentMachineNotes] = useState("");
  const [currentRamClear, setCurrentRamClear] = useState(false);

  const [collectedMachineEntries, setCollectedMachineEntries] = useState<
    CollectionDocument[]
  >([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const [prevIn, setPrevIn] = useState<number | null>(null);
  const [prevOut, setPrevOut] = useState<number | null>(null);
  const [previousCollectionTime, setPreviousCollectionTime] = useState<
    string | Date | undefined
  >(undefined);

  const selectedLocation = useMemo(
    () => locations.find((l) => String(l._id) === selectedLocationId),
    [locations, selectedLocationId]
  );

  const machineForDataEntry = useMemo(
    () => machinesOfSelectedLocation.find((m) => m._id === selectedMachineId),
    [machinesOfSelectedLocation, selectedMachineId]
  );

  // Function to handle clicks on disabled input fields
  const handleDisabledFieldClick = useCallback(() => {
    if (!machineForDataEntry && !editingEntryId) {
      toast.warning("Please select or edit a machine first", {
        duration: 3000,
        position: "top-right",
      });
    }
  }, [machineForDataEntry, editingEntryId]);

  useEffect(() => {
    if (selectedLocation) {
      setSelectedLocationName(selectedLocation.name);
    } else {
      setSelectedLocationName("");
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedLocationId) {
      const location = locations.find(
        (loc) => String(loc._id) === selectedLocationId
      );
      if (location) {
        setMachinesOfSelectedLocation(location.machines || []);
      } else {
        setMachinesOfSelectedLocation([]);
      }
      setSelectedMachineId(undefined);
    } else {
      setMachinesOfSelectedLocation([]);
      setSelectedMachineId(undefined);
    }
  }, [selectedLocationId, locations]);

  useEffect(() => {
    if (selectedMachineId && machineForDataEntry) {
      // Check if this machine is already in the collected list
      const existingEntry = collectedMachineEntries.find(
        entry => entry.machineId === selectedMachineId
      );
      
      if (existingEntry) {
        // Pre-fill with existing values from collected list
        setCurrentMetersIn(existingEntry.metersIn?.toString() || "");
        setCurrentMetersOut(existingEntry.metersOut?.toString() || "");
        setCurrentMachineNotes(existingEntry.notes || "");
        setCurrentRamClear(existingEntry.ramClear || false);
        setCurrentCollectionTime(existingEntry.timestamp ? new Date(existingEntry.timestamp) : new Date());
        setPrevIn(existingEntry.prevIn || 0);
        setPrevOut(existingEntry.prevOut || 0);
      } else {
        // Use collectionMeters directly from the machine data for new entries
        if (machineForDataEntry.collectionMeters) {
          setPrevIn(machineForDataEntry.collectionMeters.metersIn || 0);
          setPrevOut(machineForDataEntry.collectionMeters.metersOut || 0);
        } else {
          setPrevIn(0);
          setPrevOut(0);
        }
        
        // Reset input fields for new entries
        setCurrentMetersIn("");
        setCurrentMetersOut("");
        setCurrentMachineNotes("");
        setCurrentRamClear(false);
        setCurrentCollectionTime(new Date());
      }

      // Use collectionTime directly from the machine data
      if (machineForDataEntry.collectionTime) {
        setPreviousCollectionTime(machineForDataEntry.collectionTime);
      } else {
        setPreviousCollectionTime(undefined);
      }
    } else {
      setPrevIn(null);
      setPrevOut(null);
      setPreviousCollectionTime(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMachineId, machineForDataEntry]);

  useEffect(() => {
    if (show && userId) {
      setIsLoadingCollections(true);
      fetchInProgressCollections(userId)
        .then((collections) => {
          setCollectedMachineEntries(collections);
          
          // Auto-set location and select first machine based on first machine in the list
          if (collections.length > 0) {
            const firstMachine = collections[0];
            if (firstMachine.location) {
              // Find the location by name
              const matchingLocation = locations.find(
                (loc) => loc.name === firstMachine.location
              );
              if (matchingLocation) {
                setSelectedLocationId(String(matchingLocation._id));
                setSelectedLocationName(matchingLocation.name);
                
                // Auto-select the first machine to show its input fields
                setSelectedMachineId(firstMachine.machineId);
              }
            }
          }
        })
        .catch(() => setCollectedMachineEntries([]))
        .finally(() => setIsLoadingCollections(false));
    }
  }, [show, userId, locations]);

  // Auto-calculate financial values when machines or financial inputs change
  useEffect(() => {
    if (collectedMachineEntries.length > 0) {
      // Calculate total amount to collect
      const totalAmountToCollect = calculateTotalAmountToCollect(collectedMachineEntries);
      
      // Update amount to collect
      setFinancials(prev => ({
        ...prev,
        amountToCollect: totalAmountToCollect.toString()
      }));
    } else {
      // Reset to empty when no machines
      setFinancials(prev => ({
        ...prev,
        amountToCollect: "",
        balanceCorrection: ""
      }));
    }
  }, [collectedMachineEntries]);

  // Auto-calculate balance correction when amount to collect or collected amount changes
  useEffect(() => {
    const amountToCollect = Number(financials.amountToCollect) || 0;
    const collectedAmount = Number(financials.collectedAmount) || 0;
    
    if (amountToCollect !== 0 || collectedAmount !== 0) {
      const balanceCorrection = calculateBalanceCorrection(amountToCollect, collectedAmount);
      setFinancials(prev => ({
        ...prev,
        balanceCorrection: balanceCorrection.toString()
      }));
    }
  }, [financials.amountToCollect, financials.collectedAmount]);

  const resetMachineSpecificInputFields = useCallback(() => {
    setCurrentCollectionTime(new Date());
    setCurrentMetersIn("");
    setCurrentMetersOut("");
    setCurrentMachineNotes("");
    setCurrentRamClear(false);
  }, []);


  useEffect(() => {
    if (!show && !hasResetRef.current) {
      // Reset form when modal is closed
      hasResetRef.current = true;
      
      // Reset all state directly without calling resetFullForm to prevent infinite loop
      setSelectedLocationId(undefined);
      setSelectedLocationName("");
      setLocationSearch("");
      setMachinesOfSelectedLocation([]);
      setSelectedMachineId(undefined);
      setCurrentCollectionTime(new Date());
      setCurrentMetersIn("");
      setCurrentMetersOut("");
      setCurrentMachineNotes("");
      setCurrentRamClear(false);
      setCollectedMachineEntries([]);
      setEditingEntryId(null);
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
      setPrevIn(null);
      setPrevOut(null);
      setPreviousCollectionTime(undefined);
    } else if (show) {
      hasResetRef.current = false;
    }
  }, [show]);

  const handleAddOrUpdateEntry = useCallback(async () => {
    if (isProcessing) return; // Prevent multiple submissions
    
    if (!selectedMachineId || !machineForDataEntry) {
      toast.error("Please select a machine first.");
      return;
    }
    if (
      currentMetersIn.trim() === "" ||
      !/^-?\d*\.?\d+$/.test(currentMetersIn.trim())
    ) {
      toast.error("Meters In must be a valid number.");
      return;
    }
    if (
      currentMetersOut.trim() === "" ||
      !/^-?\d*\.?\d+$/.test(currentMetersOut.trim())
    ) {
      toast.error("Meters Out must be a valid number.");
      return;
    }
    if (!userId) {
      toast.error("User not found.");
      return;
    }

    setIsProcessing(true);

    const metersIn = Number(currentMetersIn);
    const metersOut = Number(currentMetersOut);

    if (isNaN(metersIn) || isNaN(metersOut)) {
      toast.error("Invalid meter values");
      setIsProcessing(false);
      return;
    }

    // Calculate SAS metrics
    const sasStartTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const sasEndTime = currentCollectionTime || new Date();
    
    let sasMetrics;
    try {
      const machineIdentifier = machineForDataEntry.serialNumber || machineForDataEntry.name || selectedMachineId;
      sasMetrics = await calculateSasMetrics(machineIdentifier, sasStartTime, sasEndTime);
    } catch (error) {
      console.error('Error calculating SAS metrics:', error);
      sasMetrics = {
        drop: 0,
        totalCancelledCredits: 0,
        gross: 0,
        jackpot: 0,
        sasStartTime: sasStartTime.toISOString(),
        sasEndTime: sasEndTime.toISOString()
      };
    }

    // Calculate movement
    const movement = calculateMovement(metersIn, metersOut);

    const entryData = {
      _id: uuidv4(), // Generate a unique ID
      machineId: selectedMachineId,
      machineName: machineForDataEntry.name,
      machineCustomName: selectedMachineId, // Using machineId as custom name
      serialNumber: machineForDataEntry.serialNumber,
      timestamp: currentCollectionTime
        ? new Date(currentCollectionTime)
        : new Date(),
      metersIn,
      metersOut,
      prevIn: prevIn || 0,
      prevOut: prevOut || 0,
      softMetersIn: metersIn,
      softMetersOut: metersOut,
      notes: currentMachineNotes,
      ramClear: currentRamClear,
      useCustomTime: true,
      selectedDate: currentCollectionTime
        ? currentCollectionTime.toISOString().split("T")[0]
        : "",
      timeHH: currentCollectionTime
        ? String(currentCollectionTime.getHours()).padStart(2, "0")
        : "",
      timeMM: currentCollectionTime
        ? String(currentCollectionTime.getMinutes()).padStart(2, "0")
        : "",
      isCompleted: false,
      collector: userId,
      location: selectedLocationName,
      locationReportId: "", // Will be set when report is created
      // Add calculated nested objects
      sasMeters: {
        machine: machineForDataEntry.name,
        drop: sasMetrics.drop,
        totalCancelledCredits: sasMetrics.totalCancelledCredits,
        gross: sasMetrics.gross,
        gamesPlayed: 0,
        jackpot: sasMetrics.jackpot,
        sasStartTime: sasMetrics.sasStartTime,
        sasEndTime: sasMetrics.sasEndTime,
      },
      movement: movement,
    };

    try {
      const result = await addMachineCollection(entryData);

      // Log the creation activity
      await collectionLogger.logCreate(
        result._id || entryData.machineId || "unknown",
        `${entryData.machineCustomName} at ${selectedLocationName}`,
        entryData,
        `Created collection entry for machine: ${entryData.machineCustomName} at ${selectedLocationName}`
      );

      toast.success("Machine added!");
      await fetchInProgressCollections(userId).then(setCollectedMachineEntries);
      resetMachineSpecificInputFields();
      setEditingEntryId(null); // Clear editing state
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to add machine:", error);
      }
      toast.error(
        "Failed to add machine. Please check the console for details."
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    selectedMachineId,
    machineForDataEntry,
    currentMetersIn,
    currentMetersOut,
    currentCollectionTime,
    currentMachineNotes,
    currentRamClear,
    prevIn,
    prevOut,
    selectedLocationName,
    userId,
    resetMachineSpecificInputFields,
    collectionLogger,
  ]);

  const handleEditCollectedEntry = useCallback(
    (_id: string) => {
      if (isProcessing) return; // Prevent editing during processing
      
      const entryToEdit = collectedMachineEntries.find((e) => e._id === _id);
      if (entryToEdit) {
        if (selectedMachineId !== entryToEdit.machineCustomName) {
          setSelectedMachineId(entryToEdit.machineCustomName);
        }
        setCurrentCollectionTime(new Date(entryToEdit.timestamp));
        setCurrentMetersIn(String(entryToEdit.metersIn));
        setCurrentMetersOut(String(entryToEdit.metersOut));
        setCurrentMachineNotes(entryToEdit.notes || "");
        setCurrentRamClear(entryToEdit.ramClear || false);
        setEditingEntryId(_id);
        toast.info(
          `Editing ${entryToEdit.machineCustomName}. Make changes and click 'Update Entry'.`
        );
      }
    },
    [collectedMachineEntries, selectedMachineId, isProcessing]
  );


  const handleDeleteCollectedEntry = useCallback(
    async (_id: string) => {
      if (isProcessing) return; // Prevent deletion during processing
      
      if (!userId) {
        toast.error("User not found.");
        return;
      }
      
      setIsProcessing(true);
      try {
        const entryToDelete = collectedMachineEntries.find(
          (e) => e._id === _id
        );
        const entryData = entryToDelete ? { ...entryToDelete } : null;

        await deleteMachineCollection(_id);

        // Log the deletion activity
        if (entryData) {
          await collectionLogger.logDelete(
            _id,
            `${entryData.machineCustomName} at ${selectedLocationName}`,
            entryData,
            `Deleted collection entry for machine: ${entryData.machineCustomName} at ${selectedLocationName}`
          );
        }

        toast.success("Machine deleted!");
        await fetchInProgressCollections(userId).then(
          setCollectedMachineEntries
        );
      } catch {
        toast.error("Failed to delete machine");
      } finally {
        setIsProcessing(false);
      }
    },
    [userId, collectedMachineEntries, selectedLocationName, collectionLogger, isProcessing]
  );

  const handleCreateMultipleReports = useCallback(async () => {
    if (isProcessing) return; // Prevent multiple submissions
    
    if (!userId) {
      toast.error("User not found.");
      return;
    }
    if (collectedMachineEntries.length === 0) {
      toast.error("No machines added to the list.");
      return;
    }
    if (!selectedLocationId || !selectedLocationName) {
      toast.error("Location not properly selected.");
      return;
    }

    setIsProcessing(true);

    // Generate a single locationReportId for all collections in this report
    const reportId = uuidv4();

    const reportCreationPromises = collectedMachineEntries.map((entry) => {
      const machineEntry = {
        machineId: entry.machineId,
        machineName: entry.machineName,
        collectionTime:
          entry.timestamp instanceof Date
            ? entry.timestamp.toISOString()
            : new Date(entry.timestamp).toISOString(),
        metersIn: entry.metersIn,
        metersOut: entry.metersOut,
        notes: entry.notes,
        useCustomTime: true,
        selectedDate:
          entry.timestamp instanceof Date
            ? entry.timestamp.toISOString().split("T")[0]
            : new Date(entry.timestamp).toISOString().split("T")[0],
        timeHH:
          entry.timestamp instanceof Date
            ? String(entry.timestamp.getHours()).padStart(2, "0")
            : String(new Date(entry.timestamp).getHours()).padStart(2, "0"),
        timeMM:
          entry.timestamp instanceof Date
            ? String(entry.timestamp.getMinutes()).padStart(2, "0")
            : String(new Date(entry.timestamp).getMinutes()).padStart(2, "0"),
      };
      const payload: CreateCollectionReportPayload & {
        machines: Array<
          Omit<CollectionReportMachineEntry, "internalId" | "serialNumber">
        >;
      } = {
        variance: Number(financials.variance) || 0,
        previousBalance: Number(financials.previousBalance) || 0,
        currentBalance: 0,
        amountToCollect: Number(financials.amountToCollect) || 0,
        amountCollected: Number(financials.collectedAmount) || 0,
        amountUncollected: 0,
        partnerProfit: 0,
        taxes: Number(financials.taxes) || 0,
        advance: Number(financials.advance) || 0,
        collectorName: getCollectorName(),
        locationName: selectedLocationName,
        locationReportId: reportId,
        location: selectedLocationId || "",
        totalDrop: 0,
        totalCancelled: 0,
        totalGross: 0,
        totalSasGross: 0,
        timestamp: new Date().toISOString(),
        varianceReason: financials.varianceReason,
        reasonShortagePayment: financials.reasonForShortagePayment,
        balanceCorrection: Number(financials.balanceCorrection) || 0,
        balanceCorrectionReas: financials.balanceCorrectionReason,
        machines: [machineEntry],
      };
      const validation = validateCollectionReportPayload(payload);
      if (!validation.isValid) {
        // Log error for debugging in development
        if (process.env.NODE_ENV === "development") {
          console.error(
            "Validation failed for machine:",
            entry.machineName,
            validation.errors
          );
        }
        return Promise.reject({
          machineName: entry.machineName,
          errors: validation.errors,
        });
      }
      return createCollectionReport(payload);
    });

    toast.loading("Creating reports...", { id: "create-reports-toast" });
    const results = await Promise.allSettled(reportCreationPromises);
    toast.dismiss("create-reports-toast");

    let successCount = 0;
    results.forEach((result, index) => {
      const machineName =
        collectedMachineEntries[index]?.machineName || `Entry ${index + 1}`;
      if (result.status === "fulfilled") {
        toast.success(`Report for ${machineName} created successfully!`);
        successCount++;
      } else {
        const errorReason = result.reason as {
          errors?: string[];
          message?: string;
        };
        const errorMessages = errorReason?.errors
          ? errorReason.errors.join(", ")
          : errorReason?.message || "Unknown error";
        toast.error(
          `Failed to create report for ${machineName}: ${errorMessages}`
        );
        // Log error for debugging in development
        if (process.env.NODE_ENV === "development") {
          console.error(`Error for ${machineName}:`, result.reason);
        }
      }
    });

    // Update existing collections with the correct locationReportId
    if (successCount > 0) {
      try {
        await updateCollectionsWithReportId(collectedMachineEntries, reportId);
      } catch (error) {
        console.error("Failed to update collections with report ID:", error);
        toast.error("Reports created but failed to link collections");
      }
    }

    if (successCount === collectedMachineEntries.length) {
      // Refresh the parent page data after successful creation
      if (onRefresh) {
        onRefresh();
      }
      onClose();
    } else if (successCount > 0) {
      const successfulMachineInternalIds = results
        .map((res, idx) =>
          res.status === "fulfilled" ? collectedMachineEntries[idx]._id : null
        )
        .filter((id) => id !== null);
      setCollectedMachineEntries((prev) =>
        prev.filter((e) => !successfulMachineInternalIds.includes(e._id))
      );
    }
    
    setIsProcessing(false);
  }, [
    isProcessing,
    userId,
    collectedMachineEntries,
    selectedLocationId,
    selectedLocationName,
    financials,
    getCollectorName,
    onRefresh,
    onClose,
  ]);

  // Validate that all required fields have values before enabling Create Report button
  const isCreateReportsEnabled = useMemo(() => {
    // Must have machines in the list
    if (collectedMachineEntries.length === 0) return false;
    
    // Check that all collected machines have required meter values
    const allMachinesHaveRequiredData = collectedMachineEntries.every(machine => 
      machine.metersIn !== undefined && 
      machine.metersIn !== null && 
      machine.metersOut !== undefined && 
      machine.metersOut !== null
    );
    
    if (!allMachinesHaveRequiredData) return false;
    
    // Check that all required financial fields have values
    const requiredFinancialFields = [
      'variance',
      'advance', 
      'taxes',
      'previousBalance',
      'collectedAmount'
    ];
    
    const allFinancialFieldsHaveValues = requiredFinancialFields.every(field => {
      const value = financials[field as keyof typeof financials];
      return value !== undefined && value !== null && value.toString().trim() !== '';
    });
    
    return allFinancialFieldsHaveValues;
  }, [collectedMachineEntries, financials]);

  if (!show) {
    return null;
  }

  return (
    <Dialog
      open={show}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-5xl h-[calc(100vh-2rem)] md:h-[90vh] p-0 flex flex-col bg-container"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 md:p-6 pb-0">
          <DialogTitle className="text-xl md:text-2xl font-bold">
            New Collection Report Batch
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          {/* Mobile: Full width, Desktop: 1/4 width */}
          <div className="w-full lg:w-1/4 border-b lg:border-b-0 lg:border-r border-gray-300 p-3 md:p-4 flex flex-col space-y-3 overflow-y-auto">
            <Select
              value={selectedLocationId}
              onValueChange={(value) => setSelectedLocationId(value)}
              disabled={collectedMachineEntries.length > 0 || isProcessing}
            >
              <SelectTrigger className={`w-full bg-buttonActive text-white focus:ring-primary ${
                collectedMachineEntries.length > 0 || isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}>
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.length > 0 ? (
                  locations.map((loc) => (
                    <SelectItem key={String(loc._id)} value={String(loc._id)}>
                      {loc.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-grayHighlight">
                    No locations found.
                  </div>
                )}
              </SelectContent>
            </Select>

            <div className="relative">
              <Input
                placeholder="Search Locations..."
                className="pr-10"
                value={locationSearch}
                disabled
                onChange={(e) => setLocationSearch(e.target.value)}
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
                      className="w-full justify-start text-left h-auto py-2 px-3 whitespace-normal"
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
                        )?.machineId !== machine._id)
                      }
                    >
                      {machine.name} (
                      {((machine as Record<string, unknown>)
                        .serialNumber as string) ||
                        ((machine as Record<string, unknown>)
                          .origSerialNumber as string) ||
                        ((machine as Record<string, unknown>)
                          .machineId as string) ||
                        "N/A"}
                      )
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
            {(selectedMachineId && machineForDataEntry) || collectedMachineEntries.length > 0 ? (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-grayHighlight">
                    {selectedLocationName} (Prev. Collection:{" "}
                    {previousCollectionTime
                      ? formatDate(previousCollectionTime)
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
                      {((machineForDataEntry as Record<string, unknown>)
                        .serialNumber as string) ||
                        ((machineForDataEntry as Record<string, unknown>)
                          .origSerialNumber as string) ||
                        ((machineForDataEntry as Record<string, unknown>)
                          .machineId as string) ||
                        "N/A"}
                      )
                    </>
                  ) : (
                    "Select a machine to edit"
                  )}
                </Button>

                <div className="flex items-center gap-2 mt-2">
                  <DateTimePicker
                    date={currentCollectionTime}
                    setDate={setCurrentCollectionTime}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-grayHighlight mb-1">
                      Meters In:
                    </label>
                    <div onClick={handleDisabledFieldClick}>
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grayHighlight mb-1">
                      Meters Out:
                    </label>
                    <div onClick={handleDisabledFieldClick}>
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
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-2" onClick={handleDisabledFieldClick}>
                  <input
                    type="checkbox"
                    id="ramClearCheckbox"
                    checked={currentRamClear}
                    onChange={(e) => setCurrentRamClear(e.target.checked)}
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
                  <div onClick={handleDisabledFieldClick}>
                    <Textarea
                      placeholder="Machine-specific notes..."
                      value={currentMachineNotes}
                      onChange={(e) => setCurrentMachineNotes(e.target.value)}
                      className="min-h-[60px]"
                      disabled={!machineForDataEntry || isProcessing}
                    />
                  </div>
                </div>

                <Button
                  onClick={machineForDataEntry ? handleAddOrUpdateEntry : handleDisabledFieldClick}
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
                  Shared Financials for Batch
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
                      onChange={(e) =>
                        (/^\d*\.?\d*$/.test(e.target.value) ||
                          e.target.value === "") &&
                        setFinancials({ ...financials, taxes: e.target.value })
                      }
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
                      onChange={(e) =>
                        (/^\d*\.?\d*$/.test(e.target.value) ||
                          e.target.value === "") &&
                        setFinancials({
                          ...financials,
                          advance: e.target.value,
                        })
                      }
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
                      onChange={(e) =>
                        (/^\d*\.?\d*$/.test(e.target.value) ||
                          e.target.value === "") &&
                        setFinancials({
                          ...financials,
                          variance: e.target.value,
                        })
                      }
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
                        setFinancials({
                          ...financials,
                          varianceReason: e.target.value,
                        })
                      }
                      className="min-h-[40px]"
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grayHighlight mb-1">
                      Amount To Collect: <span className="text-xs text-gray-400">(Auto-calculated)</span>
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
                      Collected Amount: <span className="text-xs text-gray-400">(Optional)</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={financials.collectedAmount}
                      onChange={(e) =>
                        (/^\d*\.?\d*$/.test(e.target.value) ||
                          e.target.value === "") &&
                        setFinancials({
                          ...financials,
                          collectedAmount: e.target.value,
                        })
                      }
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grayHighlight mb-1">
                      Balance Correction: <span className="text-xs text-gray-400">(Auto-calculated)</span>
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
                        setFinancials({
                          ...financials,
                          balanceCorrectionReason: e.target.value,
                        })
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
                      onChange={(e) =>
                        (/^\d*\.?\d*$/.test(e.target.value) ||
                          e.target.value === "") &&
                        setFinancials({
                          ...financials,
                          previousBalance: e.target.value,
                        })
                      }
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
                        setFinancials({
                          ...financials,
                          reasonForShortagePayment: e.target.value,
                        })
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
                  <div key={i} className="bg-white p-3 rounded-md shadow border border-gray-200 space-y-2">
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
                    {entry.machineName} ({entry.serialNumber || "N/A"})
                  </p>
                  <p className="text-xs text-gray-600">
                    Time: {formatDate(entry.timestamp)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Meters In: {entry.metersIn} | Meters Out: {entry.metersOut}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-gray-600 italic">
                      Notes: {entry.notes}
                    </p>
                  )}
                  {entry.ramClear && (
                    <p className="text-xs text-red-600 font-semibold">
                      RAM Clear: Enabled
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
                      onClick={() => handleDeleteCollectedEntry(entry._id)}
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
            onClick={handleCreateMultipleReports}
            className={`w-auto bg-button hover:bg-buttonActive text-base px-8 py-3 ${
              !isCreateReportsEnabled || isProcessing ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            disabled={!isCreateReportsEnabled || isProcessing}
          >
            {isProcessing 
              ? "CREATING REPORTS..." 
              : `CREATE REPORT(S) (${collectedMachineEntries.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
