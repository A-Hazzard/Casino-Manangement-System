/**
 * Mobile Edit Collection Modal - Machine List Component
 *
 * A specialized selection panel for picking machines within the Edit Collection flow on mobile.
 *
 * Features:
 * - Searchable machine list with real-time filtering
 * - Visual status indicators for "Added" or "Selected" states
 * - Integrated Live Reconciliation summary (Target info)
 * - Auto-scrolling container with custom scrollbars
 * - Back navigation to the location selector
 *
 * @param locationName - The name of the location used for contextual labeling
 * @param machines - List of all machines available for the location
 * @param collectedMachines - Documents for machines already part of the current report
 * @param searchTerm - Active search filter text
 * @param selectedMachine - The ID of the machine currently active in the form (if any)
 * @param isLoadingMachines - Loading state for the machinery data fetch
 * @param onSearchChange - Callback for search input updates
 * @param onMachineSelect - Selection callback when a machine is tapped
 * @param onMachineUnselect - Deselection callback to clear the active machine
 * @param onBack - Navigation callback to return to the previous screen
 * @param sortMachines - Logic for deterministic sorting of the machine list
 */

'use client';

import { ArrowLeft, Info } from 'lucide-react';
import { Skeleton } from '@/components/shared/ui/skeleton';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';

type MobileEditMachineListProps = {
  locationName: string;
  machines: CollectionReportMachineSummary[];
  collectedMachines: CollectionDocument[];
  searchTerm: string;
  selectedMachine: string | null;
  isLoadingMachines: boolean;
  onSearchChange: (value: string) => void;
  onMachineSelect: (machine: CollectionReportMachineSummary) => void;
  onMachineUnselect: () => void;
  onBack: () => void;
  sortMachines: <T extends { name?: string; machineName?: string; serialNumber?: string }>(
    machines: T[]
  ) => T[];
};

export default function CollectionReportMobileEditMachineList({
  locationName,
  machines,
  collectedMachines,
  searchTerm,
  selectedMachine,
  isLoadingMachines,
  onSearchChange,
  onMachineSelect,
  onMachineUnselect,
  onBack,
  sortMachines,
}: MobileEditMachineListProps) {
  // Filter machines based on search term
  const filteredMachines = machines.filter(machine => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (machine.serialNumber &&
        machine.serialNumber.toLowerCase().includes(searchLower)) ||
      (machine.custom?.name &&
        machine.custom.name.toLowerCase().includes(searchLower)) ||
      (machine.name && machine.name.toLowerCase().includes(searchLower))
    );
  });

  const sortedMachines = sortMachines(filteredMachines);

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Machines for {locationName}</h3>
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Live Reconciliation Summary - Added for parity with New modal */}
      {collectedMachines.length > 0 && (
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/30 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h5 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
              <Info className="h-3 w-3" />
              Live Reconciliation
            </h5>
            <span className="text-[9px] font-medium text-blue-500 italic">
              (Syncs as you add machines)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-blue-100/50 pt-2">
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase">Target</p>
              <p className="text-xs font-black text-gray-900">
                ${(Number(collectedMachines.reduce((sum, m) => sum + (m.movement?.gross || 0), 0))).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase">Carryover</p>
              <p className="text-xs font-black text-blue-600">$0.00</p>
            </div>
          </div>
        </div>
      )}

      {/* Search bar for machines */}
      {machines.length > 3 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search machines by name or serial number..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Scrollable machine list container */}
      <div
        className="mobile-collection-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pb-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6',
        }}
      >
        {isLoadingMachines ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 shadow"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : sortedMachines.length > 0 ? (
          sortedMachines.map(machine => {
            const isSelected = selectedMachine === String(machine._id);
            const isCollected = collectedMachines.some(
              collected => String(collected.machineId) === String(machine._id)
            );

            return (
              <div
                key={String(machine._id)}
                className={`rounded-lg border-2 p-4 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : isCollected
                      ? 'border-green-300 bg-green-50 shadow-sm'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="break-words text-sm font-semibold text-primary">
                      {formatMachineDisplayNameWithBold(machine)}
                    </p>
                    <div className="mt-1 space-y-1 text-xs text-gray-600">
                      <p className="flex flex-col sm:flex-row sm:gap-2">
                        <span>
                          Prev In: {machine.collectionMeters?.metersIn || 0}
                        </span>
                        <span className="hidden sm:inline">|</span>
                        <span>
                          Prev Out: {machine.collectionMeters?.metersOut || 0}
                        </span>
                      </p>
                    </div>
                    {isCollected && (
                      <div className="mt-1 flex items-center">
                        <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                        <p className="text-xs font-semibold text-green-600">
                          Added to Collection
                        </p>
                      </div>
                    )}
                    {isSelected && (
                      <div className="mt-1 flex items-center">
                        <div className="mr-2 h-2 w-2 rounded-full bg-blue-500"></div>
                        <p className="text-xs font-semibold text-blue-600">
                          Selected
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (isSelected) {
                        onMachineUnselect();
                      } else {
                        onMachineSelect(machine);
                      }
                    }}
                    disabled={isCollected}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isCollected
                        ? 'cursor-not-allowed border border-green-300 bg-green-100 text-green-700'
                        : isSelected
                          ? 'border border-red-600 bg-red-600 text-white hover:bg-red-700'
                          : 'border border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isCollected
                      ? '✓ Added'
                      : isSelected
                        ? 'Unselect'
                        : 'Select'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-gray-500">
            <p>No machines found for this location.</p>
          </div>
        )}
      </div>
    </div>
  );
}


