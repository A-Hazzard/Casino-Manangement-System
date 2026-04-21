/**
 * Mobile Collection Modal - Machine List Component
 *
 * A simplified selection interface for picking machines during new collection report creation on mobile.
 *
 * Features:
 * - Direct search-to-select workflow
 * - "Added" badges for machines already in the batch
 * - Loading skeletons for asynchronous data fetching
 * - Clean, full-height scrollable list area
 *
 * @param machines - Array of available machine summaries
 * @param collectedMachines - Array of machine documents already in the batch
 * @param searchTerm - Current text-based search filter
 * @param selectedMachine - The ID of the machine currently being configured
 * @param isLoadingMachines - Loading status for the list content
 * @param onSearchChange - Callback for updating the search state
 * @param onMachineSelect - Interaction callback for picking a machine
 * @param onBack - Navigation callback to exit the list
 */

'use client';

import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';

type MobileMachineListProps = {
  machines: CollectionReportMachineSummary[];
  collectedMachines: CollectionDocument[];
  searchTerm: string;
  selectedMachine: string | null;
  isLoadingMachines: boolean;
  onSearchChange: (value: string) => void;
  onMachineSelect: (machine: CollectionReportMachineSummary) => void;
  onBack: () => void;
};

export default function CollectionReportMobileMachineList({
  machines,
  collectedMachines,
  searchTerm,
  selectedMachine,
  isLoadingMachines,
  onSearchChange,
  onMachineSelect,
  onBack,
}: MobileMachineListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 p-4 border-b">
        <button onClick={onBack}><ArrowLeft className="h-6 w-6" /></button>
        <h3 className="font-bold">Select Machine</h3>
      </div>
      <div className="p-4">
        <input
          type="text"
          placeholder="Search machine..."
          className="w-full rounded-lg border p-2"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingMachines ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          machines.filter(m => {
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            return (
              (m.name && m.name.toLowerCase().includes(term)) ||
              (m.serialNumber && m.serialNumber.toLowerCase().includes(term)) ||
              (m.custom?.name && m.custom.name.toLowerCase().includes(term))
            );
          }).map(machine => (
            <button
              key={String(machine._id)}
              onClick={() => onMachineSelect(machine)}
              className={`w-full rounded-lg border p-4 text-left ${selectedMachine === machine._id ? 'border-blue-600 bg-blue-50' : ''}`}
            >
              {formatMachineDisplayNameWithBold(machine)}
              {collectedMachines.find(c => c.machineId === machine._id) && (
                <span className="ml-2 text-xs text-green-600">(Added)</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}


