/**
 * Edit Collection Location and Machine Selection Component
 *
 * Handles location selection and machine list display for the Edit Collection Modal
 *
 * Features:
 * - Location selection dropdown (disabled/locked)
 * - Machine search functionality
 * - Machine list with selection state
 */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocationSelect } from '@/components/ui/custom-select';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  CollectionReportLocationWithMachines,
  CollectionReportMachineSummary,
} from '@/lib/types/api';
import type { CollectionDocument } from '@/lib/types/collections';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';

type EditCollectionLocationMachineSelectionProps = {
  locations: CollectionReportLocationWithMachines[];
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  machinesOfSelectedLocation: CollectionReportMachineSummary[];
  machineSearchTerm: string;
  setMachineSearchTerm: (term: string) => void;
  filteredMachines: CollectionReportMachineSummary[];
  isLoadingMachines: boolean;
  isProcessing: boolean;
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;
  collectedMachineEntries: CollectionDocument[];
  editingEntryId: string | null;
};

export default function EditCollectionLocationMachineSelection({
  locations,
  selectedLocationId,
  setSelectedLocationId,
  machinesOfSelectedLocation,
  machineSearchTerm,
  setMachineSearchTerm,
  filteredMachines,
  isLoadingMachines,
  isProcessing,
  selectedMachineId,
  setSelectedMachineId,
  collectedMachineEntries,
  editingEntryId,
}: EditCollectionLocationMachineSelectionProps) {
  return (
    <div className="flex min-h-0 w-1/5 flex-col space-y-3 overflow-y-auto border-r border-gray-300 p-3 md:p-4">
      <LocationSelect
        value={selectedLocationId}
        onValueChange={setSelectedLocationId}
        locations={locations.map(loc => ({
          _id: String(loc._id),
          name: loc.name,
        }))}
        placeholder="Select Location"
        disabled={true}
        className="w-full"
        emptyMessage="No locations found"
      />

      {/* Machine search bar - always visible when location is selected */}
      {selectedLocationId && (
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Search machines..."
            value={machineSearchTerm}
            onChange={e => setMachineSearchTerm(e.target.value)}
            className="w-full"
          />
          {machineSearchTerm && (
            <p className="text-xs text-gray-500">
              Showing {filteredMachines.length} of{' '}
              {machinesOfSelectedLocation.length} machines
            </p>
          )}
        </div>
      )}

      {/* Machine list */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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
                  collectedMachineEntries.find(
                    e => e.machineId === String(machine._id)
                  ) && !editingEntryId
                    ? 'cursor-not-allowed opacity-60'
                    : ''
                }`}
                onClick={() => {
                  if (editingEntryId) {
                    const entryBeingEdited = collectedMachineEntries.find(
                      e => e._id === editingEntryId
                    );
                    if (entryBeingEdited?.machineId === String(machine._id)) {
                      setSelectedMachineId(String(machine._id));
                      return;
                    }
                  }
                  if (
                    collectedMachineEntries.find(
                      e => e.machineId === String(machine._id)
                    ) &&
                    !editingEntryId
                  ) {
                    return;
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
                    collectedMachineEntries.find(
                      e => e._id === editingEntryId
                    )?.machineId !== String(machine._id)) ||
                  (collectedMachineEntries.find(
                    e => e.machineId === String(machine._id)
                  ) &&
                    !editingEntryId)
                }
              >
                {formatMachineDisplayNameWithBold(machine)}
                {collectedMachineEntries.find(
                  e => e.machineId === String(machine._id)
                ) &&
                  !editingEntryId && (
                    <span className="ml-auto text-xs text-green-500">
                      (Added)
                    </span>
                  )}
              </Button>
            ))
          ) : (
            <p className="pt-2 text-xs text-grayHighlight">
              No machines found.
            </p>
          )
        ) : (
          <p className="pt-2 text-xs text-grayHighlight">
            Select a location.
          </p>
        )}
      </div>
    </div>
  );
}
