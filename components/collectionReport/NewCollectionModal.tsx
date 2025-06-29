import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
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
import { Search, Trash2, Edit3 } from "lucide-react";
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
  fetchMachineCollectionMeters,
  fetchPreviousCollectionTime,
} from "@/lib/helpers/collectionReport";
import { useUserStore } from "@/lib/store/userStore";
import { v4 as uuidv4 } from "uuid";
import { validateCollectionReportPayload } from "@/lib/utils/validation";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/formatting";

async function fetchInProgressCollections(
  collector: string
): Promise<CollectionDocument[]> {
  const res = await fetch(
    `/api/collections?collector=${collector}&isCompleted=false`
  );
  if (!res.ok) throw new Error("Failed to fetch collections");
  return res.json();
}

async function addMachineCollection(
  data: Partial<CollectionDocument>
): Promise<CollectionDocument> {
  const res = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add machine");
  return res.json();
}

async function deleteMachineCollection(
  id: string
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/collections?id=${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete machine");
  return res.json();
}

export default function NewCollectionModal({
  show,
  onClose,
  locations = [],
}: NewCollectionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const user = useUserStore((state) => state.user);

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

  const selectedLocation = locations.find(
    (l) => String(l._id) === selectedLocationId
  );

  const machineForDataEntry = machinesOfSelectedLocation.find(
    (m) => m._id === selectedMachineId
  );

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
    if (selectedMachineId) {
      fetchMachineCollectionMeters(selectedMachineId).then((meters) => {
        setPrevIn(meters ? meters.metersIn : null);
        setPrevOut(meters ? meters.metersOut : null);
      });
      fetchPreviousCollectionTime(selectedMachineId).then((prevTime) => {
        setPreviousCollectionTime(prevTime);
      });
    } else {
      setPrevIn(null);
      setPrevOut(null);
      setPreviousCollectionTime(undefined);
    }
  }, [selectedMachineId]);

  useEffect(() => {
    if (show && user?._id) {
      fetchInProgressCollections(user._id)
        .then(setCollectedMachineEntries)
        .catch(() => setCollectedMachineEntries([]));
    }
  }, [show, user?._id]);

  const resetMachineSpecificInputFields = () => {
    setCurrentCollectionTime(new Date());
    setCurrentMetersIn("");
    setCurrentMetersOut("");
    setCurrentMachineNotes("");
    setCurrentRamClear(false);
  };

  const resetFullForm = useCallback(() => {
    setSelectedLocationId(undefined);
    setSelectedLocationName("");
    setLocationSearch("");
    setMachinesOfSelectedLocation([]);
    setSelectedMachineId(undefined);

    resetMachineSpecificInputFields();
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
  }, []);

  useEffect(() => {
    if (show && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    } else if (!show && modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.2,
        ease: "power2.in",
        onComplete: resetFullForm,
      });
    }
  }, [show, resetFullForm]);

  const handleAddOrUpdateEntry = async () => {
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
    if (!user?._id) {
      toast.error("User not found.");
      return;
    }

    const metersIn = Number(currentMetersIn);
    const metersOut = Number(currentMetersOut);

    if (isNaN(metersIn) || isNaN(metersOut)) {
      toast.error("Invalid meter values");
      return;
    }

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
      collector: user._id,
      location: selectedLocationName,
      locationReportId: selectedLocationId,
      // Add required nested objects
      sasMeters: {
        machine: machineForDataEntry.name,
        drop: 0,
        totalCancelledCredits: 0,
        gross: 0,
        gamesPlayed: 0,
        jackpot: 0,
        sasStartTime: "",
        sasEndTime: "",
      },
      movement: {
        metersIn,
        metersOut,
        gross: metersOut - metersIn,
      },
    };

    try {
      await addMachineCollection(entryData);
      toast.success("Machine added!");
      await fetchInProgressCollections(user._id).then(
        setCollectedMachineEntries
      );
      resetMachineSpecificInputFields();
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to add machine:", error);
      }
      toast.error(
        "Failed to add machine. Please check the console for details."
      );
    }
  };

  const handleEditCollectedEntry = (_id: string) => {
    const entryToEdit = collectedMachineEntries.find((e) => e._id === _id);
    if (entryToEdit) {
      if (selectedMachineId !== entryToEdit.machineCustomName) {
        setSelectedMachineId(entryToEdit.machineCustomName);
      }
      setCurrentCollectionTime(new Date(entryToEdit.timestamp));
      setCurrentMetersIn(String(entryToEdit.metersIn));
      setCurrentMetersOut(String(entryToEdit.metersOut));
      setCurrentMachineNotes(entryToEdit.notes || "");
      setCurrentRamClear(false);
      setEditingEntryId(_id);
      toast.info(
        `Editing ${entryToEdit.machineCustomName}. Make changes and click 'Update Entry'.`
      );
    }
  };

  const handleDeleteCollectedEntry = async (_id: string) => {
    if (!user?._id) {
      toast.error("User not found.");
      return;
    }
    try {
      await deleteMachineCollection(_id);
      toast.success("Machine deleted!");
      await fetchInProgressCollections(user._id).then(
        setCollectedMachineEntries
      );
    } catch {
      toast.error("Failed to delete machine");
    }
  };

  const handleCreateMultipleReports = async () => {
    if (!user?._id) {
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
        collectorName: user?.emailAddress || "N/A",
        locationName: selectedLocationName,
        locationReportId: uuidv4(),
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

    if (successCount === collectedMachineEntries.length) {
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
  };

  const allFinancialFieldsFilled = Boolean(
    financials.taxes.trim() !== "" &&
      financials.advance.trim() !== "" &&
      financials.variance.trim() !== "" &&
      financials.varianceReason.trim() !== "" &&
      financials.amountToCollect.trim() !== "" &&
      financials.collectedAmount.trim() !== "" &&
      financials.balanceCorrection.trim() !== "" &&
      financials.balanceCorrectionReason.trim() !== "" &&
      financials.previousBalance.trim() !== "" &&
      financials.reasonForShortagePayment.trim() !== ""
  );

  const isCreateReportsEnabled =
    collectedMachineEntries.length > 0 && allFinancialFieldsFilled;

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
        ref={modalRef}
        className="max-w-5xl h-[calc(100vh-4rem)] md:h-[90vh] p-0 flex flex-col bg-container"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 md:p-6 pb-0">
          <DialogTitle className="text-xl md:text-2xl font-bold">
            New Collection Report Batch
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-1/4 border-b lg:border-b-0 lg:border-r border-gray-300 p-4 flex flex-col space-y-3 overflow-y-auto">
            <Select
              value={selectedLocationId}
              onValueChange={(value) => setSelectedLocationId(value)}
            >
              <SelectTrigger className="w-full bg-buttonActive text-white focus:ring-primary">
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
                        editingEntryId !== null &&
                        collectedMachineEntries.find(
                          (e) => e._id === editingEntryId
                        )?.machineId !== machine._id
                      }
                    >
                      {machine.name} ({machine.serialNumber})
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

          <div className="w-full lg:w-2/4 p-4 flex flex-col space-y-3 overflow-y-auto">
            {selectedMachineId && machineForDataEntry ? (
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
                  {machineForDataEntry.name} ({machineForDataEntry.serialNumber}
                  )
                </Button>

                <div className="flex items-center gap-2 mt-2">
                  <DateTimePicker
                    date={currentCollectionTime}
                    setDate={setCurrentCollectionTime}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-grayHighlight mb-1">
                      Meters In:
                    </label>
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
                    />
                    <p className="text-xs text-grayHighlight mt-1">
                      Prev In: {prevIn !== null ? prevIn : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grayHighlight mb-1">
                      Meters Out:
                    </label>
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
                    />
                    <p className="text-xs text-grayHighlight mt-1">
                      Prev Out: {prevOut !== null ? prevOut : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    id="ramClearCheckbox"
                    checked={currentRamClear}
                    onChange={(e) => setCurrentRamClear(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
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
                  <Textarea
                    placeholder="Machine-specific notes..."
                    value={currentMachineNotes}
                    onChange={(e) => setCurrentMachineNotes(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>

                <Button
                  onClick={handleAddOrUpdateEntry}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingEntryId
                    ? "Update Entry in List"
                    : "Add Machine to List"}
                </Button>
                {editingEntryId && (
                  <Button
                    onClick={() => {
                      setEditingEntryId(null);
                      resetMachineSpecificInputFields();
                      setSelectedMachineId(undefined);
                    }}
                    variant="outline"
                    className="w-full mt-1"
                  >
                    Cancel Edit
                  </Button>
                )}

                <hr className="my-4 border-gray-300" />
                <p className="text-lg font-semibold text-center text-gray-700">
                  Shared Financials for Batch
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grayHighlight mb-1">
                      Amount To Collect:
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={financials.amountToCollect}
                      onChange={(e) =>
                        (/^\d*\.?\d*$/.test(e.target.value) ||
                          e.target.value === "") &&
                        setFinancials({
                          ...financials,
                          amountToCollect: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grayHighlight mb-1">
                      Collected Amount:
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
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grayHighlight mb-1">
                      Balance Correction:
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={financials.balanceCorrection}
                      onChange={(e) =>
                        (/^\d*\.?\d*$/.test(e.target.value) ||
                          e.target.value === "") &&
                        setFinancials({
                          ...financials,
                          balanceCorrection: e.target.value,
                        })
                      }
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

          <div className="w-full lg:w-1/4 border-t lg:border-t-0 lg:border-l border-gray-300 p-4 flex flex-col space-y-2 overflow-y-auto bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 mb-2 sticky top-0 bg-gray-50 py-1">
              Collected Machines ({collectedMachineEntries.length})
            </h3>
            {collectedMachineEntries.length === 0 ? (
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
                    >
                      <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                      onClick={() => handleDeleteCollectedEntry(entry._id)}
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
              !isCreateReportsEnabled ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            disabled={!isCreateReportsEnabled}
          >
            CREATE REPORT(S) ({collectedMachineEntries.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
