"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function LicenseeCardSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse"
        >
          <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-5 w-20 bg-white/20" />
              <Skeleton className="h-4 w-16 bg-white/20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full bg-white/20" />
              <Skeleton className="h-4 w-12 bg-white/20" />
            </div>
          </div>
          <div className="p-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex justify-between items-center mt-4">
              <Skeleton className="h-6 w-16" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
