/**
 * CollectionReportHeader Component
 *
 * Displays the page title, refresh controls, and report creation actions.
 *
 * Features:
 * - Responsive page title with icon
 * - Global refresh button
 * - Create Report button (Desktop full, Mobile icon)
 * - Loading states for actions
 */

'use client';

import { Button } from '@/components/ui/button';
import { IMAGES } from '@/lib/constants/images';
import { PlusCircle, RefreshCw } from 'lucide-react';
import Image from 'next/image';

type CollectionReportHeaderProps = {
  activeTab: string;
  refreshing: boolean;
  loading: boolean;
  onRefresh: () => void;
  onCreateDesktop: () => void;
  onCreateMobile: () => void;
};

export default function CollectionReportHeader({
  activeTab,
  refreshing,
  loading,
  onRefresh,
  onCreateDesktop,
  onCreateMobile,
}: CollectionReportHeaderProps) {
  return (
    <div className="mt-4 flex w-full max-w-full items-center justify-between">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">
        Collection Report
        <Image
          src={IMAGES.creditCardIcon}
          alt="Collection Report Icon"
          width={32}
          height={32}
          className="h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6 md:h-8 md:w-8"
        />
      </h1>

      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Refresh Icon */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:p-2"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Create Button */}
        {activeTab === 'collection' && (
          <>
            {/* Desktop View */}
            <div className="hidden md:block">
              {refreshing || loading ? (
                <div className="flex h-10 w-36 animate-pulse items-center justify-center rounded-md bg-gray-200" />
              ) : (
                <Button
                  onClick={onCreateDesktop}
                  className="flex items-center gap-2 bg-buttonActive text-white transition-colors hover:bg-purple-700 shadow-sm"
                  disabled={refreshing}
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Collection Report
                </Button>
              )}
            </div>
            {/* Mobile View */}
            <div className="md:hidden">
              <button
                onClick={onCreateMobile}
                disabled={refreshing}
                className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Create Collection Report"
              >
                <PlusCircle className="h-6 w-6 text-green-600 hover:text-green-700" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



