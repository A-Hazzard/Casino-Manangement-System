import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const CollectionNavigationSkeleton = () => {
  return (
    <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
      {/* Desktop - md: and above */}
      <nav className="hidden md:flex space-x-1 md:space-x-2 lg:space-x-8 px-1 md:px-2 lg:px-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center space-x-0.5 md:space-x-1 lg:space-x-2 py-1 md:py-2 lg:py-4 px-0.5 md:px-1 lg:px-2 border-b-2 border-transparent"
          >
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-16 lg:w-20 rounded" />
          </div>
        ))}
      </nav>

      {/* Mobile - below md: */}
      <div className="md:hidden px-4 py-2">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
};
