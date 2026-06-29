/**
 * Locations Details Header Component
 *
 * Renders the title, back button, and create button for the location details page.
 */

import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/shared/ui/button';
import type { AggregatedLocation } from '@/shared/types';

type LocationsDetailsHeaderProps = {
  locationId: string;
  locationData: AggregatedLocation | null;
  canManageMachines: boolean;
  onNewMachine: (locationId: string) => void;
};

export default function LocationsDetailsHeader({
  locationId,
  locationData,
  canManageMachines,
  onNewMachine,
}: LocationsDetailsHeaderProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="mt-2 w-full max-w-full">
      {/* Title Row: Back button + Location name + Create Machine (desktop) */}
      <div className="flex items-center gap-2">
        <Link href="/locations">
          <Button
            variant="ghost"
            className="h-8 w-8 flex-shrink-0 rounded-full border border-gray-200 p-1.5 hover:bg-gray-100 sm:h-10 sm:w-10"
          >
            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Link>
        <h1 className="min-w-0 flex-1 text-lg font-bold text-gray-900 sm:text-4xl sm:font-black sm:tracking-tight">
          {locationData?.locationName || 'Location Details'}
        </h1>
        {canManageMachines && (
          <Button
            variant="default"
            className="hidden flex-shrink-0 bg-button text-white sm:inline-flex"
            onClick={() => onNewMachine(locationId)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Machine
          </Button>
        )}
      </div>

      {/* Create Machine Button — full width on mobile */}
      {canManageMachines && (
        <div className="mt-2 sm:hidden">
          <Button
            variant="default"
            className="w-full bg-button text-white"
            onClick={() => onNewMachine(locationId)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Machine
          </Button>
        </div>
      )}
    </div>
  );
}
