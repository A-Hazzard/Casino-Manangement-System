/**
 * Edit Collection Location and Machine Selection Component
 *
 * Handles location selection and machine list display for the Edit Collection Modal.
 *
 * Features:
 * - Location selection dropdown (disabled/locked)
 * - Machine search functionality
 * - Machine list with selection state
 * - Automatic "Added" status indicators for machines already in the report
 *
 * @param locations - Complete list of locations with their associated machines
 * @param selectedLocationId - The source location ID for this report (typically immutable)
 * @param setSelectedLocationId - Setter for the location (used during init)
 * @param machinesOfSelectedLocation - All machines available for the currently selected location
 * @param machineSearchTerm - Filter string for the machine selection list
 * @param setMachineSearchTerm - State setter for machine searching
 * @param filteredMachines - Search-filtered subset of machines
 * @param isLoadingMachines - Loading indicator for machine data fetching
 * @param isProcessing - Loading indicator for submission/batch operations
 * @param selectedMachineId - ID of the machine currently being configured
 * @param setSelectedMachineId - Selection callback for machines
 * @param collectedMachineEntries - List of machines already existing in the draft/report
 * @param editingEntryId - ID of the specific collection entry being modified
 */

'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import LocationSingleSelect from '@/components/shared/ui/common/LocationSingleSelect';
import { Skeleton } from '@/components/shared/ui/skeleton';
import type {
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
} from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collection';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import CopyMachineFieldsButtons from '@/components/shared/ui/CopyMachineFieldsButtons';
import MachineOnlineStatusDot from '@/components/ui/MachineOnlineStatusDot';
import WowAutoReportButton from '@/components/CMS/collectionReport/forms/WowAutoReportButton';
import { getLocationTypeBadge } from '@/lib/utils/location/page';
import type { WowAutoReportControl } from '@/lib/hooks/collectionReport/useWowAutoReport';
import { toast } from 'sonner';

type EditCollectionLocationMachineSelectionProps = {
  locations: CollectionReportLocationWithMachines[];
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  machinesOfSelectedLocation: CollectionReportMachineSummary[];
  machineSearchTerm: string;
  setMachineSearchTerm: (term: string) => void;
  filteredMachines: CollectionReportMachineSummary[];
  isLoadingLocations: boolean;
  isLoadingMachines: boolean;
  isProcessing: boolean;
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;
  collectedMachineEntries: CollectionDocument[];
  editingEntryId: string | null;
  machineStatusMap?: Record<string, boolean>;
  autoReport?: WowAutoReportControl;
  autoHighlightId?: string | null;
};

export default function CollectionReportEditLocationMachineSelection({
  locations,
  selectedLocationId,
  setSelectedLocationId,
  machinesOfSelectedLocation,
  machineSearchTerm,
  setMachineSearchTerm,
  filteredMachines,
  isLoadingLocations,
  isLoadingMachines,
  isProcessing,
  selectedMachineId,
  setSelectedMachineId,
  collectedMachineEntries,
  editingEntryId,
  machineStatusMap = {},
  autoReport,
  autoHighlightId,
}: EditCollectionLocationMachineSelectionProps) {
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
    <div className="flex h-full min-h-0 w-full flex-1 flex-col space-y-3 p-3 transition-all md:p-4">
      <div className="pointer-events-none opacity-50">
        {isLoadingLocations ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <LocationSingleSelect
            selectedLocation={selectedLocationId}
            onSelectionChange={setSelectedLocationId}
            locations={locations.map(loc => ({
              id: String(loc._id),
              name: loc.name,
              sasEnabled: false,
            }))}
            placeholder="Select Location"
            includeAllOption={false}
          />
        )}
      </div>
      {selectedLocationId && (() => {
        const loc = locations.find(l => String(l._id) === selectedLocationId);
        if (!loc) return null;
        const badge = getLocationTypeBadge(loc.isLocalServer, loc.noSMIBLocation);
        return (
          <span className={`inline-flex w-fit items-center rounded-sm px-2 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        );
      })()}

      {autoReport?.enabled && (
        <WowAutoReportButton control={autoReport} disabled={isProcessing} />
      )}

      {/* Machine search bar - always visible when location is selected */}
      {selectedLocationId && (
        <div className="space-y-2">
          {isLoadingMachines ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : (
            <Input
              type="text"
              placeholder="Search machines..."
              value={machineSearchTerm}
              onChange={e => setMachineSearchTerm(e.target.value)}
              className="w-full"
            />
          )}
          {!isLoadingMachines && machineSearchTerm && (
            <p className="text-xs text-gray-500">
              Showing {filteredMachines.length} of{' '}
              {machinesOfSelectedLocation.length} machines
            </p>
          )}
        </div>
      )}

      {/* Machine list */}
      <div ref={scrollContainerRef} className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {selectedLocationId ? (
          isLoadingMachines ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : filteredMachines.length > 0 ? (
            filteredMachines.map(machine => (
              <Button
                key={String(machine._id)}
                data-machine-id={String(machine._id)}
                variant={
                  selectedMachineId === String(machine._id)
                    ? 'secondary'
                    : collectedMachineEntries.find(
                          e => e.machineId === String(machine._id)
                        )
                      ? 'default'
                      : 'outline'
                }
                className={`h-auto w-full justify-start whitespace-normal break-words px-3 py-2 text-left ${
                  autoHighlightId === String(machine._id)
                    ? 'ring-2 ring-purple-500 ring-offset-1'
                    : ''
                }`}
                onClick={() => {
                  if (
                    collectedMachineEntries.find(
                      e => e.machineId === String(machine._id)
                    ) &&
                    !editingEntryId
                  ) {
                    toast.info(
                      `${machine.name} is already in the list. Click edit on the right to modify.`,
                      { position: 'top-left' }
                    );
                    return;
                  }

                  if (editingEntryId) {
                    const entryBeingEdited = collectedMachineEntries.find(
                      e => e._id === editingEntryId
                    );
                    if (entryBeingEdited?.machineId === String(machine._id)) {
                      setSelectedMachineId(String(machine._id));
                      return;
                    }
                  }

                  if (selectedMachineId === String(machine._id)) {
                    setSelectedMachineId('');
                    return;
                  }
                  setSelectedMachineId(String(machine._id));
                }}
                disabled={
                  isProcessing ||
                  (editingEntryId !== null &&
                    collectedMachineEntries.find(e => e._id === editingEntryId)
                      ?.machineId !== String(machine._id))
                }
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-start gap-1">
                    {formatMachineDisplayNameWithBold(machine)}
                    <CopyMachineFieldsButtons machine={machine} machineId={String(machine._id)} />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MachineOnlineStatusDot
                      isOnline={machineStatusMap[String(machine._id)]}
                      hasRelay={!!machine.relayId}
                    />
                    {collectedMachineEntries.find(
                      e => e.machineId === String(machine._id)
                    ) &&
                      !editingEntryId && (
                        <span className="text-xs text-green-500">(Added)</span>
                      )}
                  </span>
                </span>
              </Button>
            ))
          ) : (
            <p className="pt-2 text-xs text-grayHighlight">
              No machines found.
            </p>
          )
        ) : (
          <p className="pt-2 text-xs text-grayHighlight">Select a location.</p>
        )}
      </div>
    </div>
  );
}
