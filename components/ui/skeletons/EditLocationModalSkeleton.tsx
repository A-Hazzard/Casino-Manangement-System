"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function EditLocationModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-2 md:p-4">
        <div className="bg-container rounded-md shadow-lg max-w-xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-20" />
          </div>

          {/* Form Content */}
          <div className="px-4 md:px-8 pb-4 md:pb-8 space-y-4 max-h-[calc(95vh-120px)] md:max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Location Name */}
            <div className="mb-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Address */}
            <div className="mb-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* City */}
            <div className="mb-4">
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Licensee */}
            <div className="mb-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Profit Share and Day Start Time */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <Skeleton className="h-12 w-24 rounded-l-md" />
                <Skeleton className="h-12 flex-1 rounded-r-md" />
              </div>
              <div className="flex items-center">
                <Skeleton className="h-12 w-24 rounded-l-md" />
                <Skeleton className="h-12 flex-1 rounded-r-md" />
              </div>
            </div>

            {/* No SMIB Location Checkbox */}
            <div className="mb-4 flex justify-center">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            {/* GEO Coordinates */}
            <div className="mb-4">
              <Skeleton className="h-4 w-32 mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Skeleton className="h-12 w-20 rounded-l-md" />
                  <Skeleton className="h-12 flex-1 rounded-r-md" />
                </div>
                <div className="flex items-center">
                  <Skeleton className="h-12 w-20 rounded-l-md" />
                  <Skeleton className="h-12 flex-1 rounded-r-md" />
                </div>
              </div>
            </div>

            {/* Bill Validator Options */}
            <div className="mb-4">
              <div className="flex justify-center mb-3">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 13 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
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