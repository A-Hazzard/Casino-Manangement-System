'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function EditCabinetModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-2 md:p-4">
        <div className="max-h-[95vh] w-full max-w-2xl overflow-hidden rounded-md bg-container shadow-lg md:max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-20" />
          </div>

          {/* Form Content */}
          <div className="max-h-[calc(95vh-120px)] space-y-4 overflow-y-auto px-4 pb-4 md:max-h-[calc(90vh-120px)] md:px-8 md:pb-8">
            {/* Asset Number */}
            <div className="mb-4">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Installed Game */}
            <div className="mb-4">
              <Skeleton className="mb-2 h-4 w-28" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Location */}
            <div className="mb-4">
              <Skeleton className="mb-2 h-4 w-16" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* SMB ID */}
            <div className="mb-4">
              <Skeleton className="mb-2 h-4 w-16" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Status */}
            <div className="mb-4">
              <Skeleton className="mb-2 h-4 w-12" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Accounting Denomination and Collection Multiplier */}
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Skeleton className="mb-2 h-4 w-36" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div>
                <Skeleton className="mb-2 h-4 w-32" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>

            {/* Is Cronos Machine Checkbox */}
            <div className="mb-4 flex justify-center">
              <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
