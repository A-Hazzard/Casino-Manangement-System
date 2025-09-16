import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const ActivityLogSkeleton = () => (
  <div className="w-full">
    {/* Desktop Table View Skeleton */}
    <div className="hidden lg:block w-full overflow-x-auto rounded-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-button text-white">
            <th className="p-3 border border-border text-sm">Type</th>
            <th className="p-3 border border-border text-sm">Event</th>
            <th className="p-3 border border-border text-sm">Event Code</th>
            <th className="p-3 border border-border text-sm">Game</th>
            <th className="p-3 border border-border text-sm">Date</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, index) => (
            <tr key={index} className="text-center">
              <td className="p-3 border border-border">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </td>
              <td className="p-3 border border-border text-left">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="w-4 h-4" />
                </div>
              </td>
              <td className="p-3 border border-border">
                <Skeleton className="h-4 w-8 mx-auto" />
              </td>
              <td className="p-3 border border-border">
                <Skeleton className="h-4 w-24 mx-auto" />
              </td>
              <td className="p-3 border border-border">
                <Skeleton className="h-4 w-32 mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Cards View Skeleton */}
    <div className="block lg:hidden space-y-4 w-full">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="bg-container rounded-lg shadow-md overflow-hidden w-full border border-border"
        >
          <div className="bg-button text-white px-4 py-3 font-semibold text-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="w-4 h-4" />
            </div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-4 w-16" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="w-4 h-4" />
              </div>
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ActivityLogSkeleton;
