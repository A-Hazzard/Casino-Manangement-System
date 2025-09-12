"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function EditCabinetModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-2 md:p-4">
        <div className="bg-container rounded-md shadow-lg max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-20" />
          </div>

          {/* Form Content */}
          <div className="px-4 md:px-8 pb-4 md:pb-8 space-y-4 max-h-[calc(95vh-120px)] md:max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Asset Number */}
            <div className="mb-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Installed Game */}
            <div className="mb-4">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Location */}
            <div className="mb-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* SMB ID */}
            <div className="mb-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Status */}
            <div className="mb-4">
              <Skeleton className="h-4 w-12 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Accounting Denomination and Collection Multiplier */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>

            {/* Is Cronos Machine Checkbox */}
            <div className="mb-4 flex justify-center">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
