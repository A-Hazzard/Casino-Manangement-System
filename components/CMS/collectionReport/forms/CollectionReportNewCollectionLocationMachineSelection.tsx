/**
 * New Collection Location and Machine Selection Component
 *
 * Handles location selection and machine list display for the New Collection Modal.
 *
 * Features:
 * - Location selection dropdown
 * - Machine search functionality
 * - Machine list with selection state
 * - Locked location indicator
 *
 * @param locations - List of available locations for selection
 * @param selectedLocationId - ID of the currently selected location
 * @param lockedLocationId - ID of the location if it is locked due to existing entries
 * @param machinesOfSelectedLocation - Array of all machines belonging to the selected location
 * @param machineSearchTerm - Current search term for filtering the machine list
 * @param filteredMachines - Array of machines that match the current search term
 * @param selectedMachineId - ID of the machine currently selected for data entry
 * @param collectedMachineEntries - List of machine IDs already added to the current batch
 * @param editingEntryId - ID of the entry currently being edited (if any)
 * @param isLoadingExistingCollections - Loading state for pre-existing collection data
 * @param isProcessing - Overall form processing/submitting state
 * @param onLocationChange - Callback triggered when the location selection changes
 * @param onMachineSearchChange - Callback triggered when the machine search input changes
 * @param onMachineSelect - Callback triggered when a machine is selected from the list
 */

'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import LocationSingleSelect from '@/components/shared/ui/common/LocationSingleSelect';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import MachineOnlineStatusDot from '@/components/ui/MachineOnlineStatusDot';
import WowAutoReportButton from '@/components/CMS/collectionReport/forms/WowAutoReportButton';
import type { WowAutoReportControl } from '@/lib/hooks/collectionReport/useWowAutoReport';
import type { CollectionReportMachineSummary } from '@/lib/types/api';
import { toast } from 'sonner';

type NewCollectionLocationMachineSelectionProps = {
  locations: Array<{ _id: string; name: string }>;
  selectedLocationId: string | undefined;
  lockedLocationId: string | undefined;
  machinesOfSelectedLocation: CollectionReportMachineSummary[];
  machineSearchTerm: string;
  filteredMachines: CollectionReportMachineSummary[];
  selectedMachineId: string | undefined;
  collectedMachineEntries: Array<{ machineId: string; _id?: string }>;
  editingEntryId: string | null;
  isLoadingLocations: boolean;
  isLoadingMachines: boolean;
  isLoadingExistingCollections: boolean;
  isProcessing: boolean;
  machineStatusMap?: Record<string, boolean>;
  onLocationChange: (value: string) => void;
  onMachineSearchChange: (value: string) => void;
  onMachineSelect: (machineId: string) => void;
  autoReport?: WowAutoReportControl;
  autoHighlightId?: string | null;
};

export default function CollectionReportNewCollectionLocationMachineSelection({
  locations,
  selectedLocationId,
  lockedLocationId,
  machinesOfSelectedLocation,
  machineSearchTerm,
  filteredMachines,
  selectedMachineId,
  collectedMachineEntries,
  editingEntryId,
  isLoadingLocations,
  isLoadingMachines,
  isLoadingExistingCollections,
  isProcessing,
  machineStatusMap = {},
  onLocationChange,
  onMachineSearchChange,
  onMachineSelect,
  autoReport,
  autoHighlightId,
}: NewCollectionLocationMachineSelectionProps) {
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
    <div className="flex min-h-0 w-full flex-col space-y-3 overflow-y-auto p-3 md:p-4">
      <div
        className={
          isProcessing ||
          lockedLocationId !== undefined ||
          collectedMachineEntries.length > 0
            ? 'pointer-events-none opacity-50'
            : ''
        }
      >
        {isLoadingLocations ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <LocationSingleSelect
            locations={locations
              .filter(loc => loc.name)
              .map(loc => ({
                id: String(loc._id),
                name: loc.name,
                sasEnabled: false,
              }))}
            selectedLocation={lockedLocationId || selectedLocationId || ''}
            onSelectionChange={onLocationChange}
            placeholder="Select Location"
            includeAllOption={false}
          />
        )}
      </div>

      {autoReport?.enabled && (
        <WowAutoReportButton control={autoReport} disabled={isProcessing} />
      )}

      {lockedLocationId && (
        <p className="text-xs italic text-gray-500">
          Location is locked to the first machine&apos;s location
        </p>
      )}

      {/* Machine search bar - always visible when location is selected */}
      {(selectedLocationId || lockedLocationId) && (
        <div className="space-y-2">
          {isLoadingMachines ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : (
            <Input
              type="text"
              placeholder="Search machines..."
              value={machineSearchTerm}
              onChange={e => onMachineSearchChange(e.target.value)}
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

      <div ref={scrollContainerRef} className="min-h-[100px] flex-grow space-y-2 overflow-y-auto">
        {isLoadingExistingCollections &&
        !selectedLocationId &&
        !lockedLocationId ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="rounded-md border border-gray-200 bg-white p-3 shadow"
              >
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : selectedLocationId || lockedLocationId ? (
          isLoadingMachines ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : (
            (() => {
              const locationIdToUse = lockedLocationId || selectedLocationId;
              const location = locations.find(
                l => String(l._id) === locationIdToUse
              );

              if (!location) {
                return (
                  <div className="py-4 text-center text-gray-500">
                    <p>Location data not available</p>
                    <p className="text-xs">ID: {locationIdToUse}</p>
                  </div>
                );
              }

              return filteredMachines.length > 0 ? (
                filteredMachines.map((machine, index) => (
                  <Button
                    key={
                      machine._id
                        ? String(machine._id)
                        : `machine-${index}-${
                            machine.serialNumber || 'unknown'
                          }`
                    }
                    data-machine-id={String(machine._id)}
                    variant={
                      selectedMachineId === machine._id
                        ? 'secondary'
                        : collectedMachineEntries.find(
                              e => e.machineId === machine._id
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
                          e => e.machineId === machine._id
                        ) &&
                        true
                      ) {
                        toast.info(
                          `${machine.name} is already in the list. Click edit on the right to modify.`,
                          { position: 'top-left' }
                        );
                        return;
                      }

                      // If machine is already selected, unselect it
                      if (selectedMachineId === String(machine._id)) {
                        console.warn('🔍 Machine unselected:', {
                          machineId: String(machine._id),
                          machineName: machine.name,
                        });
                        onMachineSelect('');
                        return;
                      }

                      console.warn('🔍 Machine selected:', {
                        machineId: String(machine._id),
                        machineName: machine.name,
                        serialNumber: machine.serialNumber,
                        collectionMeters: machine.collectionMeters,
                      });
                      onMachineSelect(String(machine._id));
                    }}
                    disabled={
                      isProcessing ||
                      (editingEntryId !== null &&
                        collectedMachineEntries.find(
                          e => e._id === editingEntryId
                        )?.machineId !== machine._id) ||
                      (collectedMachineEntries.find(
                        e => e.machineId === machine._id
                      ) &&
                        !editingEntryId)
                    }
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      {formatMachineDisplayNameWithBold(machine)}
                      <span className="flex items-center gap-1.5">
                        {machine.relayId && (
                          <MachineOnlineStatusDot
                            isOnline={machineStatusMap[String(machine._id)]}
                          />
                        )}
                        {collectedMachineEntries.find(
                          e => e.machineId === machine._id
                        ) &&
                          !editingEntryId && (
                            <span className="text-xs text-green-500">
                              (Added)
                            </span>
                          )}
                      </span>
                    </span>
                  </Button>
                ))
              ) : (
                <p className="pt-2 text-xs text-grayHighlight md:text-sm">
                  {machineSearchTerm && lockedLocationId
                    ? `No machines found matching "${machineSearchTerm}".`
                    : 'No machines for this location.'}
                </p>
              );
            })()
          )
        ) : (
          <p className="pt-2 text-xs text-grayHighlight md:text-sm">
            Select a location to see machines.
          </p>
        )}
      </div>
    </div>
  );
}
