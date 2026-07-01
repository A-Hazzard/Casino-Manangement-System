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

import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import CopyMachineFieldsButtons from '@/components/shared/ui/CopyMachineFieldsButtons';
import MachineOnlineStatusDot from '@/components/ui/MachineOnlineStatusDot';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';

type MobileMachineListProps = {
  machines: CollectionReportMachineSummary[];
  collectedMachines: CollectionDocument[];
  searchTerm: string;
  selectedMachine: string | null;
  autoHighlightId?: string | null;
  isLoadingMachines: boolean;
  machineStatusMap?: Record<string, boolean>;
  onSearchChange: (value: string) => void;
  onMachineSelect: (machine: CollectionReportMachineSummary) => void;
  onBack: () => void;
};

export default function CollectionReportMobileMachineList({
  machines,
  collectedMachines,
  searchTerm,
  selectedMachine,
  autoHighlightId,
  isLoadingMachines,
  machineStatusMap = {},
  onSearchChange,
  onMachineSelect,
  onBack,
}: MobileMachineListProps) {
  // ============================================================================
  // Auto-scroll: keep the highlighted machine button in view during auto-report
  // ============================================================================
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoHighlightId || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current.querySelector<HTMLElement>(
      `[data-machine-id="${autoHighlightId}"]`
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [autoHighlightId]);

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b p-4">
        <button onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </button>
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
      <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoadingMachines ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          machines
            .filter(machine => {
              if (!searchTerm.trim()) return true;
              const term = searchTerm.toLowerCase();
              return (
                (machine.name && machine.name.toLowerCase().includes(term)) ||
                (machine.serialNumber &&
                  machine.serialNumber.toLowerCase().includes(term)) ||
                (machine.custom?.name && machine.custom.name.toLowerCase().includes(term))
              );
            })
            .map(machine => (
              <button
                key={String(machine._id)}
                data-machine-id={String(machine._id)}
                onClick={() => onMachineSelect(machine)}
                className={`w-full rounded-lg border p-4 text-left ${selectedMachine === machine._id ? 'border-blue-600 bg-blue-50' : ''} ${autoHighlightId === String(machine._id) ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`}
              >
                <span className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5">
                    {formatMachineDisplayNameWithBold(machine)}
                    <CopyMachineFieldsButtons machine={machine} machineId={String(machine._id)} />
                    {collectedMachines.find(
                      c => c.machineId === machine._id
                    ) && (
                      <span className="ml-2 text-xs text-green-600">
                        (Added)
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <MachineOnlineStatusDot
                      isOnline={machineStatusMap[String(machine._id)]}
                      hasRelay={!!machine.relayId}
                    />
                    <span className="text-xs text-gray-500">
                      Prev In: {machine.collectionMeters?.metersIn ?? 0} | Prev Out: {machine.collectionMeters?.metersOut ?? 0}
                    </span>
                  </span>
                </span>
              </button>
            ))
        )}
      </div>
    </div>
  );
}
