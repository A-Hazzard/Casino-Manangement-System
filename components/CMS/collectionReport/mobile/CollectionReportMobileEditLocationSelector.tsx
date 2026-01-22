/**
 * Mobile Edit Collection Modal - Location Selector Component
 *
 * Handles location selection and main screen navigation buttons
 */

'use client';

import { LocationSelect } from '@/components/shared/ui/custom-select';
import { Skeleton } from '@/components/shared/ui/skeleton';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';

type MobileEditLocationSelectorProps = {
  locations: CollectionReportLocationWithMachines[];
  selectedLocationId: string | null | undefined;
  lockedLocationId: string | undefined;
  selectedLocationName: string;
  isLoadingCollections: boolean;
  collectedMachinesCount: number;
  selectedMachine: string | null;
  onLocationChange: (locationId: string) => void;
  onOpenReport: () => void;
  onViewForm: () => void;
  onViewCollectedMachines: () => void;
};

export default function CollectionReportMobileEditLocationSelector({
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
}: MobileEditLocationSelectorProps) {
  if (isLoadingCollections) {
    return (
      <div className="space-y-4">
        <div className="py-4 text-center">
          <p className="font-medium text-blue-600">
            Checking if any collection reports is in progress first
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Please wait while we check for incomplete collections
          </p>
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <Skeleton className="mb-2 h-4 w-48" />
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  const hasLocation = lockedLocationId || selectedLocationId;

  return (
    <>
      <label className="mb-2 block text-sm font-medium">Select Location</label>
      <LocationSelect
        value={lockedLocationId || selectedLocationId || ''}
        onValueChange={onLocationChange}
        locations={locations.map(loc => ({
          _id: String(loc._id),
          name: loc.name,
        }))}
        placeholder="Choose a location..."
        disabled={true} // Location is locked in edit mode
        className="w-full"
      />

      <p className="mt-2 text-xs italic text-gray-500">
        Location cannot be changed when editing a report
      </p>

      {/* Main Screen Buttons - Only show when location is selected */}
      {hasLocation && (
        <div className="mt-6 space-y-3">
          {/* Open Report Button - Only show when a machine is selected */}
          {selectedMachine && (
            <button
              onClick={onOpenReport}
              className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
            >
              Open Report
            </button>
          )}

          {/* View Form Button - Show when there are collected machines */}
          {collectedMachinesCount > 0 && (
            <button
              onClick={onViewForm}
              className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700"
            >
              View Form ({collectedMachinesCount} machine
              {collectedMachinesCount !== 1 ? 's' : ''})
            </button>
          )}

          {/* View Collected Machines Button */}
          <button
            onClick={onViewCollectedMachines}
            className={`w-full rounded-lg py-3 font-medium ${
              collectedMachinesCount === 0
                ? 'cursor-not-allowed bg-gray-400 text-gray-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            View Collected Machines ({collectedMachinesCount})
          </button>
        </div>
      )}
    </>
  );
}


