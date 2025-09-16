import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import { ModernDateTimePicker } from "@/components/ui/modern-date-time-picker";
import type { CollectionDocument } from "@/lib/types/collections";
import type { CollectionReportMachineSummary } from "@/lib/types/api";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
// import { formatDate } from "@/lib/utils/formatting";
import { validateMachineEntry } from "@/lib/helpers/collectionReportModal";
import { useUserStore } from "@/lib/store/userStore";
import { toast } from "sonner";

type MachineDataFormProps = {
  machine: CollectionReportMachineSummary;
  location: { name: string };
  isEditing: boolean;
  editingEntry?: CollectionDocument | null;
  onMachineAdded: (machine: CollectionDocument) => void;
  onMachineUpdated: (machine: CollectionDocument) => void;
  onCancel: () => void;
  isProcessing: boolean;
};

export function MachineDataForm({
  machine,
  location,
  isEditing,
  editingEntry,
  onMachineAdded,
  onMachineUpdated,
  onCancel,
  isProcessing,
}: MachineDataFormProps) {
  const user = useUserStore((state) => state.user);
  const userId = user?._id;

  // Form state
  const [collectionTime, setCollectionTime] = useState<Date>(new Date());
  const [metersIn, setMetersIn] = useState("");
  const [metersOut, setMetersOut] = useState("");
  const [ramClear, setRamClear] = useState(false);
  const [ramClearMetersIn, setRamClearMetersIn] = useState("");
  const [ramClearMetersOut, setRamClearMetersOut] = useState("");
  const [notes, setNotes] = useState("");
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Previous meter values
  const [prevIn, setPrevIn] = useState<number | null>(null);
  const [prevOut, setPrevOut] = useState<number | null>(null);

  // Initialize form with existing data if editing
  useEffect(() => {
    if (isEditing && editingEntry) {
      setCollectionTime(new Date(editingEntry.timestamp));
      setMetersIn(editingEntry.metersIn?.toString() || "");
      setMetersOut(editingEntry.metersOut?.toString() || "");
      setRamClear(editingEntry.ramClear || false);
      setRamClearMetersIn(editingEntry.ramClearMetersIn?.toString() || "");
      setRamClearMetersOut(editingEntry.ramClearMetersOut?.toString() || "");
      setNotes(editingEntry.notes || "");
      setPrevIn(editingEntry.prevIn || 0);
      setPrevOut(editingEntry.prevOut || 0);
    } else {
      // Initialize with machine's collection meters
      if (machine.collectionMeters) {
        setPrevIn(machine.collectionMeters.metersIn || 0);
        setPrevOut(machine.collectionMeters.metersOut || 0);
      } else {
        setPrevIn(0);
        setPrevOut(0);
      }

      // Reset form fields
      setCollectionTime(new Date());
      setMetersIn("");
      setMetersOut("");
      setRamClear(false);
      setRamClearMetersIn("");
      setRamClearMetersOut("");
      setNotes("");
    }
  }, [isEditing, editingEntry, machine]);

  // Real-time validation
  const validateInputs = useCallback(() => {
    if (!metersIn || !metersOut) {
      setValidationWarnings([]);
      return;
    }

    const validation = validateMachineEntry(
      String(machine._id),
      machine,
      metersIn,
      metersOut,
      userId,
      ramClear,
      machine.collectionMeters?.metersIn,
      machine.collectionMeters?.metersOut,
      ramClearMetersIn ? Number(ramClearMetersIn) : undefined,
      ramClearMetersOut ? Number(ramClearMetersOut) : undefined
    );

    const warnings = [...(validation.warnings || [])];

    // Check for RAM Clear meters if RAM Clear is enabled
    if (ramClear && (!ramClearMetersIn || !ramClearMetersOut)) {
      warnings.push("Please enter last meters before RAM Clear (or rollover)");
    }

    setValidationWarnings(warnings);
  }, [
    machine,
    metersIn,
    metersOut,
    userId,
    ramClear,
    ramClearMetersIn,
    ramClearMetersOut,
  ]);

  useEffect(() => {
    validateInputs();
  }, [validateInputs]);

  const handleSubmit = async () => {
    if (isProcessing) return;

    // Check if RAM Clear meters are mandatory when RAM Clear is checked
    if (ramClear && (!ramClearMetersIn || !ramClearMetersOut)) {
      toast.error(
        "RAM Clear Meters In and Out are required when RAM Clear is checked"
      );
      return;
    }

    const validation = validateMachineEntry(
      String(machine._id),
      machine,
      metersIn,
      metersOut,
      userId,
      ramClear,
      machine.collectionMeters?.metersIn,
      machine.collectionMeters?.metersOut,
      ramClearMetersIn ? Number(ramClearMetersIn) : undefined,
      ramClearMetersOut ? Number(ramClearMetersOut) : undefined
    );

    if (!validation.isValid) {
      toast.error(validation.error || "Validation failed");
      return;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach((warning) => {
        toast.warning(warning, { duration: 4000 });
      });
    }

    // Create machine entry data
    const machineEntry: CollectionDocument = {
      _id: editingEntry?._id || `temp-${Date.now()}`,
      isCompleted: false,
      machineId: String(machine._id),
      machineName: machine.name,
      machineCustomName: String(machine._id),
      serialNumber: machine.serialNumber || "",
      timestamp: collectionTime,
      metersIn: Number(metersIn),
      metersOut: Number(metersOut),
      prevIn: prevIn || 0,
      prevOut: prevOut || 0,
      softMetersIn: 0,
      softMetersOut: 0,
      movement: {
        metersIn: Number(metersIn),
        metersOut: Number(metersOut),
        gross:
          Number(metersIn) -
          (prevIn || 0) -
          (Number(metersOut) - (prevOut || 0)),
      },
      ramClear: ramClear,
      ramClearMetersIn: ramClearMetersIn ? Number(ramClearMetersIn) : undefined,
      ramClearMetersOut: ramClearMetersOut
        ? Number(ramClearMetersOut)
        : undefined,
      notes: notes,
      location: location.name,
      collector: user?.emailAddress || "Unknown Collector",
      locationReportId: "",
      sasMeters: {
        machine: machine.name,
        drop: 0,
        totalCancelledCredits: 0,
        gross: 0,
        gamesPlayed: 0,
        jackpot: 0,
        sasStartTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        sasEndTime: collectionTime.toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    };

    if (isEditing) {
      onMachineUpdated(machineEntry);
    } else {
      onMachineAdded(machineEntry);
    }
  };

  const serialNumber = getSerialNumberIdentifier(machine);

  return (
    <div className="p-4 space-y-6 h-full overflow-y-auto">
      {/* Machine Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {machine.name.charAt(0)}
            </span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{machine.name}</h2>
            <p className="text-sm text-gray-600">Serial: {serialNumber}</p>
          </div>
        </div>

        {isEditing && (
          <div className="mt-3 p-2 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Editing existing entry</strong> - Make your changes and
              tap &quot;Update Entry&quot;
            </p>
          </div>
        )}
      </div>

      {/* Collection Time */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          Collection Time
        </label>
        <ModernDateTimePicker
          date={collectionTime}
          setDate={(d) => d && setCollectionTime(d)}
          disabled={isProcessing}
          placeholder="Select collection time"
        />
      </div>

      {/* Meter Readings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Meter Readings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              Meters In
            </label>
            <Input
              type="number"
              placeholder="0"
              value={metersIn}
              onChange={(e) => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                  setMetersIn(val);
                }
              }}
              disabled={isProcessing}
              className="h-12 text-base"
            />
            <p className="text-xs text-gray-500">
              Previous: {prevIn !== null ? prevIn : "N/A"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              Meters Out
            </label>
            <Input
              type="number"
              placeholder="0"
              value={metersOut}
              onChange={(e) => {
                const val = e.target.value;
                if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                  setMetersOut(val);
                }
              }}
              disabled={isProcessing}
              className="h-12 text-base"
            />
            <p className="text-xs text-gray-500">
              Previous: {prevOut !== null ? prevOut : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* RAM Clear Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="ramClear"
            checked={ramClear}
            onChange={(e) => {
              setRamClear(e.target.checked);
              if (!e.target.checked) {
                setRamClearMetersIn("");
                setRamClearMetersOut("");
              }
            }}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={isProcessing}
          />
          <label
            htmlFor="ramClear"
            className="text-sm font-medium text-gray-900"
          >
            RAM Clear (Rollover occurred)
          </label>
        </div>

        {ramClear && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-800 font-medium">
                Enter the last meter readings before RAM Clear
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-900">
                  RAM Clear Meters In
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={ramClearMetersIn}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                      setRamClearMetersIn(val);
                    }
                  }}
                  disabled={isProcessing}
                  className="h-12 text-base border-blue-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-900">
                  RAM Clear Meters Out
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={ramClearMetersOut}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^-?\d*\.?\d*$/.test(val) || val === "") {
                      setRamClearMetersOut(val);
                    }
                  }}
                  disabled={isProcessing}
                  className="h-12 text-base border-blue-300 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                Validation Warnings
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          Notes (Optional)
        </label>
        <Textarea
          placeholder="Add any notes about this collection..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isProcessing}
          className="min-h-[100px] text-base"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 h-12"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isProcessing || !metersIn || !metersOut}
          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
        >
          {isProcessing ? (
            "Processing..."
          ) : isEditing ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Update Entry
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Add to List
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
