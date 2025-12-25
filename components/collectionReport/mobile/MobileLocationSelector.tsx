/**
 * Mobile Collection Modal - Location Selector Component
 *
 * Handles location selection and main screen navigation buttons for New Collection flow.
 */

'use client';

import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import { Skeleton } from '@/components/ui/skeleton';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';

type MobileLocationSelectorProps = {
  locations: CollectionReportLocationWithMachines[];
  selectedLocationId: string | null | undefined;
  lockedLocationId: string | undefined;
  isLoadingCollections: boolean;
  collectedMachinesCount: number;
  selectedMachine: string | null;
  onLocationChange: (locationId: string) => void;
  onOpenReport: () => void;
  onViewForm: () => void;
  onViewCollectedMachines: () => void;
};

export default function MobileLocationSelector({
  locations,
  selectedLocationId,
  lockedLocationId,
  isLoadingCollections,
  collectedMachinesCount,
  selectedMachine,
  onLocationChange,
  onOpenReport,
  onViewForm,
  onViewCollectedMachines,
}: MobileLocationSelectorProps) {
  if (isLoadingCollections) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const hasLocation = lockedLocationId || selectedLocationId;

  return (
    <>
      <label className="mb-2 block text-sm font-medium">Select Location</label>
      <LocationSingleSelect
        locations={locations.map(loc => ({
          id: String(loc._id),
          name: loc.name,
          sasEnabled: false,
        }))}
        selectedLocation={lockedLocationId || selectedLocationId || ''}
        onSelectionChange={onLocationChange}
        placeholder="Select Location"
        includeAllOption={false}
      />

      {hasLocation && (
        <div className="mt-6 space-y-3">
          {selectedMachine && (
            <button onClick={onOpenReport} className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white">
              Open Report
            </button>
          )}
          {collectedMachinesCount > 0 && (
            <button onClick={onViewForm} className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white">
              View Form ({collectedMachinesCount})
            </button>
          )}
          <button
            onClick={onViewCollectedMachines}
            className={`w-full rounded-lg py-3 font-medium ${collectedMachinesCount === 0 ? 'bg-gray-400' : 'bg-green-600 text-white'}`}
            disabled={collectedMachinesCount === 0}
          >
            View Collected Machines ({collectedMachinesCount})
          </button>
        </div>
      )}
    </>
  );
}

