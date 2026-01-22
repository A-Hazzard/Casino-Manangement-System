"use client";

import { Skeleton } from "@/components/shared/ui/skeleton";

/**
 * Refresh button skeleton
 * Matches the exact layout of refresh buttons
 */
export const RefreshButtonSkeleton = () => (
  <div className="flex items-center gap-2 bg-gray-200 rounded-md px-4 py-2">
    <Skeleton className="h-4 w-4" />
    <Skeleton className="h-4 w-16" />
  </div>
);

/**
 * Action button skeleton (like "Add Cabinet", "New Location", etc.)
 * Matches the layout of primary action buttons
 */
export const ActionButtonSkeleton = ({ 
  width = "w-32",
  showIcon = true 
}: {
  width?: string;
  showIcon?: boolean;
}) => (
  <div className={`h-10 ${width} flex items-center gap-2 bg-gray-200 rounded-md px-4 py-2`}>
    {showIcon && <Skeleton className="h-4 w-4" />}
    <Skeleton className="h-4 flex-1" />
  </div>
);

