"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function UserCardSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg shadow-md overflow-hidden"
        >
          <div className="bg-blue-500 text-white p-3 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-5 w-16 bg-white/20" />
              <Skeleton className="h-4 w-14 bg-white/20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full bg-white/20" />
              <Skeleton className="h-5 w-10 bg-white/20" />
            </div>
          </div>
          <div className="p-3">
            <Skeleton className="h-4 w-40 max-w-full mb-2" />
            <Skeleton className="h-4 w-24 max-w-full mb-3" />
            <div className="flex justify-end gap-3 items-center mt-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
