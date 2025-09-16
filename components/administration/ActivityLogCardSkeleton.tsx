"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ActivityLogCardSkeleton: React.FC = () => {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="text-left sm:text-right">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* User Info */}
        <div className="mb-3">
          <Skeleton className="h-4 w-48 mb-1" />
          <Skeleton className="h-3 w-36" />
        </div>

        {/* Description */}
        <div className="mb-3">
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4 mb-1" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Show More Button */}
        <div className="flex justify-end">
          <Skeleton className="h-8 w-20" />
        </div>

        {/* Resource Info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Skeleton className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLogCardSkeleton;
