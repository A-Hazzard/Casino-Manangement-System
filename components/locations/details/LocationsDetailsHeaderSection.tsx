/**
 * LocationsDetailsHeaderSection Component
 *
 * Displays the page title, refresh controls, and location creation actions.
 * 
 * @param props - Component props
 */

'use client';

import { Button } from '@/components/ui/button';
import { ActionButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
import { IMAGES } from '@/lib/constants/images';
import { Plus, PlusCircle, RefreshCw } from 'lucide-react';
import Image from 'next/image';

export type LocationsDetailsHeaderSectionProps = {
  loading: boolean;
  refreshing: boolean;
  canManage: boolean;
  onRefresh: () => void;
  onNew: () => void;
};

export default function LocationsDetailsHeaderSection({
  loading,
  refreshing,
  canManage,
  onRefresh,
  onNew,
}: LocationsDetailsHeaderSectionProps) {
  return (
    <div className="mt-4 flex w-full max-w-full items-center justify-between">
      {/* Title and Mobile Actions */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
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
        
        {/* Mobile Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex-shrink-0 p-1.5 text-gray-600 md:hidden"
        >
          <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Mobile Create Button - Show only if not loading and user can manage locations */}
        {!loading && canManage && (
          <button
            onClick={onNew}
            className="flex-shrink-0 p-1.5 md:hidden"
          >
            <PlusCircle className="h-4 w-4 text-button sm:h-5 sm:w-5" />
          </button>
        )}
      </div>

      {/* Desktop Actions */}
      <div className="hidden flex-shrink-0 items-center gap-2 md:flex">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex-shrink-0 p-2 text-gray-600"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        
        {/* Show skeleton while loading, button if user can manage, otherwise nothing */}
        {loading ? (
          <ActionButtonSkeleton width="w-36" showIcon={true} />
        ) : canManage ? (
          <Button
            onClick={onNew}
            className="flex-shrink-0 items-center gap-2 rounded-md bg-button px-4 py-2 text-white hover:bg-buttonActive shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Location</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
