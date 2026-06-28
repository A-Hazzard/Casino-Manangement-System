/**
 * Collection Report V2 Session Report Skeleton Loader
 *
 * Matches the exact layout of the CollectionReportV2SessionReport page.
 * Shown while machine list and session summary data are loading.
 *
 * @module components/ui/skeletons/CollectionReportV2SessionReportSkeleton
 */
'use client';

import { Skeleton } from '@/components/shared/ui/skeleton';

export default function CollectionReportV2SessionReportSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back button + Edit button row */}
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        {/* Header card */}
        <div className="mb-6 rounded-lg bg-white py-4 text-center shadow lg:border-t-4 lg:border-lighterBlueHighlight lg:bg-container lg:py-8">
          <div className="px-4 py-2 lg:py-4">
            <Skeleton className="mx-auto mb-2 h-3 w-32 rounded lg:hidden" />
            <Skeleton className="mx-auto mb-2 h-8 w-48 rounded lg:h-10 lg:w-64" />
            <Skeleton className="mx-auto mb-2 h-4 w-56 rounded" />
            <Skeleton className="mx-auto h-4 w-72 rounded" />
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:flex lg:flex-row lg:space-x-6">
          {/* Sidebar with "Sections" heading and tab buttons */}
          <div className="lg:w-1/4">
            <div className="space-y-2 rounded-lg bg-white p-3 shadow">
              <Skeleton className="mb-4 h-6 w-20" />
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          </div>
          {/* Main content — machines table with search bar */}
          <div className="lg:w-3/4">
            <div className="rounded-lg bg-white shadow-md">
              <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <Skeleton className="h-6 w-24 lg:hidden" />
                <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
              </div>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center border-b border-gray-100 px-4 py-4"
                >
                  <Skeleton className="mr-3 h-12 w-12 flex-shrink-0 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="mx-4 h-4 w-24" />
                  <Skeleton className="mx-4 h-5 w-16 rounded-full" />
                  <Skeleton className="mx-4 h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile layout — select dropdown + tab content */}
        <div className="space-y-4 lg:hidden">
          {/* Tab selector — matches actual <select> element */}
          <Skeleton className="h-12 w-full rounded-lg" />
          {/* Machine cards */}
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-lg bg-white p-4 shadow-md">
              <div className="mb-3 flex items-start gap-3">
                <Skeleton className="h-12 w-12 flex-shrink-0 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-4 rounded" />
                <Skeleton className="h-4 rounded" />
                <Skeleton className="h-4 rounded" />
                <Skeleton className="h-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
