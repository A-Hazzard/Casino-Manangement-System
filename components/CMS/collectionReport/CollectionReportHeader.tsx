/**
 * CollectionReportHeader Component
 *
 * Displays the page title and report creation actions.
 *
 * Features:
 * - Responsive page title with icon
 * - Create Report button (Desktop full, Mobile icon)
 * - Loading states for actions
 *
 * @param activeTab - ID of the currently active navigation tab
 * @param onCreateDesktop - Callback to open the desktop version of create report modal
 * @param onCreateMobile - Callback to open the mobile version of create report modal
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { IMAGES } from '@/lib/constants';
import { PlusCircle } from 'lucide-react';
import Image from 'next/image';

type CollectionReportHeaderProps = {
  activeTab: string;
  onCreateDesktop: () => void;
  onCreateMobile: () => void;
};

export default function CollectionReportHeader({
  activeTab,
  onCreateDesktop,
  onCreateMobile,
}: CollectionReportHeaderProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex w-full max-w-full items-center justify-between">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">
        Collection Report
        <Image
          src={IMAGES.creditCardIcon}
          alt="Collection Report Icon"
          width={32}
          height={32}
          className="hidden h-5 w-5 flex-shrink-0 sm:inline sm:h-6 sm:w-6 md:h-8 md:w-8"
        />
      </h1>

      <div className="flex flex-shrink-0 items-center gap-2">
        {(activeTab === 'collection' || activeTab === 'collection-v2') && (
          <Button
            onClick={() => {
              if (window.innerWidth < 1280) {
                onCreateMobile();
              } else {
                onCreateDesktop();
              }
            }}
            className="flex flex-shrink-0 items-center gap-1 rounded-md bg-buttonActive px-2 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-purple-700 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Create Report</span>
            <span className="sm:hidden">Create</span>
          </Button>
        )}
      </div>
    </div>
  );
}
