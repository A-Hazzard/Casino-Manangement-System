import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Settings,
  Edit3,
  Trash2,
  CheckCircle,
  Circle,
} from "lucide-react";
import type { CollectionDocument } from "@/lib/types/collections";
import type { CollectionReportMachineSummary } from "@/lib/types/api";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";

type MachineSelectorProps = {
  location: { name: string; machines?: CollectionReportMachineSummary[] };
  collectedMachines: CollectionDocument[];
  onMachineSelect: (machine: CollectionReportMachineSummary) => void;
  onEditMachine: (machine: CollectionDocument) => void;
  onDeleteMachine: (machineId: string) => void;
  isLoading: boolean;
};

export function MachineSelector({
  location,
  collectedMachines,
  onMachineSelect,
  onEditMachine,
  onDeleteMachine,
  isLoading,
}: MachineSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const machines = useMemo(
    () => (location.machines || []) as CollectionReportMachineSummary[],
    [location.machines]
  );

  // Filter machines based on search term
  const filteredMachines = useMemo(() => {
    if (!searchTerm.trim()) return machines;

    return machines.filter(
      (machine: CollectionReportMachineSummary) =>
        machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [machines, searchTerm]);

  // Check if machine is collected
  const isMachineCollected = (machineId: string) => {
    return collectedMachines.some((m) => m.machineId === machineId);
  };

  // Get collected machine data
  const getCollectedMachine = (machineId: string) => {
    return collectedMachines.find((m) => m.machineId === machineId);
  };

  const handleMachineClick = (machine: CollectionReportMachineSummary) => {
    if (isMachineCollected(String(machine._id))) {
      // If machine is already collected, show edit option
      const collectedMachine = getCollectedMachine(String(machine._id));
      if (collectedMachine) {
        onEditMachine(collectedMachine);
      }
    } else {
      // If machine is not collected, select for data entry
      onMachineSelect(machine);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-lg border border-gray-200 space-y-2"
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="space-y-3">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {location.name}
          </h2>
          <p className="text-sm text-gray-600">
            Select a machine to enter collection data
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search machines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Collection Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {collectedMachines.length} of {machines.length} collected
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Collected</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Machines Grid */}
      <div className="space-y-3">
        {filteredMachines.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchTerm
                ? "No machines found matching your search"
                : "No machines available at this location"}
            </p>
          </div>
        ) : (
          filteredMachines.map((machine: CollectionReportMachineSummary) => (
            <MachineCard
              key={String(machine._id)}
              machine={machine}
              isCollected={isMachineCollected(String(machine._id))}
              collectedMachine={getCollectedMachine(String(machine._id))}
              onClick={() => handleMachineClick(machine)}
              onEdit={() => {
                const collectedMachine = getCollectedMachine(
                  String(machine._id)
                );
                if (collectedMachine) onEditMachine(collectedMachine);
              }}
              onDelete={() => {
                const collectedMachine = getCollectedMachine(
                  String(machine._id)
                );
                if (collectedMachine) onDeleteMachine(collectedMachine._id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

type MachineCardProps = {
  machine: CollectionReportMachineSummary;
  isCollected: boolean;
  collectedMachine?: CollectionDocument;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function MachineCard({
  machine,
  isCollected,
  collectedMachine,
  onClick,
  onEdit,
  onDelete,
}: MachineCardProps) {
  const serialNumber = getSerialNumberIdentifier(machine);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Button
        variant="ghost"
        className="w-full h-auto p-4 justify-start text-left hover:bg-gray-50"
        onClick={onClick}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isCollected ? (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <h3 className="font-medium text-gray-900 truncate">
                {machine.name}
              </h3>
            </div>

            <p className="text-sm text-gray-600 truncate mb-2">
              Serial: {serialNumber}
            </p>

            {isCollected && collectedMachine && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  Collected:{" "}
                  {new Date(collectedMachine.timestamp).toLocaleTimeString()}
                </p>
                <p>
                  Meters: {collectedMachine.metersIn}/
                  {collectedMachine.metersOut}
                </p>
                {collectedMachine.ramClear && (
                  <p className="text-orange-600 font-medium">RAM Clear</p>
                )}
              </div>
            )}
          </div>
        </div>
      </Button>

      {/* Action Buttons for Collected Machines */}
      {isCollected && (
        <div className="border-t border-gray-100 p-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex-1 h-8 text-xs"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex-1 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
