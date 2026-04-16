/**
 * Locations Details Header Component
 *
 * Renders the title, back button, and action buttons for the location details page.
 */

import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { MapPinOff, PlusCircle, RefreshCw, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/shared/ui/button';
import { IMAGES } from '@/lib/constants';
import type { AggregatedLocation } from '@/shared/types';
import { hasMissingCoordinates } from '@/lib/utils/location';

type LocationsDetailsHeaderProps = {
  locationId: string;
  locationData: AggregatedLocation | null;
  refreshing: boolean;
  activeView: 'machines' | 'members';
  canManageMachines: boolean;
  onRefresh: () => Promise<void>;
  onEditLocation: (location: AggregatedLocation) => void;
  onNewMachine: (locationId: string) => void;
};

export default function LocationsDetailsHeader({
  locationId,
  locationData,
  refreshing,
  activeView,
  canManageMachines,
  onRefresh,
  onEditLocation,
  onNewMachine,
}: LocationsDetailsHeaderProps) {
  return (
    <div className="mt-4 w-full max-w-full">
      {/* Mobile Layout (below sm) */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2">
          <Link href="/locations">
            <Button
              variant="ghost"
              className="h-8 w-8 flex-shrink-0 rounded-full border border-gray-200 p-1.5 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="flex min-w-0 flex-1 items-center gap-2 truncate text-xl font-bold text-gray-900 leading-tight">
            {locationData?.locationName || 'Location Details'}
            {locationData && hasMissingCoordinates(locationData) ? (
              <div className="group relative inline-flex flex-shrink-0">
                <MapPinOff className="h-4 w-4 flex-shrink-0 text-red-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  This location&apos;s coordinates have not been set
                </div>
              </div>
            ) : (
              <Image
                src={IMAGES.locationIcon}
                alt="Location Icon"
                width={32}
                height={32}
                className="h-4 w-4 flex-shrink-0"
              />
            )}
          </h1>
          
          {activeView !== 'members' && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          )}

          {activeView === 'machines' && (
            <>
              {canManageMachines ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (locationData) onEditLocation(locationData);
                    }}
                    className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900"
                    aria-label="Location Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onNewMachine(locationId)}
                    className="flex-shrink-0 p-1.5 transition-colors"
                    aria-label="Create Machine"
                  >
                    <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Desktop Layout (sm and above) */}
      <div className="hidden items-center justify-between sm:flex">
        <div className="flex w-full items-center gap-3">
          <Link href="/locations" className="mr-2">
            <Button
              variant="ghost"
              className="rounded-full border border-gray-200 p-2 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="flex min-w-0 flex-1 items-center gap-3 truncate text-4xl font-black tracking-tight text-gray-900">
            {locationData?.locationName || 'Location Details'}
            {locationData && hasMissingCoordinates(locationData) ? (
              <div className="group relative inline-flex flex-shrink-0">
                <MapPinOff className="h-6 w-6 flex-shrink-0 text-red-600 sm:h-8 sm:w-8" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  This location&apos;s coordinates have not been set
                </div>
              </div>
            ) : (
              <Image
                src={IMAGES.locationIcon}
                alt="Location Icon"
                width={32}
                height={32}
                className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8"
              />
            )}
          </h1>
          {activeView !== 'members' && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          )}
        </div>

        {activeView === 'machines' && (
          <div className="ml-4 hidden flex-shrink-0 items-center gap-2 md:flex">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex-shrink-0 p-2 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
            {canManageMachines ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  disabled={refreshing}
                  onClick={() => {
                    if (locationData) onEditLocation(locationData);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button
                  variant="default"
                  className="bg-button text-white"
                  onClick={() => onNewMachine(locationId)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Machine
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
