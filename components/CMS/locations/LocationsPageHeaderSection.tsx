/**
 * LocationsPageHeaderSection Component
 *
 * Displays the page title, refresh controls, and location creation actions.
 * 
 * @param props - Component props
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { ActionButtonSkeleton } from '@/components/shared/ui/skeletons/ButtonSkeletons';
import { IMAGES } from '@/lib/constants';
import { Plus, RefreshCw } from 'lucide-react';
import Image from 'next/image';

type LocationsPageHeaderSectionProps = {
  loading: boolean;
  refreshing: boolean;
  canManage: boolean;
  onRefresh: () => void;
  onNew: () => void;
};

export default function LocationsPageHeaderSection({
  loading,
  refreshing,
  canManage,
  onRefresh,
  onNew,
}: LocationsPageHeaderSectionProps) {
  return (
    <div className="mt-4 flex w-full max-w-full items-center justify-between">
      {/* Title */}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <h1 className="flex min-w-0 items-center gap-1 truncate text-lg font-bold text-gray-800 sm:text-2xl md:text-3xl">
          Locations
          <Image
            src={IMAGES.locationIcon}
            alt="Location Icon"
            width={32}
            height={32}
            className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8"
          />
        </h1>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex-shrink-0 p-1.5 text-gray-600 md:p-2"
        >
          <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Show skeleton while loading, button if user can manage, otherwise nothing */}
        {loading ? (
          <ActionButtonSkeleton width="w-32 sm:w-36" showIcon={true} />
        ) : canManage ? (
          <Button
            onClick={onNew}
            className="flex-shrink-0 items-center gap-1 rounded-md bg-button px-2 py-1 text-xs font-medium text-white hover:bg-buttonActive shadow-sm sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create new location</span>
            <span className="sm:hidden">Create</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

