import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Edit3,
  Trash2,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import type { CollectionDocument } from "@/lib/types/collections";
import { formatDate } from "@/lib/utils/formatting";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";

type CollectedMachinesListProps = {
  collectedMachines: CollectionDocument[];
  onEditMachine: (machine: CollectionDocument) => void;
  onDeleteMachine: (machineId: string) => void;
  onClose: () => void;
  onCreateReport: () => void;
  isProcessing: boolean;
};

export function CollectedMachinesList({
  collectedMachines,
  onEditMachine,
  onDeleteMachine,
  onClose,
  onCreateReport,
  isProcessing,
}: CollectedMachinesListProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );

  // Calculate financial summary
  const financialSummary = useMemo(() => {
    const totalDrop = collectedMachines.reduce((sum, machine) => {
      return sum + ((machine.metersIn || 0) - (machine.prevIn || 0));
    }, 0);

    const totalCancelled = collectedMachines.reduce((sum, machine) => {
      return sum + ((machine.metersOut || 0) - (machine.prevOut || 0));
    }, 0);

    const totalGross = totalDrop - totalCancelled;

    return {
      totalDrop,
      totalCancelled,
      totalGross,
      machineCount: collectedMachines.length,
    };
  }, [collectedMachines]);

  const handleDeleteConfirm = (machineId: string) => {
    setShowDeleteConfirm(machineId);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  const handleDeleteConfirmYes = (machineId: string) => {
    onDeleteMachine(machineId);
    setShowDeleteConfirm(null);
  };

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Slide-up Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Collected Machines
              </h2>
              <p className="text-sm text-gray-600">
                {collectedMachines.length} machine
                {collectedMachines.length !== 1 ? "s" : ""} ready
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Financial Summary */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ${financialSummary.totalDrop.toFixed(2)}
                </p>
                <p className="text-xs text-gray-600">Total Drop</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  ${financialSummary.totalCancelled.toFixed(2)}
                </p>
                <p className="text-xs text-gray-600">Cancelled</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  ${financialSummary.totalGross.toFixed(2)}
                </p>
                <p className="text-xs text-gray-600">Gross</p>
              </div>
            </div>
          </div>

          {/* Machines List */}
          <div className="p-4 space-y-3">
            {collectedMachines.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No machines collected yet
                </p>
              </div>
            ) : (
              [...collectedMachines]
                .sort((a, b) => {
                  // Sort by timestamp in descending order (most recent first)
                  const timestampA =
                    a.timestamp instanceof Date
                      ? a.timestamp
                      : new Date(a.timestamp);
                  const timestampB =
                    b.timestamp instanceof Date
                      ? b.timestamp
                      : new Date(b.timestamp);
                  return timestampB.getTime() - timestampA.getTime();
                })
                .map((machine, index) => (
                  <MachineListItem
                    key={machine._id || index}
                    machine={machine}
                    onEdit={() => onEditMachine(machine)}
                    onDelete={() => handleDeleteConfirm(machine._id)}
                    showDeleteConfirm={showDeleteConfirm === machine._id}
                    onDeleteConfirm={() => handleDeleteConfirmYes(machine._id)}
                    onDeleteCancel={handleDeleteCancel}
                  />
                ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <Button
            onClick={onCreateReport}
            disabled={collectedMachines.length === 0 || isProcessing}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
          >
            {isProcessing ? (
              "Creating Report..."
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Create Report ({collectedMachines.length} machines)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

type MachineListItemProps = {
  machine: CollectionDocument;
  onEdit: () => void;
  onDelete: () => void;
  showDeleteConfirm: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
};

function MachineListItem({
  machine,
  onEdit,
  onDelete,
  showDeleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
}: MachineListItemProps) {
  const serialNumber = getSerialNumberIdentifier({
    serialNumber: machine.serialNumber,
  });
  const drop = (machine.metersIn || 0) - (machine.prevIn || 0);
  const cancelled = (machine.metersOut || 0) - (machine.prevOut || 0);
  const gross = drop - cancelled;

  if (showDeleteConfirm) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-800">
            Delete this machine from the collection?
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteCancel}
            className="flex-1 h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteConfirm}
            className="flex-1 h-8 text-xs"
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Machine Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {machine.machineName}
          </h4>
          <p className="text-sm text-gray-600 truncate">
            Serial: {serialNumber}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8"
          >
            <Edit3 className="h-4 w-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>

      {/* Collection Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Collection Time</p>
          <p className="font-medium text-gray-900 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(machine.timestamp)}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Meters</p>
          <p className="font-medium text-gray-900">
            {machine.metersIn}/{machine.metersOut}
          </p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-green-50 rounded p-2">
          <p className="font-semibold text-green-700">${drop.toFixed(2)}</p>
          <p className="text-green-600">Drop</p>
        </div>
        <div className="bg-red-50 rounded p-2">
          <p className="font-semibold text-red-700">${cancelled.toFixed(2)}</p>
          <p className="text-red-600">Cancelled</p>
        </div>
        <div className="bg-blue-50 rounded p-2">
          <p className="font-semibold text-blue-700">${gross.toFixed(2)}</p>
          <p className="text-blue-600">Gross</p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-2">
        {machine.ramClear && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="h-3 w-3" />
            RAM Clear
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Collected
        </span>
      </div>

      {/* Notes */}
      {machine.notes && (
        <div className="text-sm">
          <p className="text-gray-600 mb-1">Notes:</p>
          <p className="text-gray-900 italic">{machine.notes}</p>
        </div>
      )}
    </div>
  );
}
