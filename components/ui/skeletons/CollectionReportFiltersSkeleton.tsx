import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const CollectionReportFiltersSkeleton = () => {
  return (
    <div className="p-4 w-full border border-gray-200 bg-white lg:bg-buttonActive flex flex-col gap-y-3 lg:gap-y-4">
      {/* Top row - Search, Location, and Clear Button */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-y-3 lg:gap-4">
        {/* Search Input */}
        <div className="relative w-full lg:w-[320px] lg:min-w-[280px]">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Location Select */}
        <div className="w-full lg:w-[200px] lg:min-w-[180px]">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Clear Filters Button - Only visible on lg and above */}
        <div className="hidden lg:block lg:w-[120px] lg:min-w-[100px]">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      {/* Bottom row - Show Uncollected Only checkbox and mobile Clear Button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-y-3 sm:gap-4">
        {/* Show Uncollected Only Checkbox */}
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Clear Filters Button - Only visible on mobile and tablet */}
        <div className="block sm:hidden w-full sm:w-auto">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
};
