import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const MobileCollectionModalSkeleton = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal Content */}
      <div className="relative z-50 bg-white rounded-lg shadow-xl w-full max-w-md mx-4 my-8 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden p-4 space-y-4">
          {/* Location Selection */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>

          {/* Machines List Header */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Machine Cards */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
};
