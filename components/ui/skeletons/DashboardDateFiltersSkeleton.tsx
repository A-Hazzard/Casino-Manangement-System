import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardDateFiltersSkeleton = () => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Time Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-20 lg:w-24 rounded-md" />
        ))}
      </div>

      {/* Date Range Indicator */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Refresh Button */}
      <div className="ml-auto">
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>
  );
};
