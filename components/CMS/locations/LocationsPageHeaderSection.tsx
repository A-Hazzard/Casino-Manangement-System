/**
 * LocationsPageHeaderSection Component
 *
 * Displays the page title and location creation actions.
 *
 * @param props - Component props
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { Plus } from 'lucide-react';

type LocationsPageHeaderSectionProps = {
  canManage: boolean;
  onNew: () => void;
};

export default function LocationsPageHeaderSection({
  canManage,
  onNew,
}: LocationsPageHeaderSectionProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="mt-2 flex w-full max-w-full items-center justify-between">
      {/* Title */}
      <div className="flex min-w-0 flex-1 items-center">
        <h1 className="truncate text-lg font-bold text-gray-900 sm:text-2xl md:text-3xl">
          Locations
        </h1>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {canManage && (
          <Button
            onClick={onNew}
            className="flex items-center gap-1 rounded-md bg-button px-2 py-1 text-xs font-medium text-white hover:bg-buttonActive sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Location</span>
            <span className="sm:hidden">New</span>
          </Button>
        )}
      </div>
    </div>
  );
}
